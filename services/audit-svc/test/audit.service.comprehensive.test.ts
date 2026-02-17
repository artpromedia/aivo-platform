/**
 * Audit Service — Comprehensive Unit Tests (Sprint 7)
 *
 * Covers: audit log CRUD, batch operations with deduplication, alert lifecycle,
 * FERPA correction requests, export operations (CSV/JSON), access logging.
 * Target: ≥80% line coverage for auditService + alertService + correctionService + exportService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockAuditLog = {
  create: vi.fn(),
  createMany: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
};
const mockAuditAlert = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockAuditExport = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
};
const mockCorrectionRequest = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
};
const mockAuditAccessLog = {
  create: vi.fn(),
};

const mockPrisma = {
  auditLog: mockAuditLog,
  auditAlert: mockAuditAlert,
  auditExport: mockAuditExport,
  correctionRequest: mockCorrectionRequest,
  auditAccessLog: mockAuditAccessLog,
  $transaction: vi.fn((fn: any) => fn(mockPrisma)),
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

vi.mock('../src/config.js', () => ({
  config: {
    exportRetentionDays: 30,
    hashAlgorithm: 'sha256',
  },
}));

vi.mock('../src/repositories/auditRepository.js', () => ({
  createAuditLog: vi
    .fn()
    .mockImplementation((_t: string, entry: any) =>
      Promise.resolve({ id: 'log-001', ...entry, occurredAt: new Date() })
    ),
  createAuditLogsBatch: vi
    .fn()
    .mockImplementation((_t: string, entries: any[]) =>
      Promise.resolve(entries.map((e, i) => ({ id: `log-${i}`, ...e, occurredAt: new Date() })))
    ),
  getAuditLogsByEventIds: vi.fn().mockResolvedValue([]),
  queryAuditLogs: vi.fn().mockImplementation((_t: string, _q: any) =>
    Promise.resolve({
      data: [],
      pagination: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 },
    })
  ),
  getAuditLogById: vi
    .fn()
    .mockImplementation((_t: string, id: string) =>
      Promise.resolve({ id, eventType: 'USER_LOGIN', occurredAt: new Date() })
    ),
  getAuditStats: vi.fn().mockResolvedValue({
    totalEvents: 1500,
    byCategory: { AUTHENTICATION: 800, DATA_ACCESS: 500, ADMIN: 200 },
    bySeverity: { INFO: 1000, WARNING: 400, ERROR: 100 },
  }),
  verifyIntegrity: vi.fn().mockResolvedValue({
    verified: true,
    totalRecords: 1500,
    corruptedRecords: 0,
  }),
}));

import * as auditService from '../src/services/auditService.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-admin-001';

function createMockAuditEntry(overrides = {}) {
  return {
    eventType: 'USER_LOGIN',
    eventId: `evt-${Date.now()}`,
    category: 'AUTHENTICATION',
    severity: 'INFO',
    outcome: 'SUCCESS',
    actorId: USER_ID,
    actorEmail: 'admin@school.edu',
    actorRoles: ['SCHOOL_ADMIN'],
    action: 'login',
    description: 'User logged in successfully',
    sourceService: 'auth-svc',
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Audit Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Create Audit Log
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createAuditLog', () => {
    it('should create a single audit log entry', async () => {
      const entry = createMockAuditEntry();
      const result = await auditService.createAuditLog(TENANT_ID, entry);
      expect(result).toBeDefined();
      expect(result.id).toBe('log-001');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Batch Create with Deduplication
  // ═══════════════════════════════════════════════════════════════════════════
  describe('createAuditLogsBatch', () => {
    it('should create multiple entries in batch', async () => {
      const entries = [
        createMockAuditEntry({ eventId: 'evt-1' }),
        createMockAuditEntry({ eventId: 'evt-2' }),
        createMockAuditEntry({ eventId: 'evt-3' }),
      ];

      const result = await auditService.createAuditLogsBatch(TENANT_ID, entries);

      expect(result.created).toBe(3);
      expect(result.duplicates).toBe(0);
    });

    it('should deduplicate entries with existing eventIds', async () => {
      const { getAuditLogsByEventIds } = await import('../src/repositories/auditRepository.js');
      vi.mocked(getAuditLogsByEventIds).mockResolvedValue([
        { eventId: 'evt-existing', id: 'log-existing' } as any,
      ]);

      const entries = [
        createMockAuditEntry({ eventId: 'evt-existing' }),
        createMockAuditEntry({ eventId: 'evt-new' }),
      ];

      const result = await auditService.createAuditLogsBatch(TENANT_ID, entries);

      expect(result.created).toBe(1);
      expect(result.duplicates).toBe(1);
    });

    it('should handle all-duplicate batch', async () => {
      const { getAuditLogsByEventIds } = await import('../src/repositories/auditRepository.js');
      vi.mocked(getAuditLogsByEventIds).mockResolvedValue([
        { eventId: 'evt-1', id: 'log-1' } as any,
        { eventId: 'evt-2', id: 'log-2' } as any,
      ]);

      const entries = [
        createMockAuditEntry({ eventId: 'evt-1' }),
        createMockAuditEntry({ eventId: 'evt-2' }),
      ];

      const result = await auditService.createAuditLogsBatch(TENANT_ID, entries);

      expect(result.created).toBe(0);
      expect(result.duplicates).toBe(2);
      expect(result.logs).toEqual([]);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Query
  // ═══════════════════════════════════════════════════════════════════════════
  describe('queryAuditLogs', () => {
    it('should query with pagination', async () => {
      const result = await auditService.queryAuditLogs(TENANT_ID, {
        page: 1,
        pageSize: 20,
      });

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Get by ID
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getAuditLogById', () => {
    it('should return a single log entry', async () => {
      const result = await auditService.getAuditLogById(TENANT_ID, 'log-001');

      expect(result).toBeDefined();
      expect(result.id).toBe('log-001');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Stats
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getAuditStats', () => {
    it('should return aggregate statistics', async () => {
      const result = await auditService.getAuditStats(TENANT_ID);

      expect(result.totalEvents).toBe(1500);
      expect(result.byCategory).toHaveProperty('AUTHENTICATION');
    });

    it('should accept date range', async () => {
      const result = await auditService.getAuditStats(TENANT_ID, '2026-01-01', '2026-01-31');

      expect(result).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Integrity
  // ═══════════════════════════════════════════════════════════════════════════
  describe('verifyIntegrity', () => {
    it('should verify audit log chain integrity', async () => {
      const result = await auditService.verifyIntegrity(TENANT_ID);

      expect(result.verified).toBe(true);
      expect(result.corruptedRecords).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Access Logging (meta-audit)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('logAuditAccess', () => {
    it('should log access to audit data', async () => {
      mockAuditAccessLog.create.mockResolvedValue({
        id: 'access-001',
        tenantId: TENANT_ID,
        accessorId: USER_ID,
        accessType: 'QUERY',
        recordCount: 50,
      });

      const result = await auditService.logAuditAccess(
        TENANT_ID,
        USER_ID,
        'admin@school.edu',
        ['SCHOOL_ADMIN'],
        '192.168.1.1',
        'QUERY',
        { category: 'AUTHENTICATION' },
        50
      );

      expect(mockAuditAccessLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            accessorId: USER_ID,
            accessType: 'QUERY',
            recordCount: 50,
          }),
        })
      );
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Alert Service
// ═════════════════════════════════════════════════════════════════════════════

describe('Alert Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createAlert', () => {
    it('should create an audit alert', async () => {
      mockAuditAlert.create.mockResolvedValue({
        id: 'alert-001',
        tenantId: TENANT_ID,
        title: 'Unusual login pattern',
        severity: 'HIGH',
        isAcknowledged: false,
        isResolved: false,
      });

      const { createAlert } = await import('../src/services/alertService.js');
      const result = await createAlert(
        TENANT_ID,
        'Unusual login pattern',
        'Multiple failed login attempts from new IP',
        'HIGH',
        'AUTH_ANOMALY',
        'AUTHENTICATION',
        ['evt-1', 'evt-2']
      );

      expect(result.severity).toBe('HIGH');
      expect(result.isResolved).toBe(false);
    });
  });

  describe('getAlerts', () => {
    it('should return paginated alerts excluding resolved by default', async () => {
      mockAuditAlert.findMany.mockResolvedValue([]);
      mockAuditAlert.count.mockResolvedValue(0);

      const { getAlerts } = await import('../src/services/alertService.js');
      const result = await getAlerts(TENANT_ID);

      expect(mockAuditAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            isResolved: false,
          }),
        })
      );
    });

    it('should include resolved alerts when requested', async () => {
      mockAuditAlert.findMany.mockResolvedValue([]);
      mockAuditAlert.count.mockResolvedValue(0);

      const { getAlerts } = await import('../src/services/alertService.js');
      const result = await getAlerts(TENANT_ID, 1, 20, true);

      expect(mockAuditAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
          }),
        })
      );
    });
  });

  describe('acknowledgeAlert', () => {
    it('should mark an alert as acknowledged', async () => {
      mockAuditAlert.update.mockResolvedValue({
        id: 'alert-001',
        isAcknowledged: true,
        acknowledgedAt: new Date(),
        acknowledgedById: USER_ID,
      });

      const { acknowledgeAlert } = await import('../src/services/alertService.js');
      const result = await acknowledgeAlert(TENANT_ID, 'alert-001', USER_ID);

      expect(result.isAcknowledged).toBe(true);
      expect(result.acknowledgedById).toBe(USER_ID);
    });
  });

  describe('resolveAlert', () => {
    it('should mark alert as resolved with resolution notes', async () => {
      mockAuditAlert.update.mockResolvedValue({
        id: 'alert-001',
        isResolved: true,
        resolvedById: USER_ID,
        resolution: 'False positive — authorized pentesting',
      });

      const { resolveAlert } = await import('../src/services/alertService.js');
      const result = await resolveAlert(
        TENANT_ID,
        'alert-001',
        USER_ID,
        'False positive — authorized pentesting'
      );

      expect(result.isResolved).toBe(true);
      expect(result.resolution).toContain('pentesting');
    });
  });

  describe('getAlertCounts', () => {
    it('should return counts by status category', async () => {
      mockAuditAlert.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(3) // unacknowledged
        .mockResolvedValueOnce(4) // acknowledged
        .mockResolvedValueOnce(3); // resolved

      const { getAlertCounts } = await import('../src/services/alertService.js');
      const result = await getAlertCounts(TENANT_ID);

      expect(result.total).toBe(10);
      expect(result.unacknowledged).toBe(3);
      expect(result.acknowledged).toBe(4);
      expect(result.resolved).toBe(3);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Correction Request Service (FERPA)
// ═════════════════════════════════════════════════════════════════════════════

describe('Correction Request Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createCorrectionRequest', () => {
    it('should create a correction request with PENDING status', async () => {
      mockCorrectionRequest.create.mockResolvedValue({
        id: 'corr-001',
        tenantId: TENANT_ID,
        status: 'PENDING',
        targetType: 'STUDENT_RECORD',
        fieldName: 'grade',
        currentValue: 'F',
        requestedValue: 'B',
        reason: 'Grading error',
      });

      const { createCorrectionRequest } = await import('../src/services/correctionService.js');
      const result = await createCorrectionRequest(TENANT_ID, 'parent-001', 'parent@example.com', {
        targetType: 'STUDENT_RECORD',
        targetId: 'student-001',
        fieldName: 'grade',
        currentValue: 'F',
        requestedValue: 'B',
        reason: 'Grading error',
      });

      expect(result.status).toBe('PENDING');
    });
  });

  describe('reviewCorrectionRequest', () => {
    it('should approve a correction request', async () => {
      mockCorrectionRequest.findFirst.mockResolvedValue({
        id: 'corr-001',
        status: 'PENDING',
      });
      mockCorrectionRequest.update.mockResolvedValue({
        id: 'corr-001',
        status: 'APPROVED',
        reviewedById: USER_ID,
        reviewedAt: new Date(),
      });

      const { reviewCorrectionRequest } = await import('../src/services/correctionService.js');
      const result = await reviewCorrectionRequest(
        TENANT_ID,
        'corr-001',
        USER_ID,
        'admin@school.edu',
        { status: 'APPROVED', reviewNotes: 'Verified with classwork records' }
      );

      expect(result.status).toBe('APPROVED');
    });

    it('should require denial reason per FERPA when denying', async () => {
      mockCorrectionRequest.findFirst.mockResolvedValue({
        id: 'corr-001',
        status: 'PENDING',
      });

      const { reviewCorrectionRequest } = await import('../src/services/correctionService.js');

      await expect(
        reviewCorrectionRequest(TENANT_ID, 'corr-001', USER_ID, 'admin@school.edu', {
          status: 'DENIED',
          // No denialReason provided
        })
      ).rejects.toThrow('FERPA requires a written justification');
    });

    it('should reject when request not found or already reviewed', async () => {
      mockCorrectionRequest.findFirst.mockResolvedValue(null);

      const { reviewCorrectionRequest } = await import('../src/services/correctionService.js');

      await expect(
        reviewCorrectionRequest(TENANT_ID, 'nonexistent', USER_ID, 'admin@school.edu', {
          status: 'APPROVED',
        })
      ).rejects.toThrow('not found or already reviewed');
    });
  });

  describe('listCorrectionRequests', () => {
    it('should filter by status', async () => {
      mockCorrectionRequest.findMany.mockResolvedValue([]);
      mockCorrectionRequest.count.mockResolvedValue(0);

      const { listCorrectionRequests } = await import('../src/services/correctionService.js');
      await listCorrectionRequests(TENANT_ID, { status: 'PENDING' });

      expect(mockCorrectionRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            status: 'PENDING',
          }),
        })
      );
    });

    it('should return paginated results', async () => {
      mockCorrectionRequest.findMany.mockResolvedValue([]);
      mockCorrectionRequest.count.mockResolvedValue(25);

      const { listCorrectionRequests } = await import('../src/services/correctionService.js');
      const result = await listCorrectionRequests(TENANT_ID, { page: 2, pageSize: 10 });

      expect(result.pagination.totalPages).toBe(3);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Export Service
// ═════════════════════════════════════════════════════════════════════════════

describe('Export Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExport', () => {
    it('should create a CSV export request', async () => {
      const exportReq = {
        id: 'export-001',
        tenantId: TENANT_ID,
        format: 'CSV',
        status: 'COMPLETED',
        recordCount: 100,
      };
      mockAuditExport.create.mockResolvedValue(exportReq);
      mockAuditExport.findUnique.mockResolvedValue({ ...exportReq, status: 'COMPLETED' });
      mockAuditExport.update.mockResolvedValue(exportReq);
      mockAuditLog.findMany.mockResolvedValue([]);

      const { createExport } = await import('../src/services/exportService.js');
      const result = await createExport(TENANT_ID, USER_ID, 'admin@school.edu', {
        fromDate: '2026-01-01',
        toDate: '2026-01-31',
        format: 'CSV',
      });

      expect(result).toBeDefined();
    });
  });

  describe('getExports', () => {
    it('should list exports with pagination', async () => {
      mockAuditExport.findMany.mockResolvedValue([]);
      mockAuditExport.count.mockResolvedValue(5);

      const { getExports } = await import('../src/services/exportService.js');
      const result = await getExports(TENANT_ID);

      expect(result.pagination.totalItems).toBe(5);
    });
  });
});
