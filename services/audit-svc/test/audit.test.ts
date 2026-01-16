/**
 * AIVO Audit Service - Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify from 'fastify';

import { createApp } from '../src/app.js';

// Mock Prisma client
vi.mock('../src/prisma.js', () => ({
  prisma: {
    auditLog: {
      create: vi.fn().mockResolvedValue({
        id: 'test-id',
        eventId: 'test-event-id',
        eventType: 'test.event',
        category: 'SYSTEM',
        severity: 'INFO',
        outcome: 'SUCCESS',
        tenantId: 'test-tenant',
        actorType: 'service',
        action: 'test',
        description: 'Test event',
        sourceService: 'test-svc',
        checksum: 'abc123',
        occurredAt: new Date(),
        receivedAt: new Date(),
        metadata: {},
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      groupBy: vi.fn().mockResolvedValue([]),
    },
    auditAccessLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    auditExport: {
      create: vi.fn().mockResolvedValue({
        id: 'export-id',
        status: 'PENDING',
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
    },
    auditPolicy: {
      create: vi.fn().mockResolvedValue({
        id: 'policy-id',
        name: 'Test Policy',
        isActive: true,
      }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
    auditAlert: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      count: vi.fn().mockResolvedValue(0),
      update: vi.fn().mockResolvedValue({}),
    },
    $disconnect: vi.fn(),
  },
}));

// Mock event consumer
vi.mock('../src/consumers/eventConsumer.js', () => ({
  startEventConsumer: vi.fn().mockResolvedValue(undefined),
  stopEventConsumer: vi.fn().mockResolvedValue(undefined),
}));

describe('Audit Service', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(async () => {
    app = createApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return ok status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        status: 'ok',
        service: 'audit-svc',
        version: '0.1.0',
      });
    });
  });

  describe('Audit Ingest', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/audit/ingest',
        payload: {
          eventType: 'test.event',
          category: 'SYSTEM',
          outcome: 'SUCCESS',
          actorType: 'service',
          action: 'test',
          description: 'Test event',
          sourceService: 'test-svc',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should ingest valid audit log with API key', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/audit/ingest',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
        payload: {
          eventType: 'test.event',
          category: 'SYSTEM',
          outcome: 'SUCCESS',
          actorType: 'service',
          action: 'test',
          description: 'Test event',
          sourceService: 'test-svc',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/audit/ingest',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
        payload: {
          // Missing required fields
          eventType: 'test.event',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Audit Query', () => {
    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/logs',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return paginated results', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/logs',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.pagination).toBeDefined();
    });
  });

  describe('Audit Stats', () => {
    it('should return statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/stats',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.totalCount).toBeDefined();
    });
  });

  describe('Audit Policies', () => {
    it('should create a policy', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/audit/policies',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
        payload: {
          name: 'Test Policy',
          description: 'A test policy',
          categories: ['AUTHENTICATION', 'AUTHORIZATION'],
          minSeverity: 'WARNING',
          retentionDays: 365,
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.name).toBe('Test Policy');
    });

    it('should list policies', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/policies',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
    });
  });

  describe('Audit Alerts', () => {
    it('should list alerts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/alerts',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data).toBeInstanceOf(Array);
    });

    it('should return alert counts', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/audit/alerts/counts',
        headers: {
          'x-api-key': 'dev-internal-key',
          'x-tenant-id': 'test-tenant-id',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.total).toBeDefined();
      expect(body.unacknowledged).toBeDefined();
    });
  });
});
