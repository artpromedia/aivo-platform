/**
 * Tests for onboarding-svc Zod request schemas.
 */
import { describe, it, expect } from 'vitest';
import {
  CompleteStepSchema,
  SkipStepSchema,
  MarkFeatureSeenSchema,
  CheckFeaturesSeenSchema,
} from '../src/schemas.js';

describe('CompleteStepSchema', () => {
  it('accepts valid step ID', () => {
    const result = CompleteStepSchema.safeParse({ stepId: 'step-1' });
    expect(result.success).toBe(true);
  });

  it('rejects empty step ID', () => {
    const result = CompleteStepSchema.safeParse({ stepId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing stepId', () => {
    const result = CompleteStepSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects step ID exceeding 100 chars', () => {
    const result = CompleteStepSchema.safeParse({ stepId: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('accepts step ID at max length', () => {
    const result = CompleteStepSchema.safeParse({ stepId: 'a'.repeat(100) });
    expect(result.success).toBe(true);
  });
});

describe('SkipStepSchema', () => {
  it('accepts valid step ID', () => {
    const result = SkipStepSchema.safeParse({ stepId: 'intro-tour' });
    expect(result.success).toBe(true);
  });

  it('rejects empty step ID', () => {
    const result = SkipStepSchema.safeParse({ stepId: '' });
    expect(result.success).toBe(false);
  });
});

describe('MarkFeatureSeenSchema', () => {
  it('accepts valid feature key', () => {
    const result = MarkFeatureSeenSchema.safeParse({ featureKey: 'new-dashboard' });
    expect(result.success).toBe(true);
  });

  it('rejects empty feature key', () => {
    const result = MarkFeatureSeenSchema.safeParse({ featureKey: '' });
    expect(result.success).toBe(false);
  });

  it('rejects feature key exceeding 200 chars', () => {
    const result = MarkFeatureSeenSchema.safeParse({ featureKey: 'x'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects missing featureKey', () => {
    const result = MarkFeatureSeenSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('CheckFeaturesSeenSchema', () => {
  it('accepts valid feature key array', () => {
    const result = CheckFeaturesSeenSchema.safeParse({
      featureKeys: ['dashboard-v2', 'new-gradebook'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = CheckFeaturesSeenSchema.safeParse({ featureKeys: [] });
    expect(result.success).toBe(false);
  });

  it('rejects array exceeding 50 items', () => {
    const keys = Array.from({ length: 51 }, (_, i) => `feature-${i}`);
    const result = CheckFeaturesSeenSchema.safeParse({ featureKeys: keys });
    expect(result.success).toBe(false);
  });

  it('rejects keys exceeding 200 chars', () => {
    const result = CheckFeaturesSeenSchema.safeParse({
      featureKeys: ['x'.repeat(201)],
    });
    expect(result.success).toBe(false);
  });

  it('accepts array at max length', () => {
    const keys = Array.from({ length: 50 }, (_, i) => `feature-${i}`);
    const result = CheckFeaturesSeenSchema.safeParse({ featureKeys: keys });
    expect(result.success).toBe(true);
  });

  it('rejects missing featureKeys', () => {
    const result = CheckFeaturesSeenSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
