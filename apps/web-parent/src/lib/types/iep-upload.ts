/**
 * IEP Upload Types
 *
 * Type definitions for the IEP document upload and comparison flow.
 */

// ── Document Status ─────────────────────────────────────────────────────────

export type IepDocumentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'COMPARISON_READY'
  | 'APPROVED'
  | 'REJECTED'
  | 'ERROR';

export type IepComparisonDecision =
  | 'PENDING'
  | 'AGREE_WITH_SYSTEM'
  | 'PREFER_EXISTING'
  | 'MERGE_BOTH'
  | 'REQUEST_REVIEW';

// ── API Response Types ──────────────────────────────────────────────────────

export interface IepUploadResponse {
  documentId: string;
  status: IepDocumentStatus;
  message: string;
  processingEstimate: string;
}

export interface IepDocument {
  id: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
  status: IepDocumentStatus;
  processingError: string | null;
  uploadedByRole: string;
  uploadNotes: string | null;
  createdAt: string;
  processedAt: string | null;
  hasComparison: boolean;
  latestComparison: IepComparisonSummary | null;
}

export interface IepComparisonSummary {
  id: string;
  decision: IepComparisonDecision;
  overallMatchScore: number;
  createdAt: string;
}

export interface IepDocumentsResponse {
  profileId: string;
  documents: IepDocument[];
  hasActiveDocument: boolean;
}

// ── Extracted Content ───────────────────────────────────────────────────────

export interface IepGoal {
  id: string;
  domain: string;
  category: string;
  description: string;
  baseline: string | null;
  target: string | null;
  measurementMethod: string | null;
  timeline: string | null;
  confidence: number;
}

export interface IepAccommodation {
  id: string;
  category: string;
  description: string;
  setting: string | null;
  frequency: string | null;
  confidence: number;
}

export interface IepService {
  id: string;
  type: string;
  provider: string | null;
  frequency: string | null;
  duration: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  confidence: number;
}

export interface ExtractedIepContent {
  goals: IepGoal[];
  accommodations: IepAccommodation[];
  services: IepService[];
  metadata: IepMetadata;
}

export interface IepMetadata {
  studentName: string | null;
  dateOfBirth: string | null;
  grade: string | null;
  school: string | null;
  district: string | null;
  iepDate: string | null;
  reviewDate: string | null;
  eligibilityCategory: string | null;
  caseManager: string | null;
}

// ── Comparison Results ──────────────────────────────────────────────────────

export interface DomainComparison {
  domain: string;
  iepLevel: string | null;
  assessmentLevel: number;
  assessmentLabel: string;
  alignment: 'ALIGNED' | 'HIGHER' | 'LOWER' | 'UNKNOWN';
  difference: number | null;
  notes: string;
}

export interface GoalAlignment {
  iepGoalId: string;
  iepGoalDescription: string;
  relatedDomain: string;
  assessmentSupports: boolean;
  alignmentScore: number;
  notes: string;
}

export interface Discrepancy {
  area: string;
  iepIndication: string;
  assessmentIndication: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  recommendation: string;
}

export interface Recommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  title: string;
  description: string;
  rationale: string;
}

export interface ComparisonSummary {
  headline: string;
  overallAssessment: string;
  strengthAreas: string[];
  growthAreas: string[];
  keyInsights: string[];
}

export interface IepComparisonResult {
  id: string;
  iepDocumentId: string;
  attemptId: string;
  profileId: string;
  decision: IepComparisonDecision;
  overallMatchScore: number;
  confidenceLevel: number;
  summary: ComparisonSummary;
  domainComparisons: DomainComparison[];
  goalAlignment: GoalAlignment[];
  discrepancies: Discrepancy[];
  recommendations: Recommendation[];
  decisionByRole: string | null;
  decisionNotes: string | null;
  decisionAt: string | null;
  newIepGenerated: boolean;
  generatedIepId: string | null;
  createdAt: string;
  assessmentResults: {
    attemptNumber: number;
    completedAt: string;
    domainScores: Record<string, { correct: number; total: number; adaptiveAbility: number }>;
    overallEstimate: { score: number; adaptiveScore: number };
    skillEstimates: Array<{
      domain: string;
      skillCode: string;
      estimatedLevel: number;
      confidence: number;
    }>;
  };
  extractedIepContent: ExtractedIepContent;
}

// ── Status Response ─────────────────────────────────────────────────────────

export type IepOverallStatus =
  | 'NO_IEP_UPLOADED'
  | 'IEP_UPLOADING'
  | 'IEP_PROCESSING'
  | 'IEP_PROCESSING_ERROR'
  | 'AWAITING_ASSESSMENT'
  | 'READY_FOR_COMPARISON'
  | 'AWAITING_DECISION'
  | 'DECISION_MADE'
  | 'UNKNOWN';

export interface IepStatusResponse {
  profileId: string;
  baselineStatus: string;
  hasCompletedAssessment: boolean;
  iepUpload: {
    documentId: string;
    filename: string;
    status: IepDocumentStatus;
    processingError: string | null;
    uploadedAt: string;
    processedAt: string | null;
  } | null;
  comparison: {
    comparisonId: string;
    decision: IepComparisonDecision;
    overallMatchScore: number;
    decisionAt: string | null;
    newIepGenerated: boolean;
  } | null;
  overallStatus: IepOverallStatus;
  nextAction: string | null;
}

// ── Decision Response ───────────────────────────────────────────────────────

export interface IepDecisionResponse {
  comparisonId: string;
  decision: IepComparisonDecision;
  decisionAt: string;
  nextSteps: string;
}
