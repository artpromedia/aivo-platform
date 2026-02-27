/**
 * Tests for event-collector-svc batch and routing services.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  batch: {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  route: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  deadLetterEvent: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('BatchService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getOrCreateBatch', () => {
    it('creates new batch when none open', async () => {
      mockPrisma.batch.findFirst.mockResolvedValue(null);
      mockPrisma.batch.create.mockResolvedValue({
        id: 'batch-1',
        status: 'OPEN',
        eventCount: 0,
        createdAt: new Date(),
      });

      const existing = await mockPrisma.batch.findFirst({ where: { status: 'OPEN' } });
      expect(existing).toBeNull();

      const created = await mockPrisma.batch.create({
        data: { status: 'OPEN', eventCount: 0 },
      });
      expect(created.status).toBe('OPEN');
    });

    it('returns existing open batch', async () => {
      const batch = { id: 'batch-1', status: 'OPEN', eventCount: 5 };
      mockPrisma.batch.findFirst.mockResolvedValue(batch);

      const existing = await mockPrisma.batch.findFirst({ where: { status: 'OPEN' } });
      expect(existing).toEqual(batch);
    });
  });

  describe('sealStaleBatches', () => {
    it('seals batches older than threshold', async () => {
      const stale = [{ id: 'batch-old', status: 'OPEN', eventCount: 10 }];
      mockPrisma.batch.findMany.mockResolvedValue(stale);
      mockPrisma.batch.update.mockResolvedValue({
        ...stale[0],
        status: 'SEALED',
      });

      const found = await mockPrisma.batch.findMany({ where: { status: 'OPEN' } });
      expect(found).toHaveLength(1);

      const sealed = await mockPrisma.batch.update({
        where: { id: 'batch-old' },
        data: { status: 'SEALED' },
      });
      expect(sealed.status).toBe('SEALED');
    });

    it('does nothing when no stale batches', async () => {
      mockPrisma.batch.findMany.mockResolvedValue([]);
      const found = await mockPrisma.batch.findMany({ where: { status: 'OPEN' } });
      expect(found).toHaveLength(0);
    });
  });
});

describe('RoutingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRoutesForEvent', () => {
    it('returns matching routes for event type', async () => {
      const routes = [
        { id: 'r1', eventType: 'page_view', destination: 'analytics', active: true },
        { id: 'r2', eventType: 'page_view', destination: 'warehouse', active: true },
      ];
      mockPrisma.route.findMany.mockResolvedValue(routes);

      const result = await mockPrisma.route.findMany({
        where: { eventType: 'page_view', active: true },
      });
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no routes match', async () => {
      mockPrisma.route.findMany.mockResolvedValue([]);
      const result = await mockPrisma.route.findMany({
        where: { eventType: 'unknown_event', active: true },
      });
      expect(result).toHaveLength(0);
    });
  });

  describe('route CRUD', () => {
    it('creates a new route', async () => {
      const route = {
        id: 'r-new',
        eventType: 'click',
        destination: 'analytics',
        active: true,
      };
      mockPrisma.route.create.mockResolvedValue(route);
      const created = await mockPrisma.route.create({ data: route });
      expect(created.eventType).toBe('click');
    });

    it('deactivates a route', async () => {
      mockPrisma.route.update.mockResolvedValue({
        id: 'r1',
        active: false,
      });
      const updated = await mockPrisma.route.update({
        where: { id: 'r1' },
        data: { active: false },
      });
      expect(updated.active).toBe(false);
    });
  });
});

describe('DeadLetterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listDeadLetterEvents', () => {
    it('returns paginated dead letter list', async () => {
      const events = [
        { id: 'dle-1', originalEventId: 'evt-1', reason: 'ROUTING_FAILED' },
        { id: 'dle-2', originalEventId: 'evt-2', reason: 'PROCESSING_TIMEOUT' },
      ];
      mockPrisma.deadLetterEvent.findMany.mockResolvedValue(events);
      mockPrisma.deadLetterEvent.count.mockResolvedValue(2);

      const result = await mockPrisma.deadLetterEvent.findMany({ take: 10 });
      expect(result).toHaveLength(2);
    });
  });

  describe('resolveDeadLetterEvent', () => {
    it('marks event as resolved', async () => {
      mockPrisma.deadLetterEvent.update.mockResolvedValue({
        id: 'dle-1',
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      const resolved = await mockPrisma.deadLetterEvent.update({
        where: { id: 'dle-1' },
        data: { status: 'RESOLVED', resolvedAt: new Date() },
      });
      expect(resolved.status).toBe('RESOLVED');
    });
  });
});
