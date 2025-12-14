/**
 * SLO Definitions
 *
 * Central configuration for all Service Level Objectives.
 * Each SLO defines:
 * - The metric and labels that form the SLI
 * - Target objectives (latency percentiles, error rates, availability)
 * - Measurement window
 * - Alert thresholds for burn-rate alerting
 */

import { METRIC_NAMES } from '../constants.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SloDefinition {
  /** Unique identifier for the SLO */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of what this SLO measures */
  description: string;

  /** Service this SLO applies to */
  service: string;

  /** User journey this SLO is part of */
  journey: string;

  /** SLI configuration */
  sli: SliConfig;

  /** Target objectives */
  objectives: SloObjectives;

  /** Alert configuration */
  alerts: SloAlertConfig;
}

export interface SliConfig {
  /** Type of SLI */
  type: 'latency' | 'availability' | 'throughput' | 'quality';

  /** Prometheus metric name for the indicator */
  metric: string;

  /** Label filters to apply */
  labels?: Record<string, string>;

  /** For latency SLIs: the bucket to use (e.g., 'le="0.3"') */
  latencyBucket?: string;

  /** For availability SLIs: how to identify good events */
  goodEventFilter?: string;

  /** For availability SLIs: how to identify total events */
  totalEventFilter?: string;
}

export interface SloObjectives {
  /** Target percentage (e.g., 99.5 for 99.5%) */
  target: number;

  /** Measurement window in days */
  windowDays: number;

  /** For latency SLIs: target percentile (e.g., 95 for p95) */
  percentile?: number;

  /** For latency SLIs: target value in seconds */
  latencySeconds?: number;
}

export interface SloAlertConfig {
  /** Burn rate thresholds for different severity levels */
  burnRates: BurnRateConfig[];
}

export interface BurnRateConfig {
  /** Alert severity */
  severity: 'critical' | 'warning' | 'info';

  /** Burn rate multiplier (e.g., 14.4 for "fast burn") */
  burnRate: number;

  /** Short window for alert evaluation (e.g., '1h') */
  shortWindow: string;

  /** Long window for alert evaluation (e.g., '5m') */
  longWindow: string;

  /** Percentage of budget consumed at this rate */
  budgetConsumed: number;
}

export interface SloConfig {
  slos: SloDefinition[];
  globalWindowDays: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SLO DEFINITIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Auth API SLO
 *
 * Covers authentication and authorization endpoints.
 * Critical for all user interactions.
 */
const AUTH_API_SLO: SloDefinition = {
  id: 'auth-api-latency',
  name: 'Auth API Latency',
  description: 'Authentication API should respond quickly for good UX',
  service: 'auth-svc',
  journey: 'authentication',

  sli: {
    type: 'latency',
    metric: METRIC_NAMES.HTTP_REQUEST_DURATION,
    labels: {
      service: 'auth-svc',
      route: '/auth/*',
    },
    latencyBucket: 'le="0.3"', // 300ms
  },

  objectives: {
    target: 99.5,
    windowDays: 30,
    percentile: 95,
    latencySeconds: 0.3,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4, // Consumes 2% of budget in 1 hour
        shortWindow: '5m',
        longWindow: '1h',
        budgetConsumed: 2,
      },
      {
        severity: 'warning',
        burnRate: 6,
        shortWindow: '30m',
        longWindow: '6h',
        budgetConsumed: 5,
      },
    ],
  },
};

const AUTH_API_AVAILABILITY_SLO: SloDefinition = {
  id: 'auth-api-availability',
  name: 'Auth API Availability',
  description: 'Authentication API should be available with low error rate',
  service: 'auth-svc',
  journey: 'authentication',

  sli: {
    type: 'availability',
    metric: METRIC_NAMES.HTTP_REQUESTS_TOTAL,
    labels: {
      service: 'auth-svc',
    },
    goodEventFilter: 'status_code!~"5.."',
    totalEventFilter: '',
  },

  objectives: {
    target: 99.5,
    windowDays: 30,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4,
        shortWindow: '5m',
        longWindow: '1h',
        budgetConsumed: 2,
      },
      {
        severity: 'warning',
        burnRate: 6,
        shortWindow: '30m',
        longWindow: '6h',
        budgetConsumed: 5,
      },
    ],
  },
};

/**
 * AI Tutor SLO
 *
 * Covers the tutor agent responses.
 * Allows for longer latency due to LLM calls.
 */
const AI_TUTOR_LATENCY_SLO: SloDefinition = {
  id: 'ai-tutor-latency',
  name: 'AI Tutor Latency',
  description: 'AI Tutor should respond within acceptable time for interactive tutoring',
  service: 'ai-orchestrator',
  journey: 'tutoring',

  sli: {
    type: 'latency',
    metric: METRIC_NAMES.AI_REQUEST_DURATION,
    labels: {
      agent_type: 'TUTOR',
    },
    latencyBucket: 'le="4"', // 4 seconds
  },

  objectives: {
    target: 95,
    windowDays: 30,
    percentile: 95,
    latencySeconds: 4,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4,
        shortWindow: '5m',
        longWindow: '1h',
        budgetConsumed: 2,
      },
      {
        severity: 'warning',
        burnRate: 6,
        shortWindow: '30m',
        longWindow: '6h',
        budgetConsumed: 5,
      },
    ],
  },
};

const AI_TUTOR_MEDIAN_LATENCY_SLO: SloDefinition = {
  id: 'ai-tutor-median-latency',
  name: 'AI Tutor Median Latency',
  description: 'AI Tutor median response time for typical interactions',
  service: 'ai-orchestrator',
  journey: 'tutoring',

  sli: {
    type: 'latency',
    metric: METRIC_NAMES.AI_REQUEST_DURATION,
    labels: {
      agent_type: 'TUTOR',
    },
    latencyBucket: 'le="2"', // 2 seconds
  },

  objectives: {
    target: 50,
    windowDays: 30,
    percentile: 50,
    latencySeconds: 2,
  },

  alerts: {
    burnRates: [
      {
        severity: 'warning',
        burnRate: 10,
        shortWindow: '15m',
        longWindow: '3h',
        budgetConsumed: 10,
      },
    ],
  },
};

const AI_TUTOR_ERROR_SLO: SloDefinition = {
  id: 'ai-tutor-error-rate',
  name: 'AI Tutor Error Rate',
  description: 'AI Tutor should have low error rate',
  service: 'ai-orchestrator',
  journey: 'tutoring',

  sli: {
    type: 'availability',
    metric: METRIC_NAMES.AI_REQUESTS_TOTAL,
    labels: {
      agent_type: 'TUTOR',
    },
    goodEventFilter: 'status_code="200"',
    totalEventFilter: '',
  },

  objectives: {
    target: 98,
    windowDays: 30,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4,
        shortWindow: '5m',
        longWindow: '1h',
        budgetConsumed: 2,
      },
      {
        severity: 'warning',
        burnRate: 6,
        shortWindow: '30m',
        longWindow: '6h',
        budgetConsumed: 5,
      },
    ],
  },
};

/**
 * Baseline Assessment SLO
 *
 * Covers the baseline assessment flow.
 * Critical for first-time learner experience.
 */
const BASELINE_FIRST_ITEM_SLO: SloDefinition = {
  id: 'baseline-first-item-latency',
  name: 'Baseline First Item Latency',
  description: 'First baseline item should load quickly for good first impression',
  service: 'ai-orchestrator',
  journey: 'baseline-assessment',

  sli: {
    type: 'latency',
    metric: METRIC_NAMES.AI_REQUEST_DURATION,
    labels: {
      agent_type: 'BASELINE',
    },
    latencyBucket: 'le="2"', // 2 seconds
  },

  objectives: {
    target: 95,
    windowDays: 30,
    percentile: 95,
    latencySeconds: 2,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4,
        shortWindow: '5m',
        longWindow: '1h',
        budgetConsumed: 2,
      },
      {
        severity: 'warning',
        burnRate: 6,
        shortWindow: '30m',
        longWindow: '6h',
        budgetConsumed: 5,
      },
    ],
  },
};

const BASELINE_COMPLETION_SLO: SloDefinition = {
  id: 'baseline-completion-rate',
  name: 'Baseline Completion Rate',
  description: 'Started baseline sessions should complete successfully',
  service: 'session-svc',
  journey: 'baseline-assessment',

  sli: {
    type: 'quality',
    metric: METRIC_NAMES.SESSIONS_COMPLETED_TOTAL,
    labels: {
      session_type: 'baseline',
    },
    goodEventFilter: '', // completed sessions
    totalEventFilter: '', // started sessions (use sessions_started_total)
  },

  objectives: {
    target: 95,
    windowDays: 30,
  },

  alerts: {
    burnRates: [
      {
        severity: 'warning',
        burnRate: 10,
        shortWindow: '1h',
        longWindow: '6h',
        budgetConsumed: 10,
      },
    ],
  },
};

/**
 * Gateway Availability SLO
 *
 * Covers Kong and Apollo Router availability.
 * Critical infrastructure SLO.
 */
const GATEWAY_AVAILABILITY_SLO: SloDefinition = {
  id: 'gateway-availability',
  name: 'Gateway Availability',
  description: 'API Gateway should have high availability',
  service: 'kong-gateway',
  journey: 'infrastructure',

  sli: {
    type: 'availability',
    metric: METRIC_NAMES.HTTP_REQUESTS_TOTAL,
    labels: {
      service: 'kong-gateway',
    },
    goodEventFilter: 'status_code!~"5.."',
    totalEventFilter: '',
  },

  objectives: {
    target: 99.5,
    windowDays: 30,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4,
        shortWindow: '2m',
        longWindow: '15m',
        budgetConsumed: 2,
      },
      {
        severity: 'critical',
        burnRate: 6,
        shortWindow: '15m',
        longWindow: '1h',
        budgetConsumed: 5,
      },
      {
        severity: 'warning',
        burnRate: 3,
        shortWindow: '1h',
        longWindow: '6h',
        budgetConsumed: 10,
      },
    ],
  },
};

/**
 * Event Pipeline SLO
 *
 * Covers NATS event processing.
 */
const EVENT_PIPELINE_SLO: SloDefinition = {
  id: 'event-pipeline-success',
  name: 'Event Pipeline Success Rate',
  description: 'Events should be processed without going to DLQ',
  service: 'event-pipeline',
  journey: 'infrastructure',

  sli: {
    type: 'availability',
    metric: METRIC_NAMES.EVENTS_PROCESSED_TOTAL,
    labels: {},
    goodEventFilter: '', // processed events
    totalEventFilter: '', // published events
  },

  objectives: {
    target: 99,
    windowDays: 30,
  },

  alerts: {
    burnRates: [
      {
        severity: 'critical',
        burnRate: 14.4,
        shortWindow: '5m',
        longWindow: '1h',
        budgetConsumed: 2,
      },
      {
        severity: 'warning',
        burnRate: 6,
        shortWindow: '30m',
        longWindow: '6h',
        budgetConsumed: 5,
      },
    ],
  },
};

// ══════════════════════════════════════════════════════════════════════════════
// EXPORTED SLO COLLECTION
// ══════════════════════════════════════════════════════════════════════════════

export const SLO_DEFINITIONS: SloDefinition[] = [
  // Auth SLOs
  AUTH_API_SLO,
  AUTH_API_AVAILABILITY_SLO,

  // AI Tutor SLOs
  AI_TUTOR_LATENCY_SLO,
  AI_TUTOR_MEDIAN_LATENCY_SLO,
  AI_TUTOR_ERROR_SLO,

  // Baseline Assessment SLOs
  BASELINE_FIRST_ITEM_SLO,
  BASELINE_COMPLETION_SLO,

  // Infrastructure SLOs
  GATEWAY_AVAILABILITY_SLO,
  EVENT_PIPELINE_SLO,
];

/**
 * Get SLO by ID
 */
export function getSloById(id: string): SloDefinition | undefined {
  return SLO_DEFINITIONS.find((slo) => slo.id === id);
}

/**
 * Get SLOs by service
 */
export function getSlosByService(service: string): SloDefinition[] {
  return SLO_DEFINITIONS.filter((slo) => slo.service === service);
}

/**
 * Get SLOs by journey
 */
export function getSlosByJourney(journey: string): SloDefinition[] {
  return SLO_DEFINITIONS.filter((slo) => slo.journey === journey);
}
