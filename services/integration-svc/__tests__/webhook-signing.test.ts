import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signWebhookPayload,
  verifyWebhookSignature,
  generateWebhookSecret,
} from '../src/webhook-signing';

describe('webhook-signing', () => {
  describe('generateWebhookSecret', () => {
    it('should generate a secret with the whsec_ prefix', () => {
      const secret = generateWebhookSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.startsWith('whsec_')).toBe(true);
    });

    it('should generate unique secrets', () => {
      const secret1 = generateWebhookSecret();
      const secret2 = generateWebhookSecret();
      expect(secret1).not.toBe(secret2);
    });

    it('should generate hex-encoded strings after prefix', () => {
      const secret = generateWebhookSecret();
      const hexPart = secret.substring(6); // Remove 'whsec_' prefix
      expect(/^[0-9a-f]+$/i.test(hexPart)).toBe(true);
    });
  });

  describe('signWebhookPayload', () => {
    it('should sign a payload and return signature string', () => {
      const payload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
      const secret = 'test-secret-key';
      const timestamp = Math.floor(Date.now() / 1000);

      const signature = signWebhookPayload(payload, secret, timestamp);

      expect(signature).toBeDefined();
      expect(signature).toMatch(/^v1=/);
    });

    it('should produce different signatures for different payloads', () => {
      const secret = 'test-secret-key';
      const timestamp = Math.floor(Date.now() / 1000);
      const payload1 = JSON.stringify({ data: 'payload1' });
      const payload2 = JSON.stringify({ data: 'payload2' });

      const sig1 = signWebhookPayload(payload1, secret, timestamp);
      const sig2 = signWebhookPayload(payload2, secret, timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const payload = JSON.stringify({ data: 'test' });
      const timestamp = Math.floor(Date.now() / 1000);

      const sig1 = signWebhookPayload(payload, 'secret1', timestamp);
      const sig2 = signWebhookPayload(payload, 'secret2', timestamp);

      expect(sig1).not.toBe(sig2);
    });

    it('should include timestamp in signature computation', () => {
      const payload = JSON.stringify({ data: 'test' });
      const secret = 'test-secret';

      const sig1 = signWebhookPayload(payload, secret, 1000);
      const sig2 = signWebhookPayload(payload, secret, 2000);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyWebhookSignature', () => {
    const secret = 'test-secret-key';

    it('should verify a valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(payload, secret, timestamp);

      const result = verifyWebhookSignature(payload, signature, secret, timestamp);

      expect(result.valid).toBe(true);
    });

    it('should reject an invalid signature', () => {
      const payload = JSON.stringify({ event: 'test' });
      const timestamp = Math.floor(Date.now() / 1000);

      const result = verifyWebhookSignature(payload, 'v1=invalid-signature', secret, timestamp);

      expect(result.valid).toBe(false);
    });

    it('should reject when no v1 signature found', () => {
      const payload = JSON.stringify({ event: 'test' });
      const timestamp = Math.floor(Date.now() / 1000);

      const result = verifyWebhookSignature(payload, 'invalid-format', secret, timestamp);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject expired timestamps (> 5 minutes old)', () => {
      const payload = JSON.stringify({ event: 'test' });
      const oldTimestamp = Math.floor(Date.now() / 1000) - 400; // More than 300 seconds old
      const signature = signWebhookPayload(payload, secret, oldTimestamp);

      const result = verifyWebhookSignature(payload, signature, secret, oldTimestamp);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('old');
    });

    it('should accept valid timestamps within tolerance', () => {
      const payload = JSON.stringify({ event: 'test' });
      const recentTimestamp = Math.floor(Date.now() / 1000) - 100; // 100 seconds ago
      const signature = signWebhookPayload(payload, secret, recentTimestamp);

      const result = verifyWebhookSignature(payload, signature, secret, recentTimestamp);

      expect(result.valid).toBe(true);
    });

    it('should reject modified payload', () => {
      const originalPayload = JSON.stringify({ event: 'test', data: { foo: 'bar' } });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(originalPayload, secret, timestamp);

      const modifiedPayload = JSON.stringify({ event: 'test', data: { foo: 'modified' } });
      const result = verifyWebhookSignature(modifiedPayload, signature, secret, timestamp);

      expect(result.valid).toBe(false);
    });

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ event: 'test' });
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(payload, 'correct-secret', timestamp);

      const result = verifyWebhookSignature(payload, signature, 'wrong-secret', timestamp);

      expect(result.valid).toBe(false);
    });
  });
});
