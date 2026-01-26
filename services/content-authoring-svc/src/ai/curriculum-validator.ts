/**
 * Curriculum Validator
 *
 * AI-powered curriculum alignment validation service.
 * Validates content against educational standards and identifies gaps.
 */

import type {
  Subject,
  CurriculumAlignment,
  AlignedStandard,
  Misalignment,
  AlignmentSuggestion,
  StandardSuggestion,
  CurriculumGap,
  DOKLevel,
} from '../types/ai-authoring.js';
import {
  buildAlignmentValidationPrompt,
  buildStandardSuggestionPrompt,
  buildGapIdentificationPrompt,
  CURRICULUM_ALIGNMENT_SYSTEM_PROMPT,
} from './prompts/curriculum-alignment.prompt.js';
import type { StandardInfo } from './prompts/curriculum-alignment.prompt.js';
import type { AIOrchestratorclient, AIMessage, AIRequestContext } from './ai-orchestrator-client.js';
import { getAIClient } from './ai-orchestrator-client.js';
import type { CurriculumService } from './curriculum-service.js';
import { getCurriculumService } from './curriculum-service.js';
import type { AICache } from './cache.js';

// ══════════════════════════════════════════════════════════════════════════════
// CURRICULUM VALIDATOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class CurriculumValidator {
  private readonly aiClient: AIOrchestratorclient;
  private readonly curriculumService: CurriculumService;
  private readonly cache: AICache | null;

  constructor(
    aiClient?: AIOrchestratorclient,
    curriculumService?: CurriculumService,
    cache?: AICache
  ) {
    this.aiClient = aiClient ?? getAIClient();
    this.curriculumService = curriculumService ?? getCurriculumService();
    this.cache = cache ?? null;
  }

  /**
   * Validate content alignment against target standards
   */
  async validateAlignment(
    content: string,
    targetStandards: string[],
    subject: Subject,
    gradeLevel: number,
    context?: AIRequestContext
  ): Promise<CurriculumAlignment> {
    // Check cache first
    const cacheKey = this.buildCacheKey('alignment', content, targetStandards);
    if (this.cache) {
      const cached = await this.cache.get<CurriculumAlignment>(cacheKey);
      if (cached) {
        console.info('Returning cached alignment result', { cacheKey });
        return cached;
      }
    }

    // Get standard details from curriculum service
    const standardDetails = this.getStandardDetails(targetStandards, subject, gradeLevel);

    // Build the prompt
    const prompt = buildAlignmentValidationPrompt(content, standardDetails, subject, gradeLevel);

    // Make AI request
    const messages: AIMessage[] = [
      { role: 'system', content: CURRICULUM_ALIGNMENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.3, maxTokens: 4000 },
      context: context ?? { tenantId: 'system' },
    });

    // Parse response
    const parsed = this.parseJSON(response.content);
    const alignment = this.normalizeAlignmentResponse(parsed, targetStandards);

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, alignment, 86400); // 24 hours
    }

    return alignment;
  }

  /**
   * Suggest standards that match the content
   */
  async suggestStandards(
    content: string,
    subject: Subject,
    gradeLevel: number,
    context?: AIRequestContext
  ): Promise<StandardSuggestion[]> {
    // Get available standards for this subject and grade
    const availableStandards = this.curriculumService
      .getStandardsBySubjectAndGrade(subject, gradeLevel)
      .map((s) => this.curriculumService.toStandardInfo(s));

    if (availableStandards.length === 0) {
      console.warn('No standards found for subject and grade', { subject, gradeLevel });
      return [];
    }

    // Build the prompt
    const prompt = buildStandardSuggestionPrompt(content, subject, gradeLevel, availableStandards);

    // Make AI request
    const messages: AIMessage[] = [
      { role: 'system', content: CURRICULUM_ALIGNMENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.3, maxTokens: 3000 },
      context: context ?? { tenantId: 'system' },
    });

    // Parse response
    const parsed = this.parseJSON(response.content);
    return this.normalizeStandardSuggestions(parsed.suggestions ?? []);
  }

  /**
   * Identify gaps between content and required standards
   */
  async identifyGaps(
    content: string,
    requiredStandards: string[],
    context?: AIRequestContext
  ): Promise<CurriculumGap[]> {
    // Get standard details
    const standardDetails = requiredStandards
      .map((id) => {
        const standard = this.curriculumService.getStandard(id);
        return standard ? this.curriculumService.toStandardInfo(standard) : null;
      })
      .filter((s): s is StandardInfo => s !== null);

    if (standardDetails.length === 0) {
      console.warn('No valid standards found for gap analysis', { requiredStandards });
      return [];
    }

    // Build the prompt
    const prompt = buildGapIdentificationPrompt(content, standardDetails);

    // Make AI request
    const messages: AIMessage[] = [
      { role: 'system', content: CURRICULUM_ALIGNMENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    const response = await this.aiClient.complete({
      messages,
      options: { temperature: 0.3, maxTokens: 3000 },
      context: context ?? { tenantId: 'system' },
    });

    // Parse response
    const parsed = this.parseJSON(response.content);
    return this.normalizeGaps(parsed.gaps ?? []);
  }

  /**
   * Get alignment summary for quick overview
   */
  async getAlignmentSummary(
    content: string,
    targetStandards: string[],
    subject: Subject,
    gradeLevel: number,
    context?: AIRequestContext
  ): Promise<{
    score: number;
    aligned: number;
    partial: number;
    missing: number;
    depthOfKnowledge: DOKLevel;
  }> {
    const alignment = await this.validateAlignment(
      content,
      targetStandards,
      subject,
      gradeLevel,
      context
    );

    const aligned = alignment.primaryStandards.filter(
      (s) => s.alignmentStrength === 'strong'
    ).length;
    const partial = alignment.primaryStandards.filter(
      (s) => s.alignmentStrength === 'moderate'
    ).length;
    const missing = alignment.misalignments.length;

    return {
      score: alignment.coverageScore,
      aligned,
      partial,
      missing,
      depthOfKnowledge: alignment.depthOfKnowledge,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  private getStandardDetails(
    standardIds: string[],
    subject: Subject,
    gradeLevel: number
  ): StandardInfo[] {
    const details: StandardInfo[] = [];

    for (const id of standardIds) {
      const standard = this.curriculumService.getStandard(id);
      if (standard) {
        details.push(this.curriculumService.toStandardInfo(standard));
      } else {
        // Create a placeholder for unknown standards
        details.push({
          id,
          code: id,
          description: id,
          gradeLevel,
          subject,
        });
      }
    }

    return details;
  }

  private normalizeAlignmentResponse(
    parsed: Record<string, any>,
    targetStandards: string[]
  ): CurriculumAlignment {
    const primaryStandards: AlignedStandard[] = (parsed.primaryStandards ?? []).map(
      (s: any) => ({
        standardId: s.standardId ?? s.id ?? '',
        standardCode: s.standardCode ?? s.code ?? '',
        standardText: s.standardText ?? s.text ?? s.description ?? '',
        alignmentStrength: this.normalizeStrength(s.alignmentStrength ?? s.strength),
        evidence: Array.isArray(s.evidence) ? s.evidence : [],
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
      })
    );

    const secondaryStandards: AlignedStandard[] = (parsed.secondaryStandards ?? []).map(
      (s: any) => ({
        standardId: s.standardId ?? s.id ?? '',
        standardCode: s.standardCode ?? s.code ?? '',
        standardText: s.standardText ?? s.text ?? s.description ?? '',
        alignmentStrength: this.normalizeStrength(s.alignmentStrength ?? s.strength),
        evidence: Array.isArray(s.evidence) ? s.evidence : [],
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
      })
    );

    const misalignments: Misalignment[] = (parsed.misalignments ?? []).map((m: any) => ({
      standardId: m.standardId ?? m.id ?? '',
      standardCode: m.standardCode ?? m.code ?? '',
      standardText: m.standardText ?? m.text ?? m.description ?? '',
      reason: m.reason ?? 'Not specified',
      suggestion: m.suggestion ?? '',
    }));

    const suggestions: AlignmentSuggestion[] = (parsed.suggestions ?? []).map((s: any) => ({
      type: this.normalizeSuggestionType(s.type),
      description: s.description ?? '',
      standardId: s.standardId,
      priority: this.normalizePriority(s.priority),
      estimatedImpact: typeof s.estimatedImpact === 'number' ? s.estimatedImpact : 10,
    }));

    return {
      primaryStandards,
      secondaryStandards,
      misalignments,
      coverageScore: typeof parsed.coverageScore === 'number' ? parsed.coverageScore : 50,
      depthOfKnowledge: this.normalizeDOK(parsed.depthOfKnowledge),
      suggestions,
      validatedAt: new Date(),
    };
  }

  private normalizeStandardSuggestions(suggestions: any[]): StandardSuggestion[] {
    return suggestions.map((s) => ({
      standardId: s.standardId ?? s.id ?? '',
      standardCode: s.standardCode ?? s.code ?? '',
      standardText: s.standardText ?? s.text ?? s.description ?? '',
      subject: s.subject ?? 'OTHER',
      gradeLevel: typeof s.gradeLevel === 'number' ? s.gradeLevel : 0,
      confidence: typeof s.confidence === 'number' ? s.confidence : 0.5,
      relevanceScore: typeof s.relevanceScore === 'number' ? s.relevanceScore : 50,
      evidence: Array.isArray(s.evidence) ? s.evidence : [],
    }));
  }

  private normalizeGaps(gaps: any[]): CurriculumGap[] {
    return gaps.map((g) => ({
      standardId: g.standardId ?? g.id ?? '',
      standardCode: g.standardCode ?? g.code ?? '',
      standardText: g.standardText ?? g.text ?? g.description ?? '',
      gapType: this.normalizeGapType(g.gapType ?? g.type),
      severity: this.normalizeSeverity(g.severity),
      suggestedAdditions: Array.isArray(g.suggestedAdditions)
        ? g.suggestedAdditions
        : [],
    }));
  }

  private normalizeStrength(strength: string): 'strong' | 'moderate' | 'weak' {
    const normalized = String(strength).toLowerCase();
    if (normalized === 'strong' || normalized === 'high') return 'strong';
    if (normalized === 'weak' || normalized === 'low') return 'weak';
    return 'moderate';
  }

  private normalizeSuggestionType(
    type: string
  ): 'add_content' | 'modify_content' | 'add_assessment' | 'adjust_depth' {
    const normalized = String(type).toLowerCase().replace(/[^a-z_]/g, '_');
    if (normalized.includes('modify')) return 'modify_content';
    if (normalized.includes('assessment')) return 'add_assessment';
    if (normalized.includes('depth')) return 'adjust_depth';
    return 'add_content';
  }

  private normalizePriority(priority: string): 'high' | 'medium' | 'low' {
    const normalized = String(priority).toLowerCase();
    if (normalized === 'high' || normalized === 'critical') return 'high';
    if (normalized === 'low' || normalized === 'minor') return 'low';
    return 'medium';
  }

  private normalizeDOK(dok: any): DOKLevel {
    const value = Number(dok);
    if (value >= 1 && value <= 4) return value as DOKLevel;
    return 2;
  }

  private normalizeGapType(type: string): 'missing' | 'insufficient' | 'off_target' {
    const normalized = String(type).toLowerCase();
    if (normalized.includes('missing')) return 'missing';
    if (normalized.includes('off') || normalized.includes('target')) return 'off_target';
    return 'insufficient';
  }

  private normalizeSeverity(severity: string): 'critical' | 'moderate' | 'minor' {
    const normalized = String(severity).toLowerCase();
    if (normalized === 'critical' || normalized === 'high') return 'critical';
    if (normalized === 'minor' || normalized === 'low') return 'minor';
    return 'moderate';
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

  private buildCacheKey(prefix: string, content: string, standards: string[]): string {
    const contentHash = this.hashString(content);
    const standardsHash = this.hashString(standards.sort().join(','));
    return `${prefix}:${contentHash}:${standardsHash}`;
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

export function createCurriculumValidator(
  aiClient?: AIOrchestratorclient,
  curriculumService?: CurriculumService,
  cache?: AICache
): CurriculumValidator {
  return new CurriculumValidator(aiClient, curriculumService, cache);
}
