/**
 * MemoryManager - Unified interface for all memory operations
 */

import { v4 as uuid } from 'uuid';
import type { Memory, MemoryType, MemoryConfig, RecallOptions } from '../core/types';
import { EpisodicMemory } from './episodic-memory';
import { WorkingMemory } from './working-memory';
import { LongTermMemory } from './long-term-memory';
import { MemoryRetrieval, type RetrievalResult } from './memory-retrieval';

export class MemoryManager {
  private episodic: EpisodicMemory;
  private working: WorkingMemory;
  private longTerm: LongTermMemory;
  private retrieval: MemoryRetrieval;
  private config: MemoryConfig;

  constructor(
    episodic: EpisodicMemory,
    working: WorkingMemory,
    longTerm: LongTermMemory,
    config: MemoryConfig
  ) {
    this.episodic = episodic;
    this.working = working;
    this.longTerm = longTerm;
    this.config = config;

    this.retrieval = new MemoryRetrieval(episodic, working, longTerm);
  }

  /**
   * Store a memory
   */
  async remember(
    content: unknown,
    type: MemoryType,
    metadata?: Record<string, unknown>
  ): Promise<Memory> {
    const memory: Memory = {
      id: uuid(),
      type,
      content,
      timestamp: new Date(),
      importance: this.calculateImportance(content, type),
      accessCount: 0,
      lastAccessed: new Date(),
      metadata: metadata || {},
    };

    switch (type) {
      case 'episodic':
        if (this.config.episodic?.enabled) {
          await this.episodic.record({
            type: 'memory',
            content,
            participants: [],
            timestamp: memory.timestamp,
            metadata: metadata || {},
          });
        }
        break;

      case 'working':
        await this.working.push({
          content,
          timestamp: memory.timestamp,
          metadata,
        });
        break;

      case 'long-term':
        if (this.config.longTerm?.enabled) {
          await this.longTerm.store(memory);
        }
        break;

      case 'semantic':
        // Semantic memories go to long-term with special handling
        if (this.config.longTerm?.enabled) {
          await this.longTerm.store({
            ...memory,
            type: 'semantic',
          });
        }
        break;
    }

    return memory;
  }

  /**
   * Recall memories based on a query
   */
  async recall(query: string, options?: RecallOptions): Promise<Memory[]> {
    const results = await this.retrieval.retrieve(query, options);
    return results.map(r => r.memory);
  }

  /**
   * Recall with full retrieval results including scores
   */
  async recallWithScores(
    query: string,
    options?: RecallOptions
  ): Promise<RetrievalResult[]> {
    return this.retrieval.retrieve(query, options);
  }

  /**
   * Get relevant context for a query
   */
  async getRelevantContext(query: string, maxTokens: number): Promise<string> {
    return this.retrieval.buildContext(query, maxTokens);
  }

  /**
   * Transfer important working memories to long-term storage
   */
  async transferToLongTerm(): Promise<number> {
    if (!this.config.longTerm?.enabled) {
      return 0;
    }

    const workingItems = await this.working.getAll();
    let transferred = 0;

    for (const item of workingItems) {
      const importance = this.calculateImportance(item.content, 'working');

      // Only transfer important items
      if (importance >= 0.5) {
        await this.longTerm.store({
          type: 'long-term',
          content: item.content,
          timestamp: item.timestamp,
          importance,
          metadata: item.metadata || {},
        });
        transferred++;
      }
    }

    return transferred;
  }

  /**
   * Consolidate long-term memories
   */
  async consolidate(): Promise<number> {
    if (!this.config.longTerm?.enabled) {
      return 0;
    }

    return this.longTerm.consolidate();
  }

  /**
   * Clear working memory
   */
  async clearWorkingMemory(): Promise<void> {
    await this.working.clear();
  }

  /**
   * Get working memory contents
   */
  async getWorkingMemory(): Promise<Memory[]> {
    const items = await this.working.getAll();
    return items.map(item => ({
      id: item.id,
      type: 'working' as MemoryType,
      content: item.content,
      timestamp: item.timestamp,
      importance: 0.8,
      accessCount: 1,
      lastAccessed: new Date(),
      metadata: item.metadata || {},
    }));
  }

  /**
   * Get recent episodic memories
   */
  async getRecentEpisodes(limit: number = 10): Promise<Memory[]> {
    const episodes = await this.episodic.getRecent(limit);
    return episodes.map(episode => ({
      id: episode.id,
      type: 'episodic' as MemoryType,
      content: episode.content,
      timestamp: episode.timestamp,
      importance: 0.5,
      accessCount: 1,
      lastAccessed: new Date(),
      metadata: episode.metadata,
    }));
  }

  /**
   * Summarize episodic memories
   */
  async summarizeEpisodes(): Promise<string> {
    const episodes = await this.episodic.getRecent(20);
    return this.episodic.summarize(episodes);
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    episodic: number;
    working: { size: number; capacity: number };
    longTerm: { total: number; byType: Record<MemoryType, number> };
  } {
    const ltStats = this.longTerm.getStats();

    return {
      episodic: this.episodic.getCount(),
      working: {
        size: this.working.size(),
        capacity: this.working.getCapacity(),
      },
      longTerm: {
        total: ltStats.totalMemories,
        byType: ltStats.byType,
      },
    };
  }

  /**
   * Export all memories
   */
  async export(): Promise<{
    episodic: unknown[];
    working: unknown[];
    longTerm: Memory[];
  }> {
    const workingItems = await this.working.getAll();

    return {
      episodic: this.episodic.export(),
      working: workingItems,
      longTerm: this.longTerm.export(),
    };
  }

  /**
   * Import memories
   */
  async import(data: {
    episodic?: unknown[];
    working?: unknown[];
    longTerm?: Memory[];
  }): Promise<void> {
    if (data.episodic) {
      this.episodic.import(data.episodic as never[]);
    }

    if (data.working) {
      this.working.replace(data.working as never[]);
    }

    if (data.longTerm) {
      await this.longTerm.import(data.longTerm);
    }
  }

  /**
   * Clear all memories
   */
  clearAll(): void {
    this.episodic.clear();
    this.working.replace([]);
    this.longTerm.clear();
  }

  /**
   * Calculate importance score for content
   */
  private calculateImportance(content: unknown, type: MemoryType): number {
    let baseScore = 0.5;

    // Type-based adjustments
    switch (type) {
      case 'working':
        baseScore = 0.8; // Working memory is current task relevant
        break;
      case 'episodic':
        baseScore = 0.5; // Episodic memories are average importance
        break;
      case 'long-term':
        baseScore = 0.6; // Long-term has some importance
        break;
      case 'semantic':
        baseScore = 0.7; // Semantic knowledge is valuable
        break;
    }

    // Content-based adjustments
    const contentStr = JSON.stringify(content);

    // Longer content might be more detailed/important
    if (contentStr.length > 500) {
      baseScore += 0.1;
    }

    // Check for key indicators of importance
    const importanceKeywords = [
      'important',
      'critical',
      'key',
      'main',
      'primary',
      'essential',
      'remember',
      'note',
    ];

    for (const keyword of importanceKeywords) {
      if (contentStr.toLowerCase().includes(keyword)) {
        baseScore += 0.05;
      }
    }

    return Math.min(1, baseScore);
  }

  /**
   * Get the episodic memory instance
   */
  getEpisodicMemory(): EpisodicMemory {
    return this.episodic;
  }

  /**
   * Get the working memory instance
   */
  getWorkingMemoryInstance(): WorkingMemory {
    return this.working;
  }

  /**
   * Get the long-term memory instance
   */
  getLongTermMemory(): LongTermMemory {
    return this.longTerm;
  }

  /**
   * Get the retrieval instance
   */
  getRetrieval(): MemoryRetrieval {
    return this.retrieval;
  }
}
