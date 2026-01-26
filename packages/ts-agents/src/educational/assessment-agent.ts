/**
 * Assessment Agent - Specialized agent for adaptive assessment
 */

import type {
  AgentConfig,
  AgentContext,
  AgentInput,
  AgentOutput,
} from '../core/types.js';
import { Agent, type AgentOptions } from '../core/agent.js';

export type BloomsLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface AssessmentConfig extends Partial<AgentConfig> {
  /** Subject being assessed */
  subject: string;
  /** Topics to assess */
  topics: string[];
  /** Target Bloom's taxonomy levels */
  bloomsLevels?: BloomsLevel[];
  /** Enable adaptive difficulty */
  adaptiveDifficulty?: boolean;
  /** Starting difficulty */
  startingDifficulty?: DifficultyLevel;
  /** Minimum questions for assessment */
  minQuestions?: number;
  /** Maximum questions for assessment */
  maxQuestions?: number;
  /** Confidence threshold to stop */
  confidenceThreshold?: number;
}

export interface Question {
  id: string;
  topic: string;
  bloomsLevel: BloomsLevel;
  difficulty: DifficultyLevel;
  content: string;
  expectedAnswer?: string;
  rubric?: string[];
  pointValue: number;
}

export interface Answer {
  questionId: string;
  response: string;
  timestamp: Date;
  timeSpentMs: number;
}

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  score: number;
  maxScore: number;
  feedback: string;
  misconceptions?: string[];
}

export interface AssessmentResult {
  sessionId: string;
  subject: string;
  topics: string[];
  questionsAsked: number;
  totalScore: number;
  maxPossibleScore: number;
  percentageScore: number;
  skillLevels: Record<string, number>;
  misconceptions: string[];
  recommendations: string[];
  confidenceLevel: number;
  duration: number;
  completedAt: Date;
}

/**
 * Specialized agent for adaptive assessment
 */
export class AssessmentAgent extends Agent {
  private readonly assessmentConfig: AssessmentConfig;
  private questions: Question[] = [];
  private answers: Answer[] = [];
  private results: QuestionResult[] = [];
  private currentDifficulty: DifficultyLevel;
  private questionsAsked: number = 0;
  private startTime: Date = new Date();
  private skillEstimates: Map<string, number> = new Map();
  private detectedMisconceptions: Set<string> = new Set();

  constructor(
    config: AgentConfig,
    assessmentConfig: AssessmentConfig,
    options?: AgentOptions
  ) {
    super(config, options);
    this.assessmentConfig = assessmentConfig;
    this.currentDifficulty = assessmentConfig.startingDifficulty ?? 'medium';
  }

  /**
   * Start the assessment
   */
  async startAssessment(context: AgentContext): Promise<Question> {
    this.startTime = new Date();
    this.questionsAsked = 0;
    this.questions = [];
    this.answers = [];
    this.results = [];
    this.skillEstimates.clear();
    this.detectedMisconceptions.clear();

    // Initialize skill estimates
    for (const topic of this.assessmentConfig.topics) {
      this.skillEstimates.set(topic, 0.5); // Start at neutral
    }

    // Generate first question
    return this.generateQuestion();
  }

  /**
   * Submit an answer and get feedback + next question
   */
  async submitAnswer(
    answer: Answer
  ): Promise<{ result: QuestionResult; nextQuestion?: Question; isComplete: boolean }> {
    this.answers.push(answer);

    // Find the question
    const question = this.questions.find(q => q.id === answer.questionId);
    if (!question) {
      throw new Error(`Question not found: ${answer.questionId}`);
    }

    // Evaluate the answer
    const result = await this.evaluateAnswer(question, answer);
    this.results.push(result);

    // Update skill estimates
    this.updateSkillEstimate(question.topic, result);

    // Detect misconceptions
    if (result.misconceptions) {
      for (const misconception of result.misconceptions) {
        this.detectedMisconceptions.add(misconception);
      }
    }

    // Adapt difficulty
    if (this.assessmentConfig.adaptiveDifficulty) {
      this.adaptDifficulty(result);
    }

    // Check if assessment is complete
    const isComplete = this.shouldComplete();

    if (isComplete) {
      return { result, isComplete: true };
    }

    // Generate next question
    const nextQuestion = this.generateQuestion();
    return { result, nextQuestion, isComplete: false };
  }

  /**
   * Get the final assessment result
   */
  getAssessmentResult(sessionId: string): AssessmentResult {
    const totalScore = this.results.reduce((sum, r) => sum + r.score, 0);
    const maxPossibleScore = this.results.reduce((sum, r) => sum + r.maxScore, 0);

    const skillLevels: Record<string, number> = {};
    for (const [topic, level] of this.skillEstimates) {
      skillLevels[topic] = level;
    }

    return {
      sessionId,
      subject: this.assessmentConfig.subject,
      topics: this.assessmentConfig.topics,
      questionsAsked: this.questionsAsked,
      totalScore,
      maxPossibleScore,
      percentageScore: maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0,
      skillLevels,
      misconceptions: Array.from(this.detectedMisconceptions),
      recommendations: this.generateRecommendations(),
      confidenceLevel: this.calculateConfidence(),
      duration: Date.now() - this.startTime.getTime(),
      completedAt: new Date(),
    };
  }

  /**
   * Get current skill estimates
   */
  getSkillEstimates(): Map<string, number> {
    return new Map(this.skillEstimates);
  }

  /**
   * Get detected misconceptions
   */
  getMisconceptions(): string[] {
    return Array.from(this.detectedMisconceptions);
  }

  /**
   * Get the current difficulty level
   */
  getCurrentDifficulty(): DifficultyLevel {
    return this.currentDifficulty;
  }

  /**
   * Get questions asked so far
   */
  getQuestionsAsked(): number {
    return this.questionsAsked;
  }

  private generateQuestion(): Question {
    this.questionsAsked++;

    // Select topic based on uncertainty
    const topic = this.selectTopicToAssess();

    // Select Bloom's level
    const bloomsLevel = this.selectBloomsLevel();

    const question: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      topic,
      bloomsLevel,
      difficulty: this.currentDifficulty,
      content: this.generateQuestionContent(topic, bloomsLevel, this.currentDifficulty),
      pointValue: this.getPointValue(this.currentDifficulty, bloomsLevel),
    };

    this.questions.push(question);
    return question;
  }

  private selectTopicToAssess(): string {
    // Select topic with highest uncertainty (closest to 0.5)
    let mostUncertainTopic = this.assessmentConfig.topics[0]!;
    let highestUncertainty = 0;

    for (const topic of this.assessmentConfig.topics) {
      const estimate = this.skillEstimates.get(topic) ?? 0.5;
      const uncertainty = 0.5 - Math.abs(estimate - 0.5);

      if (uncertainty > highestUncertainty) {
        highestUncertainty = uncertainty;
        mostUncertainTopic = topic;
      }
    }

    return mostUncertainTopic;
  }

  private selectBloomsLevel(): BloomsLevel {
    const levels = this.assessmentConfig.bloomsLevels ?? [
      'remember',
      'understand',
      'apply',
    ];

    // Select based on current difficulty and skill estimates
    const avgSkill =
      Array.from(this.skillEstimates.values()).reduce((a, b) => a + b, 0) /
      this.skillEstimates.size;

    if (avgSkill < 0.3) {
      return levels.find(l => l === 'remember') ?? levels[0]!;
    } else if (avgSkill < 0.6) {
      return levels.find(l => l === 'understand') ?? levels[0]!;
    } else {
      return levels.find(l => l === 'apply' || l === 'analyze') ?? levels[0]!;
    }
  }

  private generateQuestionContent(
    topic: string,
    bloomsLevel: BloomsLevel,
    difficulty: DifficultyLevel
  ): string {
    // This would typically use the LLM to generate questions
    // For now, return a template-based question
    const prefixes: Record<BloomsLevel, string[]> = {
      remember: ['What is', 'Define', 'List', 'Name'],
      understand: ['Explain', 'Describe', 'Summarize', 'Compare'],
      apply: ['Calculate', 'Solve', 'Use', 'Demonstrate'],
      analyze: ['Analyze', 'Examine', 'Compare and contrast', 'Categorize'],
      evaluate: ['Evaluate', 'Assess', 'Justify', 'Critique'],
      create: ['Design', 'Create', 'Develop', 'Construct'],
    };

    const prefix =
      prefixes[bloomsLevel][Math.floor(Math.random() * prefixes[bloomsLevel].length)];

    return `[${difficulty.toUpperCase()}] ${prefix} ${topic}`;
  }

  private async evaluateAnswer(question: Question, answer: Answer): Promise<QuestionResult> {
    // In a real implementation, this would use the LLM to evaluate
    // For now, return a simulated result

    const timeBonus = answer.timeSpentMs < 30000 ? 0.1 : 0;
    const baseScore = Math.random() * 0.6 + 0.2; // Random for simulation

    const score = Math.min(question.pointValue, (baseScore + timeBonus) * question.pointValue);

    return {
      questionId: question.id,
      correct: score >= question.pointValue * 0.7,
      score: Math.round(score * 10) / 10,
      maxScore: question.pointValue,
      feedback: score >= question.pointValue * 0.7
        ? 'Good work! You demonstrated understanding of this concept.'
        : 'Keep practicing. Consider reviewing the key concepts.',
      misconceptions: score < question.pointValue * 0.5
        ? [`Possible misconception about ${question.topic}`]
        : undefined,
    };
  }

  private updateSkillEstimate(topic: string, result: QuestionResult): void {
    const currentEstimate = this.skillEstimates.get(topic) ?? 0.5;
    const performance = result.score / result.maxScore;

    // Bayesian-like update
    const learningRate = 0.2;
    const newEstimate = currentEstimate + learningRate * (performance - currentEstimate);

    this.skillEstimates.set(topic, Math.max(0, Math.min(1, newEstimate)));
  }

  private adaptDifficulty(result: QuestionResult): void {
    const performance = result.score / result.maxScore;

    if (performance >= 0.8) {
      // Increase difficulty
      const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];
      const currentIndex = difficulties.indexOf(this.currentDifficulty);
      if (currentIndex < difficulties.length - 1) {
        this.currentDifficulty = difficulties[currentIndex + 1]!;
      }
    } else if (performance < 0.4) {
      // Decrease difficulty
      const difficulties: DifficultyLevel[] = ['easy', 'medium', 'hard', 'expert'];
      const currentIndex = difficulties.indexOf(this.currentDifficulty);
      if (currentIndex > 0) {
        this.currentDifficulty = difficulties[currentIndex - 1]!;
      }
    }
  }

  private shouldComplete(): boolean {
    const minQuestions = this.assessmentConfig.minQuestions ?? 5;
    const maxQuestions = this.assessmentConfig.maxQuestions ?? 20;
    const confidenceThreshold = this.assessmentConfig.confidenceThreshold ?? 0.8;

    if (this.questionsAsked < minQuestions) {
      return false;
    }

    if (this.questionsAsked >= maxQuestions) {
      return true;
    }

    // Check if we have high confidence in skill estimates
    return this.calculateConfidence() >= confidenceThreshold;
  }

  private calculateConfidence(): number {
    if (this.results.length === 0) return 0;

    // Confidence based on number of questions and consistency
    const questionConfidence = Math.min(1, this.questionsAsked / 10);

    // Consistency in performance
    const scores = this.results.map(r => r.score / r.maxScore);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance =
      scores.reduce((sum, s) => sum + Math.pow(s - avgScore, 2), 0) / scores.length;
    const consistencyConfidence = 1 - Math.min(1, variance * 4);

    return (questionConfidence + consistencyConfidence) / 2;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Topics needing improvement
    for (const [topic, level] of this.skillEstimates) {
      if (level < 0.5) {
        recommendations.push(`Focus on improving understanding of ${topic}`);
      }
    }

    // Address misconceptions
    for (const misconception of this.detectedMisconceptions) {
      recommendations.push(`Review: ${misconception}`);
    }

    // General recommendations
    if (this.currentDifficulty === 'easy') {
      recommendations.push('Practice more foundational concepts before advancing');
    } else if (this.currentDifficulty === 'expert') {
      recommendations.push('Challenge yourself with more complex problems');
    }

    return recommendations;
  }

  private getPointValue(difficulty: DifficultyLevel, bloomsLevel: BloomsLevel): number {
    const difficultyMultiplier: Record<DifficultyLevel, number> = {
      easy: 1,
      medium: 2,
      hard: 3,
      expert: 4,
    };

    const bloomsMultiplier: Record<BloomsLevel, number> = {
      remember: 1,
      understand: 1.5,
      apply: 2,
      analyze: 2.5,
      evaluate: 3,
      create: 3.5,
    };

    return difficultyMultiplier[difficulty] * bloomsMultiplier[bloomsLevel];
  }
}

/**
 * Create an assessment agent
 */
export function createAssessmentAgent(config: AssessmentConfig): AssessmentAgent {
  const systemPrompt = `You are an expert assessor for ${config.subject}.

Your role is to:
- Generate clear, grade-appropriate questions
- Evaluate student responses fairly and accurately
- Identify misconceptions in student thinking
- Provide constructive feedback
- Adapt question difficulty based on student performance

Topics to assess: ${config.topics.join(', ')}
${config.adaptiveDifficulty ? 'Adapt difficulty based on student performance.' : ''}`;

  const fullConfig: AgentConfig = {
    id: config.id ?? `assessment-${config.subject.toLowerCase().replace(/\s+/g, '-')}`,
    name: config.name ?? `${config.subject} Assessment`,
    description: config.description ?? `Adaptive assessment for ${config.subject}`,
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

  return new AssessmentAgent(fullConfig, config);
}
