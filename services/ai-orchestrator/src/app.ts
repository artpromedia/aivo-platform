import { randomUUID } from 'node:crypto';

import Fastify, { type FastifyRequest } from 'fastify';

import { config } from './config.js';
import { AgentConfigRegistry, createAgentConfigStore } from './registry/index.js';
import type { AgentConfigStore } from './registry/store.js';
import { registerInternalRoutes } from './routes/internal.js';

export interface AppOptions {
  registry?: AgentConfigRegistry;
  store?: AgentConfigStore;
}

export function createApp(options: AppOptions = {}) {
  const app = Fastify({ logger: true });

  const store = options.store ?? createAgentConfigStore(config.databaseUrl);
  const registry =
    options.registry ??
    new AgentConfigRegistry(store, { cacheTtlMs: config.agentConfigCacheTtlMs });

  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-correlation-id'];
    const correlationId =
      typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    (request as FastifyRequest & { correlationId?: string }).correlationId = correlationId;
    reply.header('x-correlation-id', correlationId);
  });

  app.register(registerInternalRoutes, { prefix: '/internal', registry, store });

  app.addHook('onError', async (request, reply, error) => {
    const correlationId = (request as FastifyRequest & { correlationId?: string }).correlationId;
    app.log.error({ err: error, correlationId }, 'request failed');
  });

  app.decorate('config', config);
  app.decorate('registry', registry);
  app.decorate('agentConfigStore', store);

  app.addHook('onClose', async () => {
    if (typeof store.dispose === 'function') {
      await store.dispose();
    }
  });

  return app;
}

export type AppType = ReturnType<typeof createApp>;
