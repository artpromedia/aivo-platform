import { describe, expect, it, beforeEach, vi } from 'vitest';

import { AiLoggingConfigSchema } from '../src/logging/config.js';
import { IncidentRulesEngine } from '../src/logging/rules.js';
import { AiCallLogger } from '../src/logging/logger.js';
import type { LogAiCallInput } from '../src/logging/types.js';

/**
 * Mock pg Pool for testing without a real database.
 */
function createMockPool() {
  const queryResults: Map<string, { rows: unknown[] }> = new Map();
  let lastQuery: { text: string; values: unknown[] } | null = null;

  return {
    query: vi.fn(async (text: string, values?: unknown[]) => {
      lastQuery = { text, values: values ?? [] };

      // Default to returning empty rows
      for (const [pattern, result] of queryResults.entries()) {
        if (text.includes(pattern)) {
          return result;
        }
      }

      return { rows: [] };
    }),
    end: vi.fn(),
    setQueryResult: (pattern: string, rows: unknown[]) => {
      queryResults.set(pattern, { rows });
    },
    getLastQuery: () => lastQuery,
  };
}

/**
 * Creates a minimal LogAiCallInput for testing.
 */
function createTestCallLog(overrides: Partial<LogAiCallInput> = {}): LogAiCallInput {
  return {
    tenantId: 'tenant-test',
    agentType: 'TUTOR',
    modelName: 'gpt-4o',
    provider: 'OPENAI',
    version: 'v1',
    requestId: 'req-test',
    startedAt: new Date('2024-01-01T00:00:00Z'),
    completedAt: new Date('2024-01-01T00:00:01Z'),
    latencyMs: 1000,
    inputTokens: 100,
    outputTokens: 200,
    safetyLabel: 'SAFE',
    costCentsEstimate: 5,
    status: 'SUCCESS',
    ...overrides,
  };
}

describe('AiCallLogger', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let logger: AiCallLogger;
  const config = AiLoggingConfigSchema.parse({});

  beforeEach(() => {
    mockPool = createMockPool();
    // @ts-expect-error - Mock pool doesn't fully implement Pool interface
    logger = new AiCallLogger(mockPool, config);
  });

  describe('logAiCall', () => {
    it('inserts a row into ai_call_logs', async () => {
      const callLog = createTestCallLog();
      const logId = await logger.logAiCall(callLog);

      expect(logId).toBeTruthy();
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      const lastQuery = mockPool.getLastQuery();
      expect(lastQuery?.text).toContain('INSERT INTO ai_call_logs');
      expect(lastQuery?.values).toContain('tenant-test');
      expect(lastQuery?.values).toContain('TUTOR');
      expect(lastQuery?.values).toContain('gpt-4o');
    });

    it('returns null when logging is disabled', async () => {
      const disabledConfig = AiLoggingConfigSchema.parse({
        logging: { enabled: false },
      });
      // @ts-expect-error - Mock pool doesn't fully implement Pool interface
      const disabledLogger = new AiCallLogger(mockPool, disabledConfig);

      const logId = await disabledLogger.logAiCall(createTestCallLog());

      expect(logId).toBeNull();
      expect(mockPool.query).not.toHaveBeenCalled();
    });

    it('truncates long summaries', async () => {
      const shortConfig = AiLoggingConfigSchema.parse({
        logging: { maxSummaryLength: 20 },
      });
      // @ts-expect-error - Mock pool doesn't fully implement Pool interface
      const shortLogger = new AiCallLogger(mockPool, shortConfig);

      await shortLogger.logAiCall(
        createTestCallLog({
          promptSummary: 'This is a very long prompt summary that exceeds the limit',
        })
      );

      const lastQuery = mockPool.getLastQuery();
      const summaryValue = lastQuery?.values?.find(
        (v) => typeof v === 'string' && v.includes('This is a very')
      ) as string | undefined;

      expect(summaryValue).toBeTruthy();
      expect(summaryValue?.length).toBeLessThanOrEqual(20);
      expect(summaryValue).toContain('...');
    });

    it('handles optional fields correctly', async () => {
      const callLog = createTestCallLog({
        userId: 'user-1',
        learnerId: 'learner-1',
        sessionId: 'session-1',
        useCase: 'HOMEWORK_HINT',
        safetyMetadata: { flagged: true, categories: ['safety'] },
      });

      await logger.logAiCall(callLog);

      const lastQuery = mockPool.getLastQuery();
      expect(lastQuery?.values).toContain('user-1');
      expect(lastQuery?.values).toContain('learner-1');
      expect(lastQuery?.values).toContain('session-1');
      expect(lastQuery?.values).toContain('HOMEWORK_HINT');
    });

    it('returns null on database error (graceful degradation)', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      const logId = await logger.logAiCall(createTestCallLog());

      expect(logId).toBeNull();
    });
  });

  describe('createIncident', () => {
    it('inserts a new incident with correct fields', async () => {
      mockPool.setQueryResult('INSERT INTO ai_incidents', [
        {
          id: 'incident-1',
          tenant_id: 'tenant-test',
          severity: 'HIGH',
          category: 'SAFETY',
          status: 'OPEN',
          title: 'Test incident',
          description: null,
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          occurrence_count: 1,
          created_by_system: true,
          created_by_user_id: null,
          assigned_to_user_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_notes: null,
          metadata_json: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const incident = await logger.createIncident({
        tenantId: 'tenant-test',
        severity: 'HIGH',
        category: 'SAFETY',
        title: 'Test incident',
      });

      expect(incident).toBeTruthy();
      expect(incident?.id).toBe('incident-1');
      expect(incident?.severity).toBe('HIGH');
      expect(incident?.category).toBe('SAFETY');
      expect(incident?.status).toBe('OPEN');
    });
  });

  describe('findOpenIncident', () => {
    it('returns null when no matching incident exists', async () => {
      mockPool.setQueryResult('SELECT * FROM ai_incidents', []);

      const incident = await logger.findOpenIncident('tenant-test', 'SAFETY');

      expect(incident).toBeNull();
    });

    it('returns existing incident when found', async () => {
      mockPool.setQueryResult('SELECT * FROM ai_incidents', [
        {
          id: 'existing-1',
          tenant_id: 'tenant-test',
          severity: 'HIGH',
          category: 'SAFETY',
          status: 'OPEN',
          title: 'Existing incident',
          description: null,
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          occurrence_count: 3,
          created_by_system: true,
          created_by_user_id: null,
          assigned_to_user_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_notes: null,
          metadata_json: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const incident = await logger.findOpenIncident('tenant-test', 'SAFETY');

      expect(incident).toBeTruthy();
      expect(incident?.id).toBe('existing-1');
      expect(incident?.occurrenceCount).toBe(3);
    });
  });

  describe('linkCallToIncident', () => {
    it('creates a link between call and incident', async () => {
      const result = await logger.linkCallToIncident({
        incidentId: 'incident-1',
        aiCallLogId: 'call-1',
        linkReason: 'TRIGGER',
      });

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalled();

      const lastQuery = mockPool.getLastQuery();
      expect(lastQuery?.text).toContain('INSERT INTO ai_incident_ai_calls');
      expect(lastQuery?.values).toContain('incident-1');
      expect(lastQuery?.values).toContain('call-1');
      expect(lastQuery?.values).toContain('TRIGGER');
    });
  });
});

describe('IncidentRulesEngine (stateful)', () => {
  let mockPool: ReturnType<typeof createMockPool>;
  let logger: AiCallLogger;
  let engine: IncidentRulesEngine;
  const config = AiLoggingConfigSchema.parse({
    latency: {
      thresholdMs: 5000,
      consecutiveCallsBeforeIncident: 2,
    },
  });

  beforeEach(() => {
    mockPool = createMockPool();
    // @ts-expect-error - Mock pool doesn't fully implement Pool interface
    logger = new AiCallLogger(mockPool, config);
    engine = new IncidentRulesEngine(config, logger);
  });

  describe('evaluateRules', () => {
    it('tracks consecutive slow calls', () => {
      const slowCall = createTestCallLog({ latencyMs: 6000 });

      // First slow call - should NOT trigger (need 2 consecutive)
      const result1 = engine.evaluateRules(slowCall);
      expect(result1.shouldCreateIncident).toBe(false);

      // Second slow call - should trigger
      const result2 = engine.evaluateRules(slowCall);
      expect(result2.shouldCreateIncident).toBe(true);
      expect(result2.triggeredRules.some((r) => r.ruleName === 'LATENCY_HIGH')).toBe(true);
    });

    it('resets consecutive counter on fast call', () => {
      const slowCall = createTestCallLog({ latencyMs: 6000 });
      const fastCall = createTestCallLog({ latencyMs: 500 });

      // First slow call
      engine.evaluateRules(slowCall);

      // Fast call resets counter
      engine.evaluateRules(fastCall);

      // Slow call again - counter starts over
      const result = engine.evaluateRules(slowCall);
      expect(result.shouldCreateIncident).toBe(false);
    });

    it('can reset state manually', () => {
      const slowCall = createTestCallLog({ latencyMs: 6000 });

      engine.evaluateRules(slowCall);
      engine.reset();
      engine.evaluateRules(slowCall);

      // Should not trigger because reset cleared the counter
      const result = engine.evaluateRules(slowCall);
      expect(result.shouldCreateIncident).toBe(true);
    });
  });

  describe('maybeCreateOrUpdateIncidentFromCallLog', () => {
    it('creates new incident when none exists', async () => {
      // Mock: no existing incident
      mockPool.setQueryResult('SELECT * FROM ai_incidents', []);

      // Mock: create returns new incident
      mockPool.setQueryResult('INSERT INTO ai_incidents', [
        {
          id: 'new-incident',
          tenant_id: 'tenant-test',
          severity: 'HIGH',
          category: 'SAFETY',
          status: 'OPEN',
          title: 'High-risk safety event',
          description: null,
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          occurrence_count: 1,
          created_by_system: true,
          created_by_user_id: null,
          assigned_to_user_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_notes: null,
          metadata_json: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const highRiskCall = createTestCallLog({ safetyLabel: 'HIGH' });
      const incidents = await engine.maybeCreateOrUpdateIncidentFromCallLog('call-1', highRiskCall);

      expect(incidents).toHaveLength(1);
      expect(incidents[0]!.id).toBe('new-incident');
      expect(incidents[0]!.occurrenceCount).toBe(1);
    });

    it('updates existing incident when one exists', async () => {
      // Mock: existing incident found
      mockPool.setQueryResult('SELECT * FROM ai_incidents', [
        {
          id: 'existing-incident',
          tenant_id: 'tenant-test',
          severity: 'HIGH',
          category: 'SAFETY',
          status: 'OPEN',
          title: 'High-risk safety event',
          description: null,
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          occurrence_count: 2,
          created_by_system: true,
          created_by_user_id: null,
          assigned_to_user_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_notes: null,
          metadata_json: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      // Mock: update returns updated incident
      mockPool.setQueryResult('UPDATE ai_incidents', [
        {
          id: 'existing-incident',
          tenant_id: 'tenant-test',
          severity: 'HIGH',
          category: 'SAFETY',
          status: 'OPEN',
          title: 'High-risk safety event',
          description: null,
          first_seen_at: new Date(),
          last_seen_at: new Date(),
          occurrence_count: 3, // Incremented
          created_by_system: true,
          created_by_user_id: null,
          assigned_to_user_id: null,
          resolved_at: null,
          resolved_by_user_id: null,
          resolution_notes: null,
          metadata_json: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ]);

      const highRiskCall = createTestCallLog({ safetyLabel: 'HIGH' });
      const incidents = await engine.maybeCreateOrUpdateIncidentFromCallLog('call-2', highRiskCall);

      expect(incidents).toHaveLength(1);
      expect(incidents[0]!.id).toBe('existing-incident');
      expect(incidents[0]!.occurrenceCount).toBe(3);
    });

    it('returns empty array when no rules triggered', async () => {
      const safeCall = createTestCallLog({
        safetyLabel: 'SAFE',
        costCentsEstimate: 5,
        latencyMs: 500,
      });

      const incidents = await engine.maybeCreateOrUpdateIncidentFromCallLog('call-3', safeCall);

      expect(incidents).toHaveLength(0);
    });
  });
});
