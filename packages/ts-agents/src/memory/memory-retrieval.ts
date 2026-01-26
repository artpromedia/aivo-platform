/**
 * Memory retrieval utilities for intelligent context building
 */

import type { Memory, MemoryType, RecallOptions } from '../core/types.js';

export interface RetrievalResult {
  memories: Memory[];
  totalCount: number;
  sources: MemoryType[];
  relevanceScores: Map<string, number>;
}

export interface RetrievalConfig {
  /** Maximum memories to retrieve */
  maxResults?: number;
  /** Minimum relevance score (0-1) */
  minRelevance?: number;
  /** Weight for recency in scoring */
  recencyWeight?: number;
  /** Weight for importance in scoring */
  importanceWeight?: number;
  /** Weight for access frequency in scoring */
  accessWeight?: number;
  /** Enable diversity in results */
  diversify?: boolean;
}

/**
 * Calculate relevance score for a memory based on multiple factors
 */
export function calculateRelevanceScore(
  memory: Memory,
  query: string,
  config?: RetrievalConfig
): number {
  const recencyWeight = config?.recencyWeight ?? 0.3;
  const importanceWeight = config?.importanceWeight ?? 0.4;
  const accessWeight = config?.accessWeight ?? 0.3;

  // Text match score (simple)
  const textScore = calculateTextMatchScore(memory, query);

  // Recency score (exponential decay)
  const now = Date.now();
  const ageMs = now - memory.timestamp.getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const recencyScore = Math.exp(-ageHours / 168); // 1-week half-life

  // Access score (normalized)
  const accessScore = Math.min(1, memory.accessCount / 10);

  // Combined score
  return (
    textScore * 0.4 +
    recencyScore * recencyWeight +
    memory.importance * importanceWeight +
    accessScore * accessWeight
  );
}

/**
 * Calculate text match score between memory content and query
 */
export function calculateTextMatchScore(memory: Memory, query: string): number {
  const contentStr = typeof memory.content === 'string'
    ? memory.content.toLowerCase()
    : JSON.stringify(memory.content).toLowerCase();

  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  if (queryTerms.length === 0) {
    return 0;
  }

  let matchCount = 0;
  for (const term of queryTerms) {
    if (contentStr.includes(term)) {
      matchCount++;
    }
  }

  return matchCount / queryTerms.length;
}

/**
 * Rank memories by relevance
 */
export function rankMemories(
  memories: Memory[],
  query: string,
  config?: RetrievalConfig
): Array<{ memory: Memory; score: number }> {
  const scored = memories.map(memory => ({
    memory,
    score: calculateRelevanceScore(memory, query, config),
  }));

  scored.sort((a, b) => b.score - a.score);

  const minRelevance = config?.minRelevance ?? 0;
  return scored.filter(item => item.score >= minRelevance);
}

/**
 * Diversify results to avoid redundancy
 */
export function diversifyResults(
  rankedMemories: Array<{ memory: Memory; score: number }>,
  maxResults: number
): Memory[] {
  if (rankedMemories.length <= maxResults) {
    return rankedMemories.map(r => r.memory);
  }

  const selected: Memory[] = [];
  const selectedContent = new Set<string>();

  for (const { memory } of rankedMemories) {
    if (selected.length >= maxResults) {
      break;
    }

    const contentHash = hashContent(memory.content);

    // Skip if too similar to already selected
    if (selectedContent.has(contentHash)) {
      continue;
    }

    selected.push(memory);
    selectedContent.add(contentHash);
  }

  return selected;
}

/**
 * Group memories by type
 */
export function groupByType(memories: Memory[]): Map<MemoryType, Memory[]> {
  const groups = new Map<MemoryType, Memory[]>();

  for (const memory of memories) {
    const existing = groups.get(memory.type) ?? [];
    existing.push(memory);
    groups.set(memory.type, existing);
  }

  return groups;
}

/**
 * Filter memories by time range
 */
export function filterByTimeRange(
  memories: Memory[],
  start?: Date,
  end?: Date
): Memory[] {
  return memories.filter(memory => {
    if (start && memory.timestamp < start) {
      return false;
    }
    if (end && memory.timestamp > end) {
      return false;
    }
    return true;
  });
}

/**
 * Build a context string from memories
 */
export function buildContextFromMemories(
  memories: Memory[],
  maxTokens: number,
  estimatedTokensPerChar: number = 0.25
): string {
  const maxChars = Math.floor(maxTokens / estimatedTokensPerChar);
  const parts: string[] = [];
  let currentLength = 0;

  for (const memory of memories) {
    const contentStr = typeof memory.content === 'string'
      ? memory.content
      : JSON.stringify(memory.content);

    const entry = `[${memory.type}] ${contentStr}`;

    if (currentLength + entry.length > maxChars) {
      break;
    }

    parts.push(entry);
    currentLength += entry.length;
  }

  return parts.join('\n');
}

/**
 * Simple content hash for deduplication
 */
function hashContent(content: unknown): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Memory retrieval strategy
 */
export interface RetrievalStrategy {
  name: string;
  retrieve(memories: Memory[], query: string, options: RecallOptions): Memory[];
}

/**
 * Recency-first retrieval strategy
 */
export const recencyStrategy: RetrievalStrategy = {
  name: 'recency',
  retrieve(memories: Memory[], _query: string, options: RecallOptions): Memory[] {
    const filtered = options.types
      ? memories.filter(m => options.types!.includes(m.type))
      : memories;

    const sorted = [...filtered].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );

    return sorted.slice(0, options.limit ?? 10);
  },
};

/**
 * Importance-first retrieval strategy
 */
export const importanceStrategy: RetrievalStrategy = {
  name: 'importance',
  retrieve(memories: Memory[], _query: string, options: RecallOptions): Memory[] {
    const filtered = options.types
      ? memories.filter(m => options.types!.includes(m.type))
      : memories;

    const withMinImportance = options.minImportance
      ? filtered.filter(m => m.importance >= options.minImportance!)
      : filtered;

    const sorted = [...withMinImportance].sort(
      (a, b) => b.importance - a.importance
    );

    return sorted.slice(0, options.limit ?? 10);
  },
};

/**
 * Hybrid retrieval strategy combining multiple factors
 */
export const hybridStrategy: RetrievalStrategy = {
  name: 'hybrid',
  retrieve(memories: Memory[], query: string, options: RecallOptions): Memory[] {
    let filtered = options.types
      ? memories.filter(m => options.types!.includes(m.type))
      : memories;

    if (options.timeRange) {
      filtered = filterByTimeRange(filtered, options.timeRange.start, options.timeRange.end);
    }

    if (options.minImportance) {
      filtered = filtered.filter(m => m.importance >= options.minImportance!);
    }

    const ranked = rankMemories(filtered, query);
    return ranked.slice(0, options.limit ?? 10).map(r => r.memory);
  },
};
