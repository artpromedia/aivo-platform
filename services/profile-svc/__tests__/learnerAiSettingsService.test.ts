/**
 * Learner AI Settings Service Unit Tests
 *
 * Tests for AI feature management for IEP/504 accommodations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TenantContext } from '../src/types/index.js';

// Mock Prisma client
const mockPrisma = {
  learnerAiSettings: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  learnerAiSettingsLog: {
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import after mocking
import {
  getLearnerAiSettings,
  updateLearnerAiSettings,
  disableAiForLearner,
  enableAiForLearner,
  temporarilyDisableAi,
  getBulkLearnerAiSettings,
  getAiSettingsAuditLog,
  type LearnerAiSettings,
} from '../src/services/learnerAiSettingsService.js';

describe('LearnerAiSettingsService', () => {
  const tenantId = 'tenant-123';
  const learnerId = 'learner-456';
  const context: TenantContext = {
    tenantId,
    userId: 'user-789',
    userRole: 'TEACHER',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset any date mocking
    vi.useRealTimers();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GET LEARNER AI SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  describe('getLearnerAiSettings', () => {
    it('should return default settings when no record exists', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue(null);

      const result = await getLearnerAiSettings(tenantId, learnerId);

      expect(result).toEqual({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
    });

    it('should return stored settings when record exists', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: false,
        disabledReasonText: 'IEP requirement',
        disabledByUserId: 'teacher-1',
        disabledAt: new Date('2024-01-15'),
        tutorEnabled: false,
        homeworkHelperEnabled: true,
        hintsEnabled: false,
        focusModeEnabled: true,
        recommendationsEnabled: true,
        temporaryDisableUntil: null,
      });

      const result = await getLearnerAiSettings(tenantId, learnerId);

      expect(result).toEqual({
        aiEnabled: false,
        aiDisabledReason: 'IEP requirement',
        disabledBy: 'teacher-1',
        disabledAt: new Date('2024-01-15'),
        tutorEnabled: false,
        homeworkHelperEnabled: true,
        hintsEnabled: false,
        focusModeEnabled: true,
        recommendationsEnabled: true,
        temporaryDisableUntil: undefined,
      });
    });

    it('should handle temporary disable that is still active', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour in future

      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true, // Base setting is enabled
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
        temporaryDisableUntil: futureDate,
        temporaryDisableReason: 'Assessment in progress',
      });

      const result = await getLearnerAiSettings(tenantId, learnerId);

      expect(result.aiEnabled).toBe(false); // Should be false due to temporary disable
      expect(result.aiDisabledReason).toBe('Assessment in progress');
      expect(result.temporaryDisableUntil).toEqual(futureDate);
    });

    it('should treat expired temporary disable as enabled', async () => {
      const pastDate = new Date(Date.now() - 3600000); // 1 hour ago

      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
        temporaryDisableUntil: pastDate,
        temporaryDisableReason: 'Assessment complete',
        disabledReasonText: null,
        disabledByUserId: null,
        disabledAt: null,
      });

      const result = await getLearnerAiSettings(tenantId, learnerId);

      expect(result.aiEnabled).toBe(true);
      expect(result.temporaryDisableUntil).toBeUndefined();
    });

    it('should return undefined for nullable fields when not set', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
        disabledReasonText: null,
        disabledByUserId: null,
        disabledAt: null,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
        temporaryDisableUntil: null,
      });

      const result = await getLearnerAiSettings(tenantId, learnerId);

      expect(result.aiDisabledReason).toBeUndefined();
      expect(result.disabledBy).toBeUndefined();
      expect(result.disabledAt).toBeUndefined();
      expect(result.temporaryDisableUntil).toBeUndefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // UPDATE LEARNER AI SETTINGS
  // ════════════════════════════════════════════════════════════════════════════

  describe('updateLearnerAiSettings', () => {
    it('should create settings if none exist', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue(null);
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: false,
        disabledReasonText: 'Parent request',
        disabledByUserId: context.userId,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      const result = await updateLearnerAiSettings(
        tenantId,
        learnerId,
        {
          aiEnabled: false,
          disabledReason: 'PARENT_REQUEST',
          disabledReasonText: 'Parent request',
        },
        context
      );

      expect(result.aiEnabled).toBe(false);
      expect(mockPrisma.learnerAiSettings.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_learnerId: { tenantId, learnerId },
        },
        create: expect.objectContaining({
          tenantId,
          learnerId,
          aiEnabled: false,
          disabledReason: 'PARENT_REQUEST',
          disabledReasonText: 'Parent request',
        }),
        update: expect.any(Object),
      });
    });

    it('should log disable action when disabling AI', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: false,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      await updateLearnerAiSettings(
        tenantId,
        learnerId,
        {
          aiEnabled: false,
          disabledReason: 'IEP_ACCOMMODATION',
          disabledReasonText: 'Per IEP requirements',
        },
        context
      );

      expect(mockPrisma.learnerAiSettingsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          learnerId,
          action: 'DISABLED',
          previousEnabled: true,
          newEnabled: false,
          reason: 'Per IEP requirements',
          changedByUserId: context.userId,
          changedByRole: context.userRole,
        }),
      });
    });

    it('should log enable action when enabling AI', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: false,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      await updateLearnerAiSettings(tenantId, learnerId, { aiEnabled: true }, context);

      expect(mockPrisma.learnerAiSettingsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'ENABLED',
          previousEnabled: false,
          newEnabled: true,
        }),
      });
    });

    it('should log temporary disable action', async () => {
      const disableUntil = new Date(Date.now() + 3600000);

      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
        temporaryDisableUntil: disableUntil,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      await updateLearnerAiSettings(
        tenantId,
        learnerId,
        {
          temporaryDisableUntil: disableUntil,
          temporaryDisableReason: 'Math assessment',
        },
        context
      );

      expect(mockPrisma.learnerAiSettingsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'TEMPORARY_DISABLE',
          reason: 'Math assessment',
          metadata: expect.objectContaining({
            temporaryDisableUntil: disableUntil.toISOString(),
          }),
        }),
      });
    });

    it('should update individual feature flags', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: false,
        homeworkHelperEnabled: false,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      const result = await updateLearnerAiSettings(
        tenantId,
        learnerId,
        {
          tutorEnabled: false,
          homeworkHelperEnabled: false,
        },
        context
      );

      expect(result.tutorEnabled).toBe(false);
      expect(result.homeworkHelperEnabled).toBe(false);
    });

    it('should clear disabled metadata when enabling', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: false,
        disabledReason: 'IEP_ACCOMMODATION',
        disabledReasonText: 'Old reason',
        disabledAt: new Date(),
        disabledByUserId: 'old-user',
        disabledByRole: 'TEACHER',
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      await updateLearnerAiSettings(tenantId, learnerId, { aiEnabled: true }, context);

      expect(mockPrisma.learnerAiSettings.upsert).toHaveBeenCalledWith({
        where: expect.any(Object),
        create: expect.any(Object),
        update: expect.objectContaining({
          disabledReason: null,
          disabledReasonText: null,
          disabledAt: null,
          disabledByUserId: null,
          disabledByRole: null,
        }),
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CONVENIENCE FUNCTIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('disableAiForLearner', () => {
    it('should disable AI with proper reason', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: false,
        disabledReasonText: 'Per 504 plan',
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      const result = await disableAiForLearner(
        tenantId,
        learnerId,
        'PLAN_504',
        'Per 504 plan',
        context
      );

      expect(result.aiEnabled).toBe(false);
      expect(result.aiDisabledReason).toBe('Per 504 plan');
    });
  });

  describe('enableAiForLearner', () => {
    it('should enable AI and clear temporary disable', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: false,
        temporaryDisableUntil: new Date(),
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      const result = await enableAiForLearner(tenantId, learnerId, context);

      expect(result.aiEnabled).toBe(true);
    });
  });

  describe('temporarilyDisableAi', () => {
    it('should set temporary disable with reason', async () => {
      const until = new Date(Date.now() + 7200000); // 2 hours

      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: true,
        temporaryDisableUntil: until,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      const result = await temporarilyDisableAi(
        tenantId,
        learnerId,
        until,
        'Science quiz',
        context
      );

      expect(result.temporaryDisableUntil).toEqual(until);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  describe('getBulkLearnerAiSettings', () => {
    it('should return settings for multiple learners', async () => {
      const learnerIds = ['learner-1', 'learner-2', 'learner-3'];

      mockPrisma.learnerAiSettings.findMany.mockResolvedValue([
        {
          learnerId: 'learner-1',
          aiEnabled: true,
          tutorEnabled: true,
          homeworkHelperEnabled: true,
          hintsEnabled: true,
          focusModeEnabled: true,
          recommendationsEnabled: true,
          temporaryDisableUntil: null,
        },
        {
          learnerId: 'learner-2',
          aiEnabled: false,
          disabledReasonText: 'IEP accommodation',
          tutorEnabled: false,
          homeworkHelperEnabled: true,
          hintsEnabled: false,
          focusModeEnabled: true,
          recommendationsEnabled: true,
          temporaryDisableUntil: null,
        },
      ]);

      const result = await getBulkLearnerAiSettings(tenantId, learnerIds);

      expect(result.size).toBe(3);
      expect(result.get('learner-1')?.aiEnabled).toBe(true);
      expect(result.get('learner-2')?.aiEnabled).toBe(false);
      // learner-3 should have default settings
      expect(result.get('learner-3')?.aiEnabled).toBe(true);
      expect(result.get('learner-3')?.tutorEnabled).toBe(true);
    });

    it('should return default settings for learners without records', async () => {
      mockPrisma.learnerAiSettings.findMany.mockResolvedValue([]);

      const result = await getBulkLearnerAiSettings(tenantId, ['learner-new-1', 'learner-new-2']);

      expect(result.size).toBe(2);
      expect(result.get('learner-new-1')).toEqual({
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
    });

    it('should handle temporary disables in bulk', async () => {
      const futureDate = new Date(Date.now() + 3600000);

      mockPrisma.learnerAiSettings.findMany.mockResolvedValue([
        {
          learnerId: 'learner-temp',
          aiEnabled: true,
          tutorEnabled: true,
          homeworkHelperEnabled: true,
          hintsEnabled: true,
          focusModeEnabled: true,
          recommendationsEnabled: true,
          temporaryDisableUntil: futureDate,
          temporaryDisableReason: 'Testing',
        },
      ]);

      const result = await getBulkLearnerAiSettings(tenantId, ['learner-temp']);

      expect(result.get('learner-temp')?.aiEnabled).toBe(false);
      expect(result.get('learner-temp')?.aiDisabledReason).toBe('Testing');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AUDIT LOG
  // ════════════════════════════════════════════════════════════════════════════

  describe('getAiSettingsAuditLog', () => {
    it('should return audit log entries with pagination', async () => {
      const mockLogs = [
        {
          action: 'DISABLED',
          previousEnabled: true,
          newEnabled: false,
          reason: 'IEP requirement',
          changedByUserId: 'teacher-1',
          changedByRole: 'TEACHER',
          changedAt: new Date('2024-01-15'),
        },
        {
          action: 'ENABLED',
          previousEnabled: false,
          newEnabled: true,
          reason: null,
          changedByUserId: 'teacher-1',
          changedByRole: 'TEACHER',
          changedAt: new Date('2024-02-01'),
        },
      ];

      mockPrisma.learnerAiSettingsLog.findMany.mockResolvedValue(mockLogs);
      mockPrisma.learnerAiSettingsLog.count.mockResolvedValue(2);

      const result = await getAiSettingsAuditLog(tenantId, learnerId);

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.logs[0].action).toBe('DISABLED');
    });

    it('should apply pagination options', async () => {
      mockPrisma.learnerAiSettingsLog.findMany.mockResolvedValue([]);
      mockPrisma.learnerAiSettingsLog.count.mockResolvedValue(100);

      await getAiSettingsAuditLog(tenantId, learnerId, {
        limit: 10,
        offset: 20,
      });

      expect(mockPrisma.learnerAiSettingsLog.findMany).toHaveBeenCalledWith({
        where: { tenantId, learnerId },
        orderBy: { changedAt: 'desc' },
        take: 10,
        skip: 20,
      });
    });

    it('should use default pagination values', async () => {
      mockPrisma.learnerAiSettingsLog.findMany.mockResolvedValue([]);
      mockPrisma.learnerAiSettingsLog.count.mockResolvedValue(0);

      await getAiSettingsAuditLog(tenantId, learnerId);

      expect(mockPrisma.learnerAiSettingsLog.findMany).toHaveBeenCalledWith({
        where: { tenantId, learnerId },
        orderBy: { changedAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should map log entries correctly', async () => {
      const changedAt = new Date('2024-01-15T10:30:00Z');

      mockPrisma.learnerAiSettingsLog.findMany.mockResolvedValue([
        {
          action: 'TEMPORARY_DISABLE',
          previousEnabled: true,
          newEnabled: true,
          reason: 'Assessment period',
          changedByUserId: 'proctor-1',
          changedByRole: 'PROCTOR',
          changedAt,
          metadata: { temporaryDisableUntil: '2024-01-15T12:00:00Z' },
        },
      ]);
      mockPrisma.learnerAiSettingsLog.count.mockResolvedValue(1);

      const result = await getAiSettingsAuditLog(tenantId, learnerId);

      expect(result.logs[0]).toEqual({
        action: 'TEMPORARY_DISABLE',
        previousEnabled: true,
        newEnabled: true,
        reason: 'Assessment period',
        changedBy: 'proctor-1',
        changedByRole: 'PROCTOR',
        changedAt,
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROLE-BASED ACCESS (implied by context tracking)
  // ════════════════════════════════════════════════════════════════════════════

  describe('role tracking', () => {
    it('should record userRole in logs', async () => {
      const adminContext: TenantContext = {
        tenantId,
        userId: 'admin-1',
        userRole: 'ADMIN',
      };

      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: false,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      await updateLearnerAiSettings(
        tenantId,
        learnerId,
        { aiEnabled: false, disabledReasonText: 'Admin override' },
        adminContext
      );

      expect(mockPrisma.learnerAiSettingsLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          changedByUserId: 'admin-1',
          changedByRole: 'ADMIN',
        }),
      });
    });

    it('should record disabledByRole when disabling', async () => {
      mockPrisma.learnerAiSettings.findUnique.mockResolvedValue({
        aiEnabled: true,
      });
      mockPrisma.learnerAiSettings.upsert.mockResolvedValue({
        aiEnabled: false,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
      mockPrisma.learnerAiSettingsLog.create.mockResolvedValue({});

      await updateLearnerAiSettings(
        tenantId,
        learnerId,
        { aiEnabled: false, disabledReasonText: 'Teacher decision' },
        context
      );

      expect(mockPrisma.learnerAiSettings.upsert).toHaveBeenCalledWith({
        where: expect.any(Object),
        create: expect.objectContaining({
          disabledByRole: 'TEACHER',
        }),
        update: expect.objectContaining({
          disabledByRole: 'TEACHER',
        }),
      });
    });
  });
});
