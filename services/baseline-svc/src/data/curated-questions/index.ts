/**
 * Curated Questions Index
 *
 * Aggregates all curated questions and provides unified access.
 * Supports dev-mode operation where questions are served from the bank
 * instead of calling the LLM (useful when Ollama is slow).
 *
 * @module curated-questions/index
 */

import type { BaselineDomain, GradeBand } from '../../types/baseline.js';
import type { GeneratedQuestion } from '../../types/questions.types.js';

import { getELAQuestions, getELAQuestionsBySkill } from './ela.js';
import { getMathQuestions, getMathQuestionsBySkill } from './math.js';
import { getScienceQuestions, getScienceQuestionsBySkill } from './science.js';
import { getSpeechQuestions, getSpeechQuestionsBySkill } from './speech.js';
import { getSELQuestions, getSELQuestionsBySkill } from './sel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIFIED QUESTION ACCESS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get curated questions for a domain and grade band.
 */
export function getCuratedQuestions(
  domain: BaselineDomain,
  gradeBand: GradeBand
): GeneratedQuestion[] {
  const band = gradeBand as 'K5' | 'G6_8' | 'G9_12';

  switch (domain) {
    case 'MATH':
      return getMathQuestions(band);
    case 'ELA':
      return getELAQuestions(band);
    case 'SCIENCE':
      return getScienceQuestions(band);
    case 'SPEECH':
      return getSpeechQuestions(band);
    case 'SEL':
      return getSELQuestions(band);
    default:
      return [];
  }
}

/**
 * Get curated questions for a specific skill.
 */
export function getCuratedQuestionsBySkill(
  domain: BaselineDomain,
  gradeBand: GradeBand,
  skillCode: string
): GeneratedQuestion[] {
  const band = gradeBand as 'K5' | 'G6_8' | 'G9_12';

  switch (domain) {
    case 'MATH':
      return getMathQuestionsBySkill(band, skillCode);
    case 'ELA':
      return getELAQuestionsBySkill(band, skillCode);
    case 'SCIENCE':
      return getScienceQuestionsBySkill(band, skillCode);
    case 'SPEECH':
      return getSpeechQuestionsBySkill(band, skillCode);
    case 'SEL':
      return getSELQuestionsBySkill(band, skillCode);
    default:
      return getCuratedQuestions(domain, gradeBand).filter((q) => q.skillCode === skillCode);
  }
}

/**
 * Get all curated questions across all domains for a grade band.
 */
export function getAllCuratedQuestions(gradeBand: GradeBand): GeneratedQuestion[] {
  const domains: BaselineDomain[] = ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL'];
  return domains.flatMap((domain) => getCuratedQuestions(domain, gradeBand));
}

/**
 * Count available curated questions by domain.
 */
export function getCuratedQuestionCounts(gradeBand: GradeBand): Record<BaselineDomain, number> {
  return {
    ELA: getCuratedQuestions('ELA', gradeBand).length,
    MATH: getCuratedQuestions('MATH', gradeBand).length,
    SCIENCE: getCuratedQuestions('SCIENCE', gradeBand).length,
    SPEECH: getCuratedQuestions('SPEECH', gradeBand).length,
    SEL: getCuratedQuestions('SEL', gradeBand).length,
    // The following domains don't have curated questions yet - return 0
    SPELLING: 0,
    CREATIVE_WRITING: 0,
    LIFE_SKILLS: 0,
    MOTOR: 0,
    EXECUTIVE_FUNCTION: 0,
    SENSORY_PROCESSING: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLACEHOLDER QUESTIONS (Last Resort Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate placeholder questions for domains without curated content.
 * These are minimal but valid questions for emergency fallback.
 */
function getPlaceholderQuestions(
  domain: BaselineDomain,
  gradeBand: GradeBand,
  skillCode: string
): GeneratedQuestion[] {
  const difficultyByGrade: Record<GradeBand, number> = {
    K5: 0.3,
    G6_8: 0.5,
    G9_12: 0.7,
  };

  return [
    {
      id: `${domain.toLowerCase()}-${gradeBand.toLowerCase()}-placeholder-001`,
      skillCode,
      type: 'multiple-choice',
      stem: `This is a practice question for ${domain}. Select the best answer.`,
      options: [
        { id: 'A', text: 'First option', isCorrect: true },
        { id: 'B', text: 'Second option', isCorrect: false },
        { id: 'C', text: 'Third option', isCorrect: false },
        { id: 'D', text: 'Fourth option', isCorrect: false },
      ],
      correctAnswer: 'A',
      explanation: 'This is a placeholder question. The first option is correct.',
      standardsAlignment: [`${domain}.PLACEHOLDER.1`],
      difficulty: difficultyByGrade[gradeBand],
      cognitiveLevel: 'understand',
      metadata: {
        source: 'static-fallback',
        generatedAt: new Date().toISOString(),
        readingLevel: gradeBand === 'K5' ? 3 : gradeBand === 'G6_8' ? 6 : 9,
        wordCount: 15,
        estimatedTimeSeconds: 30,
        contentRiskLevel: 'safe',
      },
    },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { getMathQuestions, getMathQuestionsBySkill } from './math.js';
export { getELAQuestions, getELAQuestionsBySkill } from './ela.js';
export { getScienceQuestions, getScienceQuestionsBySkill } from './science.js';
export { getSpeechQuestions, getSpeechQuestionsBySkill } from './speech.js';
export { getSELQuestions, getSELQuestionsBySkill } from './sel.js';

// ═══════════════════════════════════════════════════════════════════════════════
// DEV MODE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if we have curated questions available for a domain/grade band.
 * Useful for determining whether to use dev mode.
 */
export function hasCuratedQuestions(domain: BaselineDomain, gradeBand: GradeBand): boolean {
  return getCuratedQuestions(domain, gradeBand).length > 0;
}

/**
 * Get a random subset of curated questions for a domain.
 * Useful for dev mode to simulate realistic assessment behavior.
 */
export function getRandomCuratedQuestions(
  domain: BaselineDomain,
  gradeBand: GradeBand,
  count: number
): GeneratedQuestion[] {
  const questions = getCuratedQuestions(domain, gradeBand);
  if (questions.length <= count) {
    return questions;
  }

  // Fisher-Yates shuffle and take first 'count' items
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

/**
 * Get curated questions for a skill, with fallback to domain questions.
 * In dev mode, if no skill-specific questions exist, returns domain questions.
 */
export function getCuratedQuestionsWithFallback(
  domain: BaselineDomain,
  gradeBand: GradeBand,
  skillCode?: string
): GeneratedQuestion[] {
  if (skillCode) {
    const skillQuestions = getCuratedQuestionsBySkill(domain, gradeBand, skillCode);
    if (skillQuestions.length > 0) {
      return skillQuestions;
    }
  }
  return getCuratedQuestions(domain, gradeBand);
}
