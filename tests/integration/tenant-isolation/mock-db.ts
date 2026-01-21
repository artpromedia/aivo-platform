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
 * Wraps a PrismaClient instance with the TestDatabaseClient interface.
 * 
 * @param prisma - The PrismaClient instance to wrap
 * @returns TestDatabaseClient implementation using Prisma
 */
export function createPrismaDatabaseClient(prisma: {
  tenant: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  user: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args: { where: { tenantId: string } }) => Promise<Record<string, unknown>[]>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  learner: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args: { where: { tenantId: string } }) => Promise<Record<string, unknown>[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  session: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args: { where: { tenantId: string } }) => Promise<Record<string, unknown>[]>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  recommendation: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args: { where: { tenantId: string } }) => Promise<Record<string, unknown>[]>;
    update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  messageThread: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args: { where: { tenantId: string } }) => Promise<Record<string, unknown>[]>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  virtualBrain: {
    create: (args: { data: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null>;
    findMany: (args: { where: { tenantId: string } }) => Promise<Record<string, unknown>[]>;
    delete: (args: { where: { id: string } }) => Promise<void>;
  };
  $disconnect: () => Promise<void>;
}): TestDatabaseClient {
  return {
    // Tenant operations
    async createTenant(data) {
      const result = await prisma.tenant.create({
        data: { ...data, createdAt: new Date() },
      });
      return result as unknown as TestTenant;
    },

    async deleteTenant(id) {
      await prisma.tenant.delete({ where: { id } });
    },

    // User operations
    async createUser(data) {
      const result = await prisma.user.create({ data });
      return result as unknown as Omit<TestUser, 'jwt'>;
    },

    async findUserById(id) {
      const result = await prisma.user.findUnique({ where: { id } });
      return result as unknown as Omit<TestUser, 'jwt'> | null;
    },

    async findUsersByTenantId(tenantId) {
      const results = await prisma.user.findMany({ where: { tenantId } });
      return results as unknown as Omit<TestUser, 'jwt'>[];
    },

    async deleteUser(id) {
      await prisma.user.delete({ where: { id } });
    },

    // Learner operations
    async createLearner(data) {
      const result = await prisma.learner.create({ data });
      return result as unknown as TestLearner;
    },

    async findLearnerById(id) {
      const result = await prisma.learner.findUnique({ where: { id } });
      return result as unknown as TestLearner | null;
    },

    async findLearnersByTenantId(tenantId) {
      const results = await prisma.learner.findMany({ where: { tenantId } });
      return results as unknown as TestLearner[];
    },

    async updateLearner(id, data) {
      const result = await prisma.learner.update({ where: { id }, data });
      return result as unknown as TestLearner;
    },

    async deleteLearner(id) {
      await prisma.learner.delete({ where: { id } });
    },

    // Session operations
    async createSession(data) {
      const result = await prisma.session.create({ data });
      return result as unknown as TestSession;
    },

    async findSessionById(id) {
      const result = await prisma.session.findUnique({ where: { id } });
      return result as unknown as TestSession | null;
    },

    async findSessionsByTenantId(tenantId) {
      const results = await prisma.session.findMany({ where: { tenantId } });
      return results as unknown as TestSession[];
    },

    async deleteSession(id) {
      await prisma.session.delete({ where: { id } });
    },

    // Recommendation operations
    async createRecommendation(data) {
      const result = await prisma.recommendation.create({ data });
      return result as unknown as TestRecommendation;
    },

    async findRecommendationById(id) {
      const result = await prisma.recommendation.findUnique({ where: { id } });
      return result as unknown as TestRecommendation | null;
    },

    async findRecommendationsByTenantId(tenantId) {
      const results = await prisma.recommendation.findMany({ where: { tenantId } });
      return results as unknown as TestRecommendation[];
    },

    async updateRecommendation(id, data) {
      const result = await prisma.recommendation.update({ where: { id }, data });
      return result as unknown as TestRecommendation;
    },

    async deleteRecommendation(id) {
      await prisma.recommendation.delete({ where: { id } });
    },

    // Message thread operations
    async createMessageThread(data) {
      const result = await prisma.messageThread.create({ data });
      return result as unknown as TestMessageThread;
    },

    async findMessageThreadById(id) {
      const result = await prisma.messageThread.findUnique({ where: { id } });
      return result as unknown as TestMessageThread | null;
    },

    async findMessageThreadsByTenantId(tenantId) {
      const results = await prisma.messageThread.findMany({ where: { tenantId } });
      return results as unknown as TestMessageThread[];
    },

    async deleteMessageThread(id) {
      await prisma.messageThread.delete({ where: { id } });
    },

    // Virtual Brain operations
    async createVirtualBrain(data) {
      const result = await prisma.virtualBrain.create({ data });
      return result as unknown as TestVirtualBrain;
    },

    async findVirtualBrainById(id) {
      const result = await prisma.virtualBrain.findUnique({ where: { id } });
      return result as unknown as TestVirtualBrain | null;
    },

    async findVirtualBrainsByTenantId(tenantId) {
      const results = await prisma.virtualBrain.findMany({ where: { tenantId } });
      return results as unknown as TestVirtualBrain[];
    },

    async deleteVirtualBrain(id) {
      await prisma.virtualBrain.delete({ where: { id } });
    },

    // Cleanup
    async disconnect() {
      await prisma.$disconnect();
    },
  };
}
