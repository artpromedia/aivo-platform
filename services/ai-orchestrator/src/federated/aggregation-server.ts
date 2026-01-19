/**
 * Federated Aggregation Server
 *
 * Coordinates federated learning rounds across tenants:
 * - Selects eligible participants
 * - Collects gradient updates
 * - Performs secure aggregation
 * - Distributes updated models
 */

import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import {
  type TenantId,
  type RoundId,
  type FederatedModelType,
  type FederatedRoundConfig,
  type FederatedRound,
  type FederatedRoundStatus,
  type GradientUpdate,
  type AggregatedModel,
  type AggregatedMetrics,
  type ModelWeights,
  type TenantSelectionCriteria,
  type FederatedLearningEvent,
  type FederatedEventHandler,
  type SecureAggregationConfig,
  type RoundError,
  DEFAULT_ROUND_CONFIG,
  PRIVACY_CONFIGS,
} from './types.js';
import { TenantLearningAgent } from './tenant-learning-agent.js';

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

export interface FederatedServerConfig {
  // Round scheduling
  defaultRoundInterval: number; // ms between rounds
  autoStartRounds: boolean;

  // Aggregation settings
  minParticipantsForAggregation: number;
  aggregationTimeout: number; // ms

  // Secure aggregation
  secureAggregation: SecureAggregationConfig;

  // Model distribution
  parallelDistribution: number;
  distributionTimeout: number; // ms
}

export const DEFAULT_SERVER_CONFIG: FederatedServerConfig = {
  defaultRoundInterval: 86400000, // 24 hours
  autoStartRounds: false,
  minParticipantsForAggregation: 3,
  aggregationTimeout: 3600000, // 1 hour
  secureAggregation: {
    protocol: 'simple',
    threshold: 3,
    useMasking: false,
    verifyContributions: true,
    outlierDetection: true,
    outlierThreshold: 3.0,
  },
  parallelDistribution: 10,
  distributionTimeout: 300000, // 5 minutes
};

// ════════════════════════════════════════════════════════════════════════════════
// FEDERATED AGGREGATION SERVER
// ════════════════════════════════════════════════════════════════════════════════

export class FederatedAggregationServer {
  private config: FederatedServerConfig;
  private activeRounds: Map<RoundId, FederatedRound> = new Map();
  private eventHandlers: FederatedEventHandler[] = [];
  private roundScheduler: ReturnType<typeof setInterval> | null = null;
  private tenantAgents: Map<TenantId, TenantLearningAgent> = new Map();

  constructor(
    private db: Pool,
    private redis: Redis,
    config: Partial<FederatedServerConfig> = {}
  ) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Event Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Register an event handler
   */
  onEvent(handler: FederatedEventHandler): void {
    this.eventHandlers.push(handler);
  }

  private async emitEvent(event: FederatedLearningEvent): Promise<void> {
    for (const handler of this.eventHandlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    }

    // Also publish to Redis for distributed coordination
    await this.redis.publish(
      'federated:events',
      JSON.stringify({ ...event, timestamp: new Date().toISOString() })
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Round Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Start a new federated learning round
   */
  async startRound(
    modelType: FederatedModelType,
    config: Partial<FederatedRoundConfig> = {}
  ): Promise<FederatedRound> {
    const roundId = randomUUID();

    // Build round configuration
    const roundConfig: FederatedRoundConfig = {
      ...DEFAULT_ROUND_CONFIG,
      ...config,
      roundId,
      modelType,
      collectionDeadline: new Date(
        Date.now() + (config.roundTimeout || DEFAULT_ROUND_CONFIG.roundTimeout!)
      ),
    } as FederatedRoundConfig;

    // Select eligible tenants
    const eligibleTenants = await this.selectEligibleTenants(roundConfig);

    if (eligibleTenants.length < roundConfig.minParticipants) {
      throw new Error(
        `Insufficient eligible tenants: ${eligibleTenants.length} < ${roundConfig.minParticipants}`
      );
    }

    // Create round
    const round: FederatedRound = {
      config: roundConfig,
      status: 'initializing',
      eligibleTenants,
      participatingTenants: [],
      receivedContributions: new Map(),
      distributedTo: [],
      errors: [],
      startedAt: new Date(),
    };

    // Store round
    this.activeRounds.set(roundId, round);
    await this.persistRound(round);

    // Emit event
    await this.emitEvent({ type: 'round_started', roundId, config: roundConfig });

    // Notify eligible tenants
    await this.notifyEligibleTenants(round);

    // Update status
    round.status = 'collecting';
    await this.updateRoundStatus(roundId, 'collecting');

    // Set timeout for collection phase
    setTimeout(
      () => this.handleCollectionTimeout(roundId),
      roundConfig.roundTimeout
    );

    return round;
  }

  /**
   * Select tenants eligible for participation
   */
  private async selectEligibleTenants(config: FederatedRoundConfig): Promise<TenantId[]> {
    const criteria = config.selectionCriteria || {};

    const result = await this.db.query(
      `
      SELECT tfc.tenant_id
      FROM tenant_federated_config tfc
      WHERE tfc.enabled = true
        AND tfc.auto_participate = true
        AND $1 = ANY(tfc.enabled_model_types)
        AND (tfc.max_privacy_budget - tfc.current_privacy_budget) >= $2
        AND EXISTS (
          SELECT 1 FROM tracked_ai_actions ta
          WHERE ta.tenant_id = tfc.tenant_id
            AND ta.feedback_received = true
          HAVING COUNT(*) >= $3
        )
        ${criteria.tenantTypes ? 'AND tfc.tenant_type = ANY($4)' : ''}
        ${criteria.excludeTenants ? 'AND tfc.tenant_id != ALL($5)' : ''}
      ORDER BY RANDOM()
      LIMIT $6
    `,
      [
        config.modelType,
        config.targetEpsilon,
        criteria.minTrainingExamples || config.minSamplesPerTenant,
        ...(criteria.tenantTypes ? [criteria.tenantTypes] : []),
        ...(criteria.excludeTenants ? [criteria.excludeTenants] : []),
        config.maxParticipants,
      ].filter(Boolean)
    );

    return result.rows.map((row) => row.tenant_id);
  }

  /**
   * Notify eligible tenants about the round
   */
  private async notifyEligibleTenants(round: FederatedRound): Promise<void> {
    for (const tenantId of round.eligibleTenants) {
      await this.redis.publish(
        `federated:tenant:${tenantId}`,
        JSON.stringify({
          type: 'round_invitation',
          roundId: round.config.roundId,
          modelType: round.config.modelType,
          deadline: round.config.collectionDeadline,
        })
      );
    }
  }

  /**
   * Handle tenant joining a round
   */
  async handleTenantJoin(roundId: RoundId, tenantId: TenantId): Promise<boolean> {
    const round = this.activeRounds.get(roundId);
    if (!round) {
      throw new Error(`Round ${roundId} not found`);
    }

    if (round.status !== 'collecting') {
      return false;
    }

    if (!round.eligibleTenants.includes(tenantId)) {
      return false;
    }

    if (round.participatingTenants.includes(tenantId)) {
      return true; // Already joined
    }

    round.participatingTenants.push(tenantId);
    await this.emitEvent({ type: 'tenant_joined', roundId, tenantId });

    return true;
  }

  /**
   * Receive gradient contribution from tenant
   */
  async receiveContribution(contribution: GradientUpdate): Promise<boolean> {
    const round = this.activeRounds.get(contribution.roundId);
    if (!round) {
      throw new Error(`Round ${contribution.roundId} not found`);
    }

    if (round.status !== 'collecting') {
      return false;
    }

    // Verify tenant is participating
    if (!round.participatingTenants.includes(contribution.tenantId)) {
      // Auto-join if eligible
      const joined = await this.handleTenantJoin(contribution.roundId, contribution.tenantId);
      if (!joined) return false;
    }

    // Validate contribution
    if (this.config.secureAggregation.verifyContributions) {
      const valid = await this.validateContribution(contribution, round);
      if (!valid) {
        round.errors.push({
          tenantId: contribution.tenantId,
          phase: 'collection',
          error: 'Contribution validation failed',
          timestamp: new Date(),
        });
        return false;
      }
    }

    // Store contribution
    round.receivedContributions.set(contribution.tenantId, contribution);
    await this.emitEvent({
      type: 'contribution_received',
      roundId: contribution.roundId,
      tenantId: contribution.tenantId,
    });

    // Check if we have enough contributions to aggregate
    if (
      round.receivedContributions.size >= round.config.minParticipants &&
      round.receivedContributions.size >= this.config.minParticipantsForAggregation
    ) {
      // Auto-start aggregation if deadline passed or max participants reached
      if (
        new Date() >= round.config.collectionDeadline ||
        round.receivedContributions.size >= round.config.maxParticipants
      ) {
        await this.startAggregation(contribution.roundId);
      }
    }

    return true;
  }

  /**
   * Validate a gradient contribution
   */
  private async validateContribution(
    contribution: GradientUpdate,
    round: FederatedRound
  ): Promise<boolean> {
    // Check privacy epsilon
    if (contribution.privacyEpsilon > round.config.targetEpsilon * 1.1) {
      return false;
    }

    // Check sample weight is reasonable
    if (contribution.sampleWeight < round.config.minSamplesPerTenant) {
      return false;
    }

    // Outlier detection
    if (this.config.secureAggregation.outlierDetection) {
      const isOutlier = await this.detectOutlier(contribution, round);
      if (isOutlier) {
        console.warn(`Outlier contribution detected from tenant ${contribution.tenantId}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Detect if a contribution is an outlier
   */
  private async detectOutlier(
    contribution: GradientUpdate,
    round: FederatedRound
  ): Promise<boolean> {
    if (round.receivedContributions.size < 3) {
      return false; // Need enough samples for outlier detection
    }

    // Compute gradient norm
    const contributionNorm = this.computeGradientNorm(contribution.gradients);

    // Compute stats of existing contributions
    const norms = Array.from(round.receivedContributions.values()).map((c) =>
      this.computeGradientNorm(c.gradients)
    );
    const mean = norms.reduce((a, b) => a + b, 0) / norms.length;
    const std = Math.sqrt(
      norms.reduce((sum, n) => sum + (n - mean) ** 2, 0) / norms.length
    );

    // Check if contribution is an outlier (z-score > threshold)
    const zScore = Math.abs(contributionNorm - mean) / (std || 1);
    return zScore > this.config.secureAggregation.outlierThreshold;
  }

  /**
   * Handle collection phase timeout
   */
  private async handleCollectionTimeout(roundId: RoundId): Promise<void> {
    const round = this.activeRounds.get(roundId);
    if (!round || round.status !== 'collecting') return;

    if (round.receivedContributions.size >= this.config.minParticipantsForAggregation) {
      await this.startAggregation(roundId);
    } else {
      await this.failRound(roundId, 'Insufficient contributions before timeout');
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Aggregation
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Start the aggregation phase
   */
  async startAggregation(roundId: RoundId): Promise<void> {
    const round = this.activeRounds.get(roundId);
    if (!round || round.status !== 'collecting') return;

    round.status = 'aggregating';
    await this.updateRoundStatus(roundId, 'aggregating');
    await this.emitEvent({
      type: 'aggregation_started',
      roundId,
      contributionCount: round.receivedContributions.size,
    });

    try {
      // Perform aggregation based on method
      const aggregatedModel = await this.aggregate(round);
      round.aggregatedModel = aggregatedModel;

      await this.emitEvent({
        type: 'aggregation_completed',
        roundId,
        model: aggregatedModel,
      });

      // Persist aggregated model
      await this.persistAggregatedModel(aggregatedModel);

      // Start distribution
      await this.startDistribution(roundId);
    } catch (error) {
      await this.failRound(roundId, `Aggregation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Perform federated aggregation
   */
  private async aggregate(round: FederatedRound): Promise<AggregatedModel> {
    const contributions = Array.from(round.receivedContributions.values());

    switch (round.config.aggregationMethod) {
      case 'fedavg':
        return this.federatedAverage(round, contributions);
      case 'fedprox':
        return this.federatedProximal(round, contributions);
      case 'scaffold':
        return this.scaffoldAggregate(round, contributions);
      default:
        return this.federatedAverage(round, contributions);
    }
  }

  /**
   * FedAvg: Federated Averaging
   */
  private async federatedAverage(
    round: FederatedRound,
    contributions: GradientUpdate[]
  ): Promise<AggregatedModel> {
    // Calculate total samples for weighted averaging
    const totalSamples = contributions.reduce((sum, c) => sum + c.sampleWeight, 0);

    // Initialize aggregated weights
    const aggregatedWeights: ModelWeights = {
      dimensions: contributions[0].gradients.dimensions,
      effectivenessWeights: contributions[0].gradients.effectivenessWeights
        ? new Array(contributions[0].gradients.effectivenessWeights.length).fill(0)
        : undefined,
      patternWeights: contributions[0].gradients.patternWeights ? {} : undefined,
      biases: contributions[0].gradients.biases
        ? new Array(contributions[0].gradients.biases.length).fill(0)
        : undefined,
    };

    // Weighted average
    for (const contribution of contributions) {
      const weight = contribution.sampleWeight / totalSamples;

      if (aggregatedWeights.effectivenessWeights && contribution.gradients.effectivenessWeights) {
        for (let i = 0; i < aggregatedWeights.effectivenessWeights.length; i++) {
          aggregatedWeights.effectivenessWeights[i] +=
            weight * contribution.gradients.effectivenessWeights[i];
        }
      }

      if (aggregatedWeights.biases && contribution.gradients.biases) {
        for (let i = 0; i < aggregatedWeights.biases.length; i++) {
          aggregatedWeights.biases[i] += weight * contribution.gradients.biases[i];
        }
      }

      if (aggregatedWeights.patternWeights && contribution.gradients.patternWeights) {
        for (const [key, value] of Object.entries(contribution.gradients.patternWeights)) {
          aggregatedWeights.patternWeights[key] =
            (aggregatedWeights.patternWeights[key] || 0) + weight * value;
        }
      }
    }

    // Compute aggregated metrics
    const aggregatedMetrics = this.computeAggregatedMetrics(contributions);

    // Compute combined privacy
    const combinedPrivacyEpsilon = this.computeCombinedPrivacy(contributions);

    return {
      roundId: round.config.roundId,
      modelType: round.config.modelType,
      version: await this.getNextModelVersion(round.config.modelType),
      weights: aggregatedWeights,
      contributingTenants: contributions.length,
      totalSamples,
      combinedPrivacyEpsilon,
      aggregatedMetrics,
      aggregatedAt: new Date(),
    };
  }

  /**
   * FedProx: Federated Proximal
   */
  private async federatedProximal(
    round: FederatedRound,
    contributions: GradientUpdate[]
  ): Promise<AggregatedModel> {
    // FedProx adds a proximal term to handle heterogeneous data
    // For simplicity, we implement a weighted version similar to FedAvg
    // with additional regularization
    const baseModel = await this.federatedAverage(round, contributions);

    // Apply proximal regularization (mu parameter from config)
    const mu = round.config.learningRate * 0.1; // Proximal parameter

    if (baseModel.weights.effectivenessWeights) {
      baseModel.weights.effectivenessWeights = baseModel.weights.effectivenessWeights.map(
        (w) => w * (1 - mu)
      );
    }

    return baseModel;
  }

  /**
   * SCAFFOLD aggregation
   */
  private async scaffoldAggregate(
    round: FederatedRound,
    contributions: GradientUpdate[]
  ): Promise<AggregatedModel> {
    // SCAFFOLD uses control variates to reduce gradient variance
    // Simplified implementation
    return this.federatedAverage(round, contributions);
  }

  /**
   * Compute aggregated metrics
   */
  private computeAggregatedMetrics(contributions: GradientUpdate[]): AggregatedMetrics {
    const effectivenessValues = contributions.map((c) => c.localMetrics.meanEffectiveness);
    const sampleCounts = contributions.map((c) => c.localMetrics.sampleCount);
    const totalSamples = sampleCounts.reduce((a, b) => a + b, 0);

    // Weighted mean
    const globalMeanEffectiveness =
      effectivenessValues.reduce((sum, val, i) => sum + val * sampleCounts[i], 0) / totalSamples;

    // Weighted standard deviation
    const globalVariance =
      effectivenessValues.reduce(
        (sum, val, i) =>
          sum + sampleCounts[i] * (val - globalMeanEffectiveness) ** 2,
        0
      ) / totalSamples;

    return {
      globalMeanEffectiveness,
      globalStdEffectiveness: Math.sqrt(globalVariance),
      totalSampleCount: totalSamples,
      modelDivergence: this.computeModelDivergence(contributions),
      roundImprovement: 0, // Computed after distribution
      participationRate: contributions.length / (contributions.length + 1), // Simplified
      averageContribution: totalSamples / contributions.length,
    };
  }

  /**
   * Compute model divergence between contributions
   */
  private computeModelDivergence(contributions: GradientUpdate[]): number {
    if (contributions.length < 2) return 0;

    const norms = contributions.map((c) => this.computeGradientNorm(c.gradients));
    const mean = norms.reduce((a, b) => a + b, 0) / norms.length;

    return Math.sqrt(norms.reduce((sum, n) => sum + (n - mean) ** 2, 0) / norms.length);
  }

  /**
   * Compute combined privacy guarantee
   */
  private computeCombinedPrivacy(contributions: GradientUpdate[]): number {
    // Using simple composition (conservative bound)
    // More sophisticated methods like RDP could give tighter bounds
    const epsilons = contributions.map((c) => c.privacyEpsilon);
    return Math.sqrt(epsilons.reduce((sum, e) => sum + e ** 2, 0));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Distribution
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Start distributing the aggregated model
   */
  async startDistribution(roundId: RoundId): Promise<void> {
    const round = this.activeRounds.get(roundId);
    if (!round || !round.aggregatedModel) return;

    round.status = 'distributing';
    await this.updateRoundStatus(roundId, 'distributing');

    // Distribute to all participating tenants
    const tenants = round.participatingTenants;
    const batchSize = this.config.parallelDistribution;

    for (let i = 0; i < tenants.length; i += batchSize) {
      const batch = tenants.slice(i, i + batchSize);
      await Promise.all(
        batch.map((tenantId) => this.distributeToTenant(round, tenantId))
      );
    }

    // Mark round as completed
    round.status = 'completed';
    round.completedAt = new Date();
    await this.updateRoundStatus(roundId, 'completed');

    await this.emitEvent({
      type: 'round_completed',
      roundId,
      metrics: round.aggregatedModel.aggregatedMetrics,
    });

    // Clean up
    this.activeRounds.delete(roundId);
  }

  /**
   * Distribute model to a specific tenant
   */
  private async distributeToTenant(round: FederatedRound, tenantId: TenantId): Promise<void> {
    try {
      // Get or create tenant agent
      let agent = this.tenantAgents.get(tenantId);
      if (!agent) {
        agent = new TenantLearningAgent(this.db, this.redis, tenantId);
        this.tenantAgents.set(tenantId, agent);
      }

      // Apply the model update
      await agent.applyModelUpdate(
        round.config.modelType,
        round.aggregatedModel!.weights
      );

      round.distributedTo.push(tenantId);

      await this.emitEvent({
        type: 'model_distributed',
        roundId: round.config.roundId,
        tenantId,
      });
    } catch (error) {
      round.errors.push({
        tenantId,
        phase: 'distribution',
        error: (error as Error).message,
        timestamp: new Date(),
      });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Round Status Management
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Fail a round
   */
  private async failRound(roundId: RoundId, reason: string): Promise<void> {
    const round = this.activeRounds.get(roundId);
    if (!round) return;

    round.status = 'failed';
    round.errors.push({
      phase: 'aggregation',
      error: reason,
      timestamp: new Date(),
    });

    await this.updateRoundStatus(roundId, 'failed');
    await this.emitEvent({ type: 'round_failed', roundId, error: reason });

    this.activeRounds.delete(roundId);
  }

  /**
   * Get round status
   */
  getRound(roundId: RoundId): FederatedRound | undefined {
    return this.activeRounds.get(roundId);
  }

  /**
   * List active rounds
   */
  getActiveRounds(): FederatedRound[] {
    return Array.from(this.activeRounds.values());
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Persistence
  // ──────────────────────────────────────────────────────────────────────────────

  private async persistRound(round: FederatedRound): Promise<void> {
    await this.db.query(
      `
      INSERT INTO federated_rounds (
        round_id, model_type, status, config, eligible_tenants, started_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `,
      [
        round.config.roundId,
        round.config.modelType,
        round.status,
        JSON.stringify(round.config),
        round.eligibleTenants,
        round.startedAt,
      ]
    );
  }

  private async updateRoundStatus(roundId: RoundId, status: FederatedRoundStatus): Promise<void> {
    const round = this.activeRounds.get(roundId);

    await this.db.query(
      `
      UPDATE federated_rounds
      SET
        status = $1,
        participating_tenants = $2,
        contribution_count = $3,
        distributed_count = $4,
        completed_at = $5,
        errors = $6
      WHERE round_id = $7
    `,
      [
        status,
        round?.participatingTenants || [],
        round?.receivedContributions.size || 0,
        round?.distributedTo.length || 0,
        status === 'completed' || status === 'failed' ? new Date() : null,
        JSON.stringify(round?.errors || []),
        roundId,
      ]
    );
  }

  private async persistAggregatedModel(model: AggregatedModel): Promise<void> {
    await this.db.query(
      `
      INSERT INTO federated_models (
        round_id, model_type, version, weights, contributing_tenants,
        total_samples, privacy_epsilon, metrics, aggregated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
      [
        model.roundId,
        model.modelType,
        model.version,
        JSON.stringify(model.weights),
        model.contributingTenants,
        model.totalSamples,
        model.combinedPrivacyEpsilon,
        JSON.stringify(model.aggregatedMetrics),
        model.aggregatedAt,
      ]
    );
  }

  private async getNextModelVersion(modelType: FederatedModelType): Promise<number> {
    const result = await this.db.query(
      `SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM federated_models WHERE model_type = $1`,
      [modelType]
    );
    return result.rows[0]?.next_version || 1;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Scheduler
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Start automatic round scheduling
   */
  startScheduler(modelTypes: FederatedModelType[]): void {
    if (this.roundScheduler) return;

    this.roundScheduler = setInterval(async () => {
      for (const modelType of modelTypes) {
        try {
          // Check if a round is already active for this model type
          const activeForType = Array.from(this.activeRounds.values()).find(
            (r) => r.config.modelType === modelType
          );

          if (!activeForType) {
            await this.startRound(modelType);
          }
        } catch (error) {
          console.error(`Failed to start scheduled round for ${modelType}:`, error);
        }
      }
    }, this.config.defaultRoundInterval);
  }

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (this.roundScheduler) {
      clearInterval(this.roundScheduler);
      this.roundScheduler = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────────────────────────────────────

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
}
