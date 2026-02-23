import { randomUUID } from 'node:crypto';

import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyRequest } from 'fastify';
import Redis from 'ioredis';
import { Pool } from 'pg';

import { config } from './config.js';

// Type assertion helper for Fastify plugins with type provider mismatches

const registerPlugin = (app: any, plugin: unknown, opts?: unknown) => app.register(plugin, opts);
import { IncidentService } from './incidents/index.js';
import { createPolicyEnforcer, type PolicyEnforcer } from './policy/index.js';
import { createLLMOrchestratorFromEnv } from './providers/llm-orchestrator.js';
import { AgentConfigRegistry, createAgentConfigStore } from './registry/index.js';
import type { AgentConfigStore } from './registry/store.js';
import { registerAdminStatsRoutes } from './routes/adminStats.js';
import { registerBrainRoutes } from './routes/brain.js';
import { emotionalStateRoutes } from './routes/emotionalState.js';
import { registerFederatedLearningRoutes } from './routes/federated-learning.js';
import { registerFineTuningRoutes } from './routes/fine-tuning.js';
import gameGenerationRoutes from './routes/game-generation.js';
import generationRoutes from './routes/generation.js';
import { healthRoutes } from './routes/health.js';
import iepGenerationRoutes from './routes/iep-generation.js';
import { registerInternalRoutes } from './routes/internal.js';
import { registerPromptDebuggingRoutes } from './routes/prompt-debugging.js';
import { socialStoryRoutes } from './routes/socialStories.js';
import { registerTeacherTransparencyRoutes } from './routes/teacherTransparency.js';
import { registerSafetyAdminRoutes } from './routes/safety-admin.routes.js';
import { createTelemetryStore } from './telemetry/index.js';
import type { TelemetryStore } from './telemetry/index.js';
import { UsageTracker } from './usage/index.js';
import { safetyMiddleware } from './middleware/safety.middleware.js';
import { closeSafetyEventPublisher } from './safety/safety-event.publisher.js';

export interface AppOptions {
  registry?: AgentConfigRegistry;
  store?: AgentConfigStore;
  telemetryStore?: TelemetryStore;
  policyEnforcer?: PolicyEnforcer;
  incidentService?: IncidentService;
  usageTracker?: UsageTracker;
}

export function createApp(options: AppOptions = {}) {
  const app = Fastify({ logger: true });

  // Database-dependent services are only initialized if DATABASE_URL is provided
  const hasDatabaseUrl = !!config.databaseUrl;

  const store =
    options.store ?? (hasDatabaseUrl ? createAgentConfigStore(config.databaseUrl) : null);
  const registry =
    options.registry ??
    (store ? new AgentConfigRegistry(store, { cacheTtlMs: config.agentConfigCacheTtlMs }) : null);
  const telemetryStore =
    options.telemetryStore ?? (hasDatabaseUrl ? createTelemetryStore(config.databaseUrl) : null);

  // Initialize PolicyEnforcer singleton for policy enforcement in the AI pipeline
  // This creates a shared Pool for policy lookups
  const policyPool = hasDatabaseUrl ? new Pool({ connectionString: config.databaseUrl }) : null;
  const policyEnforcer =
    options.policyEnforcer ?? (policyPool ? createPolicyEnforcer(policyPool) : null);

  // Initialize AI safety and monitoring services
  const incidentService =
    options.incidentService ?? (policyPool ? new IncidentService(policyPool) : null);
  const usageTracker = options.usageTracker ?? (policyPool ? new UsageTracker(policyPool) : null);

  // Initialize Redis for caching and pub/sub
  const redis = new Redis(config.redisUrl || 'redis://localhost:6379');

  // Security middleware
  registerPlugin(app, helmet, {
    contentSecurityPolicy: false,
  });

  // Rate limiting - protect expensive AI calls
  registerPlugin(app, rateLimit, {
    global: true,
    max: 30, // 30 AI requests per minute per user (expensive resource)
    timeWindow: '1 minute',
    keyGenerator: (request: FastifyRequest) => {
      // Use tenant + user for rate limiting to prevent abuse
      const tenantId = (request as { tenantId?: string }).tenantId;
      const userId = (request as { userId?: string }).userId;
      if (tenantId && userId) return `ai:${tenantId}:${userId}`;
      if (tenantId) return `ai:${tenantId}`;
      return (
        (request.headers['x-forwarded-for'] as string)?.split(',')[0] || request.ip || 'unknown'
      );
    },
    errorResponseBuilder: (_request: FastifyRequest, context: { after: string }) => ({
      error: 'Too Many Requests',
      message: 'AI orchestrator rate limit exceeded. Please wait before making more AI requests.',
      retryAfter: context.after,
    }),
    // Skip rate limiting for health checks and internal endpoints
    allowList: (request: FastifyRequest) =>
      request.url === '/health' || request.url === '/ready' || request.url.startsWith('/internal/'),
  });

  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-correlation-id'];
    const correlationId =
      typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    (request as FastifyRequest & { correlationId?: string }).correlationId = correlationId;
    reply.header('x-correlation-id', correlationId);
  });

  // AI Content Safety Guardrails — intercept all AI responses
  app.register(safetyMiddleware);

  // Health check routes (must be registered early, before dependencies are initialized)
  app.register(healthRoutes);

  // Only register database-dependent routes if database is available
  if (registry && store && telemetryStore) {
    app.register(registerInternalRoutes, { prefix: '/internal', registry, store, telemetryStore });

    // Social story AI personalization routes (ND-1.2)
    app.register(socialStoryRoutes, { registry, telemetryStore });
  }

  if (policyPool) {
    // Admin stats routes for compliance dashboard
    app.register(registerAdminStatsRoutes, { pool: policyPool });

    // Teacher AI transparency routes (HIGH-001)
    app.register(registerTeacherTransparencyRoutes, { pool: policyPool });

    // Brain update routes for virtual brain synchronization
    app.register(registerBrainRoutes, { prefix: '/internal/ai/brain', pool: policyPool });

    // Emotional state detection and intervention routes (ND-2.3)
    app.register(emotionalStateRoutes, { prefix: '/emotional-state', pool: policyPool });

    // Prompt Debugging Dashboard API routes
    app.register(registerPromptDebuggingRoutes, { pool: policyPool, redis });

    // RLHF Fine-Tuning API routes
    app.register(registerFineTuningRoutes, { pool: policyPool, redis });

    // Federated Prompt Learning API routes
    app.register(registerFederatedLearningRoutes, { pool: policyPool, redis });

    // Safety Admin routes (stats, violations, config)
    app.register(registerSafetyAdminRoutes);
  }

  // Create LLM Orchestrator for AI services (configured via environment variables)
  // Primary: Google, Fallbacks: OpenAI, Anthropic, Ollama (local dev only)
  const llmOrchestrator = createLLMOrchestratorFromEnv();

  // AI routes that work without database
  if (policyPool) {
    // AI Content Generation routes
    app.register(generationRoutes, { pool: policyPool, llmOrchestrator });
  }

  // AI-Generated Adaptive Games routes
  app.register(gameGenerationRoutes, { llmOrchestrator });

  // AI-Powered IEP Goal Generation routes (Sprint 1.3 - Real AI integration)
  app.register(iepGenerationRoutes, { prefix: '/iep', llmOrchestrator });

  app.addHook('onError', async (request, reply, error) => {
    const correlationId = (request as FastifyRequest & { correlationId?: string }).correlationId;
    app.log.error({ err: error, correlationId }, 'request failed');
  });

  app.decorate('config', config);
  app.decorate('registry', registry);
  app.decorate('agentConfigStore', store);
  app.decorate('telemetryStore', telemetryStore);
  app.decorate('policyEnforcer', policyEnforcer);
  app.decorate('incidentService', incidentService);
  app.decorate('usageTracker', usageTracker);

  app.addHook('onClose', async () => {
    if (store && typeof store.dispose === 'function') {
      await store.dispose();
    }
    if (telemetryStore && typeof telemetryStore.dispose === 'function') {
      await telemetryStore.dispose();
    }
    // Clean up policy pool
    if (policyPool) {
      await policyPool.end();
    }
    // Clean up Redis connection
    await redis.quit();
    // Clean up NATS safety event publisher
    await closeSafetyEventPublisher();
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
