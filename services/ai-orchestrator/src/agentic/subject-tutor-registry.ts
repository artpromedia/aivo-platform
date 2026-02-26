/**
 * Subject Tutor Agent Registry (Sprint 2)
 *
 * Registers premium subject-specific tutor agents with the multi-agent
 * orchestrator. Each entry maps to a persona-driven tutor with its own
 * teaching strategies, domain knowledge, and capabilities.
 *
 * Naming convention: TUTOR_{SUBJECT}_PREMIUM
 */

import type { AgentCapability } from './multi-agent-orchestrator.js';

/**
 * Premium tutor agent types
 */
export type TutorPremiumAgentType =
  | 'TUTOR_MATH_PREMIUM'
  | 'TUTOR_ELA_PREMIUM'
  | 'TUTOR_SCIENCE_PREMIUM'
  | 'TUTOR_HISTORY_PREMIUM'
  | 'TUTOR_CODING_PREMIUM';

/**
 * Registry of premium subject tutor agent capabilities
 */
export const TUTOR_PREMIUM_REGISTRY: Record<TutorPremiumAgentType, AgentCapability> = {
  TUTOR_MATH_PREMIUM: {
    type: 'TUTOR_MATH_PREMIUM' as AgentCapability['type'],
    name: 'Nova - Math Tutor (Premium)',
    description: 'Premium persona-driven math tutor with adaptive teaching, Socratic method, and mastery-aware scaffolding',
    capabilities: [
      'math-explanation',
      'problem-solving',
      'step-by-step-guidance',
      'math-visualization',
      'arithmetic',
      'algebra',
      'geometry',
      'fractions',
      'adaptive-difficulty',
      'mastery-tracking',
      'voice-responses',
    ],
    inputTypes: ['math-question', 'math-problem', 'math-concept', 'homework-help'],
    outputTypes: ['guided-explanation', 'practice-problem', 'encouragement', 'socratic-question'],
    priority: 1,
    maxConcurrentTasks: 1,
  },

  TUTOR_ELA_PREMIUM: {
    type: 'TUTOR_ELA_PREMIUM' as AgentCapability['type'],
    name: 'Sage - ELA Tutor (Premium)',
    description: 'Premium persona-driven ELA tutor with storytelling approach, reading comprehension, and creative writing guidance',
    capabilities: [
      'reading-comprehension',
      'writing-guidance',
      'grammar-help',
      'vocabulary-building',
      'creative-writing',
      'essay-structure',
      'literary-analysis',
      'adaptive-difficulty',
      'mastery-tracking',
      'voice-responses',
    ],
    inputTypes: ['reading-question', 'writing-help', 'grammar-question', 'vocabulary-help'],
    outputTypes: ['guided-explanation', 'writing-feedback', 'reading-guide', 'socratic-question'],
    priority: 1,
    maxConcurrentTasks: 1,
  },

  TUTOR_SCIENCE_PREMIUM: {
    type: 'TUTOR_SCIENCE_PREMIUM' as AgentCapability['type'],
    name: 'Spark - Science Tutor (Premium)',
    description: 'Premium persona-driven science tutor with inquiry-based learning, experiment design, and hypothesis testing',
    capabilities: [
      'science-explanation',
      'experiment-design',
      'hypothesis-testing',
      'biology',
      'chemistry',
      'physics',
      'earth-science',
      'scientific-method',
      'adaptive-difficulty',
      'mastery-tracking',
      'voice-responses',
    ],
    inputTypes: ['science-question', 'experiment-help', 'science-concept', 'observation-question'],
    outputTypes: ['guided-explanation', 'experiment-guide', 'observation-prompt', 'socratic-question'],
    priority: 1,
    maxConcurrentTasks: 1,
  },

  TUTOR_HISTORY_PREMIUM: {
    type: 'TUTOR_HISTORY_PREMIUM' as AgentCapability['type'],
    name: 'Chrono - History Tutor (Premium)',
    description: 'Premium persona-driven history tutor with time-travel narrative, primary source analysis, and critical thinking',
    capabilities: [
      'historical-explanation',
      'primary-source-analysis',
      'cause-effect',
      'timeline-building',
      'cultural-context',
      'critical-thinking',
      'adaptive-difficulty',
      'mastery-tracking',
      'voice-responses',
    ],
    inputTypes: ['history-question', 'event-analysis', 'primary-source', 'timeline-help'],
    outputTypes: ['narrative', 'analysis-guide', 'timeline', 'socratic-question'],
    priority: 1,
    maxConcurrentTasks: 1,
  },

  TUTOR_CODING_PREMIUM: {
    type: 'TUTOR_CODING_PREMIUM' as AgentCapability['type'],
    name: 'Pixel - Coding Tutor (Premium)',
    description: 'Premium persona-driven coding tutor with pair-programming guidance, debugging help, and project-based learning',
    capabilities: [
      'code-explanation',
      'debugging-help',
      'algorithm-design',
      'pseudocode',
      'project-guidance',
      'computational-thinking',
      'code-review',
      'adaptive-difficulty',
      'mastery-tracking',
      'voice-responses',
    ],
    inputTypes: ['code-question', 'debug-help', 'project-help', 'algorithm-question'],
    outputTypes: ['guided-explanation', 'code-review', 'project-step', 'socratic-question'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
};

/**
 * Map a subject string to a premium tutor agent type
 */
export function getTutorPremiumType(subject: string): TutorPremiumAgentType | null {
  const map: Record<string, TutorPremiumAgentType> = {
    MATH: 'TUTOR_MATH_PREMIUM',
    ELA: 'TUTOR_ELA_PREMIUM',
    SCIENCE: 'TUTOR_SCIENCE_PREMIUM',
    HISTORY: 'TUTOR_HISTORY_PREMIUM',
    CODING: 'TUTOR_CODING_PREMIUM',
  };
  return map[subject.toUpperCase()] ?? null;
}

/**
 * Get the subject from a premium tutor agent type
 */
export function getSubjectFromPremiumType(type: TutorPremiumAgentType): string {
  const map: Record<TutorPremiumAgentType, string> = {
    TUTOR_MATH_PREMIUM: 'MATH',
    TUTOR_ELA_PREMIUM: 'ELA',
    TUTOR_SCIENCE_PREMIUM: 'SCIENCE',
    TUTOR_HISTORY_PREMIUM: 'HISTORY',
    TUTOR_CODING_PREMIUM: 'CODING',
  };
  return map[type];
}
