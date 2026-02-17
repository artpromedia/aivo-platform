/**
 * AIVO Compliance Service - Legal Hold Module Types
 *
 * Standalone types for the legal-hold domain.
 */

// ──────────────────────────── Enum-like constants ────────────────────────────

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
  | 'FAILED'
  | 'BOUNCED';

export type ReleaseType =
  | 'FULL'
  | 'PARTIAL_CUSTODIAN'
  | 'PARTIAL_SOURCE'
  | 'PARTIAL_DATE_RANGE';

// ──────────────────────────── CRUD Input Types ────────────────────────────

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

export interface UpdateMatterInput extends Partial<CreateMatterInput> {
  status?: MatterStatus;
}

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

export interface UpdateHoldInput extends Partial<Omit<CreateHoldInput, 'matterId' | 'holdNumber'>> {
  status?: HoldStatus;
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

export interface UpdateCustodianInput extends Partial<Omit<CreateCustodianInput, 'email'>> {
  terminationDate?: string;
}

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

export interface UpdateDataSourceInput extends Partial<CreateDataSourceInput> {
  isActive?: boolean;
}

export interface AcknowledgeHoldInput {
  certificationText: string;
  signature?: string;
  hasQuestions?: boolean;
  questions?: string;
}

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

// ──────────────────────────── Query Types ────────────────────────────

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

// ──────────────────────────── Response Types ────────────────────────────

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
