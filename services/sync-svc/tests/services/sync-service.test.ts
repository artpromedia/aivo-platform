import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { SyncService } from '../../src/services/sync-service.js';
import { ConflictResolver } from '../../src/services/conflict-resolver.js';
import {
  EntityType,
  SyncOperationType,
  ConflictResolutionStrategy,
  AuthContext,
  SyncOperation,
} from '../../src/types.js';

// Mock Prisma
vi.mock('../../src/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn((fn) => fn(mockPrisma)),
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    syncConflict: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    syncHistory: {
      create: vi.fn(),
    },
  },
}));

const mockPrisma = {
  $executeRaw: vi.fn(),
  $queryRaw: vi.fn(),
  syncConflict: {
    create: vi.fn(),
    update: vi.fn(),
  },
};

describe('SyncService', () => {
  let syncService: SyncService;
  let authContext: AuthContext;

  beforeEach(() => {
    syncService = new SyncService();
    authContext = {
      userId: 'user-1',
      tenantId: 'tenant-1',
      deviceId: 'device-1',
      roles: ['learner'],
    };
    vi.clearAllMocks();
  });

  describe('pushChanges', () => {
    it('should process CREATE operations successfully', async () => {
      const operations: SyncOperation[] = [
        {
          id: 'op-1',
          entityType: EntityType.LEARNING_SESSION,
          entityId: 'session-1',
          operation: SyncOperationType.CREATE,
          data: { lessonId: 'lesson-1', progress: 0 },
          timestamp: new Date().toISOString(),
          clientVersion: 1,
        },
      ];

      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce([]); // No existing entity
      (mockPrisma.$executeRaw as Mock).mockResolvedValueOnce(1); // Insert

      const result = await syncService.pushChanges(authContext, operations);

      expect(result.success).toBe(true);
      expect(result.processedCount).toBe(1);
      expect(result.acceptedOperations).toContain('op-1');
    });

    it('should detect conflicts for UPDATE operations', async () => {
      const operations: SyncOperation[] = [
        {
          id: 'op-1',
          entityType: EntityType.LEARNING_SESSION,
          entityId: 'session-1',
          operation: SyncOperationType.UPDATE,
          data: { progress: 0.5 },
          timestamp: new Date().toISOString(),
          clientVersion: 1,
        },
      ];

      // Server has newer version
      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce([
        { data: { progress: 0.7 }, version: 2 },
      ]);

      // Mock conflict creation
      (mockPrisma.syncConflict.create as Mock).mockResolvedValueOnce({
        id: 'conflict-1',
        entityType: EntityType.LEARNING_SESSION,
        entityId: 'session-1',
        clientData: { progress: 0.5 },
        serverData: { progress: 0.7 },
        clientVersion: 1,
        serverVersion: 2,
        clientDeviceId: 'device-1',
        status: 'pending',
        suggestedResolution: ConflictResolutionStrategy.LAST_WRITE_WINS,
        createdAt: new Date(),
      });

      const result = await syncService.pushChanges(authContext, operations);

      expect(result.success).toBe(false);
      expect(result.conflicts).toHaveLength(1);
      expect(result.rejectedOperations).toContainEqual({
        id: 'op-1',
        reason: 'conflict',
      });
    });

    it('should handle multiple operations in a batch', async () => {
      const operations: SyncOperation[] = [
        {
          id: 'op-1',
          entityType: EntityType.RESPONSE,
          entityId: 'response-1',
          operation: SyncOperationType.CREATE,
          data: { answer: 'A' },
          timestamp: new Date().toISOString(),
          clientVersion: 1,
        },
        {
          id: 'op-2',
          entityType: EntityType.RESPONSE,
          entityId: 'response-2',
          operation: SyncOperationType.CREATE,
          data: { answer: 'B' },
          timestamp: new Date().toISOString(),
          clientVersion: 1,
        },
      ];

      (mockPrisma.$queryRaw as Mock).mockResolvedValue([]); // No existing entities
      (mockPrisma.$executeRaw as Mock).mockResolvedValue(1); // Inserts

      const result = await syncService.pushChanges(authContext, operations);

      expect(result.processedCount).toBe(2);
      expect(result.acceptedOperations).toHaveLength(2);
    });
  });

  describe('pullChanges', () => {
    it('should return changes since last sync timestamp', async () => {
      const lastSync = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago

      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce([
        {
          id: 'session-1',
          data: { progress: 0.5 },
          version: 1,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      ]);

      const result = await syncService.pullChanges(
        authContext,
        lastSync,
        [EntityType.LEARNING_SESSION],
        100
      );

      expect(result.changes).toHaveLength(1);
      expect(result.changes[0].entityId).toBe('session-1');
    });

    it('should include deletions', async () => {
      const lastSync = new Date(Date.now() - 3600000).toISOString();

      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce([
        {
          id: 'session-1',
          data: {},
          version: 2,
          created_at: new Date(Date.now() - 7200000),
          updated_at: new Date(),
          deleted_at: new Date(),
        },
      ]);

      const result = await syncService.pullChanges(
        authContext,
        lastSync,
        [EntityType.LEARNING_SESSION],
        100
      );

      expect(result.deletions).toContain('session-1');
    });

    it('should paginate results', async () => {
      const items = Array.from({ length: 150 }, (_, i) => ({
        id: `session-${i}`,
        data: { progress: i / 150 },
        version: 1,
        created_at: new Date(),
        updated_at: new Date(Date.now() + i * 1000),
        deleted_at: null,
      }));

      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce(items.slice(0, 100));

      const result = await syncService.pullChanges(
        authContext,
        undefined,
        [EntityType.LEARNING_SESSION],
        100
      );

      expect(result.changes).toHaveLength(100);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('getDeltaChanges', () => {
    it('should return field-level deltas', async () => {
      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce([
        {
          data: { progress: 0.7, score: 85, timeSpent: 300 },
          version: 2,
        },
      ]);

      const result = await syncService.getDeltaChanges(
        authContext,
        EntityType.LEARNING_SESSION,
        'session-1',
        1,
        { progress: 0.5, score: 85, timeSpent: 250 }
      );

      expect(result.hasChanges).toBe(true);
      expect(result.fieldDeltas).toHaveLength(2);
      expect(result.fieldDeltas.find((d) => d.field === 'progress')).toBeDefined();
      expect(result.fieldDeltas.find((d) => d.field === 'timeSpent')).toBeDefined();
    });

    it('should identify conflicts when versions differ', async () => {
      (mockPrisma.$queryRaw as Mock).mockResolvedValueOnce([
        {
          data: { answer: 'B', submittedAt: new Date().toISOString() },
          version: 3,
        },
      ]);

      const result = await syncService.getDeltaChanges(
        authContext,
        EntityType.RESPONSE,
        'response-1',
        1,
        { answer: 'A' }
      );

      expect(result.hasConflict).toBe(true);
    });
  });

  describe('resolveConflict', () => {
    it('should apply resolution and update entity', async () => {
      const conflict = {
        id: 'conflict-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        entityType: EntityType.PROGRESS,
        entityId: 'progress-1',
        clientData: { value: 50 },
        serverData: { value: 70 },
        clientVersion: 1,
        serverVersion: 2,
        status: 'pending',
      };

      (mockPrisma.syncConflict as any).findUnique = vi
        .fn()
        .mockResolvedValueOnce(conflict);

      await syncService.resolveConflict(
        authContext,
        'conflict-1',
        ConflictResolutionStrategy.MERGE
      );

      expect(mockPrisma.$executeRaw).toHaveBeenCalled();
      expect(mockPrisma.syncConflict.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conflict-1' },
          data: expect.objectContaining({
            status: 'resolved',
          }),
        })
      );
    });
  });
});

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('applyResolution', () => {
    it('should apply SERVER_WINS strategy', () => {
      const result = resolver.applyResolution(
        ConflictResolutionStrategy.SERVER_WINS,
        { field: 'client' },
        { field: 'server' }
      );

      expect(result.field).toBe('server');
    });

    it('should apply CLIENT_WINS strategy', () => {
      const result = resolver.applyResolution(
        ConflictResolutionStrategy.CLIENT_WINS,
        { field: 'client' },
        { field: 'server' }
      );

      expect(result.field).toBe('client');
    });

    it('should apply LAST_WRITE_WINS strategy', () => {
      const clientData = {
        field: 'client',
        updatedAt: new Date().toISOString(),
      };
      const serverData = {
        field: 'server',
        updatedAt: new Date(Date.now() - 3600000).toISOString(),
      };

      const result = resolver.applyResolution(
        ConflictResolutionStrategy.LAST_WRITE_WINS,
        clientData,
        serverData
      );

      expect(result.field).toBe('client');
    });

    it('should apply MERGE strategy for numeric fields', () => {
      const result = resolver.applyResolution(
        ConflictResolutionStrategy.MERGE,
        { progress: 0.5, timeSpent: 300 },
        { progress: 0.7, timeSpent: 250 }
      );

      expect(result.progress).toBe(0.7); // Max
      expect(result.timeSpent).toBe(300); // Max
    });

    it('should apply MERGE strategy for arrays', () => {
      const result = resolver.applyResolution(
        ConflictResolutionStrategy.MERGE,
        { tags: ['a', 'b'] },
        { tags: ['b', 'c'] }
      );

      expect(result.tags).toContain('a');
      expect(result.tags).toContain('b');
      expect(result.tags).toContain('c');
    });

    it('should apply MANUAL strategy with provided data', () => {
      const result = resolver.applyResolution(
        ConflictResolutionStrategy.MANUAL,
        { field: 'client' },
        { field: 'server' },
        { field: 'manual' }
      );

      expect(result.field).toBe('manual');
    });
  });

  describe('getStrategyForEntityType', () => {
    it('should return correct strategy for each entity type', () => {
      expect(resolver.getStrategyForEntityType(EntityType.RESPONSE)).toBe(
        ConflictResolutionStrategy.CLIENT_WINS
      );
      expect(resolver.getStrategyForEntityType(EntityType.SKILL_MASTERY)).toBe(
        ConflictResolutionStrategy.SERVER_WINS
      );
      expect(resolver.getStrategyForEntityType(EntityType.PROGRESS)).toBe(
        ConflictResolutionStrategy.MERGE
      );
    });
  });
});
