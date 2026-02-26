/**
 * Subject-Specific Tutor Agent
 *
 * Extends the base tutor agent with subject-specific teaching strategies.
 * Each subject tutor has a unique persona, teaching style, and domain knowledge
 * that adapts to the learner's level and needs.
 */

import type { AgentContext, AgentResponse } from './base-agent.js';
import { BaseAgent } from './base-agent.js';

export type TutorSubject = 'MATH' | 'ELA' | 'SCIENCE' | 'HISTORY' | 'CODING';

export interface SubjectTutorConfig {
  subject: TutorSubject;
  personaSlug: string;
  personaSystemPrompt: string;
  topic?: string;
}

const SUBJECT_STRATEGIES: Record<TutorSubject, string> = {
  MATH: `MATH TEACHING STRATEGIES:
- Use concrete examples before abstract concepts
- Encourage showing work step by step
- Use visual representations (number lines, diagrams)
- Build on prerequisite skills
- Celebrate mathematical reasoning, not just correct answers`,

  ELA: `ELA TEACHING STRATEGIES:
- Connect reading to personal experiences
- Model good writing with clear examples
- Use think-alouds for comprehension
- Encourage vocabulary building in context
- Foster a love of reading and creative expression`,

  SCIENCE: `SCIENCE TEACHING STRATEGIES:
- Follow the scientific method as a framework
- Connect concepts to observable phenomena
- Encourage hypothesis formation and testing
- Use analogies to make abstract concepts concrete
- Celebrate curiosity and questioning`,

  HISTORY: `HISTORY TEACHING STRATEGIES:
- Use primary sources when possible
- Encourage cause-and-effect thinking
- Connect historical events to present-day issues
- Present multiple perspectives on events
- Use timelines and maps for context`,

  CODING: `CODING TEACHING STRATEGIES:
- Start with pseudocode before real code
- Break problems into smaller functions
- Encourage testing and debugging as learning
- Use pair-programming style guidance
- Build projects incrementally`,
};

export class SubjectTutorAgent extends BaseAgent {
  readonly agentType = 'subject-tutor';
  readonly systemPrompt: string;

  private readonly subjectConfig: SubjectTutorConfig;

  constructor(config: SubjectTutorConfig) {
    super();
    this.subjectConfig = config;

    const subjectStrategy = SUBJECT_STRATEGIES[config.subject];

    this.systemPrompt = `${config.personaSystemPrompt}

${subjectStrategy}

${config.topic ? `CURRENT TOPIC: ${config.topic}` : ''}

CORE TUTOR PRINCIPLES:
1. NEVER give direct answers to homework or assessment questions
2. Guide students to discover answers through the Socratic method
3. Celebrate effort and progress, not just correct answers
4. Use age-appropriate language and examples
5. Be patient, encouraging, and never condescending
6. Adapt your explanations to the student's level
7. If the student seems frustrated, acknowledge feelings and simplify

{{#if adaptations}}
LEARNER ADAPTATIONS:
{{#each adaptations}}
- {{this}}
{{/each}}
{{/if}}

GRADE LEVEL: {{gradeLevel}}
STUDENT AGE: {{age}}`;
  }

  protected override getTemperature(): number {
    return 0.75;
  }

  protected override getMaxTokens(): number {
    return 500;
  }

  async helpWithTopic(
    topic: string,
    studentQuestion: string,
    context: AgentContext,
  ): Promise<AgentResponse> {
    const enrichedInput = `[Subject: ${this.subjectConfig.subject}] [Topic: ${topic}]
Student asks: ${studentQuestion}`;

    return this.respond(enrichedInput, context);
  }
}

/**
 * Factory for creating subject-specific tutor agents
 */
export function createSubjectTutor(config: SubjectTutorConfig): SubjectTutorAgent {
  return new SubjectTutorAgent(config);
}
