/**
 * AssessmentAgent - Specialized agent for adaptive assessment
 */

import { Agent, type AgentDependencies } from '../core/agent';
import { AgentBuilder } from '../core/agent-builder';
import type { AgentConfig, AgentContext, AgentOutput, AgentInput } from '../core/types';

export interface AssessmentConfig extends AgentConfig {
  subject: string;
  assessmentType: 'diagnostic' | 'formative' | 'summative' | 'adaptive';
  difficultyRange?: { min: number; max: number };
  questionCount?: number;
  timeLimit?: number;
  adaptiveAlgorithm?: 'irt' | 'elo' | 'simple';
}

export interface Question {
  id: string;
  content: string;
  type: 'multiple-choice' | 'short-answer' | 'true-false' | 'essay';
  difficulty: number; // 0-1 scale
  topic: string;
  skills: string[];
  options?: string[];
  correctAnswer?: string | string[];
  rubric?: string;
  points: number;
}

export interface Response {
  questionId: string;
  answer: string;
  timestamp: Date;
  responseTimeMs: number;
}

export interface AssessmentResult {
  totalScore: number;
  maxScore: number;
  percentageScore: number;
  estimatedSkillLevel: number;
  topicScores: Record<string, { score: number; max: number }>;
  skillScores: Record<string, number>;
  misconceptions: string[];
  recommendations: string[];
  questionResults: {
    questionId: string;
    correct: boolean;
    score: number;
    feedback: string;
  }[];
}

const ASSESSMENT_SYSTEM_PROMPT = `You are an expert educational assessment agent. Your role is to:

1. **Generate Appropriate Questions**: Create questions that accurately measure student understanding.
2. **Adapt Difficulty**: Adjust question difficulty based on student performance.
3. **Identify Misconceptions**: Detect and flag common misconceptions from responses.
4. **Provide Feedback**: Give constructive, specific feedback on answers.
5. **Estimate Skill Level**: Use responses to estimate student proficiency.
6. **Recommend Next Steps**: Suggest areas for further study based on results.

Assessment Guidelines:
- Start with medium-difficulty questions to establish baseline
- If student answers correctly, increase difficulty; if incorrect, decrease
- Ask follow-up questions to probe understanding depth
- Use varied question types to assess different skills
- Provide encouraging but honest feedback
- Identify patterns in errors to detect misconceptions
- Focus on understanding, not just memorization

Remember: The goal is accurate assessment that helps guide learning, not to trick or discourage students.`;

export class AssessmentAgent extends Agent {
  private assessmentConfig: AssessmentConfig;
  private currentDifficulty = 0.5;
  private questionBank: Question[] = [];
  private responses: Response[] = [];
  private estimatedSkillLevel = 0.5;

  constructor(config: AssessmentConfig, dependencies: AgentDependencies) {
    super(config, dependencies);
    this.assessmentConfig = config;

    if (config.difficultyRange) {
      this.currentDifficulty = (config.difficultyRange.min + config.difficultyRange.max) / 2;
    }
  }

  /**
   * Set the question bank
   */
  setQuestionBank(questions: Question[]): void {
    this.questionBank = questions;
  }

  /**
   * Add a question to the bank
   */
  addQuestion(question: Question): void {
    this.questionBank.push(question);
  }

  /**
   * Record a student response
   */
  recordResponse(response: Response): void {
    this.responses.push(response);
    this.updateDifficulty(response);
  }

  /**
   * Get the next question based on adaptive algorithm
   */
  getNextQuestion(): Question | undefined {
    const unusedQuestions = this.questionBank.filter(
      (q) => !this.responses.some((r) => r.questionId === q.id)
    );

    if (unusedQuestions.length === 0) {
      return undefined;
    }

    // Find question closest to current difficulty
    return unusedQuestions.reduce((best, current) => {
      const bestDiff = Math.abs(best.difficulty - this.currentDifficulty);
      const currentDiff = Math.abs(current.difficulty - this.currentDifficulty);
      return currentDiff < bestDiff ? current : best;
    });
  }

  /**
   * Calculate assessment results
   */
  calculateResults(): AssessmentResult {
    const questionResults: AssessmentResult['questionResults'] = [];
    const topicScores: Record<string, { score: number; max: number }> = {};
    const skillScores: Record<string, number[]> = {};
    const misconceptions: string[] = [];
    let totalScore = 0;
    let maxScore = 0;

    for (const response of this.responses) {
      const question = this.questionBank.find((q) => q.id === response.questionId);
      if (!question) continue;

      const isCorrect = this.evaluateResponse(question, response.answer);
      const score = isCorrect ? question.points : 0;

      totalScore += score;
      maxScore += question.points;

      // Track topic scores
      if (!topicScores[question.topic]) {
        topicScores[question.topic] = { score: 0, max: 0 };
      }
      const topicScore = topicScores[question.topic];
      if (topicScore) {
        topicScore.score += score;
        topicScore.max += question.points;
      }

      // Track skill scores
      for (const skill of question.skills) {
        if (!skillScores[skill]) {
          skillScores[skill] = [];
        }
        skillScores[skill].push(isCorrect ? 1 : 0);
      }

      // Detect misconceptions
      if (!isCorrect) {
        const misconception = this.detectMisconception(question, response.answer);
        if (misconception && !misconceptions.includes(misconception)) {
          misconceptions.push(misconception);
        }
      }

      questionResults.push({
        questionId: question.id,
        correct: isCorrect,
        score,
        feedback: this.generateFeedback(question, response.answer, isCorrect),
      });
    }

    // Calculate average skill scores
    const avgSkillScores: Record<string, number> = {};
    for (const [skill, scores] of Object.entries(skillScores)) {
      avgSkillScores[skill] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      topicScores,
      avgSkillScores,
      misconceptions
    );

    return {
      totalScore,
      maxScore,
      percentageScore: maxScore > 0 ? (totalScore / maxScore) * 100 : 0,
      estimatedSkillLevel: this.estimatedSkillLevel,
      topicScores,
      skillScores: avgSkillScores,
      misconceptions,
      recommendations,
      questionResults,
    };
  }

  /**
   * Get the estimated skill level
   */
  getEstimatedSkillLevel(): number {
    return this.estimatedSkillLevel;
  }

  /**
   * Reset the assessment
   */
  reset(): void {
    this.responses = [];
    this.currentDifficulty = 0.5;
    this.estimatedSkillLevel = 0.5;
  }

  /**
   * Override run to inject assessment context
   */
  override async run(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const enrichedContext: AgentContext = {
      ...context,
      metadata: {
        ...context.metadata,
        assessmentConfig: {
          subject: this.assessmentConfig.subject,
          type: this.assessmentConfig.assessmentType,
          currentDifficulty: this.currentDifficulty,
          questionsAnswered: this.responses.length,
          estimatedSkillLevel: this.estimatedSkillLevel,
        },
      },
    };

    return super.run(input, enrichedContext);
  }

  private updateDifficulty(response: Response): void {
    const question = this.questionBank.find((q) => q.id === response.questionId);
    if (!question) return;

    const isCorrect = this.evaluateResponse(question, response.answer);

    // Simple adaptive algorithm
    if (this.assessmentConfig.adaptiveAlgorithm === 'simple') {
      if (isCorrect) {
        this.currentDifficulty = Math.min(1, this.currentDifficulty + 0.1);
        this.estimatedSkillLevel = Math.min(1, this.estimatedSkillLevel + 0.05);
      } else {
        this.currentDifficulty = Math.max(0, this.currentDifficulty - 0.1);
        this.estimatedSkillLevel = Math.max(0, this.estimatedSkillLevel - 0.03);
      }
    }

    // Respect difficulty range
    if (this.assessmentConfig.difficultyRange) {
      this.currentDifficulty = Math.max(
        this.assessmentConfig.difficultyRange.min,
        Math.min(this.assessmentConfig.difficultyRange.max, this.currentDifficulty)
      );
    }
  }

  private evaluateResponse(question: Question, answer: string): boolean {
    if (!question.correctAnswer) return false;

    const normalizedAnswer = answer.toLowerCase().trim();

    if (Array.isArray(question.correctAnswer)) {
      return question.correctAnswer.some(
        (correct) => correct.toLowerCase().trim() === normalizedAnswer
      );
    }

    return question.correctAnswer.toLowerCase().trim() === normalizedAnswer;
  }

  private detectMisconception(question: Question, _answer: string): string | undefined {
    // Simple misconception detection based on question topic
    // In production, this would use more sophisticated analysis
    return `Possible misconception in ${question.topic}: Review foundational concepts`;
  }

  private generateFeedback(question: Question, _answer: string, isCorrect: boolean): string {
    if (isCorrect) {
      return 'Correct! Well done.';
    }

    if (question.rubric) {
      return `Incorrect. ${question.rubric}`;
    }

    return `Incorrect. The topic "${question.topic}" may need more review.`;
  }

  private generateRecommendations(
    topicScores: Record<string, { score: number; max: number }>,
    skillScores: Record<string, number>,
    misconceptions: string[]
  ): string[] {
    const recommendations: string[] = [];

    // Recommend topics with low scores
    for (const [topic, scores] of Object.entries(topicScores)) {
      const percentage = scores.max > 0 ? (scores.score / scores.max) * 100 : 0;
      if (percentage < 70) {
        recommendations.push(`Review ${topic} - scored ${percentage.toFixed(0)}%`);
      }
    }

    // Recommend skills to practice
    for (const [skill, score] of Object.entries(skillScores)) {
      if (score < 0.7) {
        recommendations.push(`Practice ${skill} skills`);
      }
    }

    // Address misconceptions
    for (const misconception of misconceptions) {
      recommendations.push(`Address: ${misconception}`);
    }

    return recommendations;
  }

  /**
   * Create an assessment agent with builder
   */
  static create(options: {
    name?: string;
    subject: string;
    assessmentType: AssessmentConfig['assessmentType'];
    tools?: AssessmentConfig['tools'];
  }): AgentBuilder {
    const systemPrompt = `${ASSESSMENT_SYSTEM_PROMPT}\n\nSubject: ${options.subject}\nAssessment Type: ${options.assessmentType}`;

    return new AgentBuilder()
      .withName(options.name || 'Assessment Agent')
      .withDescription(`Assessment agent for ${options.subject}`)
      .withSystemPrompt(systemPrompt)
      .withTools(options.tools || [])
      .withMaxIterations(30);
  }
}
