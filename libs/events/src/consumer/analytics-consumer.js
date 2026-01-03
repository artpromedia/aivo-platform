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
import { BaseConsumer } from './base-consumer.js';
// -----------------------------------------------------------------------------
// Analytics Consumer Class
// -----------------------------------------------------------------------------
export class AnalyticsConsumer extends BaseConsumer {
    buffer;
    flushTimer = null;
    writers;
    windowMs;
    constructor(config) {
        super(config.connection, {
            ...config.consumer,
            durableName: `${config.consumer.stream.toLowerCase()}-analytics`,
        });
        this.writers = config.writers;
        this.windowMs = config.windowMs ?? 60000;
        this.buffer = this.createEmptyBuffer();
    }
    createEmptyBuffer() {
        return {
            eventCounts: new Map(),
            sessionMetrics: new Map(),
            engagementMetrics: new Map(),
            focusMetrics: new Map(),
        };
    }
    async start() {
        // Start aggregation flush timer
        this.flushTimer = setInterval(() => {
            this.flush().catch((err) => {
                console.error('[AnalyticsConsumer] Flush error:', err);
            });
        }, this.windowMs);
        await super.start();
    }
    async close() {
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
        await this.flush();
        await super.close();
    }
    async handleMessage(message) {
        const event = message.event;
        const hourBucket = this.getHourBucket(new Date(event.timestamp));
        // Always count events
        this.aggregateEventCount(event, hourBucket);
        // Type-specific aggregations
        switch (event.eventType) {
            case 'learning.session.started':
                this.aggregateSessionStarted(event, hourBucket);
                break;
            case 'learning.session.ended':
                this.aggregateSessionEnded(event, hourBucket);
                break;
            case 'learning.activity.completed':
                this.aggregateActivityCompleted(event, hourBucket);
                break;
            case 'learning.engagement.metric':
                this.aggregateEngagement(event, hourBucket);
                break;
            case 'focus.sample':
                this.aggregateFocusSample(event, hourBucket);
                break;
            case 'focus.session.summary':
                this.aggregateFocusSummary(event, hourBucket);
                break;
        }
    }
    getHourBucket(timestamp) {
        const bucket = new Date(timestamp);
        bucket.setMinutes(0, 0, 0);
        return bucket;
    }
    getAggregationKey(tenantId, ...parts) {
        return [tenantId, ...parts].join(':');
    }
    // ---------------------------------------------------------------------------
    // Event Count Aggregation
    // ---------------------------------------------------------------------------
    aggregateEventCount(event, hourBucket) {
        const key = this.getAggregationKey(event.tenantId, event.eventType, hourBucket.toISOString());
        const existing = this.buffer.eventCounts.get(key);
        if (existing) {
            existing.count++;
            existing.updatedAt = new Date();
        }
        else {
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
    aggregateSessionStarted(event, hourBucket) {
        const key = this.getAggregationKey(event.tenantId, event.payload.sessionType, hourBucket.toISOString());
        const existing = this.buffer.sessionMetrics.get(key);
        if (existing) {
            existing.sessionsStarted++;
            existing.updatedAt = new Date();
        }
        else {
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
    aggregateSessionEnded(event, hourBucket) {
        // Try to find matching session type from existing data
        // In production, we'd look this up from the session
        const sessionType = 'LEARNING'; // Default
        const key = this.getAggregationKey(event.tenantId, sessionType, hourBucket.toISOString());
        const existing = this.buffer.sessionMetrics.get(key);
        if (existing) {
            existing.sessionsEnded++;
            existing.totalDurationMs += event.payload.durationMs;
            existing.avgDurationMs = existing.totalDurationMs / existing.sessionsEnded;
            existing.activitiesCompleted += event.payload.summary.activitiesCompleted;
            existing.correctAnswers += event.payload.summary.correctAnswers;
            existing.incorrectAnswers += event.payload.summary.incorrectAnswers;
            existing.updatedAt = new Date();
        }
        else {
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
    aggregateActivityCompleted(event, hourBucket) {
        // Activities contribute to the nearest session metrics bucket
        // This is a simplified aggregation
    }
    // ---------------------------------------------------------------------------
    // Engagement Metrics Aggregation
    // ---------------------------------------------------------------------------
    aggregateEngagement(event, hourBucket) {
        const key = this.getAggregationKey(event.tenantId, hourBucket.toISOString());
        const existing = this.buffer.engagementMetrics.get(key);
        if (existing) {
            // Running average calculation
            const newCount = existing.sampleCount + 1;
            existing.avgEngagementScore =
                (existing.avgEngagementScore * existing.sampleCount + event.payload.engagementScore) /
                    newCount;
            existing.minEngagementScore = Math.min(existing.minEngagementScore, event.payload.engagementScore);
            existing.maxEngagementScore = Math.max(existing.maxEngagementScore, event.payload.engagementScore);
            existing.avgInteractionRate =
                (existing.avgInteractionRate * existing.sampleCount +
                    event.payload.components.interactionRate) /
                    newCount;
            existing.avgOnTaskRatio =
                (existing.avgOnTaskRatio * existing.sampleCount + event.payload.components.onTaskRatio) /
                    newCount;
            existing.sampleCount = newCount;
            existing.updatedAt = new Date();
        }
        else {
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
    aggregateFocusSample(event, hourBucket) {
        const gradeBand = event.payload.gradeBand ?? 'unknown';
        const key = this.getAggregationKey(event.tenantId, gradeBand, hourBucket.toISOString());
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
        }
        else {
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
    aggregateFocusSummary(event, hourBucket) {
        const gradeBand = event.payload.gradeBand ?? 'unknown';
        const key = this.getAggregationKey(event.tenantId, gradeBand, hourBucket.toISOString());
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
    async flush() {
        const currentBuffer = this.buffer;
        this.buffer = this.createEmptyBuffer();
        const promises = [];
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
            console.log(`[AnalyticsConsumer:${this.consumerOptions.stream}] Flushed ${promises.length} aggregations`);
        }
    }
}
// -----------------------------------------------------------------------------
// Factory Function
// -----------------------------------------------------------------------------
export function createAnalyticsConsumers(connection, writers, options) {
    // Only consume LEARNING and FOCUS for analytics
    const streams = ['LEARNING', 'FOCUS'];
    return streams.map((stream) => {
        const config = {
            connection,
            consumer: { stream },
            writers,
        };
        if (options?.windowMs !== undefined) {
            config.windowMs = options.windowMs;
        }
        return new AnalyticsConsumer(config);
    });
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
//# sourceMappingURL=analytics-consumer.js.map