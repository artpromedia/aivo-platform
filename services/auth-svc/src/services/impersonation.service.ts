/**
 * Impersonation Service
 *
 * Allows PLATFORM_ADMIN and SUPPORT_AGENT roles to impersonate non-admin
 * users for debugging purposes. Issues short-lived JWTs with impersonation
 * claims and maintains a full audit trail.
 *
 * Security rules:
 * - Only PLATFORM_ADMIN and SUPPORT (SUPPORT_AGENT) can impersonate
 * - Cannot impersonate other PLATFORM_ADMIN users
 * - Maximum session duration: 60 minutes
 * - Written reason is required
 * - Read-only mode blocks POST/PUT/PATCH/DELETE
 * - Every action during impersonation is logged with impersonatedBy field
 * - Sessions can be revoked at any time
 */

import { randomUUID } from 'node:crypto';

import type { Role } from '@aivo/ts-rbac';

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import { signImpersonationToken } from '../lib/jwt.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ImpersonationRequest {
  /** Platform admin performing impersonation */
  adminUserId: string;
  /** User being impersonated */
  targetUserId: string;
  /** Tenant scope */
  targetTenantId: string;
  /** Required justification */
  reason: string;
  /** Max 60 minutes */
  durationMinutes: number;
  /** Whether write operations are blocked */
  readOnly: boolean;
  /** Optional metadata */
  adminIpAddress?: string;
  adminUserAgent?: string;
}

export interface ImpersonationSession {
  id: string;
  adminUserId: string;
  targetUserId: string;
  targetTenantId: string;
  reason: string;
  readOnly: boolean;
  token: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
}

export interface ImpersonationSessionInfo {
  id: string;
  adminUserId: string;
  adminEmail?: string;
  targetUserId: string;
  targetEmail?: string;
  targetTenantId: string;
  reason: string;
  readOnly: boolean;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

// Roles allowed to impersonate
const IMPERSONATION_ALLOWED_ROLES = new Set(['PLATFORM_ADMIN', 'SUPPORT']);

// Roles that cannot be impersonated
const NON_IMPERSONATABLE_ROLES = new Set(['PLATFORM_ADMIN']);

// Maximum session duration in minutes
const MAX_DURATION_MINUTES = 60;

// Minimum reason length
const MIN_REASON_LENGTH = 10;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class ImpersonationService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Start an impersonation session and return a signed JWT.
   */
  async startSession(request: ImpersonationRequest): Promise<ImpersonationSession> {
    // --- Validate duration ---
    if (
      !Number.isFinite(request.durationMinutes) ||
      request.durationMinutes < 1 ||
      request.durationMinutes > MAX_DURATION_MINUTES
    ) {
      throw new ImpersonationError(
        `Duration must be between 1 and ${MAX_DURATION_MINUTES} minutes`,
        'INVALID_DURATION',
      );
    }

    // --- Validate reason ---
    if (!request.reason || request.reason.trim().length < MIN_REASON_LENGTH) {
      throw new ImpersonationError(
        `Reason must be at least ${MIN_REASON_LENGTH} characters`,
        'INVALID_REASON',
      );
    }

    // --- Verify admin exists and has permission ---
    const adminUser = await this.prisma.user.findUnique({
      where: { id: request.adminUserId },
      include: { roles: true },
    });

    if (!adminUser) {
      throw new ImpersonationError('Admin user not found', 'ADMIN_NOT_FOUND');
    }

    const adminRoles = adminUser.roles.map((r) => r.role);
    const hasPermission = adminRoles.some((role) => IMPERSONATION_ALLOWED_ROLES.has(role));

    if (!hasPermission) {
      throw new ImpersonationError(
        'Insufficient permissions to impersonate users',
        'INSUFFICIENT_PERMISSIONS',
      );
    }

    // --- Verify target user exists ---
    const targetUser = await this.prisma.user.findUnique({
      where: { id: request.targetUserId },
      include: { roles: true },
    });

    if (!targetUser) {
      throw new ImpersonationError('Target user not found', 'TARGET_NOT_FOUND');
    }

    // --- Cannot impersonate platform admins ---
    const targetRoles = targetUser.roles.map((r) => r.role);
    const isTargetAdmin = targetRoles.some((role) => NON_IMPERSONATABLE_ROLES.has(role));

    if (isTargetAdmin) {
      throw new ImpersonationError(
        'Cannot impersonate platform administrators',
        'TARGET_IS_ADMIN',
      );
    }

    // --- Verify target belongs to specified tenant ---
    if (targetUser.tenantId !== request.targetTenantId) {
      throw new ImpersonationError(
        'Target user does not belong to the specified tenant',
        'TENANT_MISMATCH',
      );
    }

    // --- Create session record ---
    const expiresAt = new Date(Date.now() + request.durationMinutes * 60 * 1000);
    const sessionId = randomUUID();

    const session = await this.prisma.impersonationSession.create({
      data: {
        id: sessionId,
        adminUserId: request.adminUserId,
        targetUserId: request.targetUserId,
        targetTenantId: request.targetTenantId,
        reason: request.reason.trim(),
        readOnly: request.readOnly,
        expiresAt,
        adminIpAddress: request.adminIpAddress,
        adminUserAgent: request.adminUserAgent,
      },
    });

    // --- Issue impersonation JWT ---
    const token = await signImpersonationToken({
      sub: targetUser.id,
      tenant_id: targetUser.tenantId,
      roles: targetRoles as Role[],
      name: [targetUser.firstName, targetUser.lastName].filter(Boolean).join(' ') || undefined,
      email: targetUser.email,
      impersonation: {
        sessionId: session.id,
        adminUserId: request.adminUserId,
        readOnly: request.readOnly,
        expiresAt: expiresAt.toISOString(),
      },
    }, request.durationMinutes);

    return {
      id: session.id,
      adminUserId: session.adminUserId,
      targetUserId: session.targetUserId,
      targetTenantId: session.targetTenantId,
      reason: session.reason,
      readOnly: session.readOnly,
      token,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Revoke an active impersonation session.
   */
  async revokeSession(sessionId: string, adminUserId: string, reason?: string): Promise<void> {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new ImpersonationError('Session not found', 'SESSION_NOT_FOUND');
    }

    if (session.revokedAt) {
      throw new ImpersonationError('Session already revoked', 'ALREADY_REVOKED');
    }

    await this.prisma.impersonationSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokeReason: reason ?? 'manually_revoked',
      },
    });
  }

  /**
   * Get a session by ID (for middleware validation).
   */
  async getSession(sessionId: string): Promise<ImpersonationSessionInfo | null> {
    const session = await this.prisma.impersonationSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    // Fetch admin and target user info for display
    const [adminUser, targetUser] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: session.adminUserId },
        select: { email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: session.targetUserId },
        select: { email: true },
      }),
    ]);

    return {
      id: session.id,
      adminUserId: session.adminUserId,
      adminEmail: adminUser?.email ?? undefined,
      targetUserId: session.targetUserId,
      targetEmail: targetUser?.email ?? undefined,
      targetTenantId: session.targetTenantId,
      reason: session.reason,
      readOnly: session.readOnly,
      expiresAt: session.expiresAt,
      revokedAt: session.revokedAt,
      createdAt: session.createdAt,
    };
  }

  /**
   * Validate that a session is still active (not expired, not revoked).
   */
  async validateSession(sessionId: string): Promise<{ valid: boolean; session?: ImpersonationSessionInfo }> {
    const session = await this.getSession(sessionId);

    if (!session) {
      return { valid: false };
    }

    if (session.revokedAt) {
      return { valid: false, session };
    }

    if (new Date() > session.expiresAt) {
      return { valid: false, session };
    }

    return { valid: true, session };
  }

  /**
   * List active impersonation sessions (for admin dashboard).
   */
  async listActiveSessions(): Promise<ImpersonationSessionInfo[]> {
    const sessions = await this.prisma.impersonationSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Batch-fetch user emails
    const userIds = new Set<string>();
    for (const s of sessions) {
      userIds.add(s.adminUserId);
      userIds.add(s.targetUserId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, email: true },
    });

    const emailMap = new Map(users.map((u) => [u.id, u.email]));

    return sessions.map((s) => ({
      id: s.id,
      adminUserId: s.adminUserId,
      adminEmail: emailMap.get(s.adminUserId),
      targetUserId: s.targetUserId,
      targetEmail: emailMap.get(s.targetUserId),
      targetTenantId: s.targetTenantId,
      reason: s.reason,
      readOnly: s.readOnly,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      createdAt: s.createdAt,
    }));
  }

  /**
   * List impersonation history with pagination and filters.
   */
  async listSessionHistory(options: {
    page?: number;
    pageSize?: number;
    adminUserId?: string;
    targetUserId?: string;
    targetTenantId?: string;
  }): Promise<{ sessions: ImpersonationSessionInfo[]; total: number }> {
    const { page = 1, pageSize = 20, adminUserId, targetUserId, targetTenantId } = options;

    const where: Record<string, unknown> = {};
    if (adminUserId) where.adminUserId = adminUserId;
    if (targetUserId) where.targetUserId = targetUserId;
    if (targetTenantId) where.targetTenantId = targetTenantId;

    const [sessions, total] = await Promise.all([
      this.prisma.impersonationSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.impersonationSession.count({ where }),
    ]);

    // Batch-fetch user emails
    const userIds = new Set<string>();
    for (const s of sessions) {
      userIds.add(s.adminUserId);
      userIds.add(s.targetUserId);
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, email: true },
    });

    const emailMap = new Map(users.map((u) => [u.id, u.email]));

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        adminUserId: s.adminUserId,
        adminEmail: emailMap.get(s.adminUserId),
        targetUserId: s.targetUserId,
        targetEmail: emailMap.get(s.targetUserId),
        targetTenantId: s.targetTenantId,
        reason: s.reason,
        readOnly: s.readOnly,
        expiresAt: s.expiresAt,
        revokedAt: s.revokedAt,
        createdAt: s.createdAt,
      })),
      total,
    };
  }

  /**
   * Get impersonation history for a specific user (for privacy settings).
   * Shows only sessions where the user was the impersonation target.
   */
  async getUserImpersonationHistory(
    targetUserId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{ sessions: ImpersonationSessionInfo[]; total: number }> {
    return this.listSessionHistory({ targetUserId, page, pageSize });
  }

  /**
   * Search for a user by email, name, or ID (for support UI).
   */
  async searchUsers(query: string, limit = 20): Promise<Array<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    tenantId: string;
    status: string;
    roles: string[];
    lastLoginAt: Date | null;
  }>> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

    const users = await this.prisma.user.findMany({
      where: isUuid
        ? { id: query }
        : {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { firstName: { contains: query, mode: 'insensitive' } },
              { lastName: { contains: query, mode: 'insensitive' } },
            ],
          },
      include: { roles: true },
      take: limit,
      orderBy: { email: 'asc' },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      tenantId: u.tenantId,
      status: u.status,
      roles: u.roles.map((r) => r.role),
      lastLoginAt: u.lastLoginAt,
    }));
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ERROR
// ══════════════════════════════════════════════════════════════════════════════

export class ImpersonationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ImpersonationError';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ══════════════════════════════════════════════════════════════════════════════

export function createImpersonationService(prisma: PrismaClient): ImpersonationService {
  return new ImpersonationService(prisma);
}
