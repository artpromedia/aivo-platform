/**
 * Session Routes - Tool Session Lifecycle
 *
 * Endpoints for creating, managing, and ending tool sessions.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';
import { config } from '../config.js';
import {
  generateToolLaunchToken,
  buildLearnerContext,
  initializeSigningKey,
} from '../services/token.service.js';
import {
  ToolSessionStatus,
  ActorType,
  ToolScope,
  EmbeddedToolLaunchType,
  type CreateSessionRequest,
  type CreateSessionResponse,
  type ToolLaunchPayload,
} from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// Schema Validation
// ══════════════════════════════════════════════════════════════════════════════

const CreateSessionSchema = z.object({
  tenantId: z.string().uuid(),
  marketplaceItemId: z.string().uuid(),
  marketplaceItemVersionId: z.string().uuid().optional(),
  installationId: z.string().uuid(),
  learnerId: z.string().uuid().optional(),
  classroomId: z.string().uuid().optional(),
  assignmentId: z.string().uuid().optional(),
  createdByUserId: z.string().uuid(),
  createdByActorType: z.nativeEnum(ActorType),
  launchConfig: z.record(z.unknown()).optional(),
});

const SessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});

// ══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch embedded tool config from marketplace-svc
 * In production, this would be an HTTP call to marketplace-svc
 */
async function fetchToolConfig(
  _marketplaceItemId: string,
  _marketplaceItemVersionId: string
): Promise<{
  launchUrl: string;
  launchType: EmbeddedToolLaunchType;
  requiredScopes: ToolScope[];
  optionalScopes: ToolScope[];
  sandboxAttributes: string[];
  cspDirectives?: string;
  vendorSlug: string;
  defaultConfig?: Record<string, unknown>;
}> {
  // TODO: Fetch from marketplace-svc
  // For now, return mock data
  return {
    launchUrl: 'https://tool.example.com/launch',
    launchType: EmbeddedToolLaunchType.IFRAME_WEB,
    requiredScopes: [ToolScope.LEARNER_PROFILE_MIN, ToolScope.SESSION_EVENTS_WRITE],
    optionalScopes: [ToolScope.THEME_READ],
    sandboxAttributes: ['allow-scripts', 'allow-same-origin', 'allow-forms'],
    cspDirectives: "frame-src 'self' https://tool.example.com",
    vendorSlug: 'example-vendor',
    defaultConfig: {},
  };
}

/**
 * Fetch tenant tool policy
 */
async function fetchTenantPolicy(tenantId: string) {
  const policy = await prisma.tenantToolPolicy.findUnique({
    where: { tenantId },
  });

  // Return defaults if no policy
  if (!policy) {
    return {
      allowedScopes: Object.values(ToolScope).filter(
        (s) =>
          // Default: allow basic scopes, deny elevated ones
          s !== ToolScope.LEARNER_NAME_FULL &&
          s !== ToolScope.LEARNER_GRADE_EXACT &&
          s !== ToolScope.TEACHER_CONTEXT
      ) as ToolScope[],
      deniedScopes: [] as ToolScope[],
      maxSessionDurationMin: config.defaultSessionDurationMin,
      idleTimeoutMin: config.defaultIdleTimeoutMin,
      maxConcurrentSessions: 1,
      allowTokenRefresh: true,
      maxTokenRefreshes: 3,
    };
  }

  return policy;
}

/**
 * Fetch learner profile (minimal)
 * In production, this would call learner-model-svc
 */
async function fetchLearnerProfile(_learnerId: string): Promise<{
  firstName: string;
  gradeBand: string;
  gradeLevel: number;
  subject?: string;
}> {
  // TODO: Fetch from learner-model-svc
  return {
    firstName: 'John',
    gradeBand: 'G3_5',
    gradeLevel: 4,
    subject: 'MATH',
  };
}

/**
 * Calculate scope intersection
 */
function calculateGrantedScopes(
  toolRequiredScopes: ToolScope[],
  toolOptionalScopes: ToolScope[],
  tenantAllowedScopes: ToolScope[],
  tenantDeniedScopes: ToolScope[]
): ToolScope[] {
  const allowedSet = new Set(tenantAllowedScopes);
  const deniedSet = new Set(tenantDeniedScopes);

  // Start with required scopes that are allowed and not denied
  const granted: ToolScope[] = toolRequiredScopes.filter(
    (scope) => allowedSet.has(scope) && !deniedSet.has(scope)
  );

  // Add optional scopes that are allowed and not denied
  toolOptionalScopes.forEach((scope) => {
    if (allowedSet.has(scope) && !deniedSet.has(scope)) {
      granted.push(scope);
    }
  });

  return granted;
}

// ══════════════════════════════════════════════════════════════════════════════
// Route Handlers
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /sessions
 * Create a new tool session and generate launch token
 */
async function createSession(
  request: FastifyRequest<{ Body: CreateSessionRequest }>,
  reply: FastifyReply
): Promise<CreateSessionResponse> {
  const data = CreateSessionSchema.parse(request.body);

  // 1. Fetch tool configuration
  const toolConfig = await fetchToolConfig(data.marketplaceItemId, data.marketplaceItemVersionId ?? '');

  // 2. Fetch tenant policy
  const tenantPolicy = await fetchTenantPolicy(data.tenantId);

  // 3. Calculate granted scopes (intersection)
  const grantedScopes = calculateGrantedScopes(
    toolConfig.requiredScopes,
    toolConfig.optionalScopes,
    tenantPolicy.allowedScopes,
    tenantPolicy.deniedScopes
  );

  // 4. Check if all required scopes are granted
  const missingRequired = toolConfig.requiredScopes.filter((s) => !grantedScopes.includes(s));
  if (missingRequired.length > 0) {
    return reply.status(403).send({
      error: 'Insufficient permissions',
      message: `Tenant policy does not allow required scopes: ${missingRequired.join(', ')}`,
    });
  }

  // 5. Fetch learner profile if needed
  let learnerProfile: Awaited<ReturnType<typeof fetchLearnerProfile>> | undefined;
  if (data.learnerId) {
    learnerProfile = await fetchLearnerProfile(data.learnerId);
  }

  // 6. Calculate session expiry
  const now = new Date();
  const expiresAt = new Date(now.getTime() + tenantPolicy.maxSessionDurationMin * 60 * 1000);

  // 7. Build learner context (based on scopes)
  const learnerContext = data.learnerId
    ? buildLearnerContext({
        learnerId: data.learnerId,
        tenantId: data.tenantId,
        firstName: learnerProfile?.firstName,
        gradeBand: learnerProfile?.gradeBand,
        gradeLevel: learnerProfile?.gradeLevel,
        subject: learnerProfile?.subject,
        grantedScopes,
      })
    : undefined;

  // 8. Generate launch token
  await initializeSigningKey();
  const tokenResult = await generateToolLaunchToken({
    sessionId: '', // Will be set after session creation
    tenantId: data.tenantId,
    marketplaceItemId: data.marketplaceItemId,
    marketplaceItemVersionId: data.marketplaceItemVersionId ?? '',
    installationId: data.installationId,
    learnerId: data.learnerId,
    classroomId: data.classroomId,
    scopes: grantedScopes,
    audience: toolConfig.vendorSlug,
    expirySeconds: config.defaultTokenExpiryMin * 60,
  });

  // 9. Create session in database
  const session = await prisma.toolSession.create({
    data: {
      tenantId: data.tenantId,
      marketplaceItemId: data.marketplaceItemId,
      marketplaceItemVersionId: data.marketplaceItemVersionId ?? '',
      installationId: data.installationId,
      learnerId: data.learnerId ?? null,
      pseudonymousLearnerId: tokenResult.pseudonymousLearnerId ?? null,
      classroomId: data.classroomId ?? null,
      assignmentId: data.assignmentId ?? null,
      createdByUserId: data.createdByUserId,
      createdByActorType: data.createdByActorType,
      grantedScopes: grantedScopes,
      status: ToolSessionStatus.ACTIVE,
      launchConfigJson: data.launchConfig ?? toolConfig.defaultConfig ?? {},
      learnerContextJson: learnerContext ?? {},
      tokenJti: tokenResult.jti,
      tokenExpiresAt: new Date(tokenResult.expiresAt * 1000),
      expiresAt,
    },
  });

  // 10. Regenerate token with actual session ID
  const finalToken = await generateToolLaunchToken({
    sessionId: session.id,
    tenantId: data.tenantId,
    marketplaceItemId: data.marketplaceItemId,
    marketplaceItemVersionId: data.marketplaceItemVersionId ?? '',
    installationId: data.installationId,
    learnerId: data.learnerId,
    classroomId: data.classroomId,
    scopes: grantedScopes,
    audience: toolConfig.vendorSlug,
    expirySeconds: config.defaultTokenExpiryMin * 60,
  });

  // Update session with final token jti
  await prisma.toolSession.update({
    where: { id: session.id },
    data: {
      tokenJti: finalToken.jti,
      tokenExpiresAt: new Date(finalToken.expiresAt * 1000),
    },
  });

  // 11. Create audit log
  await prisma.tokenAuditLog.create({
    data: {
      toolSessionId: session.id,
      operation: 'CREATED',
      tokenJti: finalToken.jti,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      success: true,
    },
  });

  // 12. Build launch payload
  const launchPayload: ToolLaunchPayload = {
    token: finalToken.token,
    sessionId: session.id,
    scopes: grantedScopes,
    learner: learnerContext,
    theme: grantedScopes.includes(ToolScope.THEME_READ)
      ? {
          mode: 'light',
          primaryColor: '#4F46E5',
          accentColor: '#10B981',
          gradeBandStyle: 'elementary',
        }
      : undefined,
    config: (session.launchConfigJson as Record<string, unknown>) ?? {},
    platform: {
      name: 'aivo',
      version: config.platformVersion,
      environment: config.platformEnvironment,
      messageOrigin: config.messageOrigin,
    },
  };

  // 13. Build launch URL with token
  const launchUrl = new URL(toolConfig.launchUrl);
  launchUrl.searchParams.set('token', finalToken.token);
  launchUrl.searchParams.set('session_id', session.id);

  request.log.info(
    { sessionId: session.id, itemId: data.marketplaceItemId, scopes: grantedScopes },
    'Tool session created'
  );

  return {
    sessionId: session.id,
    launchUrl: launchUrl.toString(),
    launchType: toolConfig.launchType,
    launchPayload,
    expiresAt: expiresAt.toISOString(),
    sandboxAttributes: toolConfig.sandboxAttributes,
    cspDirectives: toolConfig.cspDirectives,
  };
}

/**
 * GET /sessions/:sessionId
 * Get session details
 */
async function getSession(
  request: FastifyRequest<{ Params: z.infer<typeof SessionIdSchema> }>,
  reply: FastifyReply
) {
  const { sessionId } = SessionIdSchema.parse(request.params);

  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
    include: {
      _count: {
        select: { events: true },
      },
    },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  return {
    sessionId: session.id,
    tenantId: session.tenantId,
    marketplaceItemId: session.marketplaceItemId,
    learnerId: session.learnerId,
    status: session.status,
    grantedScopes: session.grantedScopes,
    createdAt: session.createdAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    endedAt: session.endedAt?.toISOString(),
    lastActivityAt: session.lastActivityAt.toISOString(),
    totalEvents: session._count.events,
  };
}

/**
 * POST /sessions/:sessionId/end
 * End a tool session
 */
async function endSession(
  request: FastifyRequest<{
    Params: z.infer<typeof SessionIdSchema>;
    Body: { reason: 'completed' | 'user_exit' | 'error' | 'admin_revoke' };
  }>,
  reply: FastifyReply
) {
  const { sessionId } = SessionIdSchema.parse(request.params);
  const { reason } = request.body;

  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.status !== ToolSessionStatus.ACTIVE) {
    return reply.status(400).send({ error: 'Session is not active' });
  }

  const newStatus =
    reason === 'admin_revoke'
      ? ToolSessionStatus.REVOKED
      : reason === 'error'
        ? ToolSessionStatus.EXPIRED
        : ToolSessionStatus.COMPLETED;

  await prisma.toolSession.update({
    where: { id: sessionId },
    data: {
      status: newStatus,
      endedAt: new Date(),
    },
  });

  request.log.info({ sessionId, reason, newStatus }, 'Tool session ended');

  return { success: true, status: newStatus };
}

/**
 * POST /sessions/:sessionId/refresh-token
 * Refresh the session token
 */
async function refreshSessionToken(
  request: FastifyRequest<{ Params: z.infer<typeof SessionIdSchema> }>,
  reply: FastifyReply
) {
  const { sessionId } = SessionIdSchema.parse(request.params);

  const session = await prisma.toolSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return reply.status(404).send({ error: 'Session not found' });
  }

  if (session.status !== ToolSessionStatus.ACTIVE) {
    return reply.status(400).send({ error: 'Session is not active' });
  }

  // Fetch tenant policy for refresh limits
  const policy = await fetchTenantPolicy(session.tenantId);

  if (!policy.allowTokenRefresh) {
    return reply.status(403).send({ error: 'Token refresh not allowed by tenant policy' });
  }

  if (session.tokenRefreshCount >= policy.maxTokenRefreshes) {
    return reply.status(403).send({ error: 'Maximum token refresh count exceeded' });
  }

  // Generate new token
  await initializeSigningKey();
  const newToken = await generateToolLaunchToken({
    sessionId,
    tenantId: session.tenantId,
    marketplaceItemId: session.marketplaceItemId,
    marketplaceItemVersionId: session.marketplaceItemVersionId,
    installationId: session.installationId,
    learnerId: session.learnerId ?? undefined,
    classroomId: session.classroomId ?? undefined,
    scopes: session.grantedScopes as ToolScope[],
    audience: 'tool', // TODO: Get from tool config
    expirySeconds: config.defaultTokenExpiryMin * 60,
  });

  // Update session
  await prisma.toolSession.update({
    where: { id: sessionId },
    data: {
      tokenJti: newToken.jti,
      tokenExpiresAt: new Date(newToken.expiresAt * 1000),
      tokenRefreshCount: { increment: 1 },
      lastActivityAt: new Date(),
    },
  });

  // Audit log
  await prisma.tokenAuditLog.create({
    data: {
      toolSessionId: sessionId,
      operation: 'REFRESHED',
      tokenJti: newToken.jti,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'] ?? null,
      success: true,
      metadataJson: { refreshCount: session.tokenRefreshCount + 1 },
    },
  });

  request.log.info({ sessionId, refreshCount: session.tokenRefreshCount + 1 }, 'Token refreshed');

  return {
    token: newToken.token,
    expiresAt: new Date(newToken.expiresAt * 1000).toISOString(),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugin Registration
// ══════════════════════════════════════════════════════════════════════════════

export async function sessionRoutes(fastify: FastifyInstance) {
  fastify.post('/', createSession);
  fastify.get('/:sessionId', getSession);
  fastify.post('/:sessionId/end', endSession);
  fastify.post('/:sessionId/refresh-token', refreshSessionToken);
}
