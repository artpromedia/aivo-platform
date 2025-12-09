import type { AiLoggingConfig } from './config.js';
import type { AiCallLogger } from './logger.js';
import type {
  AiIncident,
  LogAiCallInput,
  RuleEvaluationResult,
  SafetyLabel,
  TriggeredRule,
} from './types.js';

/**
 * Incident Rules Engine - Evaluates AI call logs against configurable rules
 * and triggers automatic incident creation.
 *
 * Rules implemented:
 * 1. Safety rules - HIGH/MEDIUM safety labels trigger SAFETY incidents
 * 2. Cost rules - Single calls exceeding threshold trigger COST incidents
 * 3. Latency rules - Slow calls trigger PERFORMANCE incidents
 *
 * Extensibility:
 * - Add new rules by creating functions that return TriggeredRule[]
 * - Rules can be enabled/disabled via configuration
 * - Custom rules can be injected via the constructor
 */
export class IncidentRulesEngine {
  private config: AiLoggingConfig;
  private logger: AiCallLogger;

  // Track consecutive slow calls per tenant for latency rule
  private consecutiveSlowCalls = new Map<string, number>();

  constructor(config: AiLoggingConfig, logger: AiCallLogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Evaluate all incident rules against a call log.
   *
   * @param callLog - The AI call log data to evaluate
   * @returns Evaluation result with triggered rules
   */
  evaluateRules(callLog: LogAiCallInput): RuleEvaluationResult {
    const triggeredRules: TriggeredRule[] = [];

    // Rule 1: Safety classification
    const safetyRules = this.evaluateSafetyRules(callLog);
    triggeredRules.push(...safetyRules);

    // Rule 2: Cost anomaly
    const costRules = this.evaluateCostRules(callLog);
    triggeredRules.push(...costRules);

    // Rule 3: Latency anomaly
    const latencyRules = this.evaluateLatencyRules(callLog);
    triggeredRules.push(...latencyRules);

    return {
      shouldCreateIncident: triggeredRules.length > 0,
      triggeredRules,
    };
  }

  /**
   * Evaluate rules and create/update incidents as needed.
   *
   * This is the main entry point after logging an AI call.
   * It runs asynchronously by default (fire-and-forget).
   *
   * @param aiCallLogId - The ID of the logged AI call
   * @param callLog - The AI call log data
   * @returns Array of created/updated incidents
   */
  async maybeCreateOrUpdateIncidentFromCallLog(
    aiCallLogId: string,
    callLog: LogAiCallInput
  ): Promise<AiIncident[]> {
    const evaluation = this.evaluateRules(callLog);

    if (!evaluation.shouldCreateIncident) {
      // Reset consecutive slow calls counter on successful fast call
      if (callLog.latencyMs < this.config.latency.thresholdMs) {
        this.resetConsecutiveSlowCalls(callLog.tenantId);
      }
      return [];
    }

    const incidents: AiIncident[] = [];

    for (const rule of evaluation.triggeredRules) {
      const incident = await this.logger.createOrUpdateIncident(
        callLog.tenantId,
        aiCallLogId,
        rule.severity,
        rule.category,
        rule.title,
        rule.description,
        rule.metadata
      );

      if (incident) {
        incidents.push(incident);
        console.log(
          JSON.stringify({
            event: 'incident_triggered',
            rule: rule.ruleName,
            incidentId: incident.id,
            tenantId: callLog.tenantId,
            severity: rule.severity,
            category: rule.category,
            isNew: incident.occurrenceCount === 1,
          })
        );
      }
    }

    return incidents;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Safety Rules
  // ──────────────────────────────────────────────────────────────────────────

  private evaluateSafetyRules(callLog: LogAiCallInput): TriggeredRule[] {
    const rules: TriggeredRule[] = [];
    const { safety } = this.config;
    const label = callLog.safetyLabel;

    // HIGH safety label
    if (safety.createIncidentOnHigh && label === 'HIGH') {
      rules.push({
        ruleName: 'SAFETY_HIGH',
        severity: 'HIGH',
        category: 'SAFETY',
        title: `High-risk safety event for tenant ${callLog.tenantId}`,
        description: this.buildSafetyDescription(callLog, 'HIGH'),
        metadata: {
          safetyLabel: label,
          safetyMetadata: callLog.safetyMetadata,
          agentType: callLog.agentType,
          modelName: callLog.modelName,
          requestId: callLog.requestId,
        },
      });
    }

    // MEDIUM safety label (optional)
    if (safety.createIncidentOnMedium && label === 'MEDIUM') {
      rules.push({
        ruleName: 'SAFETY_MEDIUM',
        severity: 'MEDIUM',
        category: 'SAFETY',
        title: `Medium-risk safety event for tenant ${callLog.tenantId}`,
        description: this.buildSafetyDescription(callLog, 'MEDIUM'),
        metadata: {
          safetyLabel: label,
          safetyMetadata: callLog.safetyMetadata,
          agentType: callLog.agentType,
          modelName: callLog.modelName,
          requestId: callLog.requestId,
        },
      });
    }

    return rules;
  }

  private buildSafetyDescription(callLog: LogAiCallInput, label: SafetyLabel): string {
    const parts = [
      `AI call flagged with safety label: ${label}`,
      `Agent: ${callLog.agentType}`,
      `Model: ${callLog.modelName}`,
    ];

    if (callLog.useCase) {
      parts.push(`Use case: ${callLog.useCase}`);
    }

    if (callLog.learnerId) {
      parts.push(`Learner ID: ${callLog.learnerId}`);
    }

    if (callLog.safetyMetadata && Object.keys(callLog.safetyMetadata).length > 0) {
      parts.push(`Safety details: ${JSON.stringify(callLog.safetyMetadata)}`);
    }

    return parts.join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Cost Rules
  // ──────────────────────────────────────────────────────────────────────────

  private evaluateCostRules(callLog: LogAiCallInput): TriggeredRule[] {
    const rules: TriggeredRule[] = [];
    const { cost } = this.config;
    const costCents = callLog.costCentsEstimate;

    if (costCents > cost.singleCallThresholdCents) {
      rules.push({
        ruleName: 'COST_SINGLE_CALL_HIGH',
        severity: cost.incidentSeverity,
        category: 'COST',
        title: `High-cost AI call for tenant ${callLog.tenantId}`,
        description: this.buildCostDescription(callLog, costCents),
        metadata: {
          costCents,
          threshold: cost.singleCallThresholdCents,
          agentType: callLog.agentType,
          modelName: callLog.modelName,
          inputTokens: callLog.inputTokens,
          outputTokens: callLog.outputTokens,
          requestId: callLog.requestId,
        },
      });
    }

    return rules;
  }

  private buildCostDescription(callLog: LogAiCallInput, costCents: number): string {
    const threshold = this.config.cost.singleCallThresholdCents;
    return [
      `Single AI call cost ($${(costCents / 100).toFixed(2)}) exceeded threshold ($${(threshold / 100).toFixed(2)})`,
      `Agent: ${callLog.agentType}`,
      `Model: ${callLog.modelName}`,
      `Tokens: ${callLog.inputTokens} input + ${callLog.outputTokens} output`,
      callLog.useCase ? `Use case: ${callLog.useCase}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Latency Rules
  // ──────────────────────────────────────────────────────────────────────────

  private evaluateLatencyRules(callLog: LogAiCallInput): TriggeredRule[] {
    const rules: TriggeredRule[] = [];
    const { latency } = this.config;

    if (callLog.latencyMs > latency.thresholdMs) {
      // Increment consecutive slow calls counter
      const key = callLog.tenantId;
      const consecutiveCount = (this.consecutiveSlowCalls.get(key) ?? 0) + 1;
      this.consecutiveSlowCalls.set(key, consecutiveCount);

      // Only trigger if we've hit the threshold for consecutive calls
      if (consecutiveCount >= latency.consecutiveCallsBeforeIncident) {
        rules.push({
          ruleName: 'LATENCY_HIGH',
          severity: latency.incidentSeverity,
          category: 'PERFORMANCE',
          title: `High latency AI calls for tenant ${callLog.tenantId}`,
          description: this.buildLatencyDescription(callLog, consecutiveCount),
          metadata: {
            latencyMs: callLog.latencyMs,
            threshold: latency.thresholdMs,
            consecutiveCount,
            agentType: callLog.agentType,
            modelName: callLog.modelName,
            provider: callLog.provider,
            requestId: callLog.requestId,
          },
        });
      }
    } else {
      // Reset counter on fast call
      this.resetConsecutiveSlowCalls(callLog.tenantId);
    }

    return rules;
  }

  private buildLatencyDescription(callLog: LogAiCallInput, consecutiveCount: number): string {
    const threshold = this.config.latency.thresholdMs;
    return [
      `AI call latency (${callLog.latencyMs}ms) exceeded threshold (${threshold}ms)`,
      consecutiveCount > 1 ? `${consecutiveCount} consecutive slow calls` : null,
      `Agent: ${callLog.agentType}`,
      `Model: ${callLog.modelName}`,
      `Provider: ${callLog.provider}`,
      callLog.useCase ? `Use case: ${callLog.useCase}` : null,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private resetConsecutiveSlowCalls(tenantId: string): void {
    this.consecutiveSlowCalls.delete(tenantId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Clear internal state (useful for testing).
   */
  reset(): void {
    this.consecutiveSlowCalls.clear();
  }
}

/**
 * Convenience function for simple rule evaluation without instance management.
 * Useful for testing or one-off evaluations.
 */
export function evaluateIncidentRules(
  config: AiLoggingConfig,
  callLog: LogAiCallInput
): RuleEvaluationResult {
  const triggeredRules: TriggeredRule[] = [];

  // Safety rules
  if (config.safety.createIncidentOnHigh && callLog.safetyLabel === 'HIGH') {
    triggeredRules.push({
      ruleName: 'SAFETY_HIGH',
      severity: 'HIGH',
      category: 'SAFETY',
      title: `High-risk safety event for tenant ${callLog.tenantId}`,
      description: `AI call flagged with safety label: HIGH`,
      metadata: { safetyLabel: callLog.safetyLabel },
    });
  }

  if (config.safety.createIncidentOnMedium && callLog.safetyLabel === 'MEDIUM') {
    triggeredRules.push({
      ruleName: 'SAFETY_MEDIUM',
      severity: 'MEDIUM',
      category: 'SAFETY',
      title: `Medium-risk safety event for tenant ${callLog.tenantId}`,
      description: `AI call flagged with safety label: MEDIUM`,
      metadata: { safetyLabel: callLog.safetyLabel },
    });
  }

  // Cost rules
  if (callLog.costCentsEstimate > config.cost.singleCallThresholdCents) {
    triggeredRules.push({
      ruleName: 'COST_SINGLE_CALL_HIGH',
      severity: config.cost.incidentSeverity,
      category: 'COST',
      title: `High-cost AI call for tenant ${callLog.tenantId}`,
      description: `Single AI call cost exceeded threshold`,
      metadata: {
        costCents: callLog.costCentsEstimate,
        threshold: config.cost.singleCallThresholdCents,
      },
    });
  }

  // Latency rules (simplified - no consecutive tracking in stateless function)
  if (
    callLog.latencyMs > config.latency.thresholdMs &&
    config.latency.consecutiveCallsBeforeIncident <= 1
  ) {
    triggeredRules.push({
      ruleName: 'LATENCY_HIGH',
      severity: config.latency.incidentSeverity,
      category: 'PERFORMANCE',
      title: `High latency AI calls for tenant ${callLog.tenantId}`,
      description: `AI call latency exceeded threshold`,
      metadata: { latencyMs: callLog.latencyMs, threshold: config.latency.thresholdMs },
    });
  }

  return {
    shouldCreateIncident: triggeredRules.length > 0,
    triggeredRules,
  };
}
