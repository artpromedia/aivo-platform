/**
 * FCM (Firebase Cloud Messaging) Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock firebase-admin
const mockSend = vi.fn();
const mockSendEach = vi.fn();
const mockSubscribeToTopic = vi.fn();
const mockUnsubscribeFromTopic = vi.fn();

vi.mock('firebase-admin', () => ({
  default: {
    initializeApp: vi.fn(),
    apps: [],
    credential: {
      cert: vi.fn((config) => config),
    },
    messaging: vi.fn(() => ({
      send: mockSend,
      sendEach: mockSendEach,
      subscribeToTopic: mockSubscribeToTopic,
      unsubscribeFromTopic: mockUnsubscribeFromTopic,
    })),
  },
}));

vi.mock('../config.js', () => ({
  config: {
    fcm: {
      enabled: true,
      projectId: 'test-project',
      clientEmail: 'test@test.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
    },
  },
}));

describe('FCM Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendFcmNotification', () => {
    it('should send notification successfully', async () => {
      mockSend.mockResolvedValue('projects/test-project/messages/123');

      // Dynamic import to apply mocks
      const { sendFcmNotification, initializeFcm } = await import('../channels/push/fcm.js');
      
      // Initialize first
      initializeFcm();

      const result = await sendFcmNotification({
        token: 'test-device-token',
        platform: 'android',
        title: 'Test Notification',
        body: 'This is a test',
        data: { key: 'value' },
      });

      expect(result.success).toBe(true);
      expect(result.providerMessageId).toBe('projects/test-project/messages/123');
    });

    it('should handle invalid token error', async () => {
      const error = new Error('Invalid registration token');
      (error as any).code = 'messaging/invalid-registration-token';
      mockSend.mockRejectedValue(error);

      const { sendFcmNotification, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await sendFcmNotification({
        token: 'invalid-token',
        platform: 'android',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.shouldRemoveToken).toBe(true);
    });

    it('should handle unregistered token error', async () => {
      const error = new Error('Token not registered');
      (error as any).code = 'messaging/registration-token-not-registered';
      mockSend.mockRejectedValue(error);

      const { sendFcmNotification, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await sendFcmNotification({
        token: 'unregistered-token',
        platform: 'android',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.shouldRemoveToken).toBe(true);
    });

    it('should retry on server error', async () => {
      const error = new Error('Internal error');
      (error as any).code = 'messaging/internal-error';
      mockSend.mockRejectedValueOnce(error).mockResolvedValue('success-123');

      const { sendFcmNotification, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await sendFcmNotification({
        token: 'test-token',
        platform: 'android',
        title: 'Test',
        body: 'Test body',
      });

      // Should retry and succeed
      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });

  describe('sendFcmBatch', () => {
    it('should batch notifications in chunks of 500', async () => {
      // Create 600 payloads to test batching
      const payloads = Array.from({ length: 600 }, (_, i) => ({
        token: `token-${i}`,
        platform: 'android' as const,
        title: 'Test',
        body: 'Body',
      }));

      mockSendEach.mockResolvedValue({
        successCount: 500,
        failureCount: 0,
        responses: Array(500).fill({ success: true }),
      });

      const { sendFcmBatch, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await sendFcmBatch(payloads);

      // Should be called twice: 500 + 100
      expect(mockSendEach).toHaveBeenCalledTimes(2);
    });

    it('should track invalid tokens in batch response', async () => {
      mockSendEach.mockResolvedValue({
        successCount: 1,
        failureCount: 1,
        responses: [
          { success: true, messageId: 'msg-1' },
          { 
            success: false, 
            error: { code: 'messaging/invalid-registration-token' } 
          },
        ],
      });

      const { sendFcmBatch, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await sendFcmBatch([
        { token: 'valid-token', platform: 'android', title: 'Test', body: 'Body' },
        { token: 'invalid-token', platform: 'android', title: 'Test', body: 'Body' },
      ]);

      expect(result.totalSent).toBe(1);
      expect(result.totalFailed).toBe(1);
      expect(result.invalidTokens).toContain('invalid-token');
    });
  });

  describe('Topic Operations', () => {
    it('should subscribe tokens to topic', async () => {
      mockSubscribeToTopic.mockResolvedValue({
        successCount: 2,
        failureCount: 0,
      });

      const { subscribeToTopic, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await subscribeToTopic(['token-1', 'token-2'], 'news');

      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(mockSubscribeToTopic).toHaveBeenCalledWith(['token-1', 'token-2'], 'news');
    });

    it('should unsubscribe tokens from topic', async () => {
      mockUnsubscribeFromTopic.mockResolvedValue({
        successCount: 1,
        failureCount: 0,
      });

      const { unsubscribeFromTopic, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await unsubscribeFromTopic(['token-1'], 'news');

      expect(result.successCount).toBe(1);
      expect(mockUnsubscribeFromTopic).toHaveBeenCalledWith(['token-1'], 'news');
    });

    it('should send to topic', async () => {
      mockSend.mockResolvedValue('topic-message-123');

      const { sendToTopic, initializeFcm } = await import('../channels/push/fcm.js');
      initializeFcm();

      const result = await sendToTopic('announcements', {
        title: 'Breaking News',
        body: 'Something happened!',
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('Topic Name Builders', () => {
    it('should build tenant topic name', async () => {
      const { buildTenantTopic } = await import('../channels/push/fcm.js');
      
      const topic = buildTenantTopic('tenant-123');
      
      expect(topic).toBe('tenant_tenant_123');
    });

    it('should build role topic name', async () => {
      const { buildRoleTopic } = await import('../channels/push/fcm.js');
      
      const topic = buildRoleTopic('tenant-123', 'teacher');
      
      expect(topic).toBe('tenant_tenant_123_role_teacher');
    });

    it('should sanitize special characters in topic names', async () => {
      const { buildTenantTopic } = await import('../channels/push/fcm.js');
      
      const topic = buildTenantTopic('tenant.with-special@chars');
      
      // Should only contain allowed characters
      expect(topic).toMatch(/^[a-zA-Z0-9-_.~%]+$/);
    });
  });
});
