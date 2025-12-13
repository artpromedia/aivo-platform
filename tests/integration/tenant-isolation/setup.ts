/**
 * Tenant Isolation Test Infrastructure
 *
 * Creates isolated test environments for two tenants to verify
 * complete data isolation across all API endpoints and database queries.
 *
 * @module tests/integration/tenant-isolation/setup
 */

import { randomUUID } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface TestTenant {
  id: string;
  name: string;
  subdomain: string;
  createdAt: Date;
}

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  jwt: string;
}

export interface TestLearner {
  id: string;
  tenantId: string;
  userId: string;
  firstName: string;
  lastName: string;
  gradeBand: GradeBand;
}

export interface TestSession {
  id: string;
  tenantId: string;
  learnerId: string;
  sessionType: SessionType;
  startedAt: Date;
}

export interface TestRecommendation {
  id: string;
  tenantId: string;
  learnerId: string;
  type: string;
  status: string;
}

export interface TestMessageThread {
  id: string;
  tenantId: string;
  participantIds: string[];
  subject: string;
}

export interface TestVirtualBrain {
  id: string;
  tenantId: string;
  learnerId: string;
  gradeBand: GradeBand;
}

export type UserRole = 'PARENT' | 'TEACHER' | 'ADMIN' | 'PLATFORM_ADMIN' | 'LEARNER';
export type GradeBand = 'K5' | 'G6_8' | 'G9_12';
export type SessionType = 'LEARNING' | 'HOMEWORK' | 'BASELINE' | 'PRACTICE';

export interface TenantIsolationTestContext {
  // Database client (generic interface to support multiple ORMs)
  db: TestDatabaseClient;

  // Server URL for API tests
  serverUrl: string;

  // Two completely separate tenants
  tenantA: TestTenant;
  tenantB: TestTenant;

  // Users in each tenant
  userA: TestUser; // Parent in Tenant A
  userB: TestUser; // Parent in Tenant B
  adminA: TestUser; // Admin in Tenant A
  adminB: TestUser; // Admin in Tenant B
  teacherA: TestUser; // Teacher in Tenant A
  teacherB: TestUser; // Teacher in Tenant B

  // Learners in each tenant
  learnerA1: TestLearner;
  learnerA2: TestLearner;
  learnerB1: TestLearner;
  learnerB2: TestLearner;

  // Test data for verification
  testData: {
    sessionA: TestSession;
    sessionB: TestSession;
    recommendationA: TestRecommendation;
    recommendationB: TestRecommendation;
    messageThreadA: TestMessageThread;
    messageThreadB: TestMessageThread;
    virtualBrainA: TestVirtualBrain;
    virtualBrainB: TestVirtualBrain;
  };
}

// ============================================================================
// Database Client Interface
// ============================================================================

/**
 * Generic database client interface for tenant isolation tests.
 * Implementations can wrap Prisma, Knex, or raw SQL.
 */
export interface TestDatabaseClient {
  // Tenant operations
  createTenant(data: Omit<TestTenant, 'createdAt'>): Promise<TestTenant>;
  deleteTenant(id: string): Promise<void>;

  // User operations
  createUser(data: Omit<TestUser, 'jwt'>): Promise<Omit<TestUser, 'jwt'>>;
  findUserById(id: string): Promise<Omit<TestUser, 'jwt'> | null>;
  findUsersByTenantId(tenantId: string): Promise<Omit<TestUser, 'jwt'>[]>;
  deleteUser(id: string): Promise<void>;

  // Learner operations
  createLearner(data: TestLearner): Promise<TestLearner>;
  findLearnerById(id: string): Promise<TestLearner | null>;
  findLearnersByTenantId(tenantId: string): Promise<TestLearner[]>;
  updateLearner(id: string, data: Partial<TestLearner>): Promise<TestLearner | null>;
  deleteLearner(id: string): Promise<void>;

  // Session operations
  createSession(data: TestSession): Promise<TestSession>;
  findSessionById(id: string): Promise<TestSession | null>;
  findSessionsByTenantId(tenantId: string): Promise<TestSession[]>;
  deleteSession(id: string): Promise<void>;

  // Recommendation operations
  createRecommendation(data: TestRecommendation): Promise<TestRecommendation>;
  findRecommendationById(id: string): Promise<TestRecommendation | null>;
  findRecommendationsByTenantId(tenantId: string): Promise<TestRecommendation[]>;
  updateRecommendation(
    id: string,
    data: Partial<TestRecommendation>
  ): Promise<TestRecommendation | null>;
  deleteRecommendation(id: string): Promise<void>;

  // Message thread operations
  createMessageThread(data: TestMessageThread): Promise<TestMessageThread>;
  findMessageThreadById(id: string): Promise<TestMessageThread | null>;
  findMessageThreadsByTenantId(tenantId: string): Promise<TestMessageThread[]>;
  deleteMessageThread(id: string): Promise<void>;

  // Virtual Brain operations
  createVirtualBrain(data: TestVirtualBrain): Promise<TestVirtualBrain>;
  findVirtualBrainById(id: string): Promise<TestVirtualBrain | null>;
  findVirtualBrainsByTenantId(tenantId: string): Promise<TestVirtualBrain[]>;
  deleteVirtualBrain(id: string): Promise<void>;

  // Cleanup
  disconnect(): Promise<void>;
}

// ============================================================================
// JWT Helper
// ============================================================================

/**
 * Generate a test JWT token for authentication.
 * In production tests, this would use the actual JWT signing key.
 */
export function generateTestJwt(user: Omit<TestUser, 'jwt'>): string {
  // For test purposes, create a simple base64 encoded token
  // In real implementation, use jose or jsonwebtoken with proper signing
  const payload = {
    sub: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  };

  // This is a placeholder - real implementation would sign with RS256/ES256
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from('test-signature').toString('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Create a tampered JWT with modified tenantId for security testing.
 * This should always be rejected by the server.
 */
export function createTamperedJwt(user: TestUser, targetTenantId: string): string {
  const payload = {
    sub: user.id,
    tenantId: targetTenantId, // Tampered tenant ID
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = Buffer.from('tampered-signature').toString('base64url');

  return `${header}.${body}.${signature}`;
}

// ============================================================================
// CUID Generator (for test IDs)
// ============================================================================

/**
 * Generate a CUID-like identifier for tests.
 * Uses a simplified format that passes CUID validation.
 */
export function generateTestCuid(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `c${timestamp}${random}`.substring(0, 25);
}

// ============================================================================
// Test Data Factory
// ============================================================================

/**
 * Create test tenant with unique identifiers
 */
export function createTestTenantData(suffix: string): Omit<TestTenant, 'createdAt'> {
  return {
    id: randomUUID(),
    name: `Test Tenant ${suffix}`,
    subdomain: `test-${suffix.toLowerCase()}-${Date.now()}`,
  };
}

/**
 * Create test user with role
 */
export function createTestUserData(
  tenantId: string,
  role: UserRole,
  suffix: string
): Omit<TestUser, 'jwt'> {
  return {
    id: randomUUID(),
    tenantId,
    email: `${role.toLowerCase()}-${suffix}@test-${Date.now()}.example.com`,
    role,
  };
}

/**
 * Create test learner
 */
export function createTestLearnerData(
  tenantId: string,
  userId: string,
  suffix: string
): TestLearner {
  return {
    id: randomUUID(),
    tenantId,
    userId,
    firstName: `Learner${suffix}`,
    lastName: `Test${suffix}`,
    gradeBand: 'K5',
  };
}

/**
 * Create test session
 */
export function createTestSessionData(
  tenantId: string,
  learnerId: string,
  sessionType: SessionType = 'LEARNING'
): TestSession {
  return {
    id: randomUUID(),
    tenantId,
    learnerId,
    sessionType,
    startedAt: new Date(),
  };
}

/**
 * Create test recommendation
 */
export function createTestRecommendationData(tenantId: string, learnerId: string): TestRecommendation {
  return {
    id: randomUUID(),
    tenantId,
    learnerId,
    type: 'DECREASE_DIFFICULTY',
    status: 'PENDING',
  };
}

/**
 * Create test message thread
 */
export function createTestMessageThreadData(
  tenantId: string,
  participantIds: string[]
): TestMessageThread {
  return {
    id: randomUUID(),
    tenantId,
    participantIds,
    subject: `Test Thread ${Date.now()}`,
  };
}

/**
 * Create test virtual brain
 */
export function createTestVirtualBrainData(
  tenantId: string,
  learnerId: string,
  gradeBand: GradeBand = 'K5'
): TestVirtualBrain {
  return {
    id: randomUUID(),
    tenantId,
    learnerId,
    gradeBand,
  };
}

// ============================================================================
// Setup and Teardown
// ============================================================================

/**
 * Setup function that creates isolated test data for two tenants.
 * Each tenant gets its own users, learners, sessions, and other data.
 */
export async function setupTenantIsolationTests(
  db: TestDatabaseClient,
  serverUrl: string
): Promise<TenantIsolationTestContext> {
  // Create two tenants
  const tenantA = await db.createTenant(createTestTenantData('A'));
  const tenantB = await db.createTenant(createTestTenantData('B'));

  // Create users for Tenant A
  const userAData = createTestUserData(tenantA.id, 'PARENT', 'A');
  const adminAData = createTestUserData(tenantA.id, 'ADMIN', 'A');
  const teacherAData = createTestUserData(tenantA.id, 'TEACHER', 'A');

  const userARecord = await db.createUser(userAData);
  const adminARecord = await db.createUser(adminAData);
  const teacherARecord = await db.createUser(teacherAData);

  const userA: TestUser = { ...userARecord, jwt: generateTestJwt(userARecord) };
  const adminA: TestUser = { ...adminARecord, jwt: generateTestJwt(adminARecord) };
  const teacherA: TestUser = { ...teacherARecord, jwt: generateTestJwt(teacherARecord) };

  // Create users for Tenant B
  const userBData = createTestUserData(tenantB.id, 'PARENT', 'B');
  const adminBData = createTestUserData(tenantB.id, 'ADMIN', 'B');
  const teacherBData = createTestUserData(tenantB.id, 'TEACHER', 'B');

  const userBRecord = await db.createUser(userBData);
  const adminBRecord = await db.createUser(adminBData);
  const teacherBRecord = await db.createUser(teacherBData);

  const userB: TestUser = { ...userBRecord, jwt: generateTestJwt(userBRecord) };
  const adminB: TestUser = { ...adminBRecord, jwt: generateTestJwt(adminBRecord) };
  const teacherB: TestUser = { ...teacherBRecord, jwt: generateTestJwt(teacherBRecord) };

  // Create learners for Tenant A
  const learnerA1 = await db.createLearner(createTestLearnerData(tenantA.id, userA.id, 'A1'));
  const learnerA2 = await db.createLearner(createTestLearnerData(tenantA.id, userA.id, 'A2'));

  // Create learners for Tenant B
  const learnerB1 = await db.createLearner(createTestLearnerData(tenantB.id, userB.id, 'B1'));
  const learnerB2 = await db.createLearner(createTestLearnerData(tenantB.id, userB.id, 'B2'));

  // Create sessions
  const sessionA = await db.createSession(createTestSessionData(tenantA.id, learnerA1.id));
  const sessionB = await db.createSession(createTestSessionData(tenantB.id, learnerB1.id));

  // Create recommendations
  const recommendationA = await db.createRecommendation(
    createTestRecommendationData(tenantA.id, learnerA1.id)
  );
  const recommendationB = await db.createRecommendation(
    createTestRecommendationData(tenantB.id, learnerB1.id)
  );

  // Create message threads
  const messageThreadA = await db.createMessageThread(
    createTestMessageThreadData(tenantA.id, [userA.id, teacherA.id])
  );
  const messageThreadB = await db.createMessageThread(
    createTestMessageThreadData(tenantB.id, [userB.id, teacherB.id])
  );

  // Create virtual brains
  const virtualBrainA = await db.createVirtualBrain(
    createTestVirtualBrainData(tenantA.id, learnerA1.id)
  );
  const virtualBrainB = await db.createVirtualBrain(
    createTestVirtualBrainData(tenantB.id, learnerB1.id)
  );

  return {
    db,
    serverUrl,
    tenantA,
    tenantB,
    userA,
    userB,
    adminA,
    adminB,
    teacherA,
    teacherB,
    learnerA1,
    learnerA2,
    learnerB1,
    learnerB2,
    testData: {
      sessionA,
      sessionB,
      recommendationA,
      recommendationB,
      messageThreadA,
      messageThreadB,
      virtualBrainA,
      virtualBrainB,
    },
  };
}

/**
 * Cleanup function that removes all test data.
 * Must clean up in reverse order of dependencies.
 */
export async function teardownTenantIsolationTests(
  ctx: TenantIsolationTestContext
): Promise<void> {
  const { db, testData, learnerA1, learnerA2, learnerB1, learnerB2, userA, userB, adminA, adminB, teacherA, teacherB, tenantA, tenantB } = ctx;

  // Delete test data (in dependency order)
  await db.deleteVirtualBrain(testData.virtualBrainA.id).catch(() => {});
  await db.deleteVirtualBrain(testData.virtualBrainB.id).catch(() => {});

  await db.deleteMessageThread(testData.messageThreadA.id).catch(() => {});
  await db.deleteMessageThread(testData.messageThreadB.id).catch(() => {});

  await db.deleteRecommendation(testData.recommendationA.id).catch(() => {});
  await db.deleteRecommendation(testData.recommendationB.id).catch(() => {});

  await db.deleteSession(testData.sessionA.id).catch(() => {});
  await db.deleteSession(testData.sessionB.id).catch(() => {});

  await db.deleteLearner(learnerA1.id).catch(() => {});
  await db.deleteLearner(learnerA2.id).catch(() => {});
  await db.deleteLearner(learnerB1.id).catch(() => {});
  await db.deleteLearner(learnerB2.id).catch(() => {});

  await db.deleteUser(userA.id).catch(() => {});
  await db.deleteUser(userB.id).catch(() => {});
  await db.deleteUser(adminA.id).catch(() => {});
  await db.deleteUser(adminB.id).catch(() => {});
  await db.deleteUser(teacherA.id).catch(() => {});
  await db.deleteUser(teacherB.id).catch(() => {});

  await db.deleteTenant(tenantA.id).catch(() => {});
  await db.deleteTenant(tenantB.id).catch(() => {});

  await db.disconnect();
}

// ============================================================================
// Tenant-Scoped Database Client
// ============================================================================

/**
 * Create a tenant-scoped database client that automatically filters by tenant.
 * This simulates how services should interact with the database.
 */
export function createTenantScopedClient(
  db: TestDatabaseClient,
  tenantId: string
): TenantScopedDatabaseClient {
  return new TenantScopedDatabaseClient(db, tenantId);
}

export class TenantScopedDatabaseClient {
  constructor(
    private readonly db: TestDatabaseClient,
    private readonly tenantId: string
  ) {}

  async findLearnerById(id: string): Promise<TestLearner | null> {
    const learner = await this.db.findLearnerById(id);
    // Only return if tenant matches
    if (learner && learner.tenantId === this.tenantId) {
      return learner;
    }
    return null;
  }

  async findAllLearners(): Promise<TestLearner[]> {
    return this.db.findLearnersByTenantId(this.tenantId);
  }

  async updateLearner(id: string, data: Partial<TestLearner>): Promise<TestLearner | null> {
    const learner = await this.db.findLearnerById(id);
    // Only update if tenant matches
    if (learner && learner.tenantId === this.tenantId) {
      return this.db.updateLearner(id, data);
    }
    return null;
  }

  async deleteLearner(id: string): Promise<boolean> {
    const learner = await this.db.findLearnerById(id);
    // Only delete if tenant matches
    if (learner && learner.tenantId === this.tenantId) {
      await this.db.deleteLearner(id);
      return true;
    }
    return false;
  }

  async findSessionById(id: string): Promise<TestSession | null> {
    const session = await this.db.findSessionById(id);
    if (session && session.tenantId === this.tenantId) {
      return session;
    }
    return null;
  }

  async findAllSessions(): Promise<TestSession[]> {
    return this.db.findSessionsByTenantId(this.tenantId);
  }

  async findRecommendationById(id: string): Promise<TestRecommendation | null> {
    const recommendation = await this.db.findRecommendationById(id);
    if (recommendation && recommendation.tenantId === this.tenantId) {
      return recommendation;
    }
    return null;
  }

  async findAllRecommendations(): Promise<TestRecommendation[]> {
    return this.db.findRecommendationsByTenantId(this.tenantId);
  }

  async updateRecommendation(
    id: string,
    data: Partial<TestRecommendation>
  ): Promise<TestRecommendation | null> {
    const recommendation = await this.db.findRecommendationById(id);
    if (recommendation && recommendation.tenantId === this.tenantId) {
      return this.db.updateRecommendation(id, data);
    }
    return null;
  }

  async findVirtualBrainById(id: string): Promise<TestVirtualBrain | null> {
    const brain = await this.db.findVirtualBrainById(id);
    if (brain && brain.tenantId === this.tenantId) {
      return brain;
    }
    return null;
  }

  async findAllVirtualBrains(): Promise<TestVirtualBrain[]> {
    return this.db.findVirtualBrainsByTenantId(this.tenantId);
  }

  async findMessageThreadById(id: string): Promise<TestMessageThread | null> {
    const thread = await this.db.findMessageThreadById(id);
    if (thread && thread.tenantId === this.tenantId) {
      return thread;
    }
    return null;
  }

  async findAllMessageThreads(): Promise<TestMessageThread[]> {
    return this.db.findMessageThreadsByTenantId(this.tenantId);
  }
}

// ============================================================================
// HTTP Test Helpers
// ============================================================================

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, string>;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T = unknown>(
  serverUrl: string,
  method: string,
  path: string,
  jwt: string,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${jwt}`,
    'Content-Type': 'application/json',
    ...extraHeaders,
  };

  const response = await fetch(`${serverUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  return {
    status: response.status,
    data: data as T,
    headers: responseHeaders,
  };
}

/**
 * Helper to check if response indicates data was NOT leaked
 */
export function assertNoDataLeak<T extends { tenantId?: string }>(
  items: T[],
  expectedTenantId: string,
  forbiddenTenantId: string
): void {
  // All items should belong to expected tenant
  const allCorrectTenant = items.every((item) => item.tenantId === expectedTenantId);
  if (!allCorrectTenant) {
    throw new Error(
      `Data leak detected: some items do not belong to tenant ${expectedTenantId}`
    );
  }

  // No items should belong to forbidden tenant
  const anyForbiddenTenant = items.some((item) => item.tenantId === forbiddenTenantId);
  if (anyForbiddenTenant) {
    throw new Error(
      `Data leak detected: found items belonging to forbidden tenant ${forbiddenTenantId}`
    );
  }
}
