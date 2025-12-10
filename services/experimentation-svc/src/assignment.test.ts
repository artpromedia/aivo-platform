/**
 * Assignment Logic Tests
 *
 * Tests for deterministic hash-based assignment.
 */

import { describe, it, expect } from 'vitest';

import {
  computeBucket,
  selectVariant,
  computeAssignment,
  verifyDistribution,
  isDistributionValid,
} from './assignment.js';
import type { Experiment, ExperimentVariant } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ════════════════════════════════════════════════════════════════════════════════

function createTestExperiment(overrides?: Partial<Experiment>): Experiment {
  return {
    id: 'exp-123',
    key: 'test_experiment',
    name: 'Test Experiment',
    description: null,
    scope: 'LEARNER',
    status: 'RUNNING',
    config_json: {},
    start_at: null,
    end_at: null,
    created_by_user_id: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createTestVariants(): ExperimentVariant[] {
  return [
    {
      id: 'var-1',
      experiment_id: 'exp-123',
      key: 'control',
      allocation: 0.5,
      config_json: { sessionMinutes: 25 },
      created_at: new Date(),
    },
    {
      id: 'var-2',
      experiment_id: 'exp-123',
      key: 'treatment',
      allocation: 0.5,
      config_json: { sessionMinutes: 45 },
      created_at: new Date(),
    },
  ];
}

// ════════════════════════════════════════════════════════════════════════════════
// BUCKET COMPUTATION TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('computeBucket', () => {
  it('should return consistent value for same input', () => {
    const bucket1 = computeBucket('exp_key', 'subject_123');
    const bucket2 = computeBucket('exp_key', 'subject_123');

    expect(bucket1).toBe(bucket2);
  });

  it('should return different values for different subjects', () => {
    const bucket1 = computeBucket('exp_key', 'subject_123');
    const bucket2 = computeBucket('exp_key', 'subject_456');

    expect(bucket1).not.toBe(bucket2);
  });

  it('should return different values for different experiments', () => {
    const bucket1 = computeBucket('exp_key_1', 'subject_123');
    const bucket2 = computeBucket('exp_key_2', 'subject_123');

    expect(bucket1).not.toBe(bucket2);
  });

  it('should return value in [0, 1) range', () => {
    for (let i = 0; i < 100; i++) {
      const bucket = computeBucket('test_exp', `subject_${i}`);
      expect(bucket).toBeGreaterThanOrEqual(0);
      expect(bucket).toBeLessThan(1);
    }
  });

  it('should produce uniform distribution', () => {
    const buckets = 10;
    const counts = new Array(buckets).fill(0);
    const samples = 10000;

    for (let i = 0; i < samples; i++) {
      const bucket = computeBucket('uniform_test', `subject_${i}`);
      const index = Math.floor(bucket * buckets);
      counts[index]++;
    }

    // Each bucket should have roughly 10% of samples (with some tolerance)
    const expected = samples / buckets;
    const tolerance = 0.1; // 10% tolerance

    for (const count of counts) {
      expect(count).toBeGreaterThan(expected * (1 - tolerance));
      expect(count).toBeLessThan(expected * (1 + tolerance));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// VARIANT SELECTION TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('selectVariant', () => {
  it('should select first variant for bucket 0', () => {
    const variants = createTestVariants();
    const selected = selectVariant(0, variants);

    expect(selected).not.toBeNull();
    expect(selected!.key).toBe('control');
  });

  it('should select second variant for bucket 0.6', () => {
    const variants = createTestVariants();
    const selected = selectVariant(0.6, variants);

    expect(selected).not.toBeNull();
    expect(selected!.key).toBe('treatment');
  });

  it('should handle exact boundary', () => {
    const variants = createTestVariants();

    // At exactly 0.5, should select second variant (cumulative >= bucket)
    const selected = selectVariant(0.5, variants);
    expect(selected).not.toBeNull();
    expect(selected!.key).toBe('treatment');
  });

  it('should handle bucket at 0.999', () => {
    const variants = createTestVariants();
    const selected = selectVariant(0.999, variants);

    expect(selected).not.toBeNull();
    expect(selected!.key).toBe('treatment');
  });

  it('should handle three variants', () => {
    const variants: ExperimentVariant[] = [
      {
        id: '1',
        experiment_id: 'exp',
        key: 'a',
        allocation: 0.33,
        config_json: {},
        created_at: new Date(),
      },
      {
        id: '2',
        experiment_id: 'exp',
        key: 'b',
        allocation: 0.34,
        config_json: {},
        created_at: new Date(),
      },
      {
        id: '3',
        experiment_id: 'exp',
        key: 'c',
        allocation: 0.33,
        config_json: {},
        created_at: new Date(),
      },
    ];

    expect(selectVariant(0.1, variants)!.key).toBe('a');
    expect(selectVariant(0.4, variants)!.key).toBe('b');
    expect(selectVariant(0.8, variants)!.key).toBe('c');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT COMPUTATION TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('computeAssignment', () => {
  it('should assign variant when experiment is running', () => {
    const experiment = createTestExperiment({ status: 'RUNNING' });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: true,
    });

    expect(result.assigned).toBe(true);
    expect(result.reason).toBe('HASH_ALLOCATION');
    expect(['control', 'treatment']).toContain(result.variantKey);
  });

  it('should return control when tenant opted out', () => {
    const experiment = createTestExperiment({ status: 'RUNNING' });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: false,
    });

    expect(result.assigned).toBe(false);
    expect(result.reason).toBe('TENANT_OPT_OUT');
    expect(result.variantKey).toBe('control');
  });

  it('should return control when experiment not running', () => {
    const experiment = createTestExperiment({ status: 'PAUSED' });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: true,
    });

    expect(result.assigned).toBe(false);
    expect(result.reason).toBe('EXPERIMENT_NOT_RUNNING');
  });

  it('should return control when before start_at', () => {
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    const experiment = createTestExperiment({ status: 'RUNNING', start_at: futureDate });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: true,
    });

    expect(result.assigned).toBe(false);
    expect(result.reason).toBe('EXPERIMENT_NOT_RUNNING');
  });

  it('should return control when after end_at', () => {
    const pastDate = new Date(Date.now() - 86400000); // Yesterday
    const experiment = createTestExperiment({ status: 'RUNNING', end_at: pastDate });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: true,
    });

    expect(result.assigned).toBe(false);
    expect(result.reason).toBe('EXPERIMENT_NOT_RUNNING');
  });

  it('should use forced variant when provided', () => {
    const experiment = createTestExperiment({ status: 'RUNNING' });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: true,
      forceVariant: 'treatment',
    });

    expect(result.assigned).toBe(true);
    expect(result.reason).toBe('FORCED_VARIANT');
    expect(result.variantKey).toBe('treatment');
  });

  it('should use tenantId for TENANT scope', () => {
    const experiment = createTestExperiment({ scope: 'TENANT', status: 'RUNNING' });
    const variants = createTestVariants();

    // Same tenant, different learners should get same variant
    const result1 = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-abc',
      learnerId: 'learner-1',
      experimentationEnabled: true,
    });

    const result2 = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-abc',
      learnerId: 'learner-2',
      experimentationEnabled: true,
    });

    expect(result1.variantKey).toBe(result2.variantKey);
  });

  it('should use learnerId for LEARNER scope', () => {
    const experiment = createTestExperiment({ scope: 'LEARNER', status: 'RUNNING' });
    const variants = createTestVariants();

    // Same tenant, different learners may get different variants
    // (Not guaranteed, but assignment should be based on learnerId)
    const result1 = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-abc',
      learnerId: 'learner-consistent',
      experimentationEnabled: true,
    });

    const result2 = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-abc',
      learnerId: 'learner-consistent',
      experimentationEnabled: true,
    });

    // Same learner should always get same result
    expect(result1.variantKey).toBe(result2.variantKey);
  });

  it('should include variant config in result', () => {
    const experiment = createTestExperiment({ status: 'RUNNING' });
    const variants = createTestVariants();

    const result = computeAssignment({
      experiment,
      variants,
      tenantId: 'tenant-123',
      learnerId: 'learner-456',
      experimentationEnabled: true,
    });

    expect(result.config).toBeDefined();
    expect(typeof result.config).toBe('object');
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// DISTRIBUTION VERIFICATION TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('verifyDistribution', () => {
  it('should produce distribution close to allocation', () => {
    const variants = createTestVariants();
    const distribution = verifyDistribution('dist_test', variants, 10000);

    const controlPercent = distribution.get('control') ?? 0;
    const treatmentPercent = distribution.get('treatment') ?? 0;

    // Should be close to 50/50
    expect(controlPercent).toBeGreaterThan(0.45);
    expect(controlPercent).toBeLessThan(0.55);
    expect(treatmentPercent).toBeGreaterThan(0.45);
    expect(treatmentPercent).toBeLessThan(0.55);
  });

  it('should handle unequal allocations', () => {
    const variants: ExperimentVariant[] = [
      {
        id: '1',
        experiment_id: 'exp',
        key: 'control',
        allocation: 0.9,
        config_json: {},
        created_at: new Date(),
      },
      {
        id: '2',
        experiment_id: 'exp',
        key: 'treatment',
        allocation: 0.1,
        config_json: {},
        created_at: new Date(),
      },
    ];

    const distribution = verifyDistribution('unequal_test', variants, 10000);

    const controlPercent = distribution.get('control') ?? 0;
    const treatmentPercent = distribution.get('treatment') ?? 0;

    expect(controlPercent).toBeGreaterThan(0.85);
    expect(controlPercent).toBeLessThan(0.95);
    expect(treatmentPercent).toBeGreaterThan(0.05);
    expect(treatmentPercent).toBeLessThan(0.15);
  });
});

describe('isDistributionValid', () => {
  it('should return true for valid distribution', () => {
    const variants = createTestVariants();
    const distribution = new Map([
      ['control', 0.49],
      ['treatment', 0.51],
    ]);

    expect(isDistributionValid(distribution, variants, 0.02)).toBe(true);
  });

  it('should return false for invalid distribution', () => {
    const variants = createTestVariants();
    const distribution = new Map([
      ['control', 0.7],
      ['treatment', 0.3],
    ]);

    expect(isDistributionValid(distribution, variants, 0.02)).toBe(false);
  });
});
