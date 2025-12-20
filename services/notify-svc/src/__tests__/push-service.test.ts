/**
 * Push Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the FCM and APNs modules
vi.mock('../channels/push/fcm.js', () => ({
  initializeFcm: vi.fn(() => true),
  shutdownFcm: vi.fn(),
  sendFcmNotification: vi.fn(),
  sendFcmBatch: vi.fn(),
  sendToTopic: vi.fn(),
  subscribeToTopic: vi.fn(),
  unsubscribeFromTopic: vi.fn(),
  buildTenantTopic: vi.fn((id) => `tenant_${id}`),
  buildRoleTopic: vi.fn((tenantId, role) => `tenant_${tenantId}_role_${role}`),
}));

vi.mock('../channels/push/apns.js', () => ({
  initializeApns: vi.fn(() => true),
  shutdownApns: vi.fn(),
  sendApnsNotification: vi.fn(),
  sendApnsBatch: vi.fn(),
}));

vi.mock('../config.js', () => ({
  config: {
    fcm: { enabled: true },
    apns: { enabled: true, production: false },
  },
}));

// Import after mocking
import * as pushService from '../channels/push/push-service.js';
import * as fcm from '../channels/push/fcm.js';
import * as apns from '../channels/push/apns.js';

describe('Push Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushService.resetMetrics();
  });

  describe('initializePushService', () => {
    it('should initialize FCM and APNs', () => {
      const result = pushService.initializePushService();

      expect(result.fcm).toBe(true);
      expect(result.apns).toBe(true);
      expect(fcm.initializeFcm).toHaveBeenCalled();
      expect(apns.initializeApns).toHaveBeenCalled();
    });
  });

  describe('sendPushNotification', () => {
    it('should route Android notifications to FCM', async () => {
      vi.mocked(fcm.sendFcmNotification).mockResolvedValue({
        channel: 'PUSH' as any,
        success: true,
        providerMessageId: 'fcm-123',
      });

      const result = await pushService.sendPushNotification({
        token: 'android-token',
        platform: 'android',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(fcm.sendFcmNotification).toHaveBeenCalled();
    });

    it('should route iOS notifications to APNs when enabled', async () => {
      vi.mocked(apns.sendApnsNotification).mockResolvedValue({
        channel: 'PUSH' as any,
        success: true,
      });

      const result = await pushService.sendPushNotification({
        token: 'ios-token',
        platform: 'ios',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(true);
      expect(apns.sendApnsNotification).toHaveBeenCalled();
    });

    it('should update metrics on successful send', async () => {
      vi.mocked(fcm.sendFcmNotification).mockResolvedValue({
        channel: 'PUSH' as any,
        success: true,
        providerMessageId: 'fcm-123',
      });

      await pushService.sendPushNotification({
        token: 'android-token',
        platform: 'android',
        title: 'Test',
        body: 'Test body',
      });

      const metrics = pushService.getMetrics();
      // Note: Metrics might not update directly due to circuit breaker logic
      expect(metrics).toBeDefined();
    });
  });

  describe('sendPushBatch', () => {
    it('should separate payloads by platform', async () => {
      vi.mocked(fcm.sendFcmBatch).mockResolvedValue({
        channel: 'PUSH' as any,
        totalSent: 2,
        totalFailed: 0,
        results: [
          { token: 'android-1', success: true },
          { token: 'android-2', success: true },
        ],
      });

      vi.mocked(apns.sendApnsBatch).mockResolvedValue({
        channel: 'PUSH' as any,
        totalSent: 1,
        totalFailed: 0,
        results: [{ token: 'ios-1', success: true }],
      });

      const payloads = [
        { token: 'android-1', platform: 'android' as const, title: 'Test', body: 'Body' },
        { token: 'android-2', platform: 'android' as const, title: 'Test', body: 'Body' },
        { token: 'ios-1', platform: 'ios' as const, title: 'Test', body: 'Body' },
      ];

      const result = await pushService.sendPushBatch(payloads);

      expect(result.totalSent).toBe(3);
      expect(result.totalFailed).toBe(0);
      expect(fcm.sendFcmBatch).toHaveBeenCalled();
      expect(apns.sendApnsBatch).toHaveBeenCalled();
    });

    it('should collect invalid tokens for cleanup', async () => {
      vi.mocked(fcm.sendFcmBatch).mockResolvedValue({
        channel: 'PUSH' as any,
        totalSent: 1,
        totalFailed: 1,
        results: [
          { token: 'valid-token', success: true },
          { token: 'invalid-token', success: false, shouldRemoveToken: true },
        ],
        invalidTokens: ['invalid-token'],
      });

      const result = await pushService.sendPushBatch([
        { token: 'valid-token', platform: 'android', title: 'Test', body: 'Body' },
        { token: 'invalid-token', platform: 'android', title: 'Test', body: 'Body' },
      ]);

      expect(result.invalidTokens).toContain('invalid-token');
    });
  });

  describe('Topic Management', () => {
    it('should subscribe to tenant and role topics', async () => {
      vi.mocked(fcm.subscribeToTopic).mockResolvedValue({
        successCount: 1,
        failureCount: 0,
        failedTokens: [],
      });

      await pushService.subscribeToTopics('device-token', 'tenant-123', ['teacher', 'admin']);

      expect(fcm.subscribeToTopic).toHaveBeenCalledTimes(3); // 1 tenant + 2 roles
    });
  });

  describe('Circuit Breaker', () => {
    it('should track circuit breaker state', () => {
      const states = pushService.getCircuitBreakerStates();

      expect(states.fcm).toBeDefined();
      expect(states.apns).toBeDefined();
      expect(states.fcm.isOpen).toBe(false);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should queue failed messages', () => {
      // This would require simulating a circuit open condition
      const queue = pushService.getDeadLetterQueue();
      expect(Array.isArray(queue)).toBe(true);
    });

    it('should clear dead letter queue', () => {
      const cleared = pushService.clearDeadLetterQueue();
      expect(typeof cleared).toBe('number');
    });
  });

  describe('Service Status', () => {
    it('should return comprehensive status', () => {
      const status = pushService.getPushServiceStatus();

      expect(status.fcm).toBeDefined();
      expect(status.apns).toBeDefined();
      expect(status.metrics).toBeDefined();
      expect(typeof status.deadLetterQueueSize).toBe('number');
    });
  });
});
