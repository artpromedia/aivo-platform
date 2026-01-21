/**
 * License Vault Service
 *
 * Cryptographic license management system for secure issuance, storage,
 * and verification of licenses, activation codes, and PINs.
 *
 * Security Features:
 * - HMAC-SHA256 signed license keys
 * - AES-256-GCM encrypted storage
 * - Cryptographically secure redemption codes
 * - PIN generation with Luhn checksum
 * - Anti-replay protection
 * - Complete audit trail
 */

import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

import { prisma } from '../prisma.js';
import { Prisma } from '../generated/prisma-client/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type LicenseType = 'SEAT' | 'ENTERPRISE' | 'TRIAL' | 'PROMOTIONAL' | 'NFR';
export type LicenseStatus = 'ISSUED' | 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
export type CodeType = 'REDEMPTION' | 'ACTIVATION' | 'ACCESS' | 'PIN';
export type CodeStatus = 'VALID' | 'REDEEMED' | 'EXPIRED' | 'REVOKED';

export interface LicenseKeyPayload {
  licenseId: string;
  tenantId: string;
  type: LicenseType;
  seats: number;
  issuedAt: number;
  expiresAt: number;
  features: string[];
  metadata?: Record<string, unknown>;
}

export interface IssueLicenseParams {
  tenantId: string;
  type: LicenseType;
  seats: number;
  validDays: number;
  features?: string[];
  enterpriseDealId?: string;
  contractId?: string;
  issuedBy: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface GenerateCodesParams {
  licenseId: string;
  codeType: CodeType;
  quantity: number;
  validDays?: number;
  maxRedemptions?: number;
  prefix?: string;
  createdBy: string;
}

export interface VerifyLicenseResult {
  valid: boolean;
  licenseId?: string;
  tenantId?: string;
  type?: LicenseType;
  status?: LicenseStatus;
  seats?: number;
  expiresAt?: Date;
  features?: string[];
  error?: string;
}

export interface RedeemCodeResult {
  success: boolean;
  licenseId?: string;
  tenantId?: string;
  activatedSeats?: number;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const HMAC_ALGORITHM = 'sha256';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

// License key format: AIVO-XXXX-XXXX-XXXX-XXXX
const LICENSE_KEY_SEGMENT_LENGTH = 4;
const LICENSE_KEY_SEGMENTS = 4;

// Redemption code format: REDEEM-XXXXXXXX
const REDEMPTION_CODE_LENGTH = 8;

// PIN format: 6 digits with Luhn checksum
const PIN_LENGTH = 6;

// ══════════════════════════════════════════════════════════════════════════════
// LICENSE VAULT SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class LicenseVaultService {
  private readonly encryptionKey: Buffer;
  private readonly hmacSecret: Buffer;

  constructor() {
    // Load keys from environment (in production, use a key management service)
    const encKeyHex = process.env.LICENSE_VAULT_ENCRYPTION_KEY;
    const hmacKeyHex = process.env.LICENSE_VAULT_HMAC_KEY;

    if (!encKeyHex || !hmacKeyHex) {
      // Generate keys for development (log warning)
      console.warn(
        '[LicenseVault] Using auto-generated keys. Set LICENSE_VAULT_ENCRYPTION_KEY and LICENSE_VAULT_HMAC_KEY in production!'
      );
      this.encryptionKey = randomBytes(KEY_LENGTH);
      this.hmacSecret = randomBytes(KEY_LENGTH);
    } else {
      this.encryptionKey = Buffer.from(encKeyHex, 'hex');
      this.hmacSecret = Buffer.from(hmacKeyHex, 'hex');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CRYPTOGRAPHIC PRIMITIVES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Encrypt data using AES-256-GCM
   */
  private encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt data using AES-256-GCM
   */
  private decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate HMAC signature for license payload
   */
  private signPayload(payload: string): string {
    const hmac = createHmac(HMAC_ALGORITHM, this.hmacSecret);
    hmac.update(payload);
    return hmac.digest('hex');
  }

  /**
   * Verify HMAC signature (timing-safe comparison)
   */
  private verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = this.signPayload(payload);
    try {
      return timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch {
      return false;
    }
  }

  /**
   * Generate a cryptographically secure random string
   */
  private generateSecureRandom(length: number, charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'): string {
    const bytes = randomBytes(length);
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset[bytes[i] % charset.length];
    }
    return result;
  }

  /**
   * Generate a Luhn-valid PIN
   */
  private generateLuhnPin(): string {
    // Generate first 5 digits
    const digits = randomBytes(PIN_LENGTH - 1)
      .map((b) => b % 10)
      .join('');

    // Calculate Luhn checksum
    const checksum = this.calculateLuhnChecksum(digits);
    return digits + checksum;
  }

  /**
   * Calculate Luhn checksum digit
   */
  private calculateLuhnChecksum(digits: string): string {
    let sum = 0;
    let isEven = true;

    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = Number.parseInt(digits[i], 10);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return String((10 - (sum % 10)) % 10);
  }

  /**
   * Validate Luhn checksum
   */
  private validateLuhn(digits: string): boolean {
    const payload = digits.slice(0, -1);
    const checksum = digits.slice(-1);
    return this.calculateLuhnChecksum(payload) === checksum;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LICENSE KEY GENERATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Generate a formatted license key
   * Format: AIVO-XXXX-XXXX-XXXX-XXXX
   */
  private generateLicenseKeyFormat(): string {
    const segments: string[] = [];
    for (let i = 0; i < LICENSE_KEY_SEGMENTS; i++) {
      segments.push(this.generateSecureRandom(LICENSE_KEY_SEGMENT_LENGTH));
    }
    return `AIVO-${segments.join('-')}`;
  }

  /**
   * Generate a signed license key with embedded payload
   */
  private generateSignedLicenseKey(payload: LicenseKeyPayload): string {
    const payloadJson = JSON.stringify(payload);
    const signature = this.signPayload(payloadJson);
    const encryptedPayload = this.encrypt(payloadJson);

    // Combine: displayKey|encryptedPayload|signature
    const displayKey = this.generateLicenseKeyFormat();
    const fullKey = `${displayKey}|${encryptedPayload}|${signature}`;

    return fullKey;
  }

  /**
   * Parse and verify a signed license key
   */
  private parseSignedLicenseKey(fullKey: string): { valid: boolean; payload?: LicenseKeyPayload; displayKey?: string } {
    try {
      const [displayKey, encryptedPayload, signature] = fullKey.split('|');

      if (!displayKey || !encryptedPayload || !signature) {
        return { valid: false };
      }

      const payloadJson = this.decrypt(encryptedPayload);

      if (!this.verifySignature(payloadJson, signature)) {
        return { valid: false };
      }

      const payload = JSON.parse(payloadJson) as LicenseKeyPayload;
      return { valid: true, payload, displayKey };
    } catch {
      return { valid: false };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // LICENSE MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Issue a new license
   */
  async issueLicense(params: IssueLicenseParams): Promise<{
    license: {
      id: string;
      displayKey: string;
      fullKey: string;
      expiresAt: Date;
    };
  }> {
    const {
      tenantId,
      type,
      seats,
      validDays,
      features = [],
      enterpriseDealId,
      contractId,
      issuedBy,
      notes,
      metadata,
    } = params;

    const now = new Date();
    const expiresAt = new Date(now.getTime() + validDays * 24 * 60 * 60 * 1000);

    // Create license record first to get ID
    const license = await prisma.vaultLicense.create({
      data: {
        tenantId,
        type,
        seats,
        seatsUsed: 0,
        status: 'ISSUED',
        featuresJson: features,
        enterpriseDealId,
        contractId,
        issuedAt: now,
        expiresAt,
        issuedBy,
        notes,
        metadataJson: (metadata ?? {}) as Prisma.InputJsonValue,
        // Placeholder values for required fields that get updated after key generation
        licenseKeyHash: '',
        encryptedKeyData: '',
      },
    });

    // Generate signed key with license ID
    const payload: LicenseKeyPayload = {
      licenseId: license.id,
      tenantId,
      type,
      seats,
      issuedAt: now.getTime(),
      expiresAt: expiresAt.getTime(),
      features,
      metadata,
    };

    const fullKey = this.generateSignedLicenseKey(payload);
    const displayKey = fullKey.split('|')[0];

    // Update license with encrypted key (store only encrypted portion)
    await prisma.vaultLicense.update({
      where: { id: license.id },
      data: {
        licenseKeyHash: this.signPayload(displayKey),
        encryptedKeyData: fullKey.split('|').slice(1).join('|'),
      },
    });

    // Audit log
    await this.createAuditLog({
      licenseId: license.id,
      action: 'LICENSE_ISSUED',
      performedBy: issuedBy,
      details: {
        type,
        seats,
        validDays,
        features,
        enterpriseDealId,
        contractId,
      },
    });

    return {
      license: {
        id: license.id,
        displayKey,
        fullKey,
        expiresAt,
      },
    };
  }

  /**
   * Verify a license key
   */
  async verifyLicense(licenseKey: string): Promise<VerifyLicenseResult> {
    try {
      // Check if this is just a display key or full key
      let fullKey = licenseKey;

      if (!licenseKey.includes('|')) {
        // It's just the display key, look up the full key
        const keyHash = this.signPayload(licenseKey);
        const license = await prisma.vaultLicense.findFirst({
          where: { licenseKeyHash: keyHash },
        });

        if (!license?.encryptedKeyData) {
          return { valid: false, error: 'License not found' };
        }

        fullKey = `${licenseKey}|${license.encryptedKeyData}`;
      }

      const parsed = this.parseSignedLicenseKey(fullKey);

      if (!parsed.valid || !parsed.payload) {
        return { valid: false, error: 'Invalid license key signature' };
      }

      const { payload } = parsed;

      // Check expiration
      if (payload.expiresAt < Date.now()) {
        return {
          valid: false,
          licenseId: payload.licenseId,
          error: 'License expired',
        };
      }

      // Get license from database for status check
      const license = await prisma.vaultLicense.findUnique({
        where: { id: payload.licenseId },
      });

      if (!license) {
        return { valid: false, error: 'License not found in vault' };
      }

      if (license.status === 'REVOKED') {
        return {
          valid: false,
          licenseId: license.id,
          status: 'REVOKED',
          error: 'License has been revoked',
        };
      }

      if (license.status === 'SUSPENDED') {
        return {
          valid: false,
          licenseId: license.id,
          status: 'SUSPENDED',
          error: 'License is suspended',
        };
      }

      return {
        valid: true,
        licenseId: license.id,
        tenantId: license.tenantId,
        type: license.type as LicenseType,
        status: license.status as LicenseStatus,
        seats: license.seats,
        expiresAt: license.expiresAt ?? undefined,
        features: (license.featuresJson as string[]) ?? [],
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  /**
   * Activate a license for a tenant
   */
  async activateLicense(licenseId: string, activatedBy: string): Promise<void> {
    const license = await prisma.vaultLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new Error('License not found');
    }

    if (license.status !== 'ISSUED') {
      throw new Error(`Cannot activate license with status: ${license.status}`);
    }

    await prisma.vaultLicense.update({
      where: { id: licenseId },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
      },
    });

    await this.createAuditLog({
      licenseId,
      action: 'LICENSE_ACTIVATED',
      performedBy: activatedBy,
      details: { tenantId: license.tenantId },
    });
  }

  /**
   * Suspend a license
   */
  async suspendLicense(licenseId: string, reason: string, suspendedBy: string): Promise<void> {
    await prisma.vaultLicense.update({
      where: { id: licenseId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendReason: reason,
      },
    });

    await this.createAuditLog({
      licenseId,
      action: 'LICENSE_SUSPENDED',
      performedBy: suspendedBy,
      details: { reason },
    });
  }

  /**
   * Revoke a license permanently
   */
  async revokeLicense(licenseId: string, reason: string, revokedBy: string): Promise<void> {
    await prisma.vaultLicense.update({
      where: { id: licenseId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    await this.createAuditLog({
      licenseId,
      action: 'LICENSE_REVOKED',
      performedBy: revokedBy,
      details: { reason },
    });
  }

  /**
   * Reinstate a suspended license
   */
  async reinstateLicense(licenseId: string, reinstatedBy: string): Promise<void> {
    const license = await prisma.vaultLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new Error('License not found');
    }

    if (license.status !== 'SUSPENDED') {
      throw new Error('Only suspended licenses can be reinstated');
    }

    await prisma.vaultLicense.update({
      where: { id: licenseId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendReason: null,
      },
    });

    await this.createAuditLog({
      licenseId,
      action: 'LICENSE_REINSTATED',
      performedBy: reinstatedBy,
      details: {},
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REDEMPTION CODES & PINS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Generate redemption codes for a license
   */
  async generateCodes(params: GenerateCodesParams): Promise<{
    codes: { code: string; id: string }[];
  }> {
    const { licenseId, codeType, quantity, validDays = 30, maxRedemptions = 1, prefix, createdBy } = params;

    const license = await prisma.vaultLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new Error('License not found');
    }

    const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);
    const codes: { code: string; id: string }[] = [];

    for (let i = 0; i < quantity; i++) {
      let code: string;

      switch (codeType) {
        case 'PIN':
          code = this.generateLuhnPin();
          break;
        case 'REDEMPTION':
          code = prefix
            ? `${prefix}-${this.generateSecureRandom(REDEMPTION_CODE_LENGTH)}`
            : `REDEEM-${this.generateSecureRandom(REDEMPTION_CODE_LENGTH)}`;
          break;
        case 'ACTIVATION':
          code = `ACT-${this.generateSecureRandom(12)}`;
          break;
        case 'ACCESS':
          code = `ACC-${this.generateSecureRandom(16)}`;
          break;
        default:
          code = this.generateSecureRandom(REDEMPTION_CODE_LENGTH);
      }

      // Hash the code for storage (we don't store plaintext)
      const codeHash = this.signPayload(code);

      const vaultCode = await prisma.vaultCode.create({
        data: {
          licenseId,
          codeType,
          codeHash,
          // Store encrypted code for recovery if needed
          encryptedCode: this.encrypt(code),
          status: 'VALID',
          maxRedemptions,
          redemptionCount: 0,
          expiresAt,
          createdBy,
        },
      });

      codes.push({ code, id: vaultCode.id });
    }

    await this.createAuditLog({
      licenseId,
      action: 'CODES_GENERATED',
      performedBy: createdBy,
      details: {
        codeType,
        quantity,
        validDays,
        maxRedemptions,
      },
    });

    return { codes };
  }

  /**
   * Verify a code without redeeming it
   */
  async verifyCode(code: string): Promise<{
    valid: boolean;
    codeType?: CodeType;
    licenseId?: string;
    remainingRedemptions?: number;
    expiresAt?: Date;
    error?: string;
  }> {
    // For PINs, validate Luhn first
    if (/^\d{6}$/.test(code)) {
      if (!this.validateLuhn(code)) {
        return { valid: false, error: 'Invalid PIN checksum' };
      }
    }

    const codeHash = this.signPayload(code);

    const vaultCode = await prisma.vaultCode.findFirst({
      where: { codeHash },
    });

    if (!vaultCode) {
      return { valid: false, error: 'Code not found' };
    }

    if (vaultCode.status === 'REVOKED') {
      return { valid: false, error: 'Code has been revoked' };
    }

    if (vaultCode.status === 'EXPIRED' || vaultCode.expiresAt < new Date()) {
      return { valid: false, error: 'Code has expired' };
    }

    if (vaultCode.redemptionCount >= vaultCode.maxRedemptions) {
      return { valid: false, error: 'Code has reached maximum redemptions' };
    }

    return {
      valid: true,
      codeType: vaultCode.codeType as CodeType,
      licenseId: vaultCode.licenseId,
      remainingRedemptions: vaultCode.maxRedemptions - vaultCode.redemptionCount,
      expiresAt: vaultCode.expiresAt,
    };
  }

  /**
   * Redeem a code to activate license seats
   */
  async redeemCode(
    code: string,
    redeemedBy: string,
    targetTenantId?: string
  ): Promise<RedeemCodeResult> {
    const verification = await this.verifyCode(code);

    if (!verification.valid) {
      return { success: false, error: verification.error };
    }

    const codeHash = this.signPayload(code);

    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
      const vaultCode = await tx.vaultCode.findFirst({
        where: { codeHash },
      });

      if (!vaultCode) {
        return { success: false, error: 'Code not found' };
      }

      // Double-check redemption count within transaction
      if (vaultCode.redemptionCount >= vaultCode.maxRedemptions) {
        return { success: false, error: 'Code already fully redeemed' };
      }

      // Get the license
      const license = await tx.vaultLicense.findUnique({
        where: { id: vaultCode.licenseId },
      });

      if (!license) {
        return { success: false, error: 'License not found' };
      }

      if (license.status === 'REVOKED' || license.status === 'EXPIRED') {
        return { success: false, error: `License is ${license.status.toLowerCase()}` };
      }

      // Check seat availability
      if (license.seatsUsed >= license.seats) {
        return { success: false, error: 'No seats available on this license' };
      }

      // Update code redemption count
      const newRedemptionCount = vaultCode.redemptionCount + 1;
      await tx.vaultCode.update({
        where: { id: vaultCode.id },
        data: {
          redemptionCount: newRedemptionCount,
          status: newRedemptionCount >= vaultCode.maxRedemptions ? 'REDEEMED' : 'VALID',
          lastRedeemedAt: new Date(),
          lastRedeemedBy: redeemedBy,
        },
      });

      // Update license seats used
      await tx.vaultLicense.update({
        where: { id: license.id },
        data: {
          seatsUsed: license.seatsUsed + 1,
          status: license.status === 'ISSUED' ? 'ACTIVE' : license.status,
          activatedAt: license.activatedAt ?? new Date(),
        },
      });

      // Create redemption record
      await tx.vaultCodeRedemption.create({
        data: {
          codeId: vaultCode.id,
          licenseId: license.id,
          redeemedBy,
          targetTenantId: targetTenantId ?? license.tenantId,
          redeemedAt: new Date(),
        },
      });

      return {
        success: true,
        licenseId: license.id,
        tenantId: targetTenantId ?? license.tenantId,
        activatedSeats: 1,
      };
    });
  }

  /**
   * Revoke a code
   */
  async revokeCode(codeId: string, reason: string, revokedBy: string): Promise<void> {
    const vaultCode = await prisma.vaultCode.findUnique({
      where: { id: codeId },
    });

    if (!vaultCode) {
      throw new Error('Code not found');
    }

    await prisma.vaultCode.update({
      where: { id: codeId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
    });

    await this.createAuditLog({
      licenseId: vaultCode.licenseId,
      codeId,
      action: 'CODE_REVOKED',
      performedBy: revokedBy,
      details: { reason },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BULK OPERATIONS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Generate bulk license keys for enterprise deal
   */
  async generateBulkLicenses(params: {
    enterpriseDealId: string;
    tenantId: string;
    type: LicenseType;
    seatsPerLicense: number;
    quantity: number;
    validDays: number;
    features?: string[];
    issuedBy: string;
  }): Promise<{ licenses: { id: string; displayKey: string }[] }> {
    const {
      enterpriseDealId,
      tenantId,
      type,
      seatsPerLicense,
      quantity,
      validDays,
      features = [],
      issuedBy,
    } = params;

    const licenses: { id: string; displayKey: string }[] = [];

    for (let i = 0; i < quantity; i++) {
      const result = await this.issueLicense({
        tenantId,
        type,
        seats: seatsPerLicense,
        validDays,
        features,
        enterpriseDealId,
        issuedBy,
        notes: `Bulk license ${i + 1} of ${quantity}`,
      });

      licenses.push({
        id: result.license.id,
        displayKey: result.license.displayKey,
      });
    }

    return { licenses };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AUDIT LOGGING
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Create an audit log entry
   */
  private async createAuditLog(params: {
    licenseId?: string;
    codeId?: string;
    action: string;
    performedBy: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    await prisma.vaultAuditLog.create({
      data: {
        licenseId: params.licenseId,
        codeId: params.codeId,
        action: params.action,
        performedBy: params.performedBy,
        detailsJson: params.details as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        timestamp: new Date(),
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTING & QUERIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get license by ID with full details
   */
  async getLicense(licenseId: string): Promise<{
    id: string;
    tenantId: string;
    type: LicenseType;
    status: LicenseStatus;
    seats: number;
    seatsUsed: number;
    features: string[];
    issuedAt: Date;
    expiresAt: Date;
    activatedAt: Date | null;
    codes: {
      id: string;
      codeType: string;
      status: string;
      redemptionCount: number;
      maxRedemptions: number;
    }[];
  } | null> {
    const license = await prisma.vaultLicense.findUnique({
      where: { id: licenseId },
      include: {
        codes: {
          select: {
            id: true,
            codeType: true,
            status: true,
            redemptionCount: true,
            maxRedemptions: true,
          },
        },
      },
    });

    if (!license) {
      return null;
    }

    return {
      id: license.id,
      tenantId: license.tenantId,
      type: license.type as LicenseType,
      status: license.status as LicenseStatus,
      seats: license.seats,
      seatsUsed: license.seatsUsed,
      features: (license.featuresJson as string[]) ?? [],
      issuedAt: license.issuedAt,
      expiresAt: license.expiresAt,
      activatedAt: license.activatedAt,
      codes: license.codes,
    };
  }

  /**
   * List licenses for a tenant
   */
  async listLicenses(tenantId: string, options?: {
    status?: LicenseStatus;
    type?: LicenseType;
    limit?: number;
    offset?: number;
  }): Promise<{
    licenses: {
      id: string;
      type: LicenseType;
      status: LicenseStatus;
      seats: number;
      seatsUsed: number;
      expiresAt: Date;
    }[];
    total: number;
  }> {
    const where = {
      tenantId,
      ...(options?.status && { status: options.status }),
      ...(options?.type && { type: options.type }),
    };

    const [licenses, total] = await Promise.all([
      prisma.vaultLicense.findMany({
        where,
        select: {
          id: true,
          type: true,
          status: true,
          seats: true,
          seatsUsed: true,
          expiresAt: true,
        },
        orderBy: { issuedAt: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.vaultLicense.count({ where }),
    ]);

    return {
      licenses: licenses.map((l) => ({
        id: l.id,
        type: l.type as LicenseType,
        status: l.status as LicenseStatus,
        seats: l.seats,
        seatsUsed: l.seatsUsed,
        expiresAt: l.expiresAt,
      })),
      total,
    };
  }

  /**
   * Get audit log for a license
   */
  async getAuditLog(licenseId: string, options?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    entries: {
      id: string;
      action: string;
      performedBy: string;
      details: Record<string, unknown>;
      timestamp: Date;
    }[];
    total: number;
  }> {
    const [entries, total] = await Promise.all([
      prisma.vaultAuditLog.findMany({
        where: { licenseId },
        orderBy: { timestamp: 'desc' },
        take: options?.limit ?? 50,
        skip: options?.offset ?? 0,
      }),
      prisma.vaultAuditLog.count({ where: { licenseId } }),
    ]);

    return {
      entries: entries.map((e) => ({
        id: e.id,
        action: e.action,
        performedBy: e.performedBy,
        details: e.detailsJson as Record<string, unknown>,
        timestamp: e.timestamp,
      })),
      total,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

let vaultServiceInstance: LicenseVaultService | null = null;

export function getLicenseVaultService(): LicenseVaultService {
  if (!vaultServiceInstance) {
    vaultServiceInstance = new LicenseVaultService();
  }
  return vaultServiceInstance;
}
