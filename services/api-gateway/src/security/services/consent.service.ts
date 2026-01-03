/**
 * Consent Service
 * Manages user consent for COPPA, FERPA, and GDPR compliance
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { ConsentPurpose, ConsentStatus, ConsentType, ConsentRecord } from '../types';
import { COMPLIANCE } from '../constants';
import { AuditLogService } from './audit-log.service';
import { randomUUID } from 'crypto';

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
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);
  private readonly prisma: PrismaClient;
  
  constructor(
    private readonly configService: ConfigService,
    private readonly auditService: AuditLogService,
  ) {
    this.prisma = new PrismaClient();
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
      where: { userId, consentType },
      orderBy: { version: 'desc' },
    });
    
    const version = (existingConsent?.version || 0) + 1;
    
    const consent = await this.prisma.consent.create({
      data: {
        id: randomUUID(),
        userId,
        consentType,
        purposes,
        status: 'granted' as ConsentStatus,
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
      purposes: consent.purposes as ConsentPurpose[],
      status: consent.status as ConsentStatus,
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
        consentType,
        status: 'granted',
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
    const purposesToRevoke = purposes || (consent.purposes as ConsentPurpose[]);
    const remainingPurposes = (consent.purposes as ConsentPurpose[]).filter(
      p => !purposesToRevoke.includes(p)
    );
    
    if (remainingPurposes.length > 0) {
      // Partial revocation - create new consent with remaining purposes
      await this.prisma.consent.update({
        where: { id: consent.id },
        data: {
          status: 'revoked',
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
          status: 'revoked',
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
        status: { in: ['granted', 'expired'] },
      },
      orderBy: { version: 'desc' },
    });
    
    // Build map of purpose to consent
    const purposeConsents = new Map<ConsentPurpose, typeof consents[0]>();
    
    for (const consent of consents) {
      for (const purpose of consent.purposes as ConsentPurpose[]) {
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
      const isRevoked = consent.status === 'revoked';
      
      return {
        purpose,
        granted: consent.status === 'granted' && !isExpired,
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
        consentType,
        status: 'granted',
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
    
    const consentPurposes = consent.purposes as ConsentPurpose[];
    
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
      consentType: c.consentType as ConsentType,
      purposes: c.purposes as ConsentPurpose[],
      status: c.status as ConsentStatus,
      grantedBy: c.grantedBy,
      grantedAt: c.grantedAt,
      expiresAt: c.expiresAt || undefined,
      revokedAt: c.revokedAt || undefined,
      version: c.version,
    }));
  }
  
  /**
   * Process expiring consents (called by scheduled job)
   */
  async processExpiringConsents(): Promise<void> {
    const warningDays = 14;
    const warningDate = new Date(Date.now() + warningDays * 24 * 60 * 60 * 1000);
    
    const expiringConsents = await this.prisma.consent.findMany({
      where: {
        status: 'granted',
        expiresAt: {
          lte: warningDate,
          gt: new Date(),
        },
      },
    });
    
    // TODO: Send renewal reminders
    this.logger.log('Found expiring consents', { count: expiringConsents.length });
  }
  
  async onModuleDestroy(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
