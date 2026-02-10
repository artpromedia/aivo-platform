import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';
import {
  EventPublisher,
  InMemoryTransport,
  EventValidationError,
  MissingTenantIdError,
  createEventPublisher,
} from '../src/event-publisher.js';

// Test event schema
const TestEventSchema = z.object({
  eventId: z.string(),
  tenantId: z.string(),
  eventType: z.string(),
  eventVersion: z.string(),
  timestamp: z.string(),
  source: z.object({
    service: z.string(),
    version: z.string(),
  }),
  payload: z.object({
    message: z.string(),
  }),
});

describe('EventPublisher', () => {
  let transport: InMemoryTransport;
  let publisher: EventPublisher;

  beforeEach(() => {
    transport = new InMemoryTransport();
    publisher = new EventPublisher({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      transport,
      throwOnError: true,
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    });
  });

  describe('publish', () => {
    it('publishes a valid event with auto-populated fields', async () => {
      const result = await publisher.publish('test-topic', TestEventSchema, {
        tenantId: 'tenant-123',
        eventType: 'test.created',
        payload: { message: 'hello' },
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBeDefined();

      const events = transport.getEvents('test-topic');
      expect(events).toHaveLength(1);
      expect(events[0].tenantId).toBe('tenant-123');
      expect(events[0].eventType).toBe('test.created');
      expect(events[0].source.service).toBe('test-service');
      expect(events[0].source.version).toBe('1.0.0');
      expect(events[0].eventVersion).toBe('1.0');
      expect(events[0].timestamp).toBeDefined();
    });

    it('rejects events without tenantId when throwOnError is true', async () => {
      await expect(
        publisher.publish('test-topic', TestEventSchema, {
          eventType: 'test.created',
          payload: { message: 'hello' },
        } as any)
      ).rejects.toThrow(MissingTenantIdError);
    });

    it('returns failure for missing tenantId when throwOnError is false', async () => {
      const quietPublisher = new EventPublisher({
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        transport,
        throwOnError: false,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      const result = await quietPublisher.publish('test-topic', TestEventSchema, {
        eventType: 'test.created',
        payload: { message: 'hello' },
      } as any);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing tenantId');
    });

    it('rejects events with empty tenantId', async () => {
      await expect(
        publisher.publish('test-topic', TestEventSchema, {
          tenantId: '',
          eventType: 'test.created',
          payload: { message: 'hello' },
        })
      ).rejects.toThrow(MissingTenantIdError);
    });

    it('throws EventValidationError for invalid schema when throwOnError is true', async () => {
      const StrictSchema = z.object({
        eventId: z.string(),
        tenantId: z.string(),
        eventType: z.literal('strict.type'),
        eventVersion: z.string(),
        timestamp: z.string(),
        source: z.object({ service: z.string(), version: z.string() }),
        payload: z.object({ count: z.number() }),
      });

      await expect(
        publisher.publish('test-topic', StrictSchema, {
          tenantId: 'tenant-123',
          eventType: 'strict.type',
          payload: { count: 'not-a-number' } as any,
        })
      ).rejects.toThrow(EventValidationError);
    });
  });

  describe('publishBatch', () => {
    it('publishes multiple events', async () => {
      const result = await publisher.publishBatch('test-topic', TestEventSchema, [
        { tenantId: 'tenant-1', eventType: 'batch.1', payload: { message: 'a' } },
        { tenantId: 'tenant-2', eventType: 'batch.2', payload: { message: 'b' } },
        { tenantId: 'tenant-3', eventType: 'batch.3', payload: { message: 'c' } },
      ]);

      expect(result.totalEvents).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(transport.getEvents('test-topic')).toHaveLength(3);
    });

    it('counts failures in batch results', async () => {
      const quietPublisher = new EventPublisher({
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        transport,
        throwOnError: false,
        logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      });

      const result = await quietPublisher.publishBatch('test-topic', TestEventSchema, [
        { tenantId: 'tenant-1', eventType: 'ok', payload: { message: 'a' } },
        { eventType: 'no-tenant', payload: { message: 'b' } } as any,
        { tenantId: 'tenant-3', eventType: 'ok', payload: { message: 'c' } },
      ]);

      expect(result.totalEvents).toBe(3);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });

  describe('publishRaw', () => {
    it('publishes a pre-validated event', async () => {
      const event = {
        eventId: 'raw-1',
        tenantId: 'tenant-123',
        eventType: 'raw.event',
        eventVersion: '1.0',
        timestamp: new Date().toISOString(),
        source: { service: 'test', version: '1.0.0' },
      };

      const result = await publisher.publishRaw('raw-topic', event);
      expect(result.success).toBe(true);
      expect(transport.getEvents('raw-topic')).toHaveLength(1);
    });

    it('rejects raw events without tenantId', async () => {
      await expect(
        publisher.publishRaw('raw-topic', {
          eventId: 'raw-1',
          tenantId: '',
          eventType: 'raw.event',
          eventVersion: '1.0',
          timestamp: new Date().toISOString(),
          source: { service: 'test', version: '1.0.0' },
        })
      ).rejects.toThrow(MissingTenantIdError);
    });
  });

  describe('close', () => {
    it('calls transport close when available', async () => {
      const closeFn = vi.fn();
      const closableTransport: any = {
        name: 'closable',
        publish: vi.fn(),
        close: closeFn,
      };

      const pub = new EventPublisher({
        serviceName: 'test',
        serviceVersion: '1.0.0',
        transport: closableTransport,
      });

      await pub.close();
      expect(closeFn).toHaveBeenCalled();
    });
  });
});

describe('InMemoryTransport', () => {
  it('stores and retrieves events by topic', async () => {
    const transport = new InMemoryTransport();
    const event = {
      eventId: '1',
      tenantId: 't1',
      eventType: 'test',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      source: { service: 'test', version: '1.0.0' },
    };

    await transport.publish('topic-a', event);
    expect(transport.getEvents('topic-a')).toHaveLength(1);
    expect(transport.getEvents('topic-b')).toHaveLength(0);
  });

  it('supports batch publish', async () => {
    const transport = new InMemoryTransport();
    const events = [1, 2, 3].map((i) => ({
      eventId: String(i),
      tenantId: 't1',
      eventType: 'test',
      eventVersion: '1.0',
      timestamp: new Date().toISOString(),
      source: { service: 'test', version: '1.0.0' },
    }));

    await transport.publishBatch('topic', events);
    expect(transport.getEvents('topic')).toHaveLength(3);
  });

  it('clears all events', async () => {
    const transport = new InMemoryTransport();
    await transport.publish('a', {
      eventId: '1',
      tenantId: 't',
      eventType: 't',
      eventVersion: '1.0',
      timestamp: '',
      source: { service: 's', version: '1' },
    });
    transport.clear();
    expect(transport.getEvents('a')).toHaveLength(0);
  });
});

describe('MissingTenantIdError', () => {
  it('includes event type in message', () => {
    const error = new MissingTenantIdError('user.created');
    expect(error.name).toBe('MissingTenantIdError');
    expect(error.message).toContain('user.created');
    expect(error.message).toContain('SECURITY');
  });
});

describe('EventValidationError', () => {
  it('stores validation errors', () => {
    const issues = [{ code: 'invalid_type', message: 'Expected string', path: ['field'] }] as any;
    const error = new EventValidationError('Validation failed', issues);
    expect(error.name).toBe('EventValidationError');
    expect(error.validationErrors).toBe(issues);
  });
});

describe('createEventPublisher', () => {
  it('creates a publisher from transport', () => {
    const transport = new InMemoryTransport();
    const pub = createEventPublisher(transport);
    expect(pub).toBeInstanceOf(EventPublisher);
  });
});
