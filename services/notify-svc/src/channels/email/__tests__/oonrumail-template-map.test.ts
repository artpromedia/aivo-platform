/**
 * OonruMail Template Map Tests
 *
 * Tests for the template mapping registry covering:
 * - Each template mapping's context transformation
 * - hasOonruMailTemplate / getOonruMailMapping / resolveOonruMailTemplateId helpers
 * - Default fallback values when context fields are missing
 * - Alias resolution (with and without prefix)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist config mock so it's available in the vi.mock factory
const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    email: {
      fromEmail: 'noreply@aivo.app',
      fromName: 'AIVO',
      oonrumail: {
        enabled: true,
        apiKey: 'test-key',
        baseUrl: 'https://api.oonrumail.com/v1',
        webhookSecret: 'webhook-secret',
        useServerTemplates: true,
        timeout: 30000,
        sandboxMode: false,
        templates: {
          welcome: 'tpl_welcome_001',
          emailVerification: 'tpl_verify_002',
          passwordReset: 'tpl_reset_003',
          paymentReceipt: 'tpl_payment_004',
          lessonReminder: 'tpl_lesson_005',
          courseCompletion: 'tpl_course_006',
          assignmentSubmitted: 'tpl_assign_sub_007',
          assignmentGraded: 'tpl_assign_grade_008',
          instructorNewEnrollment: 'tpl_instr_009',
        },
      },
    },
    appUrl: 'https://app.aivo.io',
  },
}));

vi.mock('../../../config.js', () => ({
  config: mockConfig,
}));

// Import under test AFTER mocks are set up
import {
  TEMPLATE_MAP,
  hasOonruMailTemplate,
  getOonruMailMapping,
  resolveOonruMailTemplateId,
  getRegisteredTemplateNames,
} from '../oonrumail-template-map.js';

import type { EmailTemplateContext } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

function baseContext(overrides: Record<string, unknown> = {}): EmailTemplateContext {
  return {
    appName: 'Aivo',
    appUrl: 'https://app.aivo.io',
    supportEmail: 'support@aivolearning.com',
    currentYear: 2025,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('oonrumail-template-map', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // hasOonruMailTemplate
  // ──────────────────────────────────────────────────────────────────────────

  describe('hasOonruMailTemplate', () => {
    it('should return true for a mapped template with configured ID', () => {
      expect(hasOonruMailTemplate('transactional/welcome')).toBe(true);
    });

    it('should return true for alias without prefix', () => {
      expect(hasOonruMailTemplate('welcome')).toBe(true);
    });

    it('should return false for an unknown template', () => {
      expect(hasOonruMailTemplate('unknown/template')).toBe(false);
    });

    it('should return false when template ID is empty string', () => {
      mockConfig.email.oonrumail.templates.welcome = '';
      expect(hasOonruMailTemplate('transactional/welcome')).toBe(false);
      mockConfig.email.oonrumail.templates.welcome = 'tpl_welcome_001';
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getOonruMailMapping
  // ──────────────────────────────────────────────────────────────────────────

  describe('getOonruMailMapping', () => {
    it('should return a mapping for a known template', () => {
      const mapping = getOonruMailMapping('transactional/password-reset');
      expect(mapping).toBeDefined();
      expect(mapping!.oonruMailTemplateConfigKey).toBe('passwordReset');
    });

    it('should return undefined for an unknown template', () => {
      expect(getOonruMailMapping('nonexistent')).toBeUndefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // resolveOonruMailTemplateId
  // ──────────────────────────────────────────────────────────────────────────

  describe('resolveOonruMailTemplateId', () => {
    it('should resolve to the configured server template ID', () => {
      expect(resolveOonruMailTemplateId('transactional/welcome')).toBe('tpl_welcome_001');
    });

    it('should resolve alias to the same ID', () => {
      expect(resolveOonruMailTemplateId('welcome')).toBe('tpl_welcome_001');
    });

    it('should return undefined for unmapped template', () => {
      expect(resolveOonruMailTemplateId('unknown')).toBeUndefined();
    });

    it('should return undefined when configured ID is empty', () => {
      mockConfig.email.oonrumail.templates.passwordReset = '';
      expect(resolveOonruMailTemplateId('transactional/password-reset')).toBeUndefined();
      mockConfig.email.oonrumail.templates.passwordReset = 'tpl_reset_003';
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // getRegisteredTemplateNames
  // ──────────────────────────────────────────────────────────────────────────

  describe('getRegisteredTemplateNames', () => {
    it('should return all registered template names', () => {
      const names = getRegisteredTemplateNames();
      expect(names).toContain('transactional/welcome');
      expect(names).toContain('welcome');
      expect(names).toContain('transactional/email-verification');
      expect(names).toContain('transactional/password-reset');
      expect(names).toContain('caregiver/caregiver-welcome');
      expect(names).toContain('caregiver/caregiver-verify-email');
      expect(names).toContain('billing/payment-receipt');
      expect(names.length).toBeGreaterThanOrEqual(10);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Context Transformations
  // ──────────────────────────────────────────────────────────────────────────

  describe('transformContext — transactional/welcome', () => {
    it('should map all context fields', () => {
      const ctx = baseContext({
        userName: 'Alice',
        tenantName: 'Springfield School',
        activationUrl: 'https://app.aivo.io/activate?token=abc',
        brandColor: '#3b82f6',
        expiryHours: 24,
        helpCenter: 'https://help.aivo.io',
      });

      const mapping = getOonruMailMapping('transactional/welcome')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('Alice');
      expect(result.tenant_name).toBe('Springfield School');
      expect(result.activation_url).toBe('https://app.aivo.io/activate?token=abc');
      expect(result.brand_color).toBe('#3b82f6');
      expect(result.expiry_hours).toBe(24);
      expect(result.help_center_url).toBe('https://help.aivo.io');
      expect(result.app_name).toBe('Aivo');
      expect(result.current_year).toBe(2025);
    });

    it('should use defaults when fields are missing', () => {
      const ctx = baseContext();
      const mapping = getOonruMailMapping('welcome')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('there');
      expect(result.tenant_name).toBe('Aivo');
      expect(result.activation_url).toBe('https://app.aivo.io');
      expect(result.brand_color).toBe('#6366f1');
      expect(result.expiry_hours).toBe(48);
    });
  });

  describe('transformContext — transactional/email-verification', () => {
    it('should map verification context fields', () => {
      const ctx = baseContext({
        userName: 'Bob',
        verificationUrl: 'https://app.aivo.io/verify?code=123',
        verificationCode: '123456',
        codeExpiryMinutes: 15,
        brandColor: '#10b981',
      });

      const mapping = getOonruMailMapping('transactional/email-verification')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('Bob');
      expect(result.verification_url).toBe('https://app.aivo.io/verify?code=123');
      expect(result.verification_code).toBe('123456');
      expect(result.code_expiry_minutes).toBe(15);
      expect(result.brand_color).toBe('#10b981');
    });

    it('should use defaults when fields are missing', () => {
      const ctx = baseContext();
      const mapping = getOonruMailMapping('email-verification')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('User');
      expect(result.verification_code).toBe('');
      expect(result.code_expiry_minutes).toBe(30);
    });
  });

  describe('transformContext — transactional/password-reset', () => {
    it('should map password reset context fields', () => {
      const ctx = baseContext({
        userEmail: 'bob@example.com',
        resetUrl: 'https://app.aivo.io/reset?token=xyz',
        expiryMinutes: 30,
        supportUrl: 'https://help.aivo.io',
        requestInfo: {
          ipAddress: '192.168.1.1',
          browser: 'Chrome',
          timestamp: '2025-01-10T12:00:00Z',
        },
      });

      const mapping = getOonruMailMapping('transactional/password-reset')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_email).toBe('bob@example.com');
      expect(result.reset_url).toBe('https://app.aivo.io/reset?token=xyz');
      expect(result.expiry_minutes).toBe(30);
      expect(result.support_url).toBe('https://help.aivo.io');
      expect(result.request_ip).toBe('192.168.1.1');
      expect(result.request_browser).toBe('Chrome');
    });

    it('should handle missing requestInfo gracefully', () => {
      const ctx = baseContext({
        userEmail: 'test@example.com',
        resetUrl: 'https://app.aivo.io/reset',
      });

      const mapping = getOonruMailMapping('password-reset')!;
      const result = mapping.transformContext(ctx);

      expect(result.request_ip).toBe('');
      expect(result.request_browser).toBe('');
      expect(result.request_timestamp).toBe('');
    });
  });

  describe('transformContext — caregiver/caregiver-welcome', () => {
    it('should map caregiver welcome fields', () => {
      const ctx = baseContext({
        firstName: 'Carol',
        loginUrl: 'https://app.aivo.io/login',
        brandColor: '#f59e0b',
        learnerCount: 2,
        dashboardUrl: 'https://app.aivo.io/dashboard',
      });

      const mapping = getOonruMailMapping('caregiver/caregiver-welcome')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('Carol');
      expect(result.activation_url).toBe('https://app.aivo.io/login');
      expect(result.learner_count).toBe(2);
      expect(result.dashboard_url).toBe('https://app.aivo.io/dashboard');
    });
  });

  describe('transformContext — caregiver/caregiver-verify-email', () => {
    it('should map caregiver verification fields', () => {
      const ctx = baseContext({
        firstName: 'Dave',
        verificationCode: '654321',
        expiryHours: 48,
      });

      const mapping = getOonruMailMapping('caregiver/caregiver-verify-email')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('Dave');
      expect(result.verification_code).toBe('654321');
      // 48 hours * 60 = 2880 minutes
      expect(result.code_expiry_minutes).toBe(2880);
    });
  });

  describe('transformContext — billing/payment-receipt', () => {
    it('should map payment receipt fields', () => {
      const ctx = baseContext({
        userName: 'Eve',
        amount: '49.99',
        currency: 'USD',
        invoiceNumber: 'INV-001',
        planName: 'Pro',
      });

      const mapping = getOonruMailMapping('billing/payment-receipt')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('Eve');
      expect(result.amount).toBe('49.99');
      expect(result.currency).toBe('USD');
      expect(result.invoice_number).toBe('INV-001');
      expect(result.plan_name).toBe('Pro');
    });
  });

  describe('transformContext — notifications/lesson-reminder', () => {
    it('should map lesson reminder fields', () => {
      const ctx = baseContext({
        userName: 'Frank',
        lessonTitle: 'Algebra 101',
        courseName: 'Math Basics',
        startTime: '2025-01-15T09:00:00Z',
        lessonUrl: 'https://app.aivo.io/lessons/123',
      });

      const mapping = getOonruMailMapping('notifications/lesson-reminder')!;
      const result = mapping.transformContext(ctx);

      expect(result.user_name).toBe('Frank');
      expect(result.lesson_title).toBe('Algebra 101');
      expect(result.course_name).toBe('Math Basics');
      expect(result.start_time).toBe('2025-01-15T09:00:00Z');
      expect(result.lesson_url).toBe('https://app.aivo.io/lessons/123');
    });
  });

  describe('transformContext — notifications/assignment-graded', () => {
    it('should map assignment graded fields', () => {
      const ctx = baseContext({
        studentName: 'Grace',
        assignmentTitle: 'Essay 1',
        courseName: 'English',
        grade: 'A+',
        feedback: 'Excellent work!',
        assignmentUrl: 'https://app.aivo.io/assignments/456',
      });

      const mapping = getOonruMailMapping('notifications/assignment-graded')!;
      const result = mapping.transformContext(ctx);

      expect(result.student_name).toBe('Grace');
      expect(result.assignment_title).toBe('Essay 1');
      expect(result.grade).toBe('A+');
      expect(result.feedback).toBe('Excellent work!');
    });
  });
});
