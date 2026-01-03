/**
 * Security Types & Interfaces
 * Core type definitions for the security framework
 */

// ============================================================================
// AUTHENTICATION TYPES
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  isMinor: boolean;
  ageVerified: boolean;
  consentStatus: ConsentStatus;
  mfaEnabled: boolean;
  mfaVerified: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
  scope: string[];
}

export interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string[];
}

// ============================================================================
// AUTHORIZATION TYPES
// ============================================================================

export interface Permission {
  resource: string;
  action: PermissionAction;
  conditions?: PermissionCondition[];
}

export type PermissionAction = 
  | 'create' | 'read' | 'update' | 'delete' 
  | 'list' | 'export' | 'import' | 'admin';

export interface PermissionCondition {
  field: string;
  operator: 'eq' | 'ne' | 'in' | 'nin' | 'gt' | 'gte' | 'lt' | 'lte';
  value: any;
}

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

// ============================================================================
// CONSENT TYPES
// ============================================================================

export type ConsentStatus = 'granted' | 'pending' | 'denied' | 'expired' | 'revoked';

export type ConsentType = 
  | 'parental'
  | 'student'
  | 'user'
  | 'marketing'
  | 'analytics'
  | 'third_party';

export type ConsentPurpose =
  | 'account_creation'
  | 'educational_services'
  | 'personalization'
  | 'analytics'
  | 'marketing'
  | 'third_party_sharing'
  | 'research'
  | 'ai_processing';

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  purposes: ConsentPurpose[];
  status: ConsentStatus;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  version: number;
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export type AuditEventType =
  | 'authentication.login'
  | 'authentication.logout'
  | 'authentication.failed'
  | 'authentication.mfa_challenge'
  | 'authorization.access_granted'
  | 'authorization.access_denied'
  | 'data.read'
  | 'data.create'
  | 'data.update'
  | 'data.delete'
  | 'data.export'
  | 'consent.granted'
  | 'consent.revoked'
  | 'privacy.data_request'
  | 'privacy.data_deletion'
  | 'security.threat_detected'
  | 'security.rate_limit_exceeded'
  | 'admin.settings_change'
  | 'system.error';

export type AuditEventCategory =
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'consent_management'
  | 'privacy'
  | 'security'
  | 'administration'
  | 'system';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditActor {
  id: string;
  type: 'user' | 'service' | 'system' | 'anonymous';
  ip?: string;
  userAgent?: string;
  sessionId?: string;
}

export interface AuditResource {
  type: string;
  id: string;
  name?: string;
  tenantId?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  eventCategory: AuditEventCategory;
  severity: AuditSeverity;
  actor: AuditActor;
  resource?: AuditResource;
  action: {
    name: string;
    method?: string;
    path?: string;
  };
  result: {
    status: 'success' | 'failure' | 'partial';
    statusCode?: number;
    errorMessage?: string;
  };
  context: {
    correlationId: string;
    requestId: string;
    environment: string;
    service: string;
  };
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  compliance?: {
    regulations: string[];
    dataClassification?: DataClassification;
  };
}

// ============================================================================
// DATA CLASSIFICATION TYPES
// ============================================================================

export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';

export interface ClassificationResult {
  classification: DataClassification;
  reasons: string[];
  piiDetected: boolean;
  piiTypes: string[];
  educationalRecord: boolean;
  requiresEncryption: boolean;
  requiresAuditLog: boolean;
  retentionPeriod: number;
  regulations: string[];
}

export interface PIIMatch {
  type: string;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

// ============================================================================
// ENCRYPTION TYPES
// ============================================================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  keyId: string;
  version: number;
}

export interface EncryptionContext {
  tenantId?: string;
  userId?: string;
  resourceType?: string;
  purpose?: string;
}

// ============================================================================
// SECURITY EVENT TYPES
// ============================================================================

export type ThreatType =
  | 'brute_force'
  | 'credential_stuffing'
  | 'sql_injection'
  | 'xss'
  | 'csrf'
  | 'rate_limit_abuse'
  | 'suspicious_ip'
  | 'account_takeover'
  | 'data_exfiltration'
  | 'privilege_escalation';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ThreatIndicator {
  type: string;
  severity: ThreatSeverity;
  score: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type: string;
  ip: string;
  userId?: string;
  threats: ThreatIndicator[];
  score: number;
}

export interface SecurityThreat {
  id: string;
  type: ThreatType;
  severity: AuditSeverity;
  source: {
    ip: string;
    userId?: string;
    sessionId?: string;
  };
  indicators: string[];
  riskScore: number;
  blocked: boolean;
  timestamp: Date;
}

// ============================================================================
// REQUEST CONTEXT TYPES
// ============================================================================

import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser & { userId: string };
  correlationId?: string;
  securityContext?: SecurityContext;
}

export interface SecurityContext {
  correlationId: string;
  requestId: string;
  user?: AuthenticatedUser;
  ip: string;
  userAgent: string;
  origin?: string;
  tenantId?: string;
  isAuthenticated: boolean;
  permissions: Permission[];
}

declare global {
  namespace Express {
    interface Request {
      securityContext?: SecurityContext;
      user?: AuthenticatedUser;
      correlationId?: string;
    }
  }
}

export {};
