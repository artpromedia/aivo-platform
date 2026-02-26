import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

// ══════════════════════════════════════════════════════════════════════════════
// Mocks
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  attempt: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  attemptSecurityViolation: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  attemptSession: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findMany: vi.fn(),
  },
  attemptAccommodation: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../src/events/publisher.js', () => ({
  publishEvent: vi.fn(),
}));

// Set env BEFORE importing the service
const TEST_SECRET = crypto.randomBytes(32).toString('hex'); // 64 chars
process.env.SECURITY_TOKEN_SECRET = TEST_SECRET;

import { SecurityService } from '../src/services/security.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('SecurityService', () => {
  let service: SecurityService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SecurityService();
  });

  // ── Constructor Validation ────────────────────────────────────────────

  describe('constructor', () => {
    it('should create service when SECURITY_TOKEN_SECRET is valid', () => {
      expect(service).toBeInstanceOf(SecurityService);
    });

    it('should throw when SECURITY_TOKEN_SECRET is missing', () => {
      const original = process.env.SECURITY_TOKEN_SECRET;
      delete process.env.SECURITY_TOKEN_SECRET;
      expect(() => new SecurityService()).toThrow('SECURITY_TOKEN_SECRET');
      process.env.SECURITY_TOKEN_SECRET = original;
    });

    it('should throw when secret is too short', () => {
      const original = process.env.SECURITY_TOKEN_SECRET;
      process.env.SECURITY_TOKEN_SECRET = 'short';
      expect(() => new SecurityService()).toThrow('at least 32 characters');
      process.env.SECURITY_TOKEN_SECRET = original;
    });

    it('should throw for weak/default secrets', () => {
      const original = process.env.SECURITY_TOKEN_SECRET;
      process.env.SECURITY_TOKEN_SECRET = 'default-secret-change-me-with-extra-padding-for-length';
      expect(() => new SecurityService()).toThrow('weak or default');
      process.env.SECURITY_TOKEN_SECRET = original;
    });
  });

  // ── generateSecurityToken ─────────────────────────────────────────────

  describe('generateSecurityToken', () => {
    it('should generate a token with expected fields', () => {
      const result = service.generateSecurityToken('attempt-1', 'fp-abc');

      expect(result.token).toContain('.');
      expect(result.attemptId).toBe('attempt-1');
      expect(result.fingerprint).toBe('fp-abc');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should produce unique tokens per call (random nonce)', () => {
      const t1 = service.generateSecurityToken('a-1', 'fp-1');
      const t2 = service.generateSecurityToken('a-1', 'fp-1');
      expect(t1.token).not.toBe(t2.token);
    });
  });

  // ── validateSecurityToken ─────────────────────────────────────────────

  describe('validateSecurityToken', () => {
    it('should validate a valid token', async () => {
      const { token } = service.generateSecurityToken('a-1', 'fp-1');

      mockPrisma.attempt.findUnique.mockResolvedValue({
        status: 'IN_PROGRESS',
        securityToken: token,
      });

      const result = await service.validateSecurityToken(token, 'a-1', 'fp-1');
      expect(result.valid).toBe(true);
    });

    it('should reject token with mismatched attemptId', async () => {
      const { token } = service.generateSecurityToken('a-1', 'fp-1');
      const result = await service.validateSecurityToken(token, 'a-OTHER', 'fp-1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Token does not match attempt');
    });

    it('should reject token with mismatched fingerprint', async () => {
      const { token } = service.generateSecurityToken('a-1', 'fp-1');
      const result = await service.validateSecurityToken(token, 'a-1', 'bad-fp');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Fingerprint mismatch');
    });

    it('should reject when attempt not found', async () => {
      const { token } = service.generateSecurityToken('a-1', 'fp-1');
      mockPrisma.attempt.findUnique.mockResolvedValue(null);

      const result = await service.validateSecurityToken(token, 'a-1', 'fp-1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Attempt not found');
    });

    it('should reject when attempt is not IN_PROGRESS', async () => {
      const { token } = service.generateSecurityToken('a-1', 'fp-1');
      mockPrisma.attempt.findUnique.mockResolvedValue({
        status: 'SUBMITTED',
      });

      const result = await service.validateSecurityToken(token, 'a-1', 'fp-1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Attempt is not in progress');
    });

    it('should reject an invalid/tampered token', async () => {
      const result = await service.validateSecurityToken('bad.token', 'a-1', 'fp-1');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Invalid token');
    });
  });

  // ── recordViolation ───────────────────────────────────────────────────

  describe('recordViolation', () => {
    it('should record a violation and return blocked=false within limit', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'a-1',
        assessment: {
          configSettings: { maxViolations: 5, autoSubmitOnMaxViolations: false },
        },
      });
      mockPrisma.attemptSecurityViolation.create.mockResolvedValue({});
      mockPrisma.attempt.update.mockResolvedValue({ violationCount: 2 });

      const result = await service.recordViolation('a-1', {
        type: 'TAB_SWITCH' as any,
        timestamp: new Date(),
      });

      expect(result.blocked).toBe(false);
      expect(mockPrisma.attemptSecurityViolation.create).toHaveBeenCalled();
    });

    it('should auto-submit when max violations exceeded with autoSubmit', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'a-1',
        assessment: {
          configSettings: { maxViolations: 3, autoSubmitOnMaxViolations: true },
        },
      });
      mockPrisma.attemptSecurityViolation.create.mockResolvedValue({});
      mockPrisma.attempt.update
        .mockResolvedValueOnce({ violationCount: 3 }) // increment
        .mockResolvedValueOnce({}); // status update

      const result = await service.recordViolation('a-1', {
        type: 'COPY_PASTE' as any,
        timestamp: new Date(),
      });

      expect(result.blocked).toBe(true);
      expect(result.reason).toContain('auto-submitted');
    });

    it('should throw for unknown attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);
      await expect(
        service.recordViolation('bad', { type: 'TAB_SWITCH' as any, timestamp: new Date() })
      ).rejects.toThrow('Attempt not found');
    });
  });

  // ── detectLockdownBrowser ─────────────────────────────────────────────

  describe('detectLockdownBrowser', () => {
    it('should detect Respondus', () => {
      const r = service.detectLockdownBrowser('Respondus LockDown Browser/2.0');
      expect(r.isLockdown).toBe(true);
      expect(r.provider).toBe('respondus');
    });

    it('should detect Proctorio', () => {
      const r = service.detectLockdownBrowser('Chrome/100 Proctorio/1.0');
      expect(r.isLockdown).toBe(true);
      expect(r.provider).toBe('proctorio');
    });

    it('should detect Examity', () => {
      const r = service.detectLockdownBrowser('Examity Desktop Agent');
      expect(r.isLockdown).toBe(true);
      expect(r.provider).toBe('examity');
    });

    it('should detect Honorlock', () => {
      const r = service.detectLockdownBrowser('Chrome/100 Honorlock');
      expect(r.isLockdown).toBe(true);
      expect(r.provider).toBe('honorlock');
    });

    it('should return false for regular browser', () => {
      const r = service.detectLockdownBrowser('Mozilla/5.0 Chrome/120');
      expect(r.isLockdown).toBe(false);
      expect(r.provider).toBeUndefined();
    });
  });

  // ── getClientSecurityConfig ───────────────────────────────────────────

  describe('getClientSecurityConfig', () => {
    it('should return client config with defaults', () => {
      const cfg = service.getClientSecurityConfig({});
      expect(cfg.preventCopyPaste).toBe(false);
      expect(cfg.detectTabSwitch).toBe(false);
      expect(cfg.reportInterval).toBe(5000);
    });

    it('should respect provided settings', () => {
      const cfg = service.getClientSecurityConfig({
        preventCopyPaste: true,
        detectTabSwitch: true,
      });
      expect(cfg.preventCopyPaste).toBe(true);
      expect(cfg.detectTabSwitch).toBe(true);
    });
  });

  // ── validateAttemptContinuation ───────────────────────────────────────

  describe('validateAttemptContinuation', () => {
    it('should allow continuation for valid attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        status: 'IN_PROGRESS',
        expiresAt: new Date(Date.now() + 30 * 60_000),
        violationCount: 0,
        assessment: {
          configSettings: { maxViolations: 5 },
        },
      });

      const r = await service.validateAttemptContinuation('a-1');
      expect(r.canContinue).toBe(true);
    });

    it('should deny for non-existent attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue(null);
      const r = await service.validateAttemptContinuation('bad');
      expect(r.canContinue).toBe(false);
      expect(r.reason).toBe('Attempt not found');
    });

    it('should deny for time-expired attempt', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        status: 'IN_PROGRESS',
        expiresAt: new Date(Date.now() - 60_000),
        violationCount: 0,
        assessment: { configSettings: {} },
      });

      const r = await service.validateAttemptContinuation('a-1');
      expect(r.canContinue).toBe(false);
      expect(r.reason).toBe('Time limit exceeded');
    });

    it('should deny for max violations exceeded', async () => {
      mockPrisma.attempt.findUnique.mockResolvedValue({
        status: 'IN_PROGRESS',
        expiresAt: new Date(Date.now() + 60_000),
        violationCount: 5,
        assessment: {
          configSettings: { maxViolations: 5 },
        },
      });

      const r = await service.validateAttemptContinuation('a-1');
      expect(r.canContinue).toBe(false);
      expect(r.reason).toBe('Maximum violations exceeded');
    });
  });

  // ── addAccommodation ──────────────────────────────────────────────────

  describe('addAccommodation', () => {
    it('should add an accommodation record', async () => {
      mockPrisma.attemptAccommodation.create.mockResolvedValue({});

      await service.addAccommodation('a-1', {
        type: 'LARGE_TEXT' as any,
        value: true,
        approvedBy: 'admin-1',
      });

      expect(mockPrisma.attemptAccommodation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            attemptId: 'a-1',
            type: 'LARGE_TEXT',
            grantedBy: 'admin-1',
          }),
        })
      );
    });

    it('should extend time limit for EXTENDED_TIME accommodation', async () => {
      mockPrisma.attemptAccommodation.create.mockResolvedValue({});
      mockPrisma.attempt.findUnique.mockResolvedValue({
        id: 'a-1',
        expiresAt: new Date(Date.now() + 30 * 60_000),
        timeLimit: 60,
      });
      mockPrisma.attempt.update.mockResolvedValue({});

      await service.addAccommodation('a-1', {
        type: 'EXTENDED_TIME' as any,
        value: 30, // 30 extra minutes
        approvedBy: 'admin-1',
      });

      expect(mockPrisma.attempt.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'a-1' },
          data: expect.objectContaining({
            timeLimit: 90,
          }),
        })
      );
    });
  });
});
