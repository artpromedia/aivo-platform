/**
 * Safety Filter Tests
 *
 * Comprehensive tests for safety filtering including:
 * - Blocked content patterns
 * - PII detection
 * - Age-appropriate content
 * - Direct answer detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SafetyFilter } from '../src/safety/safety-filter-v2.js';
import type { AgentContext } from '../src/agents/base-agent.js';

describe('SafetyFilter', () => {
  let safetyFilter: SafetyFilter;

  const mockContext: AgentContext = {
    tenantId: 'test-tenant',
    userId: 'test-user',
    sessionId: 'test-session',
    learnerProfile: {
      gradeLevel: 5,
      age: 10,
    },
  };

  beforeEach(() => {
    // Create safety filter without LLM for pattern-based tests
    safetyFilter = new SafetyFilter();
  });

  describe('Input Safety Checks', () => {
    it('should allow safe educational content', async () => {
      const result = await safetyFilter.checkInput(
        'Can you help me understand fractions?',
        mockContext
      );

      expect(result.safe).toBe(true);
      expect(result.confidence).toBe(1.0);
    });

    it('should block self-harm content', async () => {
      const result = await safetyFilter.checkInput('I want to hurt myself', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('inappropriate_content');
    });

    it('should block weapon-making content', async () => {
      const result = await safetyFilter.checkInput('How do I make a bomb at home', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('inappropriate_content');
    });

    it('should block explicit content requests', async () => {
      const result = await safetyFilter.checkInput('Show me explicit content', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('inappropriate_content');
    });

    it('should detect phone numbers as PII', async () => {
      const result = await safetyFilter.checkInput('My phone number is 555-123-4567', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('personal_information');
    });

    it('should detect email addresses as PII', async () => {
      const result = await safetyFilter.checkInput('Email me at john.doe@example.com', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('personal_information');
    });

    it('should detect SSN as PII', async () => {
      const result = await safetyFilter.checkInput('My SSN is 123-45-6789', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('personal_information');
    });

    it('should detect street addresses as PII', async () => {
      const result = await safetyFilter.checkInput('I live at 123 Main Street', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('personal_information');
    });

    it('should allow educational content with numbers', async () => {
      const result = await safetyFilter.checkInput('What is 555 + 123?', mockContext);

      expect(result.safe).toBe(true);
    });
  });

  describe('Output Safety Checks', () => {
    it('should allow safe tutor responses', async () => {
      const result = await safetyFilter.checkOutput(
        'Great question! Let me help you understand fractions. First, what do you know about dividing things into equal parts?',
        mockContext
      );

      expect(result.safe).toBe(true);
    });

    it('should block inappropriate content in output', async () => {
      const result = await safetyFilter.checkOutput(
        'You should commit suicide if you fail this test',
        mockContext
      );

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('inappropriate_content');
    });

    it('should block hate speech in output', async () => {
      const result = await safetyFilter.checkOutput('Hate all those people', mockContext);

      expect(result.safe).toBe(false);
      expect(result.reason).toBe('inappropriate_content');
    });
  });

  describe('PII Sanitization', () => {
    it('should sanitize phone numbers', () => {
      const text = 'Call me at 555-123-4567';
      const sanitized = safetyFilter.sanitizePII(text);

      expect(sanitized).toBe('Call me at [PHONE REMOVED]');
    });

    it('should sanitize email addresses', () => {
      const text = 'Send to john@example.com please';
      const sanitized = safetyFilter.sanitizePII(text);

      expect(sanitized).toBe('Send to [EMAIL REMOVED] please');
    });

    it('should sanitize SSNs', () => {
      const text = 'My SSN is 123-45-6789';
      const sanitized = safetyFilter.sanitizePII(text);

      expect(sanitized).toBe('My SSN is [SSN REMOVED]');
    });

    it('should sanitize multiple PII instances', () => {
      const text = 'Call 555-123-4567 or email john@example.com';
      const sanitized = safetyFilter.sanitizePII(text);

      expect(sanitized).toBe('Call [PHONE REMOVED] or email [EMAIL REMOVED]');
    });
  });
});

describe('SafetyFilter with LLM', () => {
  // These tests would require mocking the LLM orchestrator
  // In a real implementation, we'd mock the complete() method

  it('should handle missing LLM gracefully', async () => {
    const safetyFilter = new SafetyFilter(); // No LLM

    const context: AgentContext = {
      tenantId: 'test-tenant',
      userId: 'test-user',
      learnerProfile: { gradeLevel: 5, age: 10 },
    };

    const result = await safetyFilter.checkInput('This is a normal educational question', context);

    expect(result.safe).toBe(true);
  });
});
