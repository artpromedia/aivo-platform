/**
 * Explanation Builder Module
 *
 * Provides utilities for generating structured explanations for platform decisions.
 * Supports deterministic template rendering with fallback to AI-generated summaries.
 *
 * @module ai-orchestrator/explainability
 */

import { randomUUID } from 'node:crypto';

import type {
  CreateExplanationEventInput,
  ExplanationActionType,
  ExplanationDetails,
  ExplanationReason,
  ExplanationSourceType,
  ExplanationTemplate,
  TemplateContext,
} from '@aivo/ts-types';
import type { Pool } from 'pg';

// ════════════════════════════════════════════════════════════════════════════
// Configuration
// ════════════════════════════════════════════════════════════════════════════

export interface ExplainabilityConfig {
  /** Enable/disable explanation generation */
  enabled: boolean;

  /** Enable AI-generated summaries when templates aren't found */
  enableAiSummaries: boolean;

  /** Async (fire-and-forget) writes vs synchronous */
  asyncWrites: boolean;

  /** Generator version for tracking */
  generatorVersion: string;

  /** Cache TTL for templates in ms */
  templateCacheTtlMs: number;
}

export const DEFAULT_EXPLAINABILITY_CONFIG: ExplainabilityConfig = {
  enabled: true,
  enableAiSummaries: false, // Off by default - use deterministic templates
  asyncWrites: true,
  generatorVersion: '1.0.0',
  templateCacheTtlMs: 5 * 60 * 1000, // 5 minutes
};

export function parseExplainabilityConfigFromEnv(): ExplainabilityConfig {
  return {
    enabled: process.env.EXPLAINABILITY_ENABLED !== 'false',
    enableAiSummaries: process.env.EXPLAINABILITY_AI_SUMMARIES === 'true',
    asyncWrites: process.env.EXPLAINABILITY_ASYNC_WRITES !== 'false',
    generatorVersion: process.env.EXPLAINABILITY_VERSION ?? '1.0.0',
    templateCacheTtlMs: parseInt(process.env.EXPLAINABILITY_TEMPLATE_CACHE_TTL_MS ?? '300000', 10),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════

/**
 * Input for building an explanation.
 * Note: Optional properties include `| undefined` to satisfy exactOptionalPropertyTypes.
 */
export interface BuildExplanationInput {
  // Context
  tenantId: string;
  learnerId?: string | undefined;
  userId?: string | undefined;
  sessionId?: string | undefined;

  // Classification
  sourceType: ExplanationSourceType;
  actionType: ExplanationActionType;

  // Related entity
  relatedEntityType: string;
  relatedEntityId: string;

  // Explanation content
  reasons: ExplanationReasonInput[];
  inputs: Record<string, unknown>;

  // Optional template
  templateKey?: string | undefined;
  templateContext?: TemplateContext | undefined;

  // Optional thresholds/policy
  thresholds?: Record<string, unknown> | undefined;
  policyReferences?: string[] | undefined;

  // Experiment tracking
  experimentKey?: string | undefined;
  variantId?: string | undefined;

  // AI call traceability
  aiCallLogId?: string | undefined;

  // Confidence (for probabilistic decisions)
  confidence?: number | undefined;
}

/**
 * Simplified reason input (weight is optional with default).
 */
export interface ExplanationReasonInput {
  code: string;
  description: string;
  weight?: number;
}

/**
 * Result from building an explanation.
 */
export interface BuildExplanationResult {
  /** Human-readable summary text */
  summaryText: string;

  /** Machine-readable details */
  detailsJson: ExplanationDetails;

  /** Template ID used (if any) */
  templateId?: string;

  /** Whether AI was used to generate the summary */
  aiGenerated: boolean;
}

/**
 * Result from persisting an explanation.
 */
export interface PersistExplanationResult {
  /** The explanation event ID */
  id: string;

  /** Whether the write was successful */
  success: boolean;

  /** Error message if write failed */
  error?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// Database Row Types
// ════════════════════════════════════════════════════════════════════════════

/**
 * Raw database row from explanation_templates table.
 */
interface ExplanationTemplateRow {
  id: string;
  source_type: string;
  action_type: string;
  template_key: string;
  display_name: string;
  template_text: string;
  placeholders_schema: unknown;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════
// Template Cache
// ════════════════════════════════════════════════════════════════════════════

interface CachedTemplate {
  template: ExplanationTemplate;
  cachedAt: number;
}

const templateCache = new Map<string, CachedTemplate>();

function getCacheKey(
  sourceType: ExplanationSourceType,
  actionType: ExplanationActionType,
  templateKey?: string
): string {
  return `${sourceType}:${actionType}:${templateKey ?? 'default'}`;
}

// ════════════════════════════════════════════════════════════════════════════
// Explanation Builder
// ════════════════════════════════════════════════════════════════════════════

/**
 * ExplanationBuilder - Generates and persists structured explanations.
 *
 * Design principles:
 * - Non-blocking: Explanation failures never break primary flows
 * - Deterministic first: Prefer templates over AI generation
 * - Privacy-aware: No sensitive diagnoses, neutral language
 */
export class ExplanationBuilder {
  private pool: Pool;
  private config: ExplainabilityConfig;

  constructor(pool: Pool, config: ExplainabilityConfig = DEFAULT_EXPLAINABILITY_CONFIG) {
    this.pool = pool;
    this.config = config;
  }

  /**
   * Build an explanation from structured inputs.
   *
   * Strategy:
   * 1. Try to find a matching template
   * 2. If found, render with placeholders
   * 3. If not found, use deterministic fallback
   * 4. Optionally (if enabled), use AI for complex cases
   */
  async buildExplanation(input: BuildExplanationInput): Promise<BuildExplanationResult> {
    // Normalize reasons with default weights
    const reasons: ExplanationReason[] = input.reasons.map((r, idx) => ({
      code: r.code,
      description: r.description,
      weight: r.weight ?? 1 / (idx + 1), // Default: decreasing weights
    }));

    // Build details JSON
    const detailsJson: ExplanationDetails = {
      reasons,
      inputs: input.inputs,
      ...(input.thresholds && { thresholds: input.thresholds }),
      ...(input.policyReferences && { policyReferences: input.policyReferences }),
      ...(input.experimentKey && { experimentKey: input.experimentKey }),
      ...(input.variantId && { variantId: input.variantId }),
    };

    // Try template-based summary
    const templateResult = await this.tryRenderTemplate(input, reasons);
    if (templateResult) {
      return {
        summaryText: templateResult.text,
        detailsJson,
        templateId: templateResult.templateId,
        aiGenerated: false,
      };
    }

    // Use deterministic fallback
    const fallbackSummary = this.generateFallbackSummary(input, reasons);

    // TODO: If config.enableAiSummaries is true and fallback is insufficient,
    // call AI to generate a parent-friendly summary:
    //
    // const aiSummary = await this.generateAiSummary({
    //   sourceType: input.sourceType,
    //   actionType: input.actionType,
    //   reasons,
    //   inputs: input.inputs,
    //   constraints: {
    //     maxLength: 200,
    //     tone: 'supportive',
    //     noJudgments: true,
    //     noDiagnoses: true,
    //   }
    // });
    //
    // The AI prompt would be structured like:
    // "Generate a brief, parent-friendly explanation for why we {action}.
    //  Context: {reasons as bullet points}
    //  Inputs: {key metrics}
    //  Requirements: Use encouraging language. No medical/educational diagnoses.
    //  Keep it under 200 characters."

    return {
      summaryText: fallbackSummary,
      detailsJson,
      aiGenerated: false,
    };
  }

  /**
   * Build and persist an explanation in one call.
   *
   * Non-blocking by default - logs errors but doesn't throw.
   */
  async explain(input: BuildExplanationInput): Promise<PersistExplanationResult | null> {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const result = await this.buildExplanation(input);

      // Build event input, only including optional fields when they have values
      const eventInput: CreateExplanationEventInput = {
        tenantId: input.tenantId,
        sourceType: input.sourceType,
        actionType: input.actionType,
        relatedEntityType: input.relatedEntityType,
        relatedEntityId: input.relatedEntityId,
        summaryText: result.summaryText,
        detailsJson: result.detailsJson,
        generatorVersion: this.config.generatorVersion,
      };

      // Add optional fields only when they have values (exactOptionalPropertyTypes)
      if (input.learnerId !== undefined) eventInput.learnerId = input.learnerId;
      if (input.userId !== undefined) eventInput.userId = input.userId;
      if (input.sessionId !== undefined) eventInput.sessionId = input.sessionId;
      if (result.templateId !== undefined) eventInput.templateId = result.templateId;
      if (input.aiCallLogId !== undefined) eventInput.aiCallLogId = input.aiCallLogId;
      if (input.confidence !== undefined) eventInput.confidence = input.confidence;

      return await this.persistExplanation(eventInput);
    } catch (err) {
      console.error('[ExplanationBuilder] Failed to build/persist explanation:', err);
      return {
        id: '',
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Fire-and-forget explanation generation.
   * Use this in critical paths where you don't want to wait.
   */
  explainAsync(input: BuildExplanationInput): void {
    if (!this.config.enabled) return;

    // Fire and forget
    this.explain(input).catch((err: unknown) => {
      console.error('[ExplanationBuilder] Async explanation failed:', err);
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Try to find and render a matching template.
   */
  private async tryRenderTemplate(
    input: BuildExplanationInput,
    reasons: ExplanationReason[]
  ): Promise<{ text: string; templateId: string } | null> {
    const template = await this.getTemplate(
      input.sourceType,
      input.actionType,
      input.templateKey
    );

    if (!template) return null;

    // Build context from inputs and reasons (avoid spreading to handle exactOptionalPropertyTypes)
    const context: TemplateContext = {};

    // Copy over any provided template context
    if (input.templateContext) {
      Object.assign(context, input.templateContext);
    }

    // Add reason from first entry if available
    const primaryReason = reasons[0]?.description;
    if (primaryReason !== undefined) {
      context.reason = primaryReason;
    }

    // Add common input mappings with type guards
    const { subject, skillArea, learnerName, moduleName, contentName, durationMinutes } =
      input.inputs;

    if (typeof subject === 'string' || typeof subject === 'number') {
      context.subject = String(subject);
    }
    if (typeof skillArea === 'string' || typeof skillArea === 'number') {
      context.skill_area = String(skillArea);
    }
    if (typeof learnerName === 'string' || typeof learnerName === 'number') {
      context.learner_name = String(learnerName);
    }
    if (typeof moduleName === 'string' || typeof moduleName === 'number') {
      context.module_name = String(moduleName);
    }
    if (typeof contentName === 'string' || typeof contentName === 'number') {
      context.content_name = String(contentName);
    }
    if (typeof durationMinutes === 'number') {
      context.duration_minutes = durationMinutes;
    }

    const renderedText = this.renderTemplate(template.templateText, context);

    return {
      text: renderedText,
      templateId: template.id,
    };
  }

  /**
   * Get a template, using cache when possible.
   */
  private async getTemplate(
    sourceType: ExplanationSourceType,
    actionType: ExplanationActionType,
    templateKey?: string
  ): Promise<ExplanationTemplate | null> {
    const cacheKey = getCacheKey(sourceType, actionType, templateKey);

    // Check cache
    const cached = templateCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < this.config.templateCacheTtlMs) {
      return cached.template;
    }

    // Query database
    try {
      const query = templateKey
        ? `SELECT * FROM explanation_templates 
           WHERE source_type = $1 AND action_type = $2 AND template_key = $3 AND is_active = TRUE
           LIMIT 1`
        : `SELECT * FROM explanation_templates 
           WHERE source_type = $1 AND action_type = $2 AND is_active = TRUE
           ORDER BY created_at DESC
           LIMIT 1`;

      const params = templateKey
        ? [sourceType, actionType, templateKey]
        : [sourceType, actionType];

      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0] as ExplanationTemplateRow;
      const template: ExplanationTemplate = {
        id: row.id,
        sourceType: row.source_type as ExplanationSourceType,
        actionType: row.action_type as ExplanationActionType,
        templateKey: row.template_key,
        displayName: row.display_name,
        templateText: row.template_text,
        placeholdersSchema: row.placeholders_schema as Record<string, unknown>,
        isActive: row.is_active,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Cache it
      templateCache.set(cacheKey, { template, cachedAt: Date.now() });

      return template;
    } catch (err) {
      console.error('[ExplanationBuilder] Failed to fetch template:', err);
      return null;
    }
  }

  /**
   * Render a template with placeholder substitution.
   */
  private renderTemplate(templateText: string, context: TemplateContext): string {
    let result = templateText;

    for (const [key, value] of Object.entries(context)) {
      if (value !== undefined) {
        result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
      }
    }

    // Remove any remaining unsubstituted placeholders with a generic phrase
    result = result.replace(/\{[^}]+\}/g, 'the current activity');

    return result;
  }

  /**
   * Generate a deterministic fallback summary when no template matches.
   */
  private generateFallbackSummary(
    input: BuildExplanationInput,
    reasons: ExplanationReason[]
  ): string {
    const action = ACTION_FALLBACKS[input.actionType] ?? 'made this decision';
    const primaryReason = reasons[0]?.description ?? 'based on current learning progress';

    // Construct a neutral, parent-friendly summary
    return `We ${action} ${primaryReason}.`;
  }

  /**
   * Persist an explanation event to the database.
   */
  private async persistExplanation(
    input: CreateExplanationEventInput
  ): Promise<PersistExplanationResult> {
    const id = randomUUID();

    const query = `
      INSERT INTO explanation_events (
        id, tenant_id, learner_id, user_id, session_id,
        source_type, action_type,
        related_entity_type, related_entity_id,
        summary_text, details_json,
        ai_call_log_id, template_id, confidence, generator_version,
        created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12, $13, $14, $15,
        NOW()
      )
    `;

    const params = [
      id,
      input.tenantId,
      input.learnerId ?? null,
      input.userId ?? null,
      input.sessionId ?? null,
      input.sourceType,
      input.actionType,
      input.relatedEntityType,
      input.relatedEntityId,
      input.summaryText,
      JSON.stringify(input.detailsJson ?? {}),
      input.aiCallLogId ?? null,
      input.templateId ?? null,
      input.confidence ?? null,
      input.generatorVersion ?? this.config.generatorVersion,
    ];

    if (this.config.asyncWrites) {
      // Fire-and-forget
      this.pool.query(query, params).catch((err: unknown) => {
        console.error('[ExplanationBuilder] Async write failed:', err);
      });

      return { id, success: true };
    }

    // Synchronous write
    try {
      await this.pool.query(query, params);
      return { id, success: true };
    } catch (err) {
      console.error('[ExplanationBuilder] Write failed:', err);
      return {
        id,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Clear the template cache (useful for testing).
   */
  clearTemplateCache(): void {
    templateCache.clear();
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Fallback Text Mappings
// ════════════════════════════════════════════════════════════════════════════

const ACTION_FALLBACKS: Record<ExplanationActionType, string> = {
  CONTENT_SELECTION: 'selected this activity',
  DIFFICULTY_CHANGE: 'adjusted the difficulty level',
  FOCUS_BREAK_TRIGGER: 'suggested a short break',
  FOCUS_INTERVENTION: 'offered a quick activity',
  MODULE_RECOMMENDATION: 'recommended this module',
  LEARNING_PATH_ADJUSTMENT: 'updated the learning path',
  SKILL_PROGRESSION: 'moved to the next skill',
  SCAFFOLDING_DECISION: 'provided additional support',
  POLICY_ENFORCEMENT: 'applied a learning guideline',
};

// ════════════════════════════════════════════════════════════════════════════
// Factory Function
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create an ExplanationBuilder instance.
 */
export function createExplanationBuilder(
  pool: Pool,
  config?: Partial<ExplainabilityConfig>
): ExplanationBuilder {
  const finalConfig = { ...DEFAULT_EXPLAINABILITY_CONFIG, ...config };
  return new ExplanationBuilder(pool, finalConfig);
}
