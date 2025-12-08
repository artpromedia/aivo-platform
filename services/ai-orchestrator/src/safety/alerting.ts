/**
 * Alerting configuration for AI safety metrics.
 *
 * These thresholds define when alerts should be triggered for various
 * safety-related metrics. Alerts can be sent to logging systems, Slack,
 * PagerDuty, or other notification channels.
 */

// ══════════════════════════════════════════════════════════════════════════════
// THRESHOLD TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface AlertThreshold {
  /** Human-readable name for the alert */
  name: string;
  /** Description of what triggers this alert */
  description: string;
  /** Severity level */
  severity: AlertSeverity;
  /** Threshold value (interpretation depends on metric type) */
  threshold: number;
  /** Time window for rate-based metrics (in minutes) */
  windowMinutes?: number;
  /** Agent types this applies to (undefined = all) */
  agentTypes?: string[];
}

export interface AlertConfig {
  /** Whether alerting is enabled */
  enabled: boolean;
  /** Default notification channels */
  channels: string[];
  /** Thresholds for different metric types */
  thresholds: {
    safetyBlocked: AlertThreshold[];
    safetyNeedsReview: AlertThreshold[];
    directAnswerViolations: AlertThreshold[];
    diagnosticViolations: AlertThreshold[];
    errorRate: AlertThreshold[];
    latency: AlertThreshold[];
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  channels: ['safety-alerts', 'ops-alerts'],

  thresholds: {
    // Safety BLOCKED alerts (self-harm, explicit content)
    safetyBlocked: [
      {
        name: 'safety_blocked_critical',
        description: 'Any BLOCKED safety status requires immediate attention',
        severity: 'CRITICAL',
        threshold: 1, // 1 or more blocked responses
        windowMinutes: 5,
      },
    ],

    // Safety NEEDS_REVIEW alerts (diagnostic language, etc.)
    safetyNeedsReview: [
      {
        name: 'safety_needs_review_warning',
        description: 'Multiple responses flagged for review',
        severity: 'WARNING',
        threshold: 5,
        windowMinutes: 60,
      },
      {
        name: 'safety_needs_review_critical',
        description: 'High volume of responses needing review',
        severity: 'CRITICAL',
        threshold: 20,
        windowMinutes: 60,
      },
    ],

    // HOMEWORK_HELPER direct answer violations
    directAnswerViolations: [
      {
        name: 'homework_direct_answer_warning',
        description: 'Homework helper provided direct answers',
        severity: 'WARNING',
        threshold: 3,
        windowMinutes: 60,
        agentTypes: ['HOMEWORK_HELPER'],
      },
      {
        name: 'homework_direct_answer_critical',
        description: 'High rate of direct answer violations',
        severity: 'CRITICAL',
        threshold: 10,
        windowMinutes: 60,
        agentTypes: ['HOMEWORK_HELPER'],
      },
    ],

    // FOCUS agent diagnostic language violations
    diagnosticViolations: [
      {
        name: 'focus_diagnostic_warning',
        description: 'Focus agent used diagnostic language',
        severity: 'WARNING',
        threshold: 1, // Even one is concerning
        windowMinutes: 60,
        agentTypes: ['FOCUS'],
      },
      {
        name: 'focus_diagnostic_critical',
        description: 'Multiple diagnostic language violations',
        severity: 'CRITICAL',
        threshold: 3,
        windowMinutes: 60,
        agentTypes: ['FOCUS'],
      },
    ],

    // Error rate thresholds
    errorRate: [
      {
        name: 'ai_error_rate_warning',
        description: 'AI call error rate elevated',
        severity: 'WARNING',
        threshold: 5, // 5% error rate
        windowMinutes: 15,
      },
      {
        name: 'ai_error_rate_critical',
        description: 'AI call error rate critical',
        severity: 'CRITICAL',
        threshold: 15, // 15% error rate
        windowMinutes: 15,
      },
    ],

    // Latency thresholds (in milliseconds)
    latency: [
      {
        name: 'ai_latency_warning',
        description: 'AI response latency elevated',
        severity: 'WARNING',
        threshold: 5000, // 5 seconds p95
        windowMinutes: 15,
      },
      {
        name: 'ai_latency_critical',
        description: 'AI response latency critical',
        severity: 'CRITICAL',
        threshold: 15000, // 15 seconds p95
        windowMinutes: 15,
      },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// ALERT EVALUATION
// ══════════════════════════════════════════════════════════════════════════════

export interface MetricSnapshot {
  agentType: string;
  safetyBlocked: number;
  safetyNeedsReview: number;
  directAnswerViolations?: number;
  diagnosticViolations?: number;
  errorCount: number;
  totalCalls: number;
  avgLatencyMs: number;
  p95LatencyMs?: number;
  windowMinutes: number;
}

export interface TriggeredAlert {
  name: string;
  severity: AlertSeverity;
  description: string;
  currentValue: number;
  threshold: number;
  agentType?: string;
  triggeredAt: Date;
}

/**
 * Evaluate metrics against alert thresholds.
 */
export function evaluateAlerts(
  metrics: MetricSnapshot,
  config: AlertConfig = DEFAULT_ALERT_CONFIG
): TriggeredAlert[] {
  if (!config.enabled) {
    return [];
  }

  const alerts: TriggeredAlert[] = [];
  const now = new Date();

  // Check safety blocked
  for (const threshold of config.thresholds.safetyBlocked) {
    if (shouldApplyThreshold(threshold, metrics.agentType)) {
      if (metrics.safetyBlocked >= threshold.threshold) {
        alerts.push({
          name: threshold.name,
          severity: threshold.severity,
          description: threshold.description,
          currentValue: metrics.safetyBlocked,
          threshold: threshold.threshold,
          agentType: metrics.agentType,
          triggeredAt: now,
        });
      }
    }
  }

  // Check safety needs review
  for (const threshold of config.thresholds.safetyNeedsReview) {
    if (shouldApplyThreshold(threshold, metrics.agentType)) {
      if (metrics.safetyNeedsReview >= threshold.threshold) {
        alerts.push({
          name: threshold.name,
          severity: threshold.severity,
          description: threshold.description,
          currentValue: metrics.safetyNeedsReview,
          threshold: threshold.threshold,
          agentType: metrics.agentType,
          triggeredAt: now,
        });
      }
    }
  }

  // Check direct answer violations (HOMEWORK_HELPER specific)
  if (metrics.directAnswerViolations !== undefined) {
    for (const threshold of config.thresholds.directAnswerViolations) {
      if (shouldApplyThreshold(threshold, metrics.agentType)) {
        if (metrics.directAnswerViolations >= threshold.threshold) {
          alerts.push({
            name: threshold.name,
            severity: threshold.severity,
            description: threshold.description,
            currentValue: metrics.directAnswerViolations,
            threshold: threshold.threshold,
            agentType: metrics.agentType,
            triggeredAt: now,
          });
        }
      }
    }
  }

  // Check diagnostic violations (FOCUS specific)
  if (metrics.diagnosticViolations !== undefined) {
    for (const threshold of config.thresholds.diagnosticViolations) {
      if (shouldApplyThreshold(threshold, metrics.agentType)) {
        if (metrics.diagnosticViolations >= threshold.threshold) {
          alerts.push({
            name: threshold.name,
            severity: threshold.severity,
            description: threshold.description,
            currentValue: metrics.diagnosticViolations,
            threshold: threshold.threshold,
            agentType: metrics.agentType,
            triggeredAt: now,
          });
        }
      }
    }
  }

  // Check error rate
  if (metrics.totalCalls > 0) {
    const errorRate = (metrics.errorCount / metrics.totalCalls) * 100;
    for (const threshold of config.thresholds.errorRate) {
      if (shouldApplyThreshold(threshold, metrics.agentType)) {
        if (errorRate >= threshold.threshold) {
          alerts.push({
            name: threshold.name,
            severity: threshold.severity,
            description: threshold.description,
            currentValue: errorRate,
            threshold: threshold.threshold,
            agentType: metrics.agentType,
            triggeredAt: now,
          });
        }
      }
    }
  }

  // Check latency
  const latencyValue = metrics.p95LatencyMs ?? metrics.avgLatencyMs;
  for (const threshold of config.thresholds.latency) {
    if (shouldApplyThreshold(threshold, metrics.agentType)) {
      if (latencyValue >= threshold.threshold) {
        alerts.push({
          name: threshold.name,
          severity: threshold.severity,
          description: threshold.description,
          currentValue: latencyValue,
          threshold: threshold.threshold,
          agentType: metrics.agentType,
          triggeredAt: now,
        });
      }
    }
  }

  return alerts;
}

function shouldApplyThreshold(threshold: AlertThreshold, agentType: string): boolean {
  if (!threshold.agentTypes || threshold.agentTypes.length === 0) {
    return true;
  }
  return threshold.agentTypes.includes(agentType);
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERT HOOKS (for integration with notification systems)
// ══════════════════════════════════════════════════════════════════════════════

export type AlertHandler = (alert: TriggeredAlert) => void | Promise<void>;

const alertHandlers: AlertHandler[] = [];

/**
 * Register a handler to be called when alerts are triggered.
 */
export function onAlert(handler: AlertHandler): void {
  alertHandlers.push(handler);
}

/**
 * Dispatch triggered alerts to all registered handlers.
 */
export async function dispatchAlerts(alerts: TriggeredAlert[]): Promise<void> {
  for (const alert of alerts) {
    for (const handler of alertHandlers) {
      try {
        await handler(alert);
      } catch (err) {
        console.error(`Alert handler failed for ${alert.name}:`, err);
      }
    }
  }
}

/**
 * Default console logger handler (for development).
 */
export function consoleAlertHandler(alert: TriggeredAlert): void {
  const emoji = alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'WARNING' ? '⚠️' : 'ℹ️';

  console.log(
    `${emoji} [${alert.severity}] ${alert.name}: ${alert.description} ` +
      `(value=${alert.currentValue}, threshold=${alert.threshold}, agent=${alert.agentType ?? 'all'})`
  );
}

// Register default handler in development
if (process.env.NODE_ENV !== 'production') {
  onAlert(consoleAlertHandler);
}
