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

// Outcome Tracker - Track AI action effectiveness
export {
  // Types
  type TrackedAIAction,
  type ActionFeedback,
  type ActionEffectiveness,
  type OutcomeTrackerConfig,
  type EffectivenessQuery,

  // Classes
  OutcomeTracker,

  // Constants
  DEFAULT_OUTCOME_TRACKER_CONFIG,
} from './outcome-tracker.js';

// Prompt Optimizer - A/B testing and prompt optimization
export {
  // Types
  type PromptTemplate,
  type PromptExperiment,
  type ExperimentVariant,
  type PromptMetrics,
  type OptimizationSuggestion,
  type PromptOptimizerConfig,

  // Classes
  PromptOptimizer,

  // Constants
  DEFAULT_PROMPT_OPTIMIZER_CONFIG,
} from './prompt-optimizer.js';

// Learning Signal Processor - Pattern detection and training data generation
export {
  // Types
  type LearningSignal,
  type LearningSignalType,
  type LearningAggregate,
  type LearningPattern,
  type PatternType,
  type TrainingExample,
  type TrainingExampleStatus,
  type TrainingExportFormat,
  type LearningSignalProcessorConfig,

  // Classes
  LearningSignalProcessor,

  // Constants
  DEFAULT_LEARNING_SIGNAL_PROCESSOR_CONFIG,
} from './learning-signal-processor.js';

// Re-export combined types for convenience
export type SelfLearningConfig = {
  outcomeTracker: import('./outcome-tracker.js').OutcomeTrackerConfig;
  promptOptimizer: import('./prompt-optimizer.js').PromptOptimizerConfig;
  learningSignalProcessor: import('./learning-signal-processor.js').LearningSignalProcessorConfig;
};

/**
 * Create a default self-learning configuration
 */
export function createDefaultSelfLearningConfig(): SelfLearningConfig {
  return {
    outcomeTracker: {
      feedbackWindowHours: 72,
      minFeedbackForEffectiveness: 5,
      syncIntervalMs: 60000,
    },
    promptOptimizer: {
      minSampleSize: 100,
      confidenceLevel: 0.95,
      improvementThreshold: 0.05,
      maxConcurrentExperiments: 5,
      autoPromoteWinners: true,
    },
    learningSignalProcessor: {
      aggregationWindowHours: 24,
      minSignalsForPattern: 10,
      patternConfidenceThreshold: 0.8,
      trainingExampleMinScore: 0.8,
      maxTrainingExamplesPerExport: 10000,
    },
  };
}

/**
 * Self-Learning System Manager
 *
 * Coordinates all self-learning components for unified operation.
 */
export class SelfLearningManager {
  private outcomeTracker: import('./outcome-tracker.js').OutcomeTracker | null = null;
  private promptOptimizer: import('./prompt-optimizer.js').PromptOptimizer | null = null;
  private learningProcessor: import('./learning-signal-processor.js').LearningSignalProcessor | null =
    null;
  private initialized = false;

  constructor(
    private db: import('pg').Pool,
    private redis: import('ioredis').Redis,
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

    this.promptOptimizer = new PromptOptimizer(this.db, this.redis, this.config.promptOptimizer);

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
  getOutcomeTracker(): import('./outcome-tracker.js').OutcomeTracker {
    if (!this.outcomeTracker) {
      throw new Error('SelfLearningManager not initialized. Call initialize() first.');
    }
    return this.outcomeTracker;
  }

  /**
   * Get the prompt optimizer instance
   */
  getPromptOptimizer(): import('./prompt-optimizer.js').PromptOptimizer {
    if (!this.promptOptimizer) {
      throw new Error('SelfLearningManager not initialized. Call initialize() first.');
    }
    return this.promptOptimizer;
  }

  /**
   * Get the learning signal processor instance
   */
  getLearningProcessor(): import('./learning-signal-processor.js').LearningSignalProcessor {
    if (!this.learningProcessor) {
      throw new Error('SelfLearningManager not initialized. Call initialize() first.');
    }
    return this.learningProcessor;
  }

  /**
   * Record an AI action and its outcome
   */
  async recordActionWithOutcome(
    action: Omit<import('./outcome-tracker.js').TrackedAIAction, 'id' | 'createdAt'>
  ): Promise<string> {
    const tracker = this.getOutcomeTracker();
    return tracker.trackAction(action);
  }

  /**
   * Record feedback and generate learning signal
   */
  async recordFeedbackWithSignal(
    actionId: string,
    feedback: Omit<import('./outcome-tracker.js').ActionFeedback, 'actionId' | 'feedbackAt'>
  ): Promise<void> {
    const tracker = this.getOutcomeTracker();
    const processor = this.getLearningProcessor();

    // Record the feedback
    await tracker.recordFeedback({ ...feedback, actionId, feedbackAt: new Date() });

    // Generate corresponding learning signal
    const signalType = this.feedbackToSignalType(feedback);
    if (signalType) {
      await processor.recordSignal({
        signalType,
        sourceType: 'user_feedback',
        sourceId: actionId,
        learnerId: feedback.userId || 'unknown',
        agentType: 'unknown', // Will be enriched from action data
        actionType: 'unknown',
        context: feedback.context || {},
        signalValue: feedback.rating ? feedback.rating / 5 : feedback.wasAccepted ? 1 : 0,
        confidence: 1.0,
      });
    }
  }

  /**
   * Run daily learning cycle
   */
  async runLearningCycle(): Promise<{
    patternsDetected: number;
    trainingExamplesGenerated: number;
    promptsOptimized: number;
  }> {
    const processor = this.getLearningProcessor();
    const optimizer = this.getPromptOptimizer();

    // Aggregate recent signals
    await processor.aggregateSignals();

    // Detect patterns
    const patterns = await processor.detectPatterns();

    // Generate training examples
    const examples = await processor.generateTrainingExamples();

    // Check for winning experiments
    const experiments = await optimizer.getActiveExperiments();
    let promptsOptimized = 0;

    for (const exp of experiments) {
      const analysis = await optimizer.analyzeExperiment(exp.id);
      if (analysis.hasWinner && analysis.recommendation === 'promote') {
        promptsOptimized++;
      }
    }

    return {
      patternsDetected: patterns.length,
      trainingExamplesGenerated: examples.length,
      promptsOptimized,
    };
  }

  /**
   * Export training data for fine-tuning
   */
  async exportTrainingData(
    format: import('./learning-signal-processor.js').TrainingExportFormat = 'openai_jsonl',
    options: { minScore?: number; limit?: number } = {}
  ): Promise<string> {
    const processor = this.getLearningProcessor();
    return processor.exportTrainingData(format, options);
  }

  /**
   * Get system learning metrics
   */
  async getLearningMetrics(): Promise<{
    totalActions: number;
    feedbackRate: number;
    acceptanceRate: number;
    avgRating: number;
    activeExperiments: number;
    patternsDetected: number;
    trainingExamples: number;
  }> {
    const tracker = this.getOutcomeTracker();
    const optimizer = this.getPromptOptimizer();
    const processor = this.getLearningProcessor();

    // Get metrics from each component
    const [actionStats, experiments, patterns, examples] = await Promise.all([
      this.db.query(`
        SELECT
          COUNT(*) as total_actions,
          COUNT(CASE WHEN feedback_received THEN 1 END)::float / NULLIF(COUNT(*), 0) as feedback_rate,
          AVG(CASE WHEN was_accepted THEN 1 ELSE 0 END) as acceptance_rate,
          AVG(user_rating) as avg_rating
        FROM tracked_ai_actions
        WHERE created_at > NOW() - INTERVAL '30 days'
      `),
      optimizer.getActiveExperiments(),
      this.db.query(`SELECT COUNT(*) as count FROM learning_patterns WHERE is_active = true`),
      this.db.query(
        `SELECT COUNT(*) as count FROM training_examples WHERE status = 'approved' OR status = 'pending'`
      ),
    ]);

    const stats = actionStats.rows[0] || {};

    return {
      totalActions: parseInt(stats.total_actions) || 0,
      feedbackRate: parseFloat(stats.feedback_rate) || 0,
      acceptanceRate: parseFloat(stats.acceptance_rate) || 0,
      avgRating: parseFloat(stats.avg_rating) || 0,
      activeExperiments: experiments.length,
      patternsDetected: parseInt(patterns.rows[0]?.count) || 0,
      trainingExamples: parseInt(examples.rows[0]?.count) || 0,
    };
  }

  /**
   * Convert feedback type to learning signal type
   */
  private feedbackToSignalType(
    feedback: Omit<import('./outcome-tracker.js').ActionFeedback, 'actionId' | 'feedbackAt'>
  ): import('./learning-signal-processor.js').LearningSignalType | null {
    if (feedback.wasAccepted === true) {
      return 'ACCEPTANCE';
    }
    if (feedback.wasAccepted === false) {
      return 'REJECTION';
    }
    if (feedback.userModification) {
      return 'IMPROVEMENT';
    }
    if (feedback.rating !== undefined) {
      return feedback.rating >= 4 ? 'POSITIVE_OUTCOME' : 'NEGATIVE_OUTCOME';
    }
    return null;
  }
}
