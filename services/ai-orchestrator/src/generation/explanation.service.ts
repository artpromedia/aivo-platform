/**
 * Adaptive Explanation Service
 *
 * Generates personalized explanations based on:
 * - Student's current understanding level
 * - Learning preferences
 * - Previous interactions
 * - Common misconceptions
 */

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  ExplanationRequest,
  AdaptiveExplanation,
  StepByStepSolution,
  WrongAnswerExplanation,
  SolutionStep,
} from './types.js';

interface StudentProfile {
  gradeLevel: string;
  learningStyle?: Record<string, unknown>;
  averagePerformance: number;
  level?: number;
}

interface SkillMastery {
  skillId: string;
  masteryLevel: number;
}

type ExplanationLevel = 'simplified' | 'standard' | 'advanced';

const EXPLANATION_SYSTEM_PROMPT = `You are an expert educational tutor for the AIVO learning platform.
When explaining concepts:
- Adapt to the student's current understanding level
- Use analogies and real-world examples
- Break down complex ideas step by step
- Check for understanding with questions
- Provide multiple perspectives when helpful
- Be encouraging and patient
- Use age-appropriate language`;

const LEVEL_DESCRIPTIONS: Record<ExplanationLevel, string> = {
  simplified:
    'Use simple language, many examples, and break down concepts into small steps. Assume limited prior knowledge.',
  standard:
    'Use clear explanations with good examples. Assume basic familiarity with the subject.',
  advanced:
    'Provide deeper insights and connections. Can use more technical language and complex examples.',
};

const STYLE_INSTRUCTIONS: Record<string, string> = {
  visual: 'Include detailed descriptions of diagrams, charts, or visual representations.',
  textual: 'Focus on clear written explanations with logical flow.',
  'example-based': 'Lead with concrete examples before introducing abstract concepts.',
  'step-by-step': 'Break everything into numbered, sequential steps.',
};

export class ExplanationService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Generate an adaptive explanation
   */
  async generateExplanation(request: ExplanationRequest): Promise<AdaptiveExplanation> {
    const startTime = Date.now();

    console.info('Generating adaptive explanation', {
      concept: request.concept,
      studentId: request.studentId,
    });

    try {
      incrementCounter('explanation.started');

      const studentProfile = await this.getStudentProfile(request.studentId);
      const skillMastery = request.skillId
        ? await this.getSkillMastery(request.studentId, request.skillId)
        : null;

      const level = this.determineLevel(studentProfile, skillMastery);
      const misconceptions = request.previousAttempt
        ? await this.identifyMisconceptions(request.previousAttempt)
        : [];

      const prompt = this.buildExplanationPrompt(request, level, studentProfile, misconceptions);

      const messages: LLMMessage[] = [
        { role: 'system', content: EXPLANATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.6,
        maxTokens: 2000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.studentId,
          agentType: 'TUTOR',
          sessionId: request.sessionId,
        },
      });

      const parsed = this.parseStructuredResponse(result.content);

      const explanation: AdaptiveExplanation = {
        explanation: (parsed.explanation as string) ?? result.content,
        examples: parsed.examples as AdaptiveExplanation['examples'],
        visualDescription: parsed.visualDescription as string | undefined,
        analogies: parsed.analogies as string[] | undefined,
        checkQuestions: parsed.checkQuestions as AdaptiveExplanation['checkQuestions'],
        relatedConcepts: parsed.relatedConcepts as string[] | undefined,
        difficultyLevel: level,
      };

      await this.storeInteraction(request.studentId, request.concept, explanation);

      const latencyMs = Date.now() - startTime;
      recordHistogram('explanation.duration', latencyMs);
      incrementCounter('explanation.success');

      return explanation;
    } catch (error) {
      incrementCounter('explanation.error');
      console.error('Explanation generation failed', { error });
      throw error;
    }
  }

  /**
   * Generate explanation for a wrong answer
   */
  async explainWrongAnswer(
    studentId: string,
    question: string,
    studentAnswer: string,
    correctAnswer: string,
    options?: {
      showCorrectAnswer?: boolean;
      encouragement?: boolean;
      tenantId?: string;
    }
  ): Promise<WrongAnswerExplanation> {
    const prompt = `A student answered a question incorrectly. Help them understand their mistake without being discouraging.

Question: ${question}
Student's Answer: ${studentAnswer}
Correct Answer: ${correctAnswer}

Provide:
1. A gentle explanation of why their answer is incorrect
2. The likely misconception that led to this answer
3. A clear path to the correct understanding
${options?.showCorrectAnswer ? '4. Explain why the correct answer is right' : ''}
${options?.encouragement ? '5. An encouraging message to motivate continued learning' : ''}

Be supportive and educational, focusing on learning rather than failure.

Respond with JSON: {"explanation": "string", "misconception": "string", "correctPath": "string", "encouragement": "string", "tryAgainHint": "string"}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are a supportive tutor helping students learn from their mistakes. Be encouraging and constructive.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 1000,
      metadata: {
        tenantId: options?.tenantId ?? 'system',
        userId: studentId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      explanation: (parsed.explanation as string) ?? 'Let me help you understand this better.',
      misconception: parsed.misconception as string | undefined,
      correctPath:
        (parsed.correctPath as string) ?? 'Try thinking about it from a different angle.',
      encouragement: parsed.encouragement as string | undefined,
      tryAgainHint: parsed.tryAgainHint as string | undefined,
    };
  }

  /**
   * Simplify explanation for struggling student
   */
  async simplifyExplanation(
    originalExplanation: string,
    targetLevel: 'elementary' | 'middle' | 'simple',
    context?: { studentId?: string; tenantId?: string }
  ): Promise<string> {
    const levelDescriptions = {
      elementary: 'a 3rd-4th grade student',
      middle: 'a 6th-7th grade student',
      simple: 'someone with no prior knowledge of the subject',
    };

    const prompt = `Simplify this explanation for ${levelDescriptions[targetLevel]}:

Original Explanation:
${originalExplanation}

Requirements:
1. Use simpler vocabulary and shorter sentences
2. Add concrete examples from everyday life
3. Break complex ideas into smaller, manageable pieces
4. Use analogies that a ${targetLevel} level learner would understand
5. Maintain accuracy while simplifying

Provide the simplified explanation.`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at simplifying complex concepts for younger learners.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 1500,
      metadata: {
        tenantId: context?.tenantId ?? 'system',
        userId: context?.studentId ?? 'system',
        agentType: 'TUTOR',
      },
    });

    return result.content;
  }

  /**
   * Generate step-by-step solution
   */
  async generateStepByStep(
    problem: string,
    subject: string,
    context: { studentId: string; tenantId: string },
    options?: {
      showWorkings?: boolean;
      includeCheckpoints?: boolean;
    }
  ): Promise<StepByStepSolution> {
    const prompt = `Solve this ${subject} problem step by step:

Problem: ${problem}

Provide:
1. Clear, numbered steps to solve the problem
2. An explanation for each step (why we're doing this)
${options?.showWorkings ? '3. Show all workings/calculations' : ''}
${options?.includeCheckpoints ? '4. Include checkpoints to verify progress' : ''}
5. The final answer
6. Common mistakes students make with this type of problem

Make the solution educational, showing the thinking process.

Respond with JSON: {"steps": [{"number": 1, "action": "string", "explanation": "string", "checkpoint": "string"}], "finalAnswer": "string", "commonMistakes": ["string"]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an expert ${subject} tutor who explains solutions clearly and methodically.`,
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.4,
      maxTokens: 2000,
      metadata: {
        tenantId: context.tenantId,
        userId: context.studentId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      steps: ((parsed.steps as unknown[]) ?? []).map((step) => {
        const s = step as Record<string, unknown>;
        return {
          number: (s.number as number) ?? 1,
          action: (s.action as string) ?? '',
          explanation: (s.explanation as string) ?? '',
          checkpoint: s.checkpoint as string | undefined,
        };
      }),
      finalAnswer: (parsed.finalAnswer as string) ?? 'See the steps above.',
      commonMistakes: parsed.commonMistakes as string[] | undefined,
    };
  }

  /**
   * Generate multiple approaches to a problem
   */
  async generateAlternativeApproaches(
    problem: string,
    subject: string,
    context: { studentId: string; tenantId: string }
  ): Promise<
    Array<{
      name: string;
      description: string;
      steps: string[];
      pros: string[];
      cons: string[];
    }>
  > {
    const prompt = `Show different approaches to solve this ${subject} problem:

Problem: ${problem}

Provide 2-3 different methods or approaches to solve this problem. For each approach:
1. Give it a descriptive name
2. Briefly describe the approach
3. List the key steps
4. Mention pros and cons of this approach

Respond with JSON: {"approaches": [{"name": "string", "description": "string", "steps": ["string"], "pros": ["string"], "cons": ["string"]}]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an expert ${subject} tutor who knows multiple problem-solving strategies.`,
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.6,
      maxTokens: 2000,
      metadata: {
        tenantId: context.tenantId,
        userId: context.studentId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    return (parsed.approaches as unknown[])?.map((a) => {
      const approach = a as Record<string, unknown>;
      return {
        name: (approach.name as string) ?? 'Approach',
        description: (approach.description as string) ?? '',
        steps: (approach.steps as string[]) ?? [],
        pros: (approach.pros as string[]) ?? [],
        cons: (approach.cons as string[]) ?? [],
      };
    }) ?? [];
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private async getStudentProfile(studentId: string): Promise<StudentProfile> {
    // In production, fetch from database
    return {
      gradeLevel: 'middle',
      learningStyle: {},
      averagePerformance: 70,
      level: 5,
    };
  }

  private async getSkillMastery(
    studentId: string,
    skillId: string
  ): Promise<SkillMastery | null> {
    // In production, fetch from database
    return {
      skillId,
      masteryLevel: 0.6,
    };
  }

  private determineLevel(
    profile: StudentProfile,
    skillMastery: SkillMastery | null
  ): ExplanationLevel {
    const performanceScore = profile.averagePerformance;
    const mastery = skillMastery?.masteryLevel ?? 0.5;

    const combinedScore = (performanceScore / 100 + mastery) / 2;

    if (combinedScore < 0.4) return 'simplified';
    if (combinedScore > 0.7) return 'advanced';
    return 'standard';
  }

  private async identifyMisconceptions(attempt: {
    question: string;
    studentAnswer: string;
    correctAnswer: string;
  }): Promise<string[]> {
    const prompt = `Identify the likely misconceptions based on this student's answer:

Question: ${attempt.question}
Student's Answer: ${attempt.studentAnswer}
Correct Answer: ${attempt.correctAnswer}

List 1-3 specific misconceptions that could have led to this answer.

Respond with JSON: {"misconceptions": ["string"]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at identifying student misconceptions.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.4,
      maxTokens: 500,
      metadata: {
        tenantId: 'system',
        userId: 'system',
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    return (parsed.misconceptions as string[]) ?? [];
  }

  private buildExplanationPrompt(
    request: ExplanationRequest,
    level: ExplanationLevel,
    profile: StudentProfile,
    misconceptions: string[]
  ): string {
    const parts: string[] = [
      `Generate a personalized explanation for this concept:`,
      '',
      `CONCEPT: ${request.concept}`,
    ];

    if (request.context) {
      parts.push(`CONTEXT: ${request.context}`);
    }

    parts.push('');
    parts.push('STUDENT PROFILE:');
    parts.push(`- Grade Level: ${profile.gradeLevel}`);
    parts.push(`- Explanation Level: ${level} - ${LEVEL_DESCRIPTIONS[level]}`);
    parts.push(`- Average Performance: ${Math.round(profile.averagePerformance)}%`);

    if (request.preferredStyle) {
      parts.push(`- Preferred Learning Style: ${STYLE_INSTRUCTIONS[request.preferredStyle]}`);
    }

    if (request.previousAttempt) {
      parts.push('');
      parts.push('PREVIOUS ATTEMPT:');
      parts.push(`- Question: ${request.previousAttempt.question}`);
      parts.push(`- Student's Answer: ${request.previousAttempt.studentAnswer}`);
      parts.push(`- Correct Answer: ${request.previousAttempt.correctAnswer}`);
    }

    if (misconceptions.length > 0) {
      parts.push('');
      parts.push('IDENTIFIED MISCONCEPTIONS TO ADDRESS:');
      misconceptions.forEach((m, i) => parts.push(`${i + 1}. ${m}`));
    }

    parts.push('');
    parts.push('PROVIDE:');
    parts.push(`1. A clear, ${level} explanation of the concept`);
    parts.push('2. 2-3 relevant examples that apply the concept');
    parts.push('3. A visual description (describe what a helpful diagram would show)');
    parts.push('4. 1-2 analogies to make the concept relatable');
    parts.push('5. 2-3 quick check questions to verify understanding');
    parts.push('6. Related concepts the student might want to explore');
    parts.push('');
    parts.push('Make the explanation engaging, accurate, and appropriate for the student\'s level.');
    parts.push('');
    parts.push(
      'Respond with JSON: {"explanation": "string", "examples": [{"scenario": "string", "application": "string"}], "visualDescription": "string", "analogies": ["string"], "checkQuestions": [{"question": "string", "answer": "string"}], "relatedConcepts": ["string"]}'
    );

    return parts.join('\n');
  }

  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { explanation: content };
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return { explanation: content };
    }
  }

  private async storeInteraction(
    studentId: string,
    concept: string,
    explanation: AdaptiveExplanation
  ): Promise<void> {
    console.info('Storing explanation interaction', {
      studentId,
      concept,
      level: explanation.difficultyLevel,
    });
  }
}
