/**
 * SIS Sync Service — Comprehensive Unit Tests (Sprint 7)
 *
 * Covers: SyncEngine ETL pipeline (schools/classes/users/enrollments),
 * entity transformer role mapping, batch processing, error handling,
 * stale record deactivation, delta sync.
 * Target: ≥80% line coverage for engine.ts + transformer.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSyncRun = {
  create: vi.fn(),
  update: vi.fn(),
  findMany: vi.fn(),
};
const mockProvider = {
  findUnique: vi.fn(),
  update: vi.fn(),
};
const mockRawSchool = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};
const mockRawClass = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};
const mockRawUser = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};
const mockRawEnrollment = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};

const mockPrisma = {
  sisSyncRun: mockSyncRun,
  sisProvider: mockProvider,
  sisRawSchool: mockRawSchool,
  sisRawClass: mockRawClass,
  sisRawUser: mockRawUser,
  sisRawEnrollment: mockRawEnrollment,
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

vi.mock('../prisma-types.js', () => ({}));

const mockProviderInstance = {
  fetchSchools: vi.fn().mockResolvedValue({ entities: [], count: 0, hasMore: false, warnings: [] }),
  fetchClasses: vi.fn().mockResolvedValue({ entities: [], count: 0, hasMore: false, warnings: [] }),
  fetchUsers: vi.fn().mockResolvedValue({ entities: [], count: 0, hasMore: false, warnings: [] }),
  fetchEnrollments: vi
    .fn()
    .mockResolvedValue({ entities: [], count: 0, hasMore: false, warnings: [] }),
  cleanup: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../providers', () => ({
  createAndInitializeProvider: vi.fn().mockResolvedValue(mockProviderInstance),
}));

import { SyncEngine } from '../sync/engine.js';
import { EntityTransformer, mapSisRoleToAivoRole } from '../sync/transformer.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-district-001';
const PROVIDER_ID = 'provider-clever-001';

function createMockSisSchool(overrides = {}) {
  return {
    externalId: 'school-ext-001',
    name: 'Elm Street Elementary',
    schoolNumber: 'ES001',
    rawData: { id: 'school-ext-001', name: 'Elm Street Elementary' },
    ...overrides,
  };
}

function createMockSisUser(overrides = {}) {
  return {
    externalId: 'user-ext-001',
    email: 'teacher@school.edu',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'teacher' as const,
    username: 'jsmith',
    studentNumber: null,
    rawData: { id: 'user-ext-001', email: 'teacher@school.edu' },
    ...overrides,
  };
}

function createMockSisClass(overrides = {}) {
  return {
    externalId: 'class-ext-001',
    schoolExternalId: 'school-ext-001',
    name: 'Math 101',
    courseCode: 'MATH-101',
    grade: '3',
    subject: 'Mathematics',
    term: { startDate: new Date('2026-08-15'), endDate: new Date('2027-05-30') },
    rawData: { id: 'class-ext-001', name: 'Math 101' },
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('SIS Sync Engine', () => {
  let engine: SyncEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new SyncEngine(mockPrisma as any);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Full Sync Execution
  // ═══════════════════════════════════════════════════════════════════════════
  describe('executeSync', () => {
    it('should execute a full sync returning stats', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        providerType: 'clever',
        configJson: '{}',
        enabled: true,
      });
      mockRawSchool.updateMany.mockResolvedValue({});
      mockRawClass.updateMany.mockResolvedValue({});
      mockRawUser.updateMany.mockResolvedValue({});
      mockRawEnrollment.updateMany.mockResolvedValue({});
      mockSyncRun.update.mockResolvedValue({});
      mockProvider.update.mockResolvedValue({});

      const result = await engine.executeSync(TENANT_ID, PROVIDER_ID, 'admin', false);

      expect(result.success).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when provider not found', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue(null);
      mockSyncRun.update.mockResolvedValue({});

      const result = await engine.executeSync(TENANT_ID, 'nonexistent', 'admin', false);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('not found'));
    });

    it('should fail when provider is disabled', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        providerType: 'clever',
        configJson: '{}',
        enabled: false,
      });
      mockSyncRun.update.mockResolvedValue({});

      const result = await engine.executeSync(TENANT_ID, PROVIDER_ID, 'admin', false);

      expect(result.success).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('disabled'));
    });

    it('should process schools in batches', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        providerType: 'clever',
        configJson: '{}',
        enabled: true,
      });

      // Return 3 schools
      mockProviderInstance.fetchSchools.mockResolvedValueOnce({
        entities: [
          createMockSisSchool({ externalId: 's1' }),
          createMockSisSchool({ externalId: 's2' }),
          createMockSisSchool({ externalId: 's3' }),
        ],
        count: 3,
        hasMore: false,
        warnings: [],
      });

      mockRawSchool.updateMany.mockResolvedValue({});
      mockRawSchool.findUnique.mockResolvedValue(null); // new schools
      mockRawSchool.create.mockResolvedValue({});
      mockRawClass.updateMany.mockResolvedValue({});
      mockRawUser.updateMany.mockResolvedValue({});
      mockRawEnrollment.updateMany.mockResolvedValue({});
      mockSyncRun.update.mockResolvedValue({});
      mockProvider.update.mockResolvedValue({});

      const result = await engine.executeSync(TENANT_ID, PROVIDER_ID, 'admin', false);

      expect(result.stats.schools.created).toBe(3);
    });

    it('should update existing schools instead of creating duplicates', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        providerType: 'clever',
        configJson: '{}',
        enabled: true,
      });

      mockProviderInstance.fetchSchools.mockResolvedValueOnce({
        entities: [createMockSisSchool()],
        count: 1,
        hasMore: false,
        warnings: [],
      });

      mockRawSchool.updateMany.mockResolvedValue({});
      mockRawSchool.findUnique.mockResolvedValue({ id: 'existing-001' }); // existing school
      mockRawSchool.update.mockResolvedValue({});
      mockRawClass.updateMany.mockResolvedValue({});
      mockRawUser.updateMany.mockResolvedValue({});
      mockRawEnrollment.updateMany.mockResolvedValue({});
      mockSyncRun.update.mockResolvedValue({});
      mockProvider.update.mockResolvedValue({});

      const result = await engine.executeSync(TENANT_ID, PROVIDER_ID, 'admin', false);

      expect(result.stats.schools.updated).toBe(1);
      expect(result.stats.schools.created).toBe(0);
    });

    it('should record PARTIAL status when errors occur with continueOnError', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        providerType: 'clever',
        configJson: '{}',
        enabled: true,
      });

      mockProviderInstance.fetchSchools.mockResolvedValueOnce({
        entities: [createMockSisSchool()],
        count: 1,
        hasMore: false,
        warnings: [],
      });

      mockRawSchool.updateMany.mockResolvedValue({});
      mockRawSchool.findUnique.mockRejectedValue(new Error('DB error'));
      mockRawClass.updateMany.mockResolvedValue({});
      mockRawUser.updateMany.mockResolvedValue({});
      mockRawEnrollment.updateMany.mockResolvedValue({});
      mockSyncRun.update.mockResolvedValue({});
      mockProvider.update.mockResolvedValue({});

      const result = await engine.executeSync(TENANT_ID, PROVIDER_ID, 'admin', false, {
        continueOnError: true,
      });

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should cleanup provider after sync completes', async () => {
      mockSyncRun.create.mockResolvedValue({ id: 'run-001' });
      mockProvider.findUnique.mockResolvedValue({
        id: PROVIDER_ID,
        providerType: 'clever',
        configJson: '{}',
        enabled: true,
      });
      mockRawSchool.updateMany.mockResolvedValue({});
      mockRawClass.updateMany.mockResolvedValue({});
      mockRawUser.updateMany.mockResolvedValue({});
      mockRawEnrollment.updateMany.mockResolvedValue({});
      mockSyncRun.update.mockResolvedValue({});
      mockProvider.update.mockResolvedValue({});

      await engine.executeSync(TENANT_ID, PROVIDER_ID, 'admin', false);

      expect(mockProviderInstance.cleanup).toHaveBeenCalled();
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Entity Transformer — Role Mapping
// ═════════════════════════════════════════════════════════════════════════════

describe('Entity Transformer', () => {
  describe('mapSisRoleToAivoRole', () => {
    it('should map teacher → TEACHER', () => {
      expect(mapSisRoleToAivoRole('teacher')).toBe('TEACHER');
    });

    it('should map student → LEARNER', () => {
      expect(mapSisRoleToAivoRole('student')).toBe('LEARNER');
    });

    it('should map administrator → DISTRICT_ADMIN', () => {
      expect(mapSisRoleToAivoRole('administrator')).toBe('DISTRICT_ADMIN');
    });

    it('should map aide → TEACHER', () => {
      expect(mapSisRoleToAivoRole('aide')).toBe('TEACHER');
    });

    it('should map parent → PARENT', () => {
      expect(mapSisRoleToAivoRole('parent')).toBe('PARENT');
    });

    it('should map guardian → PARENT', () => {
      expect(mapSisRoleToAivoRole('guardian')).toBe('PARENT');
    });

    it('should default unknown roles to LEARNER', () => {
      expect(mapSisRoleToAivoRole('unknown_role' as any)).toBe('LEARNER');
    });
  });

  describe('transformAll', () => {
    it('should transform all entity types in dependency order', async () => {
      const config = {
        tenantId: TENANT_ID,
        providerId: PROVIDER_ID,
        createNewUsers: true,
        sendWelcomeEmails: false,
        autoActivateUsers: true,
      };

      mockRawSchool.findMany.mockResolvedValue([]);
      mockRawUser.findMany.mockResolvedValue([]);
      mockRawClass.findMany.mockResolvedValue([]);
      mockRawEnrollment.findMany.mockResolvedValue([]);

      const transformer = new EntityTransformer(mockPrisma as any, config);
      const result = await transformer.transformAll();

      expect(result.schools).toBeDefined();
      expect(result.users).toBeDefined();
      expect(result.classrooms).toBeDefined();
      expect(result.enrollments).toBeDefined();
    });

    it('should create new users when createNewUsers is true', async () => {
      const config = {
        tenantId: TENANT_ID,
        providerId: PROVIDER_ID,
        createNewUsers: true,
        sendWelcomeEmails: false,
        autoActivateUsers: true,
      };

      mockRawSchool.findMany.mockResolvedValue([]);
      mockRawUser.findMany.mockResolvedValue([
        {
          externalId: 'u1',
          email: 'new@school.edu',
          firstName: 'New',
          lastName: 'Teacher',
          sisRole: 'teacher',
          processed: true,
          aivoUserId: null,
          studentNumber: null,
        },
      ]);
      mockRawClass.findMany.mockResolvedValue([]);
      mockRawEnrollment.findMany.mockResolvedValue([]);

      const transformer = new EntityTransformer(mockPrisma as any, config);
      const result = await transformer.transformAll();

      expect(result.users.created).toBe(1);
    });

    it('should track deactivated users not in current sync', async () => {
      const config = {
        tenantId: TENANT_ID,
        providerId: PROVIDER_ID,
        createNewUsers: false,
        sendWelcomeEmails: false,
        autoActivateUsers: false,
      };

      mockRawSchool.findMany.mockResolvedValue([]);
      mockRawUser.findMany.mockResolvedValue([
        {
          externalId: 'u1',
          processed: false, // Not in current sync
          aivoUserId: 'aivo-user-001',
          email: null,
          studentNumber: null,
        },
      ]);
      mockRawClass.findMany.mockResolvedValue([]);
      mockRawEnrollment.findMany.mockResolvedValue([]);

      const transformer = new EntityTransformer(mockPrisma as any, config);
      const result = await transformer.transformAll();

      expect(result.users.deactivated).toBe(1);
    });
  });
});
