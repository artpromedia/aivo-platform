/**
 * Assessment Security Service
 * 
 * Handles security measures during assessment taking:
 * - Lockdown browser detection
 * - Tab/window switching detection
 * - Copy/paste prevention
 * - Security token validation
 * - Violation tracking
 * - Proctoring integration hooks
 */

import crypto from 'crypto';
import { prisma } from '../prisma.js';
import type { PrismaTransactionClient } from '../prisma.js';
import { publishEvent } from '../events/publisher.js';
import type { SecurityViolationType, AccommodationType } from '../types/assessment.types.js';

// ============================================================================
// TYPES
// ============================================================================

export interface SecuritySettings {
  requireLockdownBrowser: boolean;
  preventCopyPaste: boolean;
  detectTabSwitch: boolean;
  maxViolations: number;
  autoSubmitOnMaxViolations: boolean;
  allowedViolationTypes?: SecurityViolationType[];
  proctoringEnabled: boolean;
  proctoringProvider?: 'respondus' | 'proctorio' | 'examity' | 'honorlock';
  webcamRequired: boolean;
  screenRecordingRequired: boolean;
  idVerificationRequired: boolean;
}

export interface SecurityToken {
  token: string;
  attemptId: string;
  expiresAt: Date;
  fingerprint: string;
}

export interface ViolationReport {
  type: SecurityViolationType;
  timestamp: Date;
  details?: Record<string, any>;
  clientInfo?: {
    userAgent?: string;
    screenSize?: string;
    windowSize?: string;
    focusLost?: boolean;
  };
}

export interface SessionInfo {
  sessionId: string;
  attemptId: string;
  startTime: Date;
  endTime?: Date;
  ipAddress: string;
  userAgent: string;
  active: boolean;
}

export interface Accommodation {
  type: AccommodationType;
  value: number | string | boolean;
  reason?: string;
  approvedBy: string;
  expiresAt?: Date;
}

// ============================================================================
// SERVICE
// ============================================================================

export class SecurityService {
  private readonly TOKEN_EXPIRY_MINUTES = 5;
  private readonly TOKEN_SECRET = process.env.SECURITY_TOKEN_SECRET ?? 'default-secret-change-me';

  /**
   * Generate a security token for an attempt
   */
  generateSecurityToken(
    attemptId: string,
    fingerprint: string
  ): SecurityToken {
    const expiresAt = new Date(Date.now() + this.TOKEN_EXPIRY_MINUTES * 60 * 1000);
    
    const payload = {
      attemptId,
      fingerprint,
      exp: expiresAt.getTime(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const token = this.signPayload(payload);

    return {
      token,
      attemptId,
      expiresAt,
      fingerprint,
    };
  }

  /**
   * Validate a security token
   */
  async validateSecurityToken(
    token: string,
    attemptId: string,
    fingerprint: string
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const payload = this.verifyToken(token);

      if (payload.attemptId !== attemptId) {
        return { valid: false, reason: 'Token does not match attempt' };
      }

      if (payload.fingerprint !== fingerprint) {
        return { valid: false, reason: 'Fingerprint mismatch' };
      }

      if (payload.exp < Date.now()) {
        return { valid: false, reason: 'Token expired' };
      }

      // Verify attempt is still in progress
      const attempt = await prisma.attempt.findUnique({
        where: { id: attemptId },
        select: { status: true, securityToken: true },
      });

      if (!attempt) {
        return { valid: false, reason: 'Attempt not found' };
      }

      if (attempt.status !== 'IN_PROGRESS') {
        return { valid: false, reason: 'Attempt is not in progress' };
      }

      return { valid: true };
    } catch {
      return { valid: false, reason: 'Invalid token' };
    }
  }

  /**
   * Store security token for an attempt
   */
  async storeSecurityToken(
    attemptId: string,
    token: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;
    
    await client.attempt.update({
      where: { id: attemptId },
      data: { securityToken: token },
    });
  }

  /**
   * Record a security violation
   */
  async recordViolation(
    attemptId: string,
    violation: ViolationReport,
    tx?: PrismaTransactionClient
  ): Promise<{ blocked: boolean; reason?: string }> {
    const client = tx ?? prisma;

    // Get attempt and settings
    const attempt = await client.attempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: { configSettings: true },
        },
      },
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const settings = attempt.assessment.configSettings as unknown as SecuritySettings | null;
    const maxViolations = settings?.maxViolations ?? 5;
    const autoSubmit = settings?.autoSubmitOnMaxViolations ?? false;

    // Record the violation
    await client.attemptSecurityViolation.create({
      data: {
        attemptId,
        type: violation.type,
        details: violation.details ?? {},
        detectedAt: violation.timestamp,
        clientInfo: violation.clientInfo ?? {},
      },
    });

    // Increment violation count
    const updated = await client.attempt.update({
      where: { id: attemptId },
      data: {
        violationCount: { increment: 1 },
      },
      select: { violationCount: true },
    });

    await publishEvent('security.violation', {
      attemptId,
      violationType: violation.type,
      violationCount: updated.violationCount,
      timestamp: violation.timestamp,
    });

    // Check if max violations exceeded
    if (updated.violationCount >= maxViolations) {
      if (autoSubmit) {
        // Auto-submit the attempt
        await client.attempt.update({
          where: { id: attemptId },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
            autoSubmitted: true,
          },
        });

        await publishEvent('attempt.auto-submitted', {
          attemptId,
          reason: 'max_violations_exceeded',
          violationCount: updated.violationCount,
        });

        return {
          blocked: true,
          reason: 'Maximum security violations exceeded. Attempt auto-submitted.',
        };
      } else {
        return {
          blocked: true,
          reason: 'Maximum security violations exceeded. Please contact your instructor.',
        };
      }
    }

    return { blocked: false };
  }

  /**
   * Get violation history for an attempt
   */
  async getViolationHistory(
    attemptId: string
  ): Promise<Array<ViolationReport & { id: string }>> {
    const violations = await prisma.attemptSecurityViolation.findMany({
      where: { attemptId },
      orderBy: { detectedAt: 'asc' },
    });

    return violations.map(v => ({
      id: v.id,
      type: v.type as SecurityViolationType,
      timestamp: v.detectedAt,
      details: v.details as Record<string, any>,
      clientInfo: v.clientInfo as ViolationReport['clientInfo'],
    }));
  }

  /**
   * Start a new session for an attempt
   */
  async startSession(
    attemptId: string,
    ipAddress: string,
    userAgent: string,
    tx?: PrismaTransactionClient
  ): Promise<SessionInfo> {
    const client = tx ?? prisma;

    // End any existing active sessions
    await client.attemptSession.updateMany({
      where: {
        attemptId,
        active: true,
      },
      data: {
        active: false,
        endTime: new Date(),
      },
    });

    // Create new session
    const session = await client.attemptSession.create({
      data: {
        attemptId,
        ipAddress,
        userAgent,
        startTime: new Date(),
        active: true,
      },
    });

    await publishEvent('session.started', {
      sessionId: session.id,
      attemptId,
      ipAddress,
    });

    return {
      sessionId: session.id,
      attemptId,
      startTime: session.startTime,
      ipAddress,
      userAgent,
      active: true,
    };
  }

  /**
   * End a session
   */
  async endSession(
    sessionId: string,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await client.attemptSession.update({
      where: { id: sessionId },
      data: {
        active: false,
        endTime: new Date(),
      },
    });
  }

  /**
   * Get active sessions for an attempt
   */
  async getActiveSessions(attemptId: string): Promise<SessionInfo[]> {
    const sessions = await prisma.attemptSession.findMany({
      where: {
        attemptId,
        active: true,
      },
      orderBy: { startTime: 'desc' },
    });

    return sessions.map(s => ({
      sessionId: s.id,
      attemptId: s.attemptId,
      startTime: s.startTime,
      endTime: s.endTime ?? undefined,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      active: s.active,
    }));
  }

  /**
   * Add accommodation for a student
   */
  async addAccommodation(
    attemptId: string,
    accommodation: Accommodation,
    tx?: PrismaTransactionClient
  ): Promise<void> {
    const client = tx ?? prisma;

    await client.attemptAccommodation.create({
      data: {
        attemptId,
        type: accommodation.type,
        value: this.serializeAccommodationValue(accommodation.value),
        reason: accommodation.reason,
        approvedBy: accommodation.approvedBy,
        expiresAt: accommodation.expiresAt,
      },
    });

    // If time extension, update attempt expiry
    if (accommodation.type === 'TIME_EXTENSION' && typeof accommodation.value === 'number') {
      const attempt = await client.attempt.findUnique({
        where: { id: attemptId },
        select: { expiresAt: true, timeLimit: true },
      });

      if (attempt?.expiresAt) {
        const newExpiry = new Date(
          attempt.expiresAt.getTime() + accommodation.value * 60 * 1000
        );
        await client.attempt.update({
          where: { id: attemptId },
          data: {
            expiresAt: newExpiry,
            timeLimit: (attempt.timeLimit ?? 0) + accommodation.value,
          },
        });
      }
    }

    await publishEvent('accommodation.added', {
      attemptId,
      type: accommodation.type,
      approvedBy: accommodation.approvedBy,
    });
  }

  /**
   * Get accommodations for an attempt
   */
  async getAccommodations(attemptId: string): Promise<Accommodation[]> {
    const accommodations = await prisma.attemptAccommodation.findMany({
      where: { attemptId },
    });

    return accommodations.map(a => ({
      type: a.type as AccommodationType,
      value: this.deserializeAccommodationValue(a.value),
      reason: a.reason ?? undefined,
      approvedBy: a.approvedBy,
      expiresAt: a.expiresAt ?? undefined,
    }));
  }

  /**
   * Check if lockdown browser is being used
   */
  detectLockdownBrowser(userAgent: string): {
    isLockdown: boolean;
    provider?: string;
  } {
    const ua = userAgent.toLowerCase();

    if (ua.includes('respondus lockdown browser')) {
      return { isLockdown: true, provider: 'respondus' };
    }
    if (ua.includes('proctorio')) {
      return { isLockdown: true, provider: 'proctorio' };
    }
    if (ua.includes('examity')) {
      return { isLockdown: true, provider: 'examity' };
    }
    if (ua.includes('honorlock')) {
      return { isLockdown: true, provider: 'honorlock' };
    }

    return { isLockdown: false };
  }

  /**
   * Generate client-side security script configuration
   */
  getClientSecurityConfig(settings: Partial<SecuritySettings>): {
    preventCopyPaste: boolean;
    detectTabSwitch: boolean;
    reportInterval: number;
    violationEndpoint: string;
    heartbeatEndpoint: string;
  } {
    return {
      preventCopyPaste: settings.preventCopyPaste ?? false,
      detectTabSwitch: settings.detectTabSwitch ?? false,
      reportInterval: 5000, // 5 seconds
      violationEndpoint: '/api/attempts/:attemptId/violations',
      heartbeatEndpoint: '/api/attempts/:attemptId/heartbeat',
    };
  }

  /**
   * Validate attempt can continue (time, violations, etc.)
   */
  async validateAttemptContinuation(
    attemptId: string
  ): Promise<{ canContinue: boolean; reason?: string }> {
    const attempt = await prisma.attempt.findUnique({
      where: { id: attemptId },
      include: {
        assessment: {
          include: { configSettings: true },
        },
      },
    });

    if (!attempt) {
      return { canContinue: false, reason: 'Attempt not found' };
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return { canContinue: false, reason: `Attempt status is ${attempt.status}` };
    }

    // Check time limit
    if (attempt.expiresAt && new Date() > attempt.expiresAt) {
      return { canContinue: false, reason: 'Time limit exceeded' };
    }

    // Check violations
    const settings = attempt.assessment.configSettings as unknown as SecuritySettings | null;
    const maxViolations = settings?.maxViolations ?? 5;

    if (attempt.violationCount >= maxViolations) {
      return { canContinue: false, reason: 'Maximum violations exceeded' };
    }

    return { canContinue: true };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private signPayload(payload: Record<string, any>): string {
    const data = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', this.TOKEN_SECRET)
      .update(data)
      .digest('hex');
    
    const encoded = Buffer.from(data).toString('base64');
    return `${encoded}.${signature}`;
  }

  private verifyToken(token: string): Record<string, any> {
    const [encoded, signature] = token.split('.');
    
    if (!encoded || !signature) {
      throw new Error('Invalid token format');
    }

    const data = Buffer.from(encoded, 'base64').toString();
    const expectedSignature = crypto
      .createHmac('sha256', this.TOKEN_SECRET)
      .update(data)
      .digest('hex');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    return JSON.parse(data);
  }

  private serializeAccommodationValue(value: number | string | boolean): string {
    return JSON.stringify(value);
  }

  private deserializeAccommodationValue(value: string): number | string | boolean {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}

export const securityService = new SecurityService();
