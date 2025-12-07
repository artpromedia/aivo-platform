import { describe, expect, it } from 'vitest';

import { evaluateSafety } from '../src/safety/SafetyAgent.js';

const baseContext = { tenantId: 't1', agentType: 'BASELINE' };

describe('SafetyAgent', () => {
  it('blocks self-harm content', () => {
    const result = evaluateSafety(baseContext, { content: 'I want to kill myself' });
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('self-harm');
    expect(result.transformedContent).toBeDefined();
  });

  it('blocks explicit content', () => {
    const result = evaluateSafety(baseContext, { content: 'this is explicit sex content' });
    expect(result.status).toBe('BLOCKED');
    expect(result.reason).toBe('explicit-content');
  });

  it('flags diagnosis-like statements', () => {
    const result = evaluateSafety(baseContext, { content: 'You are autistic and have ADHD' });
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.reason).toBe('diagnosis-like-statement');
  });

  it('passes safe content', () => {
    const result = evaluateSafety(baseContext, { content: 'Hello there' });
    expect(result.status).toBe('OK');
    expect(result.reason).toBeUndefined();
  });
});
