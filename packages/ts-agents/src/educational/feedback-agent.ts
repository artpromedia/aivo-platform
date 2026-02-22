/**
 * FeedbackAgent - Specialized agent for constructive feedback and progress tracking
 */

import { Agent, type AgentDependencies } from '../core/agent';
import { AgentBuilder } from '../core/agent-builder';
import type { AgentConfig, AgentContext, AgentOutput, AgentInput } from '../core/types';

export interface FeedbackConfig extends AgentConfig {
  feedbackStyle: 'encouraging' | 'balanced' | 'critical' | 'adaptive';
  focusAreas?: string[];
  includeMetrics?: boolean;
  goalTracking?: boolean;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  targetDate?: Date;
  progress: number; // 0-100
  milestones: Milestone[];
  status: 'not-started' | 'in-progress' | 'completed' | 'at-risk';
  createdAt: Date;
  updatedAt: Date;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Date;
}

export interface ProgressEntry {
  date: Date;
  subject: string;
  activity: string;
  performance: number; // 0-100
  effort: number; // 0-100
  notes: string;
  strengths: string[];
  improvements: string[];
}

export interface FeedbackReport {
  period: { start: Date; end: Date };
  overallProgress: number;
  progressTrend: 'improving' | 'stable' | 'declining';
  goals: Goal[];
  topStrengths: string[];
  focusAreas: string[];
  achievements: string[];
  recommendations: string[];
  motivationalMessage: string;
}

const FEEDBACK_SYSTEM_PROMPT = `You are an expert educational feedback coach. Your role is to:

1. **Provide Constructive Feedback**: Balance praise with areas for improvement.
2. **Track Progress**: Monitor student progress toward their goals.
3. **Set Achievable Goals**: Help students set SMART goals.
4. **Celebrate Achievements**: Recognize effort and accomplishments.
5. **Identify Patterns**: Notice trends in student performance.
6. **Motivate**: Keep students engaged and motivated.
7. **Guide Improvement**: Provide specific, actionable suggestions.

Feedback Guidelines:
- Start with what the student did well (strengths)
- Be specific - avoid vague feedback like "good job"
- Frame improvements as opportunities, not failures
- Connect feedback to the student's goals
- Acknowledge effort, not just results
- Provide clear next steps
- End on an encouraging note

Remember: Effective feedback builds confidence while guiding improvement. It should be honest but kind, specific but not overwhelming.`;

export class FeedbackAgent extends Agent {
  private feedbackConfig: FeedbackConfig;
  private goals = new Map<string, Goal>();
  private progressHistory: ProgressEntry[] = [];

  constructor(config: FeedbackConfig, dependencies: AgentDependencies) {
    super(config, dependencies);
    this.feedbackConfig = config;
  }

  /**
   * Add a goal
   */
  addGoal(goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Goal {
    const newGoal: Goal = {
      ...goal,
      id: `goal-${Date.now()}`,
      status: goal.progress > 0 ? 'in-progress' : 'not-started',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.goals.set(newGoal.id, newGoal);
    return newGoal;
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progress: number): Goal | undefined {
    const goal = this.goals.get(goalId);
    if (!goal) return undefined;

    goal.progress = Math.max(0, Math.min(100, progress));
    goal.updatedAt = new Date();

    if (goal.progress >= 100) {
      goal.status = 'completed';
    } else if (goal.progress > 0) {
      goal.status = 'in-progress';
    }

    // Check if at risk (deadline approaching with low progress)
    if (goal.targetDate && goal.status !== 'completed') {
      const daysRemaining = (goal.targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      const expectedProgress = 100 - (daysRemaining / 30) * 100;
      if (goal.progress < expectedProgress - 20) {
        goal.status = 'at-risk';
      }
    }

    return goal;
  }

  /**
   * Complete a milestone
   */
  completeMilestone(goalId: string, milestoneId: string): boolean {
    const goal = this.goals.get(goalId);
    if (!goal) return false;

    const milestone = goal.milestones.find((m) => m.id === milestoneId);
    if (!milestone) return false;

    milestone.completed = true;
    milestone.completedAt = new Date();

    // Update goal progress based on milestones
    const completedMilestones = goal.milestones.filter((m) => m.completed).length;
    goal.progress = (completedMilestones / goal.milestones.length) * 100;
    goal.updatedAt = new Date();

    return true;
  }

  /**
   * Get all goals
   */
  getGoals(): Goal[] {
    return Array.from(this.goals.values());
  }

  /**
   * Get a specific goal
   */
  getGoal(goalId: string): Goal | undefined {
    return this.goals.get(goalId);
  }

  /**
   * Record a progress entry
   */
  recordProgress(entry: Omit<ProgressEntry, 'date'>): void {
    this.progressHistory.push({
      ...entry,
      date: new Date(),
    });
  }

  /**
   * Get progress history
   */
  getProgressHistory(options?: {
    subject?: string;
    startDate?: Date;
    endDate?: Date;
  }): ProgressEntry[] {
    let entries = [...this.progressHistory];

    if (options?.subject) {
      entries = entries.filter((e) => e.subject === options.subject);
    }

    if (options?.startDate) {
      entries = entries.filter((e) => e.date >= options.startDate!);
    }

    if (options?.endDate) {
      entries = entries.filter((e) => e.date <= options.endDate!);
    }

    return entries;
  }

  /**
   * Generate a feedback report
   */
  generateReport(startDate: Date, endDate: Date): FeedbackReport {
    const entries = this.getProgressHistory({ startDate, endDate });

    // Calculate overall progress
    const overallProgress =
      entries.length > 0 ? entries.reduce((sum, e) => sum + e.performance, 0) / entries.length : 0;

    // Determine trend
    let progressTrend: FeedbackReport['progressTrend'] = 'stable';
    if (entries.length >= 3) {
      const recentAvg = entries.slice(-3).reduce((sum, e) => sum + e.performance, 0) / 3;
      const earlierAvg = entries.slice(0, 3).reduce((sum, e) => sum + e.performance, 0) / 3;
      if (recentAvg > earlierAvg + 5) progressTrend = 'improving';
      else if (recentAvg < earlierAvg - 5) progressTrend = 'declining';
    }

    // Aggregate strengths and improvements
    const strengthCounts = new Map<string, number>();
    const improvementCounts = new Map<string, number>();

    for (const entry of entries) {
      for (const strength of entry.strengths) {
        strengthCounts.set(strength, (strengthCounts.get(strength) || 0) + 1);
      }
      for (const improvement of entry.improvements) {
        improvementCounts.set(improvement, (improvementCounts.get(improvement) || 0) + 1);
      }
    }

    const topStrengths = [...strengthCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strength]) => strength);

    const focusAreas = [...improvementCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([area]) => area);

    // Get completed goals as achievements
    const achievements = this.getGoals()
      .filter((g) => g.status === 'completed' && g.updatedAt >= startDate)
      .map((g) => `Completed goal: ${g.title}`);

    // Generate recommendations
    const recommendations = this.generateRecommendations(focusAreas, progressTrend);

    // Generate motivational message
    const motivationalMessage = this.generateMotivationalMessage(
      overallProgress,
      progressTrend,
      achievements.length
    );

    return {
      period: { start: startDate, end: endDate },
      overallProgress,
      progressTrend,
      goals: this.getGoals(),
      topStrengths,
      focusAreas,
      achievements,
      recommendations,
      motivationalMessage,
    };
  }

  /**
   * Override run to inject feedback context
   */
  override async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const enrichedContext: AgentContext = {
      ...context,
      metadata: {
        ...context.metadata,
        feedbackConfig: {
          style: this.feedbackConfig.feedbackStyle,
          focusAreas: this.feedbackConfig.focusAreas,
        },
        goalsCount: this.goals.size,
        progressEntriesCount: this.progressHistory.length,
      },
    };

    return super.run(input, enrichedContext);
  }

  private generateRecommendations(
    focusAreas: string[],
    trend: FeedbackReport['progressTrend']
  ): string[] {
    const recommendations: string[] = [];

    for (const area of focusAreas) {
      recommendations.push(`Focus on improving: ${area}`);
    }

    if (trend === 'declining') {
      recommendations.push('Consider reviewing study habits and time management');
      recommendations.push('Break down challenging topics into smaller, manageable parts');
    } else if (trend === 'stable') {
      recommendations.push('Challenge yourself with more advanced material');
      recommendations.push('Try teaching concepts to others to deepen understanding');
    }

    return recommendations;
  }

  private generateMotivationalMessage(
    progress: number,
    trend: FeedbackReport['progressTrend'],
    achievementCount: number
  ): string {
    if (progress >= 80 && trend === 'improving') {
      return 'Outstanding work! Your dedication is paying off. Keep pushing forward!';
    } else if (progress >= 70) {
      return "Great progress! You're building a strong foundation. Stay focused!";
    } else if (trend === 'improving') {
      return "You're on the right track! Your improvement shows real effort. Keep it up!";
    } else if (achievementCount > 0) {
      return `Congratulations on completing ${achievementCount} goal${achievementCount > 1 ? 's' : ''}! Every step forward counts.`;
    } else {
      return 'Remember, every expert was once a beginner. Keep learning and growing!';
    }
  }

  /**
   * Create a feedback agent with builder
   */
  static create(options: {
    name?: string;
    feedbackStyle?: FeedbackConfig['feedbackStyle'];
    tools?: FeedbackConfig['tools'];
  }): AgentBuilder {
    return new AgentBuilder()
      .withName(options.name || 'Feedback Coach')
      .withDescription('Educational feedback and progress tracking coach')
      .withSystemPrompt(FEEDBACK_SYSTEM_PROMPT)
      .withTools(options.tools || [])
      .withMaxIterations(15);
  }
}
