/**
 * Question Generation Service
 *
 * AI-powered question creation with:
 * - Multiple question types
 * - Difficulty calibration
 * - Bloom's taxonomy alignment
 * - Distractor generation
 * - Hint generation
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  QuestionGenerationRequest,
  GeneratedQuestion,
  QuestionType,
  QuestionOption,
  QuestionImprovement,
  BloomsLevel,
  DifficultyLevel,
} from './types.js';

const QUESTION_SYSTEM_PROMPT = `You are an expert assessment designer for educational content.
When generating questions:
- Create diverse question types
- Ensure questions assess learning objectives
- Include plausible distractors for multiple choice
- Provide clear, unambiguous wording
- Include difficulty-appropriate challenges
- Align with Bloom's taxonomy levels
- Write age-appropriate content`;

const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  multiple_choice: '4 options with 1 correct answer',
  multi_select: '4-6 options with 2-3 correct answers',
  true_false: 'statement that is true or false',
  fill_blank: 'sentence with blank(s) to complete',
  short_answer: 'requires 1-2 sentence response',
  essay: 'requires extended written response',
  matching: 'match items from two columns',
  ordering: 'arrange items in correct sequence',
  numeric: 'requires a numerical answer',
  drag_drop: 'drag items to correct positions',
};

const BLOOMS_DESCRIPTIONS: Record<BloomsLevel, string> = {
  remember: 'recall facts and basic concepts',
  understand: 'explain ideas or concepts',
  apply: 'use information in new situations',
  analyze: 'draw connections among ideas',
  evaluate: 'justify a stand or decision',
  create: 'produce new or original work',
};

const BASE_POINTS: Record<QuestionType, number> = {
  multiple_choice: 1,
  multi_select: 2,
  true_false: 1,
  fill_blank: 1,
  short_answer: 2,
  essay: 5,
  matching: 2,
  ordering: 2,
  numeric: 1,
  drag_drop: 2,
};

const DIFFICULTY_MULTIPLIER: Record<DifficultyLevel, number> = {
  easy: 1,
  medium: 1.5,
  hard: 2,
};

export class QuestionGenerationService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Generate questions from content
   */
  async generateQuestions(request: QuestionGenerationRequest): Promise<GeneratedQuestion[]> {
    const generationId = uuidv4();
    const startTime = Date.now();

    console.info('Starting question generation', {
      generationId,
      count: request.count,
      types: request.questionTypes,
    });

    try {
      incrementCounter('question_generation.started');

      const prompt = this.buildQuestionPrompt(request);
      const messages: LLMMessage[] = [
        { role: 'system', content: QUESTION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.7,
        maxTokens: 4000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.userId,
          agentType: 'TUTOR',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);
      const rawQuestions = (parsed.questions as unknown[]) ?? [];

      const questions: GeneratedQuestion[] = rawQuestions.map((q: unknown, index: number) => {
        const question = q as Record<string, unknown>;
        return {
          id: uuidv4(),
          type: (question.type as QuestionType) ?? 'multiple_choice',
          stem: (question.stem as string) ?? '',
          stemHtml: this.formatToHtml((question.stem as string) ?? ''),
          options: this.parseOptions(question.options as unknown[]),
          correctAnswer: question.correctAnswer as string | string[] | undefined,
          explanation: request.includeExplanations ? (question.explanation as string) : undefined,
          hints: request.includeHints ? (question.hints as string[]) : undefined,
          difficulty: this.inferDifficulty(
            request.difficulty,
            index,
            request.count,
            question.difficulty as string | undefined
          ),
          bloomsLevel: (question.bloomsLevel as BloomsLevel) ?? 'understand',
          points: this.calculatePoints(
            question.type as QuestionType,
            question.difficulty as DifficultyLevel | undefined
          ),
          tags: (question.tags as string[]) ?? [],
          metadata: {
            generatedAt: new Date(),
            source: 'ai',
          },
        };
      });

      const validQuestions = this.validateQuestions(questions);

      const latencyMs = Date.now() - startTime;
      recordHistogram('question_generation.duration', latencyMs);
      incrementCounter('question_generation.success');

      console.info('Question generation completed', {
        generationId,
        generated: questions.length,
        valid: validQuestions.length,
        latencyMs,
      });

      await this.storeGeneration(generationId, request, validQuestions);

      return validQuestions;
    } catch (error) {
      incrementCounter('question_generation.error');
      console.error('Question generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Generate questions for a specific skill
   */
  async generateForSkill(
    skill: { id: string; description: string; subject: string; gradeLevel?: string },
    lessonContent: string,
    options: {
      count: number;
      difficulty?: DifficultyLevel;
      tenantId: string;
      userId: string;
    }
  ): Promise<GeneratedQuestion[]> {
    return this.generateQuestions({
      content: lessonContent || skill.description,
      subject: skill.subject,
      gradeLevel: (skill.gradeLevel as QuestionGenerationRequest['gradeLevel']) ?? '6',
      questionTypes: ['multiple_choice', 'short_answer', 'fill_blank'],
      count: options.count,
      difficulty: options.difficulty,
      includeExplanations: true,
      tenantId: options.tenantId,
      userId: options.userId,
    });
  }

  /**
   * Generate distractors for a question
   */
  async generateDistractors(
    stem: string,
    correctAnswer: string,
    count: number = 3,
    options?: { subject?: string; gradeLevel?: string; tenantId: string; userId: string }
  ): Promise<string[]> {
    const prompt = `Generate ${count} plausible but incorrect answer choices (distractors) for this question:

Question: ${stem}
Correct Answer: ${correctAnswer}
${options?.subject ? `Subject: ${options.subject}` : ''}
${options?.gradeLevel ? `Grade Level: ${options.gradeLevel}` : ''}

Requirements:
1. Distractors should be plausible to students who don't fully understand
2. They should be clearly incorrect to students who understand
3. They should be similar in length and format to the correct answer
4. They should represent common misconceptions when possible
5. They should NOT be obviously wrong or silly

Respond with JSON: {"distractors": ["string", "string", "string"]}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an expert at creating educational assessment distractors.' },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.8,
      maxTokens: 500,
      metadata: {
        tenantId: options?.tenantId ?? 'system',
        userId: options?.userId ?? 'system',
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    const distractors = (parsed.distractors as string[]) ?? [];

    return distractors.slice(0, count);
  }

  /**
   * Generate hints for a question
   */
  async generateHints(
    stem: string,
    correctAnswer: string,
    count: number = 3,
    context?: { tenantId: string; userId: string }
  ): Promise<string[]> {
    const prompt = `Generate ${count} progressive hints for this question, from subtle to more direct:

Question: ${stem}
Correct Answer: ${correctAnswer}

Requirements:
1. First hint should be very subtle, just pointing students in the right direction
2. Second hint should provide more guidance without giving away the answer
3. Third hint should be more direct but still require thinking
4. Hints should not directly reveal the answer
5. Hints should be encouraging and educational

Respond with JSON: {"hints": ["string", "string", "string"]}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an expert at creating educational hints that guide learning.' },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.6,
      maxTokens: 500,
      metadata: {
        tenantId: context?.tenantId ?? 'system',
        userId: context?.userId ?? 'system',
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    const hints = (parsed.hints as string[]) ?? [];

    return hints.slice(0, count);
  }

  /**
   * Improve an existing question
   */
  async improveQuestion(
    question: {
      stem: string;
      options?: Array<{ text: string; correct: boolean }>;
      correctAnswer?: string;
    },
    improvements: {
      clarifyWording?: boolean;
      improveDistractors?: boolean;
      addContext?: boolean;
      increaseRigor?: boolean;
    },
    context?: { tenantId: string; userId: string }
  ): Promise<QuestionImprovement> {
    const improvementsList: string[] = [];

    if (improvements.clarifyWording) {
      improvementsList.push('Clarify and improve the wording for better clarity');
    }
    if (improvements.improveDistractors) {
      improvementsList.push('Improve the distractor options to be more plausible');
    }
    if (improvements.addContext) {
      improvementsList.push('Add context or scenario to make the question more engaging');
    }
    if (improvements.increaseRigor) {
      improvementsList.push('Increase the cognitive rigor and depth of the question');
    }

    const prompt = `Improve this question based on the specified criteria:

Current Question:
Stem: ${question.stem}
${question.options ? `Options: ${JSON.stringify(question.options)}` : ''}
${question.correctAnswer ? `Correct Answer: ${question.correctAnswer}` : ''}

Improvements needed:
${improvementsList.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}

Provide:
1. The improved question stem
2. Improved options (if applicable)
3. Specific suggestions explaining the improvements made

Respond with JSON: {"stem": "string", "options": [{"text": "string", "correct": boolean}], "suggestions": ["string"]}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an expert at improving educational assessment questions.' },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 1000,
      metadata: {
        tenantId: context?.tenantId ?? 'system',
        userId: context?.userId ?? 'system',
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      stem: (parsed.stem as string) ?? question.stem,
      options: this.parseOptions(parsed.options as unknown[]),
      suggestions: (parsed.suggestions as string[]) ?? [],
    };
  }

  /**
   * Build the question generation prompt
   */
  private buildQuestionPrompt(request: QuestionGenerationRequest): string {
    const parts: string[] = [
      `Generate ${request.count} assessment questions based on this content:`,
      '',
      'CONTENT:',
      request.content,
      '',
      'CONTEXT:',
      `- Subject: ${request.subject}`,
      `- Grade Level: ${request.gradeLevel}`,
      `- Difficulty: ${request.difficulty ?? 'mixed'}`,
    ];

    if (request.standards?.length) {
      parts.push(`- Standards: ${request.standards.join(', ')}`);
    }

    parts.push('');
    parts.push('QUESTION TYPES TO INCLUDE:');
    for (const type of request.questionTypes) {
      parts.push(`- ${type}: ${QUESTION_TYPE_DESCRIPTIONS[type]}`);
    }

    if (request.bloomsLevels?.length) {
      parts.push('');
      parts.push("BLOOM'S TAXONOMY LEVELS:");
      for (const level of request.bloomsLevels) {
        parts.push(`- ${level}: ${BLOOMS_DESCRIPTIONS[level]}`);
      }
    }

    parts.push('');
    parts.push('REQUIREMENTS:');
    parts.push(`1. Generate exactly ${request.count} questions`);
    parts.push('2. Distribute across the specified question types');
    parts.push('3. Questions should directly assess understanding of the content');
    parts.push(`4. Use clear, unambiguous language appropriate for ${request.gradeLevel}`);
    parts.push('5. For multiple choice: include plausible distractors based on common misconceptions');
    parts.push(
      `6. Vary the difficulty: ${
        request.difficulty === 'mixed'
          ? 'include easy, medium, and hard questions'
          : `focus on ${request.difficulty} difficulty`
      }`
    );

    if (request.includeExplanations) {
      parts.push('7. Include detailed explanations for each correct answer');
    }
    if (request.includeHints) {
      parts.push('8. Include 2-3 progressive hints for each question');
    }

    parts.push('');
    parts.push(
      'Respond with JSON: {"questions": [{"type": "string", "stem": "string", "options": [{"text": "string", "correct": boolean}], "correctAnswer": "string", "explanation": "string", "hints": ["string"], "difficulty": "string", "bloomsLevel": "string", "tags": ["string"]}]}'
    );

    return parts.join('\n');
  }

  /**
   * Parse options from response
   */
  private parseOptions(options: unknown[] | undefined): QuestionOption[] | undefined {
    if (!options || !Array.isArray(options)) {
      return undefined;
    }

    return options.map((opt) => {
      const option = opt as Record<string, unknown>;
      return {
        id: uuidv4(),
        text: (option.text as string) ?? '',
        correct: (option.correct as boolean) ?? false,
        feedback: option.feedback as string | undefined,
      };
    });
  }

  /**
   * Validate generated questions
   */
  private validateQuestions(questions: GeneratedQuestion[]): GeneratedQuestion[] {
    return questions.filter((q) => {
      if (!q.stem || q.stem.length < 10) return false;

      if (q.type === 'multiple_choice' || q.type === 'multi_select') {
        if (!q.options || q.options.length < 2) return false;
        if (!q.options.some((o) => o.correct)) return false;
      }

      if (q.type === 'fill_blank' || q.type === 'short_answer') {
        if (!q.correctAnswer) return false;
      }

      return true;
    });
  }

  /**
   * Infer difficulty from request and position
   */
  private inferDifficulty(
    requestedDifficulty: string | undefined,
    index: number,
    total: number,
    questionDifficulty?: string
  ): DifficultyLevel {
    if (questionDifficulty && ['easy', 'medium', 'hard'].includes(questionDifficulty)) {
      return questionDifficulty as DifficultyLevel;
    }

    if (requestedDifficulty && requestedDifficulty !== 'mixed') {
      return requestedDifficulty as DifficultyLevel;
    }

    const position = index / total;
    if (position < 0.33) return 'easy';
    if (position < 0.66) return 'medium';
    return 'hard';
  }

  /**
   * Calculate points for a question
   */
  private calculatePoints(type: QuestionType, difficulty?: DifficultyLevel): number {
    const base = BASE_POINTS[type] ?? 1;
    const multiplier = DIFFICULTY_MULTIPLIER[difficulty ?? 'medium'] ?? 1;
    return Math.round(base * multiplier);
  }

  /**
   * Format text to basic HTML
   */
  private formatToHtml(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br/>');
  }

  /**
   * Parse structured JSON response
   */
  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in question generation response');
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse question generation response', { error });
      return {};
    }
  }

  /**
   * Store generation for analytics
   */
  private async storeGeneration(
    generationId: string,
    request: QuestionGenerationRequest,
    questions: GeneratedQuestion[]
  ): Promise<void> {
    console.info('Storing question generation', {
      generationId,
      count: questions.length,
      tenantId: request.tenantId,
    });
  }
}
