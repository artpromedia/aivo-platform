/**
 * Lesson Generation Service
 *
 * AI-powered lesson creation with:
 * - Complete lesson generation from topics
 * - Standards alignment
 * - Engaging content blocks
 * - Activities and assessments
 * - Multiple content types
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import type { PromptBuilder } from '../prompts/prompt-builder.js';
import type { ContentValidator } from '../validators/content-validator.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  LessonGenerationRequest,
  GeneratedLesson,
  GeneratedBlock,
  GeneratedAssessment,
  LessonOutline,
  BlockType,
  GenerationMetadata,
  GradeLevel,
} from './types.js';

const LESSON_GENERATION_SYSTEM_PROMPT = `You are an expert educational content creator for the AIVO learning platform.
When generating lessons:
- Follow a clear learning progression
- Include engaging introductions with hooks
- Break complex concepts into digestible chunks
- Include examples and practice opportunities
- End with a summary and key takeaways
- Use age-appropriate language
- Align with educational best practices
- Make content accessible and engaging`;

const OUTLINE_SYSTEM_PROMPT = `You are an expert educational curriculum designer.
Create structured lesson outlines with:
- Clear learning objectives using action verbs
- Logical section progression
- Realistic time estimates
- Engaging activities`;

export class LessonGenerationService {
  constructor(
    private llm: LLMOrchestrator,
    private promptBuilder: PromptBuilder,
    private contentValidator: ContentValidator
  ) {}

  /**
   * Generate a complete lesson
   */
  async generateLesson(request: LessonGenerationRequest): Promise<GeneratedLesson> {
    const generationId = uuidv4();
    const startTime = Date.now();

    console.info('Starting lesson generation', {
      generationId,
      topic: request.topic,
      subject: request.subject,
      gradeLevel: request.gradeLevel,
    });

    try {
      incrementCounter('lesson_generation.started', { subject: request.subject });

      const prompt = this.buildLessonPrompt(request);
      const messages: LLMMessage[] = [
        { role: 'system', content: LESSON_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.7,
        maxTokens: 4000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.userId,
          agentType: 'LESSON_PLANNER',
          sessionId: request.sessionId,
        },
      });

      const lessonData = this.parseStructuredResponse(result.content);
      const blocks = this.convertToBlocks(lessonData.sections ?? []);

      let assessment: GeneratedAssessment | undefined;
      if (request.includeAssessment) {
        assessment = await this.generateAssessment(
          lessonData.title,
          lessonData.objectives ?? [],
          request
        );
      }

      const validationResult = await this.contentValidator.validateLesson({
        title: lessonData.title,
        objectives: lessonData.objectives ?? [],
        blocks,
        gradeLevel: request.gradeLevel,
      });

      if (!validationResult.valid) {
        console.warn('Generated lesson validation issues', {
          generationId,
          issues: validationResult.issues,
        });
      }

      const latencyMs = Date.now() - startTime;
      const metadata: GenerationMetadata = {
        generatedAt: new Date(),
        model: result.model,
        provider: result.provider,
        tokensUsed: result.usage.totalTokens,
        latencyMs,
        cached: result.cached,
      };

      const generatedLesson: GeneratedLesson = {
        id: generationId,
        title: lessonData.title ?? `Lesson: ${request.topic}`,
        description: lessonData.description ?? '',
        objectives: lessonData.objectives ?? [],
        duration: lessonData.duration ?? request.duration ?? 30,
        blocks,
        assessment,
        vocabulary: lessonData.vocabulary,
        teacherNotes: lessonData.teacherNotes,
        standards: request.standards,
        metadata,
      };

      await this.storeGeneration(generatedLesson, request);

      recordHistogram('lesson_generation.duration', latencyMs);
      incrementCounter('lesson_generation.success', { subject: request.subject });

      console.info('Lesson generation completed', {
        generationId,
        title: generatedLesson.title,
        blockCount: blocks.length,
        latencyMs,
      });

      return generatedLesson;
    } catch (error) {
      incrementCounter('lesson_generation.error', { subject: request.subject });
      console.error('Lesson generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Generate lesson outline (quick generation)
   */
  async generateOutline(
    topic: string,
    options: {
      subject: string;
      gradeLevel: GradeLevel;
      depth?: 'brief' | 'detailed';
      tenantId: string;
      userId: string;
    }
  ): Promise<LessonOutline> {
    const prompt = `Create a lesson outline for: "${topic}"

Subject: ${options.subject}
Grade Level: ${options.gradeLevel}
Detail Level: ${options.depth ?? 'brief'}

Provide a structured outline with:
1. Suggested lesson title
2. 3-5 learning objectives using action verbs (students will be able to...)
3. Main sections with key topics to cover
4. Estimated duration in minutes

Respond with valid JSON:
{
  "title": "string",
  "objectives": ["string"],
  "sections": [{"title": "string", "topics": ["string"], "duration": number}],
  "estimatedDuration": number
}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.6,
      maxTokens: 1000,
      metadata: {
        tenantId: options.tenantId,
        userId: options.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    return this.parseStructuredResponse(result.content);
  }

  /**
   * Generate lesson from standards
   */
  async generateFromStandards(
    standardIds: string[],
    standards: Array<{ id: string; code: string; description: string; subject: string; gradeLevel: string }>,
    options: Partial<LessonGenerationRequest>
  ): Promise<GeneratedLesson> {
    if (standards.length === 0) {
      throw new Error('No valid standards found');
    }

    const topic = standards.map((s) => s.description).join('. ');
    const subject = standards[0].subject;
    const gradeLevel = standards[0].gradeLevel as GradeLevel;

    return this.generateLesson({
      topic,
      subject,
      gradeLevel,
      standards: standards.map((s) => s.code),
      learningObjectives: standards.map((s) => s.description),
      tenantId: options.tenantId!,
      userId: options.userId!,
      ...options,
    });
  }

  /**
   * Enhance existing lesson with AI
   */
  async enhanceLesson(
    lessonContent: string,
    enhancements: {
      addExamples?: boolean;
      simplifyLanguage?: boolean;
      addInteractiveElements?: boolean;
      addVisualDescriptions?: boolean;
      improveEngagement?: boolean;
    },
    context: { tenantId: string; userId: string }
  ): Promise<string> {
    const instructions: string[] = [];

    if (enhancements.addExamples) {
      instructions.push('Add relevant real-world examples to illustrate key concepts');
    }
    if (enhancements.simplifyLanguage) {
      instructions.push('Simplify the language to make it more accessible while maintaining accuracy');
    }
    if (enhancements.addInteractiveElements) {
      instructions.push('Add suggestions for interactive elements like questions or activities');
    }
    if (enhancements.addVisualDescriptions) {
      instructions.push('Add descriptions of visuals or diagrams that would help explain the concepts');
    }
    if (enhancements.improveEngagement) {
      instructions.push('Make the content more engaging with hooks, questions, and relatable scenarios');
    }

    if (instructions.length === 0) {
      return lessonContent;
    }

    const prompt = `Enhance the following educational content:

ORIGINAL CONTENT:
${lessonContent}

ENHANCEMENT INSTRUCTIONS:
${instructions.map((instruction, idx) => `${idx + 1}. ${instruction}`).join('\n')}

Provide the enhanced version of the content, maintaining the core information while applying the requested improvements.`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert educational content enhancer. Improve content while preserving accuracy.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 3000,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    return result.content;
  }

  /**
   * Build the lesson generation prompt
   */
  private buildLessonPrompt(request: LessonGenerationRequest): string {
    const parts: string[] = [
      `Create a comprehensive ${request.duration ?? 30}-minute lesson on the topic: "${request.topic}"`,
      '',
      'CONTEXT:',
      `- Subject: ${request.subject}`,
      `- Grade Level: ${request.gradeLevel}`,
      `- Difficulty: ${request.difficultyLevel ?? 'intermediate'}`,
      `- Style: ${request.contentStyle ?? 'interactive'}`,
    ];

    if (request.standards?.length) {
      parts.push(`- Standards to address: ${request.standards.join(', ')}`);
    }
    if (request.learningObjectives?.length) {
      parts.push(`- Learning objectives: ${request.learningObjectives.join('; ')}`);
    }
    if (request.prerequisites?.length) {
      parts.push(`- Prerequisites: ${request.prerequisites.join(', ')}`);
    }
    if (request.keywords?.length) {
      parts.push(`- Key vocabulary: ${request.keywords.join(', ')}`);
    }
    if (request.targetAudience) {
      parts.push(`- Target audience: ${request.targetAudience}`);
    }

    parts.push('');
    parts.push('REQUIREMENTS:');
    parts.push('1. Create an engaging title that captures the lesson topic');
    parts.push('2. Write a brief description (2-3 sentences) explaining what students will learn');
    parts.push('3. Define 3-5 clear, measurable learning objectives using action verbs');
    parts.push('4. Structure the lesson into logical sections:');
    parts.push('   - Introduction/Hook (engage students with a question, scenario, or interesting fact)');
    parts.push('   - Core Content (main instructional content, broken into digestible chunks)');
    parts.push('   - Examples and Practice (worked examples, guided practice)');

    if (request.includeActivities) {
      parts.push('   - Interactive Activities (hands-on activities, discussions, group work)');
    }

    parts.push('   - Summary/Conclusion (key takeaways, review)');
    parts.push('5. Include relevant vocabulary terms with clear definitions');
    parts.push('6. Provide teacher notes with suggestions for differentiation and extension');

    if (request.includeAssessment) {
      parts.push('7. Include 5 assessment questions that align with the objectives');
    }

    parts.push('');
    parts.push('CONTENT GUIDELINES:');
    parts.push(`- Use clear, age-appropriate language for ${request.gradeLevel} students`);
    parts.push('- Include real-world connections and examples');
    parts.push('- Break complex concepts into smaller, manageable pieces');
    parts.push('- Use analogies and visual descriptions where helpful');
    parts.push('- Ensure content is accurate and up-to-date');
    parts.push('- Make the content engaging and interactive');
    parts.push('');
    parts.push(
      'Respond with valid JSON containing: title, description, objectives[], duration, sections[], vocabulary[], teacherNotes'
    );

    return parts.join('\n');
  }

  /**
   * Generate assessment for lesson
   */
  private async generateAssessment(
    lessonTitle: string,
    objectives: string[],
    request: LessonGenerationRequest
  ): Promise<GeneratedAssessment> {
    const prompt = `Create an assessment for the lesson: "${lessonTitle}"

Learning Objectives:
${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Grade Level: ${request.gradeLevel}
Difficulty: ${request.difficultyLevel ?? 'intermediate'}

Generate 5 assessment questions that:
1. Align with the learning objectives
2. Include a mix of question types (multiple choice, short answer)
3. Progress from basic recall to application/analysis
4. Include explanations for correct answers

Respond with JSON: {"questions": [{"type": "string", "stem": "string", "options": [{"text": "string", "correct": boolean}], "explanation": "string", "points": number}]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert assessment designer. Create valid, well-aligned assessments.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.5,
      maxTokens: 2000,
      metadata: {
        tenantId: request.tenantId,
        userId: request.userId,
        agentType: 'LESSON_PLANNER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      id: uuidv4(),
      type: 'quiz',
      questions: parsed.questions ?? [],
      metadata: {
        generatedAt: new Date(),
        model: result.model,
        provider: result.provider,
        tokensUsed: result.usage.totalTokens,
        latencyMs: result.latencyMs,
        cached: result.cached,
      },
    };
  }

  /**
   * Convert sections to blocks
   */
  private convertToBlocks(
    sections: Array<{
      title: string;
      type?: string;
      content?: string;
      activities?: Array<{ title: string; instructions: string; duration?: number; type?: string }>;
    }>
  ): GeneratedBlock[] {
    const blocks: GeneratedBlock[] = [];
    let order = 0;

    for (const section of sections) {
      blocks.push({
        id: uuidv4(),
        type: 'heading',
        order: order++,
        data: {
          level: 2,
          text: section.title,
        },
      });

      if (section.content) {
        blocks.push({
          id: uuidv4(),
          type: 'text',
          order: order++,
          data: {
            content: section.content,
          },
        });
      }

      if (section.activities?.length) {
        for (const activity of section.activities) {
          blocks.push({
            id: uuidv4(),
            type: 'activity',
            order: order++,
            data: {
              title: activity.title,
              instructions: activity.instructions,
              duration: activity.duration,
              type: activity.type,
            },
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Parse structured JSON response from LLM
   */
  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in response, returning empty object');
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch (error) {
      console.error('Failed to parse structured response', { error, content: content.slice(0, 500) });
      return {};
    }
  }

  /**
   * Store generation for review and analytics
   */
  private async storeGeneration(
    lesson: GeneratedLesson,
    request: LessonGenerationRequest
  ): Promise<void> {
    // In production, store to database
    console.info('Storing lesson generation', {
      id: lesson.id,
      title: lesson.title,
      tenantId: request.tenantId,
      userId: request.userId,
    });
  }
}
