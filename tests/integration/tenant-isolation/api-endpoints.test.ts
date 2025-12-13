/**
 * Tenant Isolation - API Endpoint Tests
 *
 * Tests all API endpoints to verify that users from one tenant
 * cannot access data belonging to another tenant.
 *
 * @module tests/integration/tenant-isolation/api-endpoints.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  TenantIsolationTestContext,
  setupTenantIsolationTests,
  teardownTenantIsolationTests,
  apiRequest,
  assertNoDataLeak,
  TestDatabaseClient,
} from './setup';
import { createMockDatabaseClient } from './mock-db';

describe('Tenant Isolation - API Endpoints', () => {
  let ctx: TenantIsolationTestContext;

  beforeAll(async () => {
    const db = createMockDatabaseClient();
    const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4000';
    ctx = await setupTenantIsolationTests(db, serverUrl);
  });

  afterAll(async () => {
    if (ctx) {
      await teardownTenantIsolationTests(ctx);
    }
  });

  // ==========================================================================
  // Learner Endpoints
  // ==========================================================================

  describe('Learner Endpoints', () => {
    it('User A cannot list learners from Tenant B', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userA.jwt
      );

      // Should only return Tenant A learners
      expect(response.status).toBe(200);
      expect(response.data.learners).toBeDefined();
      expect(response.data.learners.length).toBeGreaterThanOrEqual(0);

      if (response.data.learners.length > 0) {
        assertNoDataLeak(response.data.learners, ctx.tenantA.id, ctx.tenantB.id);
      }

      // Explicitly check Tenant B learners are NOT present
      const containsTenantBLearner = response.data.learners.some(
        (l) => l.id === ctx.learnerB1.id || l.id === ctx.learnerB2.id
      );
      expect(containsTenantBLearner).toBe(false);
    });

    it('User A cannot access Tenant B learner by ID', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners/${ctx.learnerB1.id}`,
        ctx.userA.jwt
      );

      // Should return 404 (not found) or 403 (forbidden)
      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot update Tenant B learner', async () => {
      const originalLearner = await ctx.db.findLearnerById(ctx.learnerB1.id);
      expect(originalLearner).not.toBeNull();

      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/learners/${ctx.learnerB1.id}`,
        ctx.userA.jwt,
        { firstName: 'Hacked Name' }
      );

      // Should be rejected
      expect([403, 404]).toContain(response.status);

      // Verify data was NOT modified
      const learnerAfter = await ctx.db.findLearnerById(ctx.learnerB1.id);
      expect(learnerAfter?.firstName).toBe(originalLearner?.firstName);
      expect(learnerAfter?.firstName).not.toBe('Hacked Name');
    });

    it('User A cannot delete Tenant B learner', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'DELETE',
        `/api/learners/${ctx.learnerB1.id}`,
        ctx.userA.jwt
      );

      // Should be rejected
      expect([403, 404]).toContain(response.status);

      // Verify learner still exists
      const learner = await ctx.db.findLearnerById(ctx.learnerB1.id);
      expect(learner).not.toBeNull();
    });

    it('User B cannot list learners from Tenant A', async () => {
      const response = await apiRequest<{ learners: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/learners',
        ctx.userB.jwt
      );

      expect(response.status).toBe(200);

      if (response.data.learners && response.data.learners.length > 0) {
        assertNoDataLeak(response.data.learners, ctx.tenantB.id, ctx.tenantA.id);
      }

      // Explicitly check Tenant A learners are NOT present
      const containsTenantALearner = response.data.learners?.some(
        (l) => l.id === ctx.learnerA1.id || l.id === ctx.learnerA2.id
      );
      expect(containsTenantALearner).toBe(false);
    });
  });

  // ==========================================================================
  // Session Endpoints
  // ==========================================================================

  describe('Session Endpoints', () => {
    it('User A cannot list sessions from Tenant B', async () => {
      const response = await apiRequest<{ sessions: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/sessions',
        ctx.userA.jwt
      );

      expect(response.status).toBe(200);

      if (response.data.sessions && response.data.sessions.length > 0) {
        assertNoDataLeak(response.data.sessions, ctx.tenantA.id, ctx.tenantB.id);
      }

      // Tenant B session should NOT be present
      const containsTenantBSession = response.data.sessions?.some(
        (s) => s.id === ctx.testData.sessionB.id
      );
      expect(containsTenantBSession).toBe(false);
    });

    it('User A cannot access Tenant B session by ID', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/sessions/${ctx.testData.sessionB.id}`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot add events to Tenant B session', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/sessions/${ctx.testData.sessionB.id}/events`,
        ctx.userA.jwt,
        {
          eventType: 'ACTIVITY_COMPLETED',
          payload: { activityId: 'test-activity' },
        }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot end Tenant B session', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/sessions/${ctx.testData.sessionB.id}/end`,
        ctx.userA.jwt,
        { reason: 'USER_EXIT' }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Brain/Assessment Endpoints
  // ==========================================================================

  describe('Brain/Assessment Endpoints', () => {
    it('User A cannot access Tenant B brain profile', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners/${ctx.learnerB1.id}/brain`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot access Tenant B virtual brain by ID', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/virtual-brains/${ctx.testData.virtualBrainB.id}`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot start assessment for Tenant B learner', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/learners/${ctx.learnerB1.id}/assessments`,
        ctx.userA.jwt,
        { type: 'BASELINE', subject: 'MATH' }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot view Tenant B assessment results', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/learners/${ctx.learnerB1.id}/assessments`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot clone Tenant B brain', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/virtual-brains/${ctx.testData.virtualBrainB.id}/clone`,
        ctx.userA.jwt,
        { targetLearnerId: ctx.learnerA1.id }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Recommendation Endpoints
  // ==========================================================================

  describe('Recommendation Endpoints', () => {
    it('User A cannot list Tenant B recommendations', async () => {
      const response = await apiRequest<{
        recommendations: Array<{ id: string; tenantId: string }>;
      }>(ctx.serverUrl, 'GET', '/api/recommendations', ctx.userA.jwt);

      expect(response.status).toBe(200);

      if (response.data.recommendations && response.data.recommendations.length > 0) {
        assertNoDataLeak(response.data.recommendations, ctx.tenantA.id, ctx.tenantB.id);
      }

      const containsTenantBRec = response.data.recommendations?.some(
        (r) => r.id === ctx.testData.recommendationB.id
      );
      expect(containsTenantBRec).toBe(false);
    });

    it('User A cannot view Tenant B recommendation by ID', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/recommendations/${ctx.testData.recommendationB.id}`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot accept Tenant B recommendation', async () => {
      const originalRec = await ctx.db.findRecommendationById(ctx.testData.recommendationB.id);

      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/recommendations/${ctx.testData.recommendationB.id}/accept`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);

      // Verify recommendation was NOT modified
      const recAfter = await ctx.db.findRecommendationById(ctx.testData.recommendationB.id);
      expect(recAfter?.status).toBe(originalRec?.status);
    });

    it('User A cannot decline Tenant B recommendation', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/recommendations/${ctx.testData.recommendationB.id}/decline`,
        ctx.userA.jwt,
        { reason: 'Not appropriate' }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Messaging Endpoints
  // ==========================================================================

  describe('Messaging Endpoints', () => {
    it('User A cannot list Tenant B message threads', async () => {
      const response = await apiRequest<{ threads: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/messages/threads',
        ctx.userA.jwt
      );

      expect(response.status).toBe(200);

      if (response.data.threads && response.data.threads.length > 0) {
        assertNoDataLeak(response.data.threads, ctx.tenantA.id, ctx.tenantB.id);
      }

      const containsTenantBThread = response.data.threads?.some(
        (t) => t.id === ctx.testData.messageThreadB.id
      );
      expect(containsTenantBThread).toBe(false);
    });

    it('User A cannot read Tenant B messages', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/messages/threads/${ctx.testData.messageThreadB.id}`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot send message to Tenant B thread', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/messages/threads/${ctx.testData.messageThreadB.id}/messages`,
        ctx.userA.jwt,
        { content: 'Unauthorized message' }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot add participants to Tenant B thread', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/messages/threads/${ctx.testData.messageThreadB.id}/participants`,
        ctx.userA.jwt,
        { userId: ctx.userA.id }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Admin Endpoints
  // ==========================================================================

  describe('Admin Endpoints', () => {
    it('Admin A cannot list Tenant B users', async () => {
      const response = await apiRequest<{ users: Array<{ id: string; tenantId: string }> }>(
        ctx.serverUrl,
        'GET',
        '/api/admin/users',
        ctx.adminA.jwt
      );

      expect(response.status).toBe(200);

      if (response.data.users && response.data.users.length > 0) {
        assertNoDataLeak(response.data.users, ctx.tenantA.id, ctx.tenantB.id);
      }

      // Should NOT contain Tenant B users
      const containsTenantBUser = response.data.users?.some(
        (u) => u.id === ctx.userB.id || u.id === ctx.adminB.id
      );
      expect(containsTenantBUser).toBe(false);
    });

    it('Admin A cannot view Tenant B user details', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/admin/users/${ctx.userB.id}`,
        ctx.adminA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('Admin A cannot modify Tenant B user', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/admin/users/${ctx.userB.id}`,
        ctx.adminA.jwt,
        { role: 'ADMIN' }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('Admin A cannot delete Tenant B user', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'DELETE',
        `/api/admin/users/${ctx.userB.id}`,
        ctx.adminA.jwt
      );

      expect([403, 404]).toContain(response.status);

      // Verify user still exists
      const user = await ctx.db.findUserById(ctx.userB.id);
      expect(user).not.toBeNull();
    });

    it('Admin A cannot modify Tenant B settings', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'PATCH',
        `/api/admin/tenants/${ctx.tenantB.id}/settings`,
        ctx.adminA.jwt,
        { name: 'Hacked Tenant Name' }
      );

      expect([403, 404]).toContain(response.status);
    });

    it('Admin A cannot access Tenant B analytics', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/admin/analytics?tenantId=${ctx.tenantB.id}`,
        ctx.adminA.jwt
      );

      // Should either reject or return only Tenant A data
      if (response.status === 200) {
        const data = response.data as { tenantId?: string };
        expect(data.tenantId).not.toBe(ctx.tenantB.id);
      } else {
        expect([403, 404]).toContain(response.status);
      }
    });

    it('Admin A cannot invite users to Tenant B', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        `/api/admin/tenants/${ctx.tenantB.id}/invitations`,
        ctx.adminA.jwt,
        { email: 'hacker@example.com', role: 'TEACHER' }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Teacher Endpoints
  // ==========================================================================

  describe('Teacher Endpoints', () => {
    it('Teacher A cannot view Tenant B class rosters', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        '/api/teacher/classes',
        ctx.teacherA.jwt
      );

      expect(response.status).toBe(200);

      const data = response.data as { classes?: Array<{ tenantId: string }> };
      if (data.classes && data.classes.length > 0) {
        assertNoDataLeak(data.classes, ctx.tenantA.id, ctx.tenantB.id);
      }
    });

    it('Teacher A cannot access Tenant B student progress', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/teacher/students/${ctx.learnerB1.id}/progress`,
        ctx.teacherA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('Teacher A cannot assign content to Tenant B students', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        '/api/teacher/assignments',
        ctx.teacherA.jwt,
        {
          learnerId: ctx.learnerB1.id,
          contentId: 'some-content',
        }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Content Endpoints
  // ==========================================================================

  describe('Content Endpoints (Tenant-Scoped)', () => {
    it('User A cannot access Tenant B custom content', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/content?tenantId=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      // Should either return 403/404 or filter to only Tenant A content
      if (response.status === 200) {
        const data = response.data as { content?: Array<{ tenantId: string }> };
        if (data.content && data.content.length > 0) {
          assertNoDataLeak(data.content, ctx.tenantA.id, ctx.tenantB.id);
        }
      } else {
        expect([403, 404]).toContain(response.status);
      }
    });
  });

  // ==========================================================================
  // Homework Helper Endpoints
  // ==========================================================================

  describe('Homework Helper Endpoints', () => {
    it('User A cannot view Tenant B homework tasks', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/homework/learners/${ctx.learnerB1.id}/tasks`,
        ctx.userA.jwt
      );

      expect([403, 404]).toContain(response.status);
    });

    it('User A cannot create homework task for Tenant B learner', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'POST',
        '/api/homework/tasks',
        ctx.userA.jwt,
        {
          learnerId: ctx.learnerB1.id,
          subject: 'MATH',
          description: 'Unauthorized homework',
        }
      );

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Events/Analytics Endpoints
  // ==========================================================================

  describe('Events/Analytics Endpoints', () => {
    it('User A cannot query Tenant B events', async () => {
      const response = await apiRequest(
        ctx.serverUrl,
        'GET',
        `/api/events?tenantId=${ctx.tenantB.id}`,
        ctx.userA.jwt
      );

      // Should either reject or return only Tenant A events
      if (response.status === 200) {
        const data = response.data as { events?: Array<{ tenantId: string }> };
        if (data.events && data.events.length > 0) {
          assertNoDataLeak(data.events, ctx.tenantA.id, ctx.tenantB.id);
        }
      } else {
        expect([403, 404]).toContain(response.status);
      }
    });

    it('User A cannot publish events with Tenant B tenantId', async () => {
      const response = await apiRequest(ctx.serverUrl, 'POST', '/api/events', ctx.userA.jwt, {
        eventType: 'learning.activity.completed',
        tenantId: ctx.tenantB.id, // Attempt to inject
        payload: {
          learnerId: ctx.learnerB1.id,
          activityId: 'test-activity',
        },
      });

      // Should either reject or override with Tenant A's ID
      if (response.status === 201) {
        const data = response.data as { event?: { tenantId: string } };
        expect(data.event?.tenantId).toBe(ctx.tenantA.id);
      } else {
        expect([400, 403]).toContain(response.status);
      }
    });
  });
});
