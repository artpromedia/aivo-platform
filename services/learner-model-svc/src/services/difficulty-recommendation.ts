/**
 * Difficulty Recommendation Service
 *
 * Manages the parent approval workflow for difficulty adjustments.
 * Key responsibilities:
 * 1. Analyze learner progress to generate difficulty recommendations
 * 2. Check parent preferences (auto-approve, domain locks, caps)
 * 3. Create pending recommendations for parent review
 * 4. Apply approved difficulty changes to Virtual Brain
 * 5. Track change history for outcome analysis
 */

import { PrismaClient, SkillDomain, GradeBand } from '@prisma/client';
import { logger } from '@aivo/ts-observability';

// ── Types ────────────────────────────────────────────────────────────────────

export type DifficultyRecommendationStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'MODIFIED'
  | 'DENIED'
  | 'AUTO_APPLIED'
  | 'EXPIRED';

export type DifficultyAdjustmentType =
  | 'INCREASE'
  | 'DECREASE'
  | 'DOMAIN_SPECIFIC'
  | 'OVERALL';

export interface DomainOverride {
  lockedLevel: number;
  reason?: string;
  lockedAt?: string;
}

export interface ParentPreferences {
  autoApproveIncreases: boolean;
  autoApproveDecreases: boolean;
  notifyOnRecommendation: boolean;
  domainOverrides: Record<string, DomainOverride> | null;
  maxDifficultyLevel: number | null;
  minDifficultyLevel: number | null;
}

export interface LearnerDifficultyState {
  domain: SkillDomain;
  currentLevel: number;
  masteryScore: number;
  recentAccuracy: number;
  practiceCount: number;
  consecutiveSuccesses: number;
}

export interface RecommendationInput {
  tenantId: string;
  learnerId: string;
  virtualBrainId: string;
  parentId?: string;
  difficultyStates: LearnerDifficultyState[];
}

export interface RecommendationResult {
  recommendationId: string;
  status: DifficultyRecommendationStatus;
  domain: SkillDomain | null;
  currentLevel: number;
  recommendedLevel: number;
  appliedLevel?: number;
  reasonTitle: string;
  reasonDescription: string;
  wasAutoApplied: boolean;
  notificationSent: boolean;
}

export interface ApprovalInput {
  recommendationId: string;
  parentId: string;
  action: 'approve' | 'modify' | 'deny';
  modifiedLevel?: number;
  parentNotes?: string;
}

export interface ApprovalResult {
  success: boolean;
  status: DifficultyRecommendationStatus;
  appliedLevel?: number;
  message: string;
}

export interface ParentNotificationPayload {
  type: 'difficulty_recommendation';
  recommendationId: string;
  learnerId: string;
  learnerName: string;
  domain: string | null;
  currentLevel: number;
  recommendedLevel: number;
  reasonTitle: string;
  reasonDescription: string;
  expiresAt: string;
}

// ── Thresholds for generating recommendations ────────────────────────────────

const RECOMMENDATION_THRESHOLDS = {
  // Threshold for recommending level increase
  increaseThresholds: {
    minMastery: 0.75,           // Mastery must be >= 75%
    minAccuracy: 0.80,          // Recent accuracy must be >= 80%
    minPracticeCount: 10,       // At least 10 practice items
    minConsecutiveSuccesses: 5, // At least 5 consecutive successes
  },
  // Threshold for recommending level decrease
  decreaseThresholds: {
    maxMastery: 0.35,           // Mastery is below 35%
    maxAccuracy: 0.40,          // Recent accuracy is below 40%
    minPracticeCount: 5,        // At least 5 practice attempts
  },
  // How long before a pending recommendation expires
  expirationDays: 7,
};

// ── Service Class ────────────────────────────────────────────────────────────

export class DifficultyRecommendationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Analyze learner's current state and generate difficulty recommendations
   * if thresholds are met. Respects parent preferences.
   */
  async analyzeAndRecommend(
    input: RecommendationInput,
    notifyParent?: (payload: ParentNotificationPayload) => Promise<void>
  ): Promise<RecommendationResult[]> {
    const { tenantId, learnerId, virtualBrainId, difficultyStates } = input;
    const results: RecommendationResult[] = [];

    // Get parent preferences if they exist
    const preferences = await this.getParentPreferences(tenantId, learnerId);

    for (const state of difficultyStates) {
      const recommendation = await this.evaluateForRecommendation(
        tenantId,
        learnerId,
        virtualBrainId,
        state,
        preferences
      );

      if (recommendation) {
        // Check for auto-approval
        const shouldAutoApply = this.shouldAutoApply(
          recommendation.adjustmentType,
          recommendation.recommendedLevel,
          preferences
        );

        if (shouldAutoApply) {
          // Auto-apply the change
          const applied = await this.createAndAutoApplyRecommendation(
            tenantId,
            learnerId,
            virtualBrainId,
            state,
            recommendation,
            preferences
          );
          results.push(applied);
        } else {
          // Create pending recommendation for parent review
          const pending = await this.createPendingRecommendation(
            tenantId,
            learnerId,
            virtualBrainId,
            state,
            recommendation,
            preferences,
            notifyParent
          );
          results.push(pending);
        }
      }
    }

    return results;
  }

  /**
   * Get parent preferences for a learner
   */
  async getParentPreferences(
    tenantId: string,
    learnerId: string
  ): Promise<ParentPreferences | null> {
    const pref = await this.prisma.parentDifficultyPreference.findFirst({
      where: { tenantId, learnerId },
    });

    if (!pref) return null;

    return {
      autoApproveIncreases: pref.autoApproveIncreases,
      autoApproveDecreases: pref.autoApproveDecreases,
      notifyOnRecommendation: pref.notifyOnRecommendation,
      domainOverrides: pref.domainOverrides as Record<string, DomainOverride> | null,
      maxDifficultyLevel: pref.maxDifficultyLevel,
      minDifficultyLevel: pref.minDifficultyLevel,
    };
  }

  /**
   * Update parent preferences
   */
  async updateParentPreferences(
    tenantId: string,
    learnerId: string,
    parentId: string,
    updates: Partial<ParentPreferences>
  ): Promise<ParentPreferences> {
    const existing = await this.prisma.parentDifficultyPreference.findFirst({
      where: { tenantId, learnerId, parentId },
    });

    if (existing) {
      const updated = await this.prisma.parentDifficultyPreference.update({
        where: { id: existing.id },
        data: {
          autoApproveIncreases: updates.autoApproveIncreases ?? existing.autoApproveIncreases,
          autoApproveDecreases: updates.autoApproveDecreases ?? existing.autoApproveDecreases,
          notifyOnRecommendation: updates.notifyOnRecommendation ?? existing.notifyOnRecommendation,
          domainOverrides: updates.domainOverrides ?? existing.domainOverrides,
          maxDifficultyLevel: updates.maxDifficultyLevel ?? existing.maxDifficultyLevel,
          minDifficultyLevel: updates.minDifficultyLevel ?? existing.minDifficultyLevel,
        },
      });

      return {
        autoApproveIncreases: updated.autoApproveIncreases,
        autoApproveDecreases: updated.autoApproveDecreases,
        notifyOnRecommendation: updated.notifyOnRecommendation,
        domainOverrides: updated.domainOverrides as Record<string, DomainOverride> | null,
        maxDifficultyLevel: updated.maxDifficultyLevel,
        minDifficultyLevel: updated.minDifficultyLevel,
      };
    }

    const created = await this.prisma.parentDifficultyPreference.create({
      data: {
        tenantId,
        learnerId,
        parentId,
        autoApproveIncreases: updates.autoApproveIncreases ?? false,
        autoApproveDecreases: updates.autoApproveDecreases ?? false,
        notifyOnRecommendation: updates.notifyOnRecommendation ?? true,
        domainOverrides: updates.domainOverrides ?? null,
        maxDifficultyLevel: updates.maxDifficultyLevel ?? null,
        minDifficultyLevel: updates.minDifficultyLevel ?? null,
      },
    });

    return {
      autoApproveIncreases: created.autoApproveIncreases,
      autoApproveDecreases: created.autoApproveDecreases,
      notifyOnRecommendation: created.notifyOnRecommendation,
      domainOverrides: created.domainOverrides as Record<string, DomainOverride> | null,
      maxDifficultyLevel: created.maxDifficultyLevel,
      minDifficultyLevel: created.minDifficultyLevel,
    };
  }

  /**
   * Get pending recommendations for a learner
   */
  async getPendingRecommendations(
    tenantId: string,
    learnerId: string
  ): Promise<Array<{
    id: string;
    domain: SkillDomain | null;
    currentLevel: number;
    recommendedLevel: number;
    reasonTitle: string;
    reasonDescription: string;
    evidenceSummary: unknown;
    expiresAt: Date;
    createdAt: Date;
  }>> {
    const recommendations = await this.prisma.difficultyRecommendation.findMany({
      where: {
        tenantId,
        learnerId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return recommendations.map((r) => ({
      id: r.id,
      domain: r.domain,
      currentLevel: r.currentLevel,
      recommendedLevel: r.recommendedLevel,
      reasonTitle: r.reasonTitle,
      reasonDescription: r.reasonDescription,
      evidenceSummary: r.evidenceSummary,
      expiresAt: r.expiresAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Parent responds to a recommendation (approve/modify/deny)
   */
  async respondToRecommendation(input: ApprovalInput): Promise<ApprovalResult> {
    const { recommendationId, parentId, action, modifiedLevel, parentNotes } = input;

    const recommendation = await this.prisma.difficultyRecommendation.findUnique({
      where: { id: recommendationId },
    });

    if (!recommendation) {
      return { success: false, status: 'PENDING', message: 'Recommendation not found' };
    }

    if (recommendation.status !== 'PENDING') {
      return {
        success: false,
        status: recommendation.status as DifficultyRecommendationStatus,
        message: `Recommendation already processed with status: ${recommendation.status}`,
      };
    }

    if (new Date() > recommendation.expiresAt) {
      await this.prisma.difficultyRecommendation.update({
        where: { id: recommendationId },
        data: { status: 'EXPIRED' },
      });
      return { success: false, status: 'EXPIRED', message: 'Recommendation has expired' };
    }

    const now = new Date();

    switch (action) {
      case 'approve': {
        await this.prisma.difficultyRecommendation.update({
          where: { id: recommendationId },
          data: {
            status: 'APPROVED',
            respondedAt: now,
            respondedBy: parentId,
            parentNotes,
            appliedAt: now,
          },
        });

        // Apply the difficulty change
        await this.applyDifficultyChange(
          recommendation.tenantId,
          recommendation.learnerId,
          recommendation.virtualBrainId,
          recommendation.domain,
          recommendation.currentLevel,
          recommendation.recommendedLevel,
          recommendationId,
          parentId,
          'parent'
        );

        return {
          success: true,
          status: 'APPROVED',
          appliedLevel: recommendation.recommendedLevel,
          message: 'Difficulty change approved and applied',
        };
      }

      case 'modify': {
        if (!modifiedLevel || modifiedLevel < 1 || modifiedLevel > 5) {
          return {
            success: false,
            status: 'PENDING',
            message: 'Modified level must be between 1 and 5',
          };
        }

        await this.prisma.difficultyRecommendation.update({
          where: { id: recommendationId },
          data: {
            status: 'MODIFIED',
            parentSetLevel: modifiedLevel,
            respondedAt: now,
            respondedBy: parentId,
            parentNotes,
            appliedAt: now,
          },
        });

        // Apply the parent-modified difficulty change
        await this.applyDifficultyChange(
          recommendation.tenantId,
          recommendation.learnerId,
          recommendation.virtualBrainId,
          recommendation.domain,
          recommendation.currentLevel,
          modifiedLevel,
          recommendationId,
          parentId,
          'parent'
        );

        return {
          success: true,
          status: 'MODIFIED',
          appliedLevel: modifiedLevel,
          message: `Difficulty change modified to level ${modifiedLevel} and applied`,
        };
      }

      case 'deny': {
        await this.prisma.difficultyRecommendation.update({
          where: { id: recommendationId },
          data: {
            status: 'DENIED',
            respondedAt: now,
            respondedBy: parentId,
            parentNotes,
          },
        });

        return {
          success: true,
          status: 'DENIED',
          message: 'Difficulty change denied',
        };
      }

      default:
        return { success: false, status: 'PENDING', message: 'Invalid action' };
    }
  }

  /**
   * Parent directly sets a difficulty level for a domain (override)
   */
  async setDomainDifficulty(
    tenantId: string,
    learnerId: string,
    parentId: string,
    domain: SkillDomain,
    level: number,
    reason?: string
  ): Promise<{ success: boolean; message: string }> {
    if (level < 1 || level > 5) {
      return { success: false, message: 'Level must be between 1 and 5' };
    }

    // Get virtual brain
    const virtualBrain = await this.prisma.virtualBrain.findFirst({
      where: { tenantId, learnerId },
    });

    if (!virtualBrain) {
      return { success: false, message: 'Learner not found' };
    }

    // Update or create domain override in preferences
    const existingPref = await this.prisma.parentDifficultyPreference.findFirst({
      where: { tenantId, learnerId, parentId },
    });

    const newOverride: DomainOverride = {
      lockedLevel: level,
      reason,
      lockedAt: new Date().toISOString(),
    };

    if (existingPref) {
      const currentOverrides = (existingPref.domainOverrides as Record<string, DomainOverride>) || {};
      currentOverrides[domain] = newOverride;

      await this.prisma.parentDifficultyPreference.update({
        where: { id: existingPref.id },
        data: { domainOverrides: currentOverrides },
      });
    } else {
      await this.prisma.parentDifficultyPreference.create({
        data: {
          tenantId,
          learnerId,
          parentId,
          domainOverrides: { [domain]: newOverride },
        },
      });
    }

    // Record the change in history
    await this.prisma.difficultyChangeHistory.create({
      data: {
        tenantId,
        learnerId,
        virtualBrainId: virtualBrain.id,
        domain,
        previousLevel: 0, // Unknown
        newLevel: level,
        changeSource: 'parent_override',
        changedBy: parentId,
        changedByType: 'parent',
      },
    });

    logger.info('Parent set domain difficulty override', {
      tenantId,
      learnerId,
      parentId,
      domain,
      level,
    });

    return {
      success: true,
      message: `${domain} difficulty set to level ${level}`,
    };
  }

  /**
   * Get difficulty change history for a learner
   */
  async getDifficultyHistory(
    tenantId: string,
    learnerId: string,
    limit = 20
  ): Promise<Array<{
    id: string;
    domain: SkillDomain | null;
    previousLevel: number;
    newLevel: number;
    changeSource: string;
    changedByType: string;
    wasEffective: boolean | null;
    createdAt: Date;
  }>> {
    const history = await this.prisma.difficultyChangeHistory.findMany({
      where: { tenantId, learnerId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return history.map((h) => ({
      id: h.id,
      domain: h.domain,
      previousLevel: h.previousLevel,
      newLevel: h.newLevel,
      changeSource: h.changeSource,
      changedByType: h.changedByType,
      wasEffective: h.wasEffective,
      createdAt: h.createdAt,
    }));
  }

  /**
   * Get current difficulty levels for a learner by domain
   */
  async getCurrentDifficultyLevels(
    tenantId: string,
    learnerId: string
  ): Promise<Record<SkillDomain, { level: number; source: string }>> {
    const virtualBrain = await this.prisma.virtualBrain.findFirst({
      where: { tenantId, learnerId },
      include: {
        skillStates: {
          include: { skill: true },
        },
      },
    });

    if (!virtualBrain) {
      // Return defaults
      return {
        ELA: { level: 3, source: 'default' },
        MATH: { level: 3, source: 'default' },
        SCIENCE: { level: 3, source: 'default' },
        SPEECH: { level: 3, source: 'default' },
        SEL: { level: 3, source: 'default' },
      };
    }

    // Get parent overrides if any
    const pref = await this.prisma.parentDifficultyPreference.findFirst({
      where: { tenantId, learnerId },
    });
    const overrides = (pref?.domainOverrides as Record<string, DomainOverride>) || {};

    const result: Record<SkillDomain, { level: number; source: string }> = {
      ELA: { level: 3, source: 'default' },
      MATH: { level: 3, source: 'default' },
      SCIENCE: { level: 3, source: 'default' },
      SPEECH: { level: 3, source: 'default' },
      SEL: { level: 3, source: 'default' },
    };

    // Calculate levels from mastery
    const domainMasteries: Record<SkillDomain, number[]> = {
      ELA: [],
      MATH: [],
      SCIENCE: [],
      SPEECH: [],
      SEL: [],
    };

    for (const state of virtualBrain.skillStates) {
      const domain = state.skill.domain;
      domainMasteries[domain].push(Number(state.masteryLevel));
    }

    for (const domain of Object.keys(domainMasteries) as SkillDomain[]) {
      const masteries = domainMasteries[domain];
      if (masteries.length > 0) {
        const avgMastery = masteries.reduce((a, b) => a + b, 0) / masteries.length;
        const calculatedLevel = this.masteryToLevel(avgMastery);

        // Check for parent override
        if (overrides[domain]) {
          result[domain] = { level: overrides[domain].lockedLevel, source: 'parent_override' };
        } else {
          result[domain] = { level: calculatedLevel, source: 'calculated' };
        }
      }
    }

    return result;
  }

  /**
   * Expire old pending recommendations
   */
  async expireOldRecommendations(): Promise<number> {
    const result = await this.prisma.difficultyRecommendation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: { status: 'EXPIRED' },
    });

    if (result.count > 0) {
      logger.info(`Expired ${result.count} old difficulty recommendations`);
    }

    return result.count;
  }

  // ── Private Methods ────────────────────────────────────────────────────────

  private async evaluateForRecommendation(
    tenantId: string,
    learnerId: string,
    virtualBrainId: string,
    state: LearnerDifficultyState,
    preferences: ParentPreferences | null
  ): Promise<{
    adjustmentType: DifficultyAdjustmentType;
    recommendedLevel: number;
    reasonTitle: string;
    reasonDescription: string;
  } | null> {
    const { domain, currentLevel, masteryScore, recentAccuracy, practiceCount, consecutiveSuccesses } = state;

    // Check for domain lock
    if (preferences?.domainOverrides?.[domain]) {
      logger.debug('Domain is locked by parent', { domain, learnerId });
      return null;
    }

    // Check for existing pending recommendation
    const existingPending = await this.prisma.difficultyRecommendation.findFirst({
      where: {
        tenantId,
        learnerId,
        domain,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPending) {
      logger.debug('Already has pending recommendation for domain', { domain, learnerId });
      return null;
    }

    // Evaluate for INCREASE
    const incThresh = RECOMMENDATION_THRESHOLDS.increaseThresholds;
    if (
      currentLevel < 5 &&
      masteryScore >= incThresh.minMastery &&
      recentAccuracy >= incThresh.minAccuracy &&
      practiceCount >= incThresh.minPracticeCount &&
      consecutiveSuccesses >= incThresh.minConsecutiveSuccesses
    ) {
      let recommendedLevel = currentLevel + 1;

      // Apply parent cap
      if (preferences?.maxDifficultyLevel && recommendedLevel > preferences.maxDifficultyLevel) {
        recommendedLevel = preferences.maxDifficultyLevel;
      }

      if (recommendedLevel <= currentLevel) return null;

      return {
        adjustmentType: 'INCREASE',
        recommendedLevel,
        reasonTitle: `Ready for More Challenge in ${this.formatDomain(domain)}`,
        reasonDescription: this.generateIncreaseDescription(state, recommendedLevel),
      };
    }

    // Evaluate for DECREASE
    const decThresh = RECOMMENDATION_THRESHOLDS.decreaseThresholds;
    if (
      currentLevel > 1 &&
      masteryScore <= decThresh.maxMastery &&
      recentAccuracy <= decThresh.maxAccuracy &&
      practiceCount >= decThresh.minPracticeCount
    ) {
      let recommendedLevel = currentLevel - 1;

      // Apply parent floor
      if (preferences?.minDifficultyLevel && recommendedLevel < preferences.minDifficultyLevel) {
        recommendedLevel = preferences.minDifficultyLevel;
      }

      if (recommendedLevel >= currentLevel) return null;

      return {
        adjustmentType: 'DECREASE',
        recommendedLevel,
        reasonTitle: `Adjustment Recommended in ${this.formatDomain(domain)}`,
        reasonDescription: this.generateDecreaseDescription(state, recommendedLevel),
      };
    }

    return null;
  }

  private shouldAutoApply(
    adjustmentType: DifficultyAdjustmentType,
    recommendedLevel: number,
    preferences: ParentPreferences | null
  ): boolean {
    if (!preferences) return false;

    if (adjustmentType === 'INCREASE' && preferences.autoApproveIncreases) {
      return true;
    }

    if (adjustmentType === 'DECREASE' && preferences.autoApproveDecreases) {
      return true;
    }

    return false;
  }

  private async createAndAutoApplyRecommendation(
    tenantId: string,
    learnerId: string,
    virtualBrainId: string,
    state: LearnerDifficultyState,
    recommendation: {
      adjustmentType: DifficultyAdjustmentType;
      recommendedLevel: number;
      reasonTitle: string;
      reasonDescription: string;
    },
    preferences: ParentPreferences | null
  ): Promise<RecommendationResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RECOMMENDATION_THRESHOLDS.expirationDays * 24 * 60 * 60 * 1000);

    const rec = await this.prisma.difficultyRecommendation.create({
      data: {
        tenantId,
        learnerId,
        virtualBrainId,
        adjustmentType: recommendation.adjustmentType,
        domain: state.domain,
        currentLevel: state.currentLevel,
        recommendedLevel: recommendation.recommendedLevel,
        masteryScore: state.masteryScore,
        recentAccuracy: state.recentAccuracy,
        practiceCount: state.practiceCount,
        consecutiveSuccesses: state.consecutiveSuccesses,
        reasonTitle: recommendation.reasonTitle,
        reasonDescription: recommendation.reasonDescription,
        evidenceSummary: {
          masteryScore: state.masteryScore,
          recentAccuracy: state.recentAccuracy,
          practiceCount: state.practiceCount,
          consecutiveSuccesses: state.consecutiveSuccesses,
        },
        status: 'AUTO_APPLIED',
        expiresAt,
        appliedAt: now,
      },
    });

    // Apply the change
    await this.applyDifficultyChange(
      tenantId,
      learnerId,
      virtualBrainId,
      state.domain,
      state.currentLevel,
      recommendation.recommendedLevel,
      rec.id,
      null,
      'system'
    );

    logger.info('Auto-applied difficulty recommendation', {
      recommendationId: rec.id,
      learnerId,
      domain: state.domain,
      from: state.currentLevel,
      to: recommendation.recommendedLevel,
    });

    return {
      recommendationId: rec.id,
      status: 'AUTO_APPLIED',
      domain: state.domain,
      currentLevel: state.currentLevel,
      recommendedLevel: recommendation.recommendedLevel,
      appliedLevel: recommendation.recommendedLevel,
      reasonTitle: recommendation.reasonTitle,
      reasonDescription: recommendation.reasonDescription,
      wasAutoApplied: true,
      notificationSent: false,
    };
  }

  private async createPendingRecommendation(
    tenantId: string,
    learnerId: string,
    virtualBrainId: string,
    state: LearnerDifficultyState,
    recommendation: {
      adjustmentType: DifficultyAdjustmentType;
      recommendedLevel: number;
      reasonTitle: string;
      reasonDescription: string;
    },
    preferences: ParentPreferences | null,
    notifyParent?: (payload: ParentNotificationPayload) => Promise<void>
  ): Promise<RecommendationResult> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RECOMMENDATION_THRESHOLDS.expirationDays * 24 * 60 * 60 * 1000);

    const rec = await this.prisma.difficultyRecommendation.create({
      data: {
        tenantId,
        learnerId,
        virtualBrainId,
        adjustmentType: recommendation.adjustmentType,
        domain: state.domain,
        currentLevel: state.currentLevel,
        recommendedLevel: recommendation.recommendedLevel,
        masteryScore: state.masteryScore,
        recentAccuracy: state.recentAccuracy,
        practiceCount: state.practiceCount,
        consecutiveSuccesses: state.consecutiveSuccesses,
        reasonTitle: recommendation.reasonTitle,
        reasonDescription: recommendation.reasonDescription,
        evidenceSummary: {
          masteryScore: state.masteryScore,
          recentAccuracy: state.recentAccuracy,
          practiceCount: state.practiceCount,
          consecutiveSuccesses: state.consecutiveSuccesses,
        },
        status: 'PENDING',
        expiresAt,
      },
    });

    // Send notification if enabled
    let notificationSent = false;
    if (notifyParent && (preferences?.notifyOnRecommendation ?? true)) {
      try {
        await notifyParent({
          type: 'difficulty_recommendation',
          recommendationId: rec.id,
          learnerId,
          learnerName: '', // Caller should fill this in
          domain: state.domain,
          currentLevel: state.currentLevel,
          recommendedLevel: recommendation.recommendedLevel,
          reasonTitle: recommendation.reasonTitle,
          reasonDescription: recommendation.reasonDescription,
          expiresAt: expiresAt.toISOString(),
        });

        await this.prisma.difficultyRecommendation.update({
          where: { id: rec.id },
          data: { notificationSentAt: now },
        });

        notificationSent = true;
      } catch (error) {
        logger.error('Failed to send parent notification', {
          recommendationId: rec.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logger.info('Created pending difficulty recommendation', {
      recommendationId: rec.id,
      learnerId,
      domain: state.domain,
      from: state.currentLevel,
      to: recommendation.recommendedLevel,
      notificationSent,
    });

    return {
      recommendationId: rec.id,
      status: 'PENDING',
      domain: state.domain,
      currentLevel: state.currentLevel,
      recommendedLevel: recommendation.recommendedLevel,
      reasonTitle: recommendation.reasonTitle,
      reasonDescription: recommendation.reasonDescription,
      wasAutoApplied: false,
      notificationSent,
    };
  }

  private async applyDifficultyChange(
    tenantId: string,
    learnerId: string,
    virtualBrainId: string,
    domain: SkillDomain | null,
    previousLevel: number,
    newLevel: number,
    recommendationId: string | null,
    changedBy: string | null,
    changedByType: 'system' | 'parent' | 'admin'
  ): Promise<void> {
    // Record in history
    await this.prisma.difficultyChangeHistory.create({
      data: {
        tenantId,
        learnerId,
        virtualBrainId,
        recommendationId,
        domain,
        previousLevel,
        newLevel,
        changeSource: recommendationId ? 'system_recommendation' : 'parent_override',
        changedBy,
        changedByType,
      },
    });

    // Note: The actual application of difficulty to content selection
    // happens in the activity sequencer when generating session plans.
    // This history record allows the sequencer to look up the current
    // approved difficulty level for each domain.

    logger.info('Applied difficulty change', {
      learnerId,
      domain,
      previousLevel,
      newLevel,
      changedByType,
    });
  }

  private masteryToLevel(mastery: number): number {
    // Map 0-10 mastery to 1-5 difficulty level
    if (mastery < 2) return 1;
    if (mastery < 4) return 2;
    if (mastery < 6) return 3;
    if (mastery < 8) return 4;
    return 5;
  }

  private formatDomain(domain: SkillDomain): string {
    const names: Record<SkillDomain, string> = {
      ELA: 'English Language Arts',
      MATH: 'Mathematics',
      SCIENCE: 'Science',
      SPEECH: 'Speech & Language',
      SEL: 'Social-Emotional Learning',
    };
    return names[domain] || domain;
  }

  private generateIncreaseDescription(state: LearnerDifficultyState, newLevel: number): string {
    const accuracy = Math.round(state.recentAccuracy * 100);
    return `Your child has been doing great in ${this.formatDomain(state.domain)}! ` +
      `They've achieved ${accuracy}% accuracy over their last ${state.practiceCount} activities ` +
      `with ${state.consecutiveSuccesses} correct answers in a row. ` +
      `We recommend moving from Level ${state.currentLevel} to Level ${newLevel} ` +
      `to keep them challenged and engaged.`;
  }

  private generateDecreaseDescription(state: LearnerDifficultyState, newLevel: number): string {
    const accuracy = Math.round(state.recentAccuracy * 100);
    return `We've noticed your child is finding ${this.formatDomain(state.domain)} activities challenging. ` +
      `Their recent accuracy is ${accuracy}% over ${state.practiceCount} activities. ` +
      `To build their confidence and foundational skills, we recommend ` +
      `adjusting from Level ${state.currentLevel} to Level ${newLevel}. ` +
      `This will help them master core concepts before advancing.`;
  }
}

// ── Singleton Instance ───────────────────────────────────────────────────────

let _service: DifficultyRecommendationService | null = null;

export function createDifficultyRecommendationService(prisma: PrismaClient): DifficultyRecommendationService {
  if (!_service) {
    _service = new DifficultyRecommendationService(prisma);
  }
  return _service;
}
