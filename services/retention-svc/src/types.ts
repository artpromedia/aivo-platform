export type ResourceType =
  | 'EVENT'
  | 'HOMEWORK_UPLOAD'
  | 'AI_INCIDENT'
  | 'SESSION'
  | 'AI_CALL_LOG'
  | 'RECOMMENDATION'
  | 'CONSENT_LOG'
  | 'DSR_EXPORT';

export interface RetentionPolicy {
  id: string;
  tenant_id: string | null;
  resource_type: ResourceType;
  retention_days: number;
  /** If true, soft-delete (set deleted_at) instead of hard delete */
  soft_delete_only: boolean;
  config_json: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}
