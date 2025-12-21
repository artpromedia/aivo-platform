/**
 * LTI Launch Service
 *
 * Handles the complete LTI launch flow:
 * 1. OIDC login initiation
 * 2. Token validation
 * 3. User mapping
 * 4. Session creation
 * 5. Deep linking to activity
 */

import type { PrismaClient } from '@prisma/client';

import type { LtiToolRecord } from './lti-auth.js';
import {
  validateIdToken,
  processLaunchPayload,
  createOidcAuthRequest,
  LtiError,
} from './lti-auth.js';
import { LtiUserService, type LtiUserContext, type ResolvedUser } from './lti-user-service.js';
import type { LtiIdTokenPayload } from './types.js';
import { LtiUserRole, LtiLaunchStatus, LTI_CLAIMS } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * System user ID for automated operations.
 * This is a well-known UUID used when no specific user context is available,
 * such as when creating LTI links during initial launch before user resolution.
 *
 * Note: This should be a real system user in the auth service with limited permissions.
 * TODO: Create dedicated system service account in auth-svc
 */
const SYSTEM_USER_ID = process.env.LTI_SYSTEM_USER_ID || '00000000-0000-0000-0000-000000000001';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface LaunchServiceConfig {
  /** Base URL for the LTI service */
  baseUrl: string;
  /** Launch session expiry in seconds */
  launchExpirySeconds?: number;
  /** Nonce expiry in seconds */
  nonceExpirySeconds?: number;
  /** Auth service URL for user creation/lookup */
  authServiceUrl?: string;
}

export interface OidcState {
  toolId: string;
  nonce: string;
  targetLinkUri: string;
  createdAt: Date;
}

export interface LaunchResult {
  launchId: string;
  status: LtiLaunchStatus;
  redirectUrl: string;
  aivoSessionId?: string | undefined;
  userRole: LtiUserRole;
}

// ══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STATE STORE (replace with Redis in production)
// ══════════════════════════════════════════════════════════════════════════════

const stateStore = new Map<string, OidcState>();
const STATE_TTL = 10 * 60 * 1000; // 10 minutes

function cleanExpiredStates() {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
    if (now - data.createdAt.getTime() > STATE_TTL) {
      stateStore.delete(state);
    }
  }
}

// Clean up every 5 minutes
setInterval(cleanExpiredStates, 5 * 60 * 1000);

// ══════════════════════════════════════════════════════════════════════════════
// LAUNCH SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class LaunchService {
  private readonly prisma: PrismaClient;
  private readonly config: LaunchServiceConfig;
  private readonly ltiUserService: LtiUserService;

  constructor(prisma: PrismaClient, config: LaunchServiceConfig) {
    this.prisma = prisma;
    this.config = {
      launchExpirySeconds: 3600, // 1 hour default
      nonceExpirySeconds: 600, // 10 minutes default
      ...config,
    };
    this.ltiUserService = new LtiUserService(prisma, config.authServiceUrl);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // OIDC LOGIN INITIATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Handle OIDC login initiation from LMS
   * Returns redirect URL to platform's authorization endpoint
   */
  async handleOidcLogin(params: {
    iss: string;
    login_hint: string;
    target_link_uri: string;
    lti_message_hint?: string | undefined;
    client_id?: string | undefined;
    lti_deployment_id?: string | undefined;
  }): Promise<{ redirectUrl: string }> {
    // Find matching tool registration
    const tool = await this.findTool(params.iss, params.client_id, params.lti_deployment_id);

    if (!tool) {
      throw new LtiError(
        `No tool registration found for issuer: ${params.iss}`,
        'TOOL_NOT_FOUND',
        404
      );
    }

    if (!tool.enabled) {
      throw new LtiError('LTI tool is disabled', 'TOOL_DISABLED', 403);
    }

    // Create OIDC auth request
    const redirectUri = `${this.config.baseUrl}/lti/launch`;
    const { authUrl, state, nonce } = createOidcAuthRequest(
      {
        iss: params.iss,
        login_hint: params.login_hint,
        target_link_uri: params.target_link_uri,
        ...(params.lti_message_hint ? { lti_message_hint: params.lti_message_hint } : {}),
      },
      tool as LtiToolRecord,
      redirectUri
    );

    // Store state for validation on callback
    stateStore.set(state, {
      toolId: tool.id,
      nonce,
      targetLinkUri: params.target_link_uri,
      createdAt: new Date(),
    });

    return { redirectUrl: authUrl };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LAUNCH HANDLING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Handle LTI launch callback (id_token from LMS)
   */
  async handleLaunch(params: {
    id_token: string;
    state?: string | undefined;
  }): Promise<LaunchResult> {
    // Validate state if provided
    let storedState: OidcState | undefined;
    if (params.state) {
      storedState = stateStore.get(params.state);
      if (!storedState) {
        throw new LtiError('Invalid or expired state', 'INVALID_STATE', 401);
      }
      stateStore.delete(params.state);
    }

    // Decode token header to get issuer (for tool lookup)
    const tokenParts = params.id_token.split('.');
    if (tokenParts.length !== 3 || !tokenParts[1]) {
      throw new LtiError('Invalid JWT format', 'INVALID_TOKEN', 400);
    }

    const payloadJson = Buffer.from(tokenParts[1], 'base64url').toString('utf8');
    const unverifiedPayload = JSON.parse(payloadJson) as LtiIdTokenPayload;

    // Find tool registration
    let tool: Awaited<ReturnType<typeof this.findTool>>;
    if (storedState) {
      tool = await this.prisma.ltiTool.findUnique({
        where: { id: storedState.toolId },
      });
    } else {
      const deploymentId = unverifiedPayload[LTI_CLAIMS.DEPLOYMENT_ID];
      const aud = Array.isArray(unverifiedPayload.aud)
        ? unverifiedPayload.aud[0]
        : unverifiedPayload.aud;
      tool = await this.findTool(unverifiedPayload.iss, aud, deploymentId);
    }

    if (!tool) {
      throw new LtiError('Tool registration not found', 'TOOL_NOT_FOUND', 404);
    }

    // Validate the id_token
    const payload = await validateIdToken(params.id_token, tool as LtiToolRecord, {
      ...(storedState?.nonce ? { expectedNonce: storedState.nonce } : {}),
      checkNonceUsed: (nonce) => this.checkNonceUsed(tool.id, nonce),
      markNonceUsed: (nonce, expiresAt) => this.markNonceUsed(tool.id, nonce, expiresAt),
    });

    // Process launch payload
    const launchData = processLaunchPayload(payload, tool as LtiToolRecord);

    // Resolve LTI link (if resource link provided)

    let ltiLink: Awaited<ReturnType<typeof this.findOrCreateLink>> | null = null;
    const resourceLink = payload[LTI_CLAIMS.RESOURCE_LINK] as
      | { id?: string; title?: string }
      | undefined;
    if (resourceLink?.id) {
      ltiLink = await this.findOrCreateLink(
        tool.id,
        tool.tenantId,
        launchData.lmsContextId,
        resourceLink.id,
        resourceLink.title
      );
    }

    // Resolve or create AIVO user using the user service
    const userContext: LtiUserContext = {
      issuer: payload.iss,
      clientId: Array.isArray(payload.aud) ? (payload.aud[0] ?? '') : payload.aud,
      deploymentId: payload[LTI_CLAIMS.DEPLOYMENT_ID] || '',
      sub: payload.sub,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.given_name ? { givenName: payload.given_name } : {}),
      ...(payload.family_name ? { familyName: payload.family_name } : {}),
      ...(payload.name ? { name: payload.name } : {}),
      roles: payload[LTI_CLAIMS.ROLES]! || [],
      ...(payload[LTI_CLAIMS.CUSTOM] ? { customClaims: payload[LTI_CLAIMS.CUSTOM]! } : {}),
      tenantId: tool.tenantId,
      toolId: tool.id,
    };

    const resolvedUser = await this.ltiUserService.resolveOrCreateUser(userContext);

    // Create launch record with resolved user
    const launch = await this.createLaunchRecord(tool, ltiLink, launchData, resolvedUser, payload);

    // Determine redirect URL based on role
    const redirectUrl = this.buildRedirectUrl(launch.id, launchData.userRole, ltiLink);

    return {
      launchId: launch.id,
      status: launch.status as LtiLaunchStatus,
      redirectUrl,
      ...(launch.aivoSessionId ? { aivoSessionId: launch.aivoSessionId } : {}),
      userRole: launchData.userRole,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HELPER METHODS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Find tool registration by issuer and optional client_id/deployment_id
   */
  private async findTool(issuer: string, clientId?: string, deploymentId?: string) {
    const where: Record<string, unknown> = { issuer, enabled: true };
    if (clientId) where.clientId = clientId;
    if (deploymentId) where.deploymentId = deploymentId;

    return this.prisma.ltiTool.findFirst({ where });
  }

  /**
   * Check if nonce was already used
   */
  private async checkNonceUsed(toolId: string, nonce: string): Promise<boolean> {
    const existing = await this.prisma.ltiNonce.findUnique({
      where: {
        ltiToolId_nonce: {
          ltiToolId: toolId,
          nonce,
        },
      },
    });
    return !!existing;
  }

  /**
   * Mark nonce as used
   */
  private async markNonceUsed(toolId: string, nonce: string, expiresAt: Date): Promise<void> {
    await this.prisma.ltiNonce.create({
      data: {
        ltiToolId: toolId,
        nonce,
        expiresAt,
      },
    });
  }

  /**
   * Find or create LTI link for resource
   */
  private async findOrCreateLink(
    toolId: string,
    tenantId: string,
    lmsContextId: string | undefined,
    lmsResourceLinkId: string,
    title?: string
  ) {
    // Try to find existing link
    let link = await this.prisma.ltiLink.findFirst({
      where: {
        ltiToolId: toolId,
        lmsContextId: lmsContextId || null,
        lmsResourceLinkId,
      },
    });

    if (!link) {
      // Create a new link (will be configured later by teacher)
      // Uses system user since link is created before user is resolved
      link = await this.prisma.ltiLink.create({
        data: {
          tenantId,
          ltiToolId: toolId,
          lmsContextId: lmsContextId ?? null,
          lmsResourceLinkId,
          title: title || 'Untitled Activity',
          createdByUserId: SYSTEM_USER_ID,
        },
      });
    }

    return link;
  }

  /**
   * Create launch record
   */
  private async createLaunchRecord(
    tool: { id: string; tenantId: string },
    link: { id: string } | null,
    launchData: ReturnType<typeof processLaunchPayload>,
    resolvedUser: ResolvedUser,
    payload: LtiIdTokenPayload
  ) {
    const expirySeconds = this.config.launchExpirySeconds ?? 7200;
    const expiresAt = new Date(Date.now() + expirySeconds * 1000);

    return this.prisma.ltiLaunch.create({
      data: {
        tenantId: tool.tenantId,
        ltiToolId: tool.id,
        ltiLinkId: link?.id ?? null,
        lmsUserId: launchData.lmsUserId,
        lmsUserEmail: launchData.lmsUserEmail ?? null,
        lmsUserName: launchData.lmsUserName ?? null,
        userRole: launchData.userRole,
        aivoUserId: resolvedUser.userId,
        aivoLearnerId: resolvedUser.role === 'LEARNER' ? resolvedUser.userId : null, // Will be resolved by learner-model-svc
        lmsContextId: launchData.lmsContextId ?? null,
        lmsContextTitle: launchData.lmsContextTitle ?? null,
        lmsResourceLinkId: launchData.lmsResourceLinkId ?? null,
        status: LtiLaunchStatus.ACTIVE,
        nonce: payload.nonce,
        expiresAt,
        launchParamsJson: payload as object,
      },
    });
  }

  /**
   * Build redirect URL after successful launch
   */
  private buildRedirectUrl(
    launchId: string,
    role: LtiUserRole,
    link: { loVersionId?: string | null; activityTemplateId?: string | null } | null
  ): string {
    // Base URL for LTI session
    let url = `${this.config.baseUrl}/lti/session/${launchId}`;

    // Add activity target if known
    if (link?.loVersionId) {
      url += `?activity=${link.loVersionId}`;
    } else if (link?.activityTemplateId) {
      url += `?template=${link.activityTemplateId}`;
    }

    // Role-based routing
    if (
      role === LtiUserRole.INSTRUCTOR ||
      role === LtiUserRole.TEACHING_ASSISTANT ||
      role === LtiUserRole.ADMINISTRATOR
    ) {
      url += url.includes('?') ? '&' : '?';
      url += 'view=teacher';
    }

    return url;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get launch details for session page
   */
  async getLaunch(launchId: string) {
    const launch = await this.prisma.ltiLaunch.findUnique({
      where: { id: launchId },
      include: {
        tool: true,
        link: true,
      },
    });

    if (!launch) {
      throw new LtiError('Launch not found', 'LAUNCH_NOT_FOUND', 404);
    }

    // Check expiration
    if (new Date() > launch.expiresAt) {
      throw new LtiError('Launch session expired', 'LAUNCH_EXPIRED', 401);
    }

    return launch;
  }

  /**
   * Mark launch as completed
   */
  async completeLaunch(launchId: string, sessionId?: string) {
    await this.prisma.ltiLaunch.update({
      where: { id: launchId },
      data: {
        status: LtiLaunchStatus.COMPLETED,
        completedAt: new Date(),
        aivoSessionId: sessionId ?? null,
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CLEANUP
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Clean up expired nonces
   */
  async cleanupExpiredNonces() {
    const result = await this.prisma.ltiNonce.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
    return result.count;
  }

  /**
   * Clean up expired launches
   */
  async cleanupExpiredLaunches() {
    const result = await this.prisma.ltiLaunch.updateMany({
      where: {
        status: LtiLaunchStatus.ACTIVE,
        expiresAt: {
          lt: new Date(),
        },
      },
      data: {
        status: LtiLaunchStatus.EXPIRED,
      },
    });
    return result.count;
  }
}
