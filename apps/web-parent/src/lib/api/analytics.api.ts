/**
 * Analytics API Client
 *
 * Type-safe API functions for analytics and progress tracking features:
 * - Learner Progress Summary
 * - Activity Timeline
 * - Goals Tracking
 * - Weekly/Monthly Reports
 */

import type {
  LearnerProgressSummary,
  ActivityTimeline,
  ActivityTimelineFilters,
  GoalsData,
  WeeklySummary,
  ProgressReport,
  DateRange,
  LearnerEngagementMetrics,
} from '@aivo/ts-types';

import { apiClient } from './client';

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: unknown;
  timestamp: number;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

const CACHE_TTL = {
  progress: 5 * 60 * 1000, // 5 minutes
  activity: 60 * 1000, // 1 minute
  goals: 5 * 60 * 1000, // 5 minutes
  weekly: 10 * 60 * 1000, // 10 minutes
  engagement: 10 * 60 * 1000, // 10 minutes
};

function getCacheKey(prefix: string, params: Record<string, unknown>): string {
  return `${prefix}:${JSON.stringify(params)}`;
}

function getFromCache(key: string): unknown {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: unknown, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    expiresAt: Date.now() + ttl,
  });
}

function invalidateCachePrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================================================
// Progress Summary API
// ============================================================================

/**
 * Get learner progress summary
 */
export async function getProgressSummary(
  studentId: string,
  period?: DateRange
): Promise<LearnerProgressSummary> {
  const cacheKey = getCacheKey('progress', { studentId, period });
  const cached = getFromCache(cacheKey) as LearnerProgressSummary | null;
  if (cached) return cached;

  const params = new URLSearchParams();
  if (period?.from) {
    params.set('from', typeof period.from === 'string' ? period.from : period.from.toISOString().split('T')[0]!);
  }
  if (period?.to) {
    params.set('to', typeof period.to === 'string' ? period.to : period.to.toISOString().split('T')[0]!);
  }

  const queryString = params.toString();
  const url = `/api/analytics/learners/${studentId}/progress-summary${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<LearnerProgressSummary>(url);
  setCache(cacheKey, response, CACHE_TTL.progress);
  return response;
}

/**
 * Refresh progress summary (bypasses cache)
 */
export async function refreshProgressSummary(
  studentId: string,
  period?: DateRange
): Promise<LearnerProgressSummary> {
  invalidateCachePrefix(`progress:${JSON.stringify({ studentId })}`);
  return getProgressSummary(studentId, period);
}

// ============================================================================
// Activity Timeline API
// ============================================================================

/**
 * Get activity timeline for a learner
 */
export async function getActivityTimeline(
  studentId: string,
  filters?: ActivityTimelineFilters,
  limit = 20,
  cursor?: string
): Promise<ActivityTimeline> {
  const cacheKey = getCacheKey('activity', { studentId, filters, limit, cursor });
  const cached = getFromCache(cacheKey) as ActivityTimeline | null;
  if (cached) return cached;

  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (cursor) params.set('cursor', cursor);
  if (filters?.types?.length) params.set('types', filters.types.join(','));
  if (filters?.subjects?.length) params.set('subjects', filters.subjects.join(','));
  if (filters?.dateRange?.from) {
    const from = filters.dateRange.from;
    params.set('from', typeof from === 'string' ? from : from.toISOString().split('T')[0]!);
  }
  if (filters?.dateRange?.to) {
    const to = filters.dateRange.to;
    params.set('to', typeof to === 'string' ? to : to.toISOString().split('T')[0]!);
  }

  const response = await apiClient.get<ActivityTimeline>(
    `/api/analytics/learners/${studentId}/activity?${params.toString()}`
  );

  setCache(cacheKey, response, CACHE_TTL.activity);
  return response;
}

// ============================================================================
// Goals API
// ============================================================================

/**
 * Get goals for a learner
 */
export async function getGoals(
  studentId: string,
  includeCompleted = true
): Promise<GoalsData> {
  const cacheKey = getCacheKey('goals', { studentId, includeCompleted });
  const cached = getFromCache(cacheKey) as GoalsData | null;
  if (cached) return cached;

  const params = new URLSearchParams();
  params.set('includeCompleted', includeCompleted.toString());

  const response = await apiClient.get<GoalsData>(
    `/api/analytics/learners/${studentId}/goals?${params.toString()}`
  );

  setCache(cacheKey, response, CACHE_TTL.goals);
  return response;
}

/**
 * Refresh goals (bypasses cache)
 */
export async function refreshGoals(studentId: string): Promise<GoalsData> {
  invalidateCachePrefix(`goals:${JSON.stringify({ studentId })}`);
  return getGoals(studentId);
}

// ============================================================================
// Weekly Summary API
// ============================================================================

/**
 * Get weekly summary for a student
 */
export async function getWeeklySummary(
  studentId: string,
  weekStart?: string
): Promise<WeeklySummary> {
  const cacheKey = getCacheKey('weekly', { studentId, weekStart });
  const cached = getFromCache(cacheKey) as WeeklySummary | null;
  if (cached) return cached;

  const params = new URLSearchParams();
  if (weekStart) params.set('weekStart', weekStart);
  params.set('includeComparison', 'true');

  const response = await apiClient.get<WeeklySummary>(
    `/api/analytics/learners/${studentId}/weekly-summary?${params.toString()}`
  );

  setCache(cacheKey, response, CACHE_TTL.weekly);
  return response;
}

// ============================================================================
// Engagement Metrics API
// ============================================================================

/**
 * Get engagement metrics for a learner
 */
export async function getEngagementMetrics(
  studentId: string,
  period?: DateRange
): Promise<LearnerEngagementMetrics> {
  const cacheKey = getCacheKey('engagement', { studentId, period });
  const cached = getFromCache(cacheKey) as LearnerEngagementMetrics | null;
  if (cached) return cached;

  const params = new URLSearchParams();
  if (period?.from) {
    params.set('from', typeof period.from === 'string' ? period.from : period.from.toISOString().split('T')[0]!);
  }
  if (period?.to) {
    params.set('to', typeof period.to === 'string' ? period.to : period.to.toISOString().split('T')[0]!);
  }

  const queryString = params.toString();
  const url = `/api/analytics/learners/${studentId}/engagement${queryString ? `?${queryString}` : ''}`;

  const response = await apiClient.get<LearnerEngagementMetrics>(url);
  setCache(cacheKey, response, CACHE_TTL.engagement);
  return response;
}

// ============================================================================
// Progress Report API
// ============================================================================

/**
 * Get full progress report
 */
export async function getProgressReport(
  studentId: string,
  period: DateRange,
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom' = 'weekly'
): Promise<ProgressReport> {
  const from = typeof period.from === 'string' ? period.from : period.from.toISOString().split('T')[0]!;
  const to = typeof period.to === 'string' ? period.to : period.to.toISOString().split('T')[0]!;

  return apiClient.get<ProgressReport>(
    `/api/analytics/learners/${studentId}/report?from=${from}&to=${to}&type=${reportType}`
  );
}

/**
 * Export progress report as PDF
 */
export async function exportProgressReportPDF(
  studentId: string,
  period: DateRange
): Promise<Blob> {
  const from = typeof period.from === 'string' ? period.from : period.from.toISOString().split('T')[0]!;
  const to = typeof period.to === 'string' ? period.to : period.to.toISOString().split('T')[0]!;

  const response = await fetch(
    `/api/analytics/learners/${studentId}/report/export?from=${from}&to=${to}&format=pdf`,
    {
      headers: {
        Accept: 'application/pdf',
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to export report');
  }

  return response.blob();
}

// ============================================================================
// Daily Stats API
// ============================================================================

/**
 * Get daily stats for a learner over a period
 */
export async function getDailyStats(
  studentId: string,
  period?: DateRange
): Promise<Array<{ date: string; minutes: number; xp: number; lessonsCompleted: number }>> {
  const params = new URLSearchParams();
  if (period?.from) {
    params.set('from', typeof period.from === 'string' ? period.from : period.from.toISOString().split('T')[0]!);
  }
  if (period?.to) {
    params.set('to', typeof period.to === 'string' ? period.to : period.to.toISOString().split('T')[0]!);
  }

  const queryString = params.toString();
  const url = `/api/analytics/learners/${studentId}/daily-stats${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<Array<{ date: string; minutes: number; xp: number; lessonsCompleted: number }>>(url);
}

// ============================================================================
// Subject Progress API
// ============================================================================

/**
 * Get subject-specific progress
 */
export async function getSubjectProgress(
  studentId: string,
  subjectCode?: string
): Promise<Array<{
  subjectCode: string;
  subjectName: string;
  masteryScore: number;
  lessonsCompleted: number;
  totalLessons: number;
  trend: 'improving' | 'steady' | 'declining';
}>> {
  const params = new URLSearchParams();
  if (subjectCode) params.set('subject', subjectCode);

  const queryString = params.toString();
  const url = `/api/analytics/learners/${studentId}/subjects${queryString ? `?${queryString}` : ''}`;

  return apiClient.get(url);
}

// ============================================================================
// Cache Utilities
// ============================================================================

/**
 * Clear all analytics cache
 */
export function clearAnalyticsCache(): void {
  cache.clear();
}

/**
 * Invalidate cache for a specific student
 */
export function invalidateStudentCache(studentId: string): void {
  for (const key of cache.keys()) {
    if (key.includes(studentId)) {
      cache.delete(key);
    }
  }
}

// ============================================================================
// Export as namespace
// ============================================================================

export const analyticsApi = {
  // Progress
  getProgressSummary,
  refreshProgressSummary,

  // Activity
  getActivityTimeline,

  // Goals
  getGoals,
  refreshGoals,

  // Weekly
  getWeeklySummary,

  // Engagement
  getEngagementMetrics,

  // Reports
  getProgressReport,
  exportProgressReportPDF,

  // Stats
  getDailyStats,
  getSubjectProgress,

  // Cache
  clearAnalyticsCache,
  invalidateStudentCache,
};
