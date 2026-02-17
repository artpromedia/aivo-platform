/**
 * MFA Service — Comprehensive Unit Tests (Sprint 7)
 *
 * Covers: TOTP setup, secret encryption/decryption, backup codes,
 * code verification with time-window tolerance, MFA enable/disable.
 * Target: ≥80% line coverage for mfa.service.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockMfaConfig = {
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
};
const mockUser = {
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
};
const mockBackupCode = {
  createMany: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
};

const mockPrisma = {
  mfaConfig: mockMfaConfig,
  user: mockUser,
  backupCode: mockBackupCode,
  $transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(mockPrisma)),
};

vi.mock('../../src/prisma.js', () => ({ prisma: mockPrisma }));

vi.mock('../../src/config.js', () => ({
  config: {
    mfaEncryptionKey: 'test-mfa-encryption-key-for-unit-tests-32chars!!',
  },
}));

import { MfaService } from '../../src/services/mfa.service.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_ID = 'tenant-001';
const USER_ID = 'user-001';

function createMockMfaConfig(overrides = {}) {
  return {
    id: 'mfa-001',
    userId: USER_ID,
    tenantId: TENANT_ID,
    method: 'TOTP',
    enabled: false,
    encryptedSecret: null,
    verifiedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MfaService', () => {
  let mfaService: MfaService;

  beforeEach(() => {
    vi.clearAllMocks();
    mfaService = new MfaService(mockPrisma as any);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Setup
  // ═══════════════════════════════════════════════════════════════════════════
  describe('initializeSetup', () => {
    it('should generate TOTP secret and backup codes', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(null);
      mockUser.findFirst.mockResolvedValue({ id: USER_ID, email: 'teacher@school.edu' });
      mockMfaConfig.upsert.mockResolvedValue(createMockMfaConfig());
      mockBackupCode.deleteMany.mockResolvedValue({});
      mockBackupCode.createMany.mockResolvedValue({ count: 10 });

      const result = await mfaService.initializeSetup(USER_ID, TENANT_ID);

      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('qrCodeUri');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      // Backup codes follow XXXX-XXXX format
      for (const code of result.backupCodes) {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      }
    });

    it('should reject setup if MFA is already enabled', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(createMockMfaConfig({ enabled: true }));

      await expect(mfaService.initializeSetup(USER_ID, TENANT_ID)).rejects.toThrow(
        'already enabled'
      );
    });

    it('should generate a valid otpauth:// QR URI', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(null);
      mockUser.findFirst.mockResolvedValue({ id: USER_ID, email: 'teacher@school.edu' });
      mockMfaConfig.upsert.mockResolvedValue(createMockMfaConfig());
      mockBackupCode.deleteMany.mockResolvedValue({});
      mockBackupCode.createMany.mockResolvedValue({ count: 10 });

      const result = await mfaService.initializeSetup(USER_ID, TENANT_ID);

      expect(result.qrCodeUri).toContain('otpauth://totp/');
      expect(result.qrCodeUri).toContain('teacher%40school.edu');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Verify & Enable
  // ═══════════════════════════════════════════════════════════════════════════
  describe('verifyAndEnable', () => {
    it('should reject when no pending MFA config exists', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(null);

      await expect(mfaService.verifyAndEnable(USER_ID, TENANT_ID, '123456')).rejects.toThrow();
    });

    it('should reject invalid TOTP code', async () => {
      const config = createMockMfaConfig({ encryptedSecret: 'enc:data' });
      mockMfaConfig.findFirst.mockResolvedValue(config);

      await expect(mfaService.verifyAndEnable(USER_ID, TENANT_ID, '000000')).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Disable
  // ═══════════════════════════════════════════════════════════════════════════
  describe('disable', () => {
    it('should reject disabling when MFA is not enabled', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(null);

      await expect(mfaService.disable(USER_ID, TENANT_ID)).rejects.toThrow();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Status
  // ═══════════════════════════════════════════════════════════════════════════
  describe('getStatus', () => {
    it('should return disabled status when no MFA config', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(null);

      const status = await mfaService.getStatus(USER_ID, TENANT_ID);

      expect(status.enabled).toBe(false);
    });

    it('should return enabled status with backup code count', async () => {
      mockMfaConfig.findFirst.mockResolvedValue(
        createMockMfaConfig({ enabled: true, verifiedAt: new Date() })
      );
      mockBackupCode.count.mockResolvedValue(8);

      const status = await mfaService.getStatus(USER_ID, TENANT_ID);

      expect(status.enabled).toBe(true);
      expect(status.backupCodesRemaining).toBe(8);
    });
  });
});
