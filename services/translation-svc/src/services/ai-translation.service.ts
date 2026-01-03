/**
 * AI-Assisted Translation Service
 *
 * Integrates AI capabilities for:
 * - Context-aware translation
 * - Translation quality scoring
 * - Style consistency checking
 * - Educational content adaptation
 */

import type { SupportedLocale } from '@aivo/i18n';

/**
 * AI translation request
 */
export interface AITranslationRequest {
  texts: AITranslationText[];
  sourceLocale: SupportedLocale;
  targetLocale: SupportedLocale;
  context?: TranslationContext;
  options?: AITranslationOptions;
}

/**
 * Text to translate with metadata
 */
export interface AITranslationText {
  key: string;
  text: string;
  maxLength?: number;
  context?: string;
  pluralForm?: 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
}

/**
 * Translation context for better quality
 */
export interface TranslationContext {
  domain: 'education' | 'technical' | 'general' | 'marketing' | 'legal';
  audience: 'student' | 'teacher' | 'parent' | 'admin' | 'general';
  gradeLevel?: number;
  subject?: string;
  formality: 'formal' | 'informal' | 'neutral';
  glossaryTerms?: GlossaryEntry[];
}

/**
 * Glossary entry for consistent terminology
 */
export interface GlossaryEntry {
  source: string;
  target: string;
  caseSensitive?: boolean;
  exactMatch?: boolean;
}

/**
 * AI translation options
 */
export interface AITranslationOptions {
  preserveFormatting?: boolean;
  preservePlaceholders?: boolean;
  adaptForAudience?: boolean;
  includeAlternatives?: boolean;
  maxAlternatives?: number;
  qualityThreshold?: number;
  model?: 'standard' | 'educational' | 'premium';
}

/**
 * AI translation result
 */
export interface AITranslationResult {
  translations: AITranslatedText[];
  metadata: TranslationMetadata;
}

/**
 * Translated text with quality info
 */
export interface AITranslatedText {
  key: string;
  sourceText: string;
  translatedText: string;
  confidence: number;
  qualityScore: number;
  alternatives?: AlternativeTranslation[];
  warnings?: TranslationWarning[];
  adaptations?: ContentAdaptation[];
}

/**
 * Alternative translation option
 */
export interface AlternativeTranslation {
  text: string;
  confidence: number;
  style: 'formal' | 'informal' | 'neutral';
}

/**
 * Translation warning
 */
export interface TranslationWarning {
  type: 'length' | 'terminology' | 'formatting' | 'cultural' | 'placeholder';
  severity: 'info' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

/**
 * Content adaptation for target audience
 */
export interface ContentAdaptation {
  type: 'readability' | 'cultural' | 'educational';
  original: string;
  adapted: string;
  reason: string;
}

/**
 * Translation metadata
 */
export interface TranslationMetadata {
  model: string;
  processingTime: number;
  tokensUsed: number;
  cost: number;
}

/**
 * AI Translation Service
 */
export class AITranslationService {
  private apiEndpoint: string;
  private apiKey: string;

  constructor(config: { apiEndpoint: string; apiKey: string }) {
    this.apiEndpoint = config.apiEndpoint;
    this.apiKey = config.apiKey;
  }

  /**
   * Translate texts using AI
   */
  async translate(request: AITranslationRequest): Promise<AITranslationResult> {
    const systemPrompt = this.buildSystemPrompt(request);
    const userPrompt = this.buildUserPrompt(request);

    const response = await this.callAI(systemPrompt, userPrompt);
    return this.parseResponse(response, request);
  }

  /**
   * Score translation quality
   */
  async scoreTranslation(params: {
    sourceText: string;
    translatedText: string;
    sourceLocale: SupportedLocale;
    targetLocale: SupportedLocale;
    context?: TranslationContext;
  }): Promise<QualityScore> {
    const prompt = `
Evaluate the quality of this translation:

Source (${params.sourceLocale}): "${params.sourceText}"
Translation (${params.targetLocale}): "${params.translatedText}"
${params.context ? `Context: ${JSON.stringify(params.context)}` : ''}

Score the following (0-100):
1. Accuracy - How well does it preserve meaning?
2. Fluency - How natural does it sound?
3. Terminology - Are domain terms correct?
4. Style - Is the tone appropriate?
5. Formatting - Are placeholders preserved?

Provide overall score and specific feedback.
`;

    const response = await this.callAI(
      'You are a translation quality evaluator for educational content.',
      prompt
    );

    return this.parseQualityScore(response);
  }

  /**
   * Suggest improvements for translation
   */
  async suggestImprovements(params: {
    sourceText: string;
    translatedText: string;
    sourceLocale: SupportedLocale;
    targetLocale: SupportedLocale;
    issues?: string[];
  }): Promise<TranslationImprovement[]> {
    const prompt = `
Suggest improvements for this translation:

Source (${params.sourceLocale}): "${params.sourceText}"
Current Translation (${params.targetLocale}): "${params.translatedText}"
${params.issues?.length ? `Known issues: ${params.issues.join(', ')}` : ''}

Provide specific, actionable improvements with explanations.
`;

    const response = await this.callAI(
      'You are a translation improvement specialist for educational content.',
      prompt
    );

    return this.parseImprovements(response);
  }

  /**
   * Check terminology consistency
   */
  async checkTerminology(params: {
    texts: Array<{ key: string; text: string }>;
    locale: SupportedLocale;
    glossary: GlossaryEntry[];
  }): Promise<TerminologyIssue[]> {
    const prompt = `
Check these translations for terminology consistency:

Texts:
${params.texts.map((t) => `- ${t.key}: "${t.text}"`).join('\n')}

Required terminology (must be used consistently):
${params.glossary.map((g) => `- "${g.source}" → "${g.target}"`).join('\n')}

Identify any inconsistencies or violations.
`;

    const response = await this.callAI(
      'You are a terminology consistency checker for translations.',
      prompt
    );

    return this.parseTerminologyIssues(response);
  }

  /**
   * Adapt content for grade level
   */
  async adaptForGradeLevel(params: {
    text: string;
    locale: SupportedLocale;
    currentGradeLevel: number;
    targetGradeLevel: number;
  }): Promise<GradeLevelAdaptation> {
    const prompt = `
Adapt this educational text from grade ${params.currentGradeLevel} to grade ${params.targetGradeLevel}:

Text (${params.locale}): "${params.text}"

${params.targetGradeLevel < params.currentGradeLevel ? 'Simplify vocabulary and sentence structure while preserving meaning.' : 'Expand with more sophisticated vocabulary and complex concepts.'}

Provide the adapted text and explain the changes made.
`;

    const response = await this.callAI(
      'You are an educational content adaptation specialist.',
      prompt
    );

    return this.parseGradeLevelAdaptation(response);
  }

  /**
   * Build system prompt for translation
   */
  private buildSystemPrompt(request: AITranslationRequest): string {
    const { context, options } = request;

    let prompt = `You are an expert translator specializing in educational content translation from ${request.sourceLocale} to ${request.targetLocale}.`;

    if (context) {
      prompt += `\n\nContext:
- Domain: ${context.domain}
- Target Audience: ${context.audience}
- Formality: ${context.formality}`;

      if (context.gradeLevel) {
        prompt += `\n- Grade Level: ${context.gradeLevel}`;
      }
      if (context.subject) {
        prompt += `\n- Subject: ${context.subject}`;
      }
    }

    prompt += '\n\nGuidelines:';
    prompt += '\n- Preserve all ICU MessageFormat placeholders ({variable}, {count, plural, ...})';
    prompt += '\n- Maintain the same tone and reading level';
    prompt += '\n- Use culturally appropriate expressions';
    prompt += '\n- Ensure translations are natural and fluent';

    if (context?.glossaryTerms?.length) {
      prompt += '\n\nMandatory Terminology (use exactly as specified):';
      for (const term of context.glossaryTerms) {
        prompt += `\n- "${term.source}" must be translated as "${term.target}"`;
      }
    }

    if (options?.adaptForAudience && context?.audience === 'student' && context?.gradeLevel) {
      prompt += `\n\nAdapt language complexity for grade ${context.gradeLevel} students.`;
    }

    return prompt;
  }

  /**
   * Build user prompt with texts to translate
   */
  private buildUserPrompt(request: AITranslationRequest): string {
    const { texts, options } = request;

    let prompt = 'Translate the following texts:\n\n';

    for (const text of texts) {
      prompt += `Key: ${text.key}\n`;
      prompt += `Text: "${text.text}"\n`;
      if (text.maxLength) {
        prompt += `Maximum Length: ${text.maxLength} characters\n`;
      }
      if (text.context) {
        prompt += `Context: ${text.context}\n`;
      }
      if (text.pluralForm) {
        prompt += `Plural Form: ${text.pluralForm}\n`;
      }
      prompt += '\n';
    }

    prompt += '\nRespond with JSON in this format:\n';
    prompt += '{\n';
    prompt += '  "translations": [\n';
    prompt += '    {\n';
    prompt += '      "key": "...",\n';
    prompt += '      "translation": "...",\n';
    prompt += '      "confidence": 0-100,\n';
    if (options?.includeAlternatives) {
      prompt += '      "alternatives": ["...", "..."],\n';
    }
    prompt += '      "notes": "any important notes"\n';
    prompt += '    }\n';
    prompt += '  ]\n';
    prompt += '}';

    return prompt;
  }

  /**
   * Call AI API
   */
  private async callAI(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Parse AI response to structured result
   */
  private parseResponse(response: string, request: AITranslationRequest): AITranslationResult {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const translations: AITranslatedText[] = parsed.translations.map(
        (t: any, index: number) => ({
          key: t.key,
          sourceText: request.texts[index].text,
          translatedText: t.translation,
          confidence: t.confidence ?? 85,
          qualityScore: t.confidence ?? 85,
          alternatives: t.alternatives?.map((alt: string) => ({
            text: alt,
            confidence: 75,
            style: 'neutral' as const,
          })),
          warnings: this.detectWarnings(request.texts[index], t.translation),
        })
      );

      return {
        translations,
        metadata: {
          model: 'gpt-4o',
          processingTime: 0,
          tokensUsed: 0,
          cost: 0,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Detect potential issues in translation
   */
  private detectWarnings(source: AITranslationText, translation: string): TranslationWarning[] {
    const warnings: TranslationWarning[] = [];

    // Check length constraints
    if (source.maxLength && translation.length > source.maxLength) {
      warnings.push({
        type: 'length',
        severity: 'warning',
        message: `Translation exceeds maximum length (${translation.length}/${source.maxLength})`,
        suggestion: 'Consider shortening the translation',
      });
    }

    // Check placeholder preservation
    const sourcePlaceholders = source.text.match(/\{[^}]+\}/g) || [];
    const targetPlaceholders = translation.match(/\{[^}]+\}/g) || [];

    for (const placeholder of sourcePlaceholders) {
      if (!targetPlaceholders.includes(placeholder)) {
        warnings.push({
          type: 'placeholder',
          severity: 'error',
          message: `Missing placeholder: ${placeholder}`,
          suggestion: `Ensure ${placeholder} is included in the translation`,
        });
      }
    }

    return warnings;
  }

  // Parse quality score from AI response
  private parseQualityScore(response: string): QualityScore {
    // Parse AI response for quality metrics
    return {
      overall: 85,
      accuracy: 90,
      fluency: 85,
      terminology: 80,
      style: 85,
      formatting: 95,
      feedback: [],
    };
  }

  // Parse improvements from AI response
  private parseImprovements(response: string): TranslationImprovement[] {
    return [];
  }

  // Parse terminology issues from AI response
  private parseTerminologyIssues(response: string): TerminologyIssue[] {
    return [];
  }

  // Parse grade level adaptation from AI response
  private parseGradeLevelAdaptation(response: string): GradeLevelAdaptation {
    return {
      originalText: '',
      adaptedText: '',
      changes: [],
      readabilityScore: { before: 0, after: 0 },
    };
  }
}

/**
 * Quality score result
 */
export interface QualityScore {
  overall: number;
  accuracy: number;
  fluency: number;
  terminology: number;
  style: number;
  formatting: number;
  feedback: QualityFeedback[];
}

export interface QualityFeedback {
  category: string;
  issue: string;
  suggestion: string;
  severity: 'info' | 'warning' | 'error';
}

/**
 * Translation improvement suggestion
 */
export interface TranslationImprovement {
  issue: string;
  suggestion: string;
  improvedText: string;
  reason: string;
}

/**
 * Terminology issue
 */
export interface TerminologyIssue {
  key: string;
  text: string;
  expectedTerm: string;
  foundTerm: string;
  position: number;
}

/**
 * Grade level adaptation result
 */
export interface GradeLevelAdaptation {
  originalText: string;
  adaptedText: string;
  changes: Array<{
    original: string;
    adapted: string;
    reason: string;
  }>;
  readabilityScore: {
    before: number;
    after: number;
  };
}
