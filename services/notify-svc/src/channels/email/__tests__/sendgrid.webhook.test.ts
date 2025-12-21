/**
 * SendGrid Webhook Handler Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { transformToCanonicalEvent } from '../webhooks/sendgrid.webhook.js';

describe('SendGrid Webhook', () => {
  describe('transformToCanonicalEvent', () => {
    it('should transform delivered event', () => {
      const event = {
        email: 'test@example.com',
        timestamp: 1700000000,
        event: 'delivered',
        sg_message_id: 'msg-123',
        sg_event_id: 'evt-456',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.provider).toBe('sendgrid');
      expect(result.eventType).toBe('delivered');
      expect(result.email).toBe('test@example.com');
      expect(result.messageId).toBe('msg-123');
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should transform bounce event', () => {
      const event = {
        email: 'bounce@example.com',
        timestamp: 1700000000,
        event: 'bounce',
        type: 'bounce',
        bounce_classification: 'invalid',
        reason: 'Address does not exist',
        sg_message_id: 'msg-123',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.eventType).toBe('bounced');
      expect(result.metadata?.bounceType).toBe('bounce');
      expect(result.metadata?.bounceClassification).toBe('invalid');
      expect(result.metadata?.reason).toBe('Address does not exist');
    });

    it('should transform spam report event', () => {
      const event = {
        email: 'spam@example.com',
        timestamp: 1700000000,
        event: 'spamreport',
        sg_message_id: 'msg-123',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.eventType).toBe('complained');
    });

    it('should transform unsubscribe event', () => {
      const event = {
        email: 'unsub@example.com',
        timestamp: 1700000000,
        event: 'unsubscribe',
        sg_message_id: 'msg-123',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.eventType).toBe('unsubscribed');
    });

    it('should transform open event', () => {
      const event = {
        email: 'open@example.com',
        timestamp: 1700000000,
        event: 'open',
        useragent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        sg_message_id: 'msg-123',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.eventType).toBe('opened');
      expect(result.metadata?.userAgent).toBe('Mozilla/5.0');
      expect(result.metadata?.ip).toBe('192.168.1.1');
    });

    it('should transform click event', () => {
      const event = {
        email: 'click@example.com',
        timestamp: 1700000000,
        event: 'click',
        url: 'https://example.com/link',
        sg_message_id: 'msg-123',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.eventType).toBe('clicked');
      expect(result.metadata?.url).toBe('https://example.com/link');
    });

    it('should handle unknown event types', () => {
      const event = {
        email: 'test@example.com',
        timestamp: 1700000000,
        event: 'some_new_event',
        sg_message_id: 'msg-123',
      };

      const result = transformToCanonicalEvent(event);

      expect(result.eventType).toBe('unknown');
    });
  });
});
