/**
 * Tutor Agent
 *
 * AI tutor that uses the Socratic method to guide students
 * without giving direct answers. Adapts to learner profiles
 * and maintains a supportive, encouraging tone.
 */

import type { AgentContext, AgentResponse } from './base-agent.js';
import { BaseAgent } from './base-agent.js';

export class TutorAgent extends BaseAgent {
  readonly agentType = 'tutor';

  readonly systemPrompt = `You are AIVO, a friendly and patient AI tutor for K-12 students. Your role is to help students learn through the Socratic method - asking guiding questions rather than giving direct answers.

CORE PRINCIPLES:
1. NEVER give direct answers to homework or assessment questions
2. Guide students to discover answers themselves through questions
3. Celebrate effort and progress, not just correct answers
4. Use age-appropriate language and examples
5. Be patient, encouraging, and never condescending
6. If a student is frustrated, acknowledge their feelings and offer to break down the problem

{{#if adaptations}}
ADAPT YOUR RESPONSES:
{{#each adaptations}}
- {{this}}
{{/each}}
{{/if}}

GRADE LEVEL: {{gradeLevel}}
STUDENT AGE: {{age}}

When helping with problems:
1. First, ask the student what they already know about the topic
2. Identify where they're stuck
3. Ask guiding questions that lead them toward the solution
4. Provide hints only when necessary
5. Celebrate when they figure it out

Remember: You're helping build confident, independent learners!`;

  protected getTemperature(): number {
    return 0.8; // Slightly creative for engaging responses
  }

  protected getMaxTokens(): number {
    return 400; // Keep responses focused
  }

  /**
   * Help a student with a specific problem
   */
  async helpWithProblem(
    problem: string,
    studentAttempt: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const message = `
I'm working on this problem:
${problem}

Here's what I tried:
${studentAttempt}

I'm stuck and need help understanding where I went wrong.
`;

    return this.respond(message, context);
  }

  /**
   * Explain a concept to the student
   */
  async explainConcept(concept: string, context: AgentContext): Promise<AgentResponse> {
    const message = `Can you help me understand ${concept}? I want to really get it, not just memorize it.`;
    return this.respond(message, context);
  }

  /**
   * Review a mistake with the student
   */
  async reviewMistake(
    question: string,
    incorrectAnswer: string,
    correctAnswer: string,
    context: AgentContext
  ): Promise<AgentResponse> {
    const message = `
I got this wrong:
Question: ${question}
My answer: ${incorrectAnswer}
The right answer was: ${correctAnswer}

Can you help me understand why my answer was wrong without just telling me to memorize the right answer?
`;

    return this.respond(message, context);
  }

  /**
   * Provide encouragement when student is frustrated
   */
  async encourageStudent(
    topic: string,
    frustrationLevel: 'low' | 'medium' | 'high',
    context: AgentContext
  ): Promise<AgentResponse> {
    const messages: Record<string, string> = {
      low: `I'm finding ${topic} a bit tricky. Can you give me a hint?`,
      medium: `I've been trying to understand ${topic} for a while and I'm getting frustrated. Can you help?`,
      high: `I really don't get ${topic} at all and I feel like giving up. This is so hard!`,
    };

    return this.respond(messages[frustrationLevel], context);
  }

  /**
   * Practice a skill with the student
   */
  async practiceSkill(
    skill: string,
    currentLevel: 'beginner' | 'intermediate' | 'advanced',
    context: AgentContext
  ): Promise<AgentResponse> {
    const message = `I want to practice ${skill}. I'd say I'm at a ${currentLevel} level. Can you give me some practice problems and help me work through them?`;
    return this.respond(message, context);
  }
}
