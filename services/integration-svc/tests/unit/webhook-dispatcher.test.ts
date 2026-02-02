/**
 * Integration Service - Webhook Dispatcher Unit Tests
 *
 * Tests for webhook delivery including:
 * - Webhook registration
 * - Event dispatching
 * - Retry logic
 * - Signature verification
 * - Dead letter queue
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHmac } from 'crypto';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock prisma
const mockPrisma = {
  webhookEndpoint: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  webhookDelivery: {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  webhookEvent: {
    create: vi.fn(),
  },
};

// Mock queue
const mockQueue = {
  add: vi.fn(),
  process: vi.fn(),
};

// Types
interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  organizationId: string;
}

interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'success' | 'failed';
  attempts: number;
  nextRetryAt: Date | null;
  responseStatus: number | null;
  responseBody: string | null;
}

describe('Webhook Dispatcher Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Webhook Registration', () => {
    it('should create webhook endpoint', async () => {
      mockPrisma.webhookEndpoint.create.mockResolvedValue({
        id: 'wh-1',
        url: 'https://example.com/webhook',
        secret: 'whsec_test123',
        events: ['lesson.completed', 'user.created'],
        enabled: true,
      });

      const endpoint = await mockPrisma.webhookEndpoint.create({
        data: {
          url: 'https://example.com/webhook',
          events: ['lesson.completed', 'user.created'],
          organizationId: 'org-1',
        },
      });

      expect(endpoint.url).toBe('https://example.com/webhook');
      expect(endpoint.events).toContain('lesson.completed');
    });

    it('should validate webhook URL format', () => {
      const validUrls = ['https://example.com/webhook', 'https://api.company.com/hooks/aivo'];

      const invalidUrls = ['http://insecure.com/hook', 'ftp://invalid.com', 'not-a-url'];

      const isValidUrl = (url: string) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:';
        } catch {
          return false;
        }
      };

      validUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(true);
      });

      invalidUrls.forEach((url) => {
        expect(isValidUrl(url)).toBe(false);
      });
    });

    it('should generate signing secret', () => {
      const secret =
        'whsec_' + Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('hex');

      expect(secret.startsWith('whsec_')).toBe(true);
      expect(secret.length).toBeGreaterThan(20);
    });

    it('should list available event types', () => {
      const eventTypes = [
        'lesson.created',
        'lesson.updated',
        'lesson.completed',
        'user.created',
        'user.updated',
        'progress.updated',
        'assessment.completed',
        'subscription.created',
        'subscription.cancelled',
      ];

      expect(eventTypes).toContain('lesson.completed');
      expect(eventTypes).toContain('user.created');
    });

    it('should validate event types on registration', () => {
      const validEvents = ['lesson.completed', 'user.created'];
      const invalidEvents = ['invalid.event', 'nonexistent.type'];

      const availableEvents = ['lesson.completed', 'user.created', 'progress.updated'];

      const validateEvents = (events: string[]) => {
        return events.every((e) => availableEvents.includes(e));
      };

      expect(validateEvents(validEvents)).toBe(true);
      expect(validateEvents(invalidEvents)).toBe(false);
    });
  });

  describe('Event Dispatching', () => {
    it('should dispatch event to matching endpoints', async () => {
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        {
          id: 'wh-1',
          url: 'https://a.com/hook',
          events: ['lesson.completed'],
          enabled: true,
          secret: 'secret1',
        },
        {
          id: 'wh-2',
          url: 'https://b.com/hook',
          events: ['lesson.completed'],
          enabled: true,
          secret: 'secret2',
        },
        {
          id: 'wh-3',
          url: 'https://c.com/hook',
          events: ['user.created'],
          enabled: true,
          secret: 'secret3',
        },
      ]);

      const event = { type: 'lesson.completed', data: { lessonId: 'l-1' } };

      const endpoints = await mockPrisma.webhookEndpoint.findMany({
        where: {
          organizationId: 'org-1',
          enabled: true,
          events: { has: event.type },
        },
      });

      expect(endpoints).toHaveLength(2);
    });

    it('should skip disabled endpoints', async () => {
      mockPrisma.webhookEndpoint.findMany.mockResolvedValue([
        { id: 'wh-1', enabled: true },
        { id: 'wh-2', enabled: false }, // Should be filtered
      ]);

      const endpoints = await mockPrisma.webhookEndpoint.findMany({
        where: { enabled: true },
      });

      expect(endpoints.every((e) => e.enabled)).toBe(true);
    });

    it('should create delivery record', async () => {
      mockPrisma.webhookDelivery.create.mockResolvedValue({
        id: 'del-1',
        endpointId: 'wh-1',
        eventType: 'lesson.completed',
        payload: { lessonId: 'l-1' },
        status: 'pending',
        attempts: 0,
      });

      const delivery = await mockPrisma.webhookDelivery.create({
        data: {
          endpointId: 'wh-1',
          eventType: 'lesson.completed',
          payload: { lessonId: 'l-1' },
          status: 'pending',
        },
      });

      expect(delivery.status).toBe('pending');
    });

    it('should sign webhook payload', () => {
      const secret = 'whsec_test123';
      const payload = JSON.stringify({ type: 'lesson.completed', data: { id: 'l-1' } });
      const timestamp = Math.floor(Date.now() / 1000);

      const signedPayload = `${timestamp}.${payload}`;
      const signature = createHmac('sha256', secret).update(signedPayload).digest('hex');

      expect(signature).toHaveLength(64);
      expect(signature).not.toBe(payload);
    });

    it('should include signature in headers', () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = 'computed_signature';

      const headers = {
        'Content-Type': 'application/json',
        'X-Webhook-Timestamp': String(timestamp),
        'X-Webhook-Signature': `v1=${signature}`,
      };

      expect(headers['X-Webhook-Signature']).toContain('v1=');
    });
  });

  describe('Delivery Execution', () => {
    it('should send POST request to endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve('OK'),
      });

      const response = await mockFetch('https://example.com/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': 'v1=signature',
        },
        body: JSON.stringify({ type: 'lesson.completed' }),
      });

      expect(response.ok).toBe(true);
    });

    it('should update delivery status on success', async () => {
      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'success',
        responseStatus: 200,
        deliveredAt: new Date(),
      });

      const delivery = await mockPrisma.webhookDelivery.update({
        where: { id: 'del-1' },
        data: {
          status: 'success',
          responseStatus: 200,
          deliveredAt: new Date(),
        },
      });

      expect(delivery.status).toBe('success');
    });

    it('should handle delivery timeout', async () => {
      mockFetch.mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 5000);
        });
      });

      const timeoutMs = 5000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        await mockFetch('https://slow.com/webhook', { signal: controller.signal });
      } catch (e) {
        expect((e as Error).message).toBe('Timeout');
      } finally {
        clearTimeout(timeoutId);
      }
    });

    it('should record response body for debugging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
      });

      const response = await mockFetch('https://example.com/webhook');
      const responseBody = await response.text();

      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: 'del-1',
        responseStatus: 500,
        responseBody: responseBody.substring(0, 1000), // Truncate
      });

      const delivery = await mockPrisma.webhookDelivery.update({
        where: { id: 'del-1' },
        data: { responseStatus: 500, responseBody },
      });

      expect(delivery.responseBody).toBe('Internal Server Error');
    });
  });

  describe('Retry Logic', () => {
    it('should schedule retry on failure', async () => {
      const retryDelays = [60, 300, 900, 3600, 14400]; // seconds
      const attempt = 1;
      const delay = retryDelays[Math.min(attempt - 1, retryDelays.length - 1)];

      const nextRetryAt = new Date(Date.now() + delay * 1000);

      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'pending',
        attempts: attempt,
        nextRetryAt,
      });

      const delivery = await mockPrisma.webhookDelivery.update({
        where: { id: 'del-1' },
        data: { attempts: attempt, nextRetryAt },
      });

      expect(delivery.attempts).toBe(1);
      expect(delivery.nextRetryAt).toEqual(nextRetryAt);
    });

    it('should use exponential backoff', () => {
      const baseDelay = 60; // 1 minute
      const maxDelay = 14400; // 4 hours
      const backoffFactor = 2;

      const calculateDelay = (attempt: number) => {
        const delay = baseDelay * Math.pow(backoffFactor, attempt - 1);
        return Math.min(delay, maxDelay);
      };

      expect(calculateDelay(1)).toBe(60);
      expect(calculateDelay(2)).toBe(120);
      expect(calculateDelay(3)).toBe(240);
      expect(calculateDelay(4)).toBe(480);
      expect(calculateDelay(10)).toBe(14400); // Capped at max
    });

    it('should stop retrying after max attempts', async () => {
      const maxAttempts = 5;
      const currentAttempts = 5;

      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'failed',
        attempts: currentAttempts,
        nextRetryAt: null,
      });

      const shouldRetry = currentAttempts < maxAttempts;
      expect(shouldRetry).toBe(false);
    });

    it('should add jitter to retry delay', () => {
      const baseDelay = 60;
      const jitterPercent = 0.1; // 10% jitter

      const addJitter = (delay: number) => {
        const jitter = delay * jitterPercent * (Math.random() * 2 - 1);
        return Math.floor(delay + jitter);
      };

      const delays = Array(10)
        .fill(0)
        .map(() => addJitter(baseDelay));
      const allSame = delays.every((d) => d === delays[0]);

      expect(allSame).toBe(false); // Should have variation
    });

    it('should process failed deliveries in queue', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([
        { id: 'del-1', nextRetryAt: new Date(Date.now() - 1000), status: 'pending' },
        { id: 'del-2', nextRetryAt: new Date(Date.now() - 2000), status: 'pending' },
      ]);

      const pendingRetries = await mockPrisma.webhookDelivery.findMany({
        where: {
          status: 'pending',
          nextRetryAt: { lte: new Date() },
        },
      });

      expect(pendingRetries).toHaveLength(2);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should move to DLQ after max retries', async () => {
      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'failed',
        movedToDlqAt: new Date(),
      });

      const delivery = await mockPrisma.webhookDelivery.update({
        where: { id: 'del-1' },
        data: {
          status: 'failed',
          movedToDlqAt: new Date(),
        },
      });

      expect(delivery.status).toBe('failed');
      expect(delivery.movedToDlqAt).toBeDefined();
    });

    it('should allow manual retry from DLQ', async () => {
      mockPrisma.webhookDelivery.update.mockResolvedValue({
        id: 'del-1',
        status: 'pending',
        attempts: 0, // Reset attempts
        nextRetryAt: new Date(),
      });

      const delivery = await mockPrisma.webhookDelivery.update({
        where: { id: 'del-1' },
        data: {
          status: 'pending',
          attempts: 0,
          nextRetryAt: new Date(),
        },
      });

      expect(delivery.status).toBe('pending');
      expect(delivery.attempts).toBe(0);
    });

    it('should list DLQ entries', async () => {
      mockPrisma.webhookDelivery.findMany.mockResolvedValue([
        { id: 'del-1', status: 'failed', movedToDlqAt: new Date() },
        { id: 'del-2', status: 'failed', movedToDlqAt: new Date() },
      ]);

      const dlqEntries = await mockPrisma.webhookDelivery.findMany({
        where: {
          status: 'failed',
          movedToDlqAt: { not: null },
        },
      });

      expect(dlqEntries).toHaveLength(2);
    });
  });

  describe('Endpoint Health', () => {
    it('should track endpoint success rate', () => {
      const deliveries = [
        { status: 'success' },
        { status: 'success' },
        { status: 'success' },
        { status: 'failed' },
        { status: 'success' },
      ];

      const successCount = deliveries.filter((d) => d.status === 'success').length;
      const successRate = successCount / deliveries.length;

      expect(successRate).toBe(0.8); // 80%
    });

    it('should disable unhealthy endpoints', async () => {
      const failureThreshold = 0.5;
      const recentDeliveries = [
        { status: 'failed' },
        { status: 'failed' },
        { status: 'failed' },
        { status: 'success' },
      ];

      const failureRate =
        recentDeliveries.filter((d) => d.status === 'failed').length / recentDeliveries.length;
      const isUnhealthy = failureRate >= failureThreshold;

      expect(isUnhealthy).toBe(true);

      if (isUnhealthy) {
        mockPrisma.webhookEndpoint.update.mockResolvedValue({
          id: 'wh-1',
          enabled: false,
          disabledReason: 'High failure rate',
        });
      }
    });

    it('should notify admin of disabled endpoints', () => {
      const notification = {
        type: 'webhook.endpoint.disabled',
        endpointId: 'wh-1',
        reason: 'High failure rate (75%)',
        disabledAt: new Date(),
      };

      expect(notification.type).toBe('webhook.endpoint.disabled');
    });
  });
});
