/**
 * Accommodation Service Unit Tests
 *
 * Tests for learner accommodation management with Prisma mocking.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TenantContext } from '../src/types/index.js';

// Mock Prisma client
const mockPrisma = {
  learnerAccommodation: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  learnerProfile: {
    findUnique: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  listAccommodations,
  createAccommodation,
  updateAccommodation,
  deleteAccommodation,
  getAccommodation,
} from '../src/services/accommodationService.js';

describe('AccommodationService', () => {
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const context: TenantContext = {
    tenantId,
    userId: 'user-789',
    userRole: 'TEACHER',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // LIST ACCOMMODATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('listAccommodations', () => {
    it('should return empty array when no accommodations exist', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      const result = await listAccommodations(tenantId, learnerId, {});

      expect(result).toEqual([]);
      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          learnerId,
          isActive: true,
        },
        orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should return all active accommodations by default', async () => {
      const mockAccommodations = [
        {
          id: 'acc-1',
          category: 'VISUAL',
          description: 'Large text',
          appliesToDomains: ['READING'],
          source: 'IEP',
          isCritical: true,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: null,
          isActive: true,
          tenantId,
          learnerId,
        },
        {
          id: 'acc-2',
          category: 'TIME',
          description: 'Extended time',
          appliesToDomains: ['ALL'],
          source: 'PLAN_504',
          isCritical: false,
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-12-31'),
          isActive: true,
          tenantId,
          learnerId,
        },
      ];

      mockPrisma.learnerAccommodation.findMany.mockResolvedValue(mockAccommodations);

      const result = await listAccommodations(tenantId, learnerId, {});

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'acc-1',
        category: 'VISUAL',
        description: 'Large text',
        appliesToDomains: ['READING'],
        source: 'IEP',
        isCritical: true,
        effectiveFrom: expect.any(Date),
        effectiveTo: null,
        isActive: true,
      });
    });

    it('should filter by category', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      await listAccommodations(tenantId, learnerId, { category: 'VISUAL' });

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          category: 'VISUAL',
        }),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by source', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      await listAccommodations(tenantId, learnerId, { source: 'IEP' });

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          source: 'IEP',
        }),
        orderBy: expect.any(Array),
      });
    });

    it('should filter by isCritical', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      await listAccommodations(tenantId, learnerId, { isCritical: 'true' });

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          isCritical: true,
        }),
        orderBy: expect.any(Array),
      });
    });

    it('should include inactive accommodations when requested', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      await listAccommodations(tenantId, learnerId, { includeInactive: 'true' });

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          learnerId,
          // No isActive filter when includeInactive is true
        },
        orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should combine multiple filters', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      await listAccommodations(tenantId, learnerId, {
        category: 'MOTOR',
        source: 'PARENT_PREFERENCE',
        isCritical: 'false',
      });

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: {
          tenantId,
          learnerId,
          category: 'MOTOR',
          source: 'PARENT_PREFERENCE',
          isCritical: false,
          isActive: true,
        },
        orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
      });
    });

    it('should order by critical first, then createdAt descending', async () => {
      const criticalAcc = {
        id: 'acc-critical',
        isCritical: true,
        createdAt: new Date('2024-01-01'),
      };
      const nonCriticalAcc = {
        id: 'acc-normal',
        isCritical: false,
        createdAt: new Date('2024-06-01'),
      };

      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([nonCriticalAcc, criticalAcc]);

      await listAccommodations(tenantId, learnerId, {});

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        orderBy: [{ isCritical: 'desc' }, { createdAt: 'desc' }],
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET ACCOMMODATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('getAccommodation', () => {
    it('should return null when accommodation not found', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(null);

      const result = await getAccommodation(tenantId, learnerId, 'nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return accommodation by id with tenant isolation', async () => {
      const mockAccommodation = {
        id: 'acc-1',
        tenantId,
        learnerId,
        category: 'VISUAL',
        description: 'Test accommodation',
      };

      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(mockAccommodation);

      const result = await getAccommodation(tenantId, learnerId, 'acc-1');

      expect(result).toEqual(mockAccommodation);
      expect(mockPrisma.learnerAccommodation.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'acc-1',
          tenantId,
          learnerId,
        },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CREATE ACCOMMODATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('createAccommodation', () => {
    it('should create accommodation with required fields', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue({ id: 'profile-1' });

      const createdAcc = {
        id: 'new-acc-1',
        tenantId,
        learnerId,
        profileId: 'profile-1',
        category: 'VISUAL',
        description: 'Needs large text',
        appliesToDomains: [],
        source: 'PARENT_PREFERENCE',
        isCritical: false,
        effectiveFrom: new Date(),
        effectiveTo: null,
        createdByUserId: context.userId,
      };

      mockPrisma.learnerAccommodation.create.mockResolvedValue(createdAcc);

      const result = await createAccommodation(
        tenantId,
        learnerId,
        {
          category: 'VISUAL',
          description: 'Needs large text',
        },
        context
      );

      expect(result.id).toBe('new-acc-1');
      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          learnerId,
          profileId: 'profile-1',
          category: 'VISUAL',
          description: 'Needs large text',
          source: 'PARENT_PREFERENCE',
          isCritical: false,
          createdByUserId: context.userId,
        }),
      });
    });

    it('should create accommodation without profile link if profile does not exist', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAccommodation.create.mockResolvedValue({
        id: 'new-acc-1',
        profileId: undefined,
      });

      await createAccommodation(
        tenantId,
        learnerId,
        {
          category: 'MOTOR',
          description: 'Extended time',
        },
        context
      );

      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          profileId: undefined,
        }),
      });
    });

    it('should use custom source when provided', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAccommodation.create.mockResolvedValue({ id: 'acc-1' });

      await createAccommodation(
        tenantId,
        learnerId,
        {
          category: 'COGNITIVE',
          description: 'Simplified instructions',
          source: 'IEP',
        },
        context
      );

      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: 'IEP',
        }),
      });
    });

    it('should set isCritical when provided', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAccommodation.create.mockResolvedValue({ id: 'acc-1' });

      await createAccommodation(
        tenantId,
        learnerId,
        {
          category: 'MEDICAL',
          description: 'Seizure monitoring required',
          isCritical: true,
        },
        context
      );

      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          isCritical: true,
        }),
      });
    });

    it('should set effective dates when provided', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAccommodation.create.mockResolvedValue({ id: 'acc-1' });

      await createAccommodation(
        tenantId,
        learnerId,
        {
          category: 'TIME',
          description: 'Temporary extended time',
          effectiveFrom: '2024-01-01',
          effectiveTo: '2024-06-30',
        },
        context
      );

      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          effectiveFrom: new Date('2024-01-01'),
          effectiveTo: new Date('2024-06-30'),
        }),
      });
    });

    it('should set appliesToDomains when provided', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAccommodation.create.mockResolvedValue({ id: 'acc-1' });

      await createAccommodation(
        tenantId,
        learnerId,
        {
          category: 'VISUAL',
          description: 'Large text for reading',
          appliesToDomains: ['READING', 'LANGUAGE_ARTS'],
        },
        context
      );

      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appliesToDomains: ['READING', 'LANGUAGE_ARTS'],
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE ACCOMMODATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateAccommodation', () => {
    const accommodationId = 'acc-123';

    it('should throw error when accommodation not found', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(null);

      await expect(
        updateAccommodation(
          tenantId,
          learnerId,
          accommodationId,
          { description: 'Updated' },
          context
        )
      ).rejects.toThrow('Accommodation not found');
    });

    it('should update accommodation description', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
        description: 'Updated description',
      });

      const result = await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        { description: 'Updated description' },
        context
      );

      expect(result.description).toBe('Updated description');
      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: expect.objectContaining({
          description: 'Updated description',
          updatedByUserId: context.userId,
        }),
      });
    });

    it('should update category', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
        category: 'AUDITORY',
      });

      await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        { category: 'AUDITORY' },
        context
      );

      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: expect.objectContaining({
          category: 'AUDITORY',
        }),
      });
    });

    it('should update isCritical status', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
        isCritical: false,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
        isCritical: true,
      });

      await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        { isCritical: true },
        context
      );

      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: expect.objectContaining({
          isCritical: true,
        }),
      });
    });

    it('should update effective dates', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
      });

      await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        {
          effectiveFrom: '2024-07-01',
          effectiveTo: '2024-12-31',
        },
        context
      );

      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: expect.objectContaining({
          effectiveFrom: new Date('2024-07-01'),
          effectiveTo: new Date('2024-12-31'),
        }),
      });
    });

    it('should allow setting effectiveTo to null', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
        effectiveTo: new Date('2024-12-31'),
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
        effectiveTo: null,
      });

      await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        { effectiveTo: '' }, // Empty string treated as null
        context
      );

      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: expect.objectContaining({
          effectiveTo: null,
        }),
      });
    });

    it('should update appliesToDomains', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
      });

      await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        { appliesToDomains: ['MATH', 'SCIENCE'] },
        context
      );

      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: expect.objectContaining({
          appliesToDomains: ['MATH', 'SCIENCE'],
        }),
      });
    });

    it('should only include defined fields in update', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({
        id: accommodationId,
      });

      await updateAccommodation(
        tenantId,
        learnerId,
        accommodationId,
        { description: 'Only this changes' },
        context
      );

      // Verify only description and updatedByUserId are in update data
      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: {
          description: 'Only this changes',
          updatedByUserId: context.userId,
        },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DELETE ACCOMMODATION (SOFT DELETE)
  // ════════════════════════════════════════════════════════════════════════════

  describe('deleteAccommodation', () => {
    const accommodationId = 'acc-123';

    it('should throw error when accommodation not found', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(null);

      await expect(
        deleteAccommodation(tenantId, learnerId, accommodationId, context)
      ).rejects.toThrow('Accommodation not found');
    });

    it('should soft delete by marking as inactive', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
        isActive: true,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({});

      await deleteAccommodation(tenantId, learnerId, accommodationId, context);

      expect(mockPrisma.learnerAccommodation.update).toHaveBeenCalledWith({
        where: { id: accommodationId },
        data: {
          isActive: false,
          effectiveTo: expect.any(Date),
          updatedByUserId: context.userId,
        },
      });
    });

    it('should set effectiveTo to current date on soft delete', async () => {
      const beforeDelete = new Date();

      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({});

      await deleteAccommodation(tenantId, learnerId, accommodationId, context);

      const updateCall = mockPrisma.learnerAccommodation.update.mock.calls[0][0];
      const effectiveTo = updateCall.data.effectiveTo;

      expect(effectiveTo.getTime()).toBeGreaterThanOrEqual(beforeDelete.getTime());
      expect(effectiveTo.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    });

    it('should return void on successful deletion', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue({
        id: accommodationId,
        tenantId,
        learnerId,
      });

      mockPrisma.learnerAccommodation.update.mockResolvedValue({});

      const result = await deleteAccommodation(tenantId, learnerId, accommodationId, context);

      expect(result).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ════════════════════════════════════════════════════════════════════════════

  describe('tenant isolation', () => {
    it('should always filter by tenantId in list', async () => {
      mockPrisma.learnerAccommodation.findMany.mockResolvedValue([]);

      await listAccommodations('tenant-A', 'learner-1', {});

      expect(mockPrisma.learnerAccommodation.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          tenantId: 'tenant-A',
        }),
        orderBy: expect.any(Array),
      });
    });

    it('should always filter by tenantId and learnerId in get', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(null);

      await getAccommodation('tenant-B', 'learner-2', 'acc-1');

      expect(mockPrisma.learnerAccommodation.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'acc-1',
          tenantId: 'tenant-B',
          learnerId: 'learner-2',
        },
      });
    });

    it('should always include tenantId when creating', async () => {
      mockPrisma.learnerProfile.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAccommodation.create.mockResolvedValue({ id: 'acc-1' });

      await createAccommodation(
        'tenant-C',
        'learner-3',
        { category: 'VISUAL', description: 'Test' },
        context
      );

      expect(mockPrisma.learnerAccommodation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-C',
          learnerId: 'learner-3',
        }),
      });
    });

    it('should verify ownership before update', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(null);

      await expect(
        updateAccommodation(
          'tenant-D',
          'learner-4',
          'acc-from-other-tenant',
          { description: 'Hacked!' },
          context
        )
      ).rejects.toThrow('Accommodation not found');
    });

    it('should verify ownership before delete', async () => {
      mockPrisma.learnerAccommodation.findFirst.mockResolvedValue(null);

      await expect(
        deleteAccommodation('tenant-E', 'learner-5', 'acc-from-other-tenant', context)
      ).rejects.toThrow('Accommodation not found');
    });
  });
});
