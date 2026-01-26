/**
 * Cost Calculator
 *
 * Calculates and tracks AI usage costs with:
 * - Per-request cost estimation
 * - Tenant usage tracking
 * - Budget monitoring and alerts
 * - Cost optimization recommendations
 */

import type { AIModel } from '../providers/registry.js';
import { getProviderRegistry } from '../providers/registry.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ============================================================================
// Types
// ============================================================================

export interface CostEstimate {
  /** Input token cost in USD */
  inputCost: number;
  /** Output token cost in USD */
  outputCost: number;
  /** Total cost in USD */
  totalCost: number;
  /** Model used for calculation */
  model: string;
  /** Provider ID */
  providerId: string;
  /** Cost breakdown */
  breakdown: {
    inputTokens: number;
    outputTokens: number;
    inputRate: number;
    outputRate: number;
  };
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  modelId: string;
  providerId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface UsageReport {
  tenantId: string;
  startDate: Date;
  endDate: Date;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  byProvider: Record<string, ProviderUsage>;
  byModel: Record<string, ModelUsage>;
  byDay: DailyUsage[];
}

export interface ProviderUsage {
  providerId: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
}

export interface ModelUsage {
  modelId: string;
  providerId: string;
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  averageCostPerRequest: number;
}

export interface DailyUsage {
  date: string;
  totalCost: number;
  totalRequests: number;
  totalTokens: number;
}

export interface BudgetConfig {
  tenantId: string;
  dailyLimit?: number;
  monthlyLimit?: number;
  alertThreshold?: number; // 0-1, percentage of limit
  hardLimit?: boolean; // If true, reject requests when limit is exceeded
}

export interface BudgetStatus {
  tenantId: string;
  dailyUsage: number;
  monthlyUsage: number;
  dailyLimit?: number;
  monthlyLimit?: number;
  dailyRemaining?: number;
  monthlyRemaining?: number;
  isOverDailyLimit: boolean;
  isOverMonthlyLimit: boolean;
  alertTriggered: boolean;
}

// ============================================================================
// In-Memory Storage (would be replaced with database in production)
// ============================================================================

interface UsageStore {
  records: UsageRecord[];
  budgets: Map<string, BudgetConfig>;
}

const store: UsageStore = {
  records: [],
  budgets: new Map(),
};

// ============================================================================
// Cost Calculator
// ============================================================================

export class CostCalculator {
  private alertCallbacks: ((tenantId: string, status: BudgetStatus) => void)[] = [];

  /**
   * Estimate the cost of a request before execution
   */
  estimateCost(
    model: AIModel,
    inputTokens: number,
    estimatedOutputTokens: number
  ): CostEstimate {
    const inputCost = (inputTokens / 1000) * model.pricing.inputPer1kTokens;
    const outputCost = (estimatedOutputTokens / 1000) * model.pricing.outputPer1kTokens;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      model: model.id,
      providerId: model.providerId,
      breakdown: {
        inputTokens,
        outputTokens: estimatedOutputTokens,
        inputRate: model.pricing.inputPer1kTokens,
        outputRate: model.pricing.outputPer1kTokens,
      },
    };
  }

  /**
   * Estimate cost by model ID
   */
  estimateCostByModelId(
    modelId: string,
    inputTokens: number,
    estimatedOutputTokens: number
  ): CostEstimate | null {
    const registry = getProviderRegistry();
    const model = registry.getModel(modelId);

    if (!model) {
      return null;
    }

    return this.estimateCost(model, inputTokens, estimatedOutputTokens);
  }

  /**
   * Select the cheapest model from a list
   */
  selectCheapestModel(
    models: AIModel[],
    inputTokens: number,
    estimatedOutputTokens: number = 500
  ): AIModel | null {
    if (models.length === 0) return null;

    let cheapestModel = models[0]!;
    let lowestCost = this.estimateCost(cheapestModel, inputTokens, estimatedOutputTokens).totalCost;

    for (let i = 1; i < models.length; i++) {
      const model = models[i]!;
      const cost = this.estimateCost(model, inputTokens, estimatedOutputTokens).totalCost;
      if (cost < lowestCost) {
        lowestCost = cost;
        cheapestModel = model;
      }
    }

    return cheapestModel;
  }

  /**
   * Track usage after a request completes
   */
  trackUsage(
    tenantId: string,
    model: AIModel,
    inputTokens: number,
    outputTokens: number,
    metadata?: Record<string, unknown>
  ): UsageRecord {
    const cost = this.estimateCost(model, inputTokens, outputTokens).totalCost;

    const record: UsageRecord = {
      id: crypto.randomUUID(),
      tenantId,
      modelId: model.id,
      providerId: model.providerId,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      cost,
      timestamp: new Date(),
      metadata,
    };

    // Store the record
    store.records.push(record);

    // Clean up old records (keep last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    store.records = store.records.filter((r) => r.timestamp > thirtyDaysAgo);

    // Record metrics
    incrementCounter('cost.usage_tracked', {
      tenant_id: tenantId,
      provider: model.providerId,
      model: model.id,
    });

    incrementCounter('cost.tokens_used', {
      tenant_id: tenantId,
      provider: model.providerId,
      type: 'input',
    }, inputTokens);

    incrementCounter('cost.tokens_used', {
      tenant_id: tenantId,
      provider: model.providerId,
      type: 'output',
    }, outputTokens);

    recordHistogram('cost.request_cost_usd', cost * 100, { // Convert to cents
      tenant_id: tenantId,
      provider: model.providerId,
    });

    // Check budget
    this.checkBudgetAlerts(tenantId);

    return record;
  }

  /**
   * Get usage report for a tenant
   */
  getTenantUsage(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): UsageReport {
    const records = store.records.filter(
      (r) =>
        r.tenantId === tenantId &&
        r.timestamp >= startDate &&
        r.timestamp <= endDate
    );

    const byProvider: Record<string, ProviderUsage> = {};
    const byModel: Record<string, ModelUsage> = {};
    const byDayMap: Record<string, DailyUsage> = {};

    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const record of records) {
      totalCost += record.cost;
      totalInputTokens += record.inputTokens;
      totalOutputTokens += record.outputTokens;

      // By provider
      if (!byProvider[record.providerId]) {
        byProvider[record.providerId] = {
          providerId: record.providerId,
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalRequests: 0,
        };
      }
      byProvider[record.providerId]!.totalCost += record.cost;
      byProvider[record.providerId]!.totalInputTokens += record.inputTokens;
      byProvider[record.providerId]!.totalOutputTokens += record.outputTokens;
      byProvider[record.providerId]!.totalRequests++;

      // By model
      if (!byModel[record.modelId]) {
        byModel[record.modelId] = {
          modelId: record.modelId,
          providerId: record.providerId,
          totalCost: 0,
          totalInputTokens: 0,
          totalOutputTokens: 0,
          totalRequests: 0,
          averageCostPerRequest: 0,
        };
      }
      byModel[record.modelId]!.totalCost += record.cost;
      byModel[record.modelId]!.totalInputTokens += record.inputTokens;
      byModel[record.modelId]!.totalOutputTokens += record.outputTokens;
      byModel[record.modelId]!.totalRequests++;

      // By day
      const dateKey = record.timestamp.toISOString().split('T')[0]!;
      if (!byDayMap[dateKey]) {
        byDayMap[dateKey] = {
          date: dateKey,
          totalCost: 0,
          totalRequests: 0,
          totalTokens: 0,
        };
      }
      byDayMap[dateKey]!.totalCost += record.cost;
      byDayMap[dateKey]!.totalRequests++;
      byDayMap[dateKey]!.totalTokens += record.totalTokens;
    }

    // Calculate averages
    for (const modelUsage of Object.values(byModel)) {
      modelUsage.averageCostPerRequest =
        modelUsage.totalRequests > 0
          ? modelUsage.totalCost / modelUsage.totalRequests
          : 0;
    }

    const byDay = Object.values(byDayMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      tenantId,
      startDate,
      endDate,
      totalCost,
      totalInputTokens,
      totalOutputTokens,
      totalRequests: records.length,
      byProvider,
      byModel,
      byDay,
    };
  }

  /**
   * Get daily usage for a tenant
   */
  getDailyUsage(tenantId: string, date?: Date): number {
    const targetDate = date ?? new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    return store.records
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.timestamp >= startOfDay &&
          r.timestamp <= endOfDay
      )
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Get monthly usage for a tenant
   */
  getMonthlyUsage(tenantId: string, date?: Date): number {
    const targetDate = date ?? new Date();
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59, 999);

    return store.records
      .filter(
        (r) =>
          r.tenantId === tenantId &&
          r.timestamp >= startOfMonth &&
          r.timestamp <= endOfMonth
      )
      .reduce((sum, r) => sum + r.cost, 0);
  }

  /**
   * Set budget configuration for a tenant
   */
  setBudget(config: BudgetConfig): void {
    store.budgets.set(config.tenantId, config);
  }

  /**
   * Get budget configuration for a tenant
   */
  getBudget(tenantId: string): BudgetConfig | undefined {
    return store.budgets.get(tenantId);
  }

  /**
   * Get budget status for a tenant
   */
  getBudgetStatus(tenantId: string): BudgetStatus {
    const budget = store.budgets.get(tenantId);
    const dailyUsage = this.getDailyUsage(tenantId);
    const monthlyUsage = this.getMonthlyUsage(tenantId);

    const status: BudgetStatus = {
      tenantId,
      dailyUsage,
      monthlyUsage,
      dailyLimit: budget?.dailyLimit,
      monthlyLimit: budget?.monthlyLimit,
      dailyRemaining: budget?.dailyLimit ? Math.max(0, budget.dailyLimit - dailyUsage) : undefined,
      monthlyRemaining: budget?.monthlyLimit ? Math.max(0, budget.monthlyLimit - monthlyUsage) : undefined,
      isOverDailyLimit: budget?.dailyLimit ? dailyUsage > budget.dailyLimit : false,
      isOverMonthlyLimit: budget?.monthlyLimit ? monthlyUsage > budget.monthlyLimit : false,
      alertTriggered: false,
    };

    // Check if alert threshold is reached
    if (budget?.alertThreshold) {
      if (budget.dailyLimit) {
        status.alertTriggered = dailyUsage >= budget.dailyLimit * budget.alertThreshold;
      }
      if (budget.monthlyLimit) {
        status.alertTriggered = status.alertTriggered ||
          monthlyUsage >= budget.monthlyLimit * budget.alertThreshold;
      }
    }

    return status;
  }

  /**
   * Check if a request is within budget
   */
  isWithinBudget(tenantId: string, estimatedCost: number): boolean {
    const budget = store.budgets.get(tenantId);
    if (!budget) return true;

    const dailyUsage = this.getDailyUsage(tenantId);
    const monthlyUsage = this.getMonthlyUsage(tenantId);

    if (budget.dailyLimit && dailyUsage + estimatedCost > budget.dailyLimit) {
      return false;
    }

    if (budget.monthlyLimit && monthlyUsage + estimatedCost > budget.monthlyLimit) {
      return false;
    }

    return true;
  }

  /**
   * Register a callback for budget alerts
   */
  onBudgetAlert(callback: (tenantId: string, status: BudgetStatus) => void): () => void {
    this.alertCallbacks.push(callback);
    return () => {
      const index = this.alertCallbacks.indexOf(callback);
      if (index > -1) {
        this.alertCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get cost optimization recommendations
   */
  getOptimizationRecommendations(tenantId: string): CostOptimizationRecommendation[] {
    const recommendations: CostOptimizationRecommendation[] = [];
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const report = this.getTenantUsage(tenantId, thirtyDaysAgo, now);
    const registry = getProviderRegistry();

    // Check for high-cost models that could be replaced
    for (const [modelId, usage] of Object.entries(report.byModel)) {
      const model = registry.getModel(modelId);
      if (!model) continue;

      // Find cheaper alternatives with same capabilities
      const alternatives = registry.getModelsMatchingRequirements({
        capability: 'chat',
        maxCostPerToken: model.pricing.inputPer1kTokens * 0.5, // 50% cheaper
      });

      if (alternatives.length > 0) {
        const cheapestAlternative = this.selectCheapestModel(
          alternatives,
          usage.totalInputTokens / usage.totalRequests,
          usage.totalOutputTokens / usage.totalRequests
        );

        if (cheapestAlternative && cheapestAlternative.id !== modelId) {
          const potentialSavings = usage.totalCost * 0.5; // Estimate 50% savings
          recommendations.push({
            type: 'model_switch',
            priority: potentialSavings > 10 ? 'high' : potentialSavings > 1 ? 'medium' : 'low',
            title: `Consider switching from ${model.displayName} to ${cheapestAlternative.displayName}`,
            description: `You've spent $${usage.totalCost.toFixed(2)} on ${model.displayName} in the last 30 days. Switching to ${cheapestAlternative.displayName} could save approximately $${potentialSavings.toFixed(2)}.`,
            estimatedSavings: potentialSavings,
            currentModelId: modelId,
            suggestedModelId: cheapestAlternative.id,
          });
        }
      }
    }

    // Check for caching opportunities (repeated similar requests)
    if (report.totalRequests > 100) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Enable response caching',
        description: `With ${report.totalRequests} requests in the last 30 days, enabling caching for repeated queries could significantly reduce costs.`,
        estimatedSavings: report.totalCost * 0.1, // Estimate 10% savings from caching
      });
    }

    return recommendations;
  }

  /**
   * Check and trigger budget alerts
   */
  private checkBudgetAlerts(tenantId: string): void {
    const status = this.getBudgetStatus(tenantId);

    if (status.alertTriggered || status.isOverDailyLimit || status.isOverMonthlyLimit) {
      for (const callback of this.alertCallbacks) {
        try {
          callback(tenantId, status);
        } catch (error) {
          console.error('Error in budget alert callback:', error);
        }
      }

      incrementCounter('cost.budget_alert', {
        tenant_id: tenantId,
        over_daily: String(status.isOverDailyLimit),
        over_monthly: String(status.isOverMonthlyLimit),
      });
    }
  }
}

// ============================================================================
// Types for Recommendations
// ============================================================================

export interface CostOptimizationRecommendation {
  type: 'model_switch' | 'caching' | 'batching' | 'rate_optimization';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimatedSavings: number;
  currentModelId?: string;
  suggestedModelId?: string;
}

// ============================================================================
// Singleton Instance
// ============================================================================

let calculatorInstance: CostCalculator | null = null;

export function getCostCalculator(): CostCalculator {
  if (!calculatorInstance) {
    calculatorInstance = new CostCalculator();
  }
  return calculatorInstance;
}

export function resetCostCalculator(): void {
  calculatorInstance = null;
  store.records = [];
  store.budgets.clear();
}
