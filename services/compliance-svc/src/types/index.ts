/**
 * AIVO Compliance Service - Type Definitions
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

export type Framework =
  | 'FERPA'
  | 'COPPA'
  | 'GDPR'
  | 'CCPA'
  | 'SOC2'
  | 'HIPAA'
  | 'PCI_DSS'
  | 'ISO27001'
  | 'NIST_CSF'
  | 'CIPA'
  | 'IDEA'
  | 'CUSTOM';

export type ControlStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'IMPLEMENTED'
  | 'NOT_APPLICABLE'
  | 'PARTIALLY_IMPLEMENTED';

export type AssessmentStatus =
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'UNDER_REVIEW'
  | 'COMPLETED'
  | 'ARCHIVED';

export type FindingSeverity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INFORMATIONAL';

export type FindingStatus =
  | 'OPEN'
  | 'IN_REMEDIATION'
  | 'REMEDIATED'
  | 'ACCEPTED_RISK'
  | 'FALSE_POSITIVE'
  | 'CLOSED';

export type EvidenceType =
  | 'DOCUMENT'
  | 'SCREENSHOT'
  | 'LOG_EXPORT'
  | 'CONFIGURATION'
  | 'POLICY'
  | 'PROCEDURE'
  | 'TRAINING_RECORD'
  | 'AUDIT_REPORT'
  | 'ATTESTATION'
  | 'AUTOMATED_CHECK'
  | 'OTHER';

export type EvidenceStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'SUPERSEDED';

export type RemediationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type RemediationStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'CANCELLED';

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - FRAMEWORKS
// ══════════════════════════════════════════════════════════════════════════════

export interface EnableFrameworkInput {
  framework: Framework;
  displayName?: string;
  description?: string;
  priority?: number;
  applicableFrom?: string;
  applicableUntil?: string;
}

export interface UpdateFrameworkInput {
  displayName?: string;
  description?: string;
  isActive?: boolean;
  priority?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - CONTROLS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateControlInput {
  controlId: string;
  title: string;
  description?: string;
  guidance?: string;
  category?: string;
  subcategory?: string;
  domain?: string;
  requirement?: string;
  implementationSpec?: string;
  isMandatory?: boolean;
  isAutomatable?: boolean;
  frequency?: string;
  riskLevel?: FindingSeverity;
  ownerId?: string;
  ownerEmail?: string;
}

export interface UpdateControlInput {
  title?: string;
  description?: string;
  guidance?: string;
  category?: string;
  subcategory?: string;
  requirement?: string;
  implementationSpec?: string;
  isMandatory?: boolean;
  isAutomatable?: boolean;
  frequency?: string;
  riskLevel?: FindingSeverity;
  ownerId?: string;
  ownerEmail?: string;
}

export interface UpdateControlStatusInput {
  status: ControlStatus;
  implementationNotes?: string;
}

export interface ListControlsQuery {
  category?: string;
  status?: ControlStatus;
  ownerId?: string;
  isMandatory?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - ASSESSMENTS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateAssessmentInput {
  name: string;
  description?: string;
  assessmentType: string;
  tenantFrameworkId: string;
  scopeDescription?: string;
  inScopeServices?: string[];
  excludedServices?: string[];
  periodStart: string;
  periodEnd: string;
  leadAssessorId?: string;
  leadAssessorEmail?: string;
}

export interface UpdateAssessmentInput {
  name?: string;
  description?: string;
  scopeDescription?: string;
  inScopeServices?: string[];
  excludedServices?: string[];
  periodStart?: string;
  periodEnd?: string;
  leadAssessorId?: string;
  leadAssessorEmail?: string;
}

export interface ListAssessmentsQuery {
  tenantFrameworkId?: string;
  status?: AssessmentStatus;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - FINDINGS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateFindingInput {
  title: string;
  description: string;
  severity: FindingSeverity;
  assessmentId?: string;
  controlId?: string;
  rootCause?: string;
  impact?: string;
  likelihood?: string;
  affectedSystems?: string[];
  dueDate?: string;
}

export interface UpdateFindingInput {
  title?: string;
  description?: string;
  severity?: FindingSeverity;
  rootCause?: string;
  impact?: string;
  likelihood?: string;
  affectedSystems?: string[];
  dueDate?: string;
}

export interface UpdateFindingStatusInput {
  status: FindingStatus;
  resolution?: string;
  riskAcceptReason?: string;
}

export interface ListFindingsQuery {
  assessmentId?: string;
  controlId?: string;
  severity?: FindingSeverity;
  status?: FindingStatus;
  overdue?: boolean;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - EVIDENCE
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateEvidenceInput {
  title: string;
  description?: string;
  type: EvidenceType;
  validFrom?: string;
  validUntil?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  sourceSystem?: string;
  sourceQuery?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateEvidenceInput {
  title?: string;
  description?: string;
  validUntil?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ReviewEvidenceInput {
  status: EvidenceStatus;
  reviewNotes?: string;
}

export interface ListEvidenceQuery {
  type?: EvidenceType;
  status?: EvidenceStatus;
  expiringSoon?: boolean;
  page?: number;
  pageSize?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - REMEDIATION
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateRemediationInput {
  findingId: string;
  title: string;
  description: string;
  priority: RemediationPriority;
  actionPlan?: string;
  mitigatingControl?: string;
  estimatedEffort?: string;
  estimatedCost?: number;
  assigneeId?: string;
  assigneeEmail?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  verificationPlan?: string;
}

export interface UpdateRemediationInput {
  title?: string;
  description?: string;
  priority?: RemediationPriority;
  actionPlan?: string;
  mitigatingControl?: string;
  estimatedEffort?: string;
  estimatedCost?: number;
  assigneeId?: string;
  assigneeEmail?: string;
  plannedStartDate?: string;
  plannedEndDate?: string;
  verificationPlan?: string;
  progressPercent?: number;
  progressNotes?: string;
  blockerNotes?: string;
}

export interface UpdateRemediationStatusInput {
  status: RemediationStatus;
}

// ══════════════════════════════════════════════════════════════════════════════
// API TYPES - DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export interface DashboardSummary {
  overallScore: number;
  frameworks: FrameworkSummary[];
  findingsSummary: FindingsSummary;
  upcomingDeadlines: DeadlineItem[];
  recentActivity: ActivityItem[];
}

export interface FrameworkSummary {
  framework: Framework;
  displayName: string;
  score: number;
  controlsTotal: number;
  controlsPassed: number;
  controlsFailed: number;
  controlsInProgress: number;
  openFindings: number;
}

export interface FindingsSummary {
  total: number;
  open: number;
  inRemediation: number;
  overdue: number;
  bySeverity: Record<FindingSeverity, number>;
}

export interface DeadlineItem {
  type: 'finding' | 'evidence' | 'assessment' | 'remediation';
  id: string;
  title: string;
  dueDate: string;
  severity?: FindingSeverity;
}

export interface ActivityItem {
  type: string;
  title: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
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
