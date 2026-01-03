/**
 * Content Translation Service
 *
 * AI-powered educational content translation:
 * - Preserves educational context
 * - Maintains formatting
 * - Handles technical terminology
 * - Supports localization
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type {
  TranslationRequest,
  TranslatedContent,
  TranslationGlossaryItem,
  GenerationMetadata,
} from './types.js';

const TRANSLATION_SYSTEM_PROMPT = `You are an expert educational content translator.
When translating:
- Maintain the educational intent and tone
- Preserve all formatting (markdown, HTML, etc.)
- Keep technical terminology accurate
- Use age-appropriate language
- Maintain cultural sensitivity
- Preserve numerical values and formulas
- Keep proper nouns unless there's a common translation`;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese (Simplified)',
  'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
  ru: 'Russian',
  vi: 'Vietnamese',
  th: 'Thai',
  pl: 'Polish',
  nl: 'Dutch',
  tr: 'Turkish',
  he: 'Hebrew',
  uk: 'Ukrainian',
};

const CONTENT_TYPE_GUIDANCE: Record<string, string> = {
  lesson:
    'This is educational lesson content. Maintain instructional clarity and engagement. Keep learning objectives clear.',
  question:
    'This is an assessment question. Maintain precision and avoid ambiguity. Preserve correct answer logic.',
  feedback:
    'This is student feedback. Maintain encouraging tone and constructive guidance.',
  general: 'General educational content. Maintain clarity and educational value.',
};

export class TranslationService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Translate educational content
   */
  async translate(request: TranslationRequest): Promise<TranslatedContent> {
    const translationId = uuidv4();
    const startTime = Date.now();

    const sourceLang = LANGUAGE_NAMES[request.sourceLanguage] ?? request.sourceLanguage;
    const targetLang = LANGUAGE_NAMES[request.targetLanguage] ?? request.targetLanguage;

    console.info('Starting translation', {
      translationId,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      contentType: request.contentType,
    });

    try {
      incrementCounter('translation.started', { target: request.targetLanguage });

      const prompt = this.buildTranslationPrompt(request, sourceLang, targetLang);

      const messages: LLMMessage[] = [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.3,
        maxTokens: Math.max(4000, request.content.length * 2),
        metadata: {
          tenantId: request.tenantId,
          userId: request.userId,
          agentType: 'OTHER',
        },
      });

      const parsed = this.parseTranslationResponse(result.content);
      const latencyMs = Date.now() - startTime;

      const translation: TranslatedContent = {
        translatedText: parsed.translation ?? result.content,
        sourceLanguage: request.sourceLanguage,
        targetLanguage: request.targetLanguage,
        glossary: parsed.glossary,
        metadata: {
          generatedAt: new Date(),
          model: result.model,
          provider: result.provider,
          tokensUsed: result.usage.totalTokens,
          latencyMs,
          cached: result.cached,
        },
      };

      recordHistogram('translation.duration', latencyMs);
      incrementCounter('translation.success', { target: request.targetLanguage });

      console.info('Translation completed', {
        translationId,
        inputLength: request.content.length,
        outputLength: translation.translatedText.length,
        latencyMs,
      });

      return translation;
    } catch (error) {
      incrementCounter('translation.error', { target: request.targetLanguage });
      console.error('Translation failed', { translationId, error });
      throw error;
    }
  }

  /**
   * Translate multiple content items in batch
   */
  async translateBatch(
    items: Array<{ id: string; content: string; contentType?: string }>,
    sourceLanguage: string,
    targetLanguage: string,
    context: { tenantId: string; userId: string }
  ): Promise<Array<{ id: string; translatedContent: string; success: boolean; error?: string }>> {
    const results: Array<{
      id: string;
      translatedContent: string;
      success: boolean;
      error?: string;
    }> = [];

    // Process in smaller batches to avoid timeout
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const batchPromises = batch.map(async (item) => {
        try {
          const result = await this.translate({
            content: item.content,
            sourceLanguage,
            targetLanguage,
            contentType: (item.contentType as TranslationRequest['contentType']) ?? 'general',
            tenantId: context.tenantId,
            userId: context.userId,
          });

          return {
            id: item.id,
            translatedContent: result.translatedText,
            success: true,
          };
        } catch (error) {
          return {
            id: item.id,
            translatedContent: '',
            success: false,
            error: error instanceof Error ? error.message : 'Translation failed',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Create a translation glossary for a subject
   */
  async createGlossary(
    terms: string[],
    subject: string,
    sourceLanguage: string,
    targetLanguage: string,
    context: { tenantId: string; userId: string }
  ): Promise<TranslationGlossaryItem[]> {
    const sourceLang = LANGUAGE_NAMES[sourceLanguage] ?? sourceLanguage;
    const targetLang = LANGUAGE_NAMES[targetLanguage] ?? targetLanguage;

    const prompt = `Create a translation glossary for these ${subject} terms from ${sourceLang} to ${targetLang}:

TERMS:
${terms.map((t) => `- ${t}`).join('\n')}

For each term, provide:
1. The accurate translation
2. Brief context on how it's used in ${subject}

Respond with JSON: {"glossary": [{"source": "original term", "translation": "translated term", "context": "usage context"}]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an expert translator specializing in ${subject} terminology.`,
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 2000,
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: 'OTHER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);
    return (parsed.glossary as TranslationGlossaryItem[]) ?? [];
  }

  /**
   * Localize content (adapt for cultural context)
   */
  async localize(
    content: string,
    targetLocale: string,
    options?: {
      adaptExamples?: boolean;
      adaptUnits?: boolean;
      adaptCurrency?: boolean;
      subject?: string;
      tenantId: string;
      userId: string;
    }
  ): Promise<{
    localizedContent: string;
    adaptations: Array<{ original: string; localized: string; reason: string }>;
  }> {
    const adaptations: string[] = [];
    if (options?.adaptExamples) adaptations.push('Adapt examples to be culturally relevant');
    if (options?.adaptUnits) adaptations.push('Convert units to local standards (metric/imperial)');
    if (options?.adaptCurrency) adaptations.push('Convert currency to local currency');

    const prompt = `Localize this educational content for ${targetLocale}:

CONTENT:
${content}

${options?.subject ? `SUBJECT: ${options.subject}` : ''}

ADAPTATIONS TO MAKE:
${adaptations.length > 0 ? adaptations.map((a) => `- ${a}`).join('\n') : '- Make culturally appropriate'}

Provide the localized content and list any specific adaptations made.

Respond with JSON: {"localizedContent": "string", "adaptations": [{"original": "string", "localized": "string", "reason": "string"}]}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an expert at localizing educational content for ${targetLocale}.`,
      },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.4,
      maxTokens: Math.max(3000, content.length * 1.5),
      metadata: {
        tenantId: options?.tenantId ?? 'system',
        userId: options?.userId ?? 'system',
        agentType: 'OTHER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      localizedContent: (parsed.localizedContent as string) ?? content,
      adaptations:
        (parsed.adaptations as Array<{ original: string; localized: string; reason: string }>) ??
        [],
    };
  }

  /**
   * Detect the language of content
   */
  async detectLanguage(
    content: string,
    context?: { tenantId: string; userId: string }
  ): Promise<{
    language: string;
    languageName: string;
    confidence: number;
  }> {
    const prompt = `Detect the language of this text and provide your confidence level (0-1):

TEXT:
${content.slice(0, 500)}

Respond with JSON: {"language": "ISO 639-1 code", "languageName": "full name", "confidence": number}`;

    const messages: LLMMessage[] = [
      { role: 'system', content: 'You are an expert at language detection.' },
      { role: 'user', content: prompt },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.2,
      maxTokens: 100,
      metadata: {
        tenantId: context?.tenantId ?? 'system',
        userId: context?.userId ?? 'system',
        agentType: 'OTHER',
      },
    });

    const parsed = this.parseStructuredResponse(result.content);

    return {
      language: (parsed.language as string) ?? 'en',
      languageName: (parsed.languageName as string) ?? 'English',
      confidence: Math.min(1, Math.max(0, (parsed.confidence as number) ?? 0.8)),
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return Object.entries(LANGUAGE_NAMES).map(([code, name]) => ({ code, name }));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private buildTranslationPrompt(
    request: TranslationRequest,
    sourceLang: string,
    targetLang: string
  ): string {
    const parts: string[] = [
      `Translate the following educational content from ${sourceLang} to ${targetLang}.`,
      '',
    ];

    if (request.contentType) {
      parts.push(`CONTENT TYPE: ${request.contentType}`);
      parts.push(CONTENT_TYPE_GUIDANCE[request.contentType] ?? '');
      parts.push('');
    }

    if (request.educationalContext) {
      parts.push('IMPORTANT: This is educational content. Maintain pedagogical quality and clarity.');
      parts.push('');
    }

    if (request.preserveFormatting) {
      parts.push('FORMATTING: Preserve all markdown, HTML, and special formatting.');
      parts.push('');
    }

    parts.push('CONTENT TO TRANSLATE:');
    parts.push('---');
    parts.push(request.content);
    parts.push('---');
    parts.push('');
    parts.push(
      'Provide the translation and a glossary of key educational terms translated.'
    );
    parts.push('');
    parts.push(
      'Respond with JSON: {"translation": "translated text", "glossary": [{"source": "term", "translation": "translated term", "context": "usage"}]}'
    );

    return parts.join('\n');
  }

  private parseTranslationResponse(content: string): {
    translation?: string;
    glossary?: TranslationGlossaryItem[];
  } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON, assume the entire response is the translation
        return { translation: content };
      }
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      return {
        translation: parsed.translation as string | undefined,
        glossary: parsed.glossary as TranslationGlossaryItem[] | undefined,
      };
    } catch {
      return { translation: content };
    }
  }

  private parseStructuredResponse(content: string): Record<string, unknown> {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return {};
      }
      return JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
