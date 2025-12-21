/**
 * SES Webhook Handler Tests
 */

import { describe, it, expect } from 'vitest';

import { transformToCanonicalEvent } from '../webhooks/ses.webhook.js';

describe('SES Webhook', () => {
  describe('transformToCanonicalEvent', () => {
    const baseMail = {
      timestamp: '2024-01-15T10:30:00.000Z',
      messageId: 'msg-123',
      source: 'sender@example.com',
      sourceArn: 'arn:aws:ses:us-east-1:123456789:identity/example.com',
      destination: ['recipient@example.com'],
      headersTruncated: false,
    };

    it('should transform permanent bounce notification', () => {
      const notification = {
        notificationType: 'Bounce' as const,
        mail: baseMail,
        bounce: {
          bounceType: 'Permanent' as const,
          bounceSubType: 'General',
          bouncedRecipients: [
            {
              emailAddress: 'bounce@example.com',
              status: '5.1.1',
              diagnosticCode: 'smtp; 550 User unknown',
            },
          ],
          timestamp: '2024-01-15T10:30:01.000Z',
          feedbackId: 'feedback-123',
        },
      };

      const events = transformToCanonicalEvent(notification);

      expect(events).toHaveLength(1);
      expect(events[0].provider).toBe('ses');
      expect(events[0].eventType).toBe('bounced');
      expect(events[0].email).toBe('bounce@example.com');
      expect(events[0].messageId).toBe('msg-123');
      expect(events[0].metadata?.bounceType).toBe('Permanent');
      expect(events[0].metadata?.bounceSubType).toBe('General');
      expect(events[0].metadata?.diagnosticCode).toBe('smtp; 550 User unknown');
    });

    it('should transform transient bounce as deferred', () => {
      const notification = {
        notificationType: 'Bounce' as const,
        mail: baseMail,
        bounce: {
          bounceType: 'Transient' as const,
          bounceSubType: 'MailboxFull',
          bouncedRecipients: [
            { emailAddress: 'full@example.com' },
          ],
          timestamp: '2024-01-15T10:30:01.000Z',
          feedbackId: 'feedback-123',
        },
      };

      const events = transformToCanonicalEvent(notification);

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('deferred');
    });

    it('should transform complaint notification', () => {
      const notification = {
        notificationType: 'Complaint' as const,
        mail: baseMail,
        complaint: {
          complainedRecipients: [
            { emailAddress: 'complaint@example.com' },
          ],
          timestamp: '2024-01-15T10:30:01.000Z',
          feedbackId: 'feedback-456',
          complaintFeedbackType: 'abuse',
          userAgent: 'Yahoo Mail',
        },
      };

      const events = transformToCanonicalEvent(notification);

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('complained');
      expect(events[0].email).toBe('complaint@example.com');
      expect(events[0].metadata?.complaintType).toBe('abuse');
      expect(events[0].metadata?.userAgent).toBe('Yahoo Mail');
    });

    it('should transform delivery notification', () => {
      const notification = {
        notificationType: 'Delivery' as const,
        mail: baseMail,
        delivery: {
          timestamp: '2024-01-15T10:30:02.000Z',
          processingTimeMillis: 500,
          recipients: ['delivered@example.com'],
          smtpResponse: '250 OK',
          remoteMtaIp: '10.0.0.1',
          reportingMTA: 'smtp.example.com',
        },
      };

      const events = transformToCanonicalEvent(notification);

      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('delivered');
      expect(events[0].email).toBe('delivered@example.com');
      expect(events[0].metadata?.smtpResponse).toBe('250 OK');
      expect(events[0].metadata?.processingTimeMs).toBe(500);
    });

    it('should handle multiple recipients in bounce', () => {
      const notification = {
        notificationType: 'Bounce' as const,
        mail: baseMail,
        bounce: {
          bounceType: 'Permanent' as const,
          bounceSubType: 'General',
          bouncedRecipients: [
            { emailAddress: 'bounce1@example.com' },
            { emailAddress: 'bounce2@example.com' },
            { emailAddress: 'bounce3@example.com' },
          ],
          timestamp: '2024-01-15T10:30:01.000Z',
          feedbackId: 'feedback-123',
        },
      };

      const events = transformToCanonicalEvent(notification);

      expect(events).toHaveLength(3);
      expect(events[0].email).toBe('bounce1@example.com');
      expect(events[1].email).toBe('bounce2@example.com');
      expect(events[2].email).toBe('bounce3@example.com');
    });
  });
});
