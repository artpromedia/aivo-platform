/**
 * Federated Prompt Learning - Core Types and Interfaces
 *
 * Enables cross-tenant prompt learning while preserving privacy through:
 * - Local model training per tenant
 * - Secure gradient/pattern aggregation
 * - Differential privacy guarantees
 * - Federated averaging for model updates
 */

// ════════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Unique identifier for a tenant in the federated learning system
 */
export type TenantId = string;

/**
 * Unique identifier for a federated learning round
 */
export type RoundId = string;

/**
 * Status of a federated learning round
 */
export type FederatedRoundStatus =
  | 'initializing'
  | 'collecting'
  | 'aggregating'
  | 'distributing'
  | 'completed'
  | 'failed';

/**
 * Type of model being federated
 */
export type FederatedModelType =
  | 'prompt_embeddings'
  | 'prompt_effectiveness'
  | 'action_preferences'
  | 'pattern_weights';

/**
 * Privacy level for federated contributions
 */
export type PrivacyLevel = 'standard' | 'enhanced' | 'maximum';

// ════════════════════════════════════════════════════════════════════════════════
// MODEL TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Represents a local model trained on tenant data
 */
export interface LocalModel {
  tenantId: TenantId;
  modelType: FederatedModelType;
  version: number;

  // Model weights (abstract representation)
  weights: ModelWeights;

  // Training metadata
  trainingExamples: number;
  trainingLoss: number;
  validationLoss?: number;

  // Privacy accounting
  privacyBudgetUsed: number;

  // Timestamps
  trainedAt: Date;
}

/**
 * Abstract representation of model weights
 * In practice, these would be tensors/vectors
 */
export interface ModelWeights {
  // Embedding weights for prompt components
  promptEmbeddings?: number[][];

  // Effectiveness prediction weights
  effectivenessWeights?: number[];

  // Pattern recognition weights
  patternWeights?: Record<string, number>;

  // Bias terms
  biases?: number[];

  // Metadata about the weights
  dimensions: number[];
  sparsity?: number;
}

/**
 * Gradient update from local training
 * This is what gets shared (not raw data)
 */
export interface GradientUpdate {
  tenantId: TenantId;
  roundId: RoundId;
  modelType: FederatedModelType;

  // Gradient values (noised for privacy)
  gradients: ModelWeights;

  // Weight for averaging (based on data quantity)
  sampleWeight: number;

  // Privacy noise added
  noiseScale: number;
  privacyEpsilon: number;

  // Validation metrics (without raw data)
  localMetrics: LocalMetrics;

  // Timestamp
  computedAt: Date;
}

/**
 * Aggregated model from federated averaging
 */
export interface AggregatedModel {
  roundId: RoundId;
  modelType: FederatedModelType;
  version: number;

  // Aggregated weights
  weights: ModelWeights;

  // Aggregation metadata
  contributingTenants: number;
  totalSamples: number;

  // Combined privacy budget
  combinedPrivacyEpsilon: number;

  // Performance metrics
  aggregatedMetrics: AggregatedMetrics;

  // Timestamps
  aggregatedAt: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// METRICS TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Local metrics computed per tenant (no raw data exposed)
 */
export interface LocalMetrics {
  // Aggregate statistics only
  meanEffectiveness: number;
  stdEffectiveness: number;
  sampleCount: number;

  // Performance on local validation set
  validationAccuracy?: number;
  validationLoss?: number;

  // Improvement over previous round
  improvementDelta?: number;
}

/**
 * Aggregated metrics across all participating tenants
 */
export interface AggregatedMetrics {
  // Weighted average performance
  globalMeanEffectiveness: number;
  globalStdEffectiveness: number;
  totalSampleCount: number;

  // Convergence metrics
  modelDivergence: number;
  roundImprovement: number;

  // Participation metrics
  participationRate: number;
  averageContribution: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUND MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Configuration for a federated learning round
 */
export interface FederatedRoundConfig {
  // Round identification
  roundId: RoundId;
  modelType: FederatedModelType;

  // Participation requirements
  minParticipants: number;
  maxParticipants: number;
  minSamplesPerTenant: number;

  // Timing
  collectionDeadline: Date;
  roundTimeout: number; // ms

  // Privacy settings
  privacyLevel: PrivacyLevel;
  targetEpsilon: number;
  targetDelta: number;

  // Aggregation settings
  aggregationMethod: 'fedavg' | 'fedprox' | 'scaffold';
  clipNorm: number;
  learningRate: number;

  // Selection criteria for participants
  selectionCriteria?: TenantSelectionCriteria;
}

/**
 * Criteria for selecting participating tenants
 */
export interface TenantSelectionCriteria {
  // Minimum data requirements
  minTrainingExamples?: number;
  minDataQuality?: number;

  // Activity requirements
  minRecentActivity?: number; // days
  minFeedbackRate?: number;

  // Optional: specific tenant types
  tenantTypes?: string[];

  // Exclude specific tenants
  excludeTenants?: TenantId[];
}

/**
 * State of a federated learning round
 */
export interface FederatedRound {
  config: FederatedRoundConfig;
  status: FederatedRoundStatus;

  // Participants
  eligibleTenants: TenantId[];
  participatingTenants: TenantId[];
  receivedContributions: Map<TenantId, GradientUpdate>;

  // Results
  aggregatedModel?: AggregatedModel;
  distributedTo: TenantId[];

  // Error handling
  errors: RoundError[];

  // Timestamps
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Error during a round
 */
export interface RoundError {
  tenantId?: TenantId;
  phase: 'collection' | 'aggregation' | 'distribution';
  error: string;
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// TENANT CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Tenant's federated learning configuration
 */
export interface TenantFederatedConfig {
  tenantId: TenantId;

  // Participation settings
  enabled: boolean;
  autoParticipate: boolean;

  // Privacy preferences
  privacyLevel: PrivacyLevel;
  maxPrivacyBudget: number; // total epsilon allowed
  currentPrivacyBudget: number; // epsilon used so far

  // Data sharing preferences
  sharePatterns: boolean;
  shareEffectiveness: boolean;
  shareEmbeddings: boolean;

  // Model types to participate in
  enabledModelTypes: FederatedModelType[];

  // Minimum local data before participating
  minLocalExamples: number;

  // Update preferences
  autoApplyUpdates: boolean;
  requireApproval: boolean;
}

/**
 * Tenant's participation history
 */
export interface TenantParticipationHistory {
  tenantId: TenantId;
  totalRoundsParticipated: number;
  totalContributions: number;
  averageContributionQuality: number;
  privacyBudgetUsed: number;
  lastParticipation?: Date;

  // Per-round history
  rounds: {
    roundId: RoundId;
    modelType: FederatedModelType;
    contributed: boolean;
    sampleWeight: number;
    localImprovement: number;
    participatedAt: Date;
  }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// DIFFERENTIAL PRIVACY
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Differential privacy configuration
 */
export interface DifferentialPrivacyConfig {
  // Privacy budget
  epsilon: number; // privacy loss parameter
  delta: number; // failure probability

  // Noise mechanism
  mechanism: 'gaussian' | 'laplace';
  sensitivity: number;

  // Gradient clipping
  clipNorm: number;
  clipMethod: 'global' | 'per_layer';

  // Composition
  compositionMethod: 'basic' | 'advanced' | 'rdp';
}

/**
 * Privacy accountant for tracking budget usage
 */
export interface PrivacyAccountant {
  tenantId: TenantId;

  // Budget tracking
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;

  // Per-round tracking
  roundContributions: {
    roundId: RoundId;
    epsilon: number;
    delta: number;
    timestamp: Date;
  }[];

  // Computed privacy guarantee
  currentEpsilon: number;
  currentDelta: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// SECURE AGGREGATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Secure aggregation configuration
 */
export interface SecureAggregationConfig {
  // Protocol settings
  protocol: 'simple' | 'secure_sum' | 'mpc';

  // For secure sum protocol
  threshold: number; // minimum participants to decrypt

  // Masking
  useMasking: boolean;
  maskSeed?: string;

  // Verification
  verifyContributions: boolean;
  outlierDetection: boolean;
  outlierThreshold: number;
}

/**
 * Masked contribution for secure aggregation
 */
export interface MaskedContribution {
  tenantId: TenantId;
  roundId: RoundId;

  // Masked gradient (cannot be decrypted individually)
  maskedGradient: number[];

  // Commitment for verification
  commitment: string;

  // Metadata (not masked)
  sampleWeight: number;
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Events emitted during federated learning
 */
export type FederatedLearningEvent =
  | { type: 'round_started'; roundId: RoundId; config: FederatedRoundConfig }
  | { type: 'tenant_joined'; roundId: RoundId; tenantId: TenantId }
  | { type: 'contribution_received'; roundId: RoundId; tenantId: TenantId }
  | { type: 'aggregation_started'; roundId: RoundId; contributionCount: number }
  | { type: 'aggregation_completed'; roundId: RoundId; model: AggregatedModel }
  | { type: 'model_distributed'; roundId: RoundId; tenantId: TenantId }
  | { type: 'round_completed'; roundId: RoundId; metrics: AggregatedMetrics }
  | { type: 'round_failed'; roundId: RoundId; error: string }
  | { type: 'privacy_budget_warning'; tenantId: TenantId; remaining: number }
  | { type: 'privacy_budget_exhausted'; tenantId: TenantId };

/**
 * Event handler type
 */
export type FederatedEventHandler = (event: FederatedLearningEvent) => void | Promise<void>;

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Default privacy configurations by level
 */
export const PRIVACY_CONFIGS: Record<PrivacyLevel, DifferentialPrivacyConfig> = {
  standard: {
    epsilon: 8.0,
    delta: 1e-5,
    mechanism: 'gaussian',
    sensitivity: 1.0,
    clipNorm: 1.0,
    clipMethod: 'global',
    compositionMethod: 'rdp',
  },
  enhanced: {
    epsilon: 4.0,
    delta: 1e-6,
    mechanism: 'gaussian',
    sensitivity: 0.5,
    clipNorm: 0.5,
    clipMethod: 'per_layer',
    compositionMethod: 'rdp',
  },
  maximum: {
    epsilon: 1.0,
    delta: 1e-7,
    mechanism: 'gaussian',
    sensitivity: 0.25,
    clipNorm: 0.25,
    clipMethod: 'per_layer',
    compositionMethod: 'rdp',
  },
};

/**
 * Default federated round configuration
 */
export const DEFAULT_ROUND_CONFIG: Partial<FederatedRoundConfig> = {
  minParticipants: 3,
  maxParticipants: 100,
  minSamplesPerTenant: 50,
  roundTimeout: 3600000, // 1 hour
  privacyLevel: 'standard',
  targetEpsilon: 8.0,
  targetDelta: 1e-5,
  aggregationMethod: 'fedavg',
  clipNorm: 1.0,
  learningRate: 0.01,
};

/**
 * Default tenant configuration
 */
export const DEFAULT_TENANT_CONFIG: Partial<TenantFederatedConfig> = {
  enabled: false,
  autoParticipate: false,
  privacyLevel: 'standard',
  maxPrivacyBudget: 100.0,
  currentPrivacyBudget: 0,
  sharePatterns: true,
  shareEffectiveness: true,
  shareEmbeddings: false,
  enabledModelTypes: ['prompt_effectiveness', 'pattern_weights'],
  minLocalExamples: 100,
  autoApplyUpdates: false,
  requireApproval: true,
};
