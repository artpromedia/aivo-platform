import type {
  MasteryState,
  SkillMastery,
  MasteryEvidence,
  MasteryUpdate,
  MasteryPrediction,
  Activity,
} from '../types/index.js';
import { prisma } from '../prisma.js';

interface SpacedRepetitionParams {
  easeFactor: number;
  interval: number; // days
  repetitions: number;
}

const DEFAULT_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const FORGETTING_RATE = 0.1; // 10% per day without practice

export class MasteryTracker {
  /**
   * Update mastery based on new evidence
   */
  async updateMastery(
    learnerId: string,
    skillId: string,
    evidence: MasteryEvidence
  ): Promise<MasteryUpdate> {
    // Get current mastery state
    const currentMastery = await this.getSkillMastery(learnerId, skillId);

    // Calculate new mastery level
    const { newLevel, confidence } = this.calculateNewMastery(currentMastery, evidence);

    // Calculate next review date using spaced repetition
    const nextReviewDate = this.calculateNextReview(currentMastery, evidence, newLevel);

    // Determine trend
    const trend = this.determineTrend(currentMastery, newLevel);

    // Persist updated mastery
    await this.persistMastery(learnerId, skillId, {
      level: newLevel,
      confidence,
      lastPracticed: new Date(),
      practiceCount: (currentMastery?.practiceCount ?? 0) + 1,
      trend,
    });

    // Emit mastery updated event
    await this.emitMasteryEvent(learnerId, skillId, currentMastery?.level ?? 0, newLevel);

    return {
      skillId,
      previousLevel: currentMastery?.level ?? 0,
      newLevel,
      change: newLevel - (currentMastery?.level ?? 0),
      confidence,
      nextReviewDate,
    };
  }

  /**
   * Get current mastery state for a learner
   */
  async getMasteryState(learnerId: string, skillIds: string[]): Promise<MasteryState> {
    const masteryRecords = await prisma.skillMastery.findMany({
      where: {
        learnerId,
        skillId: { in: skillIds },
      },
    });

    const skills = new Map<string, SkillMastery>();

    for (const record of masteryRecords) {
      skills.set(record.skillId, {
        skillId: record.skillId,
        level: record.level,
        confidence: record.confidence,
        lastPracticed: record.lastPracticed,
        practiceCount: record.practiceCount,
        trend: record.trend as 'improving' | 'stable' | 'declining',
      });
    }

    // Fill in missing skills with defaults
    for (const skillId of skillIds) {
      if (!skills.has(skillId)) {
        skills.set(skillId, {
          skillId,
          level: 0,
          confidence: 0,
          lastPracticed: new Date(0),
          practiceCount: 0,
          trend: 'stable',
        });
      }
    }

    return {
      learnerId,
      skills,
      lastUpdated: new Date(),
    };
  }

  /**
   * Predict mastery gain from an activity
   */
  async predictMasteryGain(
    activity: Activity,
    currentMastery: MasteryState
  ): Promise<MasteryPrediction> {
    const skillPredictions: Array<{ skillId: string; expectedGain: number }> = [];

    for (const skillId of activity.skillIds) {
      const currentSkill = currentMastery.skills.get(skillId);
      const currentLevel = currentSkill?.level ?? 0;

      // Calculate expected gain based on activity difficulty and current mastery
      const expectedGain = this.calculateExpectedGain(
        activity.difficulty,
        currentLevel,
        activity.cognitiveLoad
      );

      skillPredictions.push({ skillId, expectedGain });
    }

    // Calculate overall prediction
    const totalGain =
      skillPredictions.length > 0
        ? skillPredictions.reduce((sum, p) => sum + p.expectedGain, 0) / skillPredictions.length
        : 0;

    const factors = this.identifyGainFactors(activity, currentMastery);
    const confidence = this.calculatePredictionConfidence(currentMastery, activity);

    return {
      expectedGain: totalGain,
      confidence,
      factors,
    };
  }

  /**
   * Get skills that need review based on spaced repetition
   */
  async getSkillsNeedingReview(learnerId: string): Promise<SkillMastery[]> {
    const allMastery = await prisma.skillMastery.findMany({
      where: { learnerId },
    });

    const now = new Date();
    const needsReview: SkillMastery[] = [];

    for (const record of allMastery) {
      const daysSinceReview =
        (now.getTime() - record.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);

      // Calculate decay
      const decayedLevel = this.calculateDecay(record.level, daysSinceReview);

      // Needs review if significant decay or scheduled review time has passed
      const scheduledInterval = this.getReviewInterval(record.level, record.practiceCount);

      if (daysSinceReview >= scheduledInterval || decayedLevel < record.level - 10) {
        needsReview.push({
          skillId: record.skillId,
          level: decayedLevel,
          confidence: record.confidence * (1 - daysSinceReview * 0.05),
          lastPracticed: record.lastPracticed,
          practiceCount: record.practiceCount,
          trend: record.trend as 'improving' | 'stable' | 'declining',
        });
      }
    }

    // Sort by urgency (most decayed first)
    needsReview.sort((a, b) => {
      const aUrgency = a.level * (1 - a.confidence);
      const bUrgency = b.level * (1 - b.confidence);
      return bUrgency - aUrgency;
    });

    return needsReview;
  }

  /**
   * Get mastery summary for reporting
   */
  async getMasterySummary(
    learnerId: string
  ): Promise<{
    totalSkills: number;
    masteredSkills: number;
    improvingSkills: number;
    decliningSkills: number;
    averageMastery: number;
    strongestSkills: SkillMastery[];
    weakestSkills: SkillMastery[];
  }> {
    const allMastery = await prisma.skillMastery.findMany({
      where: { learnerId },
    });

    const skills = allMastery.map((m) => ({
      skillId: m.skillId,
      level: m.level,
      confidence: m.confidence,
      lastPracticed: m.lastPracticed,
      practiceCount: m.practiceCount,
      trend: m.trend as 'improving' | 'stable' | 'declining',
    }));

    const masteredSkills = skills.filter((s) => s.level >= 80).length;
    const improvingSkills = skills.filter((s) => s.trend === 'improving').length;
    const decliningSkills = skills.filter((s) => s.trend === 'declining').length;
    const averageMastery =
      skills.length > 0
        ? skills.reduce((sum, s) => sum + s.level, 0) / skills.length
        : 0;

    const sortedByLevel = [...skills].sort((a, b) => b.level - a.level);

    return {
      totalSkills: skills.length,
      masteredSkills,
      improvingSkills,
      decliningSkills,
      averageMastery: Math.round(averageMastery),
      strongestSkills: sortedByLevel.slice(0, 5),
      weakestSkills: sortedByLevel.slice(-5).reverse(),
    };
  }

  /**
   * Batch update mastery for multiple skills
   */
  async batchUpdateMastery(
    learnerId: string,
    evidenceList: MasteryEvidence[]
  ): Promise<MasteryUpdate[]> {
    const updates: MasteryUpdate[] = [];

    for (const evidence of evidenceList) {
      const update = await this.updateMastery(learnerId, evidence.skillId, evidence);
      updates.push(update);
    }

    return updates;
  }

  // ========== Private Helper Methods ==========

  private async getSkillMastery(
    learnerId: string,
    skillId: string
  ): Promise<SkillMastery | null> {
    const record = await prisma.skillMastery.findUnique({
      where: {
        learnerId_skillId: { learnerId, skillId },
      },
    });

    if (!record) return null;

    return {
      skillId: record.skillId,
      level: record.level,
      confidence: record.confidence,
      lastPracticed: record.lastPracticed,
      practiceCount: record.practiceCount,
      trend: record.trend as 'improving' | 'stable' | 'declining',
    };
  }

  private calculateNewMastery(
    current: SkillMastery | null,
    evidence: MasteryEvidence
  ): { newLevel: number; confidence: number } {
    const currentLevel = current?.level ?? 0;
    const currentConfidence = current?.confidence ?? 0.5;

    // Calculate performance quality (0-5 scale for SM-2 algorithm)
    const quality = this.evidenceToQuality(evidence);

    // Base mastery change based on outcome
    let masteryChange: number;
    switch (evidence.outcome) {
      case 'success':
        masteryChange = 5 + quality * 2; // +5 to +15
        break;
      case 'partial':
        masteryChange = quality * 1.5; // 0 to +7.5
        break;
      case 'failure':
        masteryChange = -5 + quality; // -5 to 0
        break;
    }

    // Adjust for attempt count (diminishing returns)
    const attemptFactor = 1 / Math.sqrt(evidence.attemptCount);
    masteryChange *= attemptFactor;

    // Adjust for time spent (too fast might indicate guessing)
    if (evidence.timeSpent < 10) {
      masteryChange *= 0.8; // Reduce if completed too quickly
    }

    // Apply change with bounds
    const newLevel = Math.max(0, Math.min(100, currentLevel + masteryChange));

    // Update confidence based on consistency
    let newConfidence = currentConfidence;
    if (evidence.outcome === 'success' && evidence.attemptCount === 1) {
      newConfidence = Math.min(1, currentConfidence + 0.1);
    } else if (evidence.outcome === 'failure') {
      newConfidence = Math.max(0.1, currentConfidence - 0.15);
    }

    return { newLevel, confidence: newConfidence };
  }

  private evidenceToQuality(evidence: MasteryEvidence): number {
    // Convert evidence to SM-2 quality rating (0-5)
    let quality = 2.5; // Baseline

    if (evidence.outcome === 'success') {
      quality = evidence.attemptCount === 1 ? 5 : evidence.attemptCount === 2 ? 4 : 3;
    } else if (evidence.outcome === 'partial') {
      quality = evidence.score ? (evidence.score / 100) * 3 : 2;
    } else {
      quality = evidence.attemptCount > 3 ? 0 : 1;
    }

    // Adjust for error types
    if (evidence.errorTypes.length > 0) {
      quality -= evidence.errorTypes.length * 0.3;
    }

    return Math.max(0, Math.min(5, quality));
  }

  private calculateNextReview(
    current: SkillMastery | null,
    evidence: MasteryEvidence,
    newLevel: number
  ): Date {
    const quality = this.evidenceToQuality(evidence);
    const repetitions = (current?.practiceCount ?? 0) + 1;

    // SM-2 algorithm for interval calculation
    let interval: number;
    let easeFactor = current
      ? this.calculateEaseFactor(current, quality)
      : DEFAULT_EASE_FACTOR;

    if (quality < 3) {
      // Failed recall - reset interval
      interval = 1;
    } else if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(
        this.getReviewInterval(current?.level ?? 0, repetitions - 1) * easeFactor
      );
    }

    // Adjust interval based on mastery level
    if (newLevel >= 90) {
      interval *= 1.5; // High mastery = longer intervals
    } else if (newLevel < 50) {
      interval *= 0.7; // Low mastery = shorter intervals
    }

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + Math.max(1, interval));

    return nextReview;
  }

  private calculateEaseFactor(current: SkillMastery, quality: number): number {
    // SM-2 ease factor update
    const currentEF = DEFAULT_EASE_FACTOR;
    const newEF = currentEF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

    return Math.max(MIN_EASE_FACTOR, newEF);
  }

  private getReviewInterval(level: number, repetitions: number): number {
    // Base interval in days
    if (repetitions <= 1) return 1;
    if (repetitions === 2) return 3;

    // Exponential growth with mastery adjustment
    const baseInterval = Math.pow(2, repetitions - 1);
    const masteryMultiplier = 0.5 + (level / 100);

    return Math.round(baseInterval * masteryMultiplier);
  }

  private calculateDecay(level: number, daysSinceReview: number): number {
    // Exponential forgetting curve
    const decay = level * Math.exp(-FORGETTING_RATE * daysSinceReview);
    return Math.max(0, Math.round(decay));
  }

  private determineTrend(
    current: SkillMastery | null,
    newLevel: number
  ): 'improving' | 'stable' | 'declining' {
    if (!current) return 'stable';

    const change = newLevel - current.level;

    if (change > 5) return 'improving';
    if (change < -5) return 'declining';
    return 'stable';
  }

  private calculateExpectedGain(
    difficulty: number,
    currentLevel: number,
    cognitiveLoad: Activity['cognitiveLoad']
  ): number {
    // Base gain from activity
    let baseGain = 5;

    // Difficulty matching bonus
    const optimalDifficulty = currentLevel / 10 + 2;
    const difficultyMatch = 1 - Math.abs(difficulty - optimalDifficulty) / 10;
    baseGain *= (0.5 + difficultyMatch * 0.5);

    // Cognitive load adjustment
    const loadMultiplier = {
      low: 0.7,
      medium: 1.0,
      high: 1.2,
      overload: 0.8, // Diminished returns from overload
    };
    baseGain *= loadMultiplier[cognitiveLoad];

    // Diminishing returns at high mastery
    if (currentLevel > 80) {
      baseGain *= (100 - currentLevel) / 20;
    }

    return Math.max(0, Math.round(baseGain * 10) / 10);
  }

  private identifyGainFactors(
    activity: Activity,
    currentMastery: MasteryState
  ): Array<{ name: string; impact: number }> {
    const factors: Array<{ name: string; impact: number }> = [];

    // Difficulty alignment
    const avgCurrentLevel =
      activity.skillIds.reduce(
        (sum, id) => sum + (currentMastery.skills.get(id)?.level ?? 0),
        0
      ) / activity.skillIds.length || 0;

    const optimalDifficulty = avgCurrentLevel / 10 + 2;
    const difficultyAlignment =
      10 - Math.abs(activity.difficulty - optimalDifficulty) * 2;

    factors.push({
      name: 'Difficulty alignment',
      impact: difficultyAlignment,
    });

    // Practice frequency
    const recentPractice = activity.skillIds.some((id) => {
      const skill = currentMastery.skills.get(id);
      if (!skill) return false;
      const daysSince =
        (Date.now() - skill.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    });

    factors.push({
      name: 'Recent practice',
      impact: recentPractice ? 5 : -3,
    });

    // Cognitive load appropriateness
    const loadImpact = {
      low: avgCurrentLevel > 80 ? -3 : 3,
      medium: 5,
      high: avgCurrentLevel > 50 ? 5 : -2,
      overload: avgCurrentLevel > 70 ? 3 : -5,
    };

    factors.push({
      name: 'Cognitive load',
      impact: loadImpact[activity.cognitiveLoad],
    });

    return factors;
  }

  private calculatePredictionConfidence(
    currentMastery: MasteryState,
    activity: Activity
  ): number {
    let confidence = 0.5;

    // More data = higher confidence
    const totalPractice = activity.skillIds.reduce(
      (sum, id) => sum + (currentMastery.skills.get(id)?.practiceCount ?? 0),
      0
    );

    confidence += Math.min(0.3, totalPractice * 0.02);

    // Consistent trends = higher confidence
    const trends = activity.skillIds.map(
      (id) => currentMastery.skills.get(id)?.trend ?? 'stable'
    );
    const trendConsistency =
      new Set(trends).size === 1 ? 0.15 : trends.length > 3 ? -0.1 : 0;

    confidence += trendConsistency;

    return Math.max(0.2, Math.min(0.95, confidence));
  }

  private async persistMastery(
    learnerId: string,
    skillId: string,
    data: Omit<SkillMastery, 'skillId'>
  ): Promise<void> {
    await prisma.skillMastery.upsert({
      where: {
        learnerId_skillId: { learnerId, skillId },
      },
      update: {
        level: data.level,
        confidence: data.confidence,
        lastPracticed: data.lastPracticed,
        practiceCount: data.practiceCount,
        trend: data.trend,
      },
      create: {
        learnerId,
        skillId,
        level: data.level,
        confidence: data.confidence,
        lastPracticed: data.lastPracticed,
        practiceCount: data.practiceCount,
        trend: data.trend,
      },
    });
  }

  private async emitMasteryEvent(
    learnerId: string,
    skillId: string,
    previousLevel: number,
    newLevel: number
  ): Promise<void> {
    // Check for milestones
    const milestones = [25, 50, 75, 90, 100];
    for (const milestone of milestones) {
      if (previousLevel < milestone && newLevel >= milestone) {
        await prisma.learningEvent.create({
          data: {
            type: 'brain.mastery_milestone',
            learnerId,
            tenantId: '',
            timestamp: new Date(),
            data: {
              skillId,
              milestone,
              previousLevel,
              newLevel,
            },
            source: 'brain-orchestrator-svc',
          },
        });
        break;
      }
    }
  }
}
