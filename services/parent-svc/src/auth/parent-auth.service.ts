/**
 * Parent Authentication Service
 *
 * Handles parent authentication including login, registration, and token management.
 */

import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { config } from '../config.js';

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  parent: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    language: string;
    verified: boolean;
  };
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  inviteCode: string;
  language?: string;
}

@Injectable()
export class ParentAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly notification: NotificationService,
  ) {}

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const parent = await this.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!parent) {
      metrics.increment('auth.login_failed', { reason: 'not_found' });
      throw new UnauthorizedException('Invalid email or password');
    }

    if (parent.status !== 'active') {
      metrics.increment('auth.login_failed', { reason: 'inactive' });
      throw new UnauthorizedException('Account is not active');
    }

    const validPassword = await this.crypto.verifyPassword(password, parent.passwordHash);
    if (!validPassword) {
      metrics.increment('auth.login_failed', { reason: 'invalid_password' });
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    await this.prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(parent.id);
    const refreshToken = await this.generateRefreshToken(parent.id);

    metrics.increment('auth.login_success');

    return {
      accessToken,
      refreshToken,
      expiresIn: config.accessTokenExpiresIn,
      parent: {
        id: parent.id,
        email: parent.email,
        firstName: parent.firstName,
        lastName: parent.lastName,
        language: parent.language || 'en',
        verified: parent.emailVerified,
      },
    };
  }

  /**
   * Register a new parent using an invite code
   */
  async register(input: RegisterInput): Promise<LoginResult> {
    const { email, password, firstName, lastName, inviteCode, language = 'en' } = input;

    // Validate invite
    const invite = await this.prisma.parentInvite.findFirst({
      where: {
        code: inviteCode,
        status: 'pending',
        expiresAt: { gt: new Date() },
      },
      include: { student: true },
    });

    if (!invite) {
      throw new BadRequestException('Invalid or expired invite code');
    }

    // Check if email already exists
    const existing = await this.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    // Validate password strength
    this.validatePassword(password);

    // Create parent account
    const passwordHash = await this.crypto.hashPassword(password);
    const parent = await this.prisma.parent.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        language,
        status: 'active',
        emailVerified: false,
        students: {
          create: {
            studentId: invite.studentId,
            relationship: invite.relationship,
            permissions: invite.permissions || {},
            consentStatus: 'pending',
          },
        },
      },
    });

    // Update invite status
    await this.prisma.parentInvite.update({
      where: { id: invite.id },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedById: parent.id,
      },
    });

    // Send verification email
    const verificationToken = await this.createEmailVerificationToken(parent.id);
    await this.notification.sendEmail({
      to: parent.email,
      template: 'verify-email',
      language,
      data: {
        firstName,
        verifyUrl: `${config.appUrl}/verify-email?token=${verificationToken}`,
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(parent.id);
    const refreshToken = await this.generateRefreshToken(parent.id);

    metrics.increment('auth.register_success');
    logger.info('Parent registered', { parentId: parent.id });

    return {
      accessToken,
      refreshToken,
      expiresIn: config.accessTokenExpiresIn,
      parent: {
        id: parent.id,
        email: parent.email,
        firstName: parent.firstName,
        lastName: parent.lastName,
        language: parent.language || 'en',
        verified: parent.emailVerified,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(token: string): Promise<{ accessToken: string; expiresIn: number }> {
    const session = await this.prisma.parentSession.findUnique({
      where: { refreshToken: token },
      include: { parent: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (session.parent.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const accessToken = this.generateAccessToken(session.parentId);

    return {
      accessToken,
      expiresIn: config.accessTokenExpiresIn,
    };
  }

  /**
   * Logout and invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.parentSession.deleteMany({
      where: { refreshToken },
    });
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    const verification = await this.prisma.emailVerificationToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.parent.update({
        where: { id: verification.parentId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    logger.info('Parent email verified', { parentId: verification.parentId });
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    const parent = await this.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Don't reveal if email exists
    if (!parent) {
      return;
    }

    const token = this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        parentId: parent.id,
        token,
        expiresAt,
      },
    });

    await this.notification.sendEmail({
      to: parent.email,
      template: 'password-reset',
      language: parent.language || 'en',
      data: {
        firstName: parent.firstName,
        resetUrl: `${config.appUrl}/reset-password?token=${token}`,
      },
    });
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const reset = await this.prisma.passwordResetToken.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
    });

    if (!reset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    this.validatePassword(newPassword);

    const passwordHash = await this.crypto.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.parent.update({
        where: { id: reset.parentId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate all sessions
      this.prisma.parentSession.deleteMany({
        where: { parentId: reset.parentId },
      }),
    ]);

    logger.info('Parent password reset', { parentId: reset.parentId });
  }

  /**
   * Generate access token
   */
  private generateAccessToken(parentId: string): string {
    return sign(
      { sub: parentId, type: 'parent' },
      config.jwtSecret,
      { expiresIn: config.accessTokenExpiresIn }
    );
  }

  /**
   * Generate refresh token and store session
   */
  private async generateRefreshToken(parentId: string): Promise<string> {
    const token = this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiresIn * 1000);

    await this.prisma.parentSession.create({
      data: {
        parentId,
        refreshToken: token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Create email verification token
   */
  private async createEmailVerificationToken(parentId: string): Promise<string> {
    const token = this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await this.prisma.emailVerificationToken.create({
      data: {
        parentId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain a lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain a number');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }
}
