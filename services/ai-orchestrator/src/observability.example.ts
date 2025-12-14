/**
 * @aivo/observability Integration Example for ai-orchestrator
 *
 * This file demonstrates how to integrate the observability package
 * into a Fastify-based Aivo service.
 *
 * @example Usage in src/app.ts:
 * ```typescript
 * import { createObservability, observabilityPlugin } from './observability.js';
 *
 * export function createApp(options: AppOptions = {}) {
 *   // Initialize observability before creating Fastify
 *   const obs = createObservability();
 *
 *   // Pass logger to Fastify for structured logging
 *   const app = Fastify({ logger: obs.logger.pino });
 *
 *   // Register the plugin for automatic instrumentation
 *   app.register(observabilityPlugin, {
 *     tracer: obs.tracer,
 *     logger: obs.logger,
 *     metrics: obs.metrics,
 *   });
 *
 *   // Your routes are now automatically instrumented!
 *   // ...
 * }
 * ```
 */

import {
  initObservability,
  observabilityPlugin as plugin,
  type AivoTracer,
  type AivoLogger,
  type MetricsRegistry,
  METRIC_NAMES,
  AIVO_ATTRIBUTES,
} from '@aivo/observability';
import { config } from './config.js';

// Re-export plugin for easy access
export { plugin as observabilityPlugin };

export interface Observability {
  tracer: AivoTracer;
  logger: AivoLogger;
  metrics: MetricsRegistry;
  shutdown: () => Promise<void>;
}

/**
 * Create the observability instance for ai-orchestrator.
 *
 * This should be called once at service startup.
 */
export function createObservability(): Observability {
  return initObservability({
    serviceName: 'ai-orchestrator',
    environment: config.nodeEnv,
    version: process.env.APP_VERSION ?? '0.0.0',
  });
}

/**
 * Helper to record AI call metrics with proper labels.
 *
 * @example
 * ```typescript
 * const timer = recordAiCallStart(obs.metrics);
 * try {
 *   const result = await aiProvider.call(prompt);
 *   timer.success('openai', 'tutor', result.usage.inputTokens, result.usage.outputTokens);
 *   return result;
 * } catch (error) {
 *   timer.error('openai', 'tutor', error);
 *   throw error;
 * }
 * ```
 */
export function recordAiCallStart(metrics: MetricsRegistry) {
  const startTime = Date.now();

  return {
    success(
      provider: string,
      agentType: string,
      inputTokens: number,
      outputTokens: number,
      tenantId?: string
    ) {
      const durationSeconds = (Date.now() - startTime) / 1000;

      metrics.ai.calls.inc({
        agent_type: agentType,
        provider,
        status: 'success',
      });

      metrics.ai.duration.observe({ agent_type: agentType, provider }, durationSeconds);

      metrics.ai.tokens.inc({ agent_type: agentType, type: 'input' }, inputTokens);
      metrics.ai.tokens.inc({ agent_type: agentType, type: 'output' }, outputTokens);

      // Estimate cost (simplified - real implementation would use provider pricing)
      const inputCost = (inputTokens / 1_000_000) * 3; // ~$3/M tokens
      const outputCost = (outputTokens / 1_000_000) * 15; // ~$15/M tokens
      metrics.ai.cost.inc({ agent_type: agentType, provider }, inputCost + outputCost);
    },

    error(provider: string, agentType: string, error: Error) {
      metrics.ai.calls.inc({
        agent_type: agentType,
        provider,
        status: 'error',
      });
    },
  };
}

/**
 * Helper to record safety events.
 *
 * @example
 * ```typescript
 * recordSafetyEvent(obs.metrics, obs.logger, {
 *   category: 'harmful_content',
 *   action: 'blocked',
 *   agentType: 'homework-helper',
 *   tenantId: req.tenantId,
 *   requestId: req.correlationId,
 * });
 * ```
 */
export function recordSafetyEvent(
  metrics: MetricsRegistry,
  logger: AivoLogger,
  event: {
    category: string;
    action: 'blocked' | 'flagged' | 'allowed';
    agentType: string;
    tenantId?: string;
    requestId?: string;
    details?: Record<string, unknown>;
  }
) {
  metrics.ai.safetyEvents.inc({
    category: event.category,
    action: event.action,
    agent_type: event.agentType,
  });

  logger.safetyEvent({
    category: event.category,
    action: event.action,
    agentType: event.agentType,
    tenantId: event.tenantId,
    requestId: event.requestId,
    ...event.details,
  });
}

/**
 * Helper to record provider failover events.
 *
 * @example
 * ```typescript
 * recordProviderFailover(obs.metrics, obs.logger, {
 *   fromProvider: 'openai',
 *   toProvider: 'anthropic',
 *   reason: 'rate_limited',
 *   tenantId: req.tenantId,
 * });
 * ```
 */
export function recordProviderFailover(
  metrics: MetricsRegistry,
  logger: AivoLogger,
  event: {
    fromProvider: string;
    toProvider: string;
    reason: string;
    tenantId?: string;
  }
) {
  metrics.ai.providerFailovers.inc({
    from_provider: event.fromProvider,
    to_provider: event.toProvider,
  });

  logger.warn({
    msg: 'AI provider failover',
    fromProvider: event.fromProvider,
    toProvider: event.toProvider,
    reason: event.reason,
    tenantId: event.tenantId,
  });
}

// Re-export constants for use in service code
export { METRIC_NAMES, AIVO_ATTRIBUTES };
