/**
 * MemoryRetrieval - Advanced memory retrieval strategies
 */

import type { Memory, MemoryType, RecallOptions } from '../core/types';
import type { EpisodicMemory } from './episodic-memory';
import type { WorkingMemory } from './working-memory';
import type { LongTermMemory } from './long-term-memory';

export interface RetrievalConfig {
  maxResults: number;
  minRelevanceScore: number;
  recencyWeight: number;
  importanceWeight: number;
  accessWeight: number;
}

export interface RetrievalResult {
  memory: Memory;
  score: number;
  source: 'episodic' | 'working' | 'long-term';
}

export class MemoryRetrieval {
  private episodic: EpisodicMemory;
  private working: WorkingMemory;
  private longTerm: LongTermMemory;
  private config: RetrievalConfig;

  constructor(
    episodic: EpisodicMemory,
    working: WorkingMemory,
    longTerm: LongTermMemory,
    config?: Partial<RetrievalConfig>
  ) {
    this.episodic = episodic;
    this.working = working;
    this.longTerm = longTerm;
    this.config = {
      maxResults: 10,
      minRelevanceScore: 0.1,
      recencyWeight: 0.3,
      importanceWeight: 0.4,
      accessWeight: 0.3,
      ...config,
    };
  }

  /**
   * Retrieve memories using multiple strategies
   */
  async retrieve(
    query: string,
    options?: RecallOptions
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];

    // Get memories from all sources in parallel
    const [episodicResults, workingResults, longTermResults] = await Promise.all([
      this.retrieveFromEpisodic(query, options),
      this.retrieveFromWorking(query),
      this.retrieveFromLongTerm(query, options),
    ]);

    results.push(...episodicResults);
    results.push(...workingResults);
    results.push(...longTermResults);

    // Filter by minimum score
    const filtered = results.filter(r => r.score >= this.config.minRelevanceScore);

    // Sort by score descending
    filtered.sort((a, b) => b.score - a.score);

    // Limit results
    const limit = options?.limit || this.config.maxResults;
    return filtered.slice(0, limit);
  }

  /**
   * Retrieve by embedding similarity
   */
  async retrieveBySimilarity(
    embedding: number[],
    options?: RecallOptions
  ): Promise<RetrievalResult[]> {
    const results = await this.longTerm.retrieveBySimilarity(
      embedding,
      options?.limit || this.config.maxResults
    );

    return results.map(memory => ({
      memory,
      score: this.calculateScore(memory),
      source: 'long-term' as const,
    }));
  }

  /**
   * Retrieve most recent memories
   */
  async retrieveRecent(limit: number = 10): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];

    // Get recent from episodic
    const recentEpisodic = await this.episodic.getRecent(limit);
    for (const episode of recentEpisodic) {
      results.push({
        memory: {
          id: episode.id,
          type: 'episodic',
          content: episode.content,
          timestamp: episode.timestamp,
          importance: 0.5,
          accessCount: 1,
          lastAccessed: new Date(),
          metadata: episode.metadata,
        },
        score: this.calculateRecencyScore(episode.timestamp),
        source: 'episodic',
      });
    }

    // Get from working memory
    const workingItems = await this.working.getAll();
    for (const item of workingItems) {
      results.push({
        memory: {
          id: item.id,
          type: 'working',
          content: item.content,
          timestamp: item.timestamp,
          importance: 0.8, // Working memory items are high importance
          accessCount: 1,
          lastAccessed: new Date(),
          metadata: item.metadata || {},
        },
        score: this.calculateRecencyScore(item.timestamp) * 1.5, // Boost working memory
        source: 'working',
      });
    }

    // Sort by score and limit
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  /**
   * Retrieve by memory type
   */
  async retrieveByType(
    type: MemoryType,
    limit: number = 10
  ): Promise<RetrievalResult[]> {
    const results: RetrievalResult[] = [];

    if (type === 'episodic') {
      const episodes = await this.episodic.getRecent(limit);
      for (const episode of episodes) {
        results.push({
          memory: {
            id: episode.id,
            type: 'episodic',
            content: episode.content,
            timestamp: episode.timestamp,
            importance: 0.5,
            accessCount: 1,
            lastAccessed: new Date(),
            metadata: episode.metadata,
          },
          score: 1.0,
          source: 'episodic',
        });
      }
    } else if (type === 'working') {
      const items = await this.working.getAll();
      for (const item of items) {
        results.push({
          memory: {
            id: item.id,
            type: 'working',
            content: item.content,
            timestamp: item.timestamp,
            importance: 0.8,
            accessCount: 1,
            lastAccessed: new Date(),
            metadata: item.metadata || {},
          },
          score: 1.0,
          source: 'working',
        });
      }
    } else if (type === 'long-term') {
      const memories = await this.longTerm.retrieveByType(type, limit);
      for (const memory of memories) {
        results.push({
          memory,
          score: this.calculateScore(memory),
          source: 'long-term',
        });
      }
    }

    return results;
  }

  /**
   * Build context string from memories
   */
  async buildContext(
    query: string,
    maxTokens: number,
    options?: RecallOptions
  ): Promise<string> {
    const results = await this.retrieve(query, options);
    const contextParts: string[] = [];
    let estimatedTokens = 0;

    for (const result of results) {
      const memoryStr = this.formatMemory(result);
      const memoryTokens = this.estimateTokens(memoryStr);

      if (estimatedTokens + memoryTokens > maxTokens) {
        break;
      }

      contextParts.push(memoryStr);
      estimatedTokens += memoryTokens;
    }

    return contextParts.join('\n\n');
  }

  /**
   * Retrieve from episodic memory
   */
  private async retrieveFromEpisodic(
    query: string,
    options?: RecallOptions
  ): Promise<RetrievalResult[]> {
    let episodes;

    if (options?.timeRange) {
      episodes = await this.episodic.recallByTimeRange(
        options.timeRange.start,
        options.timeRange.end
      );
    } else {
      episodes = await this.episodic.recall(query, options?.limit);
    }

    return episodes.map(episode => ({
      memory: {
        id: episode.id,
        type: 'episodic' as MemoryType,
        content: episode.content,
        timestamp: episode.timestamp,
        importance: 0.5,
        accessCount: 1,
        lastAccessed: new Date(),
        metadata: episode.metadata,
      },
      score: this.calculateRelevanceScore(episode.content, query),
      source: 'episodic' as const,
    }));
  }

  /**
   * Retrieve from working memory
   */
  private async retrieveFromWorking(query: string): Promise<RetrievalResult[]> {
    const items = await this.working.search(query);

    return items.map(item => ({
      memory: {
        id: item.id,
        type: 'working' as MemoryType,
        content: item.content,
        timestamp: item.timestamp,
        importance: 0.8,
        accessCount: 1,
        lastAccessed: new Date(),
        metadata: item.metadata || {},
      },
      score: this.calculateRelevanceScore(item.content, query) * 1.2, // Boost working memory
      source: 'working' as const,
    }));
  }

  /**
   * Retrieve from long-term memory
   */
  private async retrieveFromLongTerm(
    query: string,
    options?: RecallOptions
  ): Promise<RetrievalResult[]> {
    const memories = await this.longTerm.retrieve(query, options?.limit);

    return memories
      .filter(m => !options?.minImportance || m.importance >= options.minImportance)
      .map(memory => ({
        memory,
        score: this.calculateScore(memory),
        source: 'long-term' as const,
      }));
  }

  /**
   * Calculate overall memory score
   */
  private calculateScore(memory: Memory): number {
    const recencyScore = this.calculateRecencyScore(memory.timestamp);
    const importanceScore = memory.importance;
    const accessScore = Math.min(1, memory.accessCount / 100);

    return (
      recencyScore * this.config.recencyWeight +
      importanceScore * this.config.importanceWeight +
      accessScore * this.config.accessWeight
    );
  }

  /**
   * Calculate recency score
   */
  private calculateRecencyScore(timestamp: Date): number {
    const ageMs = Date.now() - new Date(timestamp).getTime();
    const ageHours = ageMs / (1000 * 60 * 60);

    // Exponential decay
    return Math.exp(-ageHours / 168); // Half-life of ~1 week
  }

  /**
   * Calculate relevance score for content
   */
  private calculateRelevanceScore(content: unknown, query: string): number {
    const contentStr = JSON.stringify(content).toLowerCase();
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

    if (queryTerms.length === 0) {
      return 0;
    }

    let matches = 0;
    for (const term of queryTerms) {
      if (contentStr.includes(term)) {
        matches++;
      }
    }

    return matches / queryTerms.length;
  }

  /**
   * Format memory for context
   */
  private formatMemory(result: RetrievalResult): string {
    const { memory, source } = result;
    const timestamp = new Date(memory.timestamp).toISOString();

    let content: string;
    if (typeof memory.content === 'string') {
      content = memory.content;
    } else {
      content = JSON.stringify(memory.content);
    }

    return `[${source.toUpperCase()} - ${timestamp}]\n${content}`;
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
