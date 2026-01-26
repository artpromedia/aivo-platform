/**
 * Draft Generator Service
 *
 * AI-powered draft generation for educational content.
 * Generates complete drafts including sections, assessments, activities, and vocabulary.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  DraftGenerationRequest,
  GeneratedDraft,
  ContentSection,
  AssessmentQuestion,
  LearningActivity,
  VocabularyTerm,
  ImageSuggestion,
  CurriculumAlignment,
  ReadabilityMetrics,
  GenerationMetadata,
  DraftGeneratorConfig,
  ContentType,
} from '../types/ai-authoring.js';
import {
  buildLessonGenerationPrompt,
  LESSON_GENERATION_SYSTEM_PROMPT,
  SECTION_REGENERATION_PROMPT,
  CONTENT_EXPANSION_PROMPT,
} from './prompts/lesson-generation.prompt.js';
import { buildSimplificationPrompt, SIMPLIFICATION_SYSTEM_PROMPT } from './prompts/simplification.prompt.js';
import {
  getContentTypePrompt,
  getContentTypeSystemPrompt,
  buildActivityGenerationPrompt,
  buildReadingPassagePrompt,
  buildVideoScriptPrompt,
  buildFlashcardSetPrompt,
  buildStudyGuidePrompt,
} from './prompts/content-type-prompts.js';
import { buildAssessmentGenerationPrompt, ASSESSMENT_SYSTEM_PROMPT } from './prompts/assessment-generation.prompt.js';
import type { AIOrchestratorclient, AIMessage, AIRequestContext } from './ai-orchestrator-client.js';
import { getAIClient } from './ai-orchestrator-client.js';
import type { CurriculumService } from './curriculum-service.js';
import type { AICache } from './cache.js';

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: DraftGeneratorConfig = {
  maxContentLength: 50000,
  defaultTimeout: 120000,
  enableStreaming: false,
  cacheConfig: {
    enabled: true,
    ttlSeconds: 3600,
    maxSize: 1000,
  },
  qualityThreshold: 70,
};

// ══════════════════════════════════════════════════════════════════════════════
// DRAFT GENERATOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class DraftGenerator {
  private readonly aiClient: AIOrchestratorclient;
  private readonly curriculumService: CurriculumService | null;
  private readonly cache: AICache | null;
  private readonly config: DraftGeneratorConfig;

  // In-memory draft storage (would use database in production)
  private readonly drafts: Map<string, GeneratedDraft> = new Map();

  constructor(
    aiClient?: AIOrchestratorclient,
    curriculumService?: CurriculumService,
    cache?: AICache,
    config?: Partial<DraftGeneratorConfig>
  ) {
    this.aiClient = aiClient ?? getAIClient();
    this.curriculumService = curriculumService ?? null;
    this.cache = cache ?? null;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a complete draft based on the request
   */
  async generateDraft(request: DraftGenerationRequest): Promise<GeneratedDraft> {
    const startTime = Date.now();
    const draftId = uuidv4();

    console.info('Starting draft generation', {
      draftId,
      contentType: request.contentType,
      topic: request.topic,
      subject: request.subject,
      gradeLevel: request.gradeLevel,
    });

    try {
      // Build the prompt based on content type
      const { systemPrompt, userPrompt } = this.buildPrompts(request);

      // Make the AI request
      const context: AIRequestContext = {
        tenantId: request.tenantId,
        userId: request.userId,
        sessionId: request.sessionId,
        agentType: 'CONTENT_AUTHORING',
      };

      const messages: AIMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.aiClient.complete({
        messages,
        options: {
          temperature: 0.7,
          maxTokens: this.config.maxContentLength,
          timeout: this.config.defaultTimeout,
        },
        context,
      });

      // Parse the response
      const parsedContent = this.parseGeneratedContent(response.content, request.contentType);

      // Calculate readability metrics
      const fullContent = this.extractFullContent(parsedContent);
      const readabilityScore = this.calculateReadabilityMetrics(fullContent, request.gradeLevel);

      // Get curriculum alignment if standards provided
      let curriculumAlignment: CurriculumAlignment;
      if (this.curriculumService && request.curriculumStandards.length > 0) {
        curriculumAlignment = await this.curriculumService.validateAlignment(
          fullContent,
          request.curriculumStandards,
          request.subject,
          request.gradeLevel
        );
      } else {
        curriculumAlignment = this.createDefaultAlignment(request.curriculumStandards);
      }

      const latencyMs = Date.now() - startTime;

      // Build the generation metadata
      const generationMetadata: GenerationMetadata = {
        generatedAt: new Date(),
        model: response.model,
        provider: response.provider,
        tokensUsed: response.usage.totalTokens,
        latencyMs,
        cached: response.cached,
        requestId: draftId,
        version: '1.0.0',
      };

      // Assemble the final draft
      const draft: GeneratedDraft = {
        id: draftId,
        title: parsedContent.title ?? `${request.contentType}: ${request.topic}`,
        content: fullContent,
        description: parsedContent.description ?? '',
        sections: this.normalizeSections(parsedContent.sections ?? []),
        suggestedImages: parsedContent.suggestedImages ?? [],
        assessmentQuestions: request.includeAssessments
          ? (parsedContent.assessmentQuestions ?? [])
          : undefined,
        activities: request.includeActivities
          ? (parsedContent.activities ?? [])
          : undefined,
        vocabularyTerms: parsedContent.vocabularyTerms ?? [],
        curriculumAlignment,
        readabilityScore,
        generationMetadata,
        status: 'draft',
        tenantId: request.tenantId,
        createdBy: request.userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store the draft
      this.drafts.set(draftId, draft);

      console.info('Draft generation completed', {
        draftId,
        title: draft.title,
        sectionCount: draft.sections.length,
        latencyMs,
      });

      return draft;
    } catch (error) {
      console.error('Draft generation failed', { draftId, error });
      throw error;
    }
  }

  /**
   * Regenerate a specific section of a draft
   */
  async regenerateSection(
    draftId: string,
    sectionIndex: number,
    feedback?: string
  ): Promise<ContentSection> {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    if (sectionIndex < 0 || sectionIndex >= draft.sections.length) {
      throw new Error(`Invalid section index: ${sectionIndex}`);
    }

    const originalSection = draft.sections[sectionIndex];
    const previousSection = sectionIndex > 0 ? draft.sections[sectionIndex - 1] : null;
    const nextSection = sectionIndex < draft.sections.length - 1
      ? draft.sections[sectionIndex + 1]
      : null;

    const prompt = SECTION_REGENERATION_PROMPT
      .replace('{originalSection}', JSON.stringify(originalSection))
      .replace('{feedback}', feedback ?? 'Please improve this section')
      .replace('{topic}', draft.title)
      .replace('{gradeLevel}', draft.readabilityScore.targetGradeLevel.toString())
      .replace('{subject}', 'the subject')
      .replace('{previousSectionSummary}', previousSection?.title ?? 'N/A')
      .replace('{nextSectionSummary}', nextSection?.title ?? 'N/A');

    const response = await this.aiClient.complete({
      messages: [
        { role: 'system', content: LESSON_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      options: { temperature: 0.7, maxTokens: 2000 },
      context: { tenantId: draft.tenantId },
    });

    const regeneratedSection = this.parseSection(response.content, sectionIndex);

    // Update the draft
    draft.sections[sectionIndex] = regeneratedSection;
    draft.updatedAt = new Date();
    this.drafts.set(draftId, draft);

    return regeneratedSection;
  }

  /**
   * Expand content in a specific section
   */
  async expandContent(
    draftId: string,
    sectionIndex: number,
    targetLength: number
  ): Promise<ContentSection> {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    if (sectionIndex < 0 || sectionIndex >= draft.sections.length) {
      throw new Error(`Invalid section index: ${sectionIndex}`);
    }

    const originalSection = draft.sections[sectionIndex];
    const currentLength = originalSection.content.split(/\s+/).length;

    const prompt = CONTENT_EXPANSION_PROMPT
      .replace('{originalContent}', JSON.stringify(originalSection))
      .replace('{targetLength}', targetLength.toString())
      .replace('{currentLength}', currentLength.toString())
      .replace('{topic}', draft.title)
      .replace('{gradeLevel}', draft.readabilityScore.targetGradeLevel.toString())
      .replace('{subject}', 'the subject');

    const response = await this.aiClient.complete({
      messages: [
        { role: 'system', content: LESSON_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      options: { temperature: 0.6, maxTokens: 3000 },
      context: { tenantId: draft.tenantId },
    });

    const expandedSection = this.parseSection(response.content, sectionIndex);

    // Update the draft
    draft.sections[sectionIndex] = expandedSection;
    draft.content = this.extractFullContent({
      sections: draft.sections,
    });
    draft.updatedAt = new Date();
    this.drafts.set(draftId, draft);

    return expandedSection;
  }

  /**
   * Simplify content for a lower grade level
   */
  async simplifyContent(
    draftId: string,
    targetGradeLevel: number
  ): Promise<GeneratedDraft> {
    const draft = this.drafts.get(draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }

    const prompt = buildSimplificationPrompt(
      draft.content,
      draft.readabilityScore.targetGradeLevel,
      targetGradeLevel
    );

    const response = await this.aiClient.complete({
      messages: [
        { role: 'system', content: SIMPLIFICATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      options: { temperature: 0.5, maxTokens: this.config.maxContentLength },
      context: { tenantId: draft.tenantId },
    });

    const simplifiedContent = this.parseGeneratedContent(response.content, 'lesson');

    // Create a new simplified draft
    const simplifiedDraftId = uuidv4();
    const simplifiedDraft: GeneratedDraft = {
      ...draft,
      id: simplifiedDraftId,
      title: simplifiedContent.title ?? draft.title,
      description: simplifiedContent.description ?? draft.description,
      sections: this.normalizeSections(simplifiedContent.sections ?? draft.sections),
      content: this.extractFullContent(simplifiedContent),
      vocabularyTerms: simplifiedContent.vocabularyTerms ?? draft.vocabularyTerms,
      suggestedImages: simplifiedContent.suggestedImages ?? draft.suggestedImages,
      readabilityScore: this.calculateReadabilityMetrics(
        this.extractFullContent(simplifiedContent),
        targetGradeLevel
      ),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.drafts.set(simplifiedDraftId, simplifiedDraft);

    return simplifiedDraft;
  }

  /**
   * Generate an assessment for existing content
   */
  async generateAssessmentForContent(
    contentId: string,
    content: string,
    request: {
      questionCount: number;
      questionTypes: string[];
      difficulty?: string;
      bloomsLevels?: string[];
      tenantId: string;
      userId?: string;
    }
  ): Promise<AssessmentQuestion[]> {
    const prompt = buildAssessmentGenerationPrompt(
      content,
      {
        contentId,
        questionCount: request.questionCount,
        questionTypes: request.questionTypes as any,
        difficulty: request.difficulty as any,
        bloomsLevels: request.bloomsLevels as any,
      },
      [] // Learning objectives would come from content metadata
    );

    const response = await this.aiClient.complete({
      messages: [
        { role: 'system', content: ASSESSMENT_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      options: { temperature: 0.5, maxTokens: 4000 },
      context: {
        tenantId: request.tenantId,
        userId: request.userId,
      },
    });

    const parsed = this.parseJSON(response.content);
    return parsed.questions ?? [];
  }

  /**
   * Get a stored draft by ID
   */
  getDraft(draftId: string): GeneratedDraft | undefined {
    return this.drafts.get(draftId);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private buildPrompts(request: DraftGenerationRequest): {
    systemPrompt: string;
    userPrompt: string;
  } {
    switch (request.contentType) {
      case 'lesson':
        return {
          systemPrompt: LESSON_GENERATION_SYSTEM_PROMPT,
          userPrompt: buildLessonGenerationPrompt(request),
        };

      case 'assessment':
        return {
          systemPrompt: ASSESSMENT_SYSTEM_PROMPT,
          userPrompt: buildAssessmentGenerationPrompt(
            request.topic,
            {
              contentId: '',
              questionCount: 10,
              questionTypes: ['multiple_choice', 'short_answer'],
            },
            request.learningObjectives
          ),
        };

      case 'activity':
        return {
          systemPrompt: getContentTypeSystemPrompt('activity'),
          userPrompt: buildActivityGenerationPrompt(request),
        };

      case 'reading-passage':
        return {
          systemPrompt: getContentTypeSystemPrompt('reading-passage'),
          userPrompt: buildReadingPassagePrompt(request),
        };

      case 'video-script':
        return {
          systemPrompt: getContentTypeSystemPrompt('video-script'),
          userPrompt: buildVideoScriptPrompt(request),
        };

      case 'study-guide':
        return {
          systemPrompt: getContentTypeSystemPrompt('study-guide'),
          userPrompt: buildStudyGuidePrompt(request),
        };

      case 'flashcard-set':
        return {
          systemPrompt: getContentTypeSystemPrompt('flashcard-set'),
          userPrompt: buildFlashcardSetPrompt(request),
        };

      default:
        return {
          systemPrompt: getContentTypeSystemPrompt(request.contentType),
          userPrompt: getContentTypePrompt(request),
        };
    }
  }

  private parseGeneratedContent(content: string, contentType: ContentType): Record<string, any> {
    const parsed = this.parseJSON(content);

    // Normalize based on content type
    if (contentType === 'lesson') {
      return {
        title: parsed.title,
        description: parsed.description,
        sections: parsed.sections ?? [],
        vocabularyTerms: this.normalizeVocabulary(parsed.vocabularyTerms ?? parsed.vocabulary ?? []),
        suggestedImages: parsed.suggestedImages ?? [],
        assessmentQuestions: parsed.assessmentQuestions ?? parsed.assessment?.questions ?? [],
        activities: parsed.activities ?? [],
      };
    }

    if (contentType === 'assessment') {
      return {
        title: parsed.title,
        description: parsed.description ?? parsed.instructions,
        assessmentQuestions: parsed.questions ?? [],
        sections: [],
        vocabularyTerms: [],
        suggestedImages: [],
        activities: [],
      };
    }

    if (contentType === 'flashcard-set') {
      // Convert flashcards to sections format
      const cards = parsed.cards ?? [];
      return {
        title: parsed.title,
        description: parsed.description,
        sections: [{
          id: uuidv4(),
          title: 'Flashcards',
          type: 'practice',
          content: JSON.stringify(cards),
          order: 0,
        }],
        vocabularyTerms: cards.map((card: any) => ({
          term: card.front?.text ?? card.term,
          definition: card.back?.text ?? card.definition,
          examples: card.back?.examples ?? [],
          gradeAppropriate: true,
        })),
        suggestedImages: [],
        assessmentQuestions: [],
        activities: [],
      };
    }

    // Default handling
    return {
      title: parsed.title,
      description: parsed.description,
      sections: parsed.sections ?? [],
      vocabularyTerms: this.normalizeVocabulary(parsed.vocabularyTerms ?? parsed.vocabulary ?? []),
      suggestedImages: parsed.suggestedImages ?? [],
      assessmentQuestions: parsed.assessmentQuestions ?? [],
      activities: parsed.activities ?? [],
    };
  }

  private parseJSON(content: string): Record<string, any> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = /\{[\s\S]*\}/.exec(content);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return {};
    } catch (error) {
      console.warn('Failed to parse JSON from AI response', { error });
      return {};
    }
  }

  private parseSection(content: string, index: number): ContentSection {
    const parsed = this.parseJSON(content);
    return {
      id: parsed.id ?? uuidv4(),
      title: parsed.title ?? `Section ${index + 1}`,
      type: parsed.type ?? 'instruction',
      content: parsed.content ?? '',
      order: index,
      duration: parsed.duration,
      blocks: parsed.blocks,
      teacherNotes: parsed.teacherNotes,
    };
  }

  private normalizeSections(sections: any[]): ContentSection[] {
    return sections.map((section, index) => ({
      id: section.id ?? uuidv4(),
      title: section.title ?? `Section ${index + 1}`,
      type: section.type ?? 'instruction',
      content: section.content ?? '',
      order: section.order ?? index,
      duration: section.duration,
      blocks: section.blocks,
      teacherNotes: section.teacherNotes,
    }));
  }

  private normalizeVocabulary(vocab: any[]): VocabularyTerm[] {
    return vocab.map((item) => ({
      term: item.term ?? item.word ?? '',
      definition: item.definition ?? '',
      pronunciation: item.pronunciation,
      partOfSpeech: item.partOfSpeech,
      examples: Array.isArray(item.examples) ? item.examples : (item.example ? [item.example] : []),
      context: item.context,
      gradeAppropriate: item.gradeAppropriate ?? true,
    }));
  }

  private extractFullContent(parsed: Record<string, any>): string {
    const parts: string[] = [];

    if (parsed.title) {
      parts.push(`# ${parsed.title}`);
    }

    if (parsed.description) {
      parts.push(parsed.description);
    }

    if (parsed.sections?.length) {
      for (const section of parsed.sections) {
        parts.push(`\n## ${section.title}\n`);
        parts.push(section.content ?? '');
      }
    }

    if (parsed.passage) {
      parts.push(parsed.passage);
    }

    return parts.join('\n\n');
  }

  private calculateReadabilityMetrics(content: string, targetGradeLevel: number): ReadabilityMetrics {
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const syllables = this.countSyllables(content);

    const wordCount = words.length;
    const sentenceCount = Math.max(sentences.length, 1);
    const syllableCount = syllables;

    const avgSentenceLength = wordCount / sentenceCount;
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / Math.max(wordCount, 1);
    const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1);

    // Flesch-Kincaid Grade Level
    const fleschKincaidGrade = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

    // Flesch Reading Ease
    const fleschReadingEase = 206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord;

    // Complex words (3+ syllables)
    const complexWordCount = words.filter((w) => this.countWordSyllables(w) >= 3).length;
    const complexWordPercentage = (complexWordCount / Math.max(wordCount, 1)) * 100;

    // Determine if appropriate for target grade
    const gradeDiff = Math.abs(fleschKincaidGrade - targetGradeLevel);
    const targetGradeAppropriate = gradeDiff <= 2;

    return {
      fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
      fleschReadingEase: Math.round(fleschReadingEase * 10) / 10,
      averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      averageWordLength: Math.round(avgWordLength * 10) / 10,
      complexWordPercentage: Math.round(complexWordPercentage * 10) / 10,
      sentenceCount,
      wordCount,
      syllableCount,
      targetGradeLevel,
      targetGradeAppropriate,
      recommendation: targetGradeAppropriate
        ? undefined
        : `Content reads at grade ${Math.round(fleschKincaidGrade)} level. Target is grade ${targetGradeLevel}.`,
    };
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
    return words.reduce((sum, word) => sum + this.countWordSyllables(word), 0);
  }

  private countWordSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;

    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  private createDefaultAlignment(standards: string[]): CurriculumAlignment {
    return {
      primaryStandards: standards.map((s) => ({
        standardId: s,
        standardCode: s,
        standardText: s,
        alignmentStrength: 'moderate' as const,
        evidence: [],
        confidence: 0.5,
      })),
      secondaryStandards: [],
      misalignments: [],
      coverageScore: standards.length > 0 ? 50 : 0,
      depthOfKnowledge: 2,
      suggestions: [],
      validatedAt: new Date(),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

export function createDraftGenerator(
  aiClient?: AIOrchestratorclient,
  curriculumService?: CurriculumService,
  cache?: AICache,
  config?: Partial<DraftGeneratorConfig>
): DraftGenerator {
  return new DraftGenerator(aiClient, curriculumService, cache, config);
}
