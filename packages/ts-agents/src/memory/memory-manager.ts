/**
 * Memory manager that coordinates episodic, working, and long-term memory
 */

import type { Memory, MemoryType, MemoryConfig, RecallOptions, MemoryItem, Episode } from '../core/types.js';
import { MemoryError } from '../core/types.js';
import { EpisodicMemory, type EpisodicMemoryConfig } from './episodic-memory.js';
import { WorkingMemory, type WorkingMemoryConfig } from './working-memory.js';
import { LongTermMemory, type LongTermMemoryConfig, type EmbeddingProvider } from './long-term-memory.js';
import {
  rankMemories,
  diversifyResults,
  buildContextFromMemories,
  hybridStrategy,
  type RetrievalStrategy,
} from './memory-retrieval.js';

export interface MemoryManagerConfig {
  episodic?: EpisodicMemoryConfig;
  working?: WorkingMemoryConfig;
  longTerm?: LongTermMemoryConfig;
  /** Default retrieval strategy */
  retrievalStrategy?: RetrievalStrategy;
  /** Enable automatic consolidation from working to long-term */
  autoConsolidate?: boolean;
  /** Consolidation interval in milliseconds */
  consolidationInterval?: number;
}

/**
 * Unified memory manager for agent memory operations
 */
export class MemoryManager {
  private readonly episodic: EpisodicMemory;
  private readonly working: WorkingMemory;
  private readonly longTerm: LongTermMemory;
  private readonly config: MemoryConfig;
  private readonly retrievalStrategy: RetrievalStrategy;
  private consolidationTimer?: ReturnType<typeof setInterval>;

  constructor(
    episodic: EpisodicMemory,
    working: WorkingMemory,
    longTerm: LongTermMemory,
    config: MemoryConfig,
    managerConfig?: MemoryManagerConfig
  ) {
    this.episodic = episodic;
    this.working = working;
    this.longTerm = longTerm;
    this.config = config;
    this.retrievalStrategy = managerConfig?.retrievalStrategy ?? hybridStrategy;

    if (managerConfig?.autoConsolidate) {
      this.startAutoConsolidation(managerConfig.consolidationInterval ?? 60000);
    }
  }

  /**
   * Remember content in the appropriate memory store
   */
  async remember(
    content: unknown,
    type: MemoryType,
    metadata?: Record<string, unknown>
  ): Promise<Memory> {
    const memory: Memory = {
      id: this.generateId(),
      type,
      content,
      timestamp: new Date(),
      importance: this.calculateInitialImportance(content, metadata),
      accessCount: 0,
      lastAccessed: new Date(),
      metadata: metadata ?? {},
    };

    switch (type) {
      case 'working':
        await this.working.push({
          id: memory.id,
          content: memory.content,
          timestamp: memory.timestamp,
          metadata: memory.metadata,
        });
        break;

      case 'episodic':
        await this.episodic.record({
          id: memory.id,
          type: 'memory',
          content: memory.content,
          timestamp: memory.timestamp,
          metadata: memory.metadata,
        });
        break;

      case 'long-term':
      case 'semantic':
        if (this.config.longTerm?.enabled) {
          await this.longTerm.store(memory);
        }
        break;
    }

    return memory;
  }

  /**
   * Recall memories matching a query
   */
  async recall(query: string, options?: RecallOptions): Promise<Memory[]> {
    const memories: Memory[] = [];
    const types = options?.types ?? ['episodic', 'working', 'long-term'];

    // Gather from working memory
    if (types.includes('working')) {
      const workingItems = await this.working.getAll();
      memories.push(...this.memoryItemsToMemories(workingItems, 'working'));
    }

    // Gather from episodic memory
    if (types.includes('episodic') && this.config.episodic?.enabled) {
      const episodes = await this.episodic.recall(query, options?.limit);
      memories.push(...this.episodesToMemories(episodes));
    }

    // Gather from long-term memory
    if ((types.includes('long-term') || types.includes('semantic')) && this.config.longTerm?.enabled) {
      const longTermMemories = await this.longTerm.retrieve(query, options?.limit);
      memories.push(...longTermMemories);
    }

    // Apply retrieval strategy
    return this.retrievalStrategy.retrieve(memories, query, options ?? {});
  }

  /**
   * Transfer working memory to long-term storage
   */
  async transferToLongTerm(): Promise<number> {
    if (!this.config.longTerm?.enabled) {
      return 0;
    }

    const itemsToTransfer = await this.working.getItemsForConsolidation();

    if (itemsToTransfer.length === 0) {
      return 0;
    }

    for (const item of itemsToTransfer) {
      await this.longTerm.store({
        id: item.id,
        type: 'long-term',
        content: item.content,
        timestamp: item.timestamp,
        importance: 0.5,
        accessCount: 1,
        lastAccessed: new Date(),
        metadata: item.metadata ?? {},
      });
    }

    await this.working.removeConsolidated(itemsToTransfer.map(i => i.id));

    return itemsToTransfer.length;
  }

  /**
   * Get relevant context for a query within token limits
   */
  async getRelevantContext(query: string, maxTokens: number): Promise<string> {
    const memories = await this.recall(query, { limit: 50 });

    // Rank and diversify
    const ranked = rankMemories(memories, query);
    const diverse = diversifyResults(ranked, 20);

    // Build context string
    return buildContextFromMemories(diverse, maxTokens);
  }

  /**
   * Record an interaction episode
   */
  async recordEpisode(episode: Omit<Episode, 'id'>): Promise<void> {
    if (!this.config.episodic?.enabled) {
      return;
    }

    await this.episodic.record({
      id: this.generateId(),
      ...episode,
    });
  }

  /**
   * Get recent episodes
   */
  async getRecentEpisodes(count: number): Promise<Episode[]> {
    return this.episodic.getRecent(count);
  }

  /**
   * Boost importance of a specific memory
   */
  async reinforceMemory(memoryId: string, amount: number = 0.1): Promise<boolean> {
    return this.longTerm.boostImportance(memoryId, amount);
  }

  /**
   * Clear working memory
   */
  async clearWorkingMemory(): Promise<void> {
    await this.working.clear();
  }

  /**
   * Get memory statistics
   */
  getStats(): {
    working: { size: number; capacity: number };
    episodic: { size: number };
    longTerm: ReturnType<LongTermMemory['getStats']>;
  } {
    return {
      working: {
        size: this.working.size(),
        capacity: this.config.working?.capacity ?? 7,
      },
      episodic: {
        size: this.episodic.size(),
      },
      longTerm: this.longTerm.getStats(),
    };
  }

  /**
   * Set embedding provider for vector operations
   */
  setEmbeddingProvider(provider: EmbeddingProvider): void {
    this.longTerm.setEmbeddingProvider(provider);
  }

  /**
   * Serialize all memory for persistence
   */
  serialize(): string {
    return JSON.stringify({
      working: this.working.serialize(),
      episodic: this.episodic.serialize(),
      longTerm: this.longTerm.serialize(),
    });
  }

  /**
   * Restore memory from serialized data
   */
  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data) as {
        working: string;
        episodic: string;
        longTerm: string;
      };

      this.working.deserialize(parsed.working);
      this.episodic.deserialize(parsed.episodic);
      this.longTerm.deserialize(parsed.longTerm);
    } catch (error) {
      throw new MemoryError('Failed to deserialize memory data', { error });
    }
  }

  /**
   * Stop auto-consolidation
   */
  dispose(): void {
    if (this.consolidationTimer) {
      clearInterval(this.consolidationTimer);
      this.consolidationTimer = undefined;
    }
  }

  private startAutoConsolidation(intervalMs: number): void {
    this.consolidationTimer = setInterval(async () => {
      try {
        await this.transferToLongTerm();
      } catch {
        // Log error but don't throw
      }
    }, intervalMs);

    if (this.consolidationTimer.unref) {
      this.consolidationTimer.unref();
    }
  }

  private calculateInitialImportance(content: unknown, metadata?: Record<string, unknown>): number {
    let importance = 0.5;

    // Boost for explicit importance
    if (metadata?.importance && typeof metadata.importance === 'number') {
      importance = metadata.importance;
    }

    // Boost for longer content
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    if (contentStr.length > 500) {
      importance = Math.min(1, importance + 0.1);
    }

    // Boost for specific keywords
    const boostKeywords = ['important', 'critical', 'remember', 'key', 'essential'];
    const contentLower = contentStr.toLowerCase();
    for (const keyword of boostKeywords) {
      if (contentLower.includes(keyword)) {
        importance = Math.min(1, importance + 0.1);
        break;
      }
    }

    return importance;
  }

  private memoryItemsToMemories(items: MemoryItem[], type: MemoryType): Memory[] {
    return items.map(item => ({
      id: item.id,
      type,
      content: item.content,
      timestamp: item.timestamp,
      importance: 0.5,
      accessCount: 0,
      lastAccessed: new Date(),
      metadata: item.metadata ?? {},
    }));
  }

  private episodesToMemories(episodes: Episode[]): Memory[] {
    return episodes.map(episode => ({
      id: episode.id,
      type: 'episodic' as MemoryType,
      content: episode.content,
      timestamp: episode.timestamp,
      importance: 0.6, // Episodes are generally important
      accessCount: 0,
      lastAccessed: new Date(),
      metadata: {
        episodeType: episode.type,
        participants: episode.participants,
        outcome: episode.outcome,
        ...episode.metadata,
      },
    }));
  }

  private generateId(): string {
    return `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

/**
 * Create a memory manager from configuration
 */
export function createMemoryManager(config: MemoryConfig): MemoryManager {
  const episodic = new EpisodicMemory({
    maxEpisodes: config.episodic?.maxEpisodes,
    retentionDays: config.episodic?.retentionDays,
  });

  const working = new WorkingMemory({
    capacity: config.working?.capacity,
  });

  const longTerm = new LongTermMemory({
    maxMemories: config.longTerm?.maxMemories,
  });

  return new MemoryManager(episodic, working, longTerm, config);
}
