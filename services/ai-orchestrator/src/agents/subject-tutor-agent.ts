/**
 * Subject-Specific Tutor Agent (Sprint 2)
 *
 * Extends BaseAgent with:
 * - Persona injection (name, personality, teaching approach, specialties)
 * - Locale awareness for multilingual responses
 * - Learner context (grade level, mastery from virtual brain)
 * - Subject-specific teaching strategies
 */

import type { AgentContext, AgentResponse } from './base-agent.js';
import { BaseAgent } from './base-agent.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { SafetyFilter } from '../safety/safety-filter-v2.js';
import type { PromptBuilder } from '../prompts/prompt-builder.js';

export type TutorSubject = 'MATH' | 'ELA' | 'SCIENCE' | 'HISTORY' | 'CODING';

export interface SubjectTutorPersona {
  slug: string;
  name: string;
  personality: string;
  teachingApproach: string;
  encouragementStyle: string;
  specialties: string[];
  systemPromptTemplate: string;
}

export interface LearnerMastery {
  domain: string;
  avgMastery: number;
  skillCount: number;
}

export interface SubjectTutorConfig {
  subject: TutorSubject;
  persona: SubjectTutorPersona;
  topic?: string;
  locale?: string;
  learnerContext?: {
    gradeLevel?: number;
    age?: number;
    masteryByDomain?: LearnerMastery[];
    learningStyle?: string;
  };
}

const SUBJECT_STRATEGIES: Record<TutorSubject, string> = {
  MATH: `MATH TEACHING STRATEGIES:
- Use concrete examples before abstract concepts
- Encourage showing work step by step
- Use visual representations (number lines, diagrams)
- Build on prerequisite skills
- Celebrate mathematical reasoning, not just correct answers
- For younger learners: use manipulatives and counting strategies
- For older learners: connect to real-world applications`,

  ELA: `ELA TEACHING STRATEGIES:
- Connect reading to personal experiences
- Model good writing with clear examples
- Use think-alouds for reading comprehension
- Encourage vocabulary building in context
- Foster a love of reading and creative expression
- Scaffold writing with graphic organizers
- Teach grammar through authentic writing contexts`,

  SCIENCE: `SCIENCE TEACHING STRATEGIES:
- Follow the scientific method as a framework
- Connect concepts to observable phenomena
- Encourage hypothesis formation and testing
- Use analogies to make abstract concepts concrete
- Celebrate curiosity and questioning
- Guide hands-on exploration when possible
- Relate science to everyday life`,

  HISTORY: `HISTORY TEACHING STRATEGIES:
- Use primary sources when possible
- Encourage cause-and-effect thinking
- Connect historical events to present-day issues
- Present multiple perspectives on events
- Use timelines and maps for spatial-temporal context
- Tell stories to make history come alive
- Develop critical analysis of sources`,

  CODING: `CODING TEACHING STRATEGIES:
- Start with pseudocode before real code
- Break problems into smaller functions
- Encourage testing and debugging as learning
- Use pair-programming style guidance
- Build projects incrementally
- Explain concepts through analogies
- Celebrate creative problem-solving approaches`,
};

export class SubjectTutorAgent extends BaseAgent {
  readonly agentType: string;
  readonly systemPrompt: string;

  private readonly config: SubjectTutorConfig;

  constructor(
    config: SubjectTutorConfig,
    llm: LLMOrchestrator,
    safetyFilter: SafetyFilter,
    promptBuilder: PromptBuilder,
  ) {
    super(llm, safetyFilter, promptBuilder);
    this.config = config;
    this.agentType = `subject-tutor-${config.subject.toLowerCase()}`;

    const { persona, subject, topic, locale, learnerContext } = config;
    const subjectStrategy = SUBJECT_STRATEGIES[subject];

    // Build mastery context string
    let masteryContext = '';
    if (learnerContext?.masteryByDomain?.length) {
      masteryContext = learnerContext.masteryByDomain
        .map(m => `  - ${m.domain}: ${Math.round(m.avgMastery * 100)}% mastery (${m.skillCount} skills)`)
        .join('\n');
    }

    // Compose the full system prompt from persona template + strategies + context
    const parts: string[] = [
      `You are ${persona.name}, ${persona.personality}.`,
      '',
      `YOUR IDENTITY:`,
      `- Name: ${persona.name}`,
      `- Teaching Approach: ${persona.teachingApproach}`,
      `- Encouragement Style: ${persona.encouragementStyle}`,
      `- Specialties: ${persona.specialties.join(', ')}`,
      '',
      `SUBJECT: ${subject}`,
      '',
      subjectStrategy,
    ];

    if (topic) {
      parts.push('', `CURRENT TOPIC: ${topic}`);
    }

    parts.push('', `LOCALE: ${locale ?? 'en-US'}`);

    if (learnerContext) {
      parts.push('', 'LEARNER CONTEXT:');
      parts.push('- Grade Level: {{gradeLevel}}');
      parts.push('- Student Age: {{age}}');
      if (learnerContext.learningStyle) {
        parts.push(`- Learning Style: ${learnerContext.learningStyle}`);
      }
      if (masteryContext) {
        parts.push(`- Current Mastery:`);
        parts.push(masteryContext);
      }
    }

    parts.push(
      '',
      '{{#if adaptations}}',
      'LEARNER ADAPTATIONS:',
      '{{#each adaptations}}',
      '- {{this}}',
      '{{/each}}',
      '{{/if}}',
      '',
      persona.systemPromptTemplate,
      '',
      'CORE TUTOR PRINCIPLES:',
      '1. NEVER give direct answers to homework or assessment questions',
      '2. Guide students to discover answers through the Socratic method',
      '3. Celebrate effort and progress, not just correct answers',
      '4. Use age-appropriate language and examples',
      '5. Be patient, encouraging, and never condescending',
      '6. Adapt your explanations to the student\'s level',
      '7. If the student seems frustrated, acknowledge feelings and simplify',
      '8. Respond in the student\'s locale language when appropriate',
    );

    this.systemPrompt = parts.join('\n');
  }

  protected override getTemperature(): number {
    return 0.75;
  }

  protected override getMaxTokens(): number {
    return 600;
  }

  /**
   * Handle a tutoring interaction with subject context
   */
  async helpWithTopic(
    topic: string,
    studentQuestion: string,
    context: AgentContext,
  ): Promise<AgentResponse> {
    const enrichedInput = `[Subject: ${this.config.subject}] [Topic: ${topic}]${this.config.locale ? ` [Locale: ${this.config.locale}]` : ''}\nStudent asks: ${studentQuestion}`;

    return this.respond(enrichedInput, context);
  }

  /**
   * Generate an opening message for a new session
   */
  async generateOpeningMessage(context: AgentContext): Promise<AgentResponse> {
    const { persona, subject, topic } = this.config;
    const openingPrompt = `You are starting a new tutoring session. Introduce yourself as ${persona.name} and warmly greet the student.${topic ? ` The student wants help with ${topic} in ${subject}.` : ` The student is here for ${subject} tutoring.`} Keep it brief (2-3 sentences), friendly, and encouraging. Ask an open-ended question to get started.`;

    return this.respond(openingPrompt, context);
  }
}

/**
 * Factory for creating subject-specific tutor agents
 */
export function createSubjectTutor(
  config: SubjectTutorConfig,
  llm: LLMOrchestrator,
  safetyFilter: SafetyFilter,
  promptBuilder: PromptBuilder,
): SubjectTutorAgent {
  return new SubjectTutorAgent(config, llm, safetyFilter, promptBuilder);
}
