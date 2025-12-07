import { type FastifyInstance, type FastifyPluginAsync, type FastifyRequest } from 'fastify';
import { z } from 'zod';

import { config } from '../config.js';
import { runAiCall } from '../pipeline/AiCallPipeline.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import type { AgentConfigStore } from '../registry/store.js';
import type { TelemetryStore } from '../telemetry/index.js';
import {
  AGENT_TYPES,
  PROVIDER_TYPES,
  type AgentConfigPatch,
  type AgentType,
} from '../types/agentConfig.js';

const echoBodySchema = z.object({
  message: z.string().default('hello'),
});

const testAgentBodySchema = z.object({
  tenantId: z.string(),
  agentType: z.enum(AGENT_TYPES),
  payload: z.unknown().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const listConfigsQuerySchema = z.object({
  agent_type: z.enum(AGENT_TYPES).optional(),
  is_active: z.coerce.boolean().optional(),
});

const rolloutPlanQuerySchema = z.object({
  agentType: z.enum(AGENT_TYPES),
});

const createConfigSchema = z.object({
  agentType: z.enum(AGENT_TYPES),
  modelName: z.string().min(1),
  provider: z.enum(PROVIDER_TYPES),
  promptTemplate: z.string().min(1),
  hyperparameters: z.record(z.unknown()).default({}),
  version: z.string().min(1),
  rolloutPercentage: z.number().int().min(0).max(100).default(100),
  isActive: z.boolean().default(true),
});

const patchConfigSchema = createConfigSchema.partial();

interface InternalRoutesOptions {
  registry: AgentConfigRegistry;
  store: AgentConfigStore;
  telemetryStore: TelemetryStore;
}

export const registerInternalRoutes: FastifyPluginAsync<InternalRoutesOptions> = async (
  app: FastifyInstance,
  opts: InternalRoutesOptions
) => {
  const { registry, store, telemetryStore } = opts;

  app.addHook('preHandler', async (request, reply) => {
    if (!request.url.startsWith('/internal/')) return;
    const apiKey = request.headers['x-internal-api-key'];
    if (apiKey !== config.internalApiKey) {
      reply.code(401).send({ error: 'Unauthorized' });
      return reply;
    }
  });

  app.post('/ai/echo', async (request, reply) => {
    const parsed = echoBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload' });
      return;
    }
    const correlationId = (request as FastifyRequest & { correlationId?: string }).correlationId;
    // Reuse pipeline with a pass-through prompt
    const result = await runAiCall(
      registry,
      {
        tenantId: 'echo',
        agentType: 'BASELINE',
        metadata: { correlationId },
      },
      {
        rawPrompt: `echo:${parsed.data.message}`,
        metadata: { correlationId },
      },
      telemetryStore
    );
    reply.code(200).send({ response: result });
  });

  app.get('/ai/configs', async (request, reply) => {
    const parsed = listConfigsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid filters' });
      return;
    }

    const filters: { agentType?: AgentType; isActive?: boolean } = {};
    if (parsed.data.agent_type !== undefined) {
      filters.agentType = parsed.data.agent_type;
    }
    if (parsed.data.is_active !== undefined) {
      filters.isActive = parsed.data.is_active;
    }

    const configs = await store.list(filters);
    reply.code(200).send({ configs });
  });

  app.post('/ai/configs', async (request, reply) => {
    const parsed = createConfigSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload' });
      return;
    }

    const created = await registry.create({
      ...parsed.data,
      hyperparameters: parsed.data.hyperparameters,
    });

    reply.code(201).send({ config: created });
  });

  app.patch<{ Params: { id: string } }>('/ai/configs/:id', async (request, reply) => {
    const parsedBody = patchConfigSchema.safeParse(request.body);
    if (!parsedBody.success) {
      reply.code(400).send({ error: 'Invalid payload' });
      return;
    }

    const patch: AgentConfigPatch = {};
    const data = parsedBody.data;
    if (data.agentType !== undefined) patch.agentType = data.agentType;
    if (data.modelName !== undefined) patch.modelName = data.modelName;
    if (data.provider !== undefined) patch.provider = data.provider;
    if (data.promptTemplate !== undefined) patch.promptTemplate = data.promptTemplate;
    if (data.hyperparameters !== undefined) patch.hyperparameters = data.hyperparameters;
    if (data.version !== undefined) patch.version = data.version;
    if (data.rolloutPercentage !== undefined) patch.rolloutPercentage = data.rolloutPercentage;
    if (data.isActive !== undefined) patch.isActive = data.isActive;

    const updated = await registry.update(request.params.id, patch);
    if (!updated) {
      reply.code(404).send({ error: 'Config not found' });
      return;
    }
    reply.code(200).send({ config: updated });
  });

  app.post<{ Params: { id: string } }>('/ai/configs/:id/disable', async (request, reply) => {
    const updated = await registry.update(request.params.id, {
      rolloutPercentage: 0,
      isActive: false,
    });
    if (!updated) {
      reply.code(404).send({ error: 'Config not found' });
      return;
    }
    reply.code(200).send({ config: updated });
  });

  app.get('/ai/configs/rollout-plan', async (request, reply) => {
    const parsed = rolloutPlanQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid query' });
      return;
    }
    const configs = await store.list({ agentType: parsed.data.agentType, isActive: true });
    const sorted = configs
      .sort((a, b) => {
        if (b.rolloutPercentage !== a.rolloutPercentage)
          return b.rolloutPercentage - a.rolloutPercentage;
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      })
      .map((c) => ({
        id: c.id,
        version: c.version,
        rolloutPercentage: c.rolloutPercentage,
        updatedAt: c.updatedAt,
      }));

    const total = sorted.reduce((acc, c) => acc + c.rolloutPercentage, 0);
    let scale = 1;
    if (total > 100) {
      scale = 100 / total;
    }
    let cumulative = 0;
    const plan = sorted.map((c) => {
      const weight = c.rolloutPercentage * scale;
      cumulative += weight;
      return {
        ...c,
        normalizedPercentage: Number(weight.toFixed(2)),
        cumulativeWeight: Number(cumulative.toFixed(2)),
      };
    });

    reply.code(200).send({
      agentType: parsed.data.agentType,
      totalPercentage: total,
      normalized: total > 100,
      plan,
    });
  });

  app.post('/ai/test-agent', async (request, reply) => {
    const parsed = testAgentBodySchema.safeParse(request.body);
    if (!parsed.success) {
      reply.code(400).send({ error: 'Invalid payload' });
      return;
    }

    const result = await runAiCall(
      registry,
      {
        tenantId: parsed.data.tenantId,
        agentType: parsed.data.agentType,
        metadata: parsed.data.metadata,
      },
      {
        payload: parsed.data.payload,
        metadata: parsed.data.metadata ?? {},
      },
      telemetryStore
    );

    reply.code(200).send({ response: result });
  });

  app.get('/ai/metrics/summary', async (request, reply) => {
    const tenantId =
      typeof request.query === 'object' && request.query !== null
        ? (request.query as Record<string, string> | undefined)?.tenantId
        : undefined;

    const summary = await telemetryStore.summary(tenantId);
    reply.code(200).send({ summary });
  });
};
