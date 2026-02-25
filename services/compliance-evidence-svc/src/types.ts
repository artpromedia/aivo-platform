// ════════════════════════════════════════════════════════════════════════════
// SOC 2 Evidence Service — Type Definitions
// ════════════════════════════════════════════════════════════════════════════

/** Trust Service Categories per AICPA TSC 2017 */
export type TrustServiceCategory =
  | 'CC'   // Common Criteria (Security)
  | 'A'    // Availability
  | 'PI'   // Processing Integrity
  | 'C'    // Confidentiality
  | 'P';   // Privacy

/** Evidence freshness status */
export type EvidenceHealth = 'green' | 'yellow' | 'red';

/** Collector schedule frequency */
export type CollectionFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';

/** Evidence output format */
export type EvidenceFormat = 'json' | 'markdown' | 'csv' | 'pdf' | 'sarif';

// ── Control definition ───────────────────────────────────────────────────────
export interface ControlDefinition {
  id: string;                       // e.g. "CC1.1.1"
  category: TrustServiceCategory;
  section: string;                  // e.g. "CC1.1"
  sectionTitle: string;             // e.g. "Commitment to Integrity and Ethical Values"
  description: string;
  controlType: string;              // Preventive | Detective | Corrective
  frequency: string;
  owner: string;
  evidenceDescription: string;      // What evidence is needed
  collectors: string[];             // collector IDs that feed this control
}

// ── Collector definition ─────────────────────────────────────────────────────
export interface CollectorDefinition {
  id: string;                       // e.g. "access-review"
  name: string;                     // Human-readable name
  description: string;
  controlIds: string[];             // Controls this collector provides evidence for
  schedule: CollectionFrequency;
  category: TrustServiceCategory;
  enabled: boolean;
}

// ── Evidence record (DB row) ────────────────────────────────────────────────
export interface EvidenceRecord {
  id: string;
  collectorId: string;
  controlId: string;
  category: TrustServiceCategory;
  s3Key: string;
  s3Bucket: string;
  format: EvidenceFormat;
  sizeBytes: number;
  sha256: string;
  collectedAt: string;              // ISO timestamp
  periodStart: string;
  periodEnd: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// ── Control status (aggregated) ──────────────────────────────────────────────
export interface ControlStatus {
  controlId: string;
  category: TrustServiceCategory;
  section: string;
  description: string;
  health: EvidenceHealth;
  lastEvidenceAt: string | null;
  nextDueAt: string;
  evidenceCount: number;
  collectorIds: string[];
  owner: string;
}

// ── Audit package ────────────────────────────────────────────────────────────
export interface AuditPackageRequest {
  periodStart: string;
  periodEnd: string;
  controlIds?: string[];            // null = all controls
  categories?: TrustServiceCategory[];
  includeMarkdown: boolean;
  includeRawJson: boolean;
}

export interface AuditPackageRecord {
  id: string;
  periodStart: string;
  periodEnd: string;
  controlCount: number;
  evidenceCount: number;
  s3Key: string;
  sizeBytes: number;
  generatedAt: string;
  generatedBy: string;
}

// ── Collection run ───────────────────────────────────────────────────────────
export interface CollectionRun {
  id: string;
  collectorId: string;
  status: 'running' | 'success' | 'failed';
  startedAt: string;
  completedAt: string | null;
  evidenceCount: number;
  errorMessage: string | null;
  durationMs: number | null;
}

// ── Collector result (returned by collector functions) ────────────────────────
export interface CollectorResult {
  collectorId: string;
  controlIds: string[];
  periodStart: string;
  periodEnd: string;
  artifacts: EvidenceArtifact[];
  summary: Record<string, unknown>;
}

export interface EvidenceArtifact {
  filename: string;
  format: EvidenceFormat;
  content: string | Buffer;
  controlId: string;
  metadata?: Record<string, unknown>;
}

// ── Prometheus types ─────────────────────────────────────────────────────────
export interface PrometheusQueryResult {
  status: string;
  data: {
    resultType: string;
    result: {
      metric: Record<string, string>;
      value?: [number, string];
      values?: [number, string][];
    }[];
  };
}

// ── GitHub types ─────────────────────────────────────────────────────────────
export interface GitHubPREvidence {
  number: number;
  title: string;
  author: string;
  mergedAt: string;
  reviewCount: number;
  approvalCount: number;
  ciPassed: boolean;
  hasApproval: boolean;
  url: string;
}

export interface ChangeManagementSummary {
  totalPRs: number;
  withReview: number;
  withApproval: number;
  withCIPassed: number;
  compliancePercentage: number;
  nonCompliantPRs: GitHubPREvidence[];
}

// ── Vulnerability types ──────────────────────────────────────────────────────
export interface VulnerabilitySummary {
  scanDate: string;
  totalImages: number;
  imagesScanned: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  negligible: number;
  fixableCritical: number;
  fixableHigh: number;
}

// ── Access review types ──────────────────────────────────────────────────────
export interface AccessReviewEvidence {
  reviewDate: string;
  totalUsers: number;
  totalRoleAssignments: number;
  roleDistribution: Record<string, number>;
  privilegedUsers: number;
  serviceAccounts: number;
  mfaEnabled: number;
  mfaPercentage: number;
  staleAccounts: number;
  findings: string[];
}

// ── Uptime evidence ──────────────────────────────────────────────────────────
export interface UptimeEvidence {
  periodStart: string;
  periodEnd: string;
  overallUptime: number;
  sloTarget: number;
  sloMet: boolean;
  serviceUptimes: {
    service: string;
    uptime: number;
    downtime: string;
    incidents: number;
  }[];
}

// ── Backup evidence ──────────────────────────────────────────────────────────
export interface BackupEvidence {
  checkDate: string;
  backupsConfigured: boolean;
  lastSuccessfulBackup: string | null;
  rpoThresholdHours: number;
  rpoMet: boolean;
  backupCount: number;
  restoreTestDate: string | null;
  restoreTestResult: string | null;
}

// ── Audit log evidence ───────────────────────────────────────────────────────
export interface AuditLogEvidence {
  periodStart: string;
  periodEnd: string;
  totalEvents: number;
  eventsByType: Record<string, number>;
  criticalOperationsCovered: string[];
  missingOperations: string[];
  sampleVerified: number;
  integrityCheckPassed: boolean;
}
