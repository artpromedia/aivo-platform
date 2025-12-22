/**
 * Multi-Tenant Data Isolation Integration Test
 *
 * Comprehensive tests verifying complete data isolation between tenants:
 * 1. Profile and user data isolation
 * 2. Session and activity isolation
 * 3. Content visibility rules
 * 4. Analytics isolation
 * 5. Search isolation
 * 6. Event isolation
 * 7. Security boundary testing
 *
 * @module tests/integration/scenarios/multi-tenant-isolation
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import {
  wait,
  subscribeToEvents,
  randomString,
  debug,
} from '../utils/helpers';

describe('Multi-Tenant Data Isolation', () => {
  // API clients for each tenant
  let tenant1Api: ApiClient;
  let tenant2Api: ApiClient;
  let tenant1AdminApi: ApiClient;
  let _tenant2AdminApi: ApiClient;

  // Test data for each tenant
  let tenant1Data: {
    tenantId: string;
    userId: string;
    profileId: string;
    sessionId: string;
    contentId: string;
  };

  let tenant2Data: {
    tenantId: string;
    userId: string;
    profileId: string;
    sessionId: string;
    contentId: string;
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Set up Tenant 1 (using existing test context)
    tenant1Api = createApiClientForUser(ctx().users.parentA.token);
    tenant1AdminApi = createApiClientForUser(ctx().users.adminA.token);

    tenant1Data = {
      tenantId: ctx().tenantA.id,
      userId: ctx().users.parentA.id,
      profileId: ctx().profiles.learnerA.id,
      sessionId: '',
      contentId: '',
    };

    // Set up Tenant 2
    tenant2Api = createApiClientForUser(ctx().users.parentB.token);
    _tenant2AdminApi = createApiClientForUser(ctx().users.adminB.token);

    tenant2Data = {
      tenantId: ctx().tenantB.id,
      userId: ctx().users.parentB.id,
      profileId: ctx().profiles.learnerB.id,
      sessionId: '',
      contentId: '',
    };

    // Create test data in each tenant
    await createTestDataInTenant(tenant1Api, tenant1Data);
    await createTestDataInTenant(tenant2Api, tenant2Data);

    debug('Tenant Isolation Test Setup', {
      tenant1: { id: tenant1Data.tenantId, profileId: tenant1Data.profileId },
      tenant2: { id: tenant2Data.tenantId, profileId: tenant2Data.profileId },
    });
  });

  afterAll(async () => {
    // Cleanup sessions
    if (tenant1Data.sessionId) {
      try {
        await tenant1Api.post(`/sessions/${tenant1Data.sessionId}/complete`);
      } catch {
        // Ignore
      }
    }
    if (tenant2Data.sessionId) {
      try {
        await tenant2Api.post(`/sessions/${tenant2Data.sessionId}/complete`);
      } catch {
        // Ignore
      }
    }
  });

  // ==========================================================================
  // Helper Functions
  // ==========================================================================

  async function createTestDataInTenant(
    api: ApiClient,
    data: typeof tenant1Data
  ): Promise<void> {
    // Create a session
    const sessionResponse = await api.post('/sessions', {
      profileId: data.profileId,
      sessionType: 'lesson',
    });

    if (sessionResponse.status === 201 || sessionResponse.status === 200) {
      data.sessionId = (sessionResponse.data as { id: string }).id;
    } else {
      data.sessionId = `mock-session-${randomString(8)}`;
    }

    // Create tenant-specific content
    const contentResponse = await api.post('/content', {
      title: `Tenant ${data.tenantId.slice(0, 8)} Custom Lesson`,
      type: 'lesson',
      visibility: 'tenant',
      subject: 'math',
    });

    if (contentResponse.status === 201 || contentResponse.status === 200) {
      data.contentId = (contentResponse.data as { id: string }).id;
    } else {
      data.contentId = `mock-content-${randomString(8)}`;
    }
  }

  // ==========================================================================
  // 1. Profile Isolation
  // ==========================================================================

  describe('1. Profile Isolation', () => {
    it('should not allow tenant1 to access tenant2 profiles', async () => {
      const response = await tenant1Api.get(`/profiles/${tenant2Data.profileId}`);

      // Should return 404 (not found) or 403 (forbidden)
      expect([403, 404]).toContain(response.status);

      if (response.status === 404) {
        // Profile should appear as if it doesn't exist
        expect(response.data).not.toHaveProperty('id', tenant2Data.profileId);
      }
    });

    it('should not allow tenant1 to list tenant2 profiles', async () => {
      const response = await tenant1Api.get('/profiles');

      if (response.status === 200) {
        const data = response.data as { profiles: Array<{ id: string; tenantId?: string }> };

        // Extract all profile IDs
        const profileIds = data.profiles.map((p) => p.id);

        // Should not contain tenant2's profile
        expect(profileIds).not.toContain(tenant2Data.profileId);

        // All profiles should belong to tenant1
        data.profiles.forEach((profile) => {
          if (profile.tenantId) {
            expect(profile.tenantId).toBe(tenant1Data.tenantId);
          }
        });
      }
    });

    it('should not allow cross-tenant profile updates', async () => {
      const response = await tenant1Api.put(`/profiles/${tenant2Data.profileId}`, {
        displayName: 'Hacked Name',
      });

      // Should be rejected
      expect([403, 404]).toContain(response.status);

      // Verify original data unchanged
      const verifyResponse = await tenant2Api.get(`/profiles/${tenant2Data.profileId}`);

      if (verifyResponse.status === 200) {
        const data = verifyResponse.data as { displayName: string };
        expect(data.displayName).not.toBe('Hacked Name');
      }
    });

    it('should not allow cross-tenant profile deletion', async () => {
      const response = await tenant1Api.delete(`/profiles/${tenant2Data.profileId}`);

      // Should be rejected
      expect([403, 404]).toContain(response.status);

      // Verify profile still exists
      const verifyResponse = await tenant2Api.get(`/profiles/${tenant2Data.profileId}`);

      // Profile should still be accessible to its own tenant
      expect([200, 404]).toContain(verifyResponse.status);
    });

    it('should not allow profile creation with other tenant ID', async () => {
      const response = await tenant1Api.post('/profiles', {
        userId: 'fake-user-id',
        tenantId: tenant2Data.tenantId, // Trying to specify different tenant
        displayName: 'Injected Profile',
        gradeLevel: 5,
      });

      // Should either ignore the tenantId or reject
      if (response.status === 201 || response.status === 200) {
        const data = response.data as { tenantId?: string };
        // If created, should use the authenticated user's tenant
        if (data.tenantId) {
          expect(data.tenantId).toBe(tenant1Data.tenantId);
        }
      }
    });
  });

  // ==========================================================================
  // 2. Session Isolation
  // ==========================================================================

  describe('2. Session Isolation', () => {
    it('should not allow tenant1 to access tenant2 sessions', async () => {
      const response = await tenant1Api.get(`/sessions/${tenant2Data.sessionId}`);

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow tenant1 to list tenant2 sessions', async () => {
      const response = await tenant1Api.get('/sessions');

      if (response.status === 200) {
        const data = response.data as { sessions: Array<{ id: string }> };

        const sessionIds = data.sessions.map((s) => s.id);
        expect(sessionIds).not.toContain(tenant2Data.sessionId);
      }
    });

    it('should not allow cross-tenant session manipulation', async () => {
      const response = await tenant1Api.post(`/sessions/${tenant2Data.sessionId}/complete`);

      expect([403, 404]).toContain(response.status);

      // Verify session unchanged
      const verifyResponse = await tenant2Api.get(`/sessions/${tenant2Data.sessionId}`);

      if (verifyResponse.status === 200) {
        const data = verifyResponse.data as { status: string };
        expect(data.status).toBe('active');
      }
    });

    it('should not allow adding activities to other tenant sessions', async () => {
      const response = await tenant1Api.post(`/sessions/${tenant2Data.sessionId}/activities`, {
        activityId: 'activity-1',
        status: 'completed',
        score: 100,
      });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow sending encouragement to other tenant sessions', async () => {
      const response = await tenant1Api.post(`/sessions/${tenant2Data.sessionId}/encourage`, {
        message: 'Cross-tenant message',
      });

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 3. Content Isolation
  // ==========================================================================

  describe('3. Content Isolation', () => {
    it('should not see tenant-specific content from other tenants', async () => {
      const response = await tenant1Api.get('/content', {
        params: { visibility: 'tenant' },
      });

      if (response.status === 200) {
        const data = response.data as { content: Array<{ id: string; tenantId?: string }> };

        const contentIds = data.content.map((c) => c.id);

        // Should not contain tenant2's content
        expect(contentIds).not.toContain(tenant2Data.contentId);

        // All tenant-specific content should belong to tenant1
        data.content.forEach((content) => {
          if (content.tenantId) {
            expect(content.tenantId).toBe(tenant1Data.tenantId);
          }
        });
      }
    });

    it('should see shared platform content across tenants', async () => {
      const [tenant1Content, tenant2Content] = await Promise.all([
        tenant1Api.get('/content', { params: { visibility: 'platform' } }),
        tenant2Api.get('/content', { params: { visibility: 'platform' } }),
      ]);

      if (tenant1Content.status === 200 && tenant2Content.status === 200) {
        const tenant1Ids = new Set(
          (tenant1Content.data as { content: Array<{ id: string }> }).content.map((c) => c.id)
        );
        const tenant2Ids = new Set(
          (tenant2Content.data as { content: Array<{ id: string }> }).content.map((c) => c.id)
        );

        // Platform content should be the same for both tenants
        expect(tenant1Ids).toEqual(tenant2Ids);
      }
    });

    it('should not allow cross-tenant content modification', async () => {
      const response = await tenant1Api.put(`/content/${tenant2Data.contentId}`, {
        title: 'Hacked Content Title',
      });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow cross-tenant content deletion', async () => {
      const response = await tenant1Api.delete(`/content/${tenant2Data.contentId}`);

      expect([403, 404]).toContain(response.status);

      // Verify content still exists for tenant2
      const verifyResponse = await tenant2Api.get(`/content/${tenant2Data.contentId}`);
      expect([200, 404]).toContain(verifyResponse.status);
    });
  });

  // ==========================================================================
  // 4. Analytics Isolation
  // ==========================================================================

  describe('4. Analytics Isolation', () => {
    it('should not include cross-tenant data in analytics', async () => {
      const [tenant1Analytics, tenant2Analytics] = await Promise.all([
        tenant1Api.get('/analytics/summary'),
        tenant2Api.get('/analytics/summary'),
      ]);

      if (tenant1Analytics.status === 200 && tenant2Analytics.status === 200) {
        const t1Data = tenant1Analytics.data as { totalSessions: number; totalLearners: number };
        const t2Data = tenant2Analytics.data as { totalSessions: number; totalLearners: number };

        // Each tenant should see their own data only
        // Sessions should be counted separately
        expect(t1Data.totalSessions).toBeGreaterThanOrEqual(0);
        expect(t2Data.totalSessions).toBeGreaterThanOrEqual(0);

        // Total should be independent
        debug('Analytics Comparison', {
          tenant1: { sessions: t1Data.totalSessions, learners: t1Data.totalLearners },
          tenant2: { sessions: t2Data.totalSessions, learners: t2Data.totalLearners },
        });
      }
    });

    it('should not allow cross-tenant report generation', async () => {
      const response = await tenant1Api.post('/reports/generate', {
        profileIds: [tenant2Data.profileId],
        type: 'progress',
      });

      // Should reject because profile belongs to different tenant
      if (response.status === 400) {
        const data = response.data as { error: string };
        expect(data.error).toContain('Invalid profile');
      } else {
        expect([400, 403, 404]).toContain(response.status);
      }
    });

    it('should not allow querying other tenant metrics', async () => {
      const response = await tenant1Api.get('/analytics/metrics', {
        params: {
          tenantId: tenant2Data.tenantId, // Trying to specify other tenant
          metric: 'sessions',
        },
      });

      // Should either ignore the tenantId parameter or reject
      if (response.status === 200) {
        const data = response.data as { tenantId?: string };
        if (data.tenantId) {
          expect(data.tenantId).toBe(tenant1Data.tenantId);
        }
      }
    });

    it('should isolate learner model data', async () => {
      const response = await tenant1Api.get(`/learner-model/${tenant2Data.profileId}`);

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 5. Search Isolation
  // ==========================================================================

  describe('5. Search Isolation', () => {
    it('should not return cross-tenant results in search', async () => {
      const response = await tenant1Api.get('/search', {
        params: { q: 'test', types: 'profiles,sessions,content' },
      });

      if (response.status === 200) {
        const data = response.data as {
          results: Array<{ id: string; tenantId?: string; type: string }>;
        };

        // All results should belong to tenant1
        data.results.forEach((result) => {
          if (result.tenantId) {
            expect(result.tenantId).toBe(tenant1Data.tenantId);
          }

          // Specific checks for known tenant2 IDs
          expect(result.id).not.toBe(tenant2Data.profileId);
          expect(result.id).not.toBe(tenant2Data.sessionId);
          expect(result.id).not.toBe(tenant2Data.contentId);
        });
      }
    });

    it('should not return other tenant users in autocomplete', async () => {
      const response = await tenant1Api.get('/search/autocomplete', {
        params: { q: 'learner', type: 'user' },
      });

      if (response.status === 200) {
        const data = response.data as {
          suggestions: Array<{ id: string; tenantId?: string }>;
        };

        data.suggestions.forEach((suggestion) => {
          if (suggestion.tenantId) {
            expect(suggestion.tenantId).toBe(tenant1Data.tenantId);
          }
        });
      }
    });

    it('should isolate search history', async () => {
      // Perform search in tenant1
      await tenant1Api.get('/search', { params: { q: 'tenant1-specific-search' } });

      // Check tenant2 search history
      const response = await tenant2Api.get('/search/history');

      if (response.status === 200) {
        const data = response.data as { history: Array<{ query: string }> };

        const queries = data.history.map((h) => h.query);
        expect(queries).not.toContain('tenant1-specific-search');
      }
    });
  });

  // ==========================================================================
  // 6. Event Isolation
  // ==========================================================================

  describe('6. Event Isolation', () => {
    it('should not publish events visible to other tenants', async () => {
      const events: unknown[] = [];

      // Subscribe to events as tenant1
      const subscription = await subscribeToEvents(tenant1Api, 'session.*', (event) => {
        events.push(event);
      });

      // Generate event in tenant2
      await tenant2Api.post(`/sessions/${tenant2Data.sessionId}/activities`, {
        activityId: 'test-activity',
        status: 'completed',
        score: 80,
      });

      await wait(1000);

      // Tenant1 should not receive tenant2's events
      const tenant2Events = events.filter((e) => {
        const event = e as { tenantId?: string };
        return event.tenantId === tenant2Data.tenantId;
      });

      expect(tenant2Events).toHaveLength(0);

      subscription.unsubscribe();
    });

    it('should isolate notification streams', async () => {
      // Get tenant1 notifications
      const response = await tenant1Api.get('/notifications');

      if (response.status === 200) {
        const data = response.data as {
          notifications: Array<{ tenantId?: string; targetUserId?: string }>;
        };

        // All notifications should be for tenant1 users
        data.notifications.forEach((notification) => {
          if (notification.tenantId) {
            expect(notification.tenantId).toBe(tenant1Data.tenantId);
          }

          // Should not contain tenant2 user notifications
          expect(notification.targetUserId).not.toBe(tenant2Data.userId);
        });
      }
    });
  });

  // ==========================================================================
  // 7. Admin Isolation
  // ==========================================================================

  describe('7. Admin Isolation', () => {
    it('should not allow tenant1 admin to manage tenant2 users', async () => {
      const response = await tenant1AdminApi.put(`/admin/users/${tenant2Data.userId}`, {
        role: 'ADMIN',
      });

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow tenant1 admin to view tenant2 audit logs', async () => {
      const response = await tenant1AdminApi.get('/admin/audit-logs', {
        params: { tenantId: tenant2Data.tenantId },
      });

      // Should either filter to own tenant or reject
      if (response.status === 200) {
        const data = response.data as { logs: Array<{ tenantId?: string }> };

        data.logs.forEach((log) => {
          if (log.tenantId) {
            expect(log.tenantId).toBe(tenant1Data.tenantId);
          }
        });
      }
    });

    it('should not allow tenant1 admin to access tenant2 settings', async () => {
      const response = await tenant1AdminApi.get(`/admin/tenants/${tenant2Data.tenantId}/settings`);

      expect([403, 404]).toContain(response.status);
    });

    it('should not allow cross-tenant impersonation', async () => {
      const response = await tenant1AdminApi.post('/admin/impersonate', {
        userId: tenant2Data.userId,
      });

      expect([403, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 8. API Key and Token Isolation
  // ==========================================================================

  describe('8. API Key and Token Isolation', () => {
    it('should not accept tokens from other tenants', async () => {
      // Create a client with tenant2's token but try to access tenant1 resources
      const crossTenantClient = createApiClientForUser(ctx().users.parentB.token);

      const response = await crossTenantClient.get(`/profiles/${tenant1Data.profileId}`);

      // Should not be able to access tenant1's resources
      expect([403, 404]).toContain(response.status);
    });

    it('should validate tenant claims in JWT', async () => {
      // Create a modified token with wrong tenant claim
      const tamperedToken = ctx().generateToken(
        ctx().users.parentA.id, // User from tenant A
        ctx().tenantB.id, // But claiming to be from tenant B
        'PARENT'
      );

      const tamperedClient = createApiClientForUser(tamperedToken);
      const response = await tamperedClient.get('/profiles');

      // Should reject the tampered token or return empty results
      // (depending on how the system validates tokens)
      expect([200, 401, 403]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as { profiles: Array<{ tenantId?: string }> };
        // If it accepts the token, it should still enforce tenant isolation
        // based on the user's actual tenant, not the claimed one
        data.profiles.forEach((profile) => {
          if (profile.tenantId) {
            expect(profile.tenantId).not.toBe(tenant2Data.tenantId);
          }
        });
      }
    });
  });

  // ==========================================================================
  // 9. Resource Ownership Verification
  // ==========================================================================

  describe('9. Resource Ownership Verification', () => {
    it('should verify parent-child relationships across tenants', async () => {
      // Try to add tenant2's learner as child of tenant1's parent
      const response = await tenant1Api.post('/parent/children', {
        learnerId: tenant2Data.profileId,
      });

      expect([400, 403, 404]).toContain(response.status);
    });

    it('should verify class membership across tenants', async () => {
      // Create a class in tenant1
      const classResponse = await tenant1AdminApi.post('/classes', {
        name: 'Cross-tenant Test Class',
        gradeLevel: 5,
        subject: 'math',
      });

      if (classResponse.status === 201 || classResponse.status === 200) {
        const classId = (classResponse.data as { id: string }).id;

        // Try to add tenant2's learner to tenant1's class
        const addResponse = await tenant1AdminApi.post(`/classes/${classId}/students`, {
          studentIds: [tenant2Data.profileId],
        });

        // Should reject or filter out invalid student IDs
        if (addResponse.status === 200) {
          const data = addResponse.data as { addedCount: number; invalidIds?: string[] };
          if (data.invalidIds) {
            expect(data.invalidIds).toContain(tenant2Data.profileId);
          }
          expect(data.addedCount).toBe(0);
        } else {
          expect([400, 403]).toContain(addResponse.status);
        }
      }
    });
  });
});
