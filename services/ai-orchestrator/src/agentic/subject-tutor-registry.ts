/**
 * Subject Tutor Agent Registry
 *
 * Registers subject-specific tutor agents with the multi-agent orchestrator.
 * Each tutor agent handles a specific academic subject with its own
 * persona, teaching strategies, and domain knowledge.
 */

import type { AgentCapability, SpecialistAgentType } from './multi-agent-orchestrator.js';

/**
 * Extended agent type that includes subject tutors
 */
export type SubjectTutorAgentType =
  | 'SUBJECT_TUTOR_MATH'
  | 'SUBJECT_TUTOR_ELA'
  | 'SUBJECT_TUTOR_SCIENCE'
  | 'SUBJECT_TUTOR_HISTORY'
  | 'SUBJECT_TUTOR_CODING';

/**
 * Registry of subject-specific tutor agent capabilities
 */
export const SUBJECT_TUTOR_REGISTRY: Record<SubjectTutorAgentType, AgentCapability> = {
  SUBJECT_TUTOR_MATH: {
    type: 'TUTOR' as SpecialistAgentType,
    name: 'Nova - Math Tutor',
    description: 'Subject-specific math tutor with space-themed persona',
    capabilities: [
      'math-explanation',
      'problem-solving',
      'step-by-step-guidance',
      'math-visualization',
      'arithmetic',
      'algebra',
      'geometry',
      'fractions',
    ],
    inputTypes: ['math-question', 'math-problem', 'math-concept'],
    outputTypes: ['explanation', 'guided-solution', 'practice-problem'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  SUBJECT_TUTOR_ELA: {
    type: 'TUTOR' as SpecialistAgentType,
    name: 'Sage - ELA Tutor',
    description: 'Subject-specific ELA tutor with storytelling persona',
    capabilities: [
      'reading-comprehension',
      'writing-guidance',
      'grammar-help',
      'vocabulary-building',
      'creative-writing',
      'essay-structure',
    ],
    inputTypes: ['reading-question', 'writing-help', 'grammar-question'],
    outputTypes: ['explanation', 'writing-feedback', 'reading-guide'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  SUBJECT_TUTOR_SCIENCE: {
    type: 'TUTOR' as SpecialistAgentType,
    name: 'Spark - Science Tutor',
    description: 'Subject-specific science tutor with inventor persona',
    capabilities: [
      'science-explanation',
      'experiment-design',
      'hypothesis-testing',
      'biology',
      'chemistry',
      'physics',
      'earth-science',
    ],
    inputTypes: ['science-question', 'experiment-help', 'science-concept'],
    outputTypes: ['explanation', 'experiment-guide', 'observation-prompt'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  SUBJECT_TUTOR_HISTORY: {
    type: 'TUTOR' as SpecialistAgentType,
    name: 'Chrono - History Tutor',
    description: 'Subject-specific history tutor with time-travel persona',
    capabilities: [
      'historical-explanation',
      'primary-source-analysis',
      'cause-effect',
      'timeline-building',
      'cultural-context',
    ],
    inputTypes: ['history-question', 'event-analysis', 'primary-source'],
    outputTypes: ['narrative', 'analysis-guide', 'timeline'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
  SUBJECT_TUTOR_CODING: {
    type: 'TUTOR' as SpecialistAgentType,
    name: 'Pixel - Coding Tutor',
    description: 'Subject-specific coding tutor with robot persona',
    capabilities: [
      'code-explanation',
      'debugging-help',
      'algorithm-design',
      'pseudocode',
      'project-guidance',
      'computational-thinking',
    ],
    inputTypes: ['code-question', 'debug-help', 'project-help'],
    outputTypes: ['explanation', 'code-review', 'project-step'],
    priority: 1,
    maxConcurrentTasks: 1,
  },
};

/**
 * Get the subject tutor type from a subject string
 */
export function getSubjectTutorType(subject: string): SubjectTutorAgentType | null {
  const map: Record<string, SubjectTutorAgentType> = {
    MATH: 'SUBJECT_TUTOR_MATH',
    ELA: 'SUBJECT_TUTOR_ELA',
    SCIENCE: 'SUBJECT_TUTOR_SCIENCE',
    HISTORY: 'SUBJECT_TUTOR_HISTORY',
    CODING: 'SUBJECT_TUTOR_CODING',
  };
  return map[subject] ?? null;
}
