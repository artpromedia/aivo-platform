/**
 * Parent Authentication Service
 *
 * Handles parent authentication including login, registration, and token management.
 */

import { logger } from '@aivo/ts-observability';
import jwt from 'jsonwebtoken';

import { config } from '../config.js';
import type { CryptoService } from '../crypto/crypto.service.js';
import { UnauthorizedException, BadRequestException, ForbiddenException } from '../errors.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import type { NotificationService } from '../notification/notification.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  parent: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
    language: string;
    verified: boolean;
  };
}

interface RegisterInput {
  email: string;
  password: string;
  givenName: string;
  familyName: string;
  inviteCode: string;
  language?: string;
}

export class ParentAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CryptoService,
    private readonly notification: NotificationService,
    private readonly firebase?: FirebaseService
  ) {}

  /**
   * Login with email and password
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const parent = await this.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!parent) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (parent.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const validPassword = await this.crypto.verifyPassword(password, parent.passwordHash);
    if (!validPassword) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Enforce email verification (AUTH-05)
    if (!parent.emailVerified) {
      throw new ForbiddenException('EMAIL_NOT_VERIFIED');
    }

    // Update last login
    await this.prisma.parent.update({
      where: { id: parent.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(parent.id);
    const refreshToken = await this.generateRefreshToken(parent.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: config.accessTokenExpiresIn,
      parent: {
        id: parent.id,
        email: parent.email,
        givenName: parent.givenName,
        familyName: parent.familyName,
        language: parent.language || 'en',
        verified: parent.emailVerified,
      },
    };
  }

  /**
   * Register a new parent using an invite code
   */
  async register(input: RegisterInput): Promise<LoginResult> {
    const { email, password, givenName, familyName, inviteCode, language = 'en' } = input;

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
        givenName,
        familyName,
        language,
        status: 'active',
        emailVerified: false,
        studentLinks: {
          create: {
            studentId: invite.studentId,
            relationship: invite.relationship,
            permissions: {},
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
      },
    });

    // Send verification email
    if (this.firebase?.isConfigured()) {
      // Firebase path — generate verification link via Admin SDK
      try {
        const fbUser = await this.firebase.createAuthUser(
          parent.email,
          password
        );

        if (fbUser) {
          const continueUrl =
            `${config.appUrl}/verify-email-callback`;
          const link =
            await this.firebase.generateEmailVerificationLink(
              parent.email,
              continueUrl
            );

          if (link) {
            await this.notification.sendEmail({
              to: parent.email,
              template: 'verify-email',
              language,
              data: {
                firstName: givenName,
                verifyUrl: link,
              },
            });
          } else {
            // Fallback to custom token
            const verificationToken =
              await this.createEmailVerificationToken(parent.id);
            await this.notification.sendEmail({
              to: parent.email,
              template: 'verify-email',
              language,
              data: {
                firstName: givenName,
                verifyUrl: `${config.appUrl}/verify-email?token=${verificationToken}`,
              },
            });
          }
        }
      } catch (err) {
        logger.warn(
          { error: err instanceof Error ? err.message : err },
          'Firebase verification failed, using custom token'
        );
        const verificationToken =
          await this.createEmailVerificationToken(parent.id);
        await this.notification.sendEmail({
          to: parent.email,
          template: 'verify-email',
          language,
          data: {
            firstName: givenName,
            verifyUrl: `${config.appUrl}/verify-email?token=${verificationToken}`,
          },
        });
      }
    } else {
      // Custom token path (no Firebase)
      const verificationToken =
        await this.createEmailVerificationToken(parent.id);
      await this.notification.sendEmail({
        to: parent.email,
        template: 'verify-email',
        language,
        data: {
          firstName: givenName,
          verifyUrl: `${config.appUrl}/verify-email?token=${verificationToken}`,
        },
      });
    }

    // Send welcome email
    await this.notification.sendEmail({
      to: parent.email,
      template: 'welcome',
      language,
      data: {
        firstName: givenName,
        dashboardUrl: `${config.appUrl}/dashboard`,
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(parent.id);
    const refreshToken = await this.generateRefreshToken(parent.id);

    logger.info({ parentId: parent.id }, 'Parent registered');

    return {
      accessToken,
      refreshToken,
      expiresIn: config.accessTokenExpiresIn,
      parent: {
        id: parent.id,
        email: parent.email,
        givenName: parent.givenName,
        familyName: parent.familyName,
        language: parent.language || 'en',
        verified: parent.emailVerified,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(token: string): Promise<{ accessToken: string; expiresIn: number }> {
    const session = await this.prisma.parentSession.findFirst({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const parent = await this.prisma.parent.findUnique({
      where: { id: session.parentId },
    });

    if (parent?.status !== 'active') {
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
      where: { token: refreshToken },
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

    logger.info({ parentId: verification.parentId }, 'Parent email verified');
  }

  /**
   * Verify email via Firebase Auth status check.
   * Called after parent clicks the Firebase verification link.
   */
  async verifyEmailViaFirebase(email: string): Promise<void> {
    if (!this.firebase?.isConfigured()) {
      throw new BadRequestException('Firebase Auth is not configured');
    }

    const parent = await this.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!parent) {
      throw new BadRequestException('Parent not found');
    }

    if (parent.emailVerified) {
      return; // Already verified
    }

    // Look up Firebase user and check status
    const fbUser = await this.firebase.getUserByEmail(parent.email);
    if (!fbUser || !fbUser.emailVerified) {
      throw new BadRequestException(
        'Email has not been verified in Firebase'
      );
    }

    await this.prisma.parent.update({
      where: { id: parent.id },
      data: { emailVerified: true },
    });

    logger.info({ parentId: parent.id }, 'Parent email verified via Firebase');
  }

  /**
   * Resend verification email for a parent who has not yet verified.
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const parent = await this.prisma.parent.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!parent) {
      // Don't reveal whether email exists
      return;
    }

    if (parent.emailVerified) {
      return; // Already verified, nothing to do
    }

    const language = parent.language || 'en';

    // Try Firebase path first
    if (this.firebase?.isConfigured()) {
      try {
        const continueUrl = `${config.appUrl}/verify-email-callback`;
        const link = await this.firebase.generateEmailVerificationLink(
          parent.email,
          continueUrl
        );

        if (link) {
          await this.notification.sendEmail({
            to: parent.email,
            template: 'verify-email',
            language,
            data: {
              firstName: parent.givenName,
              verifyUrl: link,
            },
          });
          logger.info({ parentId: parent.id }, 'Verification email resent via Firebase');
          return;
        }
      } catch (err) {
        logger.warn(
          { error: err instanceof Error ? err.message : err },
          'Firebase resend failed, falling back to custom token'
        );
      }
    }

    // Fallback: custom token path
    const verificationToken = await this.createEmailVerificationToken(parent.id);
    await this.notification.sendEmail({
      to: parent.email,
      template: 'verify-email',
      language,
      data: {
        firstName: parent.givenName,
        verifyUrl: `${config.appUrl}/verify-email?token=${verificationToken}`,
      },
    });
    logger.info({ parentId: parent.id }, 'Verification email resent via custom token');
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

    const token = await this.crypto.generateSecureToken(32);
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
        firstName: parent.givenName,
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

    logger.info({ parentId: reset.parentId }, 'Parent password reset');
  }

  /**
   * Generate access token
   */
  private generateAccessToken(parentId: string): string {
    return jwt.sign({ sub: parentId, type: 'parent' }, config.jwtSecret, {
      expiresIn: config.accessTokenExpiresIn,
    });
  }

  /**
   * Generate refresh token and store session
   */
  private async generateRefreshToken(parentId: string): Promise<string> {
    const token = await this.crypto.generateSecureToken(32);
    const expiresAt = new Date(Date.now() + config.refreshTokenExpiresIn * 1000);

    await this.prisma.parentSession.create({
      data: {
        parentId,
        token,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Create email verification token
   */
  private async createEmailVerificationToken(parentId: string): Promise<string> {
    const token = await this.crypto.generateSecureToken(32);
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
    if (!/\d/.test(password)) {
      errors.push('Password must contain a number');
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors.join('. '));
    }
  }
}
