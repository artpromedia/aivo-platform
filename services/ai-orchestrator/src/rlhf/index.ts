/**
 * RLHF Fine-Tuning Module
 *
 * Provides infrastructure for fine-tuning models using RLHF techniques:
 *
 * - **Fine-Tuning Manager**: End-to-end job management
 * - **Provider Adapters**: OpenAI and Anthropic integration
 * - **Training Data Pipeline**: Quality-scored example management
 * - **Model Versioning**: Deployment and lifecycle management
 *
 * @module ai-orchestrator/rlhf
 */

export {
  // Types
  type FineTuningProvider,
  type FineTuningJobStatus,
  type FineTuningJobConfig,
  type TrainingDataQuery,
  type HyperParameters,
  type FineTuningJob,
  type TrainingMetrics,
  type FineTunedModel,
  type FineTuningManagerConfig,

  // Classes
  FineTuningManager,

  // Constants
  DEFAULT_FINE_TUNING_CONFIG,
} from './fine-tuning-manager.js';
