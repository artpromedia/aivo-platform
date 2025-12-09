/**
 * AI Call Logging & Incident Management
 *
 * This module provides:
 * - Consistent AI call logging to PostgreSQL
 * - Rule-based automatic incident creation for safety/cost/latency anomalies
 * - Configurable thresholds via environment variables or code
 *
 * Usage:
 *
 * ```typescript
 * import { createAiLoggingService, parseAiLoggingConfigFromEnv } from './logging/index.js';
 *
 * const config = parseAiLoggingConfigFromEnv();
 * const loggingService = createAiLoggingService(pool, config);
 *
 * // After each AI call:
 * await loggingService.logAndEvaluate({
 *   tenantId: 'tenant-123',
 *   agentType: 'TUTOR',
 *   // ... other fields
 * });
 * ```
 */

export {
  AiLoggingConfig,
  AiLoggingConfigSchema,
  DEFAULT_AI_LOGGING_CONFIG,
  parseAiLoggingConfigFromEnv,
} from './config.js';

export { AiCallLogger } from './logger.js';

export { IncidentRulesEngine, evaluateIncidentRules } from './rules.js';

export type {
  AiCallLog,
  AiIncident,
  CreateIncidentInput,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  LinkCallToIncidentInput,
  LinkReason,
  LogAiCallInput,
  RuleEvaluationResult,
  SafetyLabel,
  TriggeredRule,
} from './types.js';

export {
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  SAFETY_LABELS,
} from './types.js';

import type { Pool } from 'pg';

import type { AiLoggingConfig } from './config.js';
import { AiCallLogger } from './logger.js';
import { IncidentRulesEngine } from './rules.js';
import type { AiIncident, LogAiCallInput } from './types.js';

/**
 * Combined AI Logging Service that handles both logging and incident creation.
 *
 * This is the recommended way to use the logging system - it coordinates
 * the logger and rules engine for you.
 */
export class AiLoggingService {
  private logger: AiCallLogger;
  private rulesEngine: IncidentRulesEngine;
  private config: AiLoggingConfig;

  constructor(pool: Pool, config: AiLoggingConfig) {
    this.logger = new AiCallLogger(pool, config);
    this.rulesEngine = new IncidentRulesEngine(config, this.logger);
    this.config = config;
  }

  /**
   * Log an AI call and evaluate incident rules.
   *
   * This is the main entry point for the logging system.
   * It handles both logging and incident creation based on configuration.
   *
   * By default, this runs asynchronously (fire-and-forget) to avoid
   * blocking the critical path. Errors are logged but don't propagate.
   *
   * @param callLog - The AI call data to log
   * @returns Object containing the log ID and any triggered incidents
   */
  async logAndEvaluate(callLog: LogAiCallInput): Promise<{
    logId: string | null;
    incidents: AiIncident[];
  }> {
    // Step 1: Log the call
    const logId = await this.logger.logAiCall(callLog);

    // Step 2: Evaluate rules and create incidents
    let incidents: AiIncident[] = [];
    if (logId) {
      try {
        incidents = await this.rulesEngine.maybeCreateOrUpdateIncidentFromCallLog(logId, callLog);
      } catch (err) {
        console.error('[AiLoggingService] Failed to evaluate incident rules:', err);
      }
    }

    return { logId, incidents };
  }

  /**
   * Log an AI call and evaluate rules asynchronously (fire-and-forget).
   *
   * Use this when you don't need to wait for the result.
   * Errors are logged but don't affect the calling code.
   *
   * @param callLog - The AI call data to log
   */
  logAndEvaluateAsync(callLog: LogAiCallInput): void {
    this.logAndEvaluate(callLog).catch((err: unknown) => {
      console.error('[AiLoggingService] Async log and evaluate failed:', err);
    });
  }

  /**
   * Get the underlying logger for direct access.
   */
  getLogger(): AiCallLogger {
    return this.logger;
  }

  /**
   * Get the underlying rules engine for direct access.
   */
  getRulesEngine(): IncidentRulesEngine {
    return this.rulesEngine;
  }

  /**
   * Dispose of resources.
   */
  async dispose(): Promise<void> {
    await this.logger.dispose();
  }
}

/**
 * Factory function to create an AI logging service.
 *
 * @param pool - PostgreSQL connection pool
 * @param config - AI logging configuration
 * @returns Configured AiLoggingService instance
 */
export function createAiLoggingService(pool: Pool, config: AiLoggingConfig): AiLoggingService {
  return new AiLoggingService(pool, config);
}
