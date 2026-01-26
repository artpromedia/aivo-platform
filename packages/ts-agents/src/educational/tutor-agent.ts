/**
 * Tutor Agent - Specialized agent for tutoring interactions
 */

import type {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
} from '../core/types.js';
import { Agent, type AgentOptions } from '../core/agent.js';
import { AgentBuilder } from '../core/agent-builder.js';

export interface TutorAgentConfig extends Partial<AgentConfig> {
  /** Subject area (e.g., "Math", "Science", "English") */
  subject: string;
  /** Grade level (e.g., "K-2", "3-5", "6-8", "9-12") */
  gradeLevel: string;
  /** Teaching style */
  teachingStyle?: 'socratic' | 'direct' | 'scaffolded' | 'exploratory';
  /** Enable hints before giving answers */
  hintsEnabled?: boolean;
  /** Maximum hints before revealing answer */
  maxHints?: number;
  /** Learning objectives */
  learningObjectives?: string[];
  /** Difficulty adaptation */
  adaptiveDifficulty?: boolean;
}

export interface ScaffoldingStep {
  level: number;
  description: string;
  hint?: string;
  example?: string;
}

export interface LearningProgress {
  topic: string;
  masteryLevel: number;
  attemptsCount: number;
  successRate: number;
  lastAttempt: Date;
}

/**
 * Specialized agent for tutoring interactions
 */
export class TutorAgent extends Agent {
  private readonly tutorConfig: TutorAgentConfig;
  private currentTopic: string = '';
  private hintCount: number = 0;
  private scaffoldingLevel: number = 0;
  private learningProgress: Map<string, LearningProgress> = new Map();

  constructor(config: AgentConfig, tutorConfig: TutorAgentConfig, options?: AgentOptions) {
    super(config, options);
    this.tutorConfig = tutorConfig;
  }

  /**
   * Override run to add tutoring-specific behavior
   */
  async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    // Detect topic from input
    await this.detectTopic(input.message);

    // Add tutoring context to input
    const enhancedInput: AgentInput = {
      ...input,
      metadata: {
        ...input.metadata,
        subject: this.tutorConfig.subject,
        gradeLevel: this.tutorConfig.gradeLevel,
        currentTopic: this.currentTopic,
        scaffoldingLevel: this.scaffoldingLevel,
        hintCount: this.hintCount,
      },
    };

    const output = await super.run(enhancedInput, context);

    // Track learning progress
    await this.updateProgress(input.message, output);

    return output;
  }

  /**
   * Get a hint for the current topic
   */
  async getHint(): Promise<string | null> {
    const maxHints = this.tutorConfig.maxHints ?? 3;

    if (this.hintCount >= maxHints) {
      return null;
    }

    this.hintCount++;
    const hints = this.generateHints();

    return hints[this.hintCount - 1] ?? null;
  }

  /**
   * Increase scaffolding level (provide more support)
   */
  increaseScaffolding(): void {
    this.scaffoldingLevel = Math.min(this.scaffoldingLevel + 1, 3);
  }

  /**
   * Decrease scaffolding level (reduce support)
   */
  decreaseScaffolding(): void {
    this.scaffoldingLevel = Math.max(this.scaffoldingLevel - 1, 0);
  }

  /**
   * Get current scaffolding steps
   */
  getScaffoldingSteps(): ScaffoldingStep[] {
    return [
      {
        level: 0,
        description: 'Minimal guidance - student works independently',
      },
      {
        level: 1,
        description: 'Light hints - subtle prompts to guide thinking',
        hint: 'Think about what you already know about this topic.',
      },
      {
        level: 2,
        description: 'Moderate support - step-by-step guidance',
        hint: "Let's break this down into smaller parts.",
        example: 'For example, we could start by...',
      },
      {
        level: 3,
        description: 'Full scaffolding - detailed walkthrough',
        hint: "I'll show you how to approach this step by step.",
        example: 'Watch how I solve a similar problem first.',
      },
    ];
  }

  /**
   * Get learning progress for all topics
   */
  getProgress(): LearningProgress[] {
    return Array.from(this.learningProgress.values());
  }

  /**
   * Get progress for a specific topic
   */
  getTopicProgress(topic: string): LearningProgress | undefined {
    return this.learningProgress.get(topic);
  }

  /**
   * Reset hints counter
   */
  resetHints(): void {
    this.hintCount = 0;
  }

  /**
   * Get recommended next topic based on progress
   */
  getRecommendedTopic(): string | null {
    const progress = this.getProgress();

    // Find topics with low mastery
    const lowMastery = progress.filter(p => p.masteryLevel < 0.7);

    if (lowMastery.length > 0) {
      // Return the one with lowest mastery
      lowMastery.sort((a, b) => a.masteryLevel - b.masteryLevel);
      return lowMastery[0]!.topic;
    }

    return null;
  }

  protected async onStart(context: AgentContext): Promise<void> {
    await super.onStart(context);

    // Record tutoring session start
    await this.memoryManager.recordEpisode({
      type: 'tutoring_session_start',
      content: {
        subject: this.tutorConfig.subject,
        gradeLevel: this.tutorConfig.gradeLevel,
      },
      timestamp: new Date(),
      metadata: { sessionId: context.sessionId },
    });
  }

  protected async onComplete(output: AgentOutput): Promise<void> {
    await super.onComplete(output);

    // Record session completion
    await this.memoryManager.recordEpisode({
      type: 'tutoring_session_end',
      content: {
        topic: this.currentTopic,
        hintsUsed: this.hintCount,
        scaffoldingLevel: this.scaffoldingLevel,
      },
      timestamp: new Date(),
    });
  }

  private async detectTopic(message: string): Promise<void> {
    // Simple topic detection based on keywords
    const topics = [
      'algebra',
      'geometry',
      'calculus',
      'statistics',
      'fractions',
      'decimals',
      'equations',
      'functions',
      'graphs',
      'word problems',
    ];

    const messageLower = message.toLowerCase();

    for (const topic of topics) {
      if (messageLower.includes(topic)) {
        if (this.currentTopic !== topic) {
          this.currentTopic = topic;
          this.resetHints();
          this.scaffoldingLevel = 0;
        }
        return;
      }
    }

    // If no specific topic detected, keep current or set to general
    if (!this.currentTopic) {
      this.currentTopic = 'general';
    }
  }

  private generateHints(): string[] {
    // Generate progressive hints based on topic
    return [
      `Think about what you already know about ${this.currentTopic}.`,
      `Try breaking this problem into smaller steps.`,
      `Remember the key concepts we discussed about ${this.currentTopic}.`,
    ];
  }

  private async updateProgress(input: string, output: AgentOutput): Promise<void> {
    if (!this.currentTopic) return;

    let progress = this.learningProgress.get(this.currentTopic);

    if (!progress) {
      progress = {
        topic: this.currentTopic,
        masteryLevel: 0,
        attemptsCount: 0,
        successRate: 0,
        lastAttempt: new Date(),
      };
      this.learningProgress.set(this.currentTopic, progress);
    }

    progress.attemptsCount++;
    progress.lastAttempt = new Date();

    // Simple success detection based on output
    const isSuccess = this.detectSuccess(output);

    if (isSuccess) {
      progress.successRate =
        (progress.successRate * (progress.attemptsCount - 1) + 1) /
        progress.attemptsCount;
      progress.masteryLevel = Math.min(progress.masteryLevel + 0.1, 1);
    } else {
      progress.successRate =
        (progress.successRate * (progress.attemptsCount - 1)) /
        progress.attemptsCount;
    }

    // Adjust scaffolding based on progress
    if (this.tutorConfig.adaptiveDifficulty) {
      if (progress.successRate > 0.8) {
        this.decreaseScaffolding();
      } else if (progress.successRate < 0.5) {
        this.increaseScaffolding();
      }
    }
  }

  private detectSuccess(output: AgentOutput): boolean {
    // Simple heuristic - could be enhanced with NLP
    const successIndicators = [
      'correct',
      'well done',
      'excellent',
      'good job',
      'that\'s right',
      'exactly',
    ];

    const message = output.message.toLowerCase();
    return successIndicators.some(indicator => message.includes(indicator));
  }
}

/**
 * Create a tutor agent builder
 */
export function createTutorAgent(config: TutorAgentConfig): TutorAgent {
  const systemPrompt = `You are a patient and encouraging ${config.subject} tutor for ${config.gradeLevel} students.

Teaching style: ${config.teachingStyle ?? 'scaffolded'}
${config.hintsEnabled ? 'Provide hints before giving direct answers.' : ''}
${config.learningObjectives ? `Learning objectives: ${config.learningObjectives.join(', ')}` : ''}

Guidelines:
- Be encouraging and patient
- Break down complex concepts into smaller steps
- Use age-appropriate language and examples
- Ask guiding questions to check understanding
- Celebrate successes and encourage effort
- Adapt your explanations based on student responses`;

  const fullConfig: AgentConfig = {
    id: config.id ?? `tutor-${config.subject.toLowerCase().replace(/\s+/g, '-')}`,
    name: config.name ?? `${config.subject} Tutor`,
    description: config.description ?? `A ${config.subject} tutor for ${config.gradeLevel} students`,
    systemPrompt,
    model: config.model ?? { provider: 'openai', model: 'gpt-4' },
    tools: config.tools ?? [],
    maxIterations: config.maxIterations ?? 10,
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

  return new TutorAgent(fullConfig, config);
}
