/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unnecessary-condition */
/**
 * Activity Sequencer
 *
 * Generates optimally sequenced learning sessions using:
 * - Mastery-based spacing (spacing effect)
 * - Interleaving across skill domains
 * - Zone of Proximal Development (ZPD) alignment
 * - Neurodiverse accommodations
 * - Fatigue management with breakpoints
 *
 * Research basis:
 * - Cepeda et al. (2006) - Distributed practice
 * - Rohrer & Taylor (2007) - Interleaving effects
 * - Vygotsky (1978) - Zone of Proximal Development
 */

import type {
  LearnerModelState,
  LearnerProfile,
  ActivityRecord,
  ActivityRecommendation,
} from '../models/index.js';

import type {
  SequencedActivity,
  SessionPlan,
  SessionPlanOptions,
  ActivityScore,
} from './activity-sequencer-types.js';

/**
 * Dependencies for Activity Sequencer
 */
export interface ActivitySequencerDependencies {
  /** Get learner profile */
  getLearnerProfile: (learnerId: string) => Promise<LearnerProfile | null>;

  /** Get activities matching skill IDs */
  getActivitiesBySkills: (
    skillIds: string[],
    options?: {
      excludeIds?: string[] | undefined;
      limit?: number | undefined;
    }
  ) => Promise<ActivityRecord[]>;

  /** Get activity recommendations for a learner */
  getRecommendations: (learnerId: string) => Promise<ActivityRecommendation[]>;
}

/**
 * Activity Sequencer implementation
 */
export class ActivitySequencer {
  constructor(private readonly deps: ActivitySequencerDependencies) {}

  /**
   * Generate an optimally sequenced learning session
   */
  async generateSessionPlan(
    learnerId: string,
    learnerState: LearnerModelState,
    options: SessionPlanOptions
  ): Promise<SessionPlan> {
    // Get learner profile for accommodations
    const learnerProfile = await this.deps.getLearnerProfile(learnerId);

    // Get activity recommendations
    const recommendations = await this.deps.getRecommendations(learnerId);

    // Get candidate activities
    const skillIds = recommendations.map((r) => r.skillId);
    const candidateActivities = await this.deps.getActivitiesBySkills(skillIds, {
      excludeIds: options.excludeActivityIds,
      limit: 50,
    });

    // Filter by focus skills if provided
    let filteredActivities = candidateActivities;
    if (options.focusSkills && options.focusSkills.length > 0) {
      filteredActivities = candidateActivities.filter((a) =>
        a.skillIds.some((s) => options.focusSkills?.includes(s))
      );
    }

    // Apply sequencing algorithm
    const sequencedActivities = this.applySequencingAlgorithm(
      filteredActivities,
      learnerState,
      learnerProfile,
      options
    );

    // Calculate breakpoints for neurodiverse learners
    const breakpoints = this.calculateBreakpoints(sequencedActivities, learnerProfile);

    // Generate objectives
    const objectives = this.generateObjectives(sequencedActivities, learnerState);

    // Aggregate adaptations
    const adaptations = this.aggregateAdaptations(sequencedActivities);

    // Calculate total estimated duration
    const estimatedDuration = sequencedActivities.reduce(
      (sum, a) => sum + (a.estimatedMinutes ?? 10),
      0
    );

    return {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      learnerId,
      targetDuration: options.targetDuration,
      activities: sequencedActivities,
      objectives,
      breakpoints,
      adaptations,
      estimatedDuration,
    };
  }

  /**
   * Apply mastery-based spacing and interleaving
   */
  private applySequencingAlgorithm(
    candidates: ActivityRecord[],
    learnerState: LearnerModelState,
    learnerProfile: LearnerProfile | null,
    options: SessionPlanOptions
  ): SequencedActivity[] {
    const sequenced: SequencedActivity[] = [];
    let remainingDuration = options.targetDuration;
    let position = 0;

    // Track when skills were last practiced for spacing
    const skillLastPracticed = new Map<string, number>();

    // Create priority queue sorted by recommendation score
    const priorityQueue = this.scoreAndSortActivities(candidates, learnerState, learnerProfile);

    while (remainingDuration > 0 && priorityQueue.length > 0) {
      // Find next activity using spacing and interleaving
      const nextActivity = this.selectNextActivity(
        priorityQueue,
        skillLastPracticed,
        position,
        learnerState,
        learnerProfile
      );

      if (!nextActivity) break;

      // Estimate duration with accommodations
      const duration = this.estimateDuration(nextActivity, learnerProfile);

      // Don't add if it would exceed time and we have something already
      if (duration > remainingDuration && sequenced.length > 0) {
        break;
      }

      // Calculate expected mastery improvement
      const skillId = nextActivity.skillIds[0];
      const currentSkill = skillId ? learnerState.skills.get(skillId) : undefined;
      const estimatedMastery = this.estimateMasteryAfterActivity(
        currentSkill?.knowledgeState.pMastery ?? 0,
        nextActivity
      );

      // Get reason and adaptations
      const reason = this.getActivityReason(nextActivity, learnerState);
      const adaptations = this.getActivityAdaptations(nextActivity, learnerProfile);

      // Add to sequence
      sequenced.push({
        ...nextActivity,
        sequencePosition: position,
        reason,
        adaptations,
        estimatedMastery,
      });

      // Update tracking
      remainingDuration -= duration;
      position++;

      for (const skillId of nextActivity.skillIds) {
        skillLastPracticed.set(skillId, position);
      }

      // Remove from queue
      const idx = priorityQueue.findIndex((a) => a.activity.id === nextActivity.id);
      if (idx > -1) priorityQueue.splice(idx, 1);
    }

    // Apply final optimizations
    return this.optimizeSequence(sequenced, learnerState, learnerProfile);
  }

  /**
   * Score and sort activities by priority
   */
  private scoreAndSortActivities(
    activities: ActivityRecord[],
    learnerState: LearnerModelState,
    learnerProfile: LearnerProfile | null
  ): ActivityScore[] {
    return activities
      .map((activity) => this.scoreActivity(activity, learnerState, learnerProfile))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Score a single activity
   */
  private scoreActivity(
    activity: ActivityRecord,
    learnerState: LearnerModelState,
    learnerProfile: LearnerProfile | null
  ): ActivityScore {
    let score = 0;
    const factors: string[] = [];

    // ZPD alignment (highest weight)
    for (const skillId of activity.skillIds) {
      if (learnerState.estimatedZPD.justRight.includes(skillId)) {
        score += 25;
        factors.push('zpd_optimal');
      } else if (learnerState.estimatedZPD.tooHard.includes(skillId)) {
        score -= 15;
        factors.push('zpd_hard');
      } else if (learnerState.estimatedZPD.tooEasy.includes(skillId)) {
        score -= 5;
        factors.push('zpd_easy');
      }
    }

    // Challenge areas need attention
    for (const skillId of activity.skillIds) {
      if (learnerState.challengeAreas.includes(skillId)) {
        score += 15;
        factors.push('challenge_area');
      }
    }

    // Engagement considerations
    if (learnerState.engagementLevel === 'low' || learnerState.engagementLevel === 'disengaged') {
      if (activity.isInteractive) {
        score += 15;
        factors.push('interactive_for_engagement');
      }
      if (activity.type === 'game') {
        score += 10;
        factors.push('gamified');
      }
    }

    // Frustration mitigation
    if (learnerState.frustrationLevel > 0.5) {
      if (activity.difficulty === 'easy') {
        score += 20;
        factors.push('easier_for_frustration');
      }
      if (activity.difficulty === 'hard') {
        score -= 25;
        factors.push('avoid_hard_when_frustrated');
      }
    }

    // Neurodiverse accommodations
    if (learnerProfile?.neurodiversityProfile?.adhd) {
      if (activity.estimatedMinutes <= 10) {
        score += 10;
        factors.push('short_for_adhd');
      }
      if (activity.isInteractive) {
        score += 8;
        factors.push('interactive_for_adhd');
      }
    }

    return { activity, score, factors };
  }

  /**
   * Select next activity using spacing and interleaving
   */
  private selectNextActivity(
    candidates: ActivityScore[],
    skillLastPracticed: Map<string, number>,
    currentPosition: number,
    learnerState: LearnerModelState,
    learnerProfile: LearnerProfile | null
  ): ActivityRecord | null {
    if (candidates.length === 0) return null;

    // Re-score with spacing considerations
    const rescored = candidates.map(({ activity, score, factors }) => {
      let adjustedScore = score;
      const adjustedFactors = [...factors];

      // Spacing effect: prefer skills not recently practiced
      const minSpacing = this.getOptimalSpacing(learnerProfile);
      let minLastPracticed = Infinity;

      for (const skillId of activity.skillIds) {
        const lastPos = skillLastPracticed.get(skillId);
        if (lastPos !== undefined) {
          minLastPracticed = Math.min(minLastPracticed, currentPosition - lastPos);
        }
      }

      if (minLastPracticed >= minSpacing) {
        adjustedScore += 20;
        adjustedFactors.push('good_spacing');
      } else if (minLastPracticed === Infinity) {
        adjustedScore += 15;
        adjustedFactors.push('new_skill');
      } else {
        adjustedScore -= (minSpacing - minLastPracticed) * 5;
        adjustedFactors.push('too_close');
      }

      // Difficulty progression: start easier
      if (currentPosition < 2 && activity.difficulty === 'easy') {
        adjustedScore += 10;
        adjustedFactors.push('warm_up');
      } else if (currentPosition >= 2 && activity.difficulty !== 'easy') {
        adjustedScore += 5;
        adjustedFactors.push('post_warmup_challenge');
      }

      return { activity, score: adjustedScore, factors: adjustedFactors };
    });

    // Sort by adjusted score
    rescored.sort((a, b) => b.score - a.score);

    return rescored[0]?.activity ?? null;
  }

  /**
   * Get optimal spacing based on learner profile
   */
  private getOptimalSpacing(learnerProfile: LearnerProfile | null): number {
    let baseSpacing = 3; // Default: 3 activities between same skill

    if (learnerProfile?.neurodiversityProfile?.processingSpeed === 'slow') {
      baseSpacing = 2; // More frequent review
    }

    if (learnerProfile?.accommodations.includes('frequent_review')) {
      baseSpacing = 2;
    }

    return baseSpacing;
  }

  /**
   * Optimize the final sequence
   */
  private optimizeSequence(
    sequence: SequencedActivity[],
    learnerState: LearnerModelState,
    learnerProfile: LearnerProfile | null
  ): SequencedActivity[] {
    if (sequence.length <= 2) return sequence;

    // 1. Ensure we don't end on a hard activity (leave on success)
    const lastIdx = sequence.length - 1;
    const lastActivity = sequence[lastIdx];
    if (lastActivity?.difficulty === 'hard') {
      // Find an easier activity to swap with
      for (let i = lastIdx - 1; i >= Math.max(0, lastIdx - 3); i--) {
        const candidate = sequence[i];
        if (candidate !== undefined && candidate.difficulty !== 'hard') {
          // Swap
          const temp = lastActivity;
          sequence[i] = temp;
          sequence[lastIdx] = candidate;
          // Update positions
          temp.sequencePosition = i;
          candidate.sequencePosition = lastIdx;
          break;
        }
      }
    }

    // 2. Re-number positions
    sequence.forEach((activity, idx) => {
      activity.sequencePosition = idx;
    });

    return sequence;
  }

  /**
   * Calculate recommended break points
   */
  private calculateBreakpoints(
    activities: SequencedActivity[],
    learnerProfile: LearnerProfile | null
  ): number[] {
    const breakpoints: number[] = [];
    let accumulatedTime = 0;
    let accumulatedCognitiveLoad = 0;

    // Determine break interval based on profile
    let breakInterval = 25; // Default: 25 minutes (Pomodoro-style)

    if (learnerProfile?.neurodiversityProfile?.adhd) {
      breakInterval = 15; // More frequent breaks for ADHD
    }

    if (learnerProfile?.accommodations.includes('frequent_breaks')) {
      breakInterval = Math.min(breakInterval, 15);
    }

    // Cognitive load weights by difficulty
    const cognitiveLoadWeight: Record<string, number> = {
      easy: 0.5,
      medium: 1,
      hard: 1.5,
    };

    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      if (!activity) continue;

      const duration = activity.estimatedMinutes ?? 10;
      const load = cognitiveLoadWeight[activity.difficulty] ?? 1;

      accumulatedTime += duration;
      accumulatedCognitiveLoad += duration * load;

      // Recommend break based on time or cognitive load
      if (accumulatedTime >= breakInterval || accumulatedCognitiveLoad >= breakInterval * 1.2) {
        breakpoints.push(i + 1); // After this activity
        accumulatedTime = 0;
        accumulatedCognitiveLoad = 0;
      }

      // Also break after particularly challenging activities
      if (activity.difficulty === 'hard' && i < activities.length - 1) {
        if (!breakpoints.includes(i + 1)) {
          breakpoints.push(i + 1);
          accumulatedTime = 0;
          accumulatedCognitiveLoad = 0;
        }
      }
    }

    return breakpoints.sort((a, b) => a - b);
  }

  /**
   * Generate learning objectives for the session
   */
  private generateObjectives(
    activities: SequencedActivity[],
    learnerState: LearnerModelState
  ): string[] {
    const objectives: string[] = [];
    const skillsAddressed = new Set<string>();

    for (const activity of activities) {
      for (const skillId of activity.skillIds) {
        if (skillsAddressed.has(skillId)) continue;
        skillsAddressed.add(skillId);

        const skill = learnerState.skills.get(skillId);
        if (!skill) continue;

        const mastery = skill.knowledgeState.pMastery;

        if (mastery < 0.4) {
          objectives.push(`Develop foundational understanding of ${skill.skillName}`);
        } else if (mastery < 0.7) {
          objectives.push(`Strengthen ${skill.skillName} skills through practice`);
        } else if (mastery < 0.95) {
          objectives.push(`Achieve mastery of ${skill.skillName}`);
        } else {
          objectives.push(`Maintain and extend ${skill.skillName} proficiency`);
        }
      }

      if (objectives.length >= 3) break; // Limit to top 3 objectives
    }

    return objectives;
  }

  /**
   * Aggregate all adaptations needed for the session
   */
  private aggregateAdaptations(activities: SequencedActivity[]): string[] {
    const adaptationsSet = new Set<string>();

    for (const activity of activities) {
      for (const adaptation of activity.adaptations) {
        adaptationsSet.add(adaptation);
      }
    }

    return Array.from(adaptationsSet);
  }

  /**
   * Get reason why this activity was selected
   */
  private getActivityReason(activity: ActivityRecord, state: LearnerModelState): string {
    const skillId = activity.skillIds[0];
    if (!skillId) return 'General practice';

    const skill = state.skills.get(skillId);
    if (!skill) return 'Introduces new skill';

    const mastery = skill.knowledgeState.pMastery;

    if (mastery < 0.3) return 'Foundational skill building';
    if (mastery < 0.5) return 'Developing understanding';
    if (mastery < 0.7) return 'Strengthening through practice';
    if (mastery < 0.95) return 'Working toward mastery';
    if (skill.knowledgeState.trend === 'declining') return 'Review to maintain skills';
    return 'Challenge to extend learning';
  }

  /**
   * Get adaptations for a specific activity
   */
  private getActivityAdaptations(
    activity: ActivityRecord,
    learnerProfile: LearnerProfile | null
  ): string[] {
    const adaptations: string[] = [];

    if (!learnerProfile) return adaptations;

    if (learnerProfile.accommodations.includes('extended_time')) {
      adaptations.push('extended_time');
    }

    if (learnerProfile.accommodations.includes('text_to_speech')) {
      adaptations.push('audio_support');
    }

    if (learnerProfile.neurodiversityProfile?.dyslexia) {
      adaptations.push('dyslexia_font', 'increased_spacing');
    }

    if (learnerProfile.neurodiversityProfile?.adhd) {
      adaptations.push('reduced_distractions');
      if (activity.estimatedMinutes > 15) {
        adaptations.push('chunked_content');
      }
    }

    if (learnerProfile.neurodiversityProfile?.autism) {
      adaptations.push('clear_instructions', 'predictable_format');
    }

    return adaptations;
  }

  /**
   * Estimate activity duration with accommodations
   */
  private estimateDuration(
    activity: ActivityRecord,
    learnerProfile: LearnerProfile | null
  ): number {
    let duration = activity.estimatedMinutes;

    if (learnerProfile?.accommodations.includes('extended_time')) {
      duration *= 1.5;
    }

    if (learnerProfile?.neurodiversityProfile?.processingSpeed === 'slow') {
      duration *= 1.3;
    }

    return Math.round(duration);
  }

  /**
   * Estimate mastery after completing an activity
   */
  private estimateMasteryAfterActivity(currentMastery: number, activity: ActivityRecord): number {
    const difficultyBonus: Record<string, number> = {
      easy: 0.03,
      medium: 0.05,
      hard: 0.08,
    };

    const bonus = difficultyBonus[activity.difficulty] ?? 0.05;
    const newMastery = currentMastery + (1 - currentMastery) * bonus;

    return Math.min(0.99, newMastery);
  }
}

export * from './activity-sequencer-types.js';
