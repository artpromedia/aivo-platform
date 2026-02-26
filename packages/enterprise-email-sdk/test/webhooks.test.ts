import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHmac } from 'node:crypto';

import { verifyAndParseWebhook, AivoWebhookHandler } from '../src/webhooks.js';

// ── verifyAndParseWebhook tests ──────────────────────────────────

describe('verifyAndParseWebhook()', () => {
  const secret = 'test-secret-key';

  function sign(body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  it('parses a valid webhook with correct signature', () => {
    const body = JSON.stringify({ type: 'email.delivered', data: { id: '123' } });
    const signature = `sha256=${sign(body)}`;
    const parsed = verifyAndParseWebhook(body, signature, secret);
    expect(parsed.type).toBe('email.delivered');
    expect(parsed.data.id).toBe('123');
  });

  it('throws for invalid signature', () => {
    const body = JSON.stringify({ type: 'email.bounced' });
    expect(() => verifyAndParseWebhook(body, 'sha256=bad', secret)).toThrow();
  });

  it('throws for missing signature', () => {
    const body = JSON.stringify({ type: 'email.delivered' });
    expect(() => verifyAndParseWebhook(body, '', secret)).toThrow();
  });

  it('throws for invalid JSON body', () => {
    const body = 'not-json';
    const signature = `sha256=${sign(body)}`;
    // Should verify OK but JSON parse should fail
    expect(() => verifyAndParseWebhook(body, signature, secret)).toThrow();
  });

  it('handles Buffer payload', () => {
    const body = JSON.stringify({ type: 'email.opened', data: {} });
    const signature = `sha256=${sign(body)}`;
    const parsed = verifyAndParseWebhook(Buffer.from(body), signature, secret);
    expect(parsed.type).toBe('email.opened');
  });
});

// ── AivoWebhookHandler tests ─────────────────────────────────────

describe('AivoWebhookHandler', () => {
  const secret = 'handler-secret';

  function sign(body: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  it('creates a handler instance', () => {
    const handler = new AivoWebhookHandler(secret);
    expect(handler).toBeInstanceOf(AivoWebhookHandler);
  });

  it('registers event listeners with on()', () => {
    const handler = new AivoWebhookHandler(secret);
    const spy = vi.fn();
    handler.on('email.delivered', spy);
    expect(spy).not.toHaveBeenCalled();
  });

  it('processes webhook and calls correct handler', () => {
    const handler = new AivoWebhookHandler(secret);
    const deliveredSpy = vi.fn();
    const bouncedSpy = vi.fn();
    handler.on('email.delivered', deliveredSpy);
    handler.on('email.bounced', bouncedSpy);

    const body = JSON.stringify({ type: 'email.delivered', data: { id: 'msg-1' } });
    const sig = `sha256=${sign(body)}`;
    handler.handleWebhook(body, sig);

    expect(deliveredSpy).toHaveBeenCalledTimes(1);
    expect(bouncedSpy).not.toHaveBeenCalled();
  });

  it('throws for invalid webhook signature', () => {
    const handler = new AivoWebhookHandler(secret);
    const body = JSON.stringify({ type: 'email.delivered', data: {} });
    expect(() => handler.handleWebhook(body, 'sha256=invalid')).toThrow();
  });

  it('ignores events with no registered handler', () => {
    const handler = new AivoWebhookHandler(secret);
    const body = JSON.stringify({ type: 'email.unknown', data: {} });
    const sig = `sha256=${sign(body)}`;
    // Should not throw
    expect(() => handler.handleWebhook(body, sig)).not.toThrow();
  });
});
