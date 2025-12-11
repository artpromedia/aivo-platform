import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  generateSecret,
  SignedWebhookHeaders,
} from '../src/webhook-signing';

describe('webhook-signing', () => {
  describe('generateSecret', () => {
    it('should generate a secret of the specified length', () => {
      const secret = generateSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      // 32 bytes = 64 hex characters
      expect(secret).toHaveLength(64);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate hex-encoded strings', () => {
      const secret = generateSecret();
      expect(/^[0-9a-f]+$/i.test(secret)).toBe(true);
    });
  });

  describe('signWebhookPayload', () => {
    it('should sign a payload and return signature headers', () => {
      const payload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
      const secret = 'test-secret-key';

      const headers = signWebhookPayload(payload, secret);

      expect(headers).toHaveProperty('x-aivo-signature');
      expect(headers).toHaveProperty('x-aivo-timestamp');
      expect(headers['x-aivo-signature']).toMatch(/^sha256=/);
    });

    it('should produce different signatures for different payloads', () => {
      const secret = 'test-secret-key';
      const payload1 = JSON.stringify({ data: 'payload1' });
      const payload2 = JSON.stringify({ data: 'payload2' });

      const headers1 = signWebhookPayload(payload1, secret);
      const headers2 = signWebhookPayload(payload2, secret);

      expect(headers1['x-aivo-signature']).not.toBe(headers2['x-aivo-signature']);
    });

    it('should produce different signatures for different secrets', () => {
      const payload = JSON.stringify({ data: 'test' });

      const headers1 = signWebhookPayload(payload, 'secret1');
      const headers2 = signWebhookPayload(payload, 'secret2');

      expect(headers1['x-aivo-signature']).not.toBe(headers2['x-aivo-signature']);
    });

    it('should include timestamp in signature computation', () => {
      vi.useFakeTimers();
      
      const payload = JSON.stringify({ data: 'test' });
      const secret = 'test-secret';

      vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
      const headers1 = signWebhookPayload(payload, secret);

      vi.setSystemTime(new Date('2024-01-01T00:01:00Z'));
      const headers2 = signWebhookPayload(payload, secret);

      expect(headers1['x-aivo-signature']).not.toBe(headers2['x-aivo-signature']);
      expect(headers1['x-aivo-timestamp']).not.toBe(headers2['x-aivo-timestamp']);

      vi.useRealTimers();
    });
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'test-secret-key';

    it('should verify a valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
      const headers = signWebhookPayload(payload, secret);

      const result = verifyWebhookSignature(payload, headers, secret);

      expect(result.valid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const headers: SignedWebhookHeaders = {
        'x-aivo-signature': 'sha256=invalid-signature',
        'x-aivo-timestamp': String(Date.now()),
      };

      const result = verifyWebhookSignature(payload, headers, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature');
    });

    it('should reject when timestamp is missing', () => {
      const payload = JSON.stringify({ event: 'test' });
      const headers: SignedWebhookHeaders = {
        'x-aivo-signature': 'sha256=something',
        'x-aivo-timestamp': '',
      };

      const result = verifyWebhookSignature(payload, headers, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing');
    });

    it('should reject when signature is missing', () => {
      const payload = JSON.stringify({ event: 'test' });
      const headers: SignedWebhookHeaders = {
        'x-aivo-signature': '',
        'x-aivo-timestamp': String(Date.now()),
      };

      const result = verifyWebhookSignature(payload, headers, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing');
    });

    it('should reject expired timestamps (> 5 minutes old)', () => {
      const payload = JSON.stringify({ event: 'test' });
      const fiveMinutesAgo = Date.now() - 6 * 60 * 1000; // 6 minutes ago
      
      const headers = signWebhookPayload(payload, secret);
      headers['x-aivo-timestamp'] = String(fiveMinutesAgo);
      // Re-sign with old timestamp
      const oldHeaders: SignedWebhookHeaders = {
        'x-aivo-timestamp': String(fiveMinutesAgo),
        'x-aivo-signature': headers['x-aivo-signature'],
      };

      const result = verifyWebhookSignature(payload, oldHeaders, secret);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should accept valid timestamps within tolerance', () => {
      const payload = JSON.stringify({ event: 'test' });
      
      // Create headers with a timestamp just under 5 minutes ago
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() - 4 * 60 * 1000); // 4 minutes ago
      const headers = signWebhookPayload(payload, secret);
      vi.useRealTimers();

      const result = verifyWebhookSignature(payload, headers, secret);

      expect(result.valid).toBe(true);
    });

    it('should reject modified payload', () => {
      const originalPayload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
      const headers = signWebhookPayload(originalPayload, secret);

      const modifiedPayload = JSON.stringify({ event: 'test', data: { foo: 'modified' } });
      const result = verifyWebhookSignature(modifiedPayload, headers, secret);

      expect(result.valid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ event: 'test' });
      const headers = signWebhookPayload(payload, 'correct-secret');

      const result = verifyWebhookSignature(payload, headers, 'wrong-secret');

      expect(result.valid).toBe(false);
    });
  });
});
