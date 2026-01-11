/**
 * Self-Learning: Prompt Optimizer
 *
 * Optimizes prompt templates based on effectiveness data:
 * - Tracks prompt variant performance
 * - A/B tests prompt modifications
 * - Automatically promotes winning variants
 * - Generates prompt improvement suggestions
 * - Supports DSPy-style automated prompt tuning
 *
 * @module ai-orchestrator/self-learning/prompt-optimizer
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * A prompt template with metadata
 */
export interface PromptTemplate {
  id: string;
  tenantId: string;
  agentType: string;
  name: string;
  version: number;
  template: string;
  variables: PromptVariable[];
  status: PromptStatus;
  parentId?: string; // For variant tracking
  metrics: PromptMetrics;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    tags: string[];
    notes?: string;
  };
}

export interface PromptVariable {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  defaultValue?: unknown;
}

export type PromptStatus =
  | 'DRAFT'       // Not yet tested
  | 'TESTING'     // In A/B test
  | 'ACTIVE'      // Currently used in production
  | 'PROMOTED'    // Won A/B test, pending activation
  | 'DEPRECATED'  // No longer used
  | 'ARCHIVED';   // Stored for reference

export interface PromptMetrics {
  impressions: number;
  acceptanceRate: number;
  completionRate: number;
  avgUserRating: number;
  positiveImpactRate: number;
  avgResponseQuality: number;
  avgLatencyMs: number;
  errorRate: number;
  lastUpdated: Date;
}

/**
 * A/B test configuration for prompts
 */
export interface PromptExperiment {
  id: string;
  tenantId: string;
  agentType: string;
  name: string;
  hypothesis: string;
  controlPromptId: string;
  variantPromptIds: string[];
  trafficSplit: Record<string, number>; // promptId -> percentage
  metrics: {
    primary: string; // e.g., 'acceptanceRate'
    secondary: string[];
  };
  minSampleSize: number;
  maxDurationDays: number;
  status: ExperimentStatus;
  results?: ExperimentResults;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
}

export type ExperimentStatus =
  | 'DRAFT'
  | 'RUNNING'
  | 'COMPLETED'
  | 'STOPPED'
  | 'WINNER_SELECTED';

export interface ExperimentResults {
  winner?: string;
  confidence: number;
  metricDeltas: Record<string, Record<string, number>>; // promptId -> metric -> delta
  sampleSizes: Record<string, number>;
  pValues: Record<string, number>;
}

/**
 * Prompt optimization suggestion
 */
export interface PromptSuggestion {
  id: string;
  promptId: string;
  suggestionType: SuggestionType;
  description: string;
  suggestedChange: string;
  rationale: string;
  estimatedImpact: {
    metric: string;
    expectedDelta: number;
    confidence: number;
  };
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IMPLEMENTED';
  createdAt: Date;
}

export type SuggestionType =
  | 'CLARITY'           // Make instructions clearer
  | 'SPECIFICITY'       // Add more specific guidance
  | 'EXAMPLE'           // Add/improve examples
  | 'CONSTRAINT'        // Add constraints to prevent issues
  | 'PERSONA'           // Adjust agent persona
  | 'STRUCTURE'         // Restructure prompt sections
  | 'LENGTH'            // Optimize prompt length
  | 'VARIABLE';         // Add/modify variables

/**
 * Configuration for the prompt optimizer
 */
export interface PromptOptimizerConfig {
  /** Minimum impressions before analyzing performance */
  minImpressionsForAnalysis: number;

  /** Confidence threshold for declaring A/B test winner */
  significanceThreshold: number;

  /** Maximum concurrent experiments per agent type */
  maxConcurrentExperiments: number;

  /** How often to generate suggestions (ms) */
  suggestionIntervalMs: number;

  /** Enable auto-promotion of winning variants */
  autoPromoteWinners: boolean;
}

export const DEFAULT_OPTIMIZER_CONFIG: PromptOptimizerConfig = {
  minImpressionsForAnalysis: 100,
  significanceThreshold: 0.95,
  maxConcurrentExperiments: 3,
  suggestionIntervalMs: 24 * 60 * 60 * 1000, // Daily
  autoPromoteWinners: false, // Require manual approval by default
};

// ════════════════════════════════════════════════════════════════════════════════
// PROMPT OPTIMIZER
// ════════════════════════════════════════════════════════════════════════════════

export class PromptOptimizer extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly llm: LLMOrchestrator;
  private readonly config: PromptOptimizerConfig;
  private readonly cachePrefix = 'prompt_optimizer';

  constructor(
    pool: Pool,
    redis: Redis,
    llm: LLMOrchestrator,
    config: Partial<PromptOptimizerConfig> = {}
  ) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.llm = llm;
    this.config = { ...DEFAULT_OPTIMIZER_CONFIG, ...config };
  }

  /**
   * Get the active prompt template for an agent
   */
  async getActivePrompt(
    tenantId: string,
    agentType: string,
    experimentContext?: { learnerId: string }
  ): Promise<PromptTemplate | null> {
    // Check for active experiment
    if (experimentContext) {
      const experimentPrompt = await this.getExperimentPrompt(
        tenantId,
        agentType,
        experimentContext.learnerId
      );
      if (experimentPrompt) {
        return experimentPrompt;
      }
    }

    // Get the active prompt
    const { rows } = await this.pool.query(
      `SELECT * FROM prompt_templates
       WHERE tenant_id = $1 AND agent_type = $2 AND status = 'ACTIVE'
       ORDER BY version DESC
       LIMIT 1`,
      [tenantId, agentType]
    );

    if (rows.length === 0) return null;
    return this.rowToTemplate(rows[0]);
  }

  /**
   * Create a new prompt template
   */
  async createTemplate(input: {
    tenantId: string;
    agentType: string;
    name: string;
    template: string;
    variables: PromptVariable[];
    createdBy: string;
    parentId?: string;
    tags?: string[];
    notes?: string;
  }): Promise<PromptTemplate> {
    const id = randomUUID();
    const now = new Date();

    // Get next version number
    const { rows: versionRows } = await this.pool.query(
      `SELECT COALESCE(MAX(version), 0) + 1 as next_version
       FROM prompt_templates
       WHERE tenant_id = $1 AND agent_type = $2`,
      [input.tenantId, input.agentType]
    );
    const version = parseInt(versionRows[0].next_version) || 1;

    const template: PromptTemplate = {
      id,
      tenantId: input.tenantId,
      agentType: input.agentType,
      name: input.name,
      version,
      template: input.template,
      variables: input.variables,
      status: 'DRAFT',
      parentId: input.parentId,
      metrics: {
        impressions: 0,
        acceptanceRate: 0,
        completionRate: 0,
        avgUserRating: 0,
        positiveImpactRate: 0,
        avgResponseQuality: 0,
        avgLatencyMs: 0,
        errorRate: 0,
        lastUpdated: now,
      },
      metadata: {
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
        tags: input.tags ?? [],
        notes: input.notes,
      },
    };

    await this.pool.query(
      `INSERT INTO prompt_templates (
        id, tenant_id, agent_type, name, version, template, variables,
        status, parent_id, metrics, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        template.id,
        template.tenantId,
        template.agentType,
        template.name,
        template.version,
        template.template,
        JSON.stringify(template.variables),
        template.status,
        template.parentId,
        JSON.stringify(template.metrics),
        JSON.stringify(template.metadata),
        template.metadata.createdAt,
        template.metadata.updatedAt,
      ]
    );

    this.emit('template:created', template);
    return template;
  }

  /**
   * Create a variant of an existing prompt for A/B testing
   */
  async createVariant(
    parentPromptId: string,
    modifications: {
      template?: string;
      name?: string;
      notes?: string;
    },
    createdBy: string
  ): Promise<PromptTemplate> {
    const parent = await this.getTemplateById(parentPromptId);
    if (!parent) {
      throw new Error('Parent prompt not found');
    }

    return this.createTemplate({
      tenantId: parent.tenantId,
      agentType: parent.agentType,
      name: modifications.name ?? `${parent.name} (Variant)`,
      template: modifications.template ?? parent.template,
      variables: parent.variables,
      createdBy,
      parentId: parent.id,
      tags: [...parent.metadata.tags, 'variant'],
      notes: modifications.notes,
    });
  }

  /**
   * Start an A/B test experiment
   */
  async startExperiment(input: {
    tenantId: string;
    agentType: string;
    name: string;
    hypothesis: string;
    controlPromptId: string;
    variantPromptIds: string[];
    trafficSplit?: Record<string, number>;
    primaryMetric: string;
    secondaryMetrics?: string[];
    minSampleSize?: number;
    maxDurationDays?: number;
    createdBy: string;
  }): Promise<PromptExperiment> {
    // Check for existing experiments
    const { rows: existingRows } = await this.pool.query(
      `SELECT COUNT(*) as count FROM prompt_experiments
       WHERE tenant_id = $1 AND agent_type = $2 AND status = 'RUNNING'`,
      [input.tenantId, input.agentType]
    );

    if (parseInt(existingRows[0].count) >= this.config.maxConcurrentExperiments) {
      throw new Error('Maximum concurrent experiments reached');
    }

    const id = randomUUID();
    const now = new Date();

    // Default traffic split: equal distribution
    const allPromptIds = [input.controlPromptId, ...input.variantPromptIds];
    const defaultSplit: Record<string, number> = {};
    const splitPercentage = Math.floor(100 / allPromptIds.length);
    allPromptIds.forEach((pid, i) => {
      defaultSplit[pid] = i === 0
        ? 100 - (splitPercentage * (allPromptIds.length - 1))
        : splitPercentage;
    });

    const experiment: PromptExperiment = {
      id,
      tenantId: input.tenantId,
      agentType: input.agentType,
      name: input.name,
      hypothesis: input.hypothesis,
      controlPromptId: input.controlPromptId,
      variantPromptIds: input.variantPromptIds,
      trafficSplit: input.trafficSplit ?? defaultSplit,
      metrics: {
        primary: input.primaryMetric,
        secondary: input.secondaryMetrics ?? [],
      },
      minSampleSize: input.minSampleSize ?? this.config.minImpressionsForAnalysis,
      maxDurationDays: input.maxDurationDays ?? 14,
      status: 'RUNNING',
      createdAt: now,
      startedAt: now,
    };

    await this.pool.query(
      `INSERT INTO prompt_experiments (
        id, tenant_id, agent_type, name, hypothesis, control_prompt_id,
        variant_prompt_ids, traffic_split, metrics, min_sample_size,
        max_duration_days, status, created_at, started_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
      [
        experiment.id,
        experiment.tenantId,
        experiment.agentType,
        experiment.name,
        experiment.hypothesis,
        experiment.controlPromptId,
        JSON.stringify(experiment.variantPromptIds),
        JSON.stringify(experiment.trafficSplit),
        JSON.stringify(experiment.metrics),
        experiment.minSampleSize,
        experiment.maxDurationDays,
        experiment.status,
        experiment.createdAt,
        experiment.startedAt,
      ]
    );

    // Update prompt statuses
    const allIds = [input.controlPromptId, ...input.variantPromptIds];
    await this.pool.query(
      `UPDATE prompt_templates SET status = 'TESTING', updated_at = NOW()
       WHERE id = ANY($1)`,
      [allIds]
    );

    this.emit('experiment:started', experiment);
    return experiment;
  }

  /**
   * Analyze experiment results and determine winner
   */
  async analyzeExperiment(experimentId: string): Promise<ExperimentResults> {
    const experiment = await this.getExperimentById(experimentId);
    if (!experiment) {
      throw new Error('Experiment not found');
    }

    const allPromptIds = [experiment.controlPromptId, ...experiment.variantPromptIds];

    // Get metrics for each prompt
    const promptMetrics: Record<string, PromptMetrics> = {};
    for (const promptId of allPromptIds) {
      const template = await this.getTemplateById(promptId);
      if (template) {
        promptMetrics[promptId] = template.metrics;
      }
    }

    // Calculate deltas relative to control
    const controlMetrics = promptMetrics[experiment.controlPromptId];
    const metricDeltas: Record<string, Record<string, number>> = {};
    const sampleSizes: Record<string, number> = {};
    const pValues: Record<string, number> = {};

    for (const promptId of allPromptIds) {
      const metrics = promptMetrics[promptId];
      sampleSizes[promptId] = metrics?.impressions ?? 0;

      if (promptId === experiment.controlPromptId) continue;

      metricDeltas[promptId] = {};

      // Calculate delta for primary metric
      const primaryKey = experiment.metrics.primary as keyof PromptMetrics;
      const controlValue = (controlMetrics?.[primaryKey] as number) ?? 0;
      const variantValue = (metrics?.[primaryKey] as number) ?? 0;
      metricDeltas[promptId][experiment.metrics.primary] = variantValue - controlValue;

      // Calculate p-value using simplified significance test
      pValues[promptId] = this.calculateSignificance(
        controlMetrics?.impressions ?? 0,
        controlValue,
        metrics?.impressions ?? 0,
        variantValue
      );
    }

    // Determine winner
    let winner: string | undefined;
    let highestConfidence = 0;

    for (const promptId of experiment.variantPromptIds) {
      const confidence = 1 - (pValues[promptId] ?? 1);
      const primaryDelta = metricDeltas[promptId]?.[experiment.metrics.primary] ?? 0;

      if (
        confidence >= this.config.significanceThreshold &&
        primaryDelta > 0 &&
        confidence > highestConfidence
      ) {
        winner = promptId;
        highestConfidence = confidence;
      }
    }

    // If no variant won, control is the winner
    if (!winner) {
      winner = experiment.controlPromptId;
      highestConfidence = this.config.significanceThreshold;
    }

    const results: ExperimentResults = {
      winner,
      confidence: highestConfidence,
      metricDeltas,
      sampleSizes,
      pValues,
    };

    // Update experiment with results
    await this.pool.query(
      `UPDATE prompt_experiments
       SET results = $2, status = 'COMPLETED', ended_at = NOW()
       WHERE id = $1`,
      [experimentId, JSON.stringify(results)]
    );

    this.emit('experiment:analyzed', { experiment, results });

    // Auto-promote if configured
    if (this.config.autoPromoteWinners && winner !== experiment.controlPromptId) {
      await this.promotePrompt(winner);
    }

    return results;
  }

  /**
   * Generate optimization suggestions using LLM
   */
  async generateSuggestions(promptId: string): Promise<PromptSuggestion[]> {
    const template = await this.getTemplateById(promptId);
    if (!template) {
      throw new Error('Prompt template not found');
    }

    // Check if we have enough data
    if (template.metrics.impressions < this.config.minImpressionsForAnalysis) {
      return [];
    }

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an expert prompt engineer analyzing prompt effectiveness.
Analyze the following prompt template and its performance metrics, then suggest improvements.

Focus on:
1. Clarity of instructions
2. Specificity of guidance
3. Use of examples
4. Appropriate constraints
5. Structure and organization

Respond with a JSON array of suggestions, each with:
- suggestionType: one of CLARITY, SPECIFICITY, EXAMPLE, CONSTRAINT, PERSONA, STRUCTURE, LENGTH, VARIABLE
- description: brief description of the change
- suggestedChange: the specific text change or addition
- rationale: why this will improve performance
- estimatedImpact: { metric: string, expectedDelta: number (0-1), confidence: number (0-1) }`,
      },
      {
        role: 'user',
        content: `Prompt Template:
\`\`\`
${template.template}
\`\`\`

Performance Metrics:
- Acceptance Rate: ${(template.metrics.acceptanceRate * 100).toFixed(1)}%
- Completion Rate: ${(template.metrics.completionRate * 100).toFixed(1)}%
- User Rating: ${template.metrics.avgUserRating.toFixed(2)}/5
- Positive Impact Rate: ${(template.metrics.positiveImpactRate * 100).toFixed(1)}%
- Error Rate: ${(template.metrics.errorRate * 100).toFixed(1)}%

Agent Type: ${template.agentType}
Impressions: ${template.metrics.impressions}

Provide 3-5 specific suggestions to improve this prompt.`,
      },
    ];

    const result = await this.llm.complete(messages, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    // Parse suggestions from LLM response
    const suggestions: PromptSuggestion[] = [];

    try {
      const jsonMatch = result.content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          suggestionType: SuggestionType;
          description: string;
          suggestedChange: string;
          rationale: string;
          estimatedImpact: {
            metric: string;
            expectedDelta: number;
            confidence: number;
          };
        }>;

        for (const item of parsed) {
          suggestions.push({
            id: randomUUID(),
            promptId,
            suggestionType: item.suggestionType,
            description: item.description,
            suggestedChange: item.suggestedChange,
            rationale: item.rationale,
            estimatedImpact: item.estimatedImpact,
            status: 'PENDING',
            createdAt: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Failed to parse suggestions:', error);
    }

    // Store suggestions
    for (const suggestion of suggestions) {
      await this.pool.query(
        `INSERT INTO prompt_suggestions (
          id, prompt_id, suggestion_type, description, suggested_change,
          rationale, estimated_impact, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          suggestion.id,
          suggestion.promptId,
          suggestion.suggestionType,
          suggestion.description,
          suggestion.suggestedChange,
          suggestion.rationale,
          JSON.stringify(suggestion.estimatedImpact),
          suggestion.status,
          suggestion.createdAt,
        ]
      );
    }

    this.emit('suggestions:generated', { promptId, suggestions });
    return suggestions;
  }

  /**
   * Promote a prompt variant to active status
   */
  async promotePrompt(promptId: string): Promise<void> {
    const template = await this.getTemplateById(promptId);
    if (!template) {
      throw new Error('Prompt template not found');
    }

    // Deprecate current active prompt
    await this.pool.query(
      `UPDATE prompt_templates
       SET status = 'DEPRECATED', updated_at = NOW()
       WHERE tenant_id = $1 AND agent_type = $2 AND status = 'ACTIVE'`,
      [template.tenantId, template.agentType]
    );

    // Activate new prompt
    await this.pool.query(
      `UPDATE prompt_templates
       SET status = 'ACTIVE', updated_at = NOW()
       WHERE id = $1`,
      [promptId]
    );

    this.emit('prompt:promoted', template);
  }

  /**
   * Record a prompt impression for metrics
   */
  async recordImpression(
    promptId: string,
    outcome: {
      accepted?: boolean;
      completed?: boolean;
      userRating?: number;
      positiveImpact?: boolean;
      responseQuality?: number;
      latencyMs?: number;
      error?: boolean;
    }
  ): Promise<void> {
    // Use Redis for real-time counting, periodically sync to PostgreSQL
    const counterKey = `${this.cachePrefix}:impressions:${promptId}`;
    const metricsKey = `${this.cachePrefix}:metrics:${promptId}`;

    const pipeline = this.redis.pipeline();
    pipeline.hincrby(counterKey, 'impressions', 1);

    if (outcome.accepted !== undefined) {
      pipeline.hincrby(counterKey, 'accepted', outcome.accepted ? 1 : 0);
    }
    if (outcome.completed !== undefined) {
      pipeline.hincrby(counterKey, 'completed', outcome.completed ? 1 : 0);
    }
    if (outcome.userRating !== undefined) {
      pipeline.hincrbyfloat(counterKey, 'ratingSum', outcome.userRating);
      pipeline.hincrby(counterKey, 'ratingCount', 1);
    }
    if (outcome.positiveImpact !== undefined) {
      pipeline.hincrby(counterKey, 'positiveImpact', outcome.positiveImpact ? 1 : 0);
    }
    if (outcome.latencyMs !== undefined) {
      pipeline.hincrbyfloat(counterKey, 'latencySum', outcome.latencyMs);
    }
    if (outcome.error !== undefined) {
      pipeline.hincrby(counterKey, 'errors', outcome.error ? 1 : 0);
    }

    pipeline.expire(counterKey, 3600); // 1 hour TTL, synced to DB periodically
    await pipeline.exec();
  }

  /**
   * Sync Redis metrics to PostgreSQL
   */
  async syncMetrics(): Promise<void> {
    const pattern = `${this.cachePrefix}:impressions:*`;
    const keys = await this.redis.keys(pattern);

    for (const key of keys) {
      const promptId = key.split(':').pop();
      if (!promptId) continue;

      const counters = await this.redis.hgetall(key);
      if (!counters || Object.keys(counters).length === 0) continue;

      const impressions = parseInt(counters.impressions || '0');
      if (impressions === 0) continue;

      const metrics: Partial<PromptMetrics> = {
        impressions,
        acceptanceRate: parseInt(counters.accepted || '0') / impressions,
        completionRate: parseInt(counters.completed || '0') / impressions,
        avgUserRating: parseInt(counters.ratingCount || '0') > 0
          ? parseFloat(counters.ratingSum || '0') / parseInt(counters.ratingCount)
          : 0,
        positiveImpactRate: parseInt(counters.positiveImpact || '0') / impressions,
        avgLatencyMs: parseFloat(counters.latencySum || '0') / impressions,
        errorRate: parseInt(counters.errors || '0') / impressions,
        lastUpdated: new Date(),
      };

      // Merge with existing metrics using exponential moving average
      await this.pool.query(
        `UPDATE prompt_templates
         SET metrics = jsonb_set(
           jsonb_set(
             jsonb_set(
               jsonb_set(
                 jsonb_set(
                   jsonb_set(
                     jsonb_set(
                       jsonb_set(
                         metrics,
                         '{impressions}',
                         to_jsonb((metrics->>'impressions')::int + $2)
                       ),
                       '{acceptanceRate}',
                       to_jsonb(((metrics->>'acceptanceRate')::float * 0.9 + $3 * 0.1))
                     ),
                     '{completionRate}',
                     to_jsonb(((metrics->>'completionRate')::float * 0.9 + $4 * 0.1))
                   ),
                   '{avgUserRating}',
                   to_jsonb(COALESCE(((metrics->>'avgUserRating')::float * 0.9 + $5 * 0.1), $5))
                 ),
                 '{positiveImpactRate}',
                 to_jsonb(((metrics->>'positiveImpactRate')::float * 0.9 + $6 * 0.1))
               ),
               '{avgLatencyMs}',
               to_jsonb(((metrics->>'avgLatencyMs')::float * 0.9 + $7 * 0.1))
             ),
             '{errorRate}',
             to_jsonb(((metrics->>'errorRate')::float * 0.9 + $8 * 0.1))
           ),
           '{lastUpdated}',
           to_jsonb($9::text)
         ),
         updated_at = NOW()
         WHERE id = $1`,
        [
          promptId,
          metrics.impressions,
          metrics.acceptanceRate,
          metrics.completionRate,
          metrics.avgUserRating,
          metrics.positiveImpactRate,
          metrics.avgLatencyMs,
          metrics.errorRate,
          metrics.lastUpdated?.toISOString(),
        ]
      );

      // Clear the Redis counters
      await this.redis.del(key);
    }

    this.emit('metrics:synced', { keysProcessed: keys.length });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  private async getTemplateById(id: string): Promise<PromptTemplate | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM prompt_templates WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return this.rowToTemplate(rows[0]);
  }

  private async getExperimentById(id: string): Promise<PromptExperiment | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM prompt_experiments WHERE id = $1`,
      [id]
    );
    if (rows.length === 0) return null;
    return this.rowToExperiment(rows[0]);
  }

  private async getExperimentPrompt(
    tenantId: string,
    agentType: string,
    learnerId: string
  ): Promise<PromptTemplate | null> {
    // Get active experiment
    const { rows: expRows } = await this.pool.query(
      `SELECT * FROM prompt_experiments
       WHERE tenant_id = $1 AND agent_type = $2 AND status = 'RUNNING'
       LIMIT 1`,
      [tenantId, agentType]
    );

    if (expRows.length === 0) return null;

    const experiment = this.rowToExperiment(expRows[0]);

    // Deterministic assignment based on learner ID
    const hash = this.hashString(learnerId);
    const bucket = hash % 100;

    let cumulative = 0;
    for (const [promptId, percentage] of Object.entries(experiment.trafficSplit)) {
      cumulative += percentage;
      if (bucket < cumulative) {
        return this.getTemplateById(promptId);
      }
    }

    return this.getTemplateById(experiment.controlPromptId);
  }

  private calculateSignificance(
    n1: number,
    p1: number,
    n2: number,
    p2: number
  ): number {
    // Simplified two-proportion z-test
    if (n1 < 30 || n2 < 30) return 1; // Not enough data

    const p = (n1 * p1 + n2 * p2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

    if (se === 0) return 1;

    const z = Math.abs(p1 - p2) / se;

    // Approximate p-value from z-score
    const pValue = 2 * (1 - this.normalCDF(z));
    return pValue;
  }

  private normalCDF(x: number): number {
    // Approximation of the cumulative distribution function
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  private rowToTemplate(row: Record<string, unknown>): PromptTemplate {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      agentType: row.agent_type as string,
      name: row.name as string,
      version: row.version as number,
      template: row.template as string,
      variables: typeof row.variables === 'string'
        ? JSON.parse(row.variables)
        : row.variables as PromptVariable[],
      status: row.status as PromptStatus,
      parentId: row.parent_id as string | undefined,
      metrics: typeof row.metrics === 'string'
        ? JSON.parse(row.metrics)
        : row.metrics as PromptMetrics,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as PromptTemplate['metadata'],
    };
  }

  private rowToExperiment(row: Record<string, unknown>): PromptExperiment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      agentType: row.agent_type as string,
      name: row.name as string,
      hypothesis: row.hypothesis as string,
      controlPromptId: row.control_prompt_id as string,
      variantPromptIds: typeof row.variant_prompt_ids === 'string'
        ? JSON.parse(row.variant_prompt_ids)
        : row.variant_prompt_ids as string[],
      trafficSplit: typeof row.traffic_split === 'string'
        ? JSON.parse(row.traffic_split)
        : row.traffic_split as Record<string, number>,
      metrics: typeof row.metrics === 'string'
        ? JSON.parse(row.metrics)
        : row.metrics as PromptExperiment['metrics'],
      minSampleSize: row.min_sample_size as number,
      maxDurationDays: row.max_duration_days as number,
      status: row.status as ExperimentStatus,
      results: row.results
        ? (typeof row.results === 'string' ? JSON.parse(row.results) : row.results as ExperimentResults)
        : undefined,
      createdAt: new Date(row.created_at as string),
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      endedAt: row.ended_at ? new Date(row.ended_at as string) : undefined,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default PromptOptimizer;
