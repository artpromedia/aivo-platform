/**
 * OpenTelemetry Tracer Configuration
 *
 * Sets up the OTEL tracer provider with configurable exporters.
 * Supports Jaeger, OTLP, and console exporters.
 */

import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api';
import type { Tracer, Span, SpanOptions } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';

import { AIVO_ATTRIBUTES } from './constants.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TracerConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  enabled?: boolean;

  // Exporter configuration
  /** @deprecated Use OTLP exporter instead - Jaeger supports OTLP natively */
  jaeger?: {
    endpoint?: string; // default: http://localhost:14268/api/traces
  };
  otlp?: {
    endpoint?: string; // default: http://localhost:4318/v1/traces
  };
  console?: boolean; // Enable console exporter for debugging
}

export interface AivoTracer {
  tracer: Tracer;
  provider: NodeTracerProvider;

  /**
   * Start a new span with Aivo-specific attributes
   */
  startSpan(name: string, options?: AivoSpanOptions): Span;

  /**
   * Execute a function within a new span
   */
  withSpan<T>(
    name: string,
    fn: (span: Span) => T | Promise<T>,
    options?: AivoSpanOptions
  ): Promise<T>;

  /**
   * Get the current active span
   */
  getActiveSpan(): Span | undefined;

  /**
   * Add Aivo context to current span
   */
  setAivoContext(ctx: AivoContext): void;

  /**
   * Shutdown the tracer provider
   */
  shutdown(): Promise<void>;
}

export interface AivoSpanOptions extends SpanOptions {
  tenantId?: string;
  userId?: string;
  learnerId?: string;
  requestId?: string;
}

export interface AivoContext {
  tenantId?: string;
  userId?: string;
  learnerId?: string;
  requestId?: string;
  sessionId?: string;
  agentType?: string;
  provider?: string;
  model?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// TRACER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

let globalProvider: NodeTracerProvider | null = null;

export function createTracer(config: TracerConfig): AivoTracer {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    environment = 'development',
    enabled = true,
  } = config;

  // Create resource with service info
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // Build span processors based on config
  const spanProcessors: (BatchSpanProcessor | SimpleSpanProcessor)[] = [];

  if (enabled) {
    // Set up propagator for distributed tracing
    propagation.setGlobalPropagator(new W3CTraceContextPropagator());

    // Add exporters based on config
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (config.jaeger) {
      // eslint-disable-next-line @typescript-eslint/no-deprecated
      const jaegerExporter = new JaegerExporter({
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        endpoint: config.jaeger.endpoint ?? 'http://localhost:14268/api/traces',
      });
      spanProcessors.push(new BatchSpanProcessor(jaegerExporter));
    }

    if (config.otlp) {
      const otlpExporter = new OTLPTraceExporter({
        url: config.otlp.endpoint ?? 'http://localhost:4318/v1/traces',
      });
      spanProcessors.push(new BatchSpanProcessor(otlpExporter));
    }

    if (config.console) {
      spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
    }

    // If no exporters configured, add a no-op or console for dev
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    if (!config.jaeger && !config.otlp && !config.console) {
      if (environment === 'development') {
        // In dev, log to console for visibility
        spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
      }
    }
  }

  // Create provider with span processors
  const providerConfig: { resource: typeof resource; spanProcessors?: typeof spanProcessors } = {
    resource,
  };
  if (spanProcessors.length > 0) {
    providerConfig.spanProcessors = spanProcessors;
  }
  const provider = new NodeTracerProvider(providerConfig);

  if (enabled) {
    // Register as global provider
    provider.register();
    globalProvider = provider;
  }

  const tracer = trace.getTracer(serviceName, serviceVersion);

  return {
    tracer,
    provider,

    startSpan(name: string, options?: AivoSpanOptions): Span {
      const span = tracer.startSpan(name, options);

      if (options?.tenantId) {
        span.setAttribute(AIVO_ATTRIBUTES.TENANT_ID, options.tenantId);
      }
      if (options?.userId) {
        span.setAttribute(AIVO_ATTRIBUTES.USER_ID, options.userId);
      }
      if (options?.learnerId) {
        span.setAttribute(AIVO_ATTRIBUTES.LEARNER_ID, options.learnerId);
      }
      if (options?.requestId) {
        span.setAttribute(AIVO_ATTRIBUTES.REQUEST_ID, options.requestId);
      }

      return span;
    },

    async withSpan<T>(
      name: string,
      fn: (span: Span) => T | Promise<T>,
      options?: AivoSpanOptions
    ): Promise<T> {
      const span = this.startSpan(name, options);
      const ctx = trace.setSpan(context.active(), span);

      try {
        const result = await context.with(ctx, () => fn(span));
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    },

    getActiveSpan(): Span | undefined {
      return trace.getActiveSpan();
    },

    setAivoContext(ctx: AivoContext): void {
      const span = trace.getActiveSpan();
      if (!span) return;

      if (ctx.tenantId) span.setAttribute(AIVO_ATTRIBUTES.TENANT_ID, ctx.tenantId);
      if (ctx.userId) span.setAttribute(AIVO_ATTRIBUTES.USER_ID, ctx.userId);
      if (ctx.learnerId) span.setAttribute(AIVO_ATTRIBUTES.LEARNER_ID, ctx.learnerId);
      if (ctx.requestId) span.setAttribute(AIVO_ATTRIBUTES.REQUEST_ID, ctx.requestId);
      if (ctx.sessionId) span.setAttribute(AIVO_ATTRIBUTES.SESSION_ID, ctx.sessionId);
      if (ctx.agentType) span.setAttribute(AIVO_ATTRIBUTES.AI_AGENT_TYPE, ctx.agentType);
      if (ctx.provider) span.setAttribute(AIVO_ATTRIBUTES.AI_PROVIDER, ctx.provider);
      if (ctx.model) span.setAttribute(AIVO_ATTRIBUTES.AI_MODEL, ctx.model);
    },

    async shutdown(): Promise<void> {
      await provider.shutdown();
    },
  };
}

/**
 * Get the global tracer provider (if initialized)
 */
export function getGlobalTracerProvider(): NodeTracerProvider | null {
  return globalProvider;
}

/**
 * Create span attributes for HTTP requests
 */
export function httpSpanAttributes(req: {
  method?: string;
  url?: string;
  route?: string;
  host?: string;
  userAgent?: string;
}): Record<string, string> {
  const attrs: Record<string, string> = {};

  if (req.method) attrs[AIVO_ATTRIBUTES.HTTP_METHOD] = req.method;
  if (req.url) attrs[AIVO_ATTRIBUTES.HTTP_URL] = req.url;
  if (req.route) attrs[AIVO_ATTRIBUTES.HTTP_ROUTE] = req.route;
  if (req.host) attrs[AIVO_ATTRIBUTES.HTTP_HOST] = req.host;
  if (req.userAgent) attrs[AIVO_ATTRIBUTES.HTTP_USER_AGENT] = req.userAgent;

  return attrs;
}

/**
 * Create span attributes for AI calls
 */
export function aiSpanAttributes(call: {
  agentType: string;
  provider: string;
  model: string;
  tokensInput?: number;
  tokensOutput?: number;
  costUsd?: number;
  safetyStatus?: string;
}): Record<string, string | number> {
  const attrs: Record<string, string | number> = {
    [AIVO_ATTRIBUTES.AI_AGENT_TYPE]: call.agentType,
    [AIVO_ATTRIBUTES.AI_PROVIDER]: call.provider,
    [AIVO_ATTRIBUTES.AI_MODEL]: call.model,
  };

  if (call.tokensInput !== undefined) {
    attrs[AIVO_ATTRIBUTES.AI_TOKENS_INPUT] = call.tokensInput;
  }
  if (call.tokensOutput !== undefined) {
    attrs[AIVO_ATTRIBUTES.AI_TOKENS_OUTPUT] = call.tokensOutput;
  }
  if (call.tokensInput !== undefined && call.tokensOutput !== undefined) {
    attrs[AIVO_ATTRIBUTES.AI_TOKENS_TOTAL] = call.tokensInput + call.tokensOutput;
  }
  if (call.costUsd !== undefined) {
    attrs[AIVO_ATTRIBUTES.AI_COST_USD] = call.costUsd;
  }
  if (call.safetyStatus) {
    attrs[AIVO_ATTRIBUTES.AI_SAFETY_STATUS] = call.safetyStatus;
  }

  return attrs;
}
