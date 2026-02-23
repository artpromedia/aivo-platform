/**
 * xAPI Service — Unit Tests
 *
 * Tests cover:
 * 1. storeStatement persists and returns ID
 * 2. getStatement retrieves by ID + tenantId
 * 3. queryStatements filters by verb
 * 4. queryStatements filters by activity
 * 5. mapAndStoreEvent maps session.completed to xAPI statement
 * 6. mapAndStoreEvent returns null for unknown event type
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { XapiService, AIVO_VERB_MAP } from '../src/xapi/xapi.service.js';

// ── Mock Prisma ──────────────────────────────────────────────────────────────

const mockXapiStatement = {
  create: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
};

const mockPrisma = {
  xapiStatement: mockXapiStatement,
} as unknown;

// ── Tests ────────────────────────────────────────────────────────────────────

describe('XapiService', () => {
  let service: XapiService;

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new XapiService(mockPrisma as any);
  });

  describe('storeStatement', () => {
    it('persists a statement and returns its ID', async () => {
      mockXapiStatement.create.mockResolvedValue({ id: 'stmt-1' });

      const id = await service.storeStatement(
        {
          actor: { mbox: 'mailto:student@school.edu' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed', display: { 'en-US': 'completed' } },
          object: { id: 'https://aivo.app/activities/lesson-1', objectType: 'Activity' },
        },
        'tenant-1'
      );

      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(mockXapiStatement.create).toHaveBeenCalledOnce();

      const createArg = mockXapiStatement.create.mock.calls[0][0];
      expect(createArg.data.tenantId).toBe('tenant-1');
      expect(createArg.data.version).toBe('1.0.3');
    });

    it('uses provided ID when given', async () => {
      mockXapiStatement.create.mockResolvedValue({ id: 'custom-id' });

      const id = await service.storeStatement(
        {
          id: 'custom-id',
          actor: { mbox: 'mailto:test@test.com' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
          object: { id: 'https://example.com/act/1' },
        },
        'tenant-1'
      );

      expect(id).toBe('custom-id');
      const createArg = mockXapiStatement.create.mock.calls[0][0];
      expect(createArg.data.id).toBe('custom-id');
    });
  });

  describe('getStatement', () => {
    it('retrieves a statement by ID scoped to tenant', async () => {
      mockXapiStatement.findFirst.mockResolvedValue({
        id: 'stmt-1',
        tenantId: 'tenant-1',
        actor: { mbox: 'mailto:a@b.com' },
        verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
        object: { id: 'https://aivo.app/act/1' },
        result: null,
        context: null,
        timestamp: new Date('2025-01-15T10:00:00Z'),
        stored: new Date('2025-01-15T10:00:01Z'),
        authority: null,
        version: '1.0.3',
      });

      const stmt = await service.getStatement('stmt-1', 'tenant-1');

      expect(stmt).not.toBeNull();
      expect(stmt!.id).toBe('stmt-1');
      expect(stmt!.verb.id).toBe('http://adlnet.gov/expapi/verbs/completed');
      expect(mockXapiStatement.findFirst).toHaveBeenCalledWith({
        where: { id: 'stmt-1', tenantId: 'tenant-1' },
      });
    });

    it('returns null when not found', async () => {
      mockXapiStatement.findFirst.mockResolvedValue(null);

      const result = await service.getStatement('nonexistent', 'tenant-1');
      expect(result).toBeNull();
    });
  });

  describe('queryStatements', () => {
    it('filters by verb IRI', async () => {
      mockXapiStatement.findMany.mockResolvedValue([]);

      await service.queryStatements('tenant-1', {
        verb: 'http://adlnet.gov/expapi/verbs/completed',
      });

      const where = mockXapiStatement.findMany.mock.calls[0][0].where;
      expect(where.verb).toEqual({
        path: ['id'],
        equals: 'http://adlnet.gov/expapi/verbs/completed',
      });
    });

    it('filters by activity IRI', async () => {
      mockXapiStatement.findMany.mockResolvedValue([]);

      await service.queryStatements('tenant-1', {
        activity: 'https://aivo.app/activities/lesson-42',
      });

      const where = mockXapiStatement.findMany.mock.calls[0][0].where;
      expect(where.object).toEqual({
        path: ['id'],
        equals: 'https://aivo.app/activities/lesson-42',
      });
    });

    it('returns more link when results exceed limit', async () => {
      // Return limit+1 rows to trigger "more"
      const rows = Array.from({ length: 3 }, (_, i) => ({
        id: `s${i}`,
        actor: {},
        verb: {},
        object: {},
        result: null,
        context: null,
        timestamp: new Date(),
        stored: new Date(),
        authority: null,
        version: '1.0.3',
      }));
      mockXapiStatement.findMany.mockResolvedValue(rows);

      const result = await service.queryStatements('tenant-1', { limit: 2 });

      expect(result.statements).toHaveLength(2);
      expect(result.more).toContain('offset=2');
    });
  });

  describe('mapAndStoreEvent', () => {
    it('maps session.completed to xAPI completed verb', async () => {
      mockXapiStatement.create.mockResolvedValue({ id: 'mapped-1' });

      const id = await service.mapAndStoreEvent('session.completed', 'tenant-1', {
        userId: 'user-1',
        userEmail: 'student@school.edu',
        activityId: 'lesson-42',
        activityName: 'Fractions Intro',
        score: 85,
        maxScore: 100,
        success: true,
        sessionId: 'sess-abc',
      });

      expect(id).toBeDefined();
      const createArg = mockXapiStatement.create.mock.calls[0][0];
      expect(createArg.data.verb).toMatchObject({
        id: 'http://adlnet.gov/expapi/verbs/completed',
      });
      expect(createArg.data.actor).toMatchObject({
        mbox: 'mailto:student@school.edu',
      });
    });

    it('returns null for unknown event types', async () => {
      const id = await service.mapAndStoreEvent('unknown.event', 'tenant-1', {
        userId: 'user-1',
        activityId: 'act-1',
      });

      expect(id).toBeNull();
      expect(mockXapiStatement.create).not.toHaveBeenCalled();
    });
  });

  describe('AIVO_VERB_MAP', () => {
    it('maps all expected event types', () => {
      const expectedEvents = [
        'session.completed',
        'session.started',
        'assessment.submitted',
        'lesson.completed',
      ];

      for (const event of expectedEvents) {
        expect(AIVO_VERB_MAP[event]).toBeDefined();
        expect(AIVO_VERB_MAP[event].id).toMatch(/^http/);
      }
    });
  });
});
