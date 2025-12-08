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
 */
export async function generateBaselineQuestions(
  payload: BaselineQuestionGenerationPayload
): Promise<GeneratedQuestion[]> {
  const { tenantId, learnerId, gradeBand, domain, skillCodes } = payload;

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
          payload: { gradeBand, domain, skillCodes },
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { questions: GeneratedQuestion[] };
        return data.questions;
      }
      console.warn('AI orchestrator returned non-OK, falling back to stubs');
    } catch (err) {
      console.warn('AI orchestrator unreachable, falling back to stubs', err);
    }
  }

  // Deterministic fallback: generate stub questions
  return generateStubQuestions(gradeBand, domain, skillCodes);
}

function generateStubQuestions(
  gradeBand: string,
  domain: string,
  skillCodes: string[]
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];

  for (const skillCode of skillCodes) {
    questions.push({
      skillCode,
      questionType: 'MULTIPLE_CHOICE',
      questionText: `[Stub] ${domain} question for skill ${skillCode} (grade band ${gradeBand})`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0, // Option A is correct
    });
  }

  return questions;
}

/**
 * Scores a learner response against the correct answer.
 * For multiple-choice: exact match. For open-ended: stub logic (always partial credit).
 */
export async function scoreResponse(payload: ScoreResponsePayload): Promise<ScoreResponseResult> {
  const { questionType, correctAnswer, selectedOption, openResponse: _openResponse } = payload;

  if (questionType === 'MULTIPLE_CHOICE') {
    const isCorrect = correctAnswer === selectedOption;
    return { isCorrect, partialCredit: null };
  }

  // Open-ended: stub scoring (partial credit placeholder)
  // Future: call AI orchestrator for semantic scoring using _openResponse
  return {
    isCorrect: false,
    partialCredit: 0.5, // Placeholder partial credit
  };
}
