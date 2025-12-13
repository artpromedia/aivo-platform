/**
 * Mock Database Client for Tenant Isolation Tests
 *
 * In-memory implementation of TestDatabaseClient for unit testing.
 * For integration tests, replace with actual Prisma client.
 *
 * @module tests/integration/tenant-isolation/mock-db
 */

import {
  TestDatabaseClient,
  TestTenant,
  TestUser,
  TestLearner,
  TestSession,
  TestRecommendation,
  TestMessageThread,
  TestVirtualBrain,
} from './setup';

/**
 * In-memory database store
 */
interface InMemoryStore {
  tenants: Map<string, TestTenant>;
  users: Map<string, Omit<TestUser, 'jwt'>>;
  learners: Map<string, TestLearner>;
  sessions: Map<string, TestSession>;
  recommendations: Map<string, TestRecommendation>;
  messageThreads: Map<string, TestMessageThread>;
  virtualBrains: Map<string, TestVirtualBrain>;
}

/**
 * Create an in-memory mock database client for testing
 */
export function createMockDatabaseClient(): TestDatabaseClient {
  const store: InMemoryStore = {
    tenants: new Map(),
    users: new Map(),
    learners: new Map(),
    sessions: new Map(),
    recommendations: new Map(),
    messageThreads: new Map(),
    virtualBrains: new Map(),
  };

  return {
    // Tenant operations
    async createTenant(data: Omit<TestTenant, 'createdAt'>): Promise<TestTenant> {
      const tenant: TestTenant = {
        ...data,
        createdAt: new Date(),
      };
      store.tenants.set(data.id, tenant);
      return tenant;
    },

    async deleteTenant(id: string): Promise<void> {
      store.tenants.delete(id);
    },

    // User operations
    async createUser(data: Omit<TestUser, 'jwt'>): Promise<Omit<TestUser, 'jwt'>> {
      store.users.set(data.id, data);
      return data;
    },

    async findUserById(id: string): Promise<Omit<TestUser, 'jwt'> | null> {
      return store.users.get(id) || null;
    },

    async findUsersByTenantId(tenantId: string): Promise<Omit<TestUser, 'jwt'>[]> {
      return Array.from(store.users.values()).filter((u) => u.tenantId === tenantId);
    },

    async deleteUser(id: string): Promise<void> {
      store.users.delete(id);
    },

    // Learner operations
    async createLearner(data: TestLearner): Promise<TestLearner> {
      store.learners.set(data.id, data);
      return data;
    },

    async findLearnerById(id: string): Promise<TestLearner | null> {
      return store.learners.get(id) || null;
    },

    async findLearnersByTenantId(tenantId: string): Promise<TestLearner[]> {
      return Array.from(store.learners.values()).filter((l) => l.tenantId === tenantId);
    },

    async updateLearner(id: string, data: Partial<TestLearner>): Promise<TestLearner | null> {
      const existing = store.learners.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...data, id: existing.id, tenantId: existing.tenantId };
      store.learners.set(id, updated);
      return updated;
    },

    async deleteLearner(id: string): Promise<void> {
      store.learners.delete(id);
    },

    // Session operations
    async createSession(data: TestSession): Promise<TestSession> {
      store.sessions.set(data.id, data);
      return data;
    },

    async findSessionById(id: string): Promise<TestSession | null> {
      return store.sessions.get(id) || null;
    },

    async findSessionsByTenantId(tenantId: string): Promise<TestSession[]> {
      return Array.from(store.sessions.values()).filter((s) => s.tenantId === tenantId);
    },

    async deleteSession(id: string): Promise<void> {
      store.sessions.delete(id);
    },

    // Recommendation operations
    async createRecommendation(data: TestRecommendation): Promise<TestRecommendation> {
      store.recommendations.set(data.id, data);
      return data;
    },

    async findRecommendationById(id: string): Promise<TestRecommendation | null> {
      return store.recommendations.get(id) || null;
    },

    async findRecommendationsByTenantId(tenantId: string): Promise<TestRecommendation[]> {
      return Array.from(store.recommendations.values()).filter((r) => r.tenantId === tenantId);
    },

    async updateRecommendation(
      id: string,
      data: Partial<TestRecommendation>
    ): Promise<TestRecommendation | null> {
      const existing = store.recommendations.get(id);
      if (!existing) return null;

      const updated = { ...existing, ...data, id: existing.id, tenantId: existing.tenantId };
      store.recommendations.set(id, updated);
      return updated;
    },

    async deleteRecommendation(id: string): Promise<void> {
      store.recommendations.delete(id);
    },

    // Message thread operations
    async createMessageThread(data: TestMessageThread): Promise<TestMessageThread> {
      store.messageThreads.set(data.id, data);
      return data;
    },

    async findMessageThreadById(id: string): Promise<TestMessageThread | null> {
      return store.messageThreads.get(id) || null;
    },

    async findMessageThreadsByTenantId(tenantId: string): Promise<TestMessageThread[]> {
      return Array.from(store.messageThreads.values()).filter((t) => t.tenantId === tenantId);
    },

    async deleteMessageThread(id: string): Promise<void> {
      store.messageThreads.delete(id);
    },

    // Virtual Brain operations
    async createVirtualBrain(data: TestVirtualBrain): Promise<TestVirtualBrain> {
      store.virtualBrains.set(data.id, data);
      return data;
    },

    async findVirtualBrainById(id: string): Promise<TestVirtualBrain | null> {
      return store.virtualBrains.get(id) || null;
    },

    async findVirtualBrainsByTenantId(tenantId: string): Promise<TestVirtualBrain[]> {
      return Array.from(store.virtualBrains.values()).filter((b) => b.tenantId === tenantId);
    },

    async deleteVirtualBrain(id: string): Promise<void> {
      store.virtualBrains.delete(id);
    },

    // Cleanup
    async disconnect(): Promise<void> {
      store.tenants.clear();
      store.users.clear();
      store.learners.clear();
      store.sessions.clear();
      store.recommendations.clear();
      store.messageThreads.clear();
      store.virtualBrains.clear();
    },
  };
}

/**
 * Create a Prisma-based database client for integration tests.
 * This should be implemented when running against a real database.
 */
export function createPrismaDatabaseClient(/* prisma: PrismaClient */): TestDatabaseClient {
  // TODO: Implement with actual Prisma client for integration tests
  // This would wrap the Prisma client with the TestDatabaseClient interface
  throw new Error('Prisma client implementation not yet available. Use createMockDatabaseClient for unit tests.');
}
