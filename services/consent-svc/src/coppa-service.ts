import { createHash, randomBytes } from 'node:crypto';

import type { Pool } from 'pg';

import { buildTransition } from './fsm.js';
import {
  applyTransition,
  createConsent,
  createConsentLink,
  createVerificationMethod,
  getActiveConsentLink,
  getConsentById,
  getConsentLinkByToken,
  getTenantCoppaSettings,
  getVerificationForConsent,
  incrementResendCount,
  listConsentsForLearner,
  markConsentLinkUsed,
  updateVerificationStatus,
} from './repository.js';
import type {
  Consent,
  ConsentSource,
  ConsentType,
  ParentalConsentLink,
  TenantCoppaSettings,
  VerificationEvidence,
  VerificationMethod,
} from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// COPPA PARENTAL CONSENT SERVICE
// ════════════════════════════════════════════════════════════════════════════════
// Implements the COPPA parental consent flow including:
// - Secure consent link generation and validation
// - Email-based consent requests
// - Verifiable parental consent methods (credit card, signed form, etc.)
// - Link expiration and resend logic

export interface CoppaServiceOptions {
  pool: Pool;
  /** Base URL for consent links (e.g., https://app.aivolearning.com) */
  baseUrl: string;
  /** Email service for sending consent requests */
  sendEmail: (params: EmailParams) => Promise<void>;
}

export interface EmailParams {
  to: string;
  subject: string;
  templateId: string;
  templateData: Record<string, unknown>;
}

export interface InitiateConsentResult {
  consent: Consent;
  link: ParentalConsentLink;
  emailSent: boolean;
}

export interface VerifyConsentResult {
  consent: Consent;
  verification: VerificationMethod;
  linkUsed: ParentalConsentLink;
}

export interface ConsentLinkValidation {
  valid: boolean;
  reason?: string;
  consent?: Consent;
  link?: ParentalConsentLink;
  settings?: TenantCoppaSettings;
}

export class CoppaConsentService {
  private readonly pool: Pool;
  private readonly baseUrl: string;
  private readonly sendEmail: (params: EmailParams) => Promise<void>;

  constructor(options: CoppaServiceOptions) {
    this.pool = options.pool;
    this.baseUrl = options.baseUrl;
    this.sendEmail = options.sendEmail;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CONSENT INITIATION
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate COPPA consent flow for a child under 13
   * Creates a PENDING consent record and sends email to parent
   */
  async initiateParentalConsent(params: {
    tenantId: string;
    learnerId: string;
    parentEmail: string;
    consentType: ConsentType;
    learnerName: string;
    source?: ConsentSource;
    requestedByIp?: string;
    requestedByUserAgent?: string;
  }): Promise<InitiateConsentResult> {
    const settings = await getTenantCoppaSettings(this.pool, params.tenantId);

    // Create or get existing PENDING consent
    const consent = await createConsent(this.pool, {
      tenantId: params.tenantId,
      learnerId: params.learnerId,
      consentType: params.consentType,
      status: 'PENDING',
      source: params.source ?? 'SYSTEM',
    });

    // Check for existing active link
    const existingLink = await getActiveConsentLink(this.pool, consent.id);
    if (existingLink) {
      // Don't create new link if one is active
      return {
        consent,
        link: existingLink,
        emailSent: false,
      };
    }

    // Generate secure token
    const { token, tokenHash } = this.generateSecureToken();

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + settings.consent_link_expiry_hours);

    // Create consent link
    const link = await createConsentLink(this.pool, {
      tenantId: params.tenantId,
      learnerId: params.learnerId,
      parentEmail: params.parentEmail,
      consentId: consent.id,
      tokenHash,
      expiresAt,
      requestedByIp: params.requestedByIp ?? null,
      requestedByUserAgent: params.requestedByUserAgent ?? null,
    });

    // Send email
    const consentUrl = `${this.baseUrl}/consent/verify?token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: params.parentEmail,
      subject: `Parental Consent Required for ${params.learnerName}`,
      templateId: 'coppa-consent-request',
      templateData: {
        learnerName: params.learnerName,
        consentType: this.getConsentTypeDescription(params.consentType),
        consentUrl,
        expiresInHours: settings.consent_link_expiry_hours,
        supportEmail: 'support@aivolearning.com',
      },
    });

    return {
      consent,
      link,
      emailSent: true,
    };
  }

  /**
   * Resend consent email if under max attempts
   */
  async resendConsentEmail(params: {
    consentId: string;
    tenantId: string;
    parentEmail: string;
    learnerName: string;
    requestedByIp?: string;
    requestedByUserAgent?: string;
  }): Promise<{ success: boolean; reason?: string; link?: ParentalConsentLink }> {
    const settings = await getTenantCoppaSettings(this.pool, params.tenantId);
    const consent = await getConsentById(this.pool, params.consentId, params.tenantId);

    if (!consent) {
      return { success: false, reason: 'Consent not found' };
    }

    if (consent.status !== 'PENDING') {
      return { success: false, reason: `Consent is already ${consent.status}` };
    }

    const existingLink = await getActiveConsentLink(this.pool, consent.id);

    if (existingLink && existingLink.resend_count >= settings.max_resend_attempts) {
      return {
        success: false,
        reason: `Maximum resend attempts (${settings.max_resend_attempts}) reached`,
      };
    }

    // Generate new token if no active link or create fresh link
    let link: ParentalConsentLink;
    let token: string;

    if (existingLink) {
      // Increment resend count on existing link
      const updated = await incrementResendCount(this.pool, consent.id);
      if (!updated) {
        return { success: false, reason: 'Failed to update resend count' };
      }
      link = updated;
      // Generate new token for security (old token still works until expiry)
      const generated = this.generateSecureToken();
      token = generated.token;
    } else {
      // Create new link
      const generated = this.generateSecureToken();
      token = generated.token;

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + settings.consent_link_expiry_hours);

      link = await createConsentLink(this.pool, {
        tenantId: params.tenantId,
        learnerId: consent.learner_id,
        parentEmail: params.parentEmail,
        consentId: consent.id,
        tokenHash: generated.tokenHash,
        expiresAt,
        requestedByIp: params.requestedByIp ?? null,
        requestedByUserAgent: params.requestedByUserAgent ?? null,
      });
    }

    // Send email
    const consentUrl = `${this.baseUrl}/consent/verify?token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: params.parentEmail,
      subject: `Reminder: Parental Consent Required for ${params.learnerName}`,
      templateId: 'coppa-consent-reminder',
      templateData: {
        learnerName: params.learnerName,
        consentType: this.getConsentTypeDescription(consent.consent_type),
        consentUrl,
        expiresInHours: settings.consent_link_expiry_hours,
        supportEmail: 'support@aivolearning.com',
      },
    });

    return { success: true, link };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CONSENT LINK VALIDATION
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Validate a consent link token
   */
  async validateConsentLink(token: string): Promise<ConsentLinkValidation> {
    const tokenHash = this.hashToken(token);
    const link = await getConsentLinkByToken(this.pool, tokenHash);

    if (!link) {
      return { valid: false, reason: 'Invalid or expired consent link' };
    }

    if (link.used_at) {
      return { valid: false, reason: 'This consent link has already been used' };
    }

    if (link.expires_at < new Date()) {
      return { valid: false, reason: 'This consent link has expired' };
    }

    const consent = await getConsentById(this.pool, link.consent_id, link.tenant_id);
    if (!consent) {
      return { valid: false, reason: 'Consent record not found' };
    }

    if (consent.status !== 'PENDING') {
      return { valid: false, reason: `Consent is already ${consent.status}` };
    }

    const settings = await getTenantCoppaSettings(this.pool, link.tenant_id);

    return {
      valid: true,
      consent,
      link,
      settings,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // VERIFIABLE CONSENT METHODS
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Initiate credit card micro-charge verification
   * Returns a charge ID that the payment processor will use
   */
  async initiateCreditCardVerification(params: {
    consentId: string;
    tenantId: string;
    parentUserId: string;
    cardToken: string;
    last4: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<VerificationMethod> {
    // Verify this method is allowed
    const settings = await getTenantCoppaSettings(this.pool, params.tenantId);
    if (!settings.allowed_verification_methods.includes('CREDIT_CARD_MICRO_CHARGE')) {
      throw new Error('Credit card verification is not enabled for this tenant');
    }

    // Generate charge ID (actual charge handled by payment service)
    const chargeId = `chg_${randomBytes(16).toString('hex')}`;

    const evidence: VerificationEvidence = {
      type: 'CREDIT_CARD_MICRO_CHARGE',
      last4: params.last4,
      chargeId,
      tokenRef: params.cardToken, // Tokenized, never raw PAN
      amountCents: 50, // $0.50 micro-charge
      refunded: false,
    };

    return createVerificationMethod(this.pool, {
      consentId: params.consentId,
      tenantId: params.tenantId,
      parentUserId: params.parentUserId,
      methodType: 'CREDIT_CARD_MICRO_CHARGE',
      evidence,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  }

  /**
   * Complete credit card verification after charge is confirmed
   */
  async completeCreditCardVerification(params: {
    verificationId: string;
    tenantId: string;
    chargeConfirmed: boolean;
    refundedAt?: string;
  }): Promise<VerificationMethod> {
    if (!params.chargeConfirmed) {
      return updateVerificationStatus(this.pool, params.verificationId, params.tenantId, 'FAILED');
    }

    return updateVerificationStatus(
      this.pool,
      params.verificationId,
      params.tenantId,
      'VERIFIED',
      { refunded: true, refundedAt: params.refundedAt ?? new Date().toISOString() }
    );
  }

  /**
   * Initiate signed consent form verification
   */
  async initiateSignedFormVerification(params: {
    consentId: string;
    tenantId: string;
    parentUserId: string;
    documentHash: string;
    storageUri: string;
    fileName: string;
    mimeType: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<VerificationMethod> {
    const settings = await getTenantCoppaSettings(this.pool, params.tenantId);
    if (!settings.allowed_verification_methods.includes('SIGNED_CONSENT_FORM')) {
      throw new Error('Signed form verification is not enabled for this tenant');
    }

    const evidence: VerificationEvidence = {
      type: 'SIGNED_CONSENT_FORM',
      documentHash: params.documentHash,
      storageUri: params.storageUri,
      fileName: params.fileName,
      mimeType: params.mimeType,
      uploadedAt: new Date().toISOString(),
    };

    return createVerificationMethod(this.pool, {
      consentId: params.consentId,
      tenantId: params.tenantId,
      parentUserId: params.parentUserId,
      methodType: 'SIGNED_CONSENT_FORM',
      evidence,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });
  }

  /**
   * Complete signed form verification after manual review
   */
  async completeSignedFormVerification(params: {
    verificationId: string;
    tenantId: string;
    approved: boolean;
    reviewedBy: string;
  }): Promise<VerificationMethod> {
    return updateVerificationStatus(
      this.pool,
      params.verificationId,
      params.tenantId,
      params.approved ? 'VERIFIED' : 'FAILED'
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CONSENT GRANTING
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Grant consent after verification is complete
   */
  async grantVerifiedConsent(params: {
    token: string;
    verificationId: string;
    parentUserId: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<VerifyConsentResult> {
    // Validate link
    const validation = await this.validateConsentLink(params.token);
    if (!validation.valid || !validation.consent || !validation.link) {
      throw new Error(validation.reason ?? 'Invalid consent link');
    }

    const { consent, link } = validation;

    // Get and validate verification
    const verification = await getVerificationForConsent(this.pool, consent.id);
    if (!verification) {
      throw new Error('No verified consent method found');
    }

    if (verification.id !== params.verificationId) {
      throw new Error('Verification mismatch');
    }

    if (verification.status !== 'VERIFIED') {
      throw new Error(`Verification status is ${verification.status}, expected VERIFIED`);
    }

    // Calculate consent expiration (typically 1 year for COPPA)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Build and apply transition
    const transition = buildTransition(consent, 'GRANTED', {
      changedByUserId: params.parentUserId,
      grantedByParentId: params.parentUserId,
      reason: `Parental consent granted via ${verification.method_type}`,
      expiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      verificationMethodId: verification.id,
      metadata: {
        verificationMethod: verification.method_type,
        linkId: link.id,
      },
    });

    const updatedConsent = await applyTransition(this.pool, consent, transition);

    // Mark link as used
    const usedLink = await markConsentLinkUsed(this.pool, link.id);

    return {
      consent: updatedConsent,
      verification,
      linkUsed: usedLink,
    };
  }

  /**
   * Grant consent without verification (for non-COPPA cases or admin override)
   */
  async grantConsentDirect(params: {
    consentId: string;
    tenantId: string;
    parentUserId: string;
    reason: string;
    expiresAt?: Date;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Consent> {
    const consent = await getConsentById(this.pool, params.consentId, params.tenantId);
    if (!consent) {
      throw new Error('Consent not found');
    }

    const transition = buildTransition(consent, 'GRANTED', {
      changedByUserId: params.parentUserId,
      grantedByParentId: params.parentUserId,
      reason: params.reason,
      expiresAt: params.expiresAt,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });

    return applyTransition(this.pool, consent, transition);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CONSENT REVOCATION
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Revoke a previously granted consent
   */
  async revokeConsent(params: {
    consentId: string;
    tenantId: string;
    revokedByUserId: string;
    reason: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<Consent> {
    const consent = await getConsentById(this.pool, params.consentId, params.tenantId);
    if (!consent) {
      throw new Error('Consent not found');
    }

    const transition = buildTransition(consent, 'REVOKED', {
      changedByUserId: params.revokedByUserId,
      reason: params.reason,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
    });

    return applyTransition(this.pool, consent, transition);
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PARENT DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Get all consents for a parent's children
   */
  async getConsentsForParent(params: {
    tenantId: string;
    parentUserId: string;
    learnerIds: string[];
  }): Promise<Map<string, Consent[]>> {
    const result = new Map<string, Consent[]>();

    for (const learnerId of params.learnerIds) {
      const consents = await listConsentsForLearner(this.pool, params.tenantId, learnerId);
      result.set(learnerId, consents);
    }

    return result;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════════

  private generateSecureToken(): { token: string; tokenHash: string } {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    return { token, tokenHash };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getConsentTypeDescription(type: ConsentType): string {
    const descriptions: Record<ConsentType, string> = {
      BASELINE_ASSESSMENT:
        'Initial placement assessment to personalize your child\'s learning experience',
      DATA_PROCESSING: 'Processing of your child\'s learning data to provide the service',
      RESEARCH: 'Participation in educational research to improve learning outcomes',
      AI_TUTOR: 'Access to AI-powered tutoring and assistance',
      AI_PERSONALIZATION: 'AI-powered personalization of learning content and recommendations',
      MARKETING: 'Receiving marketing communications about educational products',
      THIRD_PARTY_SHARING: 'Sharing data with educational partners',
      BIOMETRIC_DATA: 'Collection of biometric data for enhanced features',
      VOICE_RECORDING: 'Recording voice interactions for learning activities',
    };
    return descriptions[type];
  }
}
