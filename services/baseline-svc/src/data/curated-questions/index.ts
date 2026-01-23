/**
 * Curated Questions Index
 *
 * Aggregates all curated questions and provides unified access.
 *
 * @module curated-questions/index
 */

import type { BaselineDomain, GradeBand } from '../../types/baseline.js';
import type { GeneratedQuestion } from '../../types/questions.types.js';

import { getELAQuestions, getELAQuestionsBySkill } from './ela.js';
import { getMathQuestions, getMathQuestionsBySkill } from './math.js';

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
      // TODO: Add Science curated questions
      return getPlaceholderQuestions(domain, gradeBand, 'SCI_OBSERVATION');
    case 'SPEECH':
      // TODO: Add Speech curated questions
      return getPlaceholderQuestions(domain, gradeBand, 'SPEECH_ARTICULATION');
    case 'SEL':
      // TODO: Add SEL curated questions
      return getPlaceholderQuestions(domain, gradeBand, 'SEL_SELF_AWARENESS');
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
