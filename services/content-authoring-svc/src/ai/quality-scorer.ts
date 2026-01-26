/**
 * Quality Scorer Service
 *
 * AI-powered content quality scoring across multiple dimensions.
 * Evaluates accuracy, clarity, engagement, accessibility, and more.
 */

import type {
  QualityScore,
  QualityDimensions,
  DimensionScore,
  QualityIssue,
  QualitySuggestion,
  ReadabilityMetrics,
  AccuracyCheck,
  BiasAnalysis,
  AccessibilityCheck,
  ContentMetadata,
  Subject,
} from '../types/ai-authoring.js';
import {
  buildQualityScoringPrompt,
  buildFactualAccuracyPrompt,
  buildBiasAnalysisPrompt,
  buildAccessibilityCheckPrompt,
  QUALITY_SCORING_SYSTEM_PROMPT,
} from './prompts/quality-scoring.prompt.js';
import type { AIOrchestratorclient, AIMessage, AIRequestContext } from './ai-orchestrator-client.js';
import { getAIClient } from './ai-orchestrator-client.js';
import type { AICache } from './cache.js';

// ══════════════════════════════════════════════════════════════════════════════
// QUALITY SCORER CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class QualityScorer {
  private readonly aiClient: AIOrchestratorclient;
  private readonly cache: AICache | null;

  constructor(aiClient?: AIOrchestratorclient, cache?: AICache) {
    this.aiClient = aiClient ?? getAIClient();
    this.cache = cache ?? null;
  }

  /**
   * Score content quality across all dimensions
   */
  async scoreContent(
    content: string,
    metadata: ContentMetadata,
    context?: AIRequestContext
  ): Promise<QualityScore> {
    // Check cache first
    const cacheKey = this.buildCacheKey('quality', content);
    if (this.cache) {
      const cached = await this.cache.get<QualityScore>(cacheKey);
      if (cached) {
        console.info('Returning cached quality score', { cacheKey });
        return cached;
      }
    }

    // Build the prompt
    const prompt = buildQualityScoringPrompt(content, metadata);

    // Make AI request
    const messages: AIMessage[] = [
      { role: 'system', content: QUALITY_SCORING_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.3, maxTokens: 5000 },
      context: context ?? { tenantId: 'system' },
    });

    // Parse response
    const parsed = this.parseJSON(response.content);
    const score = this.normalizeQualityScore(parsed, metadata, response.model);

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, score, 3600); // 1 hour
    }

    return score;
  }

  /**
   * Check factual accuracy of content
   */
  async checkFactualAccuracy(
    content: string,
    subject: Subject,
    context?: AIRequestContext
  ): Promise<AccuracyCheck> {
    const prompt = buildFactualAccuracyPrompt(content, subject);

    const messages: AIMessage[] = [
      { role: 'system', content: QUALITY_SCORING_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.2, maxTokens: 4000 },
      context: context ?? { tenantId: 'system' },
    });

    const parsed = this.parseJSON(response.content);
    return this.normalizeAccuracyCheck(parsed);
  }

  /**
   * Analyze content for bias
   */
  async analyzeBias(
    content: string,
    context?: AIRequestContext
  ): Promise<BiasAnalysis> {
    const prompt = buildBiasAnalysisPrompt(content);

    const messages: AIMessage[] = [
      { role: 'system', content: QUALITY_SCORING_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.3, maxTokens: 3000 },
      context: context ?? { tenantId: 'system' },
    });

    const parsed = this.parseJSON(response.content);
    return this.normalizeBiasAnalysis(parsed);
  }

  /**
   * Check content accessibility
   */
  async checkAccessibility(
    content: string,
    context?: AIRequestContext
  ): Promise<AccessibilityCheck> {
    const prompt = buildAccessibilityCheckPrompt(content);

    const messages: AIMessage[] = [
      { role: 'system', content: QUALITY_SCORING_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.3, maxTokens: 3000 },
      context: context ?? { tenantId: 'system' },
    });

    const parsed = this.parseJSON(response.content);
    return this.normalizeAccessibilityCheck(parsed);
  }

  /**
   * Get a quick quality summary
   */
  async getQuickScore(
    content: string,
    metadata: ContentMetadata,
    context?: AIRequestContext
  ): Promise<{ overall: number; dimensions: Record<string, number>; readabilityGrade: number }> {
    const score = await this.scoreContent(content, metadata, context);

    return {
      overall: score.overall,
      dimensions: {
        accuracy: score.dimensions.accuracy.score,
        clarity: score.dimensions.clarity.score,
        engagement: score.dimensions.engagement.score,
        ageAppropriateness: score.dimensions.ageAppropriateness.score,
        accessibility: score.dimensions.accessibility.score,
        pedagogicalSoundness: score.dimensions.pedagogicalSoundness.score,
        culturalSensitivity: score.dimensions.culturalSensitivity.score,
      },
      readabilityGrade: score.readability.fleschKincaidGrade,
    };
  }

  /**
   * Calculate readability metrics without AI
   */
  calculateReadability(content: string, targetGradeLevel: number): ReadabilityMetrics {
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

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private normalizeQualityScore(
    parsed: Record<string, any>,
    metadata: ContentMetadata,
    model: string
  ): QualityScore {
    const dimensions = this.normalizeDimensions(parsed.dimensions ?? {});
    const issues = this.normalizeIssues(parsed.issues ?? []);
    const suggestions = this.normalizeSuggestions(parsed.suggestions ?? []);
    const readability = this.normalizeReadability(
      parsed.readability ?? {},
      metadata.gradeLevel
    );

    // Calculate overall score as weighted average of dimensions
    const dimensionScores = Object.values(dimensions) as DimensionScore[];
    const overall =
      typeof parsed.overall === 'number'
        ? parsed.overall
        : dimensionScores.reduce((sum, d) => sum + d.score, 0) / dimensionScores.length;

    return {
      overall: Math.round(overall),
      dimensions,
      issues,
      suggestions,
      readability,
      scoredAt: new Date(),
      model,
    };
  }

  private normalizeDimensions(dims: Record<string, any>): QualityDimensions {
    const defaultDimension = (): DimensionScore => ({
      score: 50,
      confidence: 0.5,
      feedback: 'Not evaluated',
      evidence: [],
    });

    const normalizeDim = (dim: any): DimensionScore => {
      if (!dim) return defaultDimension();
      return {
        score: typeof dim.score === 'number' ? dim.score : 50,
        confidence: typeof dim.confidence === 'number' ? dim.confidence : 0.5,
        feedback: dim.feedback ?? 'No feedback provided',
        evidence: Array.isArray(dim.evidence) ? dim.evidence : [],
      };
    };

    return {
      accuracy: normalizeDim(dims.accuracy),
      clarity: normalizeDim(dims.clarity),
      engagement: normalizeDim(dims.engagement),
      ageAppropriateness: normalizeDim(dims.ageAppropriateness ?? dims.age_appropriateness),
      accessibility: normalizeDim(dims.accessibility),
      pedagogicalSoundness: normalizeDim(dims.pedagogicalSoundness ?? dims.pedagogical_soundness),
      culturalSensitivity: normalizeDim(dims.culturalSensitivity ?? dims.cultural_sensitivity),
    };
  }

  private normalizeIssues(issues: any[]): QualityIssue[] {
    return issues.map((issue, index) => ({
      id: issue.id ?? `issue-${index + 1}`,
      dimension: this.normalizeDimensionName(issue.dimension),
      severity: this.normalizeSeverity(issue.severity),
      description: issue.description ?? 'No description',
      location: issue.location
        ? {
            sectionId: issue.location.sectionId,
            paragraph: issue.location.paragraph,
            startOffset: issue.location.startOffset,
            endOffset: issue.location.endOffset,
            text: issue.location.text,
          }
        : undefined,
      suggestedFix: issue.suggestedFix ?? issue.suggested_fix,
    }));
  }

  private normalizeSuggestions(suggestions: any[]): QualitySuggestion[] {
    return suggestions.map((sug, index) => ({
      id: sug.id ?? `sug-${index + 1}`,
      dimension: this.normalizeDimensionName(sug.dimension),
      suggestion: sug.suggestion ?? sug.description ?? '',
      impact: this.normalizeImpact(sug.impact),
      effort: this.normalizeEffort(sug.effort),
      rationale: sug.rationale ?? '',
    }));
  }

  private normalizeReadability(
    readability: Record<string, any>,
    targetGradeLevel: number
  ): ReadabilityMetrics {
    return {
      fleschKincaidGrade:
        typeof readability.fleschKincaidGrade === 'number'
          ? readability.fleschKincaidGrade
          : 0,
      fleschReadingEase:
        typeof readability.fleschReadingEase === 'number'
          ? readability.fleschReadingEase
          : 0,
      averageSentenceLength:
        typeof readability.averageSentenceLength === 'number'
          ? readability.averageSentenceLength
          : 0,
      averageWordLength:
        typeof readability.averageWordLength === 'number'
          ? readability.averageWordLength
          : 0,
      complexWordPercentage:
        typeof readability.complexWordPercentage === 'number'
          ? readability.complexWordPercentage
          : 0,
      sentenceCount:
        typeof readability.sentenceCount === 'number' ? readability.sentenceCount : 0,
      wordCount: typeof readability.wordCount === 'number' ? readability.wordCount : 0,
      syllableCount:
        typeof readability.syllableCount === 'number' ? readability.syllableCount : 0,
      targetGradeLevel,
      targetGradeAppropriate: readability.targetGradeAppropriate ?? true,
      recommendation: readability.recommendation,
    };
  }

  private normalizeAccuracyCheck(parsed: Record<string, any>): AccuracyCheck {
    return {
      overall: typeof parsed.overall === 'number' ? parsed.overall : 50,
      factualIssues: (parsed.factualIssues ?? []).map((issue: any) => ({
        claim: issue.claim ?? '',
        issue: issue.issue ?? '',
        correction: issue.correction,
        source: issue.source,
        severity: this.normalizeAccuracySeverity(issue.severity),
      })),
      verifiedClaims: (parsed.verifiedClaims ?? []).map((claim: any) => ({
        claim: claim.claim ?? '',
        confidence: typeof claim.confidence === 'number' ? claim.confidence : 0.5,
        source: claim.source,
      })),
      unverifiableClaims: parsed.unverifiableClaims ?? [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
    };
  }

  private normalizeBiasAnalysis(parsed: Record<string, any>): BiasAnalysis {
    return {
      overall: typeof parsed.overall === 'number' ? parsed.overall : 85,
      detectedBiases: (parsed.detectedBiases ?? []).map((bias: any) => ({
        type: this.normalizeBiasType(bias.type),
        severity: this.normalizeBiasSeverity(bias.severity),
        location: bias.location
          ? {
              paragraph: bias.location.paragraph,
              text: bias.location.text,
            }
          : undefined,
        description: bias.description ?? '',
        suggestion: bias.suggestion ?? '',
      })),
      inclusivityScore: typeof parsed.inclusivityScore === 'number' ? parsed.inclusivityScore : 80,
      recommendations: parsed.recommendations ?? [],
    };
  }

  private normalizeAccessibilityCheck(parsed: Record<string, any>): AccessibilityCheck {
    return {
      wcagLevel: this.normalizeWcagLevel(parsed.wcagLevel),
      issues: (parsed.issues ?? []).map((issue: any) => ({
        type: this.normalizeAccessibilityIssueType(issue.type),
        severity: this.normalizeAccessibilitySeverity(issue.severity),
        description: issue.description ?? '',
        location: issue.location,
        wcagCriteria: issue.wcagCriteria ?? '',
        howToFix: issue.howToFix ?? '',
      })),
      score: typeof parsed.score === 'number' ? parsed.score : 75,
      recommendations: parsed.recommendations ?? [],
    };
  }

  private normalizeDimensionName(name: string): keyof QualityDimensions {
    const normalized = String(name).toLowerCase().replace(/[^a-z]/g, '');
    const mapping: Record<string, keyof QualityDimensions> = {
      accuracy: 'accuracy',
      clarity: 'clarity',
      engagement: 'engagement',
      ageappropriateness: 'ageAppropriateness',
      age: 'ageAppropriateness',
      accessibility: 'accessibility',
      pedagogicalsoundness: 'pedagogicalSoundness',
      pedagogical: 'pedagogicalSoundness',
      culturalsensitivity: 'culturalSensitivity',
      cultural: 'culturalSensitivity',
    };
    return mapping[normalized] ?? 'clarity';
  }

  private normalizeSeverity(severity: string): 'critical' | 'warning' | 'suggestion' {
    const normalized = String(severity).toLowerCase();
    if (normalized === 'critical' || normalized === 'error' || normalized === 'high') {
      return 'critical';
    }
    if (normalized === 'warning' || normalized === 'medium') {
      return 'warning';
    }
    return 'suggestion';
  }

  private normalizeImpact(impact: string): 'high' | 'medium' | 'low' {
    const normalized = String(impact).toLowerCase();
    if (normalized === 'high') return 'high';
    if (normalized === 'low') return 'low';
    return 'medium';
  }

  private normalizeEffort(effort: string): 'easy' | 'moderate' | 'complex' {
    const normalized = String(effort).toLowerCase();
    if (normalized === 'easy' || normalized === 'simple') return 'easy';
    if (normalized === 'complex' || normalized === 'hard' || normalized === 'difficult') {
      return 'complex';
    }
    return 'moderate';
  }

  private normalizeAccuracySeverity(severity: string): 'error' | 'misleading' | 'outdated' {
    const normalized = String(severity).toLowerCase();
    if (normalized === 'error' || normalized === 'wrong' || normalized === 'incorrect') {
      return 'error';
    }
    if (normalized === 'outdated' || normalized === 'old') return 'outdated';
    return 'misleading';
  }

  private normalizeBiasType(
    type: string
  ): 'gender' | 'racial' | 'cultural' | 'socioeconomic' | 'ability' | 'religious' | 'age' {
    const normalized = String(type).toLowerCase();
    if (normalized.includes('gender')) return 'gender';
    if (normalized.includes('racial') || normalized.includes('race') || normalized.includes('ethnic')) {
      return 'racial';
    }
    if (normalized.includes('socio') || normalized.includes('economic') || normalized.includes('class')) {
      return 'socioeconomic';
    }
    if (normalized.includes('ability') || normalized.includes('disab')) return 'ability';
    if (normalized.includes('relig')) return 'religious';
    if (normalized.includes('age')) return 'age';
    return 'cultural';
  }

  private normalizeBiasSeverity(severity: string): 'high' | 'medium' | 'low' {
    const normalized = String(severity).toLowerCase();
    if (normalized === 'high' || normalized === 'critical') return 'high';
    if (normalized === 'low' || normalized === 'minor') return 'low';
    return 'medium';
  }

  private normalizeWcagLevel(level: string): 'A' | 'AA' | 'AAA' {
    const normalized = String(level).toUpperCase().replace(/[^A]/g, '');
    if (normalized === 'AAA') return 'AAA';
    if (normalized === 'AA') return 'AA';
    return 'A';
  }

  private normalizeAccessibilityIssueType(type: string): any {
    const normalized = String(type).toLowerCase().replace(/[^a-z_]/g, '_');
    const mapping: Record<string, string> = {
      alt_text: 'missing_alt_text',
      missing_alt: 'missing_alt_text',
      complex_language: 'complex_language',
      language: 'complex_language',
      contrast: 'insufficient_contrast',
      captions: 'missing_captions',
      interactive: 'inaccessible_interactive',
      keyboard: 'no_keyboard_support',
      headings: 'missing_headings',
    };
    return mapping[normalized] ?? type;
  }

  private normalizeAccessibilitySeverity(
    severity: string
  ): 'critical' | 'serious' | 'moderate' | 'minor' {
    const normalized = String(severity).toLowerCase();
    if (normalized === 'critical') return 'critical';
    if (normalized === 'serious' || normalized === 'high') return 'serious';
    if (normalized === 'minor' || normalized === 'low') return 'minor';
    return 'moderate';
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

  private parseJSON(content: string): Record<string, any> {
    try {
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

  private buildCacheKey(prefix: string, content: string): string {
    const hash = this.hashString(content);
    return `${prefix}:${hash}`;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ══════════════════════════════════════════════════════════════════════════════

export function createQualityScorer(
  aiClient?: AIOrchestratorclient,
  cache?: AICache
): QualityScorer {
  return new QualityScorer(aiClient, cache);
}
