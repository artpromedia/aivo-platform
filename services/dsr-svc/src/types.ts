export type DsrRequestType = 'EXPORT' | 'DELETE';

export type DsrRequestStatus = 'RECEIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';

export interface DsrRequest {
  id: string;
  tenant_id: string;
  parent_id: string;
  learner_id: string;
  request_type: DsrRequestType;
  status: DsrRequestStatus;
  reason: string | null;
  export_location: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
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

export interface ExportBundle {
  learner: LearnerProfileExport;
  assessments: AssessmentExport[];
  sessions: SessionExport[];
  events: EventExport[];
  recommendations: RecommendationExport[];
  subscriptions: SubscriptionExport[];
}
