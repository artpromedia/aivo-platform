/**
 * Consent Service
 * Manages user consent for COPPA, FERPA, and GDPR compliance
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentPurpose, ConsentStatus, ConsentType, ConsentRecord } from '../types';
import { COMPLIANCE } from '../constants';
import { AuditLogService } from './audit-log.service';
import { randomUUID } from 'node:crypto';
import { firstValueFrom } from 'rxjs';

interface ConsentRenewalNotification {
  userId: string;
  email: string;
  consentType: ConsentType;
  expiresAt: Date;
  renewalUrl: string;
}

export interface ConsentVerificationResult {
  purpose: ConsentPurpose;
  granted: boolean;
  expired: boolean;
  revoked: boolean;
  consentId?: string;
  grantedAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class ConsentService implements OnModuleDestroy {
  private readonly logger = new Logger(ConsentService.name);
  private readonly notifyServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditLogService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.notifyServiceUrl = this.configService.get<string>('NOTIFY_SERVICE_URL', 'http://notify-svc:3000');
  }
  
  /**
   * Grant consent for specific purposes
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    purposes: ConsentPurpose[],
    grantedBy: string,
    metadata?: {
      ip?: string;
      userAgent?: string;
      correlationId?: string;
    }
  ): Promise<ConsentRecord> {
    const now = new Date();
    const expiryDays = COMPLIANCE.CONSENT_EXPIRY_DAYS[consentType.toUpperCase() as keyof typeof COMPLIANCE.CONSENT_EXPIRY_DAYS] 
      || COMPLIANCE.CONSENT_EXPIRY_DAYS.USER;
    const expiresAt = new Date(now.getTime() + expiryDays * 24 * 60 * 60 * 1000);
    
    // Get current version for this user/type
    const existingConsent = await this.prisma.consent.findFirst({
      where: { userId, consentType: consentType as any },
      orderBy: { version: 'desc' },
    });
    
    const version = (existingConsent?.version || 0) + 1;
    
    const consent = await this.prisma.consent.create({
      data: {
        id: randomUUID(),
        userId,
        consentType: consentType as any,
        purposes: purposes as any,
        status: 'granted' as any,
        grantedBy,
        grantedAt: now,
        expiresAt,
        version,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
    
    // Log consent grant
    if (metadata?.correlationId) {
      await this.auditService.logConsent('granted', userId, {
        consentType,
        purposes,
        ip: metadata.ip || 'unknown',
        correlationId: metadata.correlationId,
      });
    }
    
    this.logger.log('Consent granted', { userId, consentType, purposes });
    
    return {
      id: consent.id,
      userId: consent.userId,
      consentType: consent.consentType as ConsentType,
      purposes: consent.purposes as unknown as ConsentPurpose[],
      status: consent.status as unknown as ConsentStatus,
      grantedBy: consent.grantedBy,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt || undefined,
      version: consent.version,
    };
  }
  
  /**
   * Revoke consent
   */
  async revokeConsent(
    userId: string,
    consentType: ConsentType,
    purposes?: ConsentPurpose[],
    metadata?: {
      ip?: string;
      correlationId?: string;
    }
  ): Promise<void> {
    const now = new Date();
    
    // Find active consent
    const consent = await this.prisma.consent.findFirst({
      where: {
        userId,
        consentType: consentType as any,
        status: 'granted' as any,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { version: 'desc' },
    });
    
    if (!consent) {
      this.logger.warn('No active consent found to revoke', { userId, consentType });
      return;
    }
    
    // Determine which purposes to revoke
    const purposesToRevoke = purposes || (consent.purposes as unknown as ConsentPurpose[]);
    const remainingPurposes = (consent.purposes as unknown as ConsentPurpose[]).filter(
      p => !purposesToRevoke.includes(p)
    );
    
    if (remainingPurposes.length > 0) {
      // Partial revocation - create new consent with remaining purposes
      await this.prisma.consent.update({
        where: { id: consent.id },
        data: {
          status: 'revoked' as any,
          revokedAt: now,
        },
      });
      
      await this.grantConsent(
        userId,
        consentType,
        remainingPurposes,
        consent.grantedBy,
        metadata
      );
    } else {
      // Full revocation
      await this.prisma.consent.update({
        where: { id: consent.id },
        data: {
          status: 'revoked' as any,
          revokedAt: now,
        },
      });
    }
    
    // Log consent revocation
    if (metadata?.correlationId) {
      await this.auditService.logConsent('revoked', userId, {
        consentType,
        purposes: purposesToRevoke,
        ip: metadata.ip || 'unknown',
        correlationId: metadata.correlationId,
      });
    }
    
    this.logger.log('Consent revoked', { userId, consentType, purposes: purposesToRevoke });
  }
  
  /**
   * Verify consent for specific purposes
   */
  async verifyConsents(
    userId: string,
    purposes: ConsentPurpose[]
  ): Promise<ConsentVerificationResult[]> {
    const now = new Date();
    
    // Get all active consents for user
    const consents = await this.prisma.consent.findMany({
      where: {
        userId,
        status: { in: ['granted', 'expired'] as any },
      },
      orderBy: { version: 'desc' },
    });
    
    // Build map of purpose to consent
    const purposeConsents = new Map<ConsentPurpose, typeof consents[0]>();
    
    for (const consent of consents) {
      for (const purpose of consent.purposes as unknown as ConsentPurpose[]) {
        if (!purposeConsents.has(purpose)) {
          purposeConsents.set(purpose, consent);
        }
      }
    }
    
    // Verify each required purpose
    return purposes.map(purpose => {
      const consent = purposeConsents.get(purpose);
      
      if (!consent) {
        return {
          purpose,
          granted: false,
          expired: false,
          revoked: false,
        };
      }
      
      const isExpired = consent.expiresAt ? consent.expiresAt < now : false;
      const isRevoked = (consent.status as string) === 'revoked';
      
      return {
        purpose,
        granted: (consent.status as string) === 'granted' && !isExpired,
        expired: isExpired,
        revoked: isRevoked,
        consentId: consent.id,
        grantedAt: consent.grantedAt,
        expiresAt: consent.expiresAt || undefined,
      };
    });
  }
  
  /**
   * Check if parental consent exists for a minor
   */
  async hasParentalConsent(
    userId: string,
    purposes: ConsentPurpose[]
  ): Promise<boolean> {
    const verifications = await this.verifyConsentsOfType(
      userId,
      'parental',
      purposes
    );
    
    return verifications.every(v => v.granted);
  }
  
  /**
   * Verify consents of a specific type
   */
  async verifyConsentsOfType(
    userId: string,
    consentType: ConsentType,
    purposes: ConsentPurpose[]
  ): Promise<ConsentVerificationResult[]> {
    const now = new Date();
    
    const consent = await this.prisma.consent.findFirst({
      where: {
        userId,
        consentType: consentType as any,
        status: 'granted' as any,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } },
        ],
      },
      orderBy: { version: 'desc' },
    });
    
    if (!consent) {
      return purposes.map(purpose => ({
        purpose,
        granted: false,
        expired: false,
        revoked: false,
      }));
    }
    
    const consentPurposes = consent.purposes as unknown as ConsentPurpose[];
    
    return purposes.map(purpose => ({
      purpose,
      granted: consentPurposes.includes(purpose),
      expired: false,
      revoked: false,
      consentId: consent.id,
      grantedAt: consent.grantedAt,
      expiresAt: consent.expiresAt || undefined,
    }));
  }
  
  /**
   * Get all consents for a user (for privacy dashboard)
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const consents = await this.prisma.consent.findMany({
      where: { userId },
      orderBy: { grantedAt: 'desc' },
    });
    
    return consents.map(c => ({
      id: c.id,
      userId: c.userId,
      consentType: c.consentType as unknown as ConsentType,
      purposes: c.purposes as unknown as ConsentPurpose[],
      status: c.status as unknown as ConsentStatus,
      grantedBy: c.grantedBy,
      grantedAt: c.grantedAt,
      expiresAt: c.expiresAt || undefined,
      revokedAt: c.revokedAt || undefined,
      version: c.version,
    }));
  }
  
  /**
   * Process expiring consents (called by scheduled job)
   * Sends FERPA/COPPA compliant renewal reminders to users with expiring consents.
   *
   * Reminder schedule:
   * - 14 days before expiration: First reminder
   * - 7 days before expiration: Second reminder
   * - 3 days before expiration: Final reminder
   */
  async processExpiringConsents(): Promise<void> {
    const now = new Date();
    const reminderWindows = [
      { days: 14, type: 'first' },
      { days: 7, type: 'second' },
      { days: 3, type: 'final' },
    ];

    for (const window of reminderWindows) {
      const windowStart = new Date(now.getTime() + (window.days - 1) * 24 * 60 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + window.days * 24 * 60 * 60 * 1000);

      const expiringConsents = await this.prisma.consent.findMany({
        where: {
          status: 'granted' as any,
          expiresAt: {
            gte: windowStart,
            lt: windowEnd,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              tenantId: true,
            },
          },
        },
      });

      this.logger.log(`Found expiring consents for ${window.type} reminder`, {
        count: expiringConsents.length,
        windowDays: window.days,
      });

      // Send renewal reminders for each consent
      for (const consent of expiringConsents) {
        try {
          await this.sendConsentRenewalReminder({
            userId: consent.userId,
            email: (consent as any).user?.email || '',
            consentType: consent.consentType as ConsentType,
            expiresAt: consent.expiresAt!,
            renewalUrl: this.buildRenewalUrl(consent.userId, consent.consentType),
          }, window.type as 'first' | 'second' | 'final');

          this.logger.log('Sent consent renewal reminder', {
            userId: consent.userId,
            consentType: consent.consentType,
            reminderType: window.type,
          });
        } catch (error) {
          this.logger.error('Failed to send consent renewal reminder', {
            userId: consent.userId,
            consentType: consent.consentType,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  /**
   * Send a consent renewal reminder email via the notification service.
   * Email content is FERPA/COPPA compliant with clear renewal instructions.
   */
  private async sendConsentRenewalReminder(
    notification: ConsentRenewalNotification,
    reminderType: 'first' | 'second' | 'final'
  ): Promise<void> {
    if (!notification.email) {
      this.logger.warn('Cannot send renewal reminder - no email address', {
        userId: notification.userId,
      });
      return;
    }

    const daysUntilExpiry = Math.ceil(
      (notification.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    const complianceType = notification.consentType === 'parental'
      ? 'COPPA parental consent'
      : 'FERPA consent';

    const urgencyLevel = reminderType === 'final' ? 'high' : 'normal';

    const emailPayload = {
      templateName: 'consent-renewal-reminder',
      to: notification.email,
      context: {
        consentType: notification.consentType,
        complianceType,
        daysUntilExpiry,
        expiresAt: notification.expiresAt.toISOString(),
        renewalUrl: notification.renewalUrl,
        reminderType,
        urgencyLevel,
        // FERPA/COPPA required information
        legalNotice: this.getComplianceLegalNotice(notification.consentType),
      },
      category: 'consent',
      tags: ['consent-renewal', `reminder-${reminderType}`, notification.consentType],
      priority: urgencyLevel,
    };

    try {
      await firstValueFrom(
        this.httpService.post(`${this.notifyServiceUrl}/api/v1/email/send`, emailPayload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Service-Name': 'consent-service',
          },
          timeout: 10000,
        })
      );
    } catch (error) {
      // Log but don't throw - we don't want to fail the entire batch
      this.logger.error('Notification service request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: notification.userId,
      });
      throw error;
    }
  }

  /**
   * Build the consent renewal URL for a user
   */
  private buildRenewalUrl(userId: string, consentType: string): string {
    const baseUrl = this.configService.get<string>('APP_BASE_URL', 'https://app.aivolearning.com');
    return `${baseUrl}/settings/consent/renew?type=${encodeURIComponent(consentType)}&userId=${encodeURIComponent(userId)}`;
  }

  /**
   * Get compliance-specific legal notice for the renewal email
   */
  private getComplianceLegalNotice(consentType: ConsentType): string {
    if (consentType === 'parental') {
      return `This notice is required under the Children's Online Privacy Protection Act (COPPA). ` +
        `As a parent or legal guardian, your consent is required for your child to continue using AIVO. ` +
        `If consent is not renewed before the expiration date, your child's access to personalized ` +
        `learning features will be limited.`;
    }

    return `This notice is provided in accordance with the Family Educational Rights and Privacy Act (FERPA). ` +
      `Your consent allows AIVO to collect and process educational records for personalized learning. ` +
      `If consent is not renewed before the expiration date, certain features that require access to ` +
      `educational records may become unavailable.`;
  }
  
  async onModuleDestroy(): Promise<void> {
    // PrismaService handles its own cleanup via NestJS lifecycle
  }
}
