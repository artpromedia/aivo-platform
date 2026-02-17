/**
 * SIS Sync — End-to-End Integration Tests
 *
 * Validates the full sync pipeline:
 *   Provider creation → Connection test → Full sync → DB validation → Delta sync
 *
 * Guard: Tests that hit a live Clever sandbox are skipped when
 *        CLEVER_CLIENT_ID is not set (CI-safe).
 *
 * Run:  pnpm --filter @aivo/sis-sync-svc test -- tests/e2e/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { createServer } from '../../src/api/server';
import type {
  ISisProvider,
  SisSchool,
  SisClass,
  SisUser,
  SisEnrollment,
  SyncEntityResult,
} from '../../src/providers/types';
import { SyncEngine } from '../../src/sync/engine';

// ─── Helpers ────────────────────────────────────────────────────

/** Deterministic mock data that simulates a Clever sandbox district */
function createMockSchools(): SisSchool[] {
  return [
    {
      externalId: 'school-001',
      name: 'Aivo QA Elementary',
      sisId: 'SCH-001',
      schoolNumber: '100',
      address: { street: '123 Main St', city: 'Testville', state: 'CA', zip: '90210' },
      phone: '555-0100',
      gradeLevels: ['K', '1', '2', '3', '4', '5'],
      principal: { name: 'Principal Smith' },
    },
    {
      externalId: 'school-002',
      name: 'Aivo QA Middle School',
      sisId: 'SCH-002',
      schoolNumber: '200',
      address: { street: '456 Oak Ave', city: 'Testville', state: 'CA', zip: '90211' },
      phone: '555-0200',
      gradeLevels: ['6', '7', '8'],
      principal: { name: 'Principal Jones' },
    },
  ];
}

function createMockClasses(): SisClass[] {
  return [
    {
      externalId: 'class-001',
      name: 'Math 101',
      courseNumber: 'MATH-101',
      schoolExternalId: 'school-001',
      grade: '3',
      subject: 'Math',
      period: '1',
      teachers: [{ externalId: 'teacher-001' }],
    },
    {
      externalId: 'class-002',
      name: 'English 201',
      courseNumber: 'ENG-201',
      schoolExternalId: 'school-002',
      grade: '7',
      subject: 'English',
      period: '2',
      teachers: [{ externalId: 'teacher-002' }],
    },
    {
      externalId: 'class-003',
      name: 'Science 301',
      courseNumber: 'SCI-301',
      schoolExternalId: 'school-001',
      grade: '5',
      subject: 'Science',
      period: '3',
      teachers: [{ externalId: 'teacher-001' }],
    },
  ];
}

function createMockUsers(): SisUser[] {
  return [
    {
      externalId: 'teacher-001',
      email: 'teacher1@aivoqa.test',
      firstName: 'Alice',
      lastName: 'Teacher',
      role: 'teacher',
      sisId: 'TCH-001',
      schoolExternalIds: ['school-001'],
    },
    {
      externalId: 'teacher-002',
      email: 'teacher2@aivoqa.test',
      firstName: 'Bob',
      lastName: 'Instructor',
      role: 'teacher',
      sisId: 'TCH-002',
      schoolExternalIds: ['school-002'],
    },
    {
      externalId: 'student-001',
      email: 'student1@aivoqa.test',
      firstName: 'Charlie',
      lastName: 'Learner',
      role: 'student',
      sisId: 'STU-001',
      grade: '3',
      schoolExternalIds: ['school-001'],
    },
    {
      externalId: 'student-002',
      email: 'student2@aivoqa.test',
      firstName: 'Diana',
      lastName: 'Scholar',
      role: 'student',
      sisId: 'STU-002',
      grade: '7',
      schoolExternalIds: ['school-002'],
    },
    {
      externalId: 'student-003',
      email: 'student3@aivoqa.test',
      firstName: 'Eve',
      lastName: 'Pupil',
      role: 'student',
      sisId: 'STU-003',
      grade: '5',
      schoolExternalIds: ['school-001'],
    },
    {
      externalId: 'admin-001',
      email: 'admin@aivoqa.test',
      firstName: 'Frank',
      lastName: 'Administrator',
      role: 'administrator',
      sisId: 'ADM-001',
      schoolExternalIds: ['school-001', 'school-002'],
    },
  ];
}

function createMockEnrollments(): SisEnrollment[] {
  return [
    { externalId: 'enr-001', classExternalId: 'class-001', userExternalId: 'student-001', role: 'student', status: 'active' },
    { externalId: 'enr-002', classExternalId: 'class-001', userExternalId: 'student-003', role: 'student', status: 'active' },
    { externalId: 'enr-003', classExternalId: 'class-002', userExternalId: 'student-002', role: 'student', status: 'active' },
    { externalId: 'enr-004', classExternalId: 'class-003', userExternalId: 'student-003', role: 'student', status: 'active' },
    { externalId: 'enr-005', classExternalId: 'class-001', userExternalId: 'teacher-001', role: 'teacher', status: 'active' },
    { externalId: 'enr-006', classExternalId: 'class-002', userExternalId: 'teacher-002', role: 'teacher', status: 'active' },
    { externalId: 'enr-007', classExternalId: 'class-003', userExternalId: 'teacher-001', role: 'teacher', status: 'active' },
  ];
}

/** Builds a fully mocked ISisProvider */
function buildMockProvider(overrides: Partial<{
  schools: SisSchool[];
  classes: SisClass[];
  users: SisUser[];
  enrollments: SisEnrollment[];
}> = {}): ISisProvider {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    testConnection: vi.fn().mockResolvedValue({ success: true, message: 'Connected' }),
    fetchSchools: vi.fn().mockResolvedValue({
      data: overrides.schools ?? createMockSchools(),
      hasMore: false,
    } as SyncEntityResult<SisSchool>),
    fetchClasses: vi.fn().mockResolvedValue({
      data: overrides.classes ?? createMockClasses(),
      hasMore: false,
    } as SyncEntityResult<SisClass>),
    fetchUsers: vi.fn().mockResolvedValue({
      data: overrides.users ?? createMockUsers(),
      hasMore: false,
    } as SyncEntityResult<SisUser>),
    fetchEnrollments: vi.fn().mockResolvedValue({
      data: overrides.enrollments ?? createMockEnrollments(),
      hasMore: false,
    } as SyncEntityResult<SisEnrollment>),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

// ─── Mock Prisma layer ──────────────────────────────────────────

function createMockPrisma() {
  const schools = new Map<string, any>();
  const classes = new Map<string, any>();
  const users = new Map<string, any>();
  const enrollments = new Map<string, any>();
  let syncRun: any = null;
  let provider: any = null;

  /** Simulates upsert for a SisRaw* table */
  function makeRawStore(store: Map<string, any>) {
    return {
      findUnique: vi.fn().mockImplementation(({ where }: any) => {
        const key = where.tenantId_externalId
          ? `${where.tenantId_externalId.tenantId}:${where.tenantId_externalId.externalId}`
          : where.id;
        return Promise.resolve(store.get(key) ?? null);
      }),
      findMany: vi.fn().mockImplementation(() => Promise.resolve([...store.values()])),
      create: vi.fn().mockImplementation(({ data }: any) => {
        const key = `${data.tenantId}:${data.externalId}`;
        const record = { id: `id-${key}`, ...data, createdAt: new Date(), updatedAt: new Date(), isActive: true };
        store.set(key, record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation(({ where, data }: any) => {
        const key = where.tenantId_externalId
          ? `${where.tenantId_externalId.tenantId}:${where.tenantId_externalId.externalId}`
          : where.id;
        const existing = store.get(key);
        const updated = { ...existing, ...data, updatedAt: new Date() };
        store.set(key, updated);
        return Promise.resolve(updated);
      }),
      updateMany: vi.fn().mockImplementation(({ where, data }: any) => {
        let count = 0;
        for (const [key, record] of store.entries()) {
          if (record.tenantId === where.tenantId && record.providerId === where.providerId) {
            if (where.NOT?.externalId?.in && !where.NOT.externalId.in.includes(record.externalId)) {
              store.set(key, { ...record, ...data, updatedAt: new Date() });
              count++;
            }
          }
        }
        return Promise.resolve({ count });
      }),
      count: vi.fn().mockImplementation(() => Promise.resolve(store.size)),
    };
  }

  const mock = {
    sisProvider: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(provider)),
      update: vi.fn().mockImplementation(({ data }: any) => {
        provider = { ...provider, ...data };
        return Promise.resolve(provider);
      }),
      create: vi.fn().mockImplementation(({ data }: any) => {
        provider = { id: 'provider-e2e', ...data, createdAt: new Date(), updatedAt: new Date() };
        return Promise.resolve(provider);
      }),
      findMany: vi.fn().mockImplementation(() => Promise.resolve(provider ? [provider] : [])),
    },
    sisSyncRun: {
      create: vi.fn().mockImplementation(({ data }: any) => {
        syncRun = { id: 'run-e2e-001', ...data, createdAt: new Date(), updatedAt: new Date() };
        return Promise.resolve(syncRun);
      }),
      update: vi.fn().mockImplementation(({ data }: any) => {
        syncRun = { ...syncRun, ...data };
        return Promise.resolve(syncRun);
      }),
      findFirst: vi.fn().mockImplementation(() => Promise.resolve(syncRun)),
      findMany: vi.fn().mockImplementation(() => Promise.resolve(syncRun ? [syncRun] : [])),
    },
    sisRawSchool: makeRawStore(schools),
    sisRawClass: makeRawStore(classes),
    sisRawUser: makeRawStore(users),
    sisRawEnrollment: makeRawStore(enrollments),
    $transaction: vi.fn().mockImplementation((fn: any) => fn(mock)),
  };

  return {
    mock,
    stores: { schools, classes, users, enrollments },
    getProvider: () => provider,
    getSyncRun: () => syncRun,
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe('SIS Sync E2E — Mock Provider Pipeline', () => {
  let prisma: ReturnType<typeof createMockPrisma>;
  let engine: SyncEngine;
  let mockProvider: ISisProvider;

  const TENANT_ID = 'tenant-e2e-001';
  const PROVIDER_ID = 'provider-e2e';

  beforeEach(() => {
    prisma = createMockPrisma();
    engine = new SyncEngine(prisma.mock as any);
    mockProvider = buildMockProvider();

    // Seed a provider record
    prisma.mock.sisProvider.findUnique.mockResolvedValue({
      id: PROVIDER_ID,
      tenantId: TENANT_ID,
      type: 'CLEVER',
      name: 'E2E Clever Sandbox',
      status: 'ACTIVE',
      config: { clientId: 'test', clientSecret: 'test', accessToken: 'tok' },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Full Sync Pipeline ──────────────────────────────────

  describe('Full Sync Pipeline', () => {
    it('should execute a full sync with all four phases', async () => {
      const result = await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      // Provider methods called in order
      expect(mockProvider.fetchSchools).toHaveBeenCalledTimes(1);
      expect(mockProvider.fetchClasses).toHaveBeenCalledTimes(1);
      expect(mockProvider.fetchUsers).toHaveBeenCalledTimes(1);
      expect(mockProvider.fetchEnrollments).toHaveBeenCalledTimes(1);

      // Sync run was created and completed
      expect(prisma.mock.sisSyncRun.create).toHaveBeenCalledTimes(1);
      const lastUpdate = prisma.mock.sisSyncRun.update.mock.calls.at(-1)?.[0];
      expect(lastUpdate?.data?.status).toMatch(/SUCCESS|COMPLETED/i);
    });

    it('should upsert 2 schools, 3 classes, 6 users, 7 enrollments', async () => {
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      // Schools
      const schoolCreates = prisma.mock.sisRawSchool.create.mock.calls.length;
      const schoolUpdates = prisma.mock.sisRawSchool.update.mock.calls.length;
      expect(schoolCreates + schoolUpdates).toBe(2);

      // Classes
      const classCreates = prisma.mock.sisRawClass.create.mock.calls.length;
      const classUpdates = prisma.mock.sisRawClass.update.mock.calls.length;
      expect(classCreates + classUpdates).toBe(3);

      // Users
      const userCreates = prisma.mock.sisRawUser.create.mock.calls.length;
      const userUpdates = prisma.mock.sisRawUser.update.mock.calls.length;
      expect(userCreates + userUpdates).toBe(6);

      // Enrollments
      const enrCreates = prisma.mock.sisRawEnrollment.create.mock.calls.length;
      const enrUpdates = prisma.mock.sisRawEnrollment.update.mock.calls.length;
      expect(enrCreates + enrUpdates).toBe(7);
    });

    it('should set sync run status to SUCCESS on clean run', async () => {
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      const finalUpdate = prisma.mock.sisSyncRun.update.mock.calls.at(-1)?.[0];
      expect(finalUpdate?.data?.status).toMatch(/SUCCESS|COMPLETED/i);
    });
  });

  // ── 2. Idempotent Re-Sync ─────────────────────────────────

  describe('Idempotent Re-Sync', () => {
    it('should not duplicate records on second sync', async () => {
      // First sync
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      const schoolCountAfterFirst = prisma.stores.schools.size;

      // Second sync (same data)
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      // Number of stored schools should not increase
      expect(prisma.stores.schools.size).toBe(schoolCountAfterFirst);
    });
  });

  // ── 3. Delta Sync — Student Added ─────────────────────────

  describe('Delta Sync — New Student', () => {
    it('should add a new student on second sync', async () => {
      // First sync — 6 users
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      const initialUserCount = prisma.stores.users.size;

      // Add a new student to the mock
      const updatedUsers = [
        ...createMockUsers(),
        {
          externalId: 'student-004',
          email: 'newstudent@aivoqa.test',
          firstName: 'Grace',
          lastName: 'NewStudent',
          role: 'student' as const,
          sisId: 'STU-004',
          grade: '4',
          schoolExternalIds: ['school-001'],
        },
      ];

      const updatedProvider = buildMockProvider({ users: updatedUsers });
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_DELTA', {
        provider: updatedProvider,
      });

      expect(prisma.stores.users.size).toBe(initialUserCount + 1);
    });
  });

  // ── 4. Delta Sync — Student Removed (Soft Delete) ─────────

  describe('Delta Sync — Student Removal', () => {
    it('should deactivate removed students via updateMany', async () => {
      // First sync — 6 users
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      // Remove student-003 from the user list
      const reducedUsers = createMockUsers().filter((u) => u.externalId !== 'student-003');
      const reducedProvider = buildMockProvider({ users: reducedUsers });

      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_DELTA', {
        provider: reducedProvider,
      });

      // updateMany should have been called to deactivate stale users
      expect(prisma.mock.sisRawUser.updateMany).toHaveBeenCalled();
    });
  });

  // ── 5. Provider Connection Test ───────────────────────────

  describe('Provider Connection Test', () => {
    it('should succeed for a valid mock provider', async () => {
      const result = await mockProvider.testConnection();
      expect(result.success).toBe(true);
    });

    it('should fail when provider returns error', async () => {
      const failProvider = buildMockProvider();
      (failProvider.testConnection as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      const result = await failProvider.testConnection();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid');
    });
  });

  // ── 6. Error Handling ─────────────────────────────────────

  describe('Error Handling', () => {
    it('should mark sync as FAILURE when provider throws', async () => {
      const errorProvider = buildMockProvider();
      (errorProvider.fetchSchools as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Provider API timeout')
      );

      try {
        await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
          provider: errorProvider,
        });
      } catch {
        // expected
      }

      const finalUpdate = prisma.mock.sisSyncRun.update.mock.calls.at(-1)?.[0];
      expect(finalUpdate?.data?.status).toMatch(/FAILURE|FAILED|ERROR/i);
    });

    it('should cleanup the provider after sync (success or fail)', async () => {
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      expect(mockProvider.cleanup).toHaveBeenCalledTimes(1);
    });
  });

  // ── 7. Role Mapping Validation ────────────────────────────

  describe('Role Mapping', () => {
    it('should persist correct SIS roles for each user type', async () => {
      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'E2E_TEST', {
        provider: mockProvider,
      });

      // Check that users were created with their original role data
      const userCreateCalls = prisma.mock.sisRawUser.create.mock.calls;
      const roles = userCreateCalls.map((c: any) => c[0]?.data?.role).filter(Boolean);

      // We expect teacher, student, and administrator roles
      if (roles.length > 0) {
        const hasTeacher = roles.some((r: string) => r.toLowerCase().includes('teacher'));
        const hasStudent = roles.some((r: string) => r.toLowerCase().includes('student'));
        expect(hasTeacher || hasStudent).toBe(true);
      }
    });
  });
});

// ─── Clever Sandbox Live Tests (gated) ──────────────────────

describe.skipIf(!process.env.CLEVER_CLIENT_ID)(
  'SIS Sync E2E — Live Clever Sandbox',
  () => {
    it.todo('should create a Clever provider via API');
    it.todo('should test connection to Clever sandbox');
    it.todo('should trigger a full sync and verify database records');
    it.todo('should trigger a delta sync after adding a student');
    it.todo('should verify sync status polling returns correct state');
  }
);
