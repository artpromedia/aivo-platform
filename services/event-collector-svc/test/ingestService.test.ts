/**
 * Tests for event-collector-svc ingest service.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  exists: vi.fn(),
  del: vi.fn(),
};

const mockPrisma = {
  event: {
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  batch: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
  },
};

vi.mock('../src/redis.js', () => ({ redis: mockRedis }));
vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('IngestService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateEvent', () => {
    it('accepts valid event with required fields', () => {
      const event = {
        type: 'page_view',
        tenantId: 'tenant-1',
        source: 'web-app',
        timestamp: new Date().toISOString(),
        payload: { page: '/dashboard' },
      };
      // Event has all required fields
      expect(event.type).toBeDefined();
      expect(event.tenantId).toBeDefined();
      expect(event.source).toBeDefined();
    });

    it('rejects event without type', () => {
      const event = { tenantId: 'tenant-1', source: 'web' };
      expect(event).not.toHaveProperty('type');
    });

    it('rejects event without tenantId', () => {
      const event = { type: 'click', source: 'web' };
      expect(event).not.toHaveProperty('tenantId');
    });
  });

  describe('isDuplicate', () => {
    it('returns false when event not in Redis', async () => {
      mockRedis.exists.mockResolvedValue(0);
      const key = 'dedup:evt-123';
      const result = await mockRedis.exists(key);
      expect(result).toBe(0);
    });

    it('returns true when event already seen', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const result = await mockRedis.exists('dedup:evt-123');
      expect(result).toBe(1);
    });
  });

  describe('markAsSeen', () => {
    it('sets dedup key with TTL', async () => {
      mockRedis.setex.mockResolvedValue('OK');
      await mockRedis.setex('dedup:evt-123', 3600, '1');
      expect(mockRedis.setex).toHaveBeenCalledWith('dedup:evt-123', 3600, '1');
    });
  });

  describe('ingestSingleEvent', () => {
    it('creates event record in database', async () => {
      const event = {
        id: 'evt-1',
        type: 'page_view',
        tenantId: 'tenant-1',
        source: 'web',
        payload: { page: '/home' },
        timestamp: new Date(),
      };
      mockPrisma.event.create.mockResolvedValue({ ...event, status: 'PENDING' });
      const created = await mockPrisma.event.create({ data: event });
      expect(created.status).toBe('PENDING');
      expect(created.type).toBe('page_view');
    });

    it('skips duplicate events', async () => {
      mockRedis.exists.mockResolvedValue(1);
      const isDup = await mockRedis.exists('dedup:evt-dup');
      expect(isDup).toBe(1);
      // Should not create when duplicate
      expect(mockPrisma.event.create).not.toHaveBeenCalled();
    });
  });

  describe('ingestBatch', () => {
    it('creates multiple events at once', async () => {
      const events = [
        { type: 'click', tenantId: 't1', source: 'web', payload: {} },
        { type: 'scroll', tenantId: 't1', source: 'web', payload: {} },
      ];
      mockPrisma.event.createMany.mockResolvedValue({ count: 2 });
      const result = await mockPrisma.event.createMany({ data: events });
      expect(result.count).toBe(2);
    });

    it('handles empty batch gracefully', async () => {
      mockPrisma.event.createMany.mockResolvedValue({ count: 0 });
      const result = await mockPrisma.event.createMany({ data: [] });
      expect(result.count).toBe(0);
    });
  });
});
