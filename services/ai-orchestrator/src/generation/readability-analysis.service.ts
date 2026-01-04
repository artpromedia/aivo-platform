/**
 * Readability Analysis Service
 *
 * Analyzes text complexity and estimates reading levels using:
 * - AI-powered Lexile estimation
 * - Readability formulas (Flesch-Kincaid, etc.)
 * - Vocabulary complexity analysis
 */

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ReadabilityAnalysis {
  /** Estimated Lexile level (e.g., 850L) */
  lexileLevel: number;
  /** Grade-equivalent reading level (e.g., 5.3 = 5th grade, 3rd month) */
  gradeEquivalent: number;
  /** Flesch-Kincaid grade level */
  fleschKincaidGrade: number;
  /** Flesch Reading Ease score (0-100, higher = easier) */
  fleschReadingEase: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detailed analysis */
  analysis: {
    wordCount: number;
    sentenceCount: number;
    syllableCount: number;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
    complexWordCount: number;
    complexWordPercentage: number;
  };
  /** Vocabulary complexity */
  vocabularyAnalysis: {
    academicWordCount: number;
    rareWordCount: number;
    domainSpecificTerms: string[];
  };
  /** Suggested improvements for target level */
  suggestions?: string[];
}

export interface LexileEstimateRequest {
  text: string;
  context?: {
    subject?: string;
    gradeLevel?: string;
    contentType?: 'instruction' | 'narrative' | 'informational' | 'assessment';
  };
  tenantId?: string;
}

export interface ReadingLevelEstimate {
  lexileLevel: number;
  lexileLevelLow: number;
  lexileLevelHigh: number;
  gradeEquivalent: number;
  confidence: number;
  assessmentBasis: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Lexile ranges by grade level (approximate) */
export const LEXILE_GRADE_RANGES: Record<string, { min: number; max: number; typical: number }> = {
  'K': { min: -100, max: 100, typical: 0 },
  '1': { min: 0, max: 300, typical: 150 },
  '2': { min: 200, max: 500, typical: 350 },
  '3': { min: 400, max: 700, typical: 550 },
  '4': { min: 600, max: 850, typical: 725 },
  '5': { min: 750, max: 950, typical: 850 },
  '6': { min: 850, max: 1050, typical: 950 },
  '7': { min: 950, max: 1100, typical: 1025 },
  '8': { min: 1000, max: 1150, typical: 1075 },
  '9': { min: 1050, max: 1200, typical: 1125 },
  '10': { min: 1100, max: 1250, typical: 1175 },
  '11': { min: 1150, max: 1300, typical: 1225 },
  '12': { min: 1200, max: 1400, typical: 1300 },
};

/** Common academic vocabulary (Dale-Chall like list - simplified) */
const ACADEMIC_WORDS = new Set([
  'analyze', 'evaluate', 'synthesize', 'hypothesis', 'conclusion', 'evidence',
  'interpret', 'significant', 'context', 'perspective', 'theory', 'principle',
  'demonstrate', 'illustrate', 'contrast', 'compare', 'furthermore', 'however',
  'therefore', 'consequently', 'moreover', 'nevertheless', 'specifically',
]);

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ReadabilityAnalysisService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Analyze text readability with comprehensive metrics
   */
  async analyzeReadability(text: string, context?: LexileEstimateRequest['context']): Promise<ReadabilityAnalysis> {
    const startTime = Date.now();
    incrementCounter('readability.analysis.started');

    try {
      // Calculate basic text statistics
      const stats = this.calculateTextStatistics(text);

      // Calculate traditional readability scores
      const fleschKincaidGrade = this.calculateFleschKincaidGrade(stats);
      const fleschReadingEase = this.calculateFleschReadingEase(stats);

      // Analyze vocabulary complexity
      const vocabularyAnalysis = this.analyzeVocabulary(text);

      // Estimate Lexile level using AI for more accuracy
      const lexileEstimate = await this.estimateLexileLevel({
        text,
        context,
      });

      const analysis: ReadabilityAnalysis = {
        lexileLevel: lexileEstimate.lexileLevel,
        gradeEquivalent: lexileEstimate.gradeEquivalent,
        fleschKincaidGrade,
        fleschReadingEase,
        confidence: lexileEstimate.confidence,
        analysis: {
          wordCount: stats.wordCount,
          sentenceCount: stats.sentenceCount,
          syllableCount: stats.syllableCount,
          avgWordsPerSentence: stats.avgWordsPerSentence,
          avgSyllablesPerWord: stats.avgSyllablesPerWord,
          complexWordCount: stats.complexWordCount,
          complexWordPercentage: (stats.complexWordCount / stats.wordCount) * 100,
        },
        vocabularyAnalysis,
      };

      const latencyMs = Date.now() - startTime;
      recordHistogram('readability.analysis.duration', latencyMs);
      incrementCounter('readability.analysis.success');

      return analysis;
    } catch (error) {
      incrementCounter('readability.analysis.error');
      console.error('Readability analysis failed', { error });
      throw error;
    }
  }

  /**
   * Estimate Lexile level using AI
   */
  async estimateLexileLevel(request: LexileEstimateRequest): Promise<ReadingLevelEstimate> {
    const { text, context, tenantId } = request;

    // For short texts, use formula-based estimation
    if (text.split(/\s+/).length < 50) {
      return this.estimateLexileFromFormulas(text);
    }

    const prompt = `Analyze this text and estimate its Lexile reading level.

TEXT TO ANALYZE:
"""
${text.substring(0, 2000)}${text.length > 2000 ? '...[truncated]' : ''}
"""

${context?.subject ? `Subject: ${context.subject}` : ''}
${context?.contentType ? `Content Type: ${context.contentType}` : ''}

Consider:
1. Vocabulary complexity and academic language
2. Sentence structure and length
3. Concept density and abstraction level
4. Prior knowledge requirements
5. Text organization and cohesion

Lexile Reference Ranges:
- K-1st grade: BR-300L
- 2nd-3rd grade: 300-600L
- 4th-5th grade: 600-900L
- 6th-8th grade: 900-1100L
- 9th-12th grade: 1100-1400L
- College+: 1400L+

Respond with JSON only:
{
  "lexileLevel": <number>,
  "lexileLevelLow": <number - lower bound of range>,
  "lexileLevelHigh": <number - upper bound/stretch level>,
  "gradeEquivalent": <number like 5.3 for 5th grade 3rd month>,
  "confidence": <0-1>,
  "reasoning": "<brief explanation>"
}`;

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: 'You are an expert reading specialist skilled at assessing text complexity and Lexile levels. Provide accurate, research-based estimates.',
      },
      { role: 'user', content: prompt },
    ];

    try {
      const result = await this.llm.complete(messages, {
        temperature: 0.3,
        maxTokens: 500,
        metadata: {
          tenantId: tenantId ?? 'system',
          userId: 'system',
          agentType: 'CONTENT_ANALYSIS',
        },
      });

      const parsed = this.parseJsonResponse(result.content);

      return {
        lexileLevel: parsed.lexileLevel ?? 800,
        lexileLevelLow: parsed.lexileLevelLow ?? (parsed.lexileLevel - 100),
        lexileLevelHigh: parsed.lexileLevelHigh ?? (parsed.lexileLevel + 100),
        gradeEquivalent: parsed.gradeEquivalent ?? 5.0,
        confidence: parsed.confidence ?? 0.7,
        assessmentBasis: 'ai_analysis',
      };
    } catch (error) {
      console.warn('AI Lexile estimation failed, using formula-based fallback', { error });
      return this.estimateLexileFromFormulas(text);
    }
  }

  /**
   * Estimate reading level from comprehension performance
   */
  async estimateFromComprehension(
    passages: Array<{
      text: string;
      lexileLevel: number;
      comprehensionScore: number; // 0-1
    }>
  ): Promise<ReadingLevelEstimate> {
    if (passages.length === 0) {
      throw new Error('At least one passage is required for estimation');
    }

    // Find the passages with ~75% comprehension (optimal challenge level)
    const sortedByScore = [...passages].sort(
      (a, b) => Math.abs(a.comprehensionScore - 0.75) - Math.abs(b.comprehensionScore - 0.75)
    );

    const optimalPassage = sortedByScore[0];

    // Estimate based on performance pattern
    let estimatedLexile = optimalPassage.lexileLevel;

    // Adjust based on comprehension
    if (optimalPassage.comprehensionScore > 0.9) {
      // Text was too easy, estimate higher
      estimatedLexile += 100;
    } else if (optimalPassage.comprehensionScore < 0.5) {
      // Text was too hard, estimate lower
      estimatedLexile -= 100;
    }

    // Calculate confidence based on consistency
    const avgScore = passages.reduce((sum, p) => sum + p.comprehensionScore, 0) / passages.length;
    const confidence = Math.min(0.9, 0.5 + (passages.length * 0.1));

    return {
      lexileLevel: estimatedLexile,
      lexileLevelLow: estimatedLexile - 75,
      lexileLevelHigh: estimatedLexile + 75,
      gradeEquivalent: this.lexileToGradeEquivalent(estimatedLexile),
      confidence,
      assessmentBasis: 'comprehension_performance',
    };
  }

  /**
   * Convert Lexile level to grade equivalent
   */
  lexileToGradeEquivalent(lexile: number): number {
    for (const [grade, range] of Object.entries(LEXILE_GRADE_RANGES)) {
      if (lexile >= range.min && lexile <= range.max) {
        // Calculate position within the grade range
        const position = (lexile - range.min) / (range.max - range.min);
        const gradeNum = parseInt(grade, 10) || 0;
        return gradeNum + (position * 0.9); // 0.0 to 0.9 within the grade
      }
    }

    // Above 12th grade
    if (lexile > 1400) {
      return 12 + ((lexile - 1400) / 200);
    }

    // Below kindergarten
    return 0;
  }

  /**
   * Convert grade level to target Lexile
   */
  gradeToLexile(gradeLevel: number): number {
    const gradeKey = Math.floor(gradeLevel).toString();
    const range = LEXILE_GRADE_RANGES[gradeKey] ?? LEXILE_GRADE_RANGES['5'];

    const fraction = gradeLevel - Math.floor(gradeLevel);
    return Math.round(range.min + (fraction * (range.max - range.min)));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private calculateTextStatistics(text: string): {
    wordCount: number;
    sentenceCount: number;
    syllableCount: number;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
    complexWordCount: number;
  } {
    const words = text.match(/\b[a-zA-Z]+\b/g) ?? [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let syllableCount = 0;
    let complexWordCount = 0;

    for (const word of words) {
      const syllables = this.countSyllables(word);
      syllableCount += syllables;
      if (syllables >= 3) {
        complexWordCount++;
      }
    }

    const wordCount = words.length || 1;
    const sentenceCount = sentences.length || 1;

    return {
      wordCount,
      sentenceCount,
      syllableCount,
      avgWordsPerSentence: wordCount / sentenceCount,
      avgSyllablesPerWord: syllableCount / wordCount,
      complexWordCount,
    };
  }

  private countSyllables(word: string): number {
    word = word.toLowerCase().trim();
    if (word.length <= 3) return 1;

    // Remove silent 'e' at end
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');

    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  private calculateFleschKincaidGrade(stats: {
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  }): number {
    // Flesch-Kincaid Grade Level = 0.39(words/sentences) + 11.8(syllables/words) - 15.59
    const grade = 0.39 * stats.avgWordsPerSentence + 11.8 * stats.avgSyllablesPerWord - 15.59;
    return Math.max(0, Math.round(grade * 10) / 10);
  }

  private calculateFleschReadingEase(stats: {
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  }): number {
    // Flesch Reading Ease = 206.835 - 1.015(words/sentences) - 84.6(syllables/words)
    const score = 206.835 - 1.015 * stats.avgWordsPerSentence - 84.6 * stats.avgSyllablesPerWord;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private analyzeVocabulary(text: string): {
    academicWordCount: number;
    rareWordCount: number;
    domainSpecificTerms: string[];
  } {
    const words = text.toLowerCase().match(/\b[a-zA-Z]+\b/g) ?? [];
    const wordSet = new Set(words);

    let academicWordCount = 0;
    const domainSpecificTerms: string[] = [];

    for (const word of wordSet) {
      if (ACADEMIC_WORDS.has(word)) {
        academicWordCount++;
      }
      // Simple heuristic for domain-specific terms (long words with specific patterns)
      if (word.length > 10 || word.includes('tion') || word.includes('ment')) {
        if (!ACADEMIC_WORDS.has(word)) {
          domainSpecificTerms.push(word);
        }
      }
    }

    // Rough estimate of rare words (words > 8 chars that aren't common)
    const rareWordCount = words.filter(w => w.length > 8).length;

    return {
      academicWordCount,
      rareWordCount,
      domainSpecificTerms: domainSpecificTerms.slice(0, 10),
    };
  }

  private estimateLexileFromFormulas(text: string): ReadingLevelEstimate {
    const stats = this.calculateTextStatistics(text);
    const fkGrade = this.calculateFleschKincaidGrade(stats);

    // Convert FK grade to approximate Lexile
    const gradeKey = Math.floor(fkGrade).toString();
    const range = LEXILE_GRADE_RANGES[gradeKey] ?? LEXILE_GRADE_RANGES['5'];

    const fraction = fkGrade - Math.floor(fkGrade);
    const lexile = Math.round(range.min + (fraction * (range.max - range.min)));

    return {
      lexileLevel: lexile,
      lexileLevelLow: lexile - 100,
      lexileLevelHigh: lexile + 100,
      gradeEquivalent: fkGrade,
      confidence: 0.6, // Lower confidence for formula-based
      assessmentBasis: 'formula_estimate',
    };
  }

  private parseJsonResponse(content: string): Record<string, unknown> {
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
