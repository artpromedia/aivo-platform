import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyRequest } from 'fastify';
import { Pool } from 'pg';

import { config } from './config.js';
import { IncidentService } from './incidents/index.js';
import { createPolicyEnforcer, type PolicyEnforcer } from './policy/index.js';
import { AgentConfigRegistry, createAgentConfigStore } from './registry/index.js';
import type { AgentConfigStore } from './registry/store.js';
import { registerAdminStatsRoutes } from './routes/adminStats.js';
import { registerBrainRoutes } from './routes/brain.js';
import { emotionalStateRoutes } from './routes/emotionalState.js';
import { registerInternalRoutes } from './routes/internal.js';
import { socialStoryRoutes } from './routes/socialStories.js';
import { registerTeacherTransparencyRoutes } from './routes/teacherTransparency.js';
import gameGenerationRoutes from './routes/game-generation.js';
import generationRoutes from './routes/generation.js';
import { LLMOrchestrator } from './providers/llm-orchestrator.js';
import { createTelemetryStore } from './telemetry/index.js';
import type { TelemetryStore } from './telemetry/index.js';
import { UsageTracker } from './usage/index.js';

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

  const store = options.store ?? createAgentConfigStore(config.databaseUrl);
  const registry =
    options.registry ??
    new AgentConfigRegistry(store, { cacheTtlMs: config.agentConfigCacheTtlMs });
  const telemetryStore = options.telemetryStore ?? createTelemetryStore(config.databaseUrl);

  // Initialize PolicyEnforcer singleton for policy enforcement in the AI pipeline
  // This creates a shared Pool for policy lookups
  const policyPool = new Pool({ connectionString: config.databaseUrl });
  const policyEnforcer = options.policyEnforcer ?? createPolicyEnforcer(policyPool);

  // Initialize AI safety and monitoring services
  const incidentService = options.incidentService ?? new IncidentService(policyPool);
  const usageTracker = options.usageTracker ?? new UsageTracker(policyPool);

  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-correlation-id'];
    const correlationId =
      typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    (request as FastifyRequest & { correlationId?: string }).correlationId = correlationId;
    reply.header('x-correlation-id', correlationId);
  });

  app.register(registerInternalRoutes, { prefix: '/internal', registry, store, telemetryStore });

  // Admin stats routes for compliance dashboard
  app.register(registerAdminStatsRoutes, { pool: policyPool });

  // Teacher AI transparency routes (HIGH-001)
  app.register(registerTeacherTransparencyRoutes, { pool: policyPool });

  // Brain update routes for virtual brain synchronization
  app.register(registerBrainRoutes, { prefix: '/internal/ai/brain', pool: policyPool });

  // Social story AI personalization routes (ND-1.2)
  app.register(socialStoryRoutes, { registry, telemetryStore });

  // Emotional state detection and intervention routes (ND-2.3)
  app.register(emotionalStateRoutes, { prefix: '/emotional-state', pool: policyPool });

  // Create LLM Orchestrator for AI services
  const llmOrchestrator = new LLMOrchestrator({
    defaultProvider: 'anthropic',
    fallbackProviders: ['openai'],
  });

  // AI Content Generation routes
  app.register(generationRoutes, { pool: policyPool, llmOrchestrator });

  // AI-Generated Adaptive Games routes
  app.register(gameGenerationRoutes, { llmOrchestrator });

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
    if (typeof store.dispose === 'function') {
      await store.dispose();
    }
    if (typeof telemetryStore.dispose === 'function') {
      await telemetryStore.dispose();
    }
    // Clean up policy pool
    await policyPool.end();
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
