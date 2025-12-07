export type ResourceType = 'EVENT' | 'HOMEWORK_UPLOAD' | 'AI_INCIDENT';

export interface RetentionPolicy {
  id: string;
  tenant_id: string | null;
  resource_type: ResourceType;
  retention_days: number;
  config_json: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}
