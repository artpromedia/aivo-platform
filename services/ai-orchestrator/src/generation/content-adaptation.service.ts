/**
 * Content Adaptation Service
 *
 * Adapts educational content to match learner reading levels.
 * Enables grade-level concepts to be delivered at appropriate
 * language complexity for each student.
 *
 * Key capability: An 8th-grade concept can be explained using
 * 5th-grade reading level language for struggling readers.
 */

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';
import {
  ReadabilityAnalysisService,
  LEXILE_GRADE_RANGES,
  type ReadabilityAnalysis,
} from './readability-analysis.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentAdaptationRequest {
  /** Original content to adapt */
  content: string;
  /** Target Lexile level for the adapted content */
  targetLexile: number;
  /** Current Lexile level of the content (optional - will be analyzed if not provided) */
  currentLexile?: number;
  /** Subject area for context */
  subject?: string;
  /** Specific topic */
  topic?: string;
  /** Grade level of the concept (not the reading level) */
  conceptGradeLevel?: string;
  /** Content type */
  contentType?: 'instruction' | 'explanation' | 'question' | 'feedback' | 'narrative';
  /** Whether to preserve specific technical terms */
  preserveTerms?: string[];
  /** Additional context for adaptation */
  context?: {
    learnerProfile?: {
      hasIEP?: boolean;
      englishLearner?: boolean;
      interests?: string[];
    };
  };
  /** Tenant ID for tracking */
  tenantId?: string;
  /** Learner ID for tracking */
  learnerId?: string;
}

export interface AdaptedContent {
  /** The adapted content at target reading level */
  adaptedContent: string;
  /** Original content for reference */
  originalContent: string;
  /** Achieved Lexile level of adapted content */
  achievedLexile: number;
  /** Target Lexile level requested */
  targetLexile: number;
  /** Grade equivalent of adapted content */
  gradeEquivalent: number;
  /** List of terms that were simplified with their replacements */
  simplifications: Array<{
    original: string;
    simplified: string;
    reason?: string;
  }>;
  /** Terms preserved from original (technical vocabulary) */
  preservedTerms: string[];
  /** Vocabulary support - definitions for key terms */
  vocabularySupport?: Array<{
    term: string;
    definition: string;
    exampleSentence?: string;
  }>;
  /** Confidence in adaptation quality */
  confidence: number;
}

export interface BatchAdaptationRequest {
  items: Array<{
    id: string;
    content: string;
    contentType?: ContentAdaptationRequest['contentType'];
  }>;
  targetLexile: number;
  subject?: string;
  preserveTerms?: string[];
  tenantId?: string;
}

export interface ScaffoldedContent {
  /** Multiple versions at different reading levels */
  versions: Array<{
    lexileLevel: number;
    gradeEquivalent: number;
    content: string;
    vocabularySupport?: AdaptedContent['vocabularySupport'];
  }>;
  /** Recommended version based on learner's level */
  recommendedVersion: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const ADAPTATION_SYSTEM_PROMPT = `You are an expert educational content adapter specializing in making complex content accessible to readers at different levels.

Your task is to rewrite content to match a specific Lexile reading level while preserving the educational meaning and accuracy.

Key principles:
1. PRESERVE ACCURACY: The adapted content must teach the same concept correctly
2. SIMPLIFY LANGUAGE: Use shorter sentences, simpler vocabulary, but keep meaning
3. MAINTAIN ENGAGEMENT: Keep the content interesting and age-appropriate
4. SUPPORT COMPREHENSION: Add context clues and examples when helpful
5. RESPECT THE LEARNER: Simplified ≠ dumbed down - maintain dignity and substance`;

const LEXILE_ADAPTATION_GUIDELINES: Record<string, string> = {
  below_500: `Target: Early elementary (K-2)
- Use very short sentences (5-10 words)
- Basic vocabulary only (Dolch/Fry word lists)
- One idea per sentence
- Concrete, familiar examples
- Avoid idioms and figurative language`,

  '500_700': `Target: Upper elementary (3-4)
- Short to medium sentences (8-15 words)
- Introduce topic vocabulary with context
- Simple compound sentences okay
- Relatable examples from everyday life
- Define technical terms inline`,

  '700_900': `Target: Late elementary / Early middle (5-6)
- Medium length sentences (12-18 words)
- Academic vocabulary with support
- Complex sentences sparingly
- Examples can be more abstract
- Can reference prior knowledge`,

  '900_1100': `Target: Middle school (7-8)
- Normal sentence variety
- Academic language expected
- Complex ideas in clear structure
- Domain-specific vocabulary okay
- Connections across concepts`,

  above_1100: `Target: High school (9-12)
- Full academic register
- Complex sentence structures
- Advanced vocabulary
- Abstract reasoning
- Nuanced explanations`,
};

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ContentAdaptationService {
  private readabilityService: ReadabilityAnalysisService;

  constructor(private llm: LLMOrchestrator) {
    this.readabilityService = new ReadabilityAnalysisService(llm);
  }

  /**
   * Adapt content to a target reading level
   */
  async adaptContent(request: ContentAdaptationRequest): Promise<AdaptedContent> {
    const startTime = Date.now();
    incrementCounter('content.adaptation.started');

    try {
      const {
        content,
        targetLexile,
        currentLexile,
        subject,
        topic,
        conceptGradeLevel,
        contentType = 'explanation',
        preserveTerms = [],
        context,
        tenantId,
        learnerId,
      } = request;

      // Analyze current content if Lexile not provided
      let sourceLexile = currentLexile;
      if (!sourceLexile) {
        const analysis = await this.readabilityService.estimateLexileLevel({
          text: content,
          context: { subject, contentType },
          tenantId,
        });
        sourceLexile = analysis.lexileLevel;
      }

      // Determine if adaptation is needed
      const lexileDiff = sourceLexile - targetLexile;
      if (Math.abs(lexileDiff) < 50) {
        // Content is already close to target level
        return {
          adaptedContent: content,
          originalContent: content,
          achievedLexile: sourceLexile,
          targetLexile,
          gradeEquivalent: this.readabilityService.lexileToGradeEquivalent(sourceLexile),
          simplifications: [],
          preservedTerms,
          confidence: 0.95,
        };
      }

      // Build adaptation prompt
      const guidelines = this.getAdaptationGuidelines(targetLexile);
      const prompt = this.buildAdaptationPrompt({
        content,
        sourceLexile,
        targetLexile,
        guidelines,
        subject,
        topic,
        conceptGradeLevel,
        contentType,
        preserveTerms,
        learnerContext: context?.learnerProfile,
      });

      const messages: LLMMessage[] = [
        { role: 'system', content: ADAPTATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.4,
        maxTokens: Math.max(2000, content.length * 2),
        metadata: {
          tenantId: tenantId ?? 'system',
          userId: learnerId ?? 'system',
          agentType: 'CONTENT_ADAPTER',
        },
      });

      const parsed = this.parseAdaptationResponse(result.content);

      // Verify adapted content meets target
      const verificationResult = await this.readabilityService.estimateLexileLevel({
        text: parsed.adaptedContent,
        context: { subject, contentType },
        tenantId,
      });

      const adaptedResult: AdaptedContent = {
        adaptedContent: parsed.adaptedContent,
        originalContent: content,
        achievedLexile: verificationResult.lexileLevel,
        targetLexile,
        gradeEquivalent: verificationResult.gradeEquivalent,
        simplifications: parsed.simplifications ?? [],
        preservedTerms: parsed.preservedTerms ?? preserveTerms,
        vocabularySupport: parsed.vocabularySupport,
        confidence: this.calculateConfidence(targetLexile, verificationResult.lexileLevel),
      };

      const latencyMs = Date.now() - startTime;
      recordHistogram('content.adaptation.duration', latencyMs);
      incrementCounter('content.adaptation.success');

      return adaptedResult;
    } catch (error) {
      incrementCounter('content.adaptation.error');
      console.error('Content adaptation failed', { error });
      throw error;
    }
  }

  /**
   * Generate scaffolded versions at multiple reading levels
   */
  async generateScaffoldedVersions(
    content: string,
    options: {
      levels: number[]; // Array of Lexile levels
      subject?: string;
      preserveTerms?: string[];
      learnerCurrentLexile?: number;
      tenantId?: string;
    }
  ): Promise<ScaffoldedContent> {
    const { levels, subject, preserveTerms, learnerCurrentLexile, tenantId } = options;

    // Sort levels from easiest to hardest
    const sortedLevels = [...levels].sort((a, b) => a - b);

    const versions: ScaffoldedContent['versions'] = [];

    for (const targetLexile of sortedLevels) {
      const adapted = await this.adaptContent({
        content,
        targetLexile,
        subject,
        preserveTerms,
        tenantId,
      });

      versions.push({
        lexileLevel: adapted.achievedLexile,
        gradeEquivalent: adapted.gradeEquivalent,
        content: adapted.adaptedContent,
        vocabularySupport: adapted.vocabularySupport,
      });
    }

    // Determine recommended version based on learner's level
    let recommendedVersion = 0;
    if (learnerCurrentLexile) {
      for (let i = 0; i < versions.length; i++) {
        // Find version closest to learner's level (slightly below for comfort)
        if (versions[i].lexileLevel <= learnerCurrentLexile + 50) {
          recommendedVersion = i;
        }
      }
    }

    return {
      versions,
      recommendedVersion,
    };
  }

  /**
   * Batch adapt multiple content items
   */
  async batchAdapt(request: BatchAdaptationRequest): Promise<Map<string, AdaptedContent>> {
    const results = new Map<string, AdaptedContent>();

    // Process in parallel with concurrency limit
    const CONCURRENCY = 3;
    const items = request.items;

    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const batch = items.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          const adapted = await this.adaptContent({
            content: item.content,
            targetLexile: request.targetLexile,
            subject: request.subject,
            contentType: item.contentType,
            preserveTerms: request.preserveTerms,
            tenantId: request.tenantId,
          });
          return { id: item.id, adapted };
        })
      );

      for (const { id, adapted } of batchResults) {
        results.set(id, adapted);
      }
    }

    return results;
  }

  /**
   * Adapt a question while preserving assessment validity
   */
  async adaptQuestion(
    question: {
      prompt: string;
      options?: string[];
      correctAnswer: string;
      explanation?: string;
    },
    targetLexile: number,
    options?: {
      subject?: string;
      preserveTerms?: string[];
      tenantId?: string;
    }
  ): Promise<{
    prompt: string;
    options?: string[];
    correctAnswer: string;
    explanation?: string;
    originalPrompt: string;
    achievedLexile: number;
  }> {
    const prompt = `Adapt this assessment question for a ${targetLexile}L reading level.
CRITICAL: The question must test the SAME concept and have the SAME correct answer.

QUESTION:
${question.prompt}

${question.options ? `OPTIONS:\n${question.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}` : ''}

CORRECT ANSWER: ${question.correctAnswer}

${question.explanation ? `EXPLANATION: ${question.explanation}` : ''}

Target Reading Level: ${targetLexile}L (${this.getGradeDescription(targetLexile)})
${options?.preserveTerms?.length ? `Preserve these terms: ${options.preserveTerms.join(', ')}` : ''}

Respond with JSON:
{
  "prompt": "adapted question text",
  "options": ["option1", "option2", ...] or null,
  "correctAnswer": "same correct answer, possibly simplified",
  "explanation": "adapted explanation or null"
}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content:
          'You are an expert at adapting assessment questions for different reading levels while maintaining construct validity.',
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 1500,
      metadata: {
        tenantId: options?.tenantId ?? 'system',
        userId: 'system',
        agentType: 'CONTENT_ADAPTER',
      },
    });

    const parsed = this.parseJsonResponse(result.content);

    // Verify reading level
    const verification = await this.readabilityService.estimateLexileLevel({
      text: (parsed.prompt as string) ?? question.prompt,
      context: { subject: options?.subject, contentType: 'assessment' },
    });

    return {
      prompt: (parsed.prompt as string) ?? question.prompt,
      options: parsed.options as string[] | undefined,
      correctAnswer: (parsed.correctAnswer as string) ?? question.correctAnswer,
      explanation: parsed.explanation as string | undefined,
      originalPrompt: question.prompt,
      achievedLexile: verification.lexileLevel,
    };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private getAdaptationGuidelines(targetLexile: number): string {
    if (targetLexile < 500) return LEXILE_ADAPTATION_GUIDELINES.below_500;
    if (targetLexile < 700) return LEXILE_ADAPTATION_GUIDELINES['500_700'];
    if (targetLexile < 900) return LEXILE_ADAPTATION_GUIDELINES['700_900'];
    if (targetLexile < 1100) return LEXILE_ADAPTATION_GUIDELINES['900_1100'];
    return LEXILE_ADAPTATION_GUIDELINES.above_1100;
  }

  private getGradeDescription(lexile: number): string {
    if (lexile < 300) return 'K-1st grade level';
    if (lexile < 500) return '2nd-3rd grade level';
    if (lexile < 700) return '3rd-4th grade level';
    if (lexile < 850) return '4th-5th grade level';
    if (lexile < 1000) return '6th-7th grade level';
    if (lexile < 1100) return '7th-8th grade level';
    if (lexile < 1200) return '9th-10th grade level';
    return '11th-12th grade level';
  }

  private buildAdaptationPrompt(options: {
    content: string;
    sourceLexile: number;
    targetLexile: number;
    guidelines: string;
    subject?: string;
    topic?: string;
    conceptGradeLevel?: string;
    contentType?: string;
    preserveTerms?: string[];
    learnerContext?: ContentAdaptationRequest['context']['learnerProfile'];
  }): string {
    const {
      content,
      sourceLexile,
      targetLexile,
      guidelines,
      subject,
      topic,
      conceptGradeLevel,
      contentType,
      preserveTerms,
      learnerContext,
    } = options;

    const direction = sourceLexile > targetLexile ? 'SIMPLIFY' : 'ELEVATE';

    let prompt = `${direction} this ${contentType ?? 'content'} from ${sourceLexile}L to ${targetLexile}L reading level.

ORIGINAL CONTENT:
"""
${content}
"""

TARGET READING LEVEL GUIDELINES:
${guidelines}

${subject ? `SUBJECT: ${subject}` : ''}
${topic ? `TOPIC: ${topic}` : ''}
${conceptGradeLevel ? `CONCEPT GRADE LEVEL: ${conceptGradeLevel} (keep the concept at this level, only adapt the language)` : ''}
`;

    if (preserveTerms && preserveTerms.length > 0) {
      prompt += `\nPRESERVE THESE TERMS (do not simplify): ${preserveTerms.join(', ')}\n`;
    }

    if (learnerContext) {
      prompt += '\nLEARNER CONTEXT:\n';
      if (learnerContext.hasIEP) {
        prompt += '- Has IEP: Use extra clear structure and explicit connections\n';
      }
      if (learnerContext.englishLearner) {
        prompt += '- English Learner: Avoid idioms, provide context for cultural references\n';
      }
      if (learnerContext.interests?.length) {
        prompt += `- Interests: ${learnerContext.interests.join(', ')} (use relevant examples when possible)\n`;
      }
    }

    prompt += `
REQUIREMENTS:
1. Adapt to exactly ${targetLexile}L reading level
2. Preserve all educational accuracy and key concepts
3. ${direction === 'SIMPLIFY' ? 'Use shorter sentences, simpler vocabulary, more examples' : 'Use richer vocabulary, more complex structures'}
4. Keep the same learning objective
5. Provide vocabulary support for key terms

Respond with JSON:
{
  "adaptedContent": "the rewritten content at target level",
  "simplifications": [
    {"original": "complex phrase", "simplified": "simpler version", "reason": "why changed"}
  ],
  "preservedTerms": ["term1", "term2"],
  "vocabularySupport": [
    {"term": "key word", "definition": "simple definition", "exampleSentence": "example"}
  ]
}`;

    return prompt;
  }

  private parseAdaptationResponse(content: string): {
    adaptedContent: string;
    simplifications?: AdaptedContent['simplifications'];
    preservedTerms?: string[];
    vocabularySupport?: AdaptedContent['vocabularySupport'];
  } {
    const parsed = this.parseJsonResponse(content);

    return {
      adaptedContent: (parsed.adaptedContent as string) ?? content,
      simplifications: parsed.simplifications as AdaptedContent['simplifications'],
      preservedTerms: parsed.preservedTerms as string[],
      vocabularySupport: parsed.vocabularySupport as AdaptedContent['vocabularySupport'],
    };
  }

  private parseJsonResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { adaptedContent: content };
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return { adaptedContent: content };
    }
  }

  private calculateConfidence(targetLexile: number, achievedLexile: number): number {
    const diff = Math.abs(targetLexile - achievedLexile);
    if (diff <= 25) return 0.95;
    if (diff <= 50) return 0.9;
    if (diff <= 100) return 0.8;
    if (diff <= 150) return 0.7;
    return 0.6;
  }
}
