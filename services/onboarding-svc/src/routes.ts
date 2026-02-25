import type { AuthContext } from '@aivo/ts-rbac';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import {
  CheckFeaturesSeenSchema,
  CompleteStepSchema,
  MarkFeatureSeenSchema,
  SkipStepSchema,
} from './schemas.js';
import * as svc from './service.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function requireAuth(request: FastifyRequest): AuthContext {
  const auth = request.auth;
  if (!auth?.userId || !auth?.tenantId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return auth;
}

function requireUserId(request: FastifyRequest): string {
  const auth = request.auth;
  if (!auth?.userId) {
    throw Object.assign(new Error('Unauthorized'), { statusCode: 401 });
  }
  return auth.userId;
}

function requireAdmin(request: FastifyRequest): AuthContext {
  const auth = requireAuth(request);
  const roleStrings = auth.roles.map(String);
  if (!roleStrings.includes('platform_admin') && !roleStrings.includes('district_admin')) {
    throw Object.assign(new Error('Forbidden — admin role required'), { statusCode: 403 });
  }
  return auth;
}

// ─── Onboarding Progress Routes ──────────────────────────────────────

export async function registerProgressRoutes(app: FastifyInstance) {
  // GET /api/onboarding/progress/:flowId — Get progress for a flow
  app.get('/api/onboarding/progress/:flowId', async (request, reply) => {
    const userId = requireUserId(request);
    const { flowId } = request.params as { flowId: string };
    const progress = await svc.getProgress(userId, flowId);
    if (!progress) {
      return reply.status(404).send({ error: 'No progress found' });
    }
    return reply.send(progress);
  });

  // GET /api/onboarding/progress — Get all flows progress
  app.get('/api/onboarding/progress', async (request, reply) => {
    const userId = requireUserId(request);
    const progress = await svc.getAllProgress(userId);
    return reply.send(progress);
  });

  // POST /api/onboarding/progress/:flowId/complete — Complete a step
  app.post('/api/onboarding/progress/:flowId/complete', async (request, reply) => {
    const auth = requireAuth(request);
    const { flowId } = request.params as { flowId: string };
    const parsed = CompleteStepSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const result = await svc.completeStep(auth.userId, auth.tenantId, flowId, parsed.data.stepId);
    return reply.send(result);
  });

  // POST /api/onboarding/progress/:flowId/skip — Skip a step
  app.post('/api/onboarding/progress/:flowId/skip', async (request, reply) => {
    const auth = requireAuth(request);
    const { flowId } = request.params as { flowId: string };
    const parsed = SkipStepSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const result = await svc.skipStep(auth.userId, auth.tenantId, flowId, parsed.data.stepId);
    return reply.send(result);
  });

  // POST /api/onboarding/progress/:flowId/dismiss — Dismiss wizard
  app.post('/api/onboarding/progress/:flowId/dismiss', async (request, reply) => {
    const userId = requireUserId(request);
    const { flowId } = request.params as { flowId: string };
    const result = await svc.dismissFlow(userId, flowId);
    if (!result) {
      return reply.status(404).send({ error: 'No progress found to dismiss' });
    }
    return reply.send(result);
  });

  // POST /api/onboarding/progress/:flowId/reset — Reset progress
  app.post('/api/onboarding/progress/:flowId/reset', async (request, reply) => {
    const auth = requireAuth(request);
    const { flowId } = request.params as { flowId: string };
    const result = await svc.resetFlow(auth.userId, auth.tenantId, flowId);
    return reply.send(result);
  });
}

// ─── Feature Seen Routes ─────────────────────────────────────────────

export async function registerFeatureRoutes(app: FastifyInstance) {
  // POST /api/onboarding/features/seen — Mark feature as seen
  app.post('/api/onboarding/features/seen', async (request, reply) => {
    const auth = requireAuth(request);
    const parsed = MarkFeatureSeenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const result = await svc.markFeatureSeen(auth.userId, auth.tenantId, parsed.data.featureKey);
    return reply.send(result);
  });

  // POST /api/onboarding/features/check — Check multiple features seen status
  app.post('/api/onboarding/features/check', async (request, reply) => {
    const userId = requireUserId(request);
    const parsed = CheckFeaturesSeenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const result = await svc.checkFeaturesSeen(userId, parsed.data.featureKeys);
    return reply.send(result);
  });

  // GET /api/onboarding/features/list — List all seen features
  app.get('/api/onboarding/features/list', async (request, reply) => {
    const userId = requireUserId(request);
    const result = await svc.getFeatureSeenList(userId);
    return reply.send(result);
  });
}

// ─── Admin Routes ────────────────────────────────────────────────────

export async function registerAdminRoutes(app: FastifyInstance) {
  // GET /api/admin/onboarding/analytics/:flowId — Flow analytics
  app.get('/api/admin/onboarding/analytics/:flowId', async (request, reply) => {
    const auth = requireAdmin(request);
    const { flowId } = request.params as { flowId: string };
    const result = await svc.getFlowAnalytics(auth.tenantId, flowId);
    return reply.send(result);
  });
}
