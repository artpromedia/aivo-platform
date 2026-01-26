import type {
  Activity,
  ActivitySequence,
  SequencedActivity,
  SequencingConstraints,
  LearnerProfile,
  CognitiveLoadLevel,
  UnlockCondition,
  BranchingPoint,
} from '../types/index.js';

interface SequencingRule {
  name: string;
  priority: number;
  apply: (activities: Activity[], constraints: SequencingConstraints, profile: LearnerProfile) => Activity[];
}

export class ActivitySequencer {
  private rules: SequencingRule[] = [];

  constructor() {
    this.registerDefaultRules();
  }

  /**
   * Sequence activities based on constraints and learner profile
   */
  async sequenceActivities(
    activities: Activity[],
    constraints: SequencingConstraints,
    learnerProfile: LearnerProfile
  ): Promise<ActivitySequence> {
    // Start with a copy of activities
    let sequenced = [...activities];

    // Apply sequencing rules in priority order
    const sortedRules = [...this.rules].sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      sequenced = rule.apply(sequenced, constraints, learnerProfile);
    }

    // Build the sequenced activities with order and unlock conditions
    const orderedActivities: SequencedActivity[] = sequenced.map((activity, index) => ({
      activity,
      order: index,
      isRequired: constraints.mustComplete.includes(activity.id),
      unlockConditions: this.generateUnlockConditions(activity, sequenced, index),
    }));

    // Generate branching points if needed
    const branchingPoints = this.generateBranchingPoints(orderedActivities, learnerProfile);

    return {
      orderedActivities,
      branchingPoints,
    };
  }

  /**
   * Resequence activities based on performance feedback
   */
  async resequenceBasedOnPerformance(
    currentSequence: ActivitySequence,
    performanceScore: number,
    currentActivityIndex: number,
    learnerProfile: LearnerProfile
  ): Promise<ActivitySequence> {
    const remainingActivities = currentSequence.orderedActivities.slice(currentActivityIndex + 1);

    if (remainingActivities.length === 0) {
      return currentSequence;
    }

    // Adjust based on performance
    if (performanceScore < 50) {
      // Struggling: add review activities and lower difficulty
      return this.insertReviewActivities(currentSequence, currentActivityIndex, learnerProfile);
    } else if (performanceScore > 90) {
      // Excelling: potentially skip easier content
      return this.consolidateEasyContent(currentSequence, currentActivityIndex, learnerProfile);
    }

    return currentSequence;
  }

  /**
   * Register a custom sequencing rule
   */
  registerRule(rule: SequencingRule): void {
    this.rules.push(rule);
  }

  // ========== Private Helper Methods ==========

  private registerDefaultRules(): void {
    // Rule: Prerequisites first
    this.rules.push({
      name: 'prerequisites_first',
      priority: 100,
      apply: (activities, constraints, _profile) => {
        return this.topologicalSortByPrerequisites(activities);
      },
    });

    // Rule: Respect preferred order
    this.rules.push({
      name: 'preferred_order',
      priority: 90,
      apply: (activities, constraints, _profile) => {
        if (constraints.preferredOrder.length === 0) {
          return activities;
        }

        const orderMap = new Map(
          constraints.preferredOrder.map((id, index) => [id, index])
        );

        return [...activities].sort((a, b) => {
          const aOrder = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder;
        });
      },
    });

    // Rule: Spaced repetition
    this.rules.push({
      name: 'spaced_repetition',
      priority: 80,
      apply: (activities, constraints, _profile) => {
        if (!constraints.spacedRepetitionEnabled) {
          return activities;
        }

        return this.applySpacedRepetition(activities);
      },
    });

    // Rule: Interleave topics
    this.rules.push({
      name: 'interleave_topics',
      priority: 70,
      apply: (activities, constraints, _profile) => {
        if (!constraints.interleaveTopics) {
          return activities;
        }

        return this.interleaveByTopic(activities);
      },
    });

    // Rule: Cognitive load balancing
    this.rules.push({
      name: 'cognitive_load_balance',
      priority: 60,
      apply: (activities, constraints, _profile) => {
        return this.balanceCognitiveLoad(activities, constraints.maxConsecutiveSameType);
      },
    });

    // Rule: Difficulty progression
    this.rules.push({
      name: 'difficulty_progression',
      priority: 50,
      apply: (activities, constraints, profile) => {
        return this.applyDifficultyProgression(
          activities,
          constraints.difficultyProgression,
          profile
        );
      },
    });

    // Rule: Zone of proximal development
    this.rules.push({
      name: 'zpd_ordering',
      priority: 40,
      apply: (activities, _constraints, profile) => {
        return this.orderByZPD(activities, profile);
      },
    });
  }

  private topologicalSortByPrerequisites(activities: Activity[]): Activity[] {
    const activityMap = new Map(activities.map((a) => [a.id, a]));
    const visited = new Set<string>();
    const result: Activity[] = [];

    const visit = (activity: Activity) => {
      if (visited.has(activity.id)) return;
      visited.add(activity.id);

      // Visit prerequisites first
      for (const prereqId of activity.prerequisites) {
        const prereq = activityMap.get(prereqId);
        if (prereq) {
          visit(prereq);
        }
      }

      result.push(activity);
    };

    for (const activity of activities) {
      visit(activity);
    }

    return result;
  }

  private applySpacedRepetition(activities: Activity[]): Activity[] {
    // Group activities by skill
    const skillGroups = new Map<string, Activity[]>();

    for (const activity of activities) {
      for (const skillId of activity.skillIds) {
        if (!skillGroups.has(skillId)) {
          skillGroups.set(skillId, []);
        }
        skillGroups.get(skillId)!.push(activity);
      }
    }

    // For skills with multiple activities, space them out
    const result: Activity[] = [];
    const scheduled = new Set<string>();

    // First pass: schedule one activity from each skill
    for (const [_skillId, skillActivities] of skillGroups) {
      const unscheduled = skillActivities.filter((a) => !scheduled.has(a.id));
      if (unscheduled.length > 0) {
        result.push(unscheduled[0]);
        scheduled.add(unscheduled[0].id);
      }
    }

    // Second pass: interleave remaining activities
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const [_skillId, skillActivities] of skillGroups) {
        const unscheduled = skillActivities.filter((a) => !scheduled.has(a.id));
        if (unscheduled.length > 0) {
          result.push(unscheduled[0]);
          scheduled.add(unscheduled[0].id);
          hasMore = true;
        }
      }
    }

    // Add any activities not associated with skills
    for (const activity of activities) {
      if (!scheduled.has(activity.id)) {
        result.push(activity);
      }
    }

    return result;
  }

  private interleaveByTopic(activities: Activity[]): Activity[] {
    // Group by primary skill (first skill ID)
    const topicGroups = new Map<string, Activity[]>();

    for (const activity of activities) {
      const topic = activity.skillIds[0] ?? 'general';
      if (!topicGroups.has(topic)) {
        topicGroups.set(topic, []);
      }
      topicGroups.get(topic)!.push(activity);
    }

    // Interleave: round-robin through topics
    const result: Activity[] = [];
    const iterators = Array.from(topicGroups.values()).map((group) => ({
      activities: group,
      index: 0,
    }));

    while (result.length < activities.length) {
      for (const iterator of iterators) {
        if (iterator.index < iterator.activities.length) {
          result.push(iterator.activities[iterator.index]);
          iterator.index++;
        }
      }
    }

    return result;
  }

  private balanceCognitiveLoad(
    activities: Activity[],
    maxConsecutiveSameType: number
  ): Activity[] {
    const result: Activity[] = [];
    const remaining = [...activities];

    while (remaining.length > 0) {
      // Count consecutive same-type at end of result
      let consecutiveHighLoad = 0;
      for (let i = result.length - 1; i >= 0; i--) {
        if (
          result[i].cognitiveLoad === 'high' ||
          result[i].cognitiveLoad === 'overload'
        ) {
          consecutiveHighLoad++;
        } else {
          break;
        }
      }

      // Find next appropriate activity
      if (consecutiveHighLoad >= maxConsecutiveSameType) {
        // Need a low/medium load activity
        const lowLoadIndex = remaining.findIndex(
          (a) => a.cognitiveLoad === 'low' || a.cognitiveLoad === 'medium'
        );

        if (lowLoadIndex !== -1) {
          result.push(remaining[lowLoadIndex]);
          remaining.splice(lowLoadIndex, 1);
        } else {
          // No low load available, just take next
          result.push(remaining.shift()!);
        }
      } else {
        result.push(remaining.shift()!);
      }
    }

    return result;
  }

  private applyDifficultyProgression(
    activities: Activity[],
    progression: SequencingConstraints['difficultyProgression'],
    profile: LearnerProfile
  ): Activity[] {
    const sorted = [...activities];

    switch (progression) {
      case 'ascending':
        sorted.sort((a, b) => a.difficulty - b.difficulty);
        break;

      case 'descending':
        sorted.sort((a, b) => b.difficulty - a.difficulty);
        break;

      case 'mixed':
        // Alternate between easy and hard
        const easy = activities.filter((a) => a.difficulty <= 5);
        const hard = activities.filter((a) => a.difficulty > 5);
        sorted.length = 0;

        while (easy.length > 0 || hard.length > 0) {
          if (easy.length > 0) sorted.push(easy.shift()!);
          if (hard.length > 0) sorted.push(hard.shift()!);
        }
        break;

      case 'adaptive':
        // Start at learner's comfort level, gradually increase
        const comfortLevel = profile.averageAccuracy > 0.8 ? 6 : profile.averageAccuracy > 0.6 ? 4 : 3;

        sorted.sort((a, b) => {
          const aDistance = Math.abs(a.difficulty - comfortLevel);
          const bDistance = Math.abs(b.difficulty - comfortLevel);

          // First: activities near comfort level
          // Then: activities slightly harder
          // Finally: activities easier (review)
          if (aDistance <= 1 && bDistance <= 1) {
            return a.difficulty - b.difficulty; // Prefer slightly easier
          }
          if (aDistance <= 1) return -1;
          if (bDistance <= 1) return 1;

          return aDistance - bDistance;
        });
        break;
    }

    return sorted;
  }

  private orderByZPD(activities: Activity[], profile: LearnerProfile): Activity[] {
    // Zone of Proximal Development: activities that are challenging but achievable
    // Optimal difficulty is slightly above current mastery level

    return [...activities].sort((a, b) => {
      const aZPDScore = this.calculateZPDScore(a, profile);
      const bZPDScore = this.calculateZPDScore(b, profile);

      // Higher ZPD score = better fit for current learning
      return bZPDScore - aZPDScore;
    });
  }

  private calculateZPDScore(activity: Activity, profile: LearnerProfile): number {
    // Calculate average mastery for activity's skills
    const masteryLevels = activity.skillIds.map(
      (id) => profile.skillLevels.get(id) ?? 50
    );
    const avgMastery =
      masteryLevels.length > 0
        ? masteryLevels.reduce((a, b) => a + b, 0) / masteryLevels.length
        : 50;

    // Convert difficulty (1-10) to comparable scale (0-100)
    const difficultyLevel = activity.difficulty * 10;

    // ZPD is optimal when difficulty is 10-30 points above current mastery
    const gap = difficultyLevel - avgMastery;

    if (gap < 0) return 50 - Math.abs(gap); // Too easy
    if (gap <= 10) return 80; // Good - slight stretch
    if (gap <= 20) return 100; // Optimal ZPD
    if (gap <= 30) return 90; // Good - challenging
    if (gap <= 40) return 70; // Difficult but possible
    return 50 - (gap - 40); // Too hard
  }

  private generateUnlockConditions(
    activity: Activity,
    allActivities: Activity[],
    index: number
  ): UnlockCondition[] {
    const conditions: UnlockCondition[] = [];

    // Previous activity completion
    if (index > 0) {
      conditions.push({
        type: 'completion',
        targetId: allActivities[index - 1].id,
        targetValue: 1,
      });
    }

    // Prerequisite mastery
    for (const prereqId of activity.prerequisites) {
      conditions.push({
        type: 'mastery',
        targetId: prereqId,
        targetValue: 60, // 60% mastery required
      });
    }

    return conditions;
  }

  private generateBranchingPoints(
    activities: SequencedActivity[],
    profile: LearnerProfile
  ): BranchingPoint[] {
    const branchingPoints: BranchingPoint[] = [];

    // Add branching after assessments
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];

      if (activity.activity.type === 'assessment') {
        // Find possible branch targets
        const remainingActivities = activities.slice(i + 1);
        const reviewActivities = remainingActivities.filter(
          (a) => a.activity.type === 'review-session'
        );
        const advancedActivities = remainingActivities.filter(
          (a) => a.activity.difficulty >= 7
        );

        if (reviewActivities.length > 0 || advancedActivities.length > 0) {
          branchingPoints.push({
            afterActivityId: activity.activity.id,
            condition: 'assessment_score',
            branches: [
              {
                condition: 'score < 60',
                nextActivityIds: reviewActivities.slice(0, 2).map((a) => a.activity.id),
              },
              {
                condition: 'score >= 90',
                nextActivityIds: advancedActivities.slice(0, 2).map((a) => a.activity.id),
              },
            ],
          });
        }
      }
    }

    return branchingPoints;
  }

  private insertReviewActivities(
    sequence: ActivitySequence,
    afterIndex: number,
    profile: LearnerProfile
  ): ActivitySequence {
    const currentActivity = sequence.orderedActivities[afterIndex];

    // Create a review activity for struggled skills
    const reviewActivity: Activity = {
      id: `review-${currentActivity.activity.id}`,
      type: 'review-session',
      title: `Review: ${currentActivity.activity.title}`,
      description: 'Review session for reinforcement',
      estimatedDuration: 10,
      cognitiveLoad: 'low',
      difficulty: Math.max(1, currentActivity.activity.difficulty - 2),
      skillIds: currentActivity.activity.skillIds,
      prerequisites: [],
      metadata: { generated: true, reason: 'performance_support' },
    };

    const newSequencedActivity: SequencedActivity = {
      activity: reviewActivity,
      order: afterIndex + 1,
      isRequired: false,
      unlockConditions: [
        {
          type: 'completion',
          targetId: currentActivity.activity.id,
          targetValue: 1,
        },
      ],
    };

    // Insert the review activity
    const newOrderedActivities = [...sequence.orderedActivities];
    newOrderedActivities.splice(afterIndex + 1, 0, newSequencedActivity);

    // Update order numbers
    newOrderedActivities.forEach((a, i) => {
      a.order = i;
    });

    return {
      orderedActivities: newOrderedActivities,
      branchingPoints: sequence.branchingPoints,
    };
  }

  private consolidateEasyContent(
    sequence: ActivitySequence,
    afterIndex: number,
    profile: LearnerProfile
  ): ActivitySequence {
    const remaining = sequence.orderedActivities.slice(afterIndex + 1);

    // Mark easy, non-required activities as optional
    const consolidatedActivities = remaining.map((activity) => {
      if (
        activity.activity.difficulty <= 3 &&
        !activity.isRequired &&
        activity.activity.type !== 'assessment'
      ) {
        return {
          ...activity,
          activity: {
            ...activity.activity,
            metadata: {
              ...activity.activity.metadata,
              skippable: true,
              reason: 'high_performance',
            },
          },
        };
      }
      return activity;
    });

    return {
      orderedActivities: [
        ...sequence.orderedActivities.slice(0, afterIndex + 1),
        ...consolidatedActivities,
      ],
      branchingPoints: sequence.branchingPoints,
    };
  }
}
