/**
 * Safety Pre-Filter Tests
 *
 * Tests PII detection, sensitive topic detection, and content blocking
 * BEFORE requests reach the LLM.
 */

import { describe, expect, it } from 'vitest';

import { safetyPreFilter } from '../src/safety/preFilter.js';
import type { AiRequest } from '../src/types/aiRequest.js';

function createRequest(content: string, overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    tenantId: 'tenant-123',
    userId: 'user-456',
    learnerId: 'learner-789',
    agentType: 'HOMEWORK_HELPER',
    input: content,
    locale: 'en-US',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// PII DETECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: PII Detection', () => {
  it('detects and redacts email addresses', () => {
    const request = createRequest('My email is john.doe@example.com, please help');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('REDACT');
    expect(result.sanitizedInput).not.toContain('john.doe@example.com');
    expect(result.sanitizedInput).toContain('[EMAIL]');
    expect(result.flags.some((f) => f.category === 'PII_DETECTED')).toBe(true);
  });

  it('detects and redacts phone numbers', () => {
    const request = createRequest('Call me at 555-123-4567 or (555) 987-6543');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('REDACT');
    expect(result.sanitizedInput).not.toContain('555-123-4567');
    expect(result.sanitizedInput).toContain('[PHONE]');
  });

  it('detects and redacts SSN patterns', () => {
    const request = createRequest('My SSN is 123-45-6789');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('REDACT');
    expect(result.sanitizedInput).not.toContain('123-45-6789');
    expect(result.sanitizedInput).toContain('[SSN]');
  });

  it('allows content without PII', () => {
    const request = createRequest('Help me solve this math problem: 2 + 2');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('ALLOW');
    expect(result.flags).toHaveLength(0);
    expect(result.sanitizedInput).toBe(request.input);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SELF-HARM DETECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: Self-Harm Detection', () => {
  it('blocks explicit self-harm statements', () => {
    const request = createRequest('I want to kill myself');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('BLOCK');
    expect(result.flags.some((f) => f.category === 'SELF_HARM' && f.severity === 'HIGH')).toBe(
      true
    );
    expect(result.safeResponse).toBeDefined();
    expect(result.incident).toBeDefined();
    expect(result.incident?.category).toBe('SELF_HARM');
  });

  it('blocks suicidal ideation expressions', () => {
    const requests = [
      "I don't want to live anymore",
      'I wish I were dead',
      'I want to end my life',
    ];

    for (const input of requests) {
      const result = safetyPreFilter(createRequest(input));
      expect(result.action).toBe('BLOCK');
      expect(result.flags.some((f) => f.category === 'SELF_HARM')).toBe(true);
    }
  });

  it('provides safe response that routes to trusted adults', () => {
    const request = createRequest('I want to hurt myself');
    const result = safetyPreFilter(request);

    expect(result.safeResponse).toBeDefined();
    // Verify the response encourages talking to trusted adults
    expect(result.safeResponse?.toLowerCase()).toMatch(/parent|teacher|counselor|adult/);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ABUSE DETECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: Abuse Detection', () => {
  it('detects physical abuse indicators', () => {
    const request = createRequest('My dad hits me when he gets angry');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('BLOCK');
    expect(result.flags.some((f) => f.category === 'ABUSE_DETECTED')).toBe(true);
  });

  it('detects fear of home environment', () => {
    const request = createRequest("I'm afraid to go home after school");
    const result = safetyPreFilter(request);

    expect(result.action).toBe('BLOCK');
    expect(result.flags.some((f) => f.category === 'ABUSE_DETECTED')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// EXPLICIT CONTENT TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: Explicit Content', () => {
  it('blocks sexually explicit content', () => {
    const request = createRequest('Show me porn videos please');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('BLOCK');
    expect(result.flags.some((f) => f.category === 'EXPLICIT_CONTENT')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// VIOLENCE DETECTION TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: Violence Detection', () => {
  it('blocks violent threats toward others', () => {
    const request = createRequest('I want to kill someone at school');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('BLOCK');
    expect(result.flags.some((f) => f.category === 'VIOLENCE_DETECTED')).toBe(true);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SAFE CONTENT TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: Safe Content', () => {
  it('allows normal homework questions', () => {
    const request = createRequest('What is the capital of France?');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('ALLOW');
    expect(result.flags).toHaveLength(0);
    expect(result.sanitizedInput).toBe(request.input);
  });

  it('allows math problems', () => {
    const request = createRequest('How do I solve 2x + 5 = 15?');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('ALLOW');
  });

  it('allows discussing feelings without crisis indicators', () => {
    // Use text that won't trigger any PII or sensitive patterns
    // Note: "I am [Capitalized]" triggers NAME_INTRO pattern, so use lowercase
    const request = createRequest('feeling good about the upcoming test');
    const result = safetyPreFilter(request);

    expect(result.action).toBe('ALLOW');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// INCIDENT LOGGING TESTS
// ────────────────────────────────────────────────────────────────────────────

describe('Safety Pre-Filter: Incident Logging', () => {
  it('creates incident for self-harm detection', () => {
    const request = createRequest('I want to end my life');
    const result = safetyPreFilter(request);

    expect(result.incident).toBeDefined();
    expect(result.incident?.category).toBe('SELF_HARM');
    expect(result.incident?.severity).toBe('HIGH');
    expect(result.incident?.tenantId).toBe(request.tenantId);
  });

  it('creates incident for abuse detection', () => {
    const request = createRequest('My parent hits me');
    const result = safetyPreFilter(request);

    expect(result.incident).toBeDefined();
    expect(result.incident?.category).toBe('ABUSE_DETECTED');
    expect(result.incident?.severity).toBe('HIGH');
  });
});
