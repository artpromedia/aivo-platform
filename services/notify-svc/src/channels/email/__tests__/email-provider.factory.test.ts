/**
 * Email Provider Factory Tests
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { EmailProviderManager } from '../email-provider.factory.js';
import type { EmailProvider, SendEmailOptions, EmailResult } from '../types.js';

// Mock providers
const createMockProvider = (name: string, shouldFail = false): EmailProvider => ({
  name,
  async initialize() {
    return true;
  },
  async send(options: SendEmailOptions): Promise<EmailResult> {
    if (shouldFail) {
      return {
        success: false,
        provider: name,
        errorCode: 'MOCK_ERROR',
        errorMessage: 'Mock provider failed',
        timestamp: new Date(),
      };
    }
    return {
      success: true,
      provider: name,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date(),
    };
  },
  async sendBatch(options) {
    if (shouldFail) {
      return {
        provider: name,
        totalSent: 0,
        totalFailed: options.length,
        results: options.map((o) => ({
          to: o.to as string,
          success: false,
          errorCode: 'MOCK_ERROR',
          errorMessage: 'Mock provider failed',
        })),
      };
    }
    return {
      provider: name,
      totalSent: options.length,
      totalFailed: 0,
      results: options.map((o) => ({
        to: o.to as string,
        success: true,
        messageId: `msg-${Date.now()}`,
      })),
    };
  },
  async sendTemplate(options) {
    if (shouldFail) {
      return {
        success: false,
        provider: name,
        errorCode: 'MOCK_ERROR',
        errorMessage: 'Mock provider failed',
        timestamp: new Date(),
      };
    }
    return {
      success: true,
      provider: name,
      messageId: `msg-${Date.now()}`,
      timestamp: new Date(),
    };
  },
  async shutdown() {},
  async healthCheck() {
    return !shouldFail;
  },
});

describe('EmailProviderManager', () => {
  let manager: EmailProviderManager;
  let primaryProvider: EmailProvider;
  let fallbackProvider: EmailProvider;

  beforeEach(() => {
    primaryProvider = createMockProvider('primary');
    fallbackProvider = createMockProvider('fallback');
    manager = new EmailProviderManager();
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('initialization', () => {
    it('should initialize with providers', async () => {
      await manager.addProvider(primaryProvider, true);
      await manager.addProvider(fallbackProvider, false);
      await manager.initialize();

      const status = manager.getHealthStatus();
      expect(status.providers).toHaveLength(2);
      expect(status.activeProvider).toBe('primary');
    });

    it('should set active provider to primary', async () => {
      await manager.addProvider(primaryProvider, true);
      await manager.initialize();

      expect(manager.getActiveProvider()?.name).toBe('primary');
    });
  });

  describe('send', () => {
    it('should send using primary provider', async () => {
      await manager.addProvider(primaryProvider, true);
      await manager.initialize();

      const result = await manager.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('primary');
    });

    it('should failover to fallback on primary failure', async () => {
      const failingPrimary = createMockProvider('primary', true);
      await manager.addProvider(failingPrimary, true);
      await manager.addProvider(fallbackProvider, false);
      await manager.initialize();

      const result = await manager.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('fallback');
    });

    it('should return error if all providers fail', async () => {
      const failingPrimary = createMockProvider('primary', true);
      const failingFallback = createMockProvider('fallback', true);

      await manager.addProvider(failingPrimary, true);
      await manager.addProvider(failingFallback, false);
      await manager.initialize();

      const result = await manager.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('sendBatch', () => {
    it('should send batch emails', async () => {
      await manager.addProvider(primaryProvider, true);
      await manager.initialize();

      const result = await manager.sendBatch([
        { to: 'test1@example.com', subject: 'Test 1', html: '<p>Test 1</p>' },
        { to: 'test2@example.com', subject: 'Test 2', html: '<p>Test 2</p>' },
      ]);

      expect(result.totalSent).toBe(2);
      expect(result.totalFailed).toBe(0);
    });
  });

  describe('health monitoring', () => {
    it('should report health status', async () => {
      await manager.addProvider(primaryProvider, true);
      await manager.initialize();

      const status = manager.getHealthStatus();
      expect(status.activeProvider).toBe('primary');
      expect(status.providers).toHaveLength(1);
    });
  });
});
