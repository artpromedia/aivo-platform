import { describe, it, expect } from 'vitest';

import {
  getStepsWithStatus,
  getCompletionPercentage,
  getNextIncompleteStep,
  isFlowComplete,
} from '../src/types.js';
import type { OnboardingFlow, OnboardingStep, OnboardingProgress } from '../src/types.js';

// ── Test fixtures ────────────────────────────────────────────────

function makeStep(id: string, overrides: Partial<OnboardingStep> = {}): OnboardingStep {
  return {
    id,
    title: `Step ${id}`,
    description: `Description for ${id}`,
    completionKey: `${id}_done`,
    ...overrides,
  };
}

function makeFlow(steps: OnboardingStep[]): OnboardingFlow {
  return {
    id: 'test-flow',
    title: 'Test Flow',
    description: 'Test',
    role: 'teacher',
    steps,
    completionRoute: '/done',
    completionMessage: 'All done!',
  };
}

// ── getStepsWithStatus ───────────────────────────────────────────

describe('getStepsWithStatus()', () => {
  const steps = [makeStep('a'), makeStep('b'), makeStep('c')];
  const flow = makeFlow(steps);

  it('marks completed steps', () => {
    const result = getStepsWithStatus(flow, {
      completedSteps: ['a'],
      skippedSteps: [],
      currentStepId: 'b',
    });
    expect(result[0].status).toBe('completed');
  });

  it('marks current step', () => {
    const result = getStepsWithStatus(flow, {
      completedSteps: ['a'],
      skippedSteps: [],
      currentStepId: 'b',
    });
    expect(result[1].status).toBe('current');
  });

  it('marks upcoming steps', () => {
    const result = getStepsWithStatus(flow, {
      completedSteps: ['a'],
      skippedSteps: [],
      currentStepId: 'b',
    });
    expect(result[2].status).toBe('upcoming');
  });

  it('marks skipped steps', () => {
    const result = getStepsWithStatus(flow, {
      completedSteps: [],
      skippedSteps: ['a'],
      currentStepId: 'b',
    });
    expect(result[0].status).toBe('skipped');
  });

  it('includes stepNumber starting at 1', () => {
    const result = getStepsWithStatus(flow, {
      completedSteps: [],
      skippedSteps: [],
      currentStepId: null,
    });
    expect(result[0].stepNumber).toBe(1);
    expect(result[1].stepNumber).toBe(2);
    expect(result[2].stepNumber).toBe(3);
  });

  it('all upcoming when nothing done', () => {
    const result = getStepsWithStatus(flow, {
      completedSteps: [],
      skippedSteps: [],
      currentStepId: null,
    });
    expect(result.every(s => s.status === 'upcoming')).toBe(true);
  });
});

// ── getCompletionPercentage ──────────────────────────────────────

describe('getCompletionPercentage()', () => {
  it('returns 0% when no steps completed', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    expect(getCompletionPercentage(flow, { completedSteps: [] })).toBe(0);
  });

  it('returns 50% when half steps completed', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    expect(getCompletionPercentage(flow, { completedSteps: ['a'] })).toBe(50);
  });

  it('returns 100% when all steps completed', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    expect(getCompletionPercentage(flow, { completedSteps: ['a', 'b'] })).toBe(100);
  });

  it('returns 100% for empty flow', () => {
    const flow = makeFlow([]);
    expect(getCompletionPercentage(flow, { completedSteps: [] })).toBe(100);
  });

  it('rounds to integer', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b'), makeStep('c')]);
    const pct = getCompletionPercentage(flow, { completedSteps: ['a'] });
    expect(pct).toBe(33); // 1/3 ≈ 33.33 → 33
  });
});

// ── getNextIncompleteStep ────────────────────────────────────────

describe('getNextIncompleteStep()', () => {
  it('returns first step when nothing done', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    const next = getNextIncompleteStep(flow, { completedSteps: [], skippedSteps: [] });
    expect(next?.id).toBe('a');
  });

  it('returns next incomplete step', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b'), makeStep('c')]);
    const next = getNextIncompleteStep(flow, { completedSteps: ['a'], skippedSteps: [] });
    expect(next?.id).toBe('b');
  });

  it('skips completed and skipped steps', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b'), makeStep('c')]);
    const next = getNextIncompleteStep(flow, { completedSteps: ['a'], skippedSteps: ['b'] });
    expect(next?.id).toBe('c');
  });

  it('returns null when all done', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    const next = getNextIncompleteStep(flow, { completedSteps: ['a', 'b'], skippedSteps: [] });
    expect(next).toBeNull();
  });
});

// ── isFlowComplete ───────────────────────────────────────────────

describe('isFlowComplete()', () => {
  it('returns false when steps remain', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    expect(isFlowComplete(flow, { completedSteps: ['a'] })).toBe(false);
  });

  it('returns true when all steps completed', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    expect(isFlowComplete(flow, { completedSteps: ['a', 'b'] })).toBe(true);
  });

  it('returns true for empty flow', () => {
    const flow = makeFlow([]);
    expect(isFlowComplete(flow, { completedSteps: [] })).toBe(true);
  });

  it('skipped steps do NOT count as completed', () => {
    const flow = makeFlow([makeStep('a'), makeStep('b')]);
    expect(isFlowComplete(flow, { completedSteps: ['a'] })).toBe(false);
  });
});
