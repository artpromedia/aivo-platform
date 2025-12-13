export type DsrRequestType = 'EXPORT' | 'DELETE';

export type DsrRequestStatus = 
  | 'PENDING'           // Initial state, awaiting review or processing
  | 'APPROVED'          // Approved for processing (delete requests)
  | 'IN_PROGRESS'       // Currently being processed
  | 'GRACE_PERIOD'      // Deletion scheduled, within cancellation window
  | 'COMPLETED'         // Successfully completed
  | 'REJECTED'          // Rejected by admin
  | 'CANCELLED'         // Cancelled during grace period
  | 'FAILED';           // Processing failed

export type DsrJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type DsrAuditAction =
  | 'CREATED'
  | 'APPROVED'
  | 'REJECTED'
  | 'STARTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'DOWNLOADED';

export interface DsrRequest {
  id: string;
  tenant_id: string;
  requested_by_user_id: string;
  learner_id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  reason: string | null;
  export_location: string | null;
  result_uri: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  error_message: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  // Grace period fields for DELETE requests
  grace_period_ends_at: Date | null;
  scheduled_deletion_at: Date | null;
  cancelled_at: Date | null;
  cancelled_by_user_id: string | null;
  cancellation_reason: string | null;
}

export interface DsrAuditLogEntry {
  id: string;
  dsr_request_id: string;
  action: DsrAuditAction;
  performed_by_user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details_json: Record<string, unknown> | null;
  created_at: Date;
}

export interface DsrRateLimit {
  id: string;
  tenant_id: string;
  user_id: string;
  request_type: DsrRequestType;
  request_date: Date;
  request_count: number;
}

export interface DsrJob {
  id: string;
  dsr_request_id: string;
  tenant_id: string;
  status: DsrJobStatus;
  progress_percent: number | null;
  progress_message: string | null;
  error_code: string | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  started_at: Date | null;
  completed_at: Date | null;
  worker_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DsrExportArtifact {
  id: string;
  dsr_request_id: string;
  tenant_id: string;
  file_type: 'JSON' | 'CSV' | 'ZIP';
  file_name: string;
  file_size_bytes: number | null;
  storage_uri: string;
  encryption_key_id: string | null;
  checksum_sha256: string | null;
  expires_at: Date;
  downloaded_count: number;
  last_downloaded_at: Date | null;
  created_at: Date;
}

// ════════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface CreateDsrRequestInput {
  tenantId: string;
  requestedByUserId: string;
  learnerId: string;
  requestType: DsrRequestType;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CreateDsrJobInput {
  dsrRequestId: string;
  tenantId: string;
}

export interface CreateExportArtifactInput {
  dsrRequestId: string;
  tenantId: string;
  fileType: 'JSON' | 'CSV' | 'ZIP';
  fileName: string;
  fileSizeBytes?: number | null;
  storageUri: string;
  encryptionKeyId?: string | null;
  checksumSha256?: string | null;
  expiresAt: Date;
}

export interface LearnerProfileExport {
  id: string;
  tenant_id: string;
  parent_id: string;
  first_name: string | null;
  last_name: string | null;
  grade_level: string | null;
  status: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface AssessmentExport {
  id: string;
  baseline_score: number | null;
  taken_at: string;
}

export interface SessionExport {
  id: string;
  started_at: string;
  ended_at: string | null;
  summary: string | null;
}

export interface EventExport {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

export interface RecommendationExport {
  id: string;
  content: string;
  rationale: string | null;
  created_at: string;
}

export interface SubscriptionExport {
  id: string;
  plan: string;
  status: string;
  started_at: string;
  ends_at: string | null;
}

export interface AiCallLogExport {
  id: string;
  session_id: string | null;
  model_id: string;
  prompt_token_count: number | null;
  completion_token_count: number | null;
  latency_ms: number | null;
  status: string;
  created_at: string;
  /** Input/output are excluded by default for privacy, can be included if explicitly requested */
  input_summary: string | null;
  output_summary: string | null;
}

export interface ConsentLogExport {
  id: string;
  consent_type: string;
  consent_action: string;
  consent_version: string | null;
  created_at: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT DATA EXPORT (COPPA COMPLIANCE)
// ════════════════════════════════════════════════════════════════════════════════

export interface ConsentRecordExport {
  id: string;
  learner_id: string;
  consent_type: string;
  status: string;
  granted_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
  granted_by_user_id: string | null;
  text_version: string | null;
  last_updated_at: string;
}

export interface ParentalConsentExport {
  parent_id: string;
  learner_id: string;
  consent_link_token_hash: string;
  status: string;
  created_at: string;
  used_at: string | null;
  verification_method: string | null;
  verification_status: string | null;
  verification_completed_at: string | null;
}

export interface ExportBundle {
  /** Export metadata */
  export_info: {
    generated_at: string;
    request_id: string;
    learner_id: string;
    export_version: '2.0';
    includes_consent_data: boolean;
  };
  learner: LearnerProfileExport;
  /** All consent records for this learner */
  consent_records: ConsentRecordExport[];
  /** Parental consent verification history */
  parental_consents: ParentalConsentExport[];
  assessments: AssessmentExport[];
  sessions: SessionExport[];
  events: EventExport[];
  recommendations: RecommendationExport[];
  subscriptions: SubscriptionExport[];
  ai_call_logs: AiCallLogExport[];
  consent_logs: ConsentLogExport[];
}

// ════════════════════════════════════════════════════════════════════════════════
// DSR API RESPONSES
// ════════════════════════════════════════════════════════════════════════════════

export interface DsrRequestSummary {
  id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  learner_id: string;
  learner_name: string | null;
  created_at: Date;
  /** For DELETE requests - when grace period ends */
  grace_period_ends_at: Date | null;
  /** For DELETE requests - when deletion will occur */
  scheduled_deletion_at: Date | null;
  /** Days remaining in grace period (null if not in grace period) */
  grace_period_days_remaining: number | null;
  /** Can this request be cancelled? */
  can_cancel: boolean;
  /** For EXPORT requests - download URL if ready */
  download_url: string | null;
  /** Download expiration if available */
  download_expires_at: Date | null;
}

export interface DsrCreateResponse {
  request_id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  message: string;
  /** For DELETE requests - confirmation of grace period */
  grace_period_info?: {
    grace_period_ends_at: Date;
    scheduled_deletion_at: Date;
    cancellation_deadline: Date;
  };
  /** For EXPORT requests - estimated completion time */
  estimated_completion?: Date;
}

export interface RateLimitInfo {
  allowed: boolean;
  requests_today: number;
  max_requests_per_day: number;
  next_allowed_at: Date | null;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════

export const DSR_CONFIG = {
  /** Grace period for deletion requests in days */
  GRACE_PERIOD_DAYS: 30,
  /** Maximum export requests per user per day */
  MAX_EXPORT_REQUESTS_PER_DAY: 1,
  /** Maximum delete requests per user per day */
  MAX_DELETE_REQUESTS_PER_DAY: 1,
  /** How long export files are available for download */
  EXPORT_RETENTION_DAYS: 7,
  /** Export file format version */
  EXPORT_VERSION: '2.0' as const,
} as const;
