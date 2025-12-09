import { z } from 'zod';

/**
 * Configuration schema for AI call logging and auto-incident creation.
 *
 * Validated at startup via Zod to ensure type-safety and fail-fast on misconfiguration.
 */
export const AiLoggingConfigSchema = z.object({
  /**
   * Safety thresholds - which safety labels trigger incident creation.
   * Default: Only HIGH triggers automatic incidents. Set to true to include MEDIUM.
   */
  safety: z
    .object({
      /** Create incident for HIGH safety label (default: true) */
      createIncidentOnHigh: z.boolean().default(true),
      /** Create incident for MEDIUM safety label (default: false - review manually) */
      createIncidentOnMedium: z.boolean().default(false),
      /** Create incident for BLOCKED status (default: true) */
      createIncidentOnBlocked: z.boolean().default(true),
    })
    .default({}),

  /**
   * Cost anomaly thresholds - single call cost that triggers COST incident.
   */
  cost: z
    .object({
      /** Cost threshold in cents (USD). Calls exceeding this create COST incident. Default: 100 cents ($1.00) */
      singleCallThresholdCents: z.number().int().positive().default(100),
      /** Incident severity for cost anomalies. Default: HIGH */
      incidentSeverity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('HIGH'),
    })
    .default({}),

  /**
   * Latency anomaly thresholds - high latency triggers PERFORMANCE incident.
   */
  latency: z
    .object({
      /** Latency threshold in milliseconds. Default: 10,000ms (10 seconds) */
      thresholdMs: z.number().int().positive().default(10_000),
      /** Minimum consecutive slow calls before creating incident. Default: 1 (immediate) */
      consecutiveCallsBeforeIncident: z.number().int().positive().default(1),
      /** Incident severity for latency anomalies. Default: MEDIUM */
      incidentSeverity: z.enum(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    })
    .default({}),

  /**
   * Incident aggregation - controls how incidents are grouped/deduplicated.
   */
  incidents: z
    .object({
      /** Time window in hours to look for existing incidents to update (vs. create new). Default: 24h */
      aggregationWindowHours: z.number().positive().default(24),
      /** Whether to run incident checks asynchronously (fire-and-forget). Default: true */
      asyncIncidentCreation: z.boolean().default(true),
    })
    .default({}),

  /**
   * Logging behavior.
   */
  logging: z
    .object({
      /** Whether logging is enabled at all. Default: true */
      enabled: z.boolean().default(true),
      /** Whether to run DB writes asynchronously (fire-and-forget). Default: true */
      asyncWrites: z.boolean().default(true),
      /** Max length for prompt/response summaries. Default: 500 chars */
      maxSummaryLength: z.number().int().positive().default(500),
    })
    .default({}),
});

export type AiLoggingConfig = z.infer<typeof AiLoggingConfigSchema>;

/**
 * Parse configuration from environment variables.
 * All values are optional - sensible defaults are provided.
 */
export function parseAiLoggingConfigFromEnv(): AiLoggingConfig {
  const raw = {
    safety: {
      createIncidentOnHigh: envBool('AI_LOGGING_INCIDENT_ON_HIGH', true),
      createIncidentOnMedium: envBool('AI_LOGGING_INCIDENT_ON_MEDIUM', false),
      createIncidentOnBlocked: envBool('AI_LOGGING_INCIDENT_ON_BLOCKED', true),
    },
    cost: {
      singleCallThresholdCents: envInt('AI_LOGGING_COST_THRESHOLD_CENTS', 100),
      incidentSeverity: process.env.AI_LOGGING_COST_INCIDENT_SEVERITY || 'HIGH',
    },
    latency: {
      thresholdMs: envInt('AI_LOGGING_LATENCY_THRESHOLD_MS', 10_000),
      consecutiveCallsBeforeIncident: envInt('AI_LOGGING_LATENCY_CONSECUTIVE_CALLS', 1),
      incidentSeverity: process.env.AI_LOGGING_LATENCY_INCIDENT_SEVERITY || 'MEDIUM',
    },
    incidents: {
      aggregationWindowHours: envFloat('AI_LOGGING_INCIDENT_WINDOW_HOURS', 24),
      asyncIncidentCreation: envBool('AI_LOGGING_ASYNC_INCIDENTS', true),
    },
    logging: {
      enabled: envBool('AI_LOGGING_ENABLED', true),
      asyncWrites: envBool('AI_LOGGING_ASYNC_WRITES', true),
      maxSummaryLength: envInt('AI_LOGGING_MAX_SUMMARY_LENGTH', 500),
    },
  };

  return AiLoggingConfigSchema.parse(raw);
}

function envBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function envInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function envFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/** Default configuration for convenience */
export const DEFAULT_AI_LOGGING_CONFIG: AiLoggingConfig = AiLoggingConfigSchema.parse({});
