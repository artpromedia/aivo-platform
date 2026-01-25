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

// ═══════════════════════════════════════════════════════════════════════════════
// SPRINT 3 & 4: OPTIMIZED GENERATION CONFIG
// Reduced timeout from 30s to 12s per domain (SLA target: 2-15s total)
// Added retryDelayMs for transient failure recovery
// ═══════════════════════════════════════════════════════════════════════════════
const GENERATION_CONFIG = {
  maxRetries: 2, // Reduced from 3 - faster fallback
  timeoutMs: 12000, // Reduced from 30000 - SLA: 2-15s for entire flow
  retryDelayMs: 500, // Quick retry for transient failures
  minQualityScore: 0.7,
  aiEndpoint: '/internal/ai/baseline/generate-questions',
  // Fallback behavior control
  preferAIGeneration: true, // When true, retry AI before curated fallback
  curatedFallbackThreshold: 0.5, // Min ratio of questions from AI before curated kicks in
} as const;

/**
 * Check if dev mode is enabled.
 * In dev mode, AI generation is skipped and questions come from the curated bank.
 */
function isDevModeEnabled(): boolean {
  // Force AI overrides dev mode
  if (config.forceAI) {
    return false;
  }
  return config.devMode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUESTION GENERATOR SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class QuestionGeneratorService implements IQuestionGeneratorService {
  private generationMetrics = {
    aiSuccess: 0,
    aiFailed: 0,
    curatedFallback: 0,
    staticFallback: 0,
    devModeHits: 0,
    totalRequests: 0,
  };

  /**
   * Generate questions using AI with fallback chain.
   *
   * SPRINT 1 & 4: Improved fallback logic
   * - AI generation is ALWAYS attempted first (learner-specific baseline)
   * - Curated bank used only when AI partially fails
   * - Static fallback is EXPLICIT last resort with clear warnings
   *
   * SPRINT 5: Enhanced observability
   * - Detailed timing metrics
   * - Source tracking for each question
   * - Clear warning messages
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

    // SPRINT 5: Track generation source for each question
    const generationContext = {
      domain: request.subject,
      learnerId: request.learnerId,
      hasParentContext: !!(request.assessmentType || request.hasIep || request.areasOfConcern?.length),
      hasIepData: !!(request.iepGoals?.length || request.iepAccommodations?.length),
    };

    console.log(`[QuestionGenerator] Starting generation for ${request.subject}`, generationContext);

    // ═══════════════════════════════════════════════════════════════════════════════
    // DEV MODE: Skip AI generation and use curated question bank
    // This provides fast question retrieval during local development when Ollama is slow
    // ═══════════════════════════════════════════════════════════════════════════════

    const devModeEnabled = isDevModeEnabled();
    let aiAttempted = false;
    let aiError: Error | null = null;

    if (devModeEnabled) {
      console.log(`[QuestionGenerator] DEV MODE: Skipping AI generation, using curated question bank for ${request.subject}`);
      warnings.push('DEV MODE: Questions served from curated bank (AI generation skipped)');
      this.generationMetrics.devModeHits++;
    } else {
      // ═══════════════════════════════════════════════════════════════════════════════
      // SPRINT 1: AI GENERATION IS MANDATORY PATH (NOT OPTIONAL)
      // Learner-specific baseline questions MUST be generated using AI when:
      // - Parent assessment data is available
      // - IEP document data is available
      // Mock/generic questions are ONLY used as explicit fallback after AI failure
      // ═══════════════════════════════════════════════════════════════════════════════

      const aiStartTime = Date.now();

      try {
        aiAttempted = true;
        const aiQuestions = await this.generateWithAI(request);

        // Validate AI-generated questions
        const validated = await this.validateAndFilterQuestions(aiQuestions, request.gradeBand);
        questions = validated.passed;

        if (validated.failed.length > 0) {
          warnings.push(`${validated.failed.length} AI-generated questions failed validation`);
        }

        aiGenerated = questions.length;
        this.generationMetrics.aiSuccess++;

        const aiDurationMs = Date.now() - aiStartTime;
        console.log(`[QuestionGenerator] AI generated ${aiGenerated} valid questions in ${aiDurationMs}ms for ${request.subject}`);
      } catch (error) {
        aiError = error instanceof Error ? error : new Error(String(error));
        this.generationMetrics.aiFailed++;

        const aiDurationMs = Date.now() - aiStartTime;
        const errorMsg = `AI generation failed after ${aiDurationMs}ms: ${aiError.message}`;
        warnings.push(errorMsg);

        // SPRINT 5: Log detailed failure for debugging
        console.error(`[QuestionGenerator] ${errorMsg}`, {
          domain: request.subject,
          learnerId: request.learnerId,
          hasParentContext: generationContext.hasParentContext,
          hasIepData: generationContext.hasIepData,
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SPRINT 4: CURATED FALLBACK - Only when AI doesn't provide enough questions
    // This is a SUPPLEMENTAL source, not a replacement for AI-generated questions
    // ═══════════════════════════════════════════════════════════════════════════════

    const needed = request.questionCount - questions.length;
    if (needed > 0) {
      const curatedStartTime = Date.now();

      // SPRINT 1: Log that we're falling back to curated (this should be rare)
      if (aiGenerated === 0) {
        console.warn(`[QuestionGenerator] FALLBACK: No AI questions generated for ${request.subject}, using curated bank`);
      } else {
        console.log(`[QuestionGenerator] Supplementing ${aiGenerated} AI questions with ${needed} curated questions for ${request.subject}`);
      }

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

        const curatedDurationMs = Date.now() - curatedStartTime;
        console.log(`[QuestionGenerator] Added ${curatedBank} curated questions in ${curatedDurationMs}ms for ${request.subject}`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        warnings.push(`Curated bank retrieval failed: ${errorMsg}`);
        console.warn('[QuestionGenerator] Curated bank failed for', request.subject, error);
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════════
    // SPRINT 4: STATIC FALLBACK - EXPLICIT LAST RESORT
    // This should RARELY happen in production. If it does frequently, investigate!
    // ═══════════════════════════════════════════════════════════════════════════════

    const stillNeeded = request.questionCount - questions.length;
    if (stillNeeded > 0) {
      // SPRINT 1: This is a CRITICAL fallback - log prominently
      console.warn(`[QuestionGenerator] CRITICAL FALLBACK: Using ${stillNeeded} static questions for ${request.subject}`, {
        aiAttempted,
        aiGenerated,
        curatedBank,
        aiError: aiError?.message,
        domain: request.subject,
        learnerId: request.learnerId,
      });

      const staticQuestions = this.generateStaticFallback(request, stillNeeded);
      questions = [...questions, ...staticQuestions];
      staticFallback = staticQuestions.length;
      this.generationMetrics.staticFallback++;

      // SPRINT 1: Clear warning that static fallback was used
      warnings.push(`FALLBACK: Used ${staticFallback} generic static questions for ${request.subject}. ` +
        `AI generation ${aiAttempted ? 'failed' : 'was not attempted'}. ` +
        `This should be investigated if frequent.`);
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

    // ═══════════════════════════════════════════════════════════════════════════════
    // SPRINT 5: ENHANCED OBSERVABILITY
    // Detailed logging for monitoring, alerting, and debugging
    // ═══════════════════════════════════════════════════════════════════════════════

    // Determine generation quality indicator
    const devModeUsed = isDevModeEnabled();
    const generationQuality =
      devModeUsed && curatedBank >= request.questionCount ? 'DEV_MODE_OK' :
      devModeUsed ? 'DEV_MODE_PARTIAL' :
      aiGenerated === request.questionCount ? 'EXCELLENT' :
      aiGenerated > 0 && staticFallback === 0 ? 'GOOD' :
      staticFallback === 0 ? 'ACCEPTABLE' :
      staticFallback < request.questionCount / 2 ? 'DEGRADED' : 'POOR';

    // SPRINT 5: Structured log for monitoring
    console.log(`[QuestionGenerator] Generation completed`, {
      generationId,
      domain: request.subject,
      learnerId: request.learnerId,
      latencyMs,
      quality: generationQuality,
      devMode: devModeUsed,
      counts: {
        requested: request.questionCount,
        aiGenerated,
        curatedBank,
        staticFallback,
        total: questions.length,
      },
      context: {
        hasParentContext: generationContext.hasParentContext,
        hasIepData: generationContext.hasIepData,
        assessmentType: request.assessmentType || 'STANDARD',
      },
      // SLA check: Target is 2-15s (dev mode is typically much faster)
      slaCompliant: latencyMs <= 15000,
    });

    // SPRINT 5: Emit warning if quality is degraded
    if (generationQuality === 'DEGRADED' || generationQuality === 'POOR') {
      console.warn(`[QuestionGenerator] QUALITY ALERT: ${generationQuality} generation for ${request.subject}`, {
        generationId,
        aiGenerated,
        staticFallback,
        latencyMs,
        warnings,
      });
    }

    // SPRINT 5: Emit warning if SLA violated
    if (latencyMs > 15000) {
      console.warn(`[QuestionGenerator] SLA VIOLATION: Generation took ${latencyMs}ms (target: <15000ms)`, {
        generationId,
        domain: request.subject,
      });
    }

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
      devModeHits: 0,
      totalRequests: 0,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // PRIVATE: AI GENERATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Generate questions using AI orchestrator with retry logic.
   *
   * SPRINT 3 & 4: Added retry mechanism for transient failures
   * - Retries up to maxRetries times with delay
   * - Tracks timing for observability
   * - Logs detailed errors for debugging
   */
  private async generateWithAI(request: QuestionGenerationRequest): Promise<GeneratedQuestion[]> {
    if (!config.aiOrchestratorUrl || !config.aiOrchestratorApiKey) {
      throw new Error('AI orchestrator not configured');
    }

    let lastError: Error | null = null;
    const startTime = Date.now();

    // SPRINT 4: Retry loop for transient failures
    for (let attempt = 1; attempt <= GENERATION_CONFIG.maxRetries; attempt++) {
      const attemptStartTime = Date.now();

      try {
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
              agentType: 'BASELINE',
              payload: {
                subject: request.subject,
                domain: request.subject, // AI orchestrator expects 'domain' not 'subject'
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
                // Parent assessment context for IDEA/504 compliance
                assessmentType: request.assessmentType,
                hasIep: request.hasIep,
                has504: request.has504,
                disabilityCategories: request.disabilityCategories,
                areasOfConcern: request.areasOfConcern,
                // IEP document data for IEP-aligned question generation
                iepGoals: request.iepGoals,
                iepAccommodations: request.iepAccommodations,
                iepServices: request.iepServices,
              },
            }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`AI orchestrator returned ${response.status}: ${response.statusText}`);
          }

          const data = (await response.json()) as { questions: GeneratedQuestion[] };
          const attemptDurationMs = Date.now() - attemptStartTime;

          // SPRINT 5: Log success for observability
          console.log(`[QuestionGenerator] AI generation succeeded on attempt ${attempt}/${GENERATION_CONFIG.maxRetries} in ${attemptDurationMs}ms`);

          // Transform and validate
          return data.questions.map((q, index) => this.normalizeAIQuestion(q, request, index));
        } finally {
          clearTimeout(timeout);
        }
      } catch (error) {
        const attemptDurationMs = Date.now() - attemptStartTime;
        const isTimeoutError = error instanceof Error && error.name === 'AbortError';
        const errorType = isTimeoutError ? 'TIMEOUT' : 'ERROR';

        lastError = error instanceof Error ? error : new Error(String(error));

        // SPRINT 5: Detailed logging for debugging
        console.warn(
          `[QuestionGenerator] AI generation ${errorType} on attempt ${attempt}/${GENERATION_CONFIG.maxRetries} after ${attemptDurationMs}ms:`,
          {
            domain: request.subject,
            learnerId: request.learnerId,
            error: lastError.message,
            isTimeoutError,
            willRetry: attempt < GENERATION_CONFIG.maxRetries,
          }
        );

        // Don't retry on non-transient errors (4xx responses)
        if (lastError.message.includes('returned 4')) {
          console.warn('[QuestionGenerator] Non-retryable error, skipping remaining attempts');
          break;
        }

        // SPRINT 4: Wait before retry (except on last attempt)
        if (attempt < GENERATION_CONFIG.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, GENERATION_CONFIG.retryDelayMs));
        }
      }
    }

    // All retries exhausted
    const totalDurationMs = Date.now() - startTime;
    console.error(`[QuestionGenerator] AI generation failed after ${GENERATION_CONFIG.maxRetries} attempts in ${totalDurationMs}ms`);
    throw lastError || new Error('AI generation failed after all retries');
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
      SPELLING: {
        SPELL_PATTERNS: 'Which word is spelled correctly?',
        SPELL_PHONICS: 'Which spelling follows the correct phonetic pattern?',
        SPELL_RULES: 'Apply the spelling rule to complete the word.',
        SPELL_SIGHT_WORDS: 'Select the correctly spelled sight word.',
        SPELL_COMPOUND: 'Which compound word is spelled correctly?',
      },
      CREATIVE_WRITING: {
        CW_STORY_ELEMENTS: 'Which element best completes this story?',
        CW_CHARACTER: 'How would this character most likely respond?',
        CW_SETTING: 'Which description best fits the setting?',
        CW_DESCRIPTIVE: 'Which sentence uses the most vivid language?',
        CW_IMAGINATION: 'What happens next in this story?',
      },
      LIFE_SKILLS: {
        LIFE_PERSONAL_CARE: 'What is the correct order for this daily routine?',
        LIFE_HOME_LIVING: 'Which is the safest choice in this situation?',
        LIFE_COMMUNITY: 'What should you do in this community setting?',
        LIFE_VOCATIONAL: 'What is the appropriate workplace behavior?',
        LIFE_SELF_DETERMINATION: 'How can you advocate for yourself here?',
      },
      MOTOR: {
        MOTOR_FINE_GRASP: 'Which grip is best for this activity?',
        MOTOR_FINE_MANIPULATION: 'What is the correct hand movement?',
        MOTOR_VISUAL_MOTOR: 'Which picture matches the pattern?',
        MOTOR_GROSS_BALANCE: 'What helps maintain balance in this position?',
        MOTOR_GROSS_COORDINATION: 'What is the correct sequence of movements?',
      },
      EXECUTIVE_FUNCTION: {
        EF_WORKING_MEMORY: 'What was mentioned earlier in the directions?',
        EF_INHIBITION: 'What should you do to stay focused?',
        EF_FLEXIBILITY: 'How can you adapt to this change?',
        EF_PLANNING: 'What is the best order to complete these steps?',
        EF_METACOGNITION: 'What strategy would help you solve this?',
      },
      SENSORY_PROCESSING: {
        SENSORY_MODULATION: 'What helps you feel calm in this situation?',
        SENSORY_DISCRIMINATION: 'Which texture feels different from the others?',
        SENSORY_AWARENESS: 'What sensory input are you experiencing?',
        SENSORY_STRATEGIES: 'Which strategy helps with sensory overload?',
        SENSORY_INTEGRATION: 'How do these senses work together?',
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
