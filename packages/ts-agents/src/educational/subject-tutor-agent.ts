/**
 * Subject Tutor Agent
 *
 * Educational agent that provides subject-specific tutoring
 * using the Socratic method. Part of the ts-agents package
 * for use across the AIVO platform.
 *
 * Supports:
 * - MATH, ELA, SCIENCE, HISTORY, CODING subjects
 * - Persona-based teaching styles
 * - Adaptive difficulty based on learner profile
 * - Conversation history management
 */

import type { AgentConfig, AgentContext, AgentOutput, Message, Tool } from '../core/index.js';

export type SubjectType = 'MATH' | 'ELA' | 'SCIENCE' | 'HISTORY' | 'CODING';

export interface SubjectTutorConfig {
  subject: SubjectType;
  personaSlug: string;
  personaName: string;
  systemPrompt: string;
  gradeLevel?: string;
  locale?: string;
}

export interface StudentProfile {
  learnerId: string;
  gradeLevel: string;
  age?: number;
  adaptations?: string[];
  neurodiversityFlags?: string[];
  readingLevel?: string;
}

export interface TutorResponse {
  content: string;
  emotion: string;
  suggestedFollowUps?: string[];
  topicsCovered?: string[];
}

const SUBJECT_SYSTEM_PROMPTS: Record<SubjectType, string> = {
  MATH: `You are a math tutor. Guide students through mathematical concepts using the Socratic method.
Focus on: number sense, operations, fractions, geometry, algebra basics, word problems.
Use visual descriptions and real-world examples. Never give direct answers.`,

  ELA: `You are an English Language Arts tutor. Help students with reading comprehension, writing, grammar, and vocabulary.
Focus on: reading strategies, paragraph structure, parts of speech, creative writing, vocabulary in context.
Use storytelling and relatable examples. Encourage creative expression.`,

  SCIENCE: `You are a science tutor. Help students explore scientific concepts through inquiry and the scientific method.
Focus on: observation, hypothesis formation, experimentation, biology, chemistry, physics, earth science.
Frame learning as discovery and experimentation.`,

  HISTORY: `You are a history tutor. Help students understand historical events, causes, and effects.
Focus on: timelines, primary sources, cause and effect, multiple perspectives, connecting past to present.
Use narrative and storytelling to make history come alive.`,

  CODING: `You are a coding tutor. Help students learn programming concepts through building and debugging.
Focus on: computational thinking, algorithms, variables, loops, functions, debugging.
Use game and puzzle analogies. Start with pseudocode before real code.`,
};

/**
 * Create a subject-specific tutor agent configuration
 */
export function createSubjectTutorConfig(
  tutorConfig: SubjectTutorConfig,
  studentProfile?: StudentProfile,
): AgentConfig {
  const basePrompt = tutorConfig.systemPrompt || SUBJECT_SYSTEM_PROMPTS[tutorConfig.subject];

  let adaptedPrompt = basePrompt;

  if (studentProfile) {
    const adaptations: string[] = [];

    if (studentProfile.gradeLevel) {
      adaptations.push(`Student is in grade ${studentProfile.gradeLevel}.`);
    }

    if (studentProfile.age) {
      adaptations.push(`Student is ${studentProfile.age} years old. Use age-appropriate language.`);
    }

    if (studentProfile.readingLevel) {
      adaptations.push(`Student's reading level: ${studentProfile.readingLevel}. Adjust vocabulary accordingly.`);
    }

    if (studentProfile.adaptations?.length) {
      adaptations.push(`Learning adaptations: ${studentProfile.adaptations.join(', ')}`);
    }

    if (studentProfile.neurodiversityFlags?.length) {
      adaptations.push(`Neurodiversity considerations: ${studentProfile.neurodiversityFlags.join(', ')}`);
    }

    if (adaptations.length > 0) {
      adaptedPrompt += `\n\nSTUDENT PROFILE:\n${adaptations.join('\n')}`;
    }
  }

  return {
    name: `${tutorConfig.personaName}-${tutorConfig.subject.toLowerCase()}-tutor`,
    description: `${tutorConfig.personaName} - ${tutorConfig.subject} subject tutor`,
    systemPrompt: adaptedPrompt,
    model: 'claude-sonnet-4-6',
    temperature: 0.75,
    maxTokens: 500,
    tools: [],
  };
}

/**
 * Detect the emotional tone of a tutor response
 */
export function detectResponseEmotion(content: string): string {
  const lower = content.toLowerCase();

  const emotionPatterns: Array<[string, string[]]> = [
    ['HAPPY', ['great job', 'awesome', 'wonderful', 'excellent', 'well done', 'amazing']],
    ['THINKING', ['let me think', 'consider', 'interesting', 'hmm', 'let\'s explore']],
    ['ENCOURAGING', ['you can do it', 'keep trying', 'don\'t give up', 'almost there', 'believe']],
    ['EXCITED', ['wow', 'incredible', 'so cool', 'exciting', 'brilliant']],
    ['EMPATHETIC', ['understand', 'it\'s hard', 'that\'s okay', 'take your time', 'no worries']],
  ];

  for (const [emotion, keywords] of emotionPatterns) {
    for (const keyword of keywords) {
      if (lower.includes(keyword)) {
        return emotion;
      }
    }
  }

  return 'NEUTRAL';
}

/**
 * Extract topics discussed from a conversation
 */
export function extractTopics(messages: Array<{ role: string; content: string }>): string[] {
  const topics = new Set<string>();

  for (const msg of messages) {
    const lower = msg.content.toLowerCase();

    // Simple topic extraction based on common educational terms
    const topicPatterns = [
      /(?:learn|study|understand|practice|work on)\s+(\w+(?:\s+\w+)?)/g,
      /(?:about|regarding|topic of)\s+(\w+(?:\s+\w+)?)/g,
    ];

    for (const pattern of topicPatterns) {
      let match;
      while ((match = pattern.exec(lower)) !== null) {
        if (match[1].length > 2) {
          topics.add(match[1]);
        }
      }
    }
  }

  return Array.from(topics).slice(0, 10);
}
