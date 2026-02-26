import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock dependencies before imports ────────────────────────────────────
vi.mock('../src/providers/metrics-helper.js', () => ({
  incrementCounter: vi.fn(),
  recordHistogram: vi.fn(),
}));

const mockGetProviderRegistry = vi.fn();
vi.mock('../src/providers/registry.js', () => ({
  getProviderRegistry: mockGetProviderRegistry,
}));

import { CostCalculator } from '../src/routing/cost-calculator.js';
import type { CostEstimate } from '../src/routing/cost-calculator.js';

// ── Helper to create a mock AIModel ──────────────────────────────────────
function makeModel(overrides: Record<string, unknown> = {}) {
  return {
    id: 'openai/gpt-4',
    providerId: 'openai',
    name: 'gpt-4',
    displayName: 'GPT-4',
    contextWindow: 8192,
    maxOutputTokens: 4096,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.03,
      outputPer1kTokens: 0.06,
      currency: 'USD' as const,
    },
    priority: 1,
    isEnabled: true,
    status: 'available' as const,
    ...overrides,
  };
}

function makeCheapModel() {
  return makeModel({
    id: 'openai/gpt-3.5-turbo',
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    pricing: {
      inputPer1kTokens: 0.0005,
      outputPer1kTokens: 0.0015,
      currency: 'USD',
    },
    priority: 2,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// Cost Calculator Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('CostCalculator', () => {
  let calc: CostCalculator;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock registry to return models when needed
    mockGetProviderRegistry.mockReturnValue({
      getModel: vi.fn().mockImplementation((modelId: string) => {
        if (modelId === 'openai/gpt-4') return makeModel();
        if (modelId === 'openai/gpt-3.5-turbo') return makeCheapModel();
        return undefined;
      }),
      getAllModels: vi.fn().mockReturnValue([makeModel(), makeCheapModel()]),
    });
    calc = new CostCalculator();
  });

  // ── estimateCost ──────────────────────────────────────────────────────

  describe('estimateCost', () => {
    it('should estimate cost for a known model', () => {
      const model = makeModel();
      const cost: CostEstimate = calc.estimateCost(model as any, 1000, 500);
      expect(cost.totalCost).toBeGreaterThan(0);
      expect(cost).toHaveProperty('inputCost');
      expect(cost).toHaveProperty('outputCost');
      expect(cost).toHaveProperty('totalCost');
    });

    it('should estimate higher cost for larger token counts', () => {
      const model = makeModel();
      const small = calc.estimateCost(model as any, 100, 50);
      const large = calc.estimateCost(model as any, 10000, 5000);
      expect(large.totalCost).toBeGreaterThan(small.totalCost);
    });

    it('should calculate correct costs based on pricing', () => {
      const model = makeModel({
        pricing: {
          inputPer1kTokens: 0.01,
          outputPer1kTokens: 0.02,
          currency: 'USD',
        },
      });
      const cost = calc.estimateCost(model as any, 1000, 1000);
      // 1000 input tokens at $0.01/1k = $0.01
      // 1000 output tokens at $0.02/1k = $0.02
      expect(cost.inputCost).toBeCloseTo(0.01, 4);
      expect(cost.outputCost).toBeCloseTo(0.02, 4);
      expect(cost.totalCost).toBeCloseTo(0.03, 4);
    });
  });

  // ── estimateCostByModelId ─────────────────────────────────────────────

  describe('estimateCostByModelId', () => {
    it('should estimate cost for a known model ID', () => {
      const cost = calc.estimateCostByModelId('openai/gpt-4', 1000, 500);
      expect(cost).not.toBeNull();
      if (cost) {
        expect(cost.totalCost).toBeGreaterThan(0);
      }
    });

    it('should return null for unknown model ID', () => {
      const cost = calc.estimateCostByModelId('unknown/nonexistent', 100, 50);
      expect(cost).toBeNull();
    });
  });

  // ── selectCheapestModel ───────────────────────────────────────────────

  describe('selectCheapestModel', () => {
    it('should select the cheapest model from candidates', () => {
      const expensive = makeModel();
      const cheap = makeCheapModel();
      const cheapest = calc.selectCheapestModel(
        [expensive, cheap] as any[],
        500,
        200,
      );
      expect(cheapest).toBeDefined();
      expect((cheapest as any)?.name).toBe('gpt-3.5-turbo');
    });

    it('should return null when no candidates', () => {
      const result = calc.selectCheapestModel([], 100, 50);
      expect(result).toBeNull();
    });
  });

  // ── Usage tracking ────────────────────────────────────────────────────

  describe('trackUsage', () => {
    it('should track usage for a tenant and return a record', () => {
      const model = makeModel();
      const record = calc.trackUsage('tenant-1', model as any, 1000, 500);
      expect(record).toHaveProperty('tenantId', 'tenant-1');
      expect(record).toHaveProperty('inputTokens', 1000);
      expect(record).toHaveProperty('outputTokens', 500);
      expect(record).toHaveProperty('cost');
      expect(record.cost).toBeGreaterThan(0);
    });
  });

  describe('getDailyUsage', () => {
    it('should return daily usage for a tenant', () => {
      const model = makeModel();
      calc.trackUsage('tenant-2', model as any, 1000, 500);
      const daily = calc.getDailyUsage('tenant-2');
      expect(daily).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMonthlyUsage', () => {
    it('should return monthly usage for a tenant', () => {
      const model = makeModel();
      calc.trackUsage('tenant-3', model as any, 1000, 500);
      const monthly = calc.getMonthlyUsage('tenant-3');
      expect(monthly).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Budget management ─────────────────────────────────────────────────

  describe('budget', () => {
    it('should set and get budget for a tenant', () => {
      calc.setBudget({ tenantId: 'tenant-b1', monthlyLimit: 100, dailyLimit: 10 });
      const budget = calc.getBudget('tenant-b1');
      expect(budget).toBeDefined();
      expect(budget?.monthlyLimit).toBe(100);
      expect(budget?.dailyLimit).toBe(10);
    });

    it('should return undefined budget for unconfigured tenant', () => {
      expect(calc.getBudget('no-budget')).toBeUndefined();
    });

    it('should report budget status', () => {
      calc.setBudget({ tenantId: 'tenant-b2', monthlyLimit: 100, dailyLimit: 10 });
      const model = makeModel();
      calc.trackUsage('tenant-b2', model as any, 5000, 2000);

      const status = calc.getBudgetStatus('tenant-b2');
      expect(status).toBeDefined();
      expect(status).toHaveProperty('monthlyUsage');
      expect(status).toHaveProperty('monthlyLimit', 100);
    });

    it('should check if within budget', () => {
      calc.setBudget({ tenantId: 'tenant-b3', monthlyLimit: 1, dailyLimit: 0.5 });
      expect(calc.isWithinBudget('tenant-b3', 0.01)).toBe(true);
    });

    it('should return true (within budget) when no budget set', () => {
      expect(calc.isWithinBudget('no-budget-tenant', 100)).toBe(true);
    });
  });

  // ── Budget alerts ─────────────────────────────────────────────────────

  describe('onBudgetAlert', () => {
    it('should register an alert callback and return unsubscribe fn', () => {
      const alertFn = vi.fn();
      const unsubscribe = calc.onBudgetAlert(alertFn);
      expect(typeof unsubscribe).toBe('function');
    });
  });

  // ── Optimization recommendations ──────────────────────────────────────

  describe('getOptimizationRecommendations', () => {
    it('should return recommendations array', () => {
      const model = makeModel();
      calc.trackUsage('rec-tenant', model as any, 50000, 25000);
      const recs = calc.getOptimizationRecommendations('rec-tenant');
      expect(Array.isArray(recs)).toBe(true);
    });
  });
});
