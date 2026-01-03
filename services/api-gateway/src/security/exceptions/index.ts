/**
 * Security Exceptions
 * Custom exception classes for security-related errors
 */

import { HttpException, HttpStatus } from '@nestjs/common';
import { SECURITY_ERROR_CODES } from '../constants';

// ============================================================================
// BASE SECURITY EXCEPTION
// ============================================================================

export class SecurityException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.FORBIDDEN,
    public readonly details?: Record<string, any>,
  ) {
    super(
      {
        statusCode: status,
        error: 'SecurityError',
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      status,
    );
  }
}

// ============================================================================
// AUTHENTICATION EXCEPTIONS
// ============================================================================

export class AuthenticationException extends SecurityException {
  constructor(
    code: string = SECURITY_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    message: string = 'Authentication failed',
    details?: Record<string, any>,
  ) {
    super(code, message, HttpStatus.UNAUTHORIZED, details);
  }
}

export class InvalidCredentialsException extends AuthenticationException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
    );
  }
}

export class TokenExpiredException extends AuthenticationException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.AUTH_TOKEN_EXPIRED,
      'Token has expired',
    );
  }
}

export class InvalidTokenException extends AuthenticationException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.AUTH_TOKEN_INVALID,
      'Invalid or malformed token',
    );
  }
}

export class MfaRequiredException extends AuthenticationException {
  constructor(challengeId?: string) {
    super(
      SECURITY_ERROR_CODES.AUTH_MFA_REQUIRED,
      'Multi-factor authentication required',
      { challengeId },
    );
  }
}

export class MfaFailedException extends AuthenticationException {
  constructor(attemptsRemaining?: number) {
    super(
      SECURITY_ERROR_CODES.AUTH_MFA_FAILED,
      'MFA verification failed',
      { attemptsRemaining },
    );
  }
}

export class AccountLockedException extends AuthenticationException {
  constructor(unlockTime?: Date) {
    super(
      SECURITY_ERROR_CODES.AUTH_ACCOUNT_LOCKED,
      'Account is temporarily locked due to too many failed attempts',
      { unlockTime: unlockTime?.toISOString() },
    );
  }
}

export class SessionExpiredException extends AuthenticationException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.AUTH_SESSION_EXPIRED,
      'Session has expired. Please log in again.',
    );
  }
}

// ============================================================================
// AUTHORIZATION EXCEPTIONS
// ============================================================================

export class AuthorizationException extends SecurityException {
  constructor(
    code: string = SECURITY_ERROR_CODES.AUTHZ_FORBIDDEN,
    message: string = 'Access denied',
    details?: Record<string, any>,
  ) {
    super(code, message, HttpStatus.FORBIDDEN, details);
  }
}

export class ForbiddenException extends AuthorizationException {
  constructor(resource?: string) {
    super(
      SECURITY_ERROR_CODES.AUTHZ_FORBIDDEN,
      resource ? `Access to ${resource} is forbidden` : 'Access denied',
      { resource },
    );
  }
}

export class InsufficientPermissionsException extends AuthorizationException {
  constructor(requiredPermissions: string[]) {
    super(
      SECURITY_ERROR_CODES.AUTHZ_INSUFFICIENT_PERMISSIONS,
      'Insufficient permissions to perform this action',
      { requiredPermissions },
    );
  }
}

export class TenantMismatchException extends AuthorizationException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.AUTHZ_TENANT_MISMATCH,
      'Resource belongs to a different organization',
    );
  }
}

// ============================================================================
// CONSENT EXCEPTIONS
// ============================================================================

export class ConsentException extends SecurityException {
  constructor(
    code: string,
    message: string,
    details?: Record<string, any>,
  ) {
    super(code, message, HttpStatus.FORBIDDEN, details);
  }
}

export class ConsentRequiredException extends ConsentException {
  constructor(purposes: string[]) {
    super(
      SECURITY_ERROR_CODES.CONSENT_REQUIRED,
      'User consent is required to proceed',
      { purposes },
    );
  }
}

export class ConsentExpiredException extends ConsentException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.CONSENT_EXPIRED,
      'Consent has expired and must be renewed',
    );
  }
}

export class ConsentRevokedException extends ConsentException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.CONSENT_REVOKED,
      'Consent has been revoked',
    );
  }
}

export class ParentalConsentRequiredException extends ConsentException {
  constructor() {
    super(
      SECURITY_ERROR_CODES.PARENTAL_CONSENT_REQUIRED,
      'Parental consent is required for users under 13',
    );
  }
}

// ============================================================================
// RATE LIMITING EXCEPTIONS
// ============================================================================

export class RateLimitException extends SecurityException {
  constructor(retryAfterSeconds: number) {
    super(
      SECURITY_ERROR_CODES.RATE_LIMIT_EXCEEDED,
      'Too many requests. Please try again later.',
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfter: retryAfterSeconds },
    );
  }
}

// ============================================================================
// INPUT VALIDATION EXCEPTIONS
// ============================================================================

export class InputValidationException extends SecurityException {
  constructor(errors: Record<string, string[]>) {
    super(
      SECURITY_ERROR_CODES.INPUT_VALIDATION_FAILED,
      'Input validation failed',
      HttpStatus.BAD_REQUEST,
      { errors },
    );
  }
}

export class SanitizationException extends SecurityException {
  constructor(field: string) {
    super(
      SECURITY_ERROR_CODES.INPUT_SANITIZATION_FAILED,
      `Potentially malicious content detected in ${field}`,
      HttpStatus.BAD_REQUEST,
      { field },
    );
  }
}

// ============================================================================
// THREAT DETECTION EXCEPTIONS
// ============================================================================

export class ThreatDetectedException extends SecurityException {
  constructor(threatType: string, blocked: boolean = true) {
    super(
      SECURITY_ERROR_CODES.THREAT_DETECTED,
      'Security threat detected',
      HttpStatus.FORBIDDEN,
      { threatType, blocked },
    );
  }
}

export class SuspiciousActivityException extends SecurityException {
  constructor(reason: string) {
    super(
      SECURITY_ERROR_CODES.SUSPICIOUS_ACTIVITY,
      'Suspicious activity detected',
      HttpStatus.FORBIDDEN,
      { reason },
    );
  }
}
