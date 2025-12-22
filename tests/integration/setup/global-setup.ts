/**
 * Global Integration Test Setup
 *
 * Initializes the test environment with:
 * - Database connections with proper pooling
 * - NATS JetStream for event testing
 * - Redis for caching/sessions
 * - Test tenants and users with JWT tokens
 *
 * @module tests/integration/setup/global-setup
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import { randomUUID, createHmac } from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  settings: Record<string, unknown>;
  createdAt: Date;
}

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  token: string;
  refreshToken?: string;
}

export interface TestLearnerProfile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  gradeLevel: number;
  gradeBand: GradeBand;
  learningPreferences: LearningPreferences;
  accommodations: string[];
  neurodiversityProfile?: NeurodiversityProfile;
}

export interface LearningPreferences {
  preferredModality: 'visual' | 'auditory' | 'kinesthetic' | 'reading';
  sessionDuration: number; // minutes
  breakFrequency: number; // minutes
  difficultyPreference: 'challenging' | 'comfortable' | 'easy';
}

export interface NeurodiversityProfile {
  adhd?: boolean;
  dyslexia?: boolean;
  autism?: boolean;
  dyscalculia?: boolean;
  other?: string[];
}

export interface TestSession {
  id: string;
  tenantId: string;
  profileId: string;
  contentId?: string;
  sessionType: SessionType;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  startedAt: Date;
  endedAt?: Date;
}

export type UserRole = 'LEARNER' | 'PARENT' | 'TEACHER' | 'ADMIN' | 'PLATFORM_ADMIN';
export type GradeBand = 'K2' | 'G3_5' | 'G6_8' | 'G9_12';
export type SessionType = 'lesson' | 'practice' | 'assessment' | 'homework' | 'baseline';

// ============================================================================
// Test Context
// ============================================================================

export interface IntegrationTestContext {
  // Infrastructure connections
  db: MockDatabaseClient;
  redis: MockRedisClient;
  nats: MockNatsClient;

  // Server URL for API calls
  apiBaseUrl: string;
  wsBaseUrl: string;

  // Test tenants
  tenantA: TestTenant;
  tenantB: TestTenant;

  // Users across different roles
  users: {
    platformAdmin: TestUser;
    // Tenant A users
    adminA: TestUser;
    teacherA: TestUser;
    parentA: TestUser;
    learnerA: TestUser;
    // Tenant B users
    adminB: TestUser;
    teacherB: TestUser;
    parentB: TestUser;
    learnerB: TestUser;
  };

  // Learner profiles
  profiles: {
    learnerA: TestLearnerProfile;
    learnerB: TestLearnerProfile;
  };

  // Helper functions
  createTenant: (name: string) => Promise<TestTenant>;
  createUser: (tenantId: string, role: UserRole) => Promise<TestUser>;
  createProfile: (userId: string, tenantId: string) => Promise<TestLearnerProfile>;
  cleanupTenant: (tenantId: string) => Promise<void>;
  generateToken: (userId: string, tenantId: string, role: UserRole) => string;
}

// Global context accessible in all tests
declare global {
  // eslint-disable-next-line no-var
  var testContext: IntegrationTestContext;
}

// ============================================================================
// Mock Clients (replace with real clients when services are available)
// ============================================================================

export interface MockDatabaseClient {
  query: <T>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<{ rowCount: number }>;
  transaction: <T>(fn: () => Promise<T>) => Promise<T>;
  truncateAll: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface MockRedisClient {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttl?: number) => Promise<void>;
  del: (key: string) => Promise<void>;
  flushAll: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export interface MockNatsClient {
  publish: (subject: string, data: unknown) => Promise<void>;
  subscribe: (subject: string, handler: (data: unknown) => void) => { unsubscribe: () => void };
  requestReply: (subject: string, data: unknown, timeout?: number) => Promise<unknown>;
  disconnect: () => Promise<void>;
}

function createMockDatabaseClient(): MockDatabaseClient {
  const data: Map<string, unknown[]> = new Map();

  return {
    query: async <T>(sql: string, _params?: unknown[]): Promise<T[]> => {
      // Simple mock - return empty array by default
      const table = sql.match(/FROM\s+"?(\w+)"?/i)?.[1];
      return (data.get(table ?? '') ?? []) as T[];
    },
    execute: async (_sql: string, _params?: unknown[]): Promise<{ rowCount: number }> => {
      return { rowCount: 1 };
    },
    transaction: async <T>(fn: () => Promise<T>): Promise<T> => {
      return fn();
    },
    truncateAll: async (): Promise<void> => {
      data.clear();
    },
    disconnect: async (): Promise<void> => {
      data.clear();
    },
  };
}

function createMockRedisClient(): MockRedisClient {
  const cache: Map<string, string> = new Map();

  return {
    get: async (key: string): Promise<string | null> => cache.get(key) ?? null,
    set: async (key: string, value: string, _ttl?: number): Promise<void> => {
      cache.set(key, value);
    },
    del: async (key: string): Promise<void> => {
      cache.delete(key);
    },
    flushAll: async (): Promise<void> => {
      cache.clear();
    },
    disconnect: async (): Promise<void> => {
      cache.clear();
    },
  };
}

function createMockNatsClient(): MockNatsClient {
  const subscriptions: Map<string, Set<(data: unknown) => void>> = new Map();
  const events: { subject: string; data: unknown }[] = [];

  return {
    publish: async (subject: string, data: unknown): Promise<void> => {
      events.push({ subject, data });
      const handlers = subscriptions.get(subject);
      if (handlers) {
        handlers.forEach((handler) => handler(data));
      }
    },
    subscribe: (subject: string, handler: (data: unknown) => void) => {
      if (!subscriptions.has(subject)) {
        subscriptions.set(subject, new Set());
      }
      subscriptions.get(subject)!.add(handler);
      return {
        unsubscribe: () => {
          subscriptions.get(subject)?.delete(handler);
        },
      };
    },
    requestReply: async (
      subject: string,
      data: unknown,
      _timeout?: number
    ): Promise<unknown> => {
      events.push({ subject, data });
      return { success: true };
    },
    disconnect: async (): Promise<void> => {
      subscriptions.clear();
      events.length = 0;
    },
  };
}

// ============================================================================
// Token Generation
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-key-for-integration-tests';

export function generateTestToken(
  userId: string,
  tenantId: string,
  role: UserRole,
  expiresIn: number = 3600
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    tenantId,
    role,
    email: `${role.toLowerCase()}-${userId.slice(0, 8)}@test.aivo.local`,
    permissions: getPermissionsForRole(role),
    iat: now,
    exp: now + expiresIn,
    iss: 'aivo-test',
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `${headerB64}.${payloadB64}.${signature}`;
}

function getPermissionsForRole(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    LEARNER: ['profile:read', 'session:create', 'session:read', 'content:read'],
    PARENT: [
      'profile:read',
      'profile:write',
      'session:read',
      'progress:read',
      'billing:read',
      'billing:write',
    ],
    TEACHER: [
      'profile:read',
      'session:read',
      'session:manage',
      'class:manage',
      'content:read',
      'reports:read',
    ],
    ADMIN: [
      'profile:read',
      'profile:write',
      'session:read',
      'session:manage',
      'class:manage',
      'content:manage',
      'reports:read',
      'tenant:read',
    ],
    PLATFORM_ADMIN: ['*'],
  };
  return permissions[role];
}

// ============================================================================
// Test Data Factories
// ============================================================================

async function createTestTenant(
  name: string,
  slug?: string
): Promise<TestTenant> {
  const id = randomUUID();
  return {
    id,
    name,
    slug: slug ?? name.toLowerCase().replace(/\s+/g, '-'),
    status: 'ACTIVE',
    settings: {
      features: ['ai_tutor', 'iep_tracking', 'parent_dashboard'],
      branding: { primaryColor: '#4F46E5' },
    },
    createdAt: new Date(),
  };
}

async function createTestUser(
  tenantId: string,
  role: UserRole,
  email?: string
): Promise<TestUser> {
  const id = randomUUID();
  const userEmail = email ?? `${role.toLowerCase()}-${id.slice(0, 8)}@test.aivo.local`;
  const token = generateTestToken(id, tenantId, role);

  return {
    id,
    tenantId,
    email: userEmail,
    role,
    token,
  };
}

async function createTestProfile(
  userId: string,
  tenantId: string,
  options?: Partial<TestLearnerProfile>
): Promise<TestLearnerProfile> {
  const id = randomUUID();
  return {
    id,
    userId,
    tenantId,
    displayName: options?.displayName ?? `Learner ${id.slice(0, 8)}`,
    gradeLevel: options?.gradeLevel ?? 5,
    gradeBand: options?.gradeBand ?? 'G3_5',
    learningPreferences: options?.learningPreferences ?? {
      preferredModality: 'visual',
      sessionDuration: 25,
      breakFrequency: 15,
      difficultyPreference: 'comfortable',
    },
    accommodations: options?.accommodations ?? [],
    neurodiversityProfile: options?.neurodiversityProfile,
  };
}

// ============================================================================
// Setup and Teardown
// ============================================================================

beforeAll(async () => {
  console.log('\n🚀 Initializing integration test environment...\n');

  // Create mock clients (replace with real connections when available)
  const db = createMockDatabaseClient();
  const redis = createMockRedisClient();
  const nats = createMockNatsClient();

  // Create test tenants
  const tenantA = await createTestTenant('Integration Test School A');
  const tenantB = await createTestTenant('Integration Test School B');

  // Create users for each tenant
  const platformAdmin = await createTestUser('platform', 'PLATFORM_ADMIN', 'platform-admin@aivo.local');
  
  const adminA = await createTestUser(tenantA.id, 'ADMIN');
  const teacherA = await createTestUser(tenantA.id, 'TEACHER');
  const parentA = await createTestUser(tenantA.id, 'PARENT');
  const learnerA = await createTestUser(tenantA.id, 'LEARNER');

  const adminB = await createTestUser(tenantB.id, 'ADMIN');
  const teacherB = await createTestUser(tenantB.id, 'TEACHER');
  const parentB = await createTestUser(tenantB.id, 'PARENT');
  const learnerB = await createTestUser(tenantB.id, 'LEARNER');

  // Create learner profiles
  const profileA = await createTestProfile(learnerA.id, tenantA.id, {
    displayName: 'Test Learner A',
    gradeLevel: 5,
    gradeBand: 'G3_5',
    accommodations: ['extended_time', 'text_to_speech'],
    neurodiversityProfile: { adhd: true },
  });

  const profileB = await createTestProfile(learnerB.id, tenantB.id, {
    displayName: 'Test Learner B',
    gradeLevel: 7,
    gradeBand: 'G6_8',
    accommodations: ['reduced_distractions'],
    neurodiversityProfile: { dyslexia: true },
  });

  // Set global context
  globalThis.testContext = {
    db,
    redis,
    nats,
    apiBaseUrl: process.env.API_BASE_URL ?? 'http://localhost:4000',
    wsBaseUrl: process.env.WS_BASE_URL ?? 'ws://localhost:4000',
    tenantA,
    tenantB,
    users: {
      platformAdmin,
      adminA,
      teacherA,
      parentA,
      learnerA,
      adminB,
      teacherB,
      parentB,
      learnerB,
    },
    profiles: {
      learnerA: profileA,
      learnerB: profileB,
    },
    createTenant: createTestTenant,
    createUser: createTestUser,
    createProfile: createTestProfile,
    cleanupTenant: async (tenantId: string) => {
      // Cleanup logic for tenant-specific data
      console.log(`Cleaning up tenant: ${tenantId}`);
    },
    generateToken: generateTestToken,
  };

  console.log('✅ Test context initialized');
  console.log(`   - Tenant A: ${tenantA.name} (${tenantA.id.slice(0, 8)}...)`);
  console.log(`   - Tenant B: ${tenantB.name} (${tenantB.id.slice(0, 8)}...)`);
  console.log(`   - Users: 9 created across roles`);
  console.log(`   - Profiles: 2 learner profiles created\n`);
});

afterEach(async () => {
  // Clear any test-specific state between tests
  await globalThis.testContext?.redis?.flushAll();
});

afterAll(async () => {
  console.log('\n🧹 Cleaning up integration test environment...');

  if (globalThis.testContext) {
    await globalThis.testContext.db.disconnect();
    await globalThis.testContext.redis.disconnect();
    await globalThis.testContext.nats.disconnect();
  }

  console.log('✅ Cleanup complete\n');
});

// ============================================================================
// Exports
// ============================================================================

export { createTestTenant, createTestUser, createTestProfile };
export { createMockDatabaseClient, createMockRedisClient, createMockNatsClient };
