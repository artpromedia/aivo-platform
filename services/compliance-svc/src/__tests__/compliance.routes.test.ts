/**
 * AIVO Compliance Service - Compliance Routes Tests
 *
 * Tests for compliance check endpoints including frameworks, findings, and dashboard.
 * Focuses on regulatory compliance requirements for FERPA, COPPA, GDPR, etc.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import type { JwtPayload } from '../types/index.js';

// Mock Prisma client
vi.mock('../prisma.js', () => ({
  prisma: {
    tenantFramework: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    control: {
      groupBy: vi.fn(),
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
    assessment: {
      count: vi.fn(),
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
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma.js';
import { registerFrameworkRoutes } from '../routes/frameworks.js';
import { registerFindingRoutes } from '../routes/findings.js';
import { registerDashboardRoutes } from '../routes/dashboard.js';

const mockedPrisma = vi.mocked(prisma);

// ══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_FRAMEWORK_ID = '770e8400-e29b-41d4-a716-446655440002';
const TEST_FINDING_ID = '880e8400-e29b-41d4-a716-446655440003';
const TEST_ALERT_ID = '990e8400-e29b-41d4-a716-446655440004';

function createTestApp(): FastifyInstance {
  const app = Fastify({ logger: false });

  // Add mock auth middleware
  app.decorateRequest('tenantId', null);
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader === 'Bearer valid-token') {
      request.tenantId = TEST_TENANT_ID;
      request.user = {
        sub: TEST_USER_ID,
        tenantId: TEST_TENANT_ID,
        email: 'compliance-officer@school.edu',
        roles: ['compliance_admin'],
      };
    }
  });

  return app;
}

// ══════════════════════════════════════════════════════════════════════════════
// FRAMEWORK ROUTES TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Framework Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = createTestApp();
    await app.register(registerFrameworkRoutes as any, { prefix: '/compliance/frameworks' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /compliance/frameworks - Enable Framework', () => {
    it('should enable a FERPA framework for educational compliance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        tenantId: TEST_TENANT_ID,
        framework: 'FERPA',
        displayName: 'FERPA Compliance',
        description: 'Family Educational Rights and Privacy Act compliance',
        isActive: true,
        priority: 1,
        applicableFrom: new Date(),
        applicableUntil: null,
        enabledBy: TEST_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/frameworks',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          framework: 'FERPA',
          displayName: 'FERPA Compliance',
          description: 'Family Educational Rights and Privacy Act compliance',
          priority: 1,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.framework).toBe('FERPA');
      expect(body.displayName).toBe('FERPA Compliance');
    });

    it('should enable a COPPA framework for child privacy compliance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        tenantId: TEST_TENANT_ID,
        framework: 'COPPA',
        displayName: 'COPPA Compliance',
        description: "Children's Online Privacy Protection Act",
        isActive: true,
        priority: 2,
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/frameworks',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          framework: 'COPPA',
          displayName: 'COPPA Compliance',
          description: "Children's Online Privacy Protection Act",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).framework).toBe('COPPA');
    });

    it('should enable GDPR framework for EU data protection compliance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        tenantId: TEST_TENANT_ID,
        framework: 'GDPR',
        displayName: 'GDPR Compliance',
        description: 'General Data Protection Regulation for EU students',
        isActive: true,
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/frameworks',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          framework: 'GDPR',
          displayName: 'GDPR Compliance',
        },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body).framework).toBe('GDPR');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/frameworks',
        payload: { framework: 'FERPA' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 400 for invalid framework type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/frameworks',
        headers: { authorization: 'Bearer valid-token' },
        payload: { framework: 'INVALID_FRAMEWORK' },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('Validation Error');
    });

    it('should return 409 when framework is already enabled', async () => {
      const prismaError = new Error('Unique constraint violation');
      (prismaError as any).code = 'P2002';
      mockedPrisma.tenantFramework.create.mockRejectedValue(prismaError);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/frameworks',
        headers: { authorization: 'Bearer valid-token' },
        payload: { framework: 'FERPA' },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).message).toBe('This framework is already enabled');
    });
  });

  describe('GET /compliance/frameworks - List Frameworks', () => {
    it('should list all active compliance frameworks', async () => {
      const mockFrameworks = [
        {
          id: TEST_FRAMEWORK_ID,
          framework: 'FERPA',
          displayName: 'FERPA',
          isActive: true,
          _count: { controls: 45, assessments: 2 },
        },
        {
          id: '771e8400-e29b-41d4-a716-446655440003',
          framework: 'COPPA',
          displayName: 'COPPA',
          isActive: true,
          _count: { controls: 12, assessments: 1 },
        },
      ];

      mockedPrisma.tenantFramework.findMany.mockResolvedValue(mockFrameworks as any);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/frameworks',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].framework).toBe('FERPA');
    });

    it('should include inactive frameworks when requested', async () => {
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/frameworks?includeInactive=true',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockedPrisma.tenantFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID },
        })
      );
    });
  });

  describe('GET /compliance/frameworks/:frameworkId - Get Framework Details', () => {
    it('should return framework with controls for compliance review', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        displayName: 'FERPA Compliance',
        controls: [
          {
            id: 'ctrl-1',
            controlId: '99.31',
            title: 'Directory Information Disclosure',
            category: 'Data Disclosure',
            status: 'IMPLEMENTED',
            isMandatory: true,
          },
          {
            id: 'ctrl-2',
            controlId: '99.32',
            title: 'Annual Notification',
            category: 'Notification',
            status: 'IN_PROGRESS',
            isMandatory: true,
          },
        ],
        _count: { controls: 2, assessments: 1 },
      };

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);

      const response = await app.inject({
        method: 'GET',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.controls).toHaveLength(2);
      expect(body.controls[0].controlId).toBe('99.31');
    });

    it('should return 404 for non-existent framework', async () => {
      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /compliance/frameworks/:frameworkId/summary - Compliance Summary', () => {
    it('should calculate compliance score for regulatory reporting', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        displayName: 'FERPA Compliance',
      };

      const mockControlStats = [
        { status: 'IMPLEMENTED', _count: { status: 40 } },
        { status: 'IN_PROGRESS', _count: { status: 3 } },
        { status: 'NOT_STARTED', _count: { status: 2 } },
        { status: 'NOT_APPLICABLE', _count: { status: 5 } },
      ];

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);
      mockedPrisma.control.groupBy.mockResolvedValue(mockControlStats as any);
      mockedPrisma.finding.count.mockResolvedValue(3);

      const response = await app.inject({
        method: 'GET',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}/summary`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      // 40 implemented / 45 applicable (50 total - 5 NA) = 89%
      expect(body.score).toBe(89);
      expect(body.openFindings).toBe(3);
      expect(body.totalControls).toBe(50);
    });

    it('should return 100% score when all applicable controls are implemented', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'COPPA',
        displayName: 'COPPA Compliance',
      };

      const mockControlStats = [
        { status: 'IMPLEMENTED', _count: { status: 10 } },
        { status: 'NOT_APPLICABLE', _count: { status: 2 } },
      ];

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);
      mockedPrisma.control.groupBy.mockResolvedValue(mockControlStats as any);
      mockedPrisma.finding.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}/summary`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.score).toBe(100);
    });
  });

  describe('PATCH /compliance/frameworks/:frameworkId - Update Framework', () => {
    it('should update framework priority for compliance management', async () => {
      const mockUpdatedFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        displayName: 'FERPA - High Priority',
        priority: 10,
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockUpdatedFramework as any);

      const response = await app.inject({
        method: 'PATCH',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}`,
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          displayName: 'FERPA - High Priority',
          priority: 10,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.displayName).toBe('FERPA - High Priority');
      expect(body.priority).toBe(10);
    });

    it('should deactivate framework when compliance scope changes', async () => {
      const mockUpdatedFramework = {
        id: TEST_FRAMEWORK_ID,
        isActive: false,
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockUpdatedFramework as any);

      const response = await app.inject({
        method: 'PATCH',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}`,
        headers: { authorization: 'Bearer valid-token' },
        payload: { isActive: false },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).isActive).toBe(false);
    });
  });

  describe('DELETE /compliance/frameworks/:frameworkId - Delete Framework', () => {
    it('should delete framework with no assessments', async () => {
      mockedPrisma.assessment.count.mockResolvedValue(0);
      mockedPrisma.tenantFramework.delete.mockResolvedValue({} as any);

      const response = await app.inject({
        method: 'DELETE',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should prevent deletion when assessments exist for audit trail', async () => {
      mockedPrisma.assessment.count.mockResolvedValue(3);

      const response = await app.inject({
        method: 'DELETE',
        url: `/compliance/frameworks/${TEST_FRAMEWORK_ID}`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.body).message).toContain('Cannot delete');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// FINDING ROUTES TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Finding Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = createTestApp();
    await app.register(registerFindingRoutes as any, { prefix: '/compliance/findings' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /compliance/findings - Create Finding', () => {
    it('should create a critical compliance finding for FERPA violation', async () => {
      const mockFinding = {
        id: TEST_FINDING_ID,
        tenantId: TEST_TENANT_ID,
        title: 'Student Records Exposed Without Consent',
        description: 'Directory information disclosed without proper annual notification',
        severity: 'CRITICAL',
        status: 'OPEN',
        identifiedBy: TEST_USER_ID,
        createdAt: new Date(),
        assessment: null,
        control: {
          id: 'ctrl-1',
          controlId: '99.31',
          title: 'Directory Information',
          tenantFramework: { framework: 'FERPA' },
        },
        _count: { remediations: 0 },
      };

      mockedPrisma.finding.create.mockResolvedValue(mockFinding as any);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/findings',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          title: 'Student Records Exposed Without Consent',
          description: 'Directory information disclosed without proper annual notification',
          severity: 'CRITICAL',
          rootCause: 'Missing annual notification process',
          impact: 'Potential FERPA violation reportable to DOE',
          affectedSystems: ['student-portal', 'parent-portal'],
          dueDate: '2024-02-15T00:00:00.000Z',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.severity).toBe('CRITICAL');
      expect(body.status).toBe('OPEN');
    });

    it('should create finding for COPPA parental consent violation', async () => {
      const mockFinding = {
        id: TEST_FINDING_ID,
        title: 'Missing Parental Consent Records',
        description: 'Verifiable parental consent not obtained for children under 13',
        severity: 'HIGH',
        status: 'OPEN',
        _count: { remediations: 0 },
      };

      mockedPrisma.finding.create.mockResolvedValue(mockFinding as any);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/findings',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          title: 'Missing Parental Consent Records',
          description: 'Verifiable parental consent not obtained for children under 13',
          severity: 'HIGH',
          impact: 'FTC enforcement action risk',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should validate required fields for compliance documentation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/findings',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          // Missing required title and description
          severity: 'HIGH',
        },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('Validation Error');
    });

    it('should validate severity levels for risk categorization', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/compliance/findings',
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          title: 'Test Finding',
          description: 'Test description',
          severity: 'INVALID_SEVERITY',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /compliance/findings - List Findings', () => {
    it('should list all open findings for compliance review', async () => {
      const mockFindings = [
        {
          id: TEST_FINDING_ID,
          title: 'Data Retention Policy Violation',
          severity: 'HIGH',
          status: 'OPEN',
          control: { controlId: 'DR-01', title: 'Data Retention' },
          _count: { remediations: 1 },
        },
        {
          id: '881e8400-e29b-41d4-a716-446655440004',
          title: 'Access Control Gap',
          severity: 'MEDIUM',
          status: 'IN_REMEDIATION',
          control: { controlId: 'AC-02', title: 'Access Control' },
          _count: { remediations: 2 },
        },
      ];

      mockedPrisma.finding.findMany.mockResolvedValue(mockFindings as any);
      mockedPrisma.finding.count.mockResolvedValue(2);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/findings',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.pagination.totalItems).toBe(2);
    });

    it('should filter findings by severity for risk-based prioritization', async () => {
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/findings?severity=CRITICAL',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            severity: 'CRITICAL',
          }),
        })
      );
    });

    it('should filter overdue findings for compliance escalation', async () => {
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/findings?overdue=true',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockedPrisma.finding.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dueDate: expect.any(Object),
            status: { in: ['OPEN', 'IN_REMEDIATION'] },
          }),
        })
      );
    });

    it('should support pagination for large compliance datasets', async () => {
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(150);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/findings?page=3&pageSize=50',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pagination.page).toBe(3);
      expect(body.pagination.pageSize).toBe(50);
      expect(body.pagination.totalPages).toBe(3);
    });
  });

  describe('GET /compliance/findings/stats - Finding Statistics', () => {
    it('should return statistics for compliance dashboard', async () => {
      mockedPrisma.finding.count
        .mockResolvedValueOnce(25) // total
        .mockResolvedValueOnce(5);  // overdue

      mockedPrisma.finding.groupBy
        .mockResolvedValueOnce([
          { severity: 'CRITICAL', _count: { severity: 2 } },
          { severity: 'HIGH', _count: { severity: 8 } },
          { severity: 'MEDIUM', _count: { severity: 10 } },
          { severity: 'LOW', _count: { severity: 5 } },
        ] as any)
        .mockResolvedValueOnce([
          { status: 'OPEN', _count: { status: 15 } },
          { status: 'IN_REMEDIATION', _count: { status: 7 } },
          { status: 'CLOSED', _count: { status: 3 } },
        ] as any);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/findings/stats',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBe(25);
      expect(body.overdue).toBe(5);
      expect(body.bySeverity.CRITICAL).toBe(2);
      expect(body.byStatus.OPEN).toBe(15);
    });
  });

  describe('POST /compliance/findings/:findingId/status - Update Finding Status', () => {
    it('should mark finding as remediated with resolution details', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'REMEDIATED',
        resolvedAt: new Date(),
        resolvedBy: TEST_USER_ID,
        resolution: 'Implemented annual notification process and verified parent portal disclosure',
        control: { controlId: '99.31', title: 'Directory Information' },
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/findings/${TEST_FINDING_ID}/status`,
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          status: 'REMEDIATED',
          resolution: 'Implemented annual notification process and verified parent portal disclosure',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('REMEDIATED');
    });

    it('should accept risk with documented justification', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'ACCEPTED_RISK',
        riskAcceptedAt: new Date(),
        riskAcceptedBy: TEST_USER_ID,
        riskAcceptReason: 'Legacy system deprecation planned for Q2 2024. Compensating controls in place.',
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/findings/${TEST_FINDING_ID}/status`,
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          status: 'ACCEPTED_RISK',
          riskAcceptReason: 'Legacy system deprecation planned for Q2 2024. Compensating controls in place.',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).status).toBe('ACCEPTED_RISK');
    });

    it('should mark finding as false positive for audit clarity', async () => {
      const mockUpdatedFinding = {
        id: TEST_FINDING_ID,
        status: 'FALSE_POSITIVE',
      };

      mockedPrisma.finding.update.mockResolvedValue(mockUpdatedFinding as any);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/findings/${TEST_FINDING_ID}/status`,
        headers: { authorization: 'Bearer valid-token' },
        payload: {
          status: 'FALSE_POSITIVE',
          resolution: 'Control was already implemented. Initial assessment was incorrect.',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /compliance/findings/:findingId/verify - Verify Remediation', () => {
    it('should verify remediated finding and close it', async () => {
      const mockVerifiedFinding = {
        id: TEST_FINDING_ID,
        status: 'CLOSED',
        verifiedAt: new Date(),
        verifiedBy: TEST_USER_ID,
      };

      mockedPrisma.finding.update.mockResolvedValue(mockVerifiedFinding as any);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/findings/${TEST_FINDING_ID}/verify`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('CLOSED');
      expect(body.verifiedAt).toBeDefined();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTES TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Dashboard Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = createTestApp();
    await app.register(registerDashboardRoutes as any, { prefix: '/compliance/dashboard' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /compliance/dashboard - Dashboard Summary', () => {
    it('should return comprehensive compliance dashboard for executives', async () => {
      // Mock frameworks
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([
        {
          id: TEST_FRAMEWORK_ID,
          framework: 'FERPA',
          displayName: 'FERPA Compliance',
          controls: [
            { status: 'IMPLEMENTED' },
            { status: 'IMPLEMENTED' },
            { status: 'IN_PROGRESS' },
            { status: 'NOT_STARTED' },
          ],
        },
      ] as any);

      // Mock findings counts
      mockedPrisma.finding.count
        .mockResolvedValueOnce(20)  // total
        .mockResolvedValueOnce(12)  // open
        .mockResolvedValueOnce(5)   // in_remediation
        .mockResolvedValueOnce(3)   // overdue
        .mockResolvedValueOnce(2);  // open findings for framework

      mockedPrisma.finding.groupBy.mockResolvedValue([
        { severity: 'CRITICAL', _count: { severity: 1 } },
        { severity: 'HIGH', _count: { severity: 4 } },
      ] as any);

      // Mock upcoming deadlines
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);

      // Mock recent activity
      mockedPrisma.control.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/dashboard',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('overallScore');
      expect(body).toHaveProperty('frameworks');
      expect(body).toHaveProperty('findingsSummary');
      expect(body).toHaveProperty('upcomingDeadlines');
      expect(body).toHaveProperty('recentActivity');
    });
  });

  describe('GET /compliance/dashboard/trend - Compliance Trend', () => {
    it('should return compliance score trend for reporting', async () => {
      const mockSnapshots = [
        { snapshotAt: new Date('2024-01-01'), overallScore: 75, controlsTotal: 50, controlsPassed: 38, findingsOpen: 10 },
        { snapshotAt: new Date('2024-01-15'), overallScore: 80, controlsTotal: 50, controlsPassed: 40, findingsOpen: 8 },
        { snapshotAt: new Date('2024-02-01'), overallScore: 85, controlsTotal: 50, controlsPassed: 43, findingsOpen: 5 },
      ];

      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue(mockSnapshots as any);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/dashboard/trend?days=90',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(3);
      expect(body.data[2].overallScore).toBe(85);
    });

    it('should filter trend by specific framework', async () => {
      mockedPrisma.complianceSnapshot.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/dashboard/trend?framework=FERPA&days=30',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockedPrisma.complianceSnapshot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            framework: 'FERPA',
          }),
        })
      );
    });

    it('should validate days parameter within allowed range', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/compliance/dashboard/trend?days=500',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /compliance/dashboard/snapshot - Take Snapshot', () => {
    it('should capture compliance snapshot for historical tracking', async () => {
      // Setup mocks for getDashboardSummary
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);
      mockedPrisma.finding.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.findMany.mockResolvedValue([]);
      mockedPrisma.evidence.findMany.mockResolvedValue([]);
      mockedPrisma.remediation.findMany.mockResolvedValue([]);
      mockedPrisma.control.findMany.mockResolvedValue([]);

      // Mock previous snapshot
      mockedPrisma.complianceSnapshot.findFirst.mockResolvedValue({
        overallScore: 80,
      } as any);

      // Mock snapshot creation
      mockedPrisma.complianceSnapshot.create.mockResolvedValue({
        id: 'snapshot-1',
        snapshotAt: new Date(),
      } as any);

      const response = await app.inject({
        method: 'POST',
        url: '/compliance/dashboard/snapshot',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toHaveProperty('snapshotAt');
    });
  });

  describe('GET /compliance/dashboard/alerts - Compliance Alerts', () => {
    it('should return unread compliance alerts', async () => {
      const mockAlerts = [
        {
          id: TEST_ALERT_ID,
          alertType: 'evidence_expiring',
          title: 'Evidence Expiring Soon',
          message: 'Security awareness training records expire in 7 days',
          severity: 'MEDIUM',
          isRead: false,
          isDismissed: false,
        },
        {
          id: '991e8400-e29b-41d4-a716-446655440005',
          alertType: 'finding_overdue',
          title: 'Critical Finding Overdue',
          message: 'FERPA finding "Student Records Exposure" is 5 days overdue',
          severity: 'CRITICAL',
          isRead: false,
          isDismissed: false,
        },
      ];

      mockedPrisma.complianceAlert.findMany.mockResolvedValue(mockAlerts as any);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/dashboard/alerts',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].alertType).toBe('evidence_expiring');
    });

    it('should return all alerts when requested', async () => {
      mockedPrisma.complianceAlert.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/compliance/dashboard/alerts?all=true',
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(mockedPrisma.complianceAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID },
        })
      );
    });
  });

  describe('POST /compliance/dashboard/alerts/:alertId/read - Mark Alert Read', () => {
    it('should mark alert as read for tracking', async () => {
      const mockAlert = {
        id: TEST_ALERT_ID,
        isRead: true,
        readAt: new Date(),
        readBy: TEST_USER_ID,
      };

      mockedPrisma.complianceAlert.update.mockResolvedValue(mockAlert as any);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/dashboard/alerts/${TEST_ALERT_ID}/read`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).isRead).toBe(true);
    });

    it('should return 404 for non-existent alert', async () => {
      const prismaError = new Error('Record not found');
      (prismaError as any).code = 'P2025';
      mockedPrisma.complianceAlert.update.mockRejectedValue(prismaError);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/dashboard/alerts/${TEST_ALERT_ID}/read`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('POST /compliance/dashboard/alerts/:alertId/dismiss - Dismiss Alert', () => {
    it('should dismiss alert with audit trail', async () => {
      const mockAlert = {
        id: TEST_ALERT_ID,
        isDismissed: true,
        dismissedAt: new Date(),
        dismissedBy: TEST_USER_ID,
      };

      mockedPrisma.complianceAlert.update.mockResolvedValue(mockAlert as any);

      const response = await app.inject({
        method: 'POST',
        url: `/compliance/dashboard/alerts/${TEST_ALERT_ID}/dismiss`,
        headers: { authorization: 'Bearer valid-token' },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).isDismissed).toBe(true);
      expect(JSON.parse(response.body).dismissedBy).toBe(TEST_USER_ID);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TYPE AUGMENTATION
// ══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    tenantId: string | null;
    user?: JwtPayload;
  }
}
