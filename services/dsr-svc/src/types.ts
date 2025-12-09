export type DsrRequestType = 'EXPORT' | 'DELETE';

export type DsrRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED' | 'FAILED';

export type DsrJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

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

export interface ExportBundle {
  learner: LearnerProfileExport;
  assessments: AssessmentExport[];
  sessions: SessionExport[];
  events: EventExport[];
  recommendations: RecommendationExport[];
  subscriptions: SubscriptionExport[];
  ai_call_logs: AiCallLogExport[];
  consent_logs: ConsentLogExport[];
}
