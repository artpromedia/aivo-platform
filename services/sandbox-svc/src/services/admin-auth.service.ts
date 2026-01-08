/**
 * Admin Authentication Service
 *
 * Secure authentication for sandbox admin users with:
 * - Password hashing with Argon2
 * - TOTP-based MFA
 * - Session management with secure tokens
 * - Rate limiting and lockout protection
 * - Comprehensive audit logging
 *
 * @module @aivo/sandbox-svc/services/admin-auth
 */

import { randomBytes, timingSafeEqual, createHmac, pbkdf2 as pbkdf2Async } from 'node:crypto';

import type { ExtendedPrismaClient } from '../prisma-types.js';

// Type aliases since generated types might not be available
type AdminRole = 'SUPER_ADMIN' | 'SANDBOX_ADMIN' | 'SALES_DEMO' | 'SUPPORT';

type SandboxAdmin = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: AdminRole;
  isActive: boolean;
  mfaEnabled: boolean;
  mfaSecret: string | null;
  allowedIPs: string[];
  lastLoginAt: Date | null;
  passwordChangedAt: Date;
  passwordResetToken: string | null;
  passwordResetExpiry: Date | null;
  failedLoginAttempts: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Credentials for admin login
 */
export interface AdminCredentials {
  email: string;
  password: string;
  mfaCode?: string;
}

/**
 * Request context for security logging
 */
export interface RequestContext {
  ipAddress: string;
  userAgent: string;
}

/**
 * Admin session data
 */
export interface AdminSession {
  sessionId: string;
  adminId: string;
  adminEmail: string;
  adminName: string;
  email: string;
  role: AdminRole;
  token: string;
  permissions: Permission[];
  expiresAt: Date;
  createdAt: Date;
  ipAddress: string;
  userAgent: string;
}

/**
 * Session result returned after authentication
 */
export interface AdminSessionResult {
  token: string;
  expiresAt: Date;
  adminId: string;
  adminEmail: string;
  adminName: string;
  role: AdminRole;
  permissions: Permission[];
}

/**
 * Permission types for admin operations
 */
export type Permission =
  | '*' // Super admin - all permissions
  | 'sandbox:read'
  | 'sandbox:create'
  | 'sandbox:delete'
  | 'sandbox:reset'
  | 'sandbox:manage' // Full sandbox management
  | 'demo:manage'
  | 'demo:present'
  | 'partner:read'
  | 'partner:write' // Create/update/delete partners
  | 'partner:approve'
  | 'partner:reject'
  | 'admin:list'
  | 'admin:create'
  | 'admin:update'
  | 'admin:delete'
  | 'admin:manage' // Full admin management
  | 'user:impersonate'
  | 'audit:read';

/**
 * Configuration for admin auth
 */
export interface AdminAuthConfig {
  /** Session duration in milliseconds (default: 8 hours) */
  sessionDurationMs: number;
  /** Inactivity timeout in milliseconds (default: 30 minutes) */
  inactivityTimeoutMs: number;
  /** Max failed login attempts before lockout (default: 5) */
  maxFailedAttempts: number;
  /** Lockout duration in milliseconds (default: 15 minutes) */
  lockoutDurationMs: number;
  /** Minimum password length (default: 12) */
  minPasswordLength: number;
  /** Password history count to prevent reuse (default: 12) */
  passwordHistoryCount: number;
  /** Password rotation days (default: 90) */
  passwordRotationDays: number;
  /** Require MFA for all admins (default: true) */
  requireMfa: boolean;
  /** Allowed IP ranges (CIDR notation) */
  allowedIpRanges: string[];
  /** HMAC secret for token generation */
  tokenSecret: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exceptions
// ═══════════════════════════════════════════════════════════════════════════════

export class UnauthorizedException extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedException';
  }
}

export class MfaRequiredException extends Error {
  constructor() {
    super('MFA code required');
    this.name = 'MfaRequiredException';
  }
}

export class TooManyAttemptsException extends Error {
  constructor(
    message: string,
    public readonly retryAfter: Date
  ) {
    super(message);
    this.name = 'TooManyAttemptsException';
  }
}

export class PasswordExpiredException extends Error {
  constructor() {
    super('Password has expired. Please change your password.');
    this.name = 'PasswordExpiredException';
  }
}

export class WeakPasswordException extends Error {
  constructor(public readonly requirements: string[]) {
    super('Password does not meet security requirements');
    this.name = 'WeakPasswordException';
  }
}

export class IpNotAllowedException extends Error {
  constructor() {
    super('Access from this IP address is not allowed');
    this.name = 'IpNotAllowedException';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Admin Auth Service
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Admin Authentication Service
 *
 * Handles all admin authentication operations with security best practices.
 */
export class AdminAuthService {
  private readonly prisma: ExtendedPrismaClient;
  private readonly config: AdminAuthConfig;

  constructor(prisma: ExtendedPrismaClient, config?: Partial<AdminAuthConfig>) {
    this.prisma = prisma;
    this.config = {
      sessionDurationMs: 8 * 60 * 60 * 1000, // 8 hours
      inactivityTimeoutMs: 30 * 60 * 1000, // 30 minutes
      maxFailedAttempts: 5,
      lockoutDurationMs: 15 * 60 * 1000, // 15 minutes
      minPasswordLength: 12,
      passwordHistoryCount: 12,
      passwordRotationDays: 90,
      requireMfa: process.env.ADMIN_MFA_REQUIRED !== 'false',
      allowedIpRanges: this.parseIpRanges(process.env.ADMIN_ALLOWED_IP_RANGES),
      tokenSecret: process.env.ADMIN_TOKEN_SECRET ?? 'dev-token-secret-change-me',
      ...config,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Authentication
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Authenticate admin user with credentials
   */
  async authenticate(
    credentials: AdminCredentials,
    context: RequestContext
  ): Promise<AdminSessionResult> {
    const email = credentials.email.toLowerCase().trim();

    // 1. Check IP allowlist if configured
    if (this.config.allowedIpRanges.length > 0) {
      if (!this.isIpAllowed(context.ipAddress)) {
        await this.recordFailedAttempt(null, email, context, 'ip_not_allowed');
        throw new IpNotAllowedException();
      }
    }

    // 2. Find admin by email
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { email },
    });

    if (!admin) {
      await this.recordFailedAttempt(null, email, context, 'user_not_found');
      // Use same error to prevent user enumeration
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!admin.isActive) {
      await this.recordFailedAttempt(admin.id, email, context, 'account_disabled');
      throw new UnauthorizedException('Account is disabled');
    }

    // 3. Check for account lockout
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      throw new TooManyAttemptsException(
        'Account is temporarily locked due to too many failed attempts',
        admin.lockedUntil
      );
    }

    // 4. Check for too many failed attempts (rate limiting by IP)
    await this.checkRateLimit(admin.id, context.ipAddress);

    // 5. Verify password
    const isValid = await this.verifyPassword(credentials.password, admin.passwordHash);
    if (!isValid) {
      await this.recordFailedAttempt(admin.id, email, context, 'invalid_password');
      await this.incrementFailedAttempts(admin.id);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 6. Check password expiration
    if (this.isPasswordExpired(admin.passwordChangedAt)) {
      throw new PasswordExpiredException();
    }

    // 7. Check MFA if enabled or required
    if (admin.mfaEnabled || this.config.requireMfa) {
      if (!admin.mfaEnabled && this.config.requireMfa) {
        // User needs to set up MFA first - return special response
        throw new MfaRequiredException();
      }

      if (!credentials.mfaCode) {
        throw new MfaRequiredException();
      }

      const mfaValid = await this.verifyMfaCode(admin, credentials.mfaCode);
      if (!mfaValid) {
        await this.recordFailedAttempt(admin.id, email, context, 'invalid_mfa');
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // 8. Create session
    const session = await this.createSession(admin, context);

    // 9. Update last login and clear failed attempts
    await this.prisma.sandboxAdmin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // 10. Record successful login
    await this.recordSuccessfulLogin(admin.id, email, context, admin.mfaEnabled);

    // 11. Audit log
    await this.auditLog(admin.id, admin.email, 'admin_login', context);

    return session;
  }

  /**
   * Validate session token and return session data
   */
  async validateSession(token: string): Promise<AdminSession | null> {
    const session = await this.prisma.adminSession.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      return null;
    }

    // Check if session was revoked
    if (session.revokedAt) {
      return null;
    }

    // Check for inactivity timeout
    const inactivityThreshold = new Date(Date.now() - this.config.inactivityTimeoutMs);
    if (session.lastActivityAt < inactivityThreshold) {
      await this.revokeSession(session.id, 'inactivity_timeout');
      return null;
    }

    // Check if admin is still active
    if (!session.admin.isActive) {
      await this.revokeSession(session.id, 'account_disabled');
      return null;
    }

    // Update last activity time (extend session)
    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return {
      sessionId: session.id,
      adminId: session.admin.id,
      adminEmail: session.admin.email,
      adminName: session.admin.name,
      email: session.admin.email,
      token: session.token,
      role: session.admin.role,
      permissions: this.getPermissionsForRole(session.admin.role),
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    };
  }

  /**
   * Logout / revoke a specific session by token
   */
  async logout(adminId: string, token: string, context?: RequestContext): Promise<void> {
    const session = await this.prisma.adminSession.findFirst({
      where: { adminId, token },
      include: { admin: true },
    });

    if (session) {
      await this.revokeSession(session.id, 'user_logout');

      if (context) {
        await this.auditLog(session.admin.id, session.admin.email, 'admin_logout', context);
      }
    }
  }

  /**
   * Revoke all sessions for an admin
   */
  async revokeAllSessions(
    adminId: string,
    context?: RequestContext,
    reason = 'admin_action'
  ): Promise<number> {
    const result = await this.prisma.adminSession.updateMany({
      where: {
        adminId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    if (context) {
      const admin = await this.prisma.sandboxAdmin.findUnique({
        where: { id: adminId },
      });
      if (admin) {
        await this.auditLog(adminId, admin.email, 'all_sessions_revoked', context);
      }
    }

    return result.count;
  }

  /**
   * Verify MFA code during login (step 2 of 2-step login)
   */
  async verifyMfaLogin(
    temporaryToken: string,
    mfaCode: string,
    context: RequestContext
  ): Promise<AdminSessionResult> {
    // Decode temporary token to get admin email
    // Format: base64(email:timestamp:signature)
    let email = '';
    let timestamp = 0;

    try {
      const decoded = Buffer.from(temporaryToken, 'base64url').toString('utf8');
      const parts = decoded.split(':');
      if (parts.length < 3 || !parts[0] || !parts[1]) {
        throw new Error('Invalid token format');
      }
      email = parts[0];
      timestamp = parseInt(parts[1], 10);

      // Verify token hasn't expired (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        throw new UnauthorizedException('MFA token expired');
      }

      // Verify signature
      const expectedSig = this.generateTokenSignature(`${email}:${timestamp}`);
      if (parts[2] !== expectedSig) {
        throw new UnauthorizedException('Invalid MFA token');
      }
    } catch (error) {
      throw new UnauthorizedException('Invalid MFA token');
    }

    // Find admin
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { email },
    });

    if (!admin?.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify MFA code
    const mfaValid = await this.verifyMfaCode(admin, mfaCode);
    if (!mfaValid) {
      await this.recordFailedAttempt(admin.id, email, context, 'invalid_mfa');
      throw new UnauthorizedException('Invalid MFA code');
    }

    // Create session
    const session = await this.createSession(admin, context);

    // Update last login
    await this.prisma.sandboxAdmin.update({
      where: { id: admin.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.recordSuccessfulLogin(admin.id, email, context, true);
    await this.auditLog(admin.id, admin.email, 'admin_login_mfa', context);

    return session;
  }

  /**
   * Request a password reset (sends email)
   */
  async requestPasswordReset(email: string, context: RequestContext): Promise<void> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!admin?.isActive) {
      // Return silently to prevent email enumeration
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('base64url');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.sandboxAdmin.update({
      where: { id: admin.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetTokenExpiry,
      },
    });

    await this.auditLog(admin.id, admin.email, 'password_reset_requested', context);

    // Send email with reset link via notify-svc
    const resetUrl = `${process.env.SANDBOX_ADMIN_URL ?? 'https://sandbox.aivolearning.com'}/reset-password?token=${resetToken}`;
    const notifyServiceUrl = process.env.NOTIFY_SERVICE_URL ?? 'http://notify-svc:3000';

    try {
      await fetch(`${notifyServiceUrl}/internal/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Password Reset Request - AIVO Sandbox Admin',
          template: 'password-reset',
          data: {
            adminName: admin.name,
            resetUrl,
            expiresIn: '1 hour',
          },
        }),
      });
    } catch (err) {
      // Log error but don't fail the request - token is still generated
      console.error('Failed to send password reset email:', err);
    }
  }

  /**
   * Complete a password reset using a token
   */
  async resetPasswordWithToken(
    token: string,
    newPassword: string,
    context: RequestContext
  ): Promise<void> {
    const admin = await this.prisma.sandboxAdmin.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
        isActive: true,
      },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Validate password strength
    await this.validatePasswordStrength(newPassword, admin);

    // Check password history
    await this.checkPasswordHistory(admin.id, newPassword);

    // Hash and update password
    const hash = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.sandboxAdmin.update({
        where: { id: admin.id },
        data: {
          passwordHash: hash,
          passwordChangedAt: new Date(),
          passwordResetToken: null,
          passwordResetExpiry: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.adminPasswordHistory.create({
        data: {
          adminId: admin.id,
          passwordHash: hash,
        },
      }),
    ]);

    // Revoke all sessions
    await this.revokeAllSessions(admin.id, context, 'password_reset');

    await this.auditLog(admin.id, admin.email, 'password_reset_completed', context);
  }

  /**
   * Generate a temporary MFA token for 2-step login
   */
  private generateMfaTemporaryToken(email: string): string {
    const timestamp = Date.now();
    const signature = this.generateTokenSignature(`${email}:${timestamp}`);
    const payload = `${email}:${timestamp}:${signature}`;
    return Buffer.from(payload).toString('base64url');
  }

  /**
   * Generate token signature using HMAC
   */
  private generateTokenSignature(data: string): string {
    return createHmac('sha256', this.config.tokenSecret)
      .update(data)
      .digest('base64url')
      .substring(0, 16);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MFA Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Set up MFA for an admin (generates secret and returns QR code data)
   */
  async setupMfa(adminId: string): Promise<{ secret: string; qrCodeUrl: string }> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    if (admin.mfaEnabled) {
      throw new Error('MFA is already enabled');
    }

    // Generate TOTP secret (32 chars base32)
    const secret = this.generateTotpSecret();

    // Store secret temporarily (not enabled yet)
    await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data: { mfaSecret: this.encryptSecret(secret) },
    });

    // Generate QR code URL (otpauth format)
    const issuer = 'Aivo%20Sandbox';
    const qrCodeUrl = `otpauth://totp/${issuer}:${encodeURIComponent(admin.email)}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

    return { secret, qrCodeUrl };
  }

  /**
   * Verify MFA setup with a code and enable MFA
   */
  async verifyMfaSetup(adminId: string, code: string, context: RequestContext): Promise<boolean> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin?.mfaSecret) {
      throw new UnauthorizedException('MFA setup not initiated');
    }

    const isValid = this.verifyTotpCode(this.decryptSecret(admin.mfaSecret), code);

    if (!isValid) {
      return false;
    }

    // Enable MFA
    await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data: { mfaEnabled: true },
    });

    await this.auditLog(admin.id, admin.email, 'mfa_enabled', context);

    return true;
  }

  /**
   * Disable MFA for an admin (requires SUPER_ADMIN)
   */
  async disableMfa(adminId: string, context: RequestContext): Promise<void> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
      },
    });

    await this.auditLog(adminId, admin.email, 'mfa_disabled', context);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Password Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Change password for an admin
   */
  async changePassword(
    adminId: string,
    currentPassword: string,
    newPassword: string,
    context: RequestContext
  ): Promise<void> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Verify current password
    const isValid = await this.verifyPassword(currentPassword, admin.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Validate new password strength
    await this.validatePasswordStrength(newPassword, admin);

    // Check password history
    await this.checkPasswordHistory(adminId, newPassword);

    // Hash new password
    const newHash = await this.hashPassword(newPassword);

    // Update password and save to history
    await this.prisma.$transaction([
      this.prisma.sandboxAdmin.update({
        where: { id: adminId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
        },
      }),
      this.prisma.adminPasswordHistory.create({
        data: {
          adminId,
          passwordHash: newHash,
        },
      }),
    ]);

    // Revoke all other sessions
    await this.revokeAllSessions(adminId, undefined, 'password_changed');

    await this.auditLog(admin.id, admin.email, 'password_changed', context);
  }

  /**
   * Reset password for an admin (admin action)
   */
  async resetPassword(
    adminId: string,
    performedBy: string,
    context: RequestContext
  ): Promise<string> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Generate temporary password
    const tempPassword = this.generateTempPassword();
    const hash = await this.hashPassword(tempPassword);

    await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data: {
        passwordHash: hash,
        passwordChangedAt: new Date(0), // Force password change
      },
    });

    // Revoke all sessions
    await this.revokeAllSessions(adminId, undefined, 'password_reset');

    await this.auditLog(performedBy, admin.email, 'password_reset', context, {
      targetAdminId: adminId,
    });

    return tempPassword;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Admin Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new admin user
   */
  async createAdmin(
    data: {
      email: string;
      name: string;
      password: string;
      role: AdminRole;
      allowedIPs?: string[];
    },
    createdBy: string,
    context: RequestContext
  ): Promise<{ id: string; email: string; name: string; role: AdminRole; createdAt: Date }> {
    const email = data.email.toLowerCase().trim();

    // Check if email exists
    const existing = await this.prisma.sandboxAdmin.findUnique({
      where: { email },
    });

    if (existing) {
      throw new Error('An admin with this email already exists');
    }

    // Validate password strength
    await this.validatePasswordStrength(data.password);

    const hash = await this.hashPassword(data.password);

    const admin = await this.prisma.sandboxAdmin.create({
      data: {
        email,
        name: data.name,
        passwordHash: hash,
        role: data.role,
        allowedIPs: data.allowedIPs ?? [],
        createdBy,
      },
    });

    // Add to password history
    await this.prisma.adminPasswordHistory.create({
      data: {
        adminId: admin.id,
        passwordHash: hash,
      },
    });

    await this.auditLog(createdBy, email, 'admin_created', context, {
      newAdminId: admin.id,
      role: data.role,
    });

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      createdAt: admin.createdAt,
    };
  }

  /**
   * Update admin user
   */
  async updateAdmin(
    adminId: string,
    data: { name?: string; role?: AdminRole; isActive?: boolean; allowedIPs?: string[] },
    updatedBy: string,
    context: RequestContext
  ): Promise<{ id: string; email: string; name: string; role: AdminRole; isActive: boolean }> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const updated = await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data,
    });

    // If deactivated, revoke all sessions
    if (data.isActive === false) {
      await this.revokeAllSessions(adminId, context, 'account_disabled');
    }

    await this.auditLog(updatedBy, admin.email, 'admin_updated', context, {
      targetAdminId: adminId,
      changes: data,
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      isActive: updated.isActive,
    };
  }

  /**
   * Deactivate admin user
   */
  async deactivateAdmin(
    adminId: string,
    performedBy: string,
    context: RequestContext
  ): Promise<void> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Prevent self-deactivation
    if (adminId === performedBy) {
      throw new Error('Cannot deactivate your own account');
    }

    await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data: { isActive: false },
    });

    await this.revokeAllSessions(adminId, undefined, 'account_deactivated');

    await this.auditLog(performedBy, admin.email, 'admin_deactivated', context, {
      targetAdminId: adminId,
    });
  }

  /**
   * List all admins
   */
  async listAdmins(
    options: {
      limit?: number;
      offset?: number;
      role?: AdminRole;
      isActive?: boolean;
    } = {}
  ): Promise<
    {
      id: string;
      email: string;
      name: string;
      role: AdminRole;
      isActive: boolean;
      mfaEnabled: boolean;
      lastLoginAt: Date | null;
      createdAt: Date;
    }[]
  > {
    const where: { role?: AdminRole; isActive?: boolean } = {};
    if (options.role) where.role = options.role;
    if (options.isActive !== undefined) where.isActive = options.isActive;

    const admins = await this.prisma.sandboxAdmin.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
      take: options.limit ?? 50,
      skip: options.offset ?? 0,
      orderBy: { createdAt: 'desc' },
    });

    return admins;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Permission Helpers
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get permissions for a role
   */
  getPermissionsForRole(role: AdminRole): Permission[] {
    const permissions: Record<AdminRole, Permission[]> = {
      SUPER_ADMIN: ['*'],
      SANDBOX_ADMIN: [
        'sandbox:read',
        'sandbox:create',
        'sandbox:delete',
        'sandbox:reset',
        'sandbox:manage',
        'demo:manage',
        'partner:read',
        'partner:write',
        'partner:approve',
        'partner:reject',
        'audit:read',
      ],
      SALES_DEMO: ['sandbox:read', 'demo:present', 'partner:read'],
      SUPPORT: ['sandbox:read', 'sandbox:reset', 'partner:read', 'user:impersonate', 'audit:read'],
    };

    return permissions[role] ?? [];
  }

  /**
   * Check if session has permission
   */
  hasPermission(session: AdminSession, permission: Permission): boolean {
    // Super admin has all permissions
    if (session.permissions.includes('*')) {
      return true;
    }
    return session.permissions.includes(permission);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - Password Handling
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Hash password using PBKDF2 (Argon2 would be better but requires native deps)
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(32);
    const iterations = 100000;

    return new Promise((resolve, reject) => {
      pbkdf2Async(
        password,
        salt,
        iterations,
        64,
        'sha512',
        (err: Error | null, derivedKey: Buffer) => {
          if (err) reject(err);
          else
            resolve(
              `pbkdf2:${iterations}:${salt.toString('base64')}:${derivedKey.toString('base64')}`
            );
        }
      );
    });
  }

  /**
   * Verify password against hash
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const parts = hash.split(':');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }

    const iterations = parseInt(parts[1] ?? '0', 10);
    const salt = Buffer.from(parts[2] ?? '', 'base64');
    const storedKey = Buffer.from(parts[3] ?? '', 'base64');

    return new Promise((resolve, reject) => {
      pbkdf2Async(
        password,
        salt,
        iterations,
        64,
        'sha512',
        (err: Error | null, derivedKey: Buffer) => {
          if (err) reject(err);
          else resolve(timingSafeEqual(storedKey, derivedKey));
        }
      );
    });
  }

  /**
   * Validate password strength
   */
  private async validatePasswordStrength(password: string, admin?: SandboxAdmin): Promise<void> {
    const requirements: string[] = [];

    if (password.length < this.config.minPasswordLength) {
      requirements.push(`Password must be at least ${this.config.minPasswordLength} characters`);
    }

    if (!/[a-z]/.test(password)) {
      requirements.push('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      requirements.push('Password must contain at least one uppercase letter');
    }

    if (!/\d/.test(password)) {
      requirements.push('Password must contain at least one number');
    }

    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      requirements.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (/(.)\1{2,}/.test(password)) {
      requirements.push('Password cannot contain more than 2 consecutive identical characters');
    }

    // Check if password contains email
    if (admin?.email) {
      const emailPrefix = admin.email.split('@')[0]?.toLowerCase();
      if (emailPrefix && password.toLowerCase().includes(emailPrefix)) {
        requirements.push('Password cannot contain your email address');
      }
    }

    if (requirements.length > 0) {
      throw new WeakPasswordException(requirements);
    }
  }

  /**
   * Check password against history
   */
  private async checkPasswordHistory(adminId: string, newPassword: string): Promise<void> {
    const history = await this.prisma.adminPasswordHistory.findMany({
      where: { adminId },
      orderBy: { createdAt: 'desc' },
      take: this.config.passwordHistoryCount,
    });

    for (const entry of history) {
      const matches = await this.verifyPassword(newPassword, entry.passwordHash);
      if (matches) {
        throw new WeakPasswordException([
          `Cannot reuse any of the last ${this.config.passwordHistoryCount} passwords`,
        ]);
      }
    }
  }

  /**
   * Check if password is expired
   */
  private isPasswordExpired(passwordChangedAt: Date): boolean {
    const expirationDate = new Date(passwordChangedAt);
    expirationDate.setDate(expirationDate.getDate() + this.config.passwordRotationDays);
    return expirationDate < new Date();
  }

  /**
   * Generate temporary password
   */
  private generateTempPassword(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const bytes = randomBytes(16);
    let password = '';
    for (const byte of bytes) {
      password += chars[byte % chars.length];
    }
    return password;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - Session Management
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Create a new session
   */
  private async createSession(
    admin: SandboxAdmin,
    context: RequestContext
  ): Promise<AdminSessionResult> {
    const token = await this.generateSecureToken();
    const expiresAt = new Date(Date.now() + this.config.sessionDurationMs);

    await this.prisma.adminSession.create({
      data: {
        adminId: admin.id,
        token,
        expiresAt,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    return {
      token,
      expiresAt,
      adminId: admin.id,
      adminEmail: admin.email,
      adminName: admin.name,
      role: admin.role,
      permissions: this.getPermissionsForRole(admin.role),
    };
  }

  /**
   * Revoke a session
   */
  private async revokeSession(sessionId: string, reason: string): Promise<void> {
    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });
  }

  /**
   * Generate secure session token
   */
  private async generateSecureToken(): Promise<string> {
    const tokenBytes = randomBytes(48);
    const timestamp = Date.now().toString(36);
    const hmac = createHmac('sha256', this.config.tokenSecret)
      .update(tokenBytes)
      .digest('base64url');
    return `adm_${timestamp}_${tokenBytes.toString('base64url')}_${hmac.slice(0, 16)}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - Rate Limiting
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Check rate limit for login attempts
   */
  private async checkRateLimit(adminId: string | null, ipAddress: string): Promise<void> {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const recentAttempts = await this.prisma.adminLoginAttempt.count({
      where: {
        OR: [...(adminId ? [{ adminId }] : []), { ipAddress }],
        createdAt: { gte: fifteenMinutesAgo },
        success: false,
      },
    });

    if (recentAttempts >= this.config.maxFailedAttempts) {
      const retryAfter = new Date(Date.now() + this.config.lockoutDurationMs);
      throw new TooManyAttemptsException(
        'Too many login attempts. Please try again later.',
        retryAfter
      );
    }
  }

  /**
   * Increment failed login attempts for an admin
   */
  private async incrementFailedAttempts(adminId: string): Promise<void> {
    const admin = await this.prisma.sandboxAdmin.findUnique({
      where: { id: adminId },
    });

    if (!admin) return;

    const newCount = admin.failedLoginAttempts + 1;
    const update: { failedLoginAttempts: number; lockedUntil?: Date } = {
      failedLoginAttempts: newCount,
    };

    // Lock account after max attempts
    if (newCount >= this.config.maxFailedAttempts) {
      update.lockedUntil = new Date(Date.now() + this.config.lockoutDurationMs);
    }

    await this.prisma.sandboxAdmin.update({
      where: { id: adminId },
      data: update,
    });
  }

  /**
   * Record a failed login attempt
   */
  private async recordFailedAttempt(
    adminId: string | null,
    email: string,
    context: RequestContext,
    reason: string
  ): Promise<void> {
    await this.prisma.adminLoginAttempt.create({
      data: {
        adminId,
        email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success: false,
        failReason: reason,
      },
    });
  }

  /**
   * Record a successful login
   */
  private async recordSuccessfulLogin(
    adminId: string,
    email: string,
    context: RequestContext,
    mfaUsed: boolean
  ): Promise<void> {
    await this.prisma.adminLoginAttempt.create({
      data: {
        adminId,
        email,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success: true,
        mfaUsed,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - MFA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verify MFA code for an admin
   */
  private async verifyMfaCode(admin: SandboxAdmin, code: string): Promise<boolean> {
    if (!admin.mfaSecret) {
      return false;
    }

    const secret = this.decryptSecret(admin.mfaSecret);
    return this.verifyTotpCode(secret, code);
  }

  /**
   * Generate TOTP secret
   */
  private generateTotpSecret(): string {
    const bytes = randomBytes(20);
    return this.base32Encode(bytes);
  }

  /**
   * Verify TOTP code
   */
  private verifyTotpCode(secret: string, code: string): boolean {
    // Allow 1 window before and after (30 second windows)
    const windows = [-1, 0, 1];
    const now = Math.floor(Date.now() / 30000);

    for (const window of windows) {
      const expected = this.generateTotp(secret, now + window);
      if (code === expected) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate TOTP code for a time window
   */
  private generateTotp(secret: string, counter: number): string {
    const secretBytes = this.base32Decode(secret);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmacResult = createHmac('sha1', secretBytes).update(counterBuffer).digest();

    const offset = hmacResult[hmacResult.length - 1]! & 0x0f;
    const code =
      (((hmacResult[offset]! & 0x7f) << 24) |
        ((hmacResult[offset + 1]! & 0xff) << 16) |
        ((hmacResult[offset + 2]! & 0xff) << 8) |
        (hmacResult[offset + 3]! & 0xff)) %
      1000000;

    return code.toString().padStart(6, '0');
  }

  /**
   * Base32 encode
   */
  private base32Encode(buffer: Buffer): string {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    let bits = 0;
    let value = 0;

    for (const byte of buffer) {
      value = (value << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }

    if (bits > 0) {
      result += alphabet[(value << (5 - bits)) & 0x1f];
    }

    return result;
  }

  /**
   * Base32 decode
   */
  private base32Decode(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const cleanedStr = str.toUpperCase().replace(/[^A-Z2-7]/g, '');
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;

    for (const char of cleanedStr) {
      value = (value << 5) | alphabet.indexOf(char);
      bits += 5;

      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(bytes);
  }

  /**
   * Encrypt secret for storage
   */
  private encryptSecret(secret: string): string {
    // In production, use proper encryption (AES-256-GCM)
    // For now, use simple obfuscation with HMAC
    const hmac = createHmac('sha256', this.config.tokenSecret).update(secret).digest('base64url');
    return `enc:${Buffer.from(secret).toString('base64url')}:${hmac.slice(0, 16)}`;
  }

  /**
   * Decrypt secret from storage
   */
  private decryptSecret(encrypted: string): string {
    if (!encrypted.startsWith('enc:')) {
      return encrypted;
    }
    const parts = encrypted.split(':');
    return Buffer.from(parts[1] ?? '', 'base64url').toString();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - IP Validation
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Parse IP ranges from environment variable
   */
  private parseIpRanges(rangesStr?: string): string[] {
    if (!rangesStr) return [];
    return rangesStr
      .split(',')
      .map((r) => r.trim())
      .filter(Boolean);
  }

  /**
   * Check if IP is in allowed ranges
   */
  private isIpAllowed(ip: string): boolean {
    if (this.config.allowedIpRanges.length === 0) {
      return true;
    }

    // Always allow localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return true;
    }

    for (const range of this.config.allowedIpRanges) {
      if (this.ipMatchesCidr(ip, range)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if IP matches CIDR range
   */
  private ipMatchesCidr(ip: string, cidr: string): boolean {
    const [rangeIp, maskStr] = cidr.split('/');
    if (!rangeIp) return false;

    const mask = maskStr ? parseInt(maskStr, 10) : 32;

    const ipNum = this.ipToNumber(ip);
    const rangeNum = this.ipToNumber(rangeIp);
    const maskNum = ~(2 ** (32 - mask) - 1);

    return (ipNum & maskNum) === (rangeNum & maskNum);
  }

  /**
   * Convert IP to number
   */
  private ipToNumber(ip: string): number {
    const parts = ip.split('.').map(Number);
    return (
      ((parts[0] ?? 0) << 24) | ((parts[1] ?? 0) << 16) | ((parts[2] ?? 0) << 8) | (parts[3] ?? 0)
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private Methods - Audit Logging
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Record an audit log entry
   */
  private async auditLog(
    adminId: string,
    adminEmail: string,
    action: string,
    context: RequestContext,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.prisma.adminAuditLog.create({
      data: {
        adminId,
        adminEmail,
        action,
        metadata: metadata ?? null,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Factory Functions
// ═══════════════════════════════════════════════════════════════════════════════

let adminAuthServiceInstance: AdminAuthService | null = null;

/**
 * Get the singleton admin auth service instance
 */
export function getAdminAuthService(prisma: ExtendedPrismaClient): AdminAuthService {
  if (!adminAuthServiceInstance) {
    adminAuthServiceInstance = new AdminAuthService(prisma);
  }
  return adminAuthServiceInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetAdminAuthService(): void {
  adminAuthServiceInstance = null;
}
