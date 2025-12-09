import { describe, expect, it } from 'vitest';

import { evaluateSafety } from '../src/safety/SafetyAgent.js';

const baseContext = { tenantId: 't1', agentType: 'BASELINE' };

describe('SafetyAgent', () => {
  it('blocks self-harm content with HIGH label', () => {
    const result = evaluateSafety(baseContext, { content: 'I want to kill myself' });
    expect(result.status).toBe('BLOCKED');
    expect(result.label).toBe('HIGH');
    expect(result.reason).toBe('self-harm');
    expect(result.transformedContent).toBeDefined();
  });

  it('blocks explicit content with HIGH label', () => {
    const result = evaluateSafety(baseContext, { content: 'this is explicit sex content' });
    expect(result.status).toBe('BLOCKED');
    expect(result.label).toBe('HIGH');
    expect(result.reason).toBe('explicit-content');
  });

  it('flags diagnosis-like statements with MEDIUM label', () => {
    const result = evaluateSafety(baseContext, { content: 'You are autistic and have ADHD' });
    expect(result.status).toBe('NEEDS_REVIEW');
    expect(result.label).toBe('MEDIUM');
    expect(result.reason).toBe('diagnosis-like-statement');
  });

  it('passes safe content with SAFE label', () => {
    const result = evaluateSafety(baseContext, { content: 'Hello there' });
    expect(result.status).toBe('OK');
    expect(result.label).toBe('SAFE');
    expect(result.reason).toBeUndefined();
  });
});
