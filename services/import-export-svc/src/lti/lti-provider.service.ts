// ══════════════════════════════════════════════════════════════════════════════
// LTI 1.3 TOOL PROVIDER SERVICE
// Implements LTI 1.3 tool functionality for AIVO as an LTI Tool Provider
// ══════════════════════════════════════════════════════════════════════════════

import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createRemoteJWKSet, jwtVerify, SignJWT, importPKCS8 } from 'jose';
import { v4 as uuidv4 } from 'uuid';
import {
  LTIPlatformConfig,
  LTILaunchRequest,
  LTIJWTPayload,
  LTIStatePayload,
  LTIDeepLinkingResponse,
  LTIContentItem,
  LTIResourceLinkItem,
  LTI_CLAIMS,
  LTI_ROLES,
} from './lti.types';

@Injectable()
export class LTIProviderService {
  private readonly logger = new Logger(LTIProviderService.name);
  private toolPrivateKey: string;
  private toolPublicKey: string;
  private toolKeyId: string;
  private toolClientId: string;
  private baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.toolPrivateKey = config.getOrThrow('LTI_TOOL_PRIVATE_KEY');
    this.toolPublicKey = config.getOrThrow('LTI_TOOL_PUBLIC_KEY');
    this.toolKeyId = config.get('LTI_TOOL_KEY_ID', 'aivo-tool-key-1');
    this.toolClientId = config.getOrThrow('LTI_TOOL_CLIENT_ID');
    this.baseUrl = config.getOrThrow('APP_URL');
  }

  // ============================================================================
  // OIDC LOGIN FLOW
  // ============================================================================

  /**
   * Handle OIDC login initiation from platform
   * Step 1 of LTI 1.3 launch flow
   */
  async handleLoginInitiation(params: {
    iss: string;
    loginHint: string;
    targetLinkUri: string;
    ltiMessageHint?: string;
    clientId?: string;
    deploymentId?: string;
  }): Promise<{ redirectUrl: string }> {
    const { iss, loginHint, targetLinkUri, ltiMessageHint, clientId, deploymentId } = params;

    // Find platform configuration
    const platform = await this.findPlatform(iss, clientId, deploymentId);
    if (!platform) {
      throw new UnauthorizedException('Unknown platform');
    }

    // Generate state and nonce
    const nonce = uuidv4();
    const state = await this.createStateToken({
      platformId: platform.id,
      deploymentId: platform.deploymentId,
      nonce,
      targetLinkUri,
      clientId: platform.clientId,
      exp: Math.floor(Date.now() / 1000) + 600, // 10 minutes
    });

    // Store nonce for verification
    await this.prisma.ltiNonce.create({
      data: {
        nonce,
        platformId: platform.id,
        expiresAt: new Date(Date.now() + 600000),
      },
    });

    // Build authorization redirect URL
    const authUrl = new URL(platform.authorizationEndpoint);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('response_mode', 'form_post');
    authUrl.searchParams.set('scope', 'openid');
    authUrl.searchParams.set('client_id', platform.clientId);
    authUrl.searchParams.set('redirect_uri', `${this.baseUrl}/lti/launch`);
    authUrl.searchParams.set('login_hint', loginHint);
    authUrl.searchParams.set('nonce', nonce);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('prompt', 'none');
    
    if (ltiMessageHint) {
      authUrl.searchParams.set('lti_message_hint', ltiMessageHint);
    }

    this.logger.log('LTI login initiation', { platformId: platform.id, targetLinkUri });

    return { redirectUrl: authUrl.toString() };
  }

  /**
   * Handle LTI launch callback
   * Step 2 of LTI 1.3 launch flow
   */
  async handleLaunchCallback(params: {
    idToken: string;
    state: string;
  }): Promise<{ launchData: LTILaunchRequest; sessionId: string }> {
    const { idToken, state } = params;

    // Verify and decode state
    const statePayload = await this.verifyStateToken(state);
    
    // Get platform config
    const platform = await this.prisma.ltiTool.findUnique({
      where: { id: statePayload.platformId },
    });

    if (!platform) {
      throw new UnauthorizedException('Platform not found');
    }

    // Verify ID token
    const launchData = await this.verifyIdToken(idToken, platform, statePayload.nonce);

    // Verify nonce hasn't been used
    const nonceRecord = await this.prisma.ltiNonce.findFirst({
      where: { nonce: statePayload.nonce, platformId: platform.id },
    });

    if (!nonceRecord) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    // Delete used nonce
    await this.prisma.ltiNonce.delete({ where: { id: nonceRecord.id } });

    // Create launch session
    const sessionId = uuidv4();
    await this.prisma.ltiLaunch.create({
      data: {
        id: sessionId,
        tenantId: platform.tenantId,
        toolId: platform.id,
        userId: launchData.user?.sub || 'anonymous',
        resourceLinkId: launchData.resourceLink?.id || null,
        roles: launchData.roles || [],
        contextId: launchData.context?.id,
        contextTitle: launchData.context?.title,
        launchData: launchData as any,
        returnUrl: launchData.launchPresentation?.returnUrl,
        createdAt: new Date(),
      },
    });

    // TODO: Add metrics tracking when metrics service is available
    // metrics.increment('lti.launch.success', { platform: platform.name });
    this.logger.log('LTI launch successful', { sessionId, userId: launchData.user?.sub });

    return { launchData, sessionId };
  }

  // ============================================================================
  // DEEP LINKING
  // ============================================================================

  /**
   * Build deep linking response
   */
  async buildDeepLinkingResponse(
    platformId: string,
    contentItems: LTIContentItem[],
    data?: string
  ): Promise<{ jwt: string; returnUrl: string }> {
    const platform = await this.prisma.ltiTool.findUnique({
      where: { id: platformId },
    });

    if (!platform) {
      throw new BadRequestException('Platform not found');
    }

    const privateKey = await importPKCS8(this.toolPrivateKey, 'RS256');

    const payload: any = {
      iss: this.toolClientId,
      aud: platform.issuer,
      nonce: uuidv4(),
      [LTI_CLAIMS.MESSAGE_TYPE]: 'LtiDeepLinkingResponse',
      [LTI_CLAIMS.VERSION]: '1.3.0',
      [LTI_CLAIMS.DEPLOYMENT_ID]: platform.deploymentId,
      [LTI_CLAIMS.CONTENT_ITEMS]: contentItems,
    };

    if (data) {
      payload.data = data;
    }

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: this.toolKeyId })
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(privateKey);

    // Get return URL from launch data
    const lastLaunch = await this.prisma.ltiLaunch.findFirst({
      where: { toolId: platformId },
      orderBy: { createdAt: 'desc' },
    });

    const returnUrl = (lastLaunch?.launchData as any)?.deepLinkingSettings?.deepLinkReturnUrl 
      || platform.authorizationEndpoint.replace('/authorize', '/deep-linking-response');

    return { jwt, returnUrl };
  }

  /**
   * Create resource link content item for deep linking
   */
  createResourceLinkItem(params: {
    url: string;
    title: string;
    description?: string;
    custom?: Record<string, string>;
    scoreMaximum?: number;
    icon?: { url: string };
  }): LTIResourceLinkItem {
    return {
      type: 'ltiResourceLink',
      url: params.url,
      title: params.title,
      text: params.description,
      custom: params.custom,
      icon: params.icon,
      lineItem: params.scoreMaximum ? {
        scoreMaximum: params.scoreMaximum,
        label: params.title,
      } : undefined,
    };
  }

  // ============================================================================
  // ROLE UTILITIES
  // ============================================================================

  /**
   * Check if user has instructor role
   */
  isInstructor(roles: string[]): boolean {
    return roles.some(role => 
      role.includes('Instructor') || 
      role.includes('ContentDeveloper') ||
      role.includes('Administrator')
    );
  }

  /**
   * Check if user has learner role
   */
  isLearner(roles: string[]): boolean {
    return roles.some(role => role.includes('Learner') || role.includes('Student'));
  }

  /**
   * Map LTI roles to AIVO roles
   */
  mapRolesToAivo(ltiRoles: string[]): string[] {
    const aivoRoles: string[] = [];

    for (const role of ltiRoles) {
      if (role.includes('Administrator')) aivoRoles.push('admin');
      if (role.includes('Instructor') || role.includes('Faculty')) aivoRoles.push('teacher');
      if (role.includes('Learner') || role.includes('Student')) aivoRoles.push('student');
      if (role.includes('Mentor')) aivoRoles.push('mentor');
      if (role.includes('ContentDeveloper')) aivoRoles.push('author');
    }

    return [...new Set(aivoRoles)];
  }

  // ============================================================================
  // JWKS ENDPOINT
  // ============================================================================

  /**
   * Get tool's JWKS for platform verification
   */
  getJWKS(): { keys: any[] } {
    // Parse public key and create JWK
    // In production, use proper key conversion
    return {
      keys: [{
        kty: 'RSA',
        kid: this.toolKeyId,
        use: 'sig',
        alg: 'RS256',
        n: this.extractModulus(this.toolPublicKey),
        e: 'AQAB',
      }],
    };
  }

  // ============================================================================
  // PLATFORM MANAGEMENT
  // ============================================================================

  /**
   * Register a new platform
   */
  async registerPlatform(
    tenantId: string,
    config: LTIPlatformConfig
  ): Promise<{ id: string }> {
    const tool = await this.prisma.ltiTool.create({
      data: {
        id: uuidv4(),
        tenantId,
        clientId: config.clientId,
        name: config.name,
        issuer: config.issuer,
        authorizationEndpoint: config.authorizationEndpoint,
        tokenEndpoint: config.tokenEndpoint,
        jwksEndpoint: config.jwksEndpoint,
        deploymentId: config.deploymentId,
        publicKey: config.publicKey,
        status: 'active',
        supportsDeepLinking: true,
        supportsAGS: true,
        supportsNRPS: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    this.logger.log('LTI platform registered', { id: tool.id, name: config.name });

    return { id: tool.id };
  }

  /**
   * List registered platforms
   */
  async listPlatforms(tenantId: string): Promise<any[]> {
    return this.prisma.ltiTool.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        issuer: true,
        clientId: true,
        status: true,
        supportsDeepLinking: true,
        supportsAGS: true,
        supportsNRPS: true,
        createdAt: true,
      },
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private async findPlatform(iss: string, clientId?: string, deploymentId?: string) {
    const where: any = { issuer: iss };
    if (clientId) where.clientId = clientId;
    if (deploymentId) where.deploymentId = deploymentId;

    return this.prisma.ltiTool.findFirst({ where });
  }

  private async createStateToken(payload: LTIStatePayload): Promise<string> {
    const privateKey = await importPKCS8(this.toolPrivateKey, 'RS256');
    
    return new SignJWT(payload as any)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(privateKey);
  }

  private async verifyStateToken(token: string): Promise<LTIStatePayload> {
    const { payload } = await jwtVerify(
      token,
      createRemoteJWKSet(new URL(`${this.baseUrl}/lti/jwks`))
    );
    return payload as unknown as LTIStatePayload;
  }

  private async verifyIdToken(
    token: string,
    platform: any,
    expectedNonce: string
  ): Promise<LTILaunchRequest> {
    // Get platform JWKS
    const JWKS = createRemoteJWKSet(new URL(platform.jwksEndpoint));

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: platform.issuer,
      audience: platform.clientId,
    });

    // Verify nonce
    if (payload.nonce !== expectedNonce) {
      throw new UnauthorizedException('Nonce mismatch');
    }

    // Extract LTI claims
    return this.extractLTIClaims(payload as LTIJWTPayload);
  }

  private extractLTIClaims(payload: LTIJWTPayload): LTILaunchRequest {
    return {
      messageType: payload[LTI_CLAIMS.MESSAGE_TYPE],
      version: payload[LTI_CLAIMS.VERSION],
      deploymentId: payload[LTI_CLAIMS.DEPLOYMENT_ID],
      targetLinkUri: payload[LTI_CLAIMS.TARGET_LINK_URI],
      resourceLink: payload[LTI_CLAIMS.RESOURCE_LINK],
      user: {
        sub: payload.sub,
        name: payload.name,
        givenName: payload.given_name,
        familyName: payload.family_name,
        email: payload.email,
        picture: payload.picture,
      },
      context: payload[LTI_CLAIMS.CONTEXT],
      platformInstance: payload[LTI_CLAIMS.TOOL_PLATFORM],
      launchPresentation: payload[LTI_CLAIMS.LAUNCH_PRESENTATION],
      custom: payload[LTI_CLAIMS.CUSTOM],
      deepLinkingSettings: payload[LTI_CLAIMS.DEEP_LINKING_SETTINGS],
      roles: payload[LTI_CLAIMS.ROLES],
      roleScopeMentor: payload[LTI_CLAIMS.ROLE_SCOPE_MENTOR],
    };
  }

  private extractModulus(publicKey: string): string {
    // Simplified - in production use proper key parsing
    return Buffer.from(publicKey).toString('base64url');
  }
}
