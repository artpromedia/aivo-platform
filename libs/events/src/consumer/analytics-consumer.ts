// =============================================================================
// @aivo/events - Analytics Consumer
// =============================================================================
//
// Consumer that aggregates events for analytics dashboards.
// Produces hourly and real-time aggregations.
//
// Aggregation tables:
//   - event_counts_hourly: Event counts by type per hour
//   - session_metrics_hourly: Session metrics per hour
//   - engagement_metrics_hourly: Engagement aggregations
//   - focus_metrics_hourly: Focus score aggregations

import {
  BaseConsumer,
  ConsumerConnectionConfig,
  ConsumerOptions,
  ProcessedMessage,
} from './base-consumer';
import type { BaseEvent } from '../schemas';
import type {
  LearningSessionStarted,
  LearningSessionEnded,
  ActivityCompleted,
  EngagementMetric,
  FocusSample,
  FocusSessionSummary,
} from '../schemas';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface AnalyticsConsumerConfig {
  connection: ConsumerConnectionConfig;
  consumer: Omit<ConsumerOptions, 'durableName'>;
  /** Aggregation write functions */
  writers: {
    /** Write hourly event count */
    writeEventCount: (data: EventCountAggregation) => Promise<void>;
    /** Write hourly session metrics */
    writeSessionMetrics: (data: SessionMetricsAggregation) => Promise<void>;
    /** Write hourly engagement metrics */
    writeEngagementMetrics: (data: EngagementMetricsAggregation) => Promise<void>;
    /** Write hourly focus metrics */
    writeFocusMetrics: (data: FocusMetricsAggregation) => Promise<void>;
  };
  /** Aggregation window in ms (default: 60000 = 1 minute) */
  windowMs?: number;
}

export interface EventCountAggregation {
  tenantId: string;
  eventType: string;
  hourBucket: Date;
  count: number;
  updatedAt: Date;
}

export interface SessionMetricsAggregation {
  tenantId: string;
  sessionType: string;
  hourBucket: Date;
  sessionsStarted: number;
  sessionsEnded: number;
  totalDurationMs: number;
  avgDurationMs: number;
  activitiesCompleted: number;
  correctAnswers: number;
  incorrectAnswers: number;
  updatedAt: Date;
}

export interface EngagementMetricsAggregation {
  tenantId: string;
  hourBucket: Date;
  sampleCount: number;
  avgEngagementScore: number;
  minEngagementScore: number;
  maxEngagementScore: number;
  avgInteractionRate: number;
  avgOnTaskRatio: number;
  updatedAt: Date;
}

export interface FocusMetricsAggregation {
  tenantId: string;
  gradeBand?: string;
  hourBucket: Date;
  sampleCount: number;
  avgFocusScore: number;
  minFocusScore: number;
  maxFocusScore: number;
  avgIdleMs: number;
  totalBackgroundMs: number;
  focusLossCount: number;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// In-Memory Aggregation Buffer
// -----------------------------------------------------------------------------

interface AggregationBuffer {
  eventCounts: Map<string, EventCountAggregation>;
  sessionMetrics: Map<string, SessionMetricsAggregation>;
  engagementMetrics: Map<string, EngagementMetricsAggregation>;
  focusMetrics: Map<string, FocusMetricsAggregation>;
}

// -----------------------------------------------------------------------------
// Analytics Consumer Class
// -----------------------------------------------------------------------------

export class AnalyticsConsumer extends BaseConsumer {
  private buffer: AggregationBuffer;
  private flushTimer: NodeJS.Timeout | null = null;
  private writers: AnalyticsConsumerConfig['writers'];
  private windowMs: number;

  constructor(config: AnalyticsConsumerConfig) {
    super(config.connection, {
      ...config.consumer,
      durableName: `${config.consumer.stream.toLowerCase()}-analytics`,
    });
    
    this.writers = config.writers;
    this.windowMs = config.windowMs ?? 60000;
    this.buffer = this.createEmptyBuffer();
  }

  private createEmptyBuffer(): AggregationBuffer {
    return {
      eventCounts: new Map(),
      sessionMetrics: new Map(),
      engagementMetrics: new Map(),
      focusMetrics: new Map(),
    };
  }

  async start(): Promise<void> {
    // Start aggregation flush timer
    this.flushTimer = setInterval(() => {
      this.flush().catch(err => {
        console.error('[AnalyticsConsumer] Flush error:', err);
      });
    }, this.windowMs);

    await super.start();
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    await this.flush();
    await super.close();
  }

  protected async handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void> {
    const event = message.event;
    const hourBucket = this.getHourBucket(new Date(event.timestamp));
    
    // Always count events
    this.aggregateEventCount(event, hourBucket);
    
    // Type-specific aggregations
    switch (event.eventType) {
      case 'learning.session.started':
        this.aggregateSessionStarted(event as LearningSessionStarted, hourBucket);
        break;
      case 'learning.session.ended':
        this.aggregateSessionEnded(event as LearningSessionEnded, hourBucket);
        break;
      case 'learning.activity.completed':
        this.aggregateActivityCompleted(event as ActivityCompleted, hourBucket);
        break;
      case 'learning.engagement.metric':
        this.aggregateEngagement(event as EngagementMetric, hourBucket);
        break;
      case 'focus.sample':
        this.aggregateFocusSample(event as FocusSample, hourBucket);
        break;
      case 'focus.session.summary':
        this.aggregateFocusSummary(event as FocusSessionSummary, hourBucket);
        break;
    }
  }

  private getHourBucket(timestamp: Date): Date {
    const bucket = new Date(timestamp);
    bucket.setMinutes(0, 0, 0);
    return bucket;
  }

  private getAggregationKey(tenantId: string, ...parts: string[]): string {
    return [tenantId, ...parts].join(':');
  }

  // ---------------------------------------------------------------------------
  // Event Count Aggregation
  // ---------------------------------------------------------------------------

  private aggregateEventCount(event: BaseEvent, hourBucket: Date): void {
    const key = this.getAggregationKey(
      event.tenantId,
      event.eventType,
      hourBucket.toISOString()
    );

    const existing = this.buffer.eventCounts.get(key);
    if (existing) {
      existing.count++;
      existing.updatedAt = new Date();
    } else {
      this.buffer.eventCounts.set(key, {
        tenantId: event.tenantId,
        eventType: event.eventType,
        hourBucket,
        count: 1,
        updatedAt: new Date(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Session Metrics Aggregation
  // ---------------------------------------------------------------------------

  private aggregateSessionStarted(
    event: LearningSessionStarted,
    hourBucket: Date
  ): void {
    const key = this.getAggregationKey(
      event.tenantId,
      event.payload.sessionType,
      hourBucket.toISOString()
    );

    const existing = this.buffer.sessionMetrics.get(key);
    if (existing) {
      existing.sessionsStarted++;
      existing.updatedAt = new Date();
    } else {
      this.buffer.sessionMetrics.set(key, {
        tenantId: event.tenantId,
        sessionType: event.payload.sessionType,
        hourBucket,
        sessionsStarted: 1,
        sessionsEnded: 0,
        totalDurationMs: 0,
        avgDurationMs: 0,
        activitiesCompleted: 0,
        correctAnswers: 0,
        incorrectAnswers: 0,
        updatedAt: new Date(),
      });
    }
  }

  private aggregateSessionEnded(
    event: LearningSessionEnded,
    hourBucket: Date
  ): void {
    // Try to find matching session type from existing data
    // In production, we'd look this up from the session
    const sessionType = 'LEARNING'; // Default
    
    const key = this.getAggregationKey(
      event.tenantId,
      sessionType,
      hourBucket.toISOString()
    );

    const existing = this.buffer.sessionMetrics.get(key);
    if (existing) {
      existing.sessionsEnded++;
      existing.totalDurationMs += event.payload.durationMs;
      existing.avgDurationMs = existing.totalDurationMs / existing.sessionsEnded;
      existing.activitiesCompleted += event.payload.summary.activitiesCompleted;
      existing.correctAnswers += event.payload.summary.correctAnswers;
      existing.incorrectAnswers += event.payload.summary.incorrectAnswers;
      existing.updatedAt = new Date();
    } else {
      this.buffer.sessionMetrics.set(key, {
        tenantId: event.tenantId,
        sessionType,
        hourBucket,
        sessionsStarted: 0,
        sessionsEnded: 1,
        totalDurationMs: event.payload.durationMs,
        avgDurationMs: event.payload.durationMs,
        activitiesCompleted: event.payload.summary.activitiesCompleted,
        correctAnswers: event.payload.summary.correctAnswers,
        incorrectAnswers: event.payload.summary.incorrectAnswers,
        updatedAt: new Date(),
      });
    }
  }

  private aggregateActivityCompleted(
    event: ActivityCompleted,
    hourBucket: Date
  ): void {
    // Activities contribute to the nearest session metrics bucket
    // This is a simplified aggregation
  }

  // ---------------------------------------------------------------------------
  // Engagement Metrics Aggregation
  // ---------------------------------------------------------------------------

  private aggregateEngagement(
    event: EngagementMetric,
    hourBucket: Date
  ): void {
    const key = this.getAggregationKey(
      event.tenantId,
      hourBucket.toISOString()
    );

    const existing = this.buffer.engagementMetrics.get(key);
    if (existing) {
      // Running average calculation
      const newCount = existing.sampleCount + 1;
      existing.avgEngagementScore = 
        (existing.avgEngagementScore * existing.sampleCount + event.payload.engagementScore) / newCount;
      existing.minEngagementScore = Math.min(existing.minEngagementScore, event.payload.engagementScore);
      existing.maxEngagementScore = Math.max(existing.maxEngagementScore, event.payload.engagementScore);
      existing.avgInteractionRate = 
        (existing.avgInteractionRate * existing.sampleCount + event.payload.components.interactionRate) / newCount;
      existing.avgOnTaskRatio = 
        (existing.avgOnTaskRatio * existing.sampleCount + event.payload.components.onTaskRatio) / newCount;
      existing.sampleCount = newCount;
      existing.updatedAt = new Date();
    } else {
      this.buffer.engagementMetrics.set(key, {
        tenantId: event.tenantId,
        hourBucket,
        sampleCount: 1,
        avgEngagementScore: event.payload.engagementScore,
        minEngagementScore: event.payload.engagementScore,
        maxEngagementScore: event.payload.engagementScore,
        avgInteractionRate: event.payload.components.interactionRate,
        avgOnTaskRatio: event.payload.components.onTaskRatio,
        updatedAt: new Date(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Focus Metrics Aggregation
  // ---------------------------------------------------------------------------

  private aggregateFocusSample(
    event: FocusSample,
    hourBucket: Date
  ): void {
    const gradeBand = event.payload.gradeBand ?? 'unknown';
    const key = this.getAggregationKey(
      event.tenantId,
      gradeBand,
      hourBucket.toISOString()
    );

    const existing = this.buffer.focusMetrics.get(key);
    if (existing) {
      const newCount = existing.sampleCount + 1;
      existing.avgFocusScore = 
        (existing.avgFocusScore * existing.sampleCount + event.payload.focusScore) / newCount;
      existing.minFocusScore = Math.min(existing.minFocusScore, event.payload.focusScore);
      existing.maxFocusScore = Math.max(existing.maxFocusScore, event.payload.focusScore);
      existing.avgIdleMs = 
        (existing.avgIdleMs * existing.sampleCount + event.payload.avgIdleMs) / newCount;
      existing.totalBackgroundMs += event.payload.backgroundMs;
      existing.sampleCount = newCount;
      existing.updatedAt = new Date();
    } else {
      this.buffer.focusMetrics.set(key, {
        tenantId: event.tenantId,
        gradeBand,
        hourBucket,
        sampleCount: 1,
        avgFocusScore: event.payload.focusScore,
        minFocusScore: event.payload.focusScore,
        maxFocusScore: event.payload.focusScore,
        avgIdleMs: event.payload.avgIdleMs,
        totalBackgroundMs: event.payload.backgroundMs,
        focusLossCount: 0,
        updatedAt: new Date(),
      });
    }
  }

  private aggregateFocusSummary(
    event: FocusSessionSummary,
    hourBucket: Date
  ): void {
    const gradeBand = event.payload.gradeBand ?? 'unknown';
    const key = this.getAggregationKey(
      event.tenantId,
      gradeBand,
      hourBucket.toISOString()
    );

    const existing = this.buffer.focusMetrics.get(key);
    if (existing) {
      existing.focusLossCount += event.payload.focusLossCount;
      existing.totalBackgroundMs += event.payload.backgroundMs;
      existing.updatedAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // Flush Aggregations
  // ---------------------------------------------------------------------------

  private async flush(): Promise<void> {
    const currentBuffer = this.buffer;
    this.buffer = this.createEmptyBuffer();

    const promises: Promise<void>[] = [];

    // Flush event counts
    for (const agg of currentBuffer.eventCounts.values()) {
      promises.push(this.writers.writeEventCount(agg));
    }

    // Flush session metrics
    for (const agg of currentBuffer.sessionMetrics.values()) {
      promises.push(this.writers.writeSessionMetrics(agg));
    }

    // Flush engagement metrics
    for (const agg of currentBuffer.engagementMetrics.values()) {
      promises.push(this.writers.writeEngagementMetrics(agg));
    }

    // Flush focus metrics
    for (const agg of currentBuffer.focusMetrics.values()) {
      promises.push(this.writers.writeFocusMetrics(agg));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
      console.log(
        `[AnalyticsConsumer:${this.consumerOptions.stream}] Flushed ${promises.length} aggregations`
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------

export function createAnalyticsConsumers(
  connection: ConsumerConnectionConfig,
  writers: AnalyticsConsumerConfig['writers'],
  options?: { windowMs?: number }
): AnalyticsConsumer[] {
  // Only consume LEARNING and FOCUS for analytics
  const streams = ['LEARNING', 'FOCUS'];
  
  return streams.map(stream =>
    new AnalyticsConsumer({
      connection,
      consumer: { stream },
      writers,
      windowMs: options?.windowMs,
    })
  );
}

// -----------------------------------------------------------------------------
// SQL Helpers
// -----------------------------------------------------------------------------

export const CREATE_ANALYTICS_TABLES_SQL = `
-- Event counts by type per hour
CREATE TABLE IF NOT EXISTS event_counts_hourly (
  tenant_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, event_type, hour_bucket)
);

-- Session metrics per hour
CREATE TABLE IF NOT EXISTS session_metrics_hourly (
  tenant_id UUID NOT NULL,
  session_type VARCHAR(50) NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  sessions_started INT NOT NULL DEFAULT 0,
  sessions_ended INT NOT NULL DEFAULT 0,
  total_duration_ms BIGINT NOT NULL DEFAULT 0,
  avg_duration_ms BIGINT NOT NULL DEFAULT 0,
  activities_completed INT NOT NULL DEFAULT 0,
  correct_answers INT NOT NULL DEFAULT 0,
  incorrect_answers INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, session_type, hour_bucket)
);

-- Engagement metrics per hour
CREATE TABLE IF NOT EXISTS engagement_metrics_hourly (
  tenant_id UUID NOT NULL,
  hour_bucket TIMESTAMPTZ NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  avg_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  min_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  avg_interaction_rate DECIMAL(10,4) NOT NULL DEFAULT 0,
  avg_on_task_ratio DECIMAL(5,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, hour_bucket)
);

-- Focus metrics per hour (optionally by grade band)
CREATE TABLE IF NOT EXISTS focus_metrics_hourly (
  tenant_id UUID NOT NULL,
  grade_band VARCHAR(10) NOT NULL DEFAULT 'all',
  hour_bucket TIMESTAMPTZ NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  avg_focus_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  min_focus_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  max_focus_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  avg_idle_ms BIGINT NOT NULL DEFAULT 0,
  total_background_ms BIGINT NOT NULL DEFAULT 0,
  focus_loss_count INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (tenant_id, grade_band, hour_bucket)
);

-- Indexes for time-range queries
CREATE INDEX IF NOT EXISTS idx_event_counts_hourly_bucket ON event_counts_hourly(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_session_metrics_hourly_bucket ON session_metrics_hourly(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_engagement_metrics_hourly_bucket ON engagement_metrics_hourly(hour_bucket);
CREATE INDEX IF NOT EXISTS idx_focus_metrics_hourly_bucket ON focus_metrics_hourly(hour_bucket);
`;
