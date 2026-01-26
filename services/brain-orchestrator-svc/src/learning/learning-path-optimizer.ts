import type {
  LearningPath,
  LearnerProgress,
  LearningGoal,
  OptimizedPath,
  PathImprovement,
  PathAdjustment,
  CompletionPrediction,
  LearnerProfile,
  PerformanceData,
  Activity,
  ActivitySequence,
  SequencedActivity,
} from '../types/index.js';
import { prisma } from '../prisma.js';
import { v4 as uuidv4 } from 'uuid';

interface OptimizationStrategy {
  name: string;
  apply: (path: LearningPath, profile: LearnerProfile, performance: PerformanceData) => PathImprovement[];
}

export class LearningPathOptimizer {
  private strategies: OptimizationStrategy[] = [];

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Optimize a learning path based on learner progress and goals
   */
  async optimizePath(
    currentPath: LearningPath,
    learnerProgress: LearnerProgress,
    goals: LearningGoal[]
  ): Promise<OptimizedPath> {
    // Get learner profile
    const profile = await this.getLearnerProfile(currentPath.learnerId);

    // Get recent performance data
    const performance = await this.getPerformanceData(currentPath.learnerId);

    // Apply optimization strategies
    const improvements: PathImprovement[] = [];

    for (const strategy of this.strategies) {
      const strategyImprovements = strategy.apply(currentPath, profile, performance);
      improvements.push(...strategyImprovements);
    }

    // Create optimized activity sequence
    const optimizedActivities = this.applyImprovements(
      currentPath.activities,
      improvements,
      profile,
      goals
    );

    // Calculate estimated gains
    const estimatedTimeReduction = this.calculateTimeReduction(
      currentPath.activities,
      optimizedActivities
    );
    const estimatedEffectivenessGain = this.calculateEffectivenessGain(
      improvements,
      profile
    );

    return {
      originalPath: currentPath,
      optimizedActivities,
      improvements,
      estimatedTimeReduction,
      estimatedEffectivenessGain,
    };
  }

  /**
   * Suggest adjustments to a learning path based on performance
   */
  async suggestPathAdjustments(
    pathId: string,
    performanceData: PerformanceData
  ): Promise<PathAdjustment[]> {
    const path = await this.getPath(pathId);
    if (!path) {
      throw new Error(`Path not found: ${pathId}`);
    }

    const adjustments: PathAdjustment[] = [];

    // Difficulty adjustment
    if (performanceData.averageScore < 60) {
      adjustments.push({
        type: 'difficulty',
        reason: 'Score indicates content may be too challenging',
        changes: this.suggestDifficultyChanges(path, 'decrease'),
      });
    } else if (performanceData.averageScore > 90 && performanceData.engagementTrend === 'decreasing') {
      adjustments.push({
        type: 'difficulty',
        reason: 'High scores with decreasing engagement suggests content is too easy',
        changes: this.suggestDifficultyChanges(path, 'increase'),
      });
    }

    // Pace adjustment
    if (performanceData.averageTimePerActivity > path.estimatedTotalDuration / path.activities.orderedActivities.length * 1.5) {
      adjustments.push({
        type: 'pace',
        reason: 'Activities are taking longer than expected',
        changes: this.suggestPaceChanges(path, 'slower'),
      });
    }

    // Content adjustment based on mastery growth
    if (performanceData.masteryGrowth < 5) {
      adjustments.push({
        type: 'content',
        reason: 'Low mastery growth suggests need for different approach',
        changes: this.suggestContentChanges(path, performanceData),
      });
    }

    // Order adjustment for engagement
    if (performanceData.engagementTrend === 'decreasing') {
      adjustments.push({
        type: 'order',
        reason: 'Declining engagement suggests activity order should be varied',
        changes: this.suggestOrderChanges(path),
      });
    }

    return adjustments;
  }

  /**
   * Predict when a learner will complete a learning path
   */
  async predictCompletion(
    pathId: string,
    learnerProfile: LearnerProfile
  ): Promise<CompletionPrediction> {
    const path = await this.getPath(pathId);
    if (!path) {
      throw new Error(`Path not found: ${pathId}`);
    }

    // Get remaining activities
    const completedIds = new Set(path.progress.completedActivityIds);
    const remainingActivities = path.activities.orderedActivities.filter(
      (a) => !completedIds.has(a.activity.id)
    );

    // Calculate base time estimate
    const baseTimeRemaining = remainingActivities.reduce(
      (sum, a) => sum + a.activity.estimatedDuration,
      0
    );

    // Adjust for learner pace
    const paceMultiplier = this.getPaceMultiplier(learnerProfile);
    const adjustedTime = baseTimeRemaining * paceMultiplier;

    // Calculate estimated completion date
    const averageStudyTimePerDay = await this.getAverageStudyTime(path.learnerId);
    const daysToComplete = Math.ceil(adjustedTime / Math.max(averageStudyTimePerDay, 15));

    const estimatedCompletionDate = new Date();
    estimatedCompletionDate.setDate(estimatedCompletionDate.getDate() + daysToComplete);

    // Calculate confidence interval
    const variabilityFactor = 0.3; // 30% variability
    const lowDate = new Date();
    lowDate.setDate(lowDate.getDate() + Math.floor(daysToComplete * (1 - variabilityFactor)));
    const highDate = new Date();
    highDate.setDate(highDate.getDate() + Math.ceil(daysToComplete * (1 + variabilityFactor)));

    // Identify factors affecting prediction
    const factors = this.identifyCompletionFactors(
      remainingActivities,
      learnerProfile
    );

    // Identify risks
    const risks = this.identifyCompletionRisks(
      remainingActivities,
      learnerProfile,
      path.progress
    );

    return {
      pathId,
      estimatedCompletionDate,
      confidenceInterval: { low: lowDate, high: highDate },
      factors,
      risks,
    };
  }

  /**
   * Register a custom optimization strategy
   */
  registerStrategy(strategy: OptimizationStrategy): void {
    this.strategies.push(strategy);
  }

  // ========== Private Helper Methods ==========

  private registerDefaultStrategies(): void {
    // Strategy: Skip mastered content
    this.strategies.push({
      name: 'skip_mastered',
      apply: (path, profile, _performance) => {
        const improvements: PathImprovement[] = [];

        for (const activity of path.activities.orderedActivities) {
          const skillMastery = activity.activity.skillIds.map(
            (id) => profile.skillLevels.get(id) ?? 0
          );
          const avgMastery = skillMastery.length > 0
            ? skillMastery.reduce((a, b) => a + b, 0) / skillMastery.length
            : 0;

          if (avgMastery >= 90 && !activity.isRequired) {
            improvements.push({
              type: 'skip',
              description: `Skip "${activity.activity.title}" - already mastered (${Math.round(avgMastery)}%)`,
              impact: `Save ${activity.activity.estimatedDuration} minutes`,
            });
          }
        }

        return improvements;
      },
    });

    // Strategy: Add reinforcement for weak areas
    this.strategies.push({
      name: 'reinforce_weak',
      apply: (path, profile, performance) => {
        const improvements: PathImprovement[] = [];

        // Find skills with low mastery that are in the path
        const pathSkills = new Set<string>();
        for (const activity of path.activities.orderedActivities) {
          activity.activity.skillIds.forEach((id) => pathSkills.add(id));
        }

        for (const skillId of pathSkills) {
          const mastery = profile.skillLevels.get(skillId) ?? 0;
          if (mastery < 50 && profile.weaknesses.includes(skillId)) {
            improvements.push({
              type: 'add',
              description: `Add additional practice for skill "${skillId}" (current mastery: ${Math.round(mastery)}%)`,
              impact: 'Improve foundation before advancing',
            });
          }
        }

        return improvements;
      },
    });

    // Strategy: Reorder for cognitive load balancing
    this.strategies.push({
      name: 'balance_cognitive_load',
      apply: (path, _profile, performance) => {
        const improvements: PathImprovement[] = [];

        // Check for sequences of high-load activities
        let consecutiveHighLoad = 0;
        let reorderNeeded = false;

        for (const activity of path.activities.orderedActivities) {
          if (activity.activity.cognitiveLoad === 'high') {
            consecutiveHighLoad++;
            if (consecutiveHighLoad >= 3) {
              reorderNeeded = true;
              break;
            }
          } else {
            consecutiveHighLoad = 0;
          }
        }

        if (reorderNeeded) {
          improvements.push({
            type: 'reorder',
            description: 'Interleave high-cognitive-load activities with lighter ones',
            impact: 'Reduce cognitive fatigue and improve retention',
          });
        }

        return improvements;
      },
    });

    // Strategy: Replace ineffective content
    this.strategies.push({
      name: 'replace_ineffective',
      apply: (path, profile, performance) => {
        const improvements: PathImprovement[] = [];

        if (performance.masteryGrowth < 3 && performance.activitiesCompleted > 5) {
          improvements.push({
            type: 'replace',
            description: 'Consider alternative learning materials for struggling topics',
            impact: 'May improve learning effectiveness',
          });
        }

        return improvements;
      },
    });
  }

  private applyImprovements(
    activities: ActivitySequence,
    improvements: PathImprovement[],
    profile: LearnerProfile,
    goals: LearningGoal[]
  ): ActivitySequence {
    const orderedActivities = [...activities.orderedActivities];
    const toRemove = new Set<number>();
    const toAdd: SequencedActivity[] = [];

    for (const improvement of improvements) {
      switch (improvement.type) {
        case 'skip':
          // Find and mark activity for removal
          const skipIndex = orderedActivities.findIndex(
            (a) => improvement.description.includes(a.activity.title) && !a.isRequired
          );
          if (skipIndex !== -1) {
            toRemove.add(skipIndex);
          }
          break;

        case 'add':
          // Add reinforcement activity
          const skillMatch = improvement.description.match(/skill "([^"]+)"/);
          if (skillMatch) {
            const skillId = skillMatch[1];
            const insertIndex = orderedActivities.findIndex((a) =>
              a.activity.skillIds.includes(skillId)
            );

            if (insertIndex !== -1) {
              const reinforcementActivity: SequencedActivity = {
                activity: {
                  id: uuidv4(),
                  type: 'practice-exercise',
                  title: `Reinforcement: ${skillId}`,
                  description: 'Additional practice for skill reinforcement',
                  estimatedDuration: 15,
                  cognitiveLoad: 'medium',
                  difficulty: 4,
                  skillIds: [skillId],
                  prerequisites: [],
                  metadata: { generated: true, reason: 'reinforcement' },
                },
                order: insertIndex,
                isRequired: false,
                unlockConditions: [],
              };
              toAdd.push(reinforcementActivity);
            }
          }
          break;

        case 'reorder':
          // Interleave high and low load activities
          this.interleaveByLoad(orderedActivities);
          break;
      }
    }

    // Apply removals (in reverse order to maintain indices)
    const removeIndices = Array.from(toRemove).sort((a, b) => b - a);
    for (const index of removeIndices) {
      orderedActivities.splice(index, 1);
    }

    // Apply additions
    for (const activity of toAdd) {
      orderedActivities.splice(activity.order, 0, activity);
    }

    // Update order numbers
    orderedActivities.forEach((a, i) => {
      a.order = i;
    });

    return {
      orderedActivities,
      branchingPoints: activities.branchingPoints,
    };
  }

  private interleaveByLoad(activities: SequencedActivity[]): void {
    const highLoad: SequencedActivity[] = [];
    const lowLoad: SequencedActivity[] = [];
    const mediumLoad: SequencedActivity[] = [];

    for (const activity of activities) {
      switch (activity.activity.cognitiveLoad) {
        case 'high':
        case 'overload':
          highLoad.push(activity);
          break;
        case 'low':
          lowLoad.push(activity);
          break;
        default:
          mediumLoad.push(activity);
      }
    }

    // Interleave: high, medium, low, medium, high, medium, low...
    const result: SequencedActivity[] = [];
    while (highLoad.length > 0 || mediumLoad.length > 0 || lowLoad.length > 0) {
      if (highLoad.length > 0) result.push(highLoad.shift()!);
      if (mediumLoad.length > 0) result.push(mediumLoad.shift()!);
      if (lowLoad.length > 0) result.push(lowLoad.shift()!);
      if (mediumLoad.length > 0) result.push(mediumLoad.shift()!);
    }

    // Copy back to original array
    activities.length = 0;
    activities.push(...result);
  }

  private calculateTimeReduction(
    original: ActivitySequence,
    optimized: ActivitySequence
  ): number {
    const originalTime = original.orderedActivities.reduce(
      (sum, a) => sum + a.activity.estimatedDuration,
      0
    );
    const optimizedTime = optimized.orderedActivities.reduce(
      (sum, a) => sum + a.activity.estimatedDuration,
      0
    );

    return originalTime - optimizedTime;
  }

  private calculateEffectivenessGain(
    improvements: PathImprovement[],
    profile: LearnerProfile
  ): number {
    let gain = 0;

    for (const improvement of improvements) {
      switch (improvement.type) {
        case 'skip':
          gain += 5; // Avoiding redundant content
          break;
        case 'add':
          gain += 10; // Reinforcement helps retention
          break;
        case 'reorder':
          gain += 8; // Better cognitive load distribution
          break;
        case 'replace':
          gain += 12; // More effective content
          break;
      }
    }

    // Adjust based on learner profile
    if (profile.learningRate > 1.2) {
      gain *= 0.8; // Fast learners benefit less from optimization
    } else if (profile.learningRate < 0.8) {
      gain *= 1.2; // Slower learners benefit more
    }

    return Math.min(50, gain); // Cap at 50% effectiveness gain
  }

  private suggestDifficultyChanges(
    path: LearningPath,
    direction: 'increase' | 'decrease'
  ): Array<{ activityId: string; change: string }> {
    return path.activities.orderedActivities
      .filter((a) => {
        if (direction === 'decrease') {
          return a.activity.difficulty > 3;
        }
        return a.activity.difficulty < 8;
      })
      .slice(0, 5)
      .map((a) => ({
        activityId: a.activity.id,
        change: direction === 'increase'
          ? `Increase difficulty from ${a.activity.difficulty} to ${Math.min(10, a.activity.difficulty + 2)}`
          : `Decrease difficulty from ${a.activity.difficulty} to ${Math.max(1, a.activity.difficulty - 2)}`,
      }));
  }

  private suggestPaceChanges(
    path: LearningPath,
    direction: 'faster' | 'slower'
  ): Array<{ activityId: string; change: string }> {
    return path.activities.orderedActivities.slice(0, 5).map((a) => ({
      activityId: a.activity.id,
      change: direction === 'slower'
        ? `Extend time allowance from ${a.activity.estimatedDuration} to ${Math.round(a.activity.estimatedDuration * 1.5)} minutes`
        : `Reduce time allowance from ${a.activity.estimatedDuration} to ${Math.round(a.activity.estimatedDuration * 0.75)} minutes`,
    }));
  }

  private suggestContentChanges(
    path: LearningPath,
    performance: PerformanceData
  ): Array<{ activityId: string; change: string }> {
    const changes: Array<{ activityId: string; change: string }> = [];

    // Suggest adding more visual content if available
    changes.push({
      activityId: 'general',
      change: 'Consider adding more interactive or visual learning materials',
    });

    // Suggest breaking down complex activities
    const complexActivities = path.activities.orderedActivities.filter(
      (a) => a.activity.cognitiveLoad === 'high' && a.activity.estimatedDuration > 30
    );

    for (const activity of complexActivities.slice(0, 3)) {
      changes.push({
        activityId: activity.activity.id,
        change: `Break down "${activity.activity.title}" into smaller segments`,
      });
    }

    return changes;
  }

  private suggestOrderChanges(
    path: LearningPath
  ): Array<{ activityId: string; change: string }> {
    return [
      {
        activityId: 'general',
        change: 'Vary activity types more frequently to maintain engagement',
      },
      {
        activityId: 'general',
        change: 'Place more engaging activities at points of declining attention',
      },
    ];
  }

  private getPaceMultiplier(profile: LearnerProfile): number {
    switch (profile.preferredPace) {
      case 'slow':
        return 1.3;
      case 'fast':
        return 0.8;
      default:
        return 1.0;
    }
  }

  private async getAverageStudyTime(learnerId: string): Promise<number> {
    const sessions = await prisma.cognitiveSession.findMany({
      where: {
        learnerId,
        endedAt: { not: null },
      },
      orderBy: { startedAt: 'desc' },
      take: 30,
    });

    if (sessions.length === 0) return 30; // Default 30 minutes per day

    const totalTime = sessions.reduce((sum, s) => {
      const duration = (s.endedAt!.getTime() - s.startedAt.getTime()) / 60000;
      return sum + duration;
    }, 0);

    // Group by day to get average per day
    const daySet = new Set(
      sessions.map((s) => s.startedAt.toISOString().split('T')[0])
    );

    return totalTime / daySet.size;
  }

  private identifyCompletionFactors(
    remainingActivities: SequencedActivity[],
    profile: LearnerProfile
  ): Array<{ name: string; impact: number }> {
    const factors: Array<{ name: string; impact: number }> = [];

    // Learning rate factor
    factors.push({
      name: 'Learning rate',
      impact: profile.learningRate > 1 ? -10 : profile.learningRate < 0.8 ? 15 : 0,
    });

    // Activity complexity factor
    const avgDifficulty =
      remainingActivities.reduce((sum, a) => sum + a.activity.difficulty, 0) /
      remainingActivities.length;
    factors.push({
      name: 'Content difficulty',
      impact: avgDifficulty > 7 ? 20 : avgDifficulty < 4 ? -10 : 0,
    });

    // Prerequisite knowledge factor
    const hasWeakPrereqs = remainingActivities.some((a) =>
      a.activity.prerequisites.some((p) => profile.weaknesses.includes(p))
    );
    if (hasWeakPrereqs) {
      factors.push({
        name: 'Prerequisite gaps',
        impact: 25,
      });
    }

    return factors;
  }

  private identifyCompletionRisks(
    remainingActivities: SequencedActivity[],
    profile: LearnerProfile,
    progress: LearningPath['progress']
  ): Array<{ description: string; probability: number }> {
    const risks: Array<{ description: string; probability: number }> = [];

    // Risk: Declining engagement
    if (progress.lastActivityAt) {
      const daysSinceActivity =
        (Date.now() - progress.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 3) {
        risks.push({
          description: 'Learner may have disengaged',
          probability: Math.min(0.8, daysSinceActivity / 10),
        });
      }
    }

    // Risk: Difficult content ahead
    const hardActivities = remainingActivities.filter(
      (a) => a.activity.difficulty >= 8
    );
    if (hardActivities.length > 0) {
      risks.push({
        description: 'Challenging content ahead may slow progress',
        probability: 0.4,
      });
    }

    // Risk: Known weaknesses
    const weakSkillsInPath = remainingActivities.filter((a) =>
      a.activity.skillIds.some((s) => profile.weaknesses.includes(s))
    );
    if (weakSkillsInPath.length > 0) {
      risks.push({
        description: 'Path includes skills learner struggles with',
        probability: 0.5,
      });
    }

    return risks;
  }

  private async getLearnerProfile(learnerId: string): Promise<LearnerProfile> {
    // In a real implementation, this would call the learner-model-svc
    return {
      id: learnerId,
      tenantId: '',
      skillLevels: new Map(),
      learningRate: 1.0,
      averageAccuracy: 0.75,
      averageResponseTime: 3000,
      preferredPace: 'normal',
      strengths: [],
      weaknesses: [],
    };
  }

  private async getPerformanceData(learnerId: string): Promise<PerformanceData> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return {
      learnerId,
      period: { start: weekAgo, end: now },
      activitiesCompleted: 0,
      averageScore: 75,
      averageTimePerActivity: 20,
      masteryGrowth: 5,
      engagementTrend: 'stable',
    };
  }

  private async getPath(pathId: string): Promise<LearningPath | null> {
    const path = await prisma.learningPath.findUnique({
      where: { id: pathId },
      include: { progress: true },
    });

    if (!path) return null;

    return {
      id: path.id,
      learnerId: path.learnerId,
      tenantId: path.tenantId,
      name: path.name,
      description: path.description ?? '',
      activities: { orderedActivities: [], branchingPoints: [] },
      estimatedTotalDuration: path.estimatedDuration,
      progress: path.progress
        ? {
            completedActivityIds: path.progress.completedActivityIds as string[],
            currentActivityId: path.progress.currentActivityId ?? undefined,
            totalProgress: path.progress.totalProgress,
            estimatedTimeRemaining: path.progress.estimatedTimeRemaining,
            lastActivityAt: path.progress.lastActivityAt ?? undefined,
          }
        : {
            completedActivityIds: [],
            totalProgress: 0,
            estimatedTimeRemaining: path.estimatedDuration,
          },
      createdAt: path.createdAt,
      updatedAt: path.updatedAt,
    };
  }
}

interface LearnerProgress {
  totalActivitiesCompleted: number;
  recentScores: number[];
  streak: number;
  lastActivityDate: Date | null;
}
