import { config } from '../config.js';
import type {
  BaselineQuestionGenerationPayload,
  GeneratedQuestion,
  ScoreResponsePayload,
  ScoreResponseResult,
} from '../types/baseline.js';

/**
 * Calls ai-orchestrator to generate baseline questions.
 * Falls back to deterministic stubs if orchestrator is unavailable.
 * Supports adaptive difficulty level (1-5 scale).
 */
export async function generateBaselineQuestions(
  payload: BaselineQuestionGenerationPayload
): Promise<GeneratedQuestion[]> {
  const { tenantId, learnerId, gradeBand, domain, skillCodes, difficulty = 3 } = payload;

  // Try real orchestrator first
  if (config.aiOrchestratorUrl && config.aiOrchestratorApiKey) {
    try {
      const res = await fetch(`${config.aiOrchestratorUrl}/internal/ai/baseline/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': config.aiOrchestratorApiKey,
        },
        body: JSON.stringify({
          tenantId,
          learnerId,
          agentType: 'BASELINE',
          payload: {
            gradeBand,
            domain,
            skillCodes,
            difficulty,  // Include adaptive difficulty
          },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { questions: GeneratedQuestion[] };
        // Ensure difficulty is set on all questions
        return data.questions.map((q) => ({ ...q, difficulty: q.difficulty ?? difficulty }));
      }
      console.warn('AI orchestrator returned non-OK, falling back to stubs');
    } catch (err) {
      console.warn('AI orchestrator unreachable, falling back to stubs', err);
    }
  }

  // Deterministic fallback: generate stub questions
  return generateStubQuestions(gradeBand, domain, skillCodes, difficulty);
}

/**
 * Difficulty level descriptions for adaptive question generation
 */
const DIFFICULTY_LABELS = {
  1: 'very easy',
  2: 'easy',
  3: 'medium',
  4: 'hard',
  5: 'very hard',
};

function generateStubQuestions(
  gradeBand: string,
  domain: string,
  skillCodes: string[],
  difficulty: number = 3
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const difficultyLabel = DIFFICULTY_LABELS[difficulty as keyof typeof DIFFICULTY_LABELS] || 'medium';

  for (const skillCode of skillCodes) {
    questions.push({
      skillCode,
      questionType: 'MULTIPLE_CHOICE',
      questionText: `[Stub ${difficultyLabel}] ${domain} question for skill ${skillCode} (grade band ${gradeBand})`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0, // Option A is correct
      difficulty,
    });
  }

  return questions;
}

/**
 * Scores a learner response against the correct answer.
 * For multiple-choice: exact match.
 * For open-ended: AI-powered semantic scoring using rubric.
 */
export async function scoreResponse(payload: ScoreResponsePayload): Promise<ScoreResponseResult> {
  const { questionType, correctAnswer, selectedOption, openResponse, rubric, skillCode, gradeBand } = payload;

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
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'or', 'and', 'but',
    'if', 'then', 'else', 'when', 'up', 'down', 'out', 'off', 'over',
    'under', 'again', 'further', 'once', 'here', 'there', 'all', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only',
    'same', 'so', 'than', 'too', 'very', 'just', 'that', 'this', 'these',
    'those', 'what', 'which', 'who', 'whom', 'how', 'why', 'where', 'when',
  ]);

  // Extract words, filter stop words, require length > 3
  const words = text
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word));

  // Unique words only
  return [...new Set(words)];
}
