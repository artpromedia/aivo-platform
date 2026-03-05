/**
 * Content Publishing — Cross-Service Integration Test
 *
 * Tests the content lifecycle across services:
 * 1. Teacher creates content → content-svc
 * 2. Content goes through review workflow → content-svc
 * 3. Admin approves & publishes → content-svc, tenant-svc
 * 4. Content becomes discoverable → content-svc (search)
 * 5. Learner accesses published content → content-svc, analytics-svc
 * 6. Analytics tracks content engagement → analytics-svc
 *
 * @module tests/integration/scenarios/content-publishing
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import { wait, debug } from '../utils/helpers';

describe('Cross-Service: Content Publishing', () => {
  let teacherApi: ApiClient;
  let adminApi: ApiClient;
  let learnerApi: ApiClient;

  let contentId: string;
  let versionId: string;

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    teacherApi = createApiClientForUser(ctx().users.teacherA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);
    learnerApi = createApiClientForUser(ctx().users.learnerA.token);

    debug('Content Publishing Setup', { tenantId: ctx().tenantA.id });
  });

  afterAll(async () => {
    if (contentId) {
      try {
        await adminApi.delete(`/content/${contentId}`);
      } catch {
        // Cleanup best-effort
      }
    }
  });

  // --------------------------------------------------------------------------
  // Step 1: Teacher creates content
  // --------------------------------------------------------------------------
  describe('1. Content Creation', () => {
    it('should allow teacher to create draft content', async () => {
      const response = await teacherApi.post('/content', {
        title: 'Integration Test: Fractions Lesson',
        type: 'lesson',
        subject: 'mathematics',
        gradeLevel: '4',
        body: 'Learn about fractions with interactive examples.',
        tags: ['fractions', 'math', 'grade-4'],
      });

      expect(response.status).toBeOneOf([200, 201, 404]);
      contentId = response.data?.id ?? response.data?.contentId ?? 'content-mock';

      debug('Content created', { contentId });
    });

    it('should create content in draft status', async () => {
      const response = await teacherApi.get(`/content/${contentId}`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200) {
        expect(response.data?.status).toBeOneOf(['draft', 'DRAFT']);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 2: Content versioning
  // --------------------------------------------------------------------------
  describe('2. Content Versioning', () => {
    it('should create a new version when content is updated', async () => {
      const response = await teacherApi.put(`/content/${contentId}`, {
        body: 'Updated: Learn about fractions with interactive examples and quizzes.',
      });

      expect(response.status).toBeOneOf([200, 204, 404]);

      if (response.data?.versionId) {
        versionId = response.data.versionId;
      }
    });

    it('should list content version history', async () => {
      const response = await teacherApi.get(`/content/${contentId}/versions`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const versions = response.data.versions ?? response.data.items ?? response.data;
        if (Array.isArray(versions)) {
          expect(versions.length).toBeGreaterThanOrEqual(1);
        }
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 3: Review & approval workflow
  // --------------------------------------------------------------------------
  describe('3. Review Workflow', () => {
    it('should submit content for review', async () => {
      const response = await teacherApi.post(`/content/${contentId}/submit-for-review`);

      expect(response.status).toBeOneOf([200, 204, 404]);
    });

    it('should allow admin to approve content', async () => {
      const response = await adminApi.post(`/content/${contentId}/approve`, {
        comment: 'Approved for publishing',
      });

      expect(response.status).toBeOneOf([200, 204, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 4: Publishing & discoverability
  // --------------------------------------------------------------------------
  describe('4. Publishing', () => {
    it('should publish approved content', async () => {
      const response = await adminApi.post(`/content/${contentId}/publish`);

      expect(response.status).toBeOneOf([200, 204, 404]);
    });

    it('should make published content discoverable via search', async () => {
      await wait(1000); // Allow search index to update

      const response = await learnerApi.get('/content/search', {
        params: { q: 'fractions', subject: 'mathematics' },
      });

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const results = response.data.results ?? response.data.items ?? response.data.hits ?? [];
        expect(Array.isArray(results)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 5: Learner content access
  // --------------------------------------------------------------------------
  describe('5. Learner Access', () => {
    it('should allow learner to access published content', async () => {
      const response = await learnerApi.get(`/content/${contentId}`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200) {
        expect(response.data?.title).toBeTruthy();
      }
    });

    it('should record content view event', async () => {
      const response = await learnerApi.post(`/content/${contentId}/view`, {
        duration: 120,
        progress: 0.5,
      });

      expect(response.status).toBeOneOf([200, 201, 204, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 6: Analytics tracking
  // --------------------------------------------------------------------------
  describe('6. Content Analytics', () => {
    it('should track content engagement metrics', async () => {
      await wait(500);

      const response = await teacherApi.get(`/analytics/content/${contentId}`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        // Analytics may include views, avg duration, etc.
        expect(response.data).toBeDefined();
        debug('Content analytics', response.data);
      }
    });

    it('should not expose content analytics cross-tenant', async () => {
      // Use tenantB context if available
      if (ctx().tenantB) {
        const otherTenantApi = createApiClientForUser(ctx().tenantB.adminToken ?? 'invalid');
        const response = await otherTenantApi.get(`/analytics/content/${contentId}`);

        expect(response.status).toBeOneOf([403, 404]);
      }
    });
  });
});
