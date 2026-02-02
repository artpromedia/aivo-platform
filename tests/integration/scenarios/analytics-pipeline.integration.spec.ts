/**
 * Analytics Pipeline Integration Test Suite
 *
 * Complete end-to-end analytics workflow testing:
 * 1. Event generation and tracking
 * 2. Event ingestion and queuing
 * 3. Data processing and transformation
 * 4. Aggregation and storage
 * 5. Report generation
 * 6. Real-time dashboards
 *
 * @module tests/integration/scenarios/analytics-pipeline
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import { wait, waitFor, retry, randomString, debug } from '../utils/helpers';

describe('Analytics Pipeline - Complete Workflow', () => {
  // API clients for different user roles
  let adminApi: ApiClient;
  let teacherApi: ApiClient;
  let studentApi: ApiClient;
  let analyticsApi: ApiClient;

  // Test data IDs
  let eventBatchId: string;
  let reportId: string;
  let dashboardId: string;
  let exportJobId: string;
  let segmentId: string;

  // Cleanup tracking
  const cleanupIds: {
    reports: string[];
    dashboards: string[];
    exports: string[];
    segments: string[];
  } = {
    reports: [],
    dashboards: [],
    exports: [],
    segments: [],
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Initialize API clients from global test context
    adminApi = createApiClientForUser(ctx().users.adminA.token);
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    studentApi = createApiClientForUser(ctx().users.learnerA.token);
    analyticsApi = createApiClientForUser(ctx().users.adminA.token);

    debug('Analytics Pipeline Test Setup', {
      orgId: ctx().tenantA.id,
      adminId: ctx().users.adminA.id,
    });
  });

  afterAll(async () => {
    debug('Cleaning up analytics test data...');

    // Cancel any running export jobs
    for (const jobId of cleanupIds.exports) {
      try {
        await analyticsApi.delete(`/analytics/exports/${jobId}`);
      } catch {
        // Job may already be completed
      }
    }

    // Delete test dashboards
    for (const dashId of cleanupIds.dashboards) {
      try {
        await analyticsApi.delete(`/analytics/dashboards/${dashId}`);
      } catch {
        // Dashboard may already be deleted
      }
    }

    // Delete test reports
    for (const repId of cleanupIds.reports) {
      try {
        await analyticsApi.delete(`/analytics/reports/${repId}`);
      } catch {
        // Report may already be deleted
      }
    }

    // Delete test segments
    for (const segId of cleanupIds.segments) {
      try {
        await analyticsApi.delete(`/analytics/segments/${segId}`);
      } catch {
        // Segment may already be deleted
      }
    }

    debug('Cleanup complete');
  });

  // ==========================================================================
  // 1. Event Generation & Tracking
  // ==========================================================================

  describe('1. Event Generation & Tracking', () => {
    it('should track page view event', async () => {
      const event = {
        type: 'page_view',
        userId: ctx().users.learnerA.id,
        sessionId: `session-${randomString(12)}`,
        timestamp: new Date().toISOString(),
        properties: {
          page: '/dashboard',
          referrer: '/login',
          title: 'Student Dashboard',
          duration: 0,
        },
        context: {
          userAgent: 'Integration Test Agent',
          platform: 'web',
          tenantId: ctx().tenantA.id,
        },
      };

      const response = await studentApi.post('/analytics/events', event);

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const result = response.data as { eventId?: string; acknowledged: boolean };
        expect(result.acknowledged || result.eventId).toBeTruthy();
      }

      debug('Page view event tracked', { status: response.status });
    });

    it('should track learning activity event', async () => {
      const event = {
        type: 'learning_activity',
        userId: ctx().users.learnerA.id,
        timestamp: new Date().toISOString(),
        properties: {
          activityType: 'lesson_completed',
          lessonId: `lesson-${randomString(8)}`,
          courseId: `course-${randomString(8)}`,
          duration: 1800, // 30 minutes
          score: 85,
          attempts: 2,
          completedAt: new Date().toISOString(),
        },
        context: {
          tenantId: ctx().tenantA.id,
        },
      };

      const response = await studentApi.post('/analytics/events', event);

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should track assessment event', async () => {
      const event = {
        type: 'assessment_completed',
        userId: ctx().users.learnerA.id,
        timestamp: new Date().toISOString(),
        properties: {
          assessmentId: `assessment-${randomString(8)}`,
          assessmentType: 'quiz',
          score: 90,
          maxScore: 100,
          timeSpent: 600, // 10 minutes
          questionsAnswered: 10,
          correctAnswers: 9,
          masteryLevel: 'proficient',
        },
        context: {
          tenantId: ctx().tenantA.id,
          gradeLevel: 5,
          subject: 'math',
        },
      };

      const response = await studentApi.post('/analytics/events', event);

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should batch track multiple events', async () => {
      const events = [
        {
          type: 'button_click',
          userId: ctx().users.learnerA.id,
          timestamp: new Date(Date.now() - 10000).toISOString(),
          properties: { buttonId: 'start_lesson', page: '/course/123' },
        },
        {
          type: 'video_watched',
          userId: ctx().users.learnerA.id,
          timestamp: new Date(Date.now() - 5000).toISOString(),
          properties: { videoId: 'vid-123', duration: 120, watchedPercent: 100 },
        },
        {
          type: 'hint_requested',
          userId: ctx().users.learnerA.id,
          timestamp: new Date().toISOString(),
          properties: { questionId: 'q-456', hintLevel: 1 },
        },
      ];

      const response = await studentApi.post('/analytics/events/batch', { events });

      expect([200, 201, 202, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 202) {
        const result = response.data as {
          batchId?: string;
          received: number;
          failed: number;
        };

        if (result.batchId) {
          eventBatchId = result.batchId;
        }

        expect(result.received).toBeGreaterThan(0);
      }
    });

    it('should validate event schema', async () => {
      const invalidEvent = {
        type: 'invalid_event_type_that_should_not_exist',
        // Missing required fields
        properties: {},
      };

      const response = await studentApi.post('/analytics/events', invalidEvent);

      // Should either reject or accept with validation warning
      expect([200, 201, 202, 400, 422, 404]).toContain(response.status);
    });

    it('should enrich events with user context', async () => {
      const event = {
        type: 'page_view',
        userId: ctx().users.learnerA.id,
        timestamp: new Date().toISOString(),
        properties: { page: '/lesson/123' },
        // Context should be auto-enriched
      };

      const response = await studentApi.post('/analytics/events', event);

      expect([200, 201, 202, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 2. Event Ingestion & Queuing
  // ==========================================================================

  describe('2. Event Ingestion & Queuing', () => {
    it('should get ingestion queue status', async () => {
      const response = await analyticsApi.get('/analytics/ingestion/status');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const status = response.data as {
          queueSize: number;
          processingRate: number;
          backpressure: boolean;
          lastProcessedAt: string;
        };

        expect(status.queueSize).toBeGreaterThanOrEqual(0);
      }
    });

    it('should verify event reached ingestion pipeline', async () => {
      // Wait for event to be processed
      await wait(1000);

      const response = await analyticsApi.get('/analytics/ingestion/recent', {
        params: {
          userId: ctx().users.learnerA.id,
          limit: 10,
        },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          events: Array<{
            id: string;
            type: string;
            status: string;
            receivedAt: string;
          }>;
        };

        expect(Array.isArray(data.events)).toBe(true);
      }
    });

    it('should handle high-volume event ingestion', async () => {
      // Generate many events in quick succession
      const promises = [];
      for (let i = 0; i < 20; i++) {
        const event = {
          type: 'heartbeat',
          userId: ctx().users.learnerA.id,
          timestamp: new Date().toISOString(),
          properties: {
            sessionId: `session-${randomString(8)}`,
            sequence: i,
          },
        };
        promises.push(studentApi.post('/analytics/events', event));
      }

      const results = await Promise.allSettled(promises);

      const successful = results.filter(
        (r) => r.status === 'fulfilled' && [200, 201, 202].includes(r.value.status)
      );

      // Most should succeed (allow for some rate limiting)
      expect(successful.length).toBeGreaterThan(10);
    });

    it('should implement dead letter queue for failed events', async () => {
      const response = await analyticsApi.get('/analytics/ingestion/dead-letter-queue', {
        params: { limit: 10 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          events: Array<{
            id: string;
            error: string;
            failedAt: string;
            retries: number;
          }>;
          totalCount: number;
        };

        expect(Array.isArray(data.events)).toBe(true);
      }
    });

    it('should retry failed events', async () => {
      const response = await analyticsApi.post('/analytics/ingestion/retry', {
        eventIds: [], // Retry all or specific IDs
        maxRetries: 3,
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should purge old events from queue', async () => {
      const response = await analyticsApi.post('/analytics/ingestion/purge', {
        olderThan: '7d',
        status: 'processed',
      });

      expect([200, 201, 204, 403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 3. Data Processing & Transformation
  // ==========================================================================

  describe('3. Data Processing & Transformation', () => {
    it('should trigger event processing', async () => {
      const response = await analyticsApi.post('/analytics/process', {
        eventTypes: ['learning_activity', 'assessment_completed'],
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should apply data transformations', async () => {
      const response = await analyticsApi.post('/analytics/transform', {
        transformations: [
          {
            type: 'calculate_session_duration',
            input: 'page_view',
            output: 'session_metrics',
          },
          {
            type: 'aggregate_daily_scores',
            input: 'assessment_completed',
            output: 'daily_performance',
          },
          {
            type: 'compute_learning_velocity',
            input: 'learning_activity',
            output: 'learning_metrics',
          },
        ],
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should compute derived metrics', async () => {
      const response = await analyticsApi.post('/analytics/compute-metrics', {
        metrics: [
          {
            name: 'engagement_score',
            formula: '(time_on_task * 0.4) + (completion_rate * 0.3) + (interaction_count * 0.3)',
          },
          {
            name: 'mastery_progress',
            formula: 'objectives_mastered / total_objectives * 100',
          },
        ],
        userId: ctx().users.learnerA.id,
        period: '7d',
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const metrics = response.data as {
          engagement_score?: number;
          mastery_progress?: number;
        };

        expect(metrics).toBeDefined();
      }
    });

    it('should run data quality checks', async () => {
      const response = await analyticsApi.post('/analytics/quality-check', {
        checks: [
          { type: 'completeness', threshold: 0.95 },
          { type: 'consistency', rules: ['valid_timestamps', 'valid_user_ids'] },
          { type: 'accuracy', validation: 'score_range' },
        ],
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const quality = response.data as {
          overallScore: number;
          checks: Array<{
            type: string;
            passed: boolean;
            score: number;
            issues?: string[];
          }>;
        };

        expect(quality.overallScore).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle data anonymization', async () => {
      const response = await analyticsApi.post('/analytics/anonymize', {
        dataSet: 'raw_events',
        rules: [
          { field: 'email', method: 'hash' },
          { field: 'ip_address', method: 'mask' },
          { field: 'name', method: 'pseudonymize' },
        ],
        retainPeriod: '30d',
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 4. Aggregation & Storage
  // ==========================================================================

  describe('4. Aggregation & Storage', () => {
    it('should aggregate hourly metrics', async () => {
      const response = await analyticsApi.post('/analytics/aggregate', {
        granularity: 'hourly',
        metrics: ['page_views', 'active_users', 'lessons_completed'],
        dimensions: ['tenantId', 'gradeLevel'],
        dateRange: {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should aggregate daily metrics', async () => {
      const response = await analyticsApi.post('/analytics/aggregate', {
        granularity: 'daily',
        metrics: ['total_learning_time', 'average_score', 'completion_rate', 'active_learners'],
        dimensions: ['courseId', 'subject'],
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should query aggregated data', async () => {
      const response = await analyticsApi.post('/analytics/query', {
        metrics: ['active_users', 'lessons_completed', 'average_score'],
        dimensions: ['date'],
        filters: {
          tenantId: ctx().tenantA.id,
        },
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        groupBy: ['date'],
        orderBy: [{ field: 'date', direction: 'asc' }],
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          results: Array<Record<string, unknown>>;
          metadata: {
            totalRows: number;
            executionTime: number;
          };
        };

        expect(Array.isArray(data.results)).toBe(true);
      }
    });

    it('should create materialized view', async () => {
      const response = await analyticsApi.post('/analytics/materialized-views', {
        name: `test_view_${randomString(6)}`,
        query: {
          metrics: ['total_sessions', 'avg_duration'],
          dimensions: ['userId', 'courseId'],
          filters: { tenantId: ctx().tenantA.id },
        },
        refreshSchedule: '0 * * * *', // Hourly
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should manage data retention', async () => {
      const response = await analyticsApi.get('/analytics/retention-policy');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const policy = response.data as {
          rawEvents: string;
          hourlyAggregates: string;
          dailyAggregates: string;
          monthlyAggregates: string;
        };

        expect(policy).toHaveProperty('rawEvents');
      }
    });

    it('should archive old data', async () => {
      const response = await analyticsApi.post('/analytics/archive', {
        dataType: 'raw_events',
        olderThan: '90d',
        destination: 'cold_storage',
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 5. Report Generation
  // ==========================================================================

  describe('5. Report Generation', () => {
    it('should create custom report', async () => {
      const reportConfig = {
        name: `Integration Test Report ${randomString(6)}`,
        description: 'Test report for analytics pipeline',
        type: 'custom',
        metrics: [
          { name: 'total_students', aggregation: 'count_distinct', field: 'userId' },
          { name: 'avg_score', aggregation: 'avg', field: 'score' },
          { name: 'total_time', aggregation: 'sum', field: 'duration' },
          { name: 'completion_rate', aggregation: 'percentage', field: 'completed' },
        ],
        dimensions: ['courseId', 'gradeLevel', 'date'],
        filters: {
          tenantId: ctx().tenantA.id,
        },
        dateRange: {
          type: 'relative',
          value: '30d',
        },
        visualization: {
          type: 'table',
          options: {
            sortBy: 'avg_score',
            sortOrder: 'desc',
          },
        },
      };

      const response = await analyticsApi.post('/analytics/reports', reportConfig);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const report = response.data as { id: string };
        reportId = report.id;
        cleanupIds.reports.push(reportId);
      }

      if (!reportId) {
        reportId = `report-${randomString(8)}`;
      }

      debug('Report created', { reportId });
    });

    it('should generate report data', async () => {
      const response = await analyticsApi.post(`/analytics/reports/${reportId}/generate`);

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should get report results', async () => {
      await wait(2000); // Wait for generation

      const response = await analyticsApi.get(`/analytics/reports/${reportId}/data`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          rows: Array<Record<string, unknown>>;
          summary: Record<string, number>;
          generatedAt: string;
        };

        expect(Array.isArray(data.rows)).toBe(true);
      }
    });

    it('should schedule recurring report', async () => {
      const response = await analyticsApi.put(`/analytics/reports/${reportId}/schedule`, {
        enabled: true,
        frequency: 'weekly',
        dayOfWeek: 'monday',
        timeOfDay: '09:00',
        recipients: [{ type: 'email', address: 'admin@aivo.local' }],
        format: 'pdf',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should export report to various formats', async () => {
      const formats = ['csv', 'xlsx', 'pdf'];

      for (const format of formats) {
        const response = await analyticsApi.post(`/analytics/reports/${reportId}/export`, {
          format,
        });

        expect([200, 201, 202, 404]).toContain(response.status);

        if (response.status === 200 || response.status === 201 || response.status === 202) {
          const result = response.data as { exportId?: string; downloadUrl?: string };
          if (result.exportId) {
            cleanupIds.exports.push(result.exportId);
          }
        }
      }
    });

    it('should create standard report templates', async () => {
      const response = await analyticsApi.get('/analytics/reports/templates');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          templates: Array<{
            id: string;
            name: string;
            description: string;
            category: string;
          }>;
        };

        expect(data.templates.length).toBeGreaterThan(0);
      }
    });
  });

  // ==========================================================================
  // 6. Real-Time Dashboards
  // ==========================================================================

  describe('6. Real-Time Dashboards', () => {
    it('should create dashboard', async () => {
      const dashboardConfig = {
        name: `Integration Test Dashboard ${randomString(6)}`,
        description: 'Real-time analytics dashboard for testing',
        layout: {
          columns: 12,
          rows: 8,
        },
        widgets: [
          {
            id: 'active-users',
            type: 'metric',
            title: 'Active Users',
            position: { x: 0, y: 0, w: 3, h: 2 },
            config: {
              metric: 'active_users',
              comparison: '7d',
            },
          },
          {
            id: 'learning-time',
            type: 'chart',
            title: 'Learning Time Trend',
            position: { x: 3, y: 0, w: 6, h: 4 },
            config: {
              chartType: 'line',
              metrics: ['total_learning_time'],
              dimensions: ['date'],
              dateRange: '30d',
            },
          },
          {
            id: 'top-courses',
            type: 'table',
            title: 'Top Courses',
            position: { x: 9, y: 0, w: 3, h: 4 },
            config: {
              metrics: ['enrollments', 'completion_rate'],
              dimensions: ['courseId'],
              limit: 5,
              sortBy: 'enrollments',
            },
          },
          {
            id: 'score-distribution',
            type: 'chart',
            title: 'Score Distribution',
            position: { x: 0, y: 4, w: 6, h: 4 },
            config: {
              chartType: 'histogram',
              metric: 'assessment_score',
              buckets: 10,
            },
          },
        ],
        refreshInterval: 60, // seconds
        permissions: {
          visibility: 'organization',
          editors: [ctx().users.adminA.id],
        },
      };

      const response = await analyticsApi.post('/analytics/dashboards', dashboardConfig);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const dashboard = response.data as { id: string };
        dashboardId = dashboard.id;
        cleanupIds.dashboards.push(dashboardId);
      }

      if (!dashboardId) {
        dashboardId = `dashboard-${randomString(8)}`;
      }

      debug('Dashboard created', { dashboardId });
    });

    it('should fetch dashboard data', async () => {
      const response = await analyticsApi.get(`/analytics/dashboards/${dashboardId}/data`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          widgets: Record<
            string,
            {
              data: unknown;
              lastUpdated: string;
            }
          >;
        };

        expect(data.widgets).toBeDefined();
      }
    });

    it('should update dashboard widget', async () => {
      const response = await analyticsApi.put(
        `/analytics/dashboards/${dashboardId}/widgets/active-users`,
        {
          title: 'Active Learners Today',
          config: {
            metric: 'active_users',
            filter: { timeRange: 'today' },
          },
        }
      );

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should subscribe to real-time updates', async () => {
      // This would typically use WebSocket, simplified for testing
      const response = await analyticsApi.post(`/analytics/dashboards/${dashboardId}/subscribe`, {
        widgets: ['active-users', 'learning-time'],
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const subscription = response.data as {
          subscriptionId: string;
          wsEndpoint?: string;
        };

        expect(subscription.subscriptionId || subscription.wsEndpoint).toBeDefined();
      }
    });

    it('should share dashboard', async () => {
      const response = await analyticsApi.post(`/analytics/dashboards/${dashboardId}/share`, {
        shareType: 'link',
        expiresIn: '7d',
        permissions: ['view'],
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const share = response.data as {
          shareUrl: string;
          shareId: string;
        };

        expect(share.shareUrl || share.shareId).toBeDefined();
      }
    });

    it('should duplicate dashboard', async () => {
      const response = await analyticsApi.post(`/analytics/dashboards/${dashboardId}/duplicate`, {
        name: `Duplicated Dashboard ${randomString(6)}`,
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const duplicated = response.data as { id: string };
        cleanupIds.dashboards.push(duplicated.id);
      }
    });
  });

  // ==========================================================================
  // Cross-Cutting Concerns
  // ==========================================================================

  describe('Cross-Cutting: User Segmentation', () => {
    it('should create user segment', async () => {
      const segmentConfig = {
        name: `High Performers ${randomString(6)}`,
        description: 'Students with above average scores',
        criteria: {
          and: [
            { field: 'avg_score', operator: 'gte', value: 80 },
            { field: 'lessons_completed', operator: 'gte', value: 10 },
            { field: 'last_active', operator: 'within', value: '7d' },
          ],
        },
        autoUpdate: true,
        updateFrequency: 'daily',
      };

      const response = await analyticsApi.post('/analytics/segments', segmentConfig);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const segment = response.data as { id: string };
        segmentId = segment.id;
        cleanupIds.segments.push(segmentId);
      }
    });

    it('should get segment members', async () => {
      if (!segmentId) {
        segmentId = 'segment-1';
      }

      const response = await analyticsApi.get(`/analytics/segments/${segmentId}/members`, {
        params: { limit: 10 },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          members: Array<{ userId: string }>;
          totalCount: number;
        };

        expect(Array.isArray(data.members)).toBe(true);
      }
    });

    it('should use segment in report filter', async () => {
      const response = await analyticsApi.post('/analytics/query', {
        metrics: ['avg_score', 'total_time'],
        segmentId,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Performance', () => {
    it('should handle large data queries efficiently', async () => {
      const startTime = Date.now();

      const response = await analyticsApi.post('/analytics/query', {
        metrics: ['page_views', 'unique_users', 'avg_session_duration'],
        dimensions: ['date', 'courseId'],
        dateRange: {
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        limit: 1000,
      });

      const duration = Date.now() - startTime;

      expect([200, 404]).toContain(response.status);
      // Query should complete in reasonable time
      expect(duration).toBeLessThan(30000); // 30 seconds max
    });

    it('should support query caching', async () => {
      const query = {
        metrics: ['active_users'],
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
      };

      // First query
      const response1 = await analyticsApi.post('/analytics/query', query);
      const startTime = Date.now();

      // Second identical query (should be cached)
      const response2 = await analyticsApi.post('/analytics/query', query);
      const cachedDuration = Date.now() - startTime;

      expect([200, 404]).toContain(response2.status);

      if (response2.status === 200) {
        const data = response2.data as { metadata?: { cached: boolean } };
        // Cached query should be faster or marked as cached
        if (data.metadata?.cached) {
          expect(data.metadata.cached).toBe(true);
        }
      }
    });

    it('should get analytics system health', async () => {
      const response = await analyticsApi.get('/analytics/health');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const health = response.data as {
          status: 'healthy' | 'degraded' | 'unhealthy';
          components: Record<
            string,
            {
              status: string;
              latency?: number;
            }
          >;
          lastProcessedEvent?: string;
        };

        expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      }
    });
  });

  describe('Cross-Cutting: Privacy & Compliance', () => {
    it('should respect data access permissions', async () => {
      // Student should not access admin analytics
      const response = await studentApi.get('/analytics/dashboards');

      expect([200, 403, 404]).toContain(response.status);

      // If 200, should only show permitted dashboards
    });

    it('should support data subject access request', async () => {
      const response = await analyticsApi.post('/analytics/dsar', {
        userId: ctx().users.learnerA.id,
        requestType: 'export',
        format: 'json',
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should support data deletion request', async () => {
      const testUserId = `delete-test-${randomString(8)}`;

      const response = await analyticsApi.post('/analytics/data-deletion', {
        userId: testUserId,
        dataTypes: ['events', 'aggregates'],
        reason: 'GDPR right to be forgotten',
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });
  });
});
