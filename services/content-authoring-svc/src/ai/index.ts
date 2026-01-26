/**
 * AI Module Index
 *
 * Centralized exports for all AI-assisted content authoring functionality.
 */

// Core AI Services
export {
  DraftGenerator,
  createDraftGenerator,
} from './draft-generator.js';

export {
  CurriculumValidator,
  createCurriculumValidator,
} from './curriculum-validator.js';

export {
  QualityScorer,
  createQualityScorer,
} from './quality-scorer.js';

// Supporting Services
export {
  CurriculumService,
  getCurriculumService,
} from './curriculum-service.js';

export {
  AIOrchestratorclient,
  AIClientError,
  getAIClient,
  createAIClient,
  type AICompletionRequest,
  type AICompletionResponse,
  type AIMessage,
  type AIRequestContext,
  type AIClientConfig,
} from './ai-orchestrator-client.js';

// Caching
export {
  type AICache,
  InMemoryCache,
  RedisCache,
  CacheManager,
  getCacheManager,
  createCacheManager,
  buildCacheKey,
  hashString,
  contentCacheKey,
  withCache,
} from './cache.js';

// Prompt Templates
export * from './prompts/index.js';
