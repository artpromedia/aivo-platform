/**
 * Security Constants
 * Configuration values and constants for security framework
 */

// ============================================================================
// AUTHENTICATION CONSTANTS
// ============================================================================

export const AUTH = {
  TOKEN_EXPIRY: {
    ACCESS: 15 * 60, // 15 minutes in seconds
    REFRESH: 7 * 24 * 60 * 60, // 7 days in seconds
    MFA: 5 * 60, // 5 minutes for MFA challenge
  },
  PASSWORD: {
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    HISTORY_COUNT: 12, // Cannot reuse last 12 passwords
    MAX_AGE_DAYS: 90,
  },
  SESSION: {
    MAX_CONCURRENT: 5,
    IDLE_TIMEOUT: 30 * 60, // 30 minutes
    ABSOLUTE_TIMEOUT: 12 * 60 * 60, // 12 hours
  },
  MFA: {
    CODE_LENGTH: 6,
    CODE_EXPIRY: 300, // 5 minutes
    MAX_ATTEMPTS: 3,
    BACKUP_CODES_COUNT: 10,
  },
  LOCKOUT: {
    MAX_ATTEMPTS: 5,
    DURATION: 15 * 60, // 15 minutes
    DURATION_SECONDS: 900, // 15 minutes in seconds
    PROGRESSIVE_MULTIPLIER: 2,
  },
} as const;

// ============================================================================
// RATE LIMITING CONSTANTS
// ============================================================================

export const RATE_LIMITS = {
  GLOBAL: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 100,
  },
  AUTH: {
    LOGIN: { WINDOW_MS: 900000, MAX: 5 }, // 5 per 15 min
    REGISTER: { WINDOW_MS: 3600000, MAX: 3 }, // 3 per hour
    PASSWORD_RESET: { WINDOW_MS: 3600000, MAX: 3 },
    MFA: { WINDOW_MS: 300000, MAX: 5 }, // 5 per 5 min
  },
  API: {
    READ: { WINDOW_MS: 60000, MAX: 200 },
    WRITE: { WINDOW_MS: 60000, MAX: 50 },
    EXPORT: { WINDOW_MS: 3600000, MAX: 10 },
  },
} as const;

// ============================================================================
// DATA CLASSIFICATION CONSTANTS
// ============================================================================

export const DATA_CLASSIFICATION = {
  LEVELS: {
    PUBLIC: 'public',
    INTERNAL: 'internal',
    CONFIDENTIAL: 'confidential',
    RESTRICTED: 'restricted',
  },
  RETENTION_DAYS: {
    PUBLIC: 365,
    INTERNAL: 730,
    CONFIDENTIAL: 1825,
    RESTRICTED: 2555, // 7 years for FERPA
  },
  SENSITIVE_FIELDS: [
    'password', 'passwordHash', 'ssn', 'socialSecurityNumber',
    'dateOfBirth', 'dob', 'creditCard', 'bankAccount',
    'healthInfo', 'medicalRecord', 'grade', 'gpa',
    'disciplinaryRecord', 'iep', '504plan',
  ],
} as const;

// ============================================================================
// COMPLIANCE CONSTANTS
// ============================================================================

export const COMPLIANCE = {
  REGULATIONS: {
    FERPA: 'FERPA',
    COPPA: 'COPPA',
    GDPR: 'GDPR',
    CCPA: 'CCPA',
    SOC2: 'SOC2',
    ISO27001: 'ISO27001',
  },
  AGE_THRESHOLDS: {
    COPPA_MINOR: 13,
    FERPA_ELIGIBLE_STUDENT: 18,
    GDPR_MINOR: 16, // Varies by EU country
  },
  CONSENT_EXPIRY_DAYS: {
    PARENTAL: 365,
    STUDENT: 365,
    USER: 730,
    MARKETING: 365,
  },
} as const;

// ============================================================================
// ENCRYPTION CONSTANTS
// ============================================================================

export const ENCRYPTION = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32, // 256 bits
  IV_LENGTH: 16, // 128 bits
  TAG_LENGTH: 16, // 128 bits
  KEY_ROTATION_DAYS: 90,
  HASH_ALGORITHM: 'argon2id',
  ARGON2: {
    MEMORY_COST: 65536, // 64 MB
    TIME_COST: 3,
    PARALLELISM: 4,
    HASH_LENGTH: 32,
  },
} as const;

// ============================================================================
// SECURITY HEADERS
// ============================================================================

export const SECURITY_HEADERS = {
  HSTS_MAX_AGE: 31536000, // 1 year
  CSP_REPORT_URI: '/api/security/csp-report',
  FEATURE_POLICY: [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
  ],
} as const;

// ============================================================================
// AUDIT CONSTANTS
// ============================================================================

export const AUDIT = {
  BUFFER_SIZE: 100,
  FLUSH_INTERVAL_MS: 5000,
  MAX_PAYLOAD_SIZE: 10240, // 10KB max for logged payloads
  RETENTION_DAYS: {
    SECURITY: 730, // 2 years
    ACCESS: 365, // 1 year
    SYSTEM: 90, // 90 days
  },
  IMMEDIATE_FLUSH_SEVERITY: ['critical', 'high'],
} as const;

// ============================================================================
// THREAT DETECTION CONSTANTS
// ============================================================================

export const THREAT_DETECTION = {
  RISK_THRESHOLDS: {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90,
  },
  BRUTE_FORCE: {
    WINDOW_MS: 300000, // 5 minutes
    THRESHOLD: 10,
  },
  SUSPICIOUS_PATTERNS: {
    RAPID_REQUESTS: 100, // requests per minute
    FAILED_LOGINS: 5,
    GEOGRAPHIC_ANOMALY_DISTANCE_KM: 500,
  },
} as const;

// ============================================================================
// PII PATTERNS
// ============================================================================

export const PII_PATTERNS = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i,
  PHONE: /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/,
  CREDIT_CARD: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/,
  DOB: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12][0-9]|3[01])[-/](?:19|20)\d{2}\b/,
  IP_ADDRESS: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/,
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const SECURITY_ERROR_CODES = {
  // Authentication errors (1xxx)
  AUTH_INVALID_CREDENTIALS: 'SEC1001',
  AUTH_TOKEN_EXPIRED: 'SEC1002',
  AUTH_TOKEN_INVALID: 'SEC1003',
  AUTH_MFA_REQUIRED: 'SEC1004',
  AUTH_MFA_FAILED: 'SEC1005',
  AUTH_ACCOUNT_LOCKED: 'SEC1006',
  AUTH_SESSION_EXPIRED: 'SEC1007',
  
  // Authorization errors (2xxx)
  AUTHZ_FORBIDDEN: 'SEC2001',
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'SEC2002',
  AUTHZ_TENANT_MISMATCH: 'SEC2003',
  
  // Consent errors (3xxx)
  CONSENT_REQUIRED: 'SEC3001',
  CONSENT_EXPIRED: 'SEC3002',
  CONSENT_REVOKED: 'SEC3003',
  PARENTAL_CONSENT_REQUIRED: 'SEC3004',
  
  // Rate limiting errors (4xxx)
  RATE_LIMIT_EXCEEDED: 'SEC4001',
  
  // Input validation errors (5xxx)
  INPUT_VALIDATION_FAILED: 'SEC5001',
  INPUT_SANITIZATION_FAILED: 'SEC5002',
  
  // Security threat errors (6xxx)
  THREAT_DETECTED: 'SEC6001',
  SUSPICIOUS_ACTIVITY: 'SEC6002',
} as const;
