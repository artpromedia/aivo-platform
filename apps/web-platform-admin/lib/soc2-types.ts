/**
 * SOC 2 Evidence Types
 *
 * Type definitions for the SOC 2 Evidence dashboard.
 */

// ══════════════════════════════════════════════════════════════════════════════
// Enums & Literals
// ══════════════════════════════════════════════════════════════════════════════

export type TrustServiceCategory =
  | 'Security'
  | 'Availability'
  | 'Processing Integrity'
  | 'Confidentiality'
  | 'Privacy';

export type EvidenceHealth = 'green' | 'yellow' | 'red';
export type CollectionFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
export type RunStatus = 'running' | 'success' | 'failure';

// ══════════════════════════════════════════════════════════════════════════════
// Controls
// ══════════════════════════════════════════════════════════════════════════════

export interface ControlView {
  id: string;
  category: TrustServiceCategory;
  section: string;
  title: string;
  description: string;
  type: string;
  frequency: CollectionFrequency;
  owner: string;
  evidenceRequirements: string[];
  collectorIds: string[];
  health: EvidenceHealth;
  lastEvidenceAt: string | null;
  evidenceCount: number;
}

export interface ControlSummary {
  category: TrustServiceCategory;
  total: number;
  green: number;
  yellow: number;
  red: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Evidence
// ══════════════════════════════════════════════════════════════════════════════

export interface EvidenceRecord {
  id: string;
  collectorId: string;
  controlId: string;
  category: TrustServiceCategory;
  s3Key: string;
  format: string;
  sizeBytes: number;
  sha256: string;
  collectedAt: string;
  periodStart: string;
  periodEnd: string;
  metadata: Record<string, unknown> | null;
}

export interface EvidenceListResponse {
  evidence: EvidenceRecord[];
  total: number;
  limit: number;
  offset: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Collectors
// ══════════════════════════════════════════════════════════════════════════════

export interface CollectorView {
  id: string;
  name: string;
  description: string;
  frequency: CollectionFrequency;
  controlIds: string[];
  controlCount: number;
  registered: boolean;
  schedule: {
    cronExpr: string;
    enabled: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
  } | null;
}

export interface CollectionRunView {
  id: string;
  collectorId: string;
  status: RunStatus;
  triggeredBy: string;
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  evidenceCount: number;
  error: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// Audit Packages
// ══════════════════════════════════════════════════════════════════════════════

export interface AuditPackageView {
  id: string;
  periodStart: string;
  periodEnd: string;
  controlCount: number;
  evidenceCount: number;
  sizeBytes: number;
  s3Key: string;
  generatedBy: string;
  createdAt: string;
  categories: TrustServiceCategory[];
}

export interface CreatePackageRequest {
  periodStart: string;
  periodEnd: string;
  controlIds?: string[];
  categories?: TrustServiceCategory[];
  includeMarkdown?: boolean;
  includeRawJson?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// Freshness
// ══════════════════════════════════════════════════════════════════════════════

export interface FreshnessSummary {
  totalControls: number;
  green: number;
  yellow: number;
  red: number;
  byCategory: ControlSummary[];
}

// ══════════════════════════════════════════════════════════════════════════════
// Category Colors
// ══════════════════════════════════════════════════════════════════════════════

export const CATEGORY_SECTIONS: Record<TrustServiceCategory, string> = {
  Security: 'CC',
  Availability: 'A1',
  'Processing Integrity': 'PI1',
  Confidentiality: 'C1',
  Privacy: 'P1',
};

export const HEALTH_COLORS: Record<EvidenceHealth, { bg: string; text: string; label: string }> = {
  green: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Current' },
  yellow: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Stale' },
  red: { bg: 'bg-red-100', text: 'text-red-700', label: 'Missing' },
};
