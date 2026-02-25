// ==============================================================================
// AIVO Status Page Service — TypeScript Types
// ==============================================================================

export type StatusLevel =
  | 'operational'
  | 'degraded'
  | 'partial_outage'
  | 'major_outage'
  | 'maintenance';

export type IncidentSeverity = 'minor' | 'major' | 'critical';

export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'
  | 'postmortem';

export type MaintenanceStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Component {
  id: string;
  name: string;
  description: string;
  group: ComponentGroup;
  status: StatusLevel;
  /** Prometheus metric query to check health */
  healthQuery: string;
  /** Prometheus metric query for response time (P95) */
  latencyQuery?: string;
  /** Prometheus metric query for error rate */
  errorRateQuery?: string;
  order: number;
}

export type ComponentGroup =
  | 'core_platform'
  | 'learning_services'
  | 'administrative'
  | 'infrastructure';

export interface ComponentGroupInfo {
  id: ComponentGroup;
  name: string;
  description: string;
  order: number;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  message: string;
  components: string[]; // component IDs
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  is_auto: boolean; // auto-created by detection system
}

export interface IncidentUpdate {
  id: string;
  incident_id: string;
  status: IncidentStatus;
  message: string;
  created_at: string;
}

export interface MaintenanceWindow {
  id: string;
  title: string;
  description: string;
  components: string[];
  status: MaintenanceStatus;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscriber {
  id: string;
  email: string;
  webhook_url: string | null;
  components: string[] | null; // null = all components
  verified: boolean;
  verification_token: string;
  unsubscribe_token: string;
  created_at: string;
}

export interface UptimeEntry {
  component_id: string;
  date: string; // YYYY-MM-DD
  uptime_percent: number;
  total_checks: number;
  failed_checks: number;
}

export interface StatusResponse {
  overall: StatusLevel;
  groups: {
    group: ComponentGroupInfo;
    components: {
      id: string;
      name: string;
      description: string;
      status: StatusLevel;
    }[];
  }[];
  active_incidents: Incident[];
  upcoming_maintenance: MaintenanceWindow[];
  updated_at: string;
}

export interface AlertmanagerPayload {
  version: string;
  groupKey: string;
  status: 'firing' | 'resolved';
  receiver: string;
  alerts: AlertmanagerAlert[];
}

export interface AlertmanagerAlert {
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL: string;
  fingerprint: string;
}

export interface PrometheusQueryResult {
  status: 'success' | 'error';
  data: {
    resultType: 'vector' | 'matrix' | 'scalar' | 'string';
    result: Array<{
      metric: Record<string, string>;
      value?: [number, string];
      values?: [number, string][];
    }>;
  };
}

export interface MetricSnapshot {
  component_id: string;
  is_healthy: boolean;
  error_rate: number | null;
  p95_latency_ms: number | null;
  timestamp: string;
}
