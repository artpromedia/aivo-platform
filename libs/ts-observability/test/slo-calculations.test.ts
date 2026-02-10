import { describe, it, expect } from 'vitest';
import {
  calculateErrorBudget,
  calculateErrorBudgetMinutes,
  calculateRemainingBudget,
  calculateBurnRate,
  calculateTimeToExhaustion,
  burnRateForExhaustion,
  evaluateSloCompliance,
  sloRecordingRuleName,
} from '../src/slo/calculations.js';

/**
 * Helper to create a minimal SloDefinition for testing
 */
function makeSlo(overrides: Partial<{ id: string; target: number; windowDays: number }> = {}): any {
  return {
    id: overrides.id ?? 'test-slo',
    name: 'Test SLO',
    description: 'Test',
    service: 'test-svc',
    sli: {
      type: 'availability',
      metric: 'http_requests_total',
    },
    objectives: {
      target: overrides.target ?? 99.5,
      windowDays: overrides.windowDays ?? 30,
    },
  };
}

describe('SLO Calculations', () => {
  describe('calculateErrorBudget', () => {
    it('calculates error budget for 99.5% target', () => {
      expect(calculateErrorBudget(99.5)).toBeCloseTo(0.005);
    });

    it('calculates error budget for 99.9% target', () => {
      expect(calculateErrorBudget(99.9)).toBeCloseTo(0.001);
    });

    it('calculates error budget for 99% target', () => {
      expect(calculateErrorBudget(99)).toBeCloseTo(0.01);
    });

    it('returns 0 for 100% target', () => {
      expect(calculateErrorBudget(100)).toBe(0);
    });

    it('returns 1 for 0% target', () => {
      expect(calculateErrorBudget(0)).toBe(1);
    });
  });

  describe('calculateErrorBudgetMinutes', () => {
    it('calculates budget minutes for 99.5% over 30 days', () => {
      // 30 days = 43200 minutes, 0.5% = 216 minutes
      expect(calculateErrorBudgetMinutes(99.5, 30)).toBeCloseTo(216);
    });

    it('calculates budget minutes for 99.9% over 30 days', () => {
      // 30 days = 43200 minutes, 0.1% = 43.2 minutes
      expect(calculateErrorBudgetMinutes(99.9, 30)).toBeCloseTo(43.2);
    });

    it('returns 0 for 100% target', () => {
      expect(calculateErrorBudgetMinutes(100, 30)).toBe(0);
    });
  });

  describe('calculateBurnRate', () => {
    it('returns 1 when error rate equals budget', () => {
      // For 99.5% target, budget = 0.005
      expect(calculateBurnRate(0.005, 99.5)).toBeCloseTo(1);
    });

    it('returns 2 when error rate is double the budget', () => {
      expect(calculateBurnRate(0.01, 99.5)).toBeCloseTo(2);
    });

    it('returns 0.5 when error rate is half the budget', () => {
      expect(calculateBurnRate(0.0025, 99.5)).toBeCloseTo(0.5);
    });

    it('returns Infinity for 100% target', () => {
      expect(calculateBurnRate(0.001, 100)).toBe(Infinity);
    });

    it('returns 0 for zero error rate', () => {
      expect(calculateBurnRate(0, 99.5)).toBe(0);
    });
  });

  describe('calculateTimeToExhaustion', () => {
    it('returns Infinity when burn rate <= 1', () => {
      expect(calculateTimeToExhaustion(1, 30, 0)).toBe(Infinity);
      expect(calculateTimeToExhaustion(0.5, 30, 0)).toBe(Infinity);
    });

    it('returns correct days when burning fast', () => {
      // Burn rate 2, 30 day window, 0 elapsed -> 30/2 = 15 days
      expect(calculateTimeToExhaustion(2, 30, 0)).toBeCloseTo(15);
    });

    it('accounts for elapsed days', () => {
      // Burn rate 3, 30 day window, 10 elapsed -> 20/3 ≈ 6.67 days
      expect(calculateTimeToExhaustion(3, 30, 10)).toBeCloseTo(20 / 3);
    });
  });

  describe('burnRateForExhaustion', () => {
    it('calculates burn rate for 1 hour exhaustion over 30 days', () => {
      // 30 days = 720 hours. To exhaust in 1 hour = 720x
      expect(burnRateForExhaustion(1, 30)).toBeCloseTo(720);
    });

    it('calculates burn rate for 6 hour exhaustion over 30 days', () => {
      // 720 / 6 = 120
      expect(burnRateForExhaustion(6, 30)).toBeCloseTo(120);
    });
  });

  describe('calculateRemainingBudget', () => {
    it('returns 100% when no errors', () => {
      const slo = makeSlo({ target: 99.5 });
      expect(calculateRemainingBudget(slo, 0, 15)).toBeCloseTo(100);
    });

    it('returns less than 100% with some errors', () => {
      const slo = makeSlo({ target: 99.5, windowDays: 30 });
      // Some error rate over elapsed time should reduce remaining budget
      const remaining = calculateRemainingBudget(slo, 0.005, 15);
      expect(remaining).toBeLessThan(100);
    });

    it('returns negative when over budget', () => {
      const slo = makeSlo({ target: 99.5, windowDays: 30 });
      // Error rate of 0.1 (10%) over 30 days -> way over budget
      const remaining = calculateRemainingBudget(slo, 0.1, 30);
      expect(remaining).toBeLessThan(0);
    });
  });

  describe('evaluateSloCompliance', () => {
    it('returns healthy for compliant SLO', () => {
      const slo = makeSlo({ target: 99.5 });
      const result = evaluateSloCompliance(slo, 99.8, 15);

      expect(result.sloId).toBe('test-slo');
      expect(result.isCompliant).toBe(true);
      expect(result.currentValue).toBe(99.8);
      expect(result.target).toBe(99.5);
      expect(result.status).toBe('healthy');
    });

    it('returns exhausted when over budget', () => {
      const slo = makeSlo({ target: 99.9, windowDays: 30 });
      // 90% success = 10% error rate, way over 0.1% budget
      const result = evaluateSloCompliance(slo, 90, 30);

      expect(result.isCompliant).toBe(false);
      expect(result.status).toBe('exhausted');
    });

    it('returns critical for very high burn rate', () => {
      const slo = makeSlo({ target: 99.5, windowDays: 30 });
      // 99% success = 1% error, budget = 0.5% -> burn rate = 2
      // Actually 0.01 / 0.005 = 2 -> not >= 10
      // Let's use worse: 95% success = 5% error -> 0.05 / 0.005 = 10
      const result = evaluateSloCompliance(slo, 95, 1);
      expect(result.burnRate).toBeCloseTo(10);
      expect(result.status).toBe('critical');
    });

    it('returns warning for moderate burn rate', () => {
      const slo = makeSlo({ target: 99.5, windowDays: 30 });
      // Need burn rate >= 3 but < 10
      // 0.015 / 0.005 = 3 -> 98.5% success
      const result = evaluateSloCompliance(slo, 98.5, 1);
      expect(result.burnRate).toBeCloseTo(3);
      expect(result.status).toBe('warning');
    });
  });

  describe('sloRecordingRuleName', () => {
    it('generates correct rule name', () => {
      expect(sloRecordingRuleName('api-availability', 'error_rate')).toBe(
        'slo:api_availability:error_rate'
      );
    });

    it('replaces dashes with underscores', () => {
      expect(sloRecordingRuleName('a-b-c', 'burn_rate')).toBe('slo:a_b_c:burn_rate');
    });
  });
});
