/**
 * Vector Memory Store for RAG
 *
 * Implements long-term memory capabilities for agentic AI:
 * - Vector embedding storage and semantic search
 * - Multiple memory types (episodic, semantic, procedural)
 * - Memory compression and summarization
 * - Learner-specific memory isolation
 * - Time-weighted recall
 *
 * @module ai-orchestrator/agentic/memory-store
 */

import { EventEmitter } from 'events';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Types of memory stored in the system
 */
export type MemoryType =
  | 'EPISODIC'    // Specific events/interactions (conversations, sessions)
  | 'SEMANTIC'    // General knowledge about the learner (preferences, patterns)
  | 'PROCEDURAL'  // How to do things (learning strategies that worked)
  | 'WORKING';    // Short-term, session-specific memory

/**
 * A memory entry with embedding
 */
export interface MemoryEntry {
  id: string;
  tenantId: string;
  learnerId: string;
  type: MemoryType;
  content: string;
  summary?: string;
  embedding?: number[];
  metadata: MemoryMetadata;
  importance: number; // 0-1 scale
  accessCount: number;
  lastAccessedAt: Date;
  createdAt: Date;
  expiresAt?: Date;
}

export interface MemoryMetadata {
  source: MemorySource;
  sessionId?: string;
  agentType?: string;
  subject?: string;
  topic?: string;
  emotionalContext?: string;
  tags: string[];
  relatedMemoryIds?: string[];
}

export type MemorySource =
  | 'CONVERSATION'
  | 'ASSESSMENT'
  | 'GOAL_COMPLETION'
  | 'INTERVENTION'
  | 'TEACHER_NOTE'
  | 'SYSTEM_OBSERVATION';

/**
 * Query for retrieving memories
 */
export interface MemoryQuery {
  tenantId: string;
  learnerId: string;
  query?: string; // Semantic query
  types?: MemoryType[];
  minImportance?: number;
  maxResults?: number;
  includeExpired?: boolean;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  recencyWeight?: number; // 0-1, how much to weight recent memories
}

/**
 * Result of a memory search
 */
export interface MemorySearchResult {
  memory: MemoryEntry;
  relevanceScore: number;
  recencyScore: number;
  combinedScore: number;
}

/**
 * Memory store configuration
 */
export interface MemoryStoreConfig {
  /** Embedding model to use */
  embeddingModel: string;

  /** Embedding dimensions */
  embeddingDimensions: number;

  /** Maximum memories per learner */
  maxMemoriesPerLearner: number;

  /** Default memory expiration (days) */
  defaultExpirationDays: number;

  /** Memory compression threshold (character count) */
  compressionThreshold: number;

  /** Cache TTL for embeddings (seconds) */
  embeddingCacheTtl: number;

  /** Whether to use approximate nearest neighbor search */
  useANN: boolean;
}

export const DEFAULT_MEMORY_STORE_CONFIG: MemoryStoreConfig = {
  embeddingModel: 'text-embedding-3-small',
  embeddingDimensions: 1536,
  maxMemoriesPerLearner: 10000,
  defaultExpirationDays: 365,
  compressionThreshold: 2000,
  embeddingCacheTtl: 3600,
  useANN: true,
};

// ════════════════════════════════════════════════════════════════════════════════
// EMBEDDING PROVIDER INTERFACE
// ════════════════════════════════════════════════════════════════════════════════

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Mock embedding provider for testing
 */
export class MockEmbeddingProvider implements EmbeddingProvider {
  private readonly dimensions: number;

  constructor(dimensions: number = 1536) {
    this.dimensions = dimensions;
  }

  async embed(text: string): Promise<number[]> {
    // Generate deterministic mock embedding based on text hash
    const hash = this.hashString(text);
    return this.generateMockEmbedding(hash);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
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

  private generateMockEmbedding(seed: number): number[] {
    const embedding: number[] = [];
    let current = seed;
    for (let i = 0; i < this.dimensions; i++) {
      current = (current * 1103515245 + 12345) & 0x7fffffff;
      embedding.push((current / 0x7fffffff) * 2 - 1); // Normalize to [-1, 1]
    }
    // Normalize to unit vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(v => v / magnitude);
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MEMORY STORE
// ════════════════════════════════════════════════════════════════════════════════

export class VectorMemoryStore extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly embeddingProvider: EmbeddingProvider;
  private readonly config: MemoryStoreConfig;
  private readonly cachePrefix = 'memory_store';

  constructor(
    pool: Pool,
    redis: Redis,
    embeddingProvider: EmbeddingProvider,
    config: Partial<MemoryStoreConfig> = {}
  ) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.embeddingProvider = embeddingProvider;
    this.config = { ...DEFAULT_MEMORY_STORE_CONFIG, ...config };
  }

  /**
   * Store a new memory
   */
  async store(input: {
    tenantId: string;
    learnerId: string;
    type: MemoryType;
    content: string;
    metadata: Partial<MemoryMetadata>;
    importance?: number;
    expiresAt?: Date;
  }): Promise<MemoryEntry> {
    const id = randomUUID();
    const now = new Date();

    // Compress content if needed
    const processedContent = input.content.length > this.config.compressionThreshold
      ? await this.compressContent(input.content)
      : input.content;

    // Generate embedding
    const embedding = await this.getEmbedding(processedContent);

    // Calculate importance if not provided
    const importance = input.importance ?? this.calculateImportance(input);

    const entry: MemoryEntry = {
      id,
      tenantId: input.tenantId,
      learnerId: input.learnerId,
      type: input.type,
      content: processedContent,
      summary: input.content.length > this.config.compressionThreshold
        ? processedContent
        : undefined,
      embedding,
      metadata: {
        source: input.metadata.source ?? 'SYSTEM_OBSERVATION',
        sessionId: input.metadata.sessionId,
        agentType: input.metadata.agentType,
        subject: input.metadata.subject,
        topic: input.metadata.topic,
        emotionalContext: input.metadata.emotionalContext,
        tags: input.metadata.tags ?? [],
        relatedMemoryIds: input.metadata.relatedMemoryIds,
      },
      importance,
      accessCount: 0,
      lastAccessedAt: now,
      createdAt: now,
      expiresAt: input.expiresAt ?? this.getDefaultExpiration(input.type),
    };

    // Store in database
    await this.pool.query(
      `INSERT INTO learner_memories (
        id, tenant_id, learner_id, type, content, summary, embedding,
        metadata, importance, access_count, last_accessed_at, created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        entry.id,
        entry.tenantId,
        entry.learnerId,
        entry.type,
        entry.content,
        entry.summary,
        JSON.stringify(entry.embedding),
        JSON.stringify(entry.metadata),
        entry.importance,
        entry.accessCount,
        entry.lastAccessedAt,
        entry.createdAt,
        entry.expiresAt,
      ]
    );

    // Invalidate cache
    await this.invalidateCache(input.tenantId, input.learnerId);

    // Check memory limits
    await this.enforceMemoryLimits(input.tenantId, input.learnerId);

    this.emit('memory:stored', { entry });
    return entry;
  }

  /**
   * Search memories using semantic similarity
   */
  async search(query: MemoryQuery): Promise<MemorySearchResult[]> {
    let results: MemorySearchResult[] = [];

    // Get query embedding if semantic search is requested
    let queryEmbedding: number[] | null = null;
    if (query.query) {
      queryEmbedding = await this.getEmbedding(query.query);
    }

    // Build SQL query
    const conditions: string[] = [
      'tenant_id = $1',
      'learner_id = $2',
    ];
    const params: unknown[] = [query.tenantId, query.learnerId];
    let paramIndex = 3;

    if (query.types && query.types.length > 0) {
      conditions.push(`type = ANY($${paramIndex})`);
      params.push(query.types);
      paramIndex++;
    }

    if (query.minImportance !== undefined) {
      conditions.push(`importance >= $${paramIndex}`);
      params.push(query.minImportance);
      paramIndex++;
    }

    if (!query.includeExpired) {
      conditions.push(`(expires_at IS NULL OR expires_at > NOW())`);
    }

    if (query.dateRange?.start) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(query.dateRange.start);
      paramIndex++;
    }

    if (query.dateRange?.end) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(query.dateRange.end);
      paramIndex++;
    }

    if (query.tags && query.tags.length > 0) {
      conditions.push(`metadata->'tags' ?| $${paramIndex}`);
      params.push(query.tags);
      paramIndex++;
    }

    const sql = `
      SELECT id, tenant_id, learner_id, type, content, summary, embedding,
             metadata, importance, access_count, last_accessed_at, created_at, expires_at
      FROM learner_memories
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(query.maxResults ?? 100);

    const { rows } = await this.pool.query(sql, params);

    // Process results and calculate scores
    const now = Date.now();
    const recencyWeight = query.recencyWeight ?? 0.3;

    for (const row of rows) {
      const memory = this.rowToMemory(row);

      // Calculate relevance score (semantic similarity)
      let relevanceScore = 1;
      if (queryEmbedding && memory.embedding) {
        relevanceScore = this.cosineSimilarity(queryEmbedding, memory.embedding);
      }

      // Calculate recency score (exponential decay)
      const ageMs = now - memory.createdAt.getTime();
      const ageDays = ageMs / (24 * 60 * 60 * 1000);
      const recencyScore = Math.exp(-ageDays / 30); // 30-day half-life

      // Combined score
      const combinedScore =
        (1 - recencyWeight) * relevanceScore +
        recencyWeight * recencyScore;

      results.push({
        memory,
        relevanceScore,
        recencyScore,
        combinedScore,
      });
    }

    // Sort by combined score
    results.sort((a, b) => b.combinedScore - a.combinedScore);

    // Update access counts for returned memories
    if (results.length > 0) {
      const memoryIds = results.map(r => r.memory.id);
      await this.pool.query(
        `UPDATE learner_memories
         SET access_count = access_count + 1, last_accessed_at = NOW()
         WHERE id = ANY($1)`,
        [memoryIds]
      );
    }

    this.emit('memory:searched', {
      query,
      resultCount: results.length,
    });

    return results.slice(0, query.maxResults ?? 10);
  }

  /**
   * Get a specific memory by ID
   */
  async get(id: string): Promise<MemoryEntry | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM learner_memories WHERE id = $1`,
      [id]
    );

    if (rows.length === 0) return null;

    return this.rowToMemory(rows[0]);
  }

  /**
   * Update a memory's importance
   */
  async updateImportance(id: string, importance: number): Promise<void> {
    await this.pool.query(
      `UPDATE learner_memories SET importance = $1 WHERE id = $2`,
      [Math.max(0, Math.min(1, importance)), id]
    );
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.pool.query(
      `DELETE FROM learner_memories WHERE id = $1 RETURNING tenant_id, learner_id`,
      [id]
    );

    if (result.rows.length > 0) {
      const { tenant_id, learner_id } = result.rows[0];
      await this.invalidateCache(tenant_id, learner_id);
      this.emit('memory:deleted', { id });
      return true;
    }

    return false;
  }

  /**
   * Consolidate memories (merge similar memories to reduce count)
   */
  async consolidate(tenantId: string, learnerId: string): Promise<number> {
    // Find similar memories to merge
    const { rows: memories } = await this.pool.query(
      `SELECT * FROM learner_memories
       WHERE tenant_id = $1 AND learner_id = $2 AND type = 'EPISODIC'
       ORDER BY created_at DESC`,
      [tenantId, learnerId]
    );

    let mergeCount = 0;
    const processed = new Set<string>();

    for (const row of memories) {
      if (processed.has(row.id)) continue;

      const memory = this.rowToMemory(row);
      if (!memory.embedding) continue;

      // Find similar memories
      const similar = memories
        .filter(r => {
          if (r.id === row.id || processed.has(r.id)) return false;
          const embedding = JSON.parse(r.embedding);
          if (!embedding) return false;
          return this.cosineSimilarity(memory.embedding!, embedding) > 0.9;
        })
        .map(r => this.rowToMemory(r));

      if (similar.length > 0) {
        // Merge similar memories
        await this.mergeMemories(memory, similar);
        similar.forEach(s => processed.add(s.id));
        mergeCount += similar.length;
      }

      processed.add(row.id);
    }

    if (mergeCount > 0) {
      await this.invalidateCache(tenantId, learnerId);
      this.emit('memory:consolidated', { tenantId, learnerId, mergeCount });
    }

    return mergeCount;
  }

  /**
   * Get memory statistics for a learner
   */
  async getStats(tenantId: string, learnerId: string): Promise<{
    totalMemories: number;
    byType: Record<MemoryType, number>;
    averageImportance: number;
    oldestMemory: Date | null;
    newestMemory: Date | null;
  }> {
    const { rows } = await this.pool.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE type = 'EPISODIC') as episodic,
        COUNT(*) FILTER (WHERE type = 'SEMANTIC') as semantic,
        COUNT(*) FILTER (WHERE type = 'PROCEDURAL') as procedural,
        COUNT(*) FILTER (WHERE type = 'WORKING') as working,
        AVG(importance) as avg_importance,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM learner_memories
      WHERE tenant_id = $1 AND learner_id = $2`,
      [tenantId, learnerId]
    );

    const row = rows[0];
    return {
      totalMemories: Number.parseInt(row.total) || 0,
      byType: {
        EPISODIC: Number.parseInt(row.episodic) || 0,
        SEMANTIC: Number.parseInt(row.semantic) || 0,
        PROCEDURAL: Number.parseInt(row.procedural) || 0,
        WORKING: Number.parseInt(row.working) || 0,
      },
      averageImportance: parseFloat(row.avg_importance) || 0,
      oldestMemory: row.oldest ? new Date(row.oldest) : null,
      newestMemory: row.newest ? new Date(row.newest) : null,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  private async getEmbedding(text: string): Promise<number[]> {
    // Check cache first
    const cacheKey = `${this.cachePrefix}:embedding:${this.hashText(text)}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Generate embedding
    const embedding = await this.embeddingProvider.embed(text);

    // Cache the result
    await this.redis.setex(cacheKey, this.config.embeddingCacheTtl, JSON.stringify(embedding));

    return embedding;
  }

  private hashText(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  private async compressContent(content: string): Promise<string> {
    // Simple compression: take first and last portions with ellipsis
    const maxLength = this.config.compressionThreshold;
    const halfLength = Math.floor(maxLength / 2) - 3;

    return content.slice(0, halfLength) +
      ' [...] ' +
      content.slice(-halfLength);
  }

  private calculateImportance(input: {
    type: MemoryType;
    content: string;
    metadata: Partial<MemoryMetadata>;
  }): number {
    let importance = 0.5;

    // Type-based importance
    switch (input.type) {
      case 'EPISODIC':
        importance = 0.5;
        break;
      case 'SEMANTIC':
        importance = 0.7;
        break;
      case 'PROCEDURAL':
        importance = 0.8;
        break;
      case 'WORKING':
        importance = 0.3;
        break;
    }

    // Source-based adjustments
    switch (input.metadata.source) {
      case 'GOAL_COMPLETION':
        importance += 0.2;
        break;
      case 'TEACHER_NOTE':
        importance += 0.15;
        break;
      case 'INTERVENTION':
        importance += 0.1;
        break;
    }

    // Emotional context adjustment
    if (input.metadata.emotionalContext) {
      const stressIndicators = ['frustrated', 'anxious', 'overwhelmed', 'struggling'];
      const positiveIndicators = ['engaged', 'excited', 'breakthrough', 'mastered'];

      for (const indicator of stressIndicators) {
        if (input.metadata.emotionalContext.toLowerCase().includes(indicator)) {
          importance += 0.1;
        }
      }
      for (const indicator of positiveIndicators) {
        if (input.metadata.emotionalContext.toLowerCase().includes(indicator)) {
          importance += 0.1;
        }
      }
    }

    return Math.min(1, Math.max(0, importance));
  }

  private getDefaultExpiration(type: MemoryType): Date {
    const now = new Date();
    let daysToAdd: number;

    switch (type) {
      case 'WORKING':
        daysToAdd = 1; // 1 day
        break;
      case 'EPISODIC':
        daysToAdd = 90; // 3 months
        break;
      case 'SEMANTIC':
        daysToAdd = 365; // 1 year
        break;
      case 'PROCEDURAL':
        daysToAdd = 730; // 2 years
        break;
      default:
        daysToAdd = this.config.defaultExpirationDays;
    }

    return new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  }

  private async enforceMemoryLimits(tenantId: string, learnerId: string): Promise<void> {
    const { rows } = await this.pool.query(
      `SELECT COUNT(*) as count FROM learner_memories
       WHERE tenant_id = $1 AND learner_id = $2`,
      [tenantId, learnerId]
    );

    const count = Number.parseInt(rows[0].count);
    if (count <= this.config.maxMemoriesPerLearner) return;

    // Delete oldest, lowest importance memories
    const toDelete = count - this.config.maxMemoriesPerLearner;
    await this.pool.query(
      `DELETE FROM learner_memories
       WHERE id IN (
         SELECT id FROM learner_memories
         WHERE tenant_id = $1 AND learner_id = $2
         ORDER BY importance ASC, last_accessed_at ASC
         LIMIT $3
       )`,
      [tenantId, learnerId, toDelete]
    );

    this.emit('memory:limit_enforced', { tenantId, learnerId, deletedCount: toDelete });
  }

  private async mergeMemories(
    primary: MemoryEntry,
    toMerge: MemoryEntry[]
  ): Promise<void> {
    // Combine content
    const allContents = [primary.content, ...toMerge.map(m => m.content)];
    const mergedContent = allContents.join('\n---\n');

    // Compress if needed
    const finalContent = mergedContent.length > this.config.compressionThreshold
      ? await this.compressContent(mergedContent)
      : mergedContent;

    // Update primary memory
    const newEmbedding = await this.getEmbedding(finalContent);
    const newImportance = Math.max(primary.importance, ...toMerge.map(m => m.importance));

    await this.pool.query(
      `UPDATE learner_memories
       SET content = $1, embedding = $2, importance = $3,
           access_count = access_count + $4
       WHERE id = $5`,
      [
        finalContent,
        JSON.stringify(newEmbedding),
        newImportance,
        toMerge.reduce((sum, m) => sum + m.accessCount, 0),
        primary.id,
      ]
    );

    // Delete merged memories
    const idsToDelete = toMerge.map(m => m.id);
    await this.pool.query(
      `DELETE FROM learner_memories WHERE id = ANY($1)`,
      [idsToDelete]
    );
  }

  private async invalidateCache(tenantId: string, learnerId: string): Promise<void> {
    const pattern = `${this.cachePrefix}:${tenantId}:${learnerId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  private rowToMemory(row: Record<string, unknown>): MemoryEntry {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      learnerId: row.learner_id as string,
      type: row.type as MemoryType,
      content: row.content as string,
      summary: row.summary as string | undefined,
      embedding: row.embedding ? JSON.parse(row.embedding as string) : undefined,
      metadata: (typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata) as MemoryMetadata,
      importance: row.importance as number,
      accessCount: row.access_count as number,
      lastAccessedAt: new Date(row.last_accessed_at as string),
      createdAt: new Date(row.created_at as string),
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// MEMORY CONTEXT BUILDER
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Build context from relevant memories for an agent
 */
export async function buildMemoryContext(
  store: VectorMemoryStore,
  tenantId: string,
  learnerId: string,
  currentQuery: string,
  options: {
    maxMemories?: number;
    includeTypes?: MemoryType[];
  } = {}
): Promise<string> {
  const results = await store.search({
    tenantId,
    learnerId,
    query: currentQuery,
    types: options.includeTypes,
    maxResults: options.maxMemories ?? 5,
    recencyWeight: 0.3,
  });

  if (results.length === 0) {
    return '';
  }

  const contextParts = [
    '## Relevant Learner Context\n',
    'Based on previous interactions and learner history:\n',
  ];

  for (const result of results) {
    const memory = result.memory;
    const typeLabel = memory.type.toLowerCase().replace('_', ' ');
    contextParts.push(
      `- [${typeLabel}] ${memory.content}\n`
    );
  }

  return contextParts.join('');
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default VectorMemoryStore;
