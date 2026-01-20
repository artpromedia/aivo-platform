/**
 * AIVO Compliance Service - Policy Management Tests
 *
 * Tests for compliance policy management including framework configuration,
 * control implementation tracking, and policy lifecycle management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    assessment: {
      count: vi.fn(),
    },
    finding: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from '../prisma.js';
import * as frameworkService from '../services/frameworkService.js';

const mockedPrisma = vi.mocked(prisma);

// ══════════════════════════════════════════════════════════════════════════════
// TEST CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const TEST_TENANT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_USER_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_FRAMEWORK_ID = '770e8400-e29b-41d4-a716-446655440002';
const TEST_CONTROL_ID = '880e8400-e29b-41d4-a716-446655440003';

// ══════════════════════════════════════════════════════════════════════════════
// FRAMEWORK SERVICE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Framework Service - Policy Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('enableFramework', () => {
    it('should enable FERPA framework for educational institution', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        tenantId: TEST_TENANT_ID,
        framework: 'FERPA',
        displayName: 'FERPA Student Privacy',
        description: 'Compliance with Family Educational Rights and Privacy Act',
        isActive: true,
        priority: 1,
        applicableFrom: new Date('2024-01-01'),
        applicableUntil: null,
        enabledBy: TEST_USER_ID,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'FERPA',
          displayName: 'FERPA Student Privacy',
          description: 'Compliance with Family Educational Rights and Privacy Act',
          priority: 1,
          applicableFrom: '2024-01-01T00:00:00.000Z',
        }
      );

      expect(result.framework).toBe('FERPA');
      expect(result.displayName).toBe('FERPA Student Privacy');
      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TEST_TENANT_ID,
            framework: 'FERPA',
            enabledBy: TEST_USER_ID,
          }),
        })
      );
    });

    it('should enable COPPA framework with child privacy focus', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        tenantId: TEST_TENANT_ID,
        framework: 'COPPA',
        displayName: 'COPPA',
        isActive: true,
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'COPPA',
          description: "Protecting children's online privacy for students under 13",
        }
      );

      expect(result.framework).toBe('COPPA');
    });

    it('should enable GDPR framework for international compliance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'GDPR',
        displayName: 'GDPR EU Compliance',
        applicableFrom: new Date('2024-01-01'),
        applicableUntil: null,
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'GDPR',
          displayName: 'GDPR EU Compliance',
          applicableFrom: '2024-01-01T00:00:00.000Z',
        }
      );

      expect(result.framework).toBe('GDPR');
    });

    it('should enable SOC2 framework for security assurance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'SOC2',
        displayName: 'SOC 2 Type II',
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'SOC2',
          displayName: 'SOC 2 Type II',
          description: 'Service Organization Control 2 compliance',
        }
      );

      expect(result.framework).toBe('SOC2');
    });

    it('should use framework name as default displayName', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'HIPAA',
        displayName: 'HIPAA',
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'HIPAA' }
      );

      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            displayName: 'HIPAA',
          }),
        })
      );
    });

    it('should set default priority to 0', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'PCI_DSS',
        priority: 0,
        _count: { controls: 0, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'PCI_DSS' }
      );

      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: 0,
          }),
        })
      );
    });
  });

  describe('getFrameworks', () => {
    it('should list only active frameworks by default', async () => {
      const mockFrameworks = [
        { id: 'fw-1', framework: 'FERPA', isActive: true, _count: { controls: 45, assessments: 2 } },
        { id: 'fw-2', framework: 'COPPA', isActive: true, _count: { controls: 12, assessments: 1 } },
      ];

      mockedPrisma.tenantFramework.findMany.mockResolvedValue(mockFrameworks as any);

      const result = await frameworkService.getFrameworks(TEST_TENANT_ID);

      expect(result).toHaveLength(2);
      expect(mockedPrisma.tenantFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, isActive: true },
        })
      );
    });

    it('should include inactive frameworks when requested for policy review', async () => {
      const mockFrameworks = [
        { id: 'fw-1', framework: 'FERPA', isActive: true },
        { id: 'fw-2', framework: 'COPPA', isActive: false },
      ];

      mockedPrisma.tenantFramework.findMany.mockResolvedValue(mockFrameworks as any);

      const result = await frameworkService.getFrameworks(TEST_TENANT_ID, true);

      expect(result).toHaveLength(2);
      expect(mockedPrisma.tenantFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID },
        })
      );
    });

    it('should order frameworks by priority then name', async () => {
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);

      await frameworkService.getFrameworks(TEST_TENANT_ID);

      expect(mockedPrisma.tenantFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ priority: 'desc' }, { framework: 'asc' }],
        })
      );
    });

    it('should include control and assessment counts for policy metrics', async () => {
      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);

      await frameworkService.getFrameworks(TEST_TENANT_ID);

      expect(mockedPrisma.tenantFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            _count: {
              select: { controls: true, assessments: true },
            },
          },
        })
      );
    });
  });

  describe('getFrameworkById', () => {
    it('should return framework with all controls for policy review', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        tenantId: TEST_TENANT_ID,
        framework: 'FERPA',
        displayName: 'FERPA Compliance',
        controls: [
          {
            id: 'ctrl-1',
            controlId: '99.31',
            title: 'Directory Information',
            category: 'Data Disclosure',
            status: 'IMPLEMENTED',
            isMandatory: true,
          },
          {
            id: 'ctrl-2',
            controlId: '99.32',
            title: 'Annual Notification',
            category: 'Notification Requirements',
            status: 'IN_PROGRESS',
            isMandatory: true,
          },
        ],
        _count: { controls: 2, assessments: 1 },
      };

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.getFrameworkById(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(result?.controls).toHaveLength(2);
      expect(result?.controls[0].controlId).toBe('99.31');
    });

    it('should return null for non-existent framework', async () => {
      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(null);

      const result = await frameworkService.getFrameworkById(TEST_TENANT_ID, 'non-existent');

      expect(result).toBeNull();
    });

    it('should enforce tenant isolation for data protection', async () => {
      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(null);

      await frameworkService.getFrameworkById(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(mockedPrisma.tenantFramework.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_FRAMEWORK_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });
  });

  describe('getFrameworkByType', () => {
    it('should find framework by type for quick policy lookup', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.getFrameworkByType(TEST_TENANT_ID, 'FERPA');

      expect(result?.framework).toBe('FERPA');
      expect(mockedPrisma.tenantFramework.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TEST_TENANT_ID, framework: 'FERPA' },
        })
      );
    });
  });

  describe('updateFramework', () => {
    it('should update framework display name for branding', async () => {
      const mockUpdatedFramework = {
        id: TEST_FRAMEWORK_ID,
        displayName: 'FERPA - District Compliance',
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockUpdatedFramework as any);

      const result = await frameworkService.updateFramework(
        TEST_TENANT_ID,
        TEST_FRAMEWORK_ID,
        { displayName: 'FERPA - District Compliance' }
      );

      expect(result.displayName).toBe('FERPA - District Compliance');
    });

    it('should update framework priority for compliance focus', async () => {
      const mockUpdatedFramework = {
        id: TEST_FRAMEWORK_ID,
        priority: 10,
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockUpdatedFramework as any);

      const result = await frameworkService.updateFramework(
        TEST_TENANT_ID,
        TEST_FRAMEWORK_ID,
        { priority: 10 }
      );

      expect(result.priority).toBe(10);
    });

    it('should deactivate framework when out of scope', async () => {
      const mockUpdatedFramework = {
        id: TEST_FRAMEWORK_ID,
        isActive: false,
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockUpdatedFramework as any);

      const result = await frameworkService.updateFramework(
        TEST_TENANT_ID,
        TEST_FRAMEWORK_ID,
        { isActive: false }
      );

      expect(result.isActive).toBe(false);
    });

    it('should update framework description for documentation', async () => {
      const mockUpdatedFramework = {
        id: TEST_FRAMEWORK_ID,
        description: 'Updated FERPA compliance program for 2024-2025 school year',
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockUpdatedFramework as any);

      const result = await frameworkService.updateFramework(
        TEST_TENANT_ID,
        TEST_FRAMEWORK_ID,
        { description: 'Updated FERPA compliance program for 2024-2025 school year' }
      );

      expect(result.description).toBe('Updated FERPA compliance program for 2024-2025 school year');
    });
  });

  describe('disableFramework', () => {
    it('should soft-delete framework by setting isActive to false', async () => {
      const mockDisabledFramework = {
        id: TEST_FRAMEWORK_ID,
        isActive: false,
      };

      mockedPrisma.tenantFramework.update.mockResolvedValue(mockDisabledFramework as any);

      const result = await frameworkService.disableFramework(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(result.isActive).toBe(false);
      expect(mockedPrisma.tenantFramework.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_FRAMEWORK_ID, tenantId: TEST_TENANT_ID },
          data: { isActive: false },
        })
      );
    });
  });

  describe('deleteFramework', () => {
    it('should delete framework with no assessments', async () => {
      mockedPrisma.assessment.count.mockResolvedValue(0);
      mockedPrisma.tenantFramework.delete.mockResolvedValue({} as any);

      await frameworkService.deleteFramework(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(mockedPrisma.tenantFramework.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_FRAMEWORK_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });

    it('should prevent deletion when assessments exist for audit trail', async () => {
      mockedPrisma.assessment.count.mockResolvedValue(3);

      await expect(
        frameworkService.deleteFramework(TEST_TENANT_ID, TEST_FRAMEWORK_ID)
      ).rejects.toThrow('Cannot delete framework with existing assessments');

      expect(mockedPrisma.tenantFramework.delete).not.toHaveBeenCalled();
    });

    it('should check assessment count before deletion for data integrity', async () => {
      mockedPrisma.assessment.count.mockResolvedValue(0);
      mockedPrisma.tenantFramework.delete.mockResolvedValue({} as any);

      await frameworkService.deleteFramework(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(mockedPrisma.assessment.count).toHaveBeenCalledWith({
        where: { tenantFrameworkId: TEST_FRAMEWORK_ID },
      });
    });
  });

  describe('getFrameworkSummary', () => {
    it('should calculate compliance score correctly', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        displayName: 'FERPA Compliance',
      };

      const mockControlStats = [
        { status: 'IMPLEMENTED', _count: { status: 36 } },
        { status: 'IN_PROGRESS', _count: { status: 5 } },
        { status: 'NOT_STARTED', _count: { status: 4 } },
        { status: 'NOT_APPLICABLE', _count: { status: 5 } },
      ];

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);
      mockedPrisma.control.groupBy.mockResolvedValue(mockControlStats as any);
      mockedPrisma.finding.count.mockResolvedValue(3);

      const result = await frameworkService.getFrameworkSummary(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      // 36 implemented / 45 applicable (50 - 5 NA) = 80%
      expect(result.score).toBe(80);
      expect(result.totalControls).toBe(50);
      expect(result.openFindings).toBe(3);
      expect(result.framework).toBe('FERPA');
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

      const result = await frameworkService.getFrameworkSummary(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(result.score).toBe(100);
    });

    it('should return 100% score when no applicable controls exist', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'CUSTOM',
        displayName: 'Custom Framework',
      };

      const mockControlStats = [
        { status: 'NOT_APPLICABLE', _count: { status: 5 } },
      ];

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);
      mockedPrisma.control.groupBy.mockResolvedValue(mockControlStats as any);
      mockedPrisma.finding.count.mockResolvedValue(0);

      const result = await frameworkService.getFrameworkSummary(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(result.score).toBe(100);
    });

    it('should throw error when framework not found', async () => {
      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(null);
      mockedPrisma.control.groupBy.mockResolvedValue([]);
      mockedPrisma.finding.count.mockResolvedValue(0);

      await expect(
        frameworkService.getFrameworkSummary(TEST_TENANT_ID, 'non-existent')
      ).rejects.toThrow('Framework not found');
    });

    it('should include control status breakdown for detailed reporting', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'SOC2',
        displayName: 'SOC 2',
      };

      const mockControlStats = [
        { status: 'IMPLEMENTED', _count: { status: 50 } },
        { status: 'IN_PROGRESS', _count: { status: 10 } },
        { status: 'NOT_STARTED', _count: { status: 5 } },
        { status: 'PARTIALLY_IMPLEMENTED', _count: { status: 3 } },
      ];

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);
      mockedPrisma.control.groupBy.mockResolvedValue(mockControlStats as any);
      mockedPrisma.finding.count.mockResolvedValue(8);

      const result = await frameworkService.getFrameworkSummary(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(result.controlsByStatus).toEqual({
        IMPLEMENTED: 50,
        IN_PROGRESS: 10,
        NOT_STARTED: 5,
        PARTIALLY_IMPLEMENTED: 3,
      });
    });

    it('should count open and in-remediation findings', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        displayName: 'FERPA',
      };

      mockedPrisma.tenantFramework.findFirst.mockResolvedValue(mockFramework as any);
      mockedPrisma.control.groupBy.mockResolvedValue([{ status: 'IMPLEMENTED', _count: { status: 10 } }] as any);
      mockedPrisma.finding.count.mockResolvedValue(5);

      await frameworkService.getFrameworkSummary(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(mockedPrisma.finding.count).toHaveBeenCalledWith({
        where: {
          tenantId: TEST_TENANT_ID,
          control: { tenantFrameworkId: TEST_FRAMEWORK_ID },
          status: { in: ['OPEN', 'IN_REMEDIATION'] },
        },
      });
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POLICY LIFECYCLE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Policy Lifecycle Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Multi-Framework Policy Management', () => {
    it('should support enabling multiple frameworks for comprehensive compliance', async () => {
      const frameworks = ['FERPA', 'COPPA', 'CIPA'];

      for (const framework of frameworks) {
        mockedPrisma.tenantFramework.create.mockResolvedValueOnce({
          id: `fw-${framework}`,
          framework,
          _count: { controls: 0, assessments: 0 },
        } as any);

        const result = await frameworkService.enableFramework(
          TEST_TENANT_ID,
          TEST_USER_ID,
          { framework: framework as any }
        );

        expect(result.framework).toBe(framework);
      }

      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledTimes(3);
    });

    it('should allow framework prioritization for compliance focus', async () => {
      const mockFrameworks = [
        { id: 'fw-1', framework: 'FERPA', priority: 10, isActive: true },
        { id: 'fw-2', framework: 'COPPA', priority: 8, isActive: true },
        { id: 'fw-3', framework: 'CIPA', priority: 5, isActive: true },
      ];

      mockedPrisma.tenantFramework.findMany.mockResolvedValue(mockFrameworks as any);

      const result = await frameworkService.getFrameworks(TEST_TENANT_ID);

      expect(result[0].framework).toBe('FERPA');
      expect(result[0].priority).toBe(10);
    });
  });

  describe('Education-Specific Compliance', () => {
    it('should support FERPA for student privacy protection', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        displayName: 'FERPA Student Records',
        description: 'Protecting student education records and privacy',
        _count: { controls: 45, assessments: 2 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'FERPA',
          displayName: 'FERPA Student Records',
          description: 'Protecting student education records and privacy',
        }
      );

      expect(result.framework).toBe('FERPA');
    });

    it('should support COPPA for child online privacy', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'COPPA',
        displayName: 'COPPA Under-13 Protection',
        _count: { controls: 12, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'COPPA',
          displayName: 'COPPA Under-13 Protection',
        }
      );

      expect(result.framework).toBe('COPPA');
    });

    it('should support CIPA for internet safety', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'CIPA',
        displayName: 'CIPA Internet Safety',
        _count: { controls: 8, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'CIPA',
          displayName: 'CIPA Internet Safety',
        }
      );

      expect(result.framework).toBe('CIPA');
    });

    it('should support IDEA for special education compliance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'IDEA',
        displayName: 'IDEA Special Education',
        _count: { controls: 20, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'IDEA',
          displayName: 'IDEA Special Education',
        }
      );

      expect(result.framework).toBe('IDEA');
    });
  });

  describe('International Compliance', () => {
    it('should support GDPR for EU data protection', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'GDPR',
        displayName: 'GDPR EU Compliance',
        description: 'General Data Protection Regulation for EU students and staff',
        _count: { controls: 65, assessments: 1 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'GDPR',
          displayName: 'GDPR EU Compliance',
          description: 'General Data Protection Regulation for EU students and staff',
        }
      );

      expect(result.framework).toBe('GDPR');
    });

    it('should support CCPA for California privacy compliance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'CCPA',
        displayName: 'CCPA California Privacy',
        _count: { controls: 25, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'CCPA', displayName: 'CCPA California Privacy' }
      );

      expect(result.framework).toBe('CCPA');
    });
  });

  describe('Security Frameworks', () => {
    it('should support SOC2 for security assurance', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'SOC2',
        displayName: 'SOC 2 Type II',
        _count: { controls: 116, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'SOC2', displayName: 'SOC 2 Type II' }
      );

      expect(result.framework).toBe('SOC2');
    });

    it('should support ISO27001 for information security', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'ISO27001',
        displayName: 'ISO 27001:2022',
        _count: { controls: 93, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'ISO27001', displayName: 'ISO 27001:2022' }
      );

      expect(result.framework).toBe('ISO27001');
    });

    it('should support NIST_CSF for cybersecurity framework', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'NIST_CSF',
        displayName: 'NIST Cybersecurity Framework',
        _count: { controls: 108, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'NIST_CSF', displayName: 'NIST Cybersecurity Framework' }
      );

      expect(result.framework).toBe('NIST_CSF');
    });
  });

  describe('Healthcare Compliance', () => {
    it('should support HIPAA for health information privacy', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'HIPAA',
        displayName: 'HIPAA Health Privacy',
        description: 'Health Insurance Portability and Accountability Act for school health records',
        _count: { controls: 54, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'HIPAA',
          displayName: 'HIPAA Health Privacy',
          description: 'Health Insurance Portability and Accountability Act for school health records',
        }
      );

      expect(result.framework).toBe('HIPAA');
    });
  });

  describe('Payment Compliance', () => {
    it('should support PCI_DSS for payment card security', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'PCI_DSS',
        displayName: 'PCI DSS v4.0',
        description: 'Payment Card Industry Data Security Standard for tuition payments',
        _count: { controls: 78, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'PCI_DSS',
          displayName: 'PCI DSS v4.0',
          description: 'Payment Card Industry Data Security Standard for tuition payments',
        }
      );

      expect(result.framework).toBe('PCI_DSS');
    });
  });

  describe('Custom Framework Support', () => {
    it('should support custom frameworks for internal policies', async () => {
      const mockFramework = {
        id: TEST_FRAMEWORK_ID,
        framework: 'CUSTOM',
        displayName: 'District Information Security Policy',
        description: 'Internal security policies specific to our school district',
        _count: { controls: 25, assessments: 0 },
      };

      mockedPrisma.tenantFramework.create.mockResolvedValue(mockFramework as any);

      const result = await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        {
          framework: 'CUSTOM',
          displayName: 'District Information Security Policy',
          description: 'Internal security policies specific to our school district',
        }
      );

      expect(result.framework).toBe('CUSTOM');
      expect(result.displayName).toBe('District Information Security Policy');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POLICY VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Policy Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Framework Applicability', () => {
    it('should set applicableFrom date for compliance tracking', async () => {
      const applicableFrom = '2024-01-01T00:00:00.000Z';

      mockedPrisma.tenantFramework.create.mockResolvedValue({
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        applicableFrom: new Date(applicableFrom),
        _count: { controls: 0, assessments: 0 },
      } as any);

      await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'FERPA', applicableFrom }
      );

      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicableFrom: new Date(applicableFrom),
          }),
        })
      );
    });

    it('should set applicableUntil for temporary compliance requirements', async () => {
      const applicableUntil = '2025-12-31T23:59:59.999Z';

      mockedPrisma.tenantFramework.create.mockResolvedValue({
        id: TEST_FRAMEWORK_ID,
        framework: 'CUSTOM',
        applicableUntil: new Date(applicableUntil),
        _count: { controls: 0, assessments: 0 },
      } as any);

      await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'CUSTOM', applicableUntil }
      );

      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicableUntil: new Date(applicableUntil),
          }),
        })
      );
    });

    it('should default applicableFrom to current date', async () => {
      mockedPrisma.tenantFramework.create.mockResolvedValue({
        id: TEST_FRAMEWORK_ID,
        framework: 'FERPA',
        _count: { controls: 0, assessments: 0 },
      } as any);

      await frameworkService.enableFramework(
        TEST_TENANT_ID,
        TEST_USER_ID,
        { framework: 'FERPA' }
      );

      expect(mockedPrisma.tenantFramework.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicableFrom: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('Tenant Isolation', () => {
    it('should enforce tenant isolation when getting frameworks', async () => {
      const otherTenantId = '999e8400-e29b-41d4-a716-446655440999';

      mockedPrisma.tenantFramework.findMany.mockResolvedValue([]);

      await frameworkService.getFrameworks(otherTenantId);

      expect(mockedPrisma.tenantFramework.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: otherTenantId,
          }),
        })
      );
    });

    it('should enforce tenant isolation when updating frameworks', async () => {
      mockedPrisma.tenantFramework.update.mockResolvedValue({
        id: TEST_FRAMEWORK_ID,
        _count: { controls: 0, assessments: 0 },
      } as any);

      await frameworkService.updateFramework(
        TEST_TENANT_ID,
        TEST_FRAMEWORK_ID,
        { displayName: 'Updated Name' }
      );

      expect(mockedPrisma.tenantFramework.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_FRAMEWORK_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });

    it('should enforce tenant isolation when deleting frameworks', async () => {
      mockedPrisma.assessment.count.mockResolvedValue(0);
      mockedPrisma.tenantFramework.delete.mockResolvedValue({} as any);

      await frameworkService.deleteFramework(TEST_TENANT_ID, TEST_FRAMEWORK_ID);

      expect(mockedPrisma.tenantFramework.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_FRAMEWORK_ID, tenantId: TEST_TENANT_ID },
        })
      );
    });
  });
});
