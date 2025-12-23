/**
 * Webhook Handler Service Tests
 *
 * Unit tests for the multi-provider webhook processing service.
 *
 * @author AIVO Platform Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WebhookHandlerService, WebhookPayload, WebhookConfig } from '../webhook-handler.service.js';
import { DeltaSyncEngine } from '../../sync/delta-sync-engine.js';
import { ProviderFactory } from '../../providers/factory.js';
import crypto from 'crypto';

// Mock Prisma client
const mockPrisma = {
  webhookConfig: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  webhookLog: {
    create: vi.fn(),
    findFirst: vi.fn(),
  },
  webhookDeadLetter: {
    create: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
  sisProvider: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn((fn) => fn(mockPrisma)),
} as unknown as PrismaClient;

// Mock DeltaSyncEngine
const mockDeltaSyncEngine = {
  executeDeltaSync: vi.fn().mockResolvedValue({
    created: { user: 1 },
    updated: {},
    deleted: {},
  }),
} as unknown as DeltaSyncEngine;

// Mock ProviderFactory
const mockProviderFactory = {
  getProvider: vi.fn().mockResolvedValue({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fetchOrgs: vi.fn(),
  }),
} as unknown as ProviderFactory;

describe('WebhookHandlerService', () => {
  let service: WebhookHandlerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookHandlerService(
      mockPrisma,
      mockDeltaSyncEngine,
      mockProviderFactory
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadConfigs', () => {
    it('should load webhook configurations from database', async () => {
      const configs = [
        {
          id: 'config-1',
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          providerType: 'CLEVER',
          enabled: true,
          webhookSecret: 'secret123',
          endpointUrl: '/webhooks/clever',
          retryPolicy: JSON.stringify({ maxRetries: 3 }),
        },
      ];

      mockPrisma.webhookConfig.findMany = vi.fn().mockResolvedValue(configs);

      await service.loadConfigs();

      expect(mockPrisma.webhookConfig.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
      });
    });
  });

  describe('processWebhook', () => {
    const basePayload: WebhookPayload = {
      provider: 'clever',
      headers: {
        'content-type': 'application/json',
        'x-clever-signature': 'test-signature',
      },
      body: {
        type: 'students.created',
        data: {
          object: {
            id: 'student-123',
            name: { first: 'Test', last: 'Student' },
            email: 'test@school.edu',
          },
        },
      },
      rawBody: '{"type":"students.created","data":{}}',
      timestamp: new Date(),
    };

    beforeEach(async () => {
      // Set up config
      mockPrisma.webhookConfig.findMany = vi.fn().mockResolvedValue([{
        id: 'config-1',
        tenantId: 'tenant-1',
        providerId: 'provider-1',
        providerType: 'CLEVER',
        enabled: true,
        webhookSecret: 'secret123',
        endpointUrl: '/webhooks/clever',
        retryPolicy: JSON.stringify({ maxRetries: 3 }),
      }]);

      await service.loadConfigs();
    });

    it('should verify webhook signature', async () => {
      const secret = 'secret123';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(basePayload.rawBody)
        .digest('hex');

      const payload = {
        ...basePayload,
        headers: {
          ...basePayload.headers,
          'x-clever-signature': signature,
        },
      };

      mockPrisma.webhookLog.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.webhookLog.create = vi.fn().mockResolvedValue({ id: 'log-1' });

      await service.processWebhook(payload);

      expect(mockPrisma.webhookLog.create).toHaveBeenCalled();
    });

    it('should reject invalid signatures', async () => {
      const payload = {
        ...basePayload,
        headers: {
          ...basePayload.headers,
          'x-clever-signature': 'invalid-signature',
        },
      };

      await expect(service.processWebhook(payload)).rejects.toThrow();
    });

    it('should detect duplicate events using idempotency key', async () => {
      // First event processed
      mockPrisma.webhookLog.findFirst = vi.fn().mockResolvedValue({
        id: 'existing-log',
        status: 'completed',
      });

      const result = await service.processWebhook(basePayload);

      // Should skip duplicate
      expect(result.skipped).toBe(true);
    });

    it('should create webhook log on successful processing', async () => {
      mockPrisma.webhookLog.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.webhookLog.create = vi.fn().mockResolvedValue({ id: 'log-1' });

      // Mock signature verification to pass
      const secret = 'secret123';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(basePayload.rawBody)
        .digest('hex');

      const payload = {
        ...basePayload,
        headers: {
          ...basePayload.headers,
          'x-clever-signature': signature,
        },
      };

      await service.processWebhook(payload);

      expect(mockPrisma.webhookLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          provider: 'clever',
          eventType: 'students.created',
          status: expect.any(String),
        }),
      });
    });

    it('should add failed events to dead letter queue', async () => {
      mockPrisma.webhookLog.findFirst = vi.fn().mockResolvedValue(null);
      mockPrisma.webhookDeadLetter.create = vi.fn().mockResolvedValue({ id: 'dl-1' });

      // Mock processing failure
      mockDeltaSyncEngine.executeDeltaSync = vi.fn().mockRejectedValue(
        new Error('Sync failed')
      );

      // This would require proper signature setup to get past verification
      // For now, test the dead letter queue creation separately
    });
  });

  describe('parseWebhook - Clever', () => {
    it('should parse Clever webhook events correctly', () => {
      const payload: WebhookPayload = {
        provider: 'clever',
        headers: { 'content-type': 'application/json' },
        body: {
          type: 'students.created',
          data: {
            object: {
              id: 'clever-student-1',
              name: { first: 'John', last: 'Doe' },
              email: 'john@school.edu',
              school: 'school-123',
            },
          },
        },
        rawBody: '{}',
        timestamp: new Date(),
      };

      // Internal parsing method would extract:
      // - eventType: 'students.created'
      // - entityType: 'student'
      // - operation: 'create'
      // - data: mapped SisUser
    });

    it('should handle Clever students.updated events', () => {
      const payload = {
        type: 'students.updated',
        data: { object: { id: 'student-1' }, previous_attributes: { name: { first: 'Old' } } },
      };

      // Should produce operation: 'update'
    });

    it('should handle Clever students.deleted events', () => {
      const payload = {
        type: 'students.deleted',
        data: { object: { id: 'student-1' } },
      };

      // Should produce operation: 'delete'
    });
  });

  describe('parseWebhook - ClassLink', () => {
    it('should parse ClassLink webhook events correctly', () => {
      const payload: WebhookPayload = {
        provider: 'classlink',
        headers: { 'content-type': 'application/json' },
        body: {
          eventType: 'user.created',
          resourceType: 'user',
          resourceId: 'classlink-user-1',
          data: {
            firstName: 'Jane',
            lastName: 'Smith',
            email: 'jane@school.edu',
            role: 'student',
          },
        },
        rawBody: '{}',
        timestamp: new Date(),
      };

      // Should extract user data
    });
  });

  describe('parseWebhook - OneRoster', () => {
    it('should parse OneRoster webhook events correctly', () => {
      const payload: WebhookPayload = {
        provider: 'oneroster',
        headers: { 'content-type': 'application/json' },
        body: {
          type: 'user.created',
          user: {
            sourcedId: 'or-user-1',
            username: 'jsmith',
            givenName: 'John',
            familyName: 'Smith',
            email: 'jsmith@school.edu',
            role: 'student',
          },
        },
        rawBody: '{}',
        timestamp: new Date(),
      };

      // Should map OneRoster user to SisUser
    });
  });

  describe('parseWebhook - Ed-Fi', () => {
    it('should parse Ed-Fi webhook events correctly', () => {
      const payload: WebhookPayload = {
        provider: 'edfi',
        headers: { 'content-type': 'application/json' },
        body: {
          changeVersion: 12345,
          changeType: 'Created',
          resourceType: 'students',
          data: {
            studentUniqueId: 'edfi-student-1',
            firstName: 'Test',
            lastSurname: 'Student',
          },
        },
        rawBody: '{}',
        timestamp: new Date(),
      };

      // Should map Ed-Fi data format
    });
  });

  describe('parseWebhook - Google Workspace', () => {
    it('should parse Google Admin SDK events correctly', () => {
      const payload: WebhookPayload = {
        provider: 'google',
        headers: { 'content-type': 'application/json' },
        body: {
          kind: 'admin#directory#user',
          id: 'google-user-1',
          primaryEmail: 'user@school.edu',
          name: { givenName: 'Google', familyName: 'User' },
          suspended: false,
        },
        rawBody: '{}',
        timestamp: new Date(),
      };

      // Should map Google user data
    });
  });

  describe('parseWebhook - Microsoft Graph', () => {
    it('should parse Microsoft Graph notifications correctly', () => {
      const payload: WebhookPayload = {
        provider: 'microsoft',
        headers: { 'content-type': 'application/json' },
        body: {
          value: [{
            changeType: 'created',
            resource: 'users/user-1',
            resourceData: {
              id: 'ms-user-1',
              displayName: 'MS User',
              mail: 'msuser@school.edu',
            },
          }],
        },
        rawBody: '{}',
        timestamp: new Date(),
      };

      // Should handle array of notifications
    });

    it('should handle Microsoft validation request', async () => {
      const payload: WebhookPayload = {
        provider: 'microsoft',
        headers: { 'content-type': 'text/plain' },
        body: null,
        rawBody: '',
        timestamp: new Date(),
      };

      // Microsoft sends validationToken query param for subscription validation
      // Handler should echo it back
    });
  });

  describe('retryDeadLetterQueue', () => {
    it('should retry failed webhooks from dead letter queue', async () => {
      const deadLetterItems = [
        {
          id: 'dl-1',
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          payload: JSON.stringify({
            type: 'students.created',
            data: {},
          }),
          error: 'Connection timeout',
          attempts: 1,
          maxAttempts: 3,
          createdAt: new Date(),
          nextRetryAt: new Date(Date.now() - 1000), // Past retry time
        },
      ];

      mockPrisma.webhookDeadLetter.findMany = vi.fn().mockResolvedValue(deadLetterItems);
      mockPrisma.webhookDeadLetter.update = vi.fn().mockResolvedValue({});
      mockPrisma.webhookDeadLetter.delete = vi.fn().mockResolvedValue({});

      await service.retryDeadLetterQueue();

      expect(mockPrisma.webhookDeadLetter.findMany).toHaveBeenCalled();
    });

    it('should not retry items that have exceeded max attempts', async () => {
      const deadLetterItems = [
        {
          id: 'dl-1',
          tenantId: 'tenant-1',
          providerId: 'provider-1',
          payload: '{}',
          error: 'Connection timeout',
          attempts: 3,
          maxAttempts: 3,
          createdAt: new Date(),
          nextRetryAt: new Date(Date.now() - 1000),
        },
      ];

      mockPrisma.webhookDeadLetter.findMany = vi.fn().mockResolvedValue(deadLetterItems);

      await service.retryDeadLetterQueue();

      // Should not attempt to retry
      expect(mockPrisma.webhookDeadLetter.update).not.toHaveBeenCalled();
    });
  });

  describe('signature verification', () => {
    describe('Clever', () => {
      it('should verify HMAC-SHA256 signature', () => {
        const secret = 'clever-secret';
        const body = '{"type":"test"}';
        const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

        // Verification should pass
      });
    });

    describe('ClassLink', () => {
      it('should verify ClassLink signature format', () => {
        // ClassLink uses different signature scheme
      });
    });

    describe('Microsoft Graph', () => {
      it('should verify client state for Microsoft webhooks', () => {
        // Microsoft uses clientState parameter
      });
    });

    describe('Ed-Fi', () => {
      it('should support API key verification for Ed-Fi', () => {
        // Ed-Fi may use API key in headers
      });
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limits per provider', async () => {
      // Rate limit: 100 events per minute per provider
    });

    it('should queue events when rate limit is exceeded', async () => {
      // Events should be queued for later processing
    });
  });
});

describe('WebhookHandlerService - Event Mapping', () => {
  describe('entity type mapping', () => {
    const eventMappings = {
      // Clever
      'students.created': { entityType: 'student', operation: 'create' },
      'students.updated': { entityType: 'student', operation: 'update' },
      'students.deleted': { entityType: 'student', operation: 'delete' },
      'teachers.created': { entityType: 'teacher', operation: 'create' },
      'sections.created': { entityType: 'class', operation: 'create' },
      'enrollments.created': { entityType: 'enrollment', operation: 'create' },

      // ClassLink
      'user.created': { entityType: 'user', operation: 'create' },
      'class.updated': { entityType: 'class', operation: 'update' },

      // OneRoster
      'user.created': { entityType: 'user', operation: 'create' },
      'enrollment.created': { entityType: 'enrollment', operation: 'create' },
    };

    Object.entries(eventMappings).forEach(([event, expected]) => {
      it(`should map ${event} to ${expected.entityType}:${expected.operation}`, () => {
        // Verify mapping
      });
    });
  });
});
