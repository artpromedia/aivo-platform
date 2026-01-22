/**
 * Platform Admin API Types
 *
 * Types for tenants, AI incidents, and related entities.
 * These align with the backend database schemas.
 */

// ══════════════════════════════════════════════════════════════════════════════
// TENANT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type TenantType = 'DISTRICT' | 'CHARTER' | 'PRIVATE_SCHOOL' | 'ENTERPRISE' | 'INDIVIDUAL';
export type TenantStatus = 'ACTIVE' | 'ONBOARDING' | 'SUSPENDED' | 'CHURNED';

export interface Tenant {
  id: string;
  name: string;
  type: TenantType;
  status: TenantStatus;
  primaryDomain: string;
  settings: TenantSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TenantSettings {
  maxLearners?: number;
  maxEducators?: number;
  aiEnabled?: boolean;
  [key: string]: unknown;
}

export interface TenantListItem {
  id: string;
  name: string;
  type: TenantType;
  status: TenantStatus;
  learnerCount: number;
  educatorCount: number;
  createdAt: string;
}

export interface CreateTenantInput {
  name: string;
  type: TenantType;
  primaryDomain: string;
  adminEmail: string;
  settings?: Partial<TenantSettings>;
}

// ══════════════════════════════════════════════════════════════════════════════
// FEATURE FLAGS & ENTITLEMENTS
// ══════════════════════════════════════════════════════════════════════════════

export interface FeatureFlag {
  id: string;
  tenantId: string;
  flagKey: string;
  enabled: boolean;
  rolloutPercentage: number;
  metadata?: Record<string, unknown>;
  updatedAt: string;
}

export interface Entitlement {
  id: string;
  tenantId: string;
  feature: string;
  limit: number | null;
  used: number;
  expiresAt: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI INCIDENT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const INCIDENT_SEVERITIES = ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  'SAFETY',
  'PRIVACY',
  'COMPLIANCE',
  'PERFORMANCE',
  'COST',
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const INCIDENT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface AiIncident {
  id: string;
  tenantId: string;
  tenantName?: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  status: IncidentStatus;
  title: string;
  description: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  createdBySystem: boolean;
  createdByUserId: string | null;
  assignedToUserId: string | null;
  assignedToUserName?: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;
  resolutionNotes: string | null;
  metadataJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AiIncidentListItem {
  id: string;
  tenantId: string;
  tenantName: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  status: IncidentStatus;
  title: string;
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
}

export interface UpdateIncidentInput {
  status?: IncidentStatus;
  assignedToUserId?: string | null;
  resolutionNotes?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI CALL LOG TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const SAFETY_LABELS = ['SAFE', 'LOW', 'MEDIUM', 'HIGH'] as const;
export type SafetyLabel = (typeof SAFETY_LABELS)[number];

export interface AiCallLog {
  id: string;
  tenantId: string;
  userId: string | null;
  learnerId: string | null;
  sessionId: string | null;
  agentType: string;
  useCase: string | null;
  modelName: string;
  provider: string;
  version: string;
  requestId: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  promptSummary: string | null;
  responseSummary: string | null;
  safetyLabel: SafetyLabel;
  safetyMetadata: Record<string, unknown> | null;
  costCentsEstimate: number;
  status: 'SUCCESS' | 'ERROR';
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface AiCallLogWithLinkReason extends AiCallLog {
  linkReason: 'TRIGGER' | 'RELATED' | 'CONTEXT';
}

// ══════════════════════════════════════════════════════════════════════════════
// FILTER & PAGINATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface IncidentFilters {
  severity?: IncidentSeverity | undefined;
  category?: IncidentCategory | undefined;
  status?: IncidentStatus | undefined;
  tenantId?: string | undefined;
  search?: string | undefined;
}

export interface TenantAiActivitySummary {
  totalCalls: number;
  totalIncidents: number;
  openIncidents: number;
  avgLatencyMs: number;
  totalCostCents: number;
  callsByDay: { date: string; count: number }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// POLICY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type PolicyScopeType = 'GLOBAL' | 'TENANT';

export interface SafetyPolicy {
  severity_thresholds: {
    low_max_per_session: number;
    medium_escalates_immediately: boolean;
    high_blocks_response: boolean;
  };
  blocked_categories: string[];
  require_human_review_above: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AiPolicy {
  allowed_providers: string[];
  allowed_models: string[];
  max_tokens_per_request: number;
  max_requests_per_minute: number;
  latency_budget_ms: number;
  cost_limit_cents_per_day: number;
}

export interface RetentionPolicy {
  ai_call_logs_days: number;
  session_events_days: number;
  homework_uploads_days: number;
  consent_logs_days: number;
  ai_incidents_days: number;
  dsr_exports_days: number;
  prefer_soft_delete: boolean;
}

export interface Policy {
  safety: SafetyPolicy;
  ai: AiPolicy;
  retention: RetentionPolicy;
}

export interface PolicyDocument {
  id: string;
  scopeType: PolicyScopeType;
  tenantId: string | null;
  version: number;
  name: string;
  isActive: boolean;
  policyJson: Partial<Policy>;
  createdAt: string;
  updatedAt: string;
}

export interface EffectivePolicy {
  safety: SafetyPolicy;
  ai: AiPolicy;
  retention: RetentionPolicy;
  computedAt: Date;
}

export interface CreatePolicyInput {
  scopeType: PolicyScopeType;
  tenantId?: string | null;
  name: string;
  policyJson: Partial<Policy>;
  description?: string;
}

export interface UpdatePolicyInput {
  name?: string;
  policyJson?: Partial<Policy>;
  description?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGAL HOLD TYPES
// ══════════════════════════════════════════════════════════════════════════════

export const LEGAL_HOLD_STATUSES = ['ACTIVE', 'RELEASED', 'EXPIRED'] as const;
export type LegalHoldStatus = (typeof LEGAL_HOLD_STATUSES)[number];

export const LEGAL_HOLD_TYPES = [
  'LITIGATION',
  'REGULATORY',
  'INTERNAL_INVESTIGATION',
  'PRESERVATION',
] as const;
export type LegalHoldType = (typeof LEGAL_HOLD_TYPES)[number];

export interface LegalHold {
  id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  description: string | null;
  holdType: LegalHoldType;
  status: LegalHoldStatus;
  matterNumber: string | null;
  custodians: LegalHoldCustodian[];
  dataScope: LegalHoldDataScope;
  startDate: string;
  endDate: string | null;
  releaseDate: string | null;
  releaseReason: string | null;
  createdByUserId: string;
  createdByUserName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalHoldListItem {
  id: string;
  tenantId: string;
  tenantName: string;
  name: string;
  holdType: LegalHoldType;
  status: LegalHoldStatus;
  matterNumber: string | null;
  custodianCount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
}

export interface LegalHoldCustodian {
  id: string;
  userId: string | null;
  learnerId: string | null;
  email: string;
  name: string;
  role: 'EDUCATOR' | 'LEARNER' | 'ADMIN' | 'STAFF';
  notifiedAt: string | null;
  acknowledgedAt: string | null;
}

export interface LegalHoldDataScope {
  includeEmails: boolean;
  includeDocuments: boolean;
  includeAiLogs: boolean;
  includeSessionData: boolean;
  includeAssessments: boolean;
  includeMessages: boolean;
  dateRangeStart: string | null;
  dateRangeEnd: string | null;
  keywords: string[];
}

export interface CreateLegalHoldInput {
  tenantId: string;
  name: string;
  description?: string;
  holdType: LegalHoldType;
  matterNumber?: string;
  dataScope: LegalHoldDataScope;
  startDate: string;
  endDate?: string;
  custodianEmails?: string[];
}

export interface UpdateLegalHoldInput {
  name?: string;
  description?: string;
  endDate?: string;
  status?: LegalHoldStatus;
  releaseReason?: string;
}

export interface LegalHoldFilters {
  status?: LegalHoldStatus | undefined;
  holdType?: LegalHoldType | undefined;
  tenantId?: string | undefined;
  search?: string | undefined;
}

export interface LegalHoldStats {
  totalHolds: number;
  activeHolds: number;
  releasedHolds: number;
  expiredHolds: number;
  totalCustodians: number;
  holdsByType: Record<LegalHoldType, number>;
  recentHolds: LegalHoldListItem[];
}
