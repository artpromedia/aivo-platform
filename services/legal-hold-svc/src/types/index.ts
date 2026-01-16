/**
 * AIVO Legal Hold Service - Type Definitions
 */

// ══════════════════════════════════════════════════════════════════════════════
// AUTH TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface JwtPayload {
  sub: string;
  tenantId: string;
  email?: string;
  roles: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ══════════════════════════════════════════════════════════════════════════════

export type MatterType =
  | 'LITIGATION'
  | 'REGULATORY'
  | 'INVESTIGATION'
  | 'AUDIT'
  | 'ARBITRATION'
  | 'COMPLIANCE'
  | 'OTHER';

export type MatterStatus =
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'SETTLED'
  | 'CLOSED'
  | 'ARCHIVED';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HoldStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'ISSUED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'RELEASED'
  | 'ARCHIVED';

export type HoldPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type CustodianStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';

export type HoldCustodianStatus =
  | 'PENDING'
  | 'NOTIFIED'
  | 'ACKNOWLEDGED'
  | 'NON_COMPLIANT'
  | 'ESCALATED'
  | 'RELEASED'
  | 'EXEMPT';

export type DataSourceType =
  | 'EMAIL'
  | 'FILE_SHARE'
  | 'SHAREPOINT'
  | 'ONEDRIVE'
  | 'GOOGLE_DRIVE'
  | 'SLACK'
  | 'TEAMS'
  | 'DATABASE'
  | 'APPLICATION'
  | 'ARCHIVE'
  | 'BACKUP'
  | 'OTHER';

export type PreservationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'PRESERVED'
  | 'FAILED'
  | 'RELEASED';

export type NotificationType =
  | 'INITIAL_NOTICE'
  | 'REMINDER'
  | 'ESCALATION'
  | 'RELEASE_NOTICE'
  | 'UPDATE_NOTICE';

export type NotificationStatus =
  | 'PENDING'
  | 'SENT'
  | 'DELIVERED'
  | 'OPENED'
  | 'FAILED'
  | 'BOUNCED';

export type ReleaseType =
  | 'FULL'
  | 'PARTIAL_CUSTODIAN'
  | 'PARTIAL_SOURCE'
  | 'PARTIAL_DATE_RANGE';

// ══════════════════════════════════════════════════════════════════════════════
// API INPUT TYPES - MATTERS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateMatterInput {
  matterNumber: string;
  name: string;
  description?: string;
  matterType: MatterType;
  anticipatedEnd?: string;
  leadCounsel?: string;
  outsideCounsel?: string;
  paralegal?: string;
  jurisdiction?: string;
  caseNumber?: string;
  opposingParty?: string;
  claimAmount?: number;
  riskLevel?: RiskLevel;
  riskNotes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateMatterInput {
  name?: string;
  description?: string;
  status?: MatterStatus;
  anticipatedEnd?: string;
  leadCounsel?: string;
  outsideCounsel?: string;
  paralegal?: string;
  jurisdiction?: string;
  caseNumber?: string;
  opposingParty?: string;
  claimAmount?: number;
  riskLevel?: RiskLevel;
  riskNotes?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// API INPUT TYPES - HOLDS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateHoldInput {
  matterId: string;
  holdNumber: string;
  name: string;
  description?: string;
  scopeDescription?: string;
  dataTypes?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  keywords?: string[];
  notificationSubject?: string;
  notificationBody?: string;
  reminderFrequency?: number;
  escalationAfter?: number;
  acknowledgmentDue?: string;
  complianceDeadline?: string;
  isConfidential?: boolean;
  priority?: HoldPriority;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateHoldInput {
  name?: string;
  description?: string;
  status?: HoldStatus;
  scopeDescription?: string;
  dataTypes?: string[];
  dateRangeStart?: string;
  dateRangeEnd?: string;
  keywords?: string[];
  notificationSubject?: string;
  notificationBody?: string;
  reminderFrequency?: number;
  escalationAfter?: number;
  acknowledgmentDue?: string;
  complianceDeadline?: string;
  isConfidential?: boolean;
  priority?: HoldPriority;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface IssueHoldInput {
  effectiveAt?: string;
  custodianIds: string[];
  dataSourceIds?: string[];
  sendNotifications?: boolean;
}

export interface ReleaseHoldInput {
  releaseType: ReleaseType;
  reason: string;
  notes?: string;
  custodianIds?: string[];
  dataSourceIds?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// API INPUT TYPES - CUSTODIANS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateCustodianInput {
  userId?: string;
  employeeId?: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  department?: string;
  title?: string;
  location?: string;
  manager?: string;
  phone?: string;
  alternateEmail?: string;
  status?: CustodianStatus;
  hireDate?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateCustodianInput {
  employeeId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  department?: string;
  title?: string;
  location?: string;
  manager?: string;
  phone?: string;
  alternateEmail?: string;
  status?: CustodianStatus;
  terminationDate?: string;
  metadata?: Record<string, unknown>;
}

export interface AddCustodianToHoldInput {
  custodianId: string;
  notes?: string;
  sendNotification?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// API INPUT TYPES - DATA SOURCES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateDataSourceInput {
  name: string;
  description?: string;
  sourceType: DataSourceType;
  connectionInfo?: Record<string, unknown>;
  canPreserve?: boolean;
  canExport?: boolean;
  canSearch?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdateDataSourceInput {
  name?: string;
  description?: string;
  connectionInfo?: Record<string, unknown>;
  canPreserve?: boolean;
  canExport?: boolean;
  canSearch?: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

// ══════════════════════════════════════════════════════════════════════════════
// API INPUT TYPES - NOTIFICATIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface SendNotificationInput {
  holdId: string;
  notificationType: NotificationType;
  custodianIds?: string[];
  customSubject?: string;
  customBody?: string;
}

export interface AcknowledgeHoldInput {
  certificationText: string;
  signature?: string;
  hasQuestions?: boolean;
  questions?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API INPUT TYPES - REPORTS
// ══════════════════════════════════════════════════════════════════════════════

export interface GenerateReportInput {
  reportType: string;
  name: string;
  parameters: {
    matterId?: string;
    holdId?: string;
    custodianIds?: string[];
    dateFrom?: string;
    dateTo?: string;
    includeReleased?: boolean;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ListMattersQuery {
  status?: MatterStatus;
  matterType?: MatterType;
  riskLevel?: RiskLevel;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ListHoldsQuery {
  matterId?: string;
  status?: HoldStatus;
  priority?: HoldPriority;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ListCustodiansQuery {
  status?: CustodianStatus;
  department?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// RESPONSE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface HoldComplianceSummary {
  holdId: string;
  holdName: string;
  totalCustodians: number;
  acknowledged: number;
  pending: number;
  nonCompliant: number;
  escalated: number;
  complianceRate: number;
}

export interface MatterSummary {
  matterId: string;
  matterNumber: string;
  name: string;
  activeHolds: number;
  totalCustodians: number;
  overallCompliance: number;
  pendingAcknowledgments: number;
}
