/**
 * Routes Tests
 *
 * Integration tests for HTTP API.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  CreateExperimentInputSchema,
  LogExposureInputSchema,
  AssignmentQuerySchema,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION TESTS
// ════════════════════════════════════════════════════════════════════════════════

describe('CreateExperimentInputSchema', () => {
  it('should accept valid experiment input', () => {
    const input = {
      key: 'focus_session_length',
      name: 'Focus Session Length Test',
      description: 'Test longer vs shorter focus sessions',
      scope: 'LEARNER',
      variants: [
        { key: 'control', allocation: 0.5, config: { sessionMinutes: 25 } },
        { key: 'treatment', allocation: 0.5, config: { sessionMinutes: 45 } },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject experiment with allocations not summing to 1', () => {
    const input = {
      key: 'test_exp',
      name: 'Test',
      scope: 'LEARNER',
      variants: [
        { key: 'control', allocation: 0.3 },
        { key: 'treatment', allocation: 0.3 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject experiment with less than 2 variants', () => {
    const input = {
      key: 'test_exp',
      name: 'Test',
      scope: 'LEARNER',
      variants: [{ key: 'control', allocation: 1.0 }],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject experiment with invalid key format', () => {
    const input = {
      key: 'Invalid Key With Spaces',
      name: 'Test',
      scope: 'LEARNER',
      variants: [
        { key: 'control', allocation: 0.5 },
        { key: 'treatment', allocation: 0.5 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should accept experiment with optional fields', () => {
    const input = {
      key: 'minimal_exp',
      name: 'Minimal',
      scope: 'TENANT',
      variants: [
        { key: 'control', allocation: 0.5 },
        { key: 'treatment', allocation: 0.5 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept experiment with time bounds', () => {
    const input = {
      key: 'timed_exp',
      name: 'Timed Experiment',
      scope: 'LEARNER',
      variants: [
        { key: 'control', allocation: 0.5 },
        { key: 'treatment', allocation: 0.5 },
      ],
      startAt: '2024-01-01T00:00:00Z',
      endAt: '2024-12-31T23:59:59Z',
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });
});

describe('LogExposureInputSchema', () => {
  it('should accept valid exposure input', () => {
    const input = {
      experimentKey: 'focus_session_length',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      learnerId: '550e8400-e29b-41d4-a716-446655440001',
      variantKey: 'treatment',
      featureArea: 'focus_agent',
    };

    const result = LogExposureInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept exposure without learnerId', () => {
    const input = {
      experimentKey: 'tenant_level_exp',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      variantKey: 'control',
      featureArea: 'onboarding',
    };

    const result = LogExposureInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should accept exposure with metadata', () => {
    const input = {
      experimentKey: 'test_exp',
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      variantKey: 'treatment',
      featureArea: 'recommendations',
      metadata: { source: 'home_page', position: 1 },
    };

    const result = LogExposureInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject exposure with invalid tenantId', () => {
    const input = {
      experimentKey: 'test_exp',
      tenantId: 'not-a-uuid',
      variantKey: 'control',
      featureArea: 'test',
    };

    const result = LogExposureInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe('AssignmentQuerySchema', () => {
  it('should accept valid query', () => {
    const query = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      learnerId: '550e8400-e29b-41d4-a716-446655440001',
    };

    const result = AssignmentQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should accept query without learnerId', () => {
    const query = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
    };

    const result = AssignmentQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should accept query with force parameter', () => {
    const query = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      force: 'treatment',
    };

    const result = AssignmentQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it('should reject query without tenantId', () => {
    const query = {
      learnerId: '550e8400-e29b-41d4-a716-446655440001',
    };

    const result = AssignmentQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// EDGE CASES
// ════════════════════════════════════════════════════════════════════════════════

describe('Edge Cases', () => {
  it('should handle three-way split', () => {
    const input = {
      key: 'three_way',
      name: 'Three Way Split',
      scope: 'LEARNER' as const,
      variants: [
        { key: 'control', allocation: 0.34 },
        { key: 'treatment_a', allocation: 0.33 },
        { key: 'treatment_b', allocation: 0.33 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should handle 90/10 split', () => {
    const input = {
      key: 'holdout',
      name: 'Holdout Test',
      scope: 'LEARNER' as const,
      variants: [
        { key: 'control', allocation: 0.9 },
        { key: 'treatment', allocation: 0.1 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject allocation > 1', () => {
    const input = {
      key: 'invalid',
      name: 'Invalid',
      scope: 'LEARNER' as const,
      variants: [
        { key: 'control', allocation: 1.5 },
        { key: 'treatment', allocation: 0.5 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should reject negative allocation', () => {
    const input = {
      key: 'invalid',
      name: 'Invalid',
      scope: 'LEARNER' as const,
      variants: [
        { key: 'control', allocation: -0.5 },
        { key: 'treatment', allocation: 1.5 },
      ],
    };

    const result = CreateExperimentInputSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});
