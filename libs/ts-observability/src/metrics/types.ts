/**
 * Metrics Type Definitions
 */

import type { Counter, Histogram, Gauge, Registry } from 'prom-client';

export interface MetricLabels {
  service?: string;
  environment?: string;
  tenantId?: string;
  [key: string]: string | undefined;
}

export interface HttpMetricLabels extends MetricLabels {
  method: string;
  route: string;
  statusCode: string;
  statusClass?: string;
}

export interface AiMetricLabels extends MetricLabels {
  agentType: string;
  provider: string;
  model: string;
}

export interface SessionMetricLabels extends MetricLabels {
  sessionType?: string;
  subject?: string;
  grade?: string;
  completionStatus?: string;
}

export interface FocusMetricLabels extends MetricLabels {
  interventionType: string;
  effectiveness?: string;
}

export interface RecommendationMetricLabels extends MetricLabels {
  recommendationType: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// METRIC COLLECTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface HttpMetrics {
  requestDuration: Histogram;
  requestsTotal: Counter;
  requestSize: Histogram;
  responseSize: Histogram;
  activeRequests: Gauge;
}

export interface AiMetrics {
  requestDuration: Histogram;
  requestsTotal: Counter;
  tokensTotal: Counter;
  costTotal: Counter;
  failoverTotal: Counter;
  safetyBlocksTotal: Counter;
  errorsTotal: Counter;
}

export interface SessionMetrics {
  startedTotal: Counter;
  completedTotal: Counter;
  abandonedTotal: Counter;
  duration: Histogram;
  active: Gauge;
}

export interface FocusMetrics {
  interventionsTotal: Counter;
  score: Gauge;
  effectivenessTotal: Counter;
}

export interface RecommendationMetrics {
  createdTotal: Counter;
  acceptedTotal: Counter;
  declinedTotal: Counter;
  expiredTotal: Counter;
}

export interface AuthMetrics {
  requestsTotal: Counter;
  failuresTotal: Counter;
  tokenRefreshesTotal: Counter;
}

export interface EventMetrics {
  publishedTotal: Counter;
  processedTotal: Counter;
  failedTotal: Counter;
  dlqDepth: Gauge;
  processingDuration: Histogram;
}

export interface DatabaseMetrics {
  queryDuration: Histogram;
  connectionsActive: Gauge;
  connectionsIdle: Gauge;
  connectionsWaiting: Gauge;
}

export interface MetricsRegistry {
  registry: Registry;
  serviceName: string;

  // Metric collections
  http: HttpMetrics;
  ai: AiMetrics;
  sessions: SessionMetrics;
  focus: FocusMetrics;
  recommendations: RecommendationMetrics;
  auth: AuthMetrics;
  events: EventMetrics;
  database: DatabaseMetrics;

  // Helper methods
  getMetricsText(): Promise<string>;
  getContentType(): string;
  reset(): void;
}
