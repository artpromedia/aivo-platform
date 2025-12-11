/**
 * Trust Threshold Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrustThresholdService, type UserEligibilityData } from '../services/trust-threshold.service.js';
import type { TrustThresholdEntity, TrustScoreEntity } from '../types/trust-score.types.js';

// Mock Prisma client
const mockPrismaClient = {
  trustScoreThreshold: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
};

describe('TrustThresholdService', () => {
  let service: TrustThresholdService;

  // Test threshold
  const testThreshold: TrustThresholdEntity = {
    id: 'threshold-1',
    contextType: 'JOB',
    contextId: 'job-123',
    minimumScore: 60,
    minimumTier: 'TRUSTED',
    requireVerification: true,
    minimumVerificationLevel: 'BASIC',
    requireMfa: true,
    minimumReviews: 5,
    minimumCompletedJobs: 10,
    name: 'Test Threshold',
    description: 'Test threshold description',
    isActive: true,
    createdBy: 'admin-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Test user data that meets all requirements
  const goodUserData: UserEligibilityData = {
    trustScore: {
      id: 'score-1',
      userId: 'user-1',
      overallScore: 75,
      reviewScore: 80,
      complianceScore: 100,
      verificationScore: 90,
      tenureScore: 70,
      activityScore: 85,
      reviewWeight: 40,
      complianceWeight: 25,
      verificationWeight: 20,
      tenureWeight: 10,
      activityWeight: 5,
      tier: 'TRUSTED',
      trend: 'STABLE',
      previousScore: 72,
      scoreChangeAmount: 3,
      lastCalculatedAt: new Date(),
      calculationVersion: 1,
      factors: { positive: [], negative: [], suggestions: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    verificationLevel: 'ENHANCED',
    mfaEnabled: true,
    totalReviews: 15,
    completedJobs: 20,
  };

  // Test user data that fails requirements
  const poorUserData: UserEligibilityData = {
    trustScore: {
      id: 'score-2',
      userId: 'user-2',
      overallScore: 45,
      reviewScore: 50,
      complianceScore: 70,
      verificationScore: 40,
      tenureScore: 30,
      activityScore: 40,
      reviewWeight: 40,
      complianceWeight: 25,
      verificationWeight: 20,
      tenureWeight: 10,
      activityWeight: 5,
      tier: 'ESTABLISHED',
      trend: 'DECLINING',
      previousScore: 50,
      scoreChangeAmount: -5,
      lastCalculatedAt: new Date(),
      calculationVersion: 1,
      factors: { positive: [], negative: [], suggestions: [] },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    verificationLevel: 'EMAIL',
    mfaEnabled: false,
    totalReviews: 2,
    completedJobs: 3,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new TrustThresholdService(mockPrismaClient as any);
  });

  describe('checkUserEligibility', () => {
    it('should return meetsRequirements=true when user meets all requirements', () => {
      const result = service.checkUserEligibility(goodUserData, testThreshold);

      expect(result.meetsRequirements).toBe(true);
      expect(result.failures).toHaveLength(0);
    });

    it('should return failure when trust score is below minimum', () => {
      const lowScoreUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, overallScore: 50 },
      };

      const result = service.checkUserEligibility(lowScoreUser, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          requirement: 'minimumScore',
          required: 60,
          actual: 50,
        })
      );
    });

    it('should return failure when tier is below minimum', () => {
      const lowTierUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, tier: 'ESTABLISHED' as const, overallScore: 55 },
      };

      const result = service.checkUserEligibility(lowTierUser, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          requirement: 'minimumTier',
        })
      );
    });

    it('should return failure when MFA is required but not enabled', () => {
      const noMfaUser: UserEligibilityData = {
        ...goodUserData,
        mfaEnabled: false,
      };

      const result = service.checkUserEligibility(noMfaUser, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          requirement: 'mfa',
          required: 'enabled',
          actual: 'disabled',
        })
      );
    });

    it('should return failure when verification level is below minimum', () => {
      const lowVerificationUser: UserEligibilityData = {
        ...goodUserData,
        verificationLevel: 'EMAIL',
      };

      const result = service.checkUserEligibility(lowVerificationUser, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          requirement: 'minimumVerificationLevel',
        })
      );
    });

    it('should return failure when reviews are below minimum', () => {
      const lowReviewsUser: UserEligibilityData = {
        ...goodUserData,
        totalReviews: 2,
      };

      const result = service.checkUserEligibility(lowReviewsUser, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          requirement: 'minimumReviews',
          required: 5,
          actual: 2,
        })
      );
    });

    it('should return failure when completed jobs are below minimum', () => {
      const lowJobsUser: UserEligibilityData = {
        ...goodUserData,
        completedJobs: 5,
      };

      const result = service.checkUserEligibility(lowJobsUser, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toContainEqual(
        expect.objectContaining({
          requirement: 'minimumCompletedJobs',
          required: 10,
          actual: 5,
        })
      );
    });

    it('should return multiple failures when multiple requirements not met', () => {
      const result = service.checkUserEligibility(poorUserData, testThreshold);

      expect(result.meetsRequirements).toBe(false);
      expect(result.failures.length).toBeGreaterThan(1);
    });

    it('should include warning when score is close to minimum', () => {
      const closeToMinUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, overallScore: 62 },
      };

      const result = service.checkUserEligibility(closeToMinUser, testThreshold);

      expect(result.meetsRequirements).toBe(true);
      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          requirement: 'minimumScore',
        })
      );
    });

    it('should include warning when trust score is declining', () => {
      const decliningUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, trend: 'DECLINING' as const },
      };

      const result = service.checkUserEligibility(decliningUser, testThreshold);

      expect(result.warnings).toContainEqual(
        expect.objectContaining({
          requirement: 'trend',
        })
      );
    });

    it('should handle threshold without optional requirements', () => {
      const minimalThreshold: TrustThresholdEntity = {
        ...testThreshold,
        minimumTier: null,
        minimumVerificationLevel: null,
        minimumReviews: null,
        minimumCompletedJobs: null,
        requireMfa: false,
        requireVerification: false,
      };

      const result = service.checkUserEligibility(poorUserData, minimalThreshold);

      // Should only fail on minimumScore
      expect(result.meetsRequirements).toBe(false);
      expect(result.failures).toHaveLength(1);
      expect(result.failures[0].requirement).toBe('minimumScore');
    });
  });

  describe('getRequirementsSummary', () => {
    it('should return a clean summary of requirements', () => {
      const summary = service.getRequirementsSummary(testThreshold);

      expect(summary).toEqual({
        minimumScore: 60,
        minimumTier: 'TRUSTED',
        requireVerification: true,
        minimumVerificationLevel: 'BASIC',
        requireMfa: true,
        minimumReviews: 5,
        minimumCompletedJobs: 10,
      });
    });

    it('should exclude undefined optional fields', () => {
      const minimalThreshold: TrustThresholdEntity = {
        ...testThreshold,
        minimumTier: null,
        minimumVerificationLevel: null,
        minimumReviews: null,
        minimumCompletedJobs: null,
      };

      const summary = service.getRequirementsSummary(minimalThreshold);

      expect(summary.minimumTier).toBeUndefined();
      expect(summary.minimumVerificationLevel).toBeUndefined();
      expect(summary.minimumReviews).toBeUndefined();
      expect(summary.minimumCompletedJobs).toBeUndefined();
    });
  });

  describe('findEligibleUsers', () => {
    it('should correctly categorize eligible and ineligible users', async () => {
      mockPrismaClient.trustScoreThreshold.findUnique.mockResolvedValue({
        ...testThreshold,
        minimumReviews: null,
        minimumCompletedJobs: null,
        requireMfa: false,
        minimumVerificationLevel: null,
      });

      const result = await service.findEligibleUsers('threshold-1', [goodUserData, poorUserData]);

      expect(result.eligible).toContain(goodUserData.trustScore.userId);
      expect(result.ineligible).toContain(poorUserData.trustScore.userId);
    });

    it('should throw error if threshold not found', async () => {
      mockPrismaClient.trustScoreThreshold.findUnique.mockResolvedValue(null);

      await expect(service.findEligibleUsers('non-existent', [goodUserData])).rejects.toThrow('Threshold not found');
    });
  });

  describe('CRUD operations', () => {
    it('should create a threshold', async () => {
      const createInput = {
        contextType: 'JOB' as const,
        contextId: 'job-456',
        minimumScore: 70,
        requireVerification: true,
        requireMfa: false,
      };

      mockPrismaClient.trustScoreThreshold.create.mockResolvedValue({
        id: 'new-threshold',
        ...createInput,
        minimumTier: null,
        minimumVerificationLevel: null,
        minimumReviews: null,
        minimumCompletedJobs: null,
        name: null,
        description: null,
        isActive: true,
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createThreshold(createInput, 'admin-1');

      expect(result.minimumScore).toBe(70);
      expect(mockPrismaClient.trustScoreThreshold.create).toHaveBeenCalled();
    });

    it('should update a threshold', async () => {
      const updateInput = {
        minimumScore: 80,
        isActive: false,
      };

      mockPrismaClient.trustScoreThreshold.update.mockResolvedValue({
        ...testThreshold,
        minimumScore: 80,
        isActive: false,
      });

      const result = await service.updateThreshold('threshold-1', updateInput);

      expect(result.minimumScore).toBe(80);
      expect(result.isActive).toBe(false);
    });

    it('should delete a threshold', async () => {
      mockPrismaClient.trustScoreThreshold.delete.mockResolvedValue(testThreshold);

      await service.deleteThreshold('threshold-1');

      expect(mockPrismaClient.trustScoreThreshold.delete).toHaveBeenCalledWith({
        where: { id: 'threshold-1' },
      });
    });

    it('should get threshold by ID', async () => {
      mockPrismaClient.trustScoreThreshold.findUnique.mockResolvedValue(testThreshold);

      const result = await service.getThreshold('threshold-1');

      expect(result).toBeDefined();
      expect(result?.id).toBe('threshold-1');
    });

    it('should return null for non-existent threshold', async () => {
      mockPrismaClient.trustScoreThreshold.findUnique.mockResolvedValue(null);

      const result = await service.getThreshold('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getThresholdByContext', () => {
    it('should find threshold by context type and ID', async () => {
      mockPrismaClient.trustScoreThreshold.findFirst.mockResolvedValue(testThreshold);

      const result = await service.getThresholdByContext('JOB', 'job-123');

      expect(result).toBeDefined();
      expect(mockPrismaClient.trustScoreThreshold.findFirst).toHaveBeenCalledWith({
        where: {
          contextType: 'JOB',
          contextId: 'job-123',
          isActive: true,
        },
      });
    });

    it('should find global threshold without contextId', async () => {
      const globalThreshold = { ...testThreshold, contextType: 'GLOBAL', contextId: null };
      mockPrismaClient.trustScoreThreshold.findFirst.mockResolvedValue(globalThreshold);

      const result = await service.getThresholdByContext('GLOBAL');

      expect(result).toBeDefined();
      expect(mockPrismaClient.trustScoreThreshold.findFirst).toHaveBeenCalledWith({
        where: {
          contextType: 'GLOBAL',
          contextId: null,
          isActive: true,
        },
      });
    });
  });

  describe('tier ordering', () => {
    it('should correctly compare tier orders', () => {
      const trustedThreshold: TrustThresholdEntity = {
        ...testThreshold,
        minimumTier: 'TRUSTED',
        minimumScore: 0, // Remove score requirement for this test
      };

      const establishedUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, tier: 'ESTABLISHED', overallScore: 55 },
      };

      const trustedUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, tier: 'TRUSTED', overallScore: 70 },
      };

      const eliteUser: UserEligibilityData = {
        ...goodUserData,
        trustScore: { ...goodUserData.trustScore, tier: 'ELITE', overallScore: 98 },
      };

      // ESTABLISHED should fail TRUSTED requirement
      expect(service.checkUserEligibility(establishedUser, trustedThreshold).meetsRequirements).toBe(false);

      // TRUSTED should pass TRUSTED requirement
      expect(service.checkUserEligibility(trustedUser, trustedThreshold).meetsRequirements).toBe(true);

      // ELITE should pass TRUSTED requirement
      expect(service.checkUserEligibility(eliteUser, trustedThreshold).meetsRequirements).toBe(true);
    });
  });

  describe('verification level ordering', () => {
    it('should correctly compare verification level orders', () => {
      const enhancedThreshold: TrustThresholdEntity = {
        ...testThreshold,
        minimumVerificationLevel: 'ENHANCED',
        minimumScore: 0,
        minimumTier: null,
        requireMfa: false,
        minimumReviews: null,
        minimumCompletedJobs: null,
      };

      const basicUser: UserEligibilityData = {
        ...goodUserData,
        verificationLevel: 'BASIC',
      };

      const enhancedUser: UserEligibilityData = {
        ...goodUserData,
        verificationLevel: 'ENHANCED',
      };

      const premiumUser: UserEligibilityData = {
        ...goodUserData,
        verificationLevel: 'PREMIUM',
      };

      // BASIC should fail ENHANCED requirement
      expect(service.checkUserEligibility(basicUser, enhancedThreshold).meetsRequirements).toBe(false);

      // ENHANCED should pass ENHANCED requirement
      expect(service.checkUserEligibility(enhancedUser, enhancedThreshold).meetsRequirements).toBe(true);

      // PREMIUM should pass ENHANCED requirement
      expect(service.checkUserEligibility(premiumUser, enhancedThreshold).meetsRequirements).toBe(true);
    });
  });
});
