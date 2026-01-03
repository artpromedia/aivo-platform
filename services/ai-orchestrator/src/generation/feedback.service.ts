/**
 * AI Feedback Service
 *
 * Generates intelligent feedback on student work:
 * - Essay and written response grading
 * - Rubric-based assessment
 * - Constructive feedback generation
 * - Improvement suggestions
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  FeedbackRequest,
  GeneratedFeedback,
  RubricCriteria,
  RubricScore,
  EssayFeedback,
  GrammarIssue,
  StructureAnalysis,
  PeerReviewGuide,
  GenerationMetadata,
} from './types.js';

const FEEDBACK_SYSTEM_PROMPT = `You are an expert educational assessor for the AIVO learning platform.
When providing feedback:
- Be encouraging and constructive
- Identify specific strengths and areas for improvement
- Provide actionable suggestions
- Explain concepts the student may have misunderstood
- Motivate continued learning
- Be age-appropriate and supportive
- Quote specific examples from student work`;

const RUBRIC_SYSTEM_PROMPT = `You are an expert at creating educational assessment rubrics.
When creating rubrics:
- Align criteria with learning objectives
- Use clear, measurable descriptors
- Create distinct performance levels
- Make rubrics student-friendly for self-assessment
- Include actionable feedback indicators`;

export class FeedbackService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Generate feedback for student submission
   */
  async generateFeedback(request: FeedbackRequest): Promise<GeneratedFeedback> {
    const startTime = Date.now();
    const feedbackId = uuidv4();

    console.info('Generating AI feedback', {
      feedbackId,
      type: request.submissionType,
      studentId: request.studentId,
    });

    try {
      incrementCounter('feedback.started', { type: request.submissionType });

      const prompt = this.buildFeedbackPrompt(request);

      const messages: LLMMessage[] = [
        { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.4,
        maxTokens: 2000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.studentId,
          agentType: 'TUTOR',
        },
      });

      const parsed = this.parseStructuredResponse(result.content);
      const feedback = this.buildFeedbackFromResponse(parsed, request);
      const validatedFeedback = this.validateFeedback(feedback, request);

      await this.storeFeedback(feedbackId, request, validatedFeedback);

      const latencyMs = Date.now() - startTime;
      recordHistogram('feedback.duration', latencyMs);
      incrementCounter('feedback.success', { type: request.submissionType });

      return validatedFeedback;
    } catch (error) {
      incrementCounter('feedback.error', { type: request.submissionType });
      console.error('Feedback generation failed', { feedbackId, error });
      throw error;
    }
  }

  /**
   * Grade an essay with detailed feedback
   */
  async gradeEssay(
    essay: string,
    prompt: string,
    options: {
      gradeLevel: string;
      wordCountMin?: number;
      wordCountMax?: number;
      focusAreas?: ('grammar' | 'structure' | 'content' | 'style' | 'argumentation')[];
      rubric?: RubricCriteria[];
      maxPoints: number;
      studentId: string;
      tenantId: string;
    }
  ): Promise<EssayFeedback> {
    const wordCount = essay.split(/\s+/).length;
    const focusAreas = options.focusAreas ?? ['grammar', 'structure', 'content', 'style'];

    const analysisPrompt = `Grade this essay and provide detailed feedback:

ESSAY PROMPT:
${prompt}

STUDENT'S ESSAY:
${essay}

GRADING CONTEXT:
- Grade Level: ${options.gradeLevel}
- Word Count: ${wordCount} (Target: ${options.wordCountMin ?? 'N/A'}-${options.wordCountMax ?? 'N/A'})
- Focus Areas: ${focusAreas.join(', ')}
- Maximum Points: ${options.maxPoints}

${
  options.rubric
    ? `
RUBRIC:
${options.rubric
  .map(
    (r) => `
${r.name} (${r.maxPoints} points):
${r.description}
Levels: ${r.levels.map((l) => `${l.score}pts - ${l.description}`).join('; ')}
`
  )
  .join('\n')}
`
    : ''
}

PROVIDE:
1. Overall score with justification
2. Rubric scores (if rubric provided)
3. Specific strengths (quote examples from the essay)
4. Areas for improvement with specific suggestions
5. Grammar issues with corrections
6. Structure analysis
7. Encouraging closing message
8. Confidence level (0-1) in your assessment

Be constructive, specific, and encouraging while maintaining academic standards.

Respond with JSON: {"overallScore": number, "maxScore": number, "percentage": number, "rubricScores": [...], "strengths": [...], "areasForImprovement": [...], "specificFeedback": "string", "suggestions": [...], "encouragement": "string", "grammarIssues": [...], "structureAnalysis": {...}, "confidence": number}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: FEEDBACK_SYSTEM_PROMPT },
      { role: 'user', content: analysisPrompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 3000,
      metadata: {
        tenantId: options.tenantId,
        userId: options.studentId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    const essayFeedback: EssayFeedback = {
      overallScore: this.clamp((parsed.overallScore as number) ?? 0, 0, options.maxPoints),
      maxScore: options.maxPoints,
      percentage: Math.round(
        ((parsed.overallScore as number) ?? 0 / options.maxPoints) * 100
      ),
      rubricScores: parsed.rubricScores as RubricScore[] | undefined,
      strengths: (parsed.strengths as string[]) ?? [],
      areasForImprovement: (parsed.areasForImprovement as string[]) ?? [],
      specificFeedback: (parsed.specificFeedback as string) ?? '',
      suggestions: (parsed.suggestions as string[]) ?? [],
      encouragement: (parsed.encouragement as string) ?? 'Keep up the good work!',
      confidence: this.clamp((parsed.confidence as number) ?? 0.8, 0, 1),
      grammarIssues: parsed.grammarIssues as GrammarIssue[] | undefined,
      structureAnalysis: parsed.structureAnalysis as StructureAnalysis | undefined,
    };

    return essayFeedback;
  }

  /**
   * Generate a rubric from learning objectives
   */
  async generateRubric(
    assignment: string,
    learningObjectives: string[],
    options: {
      levels?: number;
      maxPoints?: number;
      subject: string;
      gradeLevel: string;
      tenantId: string;
      userId: string;
    }
  ): Promise<RubricCriteria[]> {
    const levels = options.levels ?? 4;
    const maxPoints = options.maxPoints ?? 100;

    const prompt = `Create a detailed grading rubric for this assignment:

ASSIGNMENT:
${assignment}

LEARNING OBJECTIVES:
${learningObjectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

CONTEXT:
- Subject: ${options.subject}
- Grade Level: ${options.gradeLevel}
- Number of scoring levels: ${levels}
- Maximum total points: ${maxPoints}

Create a rubric with:
1. 4-6 criteria based on the learning objectives
2. ${levels} scoring levels for each criterion (from lowest to highest)
3. Clear, observable descriptors for each level
4. Point values that sum to approximately ${maxPoints}

The rubric should be:
- Specific and measurable
- Age-appropriate
- Aligned with the learning objectives
- Clear enough for students to self-assess

Respond with JSON: {"criteria": [{"name": "string", "description": "string", "maxPoints": number, "levels": [{"score": number, "description": "string"}]}]}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: RUBRIC_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 2000,
      metadata: {
        tenantId: options.tenantId,
        userId: options.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    return (parsed.criteria as RubricCriteria[]) ?? [];
  }

  /**
   * Compare student answer to model answer
   */
  async compareToModel(
    question: string,
    studentAnswer: string,
    modelAnswer: string,
    options: {
      partialCreditAllowed?: boolean;
      keyPoints?: string[];
      maxPoints: number;
      tenantId: string;
      userId: string;
    }
  ): Promise<{
    score: number;
    maxScore: number;
    matchedPoints: string[];
    missingPoints: string[];
    extraPoints?: string[];
    feedback: string;
  }> {
    const prompt = `Compare a student's answer to the model answer:

QUESTION:
${question}

MODEL ANSWER:
${modelAnswer}

STUDENT'S ANSWER:
${studentAnswer}

${
  options.keyPoints?.length
    ? `
KEY POINTS TO CHECK:
${options.keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}
`
    : ''
}

Maximum Points: ${options.maxPoints}
Partial Credit: ${options.partialCreditAllowed ? 'Allowed' : 'Not allowed'}

Analyze:
1. Which key points from the model answer are present in the student's answer
2. Which key points are missing
3. Any additional valid points the student made
4. An appropriate score
5. Constructive feedback

Respond with JSON: {"score": number, "maxScore": number, "matchedPoints": [...], "missingPoints": [...], "extraPoints": [...], "feedback": "string"}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at comparing and evaluating student responses.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 1000,
      metadata: {
        tenantId: options.tenantId,
        userId: options.userId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      score: this.clamp((parsed.score as number) ?? 0, 0, options.maxPoints),
      maxScore: options.maxPoints,
      matchedPoints: (parsed.matchedPoints as string[]) ?? [],
      missingPoints: (parsed.missingPoints as string[]) ?? [],
      extraPoints: parsed.extraPoints as string[] | undefined,
      feedback: (parsed.feedback as string) ?? 'Review your answer against the key points.',
    };
  }

  /**
   * Generate peer review guide
   */
  async generatePeerReviewGuide(
    assignment: string,
    rubric: RubricCriteria[],
    context: { tenantId: string; userId: string }
  ): Promise<PeerReviewGuide> {
    const prompt = `Create a peer review guide for this assignment:

ASSIGNMENT:
${assignment}

RUBRIC CRITERIA:
${rubric.map((r) => `- ${r.name}: ${r.description}`).join('\n')}

Generate:
1. Clear instructions for peer reviewers
2. Guiding questions for each rubric criterion
3. Sentence starters/templates for giving constructive feedback

The guide should help students give helpful, kind, and specific feedback.

Respond with JSON: {"instructions": "string", "questions": [{"criterion": "string", "questions": [...]}], "feedbackTemplates": [...]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert at facilitating constructive peer feedback.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.6,
      maxTokens: 1500,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      instructions:
        (parsed.instructions as string) ??
        'Review your peer\'s work carefully and provide constructive feedback.',
      questions: (parsed.questions as PeerReviewGuide['questions']) ?? [],
      feedbackTemplates: (parsed.feedbackTemplates as string[]) ?? [],
    };
  }

  /**
   * Generate quick feedback for formative assessment
   */
  async generateQuickFeedback(
    question: string,
    studentAnswer: string,
    isCorrect: boolean,
    context: { tenantId: string; userId: string }
  ): Promise<{ feedback: string; encouragement: string; nextStep?: string }> {
    const prompt = `Generate brief, encouraging feedback for this response:

Question: ${question}
Student's Answer: ${studentAnswer}
Correct: ${isCorrect ? 'Yes' : 'No'}

Provide:
1. Brief feedback (1-2 sentences)
2. An encouraging message
3. A suggested next step

Respond with JSON: {"feedback": "string", "encouragement": "string", "nextStep": "string"}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are a supportive tutor providing quick, encouraging feedback.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 300,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'TUTOR',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      feedback:
        (parsed.feedback as string) ??
        (isCorrect ? 'Great job!' : 'Let\'s try to understand this better.'),
      encouragement: (parsed.encouragement as string) ?? 'Keep going!',
      nextStep: parsed.nextStep as string | undefined,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private buildFeedbackPrompt(request: FeedbackRequest): string {
    const parts: string[] = [
      'Provide detailed feedback on this student submission:',
      '',
      'QUESTION/ASSIGNMENT:',
      request.question,
      '',
      "STUDENT'S RESPONSE:",
      request.studentResponse,
      '',
      'CONTEXT:',
      `- Submission Type: ${request.submissionType}`,
      `- Grade Level: ${request.gradeLevel}`,
      `- Subject: ${request.subject}`,
      `- Maximum Points: ${request.maxPoints}`,
    ];

    if (request.rubric?.length) {
      parts.push('');
      parts.push('GRADING RUBRIC:');
      for (const r of request.rubric) {
        parts.push(`${r.name} (${r.maxPoints} points):`);
        parts.push(r.description);
        parts.push(`Levels: ${r.levels.map((l) => `${l.score}pts - ${l.description}`).join('; ')}`);
        parts.push('');
      }
    }

    if (request.sampleAnswer) {
      parts.push('SAMPLE/MODEL ANSWER:');
      parts.push(request.sampleAnswer);
      parts.push('');
    }

    if (request.teacherGuidelines) {
      parts.push('TEACHER GUIDELINES:');
      parts.push(request.teacherGuidelines);
      parts.push('');
    }

    parts.push('PROVIDE:');
    parts.push(`1. An overall score (out of ${request.maxPoints})`);
    parts.push('2. Rubric-based scores if rubric provided');
    parts.push("3. 2-3 specific strengths with examples from the student's work");
    parts.push('4. 2-3 areas for improvement with specific suggestions');
    parts.push('5. Detailed, constructive feedback');
    parts.push('6. Actionable suggestions for improvement');
    parts.push('7. An encouraging message');
    parts.push('8. Your confidence level (0-1) in this assessment');
    parts.push('');
    parts.push('Remember:');
    parts.push('- Be encouraging and constructive');
    parts.push("- Quote specific examples from the student's work");
    parts.push('- Provide actionable feedback');
    parts.push(`- Be age-appropriate for ${request.gradeLevel}`);
    parts.push('');
    parts.push(
      'Respond with JSON: {"overallScore": number, "maxScore": number, "percentage": number, "rubricScores": [...], "strengths": [...], "areasForImprovement": [...], "specificFeedback": "string", "suggestions": [...], "encouragement": "string", "nextSteps": [...], "confidence": number}'
    );

    return parts.join('\n');
  }

  private buildFeedbackFromResponse(
    parsed: Record<string, unknown>,
    request: FeedbackRequest
  ): GeneratedFeedback {
    return {
      overallScore: (parsed.overallScore as number) ?? 0,
      maxScore: request.maxPoints,
      percentage: (parsed.percentage as number) ?? 0,
      rubricScores: parsed.rubricScores as RubricScore[] | undefined,
      strengths: (parsed.strengths as string[]) ?? [],
      areasForImprovement: (parsed.areasForImprovement as string[]) ?? [],
      specificFeedback: (parsed.specificFeedback as string) ?? '',
      suggestions: (parsed.suggestions as string[]) ?? [],
      encouragement: (parsed.encouragement as string) ?? 'Keep up the good work!',
      nextSteps: parsed.nextSteps as string[] | undefined,
      confidence: (parsed.confidence as number) ?? 0.8,
    };
  }

  private validateFeedback(
    feedback: GeneratedFeedback,
    request: FeedbackRequest
  ): GeneratedFeedback {
    feedback.overallScore = this.clamp(feedback.overallScore, 0, request.maxPoints);
    feedback.maxScore = request.maxPoints;
    feedback.percentage = Math.round((feedback.overallScore / request.maxPoints) * 100);

    if (feedback.rubricScores && request.rubric) {
      feedback.rubricScores = feedback.rubricScores.map((rs, i) => ({
        ...rs,
        maxScore: request.rubric![i]?.maxPoints ?? rs.maxScore,
        score: this.clamp(rs.score, 0, request.rubric![i]?.maxPoints ?? rs.maxScore),
      }));
    }

    feedback.confidence = this.clamp(feedback.confidence, 0, 1);

    return feedback;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(value, max));
  }

  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in feedback response');
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse feedback response', { error });
      return {};
    }
  }

  private async storeFeedback(
    feedbackId: string,
    request: FeedbackRequest,
    feedback: GeneratedFeedback
  ): Promise<void> {
    console.info('Storing feedback', {
      feedbackId,
      studentId: request.studentId,
      score: feedback.overallScore,
      maxScore: feedback.maxScore,
    });
  }
}
