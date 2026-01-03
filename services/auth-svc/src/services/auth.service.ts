/**
 * Authentication Service
 * Handles user registration, login, token management, and session handling
 */

import { randomBytes, createHash } from 'node:crypto';

import bcrypt from 'bcryptjs';
import type { Redis } from 'ioredis';

import type { Role } from '@aivo/ts-rbac';

import type { PrismaClient, User, Session, UserRole } from '../generated/prisma-client/index.js';
import { signAccessToken, signRefreshToken, verifyToken } from '../lib/jwt.js';
import { config } from '../config.js';
import { notifyClient } from '../lib/notify-client.js';

// ============================================================================
// Types
// ============================================================================

export interface RegisterInput {
  email: string;
  password: string;
  phone?: string;
  tenantId: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  deviceInfo?: DeviceInfo;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantId?: string;
  deviceInfo?: DeviceInfo;
}

export interface DeviceInfo {
  userAgent: string;
  ip: string;
  deviceId?: string;
  platform?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user: SafeUser;
  tokens: TokenPair;
  session: SessionInfo;
}

export interface SafeUser {
  id: string;
  email: string;
  tenantId: string;
  phone?: string | null;
  status: string;
  emailVerified: boolean;
  roles: string[];
  createdAt: Date;
}

export interface SessionInfo {
  id: string;
  userId: string;
  tenantId: string;
  deviceName?: string | null;
  platform?: string | null;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
}

// ============================================================================
// Password Utilities
// ============================================================================

const BCRYPT_ROUNDS = 12;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /\d/,
  special: /[!@#$%^&*(),.?":{}|<>]/,
};

function validatePasswordStrength(password: string): void {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  }
  if (!PASSWORD_PATTERNS.uppercase.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!PASSWORD_PATTERNS.lowercase.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!PASSWORD_PATTERNS.number.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (!PASSWORD_PATTERNS.special.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('. '));
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ============================================================================
// Auth Service Class
// ============================================================================

export class AuthService {
  private readonly prisma: PrismaClient;
  private readonly redis: Redis | null;

  constructor(prisma: PrismaClient, redis?: Redis) {
    this.prisma = prisma;
    this.redis = redis ?? null;
  }

  // --------------------------------------------------------------------------
  // Registration
  // --------------------------------------------------------------------------

  async register(input: RegisterInput): Promise<AuthResult> {
    const { email, password, phone, tenantId, role = 'LEARNER' } = input;

    // Validate password
    validatePasswordStrength(password);

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: { email, tenantId },
    });

    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user with role
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        phone: phone || null,
        tenantId,
        status: 'ACTIVE',
        emailVerified: false,
        roles: {
          create: [{ role: role as any }],
        },
      },
      include: { roles: true },
    });

    // Create email verification token
    await this.createEmailVerificationToken(user.id, email);

    // Create session and tokens
    const session = await this.createSession(user.id, tenantId, input.deviceInfo);
    const roles = user.roles.map((r: UserRole) => r.role);
    const tokens = await this.generateTokens(user, roles, session.id);

    return {
      user: this.toSafeUser(user, roles),
      tokens,
      session: this.toSessionInfo(session),
    };
  }

  // --------------------------------------------------------------------------
  // Login
  // --------------------------------------------------------------------------

  async login(input: LoginInput): Promise<AuthResult> {
    const { email, password, tenantId, deviceInfo } = input;

    // Find user
    const whereClause = tenantId
      ? { email, tenantId }
      : { email, tenantId: config.consumerTenantId };

    const user = await this.prisma.user.findFirst({
      where: whereClause,
      include: { roles: true },
    });

    if (!user) {
      await this.trackFailedLogin(email, tenantId, deviceInfo);
      throw new Error('Invalid credentials');
    }

    // Check account status
    if (user.status === 'DISABLED') {
      throw new Error('Account has been disabled');
    }

    if (user.status === 'INVITED') {
      throw new Error('Please complete your account setup first');
    }

    // Check for account lockout
    const isLocked = await this.isAccountLocked(email, user.tenantId);
    if (isLocked) {
      throw new Error('Account temporarily locked due to too many failed attempts. Please try again later.');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await this.trackFailedLogin(email, user.tenantId, deviceInfo);
      throw new Error('Invalid credentials');
    }

    // Clear failed attempts on successful login
    await this.clearFailedLogins(email, user.tenantId);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Create session
    const session = await this.createSession(user.id, user.tenantId, deviceInfo);
    const roles = user.roles.map((r: UserRole) => r.role);
    const tokens = await this.generateTokens(user, roles, session.id);

    return {
      user: this.toSafeUser(user, roles),
      tokens,
      session: this.toSessionInfo(session),
    };
  }

  // --------------------------------------------------------------------------
  // Token Refresh
  // --------------------------------------------------------------------------

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify the refresh token
    let payload;
    try {
      payload = await verifyToken(refreshToken);
    } catch {
      throw new Error('Invalid refresh token');
    }

    // Find the session
    const session = await this.prisma.session.findUnique({
      where: { id: payload.jti },
      include: {
        user: {
          include: { roles: true },
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    if (session.revokedAt) {
      throw new Error('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new Error('Session has expired');
    }

    // Verify refresh token hash matches
    const tokenHash = hashToken(refreshToken);
    if (session.refreshTokenHash && session.refreshTokenHash !== tokenHash) {
      // Potential token reuse - revoke session for security
      await this.revokeSession(session.id, 'token_reuse_detected');
      throw new Error('Invalid refresh token');
    }

    // Generate new tokens
    const roles = session.user.roles.map((r: UserRole) => r.role);
    const tokens = await this.generateTokens(session.user, roles, session.id);

    // Update session with new refresh token hash
    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: hashToken(tokens.refreshToken),
        lastActivityAt: new Date(),
      },
    });

    return tokens;
  }

  // --------------------------------------------------------------------------
  // Logout
  // --------------------------------------------------------------------------

  async logout(sessionId: string): Promise<void> {
    await this.revokeSession(sessionId, 'logout');
  }

  async logoutAllSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const whereClause = exceptSessionId
      ? { userId, revokedAt: null, id: { not: exceptSessionId } }
      : { userId, revokedAt: null };

    const result = await this.prisma.session.updateMany({
      where: whereClause,
      data: {
        revokedAt: new Date(),
        revokeReason: 'logout_all',
      },
    });

    // Blacklist all sessions in Redis
    const sessions = await this.prisma.session.findMany({
      where: { userId },
      select: { id: true },
    });

    if (this.redis) {
      const pipeline = this.redis.pipeline();
      for (const session of sessions) {
        if (session.id !== exceptSessionId) {
          pipeline.set(`blacklist:token:${session.id}`, '1', 'EX', 86400);
        }
      }
      await pipeline.exec();
    }

    return result.count;
  }

  // --------------------------------------------------------------------------
  // Email Verification
  // --------------------------------------------------------------------------

  async createEmailVerificationToken(userId: string, email: string): Promise<string> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        email,
        tokenHash,
        expiresAt,
      },
    });

    return token;
  }

  async verifyEmail(token: string): Promise<void> {
    const tokenHash = hashToken(token);

    const verificationToken = await this.prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        verifiedAt: null,
      },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new Error('Invalid or expired verification token');
    }

    // Update user and token
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { verifiedAt: new Date() },
      }),
    ]);
  }

  // --------------------------------------------------------------------------
  // Password Reset
  // --------------------------------------------------------------------------

  async requestPasswordReset(
    email: string,
    tenantId?: string,
    deviceInfo?: DeviceInfo
  ): Promise<void> {
    const whereClause = tenantId
      ? { email, tenantId }
      : { email };

    const user = await this.prisma.user.findFirst({
      where: whereClause,
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Invalidate any existing reset tokens
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(), // Mark as used
      },
    });

    // Create new token
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    // Send password reset email via notification service
    const emailResult = await notifyClient.sendPasswordResetEmail({
      email: user.email,
      resetToken: token,
      expiryMinutes: 60,
      requestInfo: deviceInfo ? {
        ipAddress: deviceInfo.ip,
        userAgent: deviceInfo.userAgent,
        timestamp: new Date().toISOString(),
      } : undefined,
    });

    if (!emailResult.success) {
      console.error('[AuthService] Failed to send password reset email:', emailResult.error);
      // Don't throw - we don't want to reveal email sending failures
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    validatePasswordStrength(newPassword);

    const tokenHash = hashToken(token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      include: { user: true },
    });

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    // Update password and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Revoke all sessions for security
    await this.logoutAllSessions(resetToken.userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }

    validatePasswordStrength(newPassword);

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  // --------------------------------------------------------------------------
  // Session Management
  // --------------------------------------------------------------------------

  async getSessions(userId: string): Promise<SessionInfo[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    return sessions.map((s: Session) => this.toSessionInfo(s));
  }

  async revokeSession(sessionId: string, reason: string = 'manual_revoke'): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    // Blacklist the session in Redis
    if (this.redis) {
      await this.redis.set(`blacklist:token:${sessionId}`, '1', 'EX', 86400);
    }
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private async createSession(
    userId: string,
    tenantId: string,
    deviceInfo?: DeviceInfo
  ): Promise<Session> {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await this.prisma.session.create({
      data: {
        userId,
        tenantId,
        userAgent: deviceInfo?.userAgent,
        ipAddress: deviceInfo?.ip,
        deviceId: deviceInfo?.deviceId,
        platform: deviceInfo?.platform,
        expiresAt,
      },
    });

    return session;
  }

  private async generateTokens(
    user: User,
    roles: string[],
    sessionId: string
  ): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      tenant_id: user.tenantId,
      roles: roles as Role[],
      jti: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken(payload),
      signRefreshToken(payload),
    ]);

    // Store refresh token hash in session
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiresIn(config.accessTokenTtl),
    };
  }

  private parseExpiresIn(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match || !match[1] || !match[2]) return 900; // Default 15 minutes

    const value = Number.parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  private toSafeUser(
    user: User & { roles?: UserRole[] },
    roles: string[]
  ): SafeUser {
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      phone: user.phone,
      status: user.status,
      emailVerified: user.emailVerified,
      roles,
      createdAt: user.createdAt,
    };
  }

  private toSessionInfo(session: Session): SessionInfo {
    return {
      id: session.id,
      userId: session.userId,
      tenantId: session.tenantId,
      deviceName: session.deviceName,
      platform: session.platform,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  // --------------------------------------------------------------------------
  // Rate Limiting / Lockout
  // --------------------------------------------------------------------------

  private async trackFailedLogin(
    email: string,
    tenantId?: string,
    deviceInfo?: DeviceInfo
  ): Promise<void> {
    await this.prisma.failedLoginAttempt.create({
      data: {
        email,
        tenantId,
        ipAddress: deviceInfo?.ip,
        userAgent: deviceInfo?.userAgent,
      },
    });

    // Also track in Redis for faster lookups
    if (this.redis) {
      const key = `failed_logins:${email}:${tenantId || 'default'}`;
      await this.redis.incr(key);
      await this.redis.expire(key, 900); // 15 minutes
    }
  }

  private async isAccountLocked(email: string, tenantId: string): Promise<boolean> {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

    // Check Redis first for performance
    if (this.redis) {
      const key = `failed_logins:${email}:${tenantId}`;
      const attempts = await this.redis.get(key);
      return attempts !== null && Number.parseInt(attempts, 10) >= MAX_ATTEMPTS;
    }

    // Fallback to database
    const recentAttempts = await this.prisma.failedLoginAttempt.count({
      where: {
        email,
        tenantId,
        attemptedAt: { gt: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
      },
    });

    return recentAttempts >= MAX_ATTEMPTS;
  }

  private async clearFailedLogins(email: string, tenantId: string): Promise<void> {
    if (this.redis) {
      await this.redis.del(`failed_logins:${email}:${tenantId}`);
    }

    // Clean up old attempts from database (async, non-blocking)
    this.prisma.failedLoginAttempt.deleteMany({
      where: {
        email,
        tenantId,
      },
    }).catch(() => {
      // Ignore cleanup errors
    });
  }
}

// Factory function
export function createAuthService(prisma: PrismaClient, redis?: Redis): AuthService {
  return new AuthService(prisma, redis);
}
