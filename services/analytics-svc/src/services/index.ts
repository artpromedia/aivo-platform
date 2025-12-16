/**
 * Services Index
 *
 * Exports all analytics services.
 */

export { AnalyticsService } from './analytics.service.js';
export type {
  LearnerProgressParams,
  LearnerProgress,
  TopicProgressSummary,
  DailyActivityPoint,
  ContentAnalyticsParams,
  ContentAnalytics,
  ContentDailyTrend,
  TenantOverviewParams,
  TenantOverview,
  TopContentItem,
  DayOfWeekEngagement,
  CompetencyHeatmapParams,
  CompetencyHeatmapCell,
} from './analytics.service.js';

export { AggregationService } from './aggregation.service.js';
export type {
  AggregationResult,
  DateRange,
  MetricData,
} from './aggregation.service.js';
