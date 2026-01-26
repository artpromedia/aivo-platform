/**
 * Memory system exports
 */

export { EpisodicMemory, type EpisodicMemoryConfig, type EpisodeSummary } from './episodic-memory.js';
export { WorkingMemory, type WorkingMemoryConfig } from './working-memory.js';
export {
  LongTermMemory,
  type LongTermMemoryConfig,
  type EmbeddingProvider,
} from './long-term-memory.js';
export {
  MemoryManager,
  createMemoryManager,
  type MemoryManagerConfig,
} from './memory-manager.js';
export {
  calculateRelevanceScore,
  calculateTextMatchScore,
  rankMemories,
  diversifyResults,
  groupByType,
  filterByTimeRange,
  buildContextFromMemories,
  recencyStrategy,
  importanceStrategy,
  hybridStrategy,
  type RetrievalResult,
  type RetrievalConfig,
  type RetrievalStrategy,
} from './memory-retrieval.js';
