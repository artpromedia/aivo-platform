/**
 * Tests for onboarding-svc service functions (with mocked Prisma).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  onboardingProgress: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  featureSeen: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

describe('onboarding service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProgress', () => {
    it('looks up progress by userId and flowId', async () => {
      const { getProgress } = await import('../src/service.js');
      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({
        id: 'p-1',
        userId: 'user-1',
        flowId: 'onboard-teacher',
      });

      const result = await getProgress('user-1', 'onboard-teacher');
      expect(result).toBeDefined();
      expect(mockPrisma.onboardingProgress.findUnique).toHaveBeenCalledWith({
        where: { user_flow: { userId: 'user-1', flowId: 'onboard-teacher' } },
      });
    });

    it('returns null when no progress exists', async () => {
      const { getProgress } = await import('../src/service.js');
      mockPrisma.onboardingProgress.findUnique.mockResolvedValue(null);

      const result = await getProgress('user-1', 'unknown');
      expect(result).toBeNull();
    });
  });

  describe('getAllProgress', () => {
    it('returns all flows for a user', async () => {
      const { getAllProgress } = await import('../src/service.js');
      mockPrisma.onboardingProgress.findMany.mockResolvedValue([
        { id: 'p-1', flowId: 'flow-1' },
        { id: 'p-2', flowId: 'flow-2' },
      ]);

      const result = await getAllProgress('user-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('upsertProgress', () => {
    it('creates progress when none exists', async () => {
      const { upsertProgress } = await import('../src/service.js');
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({
        id: 'p-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        flowId: 'onboard',
        completedSteps: [],
        skippedSteps: [],
        dismissed: false,
      });

      const result = await upsertProgress('user-1', 'tenant-1', 'onboard');
      expect(result.completedSteps).toEqual([]);
      expect(result.dismissed).toBe(false);
    });
  });

  describe('completeStep', () => {
    it('adds step to completedSteps', async () => {
      const { completeStep } = await import('../src/service.js');
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({
        id: 'p-1',
        completedSteps: [],
        skippedSteps: ['step-1'],
      });
      mockPrisma.onboardingProgress.update.mockResolvedValue({
        id: 'p-1',
        completedSteps: ['step-1'],
        skippedSteps: [],
      });

      const result = await completeStep('user-1', 'tenant-1', 'onboard', 'step-1');
      expect(result.completedSteps).toContain('step-1');
      // step-1 should be removed from skippedSteps
      expect(result.skippedSteps).not.toContain('step-1');
    });

    it('does not duplicate already completed step', async () => {
      const { completeStep } = await import('../src/service.js');
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({
        id: 'p-1',
        completedSteps: ['step-1'],
        skippedSteps: [],
      });
      mockPrisma.onboardingProgress.update.mockResolvedValue({
        id: 'p-1',
        completedSteps: ['step-1'],
        skippedSteps: [],
      });

      await completeStep('user-1', 'tenant-1', 'onboard', 'step-1');
      const updateCall = mockPrisma.onboardingProgress.update.mock.calls[0][0];
      expect(updateCall.data.completedSteps).toEqual(['step-1']);
    });
  });

  describe('skipStep', () => {
    it('adds step to skippedSteps', async () => {
      const { skipStep } = await import('../src/service.js');
      mockPrisma.onboardingProgress.upsert.mockResolvedValue({
        id: 'p-1',
        completedSteps: [],
        skippedSteps: [],
      });
      mockPrisma.onboardingProgress.update.mockResolvedValue({
        id: 'p-1',
        skippedSteps: ['step-1'],
      });

      const result = await skipStep('user-1', 'tenant-1', 'onboard', 'step-1');
      expect(result.skippedSteps).toContain('step-1');
    });
  });

  describe('dismissFlow', () => {
    it('sets dismissed to true', async () => {
      const { dismissFlow } = await import('../src/service.js');
      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({ id: 'p-1' });
      mockPrisma.onboardingProgress.update.mockResolvedValue({
        id: 'p-1',
        dismissed: true,
      });

      const result = await dismissFlow('user-1', 'flow-1');
      expect(result?.dismissed).toBe(true);
    });

    it('returns null when no record exists', async () => {
      const { dismissFlow } = await import('../src/service.js');
      mockPrisma.onboardingProgress.findUnique.mockResolvedValue(null);

      const result = await dismissFlow('user-1', 'flow-x');
      expect(result).toBeNull();
    });
  });

  describe('resetFlow', () => {
    it('clears progress data', async () => {
      const { resetFlow } = await import('../src/service.js');
      mockPrisma.onboardingProgress.findUnique.mockResolvedValue({
        id: 'p-1',
      });
      mockPrisma.onboardingProgress.update.mockResolvedValue({
        id: 'p-1',
        completedSteps: [],
        skippedSteps: [],
        dismissed: false,
      });

      const result = await resetFlow('user-1', 'tenant-1', 'onboard');
      expect(result.completedSteps).toEqual([]);
      expect(result.skippedSteps).toEqual([]);
      expect(result.dismissed).toBe(false);
    });
  });

  describe('markFeatureSeen', () => {
    it('upserts feature seen record', async () => {
      const { markFeatureSeen } = await import('../src/service.js');
      mockPrisma.featureSeen.upsert.mockResolvedValue({
        userId: 'user-1',
        featureKey: 'dashboard-v2',
      });

      const result = await markFeatureSeen('user-1', 'tenant-1', 'dashboard-v2');
      expect(result.featureKey).toBe('dashboard-v2');
    });
  });

  describe('checkFeaturesSeen', () => {
    it('returns map of feature keys to seen status', async () => {
      const { checkFeaturesSeen } = await import('../src/service.js');
      mockPrisma.featureSeen.findMany.mockResolvedValue([
        { featureKey: 'feature-a' },
      ]);

      const result = await checkFeaturesSeen('user-1', ['feature-a', 'feature-b']);
      expect(result['feature-a']).toBe(true);
      expect(result['feature-b']).toBe(false);
    });

    it('returns all false when none seen', async () => {
      const { checkFeaturesSeen } = await import('../src/service.js');
      mockPrisma.featureSeen.findMany.mockResolvedValue([]);

      const result = await checkFeaturesSeen('user-1', ['x', 'y']);
      expect(result['x']).toBe(false);
      expect(result['y']).toBe(false);
    });
  });

  describe('getFlowAnalytics', () => {
    it('returns completion/dismissal counts', async () => {
      const { getFlowAnalytics } = await import('../src/service.js');
      mockPrisma.onboardingProgress.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60)  // completed
        .mockResolvedValueOnce(10); // dismissed

      const result = await getFlowAnalytics('tenant-1', 'onboard');
      expect(result).toBeDefined();
    });
  });
});
