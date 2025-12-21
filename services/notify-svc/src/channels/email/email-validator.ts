/**
 * Email Validator
 *
 * Comprehensive email validation service including:
 * - RFC 5322 format validation
 * - MX record lookup
 * - Disposable email detection
 * - Role-based email detection
 * - Common typo detection and suggestions
 */

import { resolve } from 'node:dns/promises';

import type { EmailValidationResult } from './types.js';

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATION CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * RFC 5322 compliant email regex (simplified but effective)
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Known disposable email domains
 */
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'mailinator.com',
  'mailinator2.com',
  'maildrop.cc',
  'tempmail.com',
  'tempmail.net',
  'temp-mail.org',
  'throwaway.email',
  'throwawaymail.com',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'dispostable.com',
  'yopmail.com',
  'yopmail.fr',
  'nada.email',
  'getnada.com',
  'tmpmail.org',
  'tmpmail.net',
  'emailondeck.com',
  'burnermail.io',
  'trashmail.com',
  'trashmail.net',
  'mohmal.com',
  'mohmal.tech',
  'discard.email',
  'minuteinbox.com',
  'tempr.email',
  'spamgourmet.com',
  'mytemp.email',
  'mailnesia.com',
  'mailsac.com',
  'incognitomail.com',
  'dropmail.me',
  'mailcatch.com',
  'getairmail.com',
  'inboxkitten.com',
]);

/**
 * Role-based email prefixes that should be handled carefully
 */
const ROLE_BASED_PREFIXES = new Set([
  'admin',
  'administrator',
  'webmaster',
  'postmaster',
  'hostmaster',
  'abuse',
  'noreply',
  'no-reply',
  'noreply',
  'donotreply',
  'do-not-reply',
  'info',
  'support',
  'sales',
  'marketing',
  'billing',
  'contact',
  'help',
  'service',
  'customerservice',
  'customer-service',
  'feedback',
  'press',
  'media',
  'hr',
  'jobs',
  'careers',
  'recruit',
  'recruitment',
  'legal',
  'privacy',
  'security',
  'office',
  'team',
  'staff',
  'hello',
  'enquiries',
  'enquiry',
  'inquiries',
  'inquiry',
  'general',
  'mail',
  'email',
  'root',
  'mailer-daemon',
  'mailer',
  'daemon',
  'listserv',
  'list',
  'subscribe',
  'unsubscribe',
  'remove',
  'request',
  'bounces',
  'bounce',
  'ftp',
  'www',
  'uucp',
  'news',
  'usenet',
  'all',
  'everyone',
]);

/**
 * Common domain typos and their corrections
 */
const DOMAIN_TYPO_CORRECTIONS: Record<string, string> = {
  // Gmail
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  'gail.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmailcom': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.cpm': 'gmail.com',
  'gmail.xom': 'gmail.com',
  'gmail.vom': 'gmail.com',
  'gmail.comm': 'gmail.com',
  'hmail.com': 'gmail.com',
  // Yahoo
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.cm': 'yahoo.com',
  'yhaoo.com': 'yahoo.com',
  'yaoo.com': 'yahoo.com',
  'yhoo.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  // Hotmail
  'hotmal.com': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'hotmaill.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'htmail.com': 'hotmail.com',
  'htomail.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  // Outlook
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlooK.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outloook.com': 'outlook.com',
  // iCloud
  'iclod.com': 'icloud.com',
  'icoud.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  // AOL
  'aoll.com': 'aol.com',
  'aol.co': 'aol.com',
  // Live
  'live.co': 'live.com',
  'liv.com': 'live.com',
};

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL VALIDATOR CLASS
// ══════════════════════════════════════════════════════════════════════════════

interface ValidationOptions {
  checkMx?: boolean;
  checkDisposable?: boolean;
  checkRoleBased?: boolean;
  suggestCorrection?: boolean;
  mxTimeout?: number;
}

const DEFAULT_OPTIONS: ValidationOptions = {
  checkMx: true,
  checkDisposable: true,
  checkRoleBased: true,
  suggestCorrection: true,
  mxTimeout: 5000,
};

class EmailValidator {
  private mxCache = new Map<string, { valid: boolean; timestamp: number }>();
  private readonly MX_CACHE_TTL = 3600000; // 1 hour

  /**
   * Validate an email address
   */
  async validate(
    email: string,
    options: ValidationOptions = {}
  ): Promise<EmailValidationResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const normalizedEmail = this.normalizeEmail(email);

    // Basic format check
    const formatResult = this.checkFormat(normalizedEmail);
    if (!formatResult.isValid) {
      return formatResult;
    }

    const [localPart, domain] = normalizedEmail.split('@');

    // Guard against malformed emails (should not happen after format check)
    if (!localPart || !domain) {
      return {
        isValid: false,
        email: normalizedEmail,
        reason: 'Invalid email format',
        isDisposable: false,
        isRoleBased: false,
        isSuppressed: false,
        hasMxRecord: false,
      };
    }

    // Check for typos and suggest corrections
    if (opts.suggestCorrection) {
      const suggestion = this.suggestCorrection(domain);
      if (suggestion) {
        return {
          isValid: false,
          email: normalizedEmail,
          domain,
          reason: `Did you mean ${localPart}@${suggestion}?`,
          suggestion: `${localPart}@${suggestion}`,
        };
      }
    }

    // Check for disposable email
    if (opts.checkDisposable) {
      if (this.isDisposable(domain)) {
        return {
          isValid: false,
          email: normalizedEmail,
          domain,
          reason: 'Disposable email addresses are not allowed',
          isDisposable: true,
        };
      }
    }

    // Check for role-based email
    if (opts.checkRoleBased) {
      if (this.isRoleBased(localPart)) {
        return {
          isValid: false,
          email: normalizedEmail,
          domain,
          reason: 'Role-based email addresses are not recommended',
          isRoleBased: true,
        };
      }
    }

    // Check MX records
    if (opts.checkMx) {
      const mxValid = await this.checkMxRecord(domain, opts.mxTimeout);
      if (!mxValid) {
        return {
          isValid: false,
          email: normalizedEmail,
          domain,
          reason: 'Domain does not have valid mail servers',
          mxValid: false,
        };
      }
    }

    return {
      isValid: true,
      email: normalizedEmail,
      domain,
      mxValid: opts.checkMx ? true : undefined,
      isDisposable: false,
      isRoleBased: false,
    };
  }

  /**
   * Quick format validation (no DNS checks)
   */
  validateFormat(email: string): EmailValidationResult {
    const normalizedEmail = this.normalizeEmail(email);
    return this.checkFormat(normalizedEmail);
  }

  /**
   * Check if domain is disposable
   */
  isDisposable(domain: string): boolean {
    return DISPOSABLE_DOMAINS.has(domain.toLowerCase());
  }

  /**
   * Check if email is role-based
   */
  isRoleBased(localPart: string): boolean {
    return ROLE_BASED_PREFIXES.has(localPart.toLowerCase());
  }

  /**
   * Get typo correction suggestion
   */
  suggestCorrection(domain: string): string | null {
    const lowerDomain = domain.toLowerCase();
    return DOMAIN_TYPO_CORRECTIONS[lowerDomain] || null;
  }

  /**
   * Normalize email address
   */
  normalizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // Trim and lowercase
    let normalized = email.trim().toLowerCase();

    // Remove any null bytes or control characters
    // eslint-disable-next-line no-control-regex
    normalized = normalized.replace(/[\x00-\x1F\x7F]/g, '');

    return normalized;
  }

  /**
   * Batch validate emails
   */
  async validateBatch(
    emails: string[],
    options: ValidationOptions = {}
  ): Promise<Map<string, EmailValidationResult>> {
    const results = new Map<string, EmailValidationResult>();

    // Group by domain for efficient MX checking
    const byDomain = new Map<string, string[]>();

    for (const email of emails) {
      const normalized = this.normalizeEmail(email);
      const formatResult = this.checkFormat(normalized);

      if (!formatResult.isValid) {
        results.set(email, formatResult);
        continue;
      }

      const domain = normalized.split('@')[1];
      if (!domain) {
        results.set(email, {
          isValid: false,
          email: normalized,
          reason: 'Invalid email format',
          isDisposable: false,
          isRoleBased: false,
          isSuppressed: false,
          hasMxRecord: false,
        });
        continue;
      }
      const list = byDomain.get(domain) || [];
      list.push(email);
      byDomain.set(domain, list);
    }

    // Check MX for each unique domain once
    const mxResults = new Map<string, boolean>();
    if (options.checkMx !== false) {
      for (const domain of byDomain.keys()) {
        mxResults.set(domain, await this.checkMxRecord(domain, options.mxTimeout));
      }
    }

    // Now validate each email
    for (const [domain, emailList] of byDomain.entries()) {
      for (const email of emailList) {
        const result = await this.validate(email, {
          ...options,
          checkMx: false, // Already checked
        });

        // Add MX result
        if (result.isValid && options.checkMx !== false) {
          const mxValid = mxResults.get(domain);
          if (!mxValid) {
            results.set(email, {
              ...result,
              isValid: false,
              reason: 'Domain does not have valid mail servers',
              mxValid: false,
            });
            continue;
          }
          result.mxValid = true;
        }

        results.set(email, result);
      }
    }

    return results;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE METHODS
  // ════════════════════════════════════════════════════════════════════════════

  private checkFormat(email: string): EmailValidationResult {
    // Empty check
    if (!email) {
      return {
        isValid: false,
        email: '',
        domain: '',
        reason: 'Email address is required',
      };
    }

    // Length check
    if (email.length > 254) {
      return {
        isValid: false,
        email,
        domain: '',
        reason: 'Email address is too long (max 254 characters)',
      };
    }

    // @ symbol check
    if (!email.includes('@')) {
      return {
        isValid: false,
        email,
        domain: '',
        reason: 'Email address must contain @ symbol',
      };
    }

    const parts = email.split('@');
    if (parts.length !== 2) {
      return {
        isValid: false,
        email,
        domain: '',
        reason: 'Email address has invalid format',
      };
    }

    const [localPart, domain] = parts;

    // Local part checks
    if (!localPart) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Email address must have a local part before @',
      };
    }

    if (localPart.length > 64) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Local part is too long (max 64 characters)',
      };
    }

    // Domain checks
    if (!domain) {
      return {
        isValid: false,
        email,
        domain: '',
        reason: 'Email address must have a domain after @',
      };
    }

    if (domain.length > 253) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Domain is too long (max 253 characters)',
      };
    }

    // Must have at least one dot in domain
    if (!domain.includes('.')) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Domain must contain a dot',
      };
    }

    // TLD check (at least 2 characters)
    const tld = domain.split('.').pop() || '';
    if (tld.length < 2) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Invalid top-level domain',
      };
    }

    // Regex check
    if (!EMAIL_REGEX.test(email)) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Email address has invalid format',
      };
    }

    // Consecutive dots check
    if (email.includes('..')) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Email address cannot contain consecutive dots',
      };
    }

    // Leading/trailing dots in local part
    if (localPart.startsWith('.') || localPart.endsWith('.')) {
      return {
        isValid: false,
        email,
        domain,
        reason: 'Local part cannot start or end with a dot',
      };
    }

    return {
      isValid: true,
      email,
      domain,
    };
  }

  private async checkMxRecord(domain: string, timeout = 5000): Promise<boolean> {
    // Check cache first
    const cached = this.mxCache.get(domain);
    if (cached && Date.now() - cached.timestamp < this.MX_CACHE_TTL) {
      return cached.valid;
    }

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('MX lookup timeout')), timeout);
      });

      const mxRecords = await Promise.race([resolve(domain, 'MX'), timeoutPromise]);

      const valid = Array.isArray(mxRecords) && mxRecords.length > 0;

      // Cache result
      this.mxCache.set(domain, { valid, timestamp: Date.now() });

      return valid;
    } catch (error) {
      // If MX lookup fails, try A record as fallback
      try {
        const aRecords = await Promise.race([resolve(domain, 'A'), 
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('A lookup timeout')), timeout);
          })
        ]);

        const valid = Array.isArray(aRecords) && aRecords.length > 0;
        this.mxCache.set(domain, { valid, timestamp: Date.now() });
        return valid;
      } catch {
        // Cache negative result
        this.mxCache.set(domain, { valid: false, timestamp: Date.now() });
        return false;
      }
    }
  }

  /**
   * Clear MX cache
   */
  clearCache(): void {
    this.mxCache.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

export const emailValidator = new EmailValidator();

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export function validateEmail(
  email: string,
  options?: ValidationOptions
): Promise<EmailValidationResult> {
  return emailValidator.validate(email, options);
}

export function validateEmailFormat(email: string): EmailValidationResult {
  return emailValidator.validateFormat(email);
}

export function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1];
  return domain ? emailValidator.isDisposable(domain) : false;
}

export function isRoleBasedEmail(email: string): boolean {
  const localPart = email.split('@')[0];
  return localPart ? emailValidator.isRoleBased(localPart) : false;
}

export function normalizeEmail(email: string): string {
  return emailValidator.normalizeEmail(email);
}
