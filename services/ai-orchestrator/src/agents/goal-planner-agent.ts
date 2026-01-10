/**
 * Goal Planning Agent v2
 *
 * AI-powered goal planning agent ported from legacy-agentic-app.
 * Provides intelligent goal recommendations, planning assistance,
 * and progress monitoring for learners.
 *
 * Key capabilities:
 * - Smart goal decomposition from high-level objectives
 * - Personalized milestone suggestions based on learner profile
 * - Progress prediction using learning velocity
 * - Adaptive goal adjustment based on performance
 * - IEP/504 alignment support
 *
 * @module ai-orchestrator/agents/goal-planner-agent
 */

import { BaseAgent, AgentContext, AgentResponse, AgentConfig } from './base-agent.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface GoalPlannerConfig extends AgentConfig {
  maxGoalsPerPlan: number;
  maxMilestonesPerGoal: number;
  defaultPlanHorizonDays: number;
  enableIepAlignment: boolean;
  enableProgressPrediction: boolean;
}

export interface LearnerContext {
  learnerId: string;
  gradeLevel: number;
  age: number;
  skillLevels: SkillLevel[];
  learningVelocity: LearningVelocity;
  neurodiversityProfile?: NeurodiversityProfile;
  accommodations?: string[];
  iepGoals?: IepGoal[];
  existingGoals?: ExistingGoal[];
  preferences?: LearnerPreferences;
}

export interface SkillLevel {
  domain: string;
  skill: string;
  masteryLevel: number; // 0-10
  lastAssessedAt: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface LearningVelocity {
  overallPace: 'slow' | 'moderate' | 'fast';
  skillsPerWeek: number;
  averageTimeToMastery: number; // days
  consistencyScore: number; // 0-100
}

export interface NeurodiversityProfile {
  adhd?: boolean;
  dyslexia?: boolean;
  autism?: boolean;
  dysgraphia?: boolean;
  dyscalculia?: boolean;
  processingSpeed?: 'slow' | 'average' | 'fast';
  workingMemory?: 'limited' | 'average' | 'strong';
}

export interface IepGoal {
  id: string;
  domain: string;
  objective: string;
  targetDate: Date;
  currentProgress: number;
  benchmarks: string[];
}

export interface ExistingGoal {
  id: string;
  title: string;
  domain: string;
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'PAUSED';
  progress: number;
  targetDate: Date;
}

export interface LearnerPreferences {
  preferredDomains: string[];
  challengeLevel: 'easy' | 'moderate' | 'challenging';
  motivators: string[];
  avoidTopics?: string[];
}

// Goal Planning Types
export interface GoalPlanRequest {
  learnerId: string;
  planType: 'initial' | 'progress_review' | 'adjustment' | 'iep_alignment';
  focusAreas?: string[];
  timeHorizonDays?: number;
  constraints?: PlanConstraints;
}

export interface PlanConstraints {
  maxDailyMinutes?: number;
  excludeDays?: number[]; // 0 = Sunday
  prioritySkills?: string[];
  mustIncludeIepGoals?: boolean;
}

export interface GoalPlan {
  id: string;
  learnerId: string;
  createdAt: Date;
  planHorizonDays: number;
  goals: PlannedGoal[];
  weeklySchedule: WeeklySchedule;
  expectedOutcomes: ExpectedOutcome[];
  adaptationTriggers: AdaptationTrigger[];
  rationale: string;
}

export interface PlannedGoal {
  id: string;
  title: string;
  description: string;
  domain: string;
  targetSkills: string[];
  priority: 'high' | 'medium' | 'low';
  difficulty: number; // 1-5
  estimatedDays: number;
  milestones: Milestone[];
  successCriteria: string[];
  iepAligned: boolean;
  iepGoalId?: string;
  rationale: string;
  accommodations?: string[];
}

export interface Milestone {
  id: string;
  title: string;
  targetDay: number; // days from plan start
  criteria: string;
  assessmentType: 'quiz' | 'practice' | 'observation' | 'portfolio';
  passThreshold: number; // percentage
}

export interface WeeklySchedule {
  weekNumber: number;
  focus: string;
  goals: string[]; // goal IDs
  estimatedMinutes: number;
  activities: ScheduledActivity[];
}

export interface ScheduledActivity {
  day: number; // 0-6
  goalId: string;
  activityType: string;
  durationMinutes: number;
  description: string;
}

export interface ExpectedOutcome {
  skillId: string;
  currentLevel: number;
  expectedLevel: number;
  confidence: number; // 0-100
  conditions: string;
}

export interface AdaptationTrigger {
  condition: string;
  threshold: number;
  action: 'adjust_pace' | 'add_support' | 'skip_milestone' | 'extend_deadline' | 'notify_teacher';
  description: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// GOAL PLANNING PROMPTS
// ════════════════════════════════════════════════════════════════════════════════

const GOAL_PLANNING_SYSTEM_PROMPT = `You are an expert educational goal planner specialized in creating personalized, achievable learning goals for K-12 students.

Your role is to:
1. Analyze the learner's current skill levels and learning velocity
2. Create SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound)
3. Break down goals into manageable milestones
4. Consider neurodiversity needs and accommodations
5. Align with IEP/504 objectives when applicable
6. Predict realistic timelines based on learning patterns

Key principles:
- Goals should stretch but not overwhelm
- Account for cognitive load, especially for neurodiverse learners
- Build on existing strengths to address weaknesses
- Include both academic and executive function support
- Provide clear success criteria for each milestone
- Plan for setbacks and include adaptation triggers

Always respond with structured JSON matching the GoalPlan schema.`;

const GOAL_DECOMPOSITION_PROMPT = `Given the following high-level objective, decompose it into achievable sub-goals with milestones:

Objective: {{objective}}
Learner Profile:
- Grade Level: {{gradeLevel}}
- Current Skill Levels: {{skillLevels}}
- Learning Velocity: {{velocity}}
- Neurodiversity Profile: {{neurodiversity}}
- Accommodations: {{accommodations}}

Create a structured plan with:
1. 2-4 sub-goals that build toward the objective
2. 2-3 milestones per sub-goal
3. Realistic timelines based on learning velocity
4. Specific accommodations for each goal if needed
5. Clear success criteria`;

const PROGRESS_ADJUSTMENT_PROMPT = `Based on the learner's progress data, recommend adjustments to their current goal plan:

Current Goals: {{currentGoals}}
Recent Progress: {{recentProgress}}
Challenges Encountered: {{challenges}}
Time Remaining: {{timeRemaining}}

Analyze and recommend:
1. Which goals are on track vs. need adjustment
2. Specific timeline or scope modifications
3. Additional support or scaffolding needed
4. Goals that should be paused or accelerated
5. New focus areas based on progress patterns`;

// ════════════════════════════════════════════════════════════════════════════════
// GOAL PLANNER AGENT
// ════════════════════════════════════════════════════════════════════════════════

export class GoalPlannerAgent extends BaseAgent {
  private readonly config: GoalPlannerConfig;

  constructor(config?: Partial<GoalPlannerConfig>) {
    super({
      agentId: 'goal-planner-v2',
      name: 'Goal Planning Agent',
      description: 'AI-powered goal planning and progress monitoring',
      version: '2.0.0',
      capabilities: [
        'goal_decomposition',
        'milestone_planning',
        'progress_prediction',
        'iep_alignment',
        'adaptive_adjustments',
      ],
      maxTokensPerRequest: 4000,
      temperatureDefault: 0.7,
    });

    this.config = {
      maxGoalsPerPlan: config?.maxGoalsPerPlan ?? 5,
      maxMilestonesPerGoal: config?.maxMilestonesPerGoal ?? 4,
      defaultPlanHorizonDays: config?.defaultPlanHorizonDays ?? 30,
      enableIepAlignment: config?.enableIepAlignment ?? true,
      enableProgressPrediction: config?.enableProgressPrediction ?? true,
      ...config,
    };
  }

  /**
   * Create a comprehensive goal plan for a learner
   */
  async createGoalPlan(
    context: AgentContext,
    learnerContext: LearnerContext,
    request: GoalPlanRequest
  ): Promise<AgentResponse<GoalPlan>> {
    const startTime = Date.now();

    try {
      // Validate consent for AI goal planning
      await this.validateConsent(context, ['AI_PERSONALIZATION', 'DATA_PROCESSING']);

      // Build the prompt with learner context
      const prompt = this.buildGoalPlanPrompt(learnerContext, request);

      // Generate plan using LLM
      const llmResponse = await this.generateResponse(context, {
        systemPrompt: GOAL_PLANNING_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.7,
        maxTokens: this.config.maxTokensPerRequest,
        responseFormat: 'json',
      });

      // Parse and validate the response
      const plan = this.parseGoalPlanResponse(llmResponse, learnerContext, request);

      // Apply neurodiversity adaptations
      this.applyNeurodiversityAdaptations(plan, learnerContext);

      // Validate IEP alignment if enabled
      if (this.config.enableIepAlignment && learnerContext.iepGoals) {
        this.validateIepAlignment(plan, learnerContext.iepGoals);
      }

      // Add progress prediction if enabled
      if (this.config.enableProgressPrediction) {
        plan.expectedOutcomes = this.predictOutcomes(plan, learnerContext);
      }

      // Add adaptation triggers
      plan.adaptationTriggers = this.generateAdaptationTriggers(plan, learnerContext);

      // Log for audit
      await this.logAgentAction(context, {
        action: 'goal_plan_created',
        learnerId: request.learnerId,
        planId: plan.id,
        goalsCount: plan.goals.length,
        durationMs: Date.now() - startTime,
      });

      return {
        success: true,
        data: plan,
        metadata: {
          tokensUsed: llmResponse.tokensUsed,
          processingTimeMs: Date.now() - startTime,
          modelVersion: llmResponse.modelVersion,
        },
      };

    } catch (error) {
      await this.logAgentError(context, error as Error, {
        action: 'goal_plan_creation_failed',
        learnerId: request.learnerId,
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create goal plan',
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Decompose a high-level objective into actionable goals
   */
  async decomposeObjective(
    context: AgentContext,
    learnerContext: LearnerContext,
    objective: string
  ): Promise<AgentResponse<PlannedGoal[]>> {
    const startTime = Date.now();

    try {
      const prompt = GOAL_DECOMPOSITION_PROMPT
        .replace('{{objective}}', objective)
        .replace('{{gradeLevel}}', learnerContext.gradeLevel.toString())
        .replace('{{skillLevels}}', JSON.stringify(learnerContext.skillLevels))
        .replace('{{velocity}}', JSON.stringify(learnerContext.learningVelocity))
        .replace('{{neurodiversity}}', JSON.stringify(learnerContext.neurodiversityProfile ?? {}))
        .replace('{{accommodations}}', JSON.stringify(learnerContext.accommodations ?? []));

      const llmResponse = await this.generateResponse(context, {
        systemPrompt: GOAL_PLANNING_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.7,
        maxTokens: 2000,
        responseFormat: 'json',
      });

      const goals = this.parseGoalsFromResponse(llmResponse);

      return {
        success: true,
        data: goals,
        metadata: {
          tokensUsed: llmResponse.tokensUsed,
          processingTimeMs: Date.now() - startTime,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to decompose objective',
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Recommend adjustments based on progress
   */
  async recommendAdjustments(
    context: AgentContext,
    learnerContext: LearnerContext,
    progressData: {
      currentGoals: ExistingGoal[];
      recentProgress: Array<{ goalId: string; progress: number; date: Date }>;
      challenges: string[];
      daysRemaining: number;
    }
  ): Promise<AgentResponse<GoalAdjustment[]>> {
    const startTime = Date.now();

    try {
      const prompt = PROGRESS_ADJUSTMENT_PROMPT
        .replace('{{currentGoals}}', JSON.stringify(progressData.currentGoals))
        .replace('{{recentProgress}}', JSON.stringify(progressData.recentProgress))
        .replace('{{challenges}}', JSON.stringify(progressData.challenges))
        .replace('{{timeRemaining}}', `${progressData.daysRemaining} days`);

      const llmResponse = await this.generateResponse(context, {
        systemPrompt: GOAL_PLANNING_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.6,
        maxTokens: 1500,
        responseFormat: 'json',
      });

      const adjustments = this.parseAdjustmentsFromResponse(llmResponse);

      return {
        success: true,
        data: adjustments,
        metadata: {
          tokensUsed: llmResponse.tokensUsed,
          processingTimeMs: Date.now() - startTime,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate adjustments',
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  /**
   * Generate smart milestone suggestions
   */
  async suggestMilestones(
    context: AgentContext,
    goal: PlannedGoal,
    learnerContext: LearnerContext
  ): Promise<AgentResponse<Milestone[]>> {
    const startTime = Date.now();

    try {
      const prompt = `Generate ${this.config.maxMilestonesPerGoal} milestones for this goal:

Goal: ${goal.title}
Description: ${goal.description}
Target Skills: ${goal.targetSkills.join(', ')}
Estimated Duration: ${goal.estimatedDays} days
Learner's Pace: ${learnerContext.learningVelocity.overallPace}
Grade Level: ${learnerContext.gradeLevel}

Create milestones with:
1. Clear, measurable criteria
2. Appropriate spacing based on learning velocity
3. Varied assessment types
4. Achievable pass thresholds
5. Progressive difficulty`;

      const llmResponse = await this.generateResponse(context, {
        systemPrompt: GOAL_PLANNING_SYSTEM_PROMPT,
        userPrompt: prompt,
        temperature: 0.6,
        maxTokens: 1000,
        responseFormat: 'json',
      });

      const milestones = this.parseMilestonesFromResponse(llmResponse);

      return {
        success: true,
        data: milestones,
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate milestones',
        metadata: {
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  private buildGoalPlanPrompt(
    learnerContext: LearnerContext,
    request: GoalPlanRequest
  ): string {
    const focusAreas = request.focusAreas?.length
      ? `Focus areas: ${request.focusAreas.join(', ')}`
      : 'Recommend focus areas based on skill levels';

    const constraints = request.constraints
      ? `Constraints: ${JSON.stringify(request.constraints)}`
      : 'No specific constraints';

    const iepSection = learnerContext.iepGoals?.length
      ? `IEP Goals to align with:\n${learnerContext.iepGoals.map(g => `- ${g.objective} (Target: ${g.targetDate.toLocaleDateString()})`).join('\n')}`
      : '';

    const existingGoalsSection = learnerContext.existingGoals?.length
      ? `Existing active goals:\n${learnerContext.existingGoals.filter(g => g.status === 'ACTIVE').map(g => `- ${g.title}: ${g.progress}% complete`).join('\n')}`
      : '';

    return `Create a ${request.timeHorizonDays ?? this.config.defaultPlanHorizonDays}-day goal plan for this learner:

LEARNER PROFILE:
- ID: ${learnerContext.learnerId}
- Grade Level: ${learnerContext.gradeLevel}
- Age: ${learnerContext.age}

CURRENT SKILL LEVELS:
${learnerContext.skillLevels.map(s => `- ${s.domain}/${s.skill}: ${s.masteryLevel}/10 (${s.trend})`).join('\n')}

LEARNING VELOCITY:
- Pace: ${learnerContext.learningVelocity.overallPace}
- Skills per week: ${learnerContext.learningVelocity.skillsPerWeek}
- Avg time to mastery: ${learnerContext.learningVelocity.averageTimeToMastery} days
- Consistency: ${learnerContext.learningVelocity.consistencyScore}%

NEURODIVERSITY PROFILE:
${JSON.stringify(learnerContext.neurodiversityProfile ?? {}, null, 2)}

ACCOMMODATIONS: ${learnerContext.accommodations?.join(', ') ?? 'None specified'}

${iepSection}

${existingGoalsSection}

PREFERENCES:
${JSON.stringify(learnerContext.preferences ?? {}, null, 2)}

REQUEST:
- Plan Type: ${request.planType}
- ${focusAreas}
- ${constraints}

Create a comprehensive goal plan with:
1. ${this.config.maxGoalsPerPlan} prioritized goals
2. Up to ${this.config.maxMilestonesPerGoal} milestones per goal
3. Weekly schedule with specific activities
4. Expected outcomes with confidence levels
5. Clear rationale for each recommendation`;
  }

  private parseGoalPlanResponse(
    llmResponse: LLMResponse,
    learnerContext: LearnerContext,
    request: GoalPlanRequest
  ): GoalPlan {
    const parsed = JSON.parse(llmResponse.content);

    return {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      learnerId: request.learnerId,
      createdAt: new Date(),
      planHorizonDays: request.timeHorizonDays ?? this.config.defaultPlanHorizonDays,
      goals: (parsed.goals || []).slice(0, this.config.maxGoalsPerPlan).map((g: unknown) =>
        this.normalizeGoal(g as Record<string, unknown>)
      ),
      weeklySchedule: parsed.weeklySchedule || this.generateDefaultSchedule(parsed.goals || []),
      expectedOutcomes: parsed.expectedOutcomes || [],
      adaptationTriggers: parsed.adaptationTriggers || [],
      rationale: parsed.rationale || 'AI-generated goal plan based on learner profile',
    };
  }

  private normalizeGoal(raw: Record<string, unknown>): PlannedGoal {
    return {
      id: (raw.id as string) ?? `goal_${Math.random().toString(36).substr(2, 9)}`,
      title: (raw.title as string) ?? 'Unnamed Goal',
      description: (raw.description as string) ?? '',
      domain: (raw.domain as string) ?? 'GENERAL',
      targetSkills: (raw.targetSkills as string[]) ?? [],
      priority: (raw.priority as 'high' | 'medium' | 'low') ?? 'medium',
      difficulty: (raw.difficulty as number) ?? 3,
      estimatedDays: (raw.estimatedDays as number) ?? 14,
      milestones: ((raw.milestones as unknown[]) ?? []).map((m: unknown) =>
        this.normalizeMilestone(m as Record<string, unknown>)
      ),
      successCriteria: (raw.successCriteria as string[]) ?? [],
      iepAligned: (raw.iepAligned as boolean) ?? false,
      iepGoalId: raw.iepGoalId as string | undefined,
      rationale: (raw.rationale as string) ?? '',
      accommodations: raw.accommodations as string[] | undefined,
    };
  }

  private normalizeMilestone(raw: Record<string, unknown>): Milestone {
    return {
      id: (raw.id as string) ?? `milestone_${Math.random().toString(36).substr(2, 9)}`,
      title: (raw.title as string) ?? 'Milestone',
      targetDay: (raw.targetDay as number) ?? 7,
      criteria: (raw.criteria as string) ?? '',
      assessmentType: (raw.assessmentType as 'quiz' | 'practice' | 'observation' | 'portfolio') ?? 'practice',
      passThreshold: (raw.passThreshold as number) ?? 70,
    };
  }

  private applyNeurodiversityAdaptations(
    plan: GoalPlan,
    learnerContext: LearnerContext
  ): void {
    const profile = learnerContext.neurodiversityProfile;
    if (!profile) return;

    for (const goal of plan.goals) {
      const adaptations: string[] = goal.accommodations ?? [];

      if (profile.adhd) {
        // Shorter milestones, more frequent check-ins
        goal.milestones = goal.milestones.map(m => ({
          ...m,
          targetDay: Math.round(m.targetDay * 0.75), // Closer milestones
        }));
        adaptations.push('Frequent breaks', 'Visual progress tracking', 'Immediate feedback');
      }

      if (profile.dyslexia) {
        adaptations.push('Audio content available', 'Extended reading time', 'Visual aids');
      }

      if (profile.autism) {
        adaptations.push('Clear structure', 'Predictable routines', 'Concrete examples');
        // Ensure goals have very clear success criteria
        if (goal.successCriteria.length < 3) {
          goal.successCriteria.push('Task completion verified with explicit checklist');
        }
      }

      if (profile.processingSpeed === 'slow') {
        // Extend timelines by 25%
        goal.estimatedDays = Math.round(goal.estimatedDays * 1.25);
        goal.milestones = goal.milestones.map(m => ({
          ...m,
          targetDay: Math.round(m.targetDay * 1.25),
        }));
        adaptations.push('Extended time', 'Reduced concurrent activities');
      }

      if (profile.workingMemory === 'limited') {
        adaptations.push('Chunked information', 'Visual reminders', 'Spaced practice');
      }

      goal.accommodations = [...new Set(adaptations)];
    }
  }

  private validateIepAlignment(plan: GoalPlan, iepGoals: IepGoal[]): void {
    for (const iepGoal of iepGoals) {
      const alignedGoal = plan.goals.find(g =>
        g.domain.toLowerCase() === iepGoal.domain.toLowerCase() ||
        g.targetSkills.some(s => iepGoal.objective.toLowerCase().includes(s.toLowerCase()))
      );

      if (alignedGoal) {
        alignedGoal.iepAligned = true;
        alignedGoal.iepGoalId = iepGoal.id;

        // Add IEP benchmarks as milestones if not already covered
        for (const benchmark of iepGoal.benchmarks) {
          const hasBenchmark = alignedGoal.milestones.some(m =>
            m.criteria.toLowerCase().includes(benchmark.toLowerCase())
          );

          if (!hasBenchmark) {
            alignedGoal.milestones.push({
              id: `iep_milestone_${Math.random().toString(36).substr(2, 9)}`,
              title: `IEP Benchmark: ${benchmark.substring(0, 50)}`,
              targetDay: Math.round(alignedGoal.estimatedDays * 0.5),
              criteria: benchmark,
              assessmentType: 'observation',
              passThreshold: 80,
            });
          }
        }
      }
    }
  }

  private predictOutcomes(
    plan: GoalPlan,
    learnerContext: LearnerContext
  ): ExpectedOutcome[] {
    const outcomes: ExpectedOutcome[] = [];

    for (const goal of plan.goals) {
      for (const skill of goal.targetSkills) {
        const currentSkill = learnerContext.skillLevels.find(
          s => s.skill.toLowerCase() === skill.toLowerCase()
        );

        const currentLevel = currentSkill?.masteryLevel ?? 0;
        const velocityFactor = this.getVelocityFactor(learnerContext.learningVelocity);
        const difficultyFactor = (6 - goal.difficulty) / 5; // Inverse difficulty

        // Predict improvement based on velocity and difficulty
        const expectedImprovement = 2 * velocityFactor * difficultyFactor;
        const expectedLevel = Math.min(10, currentLevel + expectedImprovement);

        // Confidence based on consistency and existing trend
        let confidence = learnerContext.learningVelocity.consistencyScore;
        if (currentSkill?.trend === 'improving') confidence += 10;
        if (currentSkill?.trend === 'declining') confidence -= 20;
        confidence = Math.max(30, Math.min(95, confidence));

        outcomes.push({
          skillId: skill,
          currentLevel,
          expectedLevel: Math.round(expectedLevel * 10) / 10,
          confidence,
          conditions: `With consistent ${goal.estimatedDays}-day practice`,
        });
      }
    }

    return outcomes;
  }

  private generateAdaptationTriggers(
    plan: GoalPlan,
    learnerContext: LearnerContext
  ): AdaptationTrigger[] {
    const triggers: AdaptationTrigger[] = [
      {
        condition: 'milestone_failure_rate',
        threshold: 50,
        action: 'adjust_pace',
        description: 'If more than 50% of milestones are missed, slow down the pace',
      },
      {
        condition: 'focus_score_drop',
        threshold: 40,
        action: 'add_support',
        description: 'If average focus score drops below 40%, add additional supports',
      },
      {
        condition: 'error_rate',
        threshold: 60,
        action: 'notify_teacher',
        description: 'If error rate exceeds 60%, notify teacher for intervention',
      },
    ];

    if (learnerContext.neurodiversityProfile?.adhd) {
      triggers.push({
        condition: 'session_duration',
        threshold: 20,
        action: 'add_support',
        description: 'If sessions exceed 20 minutes without break, suggest break',
      });
    }

    if (learnerContext.iepGoals?.length) {
      triggers.push({
        condition: 'iep_progress_behind',
        threshold: 20,
        action: 'notify_teacher',
        description: 'If IEP goal progress falls 20% behind schedule, notify teacher',
      });
    }

    return triggers;
  }

  private getVelocityFactor(velocity: LearningVelocity): number {
    switch (velocity.overallPace) {
      case 'fast': return 1.25;
      case 'moderate': return 1.0;
      case 'slow': return 0.75;
      default: return 1.0;
    }
  }

  private generateDefaultSchedule(goals: PlannedGoal[]): WeeklySchedule {
    return {
      weekNumber: 1,
      focus: goals[0]?.domain ?? 'General',
      goals: goals.slice(0, 2).map(g => g.id),
      estimatedMinutes: 150,
      activities: goals.slice(0, 2).map((g, i) => ({
        day: i + 1,
        goalId: g.id,
        activityType: 'practice',
        durationMinutes: 30,
        description: `Work on ${g.title}`,
      })),
    };
  }

  private parseGoalsFromResponse(llmResponse: LLMResponse): PlannedGoal[] {
    const parsed = JSON.parse(llmResponse.content);
    return (parsed.goals || parsed || []).map((g: unknown) =>
      this.normalizeGoal(g as Record<string, unknown>)
    );
  }

  private parseAdjustmentsFromResponse(llmResponse: LLMResponse): GoalAdjustment[] {
    const parsed = JSON.parse(llmResponse.content);
    return parsed.adjustments || [];
  }

  private parseMilestonesFromResponse(llmResponse: LLMResponse): Milestone[] {
    const parsed = JSON.parse(llmResponse.content);
    return (parsed.milestones || parsed || []).map((m: unknown) =>
      this.normalizeMilestone(m as Record<string, unknown>)
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface LLMResponse {
  content: string;
  tokensUsed: number;
  modelVersion: string;
}

export interface GoalAdjustment {
  goalId: string;
  adjustmentType: 'extend_deadline' | 'reduce_scope' | 'add_support' | 'pause' | 'accelerate';
  reason: string;
  newEstimatedDays?: number;
  additionalSupport?: string[];
  modifiedMilestones?: Milestone[];
}

export default GoalPlannerAgent;
