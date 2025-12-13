/**
 * Session Plan Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma
vi.mock('../src/prisma.js', () => ({
  prisma: {
    sessionPlan: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    sessionPlanItem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from '../src/prisma.js';
import * as sessionPlanService from '../src/services/sessionPlanService.js';

describe('Session Plan Service', () => {
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const userId = 'user-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSessionPlan', () => {
    it('should create a session plan with items', async () => {
      const input = {
        tenantId,
        learnerId,
        createdByUserId: userId,
        sessionTemplateName: 'Reading Session',
        estimatedDurationMinutes: 30,
        sessionType: 'LEARNING' as const,
        items: [
          { activityType: 'warm-up', activityDescription: 'Quick review', estimatedDurationMinutes: 5 },
          { activityType: 'main', activityDescription: 'Reading practice', estimatedDurationMinutes: 20 },
        ],
      };

      const mockPlan = {
        id: 'plan-001',
        ...input,
        status: 'DRAFT',
        items: input.items.map((item, i) => ({ id: `item-${i}`, ...item, orderIndex: i })),
        createdAt: new Date(),
      };

      vi.mocked(prisma.sessionPlan.create).mockResolvedValue(mockPlan as any);

      const result = await sessionPlanService.createSessionPlan(input);

      expect(prisma.sessionPlan.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId,
            learnerId,
            sessionType: 'LEARNING',
            status: 'DRAFT',
            items: expect.objectContaining({
              create: expect.any(Array),
            }),
          }),
        })
      );

      expect(result.items).toHaveLength(2);
    });

    it('should create session plan without items', async () => {
      const input = {
        tenantId,
        learnerId,
        createdByUserId: userId,
        sessionType: 'THERAPY' as const,
      };

      const mockPlan = {
        id: 'plan-002',
        ...input,
        status: 'DRAFT',
        items: [],
        createdAt: new Date(),
      };

      vi.mocked(prisma.sessionPlan.create).mockResolvedValue(mockPlan as any);

      const result = await sessionPlanService.createSessionPlan(input);

      expect(result.items).toHaveLength(0);
    });
  });

  describe('listSessionPlans', () => {
    it('should list session plans with filters', async () => {
      const mockPlans = [
        { id: 'plan-001', status: 'PLANNED', items: [] },
        { id: 'plan-002', status: 'PLANNED', items: [] },
      ];

      vi.mocked(prisma.sessionPlan.findMany).mockResolvedValue(mockPlans as any);
      vi.mocked(prisma.sessionPlan.count).mockResolvedValue(5);

      const result = await sessionPlanService.listSessionPlans(
        { tenantId, learnerId, status: 'PLANNED' as any },
        { page: 1, pageSize: 10 }
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it('should filter by date range', async () => {
      vi.mocked(prisma.sessionPlan.findMany).mockResolvedValue([]);
      vi.mocked(prisma.sessionPlan.count).mockResolvedValue(0);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');

      await sessionPlanService.listSessionPlans({
        tenantId,
        scheduledFrom: from,
        scheduledTo: to,
      });

      expect(prisma.sessionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            scheduledFor: {
              gte: from,
              lte: to,
            },
          }),
        })
      );
    });
  });

  describe('Session Plan Lifecycle', () => {
    it('should start a session plan', async () => {
      const existingPlan = { id: 'plan-001', tenantId, status: 'PLANNED' };
      const startedPlan = { ...existingPlan, status: 'IN_PROGRESS', sessionId: 'session-123', items: [] };

      vi.mocked(prisma.sessionPlan.findFirst).mockResolvedValue(existingPlan as any);
      vi.mocked(prisma.sessionPlan.update).mockResolvedValue(startedPlan as any);

      const result = await sessionPlanService.startSessionPlan('plan-001', tenantId, 'session-123');

      expect(prisma.sessionPlan.update).toHaveBeenCalledWith({
        where: { id: 'plan-001' },
        data: {
          status: 'IN_PROGRESS',
          sessionId: 'session-123',
        },
        include: { items: { orderBy: { orderIndex: 'asc' } } },
      });

      expect(result?.status).toBe('IN_PROGRESS');
    });

    it('should complete a session plan', async () => {
      const existingPlan = { id: 'plan-001', tenantId, status: 'IN_PROGRESS' };
      const completedPlan = { ...existingPlan, status: 'COMPLETED', items: [] };

      vi.mocked(prisma.sessionPlan.findFirst).mockResolvedValue(existingPlan as any);
      vi.mocked(prisma.sessionPlan.update).mockResolvedValue(completedPlan as any);

      const result = await sessionPlanService.completeSessionPlan('plan-001', tenantId);

      expect(result?.status).toBe('COMPLETED');
    });

    it('should cancel a session plan', async () => {
      const existingPlan = { id: 'plan-001', tenantId, status: 'PLANNED' };
      const cancelledPlan = { ...existingPlan, status: 'CANCELLED', items: [] };

      vi.mocked(prisma.sessionPlan.findFirst).mockResolvedValue(existingPlan as any);
      vi.mocked(prisma.sessionPlan.update).mockResolvedValue(cancelledPlan as any);

      const result = await sessionPlanService.cancelSessionPlan('plan-001', tenantId);

      expect(result?.status).toBe('CANCELLED');
    });
  });

  describe('Session Plan Items', () => {
    it('should add item to session plan', async () => {
      const mockPlan = { id: 'plan-001', tenantId };
      const mockItem = {
        id: 'item-001',
        sessionPlanId: 'plan-001',
        activityType: 'practice',
        orderIndex: 3,
      };

      vi.mocked(prisma.sessionPlan.findFirst).mockResolvedValue(mockPlan as any);
      vi.mocked(prisma.sessionPlanItem.aggregate).mockResolvedValue({ _max: { orderIndex: 2 } } as any);
      vi.mocked(prisma.sessionPlanItem.create).mockResolvedValue(mockItem as any);

      const result = await sessionPlanService.addSessionPlanItem('plan-001', tenantId, {
        activityType: 'practice',
      });

      expect(result?.orderIndex).toBe(3);
    });

    it('should delete session plan item', async () => {
      const mockItem = {
        id: 'item-001',
        sessionPlan: { tenantId },
      };

      vi.mocked(prisma.sessionPlanItem.findFirst).mockResolvedValue(mockItem as any);
      vi.mocked(prisma.sessionPlanItem.delete).mockResolvedValue({} as any);

      const result = await sessionPlanService.deleteSessionPlanItem('item-001', tenantId);

      expect(result).toBe(true);
    });

    it('should not delete item from different tenant', async () => {
      const mockItem = {
        id: 'item-001',
        sessionPlan: { tenantId: 'different-tenant' },
      };

      vi.mocked(prisma.sessionPlanItem.findFirst).mockResolvedValue(mockItem as any);

      const result = await sessionPlanService.deleteSessionPlanItem('item-001', tenantId);

      expect(result).toBe(false);
      expect(prisma.sessionPlanItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('getUpcomingSessions', () => {
    it('should return upcoming sessions within date range', async () => {
      const mockSessions = [
        { id: 'plan-001', scheduledFor: new Date(), status: 'PLANNED', items: [] },
        { id: 'plan-002', scheduledFor: new Date(), status: 'DRAFT', items: [] },
      ];

      vi.mocked(prisma.sessionPlan.findMany).mockResolvedValue(mockSessions as any);

      const result = await sessionPlanService.getUpcomingSessions(tenantId, {
        days: 7,
        limit: 5,
      });

      expect(prisma.sessionPlan.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId,
            status: { in: ['DRAFT', 'PLANNED'] },
            scheduledFor: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
          take: 5,
        })
      );

      expect(result).toHaveLength(2);
    });
  });
});
