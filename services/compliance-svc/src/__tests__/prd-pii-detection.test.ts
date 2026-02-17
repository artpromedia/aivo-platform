/**
 * PRD Alignment Tests — PII Detection (COPPA compliance)
 *
 * Validates Sprint 5 requirements:
 * - Email detection
 * - Phone number detection
 * - SSN detection
 * - Name disclosure detection
 * - Photo request detection
 * - Minor message blocking
 */

import { describe, it, expect } from 'vitest';
import { detectPii, shouldBlockMessage, sanitizeMessage } from '../modules/coppa/pii-detection.js';

describe('PRD: PII Detection', () => {
  it('should detect email addresses', () => {
    const result = detectPii('My email is john@example.com');
    expect(result.hasPii).toBe(true);
    expect(result.detectedTypes).toContain('EMAIL');
  });

  it('should detect phone numbers', () => {
    const result = detectPii('Call me at 555-123-4567');
    expect(result.hasPii).toBe(true);
    expect(result.detectedTypes).toContain('PHONE');
  });

  it('should detect SSN', () => {
    const result = detectPii('My SSN is 123-45-6789');
    expect(result.hasPii).toBe(true);
    expect(result.detectedTypes).toContain('SSN');
  });

  it('should detect "my name is" patterns', () => {
    const result = detectPii('Hi, my name is John Smith and I need help');
    expect(result.hasPii).toBe(true);
    expect(result.detectedTypes).toContain('FULL_NAME');
  });

  it('should detect photo requests', () => {
    const result = detectPii('Can I send a photo of my homework?');
    expect(result.hasPii).toBe(true);
    expect(result.detectedTypes).toContain('PHOTO_REQUEST');
  });

  it('should not flag normal educational messages', () => {
    const result = detectPii('What is the square root of 144?');
    expect(result.hasPii).toBe(false);
  });

  it('should not flag normal text without PII', () => {
    const result = detectPii('I need help with my math homework about fractions');
    expect(result.hasPii).toBe(false);
  });
});

describe('PRD: Minor Message Blocking', () => {
  it('should block messages with email from minors', () => {
    const result = shouldBlockMessage('My email is kid@school.com', true);
    expect(result.blocked).toBe(true);
  });

  it('should block messages with phone from minors', () => {
    const result = shouldBlockMessage('My number is 555-123-4567', true);
    expect(result.blocked).toBe(true);
  });

  it('should NOT block clean messages from minors', () => {
    const result = shouldBlockMessage('Help me with algebra', true);
    expect(result.blocked).toBe(false);
  });

  it('should NOT block PII messages from adults', () => {
    const result = shouldBlockMessage('My email is adult@example.com', false);
    expect(result.blocked).toBe(false);
  });
});

describe('PRD: PII Sanitization', () => {
  it('should redact email addresses', () => {
    const sanitized = sanitizeMessage('Contact me at user@test.com');
    expect(sanitized).not.toContain('user@test.com');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('should redact phone numbers', () => {
    const sanitized = sanitizeMessage('Call 555-123-4567 please');
    expect(sanitized).not.toContain('555-123-4567');
    expect(sanitized).toContain('[REDACTED]');
  });

  it('should preserve non-PII text', () => {
    const sanitized = sanitizeMessage('Help with math at user@test.com');
    expect(sanitized).toContain('Help with math at');
  });
});
