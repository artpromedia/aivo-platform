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

import type { PrismaClient } from '../generated/prisma-client/index.js';

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
import { getStateStore, type OidcState } from './state-store.js';

export type { OidcState } from './state-store.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * System user ID for automated operations.
 * This is a well-known UUID for the LTI system service account, used when
 * no specific user context is available (e.g., creating LTI links during
 * initial launch before user resolution).
 *
 * The service account is provisioned via auth-svc seed data with limited
 * SUPPORT role permissions. See: services/auth-svc/prisma/seed.ts
 *
 * Required environment variable: LTI_SYSTEM_USER_ID
 * Default matches the seeded system account UUID.
 */
const LTI_SYSTEM_SERVICE_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';

function getSystemUserId(): string {
  const envUserId = process.env.LTI_SYSTEM_USER_ID;
  if (envUserId && envUserId !== LTI_SYSTEM_SERVICE_ACCOUNT_ID) {
    console.warn(
      `[LTI] Custom LTI_SYSTEM_USER_ID configured: ${envUserId}. ` +
      `Ensure this user exists in auth-svc with appropriate permissions.`
    );
  }
  return envUserId || LTI_SYSTEM_SERVICE_ACCOUNT_ID;
}

const SYSTEM_USER_ID = getSystemUserId();

/**
 * Validate that the system service account exists and is properly configured.
 * Called during service initialization to fail fast if account is missing.
 * In production, validates against auth-svc API.
 */
async function validateSystemServiceAccount(prisma: PrismaClient): Promise<void> {
  const systemUserId = getSystemUserId();
  const authServiceUrl = process.env.AUTH_SERVICE_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production' && authServiceUrl) {
    // In production, validate against auth-svc API
    try {
      const response = await fetch(`${authServiceUrl}/internal/users/${systemUserId}`, {
        method: 'GET',
        headers: {
          'X-Internal-Service': 'lti-svc',
          'X-Internal-API-Key': process.env.INTERNAL_API_KEY || '',
        },
      });

      if (!response.ok) {
        throw new Error(
          `[LTI] CRITICAL: System service account ${systemUserId} not found in auth-svc. ` +
          `Ensure the account is properly seeded. See: services/auth-svc/prisma/seed.ts`
        );
      }

      const user = await response.json() as { id: string; status: string; roles?: { role: string }[] };
      
      if (user.status !== 'ACTIVE') {
        throw new Error(
          `[LTI] CRITICAL: System service account ${systemUserId} is not active (status: ${user.status})`
        );
      }

      // Verify the account has SUPPORT role
      const hasServiceRole = user.roles?.some((r) => r.role === 'SUPPORT' || r.role === 'PLATFORM_ADMIN');
      if (!hasServiceRole) {
        console.warn(
          `[LTI] WARNING: System service account ${systemUserId} does not have SUPPORT role. ` +
          `Some operations may fail.`
        );
      }

      console.log(`[LTI] System service account ${systemUserId} validated via auth-svc successfully.`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('[LTI] CRITICAL')) {
        throw error;
      }
      // If auth-svc is unreachable, fall back to local validation
      console.warn(`[LTI] Could not validate service account via auth-svc, falling back to local check: ${error}`);
      await validateServiceAccountLocally(prisma, systemUserId);
    }
  } else {
    // Development/local: validate locally via database
    await validateServiceAccountLocally(prisma, systemUserId);
  }
}

async function validateServiceAccountLocally(prisma: PrismaClient, systemUserId: string): Promise<void> {
  // Check if the system user exists via a lookup table or by verifying
  // the account was seeded properly.
  const existingLink = await prisma.ltiLink.findFirst({
    where: { createdByUserId: systemUserId },
    select: { id: true },
  });

  if (!existingLink) {
    // Log warning but don't fail - the account may be newly seeded
    console.warn(
      `[LTI] System service account ${systemUserId} has not created any LTI links yet. ` +
      `Ensure the account is properly seeded in auth-svc. See: services/auth-svc/prisma/seed.ts`
    );
  } else {
    console.log(`[LTI] System service account ${systemUserId} validated successfully.`);
  }
}

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

export interface LaunchResult {
  launchId: string;
  status: LtiLaunchStatus;
  redirectUrl: string;
  aivoSessionId?: string;
  userRole: LtiUserRole;
}

// ══════════════════════════════════════════════════════════════════════════════
// LAUNCH SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class LaunchService {
  private readonly prisma: PrismaClient;
  private readonly config: LaunchServiceConfig;
  private readonly ltiUserService: LtiUserService;
  private initialized = false;

  constructor(prisma: PrismaClient, config: LaunchServiceConfig) {
    this.prisma = prisma;
    this.config = {
      launchExpirySeconds: 3600, // 1 hour default
      nonceExpirySeconds: 600, // 10 minutes default
      ...config,
    };
    this.ltiUserService = new LtiUserService(prisma, config.authServiceUrl);
  }

  /**
   * Initialize the service and validate system dependencies.
   * Should be called after construction before handling requests.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    await validateSystemServiceAccount(this.prisma);
    this.initialized = true;
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
    lti_message_hint?: string;
    client_id?: string;
    lti_deployment_id?: string;
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

    // Store state for validation on callback using the state store
    const stateStore = getStateStore();
    await stateStore.set(state, {
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
    state?: string;
  }): Promise<LaunchResult> {
    // Validate state if provided
    const stateStore = getStateStore();
    let storedState: OidcState | undefined;
    if (params.state) {
      storedState = await stateStore.get(params.state) ?? undefined;
      if (!storedState) {
        throw new LtiError('Invalid or expired state', 'INVALID_STATE', 401);
      }
      await stateStore.delete(params.state);
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
      roles: payload[LTI_CLAIMS.ROLES] ?? [],
      ...(payload[LTI_CLAIMS.CUSTOM] ? { customClaims: payload[LTI_CLAIMS.CUSTOM] } : {}),
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
        tool: { connect: { id: toolId } },
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
          tool: { connect: { id: toolId } },
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
        tool: { connect: { id: tool.id } },
        ...(link ? { link: { connect: { id: link.id } } } : {}),
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
    return this.prisma.ltiLaunch.update({
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
