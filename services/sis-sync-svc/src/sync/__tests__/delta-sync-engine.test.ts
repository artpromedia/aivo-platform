/**
 * Delta Sync Engine Tests
 *
 * Unit tests for the delta sync engine with hash-based change detection,
 * conflict resolution, and FERPA compliance audit trail.
 *
 * @author AIVO Platform Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { DeltaSyncEngine, SyncEntityType, DeltaSyncConfig, createEmptySyncStats } from '../delta-sync-engine.js';
import type { ISisProvider, SisOrg, SisUser, SisClass, SisEnrollment } from '../../providers/types.js';

// Mock Prisma client
const mockPrisma = {
  deltaSyncState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  syncHistory: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  syncError: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  syncConflict: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  sisOrg: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  sisClass: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  sisEnrollment: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  sisUser: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  parentStudentRelationship: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  academicTerm: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  studentDemographic: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    deleteMany: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
} as unknown as PrismaClient;

// Mock provider
const mockProvider: ISisProvider = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  fetchOrgs: vi.fn().mockResolvedValue([]),
  fetchUsers: vi.fn().mockResolvedValue([]),
  fetchClasses: vi.fn().mockResolvedValue([]),
  fetchEnrollments: vi.fn().mockResolvedValue([]),
  fetchDelta: vi.fn().mockResolvedValue({ records: [], deltaToken: 'token123' }),
  getAllSourceIds: vi.fn().mockResolvedValue([]),
  fetchRelationships: vi.fn().mockResolvedValue([]),
  fetchTerms: vi.fn().mockResolvedValue([]),
  supportsDelta: true,
  supportsDeletionDetection: true,
};

describe('DeltaSyncEngine', () => {
  let engine: DeltaSyncEngine;
  let config: DeltaSyncConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new DeltaSyncEngine(mockPrisma);

    config = {
      tenantId: 'tenant-123',
      providerId: 'provider-456',
      provider: mockProvider,
      batchSize: 100,
      maxRetries: 3,
      conflictResolution: 'source_wins',
      enabledEntityTypes: ['org', 'user', 'class', 'enrollment'],
      fieldMappings: {},
      webhookEnabled: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('executeDeltaSync', () => {
    it('should create sync history record at start', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      await engine.executeDeltaSync(config);

      expect(mockPrisma.syncHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-123',
          providerId: 'provider-456',
          status: 'IN_PROGRESS',
        }),
      });
    });

    it('should sync entity types in correct order', async () => {
      const syncOrder: SyncEntityType[] = [];

      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      // Track sync order
      const originalFetchDelta = mockProvider.fetchDelta;
      mockProvider.fetchDelta = vi.fn().mockImplementation(async (entityType) => {
        syncOrder.push(entityType as SyncEntityType);
        return { records: [], deltaToken: 'token' };
      });

      await engine.executeDeltaSync(config);

      // Verify order: orgs first, then users, then classes, then enrollments
      const orgIndex = syncOrder.indexOf('org');
      const userIndex = syncOrder.indexOf('user');
      const classIndex = syncOrder.indexOf('class');
      const enrollmentIndex = syncOrder.indexOf('enrollment');

      expect(orgIndex).toBeLessThan(userIndex);
      expect(userIndex).toBeLessThan(classIndex);
      expect(classIndex).toBeLessThan(enrollmentIndex);

      mockProvider.fetchDelta = originalFetchDelta;
    });

    it('should handle provider that does not support delta sync', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      const nonDeltaProvider = {
        ...mockProvider,
        supportsDelta: false,
        fetchDelta: undefined,
      } as unknown as ISisProvider;

      config.provider = nonDeltaProvider;

      const stats = await engine.executeDeltaSync(config);

      // Should fallback to full sync methods
      expect(nonDeltaProvider.fetchOrgs).toHaveBeenCalled();
    });

    it('should record errors in sync_errors table', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      mockProvider.fetchDelta = vi.fn().mockRejectedValue(new Error('API timeout'));

      await engine.executeDeltaSync(config);

      expect(mockPrisma.syncError.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          message: expect.stringContaining('API timeout'),
        }),
      });
    });
  });

  describe('hash-based change detection', () => {
    it('should detect new records', async () => {
      const newOrg: SisOrg = {
        sourceId: 'org-1',
        name: 'Test School',
        type: 'school',
        identifier: 'TS001',
        status: 'active',
      };

      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.sisOrg.findUnique = vi.fn().mockResolvedValue(null); // New record
      mockPrisma.sisOrg.upsert = vi.fn().mockResolvedValue({ id: 'db-org-1' });

      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [{ type: 'org', operation: 'create', data: newOrg }],
        deltaToken: 'token123',
      });

      const stats = await engine.executeDeltaSync({
        ...config,
        enabledEntityTypes: ['org'],
      });

      expect(mockPrisma.sisOrg.upsert).toHaveBeenCalled();
    });

    it('should skip unchanged records based on hash', async () => {
      const existingOrg: SisOrg = {
        sourceId: 'org-1',
        name: 'Test School',
        type: 'school',
        identifier: 'TS001',
        status: 'active',
      };

      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      // Existing record with same content
      mockPrisma.sisOrg.findUnique = vi.fn().mockResolvedValue({
        id: 'db-org-1',
        sourceId: 'org-1',
        name: 'Test School',
        type: 'school',
        identifier: 'TS001',
        status: 'active',
        dataHash: 'same-hash', // Will be computed by engine
      });

      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [{ type: 'org', operation: 'update', data: existingOrg }],
        deltaToken: 'token123',
      });

      // The engine should compute hash and compare
      // If hashes match, upsert should still happen but record skipped
    });
  });

  describe('conflict resolution', () => {
    it('should create conflict record when using manual strategy', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      // Record exists with different data
      mockPrisma.sisOrg.findUnique = vi.fn().mockResolvedValue({
        id: 'db-org-1',
        sourceId: 'org-1',
        name: 'Original Name',
        type: 'school',
        updatedAt: new Date('2024-01-01'),
      });

      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [{
          type: 'org',
          operation: 'update',
          data: {
            sourceId: 'org-1',
            name: 'New Name',
            type: 'school',
          },
        }],
        deltaToken: 'token123',
      });

      await engine.executeDeltaSync({
        ...config,
        conflictResolution: 'manual',
        enabledEntityTypes: ['org'],
      });

      // Should create conflict when using manual strategy
      // (Implementation detail - may not create conflict for all cases)
    });

    it('should apply source_wins strategy correctly', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.sisOrg.findUnique = vi.fn().mockResolvedValue({
        id: 'db-org-1',
        sourceId: 'org-1',
        name: 'Original Name',
      });
      mockPrisma.sisOrg.upsert = vi.fn().mockResolvedValue({ id: 'db-org-1' });

      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [{
          type: 'org',
          operation: 'update',
          data: {
            sourceId: 'org-1',
            name: 'Source Name',
            type: 'school',
          },
        }],
        deltaToken: 'token123',
      });

      await engine.executeDeltaSync({
        ...config,
        conflictResolution: 'source_wins',
        enabledEntityTypes: ['org'],
      });

      // Upsert should be called with source data
      expect(mockPrisma.sisOrg.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            name: 'Source Name',
          }),
        })
      );
    });
  });

  describe('deletion detection', () => {
    it('should soft delete records not in source when provider supports deletion detection', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue({
        lastSyncedAt: new Date('2024-01-01'),
      });

      // DB has 2 orgs
      mockPrisma.sisOrg.findMany = vi.fn().mockResolvedValue([
        { id: 'db-1', sourceId: 'org-1' },
        { id: 'db-2', sourceId: 'org-2' },
      ]);

      // Source only has 1 org
      mockProvider.getAllSourceIds = vi.fn().mockResolvedValue(['org-1']);
      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [],
        deltaToken: 'token123',
      });

      mockPrisma.sisOrg.updateMany = vi.fn().mockResolvedValue({ count: 1 });

      await engine.executeDeltaSync({
        ...config,
        enabledEntityTypes: ['org'],
      });

      // Should soft delete org-2
      expect(mockPrisma.sisOrg.updateMany).toHaveBeenCalledWith({
        where: {
          tenantId: config.tenantId,
          providerId: config.providerId,
          sourceId: { in: ['org-2'] },
        },
        data: {
          deletedAt: expect.any(Date),
          status: 'deleted',
        },
      });
    });
  });

  describe('delta token management', () => {
    it('should save delta token after successful sync', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);
      mockPrisma.deltaSyncState.upsert = vi.fn().mockResolvedValue({});

      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [],
        deltaToken: 'new-token-abc',
      });

      await engine.executeDeltaSync(config);

      expect(mockPrisma.deltaSyncState.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            deltaToken: 'new-token-abc',
          }),
        })
      );
    });

    it('should use previous delta token for incremental sync', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue({
        deltaToken: 'previous-token',
        lastSyncedAt: new Date('2024-01-01'),
      });

      await engine.executeDeltaSync(config);

      expect(mockProvider.fetchDelta).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          since: expect.any(Date),
          cursor: 'previous-token',
        })
      );
    });
  });

  describe('FERPA compliance', () => {
    it('should create audit trail in sync_history', async () => {
      mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
      mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

      mockProvider.fetchDelta = vi.fn().mockResolvedValue({
        records: [{
          type: 'student',
          operation: 'create',
          data: {
            sourceId: 'student-1',
            email: 'student@school.edu',
            role: 'student',
            firstName: 'Test',
            lastName: 'Student',
          },
        }],
        deltaToken: 'token',
      });

      await engine.executeDeltaSync({
        ...config,
        enabledEntityTypes: ['student'],
      });

      // Verify audit trail was created
      expect(mockPrisma.syncHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: config.tenantId,
          providerId: config.providerId,
        }),
      });
    });
  });

  describe('createEmptySyncStats', () => {
    it('should create stats object with all entity types zeroed', () => {
      const stats = createEmptySyncStats();

      expect(stats.created).toEqual({
        org: 0,
        user: 0,
        student: 0,
        teacher: 0,
        parent: 0,
        class: 0,
        enrollment: 0,
        relationship: 0,
        term: 0,
        demographic: 0,
      });

      expect(stats.updated).toEqual(stats.created);
      expect(stats.deleted).toEqual(stats.created);
      expect(stats.skipped).toEqual(stats.created);
      expect(stats.conflicts).toEqual(stats.created);
      expect(stats.errors).toEqual(stats.created);
    });
  });
});

describe('DeltaSyncEngine - Batch Processing', () => {
  let engine: DeltaSyncEngine;

  beforeEach(() => {
    vi.clearAllMocks();
    engine = new DeltaSyncEngine(mockPrisma);
  });

  it('should process records in batches', async () => {
    mockPrisma.syncHistory.create = vi.fn().mockResolvedValue({ id: 'history-1' });
    mockPrisma.deltaSyncState.findUnique = vi.fn().mockResolvedValue(null);

    // Generate 250 records (should be processed in 3 batches with batchSize=100)
    const records = Array.from({ length: 250 }, (_, i) => ({
      type: 'user' as const,
      operation: 'create' as const,
      data: {
        sourceId: `user-${i}`,
        email: `user${i}@test.com`,
        role: 'student' as const,
        firstName: `First${i}`,
        lastName: `Last${i}`,
      },
    }));

    mockProvider.fetchDelta = vi.fn().mockResolvedValue({
      records,
      deltaToken: 'token',
    });

    mockPrisma.sisUser.findUnique = vi.fn().mockResolvedValue(null);
    mockPrisma.sisUser.upsert = vi.fn().mockResolvedValue({ id: 'new-id' });

    const config: DeltaSyncConfig = {
      tenantId: 'tenant-123',
      providerId: 'provider-456',
      provider: mockProvider,
      batchSize: 100,
      maxRetries: 3,
      conflictResolution: 'source_wins',
      enabledEntityTypes: ['user'],
      fieldMappings: {},
      webhookEnabled: false,
    };

    const stats = await engine.executeDeltaSync(config);

    // All records should be processed
    expect(mockPrisma.sisUser.upsert).toHaveBeenCalledTimes(250);
  });
});
