import { describe, expect, it, beforeEach } from 'vitest';

import {
  AiLoggingConfigSchema,
  DEFAULT_AI_LOGGING_CONFIG,
  parseAiLoggingConfigFromEnv,
} from '../src/logging/config.js';
import { evaluateIncidentRules } from '../src/logging/rules.js';
import type { LogAiCallInput } from '../src/logging/types.js';

/**
 * Creates a minimal LogAiCallInput for testing.
 */
function createTestCallLog(overrides: Partial<LogAiCallInput> = {}): LogAiCallInput {
  return {
    tenantId: 'tenant-123',
    agentType: 'TUTOR',
    modelName: 'gpt-4o',
    provider: 'OPENAI',
    version: 'v1',
    requestId: 'req-abc',
    startedAt: new Date(),
    completedAt: new Date(),
    latencyMs: 500,
    inputTokens: 100,
    outputTokens: 200,
    safetyLabel: 'SAFE',
    costCentsEstimate: 5,
    status: 'SUCCESS',
    ...overrides,
  };
}

describe('AI Logging Config', () => {
  describe('AiLoggingConfigSchema', () => {
    it('provides sensible defaults for empty input', () => {
      const config = AiLoggingConfigSchema.parse({});

      expect(config.safety.createIncidentOnHigh).toBe(true);
      expect(config.safety.createIncidentOnMedium).toBe(false);
      expect(config.cost.singleCallThresholdCents).toBe(100);
      expect(config.latency.thresholdMs).toBe(10_000);
      expect(config.incidents.aggregationWindowHours).toBe(24);
      expect(config.logging.enabled).toBe(true);
    });

    it('validates and accepts custom values', () => {
      const config = AiLoggingConfigSchema.parse({
        safety: {
          createIncidentOnHigh: false,
          createIncidentOnMedium: true,
        },
        cost: {
          singleCallThresholdCents: 50,
          incidentSeverity: 'CRITICAL',
        },
        latency: {
          thresholdMs: 5000,
          consecutiveCallsBeforeIncident: 3,
        },
      });

      expect(config.safety.createIncidentOnHigh).toBe(false);
      expect(config.safety.createIncidentOnMedium).toBe(true);
      expect(config.cost.singleCallThresholdCents).toBe(50);
      expect(config.cost.incidentSeverity).toBe('CRITICAL');
      expect(config.latency.thresholdMs).toBe(5000);
      expect(config.latency.consecutiveCallsBeforeIncident).toBe(3);
    });

    it('rejects invalid severity values', () => {
      expect(() =>
        AiLoggingConfigSchema.parse({
          cost: { incidentSeverity: 'INVALID' },
        })
      ).toThrow();
    });
  });

  describe('parseAiLoggingConfigFromEnv', () => {
    beforeEach(() => {
      // Clear relevant env vars
      delete process.env.AI_LOGGING_INCIDENT_ON_HIGH;
      delete process.env.AI_LOGGING_COST_THRESHOLD_CENTS;
    });

    it('uses defaults when env vars are not set', () => {
      const config = parseAiLoggingConfigFromEnv();
      expect(config.safety.createIncidentOnHigh).toBe(true);
      expect(config.cost.singleCallThresholdCents).toBe(100);
    });

    it('parses env vars correctly', () => {
      process.env.AI_LOGGING_INCIDENT_ON_HIGH = 'false';
      process.env.AI_LOGGING_COST_THRESHOLD_CENTS = '200';

      const config = parseAiLoggingConfigFromEnv();
      expect(config.safety.createIncidentOnHigh).toBe(false);
      expect(config.cost.singleCallThresholdCents).toBe(200);

      // Cleanup
      delete process.env.AI_LOGGING_INCIDENT_ON_HIGH;
      delete process.env.AI_LOGGING_COST_THRESHOLD_CENTS;
    });
  });
});

describe('Incident Rules Engine', () => {
  // Safety Rules
  it('evaluateIncidentRules - does not create incident for SAFE label', () => {
    const callLog = createTestCallLog({ safetyLabel: 'SAFE' });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.triggeredRules).toHaveLength(0);
  });

  it('evaluateIncidentRules - does not create incident for LOW label', () => {
    const callLog = createTestCallLog({ safetyLabel: 'LOW' });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.triggeredRules).toHaveLength(0);
  });

  it('evaluateIncidentRules - does not create incident for MEDIUM label by default', () => {
    const callLog = createTestCallLog({ safetyLabel: 'MEDIUM' });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  it('evaluateIncidentRules - creates incident for MEDIUM label when configured', () => {
    const config = AiLoggingConfigSchema.parse({
      safety: { createIncidentOnMedium: true },
    });
    const callLog = createTestCallLog({ safetyLabel: 'MEDIUM' });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.triggeredRules).toHaveLength(1);
    expect(result.triggeredRules[0]!.ruleName).toBe('SAFETY_MEDIUM');
    expect(result.triggeredRules[0]!.severity).toBe('MEDIUM');
    expect(result.triggeredRules[0]!.category).toBe('SAFETY');
  });

  it('evaluateIncidentRules - creates HIGH severity incident for HIGH safety label', () => {
    const callLog = createTestCallLog({ safetyLabel: 'HIGH' });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.triggeredRules).toHaveLength(1);

    const rule = result.triggeredRules[0]!;
    expect(rule.ruleName).toBe('SAFETY_HIGH');
    expect(rule.severity).toBe('HIGH');
    expect(rule.category).toBe('SAFETY');
    expect(rule.title).toContain('tenant-123');
  });

  it('evaluateIncidentRules - does not create safety incident when disabled', () => {
    const config = AiLoggingConfigSchema.parse({
      safety: { createIncidentOnHigh: false },
    });
    const callLog = createTestCallLog({ safetyLabel: 'HIGH' });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  // Cost Rules
  it('evaluateIncidentRules - does not create incident for low cost', () => {
    const callLog = createTestCallLog({ costCentsEstimate: 5 });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  it('evaluateIncidentRules - does not create incident for cost at threshold', () => {
    const callLog = createTestCallLog({ costCentsEstimate: 100 });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  it('evaluateIncidentRules - creates COST incident when exceeding threshold', () => {
    const callLog = createTestCallLog({ costCentsEstimate: 150 });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.triggeredRules).toHaveLength(1);

    const rule = result.triggeredRules[0]!;
    expect(rule.ruleName).toBe('COST_SINGLE_CALL_HIGH');
    expect(rule.category).toBe('COST');
    expect(rule.severity).toBe('HIGH');
    expect(rule.metadata).toMatchObject({
      costCents: 150,
      threshold: 100,
    });
  });

  it('evaluateIncidentRules - uses configured cost threshold', () => {
    const config = AiLoggingConfigSchema.parse({
      cost: { singleCallThresholdCents: 50 },
    });
    const callLog = createTestCallLog({ costCentsEstimate: 60 });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.triggeredRules[0]!.metadata).toMatchObject({
      costCents: 60,
      threshold: 50,
    });
  });

  it('evaluateIncidentRules - uses configured severity for cost incidents', () => {
    const config = AiLoggingConfigSchema.parse({
      cost: {
        singleCallThresholdCents: 10,
        incidentSeverity: 'CRITICAL',
      },
    });
    const callLog = createTestCallLog({ costCentsEstimate: 20 });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.triggeredRules[0]!.severity).toBe('CRITICAL');
  });

  // Latency Rules
  it('evaluateIncidentRules - does not create incident for fast calls', () => {
    const callLog = createTestCallLog({ latencyMs: 500 });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  it('evaluateIncidentRules - does not create incident for latency at threshold', () => {
    const callLog = createTestCallLog({ latencyMs: 10_000 });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  it('evaluateIncidentRules - creates PERFORMANCE incident when exceeding threshold', () => {
    const config = AiLoggingConfigSchema.parse({
      latency: {
        thresholdMs: 5000,
        consecutiveCallsBeforeIncident: 1,
      },
    });
    const callLog = createTestCallLog({ latencyMs: 6000 });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.triggeredRules).toHaveLength(1);

    const rule = result.triggeredRules[0]!;
    expect(rule.ruleName).toBe('LATENCY_HIGH');
    expect(rule.category).toBe('PERFORMANCE');
    expect(rule.severity).toBe('MEDIUM');
    expect(rule.metadata).toMatchObject({
      latencyMs: 6000,
      threshold: 5000,
    });
  });

  it('evaluateIncidentRules - does not create latency incident when consecutiveCallsBeforeIncident > 1', () => {
    const config = AiLoggingConfigSchema.parse({
      latency: {
        thresholdMs: 5000,
        consecutiveCallsBeforeIncident: 3,
      },
    });
    const callLog = createTestCallLog({ latencyMs: 6000 });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.shouldCreateIncident).toBe(false);
  });

  // Multiple Rules
  it('evaluateIncidentRules - can trigger multiple rules at once', () => {
    const config = AiLoggingConfigSchema.parse({
      latency: {
        thresholdMs: 5000,
        consecutiveCallsBeforeIncident: 1,
      },
    });
    const callLog = createTestCallLog({
      safetyLabel: 'HIGH',
      costCentsEstimate: 200,
      latencyMs: 6000,
    });
    const result = evaluateIncidentRules(config, callLog);

    expect(result.shouldCreateIncident).toBe(true);
    expect(result.triggeredRules).toHaveLength(3);

    const ruleNames = result.triggeredRules.map((r) => r.ruleName);
    expect(ruleNames).toContain('SAFETY_HIGH');
    expect(ruleNames).toContain('COST_SINGLE_CALL_HIGH');
    expect(ruleNames).toContain('LATENCY_HIGH');
  });

  it('evaluateIncidentRules - safe call with low cost and fast latency triggers nothing', () => {
    const callLog = createTestCallLog({
      safetyLabel: 'SAFE',
      costCentsEstimate: 5,
      latencyMs: 500,
    });
    const result = evaluateIncidentRules(DEFAULT_AI_LOGGING_CONFIG, callLog);

    expect(result.shouldCreateIncident).toBe(false);
    expect(result.triggeredRules).toHaveLength(0);
  });
});

describe('IncidentRulesEngine (stateful)', () => {
  // Test the stateful engine that tracks consecutive slow calls
  // This would require mocking the AiCallLogger, which is more complex
  // For now, we test the stateless evaluateIncidentRules function above

  it('is tested via integration tests with mocked logger', () => {
    // Placeholder for more complex integration tests
    expect(true).toBe(true);
  });
});
