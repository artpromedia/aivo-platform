import type { BaseEvent } from '../schemas/index.js';
import { BaseConsumer } from './base-consumer.js';
import type { ConsumerConnectionConfig, ConsumerOptions, ProcessedMessage } from './base-consumer.js';
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
export declare class AnalyticsConsumer extends BaseConsumer {
    private buffer;
    private flushTimer;
    private readonly writers;
    private readonly windowMs;
    constructor(config: AnalyticsConsumerConfig);
    private createEmptyBuffer;
    start(): Promise<void>;
    close(): Promise<void>;
    protected handleMessage(message: ProcessedMessage<BaseEvent>): Promise<void>;
    private getHourBucket;
    private getAggregationKey;
    private aggregateEventCount;
    private aggregateSessionStarted;
    private aggregateSessionEnded;
    private aggregateActivityCompleted;
    private aggregateEngagement;
    private aggregateFocusSample;
    private aggregateFocusSummary;
    private flush;
}
export declare function createAnalyticsConsumers(connection: ConsumerConnectionConfig, writers: AnalyticsConsumerConfig['writers'], options?: {
    windowMs?: number;
}): AnalyticsConsumer[];
export declare const CREATE_ANALYTICS_TABLES_SQL = "\n-- Event counts by type per hour\nCREATE TABLE IF NOT EXISTS event_counts_hourly (\n  tenant_id UUID NOT NULL,\n  event_type VARCHAR(100) NOT NULL,\n  hour_bucket TIMESTAMPTZ NOT NULL,\n  count BIGINT NOT NULL DEFAULT 0,\n  updated_at TIMESTAMPTZ NOT NULL,\n  PRIMARY KEY (tenant_id, event_type, hour_bucket)\n);\n\n-- Session metrics per hour\nCREATE TABLE IF NOT EXISTS session_metrics_hourly (\n  tenant_id UUID NOT NULL,\n  session_type VARCHAR(50) NOT NULL,\n  hour_bucket TIMESTAMPTZ NOT NULL,\n  sessions_started INT NOT NULL DEFAULT 0,\n  sessions_ended INT NOT NULL DEFAULT 0,\n  total_duration_ms BIGINT NOT NULL DEFAULT 0,\n  avg_duration_ms BIGINT NOT NULL DEFAULT 0,\n  activities_completed INT NOT NULL DEFAULT 0,\n  correct_answers INT NOT NULL DEFAULT 0,\n  incorrect_answers INT NOT NULL DEFAULT 0,\n  updated_at TIMESTAMPTZ NOT NULL,\n  PRIMARY KEY (tenant_id, session_type, hour_bucket)\n);\n\n-- Engagement metrics per hour\nCREATE TABLE IF NOT EXISTS engagement_metrics_hourly (\n  tenant_id UUID NOT NULL,\n  hour_bucket TIMESTAMPTZ NOT NULL,\n  sample_count INT NOT NULL DEFAULT 0,\n  avg_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,\n  min_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,\n  max_engagement_score DECIMAL(5,2) NOT NULL DEFAULT 0,\n  avg_interaction_rate DECIMAL(10,4) NOT NULL DEFAULT 0,\n  avg_on_task_ratio DECIMAL(5,4) NOT NULL DEFAULT 0,\n  updated_at TIMESTAMPTZ NOT NULL,\n  PRIMARY KEY (tenant_id, hour_bucket)\n);\n\n-- Focus metrics per hour (optionally by grade band)\nCREATE TABLE IF NOT EXISTS focus_metrics_hourly (\n  tenant_id UUID NOT NULL,\n  grade_band VARCHAR(10) NOT NULL DEFAULT 'all',\n  hour_bucket TIMESTAMPTZ NOT NULL,\n  sample_count INT NOT NULL DEFAULT 0,\n  avg_focus_score DECIMAL(5,2) NOT NULL DEFAULT 0,\n  min_focus_score DECIMAL(5,2) NOT NULL DEFAULT 0,\n  max_focus_score DECIMAL(5,2) NOT NULL DEFAULT 0,\n  avg_idle_ms BIGINT NOT NULL DEFAULT 0,\n  total_background_ms BIGINT NOT NULL DEFAULT 0,\n  focus_loss_count INT NOT NULL DEFAULT 0,\n  updated_at TIMESTAMPTZ NOT NULL,\n  PRIMARY KEY (tenant_id, grade_band, hour_bucket)\n);\n\n-- Indexes for time-range queries\nCREATE INDEX IF NOT EXISTS idx_event_counts_hourly_bucket ON event_counts_hourly(hour_bucket);\nCREATE INDEX IF NOT EXISTS idx_session_metrics_hourly_bucket ON session_metrics_hourly(hour_bucket);\nCREATE INDEX IF NOT EXISTS idx_engagement_metrics_hourly_bucket ON engagement_metrics_hourly(hour_bucket);\nCREATE INDEX IF NOT EXISTS idx_focus_metrics_hourly_bucket ON focus_metrics_hourly(hour_bucket);\n";
//# sourceMappingURL=analytics-consumer.d.ts.map