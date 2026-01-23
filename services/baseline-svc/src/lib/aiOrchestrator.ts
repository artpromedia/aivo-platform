import { config } from '../config.js';
import { questionAnalyticsService } from '../services/question-analytics.service.js';
import { questionGeneratorService } from '../services/question-generator.service.js';
import type {
  BaselineQuestionGenerationPayload,
  GeneratedQuestion,
  GradeBand,
  ScoreResponsePayload,
  ScoreResponseResult,
} from '../types/baseline.js';
import type { DifficultyLevel } from '../types/questions.types.js';

/**
 * Check if we're running in production mode
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Map difficulty level (1-5) to DifficultyLevel type
 */
function mapDifficultyLevel(difficulty: number): DifficultyLevel {
  if (difficulty <= 2) return 'foundational';
  if (difficulty <= 3) return 'grade-level';
  return 'challenging';
}

/**
 * Map numeric grade to grade level
 */
function gradeBandToGradeLevel(gradeBand: GradeBand): number {
  switch (gradeBand) {
    case 'K5':
      return 3; // Middle of K-5
    case 'G6_8':
      return 7; // Middle of 6-8
    case 'G9_12':
      return 10; // Middle of 9-12
    default:
      return 6;
  }
}

/**
 * Calls ai-orchestrator to generate baseline questions.
 *
 * Uses the QuestionGeneratorService with robust fallback chain:
 * 1. AI-powered generation via ai-orchestrator
 * 2. Curated question bank (educationally validated)
 * 3. Static validated questions (emergency fallback)
 *
 * Supports adaptive difficulty level (1-5 scale).
 */
export async function generateBaselineQuestions(
  payload: BaselineQuestionGenerationPayload
): Promise<GeneratedQuestion[]> {
  const { tenantId, learnerId, gradeBand, domain, skillCodes, difficulty = 3 } = payload;

  const startTime = Date.now();

  try {
    // Use the new question generator service with full fallback chain
    const response = await questionGeneratorService.generateQuestions({
      tenantId,
      learnerId,
      subject: domain,
      gradeLevel: gradeBandToGradeLevel(gradeBand),
      gradeBand,
      topicArea: domain, // Use domain as topic area
      skillCodes,
      difficultyLevel: mapDifficultyLevel(difficulty),
      targetDifficulty: difficulty / 5, // Normalize to 0-1
      questionCount: skillCodes.length,
      questionTypes: ['multiple-choice'], // Default to MC for baseline
    });

    // Record generation analytics
    await questionAnalyticsService.recordGeneration({
      generationId: response.generationId,
      success: true,
      latencyMs: Date.now() - startTime,
      questionCount: response.questions.length,
      qualityScore: response.qualitySummary.averageQuality,
      source:
        response.sourceBreakdown.aiGenerated > 0
          ? 'ai'
          : response.sourceBreakdown.curatedBank > 0
            ? 'curated'
            : 'static',
    });

    // Log warnings if any
    if (response.warnings && response.warnings.length > 0) {
      console.warn('[generateBaselineQuestions] Warnings:', response.warnings);
    }

    // Transform to baseline GeneratedQuestion format
    return response.questions.map((q) => {
      // Handle correctAnswer - can be string id, number index, or array for multi-select
      let correctAnswer: number | string;
      if (Array.isArray(q.correctAnswer)) {
        // For multi-select, take the first answer for baseline format (which only supports single)
        const firstAnswer = q.correctAnswer[0];
        correctAnswer =
          typeof firstAnswer === 'string'
            ? (q.options?.findIndex((opt) => opt.id === firstAnswer) ?? 0)
            : firstAnswer;
      } else if (typeof q.correctAnswer === 'string') {
        correctAnswer = q.options?.findIndex((opt) => opt.id === q.correctAnswer) ?? 0;
      } else {
        correctAnswer = q.correctAnswer;
      }

      return {
        skillCode: q.skillCode,
        questionType: q.type === 'multiple-choice' ? 'MULTIPLE_CHOICE' : 'OPEN_ENDED',
        questionText: q.stem,
        options: q.options?.map((opt) => opt.text),
        correctAnswer,
        rubric: q.explanation,
        difficulty: Math.round(q.difficulty * 5), // Convert 0-1 to 1-5
      };
    });
  } catch (err) {
    // Record failed generation
    await questionAnalyticsService.recordGeneration({
      generationId: `failed-${Date.now()}`,
      success: false,
      latencyMs: Date.now() - startTime,
      questionCount: 0,
      errorType: err instanceof Error ? err.name : 'UnknownError',
      source: 'ai',
    });

    // In production, this is a critical failure - all fallbacks exhausted
    if (isProduction) {
      throw new Error(
        `[PRODUCTION ERROR] Question generation failed after all fallbacks: ${err instanceof Error ? err.message : 'Unknown error'}. ` +
          'This should never happen with curated question bank available.'
      );
    }

    console.error('[generateBaselineQuestions] All fallbacks failed:', err);
    throw err;
  }
}

// Difficulty level descriptions are now handled by QuestionGeneratorService

// ═══════════════════════════════════════════════════════════════════════════════
// STUB QUESTIONS REMOVED
// ═══════════════════════════════════════════════════════════════════════════════
// The generateStubQuestions function has been removed as part of Sprint 1.5.
// Question generation now uses the QuestionGeneratorService with a robust
// fallback chain:
//   1. AI-powered generation via ai-orchestrator
//   2. Curated question bank (educationally validated)
//   3. Static validated questions (emergency fallback)
//
// This ensures production-ready, educationally valid assessment items.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scores a learner response against the correct answer.
 * For multiple-choice: exact match.
 * For open-ended: AI-powered semantic scoring using rubric.
 */
export async function scoreResponse(payload: ScoreResponsePayload): Promise<ScoreResponseResult> {
  const {
    questionType,
    correctAnswer,
    selectedOption,
    openResponse,
    rubric,
    skillCode,
    gradeBand,
  } = payload;

  if (questionType === 'MULTIPLE_CHOICE') {
    const isCorrect = correctAnswer === selectedOption;
    return { isCorrect, partialCredit: null };
  }

  // Open-ended: AI-powered semantic scoring
  return scoreOpenEndedResponse({
    openResponse: openResponse ?? '',
    rubric: rubric ?? '',
    sampleAnswer: typeof correctAnswer === 'string' ? correctAnswer : '',
    skillCode: skillCode ?? '',
    gradeBand: gradeBand ?? 'G6_8',
  });
}

/**
 * Score an open-ended response using AI semantic evaluation.
 */
async function scoreOpenEndedResponse(params: {
  openResponse: string;
  rubric: string;
  sampleAnswer: string;
  skillCode: string;
  gradeBand: string;
}): Promise<ScoreResponseResult> {
  const { openResponse, rubric, sampleAnswer, skillCode, gradeBand } = params;

  // Empty response = 0 credit
  if (!openResponse || openResponse.trim().length === 0) {
    return { isCorrect: false, partialCredit: 0 };
  }

  // Try AI orchestrator for semantic scoring
  if (config.aiOrchestratorUrl && config.aiOrchestratorApiKey) {
    try {
      const res = await fetch(`${config.aiOrchestratorUrl}/internal/ai/baseline/score-open-ended`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': config.aiOrchestratorApiKey,
        },
        body: JSON.stringify({
          agentType: 'BASELINE_SCORER',
          payload: {
            learnerResponse: openResponse,
            rubric,
            sampleAnswer,
            skillCode,
            gradeBand,
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          score: number; // 0-1 scale
          feedback?: string;
          rubricCriteriaMet?: string[];
        };

        return {
          isCorrect: data.score >= 0.8,
          partialCredit: data.score,
          feedback: data.feedback,
        };
      }
    } catch (err) {
      console.warn('AI scoring failed, falling back to heuristic', err);
    }
  }

  // Heuristic fallback: basic keyword/length analysis
  return scoreOpenEndedHeuristic(openResponse, sampleAnswer, rubric);
}

/**
 * Heuristic scoring for open-ended responses when AI is unavailable.
 * Uses keyword matching and response quality indicators.
 */
function scoreOpenEndedHeuristic(
  response: string,
  sampleAnswer: string,
  rubric: string
): ScoreResponseResult {
  const normalizedResponse = response.toLowerCase().trim();
  const normalizedSample = sampleAnswer.toLowerCase().trim();
  const normalizedRubric = rubric.toLowerCase();

  let score = 0;
  const maxScore = 1.0;

  // Length check (meaningful response)
  if (normalizedResponse.length >= 20) score += 0.1;
  if (normalizedResponse.length >= 50) score += 0.1;
  if (normalizedResponse.length >= 100) score += 0.1;

  // Extract key concepts from sample answer and rubric
  const keyWords = extractKeywords(normalizedSample + ' ' + normalizedRubric);

  // Check for keyword matches
  let matchedKeywords = 0;
  for (const keyword of keyWords) {
    if (normalizedResponse.includes(keyword)) {
      matchedKeywords++;
    }
  }

  // Keyword match ratio contributes up to 0.5
  if (keyWords.length > 0) {
    const keywordScore = (matchedKeywords / keyWords.length) * 0.5;
    score += keywordScore;
  }

  // Completeness: complete sentences
  const hasPunctuation = /[.!?]/.test(response);
  if (hasPunctuation) score += 0.1;

  // Capitalization (proper writing)
  const startsWithCapital = /^[A-Z]/.test(response);
  if (startsWithCapital) score += 0.1;

  // Cap at maxScore
  score = Math.min(score, maxScore);

  return {
    isCorrect: score >= 0.7,
    partialCredit: Math.round(score * 100) / 100,
  };
}

/**
 * Extract meaningful keywords from text for matching.
 */
function extractKeywords(text: string): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'a',
    'an',
    'the',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'must',
    'shall',
    'can',
    'need',
    'to',
    'of',
    'in',
    'for',
    'on',
    'with',
    'at',
    'by',
    'from',
    'or',
    'and',
    'but',
    'if',
    'then',
    'else',
    'when',
    'up',
    'down',
    'out',
    'off',
    'over',
    'under',
    'again',
    'further',
    'once',
    'here',
    'there',
    'all',
    'each',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'no',
    'not',
    'only',
    'same',
    'so',
    'than',
    'too',
    'very',
    'just',
    'that',
    'this',
    'these',
    'those',
    'what',
    'which',
    'who',
    'whom',
    'how',
    'why',
    'where',
    'when',
  ]);

  // Extract words, filter stop words, require length > 3
  const words = text
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Unique words only
  return [...new Set(words)];
}
