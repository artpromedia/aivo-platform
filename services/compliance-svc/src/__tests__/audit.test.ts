/**
 * AIVO Compliance Service - Audit Logging Tests
 *
 * Tests for audit logging functionality including compliance snapshots,
 * finding status tracking, remediation audit trails, and alert management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Prisma client
vi.mock('../prisma.js', () => ({
  prisma: {
    tenantFramework: {
      findMany: vi.fn(),
    },
    control: {
      findMany: vi.fn(),
    },
    finding: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    evidence: {
      findMany: vi.fn(),
    },
    remediation: {
      findMany: vi.fn(),
    },
    complianceSnapshot: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    complianceAlert: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma.js';
import * as findingService from '../services/findingService.js';
import * as dashboardService from '../services/dashboardService.js';

const mockedPrisma = vi.mocked(prisma);

// ══════════════════════════════════════════════════════════════════════════════
// TEST CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_FINDING_ID = '770e8400-e29b-41d4-a716-446655440002';
const TEST_ALERT_ID = '880e8400-e29b-41d4-a716-446655440003';

// ══════════════════════════════════════════════════════════════════════════════
// FINDING AUDIT TRAIL TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Finding Audit Trail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createFinding - Audit Record Creation', () => {
    it('should record identifiedBy for audit accountability', async () => {
      const mockFinding = {
        id: TEST_FINDING_ID,
        tenantId: TEST_TENANT_ID,
        title: 'FERPA Directory Information Violation',
        description: 'Student records disclosed without proper consent',
        severity: 'CRITICAL',
        status: 'OPEN',
        identifiedBy: TEST_USER_ID,
        identifiedAt: new Date(),
        createdAt: new Date(),
        assessment: null,
        control: null,
        _count: { remediations: 0 },
      };

      mockedPrisma.finding.create.mockResolvedValue(mockFinding as any);

      const result = await findingService.createFinding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          title: 'FERPA Directory Information Violation',
          description: 'Student records disclosed without proper consent',
          severity: 'CRITICAL',
        }
      );

      expect(result.identifiedBy).toBe(TEST_USER_ID);
      expect(mockedPrisma.finding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            identifiedBy: TEST_USER_ID,
          }),
        })
      );
    });

    it('should capture affected systems for compliance documentation', async () => {
      const affectedSystems = ['student-portal', 'parent-portal', 'gradebook'];

      mockedPrisma.finding.create.mockResolvedValue({
        id: TEST_FINDING_ID,
        affectedSystems,
        _count: { remediations: 0 },
      } as any);

      const result = await findingService.createFinding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          title: 'Access Control Gap',
          description: 'Insufficient access controls on student data',
          severity: 'HIGH',
          affectedSystems,
        }
      );

      expect(result.affectedSystems).toEqual(affectedSystems);
    });

    it('should set due date for compliance remediation tracking', async () => {
      const dueDate = '2024-03-01T00:00:00.000Z';

      mockedPrisma.finding.create.mockResolvedValue({
        id: TEST_FINDING_ID,
        dueDate: new Date(dueDate),
        _count: { remediations: 0 },
      } as any);

      await findingService.createFinding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          title: 'Data Retention Policy Violation',
          description: 'Records retained beyond policy limits',
          severity: 'MEDIUM',
          dueDate,
        }
      );

      expect(mockedPrisma.finding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dueDate: new Date(dueDate),
          }),
        })
      );
    });

    it('should capture root cause for compliance analysis', async () => {
      mockedPrisma.finding.create.mockResolvedValue({
        id: TEST_FINDING_ID,
        rootCause: 'Lack of annual FERPA training',
        _count: { remediations: 0 },
      } as any);

      await findingService.createFinding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          title: 'Privacy Notice Failure',
          description: 'Annual privacy notice not distributed',
          severity: 'HIGH',
          rootCause: 'Lack of annual FERPA training',
        }
      );

      expect(mockedPrisma.finding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rootCause: 'Lack of annual FERPA training',
          }),
        })
      );
    });

    it('should capture business impact for risk assessment', async () => {
      mockedPrisma.finding.create.mockResolvedValue({
        id: TEST_FINDING_ID,
        impact: 'Potential DOE investigation and funding impact',
        _count: { remediations: 0 },
      } as any);

      await findingService.createFinding(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          title: 'FERPA Violation',
          description: 'Unauthorized disclosure of education records',
          severity: 'CRITICAL',
          impact: 'Potential DOE investigation and funding impact',
        }
      );

      expect(mockedPrisma.finding.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            impact: 'Potential DOE investigation and funding impact',
          }),
        })
      );
    });
  });

  describe('updateFindingStatus - Status Change Audit', () => {
    it('should record resolvedAt and resolvedBy when remediated', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'REMEDIATED',
        resolvedAt: new Date(),
        resolvedBy: TEST_USER_ID,
        resolution: 'Implemented encryption for student records at rest',
        control: { controlId: 'AC-03', title: 'Access Enforcement' },
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const result = await findingService.updateFindingStatus(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        TEST_USER_ID,
        {
          status: 'REMEDIATED',
          resolution: 'Implemented encryption for student records at rest',
        }
      );

      expect(result.status).toBe('REMEDIATED');
      expect(result.resolvedBy).toBe(TEST_USER_ID);
      expect(mockedPrisma.finding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'REMEDIATED',
            resolvedAt: expect.any(Date),
            resolvedBy: TEST_USER_ID,
            resolution: 'Implemented encryption for student records at rest',
          }),
        })
      );
    });

    it('should record resolvedAt and resolvedBy when closed', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'CLOSED',
        resolvedAt: new Date(),
        resolvedBy: TEST_USER_ID,
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      await findingService.updateFindingStatus(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        TEST_USER_ID,
        { status: 'CLOSED' }
      );

      expect(mockedPrisma.finding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLOSED',
            resolvedAt: expect.any(Date),
            resolvedBy: TEST_USER_ID,
          }),
        })
      );
    });

    it('should record riskAcceptedAt and riskAcceptedBy for risk acceptance', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'ACCEPTED_RISK',
        riskAcceptedAt: new Date(),
        riskAcceptedBy: TEST_USER_ID,
        riskAcceptReason: 'Legacy system being decommissioned in Q2. Compensating controls in place.',
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const result = await findingService.updateFindingStatus(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        TEST_USER_ID,
        {
          status: 'ACCEPTED_RISK',
          riskAcceptReason: 'Legacy system being decommissioned in Q2. Compensating controls in place.',
        }
      );

      expect(result.status).toBe('ACCEPTED_RISK');
      expect(result.riskAcceptedBy).toBe(TEST_USER_ID);
      expect(mockedPrisma.finding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ACCEPTED_RISK',
            riskAcceptedAt: expect.any(Date),
            riskAcceptedBy: TEST_USER_ID,
            riskAcceptReason: 'Legacy system being decommissioned in Q2. Compensating controls in place.',
          }),
        })
      );
    });

    it('should track status transition to IN_REMEDIATION', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'IN_REMEDIATION',
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const result = await findingService.updateFindingStatus(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        TEST_USER_ID,
        { status: 'IN_REMEDIATION' }
      );

      expect(result.status).toBe('IN_REMEDIATION');
    });

    it('should track false positive determination for audit clarity', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'FALSE_POSITIVE',
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const result = await findingService.updateFindingStatus(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        TEST_USER_ID,
        { status: 'FALSE_POSITIVE' }
      );

      expect(result.status).toBe('FALSE_POSITIVE');
    });
  });

  describe('verifyFinding - Verification Audit', () => {
    it('should record verifiedAt and verifiedBy for compliance verification', async () => {
      const verifierId = '770e8400-e29b-41d4-a716-446655440007';
      const mockVerifiedFinding = {
        id: TEST_FINDING_ID,
        status: 'CLOSED',
        verifiedAt: new Date(),
        verifiedBy: verifierId,
      };

      mockedPrisma.finding.update.mockResolvedValue(mockVerifiedFinding as any);

      const result = await findingService.verifyFinding(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        verifierId
      );

      expect(result.status).toBe('CLOSED');
      expect(result.verifiedBy).toBe(verifierId);
      expect(mockedPrisma.finding.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'CLOSED',
            verifiedAt: expect.any(Date),
            verifiedBy: verifierId,
          }),
        })
      );
    });

    it('should automatically close finding upon verification', async () => {
      mockedPrisma.finding.update.mockResolvedValue({
        id: TEST_FINDING_ID,
        status: 'CLOSED',
      } as any);

      const result = await findingService.verifyFinding(
        TEST_TENANT_ID,
        TEST_FINDING_ID,
        TEST_USER_ID
      );

      expect(result.status).toBe('CLOSED');
    });
  });

  describe('getFindingStats - Audit Statistics', () => {
    it('should aggregate findings by severity for risk reporting', async () => {
      mockedPrisma.finding.count
        .mockResolvedValueOnce(50)  // total
        .mockResolvedValueOnce(8);  // overdue

      mockedPrisma.finding.groupBy
        .mockResolvedValueOnce([
          { severity: 'CRITICAL', _count: { severity: 3 } },
          { severity: 'HIGH', _count: { severity: 12 } },
          { severity: 'MEDIUM', _count: { severity: 20 } },
          { severity: 'LOW', _count: { severity: 10 } },
          { severity: 'INFORMATIONAL', _count: { severity: 5 } },
        ] as any)
        .mockResolvedValueOnce([
          { status: 'OPEN', _count: { status: 25 } },
          { status: 'IN_REMEDIATION', _count: { status: 15 } },
          { status: 'REMEDIATED', _count: { status: 5 } },
          { status: 'CLOSED', _count: { status: 5 } },
        ] as any);

      const result = await findingService.getFindingStats(TEST_TENANT_ID);

      expect(result.total).toBe(50);
      expect(result.overdue).toBe(8);
      expect(result.bySeverity).toEqual({
        CRITICAL: 3,
        HIGH: 12,
        MEDIUM: 20,
        LOW: 10,
        INFORMATIONAL: 5,
      });
      expect(result.byStatus).toEqual({
        OPEN: 25,
        IN_REMEDIATION: 15,
        REMEDIATED: 5,
        CLOSED: 5,
      });
    });

    it('should count overdue findings for compliance escalation', async () => {
      mockedPrisma.finding.count
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(5);

      mockedPrisma.finding.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await findingService.getFindingStats(TEST_TENANT_ID);

      expect(result.overdue).toBe(5);
      expect(mockedPrisma.finding.count).toHaveBeenCalledWith({
        where: {
          tenantId: TEST_TENANT_ID,
          dueDate: { lt: expect.any(Date) },
          status: { in: ['OPEN', 'IN_REMEDIATION'] },
        },
      });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE SNAPSHOT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Compliance Snapshot Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('takeSnapshot - Historical Compliance Recording', () => {
    it('should capture overall compliance score at point in time', async () => {
      // Mock empty frameworks for simple case
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      // Mock no previous snapshot
      mockedPrisma.complianceSnapshot.findFirst.mockResolvedValue(null);
      mockedPrisma.complianceSnapshot.create.mockResolvedValue({
        id: 'snapshot-1',
        snapshotAt: new Date(),
      } as any);

      const result = await dashboardService.takeSnapshot(TEST_TENANT_ID);

      expect(result.snapshotAt).toBeDefined();
      expect(mockedPrisma.complianceSnapshot.create).toHaveBeenCalled();
    });

    it('should calculate score delta from previous snapshot', async () => {
      // Setup mocks
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      // Mock previous snapshot with score of 80
      mockedPrisma.complianceSnapshot.findFirst.mockResolvedValue({
        overallScore: 80,
      } as any);

      mockedPrisma.complianceSnapshot.create.mockResolvedValue({
        id: 'snapshot-1',
        snapshotAt: new Date(),
      } as any);

      await dashboardService.takeSnapshot(TEST_TENANT_ID);

      // Verify snapshot creation was called with scoreDelta
      expect(mockedPrisma.complianceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            scoreDelta: expect.any(Number),
          }),
        })
      );
    });

    it('should record trend direction based on score change', async () => {
      // Setup mocks
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      mockedPrisma.complianceSnapshot.findFirst.mockResolvedValue({
        overallScore: 75,
      } as any);

      mockedPrisma.complianceSnapshot.create.mockResolvedValue({} as any);

      await dashboardService.takeSnapshot(TEST_TENANT_ID);

      expect(mockedPrisma.complianceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trendDirection: expect.stringMatching(/up|down|stable/),
          }),
        })
      );
    });

    it('should capture control status counts for compliance metrics', async () => {
      const mockFramework = {
        id: 'fw-1',
        framework: 'FERPA',
        displayName: 'FERPA',
        controls: [
          { status: 'IMPLEMENTED' },
          { status: 'IMPLEMENTED' },
          { status: 'IN_PROGRESS' },
          { status: 'NOT_STARTED' },
        ],
      };

      mockedPrisma.tenantFramework.findMany.mockResolvedValue([mockFramework] as any);
      mockedPrisma.finding.count.mockResolvedValue(2);
      mockedPrisma.finding.groupBy.mockResolvedValue([
        { severity: 'HIGH', _count: { severity: 2 } },
      ] as any);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      mockedPrisma.complianceSnapshot.findFirst.mockResolvedValue(null);
      mockedPrisma.complianceSnapshot.create.mockResolvedValue({} as any);

      await dashboardService.takeSnapshot(TEST_TENANT_ID);

      // Verify framework snapshot was created
      expect(mockedPrisma.complianceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            framework: 'FERPA',
            controlsTotal: 4,
            controlsPassed: 2,
          }),
        })
      );
    });

    it('should capture findings summary for risk tracking', async () => {
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count
        .mockResolvedValueOnce(15)  // total
        .mockResolvedValueOnce(8)   // open
        .mockResolvedValueOnce(4)   // in_remediation
        .mockResolvedValueOnce(2);  // overdue

      mockedPrisma.finding.groupBy.mockResolvedValue([
        { severity: 'CRITICAL', _count: { severity: 2 } },
        { severity: 'HIGH', _count: { severity: 5 } },
        { severity: 'MEDIUM', _count: { severity: 6 } },
        { severity: 'LOW', _count: { severity: 2 } },
      ] as any);

      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      mockedPrisma.complianceSnapshot.findFirst.mockResolvedValue(null);
      mockedPrisma.complianceSnapshot.create.mockResolvedValue({} as any);

      await dashboardService.takeSnapshot(TEST_TENANT_ID);

      expect(mockedPrisma.complianceSnapshot.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            findingsOpen: expect.any(Number),
            findingsCritical: expect.any(Number),
            findingsHigh: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('getComplianceTrend - Historical Trend Analysis', () => {
    it('should retrieve compliance snapshots for trend analysis', async () => {
      const mockSnapshots = [
        { snapshotAt: new Date('2024-01-01'), overallScore: 70, controlsTotal: 50, controlsPassed: 35, findingsOpen: 15 },
        { snapshotAt: new Date('2024-01-15'), overallScore: 75, controlsTotal: 50, controlsPassed: 38, findingsOpen: 12 },
        { snapshotAt: new Date('2024-02-01'), overallScore: 80, controlsTotal: 50, controlsPassed: 40, findingsOpen: 10 },
        { snapshotAt: new Date('2024-02-15'), overallScore: 85, controlsTotal: 50, controlsPassed: 43, findingsOpen: 7 },
      ];

      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue(mockSnapshots as any);

      const result = await dashboardService.getComplianceTrend(TEST_TENANT_ID, undefined, 90);

      expect(result).toHaveLength(4);
      expect(result[0].overallScore).toBe(70);
      expect(result[3].overallScore).toBe(85);
    });

    it('should filter trend by specific framework', async () => {
      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue([]);

      await dashboardService.getComplianceTrend(TEST_TENANT_ID, 'FERPA', 90);

      expect(mockedPrisma.complianceSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            framework: 'FERPA',
          }),
        })
      );
    });

    it('should filter trend by date range', async () => {
      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue([]);

      await dashboardService.getComplianceTrend(TEST_TENANT_ID, undefined, 30);

      expect(mockedPrisma.complianceSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            snapshotAt: { gte: expect.any(Date) },
          }),
        })
      );
    });

    it('should order snapshots chronologically for trend visualization', async () => {
      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue([]);

      await dashboardService.getComplianceTrend(TEST_TENANT_ID);

      expect(mockedPrisma.complianceSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { snapshotAt: 'asc' },
        })
      );
    });

    it('should default to 90 days for trend analysis', async () => {
      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue([]);

      await dashboardService.getComplianceTrend(TEST_TENANT_ID);

      const call = mockedPrisma.complianceSnapshot.findMany.mock.calls[0][0];
      const since = new Date();
      since.setDate(since.getDate() - 90);

      // The snapshot date should be approximately 90 days ago
      expect((call as any).where.snapshotAt.gte.getTime()).toBeGreaterThan(since.getTime() - 1000);
      expect((call as any).where.snapshotAt.gte.getTime()).toBeLessThan(since.getTime() + 1000);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// COMPLIANCE ALERT AUDIT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Compliance Alert Audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAlerts - Alert Retrieval', () => {
    it('should retrieve unread alerts for compliance monitoring', async () => {
      const mockAlerts = [
        {
          id: TEST_ALERT_ID,
          alertType: 'finding_overdue',
          title: 'Critical Finding Overdue',
          message: 'FERPA finding is 10 days past due date',
          severity: 'CRITICAL',
          isRead: false,
          isDismissed: false,
          createdAt: new Date(),
        },
        {
          id: '881e8400-e29b-41d4-a716-446655440004',
          alertType: 'evidence_expiring',
          title: 'Evidence Expiring',
          message: 'Security training evidence expires in 14 days',
          severity: 'MEDIUM',
          isRead: false,
          isDismissed: false,
          createdAt: new Date(),
        },
      ];

      mockedPrisma.complianceAlert.findMany.mockResolvedValue(mockAlerts as any);

      const result = await dashboardService.getAlerts(TEST_TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].alertType).toBe('finding_overdue');
      expect(mockedPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: TEST_TENANT_ID,
            isRead: false,
            isDismissed: false,
          },
        })
      );
    });

    it('should retrieve all alerts when requested for audit review', async () => {
      mockedPrisma.complianceAlert.findMany.mockResolvedValue([]);

      await dashboardService.getAlerts(TEST_TENANT_ID, false);

      expect(mockedPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID },
        })
      );
    });

    it('should order alerts by severity and creation date', async () => {
      mockedPrisma.complianceAlert.findMany.mockResolvedValue([]);

      await dashboardService.getAlerts(TEST_TENANT_ID);

      expect(mockedPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        })
      );
    });

    it('should limit alerts to 50 for performance', async () => {
      mockedPrisma.complianceAlert.findMany.mockResolvedValue([]);

      await dashboardService.getAlerts(TEST_TENANT_ID);

      expect(mockedPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('markAlertRead - Read Audit Trail', () => {
    it('should record readAt and readBy for acknowledgment tracking', async () => {
      const mockAlert = {
        id: TEST_ALERT_ID,
        isRead: true,
        readAt: new Date(),
        readBy: TEST_USER_ID,
      };

      mockedPrisma.complianceAlert.update.mockResolvedValue(mockAlert as any);

      const result = await dashboardService.markAlertRead(
        TEST_TENANT_ID,
        TEST_ALERT_ID,
        TEST_USER_ID
      );

      expect(result.isRead).toBe(true);
      expect(result.readBy).toBe(TEST_USER_ID);
      expect(mockedPrisma.complianceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            isRead: true,
            readAt: expect.any(Date),
            readBy: TEST_USER_ID,
          },
        })
      );
    });

    it('should enforce tenant isolation when marking alerts read', async () => {
      mockedPrisma.complianceAlert.update.mockResolvedValue({
        id: TEST_ALERT_ID,
        isRead: true,
      } as any);

      await dashboardService.markAlertRead(TEST_TENANT_ID, TEST_ALERT_ID, TEST_USER_ID);

      expect(mockedPrisma.complianceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_ALERT_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });
  });

  describe('dismissAlert - Dismissal Audit Trail', () => {
    it('should record dismissedAt and dismissedBy for accountability', async () => {
      const mockAlert = {
        id: TEST_ALERT_ID,
        isDismissed: true,
        dismissedAt: new Date(),
        dismissedBy: TEST_USER_ID,
      };

      mockedPrisma.complianceAlert.update.mockResolvedValue(mockAlert as any);

      const result = await dashboardService.dismissAlert(
        TEST_TENANT_ID,
        TEST_ALERT_ID,
        TEST_USER_ID
      );

      expect(result.isDismissed).toBe(true);
      expect(result.dismissedBy).toBe(TEST_USER_ID);
      expect(mockedPrisma.complianceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            isDismissed: true,
            dismissedAt: expect.any(Date),
            dismissedBy: TEST_USER_ID,
          },
        })
      );
    });

    it('should enforce tenant isolation when dismissing alerts', async () => {
      mockedPrisma.complianceAlert.update.mockResolvedValue({
        id: TEST_ALERT_ID,
        isDismissed: true,
      } as any);

      await dashboardService.dismissAlert(TEST_TENANT_ID, TEST_ALERT_ID, TEST_USER_ID);

      expect(mockedPrisma.complianceAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_ALERT_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD AUDIT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Dashboard Audit Summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboardSummary - Compliance Overview', () => {
    it('should aggregate compliance data for executive reporting', async () => {
      const mockFramework = {
        id: 'fw-1',
        framework: 'FERPA',
        displayName: 'FERPA Compliance',
        controls: [
          { status: 'IMPLEMENTED' },
          { status: 'IMPLEMENTED' },
          { status: 'IN_PROGRESS' },
        ],
      };

      mockedPrisma.tenantFramework.findMany.mockResolvedValue([mockFramework] as any);

      mockedPrisma.finding.count
        .mockResolvedValueOnce(10)  // total
        .mockResolvedValueOnce(5)   // open
        .mockResolvedValueOnce(3)   // in_remediation
        .mockResolvedValueOnce(1)   // overdue
        .mockResolvedValueOnce(2);  // framework findings

      mockedPrisma.finding.groupBy.mockResolvedValue([
        { severity: 'HIGH', _count: { severity: 3 } },
        { severity: 'MEDIUM', _count: { severity: 5 } },
      ] as any);

      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardSummary(TEST_TENANT_ID);

      expect(result).toHaveProperty('overallScore');
      expect(result).toHaveProperty('frameworks');
      expect(result).toHaveProperty('findingsSummary');
      expect(result).toHaveProperty('upcomingDeadlines');
      expect(result).toHaveProperty('recentActivity');
      expect(result.frameworks[0].framework).toBe('FERPA');
    });

    it('should calculate overall score from framework scores', async () => {
      const mockFrameworks = [
        {
          id: 'fw-1',
          framework: 'FERPA',
          displayName: 'FERPA',
          controls: [
            { status: 'IMPLEMENTED' },
            { status: 'IMPLEMENTED' },
          ],
        },
        {
          id: 'fw-2',
          framework: 'COPPA',
          displayName: 'COPPA',
          controls: [
            { status: 'IMPLEMENTED' },
            { status: 'IN_PROGRESS' },
          ],
        },
      ];

      mockedPrisma.tenantFramework.findMany.mockResolvedValue(mockFrameworks as any);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardSummary(TEST_TENANT_ID);

      // 3 passed / 4 total = 75%
      expect(result.overallScore).toBe(75);
    });

    it('should include findings summary for risk overview', async () => {
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);

      mockedPrisma.finding.count
        .mockResolvedValueOnce(20)  // total
        .mockResolvedValueOnce(12) // open
        .mockResolvedValueOnce(5)  // in_remediation
        .mockResolvedValueOnce(3); // overdue

      mockedPrisma.finding.groupBy.mockResolvedValue([
        { severity: 'CRITICAL', _count: { severity: 2 } },
        { severity: 'HIGH', _count: { severity: 5 } },
        { severity: 'MEDIUM', _count: { severity: 8 } },
        { severity: 'LOW', _count: { severity: 3 } },
        { severity: 'INFORMATIONAL', _count: { severity: 2 } },
      ] as any);

      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardSummary(TEST_TENANT_ID);

      expect(result.findingsSummary.total).toBe(20);
      expect(result.findingsSummary.open).toBe(12);
      expect(result.findingsSummary.inRemediation).toBe(5);
      expect(result.findingsSummary.overdue).toBe(3);
      expect(result.findingsSummary.bySeverity.CRITICAL).toBe(2);
    });

    it('should include upcoming deadlines for proactive compliance', async () => {
      const upcomingFinding = {
        id: 'finding-1',
        title: 'Access Control Review',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        severity: 'HIGH',
      };

      const expiringEvidence = {
        id: 'evidence-1',
        title: 'Security Training Certificates',
        validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      };

      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany
        .mockResolvedValueOnce([upcomingFinding] as any)  // deadlines
        .mockResolvedValueOnce([]);  // recent activity
      mockedPrisma.evidence.findMany.mockResolvedValue([expiringEvidence] as any);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardSummary(TEST_TENANT_ID);

      expect(result.upcomingDeadlines.length).toBeGreaterThan(0);
      expect(result.upcomingDeadlines[0].type).toMatch(/finding|evidence/);
    });

    it('should include recent activity for compliance monitoring', async () => {
      const recentFinding = {
        id: 'finding-1',
        title: 'New FERPA Finding',
        status: 'OPEN',
        updatedAt: new Date(),
      };

      const recentControl = {
        id: 'control-1',
        controlId: 'AC-01',
        title: 'Access Control Policy',
        status: 'IMPLEMENTED',
        statusUpdatedAt: new Date(),
      };

      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany
        .mockResolvedValueOnce([])  // deadlines
        .mockResolvedValueOnce([recentFinding] as any);  // recent activity
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([recentControl] as any);

      const result = await dashboardService.getDashboardSummary(TEST_TENANT_ID);

      expect(result.recentActivity.length).toBeGreaterThan(0);
    });

    it('should return 100% score when no frameworks are enabled', async () => {
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      const result = await dashboardService.getDashboardSummary(TEST_TENANT_ID);

      expect(result.overallScore).toBe(100);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FINDING LIST WITH AUDIT CONTEXT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Finding List with Audit Context', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listFindings - Comprehensive Finding Retrieval', () => {
    it('should include control context for compliance mapping', async () => {
      const mockFindings = [
        {
          id: TEST_FINDING_ID,
          title: 'Access Control Gap',
          severity: 'HIGH',
          status: 'OPEN',
          control: {
            controlId: 'AC-02',
            title: 'Account Management',
            tenantFramework: { framework: 'FERPA' },
          },
          _count: { remediations: 1 },
        },
      ];

      mockedPrisma.finding.findMany.mockResolvedValue(mockFindings as any);
      mockedPrisma.finding.count.mockResolvedValue(1);

      const result = await findingService.listFindings(TEST_TENANT_ID, {});

      expect(result.data[0].control.controlId).toBe('AC-02');
      expect(result.data[0].control.tenantFramework.framework).toBe('FERPA');
    });

    it('should include remediation count for progress tracking', async () => {
      const mockFindings = [
        {
          id: TEST_FINDING_ID,
          title: 'Data Encryption Missing',
          severity: 'CRITICAL',
          status: 'IN_REMEDIATION',
          _count: { remediations: 2 },
        },
      ];

      mockedPrisma.finding.findMany.mockResolvedValue(mockFindings as any);
      mockedPrisma.finding.count.mockResolvedValue(1);

      const result = await findingService.listFindings(TEST_TENANT_ID, {});

      expect(result.data[0]._count.remediations).toBe(2);
    });

    it('should filter by assessment for audit scope', async () => {
      const assessmentId = '990e8400-e29b-41d4-a716-446655440005';

      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);

      await findingService.listFindings(TEST_TENANT_ID, { assessmentId });

      expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assessmentId,
          }),
        })
      );
    });

    it('should filter by control for focused compliance review', async () => {
      const controlId = '990e8400-e29b-41d4-a716-446655440006';

      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);

      await findingService.listFindings(TEST_TENANT_ID, { controlId });

      expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            controlId,
          }),
        })
      );
    });

    it('should order by severity then creation date for prioritization', async () => {
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);

      await findingService.listFindings(TEST_TENANT_ID, {});

      expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        })
      );
    });

    it('should support pagination for large audit datasets', async () => {
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(100);

      const result = await findingService.listFindings(TEST_TENANT_ID, {
        page: 2,
        pageSize: 25,
      });

      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(25);
      expect(result.pagination.totalPages).toBe(4);
      expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 25,
          take: 25,
        })
      );
    });
  });

  describe('getFindingById - Detailed Finding Audit', () => {
    it('should include full remediation history for audit trail', async () => {
      const mockFinding = {
        id: TEST_FINDING_ID,
        title: 'Student Data Breach',
        description: 'Unauthorized access to student records',
        severity: 'CRITICAL',
        status: 'IN_REMEDIATION',
        identifiedBy: TEST_USER_ID,
        identifiedAt: new Date(),
        assessment: { id: 'assess-1', name: 'Q4 2024 FERPA Audit', status: 'IN_PROGRESS' },
        control: {
          id: 'ctrl-1',
          controlId: 'AC-03',
          title: 'Access Enforcement',
          category: 'Access Control',
          tenantFramework: { framework: 'FERPA', displayName: 'FERPA Compliance' },
        },
        remediations: [
          {
            id: 'rem-1',
            title: 'Implement MFA',
            status: 'IN_PROGRESS',
            createdAt: new Date(),
            tasks: [
              { id: 'task-1', title: 'Configure MFA provider', isCompleted: true },
              { id: 'task-2', title: 'Roll out to users', isCompleted: false },
            ],
          },
          {
            id: 'rem-2',
            title: 'Review access logs',
            status: 'COMPLETED',
            createdAt: new Date(),
            tasks: [],
          },
        ],
      };

      mockedPrisma.finding.findFirst.mockResolvedValue(mockFinding as any);

      const result = await findingService.getFindingById(TEST_TENANT_ID, TEST_FINDING_ID);

      expect(result?.remediations).toHaveLength(2);
      expect(result?.remediations[0].tasks).toHaveLength(2);
      expect(result?.control.tenantFramework.framework).toBe('FERPA');
    });

    it('should return null for non-existent finding', async () => {
      mockedPrisma.finding.findFirst.mockResolvedValue(null);

      const result = await findingService.getFindingById(TEST_TENANT_ID, 'non-existent');

      expect(result).toBeNull();
    });

    it('should enforce tenant isolation for data protection', async () => {
      mockedPrisma.finding.findFirst.mockResolvedValue(null);

      await findingService.getFindingById(TEST_TENANT_ID, TEST_FINDING_ID);

      expect(mockedPrisma.finding.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_FINDING_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });
  });
});
