/**
 * LongTermMemory - Persistent storage with vector similarity search
 */

import { v4 as uuid } from 'uuid';
import type { Memory, MemoryType, ForgetCriteria } from '../core/types';

export interface LongTermMemoryConfig {
  enabled: boolean;
  maxMemories?: number;
  embeddingDimensions?: number;
}

export interface MemoryEntry extends Memory {
  textContent: string; // Flattened text for search
}

export class LongTermMemory {
  private memories: Map<string, MemoryEntry> = new Map();
  private config: Required<LongTermMemoryConfig>;

  constructor(config: LongTermMemoryConfig) {
    this.config = {
      enabled: config.enabled,
      maxMemories: config.maxMemories || 10000,
      embeddingDimensions: config.embeddingDimensions || 1536,
    };
  }

  /**
   * Store a memory
   */
  async store(memory: Omit<Memory, 'id' | 'accessCount' | 'lastAccessed'>): Promise<Memory> {
    if (!this.config.enabled) {
      throw new Error('Long-term memory is not enabled');
    }

    const newMemory: MemoryEntry = {
      id: uuid(),
      accessCount: 0,
      lastAccessed: new Date(),
      textContent: this.flattenContent(memory.content),
      ...memory,
    };

    this.memories.set(newMemory.id, newMemory);

    // Enforce max memories limit
    await this.enforceLimit();

    return newMemory;
  }

  /**
   * Retrieve memories by text query
   */
  async retrieve(query: string, limit: number = 10): Promise<Memory[]> {
    if (!this.config.enabled) {
      return [];
    }

    const queryLower = query.toLowerCase();
    const scored: Array<{ memory: MemoryEntry; score: number }> = [];

    for (const memory of this.memories.values()) {
      const score = this.calculateTextSimilarity(memory.textContent, queryLower);
      if (score > 0) {
        scored.push({ memory, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Get top results and update access stats
    const results = scored.slice(0, limit).map(s => s.memory);
    for (const memory of results) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    }

    return results;
  }

  /**
   * Retrieve memories by embedding similarity
   */
  async retrieveBySimilarity(
    embedding: number[],
    limit: number = 10
  ): Promise<Memory[]> {
    if (!this.config.enabled) {
      return [];
    }

    const scored: Array<{ memory: MemoryEntry; similarity: number }> = [];

    for (const memory of this.memories.values()) {
      if (memory.embedding) {
        const similarity = this.cosineSimilarity(embedding, memory.embedding);
        scored.push({ memory, similarity });
      }
    }

    // Sort by similarity descending
    scored.sort((a, b) => b.similarity - a.similarity);

    // Get top results and update access stats
    const results = scored.slice(0, limit).map(s => s.memory);
    for (const memory of results) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    }

    return results;
  }

  /**
   * Retrieve memories by type
   */
  async retrieveByType(type: MemoryType, limit: number = 10): Promise<Memory[]> {
    if (!this.config.enabled) {
      return [];
    }

    const results: Memory[] = [];
    for (const memory of this.memories.values()) {
      if (memory.type === type) {
        results.push(memory);
        if (results.length >= limit) break;
      }
    }

    return results;
  }

  /**
   * Get a memory by ID
   */
  async getById(id: string): Promise<Memory | undefined> {
    const memory = this.memories.get(id);
    if (memory) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
    }
    return memory;
  }

  /**
   * Update a memory
   */
  async update(id: string, updates: Partial<Memory>): Promise<Memory | undefined> {
    const memory = this.memories.get(id);
    if (memory) {
      Object.assign(memory, updates);
      if (updates.content) {
        memory.textContent = this.flattenContent(updates.content);
      }
      return memory;
    }
    return undefined;
  }

  /**
   * Delete a memory
   */
  async delete(id: string): Promise<boolean> {
    return this.memories.delete(id);
  }

  /**
   * Consolidate similar memories
   */
  async consolidate(): Promise<number> {
    if (!this.config.enabled) {
      return 0;
    }

    const memories = Array.from(this.memories.values());
    const toDelete: string[] = [];
    const processed = new Set<string>();

    for (let i = 0; i < memories.length; i++) {
      if (processed.has(memories[i].id)) continue;

      const similar: MemoryEntry[] = [memories[i]];

      for (let j = i + 1; j < memories.length; j++) {
        if (processed.has(memories[j].id)) continue;

        // Check if memories are similar
        const similarity = this.calculateTextSimilarity(
          memories[i].textContent,
          memories[j].textContent
        );

        if (similarity > 0.8) {
          similar.push(memories[j]);
          processed.add(memories[j].id);
        }
      }

      if (similar.length > 1) {
        // Merge similar memories
        const merged = await this.mergeMemories(similar);
        this.memories.set(merged.id, merged as MemoryEntry);

        // Mark others for deletion
        for (const mem of similar) {
          if (mem.id !== merged.id) {
            toDelete.push(mem.id);
          }
        }
      }

      processed.add(memories[i].id);
    }

    // Delete merged memories
    for (const id of toDelete) {
      this.memories.delete(id);
    }

    return toDelete.length;
  }

  /**
   * Forget memories based on criteria
   */
  async forget(criteria: ForgetCriteria): Promise<number> {
    const toDelete: string[] = [];

    for (const memory of this.memories.values()) {
      let shouldForget = false;

      if (criteria.olderThan && new Date(memory.timestamp) < criteria.olderThan) {
        shouldForget = true;
      }

      if (criteria.maxImportance && memory.importance <= criteria.maxImportance) {
        shouldForget = true;
      }

      if (criteria.maxAccessCount && memory.accessCount <= criteria.maxAccessCount) {
        shouldForget = true;
      }

      if (criteria.type && memory.type === criteria.type) {
        shouldForget = true;
      }

      if (shouldForget) {
        toDelete.push(memory.id);
      }
    }

    for (const id of toDelete) {
      this.memories.delete(id);
    }

    return toDelete.length;
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    totalMemories: number;
    byType: Record<MemoryType, number>;
    averageImportance: number;
    averageAccessCount: number;
  } {
    const byType: Partial<Record<MemoryType, number>> = {};
    let totalImportance = 0;
    let totalAccessCount = 0;

    for (const memory of this.memories.values()) {
      byType[memory.type] = (byType[memory.type] || 0) + 1;
      totalImportance += memory.importance;
      totalAccessCount += memory.accessCount;
    }

    const count = this.memories.size || 1;

    return {
      totalMemories: this.memories.size,
      byType: byType as Record<MemoryType, number>,
      averageImportance: totalImportance / count,
      averageAccessCount: totalAccessCount / count,
    };
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memories.clear();
  }

  /**
   * Export all memories
   */
  export(): Memory[] {
    return Array.from(this.memories.values());
  }

  /**
   * Import memories
   */
  async import(memories: Memory[]): Promise<void> {
    for (const memory of memories) {
      const entry: MemoryEntry = {
        ...memory,
        textContent: this.flattenContent(memory.content),
      };
      this.memories.set(memory.id, entry);
    }
  }

  /**
   * Flatten content to searchable text
   */
  private flattenContent(content: unknown): string {
    if (typeof content === 'string') {
      return content.toLowerCase();
    }
    return JSON.stringify(content).toLowerCase();
  }

  /**
   * Calculate text similarity score
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 2));
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 2));

    if (words1.size === 0 || words2.size === 0) {
      return 0;
    }

    let matches = 0;
    for (const word of words1) {
      if (words2.has(word)) {
        matches++;
      }
    }

    // Jaccard similarity
    const union = new Set([...words1, ...words2]);
    return matches / union.size;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) {
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Merge similar memories into one
   */
  private async mergeMemories(memories: MemoryEntry[]): Promise<Memory> {
    // Use the most important memory as base
    const sorted = [...memories].sort((a, b) => b.importance - a.importance);
    const base = sorted[0];

    // Combine content
    const combinedContent = memories.map(m => m.content);

    // Average embeddings if available
    let combinedEmbedding: number[] | undefined;
    const embeddings = memories.filter(m => m.embedding).map(m => m.embedding!);
    if (embeddings.length > 0) {
      combinedEmbedding = this.averageEmbeddings(embeddings);
    }

    return {
      id: base.id,
      type: base.type,
      content: combinedContent,
      embedding: combinedEmbedding,
      timestamp: base.timestamp,
      importance: Math.max(...memories.map(m => m.importance)),
      accessCount: memories.reduce((sum, m) => sum + m.accessCount, 0),
      lastAccessed: new Date(),
      metadata: {
        ...base.metadata,
        mergedFrom: memories.map(m => m.id),
        mergedCount: memories.length,
      },
    };
  }

  /**
   * Average multiple embeddings
   */
  private averageEmbeddings(embeddings: number[][]): number[] {
    const dimensions = embeddings[0].length;
    const result = new Array(dimensions).fill(0);

    for (const embedding of embeddings) {
      for (let i = 0; i < dimensions; i++) {
        result[i] += embedding[i];
      }
    }

    const count = embeddings.length;
    for (let i = 0; i < dimensions; i++) {
      result[i] /= count;
    }

    return result;
  }

  /**
   * Enforce max memories limit
   */
  private async enforceLimit(): Promise<void> {
    if (this.memories.size <= this.config.maxMemories) {
      return;
    }

    // Calculate a score for each memory
    const scored = Array.from(this.memories.entries()).map(([id, memory]) => {
      // Score based on importance, access count, and recency
      const ageMs = Date.now() - new Date(memory.timestamp).getTime();
      const ageScore = Math.max(0, 1 - ageMs / (30 * 24 * 60 * 60 * 1000)); // 30 days
      const accessScore = Math.min(1, memory.accessCount / 100);
      const importanceScore = memory.importance;

      const score = importanceScore * 0.4 + accessScore * 0.3 + ageScore * 0.3;
      return { id, score };
    });

    // Sort by score ascending (lowest first)
    scored.sort((a, b) => a.score - b.score);

    // Remove lowest scoring memories
    const toRemove = this.memories.size - this.config.maxMemories;
    for (let i = 0; i < toRemove; i++) {
      this.memories.delete(scored[i].id);
    }
  }
}
