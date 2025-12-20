/**
 * APNs (Apple Push Notification service) Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @parse/node-apn
const mockSend = vi.fn();
const mockShutdown = vi.fn();

vi.mock('@parse/node-apn', () => ({
  default: {
    Provider: vi.fn().mockImplementation(() => ({
      send: mockSend,
      shutdown: mockShutdown,
    })),
    Notification: vi.fn().mockImplementation(() => ({
      topic: undefined,
      alert: undefined,
      sound: undefined,
      badge: undefined,
      payload: {},
      expiry: undefined,
      priority: undefined,
      collapseId: undefined,
      contentAvailable: undefined,
      mutableContent: undefined,
    })),
  },
}));

vi.mock('../config.js', () => ({
  config: {
    apns: {
      enabled: true,
      production: false,
      keyId: 'KEY123',
      teamId: 'TEAM456',
      privateKey: '-----BEGIN PRIVATE KEY-----\ntest\n-----END PRIVATE KEY-----',
      bundleId: 'com.aivo.learner',
    },
  },
}));

describe('APNs Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendApnsNotification', () => {
    it('should send notification successfully', async () => {
      mockSend.mockResolvedValue({
        sent: [{ device: 'test-token' }],
        failed: [],
      });

      const { sendApnsNotification, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsNotification({
        token: 'ios-device-token',
        platform: 'ios',
        title: 'Test Notification',
        body: 'This is a test',
        data: { action: 'open_lesson' },
      });

      expect(result.success).toBe(true);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should handle failed delivery', async () => {
      mockSend.mockResolvedValue({
        sent: [],
        failed: [{
          device: 'bad-token',
          status: '400',
          response: { reason: 'BadDeviceToken' },
        }],
      });

      const { sendApnsNotification, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsNotification({
        token: 'bad-token',
        platform: 'ios',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('BadDeviceToken');
    });

    it('should mark invalid tokens for removal', async () => {
      mockSend.mockResolvedValue({
        sent: [],
        failed: [{
          device: 'unregistered-token',
          status: '410',
          response: { reason: 'Unregistered' },
        }],
      });

      const { sendApnsNotification, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsNotification({
        token: 'unregistered-token',
        platform: 'ios',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.success).toBe(false);
      expect(result.shouldRemoveToken).toBe(true);
    });

    it('should handle BadDeviceToken error', async () => {
      mockSend.mockResolvedValue({
        sent: [],
        failed: [{
          device: 'invalid-format-token',
          status: '400',
          response: { reason: 'BadDeviceToken' },
        }],
      });

      const { sendApnsNotification, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsNotification({
        token: 'invalid-format-token',
        platform: 'ios',
        title: 'Test',
        body: 'Test body',
      });

      expect(result.shouldRemoveToken).toBe(true);
    });
  });

  describe('sendApnsBatch', () => {
    it('should send batch notifications', async () => {
      mockSend.mockResolvedValue({
        sent: [
          { device: 'token-1' },
          { device: 'token-2' },
        ],
        failed: [],
      });

      const { sendApnsBatch, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsBatch([
        { token: 'token-1', platform: 'ios', title: 'Test', body: 'Body 1' },
        { token: 'token-2', platform: 'ios', title: 'Test', body: 'Body 2' },
      ]);

      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(0);
    });

    it('should track mixed results in batch', async () => {
      mockSend.mockResolvedValue({
        sent: [{ device: 'token-1' }],
        failed: [{
          device: 'token-2',
          status: '400',
          response: { reason: 'BadDeviceToken' },
        }],
      });

      const { sendApnsBatch, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsBatch([
        { token: 'token-1', platform: 'ios', title: 'Test', body: 'Body 1' },
        { token: 'token-2', platform: 'ios', title: 'Test', body: 'Body 2' },
      ]);

      expect(result.totalSent).toBe(1);
      expect(result.totalFailed).toBe(1);
      expect(result.invalidTokens).toContain('token-2');
    });

    it('should collect all invalid tokens', async () => {
      mockSend.mockResolvedValue({
        sent: [],
        failed: [
          { device: 'token-1', status: '410', response: { reason: 'Unregistered' } },
          { device: 'token-2', status: '400', response: { reason: 'BadDeviceToken' } },
          { device: 'token-3', status: '400', response: { reason: 'DeviceTokenNotForTopic' } },
        ],
      });

      const { sendApnsBatch, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsBatch([
        { token: 'token-1', platform: 'ios', title: 'Test', body: 'Body' },
        { token: 'token-2', platform: 'ios', title: 'Test', body: 'Body' },
        { token: 'token-3', platform: 'ios', title: 'Test', body: 'Body' },
      ]);

      expect(result.invalidTokens).toHaveLength(3);
      expect(result.invalidTokens).toContain('token-1');
      expect(result.invalidTokens).toContain('token-2');
      expect(result.invalidTokens).toContain('token-3');
    });
  });

  describe('Silent Notifications', () => {
    it('should send silent notification for background updates', async () => {
      mockSend.mockResolvedValue({
        sent: [{ device: 'token-1' }],
        failed: [],
      });

      const { sendSilentNotification, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendSilentNotification('token-1', { 
        action: 'sync',
        lastSyncTime: Date.now() 
      });

      expect(result.success).toBe(true);
      // Silent notifications should have contentAvailable set
    });
  });

  describe('Shutdown', () => {
    it('should gracefully shutdown APNs connection', async () => {
      const { shutdownApns, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();
      shutdownApns();

      expect(mockShutdown).toHaveBeenCalled();
    });
  });

  describe('APNs Error Codes', () => {
    const invalidTokenReasons = [
      'BadDeviceToken',
      'Unregistered',
      'DeviceTokenNotForTopic',
    ];

    invalidTokenReasons.forEach((reason) => {
      it(`should mark token for removal on ${reason}`, async () => {
        mockSend.mockResolvedValue({
          sent: [],
          failed: [{
            device: 'test-token',
            status: '400',
            response: { reason },
          }],
        });

        const { sendApnsNotification, initializeApns } = await import('../channels/push/apns.js');
        initializeApns();

        const result = await sendApnsNotification({
          token: 'test-token',
          platform: 'ios',
          title: 'Test',
          body: 'Body',
        });

        expect(result.shouldRemoveToken).toBe(true);
      });
    });

    it('should not mark token for removal on transient errors', async () => {
      mockSend.mockResolvedValue({
        sent: [],
        failed: [{
          device: 'test-token',
          status: '503',
          response: { reason: 'ServiceUnavailable' },
        }],
      });

      const { sendApnsNotification, initializeApns } = await import('../channels/push/apns.js');
      initializeApns();

      const result = await sendApnsNotification({
        token: 'test-token',
        platform: 'ios',
        title: 'Test',
        body: 'Body',
      });

      expect(result.success).toBe(false);
      expect(result.shouldRemoveToken).toBeFalsy();
    });
  });
});
