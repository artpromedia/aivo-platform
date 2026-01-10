/**
 * BrainMemory System
 *
 * Episodic and semantic memory system ported from legacy-agentic-app.
 * Provides persistent memory for AI agents with:
 * - Episodic memory: Event-based memories (what happened, when, context)
 * - Semantic memory: Fact-based knowledge (skills, preferences, relationships)
 * - Memory consolidation: Short-term to long-term transfer
 * - Contextual retrieval: Retrieve relevant memories based on current context
 * - Forgetting curves: Natural memory decay for less important memories
 *
 * @module learner-model-svc/memory/brain-memory
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import crypto from 'crypto';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface BrainMemoryConfig {
  maxEpisodicMemories: number;
  maxSemanticFacts: number;
  shortTermRetentionMinutes: number;
  longTermConsolidationThreshold: number;
  forgettingCurveHalfLife: number; // days
  contextSimilarityThreshold: number;
  enableAutoConsolidation: boolean;
}

// Episodic Memory - "What happened"
export interface EpisodicMemory {
  id: string;
  learnerId: string;
  tenantId: string;
  timestamp: Date;
  eventType: EpisodicEventType;
  content: string;
  context: MemoryContext;
  emotionalValence: number; // -1 to 1 (negative to positive)
  importance: number; // 0-100
  retrievalCount: number;
  lastRetrievedAt: Date | null;
  isConsolidated: boolean;
  consolidatedAt: Date | null;
  associations: string[]; // IDs of related memories
  embedding?: number[]; // Vector embedding for similarity search
  metadata: Record<string, unknown>;
}

export type EpisodicEventType =
  | 'LEARNING_SESSION'
  | 'ASSESSMENT'
  | 'INTERACTION'
  | 'ACHIEVEMENT'
  | 'STRUGGLE'
  | 'BREAKTHROUGH'
  | 'HELP_RECEIVED'
  | 'ERROR_MADE'
  | 'CORRECTION_LEARNED'
  | 'PREFERENCE_EXPRESSED'
  | 'EMOTIONAL_STATE'
  | 'SOCIAL_INTERACTION';

export interface MemoryContext {
  activity: string;
  domain?: string;
  skill?: string;
  difficulty?: number;
  focusState?: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening';
  sessionType?: string;
  priorKnowledge?: string[];
}

// Semantic Memory - "What is known"
export interface SemanticFact {
  id: string;
  learnerId: string;
  tenantId: string;
  category: SemanticCategory;
  subject: string;
  predicate: string;
  object: string;
  confidence: number; // 0-100
  source: FactSource;
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt: Date | null;
  verificationCount: number;
  contradictions: string[]; // IDs of contradicting facts
  supportingEpisodes: string[]; // IDs of episodic memories supporting this
  metadata: Record<string, unknown>;
}

export type SemanticCategory =
  | 'SKILL_MASTERY'
  | 'LEARNING_PREFERENCE'
  | 'CONCEPT_UNDERSTANDING'
  | 'MISCONCEPTION'
  | 'STRATEGY'
  | 'INTEREST'
  | 'STRENGTH'
  | 'CHALLENGE'
  | 'RELATIONSHIP'
  | 'BEHAVIOR_PATTERN';

export type FactSource =
  | 'ASSESSMENT'
  | 'OBSERVATION'
  | 'SELF_REPORT'
  | 'INFERENCE'
  | 'TEACHER_INPUT'
  | 'PARENT_INPUT';

// Memory Retrieval
export interface MemoryQuery {
  learnerId: string;
  tenantId: string;
  queryType: 'episodic' | 'semantic' | 'both';
  contextFilter?: Partial<MemoryContext>;
  timeRange?: { start: Date; end: Date };
  categories?: (EpisodicEventType | SemanticCategory)[];
  minImportance?: number;
  minConfidence?: number;
  limit?: number;
  includeAssociations?: boolean;
  semanticSearch?: string; // Natural language query
}

export interface MemoryRetrievalResult {
  episodic: EpisodicMemory[];
  semantic: SemanticFact[];
  relevanceScores: Map<string, number>;
  totalCount: number;
  retrievedAt: Date;
}

// Memory Consolidation
export interface ConsolidationResult {
  memoriesConsolidated: number;
  factsCreated: number;
  associationsFound: number;
  patternsDetected: Pattern[];
}

export interface Pattern {
  id: string;
  type: 'temporal' | 'causal' | 'correlation' | 'preference';
  description: string;
  confidence: number;
  supportingMemories: string[];
}

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: BrainMemoryConfig = {
  maxEpisodicMemories: 10000,
  maxSemanticFacts: 5000,
  shortTermRetentionMinutes: 1440, // 24 hours
  longTermConsolidationThreshold: 3, // retrievals
  forgettingCurveHalfLife: 30, // days
  contextSimilarityThreshold: 0.7,
  enableAutoConsolidation: true,
};

// ════════════════════════════════════════════════════════════════════════════════
// BRAIN MEMORY SERVICE
// ════════════════════════════════════════════════════════════════════════════════

export class BrainMemory {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly config: BrainMemoryConfig;
  private readonly cachePrefix = 'brain_memory';
  private consolidationInterval: ReturnType<typeof setInterval> | null = null;

  constructor(pool: Pool, redis: Redis, config?: Partial<BrainMemoryConfig>) {
    this.pool = pool;
    this.redis = redis;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start automatic memory consolidation
   */
  start(): void {
    if (this.config.enableAutoConsolidation) {
      // Run consolidation every hour
      this.consolidationInterval = setInterval(() => {
        this.runAutoConsolidation();
      }, 3600000);
    }
    console.log('BrainMemory system started');
  }

  /**
   * Stop memory consolidation
   */
  stop(): void {
    if (this.consolidationInterval) {
      clearInterval(this.consolidationInterval);
      this.consolidationInterval = null;
    }
    console.log('BrainMemory system stopped');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EPISODIC MEMORY
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Store a new episodic memory
   */
  async storeEpisode(params: {
    learnerId: string;
    tenantId: string;
    eventType: EpisodicEventType;
    content: string;
    context: MemoryContext;
    emotionalValence?: number;
    importance?: number;
    metadata?: Record<string, unknown>;
  }): Promise<EpisodicMemory> {
    const memory: EpisodicMemory = {
      id: this.generateId('ep'),
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      timestamp: new Date(),
      eventType: params.eventType,
      content: params.content,
      context: params.context,
      emotionalValence: params.emotionalValence ?? 0,
      importance: params.importance ?? this.calculateImportance(params.eventType, params.context),
      retrievalCount: 0,
      lastRetrievedAt: null,
      isConsolidated: false,
      consolidatedAt: null,
      associations: [],
      metadata: params.metadata ?? {},
    };

    // Store in database
    await this.pool.query(
      `INSERT INTO episodic_memories (
        id, learner_id, tenant_id, timestamp, event_type, content,
        context, emotional_valence, importance, retrieval_count,
        is_consolidated, associations, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, false, $10, $11, NOW())`,
      [
        memory.id,
        params.learnerId,
        params.tenantId,
        memory.timestamp,
        params.eventType,
        params.content,
        JSON.stringify(params.context),
        memory.emotionalValence,
        memory.importance,
        JSON.stringify([]),
        JSON.stringify(memory.metadata),
      ]
    );

    // Cache for quick access
    await this.cacheMemory(memory);

    // Find associations with recent memories
    const associations = await this.findAssociations(memory);
    if (associations.length > 0) {
      memory.associations = associations;
      await this.updateAssociations(memory.id, associations);
    }

    // Check if immediate consolidation is warranted (high importance)
    if (memory.importance >= 90) {
      await this.consolidateMemory(memory);
    }

    return memory;
  }

  /**
   * Retrieve episodic memories
   */
  async retrieveEpisodes(query: MemoryQuery): Promise<EpisodicMemory[]> {
    let sql = `
      SELECT * FROM episodic_memories
      WHERE learner_id = $1 AND tenant_id = $2
    `;
    const params: unknown[] = [query.learnerId, query.tenantId];
    let paramIndex = 3;

    if (query.timeRange) {
      sql += ` AND timestamp BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(query.timeRange.start, query.timeRange.end);
      paramIndex += 2;
    }

    if (query.categories?.length) {
      sql += ` AND event_type = ANY($${paramIndex})`;
      params.push(query.categories);
      paramIndex++;
    }

    if (query.minImportance !== undefined) {
      sql += ` AND importance >= $${paramIndex}`;
      params.push(query.minImportance);
      paramIndex++;
    }

    sql += ` ORDER BY importance DESC, timestamp DESC`;

    if (query.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(query.limit);
    }

    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      timestamp: Date;
      event_type: EpisodicEventType;
      content: string;
      context: string;
      emotional_valence: number;
      importance: number;
      retrieval_count: number;
      last_retrieved_at: Date | null;
      is_consolidated: boolean;
      consolidated_at: Date | null;
      associations: string;
      metadata: string;
    }>(sql, params);

    const memories = result.rows.map(row => this.rowToEpisodicMemory(row));

    // Update retrieval counts
    await this.incrementRetrievalCounts(memories.map(m => m.id));

    return memories;
  }

  /**
   * Retrieve contextually relevant memories
   */
  async retrieveByContext(
    learnerId: string,
    tenantId: string,
    currentContext: MemoryContext,
    limit: number = 10
  ): Promise<EpisodicMemory[]> {
    // Get recent memories from cache
    const cacheKey = `${this.cachePrefix}:recent:${tenantId}:${learnerId}`;
    const cached = await this.redis.lrange(cacheKey, 0, 99);

    const recentMemories: EpisodicMemory[] = cached.map(c => JSON.parse(c));

    // Score by context similarity
    const scored = recentMemories.map(memory => ({
      memory,
      score: this.calculateContextSimilarity(memory.context, currentContext),
    }));

    // Filter by threshold and sort
    const relevant = scored
      .filter(s => s.score >= this.config.contextSimilarityThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.memory);

    // If not enough from cache, query database
    if (relevant.length < limit) {
      const dbMemories = await this.retrieveEpisodes({
        learnerId,
        tenantId,
        queryType: 'episodic',
        contextFilter: currentContext,
        limit: limit - relevant.length,
      });

      relevant.push(...dbMemories);
    }

    return relevant;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SEMANTIC MEMORY
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Store a semantic fact
   */
  async storeFact(params: {
    learnerId: string;
    tenantId: string;
    category: SemanticCategory;
    subject: string;
    predicate: string;
    object: string;
    confidence?: number;
    source: FactSource;
    supportingEpisodes?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<SemanticFact> {
    // Check for existing similar fact
    const existing = await this.findSimilarFact(
      params.learnerId,
      params.tenantId,
      params.subject,
      params.predicate
    );

    if (existing) {
      // Update existing fact
      return this.updateFact(existing.id, {
        object: params.object,
        confidence: Math.min(100, existing.confidence + 10),
        supportingEpisodes: [
          ...new Set([...existing.supportingEpisodes, ...(params.supportingEpisodes ?? [])]),
        ],
      });
    }

    const fact: SemanticFact = {
      id: this.generateId('sf'),
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      category: params.category,
      subject: params.subject,
      predicate: params.predicate,
      object: params.object,
      confidence: params.confidence ?? 70,
      source: params.source,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastVerifiedAt: null,
      verificationCount: 0,
      contradictions: [],
      supportingEpisodes: params.supportingEpisodes ?? [],
      metadata: params.metadata ?? {},
    };

    await this.pool.query(
      `INSERT INTO semantic_facts (
        id, learner_id, tenant_id, category, subject, predicate, object,
        confidence, source, verification_count, contradictions,
        supporting_episodes, metadata, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, $12, NOW(), NOW())`,
      [
        fact.id,
        params.learnerId,
        params.tenantId,
        params.category,
        params.subject,
        params.predicate,
        params.object,
        fact.confidence,
        params.source,
        JSON.stringify([]),
        JSON.stringify(fact.supportingEpisodes),
        JSON.stringify(fact.metadata),
      ]
    );

    // Check for contradictions
    const contradictions = await this.findContradictions(fact);
    if (contradictions.length > 0) {
      await this.handleContradictions(fact, contradictions);
    }

    // Cache
    await this.cacheFact(fact);

    return fact;
  }

  /**
   * Retrieve semantic facts
   */
  async retrieveFacts(query: MemoryQuery): Promise<SemanticFact[]> {
    let sql = `
      SELECT * FROM semantic_facts
      WHERE learner_id = $1 AND tenant_id = $2
    `;
    const params: unknown[] = [query.learnerId, query.tenantId];
    let paramIndex = 3;

    if (query.categories?.length) {
      sql += ` AND category = ANY($${paramIndex})`;
      params.push(query.categories);
      paramIndex++;
    }

    if (query.minConfidence !== undefined) {
      sql += ` AND confidence >= $${paramIndex}`;
      params.push(query.minConfidence);
      paramIndex++;
    }

    sql += ` ORDER BY confidence DESC, updated_at DESC`;

    if (query.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(query.limit);
    }

    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      category: SemanticCategory;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      source: FactSource;
      created_at: Date;
      updated_at: Date;
      last_verified_at: Date | null;
      verification_count: number;
      contradictions: string;
      supporting_episodes: string;
      metadata: string;
    }>(sql, params);

    return result.rows.map(row => this.rowToSemanticFact(row));
  }

  /**
   * Get all knowledge about a subject
   */
  async getKnowledge(
    learnerId: string,
    tenantId: string,
    subject: string
  ): Promise<SemanticFact[]> {
    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      category: SemanticCategory;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      source: FactSource;
      created_at: Date;
      updated_at: Date;
      last_verified_at: Date | null;
      verification_count: number;
      contradictions: string;
      supporting_episodes: string;
      metadata: string;
    }>(
      `SELECT * FROM semantic_facts
       WHERE learner_id = $1 AND tenant_id = $2 AND subject ILIKE $3
       ORDER BY confidence DESC`,
      [learnerId, tenantId, `%${subject}%`]
    );

    return result.rows.map(row => this.rowToSemanticFact(row));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // MEMORY CONSOLIDATION
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Consolidate episodic memories into semantic facts
   */
  async consolidateMemories(
    learnerId: string,
    tenantId: string
  ): Promise<ConsolidationResult> {
    const result: ConsolidationResult = {
      memoriesConsolidated: 0,
      factsCreated: 0,
      associationsFound: 0,
      patternsDetected: [],
    };

    // Get unconsolidated memories that have been retrieved enough times
    const memories = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      timestamp: Date;
      event_type: EpisodicEventType;
      content: string;
      context: string;
      emotional_valence: number;
      importance: number;
      retrieval_count: number;
      last_retrieved_at: Date | null;
      is_consolidated: boolean;
      consolidated_at: Date | null;
      associations: string;
      metadata: string;
    }>(
      `SELECT * FROM episodic_memories
       WHERE learner_id = $1 AND tenant_id = $2
       AND is_consolidated = false
       AND retrieval_count >= $3
       ORDER BY importance DESC
       LIMIT 100`,
      [learnerId, tenantId, this.config.longTermConsolidationThreshold]
    );

    for (const row of memories.rows) {
      const memory = this.rowToEpisodicMemory(row);

      // Extract facts from memory
      const facts = await this.extractFacts(memory);
      for (const fact of facts) {
        await this.storeFact(fact);
        result.factsCreated++;
      }

      // Mark as consolidated
      await this.pool.query(
        `UPDATE episodic_memories SET is_consolidated = true, consolidated_at = NOW()
         WHERE id = $1`,
        [memory.id]
      );
      result.memoriesConsolidated++;
    }

    // Detect patterns
    result.patternsDetected = await this.detectPatterns(learnerId, tenantId);

    return result;
  }

  /**
   * Consolidate a single high-importance memory immediately
   */
  private async consolidateMemory(memory: EpisodicMemory): Promise<void> {
    const facts = await this.extractFacts(memory);

    for (const fact of facts) {
      await this.storeFact(fact);
    }

    await this.pool.query(
      `UPDATE episodic_memories SET is_consolidated = true, consolidated_at = NOW()
       WHERE id = $1`,
      [memory.id]
    );
  }

  /**
   * Extract semantic facts from an episodic memory
   */
  private async extractFacts(memory: EpisodicMemory): Promise<Array<{
    learnerId: string;
    tenantId: string;
    category: SemanticCategory;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    source: FactSource;
    supportingEpisodes: string[];
  }>> {
    const facts: Array<{
      learnerId: string;
      tenantId: string;
      category: SemanticCategory;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      source: FactSource;
      supportingEpisodes: string[];
    }> = [];

    switch (memory.eventType) {
      case 'BREAKTHROUGH':
        if (memory.context.skill) {
          facts.push({
            learnerId: memory.learnerId,
            tenantId: memory.tenantId,
            category: 'SKILL_MASTERY',
            subject: memory.context.skill,
            predicate: 'had_breakthrough_in',
            object: memory.content,
            confidence: 80,
            source: 'OBSERVATION',
            supportingEpisodes: [memory.id],
          });
        }
        break;

      case 'STRUGGLE':
        if (memory.context.skill) {
          facts.push({
            learnerId: memory.learnerId,
            tenantId: memory.tenantId,
            category: 'CHALLENGE',
            subject: memory.context.skill,
            predicate: 'is_challenging_because',
            object: memory.content,
            confidence: 70,
            source: 'OBSERVATION',
            supportingEpisodes: [memory.id],
          });
        }
        break;

      case 'PREFERENCE_EXPRESSED':
        facts.push({
          learnerId: memory.learnerId,
          tenantId: memory.tenantId,
          category: 'LEARNING_PREFERENCE',
          subject: 'learner',
          predicate: 'prefers',
          object: memory.content,
          confidence: 85,
          source: 'SELF_REPORT',
          supportingEpisodes: [memory.id],
        });
        break;

      case 'CORRECTION_LEARNED':
        if (memory.context.skill) {
          facts.push({
            learnerId: memory.learnerId,
            tenantId: memory.tenantId,
            category: 'CONCEPT_UNDERSTANDING',
            subject: memory.context.skill,
            predicate: 'learned_correction',
            object: memory.content,
            confidence: 75,
            source: 'OBSERVATION',
            supportingEpisodes: [memory.id],
          });
        }
        break;
    }

    return facts;
  }

  /**
   * Detect patterns across memories
   */
  private async detectPatterns(
    learnerId: string,
    tenantId: string
  ): Promise<Pattern[]> {
    const patterns: Pattern[] = [];

    // Temporal patterns (time of day preferences)
    const timePatterns = await this.pool.query<{
      context: string;
      count: number;
      avg_importance: number;
    }>(
      `SELECT context->>'timeOfDay' as time_of_day,
              COUNT(*) as count,
              AVG(importance) as avg_importance
       FROM episodic_memories
       WHERE learner_id = $1 AND tenant_id = $2
       AND context->>'timeOfDay' IS NOT NULL
       AND emotional_valence > 0
       GROUP BY context->>'timeOfDay'
       HAVING COUNT(*) >= 5`,
      [learnerId, tenantId]
    );

    for (const row of timePatterns.rows) {
      const context = JSON.parse(row.context);
      patterns.push({
        id: this.generateId('pat'),
        type: 'temporal',
        description: `Learner performs well during ${context.timeOfDay}`,
        confidence: Math.min(100, row.avg_importance),
        supportingMemories: [],
      });
    }

    // Correlation patterns (activity + focus state)
    const focusPatterns = await this.pool.query<{
      activity: string;
      focus_state: string;
      count: number;
    }>(
      `SELECT context->>'activity' as activity,
              context->>'focusState' as focus_state,
              COUNT(*) as count
       FROM episodic_memories
       WHERE learner_id = $1 AND tenant_id = $2
       AND context->>'focusState' = 'FOCUSED'
       GROUP BY context->>'activity', context->>'focusState'
       HAVING COUNT(*) >= 3`,
      [learnerId, tenantId]
    );

    for (const row of focusPatterns.rows) {
      patterns.push({
        id: this.generateId('pat'),
        type: 'correlation',
        description: `Learner focuses well during ${row.activity}`,
        confidence: Math.min(100, row.count * 15),
        supportingMemories: [],
      });
    }

    return patterns;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // FORGETTING & MAINTENANCE
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Apply forgetting curve to reduce importance of old, unretrieved memories
   */
  async applyForgettingCurve(learnerId: string, tenantId: string): Promise<number> {
    const halfLifeDays = this.config.forgettingCurveHalfLife;

    // Decay formula: new_importance = importance * e^(-λt)
    // where λ = ln(2) / half_life
    const result = await this.pool.query(
      `UPDATE episodic_memories
       SET importance = GREATEST(10, importance * EXP(-0.693 * EXTRACT(EPOCH FROM (NOW() - COALESCE(last_retrieved_at, timestamp))) / 86400 / $3))
       WHERE learner_id = $1 AND tenant_id = $2
       AND is_consolidated = false
       AND (last_retrieved_at IS NULL OR last_retrieved_at < NOW() - INTERVAL '7 days')
       AND importance > 10`,
      [learnerId, tenantId, halfLifeDays]
    );

    return result.rowCount ?? 0;
  }

  /**
   * Prune low-importance, old memories
   */
  async pruneMemories(learnerId: string, tenantId: string): Promise<number> {
    // Count current memories
    const countResult = await this.pool.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM episodic_memories
       WHERE learner_id = $1 AND tenant_id = $2`,
      [learnerId, tenantId]
    );

    const currentCount = parseInt(countResult.rows[0].count.toString(), 10);

    if (currentCount <= this.config.maxEpisodicMemories) {
      return 0;
    }

    // Delete lowest importance memories beyond limit
    const toDelete = currentCount - this.config.maxEpisodicMemories;

    const result = await this.pool.query(
      `DELETE FROM episodic_memories
       WHERE id IN (
         SELECT id FROM episodic_memories
         WHERE learner_id = $1 AND tenant_id = $2
         AND is_consolidated = true
         ORDER BY importance ASC, timestamp ASC
         LIMIT $3
       )`,
      [learnerId, tenantId, toDelete]
    );

    return result.rowCount ?? 0;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private calculateImportance(eventType: EpisodicEventType, context: MemoryContext): number {
    let base = 50;

    // Event type modifiers
    switch (eventType) {
      case 'BREAKTHROUGH': base = 90; break;
      case 'STRUGGLE': base = 70; break;
      case 'ACHIEVEMENT': base = 85; break;
      case 'ERROR_MADE': base = 60; break;
      case 'CORRECTION_LEARNED': base = 80; break;
      case 'PREFERENCE_EXPRESSED': base = 65; break;
      case 'ASSESSMENT': base = 75; break;
      default: base = 50;
    }

    // Context modifiers
    if (context.difficulty && context.difficulty >= 4) base += 10;
    if (context.focusState === 'FOCUSED') base += 5;

    return Math.min(100, Math.max(10, base));
  }

  private calculateContextSimilarity(ctx1: MemoryContext, ctx2: MemoryContext): number {
    let matches = 0;
    let total = 0;

    const compare = (key: keyof MemoryContext) => {
      if (ctx1[key] !== undefined || ctx2[key] !== undefined) {
        total++;
        if (ctx1[key] === ctx2[key]) matches++;
      }
    };

    compare('activity');
    compare('domain');
    compare('skill');
    compare('sessionType');
    compare('timeOfDay');

    return total > 0 ? matches / total : 0;
  }

  private async findAssociations(memory: EpisodicMemory): Promise<string[]> {
    // Find memories with similar context from the last 24 hours
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM episodic_memories
       WHERE learner_id = $1 AND tenant_id = $2
       AND id != $3
       AND timestamp > NOW() - INTERVAL '24 hours'
       AND (
         context->>'domain' = $4
         OR context->>'skill' = $5
         OR context->>'activity' = $6
       )
       LIMIT 5`,
      [
        memory.learnerId,
        memory.tenantId,
        memory.id,
        memory.context.domain ?? '',
        memory.context.skill ?? '',
        memory.context.activity ?? '',
      ]
    );

    return result.rows.map(r => r.id);
  }

  private async updateAssociations(memoryId: string, associations: string[]): Promise<void> {
    await this.pool.query(
      `UPDATE episodic_memories SET associations = $1 WHERE id = $2`,
      [JSON.stringify(associations), memoryId]
    );

    // Also update reverse associations
    for (const assocId of associations) {
      await this.pool.query(
        `UPDATE episodic_memories
         SET associations = associations || $1
         WHERE id = $2 AND NOT associations @> $1`,
        [JSON.stringify([memoryId]), assocId]
      );
    }
  }

  private async findSimilarFact(
    learnerId: string,
    tenantId: string,
    subject: string,
    predicate: string
  ): Promise<SemanticFact | null> {
    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      category: SemanticCategory;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      source: FactSource;
      created_at: Date;
      updated_at: Date;
      last_verified_at: Date | null;
      verification_count: number;
      contradictions: string;
      supporting_episodes: string;
      metadata: string;
    }>(
      `SELECT * FROM semantic_facts
       WHERE learner_id = $1 AND tenant_id = $2
       AND subject = $3 AND predicate = $4
       LIMIT 1`,
      [learnerId, tenantId, subject, predicate]
    );

    return result.rows.length > 0 ? this.rowToSemanticFact(result.rows[0]) : null;
  }

  private async updateFact(
    factId: string,
    updates: Partial<{ object: string; confidence: number; supportingEpisodes: string[] }>
  ): Promise<SemanticFact> {
    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      category: SemanticCategory;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      source: FactSource;
      created_at: Date;
      updated_at: Date;
      last_verified_at: Date | null;
      verification_count: number;
      contradictions: string;
      supporting_episodes: string;
      metadata: string;
    }>(
      `UPDATE semantic_facts SET
        object = COALESCE($2, object),
        confidence = COALESCE($3, confidence),
        supporting_episodes = COALESCE($4, supporting_episodes),
        verification_count = verification_count + 1,
        last_verified_at = NOW(),
        updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        factId,
        updates.object ?? null,
        updates.confidence ?? null,
        updates.supportingEpisodes ? JSON.stringify(updates.supportingEpisodes) : null,
      ]
    );

    return this.rowToSemanticFact(result.rows[0]);
  }

  private async findContradictions(fact: SemanticFact): Promise<SemanticFact[]> {
    // Find facts with same subject/predicate but different object
    const result = await this.pool.query<{
      id: string;
      learner_id: string;
      tenant_id: string;
      category: SemanticCategory;
      subject: string;
      predicate: string;
      object: string;
      confidence: number;
      source: FactSource;
      created_at: Date;
      updated_at: Date;
      last_verified_at: Date | null;
      verification_count: number;
      contradictions: string;
      supporting_episodes: string;
      metadata: string;
    }>(
      `SELECT * FROM semantic_facts
       WHERE learner_id = $1 AND tenant_id = $2
       AND subject = $3 AND predicate = $4 AND object != $5
       AND id != $6`,
      [fact.learnerId, fact.tenantId, fact.subject, fact.predicate, fact.object, fact.id]
    );

    return result.rows.map(row => this.rowToSemanticFact(row));
  }

  private async handleContradictions(
    newFact: SemanticFact,
    contradictions: SemanticFact[]
  ): Promise<void> {
    // Update both new and existing facts with contradiction references
    const contradictionIds = contradictions.map(c => c.id);

    await this.pool.query(
      `UPDATE semantic_facts SET contradictions = $1 WHERE id = $2`,
      [JSON.stringify(contradictionIds), newFact.id]
    );

    for (const contradiction of contradictions) {
      await this.pool.query(
        `UPDATE semantic_facts SET contradictions = contradictions || $1
         WHERE id = $2 AND NOT contradictions @> $1`,
        [JSON.stringify([newFact.id]), contradiction.id]
      );
    }
  }

  private async incrementRetrievalCounts(memoryIds: string[]): Promise<void> {
    if (memoryIds.length === 0) return;

    await this.pool.query(
      `UPDATE episodic_memories
       SET retrieval_count = retrieval_count + 1,
           last_retrieved_at = NOW()
       WHERE id = ANY($1)`,
      [memoryIds]
    );
  }

  private async cacheMemory(memory: EpisodicMemory): Promise<void> {
    const cacheKey = `${this.cachePrefix}:recent:${memory.tenantId}:${memory.learnerId}`;
    await this.redis.lpush(cacheKey, JSON.stringify(memory));
    await this.redis.ltrim(cacheKey, 0, 99); // Keep last 100 memories
    await this.redis.expire(cacheKey, 86400); // 24 hour TTL
  }

  private async cacheFact(fact: SemanticFact): Promise<void> {
    const cacheKey = `${this.cachePrefix}:fact:${fact.tenantId}:${fact.learnerId}:${fact.subject}`;
    await this.redis.setex(cacheKey, 3600, JSON.stringify(fact)); // 1 hour TTL
  }

  private async runAutoConsolidation(): Promise<void> {
    // This would be implemented to consolidate memories for all active learners
    console.log('Running auto-consolidation...');
  }

  private rowToEpisodicMemory(row: {
    id: string;
    learner_id: string;
    tenant_id: string;
    timestamp: Date;
    event_type: EpisodicEventType;
    content: string;
    context: string;
    emotional_valence: number;
    importance: number;
    retrieval_count: number;
    last_retrieved_at: Date | null;
    is_consolidated: boolean;
    consolidated_at: Date | null;
    associations: string;
    metadata: string;
  }): EpisodicMemory {
    return {
      id: row.id,
      learnerId: row.learner_id,
      tenantId: row.tenant_id,
      timestamp: row.timestamp,
      eventType: row.event_type,
      content: row.content,
      context: JSON.parse(row.context),
      emotionalValence: row.emotional_valence,
      importance: row.importance,
      retrievalCount: row.retrieval_count,
      lastRetrievedAt: row.last_retrieved_at,
      isConsolidated: row.is_consolidated,
      consolidatedAt: row.consolidated_at,
      associations: JSON.parse(row.associations),
      metadata: JSON.parse(row.metadata),
    };
  }

  private rowToSemanticFact(row: {
    id: string;
    learner_id: string;
    tenant_id: string;
    category: SemanticCategory;
    subject: string;
    predicate: string;
    object: string;
    confidence: number;
    source: FactSource;
    created_at: Date;
    updated_at: Date;
    last_verified_at: Date | null;
    verification_count: number;
    contradictions: string;
    supporting_episodes: string;
    metadata: string;
  }): SemanticFact {
    return {
      id: row.id,
      learnerId: row.learner_id,
      tenantId: row.tenant_id,
      category: row.category,
      subject: row.subject,
      predicate: row.predicate,
      object: row.object,
      confidence: row.confidence,
      source: row.source,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastVerifiedAt: row.last_verified_at,
      verificationCount: row.verification_count,
      contradictions: JSON.parse(row.contradictions),
      supportingEpisodes: JSON.parse(row.supporting_episodes),
      metadata: JSON.parse(row.metadata),
    };
  }
}

export default BrainMemory;
