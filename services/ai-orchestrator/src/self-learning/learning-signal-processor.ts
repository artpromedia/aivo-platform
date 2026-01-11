/**
 * Self-Learning: Learning Signal Processor
 *
 * Processes feedback and outcomes to generate learning signals:
 * - Aggregates positive/negative signals by context
 * - Identifies patterns in successful interactions
 * - Computes reward signals for reinforcement learning
 * - Prepares training data for model fine-tuning
 * - Maintains learning history for trend analysis
 *
 * @module ai-orchestrator/self-learning/learning-signal-processor
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * A learning signal extracted from an interaction
 */
export interface LearningSignal {
  id: string;
  tenantId: string;
  signalType: SignalType;
  source: SignalSource;
  strength: number; // -1 to 1 (negative = bad, positive = good)
  context: SignalContext;
  features: SignalFeatures;
  timestamp: Date;
  processed: boolean;
  processedAt?: Date;
}

export type SignalType =
  | 'ACCEPTANCE'        // User accepted recommendation
  | 'REJECTION'         // User rejected recommendation
  | 'COMPLETION'        // Task completed successfully
  | 'ABANDONMENT'       // User abandoned mid-task
  | 'POSITIVE_FEEDBACK' // Explicit positive feedback
  | 'NEGATIVE_FEEDBACK' // Explicit negative feedback
  | 'IMPROVEMENT'       // Measurable performance improvement
  | 'REGRESSION'        // Measurable performance decline
  | 'ENGAGEMENT'        // High engagement observed
  | 'DISENGAGEMENT';    // Low engagement/boredom observed

export type SignalSource =
  | 'RECOMMENDATION_SYSTEM'
  | 'TUTOR_AGENT'
  | 'GOAL_PLANNER'
  | 'FOCUS_MONITOR'
  | 'ASSESSMENT'
  | 'CONTENT_SELECTOR'
  | 'USER_FEEDBACK'
  | 'SYSTEM_OBSERVATION';

export interface SignalContext {
  learnerId: string;
  sessionId?: string;
  agentType?: string;
  actionId?: string;
  promptId?: string;
  subject?: string;
  topic?: string;
  skillId?: string;
}

export interface SignalFeatures {
  // Learner state at time of signal
  skillLevel?: number;
  emotionalState?: string;
  focusLevel?: number;
  priorPerformance?: number;

  // Action characteristics
  actionType?: string;
  confidence?: number;
  difficulty?: string;

  // Outcome characteristics
  timeToResponse?: number;
  attemptsBeforeSuccess?: number;
  errorCount?: number;

  // Custom features for ML
  customFeatures?: Record<string, number | string | boolean>;
}

/**
 * Aggregated learning patterns
 */
export interface LearningPattern {
  id: string;
  tenantId: string;
  patternType: PatternType;
  description: string;
  conditions: PatternCondition[];
  outcome: {
    signalType: SignalType;
    avgStrength: number;
    sampleSize: number;
    confidence: number;
  };
  actionableInsight?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type PatternType =
  | 'SUCCESS_PATTERN'      // Conditions that lead to success
  | 'FAILURE_PATTERN'      // Conditions that lead to failure
  | 'ENGAGEMENT_PATTERN'   // Conditions that drive engagement
  | 'TIMING_PATTERN'       // Optimal timing patterns
  | 'DIFFICULTY_PATTERN'   // Optimal difficulty progression
  | 'INTERVENTION_PATTERN';// Effective intervention patterns

export interface PatternCondition {
  feature: string;
  operator: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';
  value: unknown;
}

/**
 * Training example for model fine-tuning
 */
export interface TrainingExample {
  id: string;
  tenantId: string;
  exampleType: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  input: {
    systemPrompt?: string;
    userMessage: string;
    context: Record<string, unknown>;
  };
  output: {
    response: string;
    reasoning?: string;
  };
  reward: number;
  metadata: {
    agentType: string;
    sourceSignalId: string;
    createdAt: Date;
    validated: boolean;
    validatedBy?: string;
  };
}

/**
 * Configuration for the signal processor
 */
export interface SignalProcessorConfig {
  /** Minimum signals for pattern detection */
  minSignalsForPattern: number;

  /** Confidence threshold for pattern extraction */
  patternConfidenceThreshold: number;

  /** Batch size for signal processing */
  processingBatchSize: number;

  /** How long to keep raw signals (days) */
  signalRetentionDays: number;

  /** Whether to auto-generate training examples */
  autoGenerateTrainingExamples: boolean;

  /** Minimum strength for positive examples */
  positiveExampleThreshold: number;

  /** Maximum strength for negative examples */
  negativeExampleThreshold: number;
}

export const DEFAULT_PROCESSOR_CONFIG: SignalProcessorConfig = {
  minSignalsForPattern: 100,
  patternConfidenceThreshold: 0.8,
  processingBatchSize: 1000,
  signalRetentionDays: 90,
  autoGenerateTrainingExamples: true,
  positiveExampleThreshold: 0.7,
  negativeExampleThreshold: -0.5,
};

// ════════════════════════════════════════════════════════════════════════════════
// LEARNING SIGNAL PROCESSOR
// ════════════════════════════════════════════════════════════════════════════════

export class LearningSignalProcessor extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly config: SignalProcessorConfig;
  private readonly cachePrefix = 'learning_signals';

  constructor(
    pool: Pool,
    redis: Redis,
    config: Partial<SignalProcessorConfig> = {}
  ) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.config = { ...DEFAULT_PROCESSOR_CONFIG, ...config };
  }

  /**
   * Record a new learning signal
   */
  async recordSignal(input: {
    tenantId: string;
    signalType: SignalType;
    source: SignalSource;
    strength: number;
    context: SignalContext;
    features: SignalFeatures;
  }): Promise<LearningSignal> {
    const id = randomUUID();
    const now = new Date();

    const signal: LearningSignal = {
      id,
      tenantId: input.tenantId,
      signalType: input.signalType,
      source: input.source,
      strength: Math.max(-1, Math.min(1, input.strength)),
      context: input.context,
      features: input.features,
      timestamp: now,
      processed: false,
    };

    await this.pool.query(
      `INSERT INTO learning_signals (
        id, tenant_id, signal_type, source, strength, context, features,
        timestamp, processed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        signal.id,
        signal.tenantId,
        signal.signalType,
        signal.source,
        signal.strength,
        JSON.stringify(signal.context),
        JSON.stringify(signal.features),
        signal.timestamp,
        signal.processed,
      ]
    );

    // Update real-time counters
    await this.updateRealtimeCounters(signal);

    this.emit('signal:recorded', signal);

    // Check if we should trigger pattern detection
    await this.maybeDetectPatterns(input.tenantId);

    return signal;
  }

  /**
   * Process unprocessed signals in batches
   */
  async processSignals(): Promise<{ processed: number; patternsFound: number; examplesGenerated: number }> {
    let totalProcessed = 0;
    let patternsFound = 0;
    let examplesGenerated = 0;

    // Get unprocessed signals
    const { rows } = await this.pool.query(
      `SELECT * FROM learning_signals
       WHERE processed = false
       ORDER BY timestamp ASC
       LIMIT $1`,
      [this.config.processingBatchSize]
    );

    if (rows.length === 0) {
      return { processed: 0, patternsFound: 0, examplesGenerated: 0 };
    }

    const signals = rows.map(row => this.rowToSignal(row));

    // Group signals by tenant
    const signalsByTenant = new Map<string, LearningSignal[]>();
    for (const signal of signals) {
      const existing = signalsByTenant.get(signal.tenantId) ?? [];
      existing.push(signal);
      signalsByTenant.set(signal.tenantId, existing);
    }

    // Process each tenant's signals
    for (const [tenantId, tenantSignals] of signalsByTenant) {
      // Update aggregate statistics
      await this.updateAggregates(tenantId, tenantSignals);

      // Generate training examples if configured
      if (this.config.autoGenerateTrainingExamples) {
        const examples = await this.generateTrainingExamples(tenantSignals);
        examplesGenerated += examples.length;
      }

      totalProcessed += tenantSignals.length;
    }

    // Mark signals as processed
    const signalIds = signals.map(s => s.id);
    await this.pool.query(
      `UPDATE learning_signals
       SET processed = true, processed_at = NOW()
       WHERE id = ANY($1)`,
      [signalIds]
    );

    this.emit('signals:processed', {
      processed: totalProcessed,
      patternsFound,
      examplesGenerated,
    });

    return { processed: totalProcessed, patternsFound, examplesGenerated };
  }

  /**
   * Detect patterns in learning signals
   */
  async detectPatterns(tenantId: string): Promise<LearningPattern[]> {
    const patterns: LearningPattern[] = [];

    // Get aggregated signal data
    const { rows } = await this.pool.query(
      `SELECT
        signal_type,
        features->>'actionType' as action_type,
        features->>'emotionalState' as emotional_state,
        features->>'difficulty' as difficulty,
        context->>'subject' as subject,
        AVG(strength) as avg_strength,
        COUNT(*) as sample_size,
        STDDEV(strength) as strength_stddev
      FROM learning_signals
      WHERE tenant_id = $1
        AND timestamp > NOW() - INTERVAL '30 days'
      GROUP BY signal_type, features->>'actionType', features->>'emotionalState',
               features->>'difficulty', context->>'subject'
      HAVING COUNT(*) >= $2`,
      [tenantId, this.config.minSignalsForPattern]
    );

    for (const row of rows) {
      const avgStrength = parseFloat(row.avg_strength);
      const sampleSize = parseInt(row.sample_size);
      const stddev = parseFloat(row.strength_stddev) || 0;

      // Calculate confidence based on sample size and variance
      const confidence = Math.min(1, sampleSize / 500) * (1 - Math.min(stddev, 0.5));

      if (confidence < this.config.patternConfidenceThreshold) continue;

      const conditions: PatternCondition[] = [];
      if (row.action_type) {
        conditions.push({ feature: 'actionType', operator: 'eq', value: row.action_type });
      }
      if (row.emotional_state) {
        conditions.push({ feature: 'emotionalState', operator: 'eq', value: row.emotional_state });
      }
      if (row.difficulty) {
        conditions.push({ feature: 'difficulty', operator: 'eq', value: row.difficulty });
      }
      if (row.subject) {
        conditions.push({ feature: 'subject', operator: 'eq', value: row.subject });
      }

      const patternType = this.classifyPatternType(row.signal_type, avgStrength);

      const pattern: LearningPattern = {
        id: randomUUID(),
        tenantId,
        patternType,
        description: this.generatePatternDescription(patternType, conditions, avgStrength),
        conditions,
        outcome: {
          signalType: row.signal_type,
          avgStrength,
          sampleSize,
          confidence,
        },
        actionableInsight: this.generateInsight(patternType, conditions, avgStrength),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Store pattern
      await this.pool.query(
        `INSERT INTO learning_patterns (
          id, tenant_id, pattern_type, description, conditions, outcome,
          actionable_insight, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, pattern_type, conditions)
        DO UPDATE SET outcome = $6, actionable_insight = $7, updated_at = $9`,
        [
          pattern.id,
          pattern.tenantId,
          pattern.patternType,
          pattern.description,
          JSON.stringify(pattern.conditions),
          JSON.stringify(pattern.outcome),
          pattern.actionableInsight,
          pattern.createdAt,
          pattern.updatedAt,
        ]
      );

      patterns.push(pattern);
    }

    this.emit('patterns:detected', { tenantId, patterns });
    return patterns;
  }

  /**
   * Get reward signal for reinforcement learning
   */
  async getRewardSignal(
    tenantId: string,
    context: SignalContext,
    timeWindowMs: number = 60000
  ): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT AVG(strength) as reward
       FROM learning_signals
       WHERE tenant_id = $1
         AND context->>'learnerId' = $2
         AND context->>'sessionId' = $3
         AND timestamp > NOW() - ($4 || ' milliseconds')::interval`,
      [tenantId, context.learnerId, context.sessionId, timeWindowMs]
    );

    return parseFloat(rows[0]?.reward) || 0;
  }

  /**
   * Get patterns applicable to current context
   */
  async getApplicablePatterns(
    tenantId: string,
    features: SignalFeatures
  ): Promise<LearningPattern[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM learning_patterns
       WHERE tenant_id = $1
       ORDER BY (outcome->>'confidence')::float DESC`,
      [tenantId]
    );

    const patterns = rows.map(row => this.rowToPattern(row));

    // Filter patterns that match current features
    return patterns.filter(pattern =>
      this.patternMatchesFeatures(pattern, features)
    );
  }

  /**
   * Get training examples for model fine-tuning
   */
  async getTrainingExamples(
    tenantId: string,
    options: {
      agentType?: string;
      exampleType?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      limit?: number;
      validatedOnly?: boolean;
    } = {}
  ): Promise<TrainingExample[]> {
    const conditions = ['tenant_id = $1'];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (options.agentType) {
      conditions.push(`metadata->>'agentType' = $${paramIndex}`);
      params.push(options.agentType);
      paramIndex++;
    }

    if (options.exampleType) {
      conditions.push(`example_type = $${paramIndex}`);
      params.push(options.exampleType);
      paramIndex++;
    }

    if (options.validatedOnly) {
      conditions.push(`(metadata->>'validated')::boolean = true`);
    }

    const { rows } = await this.pool.query(
      `SELECT * FROM training_examples
       WHERE ${conditions.join(' AND ')}
       ORDER BY (metadata->>'createdAt')::timestamp DESC
       LIMIT $${paramIndex}`,
      [...params, options.limit ?? 1000]
    );

    return rows.map(row => this.rowToExample(row));
  }

  /**
   * Export training data in JSONL format for fine-tuning
   */
  async exportTrainingData(
    tenantId: string,
    options: {
      agentType?: string;
      format?: 'openai' | 'anthropic' | 'generic';
    } = {}
  ): Promise<string> {
    const examples = await this.getTrainingExamples(tenantId, {
      agentType: options.agentType,
      validatedOnly: true,
    });

    const format = options.format ?? 'generic';
    const lines: string[] = [];

    for (const example of examples) {
      let formatted: Record<string, unknown>;

      switch (format) {
        case 'openai':
          formatted = {
            messages: [
              ...(example.input.systemPrompt
                ? [{ role: 'system', content: example.input.systemPrompt }]
                : []),
              { role: 'user', content: example.input.userMessage },
              { role: 'assistant', content: example.output.response },
            ],
          };
          break;

        case 'anthropic':
          formatted = {
            prompt: `${example.input.systemPrompt ?? ''}\n\nHuman: ${example.input.userMessage}\n\nAssistant:`,
            completion: ` ${example.output.response}`,
          };
          break;

        default:
          formatted = {
            input: example.input,
            output: example.output,
            reward: example.reward,
            metadata: example.metadata,
          };
      }

      lines.push(JSON.stringify(formatted));
    }

    return lines.join('\n');
  }

  /**
   * Compute aggregate statistics for a time period
   */
  async computeStatistics(
    tenantId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      groupBy?: 'day' | 'week' | 'agent' | 'signal_type';
    } = {}
  ): Promise<Record<string, unknown>> {
    const startDate = options.startDate ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options.endDate ?? new Date();

    const { rows } = await this.pool.query(
      `SELECT
        COUNT(*) as total_signals,
        AVG(strength) as avg_strength,
        AVG(CASE WHEN strength > 0 THEN strength END) as avg_positive_strength,
        AVG(CASE WHEN strength < 0 THEN strength END) as avg_negative_strength,
        SUM(CASE WHEN strength > 0 THEN 1 ELSE 0 END)::float / COUNT(*) as positive_rate,
        COUNT(DISTINCT context->>'learnerId') as unique_learners,
        COUNT(DISTINCT context->>'sessionId') as unique_sessions
      FROM learning_signals
      WHERE tenant_id = $1
        AND timestamp >= $2
        AND timestamp <= $3`,
      [tenantId, startDate, endDate]
    );

    return {
      period: { start: startDate, end: endDate },
      metrics: {
        totalSignals: parseInt(rows[0].total_signals) || 0,
        avgStrength: parseFloat(rows[0].avg_strength) || 0,
        avgPositiveStrength: parseFloat(rows[0].avg_positive_strength) || 0,
        avgNegativeStrength: parseFloat(rows[0].avg_negative_strength) || 0,
        positiveRate: parseFloat(rows[0].positive_rate) || 0,
        uniqueLearners: parseInt(rows[0].unique_learners) || 0,
        uniqueSessions: parseInt(rows[0].unique_sessions) || 0,
      },
    };
  }

  /**
   * Cleanup old signals beyond retention period
   */
  async cleanup(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - this.config.signalRetentionDays * 24 * 60 * 60 * 1000
    );

    const { rowCount } = await this.pool.query(
      `DELETE FROM learning_signals
       WHERE timestamp < $1 AND processed = true`,
      [cutoffDate]
    );

    this.emit('signals:cleaned', { deleted: rowCount });
    return rowCount ?? 0;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  private async updateRealtimeCounters(signal: LearningSignal): Promise<void> {
    const hourKey = `${this.cachePrefix}:hourly:${signal.tenantId}:${new Date().toISOString().slice(0, 13)}`;

    const pipeline = this.redis.pipeline();
    pipeline.hincrby(hourKey, 'total', 1);
    pipeline.hincrby(hourKey, signal.signalType, 1);
    pipeline.hincrbyfloat(hourKey, 'strengthSum', signal.strength);
    pipeline.expire(hourKey, 25 * 60 * 60); // 25 hours
    await pipeline.exec();
  }

  private async maybeDetectPatterns(tenantId: string): Promise<void> {
    const key = `${this.cachePrefix}:pattern_check:${tenantId}`;
    const lastCheck = await this.redis.get(key);

    if (lastCheck) return; // Already checked recently

    // Set a lock for 1 hour
    await this.redis.setex(key, 3600, 'checking');

    // Check if we have enough signals
    const { rows } = await this.pool.query(
      `SELECT COUNT(*) as count FROM learning_signals
       WHERE tenant_id = $1 AND processed = false`,
      [tenantId]
    );

    if (parseInt(rows[0].count) >= this.config.minSignalsForPattern) {
      // Trigger async pattern detection
      setImmediate(() => this.detectPatterns(tenantId));
    }
  }

  private async updateAggregates(tenantId: string, signals: LearningSignal[]): Promise<void> {
    // Group by agent type
    const byAgent = new Map<string, LearningSignal[]>();
    for (const signal of signals) {
      const agentType = signal.context.agentType ?? 'unknown';
      const existing = byAgent.get(agentType) ?? [];
      existing.push(signal);
      byAgent.set(agentType, existing);
    }

    for (const [agentType, agentSignals] of byAgent) {
      const avgStrength = agentSignals.reduce((sum, s) => sum + s.strength, 0) / agentSignals.length;
      const positiveCount = agentSignals.filter(s => s.strength > 0).length;

      await this.pool.query(
        `INSERT INTO learning_aggregates (
          tenant_id, agent_type, date, signal_count, avg_strength, positive_rate
        ) VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)
        ON CONFLICT (tenant_id, agent_type, date)
        DO UPDATE SET
          signal_count = learning_aggregates.signal_count + $3,
          avg_strength = (learning_aggregates.avg_strength + $4) / 2,
          positive_rate = (learning_aggregates.positive_rate + $5) / 2`,
        [tenantId, agentType, agentSignals.length, avgStrength, positiveCount / agentSignals.length]
      );
    }
  }

  private async generateTrainingExamples(signals: LearningSignal[]): Promise<TrainingExample[]> {
    const examples: TrainingExample[] = [];

    for (const signal of signals) {
      // Skip signals without enough context
      if (!signal.context.actionId) continue;

      // Determine example type based on strength
      let exampleType: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
      if (signal.strength >= this.config.positiveExampleThreshold) {
        exampleType = 'POSITIVE';
      } else if (signal.strength <= this.config.negativeExampleThreshold) {
        exampleType = 'NEGATIVE';
      } else {
        continue; // Skip neutral signals
      }

      // Get the original interaction for this signal
      const { rows } = await this.pool.query(
        `SELECT * FROM tracked_ai_actions WHERE id = $1`,
        [signal.context.actionId]
      );

      if (rows.length === 0) continue;

      const action = rows[0];

      const example: TrainingExample = {
        id: randomUUID(),
        tenantId: signal.tenantId,
        exampleType,
        input: {
          userMessage: action.action_details?.description ?? '',
          context: signal.features as Record<string, unknown>,
        },
        output: {
          response: action.action_details?.description ?? '',
          reasoning: action.action_details?.rationale,
        },
        reward: signal.strength,
        metadata: {
          agentType: signal.context.agentType ?? 'unknown',
          sourceSignalId: signal.id,
          createdAt: new Date(),
          validated: false,
        },
      };

      await this.pool.query(
        `INSERT INTO training_examples (
          id, tenant_id, example_type, input, output, reward, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          example.id,
          example.tenantId,
          example.exampleType,
          JSON.stringify(example.input),
          JSON.stringify(example.output),
          example.reward,
          JSON.stringify(example.metadata),
        ]
      );

      examples.push(example);
    }

    return examples;
  }

  private classifyPatternType(signalType: string, avgStrength: number): PatternType {
    if (avgStrength > 0.5) {
      if (signalType === 'ENGAGEMENT') return 'ENGAGEMENT_PATTERN';
      if (signalType === 'IMPROVEMENT') return 'SUCCESS_PATTERN';
      if (signalType.includes('INTERVENTION')) return 'INTERVENTION_PATTERN';
      return 'SUCCESS_PATTERN';
    }
    if (avgStrength < -0.3) {
      return 'FAILURE_PATTERN';
    }
    return 'SUCCESS_PATTERN';
  }

  private generatePatternDescription(
    patternType: PatternType,
    conditions: PatternCondition[],
    avgStrength: number
  ): string {
    const conditionStr = conditions
      .map(c => `${c.feature}=${c.value}`)
      .join(', ');

    const strengthStr = avgStrength > 0 ? 'positive' : 'negative';

    return `${patternType}: When ${conditionStr}, outcomes are typically ${strengthStr} (avg: ${avgStrength.toFixed(2)})`;
  }

  private generateInsight(
    patternType: PatternType,
    conditions: PatternCondition[],
    avgStrength: number
  ): string {
    switch (patternType) {
      case 'SUCCESS_PATTERN':
        return `Consider prioritizing these conditions for better outcomes`;
      case 'FAILURE_PATTERN':
        return `Consider avoiding or mitigating these conditions`;
      case 'ENGAGEMENT_PATTERN':
        return `These conditions drive higher engagement`;
      case 'INTERVENTION_PATTERN':
        return `Interventions are effective under these conditions`;
      default:
        return `Pattern detected with ${avgStrength > 0 ? 'positive' : 'negative'} correlation`;
    }
  }

  private patternMatchesFeatures(pattern: LearningPattern, features: SignalFeatures): boolean {
    for (const condition of pattern.conditions) {
      const featureValue = features[condition.feature as keyof SignalFeatures];
      if (featureValue === undefined) continue;

      switch (condition.operator) {
        case 'eq':
          if (featureValue !== condition.value) return false;
          break;
        case 'gt':
          if ((featureValue as number) <= (condition.value as number)) return false;
          break;
        case 'lt':
          if ((featureValue as number) >= (condition.value as number)) return false;
          break;
        // Add more operators as needed
      }
    }
    return true;
  }

  private rowToSignal(row: Record<string, unknown>): LearningSignal {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      signalType: row.signal_type as SignalType,
      source: row.source as SignalSource,
      strength: row.strength as number,
      context: typeof row.context === 'string'
        ? JSON.parse(row.context)
        : row.context as SignalContext,
      features: typeof row.features === 'string'
        ? JSON.parse(row.features)
        : row.features as SignalFeatures,
      timestamp: new Date(row.timestamp as string),
      processed: row.processed as boolean,
      processedAt: row.processed_at ? new Date(row.processed_at as string) : undefined,
    };
  }

  private rowToPattern(row: Record<string, unknown>): LearningPattern {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      patternType: row.pattern_type as PatternType,
      description: row.description as string,
      conditions: typeof row.conditions === 'string'
        ? JSON.parse(row.conditions)
        : row.conditions as PatternCondition[],
      outcome: typeof row.outcome === 'string'
        ? JSON.parse(row.outcome)
        : row.outcome as LearningPattern['outcome'],
      actionableInsight: row.actionable_insight as string | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private rowToExample(row: Record<string, unknown>): TrainingExample {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      exampleType: row.example_type as 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL',
      input: typeof row.input === 'string'
        ? JSON.parse(row.input)
        : row.input as TrainingExample['input'],
      output: typeof row.output === 'string'
        ? JSON.parse(row.output)
        : row.output as TrainingExample['output'],
      reward: row.reward as number,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as TrainingExample['metadata'],
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default LearningSignalProcessor;
