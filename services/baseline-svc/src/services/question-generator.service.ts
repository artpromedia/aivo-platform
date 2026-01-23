/**
 * Question Generator Service
 *
 * AI-powered question generation with robust fallback chain.
 * Generates educationally valid, grade-appropriate assessment items.
 *
 * Fallback Chain:
 * 1. AI Generation via ai-orchestrator
 * 2. Curated Question Bank
 * 3. Static Validated Questions (emergency only)
 *
 * @module question-generator.service
 */

import { randomUUID } from 'node:crypto';

import { config } from '../config.js';
import { questionBankRepository } from '../repositories/question-bank.repository.js';
import type { BaselineDomain, GradeBand } from '../types/baseline.js';
import type {
  QuestionGenerationRequest,
  QuestionGenerationResponse,
  GeneratedQuestion,
  QuestionValidationResult,
  QuestionBankQuery,
  IQuestionGeneratorService,
  LearnerAccommodations,
  CognitiveLevel,
  QuestionType,
} from '../types/questions.types.js';
import { validateQuestion, validateQuestions } from '../validators/question.validator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const GENERATION_CONFIG = {
  maxRetries: 3,
  timeoutMs: 30000,
  minQualityScore: 0.7,
  aiEndpoint: '/internal/ai/baseline/generate-questions',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION GENERATOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class QuestionGeneratorService implements IQuestionGeneratorService {
  private generationMetrics = {
    aiSuccess: 0,
    aiFailed: 0,
    curatedFallback: 0,
    staticFallback: 0,
    totalRequests: 0,
  };

  /**
   * Generate questions using AI with fallback chain.
   */
  async generateQuestions(request: QuestionGenerationRequest): Promise<QuestionGenerationResponse> {
    const startTime = Date.now();
    this.generationMetrics.totalRequests++;

    const generationId = randomUUID();
    let questions: GeneratedQuestion[] = [];
    const warnings: string[] = [];
    let aiGenerated = 0;
    let curatedBank = 0;
    let staticFallback = 0;

    // Try AI generation first
    try {
      const aiQuestions = await this.generateWithAI(request);

      // Validate AI-generated questions
      const validated = await this.validateAndFilterQuestions(aiQuestions, request.gradeBand);
      questions = validated.passed;

      if (validated.failed.length > 0) {
        warnings.push(`${validated.failed.length} AI-generated questions failed validation`);
      }

      aiGenerated = questions.length;
      this.generationMetrics.aiSuccess++;

      console.log(`[QuestionGenerator] AI generated ${aiGenerated} valid questions`);
    } catch (error) {
      this.generationMetrics.aiFailed++;
      warnings.push(
        `AI generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.warn('[QuestionGenerator] AI generation failed, using fallback', error);
    }

    // If we don't have enough questions, use curated bank
    const needed = request.questionCount - questions.length;
    if (needed > 0) {
      try {
        const curatedQuestions = await this.getFromQuestionBank({
          domain: request.subject,
          gradeBand: request.gradeBand,
          skillCodes: request.skillCodes,
          count: needed,
          questionTypes: request.questionTypes,
          excludeIds: questions.map((q) => q.id),
        });

        // Apply accommodations to curated questions
        const adapted = curatedQuestions.map((q) =>
          this.applyAccommodations(q, request.accommodations)
        );

        questions = [...questions, ...adapted];
        curatedBank = adapted.length;
        this.generationMetrics.curatedFallback++;

        console.log(`[QuestionGenerator] Added ${curatedBank} curated questions`);
      } catch (error) {
        warnings.push(
          `Curated bank retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
        console.warn('[QuestionGenerator] Curated bank failed', error);
      }
    }

    // Last resort: static fallback questions
    const stillNeeded = request.questionCount - questions.length;
    if (stillNeeded > 0) {
      const staticQuestions = this.generateStaticFallback(request, stillNeeded);
      questions = [...questions, ...staticQuestions];
      staticFallback = staticQuestions.length;
      this.generationMetrics.staticFallback++;

      warnings.push(`Used ${staticFallback} static fallback questions`);
      console.warn(`[QuestionGenerator] Used ${staticFallback} static fallback questions`);
    }

    // Calculate quality summary
    const qualitySummary = this.calculateQualitySummary(questions);

    // Track accommodations applied
    const accommodationsApplied = request.accommodations
      ? (Object.keys(request.accommodations).filter(
          (key) => request.accommodations![key as keyof LearnerAccommodations]
        ) as (keyof LearnerAccommodations)[])
      : [];

    // Mark questions as used
    if (request.learnerId) {
      questionBankRepository.markAsUsed(
        request.learnerId,
        questions.map((q) => q.id)
      );
    }

    const generatedAt = new Date().toISOString();
    const latencyMs = Date.now() - startTime;

    console.log(
      `[QuestionGenerator] Completed in ${latencyMs}ms: ` +
        `AI=${aiGenerated}, Curated=${curatedBank}, Static=${staticFallback}`
    );

    return {
      questions,
      generationId,
      generatedAt,
      qualitySummary,
      sourceBreakdown: {
        aiGenerated,
        curatedBank,
        staticFallback,
      },
      accommodationsApplied,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Validate a question against educational standards.
   */
  async validateQuestion(question: GeneratedQuestion): Promise<QuestionValidationResult> {
    return validateQuestion(question);
  }

  /**
   * Get questions from curated bank.
   */
  async getFromQuestionBank(query: QuestionBankQuery): Promise<GeneratedQuestion[]> {
    return questionBankRepository.queryQuestions(query);
  }

  /**
   * Invalidate cached questions for regeneration.
   */
  async invalidateCache(key: string): Promise<void> {
    // Clear recently used for learner
    questionBankRepository.clearRecentlyUsed(key);
    console.log(`[QuestionGenerator] Cache invalidated for: ${key}`);
  }

  /**
   * Get generation metrics for monitoring.
   */
  getMetrics(): typeof this.generationMetrics {
    return { ...this.generationMetrics };
  }

  /**
   * Reset generation metrics.
   */
  resetMetrics(): void {
    this.generationMetrics = {
      aiSuccess: 0,
      aiFailed: 0,
      curatedFallback: 0,
      staticFallback: 0,
      totalRequests: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE: AI GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate questions using AI orchestrator.
   */
  private async generateWithAI(request: QuestionGenerationRequest): Promise<GeneratedQuestion[]> {
    if (!config.aiOrchestratorUrl || !config.aiOrchestratorApiKey) {
      throw new Error('AI orchestrator not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, GENERATION_CONFIG.timeoutMs);

    try {
      const response = await fetch(`${config.aiOrchestratorUrl}${GENERATION_CONFIG.aiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': config.aiOrchestratorApiKey,
        },
        body: JSON.stringify({
          tenantId: request.tenantId,
          learnerId: request.learnerId,
          agentType: 'QUESTION_GENERATOR',
          payload: {
            subject: request.subject,
            gradeLevel: request.gradeLevel,
            gradeBand: request.gradeBand,
            topicArea: request.topicArea,
            skillCodes: request.skillCodes,
            difficultyLevel: request.difficultyLevel,
            targetDifficulty: request.targetDifficulty,
            questionCount: request.questionCount,
            questionTypes: request.questionTypes,
            previousResponses: request.previousResponses,
            currentAbilityEstimate: request.currentAbilityEstimate,
            accommodations: request.accommodations,
            standardsContext: request.standardsContext,
            preferences: request.preferences,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI orchestrator returned ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as { questions: GeneratedQuestion[] };

      // Transform and validate
      return data.questions.map((q, index) => this.normalizeAIQuestion(q, request, index));
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Normalize AI-generated question to standard format.
   */
  private normalizeAIQuestion(
    question: Partial<GeneratedQuestion>,
    request: QuestionGenerationRequest,
    index: number
  ): GeneratedQuestion {
    const id = question.id || `ai-${request.gradeBand}-${request.subject}-${Date.now()}-${index}`;

    return {
      id,
      skillCode: question.skillCode || request.skillCodes[index % request.skillCodes.length],
      type: question.type || 'multiple-choice',
      stem: question.stem || '',
      passage: question.passage,
      instructions: question.instructions,
      visuals: question.visuals,
      options: question.options?.map((opt, i) => ({
        id: opt.id || String.fromCharCode(65 + i), // A, B, C, D
        text: opt.text,
        isCorrect: opt.isCorrect,
        rationale: opt.rationale,
        distractorType: opt.distractorType,
      })),
      matchingPairs: question.matchingPairs,
      orderingItems: question.orderingItems,
      correctAnswer:
        question.correctAnswer || (question.options?.findIndex((o) => o.isCorrect) ?? 0),
      acceptableAnswers: question.acceptableAnswers,
      explanation: question.explanation || 'Correct answer explanation.',
      misconceptions: question.misconceptions,
      hints: question.hints,
      standardsAlignment: question.standardsAlignment || [],
      difficulty: question.difficulty ?? 0.5,
      cognitiveLevel: question.cognitiveLevel || 'understand',
      metadata: {
        source: 'ai-generated',
        generatedAt: new Date().toISOString(),
        generationModel: question.metadata?.generationModel,
        readingLevel:
          question.metadata?.readingLevel ?? this.getDefaultReadingLevel(request.gradeBand),
        wordCount: question.stem?.split(/\s+/).length ?? 0,
        estimatedTimeSeconds: question.metadata?.estimatedTimeSeconds ?? 30,
        contentRiskLevel: 'safe',
        ...question.metadata,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE: VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Validate questions and separate passed/failed.
   */
  private async validateAndFilterQuestions(
    questions: GeneratedQuestion[],
    gradeBand: GradeBand
  ): Promise<{ passed: GeneratedQuestion[]; failed: GeneratedQuestion[] }> {
    const results = validateQuestions(questions, gradeBand);

    const passed: GeneratedQuestion[] = [];
    const failed: GeneratedQuestion[] = [];

    for (let i = 0; i < questions.length; i++) {
      const result = results.results[i];
      if (result.isValid && result.overallScore >= GENERATION_CONFIG.minQualityScore) {
        passed.push(questions[i]);
      } else {
        failed.push(questions[i]);
      }
    }

    return { passed, failed };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE: ACCOMMODATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Apply learner accommodations to question format.
   */
  private applyAccommodations(
    question: GeneratedQuestion,
    accommodations?: LearnerAccommodations
  ): GeneratedQuestion {
    if (!accommodations) return question;

    const modified = { ...question };

    // Reduced options: convert 4-option to 3-option MC
    if (accommodations.reducedOptions && modified.options && modified.options.length > 3) {
      // Keep correct answer and 2 best distractors
      const correct = modified.options.find((o) => o.isCorrect);
      const distractors = modified.options.filter((o) => !o.isCorrect).slice(0, 2);

      if (correct) {
        modified.options = [correct, ...distractors]
          .sort(() => Math.random() - 0.5)
          .map((o, i) => ({ ...o, id: String.fromCharCode(65 + i) }));
      }
    }

    // Simplified language: add note to metadata
    if (accommodations.simplifiedLanguage) {
      modified.metadata = {
        ...modified.metadata,
        contentFlags: [...(modified.metadata.contentFlags || []), 'simplified-language-requested'],
      };
    }

    // Visual supports: ensure alt text is present
    if (accommodations.visualSupports && modified.visuals) {
      modified.visuals = modified.visuals.map((v) => ({
        ...v,
        altText: v.altText || 'Visual support for this question',
      }));
    }

    // Screen reader optimization: ensure proper structure
    if (accommodations.screenReaderOptimized) {
      modified.instructions = modified.instructions
        ? `Screen Reader Note: ${modified.instructions}`
        : 'Use arrow keys to navigate options. Press Enter to select.';
    }

    return modified;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE: STATIC FALLBACK
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate static fallback questions (last resort).
   */
  private generateStaticFallback(
    request: QuestionGenerationRequest,
    count: number
  ): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];
    const skillCodes = request.skillCodes;

    for (let i = 0; i < count; i++) {
      const skillCode = skillCodes[i % skillCodes.length];
      const id = `static-${request.gradeBand}-${request.subject}-${Date.now()}-${i}`;

      questions.push({
        id,
        skillCode,
        type: 'multiple-choice',
        stem: this.generateFallbackStem(request.subject, skillCode, request.gradeBand),
        options: [
          { id: 'A', text: 'First answer choice', isCorrect: true },
          { id: 'B', text: 'Second answer choice', isCorrect: false },
          { id: 'C', text: 'Third answer choice', isCorrect: false },
          { id: 'D', text: 'Fourth answer choice', isCorrect: false },
        ],
        correctAnswer: 'A',
        explanation: 'This is a fallback question. The first option is correct.',
        standardsAlignment: [`${request.subject}.FALLBACK.1`],
        difficulty: this.getDifficultyValue(request.difficultyLevel),
        cognitiveLevel: 'understand',
        metadata: {
          source: 'static-fallback',
          generatedAt: new Date().toISOString(),
          readingLevel: this.getDefaultReadingLevel(request.gradeBand),
          wordCount: 10,
          estimatedTimeSeconds: 30,
          contentRiskLevel: 'safe',
          contentFlags: ['static-fallback'],
        },
      });
    }

    return questions;
  }

  /**
   * Generate meaningful fallback stem based on domain and skill.
   */
  private generateFallbackStem(
    domain: BaselineDomain,
    skillCode: string,
    _gradeBand: GradeBand
  ): string {
    const stems: Record<BaselineDomain, Record<string, string>> = {
      MATH: {
        MATH_NUMBER_SENSE: 'Which number correctly completes this sequence?',
        MATH_OPERATIONS: 'Solve the following problem.',
        MATH_FRACTIONS: 'Which fraction is equivalent to the given value?',
        MATH_GEOMETRY: 'Identify the correct geometric property.',
        MATH_PROBLEM_SOLVING: 'Read the problem and select the best solution.',
      },
      ELA: {
        ELA_PHONEMIC_AWARENESS: 'Which word has the same beginning sound?',
        ELA_FLUENCY: 'Read the passage and answer the question.',
        ELA_VOCABULARY: 'What does the underlined word mean in this sentence?',
        ELA_COMPREHENSION: 'Based on the passage, which statement is true?',
        ELA_WRITING: 'Which sentence is written correctly?',
      },
      SCIENCE: {
        SCI_OBSERVATION: 'Based on the observation, what can you conclude?',
        SCI_HYPOTHESIS: 'Which is the best hypothesis for this experiment?',
        SCI_EXPERIMENT: 'What is the correct procedure for this experiment?',
        SCI_DATA: 'What does the data show?',
        SCI_CONCLUSION: 'What conclusion can be drawn from the results?',
      },
      SPEECH: {
        SPEECH_ARTICULATION: 'Select the word with the correct pronunciation.',
        SPEECH_FLUENCY: 'Which sentence demonstrates proper fluency?',
        SPEECH_VOICE: 'Identify the appropriate voice quality for this context.',
        SPEECH_LANGUAGE: 'Which response uses correct language structure?',
        SPEECH_PRAGMATICS: 'What is the most appropriate response in this situation?',
      },
      SEL: {
        SEL_SELF_AWARENESS: 'How would you describe this feeling?',
        SEL_SELF_MANAGEMENT: 'What is the best way to handle this situation?',
        SEL_SOCIAL_AWARENESS: 'How might the other person be feeling?',
        SEL_RELATIONSHIPS: 'What would be a good way to respond to this friend?',
        SEL_DECISIONS: 'What is the most responsible choice in this situation?',
      },
    };

    return stems[domain]?.[skillCode] || `Select the best answer for this ${domain} question.`;
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE: HELPERS
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Calculate quality summary for response.
   */
  private calculateQualitySummary(questions: GeneratedQuestion[]) {
    const cognitiveDistribution: Record<CognitiveLevel, number> = {
      remember: 0,
      understand: 0,
      apply: 0,
      analyze: 0,
      evaluate: 0,
      create: 0,
    };

    const typeDistribution: Record<QuestionType, number> = {
      'multiple-choice': 0,
      'multiple-select': 0,
      'short-answer': 0,
      matching: 0,
      ordering: 0,
      'fill-blank': 0,
      'true-false': 0,
      'constructed-response': 0,
    };

    let totalDifficulty = 0;
    let totalQuality = 0;
    let passedValidation = 0;
    let failedValidation = 0;

    for (const q of questions) {
      cognitiveDistribution[q.cognitiveLevel]++;
      typeDistribution[q.type]++;
      totalDifficulty += q.difficulty;
      totalQuality += q.metadata.qualityScore ?? 0.8;

      const validation = validateQuestion(q);
      if (validation.isValid) {
        passedValidation++;
      } else {
        failedValidation++;
      }
    }

    const count = questions.length || 1;

    return {
      averageQuality: Math.round((totalQuality / count) * 100) / 100,
      averageDifficulty: Math.round((totalDifficulty / count) * 100) / 100,
      cognitiveDistribution,
      typeDistribution,
      questionsPassedValidation: passedValidation,
      questionsFailedValidation: failedValidation,
    };
  }

  /**
   * Get default reading level for grade band.
   */
  private getDefaultReadingLevel(gradeBand: GradeBand): number {
    const levels: Record<GradeBand, number> = {
      K5: 3,
      G6_8: 7,
      G9_12: 10,
    };
    return levels[gradeBand] ?? 6;
  }

  /**
   * Convert difficulty level to numeric value.
   */
  private getDifficultyValue(level: 'foundational' | 'grade-level' | 'challenging'): number {
    const values = {
      foundational: 0.3,
      'grade-level': 0.5,
      challenging: 0.75,
    };
    return values[level] ?? 0.5;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const questionGeneratorService = new QuestionGeneratorService();

export default questionGeneratorService;
