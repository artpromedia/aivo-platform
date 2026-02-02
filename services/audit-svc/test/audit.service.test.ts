/**
 * Audit Service Unit Tests
 *
 * Comprehensive tests for the audit service and export service.
 * Tests cover: audit log creation, batch processing, querying,
 * integrity verification, export operations, and retention policies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma
const mockPrisma = {
  auditLog: {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  auditExport: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  auditAccessLog: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../src/config.js', () => ({
  config: {
    exportRetentionDays: 7,
  },
}));

vi.mock('../src/repositories/auditRepository.js', () => ({
  createAuditLog: vi.fn(),
  createAuditLogsBatch: vi.fn(),
  getAuditLogsByEventIds: vi.fn(),
  queryAuditLogs: vi.fn(),
  getAuditLogById: vi.fn(),
  getAuditStats: vi.fn(),
  verifyIntegrity: vi.fn(),
}));

import * as auditService from '../src/services/auditService.js';
import * as exportService from '../src/services/exportService.js';
import * as auditRepository from '../src/repositories/auditRepository.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function createMockAuditLogEntry(overrides = {}) {
  return {
    eventType: 'USER_LOGIN',
    category: 'AUTHENTICATION',
    severity: 'INFO',
    outcome: 'SUCCESS',
    actorId: 'user-001',
    actorType: 'user',
    actorEmail: 'user@example.com',
    actorRoles: ['teacher'],
    actorIpAddress: '192.168.1.1',
    actorUserAgent: 'Mozilla/5.0',
    targetType: 'session',
    targetId: 'session-001',
    action: 'login',
    description: 'User logged in successfully',
    sourceService: 'auth-svc',
    sourceVersion: '1.0.0',
    ...overrides,
  };
}

function createMockAuditLog(id: string, overrides = {}) {
  return {
    id,
    eventId: `event-${id}`,
    eventType: 'USER_LOGIN',
    eventVersion: '1.0',
    tenantId: 'tenant-001',
    category: 'AUTHENTICATION',
    severity: 'INFO',
    outcome: 'SUCCESS',
    actorId: 'user-001',
    actorType: 'user',
    actorEmail: 'user@example.com',
    actorRoles: ['teacher'],
    actorIpAddress: '192.168.1.1',
    targetType: 'session',
    targetId: 'session-001',
    action: 'login',
    description: 'User logged in successfully',
    sourceService: 'auth-svc',
    checksum: 'abc123',
    previousHash: null,
    occurredAt: new Date('2024-01-20T10:00:00Z'),
    receivedAt: new Date('2024-01-20T10:00:01Z'),
    ...overrides,
  };
}

function createMockExport(id: string, overrides = {}) {
  return {
    id,
    tenantId: 'tenant-001',
    requestedById: 'admin-001',
    requestedByEmail: 'admin@example.com',
    filters: {},
    fromDate: new Date('2024-01-01'),
    toDate: new Date('2024-01-31'),
    format: 'CSV',
    status: 'PENDING',
    requestedAt: new Date('2024-01-20T12:00:00Z'),
    expiresAt: new Date('2024-01-27T12:00:00Z'),
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('AuditService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE AUDIT LOG TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createAuditLog', () => {
    it('should create a single audit log entry', async () => {
      const entry = createMockAuditLogEntry();
      const expectedResult = createMockAuditLog('log-001');

      vi.mocked(auditRepository.createAuditLog).mockResolvedValue(expectedResult);

      const result = await auditService.createAuditLog('tenant-001', entry);

      expect(auditRepository.createAuditLog).toHaveBeenCalledWith('tenant-001', entry);
      expect(result).toEqual(expectedResult);
    });

    it('should pass all entry fields to repository', async () => {
      const entry = createMockAuditLogEntry({
        eventId: 'custom-event-id',
        metadata: { customField: 'value' },
        complianceFlags: ['FERPA', 'GDPR'],
        retentionPolicy: 'extended',
      });

      vi.mocked(auditRepository.createAuditLog).mockResolvedValue(createMockAuditLog('log-001'));

      await auditService.createAuditLog('tenant-001', entry);

      expect(auditRepository.createAuditLog).toHaveBeenCalledWith('tenant-001', entry);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // BATCH CREATE TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createAuditLogsBatch', () => {
    it('should create multiple audit logs in batch', async () => {
      const entries = [
        createMockAuditLogEntry({ eventType: 'USER_LOGIN' }),
        createMockAuditLogEntry({ eventType: 'USER_LOGOUT' }),
        createMockAuditLogEntry({ eventType: 'DATA_ACCESS' }),
      ];

      vi.mocked(auditRepository.getAuditLogsByEventIds).mockResolvedValue([]);
      vi.mocked(auditRepository.createAuditLogsBatch).mockResolvedValue([
        createMockAuditLog('log-001'),
        createMockAuditLog('log-002'),
        createMockAuditLog('log-003'),
      ]);

      const result = await auditService.createAuditLogsBatch('tenant-001', entries);

      expect(result.created).toBe(3);
      expect(result.duplicates).toBe(0);
      expect(result.logs).toHaveLength(3);
    });

    it('should filter out duplicate entries by eventId', async () => {
      const entries = [
        createMockAuditLogEntry({ eventId: 'event-001' }),
        createMockAuditLogEntry({ eventId: 'event-002' }),
        createMockAuditLogEntry({ eventId: 'event-003' }),
      ];

      vi.mocked(auditRepository.getAuditLogsByEventIds).mockResolvedValue([
        createMockAuditLog('log-001', { eventId: 'event-001' }),
      ]);
      vi.mocked(auditRepository.createAuditLogsBatch).mockResolvedValue([
        createMockAuditLog('log-002'),
        createMockAuditLog('log-003'),
      ]);

      const result = await auditService.createAuditLogsBatch('tenant-001', entries);

      expect(result.created).toBe(2);
      expect(result.duplicates).toBe(1);
    });

    it('should return empty result when all entries are duplicates', async () => {
      const entries = [
        createMockAuditLogEntry({ eventId: 'event-001' }),
        createMockAuditLogEntry({ eventId: 'event-002' }),
      ];

      vi.mocked(auditRepository.getAuditLogsByEventIds).mockResolvedValue([
        createMockAuditLog('log-001', { eventId: 'event-001' }),
        createMockAuditLog('log-002', { eventId: 'event-002' }),
      ]);

      const result = await auditService.createAuditLogsBatch('tenant-001', entries);

      expect(result.created).toBe(0);
      expect(result.duplicates).toBe(2);
      expect(result.logs).toHaveLength(0);
    });

    it('should handle entries without eventId', async () => {
      const entries = [
        createMockAuditLogEntry(), // No eventId
        createMockAuditLogEntry({ eventId: 'event-001' }),
      ];

      vi.mocked(auditRepository.getAuditLogsByEventIds).mockResolvedValue([]);
      vi.mocked(auditRepository.createAuditLogsBatch).mockResolvedValue([
        createMockAuditLog('log-001'),
        createMockAuditLog('log-002'),
      ]);

      const result = await auditService.createAuditLogsBatch('tenant-001', entries);

      expect(result.created).toBe(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // QUERY AUDIT LOGS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('queryAuditLogs', () => {
    it('should query audit logs with filters', async () => {
      const query = {
        eventType: 'USER_LOGIN',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        page: 1,
        pageSize: 20,
      };

      const expectedResult = {
        data: [createMockAuditLog('log-001'), createMockAuditLog('log-002')],
        pagination: { page: 1, pageSize: 20, totalItems: 2, totalPages: 1 },
      };

      vi.mocked(auditRepository.queryAuditLogs).mockResolvedValue(expectedResult);

      const result = await auditService.queryAuditLogs('tenant-001', query);

      expect(auditRepository.queryAuditLogs).toHaveBeenCalledWith('tenant-001', query);
      expect(result).toEqual(expectedResult);
    });

    it('should support filtering by multiple event types', async () => {
      const query = {
        eventTypes: ['USER_LOGIN', 'USER_LOGOUT', 'PASSWORD_CHANGE'],
      };

      vi.mocked(auditRepository.queryAuditLogs).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });

      await auditService.queryAuditLogs('tenant-001', query);

      expect(auditRepository.queryAuditLogs).toHaveBeenCalledWith('tenant-001', query);
    });

    it('should support filtering by category', async () => {
      const query = { category: 'SECURITY' };

      vi.mocked(auditRepository.queryAuditLogs).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });

      await auditService.queryAuditLogs('tenant-001', query);

      expect(auditRepository.queryAuditLogs).toHaveBeenCalledWith('tenant-001', query);
    });

    it('should support filtering by severity', async () => {
      const query = { severity: 'ERROR' };

      vi.mocked(auditRepository.queryAuditLogs).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });

      await auditService.queryAuditLogs('tenant-001', query);

      expect(auditRepository.queryAuditLogs).toHaveBeenCalledWith('tenant-001', query);
    });

    it('should support filtering by minimum severity', async () => {
      const query = { minSeverity: 'WARNING' };

      vi.mocked(auditRepository.queryAuditLogs).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });

      await auditService.queryAuditLogs('tenant-001', query);

      expect(auditRepository.queryAuditLogs).toHaveBeenCalledWith('tenant-001', query);
    });

    it('should support text search', async () => {
      const query = { search: 'login failed' };

      vi.mocked(auditRepository.queryAuditLogs).mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
      });

      await auditService.queryAuditLogs('tenant-001', query);

      expect(auditRepository.queryAuditLogs).toHaveBeenCalledWith('tenant-001', query);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET AUDIT LOG BY ID TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAuditLogById', () => {
    it('should return audit log by ID', async () => {
      const expectedLog = createMockAuditLog('log-001');

      vi.mocked(auditRepository.getAuditLogById).mockResolvedValue(expectedLog);

      const result = await auditService.getAuditLogById('tenant-001', 'log-001');

      expect(auditRepository.getAuditLogById).toHaveBeenCalledWith('tenant-001', 'log-001');
      expect(result).toEqual(expectedLog);
    });

    it('should return null for non-existent log', async () => {
      vi.mocked(auditRepository.getAuditLogById).mockResolvedValue(null);

      const result = await auditService.getAuditLogById('tenant-001', 'non-existent');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AUDIT STATS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getAuditStats', () => {
    it('should return audit statistics', async () => {
      const expectedStats = {
        totalLogs: 1000,
        byCategory: { AUTHENTICATION: 500, DATA_ACCESS: 300, ADMIN: 200 },
        bySeverity: { INFO: 800, WARNING: 150, ERROR: 50 },
        byOutcome: { SUCCESS: 900, FAILURE: 100 },
      };

      vi.mocked(auditRepository.getAuditStats).mockResolvedValue(expectedStats);

      const result = await auditService.getAuditStats('tenant-001');

      expect(auditRepository.getAuditStats).toHaveBeenCalledWith('tenant-001', undefined, undefined);
      expect(result).toEqual(expectedStats);
    });

    it('should support date range filtering', async () => {
      vi.mocked(auditRepository.getAuditStats).mockResolvedValue({
        totalLogs: 500,
        byCategory: {},
        bySeverity: {},
        byOutcome: {},
      });

      await auditService.getAuditStats('tenant-001', '2024-01-01', '2024-01-31');

      expect(auditRepository.getAuditStats).toHaveBeenCalledWith(
        'tenant-001',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // INTEGRITY VERIFICATION TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('verifyIntegrity', () => {
    it('should verify audit log chain integrity', async () => {
      const expectedResult = {
        valid: true,
        checkedCount: 100,
        errors: [],
      };

      vi.mocked(auditRepository.verifyIntegrity).mockResolvedValue(expectedResult);

      const result = await auditService.verifyIntegrity('tenant-001');

      expect(auditRepository.verifyIntegrity).toHaveBeenCalledWith('tenant-001');
      expect(result).toEqual(expectedResult);
    });

    it('should return errors when integrity check fails', async () => {
      const expectedResult = {
        valid: false,
        checkedCount: 100,
        errors: [
          { logId: 'log-050', error: 'Checksum mismatch' },
          { logId: 'log-051', error: 'Chain broken' },
        ],
      };

      vi.mocked(auditRepository.verifyIntegrity).mockResolvedValue(expectedResult);

      const result = await auditService.verifyIntegrity('tenant-001');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // LOG AUDIT ACCESS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('logAuditAccess', () => {
    it('should create access log entry', async () => {
      const accessLogEntry = {
        tenantId: 'tenant-001',
        accessorId: 'admin-001',
        accessorEmail: 'admin@example.com',
        accessorRoles: ['admin'],
        accessorIp: '192.168.1.1',
        accessType: 'query',
        queryFilters: { eventType: 'USER_LOGIN' },
        recordCount: 50,
      };

      mockPrisma.auditAccessLog.create.mockResolvedValue({ id: 'access-001', ...accessLogEntry });

      const result = await auditService.logAuditAccess(
        'tenant-001',
        'admin-001',
        'admin@example.com',
        ['admin'],
        '192.168.1.1',
        'query',
        { eventType: 'USER_LOGIN' },
        50
      );

      expect(mockPrisma.auditAccessLog.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should include date range in access log', async () => {
      mockPrisma.auditAccessLog.create.mockResolvedValue({ id: 'access-001' });

      await auditService.logAuditAccess(
        'tenant-001',
        'admin-001',
        'admin@example.com',
        ['admin'],
        '192.168.1.1',
        'export',
        {},
        100,
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        'request-001'
      );

      expect(mockPrisma.auditAccessLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          dataFromDate: new Date('2024-01-01'),
          dataToDate: new Date('2024-01-31'),
          requestId: 'request-001',
        }),
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('ExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-20T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE EXPORT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('createExport', () => {
    it('should create an export request', async () => {
      const exportParams = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        format: 'CSV',
        filters: { eventType: 'USER_LOGIN' },
      };

      const createdExport = createMockExport('export-001', { status: 'PENDING' });
      const completedExport = createMockExport('export-001', { status: 'COMPLETED', recordCount: 50 });

      mockPrisma.auditExport.create.mockResolvedValue(createdExport);
      mockPrisma.auditExport.findUnique.mockResolvedValue(createdExport);
      mockPrisma.auditExport.update.mockResolvedValue(completedExport);
      mockPrisma.auditLog.findMany.mockResolvedValue([
        createMockAuditLog('log-001'),
        createMockAuditLog('log-002'),
      ]);

      const result = await exportService.createExport(
        'tenant-001',
        'admin-001',
        'admin@example.com',
        exportParams as any
      );

      expect(mockPrisma.auditExport.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should set expiration date based on retention policy', async () => {
      const exportParams = {
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
        format: 'JSON',
      };

      mockPrisma.auditExport.create.mockResolvedValue(createMockExport('export-001'));
      mockPrisma.auditExport.findUnique.mockResolvedValue(createMockExport('export-001'));
      mockPrisma.auditExport.update.mockResolvedValue(createMockExport('export-001', { status: 'COMPLETED' }));
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await exportService.createExport(
        'tenant-001',
        'admin-001',
        'admin@example.com',
        exportParams as any
      );

      expect(mockPrisma.auditExport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // PROCESS EXPORT TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('processExport', () => {
    it('should process export and update status', async () => {
      const pendingExport = createMockExport('export-001', { status: 'PENDING' });

      mockPrisma.auditExport.findUnique.mockResolvedValue(pendingExport);
      mockPrisma.auditExport.update.mockResolvedValue({ ...pendingExport, status: 'PROCESSING' });
      mockPrisma.auditLog.findMany.mockResolvedValue([
        createMockAuditLog('log-001'),
        createMockAuditLog('log-002'),
        createMockAuditLog('log-003'),
      ]);

      await exportService.processExport('export-001');

      expect(mockPrisma.auditExport.update).toHaveBeenCalledWith({
        where: { id: 'export-001' },
        data: expect.objectContaining({ status: 'PROCESSING' }),
      });

      expect(mockPrisma.auditExport.update).toHaveBeenCalledWith({
        where: { id: 'export-001' },
        data: expect.objectContaining({
          status: 'COMPLETED',
          recordCount: 3,
        }),
      });
    });

    it('should throw error when export not found', async () => {
      mockPrisma.auditExport.findUnique.mockResolvedValue(null);

      await expect(exportService.processExport('non-existent')).rejects.toThrow(
        'Export request not found'
      );
    });

    it('should mark export as failed on error', async () => {
      const pendingExport = createMockExport('export-001', { status: 'PENDING' });

      mockPrisma.auditExport.findUnique.mockResolvedValue(pendingExport);
      mockPrisma.auditExport.update.mockResolvedValueOnce({ ...pendingExport, status: 'PROCESSING' });
      mockPrisma.auditLog.findMany.mockRejectedValue(new Error('Database error'));
      mockPrisma.auditExport.update.mockResolvedValue({ ...pendingExport, status: 'FAILED' });

      await expect(exportService.processExport('export-001')).rejects.toThrow('Database error');

      expect(mockPrisma.auditExport.update).toHaveBeenCalledWith({
        where: { id: 'export-001' },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Database error',
        }),
      });
    });

    it('should apply filters from export request', async () => {
      const exportWithFilters = createMockExport('export-001', {
        status: 'PENDING',
        filters: {
          eventType: 'USER_LOGIN',
          category: 'AUTHENTICATION',
          severity: 'ERROR',
        },
      });

      mockPrisma.auditExport.findUnique.mockResolvedValue(exportWithFilters);
      mockPrisma.auditExport.update.mockResolvedValue({ ...exportWithFilters, status: 'PROCESSING' });
      mockPrisma.auditLog.findMany.mockResolvedValue([]);

      await exportService.processExport('export-001');

      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          eventType: 'USER_LOGIN',
          category: 'AUTHENTICATION',
          severity: 'ERROR',
        }),
        orderBy: { occurredAt: 'asc' },
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET EXPORTS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getExports', () => {
    it('should return paginated exports', async () => {
      const exports = [
        createMockExport('export-001'),
        createMockExport('export-002'),
      ];

      mockPrisma.auditExport.findMany.mockResolvedValue(exports);
      mockPrisma.auditExport.count.mockResolvedValue(2);

      const result = await exportService.getExports('tenant-001', 1, 20);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.totalItems).toBe(2);
    });

    it('should support pagination', async () => {
      mockPrisma.auditExport.findMany.mockResolvedValue([createMockExport('export-003')]);
      mockPrisma.auditExport.count.mockResolvedValue(50);

      const result = await exportService.getExports('tenant-001', 3, 10);

      expect(mockPrisma.auditExport.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (3-1) * 10
          take: 10,
        })
      );
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // GET EXPORT BY ID TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('getExportById', () => {
    it('should return export by ID', async () => {
      const exportRecord = createMockExport('export-001');

      mockPrisma.auditExport.findFirst.mockResolvedValue(exportRecord);

      const result = await exportService.getExportById('tenant-001', 'export-001');

      expect(mockPrisma.auditExport.findFirst).toHaveBeenCalledWith({
        where: { id: 'export-001', tenantId: 'tenant-001' },
      });
      expect(result).toEqual(exportRecord);
    });

    it('should return null for non-existent export', async () => {
      mockPrisma.auditExport.findFirst.mockResolvedValue(null);

      const result = await exportService.getExportById('tenant-001', 'non-existent');

      expect(result).toBeNull();
    });

    it('should not return export from different tenant', async () => {
      mockPrisma.auditExport.findFirst.mockResolvedValue(null);

      const result = await exportService.getExportById('tenant-002', 'export-001');

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // CLEANUP EXPIRED EXPORTS TESTS
  // ─────────────────────────────────────────────────────────────────────────────

  describe('cleanupExpiredExports', () => {
    it('should update expired exports status', async () => {
      mockPrisma.auditExport.updateMany.mockResolvedValue({ count: 5 });

      const result = await exportService.cleanupExpiredExports();

      expect(mockPrisma.auditExport.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'EXPIRED',
          fileUrl: null,
        },
      });
      expect(result).toBe(5);
    });

    it('should return 0 when no exports expired', async () => {
      mockPrisma.auditExport.updateMany.mockResolvedValue({ count: 0 });

      const result = await exportService.cleanupExpiredExports();

      expect(result).toBe(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT CATEGORY AND SEVERITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Audit Categories and Severities', () => {
  const categories = [
    'AUTHENTICATION',
    'AUTHORIZATION',
    'DATA_ACCESS',
    'DATA_MODIFICATION',
    'ADMIN',
    'SECURITY',
    'SYSTEM',
    'COMPLIANCE',
  ];

  const severities = [
    'DEBUG',
    'INFO',
    'NOTICE',
    'WARNING',
    'ERROR',
    'CRITICAL',
    'ALERT',
    'EMERGENCY',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(categories)('should accept %s category', async (category) => {
    const entry = createMockAuditLogEntry({ category });

    vi.mocked(auditRepository.createAuditLog).mockResolvedValue(
      createMockAuditLog('log-001', { category })
    );

    const result = await auditService.createAuditLog('tenant-001', entry);

    expect(result.category).toBe(category);
  });

  it.each(severities)('should accept %s severity', async (severity) => {
    const entry = createMockAuditLogEntry({ severity });

    vi.mocked(auditRepository.createAuditLog).mockResolvedValue(
      createMockAuditLog('log-001', { severity })
    );

    const result = await auditService.createAuditLog('tenant-001', entry);

    expect(result.severity).toBe(severity);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE AND DATA PROTECTION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Compliance and Data Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should support FERPA compliance flag', async () => {
    const entry = createMockAuditLogEntry({
      complianceFlags: ['FERPA'],
      dataClassification: 'student_records',
    });

    vi.mocked(auditRepository.createAuditLog).mockResolvedValue(
      createMockAuditLog('log-001', { complianceFlags: ['FERPA'] })
    );

    const result = await auditService.createAuditLog('tenant-001', entry);

    expect(result.complianceFlags).toContain('FERPA');
  });

  it('should support GDPR compliance flag', async () => {
    const entry = createMockAuditLogEntry({
      complianceFlags: ['GDPR'],
      dataClassification: 'personal_data',
    });

    vi.mocked(auditRepository.createAuditLog).mockResolvedValue(
      createMockAuditLog('log-001', { complianceFlags: ['GDPR'] })
    );

    const result = await auditService.createAuditLog('tenant-001', entry);

    expect(result.complianceFlags).toContain('GDPR');
  });

  it('should support custom retention policies', async () => {
    const entry = createMockAuditLogEntry({
      retentionPolicy: 'extended_7_years',
    });

    vi.mocked(auditRepository.createAuditLog).mockResolvedValue(
      createMockAuditLog('log-001', { retentionPolicy: 'extended_7_years' })
    );

    await auditService.createAuditLog('tenant-001', entry);

    expect(auditRepository.createAuditLog).toHaveBeenCalledWith(
      'tenant-001',
      expect.objectContaining({ retentionPolicy: 'extended_7_years' })
    );
  });

  it('should track state changes for audit trail', async () => {
    const entry = createMockAuditLogEntry({
      eventType: 'RECORD_UPDATE',
      previousState: { status: 'active', name: 'Old Name' },
      newState: { status: 'inactive', name: 'New Name' },
    });

    vi.mocked(auditRepository.createAuditLog).mockResolvedValue(
      createMockAuditLog('log-001', {
        previousState: { status: 'active', name: 'Old Name' },
        newState: { status: 'inactive', name: 'New Name' },
      })
    );

    await auditService.createAuditLog('tenant-001', entry);

    expect(auditRepository.createAuditLog).toHaveBeenCalledWith(
      'tenant-001',
      expect.objectContaining({
        previousState: expect.any(Object),
        newState: expect.any(Object),
      })
    );
  });
});
