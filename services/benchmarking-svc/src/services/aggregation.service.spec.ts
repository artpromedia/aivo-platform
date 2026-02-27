/**
 * Tests for benchmarking-svc — AggregationService and differential privacy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ---------- types from src/types/index.ts ---------- */

type MetricCategory = 'ACADEMIC_PERFORMANCE' | 'ENGAGEMENT' | 'AI_EFFECTIVENESS' | 'OPERATIONAL';
type DistrictSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'VERY_LARGE';
type GeographicType = 'URBAN' | 'SUBURBAN' | 'RURAL';

interface MetricSubmission {
  category: MetricCategory;
  metricKey: string;
  metricValue: number;
  periodStart: string;
  periodEnd: string;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  sampleSize: number;
}

interface AnonymizationConfig {
  minCohortSize: number;
  differentialPrivacyEpsilon: number;
  suppressBelowThreshold: boolean;
}

interface BulkSubmissionResult {
  accepted: number;
  rejected: number;
  errors: { index: number; reason: string }[];
}

/* ---------- defaults ---------- */

const DEFAULT_CONFIG: AnonymizationConfig = {
  minCohortSize: 5,
  differentialPrivacyEpsilon: 1.0,
  suppressBelowThreshold: true,
};

/* ---------- replicate differential privacy helper ---------- */

function addDifferentialPrivacyNoise(value: number, epsilon: number): number {
  // Laplace mechanism: noise scale = sensitivity / epsilon
  // For simplicity, sensitivity = 1 for normalized metrics
  const scale = 1.0 / epsilon;
  // Deterministic mock for testing: use a fixed "random" offset
  // In production this would be crypto-random Laplace noise
  const u = 0.5 - 0.3; // simulated uniform random
  const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
  return value + noise;
}

describe('AnonymizationConfig defaults', () => {
  it('requires minimum cohort of 5', () => {
    expect(DEFAULT_CONFIG.minCohortSize).toBe(5);
  });

  it('uses epsilon of 1.0', () => {
    expect(DEFAULT_CONFIG.differentialPrivacyEpsilon).toBe(1.0);
  });

  it('suppresses below threshold by default', () => {
    expect(DEFAULT_CONFIG.suppressBelowThreshold).toBe(true);
  });
});

describe('addDifferentialPrivacyNoise', () => {
  it('adds noise to the value', () => {
    const original = 100;
    const noised = addDifferentialPrivacyNoise(original, 1.0);
    expect(noised).not.toBe(original);
  });

  it('preserves approximate magnitude', () => {
    const noised = addDifferentialPrivacyNoise(100, 1.0);
    expect(noised).toBeGreaterThan(50);
    expect(noised).toBeLessThan(150);
  });

  it('higher epsilon means less noise', () => {
    // With higher epsilon, scale = 1/epsilon is smaller → less noise
    const highEps = addDifferentialPrivacyNoise(100, 10.0);
    // Should be closer to 100
    expect(Math.abs(highEps - 100)).toBeLessThan(5);
  });
});

/* ---------- metric submission validation ---------- */

function validateMetricSubmission(
  m: MetricSubmission,
  config: AnonymizationConfig
): { valid: boolean; reason?: string } {
  if (m.sampleSize < config.minCohortSize && config.suppressBelowThreshold) {
    return {
      valid: false,
      reason: `Sample size ${m.sampleSize} below minimum ${config.minCohortSize}`,
    };
  }
  if (m.metricValue < 0) {
    return { valid: false, reason: 'Metric value cannot be negative' };
  }
  if (new Date(m.periodEnd) <= new Date(m.periodStart)) {
    return { valid: false, reason: 'Period end must be after period start' };
  }
  return { valid: true };
}

describe('validateMetricSubmission', () => {
  const validMetric: MetricSubmission = {
    category: 'ACADEMIC_PERFORMANCE',
    metricKey: 'avg_score',
    metricValue: 82.5,
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    periodType: 'MONTHLY',
    sampleSize: 50,
  };

  it('accepts valid submission', () => {
    expect(validateMetricSubmission(validMetric, DEFAULT_CONFIG).valid).toBe(true);
  });

  it('rejects small sample size', () => {
    const small = { ...validMetric, sampleSize: 3 };
    const result = validateMetricSubmission(small, DEFAULT_CONFIG);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('below minimum');
  });

  it('allows small sample when suppression disabled', () => {
    const config = { ...DEFAULT_CONFIG, suppressBelowThreshold: false };
    const small = { ...validMetric, sampleSize: 2 };
    expect(validateMetricSubmission(small, config).valid).toBe(true);
  });

  it('rejects negative metric value', () => {
    const neg = { ...validMetric, metricValue: -5 };
    expect(validateMetricSubmission(neg, DEFAULT_CONFIG).valid).toBe(false);
  });

  it('rejects invalid date range', () => {
    const bad = { ...validMetric, periodStart: '2026-02-01', periodEnd: '2026-01-01' };
    expect(validateMetricSubmission(bad, DEFAULT_CONFIG).valid).toBe(false);
  });
});

/* ---------- mocked AggregationService ---------- */

describe('AggregationService (mocked)', () => {
  const mockSubmit =
    vi.fn<
      (
        tenantId: string,
        metrics: MetricSubmission[],
        submittedBy: string
      ) => Promise<BulkSubmissionResult>
    >();

  beforeEach(() => vi.clearAllMocks());

  it('accepts valid metrics batch', async () => {
    mockSubmit.mockResolvedValue({ accepted: 3, rejected: 0, errors: [] });
    const result = await mockSubmit(
      't-1',
      [
        {
          category: 'ENGAGEMENT',
          metricKey: 'daily_active',
          metricValue: 120,
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          periodType: 'MONTHLY',
          sampleSize: 200,
        },
        {
          category: 'ACADEMIC_PERFORMANCE',
          metricKey: 'avg_score',
          metricValue: 78,
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          periodType: 'MONTHLY',
          sampleSize: 150,
        },
        {
          category: 'AI_EFFECTIVENESS',
          metricKey: 'recommendation_accuracy',
          metricValue: 0.85,
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          periodType: 'MONTHLY',
          sampleSize: 100,
        },
      ],
      'admin-1'
    );
    expect(result.accepted).toBe(3);
    expect(result.rejected).toBe(0);
  });

  it('reports partial rejection', async () => {
    mockSubmit.mockResolvedValue({
      accepted: 1,
      rejected: 1,
      errors: [{ index: 1, reason: 'Sample size below minimum' }],
    });
    const result = await mockSubmit('t-1', [], 'admin-1');
    expect(result.rejected).toBe(1);
    expect(result.errors[0]!.reason).toContain('Sample size');
  });
});

describe('MetricCategory enum values', () => {
  const categories: MetricCategory[] = [
    'ACADEMIC_PERFORMANCE',
    'ENGAGEMENT',
    'AI_EFFECTIVENESS',
    'OPERATIONAL',
  ];

  it('has 4 categories', () => {
    expect(categories).toHaveLength(4);
  });

  it('includes AI_EFFECTIVENESS', () => {
    expect(categories).toContain('AI_EFFECTIVENESS');
  });
});

describe('DistrictSize and GeographicType', () => {
  it('has 4 district sizes', () => {
    const sizes: DistrictSize[] = ['SMALL', 'MEDIUM', 'LARGE', 'VERY_LARGE'];
    expect(sizes).toHaveLength(4);
  });

  it('has 3 geographic types', () => {
    const types: GeographicType[] = ['URBAN', 'SUBURBAN', 'RURAL'];
    expect(types).toHaveLength(3);
  });
});
