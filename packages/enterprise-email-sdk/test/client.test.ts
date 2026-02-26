import { describe, it, expect, vi, beforeEach } from 'vitest';

import { AivolearningEmail } from '../src/index.js';

// ── AivolearningEmail Client tests ───────────────────────────────

describe('AivolearningEmail', () => {
  let client: AivolearningEmail;

  beforeEach(() => {
    client = new AivolearningEmail({
      apiKey: 'test-api-key-123',
    });
  });

  describe('constructor', () => {
    it('creates instance with required config', () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(AivolearningEmail);
    });

    it('accepts custom baseUrl', () => {
      const c = new AivolearningEmail({
        apiKey: 'key',
        baseUrl: 'https://custom.api.com/v1',
      });
      expect(c).toBeDefined();
    });

    it('accepts custom timeout', () => {
      const c = new AivolearningEmail({
        apiKey: 'key',
        timeout: 5000,
      });
      expect(c).toBeDefined();
    });
  });

  describe('send()', () => {
    it('is a function', () => {
      expect(typeof client.send).toBe('function');
    });

    it('rejects when network fails', async () => {
      // With no real HTTP server, the request will fail
      await expect(
        client.send({
          to: 'user@example.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        }),
      ).rejects.toThrow();
    });
  });

  describe('sendTemplate()', () => {
    it('is a function', () => {
      expect(typeof client.sendTemplate).toBe('function');
    });
  });

  describe('sendBatch()', () => {
    it('is a function', () => {
      expect(typeof client.sendBatch).toBe('function');
    });
  });

  describe('health()', () => {
    it('is a function', () => {
      expect(typeof client.health).toBe('function');
    });
  });

  describe('typed template methods', () => {
    it('has sendWelcome', () => {
      expect(typeof client.sendWelcome).toBe('function');
    });

    it('has sendVerification', () => {
      expect(typeof client.sendVerification).toBe('function');
    });

    it('has sendPasswordReset', () => {
      expect(typeof client.sendPasswordReset).toBe('function');
    });

    it('has sendPaymentReceipt', () => {
      expect(typeof client.sendPaymentReceipt).toBe('function');
    });

    it('has sendLessonReminder', () => {
      expect(typeof client.sendLessonReminder).toBe('function');
    });

    it('has sendCourseCompletion', () => {
      expect(typeof client.sendCourseCompletion).toBe('function');
    });

    it('has sendAssignmentSubmitted', () => {
      expect(typeof client.sendAssignmentSubmitted).toBe('function');
    });

    it('has sendAssignmentGraded', () => {
      expect(typeof client.sendAssignmentGraded).toBe('function');
    });

    it('has sendInstructorNewEnrollment', () => {
      expect(typeof client.sendInstructorNewEnrollment).toBe('function');
    });
  });

  describe('verifyWebhookSignature()', () => {
    it('returns false with empty payload', () => {
      expect(AivolearningEmail.verifyWebhookSignature('', 'sig', 'secret')).toBe(false);
    });

    it('returns false with empty signature', () => {
      expect(AivolearningEmail.verifyWebhookSignature('data', '', 'secret')).toBe(false);
    });

    it('returns false with empty secret', () => {
      expect(AivolearningEmail.verifyWebhookSignature('data', 'sig', '')).toBe(false);
    });

    it('returns false for invalid signature', () => {
      expect(
        AivolearningEmail.verifyWebhookSignature('{"event":"test"}', 'sha256=invalid', 'my-secret'),
      ).toBe(false);
    });

    it('returns true for valid HMAC signature', async () => {
      const { createHmac } = await import('node:crypto');
      const secret = 'webhook-secret';
      const payload = '{"event":"delivered"}';
      const expected = createHmac('sha256', secret).update(payload).digest('hex');
      expect(
        AivolearningEmail.verifyWebhookSignature(payload, `sha256=${expected}`, secret),
      ).toBe(true);
    });
  });

  describe('cancelScheduled()', () => {
    it('is a function', () => {
      expect(typeof client.cancelScheduled).toBe('function');
    });
  });
});
