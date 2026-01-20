/**
 * AIVO IEP Service - IEP Routes Tests
 * Tests IEP CRUD operations, workflow, and access control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { mockPrisma, resetMocks, testData, createFullIEP } from './setup.js';

// Import service after mocking
import * as iepService from '../services/iepService.js';

describe('IEP Service - CRUD Operations', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CREATE IEP
  // ════════════════════════════════════════════════════════════════════════════

  describe('createIEP', () => {
    it('should create a new IEP with correct IEP number', async () => {
      const input = {
        studentId: testData.student.id,
        iepType: 'INITIAL',
        effectiveDate: '2024-01-20',
        academicLevel: 'Reading at grade level 2.5',
        functionalLevel: 'Age-appropriate social skills',
        parentConcerns: 'Reading progress concerns',
        studentStrengths: 'Strong verbal skills',
      };

      mockPrisma.iEP.count.mockResolvedValue(0);
      mockPrisma.iEP.create.mockResolvedValue({
        ...testData.iep,
        id: 'new-iep-001',
        iepNumber: 'IEP-1',
      });
      mockPrisma.iEP.update.mockResolvedValue({
        ...testData.iep,
        id: 'new-iep-001',
      });
      mockPrisma.iEP.findFirst.mockResolvedValue(createFullIEP());

      const result = await iepService.createIEP(testData.tenantId, testData.userId, input);

      expect(mockPrisma.iEP.count).toHaveBeenCalledWith({
        where: { tenantId: testData.tenantId, studentId: input.studentId },
      });
      expect(mockPrisma.iEP.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: testData.tenantId,
          studentId: input.studentId,
          iepNumber: 'IEP-1',
          version: 1,
          iepType: 'INITIAL',
          status: 'DRAFT',
          createdBy: testData.userId,
        }),
      });
      expect(result).toBeDefined();
    });

    it('should increment IEP number for existing student IEPs', async () => {
      const input = {
        studentId: testData.student.id,
        iepType: 'ANNUAL',
        effectiveDate: '2025-01-20',
      };

      mockPrisma.iEP.count.mockResolvedValue(2); // Student has 2 existing IEPs
      mockPrisma.iEP.create.mockResolvedValue({
        ...testData.iep,
        id: 'new-iep-003',
        iepNumber: 'IEP-3',
      });
      mockPrisma.iEP.update.mockResolvedValue({
        ...testData.iep,
        id: 'new-iep-003',
      });
      mockPrisma.iEP.findFirst.mockResolvedValue(createFullIEP());

      await iepService.createIEP(testData.tenantId, testData.userId, input);

      expect(mockPrisma.iEP.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          iepNumber: 'IEP-3',
        }),
      });
    });

    it('should set annual review date 1 year from effective date', async () => {
      const input = {
        studentId: testData.student.id,
        iepType: 'INITIAL',
        effectiveDate: '2024-01-20',
      };

      mockPrisma.iEP.count.mockResolvedValue(0);
      mockPrisma.iEP.create.mockResolvedValue({
        ...testData.iep,
        id: 'new-iep-001',
      });
      mockPrisma.iEP.update.mockResolvedValue({
        ...testData.iep,
      });
      mockPrisma.iEP.findFirst.mockResolvedValue(createFullIEP());

      await iepService.createIEP(testData.tenantId, testData.userId, input);

      expect(mockPrisma.iEP.update).toHaveBeenCalledWith({
        where: { id: 'new-iep-001' },
        data: expect.objectContaining({
          annualReviewDate: expect.any(Date),
          reevaluationDate: expect.any(Date),
        }),
      });
    });

    it('should handle different IEP types correctly', async () => {
      const iepTypes = ['INITIAL', 'ANNUAL', 'TRIENNIAL', 'AMENDMENT', 'TRANSFER'];

      for (const iepType of iepTypes) {
        resetMocks();
        mockPrisma.iEP.count.mockResolvedValue(0);
        mockPrisma.iEP.create.mockResolvedValue({
          ...testData.iep,
          iepType,
        });
        mockPrisma.iEP.findFirst.mockResolvedValue(createFullIEP());

        await iepService.createIEP(testData.tenantId, testData.userId, {
          studentId: testData.student.id,
          iepType,
        });

        expect(mockPrisma.iEP.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            iepType,
          }),
        });
      }
    });

    it('should set ESY eligibility when provided', async () => {
      const input = {
        studentId: testData.student.id,
        iepType: 'ANNUAL',
        esyEligible: true,
      };

      mockPrisma.iEP.count.mockResolvedValue(0);
      mockPrisma.iEP.create.mockResolvedValue({
        ...testData.iep,
        esyEligible: true,
      });
      mockPrisma.iEP.findFirst.mockResolvedValue(createFullIEP());

      await iepService.createIEP(testData.tenantId, testData.userId, input);

      expect(mockPrisma.iEP.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          esyEligible: true,
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET IEP
  // ════════════════════════════════════════════════════════════════════════════

  describe('getIEP', () => {
    it('should return IEP with all relations', async () => {
      const fullIEP = createFullIEP();
      mockPrisma.iEP.findFirst.mockResolvedValue(fullIEP);

      const result = await iepService.getIEP(testData.tenantId, testData.iep.id);

      expect(mockPrisma.iEP.findFirst).toHaveBeenCalledWith({
        where: { id: testData.iep.id, tenantId: testData.tenantId },
        include: expect.objectContaining({
          student: expect.any(Object),
          goals: expect.any(Object),
          accommodations: expect.any(Object),
          modifications: expect.any(Object),
          services: expect.any(Object),
          transitionPlan: true,
          _count: expect.any(Object),
        }),
      });
      expect(result).toEqual(fullIEP);
    });

    it('should return null for non-existent IEP', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      const result = await iepService.getIEP(testData.tenantId, 'non-existent-id');

      expect(result).toBeNull();
    });

    it('should enforce tenant isolation', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      const result = await iepService.getIEP('other-tenant', testData.iep.id);

      expect(mockPrisma.iEP.findFirst).toHaveBeenCalledWith({
        where: { id: testData.iep.id, tenantId: 'other-tenant' },
        include: expect.any(Object),
      });
      expect(result).toBeNull();
    });

    it('should include only active accommodations and services', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(createFullIEP());

      await iepService.getIEP(testData.tenantId, testData.iep.id);

      expect(mockPrisma.iEP.findFirst).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.objectContaining({
          accommodations: { where: { isActive: true } },
          services: { where: { isActive: true } },
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LIST IEPs
  // ════════════════════════════════════════════════════════════════════════════

  describe('listIEPs', () => {
    it('should return paginated list of IEPs', async () => {
      const ieps = [createFullIEP(), { ...createFullIEP(), id: 'iep-002' }];
      mockPrisma.iEP.findMany.mockResolvedValue(ieps);
      mockPrisma.iEP.count.mockResolvedValue(2);

      const result = await iepService.listIEPs(testData.tenantId, { page: 1, pageSize: 20 });

      expect(result.data).toEqual(ieps);
      expect(result.pagination).toEqual({
        page: 1,
        pageSize: 20,
        totalItems: 2,
        totalPages: 1,
      });
    });

    it('should filter by student ID', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([createFullIEP()]);
      mockPrisma.iEP.count.mockResolvedValue(1);

      await iepService.listIEPs(testData.tenantId, { studentId: testData.student.id });

      expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            studentId: testData.student.id,
          }),
        })
      );
    });

    it('should filter by status', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([]);
      mockPrisma.iEP.count.mockResolvedValue(0);

      await iepService.listIEPs(testData.tenantId, { status: 'ACTIVE' });

      expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
          }),
        })
      );
    });

    it('should filter by IEP type', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([]);
      mockPrisma.iEP.count.mockResolvedValue(0);

      await iepService.listIEPs(testData.tenantId, { iepType: 'ANNUAL' });

      expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            iepType: 'ANNUAL',
          }),
        })
      );
    });

    it('should handle pagination correctly', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([]);
      mockPrisma.iEP.count.mockResolvedValue(50);

      const result = await iepService.listIEPs(testData.tenantId, { page: 3, pageSize: 10 });

      expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20, // (page - 1) * pageSize
          take: 10,
        })
      );
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should order by creation date descending', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([]);
      mockPrisma.iEP.count.mockResolvedValue(0);

      await iepService.listIEPs(testData.tenantId, {});

      expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE IEP
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateIEP', () => {
    it('should update IEP fields', async () => {
      const updates = {
        academicLevel: 'Updated academic level',
        functionalLevel: 'Updated functional level',
        genEdPercentage: 90,
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEP.update.mockResolvedValue({
        ...testData.iep,
        ...updates,
      });

      const result = await iepService.updateIEP(
        testData.tenantId,
        testData.iep.id,
        testData.userId,
        updates
      );

      expect(mockPrisma.iEP.update).toHaveBeenCalledWith({
        where: { id: testData.iep.id },
        data: expect.objectContaining({
          ...updates,
          lastModifiedBy: testData.userId,
        }),
      });
      expect(result.academicLevel).toBe(updates.academicLevel);
    });

    it('should throw error for non-existent IEP', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      await expect(
        iepService.updateIEP(testData.tenantId, 'non-existent-id', testData.userId, {})
      ).rejects.toThrow('IEP not found');
    });

    it('should convert date strings to Date objects', async () => {
      const updates = {
        meetingDate: '2024-02-15',
        effectiveDate: '2024-02-20',
        annualReviewDate: '2025-02-20',
      };

      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEP.update.mockResolvedValue(testData.iep);

      await iepService.updateIEP(testData.tenantId, testData.iep.id, testData.userId, updates);

      expect(mockPrisma.iEP.update).toHaveBeenCalledWith({
        where: { id: testData.iep.id },
        data: expect.objectContaining({
          meetingDate: expect.any(Date),
          effectiveDate: expect.any(Date),
          annualReviewDate: expect.any(Date),
        }),
      });
    });

    it('should track last modified by user', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
      mockPrisma.iEP.update.mockResolvedValue(testData.iep);

      await iepService.updateIEP(testData.tenantId, testData.iep.id, 'different-user', {
        academicLevel: 'Updated',
      });

      expect(mockPrisma.iEP.update).toHaveBeenCalledWith({
        where: { id: testData.iep.id },
        data: expect.objectContaining({
          lastModifiedBy: 'different-user',
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // IEP WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════

  describe('IEP Workflow', () => {
    describe('submitIEP', () => {
      it('should submit draft IEP for review', async () => {
        mockPrisma.iEP.findFirst.mockResolvedValue({
          ...testData.iep,
          status: 'DRAFT',
        });
        mockPrisma.iEP.update.mockResolvedValue({
          ...testData.iep,
          status: 'PENDING_REVIEW',
          submittedAt: new Date(),
        });

        const result = await iepService.submitIEP(
          testData.tenantId,
          testData.iep.id,
          testData.userId
        );

        expect(mockPrisma.iEP.update).toHaveBeenCalledWith({
          where: { id: testData.iep.id },
          data: {
            status: 'PENDING_REVIEW',
            submittedAt: expect.any(Date),
            lastModifiedBy: testData.userId,
          },
        });
        expect(result.status).toBe('PENDING_REVIEW');
      });

      it('should throw error if IEP is not in draft status', async () => {
        mockPrisma.iEP.findFirst.mockResolvedValue({
          ...testData.iep,
          status: 'ACTIVE',
        });

        await expect(
          iepService.submitIEP(testData.tenantId, testData.iep.id, testData.userId)
        ).rejects.toThrow('IEP is not in draft status');
      });

      it('should throw error if IEP not found', async () => {
        mockPrisma.iEP.findFirst.mockResolvedValue(null);

        await expect(
          iepService.submitIEP(testData.tenantId, 'non-existent', testData.userId)
        ).rejects.toThrow('IEP not found');
      });
    });

    describe('approveIEP', () => {
      it('should approve and activate IEP', async () => {
        mockPrisma.iEP.findFirst.mockResolvedValue({
          ...testData.iep,
          status: 'PENDING_REVIEW',
        });
        mockPrisma.iEP.update.mockResolvedValue({
          ...testData.iep,
          status: 'ACTIVE',
          approvedAt: new Date(),
          approvedBy: testData.userId,
        });

        const result = await iepService.approveIEP(
          testData.tenantId,
          testData.iep.id,
          testData.userId
        );

        expect(mockPrisma.iEP.update).toHaveBeenCalledWith({
          where: { id: testData.iep.id },
          data: {
            status: 'ACTIVE',
            approvedAt: expect.any(Date),
            approvedBy: testData.userId,
            lastModifiedBy: testData.userId,
          },
        });
        expect(result.status).toBe('ACTIVE');
      });

      it('should throw error if IEP not found', async () => {
        mockPrisma.iEP.findFirst.mockResolvedValue(null);

        await expect(
          iepService.approveIEP(testData.tenantId, 'non-existent', testData.userId)
        ).rejects.toThrow('IEP not found');
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ACCESS CONTROL
  // ════════════════════════════════════════════════════════════════════════════

  describe('Access Control - Tenant Isolation', () => {
    it('should not return IEPs from other tenants', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null);

      const result = await iepService.getIEP('other-tenant-id', testData.iep.id);

      expect(mockPrisma.iEP.findFirst).toHaveBeenCalledWith({
        where: { id: testData.iep.id, tenantId: 'other-tenant-id' },
        include: expect.any(Object),
      });
      expect(result).toBeNull();
    });

    it('should only list IEPs for specified tenant', async () => {
      mockPrisma.iEP.findMany.mockResolvedValue([]);
      mockPrisma.iEP.count.mockResolvedValue(0);

      await iepService.listIEPs('specific-tenant', {});

      expect(mockPrisma.iEP.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'specific-tenant',
          }),
        })
      );
    });

    it('should verify tenant ownership before updating', async () => {
      mockPrisma.iEP.findFirst.mockResolvedValue(null); // IEP not found in different tenant

      await expect(
        iepService.updateIEP('different-tenant', testData.iep.id, testData.userId, {})
      ).rejects.toThrow('IEP not found');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // MEETINGS
  // ════════════════════════════════════════════════════════════════════════════

  describe('Meetings', () => {
    describe('scheduleMeeting', () => {
      it('should create a new meeting', async () => {
        const meetingInput = {
          meetingType: 'ANNUAL_REVIEW',
          scheduledDate: '2024-03-15',
          scheduledTime: '2:00 PM',
          duration: 90,
          location: 'Conference Room B',
          purpose: 'Annual review meeting',
          agenda: 'Review progress and update goals',
        };

        mockPrisma.iEP.findFirst.mockResolvedValue(testData.iep);
        mockPrisma.meeting.create.mockResolvedValue({
          ...testData.meeting,
          ...meetingInput,
        });

        const result = await iepService.scheduleMeeting(
          testData.tenantId,
          testData.iep.id,
          testData.userId,
          meetingInput
        );

        expect(mockPrisma.meeting.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            iepId: testData.iep.id,
            meetingType: 'ANNUAL_REVIEW',
            status: 'SCHEDULED',
            createdBy: testData.userId,
          }),
        });
        expect(result).toBeDefined();
      });

      it('should throw error if IEP not found', async () => {
        mockPrisma.iEP.findFirst.mockResolvedValue(null);

        await expect(
          iepService.scheduleMeeting(testData.tenantId, 'non-existent', testData.userId, {
            meetingType: 'ANNUAL_REVIEW',
            scheduledDate: '2024-03-15',
          })
        ).rejects.toThrow('IEP not found');
      });
    });

    describe('completeMeeting', () => {
      it('should mark meeting as completed with notes', async () => {
        const completionData = {
          notes: 'Meeting completed successfully',
          decisions: 'Goals updated, services approved',
        };

        mockPrisma.meeting.findFirst.mockResolvedValue({
          ...testData.meeting,
          iep: { tenantId: testData.tenantId },
        });
        mockPrisma.meeting.update.mockResolvedValue({
          ...testData.meeting,
          status: 'COMPLETED',
          actualDate: new Date(),
          ...completionData,
        });

        const result = await iepService.completeMeeting(
          testData.tenantId,
          testData.meeting.id,
          completionData
        );

        expect(mockPrisma.meeting.update).toHaveBeenCalledWith({
          where: { id: testData.meeting.id },
          data: {
            status: 'COMPLETED',
            actualDate: expect.any(Date),
            notes: completionData.notes,
            decisions: completionData.decisions,
          },
        });
        expect(result.status).toBe('COMPLETED');
      });

      it('should throw error for meeting not found or wrong tenant', async () => {
        mockPrisma.meeting.findFirst.mockResolvedValue({
          ...testData.meeting,
          iep: { tenantId: 'other-tenant' },
        });

        await expect(
          iepService.completeMeeting(testData.tenantId, testData.meeting.id, {})
        ).rejects.toThrow('Meeting not found');
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD
  // ════════════════════════════════════════════════════════════════════════════

  describe('Dashboard', () => {
    it('should return dashboard statistics', async () => {
      mockPrisma.student.count.mockResolvedValue(100);
      mockPrisma.iEP.count.mockResolvedValue(85);
      mockPrisma.iEP.groupBy.mockResolvedValue([
        { status: 'ACTIVE', _count: { status: 85 } },
        { status: 'DRAFT', _count: { status: 10 } },
        { status: 'PENDING_REVIEW', _count: { status: 5 } },
      ]);
      mockPrisma.meeting.findMany.mockResolvedValue([testData.meeting]);
      mockPrisma.complianceAlert.count.mockResolvedValue(3);

      const result = await iepService.getDashboard(testData.tenantId);

      expect(result).toEqual({
        totalStudents: 100,
        activeIEPs: 85,
        byStatus: {
          ACTIVE: 85,
          DRAFT: 10,
          PENDING_REVIEW: 5,
        },
        upcomingMeetings: [testData.meeting],
        openComplianceAlerts: 3,
      });
    });

    it('should filter dashboard data by tenant', async () => {
      mockPrisma.student.count.mockResolvedValue(0);
      mockPrisma.iEP.count.mockResolvedValue(0);
      mockPrisma.iEP.groupBy.mockResolvedValue([]);
      mockPrisma.meeting.findMany.mockResolvedValue([]);
      mockPrisma.complianceAlert.count.mockResolvedValue(0);

      await iepService.getDashboard('specific-tenant');

      expect(mockPrisma.student.count).toHaveBeenCalledWith({
        where: { tenantId: 'specific-tenant', status: 'ACTIVE' },
      });
      expect(mockPrisma.iEP.count).toHaveBeenCalledWith({
        where: { tenantId: 'specific-tenant', status: 'ACTIVE' },
      });
    });
  });
});
