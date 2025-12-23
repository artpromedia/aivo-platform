/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Learner Model Implementation
 *
 * Unified learner model that integrates:
 * - Bayesian Knowledge Tracing (BKT) for mastery estimation
 * - Performance Factor Analysis (PFA) for ensemble predictions
 * - Learning curve analysis for trend detection
 * - Engagement detection for intervention
 *
 * This model tracks knowledge state per skill/concept, predicts probability
 * of correct response, estimates time to mastery, detects struggle/boredom,
 * and recommends optimal next activities.
 */

import { EngagementDetector, type BehavioralSignals } from './analytics/engagement-detector.js';
import { LearningCurveAnalyzer } from './analytics/learning-curve-analyzer.js';
import { BayesianKnowledgeTracer, type BKTParameters, type PracticeOutcome } from './bkt/index.js';
import type {
  LearnerProfile,
  SkillMastery,
  LearnerModelState,
  ActivityRecommendation,
  LearningInsights,
  UpdateOutcomeResult,
  ActivityRecord,
  SkillRecord,
  ZoneOfProximalDevelopment,
} from './learner-model-types.js';
import { PerformanceFactorAnalysis } from './pfa/index.js';

/**
 * Dependencies for the learner model
 */
export interface LearnerModelDependencies {
  /** Function to get skill info from database */
  getSkillInfo: (skillId: string) => Promise<SkillRecord | null>;

  /** Function to get learner profile */
  getLearnerProfile: (learnerId: string) => Promise<LearnerProfile | null>;

  /** Function to get activities for a skill */
  getActivitiesForSkill: (skillId: string) => Promise<ActivityRecord[]>;

  /** Function to get remediation activities */
  getRemediationActivities: (skillId: string) => Promise<ActivityRecord[]>;

  /** Function to get challenge activities */
  getChallengeActivities: (skillId: string) => Promise<ActivityRecord[]>;

  /** Function to load state from cache */
  loadFromCache: (learnerId: string) => Promise<LearnerModelState | null>;

  /** Function to save state to cache */
  saveToCache: (learnerId: string, state: LearnerModelState) => Promise<void>;

  /** Function to load state from database */
  loadFromDatabase: (learnerId: string) => Promise<LearnerModelState | null>;

  /** Function to save state to database */
  saveToDatabase: (learnerId: string, state: LearnerModelState) => Promise<void>;
}

/**
 * Learner Model - Core implementation
 */
export class LearnerModel {
  private bkt: BayesianKnowledgeTracer;
  private pfa: PerformanceFactorAnalysis;
  private learningCurve: LearningCurveAnalyzer;
  private engagementDetector: EngagementDetector;

  constructor(
    private readonly deps: LearnerModelDependencies,
    private readonly skillParams: Map<string, BKTParameters> = new Map()
  ) {
    this.bkt = new BayesianKnowledgeTracer(skillParams);
    this.pfa = new PerformanceFactorAnalysis();
    this.learningCurve = new LearningCurveAnalyzer();
    this.engagementDetector = new EngagementDetector();
  }

  /**
   * Load or initialize learner model state
   */
  async loadState(learnerId: string): Promise<LearnerModelState> {
    // Try cache first
    const cached = await this.deps.loadFromCache(learnerId);
    if (cached) return cached;

    // Try database
    const stored = await this.deps.loadFromDatabase(learnerId);
    if (stored) {
      await this.deps.saveToCache(learnerId, stored);
      return stored;
    }

    // Initialize new learner
    return this.initializeState(learnerId);
  }

  /**
   * Update learner model with new practice outcome
   */
  async updateWithOutcome(
    learnerId: string,
    outcome: PracticeOutcome,
    context?: {
      sessionId?: string | undefined;
      activityId?: string | undefined;
      timeOnTask?: number | undefined;
      hintsUsed?: number | undefined;
      emotionalState?: string | undefined;
    }
  ): Promise<UpdateOutcomeResult> {
    // Load current state
    const state = await this.loadState(learnerId);

    // Get or initialize skill mastery
    let skillMastery = state.skills.get(outcome.skillId);
    if (!skillMastery) {
      skillMastery = await this.initializeSkillMastery(outcome.skillId);
      state.skills.set(outcome.skillId, skillMastery);
    }

    // Update BKT knowledge state
    const params = this.skillParams.get(outcome.skillId);
    const updatedKnowledge = this.bkt.updateKnowledgeWithContext(
      skillMastery.knowledgeState,
      outcome,
      params
    );

    // Update skill mastery
    skillMastery.knowledgeState = updatedKnowledge;
    skillMastery.lastPracticed = outcome.timestamp;
    skillMastery.practiceHistory.push(outcome);

    // Keep only recent history (last 50 outcomes)
    if (skillMastery.practiceHistory.length > 50) {
      skillMastery.practiceHistory = skillMastery.practiceHistory.slice(-50);
    }

    // Analyze engagement
    let engagementAnalysis = undefined;
    if (context?.timeOnTask !== undefined || context?.hintsUsed !== undefined) {
      const behavioralSignals: BehavioralSignals = {
        responseTime: outcome.responseTime,
        timeOnTask: context.timeOnTask,
        hintsUsed: context.hintsUsed ?? outcome.hintsUsed,
        correct: outcome.correct,
        attemptNumber: outcome.attemptsOnProblem,
        recentOutcomes: this.getRecentOutcomes(state, 10),
      };

      engagementAnalysis = this.engagementDetector.analyze(behavioralSignals);
      state.engagementLevel = engagementAnalysis.level;
      state.frustrationLevel = engagementAnalysis.frustration;
    }

    // Analyze learning curve
    const learningCurveAnalysis = this.learningCurve.analyze(skillMastery.practiceHistory);

    // Update zone of proximal development
    state.estimatedZPD = await this.calculateZPD(state);

    // Calculate overall mastery
    state.overallMastery = this.calculateOverallMastery(state);

    // Calculate learning velocity
    state.learningVelocity = this.calculateLearningVelocity(state);

    // Identify strengths and challenges
    const { strengths, challenges } = this.identifyStrengthsAndChallenges(state);
    state.strengthAreas = strengths;
    state.challengeAreas = challenges;

    state.lastUpdated = new Date();

    // Generate insights
    const insights = this.generateInsights(state, outcome, learningCurveAnalysis);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(state, learnerId);

    // Persist state
    await this.deps.saveToDatabase(learnerId, state);
    await this.deps.saveToCache(learnerId, state);

    return {
      updatedState: state,
      insights,
      recommendations,
      engagementAnalysis,
      learningCurveAnalysis,
    };
  }

  /**
   * Generate activity recommendations based on current state
   */
  async generateRecommendations(
    state: LearnerModelState,
    learnerId: string
  ): Promise<ActivityRecommendation[]> {
    const recommendations: ActivityRecommendation[] = [];
    const learnerProfile = await this.deps.getLearnerProfile(learnerId);

    // 1. Prioritize skills in ZPD (Zone of Proximal Development)
    for (const skillId of state.estimatedZPD.justRight) {
      const skill = state.skills.get(skillId);
      if (!skill) continue;

      const activities = await this.deps.getActivitiesForSkill(skillId);

      for (const activity of activities) {
        let priority = 7; // Base priority for ZPD skills
        let reason = 'Optimal challenge level for learning';

        // Boost priority if skill is declining
        if (skill.knowledgeState.trend === 'declining') {
          priority += 2;
          reason = 'Needs review - performance declining';
        }

        // Adjust for engagement
        if (state.engagementLevel === 'low' || state.engagementLevel === 'disengaged') {
          if (activity.isInteractive) {
            priority += 1;
          }
        }

        // Check if prerequisites are met
        if (!skill.isPrerequisiteMet) {
          priority -= 3;
          reason = 'Prerequisite skills may need work first';
        }

        recommendations.push({
          activityId: activity.id,
          skillId,
          skillName: skill.skillName,
          priority: Math.max(1, Math.min(10, priority)),
          reason,
          estimatedDuration: this.estimateDuration(activity, learnerProfile),
          difficulty: this.mapDifficulty(skill.knowledgeState.pMastery),
          type: this.determineActivityType(skill, state),
          adaptations: this.getAdaptations(learnerProfile),
        });
      }
    }

    // 2. Add remediation for struggling skills
    for (const skillId of state.challengeAreas.slice(0, 3)) {
      const skill = state.skills.get(skillId);
      if (!skill) continue;

      const remediationActivities = await this.deps.getRemediationActivities(skillId);

      for (const activity of remediationActivities) {
        recommendations.push({
          activityId: activity.id,
          skillId,
          skillName: skill.skillName,
          priority: 8, // High priority for remediation
          reason: 'Foundational skill needs strengthening',
          estimatedDuration: this.estimateDuration(activity, learnerProfile),
          difficulty: 'easy',
          type: 'remediation',
          adaptations: this.getAdaptations(learnerProfile),
        });
      }
    }

    // 3. Add challenge activities for mastered skills (prevent boredom)
    if (state.engagementLevel === 'low' && state.strengthAreas.length > 0) {
      const challengeSkill = state.strengthAreas[0];
      if (challengeSkill) {
        const skill = state.skills.get(challengeSkill);

        if (skill) {
          const challengeActivities = await this.deps.getChallengeActivities(challengeSkill);

          for (const activity of challengeActivities.slice(0, 2)) {
            recommendations.push({
              activityId: activity.id,
              skillId: challengeSkill,
              skillName: skill.skillName,
              priority: 6,
              reason: 'Challenge activity to maintain engagement',
              estimatedDuration: this.estimateDuration(activity, learnerProfile),
              difficulty: 'hard',
              type: 'challenge',
              adaptations: this.getAdaptations(learnerProfile),
            });
          }
        }
      }
    }

    // Sort by priority (descending) and return top recommendations
    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 10);
  }

  /**
   * Predict probability of correct response for a skill
   */
  predictCorrect(state: LearnerModelState, skillId: string): number {
    const skill = state.skills.get(skillId);
    if (!skill) {
      // Unknown skill - return guess rate
      return 0.2;
    }

    const bktPrediction = this.bkt.predictCorrect(skill.knowledgeState);

    // Could also use PFA ensemble here for better predictions
    return bktPrediction;
  }

  /**
   * Check if a skill is mastered
   */
  isSkillMastered(state: LearnerModelState, skillId: string): boolean {
    const skill = state.skills.get(skillId);
    if (!skill) return false;

    return this.bkt.isMastered(skill.knowledgeState);
  }

  /**
   * Calculate Zone of Proximal Development
   */
  private async calculateZPD(state: LearnerModelState): Promise<ZoneOfProximalDevelopment> {
    const tooEasy: string[] = [];
    const justRight: string[] = [];
    const tooHard: string[] = [];

    const ZPD_LOWER = 0.4; // Below this is too easy
    const ZPD_UPPER = 0.85; // Above this is mastered

    for (const [skillId, mastery] of state.skills) {
      const pMastery = mastery.knowledgeState.pMastery;

      if (pMastery >= ZPD_UPPER) {
        tooEasy.push(skillId);
      } else if (pMastery >= ZPD_LOWER) {
        // Check if prerequisites are met
        if (mastery.isPrerequisiteMet) {
          justRight.push(skillId);
        } else {
          tooHard.push(skillId);
        }
      } else {
        // Check if this skill has unmastered prerequisites
        const hasUnmetPrereqs = await this.hasUnmetPrerequisites(skillId, state);
        if (hasUnmetPrereqs) {
          tooHard.push(skillId);
        } else {
          justRight.push(skillId); // Learnable now
        }
      }
    }

    return { tooEasy, justRight, tooHard };
  }

  /**
   * Calculate overall mastery across all skills
   */
  private calculateOverallMastery(state: LearnerModelState): number {
    if (state.skills.size === 0) return 0;

    let totalWeightedMastery = 0;
    let totalWeight = 0;

    for (const [_, mastery] of state.skills) {
      // Weight by confidence and recency
      const recencyWeight = this.calculateRecencyWeight(mastery.lastPracticed);
      const weight = mastery.knowledgeState.confidence * recencyWeight;

      totalWeightedMastery += mastery.knowledgeState.pMastery * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? totalWeightedMastery / totalWeight : 0;
  }

  /**
   * Calculate learning velocity (skills mastered per hour)
   */
  private calculateLearningVelocity(state: LearnerModelState): number {
    const masteredSkills: { skillId: string; masteredAt: Date }[] = [];

    for (const [skillId, mastery] of state.skills) {
      if (this.bkt.isMastered(mastery.knowledgeState)) {
        const masteredAt = this.estimateMasteryTime(mastery);
        if (masteredAt) {
          masteredSkills.push({ skillId, masteredAt });
        }
      }
    }

    if (masteredSkills.length < 2) return 0;

    // Sort by mastery time
    masteredSkills.sort((a, b) => a.masteredAt.getTime() - b.masteredAt.getTime());

    // Calculate velocity over recent window (last 7 days)
    const windowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMastered = masteredSkills.filter((s) => s.masteredAt >= windowStart);

    if (recentMastered.length === 0) return 0;

    // Estimate hours based on practice (simplified)
    const estimatedHours = 7; // ~1 hour per day
    return recentMastered.length / estimatedHours;
  }

  /**
   * Identify strength and challenge areas
   */
  private identifyStrengthsAndChallenges(state: LearnerModelState): {
    strengths: string[];
    challenges: string[];
  } {
    const skillsByMastery = Array.from(state.skills.entries())
      .map(([id, mastery]) => ({
        id,
        mastery: mastery.knowledgeState.pMastery,
        trend: mastery.knowledgeState.trend,
        domain: mastery.domain,
      }))
      .sort((a, b) => b.mastery - a.mastery);

    // Top 20% are strengths (if above 0.7 mastery)
    const strengthThreshold = 0.7;
    const strengths = skillsByMastery
      .filter((s) => s.mastery >= strengthThreshold)
      .slice(0, Math.ceil(skillsByMastery.length * 0.2))
      .map((s) => s.id);

    // Bottom 20% or declining skills are challenges
    const challengeThreshold = 0.4;
    const challenges = skillsByMastery
      .filter((s) => s.mastery < challengeThreshold || s.trend === 'declining')
      .slice(-Math.ceil(skillsByMastery.length * 0.2))
      .map((s) => s.id);

    return { strengths, challenges };
  }

  /**
   * Generate learning insights from current state
   */
  private generateInsights(
    state: LearnerModelState,
    recentOutcome: PracticeOutcome,
    curveAnalysis: { plateau: boolean }
  ): LearningInsights {
    const insights: LearningInsights = {
      summary: '',
      skillProgress: {},
      alerts: [],
      recommendations: [],
    };

    // Skill-specific insight
    const skill = state.skills.get(recentOutcome.skillId);
    if (skill) {
      insights.skillProgress[recentOutcome.skillId] = {
        currentMastery: skill.knowledgeState.pMastery,
        trend: skill.knowledgeState.trend,
        estimatedToMastery: skill.knowledgeState.estimatedAttemptsToMastery,
      };

      // Generate summary
      if (this.bkt.isMastered(skill.knowledgeState)) {
        insights.summary = `Great progress! "${skill.skillName}" is now mastered.`;
      } else if (skill.knowledgeState.trend === 'improving') {
        insights.summary = `Good work! Making steady progress on "${skill.skillName}".`;
      } else if (skill.knowledgeState.trend === 'declining') {
        insights.summary = `"${skill.skillName}" may need more review.`;
        insights.alerts.push({
          type: 'skill_decline',
          skillId: recentOutcome.skillId,
          message: 'Performance has been declining on this skill',
        });
      } else {
        insights.summary = `Continuing to practice "${skill.skillName}".`;
      }
    }

    // Engagement alerts
    if (state.frustrationLevel > 0.7) {
      insights.alerts.push({
        type: 'high_frustration',
        message: 'Student may be frustrated. Consider a break or easier content.',
      });
    }

    if (state.engagementLevel === 'disengaged') {
      insights.alerts.push({
        type: 'disengagement',
        message: 'Student appears disengaged. Try a different activity type.',
      });
    }

    // Learning curve insights
    if (curveAnalysis.plateau) {
      insights.alerts.push({
        type: 'learning_plateau',
        skillId: recentOutcome.skillId,
        message: 'Learning has plateaued. May need different approach.',
      });
    }

    return insights;
  }

  /**
   * Get recent outcomes across all skills
   */
  private getRecentOutcomes(state: LearnerModelState, count: number): PracticeOutcome[] {
    const allOutcomes: PracticeOutcome[] = [];

    for (const [_, mastery] of state.skills) {
      allOutcomes.push(...mastery.practiceHistory);
    }

    return allOutcomes
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  /**
   * Calculate recency weight for skill mastery
   */
  private calculateRecencyWeight(lastPracticed?: Date): number {
    if (!lastPracticed) return 0.1;

    const daysSince = (Date.now() - lastPracticed.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay: half-life of 7 days
    return Math.exp(-daysSince / 7);
  }

  /**
   * Estimate when a skill was mastered
   */
  private estimateMasteryTime(mastery: SkillMastery): Date | null {
    const MASTERY_THRESHOLD = 0.95;

    // Walk through history to find when mastery was first reached
    let currentP = 0;
    const params = this.skillParams.get(mastery.skillId) ?? {
      pInit: 0,
      pLearn: 0.1,
      pGuess: 0.2,
      pSlip: 0.1,
    };

    for (const outcome of mastery.practiceHistory) {
      // Simplified BKT update
      if (outcome.correct) {
        currentP = currentP + (1 - currentP) * params.pLearn * 1.5;
      } else {
        currentP = currentP * 0.9;
      }

      if (currentP >= MASTERY_THRESHOLD) {
        return outcome.timestamp;
      }
    }

    return null;
  }

  /**
   * Check if a skill has unmet prerequisites
   */
  private async hasUnmetPrerequisites(skillId: string, state: LearnerModelState): Promise<boolean> {
    const skill = state.skills.get(skillId);
    if (!skill || skill.prerequisites.length === 0) return false;

    for (const prereqId of skill.prerequisites) {
      const prereq = state.skills.get(prereqId);
      if (!prereq || !this.bkt.isMastered(prereq.knowledgeState)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Initialize state for a new learner
   */
  private initializeState(learnerId: string): LearnerModelState {
    return {
      learnerId,
      skills: new Map(),
      overallMastery: 0,
      learningVelocity: 0,
      engagementLevel: 'medium',
      frustrationLevel: 0,
      estimatedZPD: { tooEasy: [], justRight: [], tooHard: [] },
      strengthAreas: [],
      challengeAreas: [],
      lastUpdated: new Date(),
    };
  }

  /**
   * Initialize mastery for a new skill
   */
  private async initializeSkillMastery(skillId: string): Promise<SkillMastery> {
    const skillInfo = await this.deps.getSkillInfo(skillId);

    return {
      skillId,
      skillName: skillInfo?.name ?? skillId,
      domain: skillInfo?.domain ?? 'unknown',
      knowledgeState: this.bkt.initializeState(skillId),
      prerequisites: skillInfo?.prerequisites ?? [],
      isPrerequisiteMet: true, // Will be updated when ZPD is calculated
      recommendedActivities: [],
      practiceHistory: [],
    };
  }

  /**
   * Get adaptations based on learner profile
   */
  private getAdaptations(profile: LearnerProfile | null): string[] {
    if (!profile) return [];

    const adaptations: string[] = [];

    if (profile.accommodations.includes('extended_time')) {
      adaptations.push('extended_time');
    }
    if (profile.accommodations.includes('text_to_speech')) {
      adaptations.push('audio_support');
    }
    if (profile.neurodiversityProfile?.adhd) {
      adaptations.push('chunked_content', 'frequent_breaks');
    }
    if (profile.neurodiversityProfile?.dyslexia) {
      adaptations.push('dyslexia_font', 'reduced_text');
    }
    if (profile.neurodiversityProfile?.autism) {
      adaptations.push('clear_instructions', 'predictable_format');
    }

    return adaptations;
  }

  /**
   * Estimate activity duration with accommodations
   */
  private estimateDuration(activity: ActivityRecord, profile: LearnerProfile | null): number {
    let duration = activity.estimatedMinutes;

    if (profile?.accommodations.includes('extended_time')) {
      duration *= 1.5;
    }

    if (profile?.neurodiversityProfile?.processingSpeed === 'slow') {
      duration *= 1.3;
    }

    return Math.round(duration);
  }

  /**
   * Map mastery to difficulty level
   */
  private mapDifficulty(pMastery: number): 'easy' | 'medium' | 'hard' {
    if (pMastery >= 0.7) return 'easy';
    if (pMastery >= 0.4) return 'medium';
    return 'hard';
  }

  /**
   * Determine activity type based on skill state
   */
  private determineActivityType(
    skill: SkillMastery,
    state: LearnerModelState
  ): 'practice' | 'review' | 'challenge' | 'remediation' {
    const pMastery = skill.knowledgeState.pMastery;

    if (pMastery < 0.3) return 'remediation';
    if (pMastery >= 0.9) return 'challenge';
    if (skill.knowledgeState.trend === 'declining') return 'review';
    return 'practice';
  }
}

export * from './learner-model-types.js';
