/**
 * Trust Threshold Service
 *
 * Manages trust score thresholds for job eligibility and access control
 */

import type { PrismaClient, Prisma } from '@prisma/client';
import type {
  TrustThresholdEntity,
  TrustThresholdRequirements,
  ThresholdCheckResult,
  ThresholdFailure,
  ThresholdWarning,
  ThresholdContextType,
  TrustTier,
  VerificationLevel,
  CreateThresholdInput,
  UpdateThresholdInput,
  TrustScoreEntity,
} from '../types/trust-score.types.js';

// Tier order for comparison
const TIER_ORDER: Record<TrustTier, number> = {
  EMERGING: 0,
  ESTABLISHED: 1,
  TRUSTED: 2,
  HIGHLY_TRUSTED: 3,
  ELITE: 4,
};

const VERIFICATION_ORDER: Record<VerificationLevel, number> = {
  NONE: 0,
  EMAIL: 1,
  BASIC: 2,
  ENHANCED: 3,
  PREMIUM: 4,
};

export interface UserEligibilityData {
  trustScore: TrustScoreEntity;
  verificationLevel: VerificationLevel;
  mfaEnabled: boolean;
  totalReviews: number;
  completedJobs: number;
}

export class TrustThresholdService {
  constructor(private readonly prisma: PrismaClient) {}

  // ============================================================================
  // Threshold CRUD Operations
  // ============================================================================

  /**
   * Create a new threshold
   */
  async createThreshold(input: CreateThresholdInput, createdBy: string): Promise<TrustThresholdEntity> {
    const threshold = await this.prisma.trustScoreThreshold.create({
      data: {
        contextType: input.contextType,
        contextId: input.contextId,
        minimumScore: input.minimumScore,
        minimumTier: input.minimumTier,
        requireVerification: input.requireVerification,
        minimumVerificationLevel: input.minimumVerificationLevel,
        requireMfa: input.requireMfa,
        minimumReviews: input.minimumReviews,
        minimumCompletedJobs: input.minimumCompletedJobs,
        name: input.name,
        description: input.description,
        createdBy,
      },
    });

    return this.mapToEntity(threshold);
  }

  /**
   * Update a threshold
   */
  async updateThreshold(id: string, input: UpdateThresholdInput): Promise<TrustThresholdEntity> {
    const threshold = await this.prisma.trustScoreThreshold.update({
      where: { id },
      data: {
        minimumScore: input.minimumScore,
        minimumTier: input.minimumTier,
        requireVerification: input.requireVerification,
        minimumVerificationLevel: input.minimumVerificationLevel,
        requireMfa: input.requireMfa,
        minimumReviews: input.minimumReviews,
        minimumCompletedJobs: input.minimumCompletedJobs,
        name: input.name,
        description: input.description,
        isActive: input.isActive,
      },
    });

    return this.mapToEntity(threshold);
  }

  /**
   * Delete a threshold
   */
  async deleteThreshold(id: string): Promise<void> {
    await this.prisma.trustScoreThreshold.delete({
      where: { id },
    });
  }

  /**
   * Get threshold by ID
   */
  async getThreshold(id: string): Promise<TrustThresholdEntity | null> {
    const threshold = await this.prisma.trustScoreThreshold.findUnique({
      where: { id },
    });

    if (!threshold) {
      return null;
    }

    return this.mapToEntity(threshold);
  }

  /**
   * Get threshold by context
   */
  async getThresholdByContext(
    contextType: ThresholdContextType,
    contextId?: string
  ): Promise<TrustThresholdEntity | null> {
    const threshold = await this.prisma.trustScoreThreshold.findFirst({
      where: {
        contextType,
        contextId: contextId ?? null,
        isActive: true,
      },
    });

    if (!threshold) {
      return null;
    }

    return this.mapToEntity(threshold);
  }

  /**
   * Get all thresholds for a context type
   */
  async getThresholdsByContextType(contextType: ThresholdContextType): Promise<TrustThresholdEntity[]> {
    const thresholds = await this.prisma.trustScoreThreshold.findMany({
      where: { contextType, isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return thresholds.map(this.mapToEntity);
  }

  /**
   * Get all active thresholds
   */
  async getAllActiveThresholds(): Promise<TrustThresholdEntity[]> {
    const thresholds = await this.prisma.trustScoreThreshold.findMany({
      where: { isActive: true },
      orderBy: [{ contextType: 'asc' }, { createdAt: 'desc' }],
    });

    return thresholds.map(this.mapToEntity);
  }

  /**
   * Get global default threshold
   */
  async getGlobalThreshold(): Promise<TrustThresholdEntity | null> {
    return this.getThresholdByContext('GLOBAL');
  }

  // ============================================================================
  // Eligibility Checking
  // ============================================================================

  /**
   * Check if a user meets a specific threshold
   */
  checkUserEligibility(user: UserEligibilityData, threshold: TrustThresholdEntity): ThresholdCheckResult {
    const failures: ThresholdFailure[] = [];
    const warnings: ThresholdWarning[] = [];

    // Check minimum score
    if (user.trustScore.overallScore < threshold.minimumScore) {
      failures.push({
        requirement: 'minimumScore',
        required: threshold.minimumScore,
        actual: user.trustScore.overallScore,
        message: `Trust score of ${threshold.minimumScore} required, you have ${user.trustScore.overallScore}`,
      });
    } else if (user.trustScore.overallScore < threshold.minimumScore + 5) {
      warnings.push({
        requirement: 'minimumScore',
        message: `Your trust score is close to the minimum required (${threshold.minimumScore})`,
      });
    }

    // Check minimum tier
    if (threshold.minimumTier) {
      const userTierOrder = TIER_ORDER[user.trustScore.tier];
      const requiredTierOrder = TIER_ORDER[threshold.minimumTier];

      if (userTierOrder < requiredTierOrder) {
        failures.push({
          requirement: 'minimumTier',
          required: threshold.minimumTier,
          actual: user.trustScore.tier,
          message: `${threshold.minimumTier} tier required, you are ${user.trustScore.tier}`,
        });
      }
    }

    // Check verification requirement
    if (threshold.requireVerification && user.verificationLevel === 'NONE') {
      failures.push({
        requirement: 'verification',
        required: 'verified',
        actual: 'unverified',
        message: 'Account verification required',
      });
    }

    // Check minimum verification level
    if (threshold.minimumVerificationLevel) {
      const userVerificationOrder = VERIFICATION_ORDER[user.verificationLevel];
      const requiredVerificationOrder = VERIFICATION_ORDER[threshold.minimumVerificationLevel];

      if (userVerificationOrder < requiredVerificationOrder) {
        failures.push({
          requirement: 'minimumVerificationLevel',
          required: threshold.minimumVerificationLevel,
          actual: user.verificationLevel,
          message: `${threshold.minimumVerificationLevel} verification required, you have ${user.verificationLevel}`,
        });
      }
    }

    // Check MFA requirement
    if (threshold.requireMfa && !user.mfaEnabled) {
      failures.push({
        requirement: 'mfa',
        required: 'enabled',
        actual: 'disabled',
        message: 'Two-factor authentication required',
      });
    }

    // Check minimum reviews
    if (threshold.minimumReviews !== null && user.totalReviews < threshold.minimumReviews) {
      failures.push({
        requirement: 'minimumReviews',
        required: threshold.minimumReviews,
        actual: user.totalReviews,
        message: `${threshold.minimumReviews} reviews required, you have ${user.totalReviews}`,
      });
    }

    // Check minimum completed jobs
    if (threshold.minimumCompletedJobs !== null && user.completedJobs < threshold.minimumCompletedJobs) {
      failures.push({
        requirement: 'minimumCompletedJobs',
        required: threshold.minimumCompletedJobs,
        actual: user.completedJobs,
        message: `${threshold.minimumCompletedJobs} completed jobs required, you have ${user.completedJobs}`,
      });
    }

    // Add warning for declining trust score
    if (user.trustScore.trend === 'DECLINING') {
      warnings.push({
        requirement: 'trend',
        message: 'Your trust score is currently declining',
      });
    }

    return {
      meetsRequirements: failures.length === 0,
      failures,
      warnings,
    };
  }

  /**
   * Check if a user can apply for a specific job
   */
  async checkJobEligibility(userId: string, jobId: string, userData: UserEligibilityData): Promise<ThresholdCheckResult> {
    // First check job-specific threshold
    let threshold = await this.getThresholdByContext('JOB', jobId);

    // Fall back to global threshold if no job-specific threshold
    if (!threshold) {
      threshold = await this.getGlobalThreshold();
    }

    // If no thresholds exist, user is eligible
    if (!threshold) {
      return {
        meetsRequirements: true,
        failures: [],
        warnings: [],
      };
    }

    return this.checkUserEligibility(userData, threshold);
  }

  /**
   * Check eligibility against a tenant's threshold
   */
  async checkTenantEligibility(tenantId: string, userData: UserEligibilityData): Promise<ThresholdCheckResult> {
    const threshold = await this.getThresholdByContext('TENANT', tenantId);

    if (!threshold) {
      // Fall back to global threshold
      const globalThreshold = await this.getGlobalThreshold();
      if (!globalThreshold) {
        return {
          meetsRequirements: true,
          failures: [],
          warnings: [],
        };
      }
      return this.checkUserEligibility(userData, globalThreshold);
    }

    return this.checkUserEligibility(userData, threshold);
  }

  /**
   * Get requirements summary as a readable format
   */
  getRequirementsSummary(threshold: TrustThresholdEntity): TrustThresholdRequirements {
    return {
      minimumScore: threshold.minimumScore,
      minimumTier: threshold.minimumTier ?? undefined,
      requireVerification: threshold.requireVerification,
      minimumVerificationLevel: threshold.minimumVerificationLevel ?? undefined,
      requireMfa: threshold.requireMfa,
      minimumReviews: threshold.minimumReviews ?? undefined,
      minimumCompletedJobs: threshold.minimumCompletedJobs ?? undefined,
    };
  }

  /**
   * Find all jobs a user is eligible for
   * Returns context IDs of jobs where the user meets all requirements
   */
  async findEligibleJobs(userData: UserEligibilityData, jobIds: string[]): Promise<string[]> {
    const eligibleJobs: string[] = [];

    for (const jobId of jobIds) {
      const result = await this.checkJobEligibility(userData.trustScore.userId, jobId, userData);
      if (result.meetsRequirements) {
        eligibleJobs.push(jobId);
      }
    }

    return eligibleJobs;
  }

  /**
   * Get all users who meet a threshold
   * Returns user IDs
   */
  async findEligibleUsers(
    thresholdId: string,
    userDataList: UserEligibilityData[]
  ): Promise<{ eligible: string[]; ineligible: string[] }> {
    const threshold = await this.getThreshold(thresholdId);

    if (!threshold) {
      throw new Error('Threshold not found');
    }

    const eligible: string[] = [];
    const ineligible: string[] = [];

    for (const userData of userDataList) {
      const result = this.checkUserEligibility(userData, threshold);
      if (result.meetsRequirements) {
        eligible.push(userData.trustScore.userId);
      } else {
        ineligible.push(userData.trustScore.userId);
      }
    }

    return { eligible, ineligible };
  }

  // ============================================================================
  // Preset Thresholds
  // ============================================================================

  /**
   * Create preset thresholds for common scenarios
   */
  async createPresetThresholds(createdBy: string): Promise<TrustThresholdEntity[]> {
    const presets: CreateThresholdInput[] = [
      {
        contextType: 'GLOBAL',
        minimumScore: 0,
        requireVerification: true,
        requireMfa: false,
        name: 'Global Default',
        description: 'Minimum requirements for all users',
      },
      {
        contextType: 'POD_TEMPLATE',
        minimumScore: 60,
        minimumTier: 'TRUSTED',
        requireVerification: true,
        minimumVerificationLevel: 'BASIC',
        requireMfa: true,
        name: 'Standard SkillPod',
        description: 'Requirements for standard tutoring sessions',
      },
      {
        contextType: 'POD_TEMPLATE',
        minimumScore: 80,
        minimumTier: 'HIGHLY_TRUSTED',
        requireVerification: true,
        minimumVerificationLevel: 'ENHANCED',
        requireMfa: true,
        minimumReviews: 10,
        minimumCompletedJobs: 20,
        name: 'Premium SkillPod',
        description: 'Requirements for premium/high-value sessions',
      },
      {
        contextType: 'POD_TEMPLATE',
        minimumScore: 40,
        minimumTier: 'ESTABLISHED',
        requireVerification: true,
        requireMfa: false,
        name: 'Entry Level SkillPod',
        description: 'Lower barrier for new tutors to get started',
      },
    ];

    const created: TrustThresholdEntity[] = [];

    for (const preset of presets) {
      const threshold = await this.createThreshold(preset, createdBy);
      created.push(threshold);
    }

    return created;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private mapToEntity(
    threshold: Awaited<ReturnType<typeof this.prisma.trustScoreThreshold.findUnique>>
  ): TrustThresholdEntity {
    if (!threshold) {
      throw new Error('Threshold not found');
    }

    return {
      id: threshold.id,
      contextType: threshold.contextType as ThresholdContextType,
      contextId: threshold.contextId,
      minimumScore: threshold.minimumScore,
      minimumTier: threshold.minimumTier as TrustTier | null,
      requireVerification: threshold.requireVerification,
      minimumVerificationLevel: threshold.minimumVerificationLevel as VerificationLevel | null,
      requireMfa: threshold.requireMfa,
      minimumReviews: threshold.minimumReviews,
      minimumCompletedJobs: threshold.minimumCompletedJobs,
      name: threshold.name,
      description: threshold.description,
      isActive: threshold.isActive,
      createdBy: threshold.createdBy,
      createdAt: threshold.createdAt,
      updatedAt: threshold.updatedAt,
    };
  }
}
