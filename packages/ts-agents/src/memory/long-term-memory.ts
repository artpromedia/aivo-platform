/**
 * Long-term memory implementation with vector similarity search
 */

import type { Memory, MemoryType, ForgetCriteria } from '../core/types.js';

export interface LongTermMemoryConfig {
  /** Maximum number of memories to store */
  maxMemories?: number;
  /** Similarity threshold for consolidation (0-1) */
  consolidationThreshold?: number;
  /** Enable automatic consolidation */
  autoConsolidate?: boolean;
  /** Minimum importance score to retain */
  minImportance?: number;
  /** Decay factor for importance over time */
  importanceDecayRate?: number;
}

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

/**
 * Long-term memory with vector similarity search capabilities
 * Supports consolidation, forgetting, and importance-based retrieval
 */
export class LongTermMemory {
  private memories: Memory[] = [];
  private readonly maxMemories: number;
  private readonly consolidationThreshold: number;
  private readonly autoConsolidate: boolean;
  private readonly minImportance: number;
  private readonly importanceDecayRate: number;
  private embeddingProvider?: EmbeddingProvider;

  constructor(config?: LongTermMemoryConfig) {
    this.maxMemories = config?.maxMemories ?? 10000;
    this.consolidationThreshold = config?.consolidationThreshold ?? 0.9;
    this.autoConsolidate = config?.autoConsolidate ?? true;
    this.minImportance = config?.minImportance ?? 0.1;
    this.importanceDecayRate = config?.importanceDecayRate ?? 0.01;
  }

  /**
   * Set the embedding provider for vector operations
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.embeddingProvider = provider;
  }

  /**
   * Store a memory
   */
  async store(memory: Memory): Promise<void> {
    const fullMemory: Memory = {
      id: memory.id ?? this.generateId(),
      type: memory.type,
      content: memory.content,
      embedding: memory.embedding,
      timestamp: memory.timestamp ?? new Date(),
      importance: memory.importance ?? 0.5,
      accessCount: memory.accessCount ?? 0,
      lastAccessed: memory.lastAccessed ?? new Date(),
      metadata: memory.metadata ?? {},
    };

    // Generate embedding if provider available and not provided
    if (this.embeddingProvider && !fullMemory.embedding) {
      const contentStr = this.contentToString(fullMemory.content);
      fullMemory.embedding = await this.embeddingProvider.embed(contentStr);
    }

    // Check for duplicates/similar memories
    if (this.autoConsolidate && fullMemory.embedding) {
      const similar = await this.findSimilar(fullMemory.embedding, 1);
      if (similar.length > 0 && similar[0]!.similarity >= this.consolidationThreshold) {
        // Merge with existing memory
        await this.mergeMemories(similar[0]!.memory, fullMemory);
        return;
      }
    }

    this.memories.push(fullMemory);

    // Enforce max memories limit
    if (this.memories.length > this.maxMemories) {
      await this.pruneByImportance();
    }
  }

  /**
   * Retrieve memories matching a text query
   */
  async retrieve(query: string, limit?: number): Promise<Memory[]> {
    const queryLower = query.toLowerCase();
    const maxResults = limit ?? 10;

    // Text-based search
    const matches = this.memories.filter(memory => {
      const contentStr = this.contentToString(memory.content).toLowerCase();
      return contentStr.includes(queryLower);
    });

    // Sort by importance and recency
    matches.sort((a, b) => {
      const importanceScore = b.importance - a.importance;
      if (Math.abs(importanceScore) > 0.1) {
        return importanceScore;
      }
      return b.timestamp.getTime() - a.timestamp.getTime();
    });

    // Update access counts
    const results = matches.slice(0, maxResults);
    for (const memory of results) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    }

    return results;
  }

  /**
   * Retrieve memories by vector similarity
   */
  async retrieveBySimilarity(
    embedding: number[],
    limit?: number,
    minSimilarity?: number
  ): Promise<Memory[]> {
    const results = await this.findSimilar(embedding, limit ?? 10);

    const threshold = minSimilarity ?? 0.5;
    const filtered = results.filter(r => r.similarity >= threshold);

    // Update access counts
    for (const { memory } of filtered) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    }

    return filtered.map(r => r.memory);
  }

  /**
   * Retrieve memories by query with embedding
   */
  async retrieveWithEmbedding(query: string, limit?: number): Promise<Memory[]> {
    if (!this.embeddingProvider) {
      return this.retrieve(query, limit);
    }

    const embedding = await this.embeddingProvider.embed(query);
    return this.retrieveBySimilarity(embedding, limit);
  }

  /**
   * Consolidate similar memories
   */
  async consolidate(): Promise<number> {
    if (!this.embeddingProvider) {
      return 0;
    }

    let consolidatedCount = 0;
    const processed = new Set<string>();

    for (let i = 0; i < this.memories.length; i++) {
      const memory = this.memories[i]!;

      if (processed.has(memory.id) || !memory.embedding) {
        continue;
      }

      const similar = await this.findSimilar(memory.embedding, 5);
      const toMerge = similar.filter(
        r => r.similarity >= this.consolidationThreshold &&
             r.memory.id !== memory.id &&
             !processed.has(r.memory.id)
      );

      for (const { memory: otherMemory } of toMerge) {
        await this.mergeMemories(memory, otherMemory);
        processed.add(otherMemory.id);
        consolidatedCount++;
      }

      processed.add(memory.id);
    }

    // Remove merged memories
    this.memories = this.memories.filter(m => !processed.has(m.id) || this.memories.indexOf(m) === 0);

    return consolidatedCount;
  }

  /**
   * Forget memories based on criteria
   */
  async forget(criteria: ForgetCriteria): Promise<number> {
    const initialCount = this.memories.length;

    this.memories = this.memories.filter(memory => {
      // Check time criteria
      if (criteria.olderThan && memory.timestamp >= criteria.olderThan) {
        return true;
      }

      // Check importance criteria
      if (criteria.importanceBelow !== undefined && memory.importance >= criteria.importanceBelow) {
        return true;
      }

      // Check access count criteria
      if (criteria.accessCountBelow !== undefined && memory.accessCount >= criteria.accessCountBelow) {
        return true;
      }

      // Check type criteria
      if (criteria.types && !criteria.types.includes(memory.type)) {
        return true;
      }

      return false;
    });

    return initialCount - this.memories.length;
  }

  /**
   * Apply importance decay to all memories
   */
  async applyDecay(): Promise<void> {
    const now = Date.now();

    for (const memory of this.memories) {
      const daysSinceAccess = (now - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      const decay = Math.exp(-this.importanceDecayRate * daysSinceAccess);
      memory.importance *= decay;
    }

    // Remove memories below minimum importance
    this.memories = this.memories.filter(m => m.importance >= this.minImportance);
  }

  /**
   * Boost importance of a memory
   */
  async boostImportance(memoryId: string, amount: number): Promise<boolean> {
    const memory = this.memories.find(m => m.id === memoryId);
    if (!memory) {
      return false;
    }

    memory.importance = Math.min(1, memory.importance + amount);
    memory.lastAccessed = new Date();
    return true;
  }

  /**
   * Get memories by type
   */
  async getByType(type: MemoryType, limit?: number): Promise<Memory[]> {
    const matches = this.memories.filter(m => m.type === type);
    matches.sort((a, b) => b.importance - a.importance);
    return limit ? matches.slice(0, limit) : matches;
  }

  /**
   * Get total memory count
   */
  size(): number {
    return this.memories.length;
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    avgImportance: number;
    avgAccessCount: number;
  } {
    const byType: Record<string, number> = {};
    let totalImportance = 0;
    let totalAccessCount = 0;

    for (const memory of this.memories) {
      byType[memory.type] = (byType[memory.type] ?? 0) + 1;
      totalImportance += memory.importance;
      totalAccessCount += memory.accessCount;
    }

    return {
      total: this.memories.length,
      byType,
      avgImportance: this.memories.length > 0 ? totalImportance / this.memories.length : 0,
      avgAccessCount: this.memories.length > 0 ? totalAccessCount / this.memories.length : 0,
    };
  }

  /**
   * Clear all memories
   */
  async clear(): Promise<void> {
    this.memories = [];
  }

  /**
   * Serialize long-term memory for persistence
   */
  serialize(): string {
    return JSON.stringify(this.memories);
  }

  /**
   * Restore long-term memory from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as Memory[];
      this.memories = parsed.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp),
        lastAccessed: new Date(m.lastAccessed),
      }));
    } catch {
      this.memories = [];
    }
  }

  private async findSimilar(
    embedding: number[],
    limit: number
  ): Promise<Array<{ memory: Memory; similarity: number }>> {
    const results: Array<{ memory: Memory; similarity: number }> = [];

    for (const memory of this.memories) {
      if (!memory.embedding) continue;

      const similarity = this.cosineSimilarity(embedding, memory.embedding);
      results.push({ memory, similarity });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, limit);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    if (magnitude === 0) return 0;

    return dotProduct / magnitude;
  }

  private async mergeMemories(target: Memory, source: Memory): Promise<void> {
    // Combine content
    target.content = {
      merged: true,
      primary: target.content,
      secondary: source.content,
    };

    // Update importance (take max + bonus)
    target.importance = Math.min(1, Math.max(target.importance, source.importance) + 0.1);

    // Sum access counts
    target.accessCount += source.accessCount;

    // Update timestamp to most recent
    if (source.timestamp > target.timestamp) {
      target.timestamp = source.timestamp;
    }

    // Merge metadata
    target.metadata = { ...target.metadata, ...source.metadata };

    // Update embedding if provider available
    if (this.embeddingProvider) {
      const contentStr = this.contentToString(target.content);
      target.embedding = await this.embeddingProvider.embed(contentStr);
    }
  }

  private async pruneByImportance(): Promise<void> {
    // Sort by importance (ascending)
    this.memories.sort((a, b) => a.importance - b.importance);

    // Remove the least important memories
    const toRemove = this.memories.length - this.maxMemories;
    this.memories.splice(0, toRemove);

    // Re-sort by timestamp
    this.memories.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  private contentToString(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    return JSON.stringify(content);
  }

  private generateId(): string {
    return `ltm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
