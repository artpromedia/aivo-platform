/**
 * Tenant Learning Agent
 *
 * Handles local model training for each tenant in the federated learning system.
 * Ensures privacy by only exposing noised gradients, never raw data.
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import {
  type TenantId,
  type RoundId,
  type FederatedModelType,
  type LocalModel,
  type GradientUpdate,
  type ModelWeights,
  type LocalMetrics,
  type TenantFederatedConfig,
  type PrivacyAccountant,
  type DifferentialPrivacyConfig,
  type FederatedRoundConfig,
  PRIVACY_CONFIGS,
  DEFAULT_TENANT_CONFIG,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

export interface TenantLearningAgentConfig {
  tenantId: TenantId;
  batchSize: number;
  localEpochs: number;
  learningRate: number;
  validationSplit: number;
  maxGradientNorm: number;
}

export const DEFAULT_AGENT_CONFIG: TenantLearningAgentConfig = {
  tenantId: '',
  batchSize: 32,
  localEpochs: 5,
  learningRate: 0.001,
  validationSplit: 0.2,
  maxGradientNorm: 1.0,
};

// ════════════════════════════════════════════════════════════════════════════════
// TENANT LEARNING AGENT
// ════════════════════════════════════════════════════════════════════════════════

export class TenantLearningAgent {
  private config: TenantLearningAgentConfig;
  private federatedConfig: TenantFederatedConfig;
  private privacyAccountant: PrivacyAccountant;
  private currentModel: Map<FederatedModelType, LocalModel> = new Map();

  constructor(
    private db: Pool,
    private redis: Redis,
    private tenantId: TenantId,
    agentConfig: Partial<TenantLearningAgentConfig> = {}
  ) {
    this.config = { ...DEFAULT_AGENT_CONFIG, ...agentConfig, tenantId };
    this.federatedConfig = this.initializeFederatedConfig();
    this.privacyAccountant = this.initializePrivacyAccountant();
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Initialization
  // ──────────────────────────────────────────────────────────────────────────────

  private initializeFederatedConfig(): TenantFederatedConfig {
    return {
      ...(DEFAULT_TENANT_CONFIG as TenantFederatedConfig),
      tenantId: this.tenantId,
    };
  }

  private initializePrivacyAccountant(): PrivacyAccountant {
    return {
      tenantId: this.tenantId,
      totalBudget: this.federatedConfig.maxPrivacyBudget,
      usedBudget: 0,
      remainingBudget: this.federatedConfig.maxPrivacyBudget,
      roundContributions: [],
      currentEpsilon: 0,
      currentDelta: 0,
    };
  }

  /**
   * Load tenant configuration from database
   */
  async loadConfiguration(): Promise<void> {
    const result = await this.db.query(
      `SELECT * FROM tenant_federated_config WHERE tenant_id = $1`,
      [this.tenantId]
    );

    if (result.rows.length > 0) {
      const row = result.rows[0];
      this.federatedConfig = {
        tenantId: row.tenant_id,
        enabled: row.enabled,
        autoParticipate: row.auto_participate,
        privacyLevel: row.privacy_level,
        maxPrivacyBudget: parseFloat(row.max_privacy_budget),
        currentPrivacyBudget: parseFloat(row.current_privacy_budget),
        sharePatterns: row.share_patterns,
        shareEffectiveness: row.share_effectiveness,
        shareEmbeddings: row.share_embeddings,
        enabledModelTypes: row.enabled_model_types,
        minLocalExamples: row.min_local_examples,
        autoApplyUpdates: row.auto_apply_updates,
        requireApproval: row.require_approval,
      };

      this.privacyAccountant.totalBudget = this.federatedConfig.maxPrivacyBudget;
      this.privacyAccountant.usedBudget = this.federatedConfig.currentPrivacyBudget;
      this.privacyAccountant.remainingBudget =
        this.federatedConfig.maxPrivacyBudget - this.federatedConfig.currentPrivacyBudget;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Eligibility Checks
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Check if tenant is eligible to participate in a round
   */
  async checkEligibility(roundConfig: FederatedRoundConfig): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    // Check if federated learning is enabled
    if (!this.federatedConfig.enabled) {
      return { eligible: false, reason: 'Federated learning not enabled for tenant' };
    }

    // Check if model type is enabled
    if (!this.federatedConfig.enabledModelTypes.includes(roundConfig.modelType)) {
      return { eligible: false, reason: `Model type ${roundConfig.modelType} not enabled` };
    }

    // Check privacy budget
    const requiredBudget = roundConfig.targetEpsilon;
    if (this.privacyAccountant.remainingBudget < requiredBudget) {
      return {
        eligible: false,
        reason: `Insufficient privacy budget (need ${requiredBudget}, have ${this.privacyAccountant.remainingBudget})`,
      };
    }

    // Check data availability
    const dataCount = await this.getLocalDataCount(roundConfig.modelType);
    if (dataCount < this.federatedConfig.minLocalExamples) {
      return {
        eligible: false,
        reason: `Insufficient local data (need ${this.federatedConfig.minLocalExamples}, have ${dataCount})`,
      };
    }

    if (dataCount < roundConfig.minSamplesPerTenant) {
      return {
        eligible: false,
        reason: `Below round minimum (need ${roundConfig.minSamplesPerTenant}, have ${dataCount})`,
      };
    }

    return { eligible: true };
  }

  /**
   * Get count of local training data
   */
  private async getLocalDataCount(modelType: FederatedModelType): Promise<number> {
    let tableName: string;
    let countColumn = 'COUNT(*)';

    switch (modelType) {
      case 'prompt_effectiveness':
        tableName = 'tracked_ai_actions';
        break;
      case 'pattern_weights':
        tableName = 'learning_signals';
        break;
      case 'prompt_embeddings':
        tableName = 'prompt_templates';
        break;
      case 'action_preferences':
        tableName = 'tracked_ai_actions';
        break;
      default:
        return 0;
    }

    const result = await this.db.query(
      `SELECT ${countColumn} as count FROM ${tableName} WHERE tenant_id = $1`,
      [this.tenantId]
    );

    return Number.parseInt(result.rows[0]?.count || '0');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Local Training
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Train local model on tenant's data
   */
  async trainLocalModel(
    roundConfig: FederatedRoundConfig,
    globalModel?: ModelWeights
  ): Promise<LocalModel> {
    // Load local training data
    const trainingData = await this.loadTrainingData(roundConfig.modelType);

    // Split into train/validation
    const splitIndex = Math.floor(trainingData.length * (1 - this.config.validationSplit));
    const trainData = trainingData.slice(0, splitIndex);
    const valData = trainingData.slice(splitIndex);

    // Initialize weights from global model or randomly
    let weights = globalModel || this.initializeWeights(roundConfig.modelType);

    // Training loop
    let trainingLoss = 0;
    for (let epoch = 0; epoch < this.config.localEpochs; epoch++) {
      // Shuffle training data
      const shuffled = this.shuffle(trainData);

      // Mini-batch training
      for (let i = 0; i < shuffled.length; i += this.config.batchSize) {
        const batch = shuffled.slice(i, i + this.config.batchSize);
        const { loss, gradients } = this.computeBatchGradient(
          batch,
          weights,
          roundConfig.modelType
        );

        // Gradient descent step
        weights = this.applyGradients(weights, gradients, this.config.learningRate);
        trainingLoss = loss;
      }
    }

    // Compute validation loss
    const validationLoss = this.computeLoss(valData, weights, roundConfig.modelType);

    const localModel: LocalModel = {
      tenantId: this.tenantId,
      modelType: roundConfig.modelType,
      version: (this.currentModel.get(roundConfig.modelType)?.version || 0) + 1,
      weights,
      trainingExamples: trainData.length,
      trainingLoss,
      validationLoss,
      privacyBudgetUsed: 0, // Will be set when computing gradient update
      trainedAt: new Date(),
    };

    // Cache the model
    this.currentModel.set(roundConfig.modelType, localModel);

    return localModel;
  }

  /**
   * Load training data for the model type
   */
  private async loadTrainingData(modelType: FederatedModelType): Promise<TrainingExample[]> {
    switch (modelType) {
      case 'prompt_effectiveness':
        return this.loadPromptEffectivenessData();
      case 'pattern_weights':
        return this.loadPatternData();
      case 'action_preferences':
        return this.loadActionPreferenceData();
      default:
        return [];
    }
  }

  private async loadPromptEffectivenessData(): Promise<TrainingExample[]> {
    const result = await this.db.query(
      `
      SELECT
        a.id,
        a.agent_type,
        a.action_type,
        a.confidence,
        a.was_accepted,
        a.user_rating,
        pt.name as prompt_name,
        pt.category as prompt_category
      FROM tracked_ai_actions a
      LEFT JOIN prompt_templates pt ON a.prompt_template_id = pt.id
      WHERE a.tenant_id = $1
        AND a.feedback_received = true
      ORDER BY a.created_at DESC
      LIMIT 10000
    `,
      [this.tenantId]
    );

    return result.rows.map((row) => ({
      features: this.extractPromptFeatures(row),
      label: this.computeEffectivenessLabel(row),
      weight: 1.0,
    }));
  }

  private async loadPatternData(): Promise<TrainingExample[]> {
    const result = await this.db.query(
      `
      SELECT
        signal_type,
        agent_type,
        action_type,
        signal_value,
        confidence
      FROM learning_signals
      WHERE tenant_id = $1
      ORDER BY created_at DESC
      LIMIT 10000
    `,
      [this.tenantId]
    );

    return result.rows.map((row) => ({
      features: [
        this.hashFeature(row.signal_type),
        this.hashFeature(row.agent_type),
        this.hashFeature(row.action_type),
        parseFloat(row.confidence),
      ],
      label: parseFloat(row.signal_value),
      weight: parseFloat(row.confidence),
    }));
  }

  private async loadActionPreferenceData(): Promise<TrainingExample[]> {
    const result = await this.db.query(
      `
      SELECT
        agent_type,
        action_type,
        action_category,
        confidence,
        was_accepted,
        user_rating
      FROM tracked_ai_actions
      WHERE tenant_id = $1
        AND was_accepted IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 10000
    `,
      [this.tenantId]
    );

    return result.rows.map((row) => ({
      features: [
        this.hashFeature(row.agent_type),
        this.hashFeature(row.action_type),
        this.hashFeature(row.action_category),
        parseFloat(row.confidence),
      ],
      label: row.was_accepted ? 1.0 : 0.0,
      weight: row.user_rating ? row.user_rating / 5.0 : 1.0,
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Gradient Computation
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Compute gradient update with differential privacy
   */
  async computeGradientUpdate(
    roundConfig: FederatedRoundConfig,
    localModel: LocalModel,
    globalModel?: ModelWeights
  ): Promise<GradientUpdate> {
    // Get privacy config
    const privacyConfig = PRIVACY_CONFIGS[roundConfig.privacyLevel];

    // Compute raw gradients (difference from global model)
    const rawGradients = this.computeModelDifference(
      localModel.weights,
      globalModel || this.initializeWeights(roundConfig.modelType)
    );

    // Clip gradients
    const clippedGradients = this.clipGradients(rawGradients, privacyConfig.clipNorm);

    // Add noise for differential privacy
    const { noisedGradients, noiseScale } = this.addDifferentialPrivacyNoise(
      clippedGradients,
      privacyConfig
    );

    // Compute local metrics (without exposing raw data)
    const localMetrics = await this.computeLocalMetrics(localModel);

    // Update privacy accountant
    this.updatePrivacyBudget(privacyConfig.epsilon, privacyConfig.delta);

    return {
      tenantId: this.tenantId,
      roundId: roundConfig.roundId,
      modelType: roundConfig.modelType,
      gradients: noisedGradients,
      sampleWeight: localModel.trainingExamples,
      noiseScale,
      privacyEpsilon: privacyConfig.epsilon,
      localMetrics,
      computedAt: new Date(),
    };
  }

  /**
   * Compute difference between local and global model
   */
  private computeModelDifference(local: ModelWeights, global: ModelWeights): ModelWeights {
    const diff: ModelWeights = { dimensions: local.dimensions };

    if (local.effectivenessWeights && global.effectivenessWeights) {
      diff.effectivenessWeights = local.effectivenessWeights.map(
        (w, i) => w - (global.effectivenessWeights?.[i] || 0)
      );
    }

    if (local.patternWeights && global.patternWeights) {
      diff.patternWeights = {};
      for (const key of Object.keys(local.patternWeights)) {
        diff.patternWeights[key] =
          local.patternWeights[key] - (global.patternWeights[key] || 0);
      }
    }

    if (local.biases && global.biases) {
      diff.biases = local.biases.map((b, i) => b - (global.biases?.[i] || 0));
    }

    return diff;
  }

  /**
   * Clip gradients to bound sensitivity
   */
  private clipGradients(gradients: ModelWeights, maxNorm: number): ModelWeights {
    const norm = this.computeGradientNorm(gradients);
    if (norm <= maxNorm) return gradients;

    const scale = maxNorm / norm;
    return this.scaleWeights(gradients, scale);
  }

  /**
   * Add differential privacy noise to gradients
   */
  private addDifferentialPrivacyNoise(
    gradients: ModelWeights,
    config: DifferentialPrivacyConfig
  ): { noisedGradients: ModelWeights; noiseScale: number } {
    const noiseScale = (config.sensitivity * Math.sqrt(2 * Math.log(1.25 / config.delta))) / config.epsilon;

    const noisedGradients: ModelWeights = { dimensions: gradients.dimensions };

    if (gradients.effectivenessWeights) {
      noisedGradients.effectivenessWeights = gradients.effectivenessWeights.map(
        (w) => w + this.sampleGaussian(0, noiseScale)
      );
    }

    if (gradients.patternWeights) {
      noisedGradients.patternWeights = {};
      for (const [key, value] of Object.entries(gradients.patternWeights)) {
        noisedGradients.patternWeights[key] = value + this.sampleGaussian(0, noiseScale);
      }
    }

    if (gradients.biases) {
      noisedGradients.biases = gradients.biases.map(
        (b) => b + this.sampleGaussian(0, noiseScale)
      );
    }

    return { noisedGradients, noiseScale };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Model Application
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Apply aggregated model update from server
   */
  async applyModelUpdate(
    modelType: FederatedModelType,
    aggregatedWeights: ModelWeights,
    requireApproval: boolean = this.federatedConfig.requireApproval
  ): Promise<{ applied: boolean; pendingApproval: boolean }> {
    if (requireApproval && !this.federatedConfig.autoApplyUpdates) {
      // Store for approval
      await this.storePendingUpdate(modelType, aggregatedWeights);
      return { applied: false, pendingApproval: true };
    }

    // Apply the update
    const currentModel = this.currentModel.get(modelType);
    if (currentModel) {
      currentModel.weights = aggregatedWeights;
      currentModel.version += 1;
    } else {
      this.currentModel.set(modelType, {
        tenantId: this.tenantId,
        modelType,
        version: 1,
        weights: aggregatedWeights,
        trainingExamples: 0,
        trainingLoss: 0,
        privacyBudgetUsed: 0,
        trainedAt: new Date(),
      });
    }

    // Persist to database
    await this.persistModelUpdate(modelType, aggregatedWeights);

    return { applied: true, pendingApproval: false };
  }

  private async storePendingUpdate(
    modelType: FederatedModelType,
    weights: ModelWeights
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO pending_model_updates (tenant_id, model_type, weights, created_at)
      VALUES ($1, $2, $3, NOW())
    `,
      [this.tenantId, modelType, JSON.stringify(weights)]
    );
  }

  private async persistModelUpdate(
    modelType: FederatedModelType,
    weights: ModelWeights
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO tenant_models (tenant_id, model_type, weights, version, updated_at)
      VALUES ($1, $2, $3, 1, NOW())
      ON CONFLICT (tenant_id, model_type)
      DO UPDATE SET
        weights = EXCLUDED.weights,
        version = tenant_models.version + 1,
        updated_at = NOW()
    `,
      [this.tenantId, modelType, JSON.stringify(weights)]
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Privacy Accounting
  // ──────────────────────────────────────────────────────────────────────────────

  private updatePrivacyBudget(epsilon: number, delta: number): void {
    this.privacyAccountant.usedBudget += epsilon;
    this.privacyAccountant.remainingBudget = Math.max(
      0,
      this.privacyAccountant.totalBudget - this.privacyAccountant.usedBudget
    );

    // Update composed privacy guarantee (using RDP composition)
    const compositions = this.privacyAccountant.roundContributions.length + 1;
    this.privacyAccountant.currentEpsilon = Math.sqrt(compositions) * epsilon;
    this.privacyAccountant.currentDelta = compositions * delta;

    this.privacyAccountant.roundContributions.push({
      roundId: 'current',
      epsilon,
      delta,
      timestamp: new Date(),
    });

    // Persist to database
    this.persistPrivacyBudget();
  }

  private async persistPrivacyBudget(): Promise<void> {
    await this.db.query(
      `
      UPDATE tenant_federated_config
      SET current_privacy_budget = $1
      WHERE tenant_id = $2
    `,
      [this.privacyAccountant.usedBudget, this.tenantId]
    );
  }

  /**
   * Get remaining privacy budget
   */
  getRemainingPrivacyBudget(): number {
    return this.privacyAccountant.remainingBudget;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Utility Methods
  // ──────────────────────────────────────────────────────────────────────────────

  private initializeWeights(modelType: FederatedModelType): ModelWeights {
    switch (modelType) {
      case 'prompt_effectiveness':
        return {
          dimensions: [64],
          effectivenessWeights: Array(64).fill(0).map(() => this.sampleGaussian(0, 0.01)),
          biases: [0],
        };
      case 'pattern_weights':
        return {
          dimensions: [32],
          patternWeights: {},
          biases: Array(32).fill(0),
        };
      default:
        return { dimensions: [16], biases: Array(16).fill(0) };
    }
  }

  private extractPromptFeatures(row: Record<string, unknown>): number[] {
    return [
      this.hashFeature(row.agent_type as string),
      this.hashFeature(row.action_type as string),
      this.hashFeature(row.prompt_category as string),
      parseFloat(row.confidence as string) || 0,
    ];
  }

  private computeEffectivenessLabel(row: Record<string, unknown>): number {
    const accepted = row.was_accepted ? 0.5 : 0;
    const rating = row.user_rating ? (row.user_rating as number) / 10 : 0;
    return accepted + rating;
  }

  private hashFeature(value: string | undefined): number {
    if (!value) return 0;
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return (hash % 1000) / 1000;
  }

  private computeBatchGradient(
    batch: TrainingExample[],
    weights: ModelWeights,
    _modelType: FederatedModelType
  ): { loss: number; gradients: ModelWeights } {
    // Simplified gradient computation
    let totalLoss = 0;
    const gradients: ModelWeights = {
      dimensions: weights.dimensions,
      effectivenessWeights: weights.effectivenessWeights?.map(() => 0),
      biases: weights.biases?.map(() => 0),
    };

    for (const example of batch) {
      const prediction = this.predict(example.features, weights);
      const error = prediction - example.label;
      totalLoss += error * error;

      // Accumulate gradients
      if (gradients.effectivenessWeights) {
        for (let i = 0; i < gradients.effectivenessWeights.length && i < example.features.length; i++) {
          gradients.effectivenessWeights[i] += error * example.features[i] * example.weight;
        }
      }
    }

    // Average gradients
    if (gradients.effectivenessWeights) {
      gradients.effectivenessWeights = gradients.effectivenessWeights.map((g) => g / batch.length);
    }

    return { loss: totalLoss / batch.length, gradients };
  }

  private predict(features: number[], weights: ModelWeights): number {
    let sum = 0;
    if (weights.effectivenessWeights) {
      for (let i = 0; i < weights.effectivenessWeights.length && i < features.length; i++) {
        sum += weights.effectivenessWeights[i] * features[i];
      }
    }
    if (weights.biases && weights.biases.length > 0) {
      sum += weights.biases[0];
    }
    return 1 / (1 + Math.exp(-sum)); // Sigmoid
  }

  private computeLoss(
    data: TrainingExample[],
    weights: ModelWeights,
    _modelType: FederatedModelType
  ): number {
    let totalLoss = 0;
    for (const example of data) {
      const prediction = this.predict(example.features, weights);
      const error = prediction - example.label;
      totalLoss += error * error;
    }
    return totalLoss / data.length;
  }

  private applyGradients(
    weights: ModelWeights,
    gradients: ModelWeights,
    learningRate: number
  ): ModelWeights {
    const updated: ModelWeights = { dimensions: weights.dimensions };

    if (weights.effectivenessWeights && gradients.effectivenessWeights) {
      updated.effectivenessWeights = weights.effectivenessWeights.map(
        (w, i) => w - learningRate * (gradients.effectivenessWeights?.[i] || 0)
      );
    }

    if (weights.biases && gradients.biases) {
      updated.biases = weights.biases.map(
        (b, i) => b - learningRate * (gradients.biases?.[i] || 0)
      );
    }

    return updated;
  }

  private async computeLocalMetrics(model: LocalModel): Promise<LocalMetrics> {
    // Compute aggregate statistics without exposing raw data
    const result = await this.db.query(
      `
      SELECT
        AVG(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as mean_eff,
        STDDEV(CASE WHEN was_accepted THEN 1.0 ELSE 0.0 END) as std_eff,
        COUNT(*) as sample_count
      FROM tracked_ai_actions
      WHERE tenant_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
    `,
      [this.tenantId]
    );

    const stats = result.rows[0] || {};

    return {
      meanEffectiveness: parseFloat(stats.mean_eff) || 0,
      stdEffectiveness: parseFloat(stats.std_eff) || 0,
      sampleCount: Number.parseInt(stats.sample_count) || 0,
      validationLoss: model.validationLoss,
    };
  }

  private computeGradientNorm(weights: ModelWeights): number {
    let sumSquared = 0;

    if (weights.effectivenessWeights) {
      for (const w of weights.effectivenessWeights) {
        sumSquared += w * w;
      }
    }

    if (weights.biases) {
      for (const b of weights.biases) {
        sumSquared += b * b;
      }
    }

    if (weights.patternWeights) {
      for (const v of Object.values(weights.patternWeights)) {
        sumSquared += v * v;
      }
    }

    return Math.sqrt(sumSquared);
  }

  private scaleWeights(weights: ModelWeights, scale: number): ModelWeights {
    const scaled: ModelWeights = { dimensions: weights.dimensions };

    if (weights.effectivenessWeights) {
      scaled.effectivenessWeights = weights.effectivenessWeights.map((w) => w * scale);
    }

    if (weights.biases) {
      scaled.biases = weights.biases.map((b) => b * scale);
    }

    if (weights.patternWeights) {
      scaled.patternWeights = {};
      for (const [key, value] of Object.entries(weights.patternWeights)) {
        scaled.patternWeights[key] = value * scale;
      }
    }

    return scaled;
  }

  private sampleGaussian(mean: number, std: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + std * z;
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// INTERNAL TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface TrainingExample {
  features: number[];
  label: number;
  weight: number;
}
