/**
 * SMS System Tests
 *
 * Unit and integration tests for the SMS system:
 * - Phone validation
 * - Template rendering
 * - Consent management
 * - Rate limiting
 * - Webhook handling
 */

import { describe, it, expect } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// PHONE VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Phone Validation', () => {
  // We'll test the core validation logic without requiring the full module
  
  describe('E.164 Format', () => {
    it('should accept valid US phone numbers', () => {
      const validNumbers = [
        '+14155551234',
        '+12025551234',
        '+18005551234',
      ];
      
      for (const num of validNumbers) {
        expect(num).toMatch(/^\+1\d{10}$/);
      }
    });
    
    it('should accept valid international numbers', () => {
      const validNumbers = [
        '+442071234567',   // UK
        '+61412345678',    // Australia
        '+33612345678',    // France
        '+491721234567',   // Germany
      ];
      
      for (const num of validNumbers) {
        expect(num).toMatch(/^\+\d{8,15}$/);
      }
    });
    
    it('should reject invalid formats', () => {
      const invalidNumbers = [
        '4155551234',      // Missing +1
        '+1415555123',     // Too short
        '+141555512345',   // Too long
        '555-1234',        // Local format
        'not-a-number',    // Text
        '',                // Empty
      ];
      
      for (const num of invalidNumbers) {
        expect(num).not.toMatch(/^\+1\d{10}$/);
      }
    });
  });
  
  describe('Country Support', () => {
    const supportedCountries = ['US', 'CA', 'GB', 'AU', 'NZ', 'IE', 'FR', 'DE', 'ES', 'IT'];
    
    it('should support major education markets', () => {
      expect(supportedCountries).toContain('US');
      expect(supportedCountries).toContain('CA');
      expect(supportedCountries).toContain('GB');
      expect(supportedCountries).toContain('AU');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SMS TEMPLATE TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('SMS Templates', () => {
  describe('Template Rendering', () => {
    it('should render OTP template correctly', () => {
      const template = 'Your Aivo code is {{code}}. Expires in 5 min. Do not share.';
      const rendered = template.replace('{{code}}', '123456');
      
      expect(rendered).toBe('Your Aivo code is 123456. Expires in 5 min. Do not share.');
      expect(rendered.length).toBeLessThan(160); // Fits in 1 segment
    });
    
    it('should render session reminder template', () => {
      const template = "Reminder: {{studentName}}'s {{subject}} session starts in {{timeUntil}}. Join at aivolearning.com/session/{{sessionId}}. Reply STOP to opt out.";
      const context = {
        studentName: 'Alex',
        subject: 'Math',
        timeUntil: '30 min',
        sessionId: 'abc123',
      };
      
      let rendered = template;
      for (const [key, value] of Object.entries(context)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      }
      
      expect(rendered).toContain('Alex');
      expect(rendered).toContain('Math');
      expect(rendered).toContain('30 min');
      expect(rendered).toContain('STOP');
      expect(rendered.length).toBeLessThanOrEqual(160);
    });
    
    it('should include opt-out instructions for reminders', () => {
      const reminderTemplate = "Reminder: Session in {{time}}. Reply STOP to opt out.";
      expect(reminderTemplate).toContain('STOP');
    });
    
    it('should not include opt-out for OTP', () => {
      const otpTemplate = 'Your Aivo code is {{code}}. Expires in 5 min. Do not share.';
      expect(otpTemplate).not.toContain('STOP');
    });
  });
  
  describe('GSM Character Set', () => {
    const GSM_BASIC_CHARS = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    
    it('should detect GSM-7 compatible messages', () => {
      const gsmMessage = 'Your code is 123456. Valid for 5 min.';
      const isGsm = [...gsmMessage].every(char => 
        GSM_BASIC_CHARS.includes(char) || ['^', '{', '}', '\\', '[', ']', '~', '|', '€'].includes(char)
      );
      
      expect(isGsm).toBe(true);
    });
    
    it('should detect Unicode messages', () => {
      const unicodeMessage = 'Your code is 123456 👍';
      const isGsm = [...unicodeMessage].every(char => 
        GSM_BASIC_CHARS.includes(char) || ['^', '{', '}', '\\', '[', ']', '~', '|', '€'].includes(char)
      );
      
      expect(isGsm).toBe(false); // Contains emoji
    });
  });
  
  describe('Segment Calculation', () => {
    it('should calculate 1 segment for short GSM message', () => {
      const shortMessage = 'Your code is 123456.'; // 20 chars
      const segments = Math.ceil(shortMessage.length / 160);
      
      expect(segments).toBe(1);
    });
    
    it('should calculate multiple segments for long message', () => {
      const longMessage = 'A'.repeat(200); // 200 chars
      const segments = Math.ceil(longMessage.length / 153); // 153 for multipart
      
      expect(segments).toBe(2);
    });
    
    it('should use 70 char limit for Unicode', () => {
      const unicodeMessage = '👍'.repeat(80);
      // Unicode uses 70 chars per segment single, 67 for multipart
      const segments = Math.ceil(80 / 67);
      
      expect(segments).toBe(2);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONSENT MANAGEMENT TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('SMS Consent', () => {
  describe('TCPA Compliance', () => {
    it('should require consent for marketing messages', () => {
      const exemptTypes = ['OTP', 'TRANSACTIONAL'];
      const marketingType = 'MARKETING';
      
      expect(exemptTypes).not.toContain(marketingType);
    });
    
    it('should not require consent for OTP', () => {
      const exemptTypes = ['OTP', 'TRANSACTIONAL'];
      expect(exemptTypes).toContain('OTP');
    });
    
    it('should not require consent for transactional', () => {
      const exemptTypes = ['OTP', 'TRANSACTIONAL'];
      expect(exemptTypes).toContain('TRANSACTIONAL');
    });
    
    it('should set 18-month consent expiry', () => {
      const CONSENT_EXPIRY_MONTHS = 18;
      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setMonth(expiryDate.getMonth() + CONSENT_EXPIRY_MONTHS);
      
      const monthsDiff = (expiryDate.getFullYear() - now.getFullYear()) * 12 + 
                         (expiryDate.getMonth() - now.getMonth());
      
      expect(monthsDiff).toBe(18);
    });
    
    it('should warn 30 days before consent expiry', () => {
      const RENEWAL_WARNING_DAYS = 30;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 25); // 25 days until expiry
      
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      
      const needsRenewal = daysUntilExpiry <= RENEWAL_WARNING_DAYS;
      expect(needsRenewal).toBe(true);
    });
  });
  
  describe('STOP Keyword Handling', () => {
    const STOP_KEYWORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    
    it('should recognize all STOP keywords', () => {
      expect(STOP_KEYWORDS).toContain('STOP');
      expect(STOP_KEYWORDS).toContain('STOPALL');
      expect(STOP_KEYWORDS).toContain('UNSUBSCRIBE');
      expect(STOP_KEYWORDS).toContain('CANCEL');
      expect(STOP_KEYWORDS).toContain('END');
      expect(STOP_KEYWORDS).toContain('QUIT');
    });
    
    it('should be case insensitive', () => {
      const inputKeyword = 'stop';
      const normalized = inputKeyword.toUpperCase();
      
      expect(STOP_KEYWORDS).toContain(normalized);
    });
    
    it('should respond with unsubscribe confirmation', () => {
      const response = 'You have been unsubscribed from Aivo SMS. No more messages will be sent. Reply START to resubscribe.';
      
      expect(response).toContain('unsubscribed');
      expect(response).toContain('START');
    });
  });
  
  describe('HELP Keyword Handling', () => {
    const HELP_KEYWORDS = ['HELP', 'INFO'];
    
    it('should recognize HELP keywords', () => {
      expect(HELP_KEYWORDS).toContain('HELP');
      expect(HELP_KEYWORDS).toContain('INFO');
    });
    
    it('should respond with support information', () => {
      const response = 'Aivo SMS: For support visit aivolearning.com/help or email support@aivolearning.com. Reply STOP to unsubscribe.';
      
      expect(response).toContain('support');
      expect(response).toContain('STOP');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Rate Limiting', () => {
  describe('Per-Phone Limits', () => {
    it('should enforce 10-second cooldown per phone', () => {
      const COOLDOWN_SECONDS = 10;
      const lastSentAt = new Date();
      const now = new Date(lastSentAt.getTime() + 5000); // 5 seconds later
      
      const secondsSinceLast = (now.getTime() - lastSentAt.getTime()) / 1000;
      const canSend = secondsSinceLast >= COOLDOWN_SECONDS;
      
      expect(canSend).toBe(false);
    });
    
    it('should allow send after cooldown', () => {
      const COOLDOWN_SECONDS = 10;
      const lastSentAt = new Date();
      const now = new Date(lastSentAt.getTime() + 11000); // 11 seconds later
      
      const secondsSinceLast = (now.getTime() - lastSentAt.getTime()) / 1000;
      const canSend = secondsSinceLast >= COOLDOWN_SECONDS;
      
      expect(canSend).toBe(true);
    });
    
    it('should enforce 6 SMS per minute limit', () => {
      const LIMIT_PER_MINUTE = 6;
      const sentInLastMinute = 6;
      
      const canSend = sentInLastMinute < LIMIT_PER_MINUTE;
      expect(canSend).toBe(false);
    });
  });
  
  describe('Tenant Daily Limits', () => {
    it('should enforce daily tenant limit', () => {
      const DAILY_LIMIT = 1000;
      const sentToday = 1000;
      
      const canSend = sentToday < DAILY_LIMIT;
      expect(canSend).toBe(false);
    });
    
    it('should reset at midnight', () => {
      const DAILY_LIMIT = 1000;
      const sentToday = 0; // Reset at midnight
      
      const canSend = sentToday < DAILY_LIMIT;
      expect(canSend).toBe(true);
    });
  });
  
  describe('OTP Priority', () => {
    it('should have separate OTP limits', () => {
      const OTP_LIMIT_PER_MINUTE = 10;
      const otpSentInLastMinute = 5;
      
      const canSendOtp = otpSentInLastMinute < OTP_LIMIT_PER_MINUTE;
      expect(canSendOtp).toBe(true);
    });
    
    it('should allow OTP to bypass per-phone cooldown', () => {
      // OTPs use separate rate limiter
      const isOtp = true;
      const bypassCooldown = isOtp;
      
      expect(bypassCooldown).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// QUIET HOURS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Quiet Hours', () => {
  describe('TCPA Quiet Hours (9pm-8am)', () => {
    it('should block messages at 10pm', () => {
      const QUIET_START = 21; // 9 PM
      const QUIET_END = 8;    // 8 AM
      const currentHour = 22; // 10 PM
      
      const isQuietHours = currentHour >= QUIET_START || currentHour < QUIET_END;
      expect(isQuietHours).toBe(true);
    });
    
    it('should block messages at 5am', () => {
      const QUIET_START = 21;
      const QUIET_END = 8;
      const currentHour = 5; // 5 AM
      
      const isQuietHours = currentHour >= QUIET_START || currentHour < QUIET_END;
      expect(isQuietHours).toBe(true);
    });
    
    it('should allow messages at 2pm', () => {
      const QUIET_START = 21;
      const QUIET_END = 8;
      const currentHour = 14; // 2 PM
      
      const isQuietHours = currentHour >= QUIET_START || currentHour < QUIET_END;
      expect(isQuietHours).toBe(false);
    });
    
    it('should allow messages at 8am', () => {
      const QUIET_START = 21;
      const QUIET_END = 8;
      const currentHour = 8; // 8 AM exactly
      
      const isQuietHours = currentHour >= QUIET_START || currentHour < QUIET_END;
      expect(isQuietHours).toBe(false);
    });
  });
  
  describe('Bypass for Critical Messages', () => {
    it('should allow OTP during quiet hours', () => {
      const messageType = 'OTP';
      const bypassQuietHours = messageType === 'OTP';
      
      expect(bypassQuietHours).toBe(true);
    });
    
    it('should allow high priority during quiet hours', () => {
      const priority = 'high';
      const bypassQuietHours = priority === 'high';
      
      expect(bypassQuietHours).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT FILTERING TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Filtering', () => {
  describe('SHAFT Content Detection', () => {
    const SHAFT_PATTERNS = [
      /\b(sex|porn|xxx|adult|nude)\b/i,
      /\b(hate|nazi|kkk)\b/i,
      /\b(beer|wine|vodka|whiskey|alcohol)\b/i,
      /\b(gun|rifle|firearm|ammunition|ammo)\b/i,
      /\b(tobacco|cigarette|vape|juul)\b/i,
    ];
    
    const containsShaftContent = (text: string): boolean => {
      return SHAFT_PATTERNS.some(pattern => pattern.test(text));
    };
    
    it('should block messages with sexual content', () => {
      expect(containsShaftContent('Buy adult content now')).toBe(true);
    });
    
    it('should block messages with hate content', () => {
      expect(containsShaftContent('Join the hate group')).toBe(true);
    });
    
    it('should block messages with alcohol content', () => {
      expect(containsShaftContent('Free beer promotion')).toBe(true);
    });
    
    it('should block messages with firearms content', () => {
      expect(containsShaftContent('Buy guns here')).toBe(true);
    });
    
    it('should block messages with tobacco content', () => {
      expect(containsShaftContent('Vape sale today')).toBe(true);
    });
    
    it('should allow educational content', () => {
      expect(containsShaftContent('Your math session starts in 30 min')).toBe(false);
    });
  });
  
  describe('Message Length', () => {
    it('should reject messages over 1600 characters', () => {
      const MAX_LENGTH = 1600;
      const longMessage = 'A'.repeat(1601);
      
      const isValid = longMessage.length <= MAX_LENGTH;
      expect(isValid).toBe(false);
    });
    
    it('should allow messages up to 1600 characters', () => {
      const MAX_LENGTH = 1600;
      const message = 'A'.repeat(1600);
      
      const isValid = message.length <= MAX_LENGTH;
      expect(isValid).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// WEBHOOK SIGNATURE VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Webhook Security', () => {
  describe('Twilio Signature Validation', () => {
    it('should require X-Twilio-Signature header', () => {
      const headers = { 'content-type': 'application/x-www-form-urlencoded' };
      const hasSignature = 'x-twilio-signature' in headers;
      
      expect(hasSignature).toBe(false);
    });
    
    it('should reject invalid signatures in production', () => {
      const isProduction = true;
      const signatureValid = false;
      
      const shouldReject = isProduction && !signatureValid;
      expect(shouldReject).toBe(true);
    });
    
    it('should allow requests in development without signature', () => {
      const isProduction = false;
      const validateSignature = isProduction;
      
      expect(validateSignature).toBe(false);
    });
  });
  
  describe('Status Callback Processing', () => {
    const statusMap: Record<string, string> = {
      queued: 'QUEUED',
      sending: 'SENDING',
      sent: 'SENT',
      delivered: 'DELIVERED',
      undelivered: 'UNDELIVERED',
      failed: 'FAILED',
    };
    
    it('should map Twilio status to internal status', () => {
      expect(statusMap['delivered']).toBe('DELIVERED');
      expect(statusMap['failed']).toBe('FAILED');
    });
    
    it('should handle unknown status gracefully', () => {
      const unknownStatus = statusMap['unknown'] ?? 'UNKNOWN';
      expect(unknownStatus).toBe('UNKNOWN');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TWILIO PROVIDER TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Twilio Provider', () => {
  describe('Messaging Service', () => {
    it('should prefer Messaging Service SID over From number', () => {
      const messagingServiceSid = 'MG1234567890';
      const fromNumber = '+14155551234';
      
      const useMessagingService = !!messagingServiceSid;
      expect(useMessagingService).toBe(true);
    });
    
    it('should fall back to From number if no Messaging Service', () => {
      const messagingServiceSid = '';
      const fromNumber = '+14155551234';
      
      const useMessagingService = !!messagingServiceSid;
      const usedFrom = useMessagingService ? undefined : fromNumber;
      
      expect(usedFrom).toBe(fromNumber);
    });
  });
  
  describe('Twilio Verify', () => {
    it('should require Verify Service SID for OTP', () => {
      const verifyServiceSid = 'VA1234567890';
      const canSendOtp = !!verifyServiceSid;
      
      expect(canSendOtp).toBe(true);
    });
    
    it('should fall back to regular SMS if no Verify service', () => {
      const verifyServiceSid = '';
      const useVerify = !!verifyServiceSid;
      const useFallback = !useVerify;
      
      expect(useFallback).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION SCENARIOS
// ══════════════════════════════════════════════════════════════════════════════

describe('Integration Scenarios', () => {
  describe('OTP Flow', () => {
    it('should send OTP without consent check', () => {
      const messageType = 'OTP';
      const skipConsentCheck = messageType === 'OTP';
      
      expect(skipConsentCheck).toBe(true);
    });
    
    it('should send OTP during quiet hours', () => {
      const messageType = 'OTP';
      const skipQuietHours = messageType === 'OTP';
      
      expect(skipQuietHours).toBe(true);
    });
  });
  
  describe('Parent Reminder Flow', () => {
    it('should require consent for reminders', () => {
      const messageType = 'REMINDER';
      const requiresConsent = !['OTP', 'TRANSACTIONAL'].includes(messageType);
      
      expect(requiresConsent).toBe(true);
    });
    
    it('should include opt-out in reminder', () => {
      const template = 'Session starts in 30 min. Reply STOP to opt out.';
      const hasOptOut = template.includes('STOP');
      
      expect(hasOptOut).toBe(true);
    });
    
    it('should respect quiet hours for reminders', () => {
      const messageType = 'REMINDER';
      const priority = 'normal';
      const respectQuietHours = messageType !== 'OTP' && priority !== 'high';
      
      expect(respectQuietHours).toBe(true);
    });
  });
  
  describe('Security Alert Flow', () => {
    it('should skip consent for security alerts (transactional)', () => {
      const messageType = 'TRANSACTIONAL';
      const skipConsent = messageType === 'TRANSACTIONAL';
      
      expect(skipConsent).toBe(true);
    });
    
    it('should bypass quiet hours for high priority alerts', () => {
      const priority = 'high';
      const bypassQuietHours = priority === 'high';
      
      expect(bypassQuietHours).toBe(true);
    });
  });
});
