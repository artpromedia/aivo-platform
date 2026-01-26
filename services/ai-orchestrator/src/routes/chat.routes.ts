/**
 * Unified Chat Routes
 *
 * REST API endpoints for the multi-provider AI gateway:
 * - POST /api/v1/ai/chat - Unified chat completion
 * - POST /api/v1/ai/chat/stream - Streaming chat completion
 * - GET /api/v1/ai/models - Get available models
 * - GET /api/v1/ai/providers/health - Get provider health status
 * - GET /api/v1/ai/usage - Get usage statistics
 */

import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { getProviderRegistry, type ModelCapabilities } from '../providers/registry.js';
import {
  BaseProviderAdapter,
  type ChatRequest,
  type ChatResponse,
} from '../providers/adapters/base.adapter.js';
import { getCircuitBreakerRegistry } from '../routing/circuit-breaker.js';
import { getPriorityRouter, type RoutingRequest } from '../routing/priority-router.js';
import { getFailoverHandler, FailoverExhaustedError } from '../routing/failover-handler.js';
import { getCostCalculator } from '../routing/cost-calculator.js';
import { getConfigurationManager } from '../config/providers.config.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// Import adapters to ensure they're registered
import '../providers/adapters/openai.adapter.js';
import '../providers/adapters/anthropic.adapter.js';
import '../providers/adapters/google.adapter.js';
import '../providers/adapters/mistral.adapter.js';
import '../providers/adapters/cohere.adapter.js';
import '../providers/adapters/custom.adapter.js';

// ============================================================================
// Request/Response Schemas
// ============================================================================

const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.string(),
  name: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCalls: z.array(z.object({
    id: z.string(),
    name: z.string(),
    arguments: z.record(z.unknown()),
  })).optional(),
});

const chatRequestSchema = z.object({
  messages: z.array(messageSchema).min(1),
  options: z.object({
    preferredProvider: z.string().optional(),
    preferredModel: z.string().optional(),
    maxCost: z.number().positive().optional(),
    maxLatency: z.number().positive().optional(),
    stream: z.boolean().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional(),
    topP: z.number().min(0).max(1).optional(),
    stop: z.array(z.string()).optional(),
    tools: z.array(z.unknown()).optional(),
    toolChoice: z.unknown().optional(),
    responseFormat: z.object({
      type: z.enum(['text', 'json_object']),
    }).optional(),
  }).optional(),
  tenantId: z.string().min(1),
});

const usageQuerySchema = z.object({
  tenantId: z.string().min(1),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const modelsQuerySchema = z.object({
  capability: z.string().optional(),
  provider: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

type ChatRequestBody = z.infer<typeof chatRequestSchema>;

interface ChatResponseBody {
  content: string;
  model: string;
  provider: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  latencyMs: number;
  cost: {
    estimated: number;
    currency: string;
  };
  metadata: {
    attemptedModels: string[];
    failoverOccurred: boolean;
    cached: boolean;
  };
  toolCalls?: Array<{
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
}

interface ModelInfo {
  id: string;
  provider: string;
  displayName: string;
  capabilities: ModelCapabilities;
  contextWindow: number;
  maxOutputTokens: number;
  pricing: {
    inputPer1kTokens: number;
    outputPer1kTokens: number;
  };
  status: string;
}

interface ProviderHealth {
  id: string;
  name: string;
  healthy: boolean;
  models: {
    id: string;
    status: string;
    circuitState: string;
  }[];
}

// ============================================================================
// Adapter Cache
// ============================================================================

const adapterCache = new Map<string, BaseProviderAdapter>();

async function getOrCreateAdapter(providerId: string): Promise<BaseProviderAdapter | null> {
  if (adapterCache.has(providerId)) {
    return adapterCache.get(providerId)!;
  }

  const configManager = getConfigurationManager();
  const providerConfig = configManager.getProviderConfig(providerId);

  if (!providerConfig || !providerConfig.enabled) {
    return null;
  }

  const apiKeyEnvVar = providerConfig.apiKeyEnvVar;
  const apiKey = apiKeyEnvVar ? process.env[apiKeyEnvVar] : undefined;

  if (!apiKey) {
    return null;
  }

  // Dynamic import to get the adapter
  try {
    let adapter: BaseProviderAdapter;

    switch (providerId) {
      case 'openai': {
        const { OpenAIAdapter } = await import('../providers/adapters/openai.adapter.js');
        adapter = new OpenAIAdapter({ apiKey });
        break;
      }
      case 'anthropic': {
        const { AnthropicAdapter } = await import('../providers/adapters/anthropic.adapter.js');
        adapter = new AnthropicAdapter({ apiKey });
        break;
      }
      case 'google': {
        const { GoogleAdapter } = await import('../providers/adapters/google.adapter.js');
        adapter = new GoogleAdapter({ apiKey });
        break;
      }
      case 'mistral': {
        const { MistralAdapter } = await import('../providers/adapters/mistral.adapter.js');
        adapter = new MistralAdapter({ apiKey });
        break;
      }
      case 'cohere': {
        const { CohereAdapter } = await import('../providers/adapters/cohere.adapter.js');
        adapter = new CohereAdapter({ apiKey });
        break;
      }
      default:
        return null;
    }

    adapterCache.set(providerId, adapter);
    return adapter;
  } catch (error) {
    console.error(`Failed to create adapter for ${providerId}:`, error);
    return null;
  }
}

// ============================================================================
// Route Handlers
// ============================================================================

export const chatRoutes: FastifyPluginAsync = async (app, _opts) => {
  /**
   * POST /api/v1/ai/chat
   * Unified chat completion with automatic routing and failover
   */
  app.post<{ Body: ChatRequestBody }>('/api/v1/ai/chat', {
    schema: {
      body: chatRequestSchema,
    },
  }, async (request, reply) => {
    const startTime = Date.now();
    const body = request.body;

    // Check if streaming is requested
    if (body.options?.stream) {
      return reply.redirect('/api/v1/ai/chat/stream');
    }

    try {
      const router = getPriorityRouter();
      const failoverHandler = getFailoverHandler();
      const costCalculator = getCostCalculator();

      // Build routing request
      const routingRequest: RoutingRequest = {
        capability: 'chat',
        preferredProvider: body.options?.preferredProvider,
        preferredModel: body.options?.preferredModel,
        maxCostPerRequest: body.options?.maxCost,
        maxLatencyMs: body.options?.maxLatency,
        requireStreaming: false,
        tenantId: body.tenantId,
      };

      // Check budget
      const estimatedInputTokens = body.messages.reduce(
        (sum, m) => sum + Math.ceil(m.content.length / 4),
        0
      );
      const estimatedCost = 0.001 * (estimatedInputTokens / 1000); // Rough estimate

      if (!costCalculator.isWithinBudget(body.tenantId, estimatedCost)) {
        return reply.status(402).send({
          error: 'Budget exceeded',
          message: 'Your usage has exceeded the configured budget limits',
        });
      }

      // Execute with failover
      const result = await failoverHandler.executeWithFailover(
        routingRequest,
        async (model) => {
          const adapter = await getOrCreateAdapter(model.providerId);
          if (!adapter) {
            throw new Error(`No adapter available for provider: ${model.providerId}`);
          }

          const chatRequest: ChatRequest = {
            messages: body.messages as LLMMessage[],
            model: model.id,
            temperature: body.options?.temperature,
            maxTokens: body.options?.maxTokens,
            topP: body.options?.topP,
            stop: body.options?.stop,
            tools: body.options?.tools,
            toolChoice: body.options?.toolChoice,
            responseFormat: body.options?.responseFormat,
            metadata: {
              tenantId: body.tenantId,
              correlationId: request.headers['x-correlation-id'] as string,
            },
          };

          const response = await adapter.chat(chatRequest);

          // Track usage
          costCalculator.trackUsage(
            body.tenantId,
            model,
            response.usage.promptTokens,
            response.usage.completionTokens,
            { agentType: 'chat' }
          );

          return { response, model };
        }
      );

      const { response, model } = result.result as { response: ChatResponse; model: typeof result.finalModel };
      const latencyMs = Date.now() - startTime;

      // Calculate cost
      const costEstimate = costCalculator.estimateCost(
        model,
        response.usage.promptTokens,
        response.usage.completionTokens
      );

      // Build response
      const responseBody: ChatResponseBody = {
        content: response.content,
        model: response.model,
        provider: response.provider,
        usage: response.usage,
        finishReason: response.finishReason,
        latencyMs,
        cost: {
          estimated: costEstimate.totalCost,
          currency: 'USD',
        },
        metadata: {
          attemptedModels: result.attemptedModels,
          failoverOccurred: result.failoverOccurred,
          cached: false,
        },
        toolCalls: response.toolCalls,
      };

      // Record metrics
      recordHistogram('chat.latency_ms', latencyMs, {
        provider: response.provider,
        tenant_id: body.tenantId,
      });

      incrementCounter('chat.requests', {
        provider: response.provider,
        model: response.model,
        tenant_id: body.tenantId,
      });

      return reply.status(200).send(responseBody);
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      incrementCounter('chat.errors', {
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        tenant_id: body.tenantId,
      });

      if (error instanceof FailoverExhaustedError) {
        return reply.status(503).send({
          error: 'Service unavailable',
          message: 'All AI providers are currently unavailable',
          attemptedModels: error.attemptedModels,
          errors: error.errors,
          latencyMs,
        });
      }

      console.error('Chat request failed:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        latencyMs,
      });
    }
  });

  /**
   * POST /api/v1/ai/chat/stream
   * Streaming chat completion with SSE
   */
  app.post<{ Body: ChatRequestBody }>('/api/v1/ai/chat/stream', {
    schema: {
      body: chatRequestSchema,
    },
  }, async (request, reply) => {
    const body = request.body;

    try {
      const router = getPriorityRouter();
      const costCalculator = getCostCalculator();

      // Build routing request
      const routingRequest: RoutingRequest = {
        capability: 'chat',
        preferredProvider: body.options?.preferredProvider,
        preferredModel: body.options?.preferredModel,
        requireStreaming: true,
        tenantId: body.tenantId,
      };

      // Select model
      const routingResult = await router.selectModel(routingRequest);
      const model = routingResult.model;

      const adapter = await getOrCreateAdapter(model.providerId);
      if (!adapter) {
        return reply.status(503).send({
          error: 'Provider unavailable',
          message: `No adapter available for provider: ${model.providerId}`,
        });
      }

      const chatRequest: ChatRequest = {
        messages: body.messages as LLMMessage[],
        model: model.id,
        temperature: body.options?.temperature,
        maxTokens: body.options?.maxTokens,
        topP: body.options?.topP,
        stop: body.options?.stop,
        stream: true,
        metadata: {
          tenantId: body.tenantId,
          correlationId: request.headers['x-correlation-id'] as string,
        },
      };

      // Set SSE headers
      reply.raw.setHeader('Content-Type', 'text/event-stream');
      reply.raw.setHeader('Cache-Control', 'no-cache');
      reply.raw.setHeader('Connection', 'keep-alive');
      reply.raw.setHeader('X-Accel-Buffering', 'no');

      let totalContent = '';
      let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

      try {
        for await (const chunk of adapter.chatStream(chatRequest)) {
          totalContent += chunk.content;

          if (chunk.usage) {
            usage = chunk.usage;
          }

          const event = {
            content: chunk.content,
            done: chunk.done,
            model: model.id,
            provider: model.providerId,
          };

          reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);

          if (chunk.done) {
            // Track usage
            costCalculator.trackUsage(
              body.tenantId,
              model,
              usage.promptTokens,
              usage.completionTokens,
              { agentType: 'chat-stream' }
            );

            // Send final event with usage info
            const finalEvent = {
              done: true,
              usage,
              cost: costCalculator.estimateCost(model, usage.promptTokens, usage.completionTokens),
            };
            reply.raw.write(`data: ${JSON.stringify(finalEvent)}\n\n`);
          }
        }
      } catch (streamError) {
        const errorEvent = {
          error: true,
          message: streamError instanceof Error ? streamError.message : 'Stream error',
        };
        reply.raw.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
      }

      reply.raw.write('data: [DONE]\n\n');
      reply.raw.end();

      incrementCounter('chat.stream_requests', {
        provider: model.providerId,
        model: model.id,
        tenant_id: body.tenantId,
      });

      return reply;
    } catch (error) {
      incrementCounter('chat.stream_errors', {
        error_type: error instanceof Error ? error.constructor.name : 'Unknown',
        tenant_id: body.tenantId,
      });

      console.error('Stream chat request failed:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /api/v1/ai/models
   * Get available models with filtering
   */
  app.get('/api/v1/ai/models', async (request, reply) => {
    const query = modelsQuerySchema.parse(request.query);
    const registry = getProviderRegistry();

    let models = registry.getAllProviders().flatMap((provider) =>
      provider.models.filter((m) => m.isEnabled)
    );

    // Filter by capability
    if (query.capability) {
      const capability = query.capability as keyof ModelCapabilities;
      models = models.filter((m) => m.capabilities[capability]);
    }

    // Filter by provider
    if (query.provider) {
      models = models.filter((m) => m.providerId === query.provider);
    }

    const modelInfos: ModelInfo[] = models.map((m) => ({
      id: m.id,
      provider: m.providerId,
      displayName: m.displayName,
      capabilities: m.capabilities,
      contextWindow: m.contextWindow,
      maxOutputTokens: m.maxOutputTokens,
      pricing: {
        inputPer1kTokens: m.pricing.inputPer1kTokens,
        outputPer1kTokens: m.pricing.outputPer1kTokens,
      },
      status: m.status,
    }));

    return reply.status(200).send({
      models: modelInfos,
      count: modelInfos.length,
    });
  });

  /**
   * GET /api/v1/ai/providers/health
   * Get health status of all providers
   */
  app.get('/api/v1/ai/providers/health', async (_request, reply) => {
    const registry = getProviderRegistry();
    const circuitRegistry = getCircuitBreakerRegistry();

    const providers = registry.getAllProviders();
    const healthStatus: ProviderHealth[] = [];

    for (const provider of providers) {
      if (!provider.isEnabled) continue;

      const modelHealth = provider.models
        .filter((m) => m.isEnabled)
        .map((m) => {
          const breaker = circuitRegistry.getBreaker(provider.id, m.id);
          const stats = breaker.getStats();
          return {
            id: m.id,
            status: m.status,
            circuitState: stats.state,
          };
        });

      const isHealthy = modelHealth.some(
        (m) => m.status === 'available' && m.circuitState !== 'OPEN'
      );

      healthStatus.push({
        id: provider.id,
        name: provider.name,
        healthy: isHealthy,
        models: modelHealth,
      });
    }

    return reply.status(200).send({
      providers: healthStatus,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * GET /api/v1/ai/usage
   * Get usage statistics for a tenant
   */
  app.get('/api/v1/ai/usage', async (request, reply) => {
    const query = usageQuerySchema.parse(request.query);
    const costCalculator = getCostCalculator();

    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const report = costCalculator.getTenantUsage(query.tenantId, startDate, endDate);
    const budgetStatus = costCalculator.getBudgetStatus(query.tenantId);

    return reply.status(200).send({
      usage: report,
      budget: budgetStatus,
      recommendations: costCalculator.getOptimizationRecommendations(query.tenantId),
    });
  });

  /**
   * GET /api/v1/ai/providers/stats
   * Get detailed statistics for circuit breakers
   */
  app.get('/api/v1/ai/providers/stats', async (_request, reply) => {
    const circuitRegistry = getCircuitBreakerRegistry();
    const metrics = circuitRegistry.getMetrics();

    return reply.status(200).send({
      circuitBreakers: metrics,
      healthyProviders: circuitRegistry.getHealthyProviders(),
      timestamp: new Date().toISOString(),
    });
  });
};

export default chatRoutes;
