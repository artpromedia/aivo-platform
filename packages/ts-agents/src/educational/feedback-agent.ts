/**
 * Feedback Agent - Specialized agent for providing constructive feedback
 */

import type {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
} from '../core/types.js';
import { Agent, type AgentOptions } from '../core/agent.js';

export type FeedbackTone = 'encouraging' | 'neutral' | 'direct' | 'challenging';
export type FeedbackFocus = 'process' | 'outcome' | 'effort' | 'growth';

export interface FeedbackAgentConfig extends Partial<AgentConfig> {
  /** Subject area for feedback */
  subject?: string;
  /** Default feedback tone */
  defaultTone?: FeedbackTone;
  /** Primary feedback focus */
  feedbackFocus?: FeedbackFocus;
  /** Include specific suggestions */
  includeSuggestions?: boolean;
  /** Include examples */
  includeExamples?: boolean;
  /** Track progress over time */
  trackProgress?: boolean;
  /** Celebrate milestones */
  celebrateMilestones?: boolean;
}

export interface FeedbackRequest {
  /** The work being evaluated */
  work: string;
  /** Type of work (essay, code, problem, project, etc.) */
  workType: string;
  /** Rubric or criteria */
  criteria?: string[];
  /** Previous feedback for context */
  previousFeedback?: string;
  /** Specific areas to focus on */
  focusAreas?: string[];
  /** Student's self-assessment */
  selfAssessment?: string;
}

export interface StructuredFeedback {
  /** Overall assessment */
  overall: {
    score?: number;
    maxScore?: number;
    summary: string;
  };
  /** Strengths identified */
  strengths: Array<{
    area: string;
    observation: string;
    example?: string;
  }>;
  /** Areas for improvement */
  improvements: Array<{
    area: string;
    observation: string;
    suggestion: string;
    example?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  /** Specific action items */
  actionItems: string[];
  /** Encouraging closing message */
  encouragement: string;
  /** Next steps or goals */
  nextSteps?: string[];
}

export interface ProgressMilestone {
  id: string;
  name: string;
  description: string;
  achieved: boolean;
  achievedAt?: Date;
  celebrationMessage?: string;
}

export interface LearningGoal {
  id: string;
  description: string;
  targetDate?: Date;
  progress: number;
  milestones: ProgressMilestone[];
  feedback: string[];
}

/**
 * Specialized agent for providing constructive feedback
 */
export class FeedbackAgent extends Agent {
  private readonly feedbackConfig: FeedbackAgentConfig;
  private readonly goals: Map<string, LearningGoal> = new Map();
  private readonly feedbackHistory: StructuredFeedback[] = [];
  private celebratedMilestones: Set<string> = new Set();

  constructor(
    config: AgentConfig,
    feedbackConfig: FeedbackAgentConfig,
    options?: AgentOptions
  ) {
    super(config, options);
    this.feedbackConfig = feedbackConfig;
  }

  /**
   * Generate structured feedback for student work
   */
  async generateFeedback(
    request: FeedbackRequest,
    context: AgentContext
  ): Promise<StructuredFeedback> {
    const input: AgentInput = {
      message: this.buildFeedbackPrompt(request),
      metadata: {
        workType: request.workType,
        criteria: request.criteria,
        focusAreas: request.focusAreas,
      },
    };

    const output = await this.run(input, context);

    // Parse and structure the feedback
    const structuredFeedback = this.parseToStructuredFeedback(output.message, request);

    // Track progress if enabled
    if (this.feedbackConfig.trackProgress) {
      this.feedbackHistory.push(structuredFeedback);
      await this.updateProgress(structuredFeedback);
    }

    // Check for milestones
    if (this.feedbackConfig.celebrateMilestones) {
      await this.checkMilestones(structuredFeedback);
    }

    return structuredFeedback;
  }

  /**
   * Set a learning goal
   */
  setGoal(goal: Omit<LearningGoal, 'progress' | 'feedback'>): void {
    this.goals.set(goal.id, {
      ...goal,
      progress: 0,
      feedback: [],
    });
  }

  /**
   * Get a learning goal
   */
  getGoal(goalId: string): LearningGoal | undefined {
    return this.goals.get(goalId);
  }

  /**
   * Get all learning goals
   */
  getAllGoals(): LearningGoal[] {
    return Array.from(this.goals.values());
  }

  /**
   * Update goal progress
   */
  updateGoalProgress(goalId: string, progress: number, feedback?: string): void {
    const goal = this.goals.get(goalId);
    if (!goal) return;

    goal.progress = Math.max(0, Math.min(1, progress));

    if (feedback) {
      goal.feedback.push(feedback);
    }

    // Check milestones
    for (const milestone of goal.milestones) {
      if (!milestone.achieved && this.isMilestoneAchieved(goal, milestone)) {
        milestone.achieved = true;
        milestone.achievedAt = new Date();
      }
    }
  }

  /**
   * Generate a progress summary
   */
  getProgressSummary(): {
    goals: LearningGoal[];
    overallProgress: number;
    milestonesAchieved: number;
    totalMilestones: number;
    recentFeedback: StructuredFeedback[];
    trendAnalysis: string;
  } {
    const goals = this.getAllGoals();
    const overallProgress =
      goals.length > 0
        ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
        : 0;

    let milestonesAchieved = 0;
    let totalMilestones = 0;

    for (const goal of goals) {
      for (const milestone of goal.milestones) {
        totalMilestones++;
        if (milestone.achieved) {
          milestonesAchieved++;
        }
      }
    }

    const recentFeedback = this.feedbackHistory.slice(-5);
    const trendAnalysis = this.analyzeTrend();

    return {
      goals,
      overallProgress,
      milestonesAchieved,
      totalMilestones,
      recentFeedback,
      trendAnalysis,
    };
  }

  /**
   * Get feedback history
   */
  getFeedbackHistory(limit?: number): StructuredFeedback[] {
    if (limit) {
      return this.feedbackHistory.slice(-limit);
    }
    return [...this.feedbackHistory];
  }

  /**
   * Generate an encouraging message
   */
  generateEncouragement(context?: string): string {
    const encouragements = [
      "You're making great progress! Keep up the excellent work.",
      "Every step forward is progress. You're doing amazing!",
      "Your effort shows, and it's paying off. Stay focused!",
      "Mistakes are stepping stones to mastery. Keep learning!",
      "You have the ability to achieve your goals. Believe in yourself!",
    ];

    const base = encouragements[Math.floor(Math.random() * encouragements.length)]!;

    if (context) {
      return `${base} ${context}`;
    }

    return base;
  }

  private buildFeedbackPrompt(request: FeedbackRequest): string {
    let prompt = `Please provide constructive feedback on the following ${request.workType}:\n\n`;
    prompt += `"""${request.work}"""\n\n`;

    if (request.criteria && request.criteria.length > 0) {
      prompt += `Evaluation criteria:\n`;
      for (const criterion of request.criteria) {
        prompt += `- ${criterion}\n`;
      }
      prompt += '\n';
    }

    if (request.focusAreas && request.focusAreas.length > 0) {
      prompt += `Please focus on: ${request.focusAreas.join(', ')}\n\n`;
    }

    if (request.selfAssessment) {
      prompt += `Student's self-assessment: ${request.selfAssessment}\n\n`;
    }

    if (request.previousFeedback) {
      prompt += `Previous feedback for context: ${request.previousFeedback}\n\n`;
    }

    prompt += `Please structure your feedback to include:
1. An overall assessment
2. Specific strengths (at least 2)
3. Areas for improvement with actionable suggestions
4. Next steps for the student`;

    return prompt;
  }

  private parseToStructuredFeedback(
    response: string,
    request: FeedbackRequest
  ): StructuredFeedback {
    // In a real implementation, this would use more sophisticated parsing
    // For now, create a structured response from the text

    const lines = response.split('\n').filter(l => l.trim());

    const feedback: StructuredFeedback = {
      overall: {
        summary: lines[0] ?? 'Feedback provided.',
      },
      strengths: [],
      improvements: [],
      actionItems: [],
      encouragement: this.generateEncouragement(),
    };

    // Simple parsing - in production, use NLP or structured output
    let section = '';

    for (const line of lines) {
      const lineLower = line.toLowerCase();

      if (lineLower.includes('strength') || lineLower.includes('good')) {
        section = 'strengths';
      } else if (
        lineLower.includes('improve') ||
        lineLower.includes('suggest') ||
        lineLower.includes('consider')
      ) {
        section = 'improvements';
      } else if (lineLower.includes('next step') || lineLower.includes('action')) {
        section = 'actions';
      }

      if (line.startsWith('-') || line.startsWith('•') || line.match(/^\d+\./)) {
        const content = line.replace(/^[-•\d.]+\s*/, '').trim();

        if (section === 'strengths') {
          feedback.strengths.push({
            area: 'General',
            observation: content,
          });
        } else if (section === 'improvements') {
          feedback.improvements.push({
            area: 'General',
            observation: content,
            suggestion: 'Consider reviewing and practicing this area.',
            priority: 'medium',
          });
        } else if (section === 'actions') {
          feedback.actionItems.push(content);
        }
      }
    }

    // Ensure minimum content
    if (feedback.strengths.length === 0) {
      feedback.strengths.push({
        area: 'Effort',
        observation: 'Submitted work for feedback, showing commitment to learning.',
      });
    }

    if (feedback.improvements.length === 0) {
      feedback.improvements.push({
        area: 'General',
        observation: 'Continue developing your skills.',
        suggestion: 'Practice regularly and seek feedback.',
        priority: 'medium',
      });
    }

    if (feedback.actionItems.length === 0) {
      feedback.actionItems.push('Review the feedback and identify one area to focus on.');
      feedback.actionItems.push('Practice the suggested improvements.');
    }

    return feedback;
  }

  private async updateProgress(feedback: StructuredFeedback): Promise<void> {
    // Update goals based on feedback
    for (const [_goalId, goal] of this.goals) {
      // Check if feedback relates to goal
      const relatedStrengths = feedback.strengths.filter(
        s => goal.description.toLowerCase().includes(s.area.toLowerCase())
      );

      if (relatedStrengths.length > 0) {
        // Increment progress
        goal.progress = Math.min(1, goal.progress + 0.1);
        goal.feedback.push(feedback.overall.summary);
      }
    }
  }

  private async checkMilestones(feedback: StructuredFeedback): Promise<void> {
    for (const [_goalId, goal] of this.goals) {
      for (const milestone of goal.milestones) {
        if (milestone.achieved && !this.celebratedMilestones.has(milestone.id)) {
          this.celebratedMilestones.add(milestone.id);
          milestone.celebrationMessage = `Congratulations! You've achieved "${milestone.name}"! ${this.generateEncouragement()}`;
        }
      }
    }
  }

  private isMilestoneAchieved(goal: LearningGoal, milestone: ProgressMilestone): boolean {
    // Simple threshold-based achievement
    // In practice, this would be more sophisticated
    const milestoneIndex = goal.milestones.indexOf(milestone);
    const threshold = (milestoneIndex + 1) / goal.milestones.length;
    return goal.progress >= threshold;
  }

  private analyzeTrend(): string {
    if (this.feedbackHistory.length < 2) {
      return 'Not enough data to analyze trends yet.';
    }

    const recent = this.feedbackHistory.slice(-5);
    const strengthsCount = recent.reduce((sum, f) => sum + f.strengths.length, 0);
    const improvementsCount = recent.reduce((sum, f) => sum + f.improvements.length, 0);

    if (strengthsCount > improvementsCount * 1.5) {
      return 'Excellent progress! Your strengths are clearly showing.';
    } else if (improvementsCount > strengthsCount * 1.5) {
      return "There's room for growth. Keep working on the suggested improvements.";
    } else {
      return 'Balanced progress. Continue building on your strengths while addressing improvements.';
    }
  }
}

/**
 * Create a feedback agent
 */
export function createFeedbackAgent(config: FeedbackAgentConfig): FeedbackAgent {
  const toneGuide: Record<FeedbackTone, string> = {
    encouraging: 'Be warm, supportive, and emphasize progress and effort.',
    neutral: 'Be objective and balanced in your feedback.',
    direct: 'Be clear and straightforward while remaining respectful.',
    challenging: 'Push the student to reach higher while being supportive.',
  };

  const focusGuide: Record<FeedbackFocus, string> = {
    process: 'Focus on the approach and methodology used.',
    outcome: 'Focus on the final result and achievement.',
    effort: 'Focus on the work and dedication shown.',
    growth: 'Focus on progress and development over time.',
  };

  const tone = config.defaultTone ?? 'encouraging';
  const focus = config.feedbackFocus ?? 'growth';

  const systemPrompt = `You are an expert feedback provider${config.subject ? ` for ${config.subject}` : ''}.

Feedback tone: ${toneGuide[tone]}
Feedback focus: ${focusGuide[focus]}

Guidelines:
- Start with specific, genuine praise
- Provide actionable suggestions for improvement
- Use "growth mindset" language
- Be specific rather than general
- Prioritize feedback by importance
${config.includeSuggestions ? '- Include specific suggestions for improvement' : ''}
${config.includeExamples ? '- Provide examples when helpful' : ''}

Remember: Good feedback is specific, actionable, and encouraging.`;

  const fullConfig: AgentConfig = {
    id: config.id ?? 'feedback-agent',
    name: config.name ?? 'Feedback Agent',
    description: config.description ?? 'Provides constructive feedback on student work',
    systemPrompt,
    model: config.model ?? { provider: 'openai', model: 'gpt-4' },
    tools: config.tools ?? [],
    maxIterations: config.maxIterations ?? 5,
    timeout: config.timeout ?? 60000,
    stateConfig: config.stateConfig ?? {
      store: 'memory',
      ttlSeconds: 3600,
      checkpointInterval: 5,
      maxCheckpoints: 10,
    },
    memoryConfig: config.memoryConfig ?? {
      episodic: { enabled: true },
      working: { capacity: 7 },
      longTerm: { enabled: true },
    },
  };

  return new FeedbackAgent(fullConfig, config);
}
