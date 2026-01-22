/**
 * Self-Learning Module
 *
 * This module provides capabilities for continuous AI improvement through:
 *
 * - **Outcome Tracking**: Monitor AI action effectiveness and user feedback
 * - **Prompt Optimization**: A/B test and optimize prompts based on performance
 * - **Learning Signal Processing**: Aggregate signals and detect improvement patterns
 * - **Training Data Pipeline**: Generate fine-tuning data from successful interactions
 *
 * @module ai-orchestrator/self-learning
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type {
  OutcomeTracker,
  OutcomeTrackerConfig,
  TrackedAction,
  TrackedActionType,
  ActionEffectiveness,
} from './outcome-tracker.js';
import type { PromptOptimizer, PromptOptimizerConfig } from './prompt-optimizer.js';
import type {
  LearningSignalProcessor,
  SignalProcessorConfig,
  SignalType,
  SignalSource,
  SignalContext,
  SignalFeatures,
  LearningSignal,
  LearningPattern,
} from './learning-signal-processor.js';

// Outcome Tracker - Track AI action effectiveness
export {
  // Types
  type TrackedAction,
  type TrackedActionType,
  type OutcomeStatus,
  type ActionEffectiveness,
  type OutcomeTrackerConfig,

  // Classes
  OutcomeTracker,

  // Constants
  DEFAULT_TRACKER_CONFIG,
} from './outcome-tracker.js';

// Prompt Optimizer - A/B testing and prompt optimization
export {
  // Types
  type PromptTemplate,
  type PromptExperiment,
  type ExperimentStatus,
  type ExperimentResults,
  type PromptMetrics,
  type PromptSuggestion,
  type SuggestionType,
  type PromptOptimizerConfig,

  // Classes
  PromptOptimizer,

  // Constants
  DEFAULT_OPTIMIZER_CONFIG,
} from './prompt-optimizer.js';

// Learning Signal Processor - Pattern detection and training data generation
export {
  // Types
  type LearningSignal,
  type SignalType,
  type SignalSource,
  type SignalContext,
  type SignalFeatures,
  type LearningPattern,
  type PatternType,
  type PatternCondition,
  type TrainingExample,
  type SignalProcessorConfig,

  // Classes
  LearningSignalProcessor,

  // Constants
  DEFAULT_PROCESSOR_CONFIG,
} from './learning-signal-processor.js';

// Re-export combined types for convenience
export type SelfLearningConfig = {
  outcomeTracker: OutcomeTrackerConfig;
  promptOptimizer: PromptOptimizerConfig;
  learningSignalProcessor: SignalProcessorConfig;
};

/**
 * Create a default self-learning configuration
 */
export function createDefaultSelfLearningConfig(): SelfLearningConfig {
  return {
    outcomeTracker: {
      abandonmentTimeoutMs: 30 * 60 * 1000, // 30 minutes
      minActionsForMetrics: 50,
      aggregationIntervalMs: 60 * 60 * 1000, // 1 hour
      metricsCacheTtl: 300, // 5 minutes
    },
    promptOptimizer: {
      minImpressionsForAnalysis: 100,
      significanceThreshold: 0.95,
      maxConcurrentExperiments: 3,
      suggestionIntervalMs: 24 * 60 * 60 * 1000, // Daily
      autoPromoteWinners: false,
    },
    learningSignalProcessor: {
      minSignalsForPattern: 100,
      patternConfidenceThreshold: 0.8,
      processingBatchSize: 1000,
      signalRetentionDays: 90,
      autoGenerateTrainingExamples: true,
      positiveExampleThreshold: 0.7,
      negativeExampleThreshold: -0.5,
    },
  };
}

/**
 * Self-Learning System Manager
 *
 * Coordinates all self-learning components for unified operation.
 * 
 * TODO: This manager needs to be aligned with the actual APIs of the 
 * OutcomeTracker, PromptOptimizer, and LearningSignalProcessor classes.
 */
export class SelfLearningManager {
  private outcomeTracker: OutcomeTracker | null = null;
  private promptOptimizer: PromptOptimizer | null = null;
  private learningProcessor: LearningSignalProcessor | null = null;
  private initialized = false;

  constructor(
    private db: Pool,
    private redis: Redis,
    private config: SelfLearningConfig = createDefaultSelfLearningConfig()
  ) {}

  /**
   * Initialize all self-learning components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Dynamically import to avoid circular dependencies
    const { OutcomeTracker } = await import('./outcome-tracker.js');
    const { PromptOptimizer } = await import('./prompt-optimizer.js');
    const { LearningSignalProcessor } = await import('./learning-signal-processor.js');

    this.outcomeTracker = new OutcomeTracker(this.db, this.redis, this.config.outcomeTracker);

    // PromptOptimizer requires an LLMOrchestrator - we'll need to refactor this
    // For now, this is a placeholder that won't be used in production
    this.promptOptimizer = null as unknown as PromptOptimizer;

    this.learningProcessor = new LearningSignalProcessor(
      this.db,
      this.redis,
      this.config.learningSignalProcessor
    );

    this.initialized = true;
  }

  /**
   * Get the outcome tracker instance
   */
  getOutcomeTracker(): OutcomeTracker {
    if (this.outcomeTracker === null) {
      throw new Error('SelfLearningManager not initialized. Call initialize() first.');
    }
    return this.outcomeTracker;
  }

  /**
   * Get the prompt optimizer instance
   */
  getPromptOptimizer(): PromptOptimizer {
    if (this.promptOptimizer === null) {
      throw new Error('SelfLearningManager not initialized or PromptOptimizer not configured.');
    }
    return this.promptOptimizer;
  }

  /**
   * Get the learning signal processor instance
   */
  getLearningProcessor(): LearningSignalProcessor {
    if (this.learningProcessor === null) {
      throw new Error('SelfLearningManager not initialized. Call initialize() first.');
    }
    return this.learningProcessor;
  }

  /**
   * Record an AI action for tracking
   */
  async recordAction(
    action: Omit<TrackedAction, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<TrackedAction> {
    const tracker = this.getOutcomeTracker();
    return tracker.trackAction(action);
  }

  /**
   * Record acceptance of a tracked action
   */
  async recordAcceptance(actionId: string): Promise<void> {
    const tracker = this.getOutcomeTracker();
    await tracker.recordAcceptance(actionId);
  }

  /**
   * Record rejection of a tracked action
   */
  async recordRejection(actionId: string, reason?: string): Promise<void> {
    const tracker = this.getOutcomeTracker();
    await tracker.recordRejection(actionId, reason);
  }

  /**
   * Record completion of a tracked action
   */
  async recordCompletion(
    actionId: string,
    measuredImpact?: {
      performanceDelta?: number;
      engagementDelta?: number;
      masteryDelta?: number;
      frustrationDelta?: number;
    }
  ): Promise<void> {
    const tracker = this.getOutcomeTracker();
    await tracker.recordCompletion(actionId, measuredImpact);
  }

  /**
   * Record a learning signal
   */
  async recordSignal(input: {
    tenantId: string;
    signalType: SignalType;
    source: SignalSource;
    strength: number;
    context: SignalContext;
    features: SignalFeatures;
  }): Promise<LearningSignal> {
    const processor = this.getLearningProcessor();
    return processor.recordSignal(input);
  }

  /**
   * Process pending signals
   */
  async processSignals(): Promise<{ processed: number; patternsFound: number; examplesGenerated: number }> {
    const processor = this.getLearningProcessor();
    return processor.processSignals();
  }

  /**
   * Detect patterns in learning signals for a tenant
   */
  async detectPatterns(tenantId: string): Promise<LearningPattern[]> {
    const processor = this.getLearningProcessor();
    return processor.detectPatterns(tenantId);
  }

  /**
   * Get action effectiveness metrics
   */
  async getEffectiveness(
    tenantId: string,
    actionType: TrackedActionType,
    agentType: string,
    options?: {
      learnerId?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<ActionEffectiveness | null> {
    const tracker = this.getOutcomeTracker();
    return tracker.getEffectiveness(tenantId, actionType, agentType, options);
  }
}
