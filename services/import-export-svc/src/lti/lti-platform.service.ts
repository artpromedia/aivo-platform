// ══════════════════════════════════════════════════════════════════════════════
// LTI 1.3 PLATFORM SERVICE
// Implements LTI 1.3 platform functionality for AIVO to launch external tools
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SignJWT, importPKCS8 } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import {
  LTIToolConfig,
  LTILineItem,
  LTIScore,
  LTIResult,
  LTIMembershipContainer,
  LTIAccessToken,
  LTI_CLAIMS,
} from './lti.types';

interface LaunchParams {
  userId: string;
  userName?: string;
  userEmail?: string;
  roles: string[];
  contextId?: string;
  contextTitle?: string;
  resourceLinkId: string;
  resourceTitle?: string;
  custom?: Record<string, string>;
  returnUrl?: string;
}

@Injectable()
export class LTIPlatformService {
  private readonly logger = new Logger(LTIPlatformService.name);
  private platformIssuer: string;
  private platformPrivateKey: string;
  private platformKeyId: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.platformIssuer = config.getOrThrow('LTI_PLATFORM_ISSUER');
    this.platformPrivateKey = config.getOrThrow('LTI_PLATFORM_PRIVATE_KEY');
    this.platformKeyId = config.get('LTI_PLATFORM_KEY_ID', 'aivo-platform-key-1');
  }

  // ============================================================================
  // TOOL MANAGEMENT
  // ============================================================================

  /**
   * Register an external LTI tool
   */
  async registerTool(
    tenantId: string,
    config: LTIToolConfig
  ): Promise<{ id: string; deploymentId: string }> {
    const deploymentId = uuidv4();

    const tool = await this.prisma.ltiTool.create({
      data: {
        id: uuidv4(),
        tenantId,
        clientId: config.clientId,
        name: config.name,
        description: config.description,
        issuer: this.platformIssuer,
        authorizationEndpoint: config.loginUrl,
        tokenEndpoint: `${this.platformIssuer}/lti/token`,
        jwksEndpoint: config.jwksEndpoint,
        deploymentId,
        publicKey: config.publicKey,
        privateKey: config.privateKey,
        status: 'active',
        supportsDeepLinking: config.supportsDeepLinking || false,
        supportsAGS: true,
        supportsNRPS: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`LTI tool registered id=${tool.id} name=${config.name}`);

    return { id: tool.id, deploymentId };
  }

  /**
   * Get registered tools for tenant
   */
  async getTools(tenantId: string): Promise<any[]> {
    return this.prisma.ltiTool.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        description: true,
        clientId: true,
        deploymentId: true,
        status: true,
        supportsDeepLinking: true,
        createdAt: true,
      },
    });
  }

  /**
   * Update tool status
   */
  async updateToolStatus(toolId: string, status: 'active' | 'inactive'): Promise<void> {
    await this.prisma.ltiTool.update({
      where: { id: toolId },
      data: { status, updatedAt: new Date() },
    });
  }

  // ============================================================================
  // LAUNCH FLOW
  // ============================================================================

  /**
   * Initiate LTI 1.3 launch to external tool
   */
  async initiateLaunch(
    toolId: string,
    params: LaunchParams
  ): Promise<{ loginUrl: string; formData: Record<string, string> }> {
    const tool = await this.prisma.ltiTool.findUnique({
      where: { id: toolId },
    });

    if (!tool || tool.status !== 'active') {
      throw new BadRequestException('Tool not found or inactive');
    }

    // Generate login hint and message hint
    const loginHint = Buffer.from(JSON.stringify({
      userId: params.userId,
      tenantId: tool.tenantId,
    })).toString('base64url');

    const ltiMessageHint = Buffer.from(JSON.stringify({
      resourceLinkId: params.resourceLinkId,
      contextId: params.contextId,
      custom: params.custom,
    })).toString('base64url');

    // Build login initiation URL
    const loginUrl = new URL(tool.authorizationEndpoint);

    const formData = {
      iss: this.platformIssuer,
      login_hint: loginHint,
      target_link_uri: tool.tokenEndpoint.replace('/token', '/launch'),
      lti_message_hint: ltiMessageHint,
      client_id: tool.clientId,
      lti_deployment_id: tool.deploymentId,
    };

    this.logger.log(`LTI launch initiated toolId=${toolId} userId=${params.userId}`);

    return { loginUrl: loginUrl.toString(), formData };
  }

  /**
   * Generate ID token for tool launch
   */
  async generateIdToken(
    toolId: string,
    params: LaunchParams,
    nonce: string
  ): Promise<string> {
    const tool = await this.prisma.ltiTool.findUnique({
      where: { id: toolId },
    });

    if (!tool) {
      throw new BadRequestException('Tool not found');
    }

    const privateKey = await importPKCS8(this.platformPrivateKey, 'RS256');

    const payload: Record<string, any> = {
      // Standard OIDC claims
      sub: params.userId,
      name: params.userName,
      email: params.userEmail,
      nonce,

      // LTI claims
      [LTI_CLAIMS.MESSAGE_TYPE]: 'LtiResourceLinkRequest',
      [LTI_CLAIMS.VERSION]: '1.3.0',
      [LTI_CLAIMS.DEPLOYMENT_ID]: tool.deploymentId,
      [LTI_CLAIMS.TARGET_LINK_URI]: tool.tokenEndpoint.replace('/token', '/launch'),
      [LTI_CLAIMS.ROLES]: params.roles,
      [LTI_CLAIMS.RESOURCE_LINK]: {
        id: params.resourceLinkId,
        title: params.resourceTitle,
      },
    };

    // Add context if provided
    if (params.contextId) {
      payload[LTI_CLAIMS.CONTEXT] = {
        id: params.contextId,
        title: params.contextTitle,
        type: ['http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering'],
      };
    }

    // Add custom parameters
    if (params.custom) {
      payload[LTI_CLAIMS.CUSTOM] = params.custom;
    }

    // Add launch presentation
    if (params.returnUrl) {
      payload[LTI_CLAIMS.LAUNCH_PRESENTATION] = {
        document_target: 'iframe',
        return_url: params.returnUrl,
      };
    }

    // Add AGS endpoint
    payload[LTI_CLAIMS.AGS_ENDPOINT] = {
      scope: [
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
      ],
      lineitems: `${this.platformIssuer}/lti/ags/${params.contextId}/lineitems`,
    };

    // Add NRPS endpoint
    if (params.contextId) {
      payload[LTI_CLAIMS.NRPS_ENDPOINT] = {
        context_memberships_url: `${this.platformIssuer}/lti/nrps/${params.contextId}/memberships`,
        service_versions: ['2.0'],
      };
    }

    // Add platform instance info
    payload[LTI_CLAIMS.TOOL_PLATFORM] = {
      guid: this.platformIssuer,
      name: 'AIVO Learning Platform',
      product_family_code: 'aivo',
      version: '1.0',
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.platformKeyId })
      .setIssuer(this.platformIssuer)
      .setAudience(tool.clientId)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    // Record launch
    await this.prisma.ltiLaunch.create({
      data: {
        id: uuidv4(),
        tenantId: tool.tenantId,
        toolId: tool.id,
        userId: params.userId,
        resourceLinkId: params.resourceLinkId,
        roles: params.roles,
        contextId: params.contextId,
        contextTitle: params.contextTitle,
        returnUrl: params.returnUrl,
        createdAt: new Date(),
      },
    });

    // TODO: Add metrics service
    // metrics.increment('lti.platform.launch', { tool: tool.name });

    return token;
  }

  // ============================================================================
  // ASSIGNMENT AND GRADE SERVICES (AGS)
  // ============================================================================

  /**
   * Create a line item (gradebook column)
   */
  async createLineItem(
    contextId: string,
    lineItem: LTILineItem
  ): Promise<LTILineItem> {
    const created = await this.prisma.ltiLineItem.create({
      data: {
        id: uuidv4(),
        contextId,
        label: lineItem.label,
        scoreMaximum: lineItem.scoreMaximum,
        resourceId: lineItem.resourceId,
        resourceLinkId: lineItem.resourceLinkId,
        tag: lineItem.tag,
        startDateTime: lineItem.startDateTime ? new Date(lineItem.startDateTime) : null,
        endDateTime: lineItem.endDateTime ? new Date(lineItem.endDateTime) : null,
        createdAt: new Date(),
      },
    });

    return {
      id: `${this.platformIssuer}/lti/ags/${contextId}/lineitems/${created.id}`,
      ...lineItem,
    };
  }

  /**
   * Get line items for a context
   */
  async getLineItems(
    contextId: string,
    options?: { resourceLinkId?: string; tag?: string; limit?: number }
  ): Promise<LTILineItem[]> {
    const where: Record<string, unknown> = { contextId };
    if (options?.resourceLinkId) where.resourceLinkId = options.resourceLinkId;
    if (options?.tag) where.tag = options.tag;

    const items = await this.prisma.ltiLineItem.findMany({
      where,
      take: options?.limit ?? 100,
    });

    return items.map((item: { id: string; label: string; scoreMaximum: number; resourceId: string | null; resourceLinkId: string | null; tag: string | null }) => ({
      id: `${this.platformIssuer}/lti/ags/${contextId}/lineitems/${item.id}`,
      label: item.label,
      scoreMaximum: item.scoreMaximum,
      resourceId: item.resourceId ?? undefined,
      resourceLinkId: item.resourceLinkId ?? undefined,
      tag: item.tag ?? undefined,
    }));
  }

  /**
   * Submit a score
   */
  async submitScore(
    lineItemId: string,
    score: LTIScore
  ): Promise<void> {
    await this.prisma.ltiScore.upsert({
      where: {
        lineItemId_userId: { lineItemId, userId: score.userId },
      },
      create: {
        id: uuidv4(),
        lineItemId,
        userId: score.userId,
        scoreGiven: score.scoreGiven,
        scoreMaximum: score.scoreMaximum,
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
        comment: score.comment,
        timestamp: new Date(score.timestamp),
        createdAt: new Date(),
      },
      update: {
        scoreGiven: score.scoreGiven,
        scoreMaximum: score.scoreMaximum,
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
        comment: score.comment,
        timestamp: new Date(score.timestamp),
        updatedAt: new Date(),
      },
    });

    this.logger.log(`LTI score submitted lineItemId=${lineItemId} userId=${score.userId}`);
  }

  /**
   * Get results for a line item
   */
  async getResults(
    lineItemId: string,
    options?: { userId?: string; limit?: number }
  ): Promise<LTIResult[]> {
    const where: Record<string, unknown> = { lineItemId };
    if (options?.userId) where.userId = options.userId;

    const scores = await this.prisma.ltiScore.findMany({
      where,
      take: options?.limit ?? 100,
    });

    return scores.map((score: { id: string; userId: string; scoreGiven: number | null; scoreMaximum: number | null; comment: string | null }) => ({
      id: `${this.platformIssuer}/lti/ags/results/${score.id}`,
      userId: score.userId,
      resultScore: score.scoreGiven ?? undefined,
      resultMaximum: score.scoreMaximum ?? undefined,
      comment: score.comment ?? undefined,
      scoreOf: lineItemId,
    }));
  }

  // ============================================================================
  // NAMES AND ROLE PROVISIONING SERVICES (NRPS)
  // ============================================================================

  /**
   * Get context membership
   */
  async getContextMembership(
    contextId: string,
    options?: { role?: string; limit?: number }
  ): Promise<LTIMembershipContainer> {
    // Get context info
    const context = await this.prisma.course.findUnique({
      where: { id: contextId },
      include: {
        enrollments: {
          include: { user: true },
          take: options?.limit ?? 100,
        },
      },
    });

    if (!context) {
      throw new BadRequestException('Context not found');
    }

    const members = context.enrollments
      .filter((e: { role: string }) => !options?.role || e.role.toLowerCase().includes(options.role.toLowerCase()))
      .map((enrollment: { userId: string; role: string; user: { name: string | null; email: string | null } }) => ({
        userId: enrollment.userId,
        roles: this.mapAivoRoleToLTI(enrollment.role),
        status: 'Active' as const,
        name: enrollment.user.name ?? undefined,
        email: enrollment.user.email ?? undefined,
      }));

    return {
      id: `${this.platformIssuer}/lti/nrps/${contextId}/memberships`,
      context: {
        id: contextId,
        title: context.title,
        label: context.code || undefined,
      },
      members,
    };
  }

  // ============================================================================
  // TOKEN ENDPOINT
  // ============================================================================

  /**
   * Issue access token for tool
   */
  async issueAccessToken(
    clientAssertion: string,
    scope: string
  ): Promise<LTIAccessToken> {
    // Verify client assertion
    // In production, verify the JWT signature using tool's public key

    const privateKey = await importPKCS8(this.platformPrivateKey, 'RS256');

    const accessToken = await new SignJWT({ scope })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(this.platformIssuer)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
      scope,
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private mapAivoRoleToLTI(role: string): string[] {
    const roleMap: Record<string, string[]> = {
      admin: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Administrator'],
      teacher: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'],
      student: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
      author: ['http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper'],
      mentor: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Mentor'],
    };

    return roleMap[role.toLowerCase()] || ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'];
  }

  /**
   * Get platform JWKS
   */
  getJWKS(): { keys: any[] } {
    return {
      keys: [{
        kty: 'RSA',
        kid: this.platformKeyId,
        use: 'sig',
        alg: 'RS256',
        // In production, properly extract n and e from public key
        n: 'placeholder',
        e: 'AQAB',
      }],
    };
  }
}
