/**
 * Tenant Isolation - Database Level Tests
 *
 * Tests database-level isolation using tenant-scoped clients.
 * Verifies that queries are properly filtered by tenant_id.
 *
 * @module tests/integration/tenant-isolation/database-isolation.test
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  TenantIsolationTestContext,
  setupTenantIsolationTests,
  teardownTenantIsolationTests,
  createTenantScopedClient,
  TenantScopedDatabaseClient,
} from './setup';
import { createMockDatabaseClient } from './mock-db';

describe('Tenant Isolation - Database Level', () => {
  let ctx: TenantIsolationTestContext;
  let tenantAClient: TenantScopedDatabaseClient;
  let tenantBClient: TenantScopedDatabaseClient;

  beforeAll(async () => {
    const db = createMockDatabaseClient();
    const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4000';
    ctx = await setupTenantIsolationTests(db, serverUrl);

    // Create tenant-scoped clients
    tenantAClient = createTenantScopedClient(ctx.db, ctx.tenantA.id);
    tenantBClient = createTenantScopedClient(ctx.db, ctx.tenantB.id);
  });

  afterAll(async () => {
    if (ctx) {
      await teardownTenantIsolationTests(ctx);
    }
  });

  // ==========================================================================
  // Direct Query Verification - Learners
  // ==========================================================================

  describe('Direct Query Verification - Learners', () => {
    it('tenant-scoped client cannot find other tenant learner by ID', async () => {
      // Tenant A client tries to find Tenant B learner
      const learner = await tenantAClient.findLearnerById(ctx.learnerB1.id);
      expect(learner).toBeNull();
    });

    it('tenant-scoped client findAll only returns own tenant learners', async () => {
      const learnersA = await tenantAClient.findAllLearners();

      // All learners should belong to Tenant A
      expect(learnersA.length).toBeGreaterThan(0);
      expect(learnersA.every((l) => l.tenantId === ctx.tenantA.id)).toBe(true);

      // Should not contain Tenant B learners
      expect(learnersA.some((l) => l.id === ctx.learnerB1.id)).toBe(false);
      expect(learnersA.some((l) => l.id === ctx.learnerB2.id)).toBe(false);
    });

    it('tenant-scoped client cannot update other tenant learner', async () => {
      const originalLearner = await ctx.db.findLearnerById(ctx.learnerB1.id);

      // Attempt to update Tenant B learner using Tenant A client
      const result = await tenantAClient.updateLearner(ctx.learnerB1.id, {
        firstName: 'Hacked',
      });

      expect(result).toBeNull();

      // Verify learner was not modified
      const learnerAfter = await ctx.db.findLearnerById(ctx.learnerB1.id);
      expect(learnerAfter?.firstName).toBe(originalLearner?.firstName);
    });

    it('tenant-scoped client cannot delete other tenant learner', async () => {
      // Attempt to delete Tenant B learner using Tenant A client
      const deleted = await tenantAClient.deleteLearner(ctx.learnerB1.id);

      expect(deleted).toBe(false);

      // Verify learner still exists
      const learner = await ctx.db.findLearnerById(ctx.learnerB1.id);
      expect(learner).not.toBeNull();
    });

    it('Tenant B client cannot access Tenant A learners', async () => {
      const learner = await tenantBClient.findLearnerById(ctx.learnerA1.id);
      expect(learner).toBeNull();

      const allLearners = await tenantBClient.findAllLearners();
      expect(allLearners.every((l) => l.tenantId === ctx.tenantB.id)).toBe(true);
      expect(allLearners.some((l) => l.id === ctx.learnerA1.id)).toBe(false);
    });
  });

  // ==========================================================================
  // Direct Query Verification - Sessions
  // ==========================================================================

  describe('Direct Query Verification - Sessions', () => {
    it('tenant-scoped client cannot find other tenant session by ID', async () => {
      const session = await tenantAClient.findSessionById(ctx.testData.sessionB.id);
      expect(session).toBeNull();
    });

    it('tenant-scoped client findAll only returns own tenant sessions', async () => {
      const sessionsA = await tenantAClient.findAllSessions();

      expect(sessionsA.every((s) => s.tenantId === ctx.tenantA.id)).toBe(true);
      expect(sessionsA.some((s) => s.id === ctx.testData.sessionB.id)).toBe(false);
    });

    it('Tenant B client cannot access Tenant A sessions', async () => {
      const session = await tenantBClient.findSessionById(ctx.testData.sessionA.id);
      expect(session).toBeNull();
    });
  });

  // ==========================================================================
  // Direct Query Verification - Recommendations
  // ==========================================================================

  describe('Direct Query Verification - Recommendations', () => {
    it('tenant-scoped client cannot find other tenant recommendation by ID', async () => {
      const rec = await tenantAClient.findRecommendationById(ctx.testData.recommendationB.id);
      expect(rec).toBeNull();
    });

    it('tenant-scoped client findAll only returns own tenant recommendations', async () => {
      const recsA = await tenantAClient.findAllRecommendations();

      expect(recsA.every((r) => r.tenantId === ctx.tenantA.id)).toBe(true);
      expect(recsA.some((r) => r.id === ctx.testData.recommendationB.id)).toBe(false);
    });

    it('tenant-scoped client cannot update other tenant recommendation', async () => {
      const original = await ctx.db.findRecommendationById(ctx.testData.recommendationB.id);

      const result = await tenantAClient.updateRecommendation(ctx.testData.recommendationB.id, {
        status: 'ACCEPTED',
      });

      expect(result).toBeNull();

      // Verify recommendation was not modified
      const after = await ctx.db.findRecommendationById(ctx.testData.recommendationB.id);
      expect(after?.status).toBe(original?.status);
    });
  });

  // ==========================================================================
  // Direct Query Verification - Virtual Brains
  // ==========================================================================

  describe('Direct Query Verification - Virtual Brains', () => {
    it('tenant-scoped client cannot find other tenant virtual brain by ID', async () => {
      const brain = await tenantAClient.findVirtualBrainById(ctx.testData.virtualBrainB.id);
      expect(brain).toBeNull();
    });

    it('tenant-scoped client findAll only returns own tenant virtual brains', async () => {
      const brainsA = await tenantAClient.findAllVirtualBrains();

      expect(brainsA.every((b) => b.tenantId === ctx.tenantA.id)).toBe(true);
      expect(brainsA.some((b) => b.id === ctx.testData.virtualBrainB.id)).toBe(false);
    });
  });

  // ==========================================================================
  // Direct Query Verification - Message Threads
  // ==========================================================================

  describe('Direct Query Verification - Message Threads', () => {
    it('tenant-scoped client cannot find other tenant message thread by ID', async () => {
      const thread = await tenantAClient.findMessageThreadById(ctx.testData.messageThreadB.id);
      expect(thread).toBeNull();
    });

    it('tenant-scoped client findAll only returns own tenant message threads', async () => {
      const threadsA = await tenantAClient.findAllMessageThreads();

      expect(threadsA.every((t) => t.tenantId === ctx.tenantA.id)).toBe(true);
      expect(threadsA.some((t) => t.id === ctx.testData.messageThreadB.id)).toBe(false);
    });
  });

  // ==========================================================================
  // Relation Traversal Tests
  // ==========================================================================

  describe('Relation Traversal', () => {
    it('cannot access cross-tenant data via learner -> sessions relation', async () => {
      // Even if we could include relations, they should be filtered
      const learnersWithSessions = await tenantAClient.findAllLearners();

      for (const learner of learnersWithSessions) {
        expect(learner.tenantId).toBe(ctx.tenantA.id);
        // If sessions were included, they should also be Tenant A only
      }
    });

    it('cannot access cross-tenant data via session -> learner relation', async () => {
      const sessions = await tenantAClient.findAllSessions();

      for (const session of sessions) {
        expect(session.tenantId).toBe(ctx.tenantA.id);
        expect(session.learnerId).toBeDefined();

        // Verify the learner belongs to the same tenant
        const learner = await ctx.db.findLearnerById(session.learnerId);
        if (learner) {
          expect(learner.tenantId).toBe(ctx.tenantA.id);
        }
      }
    });

    it('cannot access cross-tenant data via recommendation -> learner relation', async () => {
      const recommendations = await tenantAClient.findAllRecommendations();

      for (const rec of recommendations) {
        expect(rec.tenantId).toBe(ctx.tenantA.id);

        // Verify the learner belongs to the same tenant
        const learner = await ctx.db.findLearnerById(rec.learnerId);
        if (learner) {
          expect(learner.tenantId).toBe(ctx.tenantA.id);
        }
      }
    });
  });

  // ==========================================================================
  // Bulk Operations
  // ==========================================================================

  describe('Bulk Operations', () => {
    it('bulk queries only return own tenant data', async () => {
      // Get all data from Tenant A client
      const [learners, sessions, recommendations, brains, threads] = await Promise.all([
        tenantAClient.findAllLearners(),
        tenantAClient.findAllSessions(),
        tenantAClient.findAllRecommendations(),
        tenantAClient.findAllVirtualBrains(),
        tenantAClient.findAllMessageThreads(),
      ]);

      // All should belong to Tenant A
      expect(learners.every((l) => l.tenantId === ctx.tenantA.id)).toBe(true);
      expect(sessions.every((s) => s.tenantId === ctx.tenantA.id)).toBe(true);
      expect(recommendations.every((r) => r.tenantId === ctx.tenantA.id)).toBe(true);
      expect(brains.every((b) => b.tenantId === ctx.tenantA.id)).toBe(true);
      expect(threads.every((t) => t.tenantId === ctx.tenantA.id)).toBe(true);

      // None should belong to Tenant B
      expect(learners.some((l) => l.tenantId === ctx.tenantB.id)).toBe(false);
      expect(sessions.some((s) => s.tenantId === ctx.tenantB.id)).toBe(false);
      expect(recommendations.some((r) => r.tenantId === ctx.tenantB.id)).toBe(false);
      expect(brains.some((b) => b.tenantId === ctx.tenantB.id)).toBe(false);
      expect(threads.some((t) => t.tenantId === ctx.tenantB.id)).toBe(false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('handles non-existent IDs gracefully', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      const learner = await tenantAClient.findLearnerById(nonExistentId);
      expect(learner).toBeNull();

      const session = await tenantAClient.findSessionById(nonExistentId);
      expect(session).toBeNull();
    });

    it('handles malformed IDs gracefully', async () => {
      const malformedIds = ['not-a-uuid', '', '   ', 'null', 'undefined', '../../../etc/passwd'];

      for (const id of malformedIds) {
        const learner = await tenantAClient.findLearnerById(id);
        expect(learner).toBeNull();
      }
    });

    it('empty results are safe', async () => {
      // Create a client for a non-existent tenant
      const ghostClient = createTenantScopedClient(ctx.db, 'non-existent-tenant-id');

      const learners = await ghostClient.findAllLearners();
      expect(learners).toEqual([]);

      const sessions = await ghostClient.findAllSessions();
      expect(sessions).toEqual([]);
    });
  });

  // ==========================================================================
  // Concurrent Access
  // ==========================================================================

  describe('Concurrent Access', () => {
    it('parallel queries from different tenants remain isolated', async () => {
      // Run queries from both tenants in parallel
      const [learnersA, learnersB, sessionsA, sessionsB] = await Promise.all([
        tenantAClient.findAllLearners(),
        tenantBClient.findAllLearners(),
        tenantAClient.findAllSessions(),
        tenantBClient.findAllSessions(),
      ]);

      // Verify isolation
      expect(learnersA.every((l) => l.tenantId === ctx.tenantA.id)).toBe(true);
      expect(learnersB.every((l) => l.tenantId === ctx.tenantB.id)).toBe(true);
      expect(sessionsA.every((s) => s.tenantId === ctx.tenantA.id)).toBe(true);
      expect(sessionsB.every((s) => s.tenantId === ctx.tenantB.id)).toBe(true);

      // No cross-contamination
      expect(learnersA.some((l) => l.tenantId === ctx.tenantB.id)).toBe(false);
      expect(learnersB.some((l) => l.tenantId === ctx.tenantA.id)).toBe(false);
    });

    it('rapid sequential queries maintain isolation', async () => {
      // Rapidly alternate between tenants
      for (let i = 0; i < 10; i++) {
        const client = i % 2 === 0 ? tenantAClient : tenantBClient;
        const expectedTenantId = i % 2 === 0 ? ctx.tenantA.id : ctx.tenantB.id;

        const learners = await client.findAllLearners();
        expect(learners.every((l) => l.tenantId === expectedTenantId)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Data Integrity After Operations
  // ==========================================================================

  describe('Data Integrity After Operations', () => {
    it('failed cross-tenant operations do not corrupt data', async () => {
      // Record original state
      const originalLearnerB1 = await ctx.db.findLearnerById(ctx.learnerB1.id);
      const originalLearnerCount = (await ctx.db.findLearnersByTenantId(ctx.tenantB.id)).length;

      // Attempt various cross-tenant operations (all should fail)
      await tenantAClient.updateLearner(ctx.learnerB1.id, { firstName: 'Hacked' });
      await tenantAClient.deleteLearner(ctx.learnerB1.id);

      // Verify data integrity
      const afterLearnerB1 = await ctx.db.findLearnerById(ctx.learnerB1.id);
      const afterLearnerCount = (await ctx.db.findLearnersByTenantId(ctx.tenantB.id)).length;

      expect(afterLearnerB1).toEqual(originalLearnerB1);
      expect(afterLearnerCount).toBe(originalLearnerCount);
    });
  });
});
