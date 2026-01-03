/**
 * Cost Tracking Service
 *
 * Tracks AI generation costs:
 * - Token usage per request
 * - Cost calculation per provider/model
 * - Budget monitoring and alerts
 * - Usage analytics
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

import type { CostTrackingData, GenerationMetadata } from './types.js';

// Cost per 1K tokens in USD (as of late 2024)
const MODEL_COSTS: Record<
  string,
  { input: number; output: number; provider: string }
> = {
  // OpenAI
  'gpt-4o': { input: 0.005, output: 0.015, provider: 'openai' },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006, provider: 'openai' },
  'gpt-4-turbo': { input: 0.01, output: 0.03, provider: 'openai' },
  'gpt-4': { input: 0.03, output: 0.06, provider: 'openai' },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015, provider: 'openai' },
  'dall-e-3': { input: 0.04, output: 0.04, provider: 'openai' }, // per image, standard
  'dall-e-3-hd': { input: 0.08, output: 0.08, provider: 'openai' }, // per image, HD

  // Anthropic
  'claude-3-5-sonnet-latest': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-3-5-haiku-latest': { input: 0.0008, output: 0.004, provider: 'anthropic' },
  'claude-3-opus-latest': { input: 0.015, output: 0.075, provider: 'anthropic' },
  'claude-3-sonnet': { input: 0.003, output: 0.015, provider: 'anthropic' },
  'claude-3-haiku': { input: 0.00025, output: 0.00125, provider: 'anthropic' },

  // Google
  'gemini-2.0-flash': { input: 0.000075, output: 0.0003, provider: 'google' },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005, provider: 'google' },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003, provider: 'google' },

  // Default fallback
  default: { input: 0.001, output: 0.002, provider: 'unknown' },
};

// Budget alert thresholds (percentage)
const BUDGET_ALERT_THRESHOLDS = [50, 75, 90, 95, 100];

export interface UsageRecord {
  id: string;
  timestamp: Date;
  tenantId: string;
  userId: string;
  featureType: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  metadata?: Record<string, unknown>;
}

export interface UsageSummary {
  period: string;
  startDate: Date;
  endDate: Date;
  totalCostUsd: number;
  totalTokens: number;
  requestCount: number;
  averageCostPerRequest: number;
  byFeature: Record<string, { cost: number; tokens: number; count: number }>;
  byProvider: Record<string, { cost: number; tokens: number; count: number }>;
  byModel: Record<string, { cost: number; tokens: number; count: number }>;
}

export interface BudgetConfig {
  tenantId: string;
  monthlyBudgetUsd: number;
  alertEmails?: string[];
  enabled: boolean;
}

export class CostTrackingService {
  // In-memory store (replace with database in production)
  private usageRecords: UsageRecord[] = [];
  private budgetConfigs: Map<string, BudgetConfig> = new Map();
  private alertsSent: Map<string, Set<number>> = new Map(); // tenantId -> thresholds alerted

  constructor(private llm?: LLMOrchestrator) {}

  /**
   * Record a usage event
   */
  recordUsage(data: {
    tenantId: string;
    userId: string;
    featureType: string;
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cached?: boolean;
    metadata?: Record<string, unknown>;
  }): UsageRecord {
    const id = uuidv4();
    const costUsd = this.calculateCost(
      data.model,
      data.inputTokens,
      data.outputTokens
    );

    const record: UsageRecord = {
      id,
      timestamp: new Date(),
      tenantId: data.tenantId,
      userId: data.userId,
      featureType: data.featureType,
      model: data.model,
      provider: data.provider,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.inputTokens + data.outputTokens,
      costUsd,
      latencyMs: data.latencyMs,
      cached: data.cached ?? false,
      metadata: data.metadata,
    };

    this.usageRecords.push(record);

    // Emit metrics
    incrementCounter('ai.usage.requests', {
      feature: data.featureType,
      provider: data.provider,
      model: data.model,
    });
    recordHistogram('ai.usage.cost', costUsd, {
      feature: data.featureType,
    });
    recordHistogram('ai.usage.tokens', record.totalTokens, {
      feature: data.featureType,
    });

    // Check budget
    void this.checkBudget(data.tenantId);

    console.info('Usage recorded', {
      id,
      tenantId: data.tenantId,
      feature: data.featureType,
      tokens: record.totalTokens,
      cost: costUsd.toFixed(6),
    });

    return record;
  }

  /**
   * Record usage from generation metadata
   */
  recordFromMetadata(
    metadata: GenerationMetadata,
    context: {
      tenantId: string;
      userId: string;
      featureType: string;
    }
  ): UsageRecord {
    return this.recordUsage({
      tenantId: context.tenantId,
      userId: context.userId,
      featureType: context.featureType,
      model: metadata.model,
      provider: metadata.provider,
      inputTokens: Math.floor((metadata.tokensUsed ?? 0) * 0.4), // Estimate input
      outputTokens: Math.floor((metadata.tokensUsed ?? 0) * 0.6), // Estimate output
      latencyMs: metadata.latencyMs ?? 0,
      cached: metadata.cached,
    });
  }

  /**
   * Calculate cost for a request
   */
  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const modelCost = MODEL_COSTS[model] ?? MODEL_COSTS['default'];
    const inputCost = (inputTokens / 1000) * modelCost.input;
    const outputCost = (outputTokens / 1000) * modelCost.output;
    return inputCost + outputCost;
  }

  /**
   * Estimate cost before making a request
   */
  estimateCost(
    model: string,
    inputText: string,
    estimatedOutputTokens?: number
  ): {
    estimatedCostUsd: number;
    inputTokens: number;
    outputTokens: number;
    model: string;
  } {
    // Rough token estimation: ~4 chars per token
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = estimatedOutputTokens ?? inputTokens * 0.5;

    return {
      estimatedCostUsd: this.calculateCost(model, inputTokens, outputTokens),
      inputTokens,
      outputTokens: Math.ceil(outputTokens),
      model,
    };
  }

  /**
   * Get usage summary for a tenant
   */
  async getUsageSummary(
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      period?: 'day' | 'week' | 'month';
    }
  ): Promise<UsageSummary> {
    const now = new Date();
    const startDate = options?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = options?.endDate ?? now;

    const records = this.usageRecords.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.timestamp >= startDate &&
        r.timestamp <= endDate
    );

    const summary: UsageSummary = {
      period: options?.period ?? 'month',
      startDate,
      endDate,
      totalCostUsd: 0,
      totalTokens: 0,
      requestCount: records.length,
      averageCostPerRequest: 0,
      byFeature: {},
      byProvider: {},
      byModel: {},
    };

    for (const record of records) {
      summary.totalCostUsd += record.costUsd;
      summary.totalTokens += record.totalTokens;

      // By feature
      if (!summary.byFeature[record.featureType]) {
        summary.byFeature[record.featureType] = { cost: 0, tokens: 0, count: 0 };
      }
      summary.byFeature[record.featureType].cost += record.costUsd;
      summary.byFeature[record.featureType].tokens += record.totalTokens;
      summary.byFeature[record.featureType].count += 1;

      // By provider
      if (!summary.byProvider[record.provider]) {
        summary.byProvider[record.provider] = { cost: 0, tokens: 0, count: 0 };
      }
      summary.byProvider[record.provider].cost += record.costUsd;
      summary.byProvider[record.provider].tokens += record.totalTokens;
      summary.byProvider[record.provider].count += 1;

      // By model
      if (!summary.byModel[record.model]) {
        summary.byModel[record.model] = { cost: 0, tokens: 0, count: 0 };
      }
      summary.byModel[record.model].cost += record.costUsd;
      summary.byModel[record.model].tokens += record.totalTokens;
      summary.byModel[record.model].count += 1;
    }

    if (records.length > 0) {
      summary.averageCostPerRequest = summary.totalCostUsd / records.length;
    }

    return summary;
  }

  /**
   * Get user usage summary
   */
  async getUserUsage(
    tenantId: string,
    userId: string,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<{
    totalCostUsd: number;
    totalTokens: number;
    requestCount: number;
    byFeature: Record<string, { cost: number; tokens: number; count: number }>;
  }> {
    const now = new Date();
    const startDate = options?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = options?.endDate ?? now;

    const records = this.usageRecords.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.userId === userId &&
        r.timestamp >= startDate &&
        r.timestamp <= endDate
    );

    const result = {
      totalCostUsd: 0,
      totalTokens: 0,
      requestCount: records.length,
      byFeature: {} as Record<string, { cost: number; tokens: number; count: number }>,
    };

    for (const record of records) {
      result.totalCostUsd += record.costUsd;
      result.totalTokens += record.totalTokens;

      if (!result.byFeature[record.featureType]) {
        result.byFeature[record.featureType] = { cost: 0, tokens: 0, count: 0 };
      }
      result.byFeature[record.featureType].cost += record.costUsd;
      result.byFeature[record.featureType].tokens += record.totalTokens;
      result.byFeature[record.featureType].count += 1;
    }

    return result;
  }

  /**
   * Set budget configuration for a tenant
   */
  setBudget(config: BudgetConfig): void {
    this.budgetConfigs.set(config.tenantId, config);
    this.alertsSent.set(config.tenantId, new Set());
    console.info('Budget set', {
      tenantId: config.tenantId,
      monthlyBudget: config.monthlyBudgetUsd,
    });
  }

  /**
   * Get current budget status
   */
  async getBudgetStatus(tenantId: string): Promise<{
    monthlyBudgetUsd: number;
    currentSpendUsd: number;
    percentUsed: number;
    remainingUsd: number;
    projectedMonthlySpend: number;
    onTrack: boolean;
  } | null> {
    const config = this.budgetConfigs.get(tenantId);
    if (!config || !config.enabled) {
      return null;
    }

    const summary = await this.getUsageSummary(tenantId, { period: 'month' });

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const projectedSpend = (summary.totalCostUsd / dayOfMonth) * daysInMonth;

    const percentUsed = (summary.totalCostUsd / config.monthlyBudgetUsd) * 100;

    return {
      monthlyBudgetUsd: config.monthlyBudgetUsd,
      currentSpendUsd: summary.totalCostUsd,
      percentUsed,
      remainingUsd: Math.max(0, config.monthlyBudgetUsd - summary.totalCostUsd),
      projectedMonthlySpend: projectedSpend,
      onTrack: projectedSpend <= config.monthlyBudgetUsd,
    };
  }

  /**
   * Get top users by usage
   */
  async getTopUsers(
    tenantId: string,
    limit: number = 10,
    options?: { startDate?: Date; endDate?: Date }
  ): Promise<
    Array<{
      userId: string;
      totalCostUsd: number;
      totalTokens: number;
      requestCount: number;
    }>
  > {
    const now = new Date();
    const startDate = options?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = options?.endDate ?? now;

    const records = this.usageRecords.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.timestamp >= startDate &&
        r.timestamp <= endDate
    );

    const userMap = new Map<
      string,
      { totalCostUsd: number; totalTokens: number; requestCount: number }
    >();

    for (const record of records) {
      const existing = userMap.get(record.userId) ?? {
        totalCostUsd: 0,
        totalTokens: 0,
        requestCount: 0,
      };
      existing.totalCostUsd += record.costUsd;
      existing.totalTokens += record.totalTokens;
      existing.requestCount += 1;
      userMap.set(record.userId, existing);
    }

    return Array.from(userMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.totalCostUsd - a.totalCostUsd)
      .slice(0, limit);
  }

  /**
   * Get cost tracking data for display
   */
  getCostTrackingData(record: UsageRecord): CostTrackingData {
    return {
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      estimatedCostUsd: record.costUsd,
      model: record.model,
      provider: record.provider,
    };
  }

  /**
   * Get available models and their costs
   */
  getModelCosts(): Array<{
    model: string;
    provider: string;
    inputCostPer1k: number;
    outputCostPer1k: number;
  }> {
    return Object.entries(MODEL_COSTS)
      .filter(([model]) => model !== 'default')
      .map(([model, costs]) => ({
        model,
        provider: costs.provider,
        inputCostPer1k: costs.input,
        outputCostPer1k: costs.output,
      }));
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private async checkBudget(tenantId: string): Promise<void> {
    const config = this.budgetConfigs.get(tenantId);
    if (!config || !config.enabled) {
      return;
    }

    const status = await this.getBudgetStatus(tenantId);
    if (!status) {
      return;
    }

    const sentAlerts = this.alertsSent.get(tenantId) ?? new Set();

    for (const threshold of BUDGET_ALERT_THRESHOLDS) {
      if (status.percentUsed >= threshold && !sentAlerts.has(threshold)) {
        sentAlerts.add(threshold);
        this.alertsSent.set(tenantId, sentAlerts);

        // Log alert (in production, this would send email/notification)
        console.warn('Budget threshold reached', {
          tenantId,
          threshold: `${threshold}%`,
          currentSpend: status.currentSpendUsd.toFixed(2),
          budget: status.monthlyBudgetUsd.toFixed(2),
        });

        incrementCounter('ai.budget.alert', {
          tenantId,
          threshold: threshold.toString(),
        });
      }
    }
  }

  /**
   * Export usage data (for billing/reporting)
   */
  exportUsage(
    tenantId: string,
    options?: { startDate?: Date; endDate?: Date; format?: 'json' | 'csv' }
  ): string {
    const now = new Date();
    const startDate = options?.startDate ?? new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = options?.endDate ?? now;

    const records = this.usageRecords.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.timestamp >= startDate &&
        r.timestamp <= endDate
    );

    if (options?.format === 'csv') {
      const headers = [
        'id',
        'timestamp',
        'userId',
        'featureType',
        'model',
        'provider',
        'inputTokens',
        'outputTokens',
        'totalTokens',
        'costUsd',
        'latencyMs',
        'cached',
      ];
      const rows = records.map((r) => [
        r.id,
        r.timestamp.toISOString(),
        r.userId,
        r.featureType,
        r.model,
        r.provider,
        r.inputTokens,
        r.outputTokens,
        r.totalTokens,
        r.costUsd.toFixed(6),
        r.latencyMs,
        r.cached,
      ]);
      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    }

    return JSON.stringify(records, null, 2);
  }
}
