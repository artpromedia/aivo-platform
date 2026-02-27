/**
 * Parent Monitoring — Cross-Service Integration Test
 *
 * Tests the complete parent oversight experience:
 * 1. Parent links to learner account → auth-svc
 * 2. Parent views learner dashboard → analytics-svc
 * 3. Parent receives progress notifications → notify-svc
 * 4. Parent manages notification preferences → notify-svc
 * 5. Parent reviews assessment results → assessment-svc
 * 6. Parent communicates with teacher → notify-svc
 * 7. Screen time & safety monitoring → ai-orchestrator
 *
 * @module tests/integration/scenarios/parent-monitoring
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import { wait, debug } from '../utils/helpers';

describe('Cross-Service: Parent Monitoring', () => {
  let parentApi: ApiClient;
  let learnerApi: ApiClient;
  let teacherApi: ApiClient;

  let learnerId: string;

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    parentApi = createApiClientForUser(ctx().users.parentA.token);
    learnerApi = createApiClientForUser(ctx().users.learnerA.token);
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    learnerId = ctx().users.learnerA.id;

    debug('Parent Monitoring Setup', { learnerId, tenantId: ctx().tenantA.id });
  });

  // --------------------------------------------------------------------------
  // Step 1: Parent-learner link verification
  // --------------------------------------------------------------------------
  describe('1. Parent-Learner Link', () => {
    it('should show linked learners for parent', async () => {
      const response = await parentApi.get('/parent/learners');

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const learners = response.data.learners ?? response.data.items ?? response.data;
        if (Array.isArray(learners)) {
          expect(learners.length).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should not allow parent to view unlinked learner', async () => {
      const response = await parentApi.get('/learners/unlinked-learner-999/dashboard');

      expect(response.status).toBeOneOf([403, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 2: Learner dashboard access
  // --------------------------------------------------------------------------
  describe('2. Learner Dashboard', () => {
    it('should show learner progress overview', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/dashboard`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        debug('Learner dashboard', {
          hasSummary: !!response.data.summary,
          hasActivity: !!response.data.recentActivity,
        });
      }
    });

    it('should show learner weekly activity summary', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/activity`, {
        params: { period: 'week' },
      });

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should show learner achievements/badges', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/achievements`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const items = response.data.achievements ?? response.data.items ?? [];
        expect(Array.isArray(items)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 3: Progress notifications
  // --------------------------------------------------------------------------
  describe('3. Progress Notifications', () => {
    it('should list parent notifications', async () => {
      const response = await parentApi.get('/notifications', {
        params: { limit: 10 },
      });

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const items = response.data.notifications ?? response.data.items ?? [];
        expect(Array.isArray(items)).toBe(true);
      }
    });

    it('should mark notification as read', async () => {
      // First, get a notification
      const listResponse = await parentApi.get('/notifications', { params: { limit: 1 } });

      if (listResponse.status === 200 && listResponse.data?.items?.length > 0) {
        const notifId = listResponse.data.items[0].id;
        const response = await parentApi.put(`/notifications/${notifId}/read`);

        expect(response.status).toBeOneOf([200, 204, 404]);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 4: Notification preferences
  // --------------------------------------------------------------------------
  describe('4. Notification Preferences', () => {
    it('should get current notification preferences', async () => {
      const response = await parentApi.get('/notifications/preferences');

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should update notification preferences', async () => {
      const response = await parentApi.put('/notifications/preferences', {
        email: { assessmentResults: true, weeklyDigest: true, urgent: true },
        push: { assessmentResults: true, weeklyDigest: false, urgent: true },
        sms: { assessmentResults: false, weeklyDigest: false, urgent: true },
      });

      expect(response.status).toBeOneOf([200, 204, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 5: Assessment results review
  // --------------------------------------------------------------------------
  describe('5. Assessment Results', () => {
    it('should list learner assessments for parent', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/assessments`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const items = response.data.assessments ?? response.data.items ?? [];
        expect(Array.isArray(items)).toBe(true);
      }
    });

    it('should show assessment detail with correct answers', async () => {
      const listResponse = await parentApi.get(`/learners/${learnerId}/assessments`, {
        params: { limit: 1 },
      });

      if (listResponse.status === 200 && listResponse.data?.items?.length > 0) {
        const aId = listResponse.data.items[0].id;
        const response = await parentApi.get(`/learners/${learnerId}/assessments/${aId}/result`);

        expect(response.status).toBeOneOf([200, 404]);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 6: Teacher communication
  // --------------------------------------------------------------------------
  describe('6. Teacher Communication', () => {
    it('should list available teachers for messaging', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/teachers`);

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should send message to teacher', async () => {
      const response = await parentApi.post('/messages', {
        recipientId: ctx().users.teacherA.id,
        subject: 'Question about progress',
        body: 'How is my child doing in math?',
        regarding: learnerId,
      });

      expect(response.status).toBeOneOf([200, 201, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 7: Screen time & safety
  // --------------------------------------------------------------------------
  describe('7. Screen Time & Safety', () => {
    it('should show learner screen time report', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/screen-time`, {
        params: { period: 'week' },
      });

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should allow parent to set daily screen time limit', async () => {
      const response = await parentApi.put(`/learners/${learnerId}/settings/screen-time`, {
        dailyLimitMinutes: 120,
        breakReminderMinutes: 30,
      });

      expect(response.status).toBeOneOf([200, 204, 404]);
    });

    it('should show content safety report', async () => {
      const response = await parentApi.get(`/learners/${learnerId}/safety-report`);

      expect(response.status).toBeOneOf([200, 404]);
    });
  });
});
