// ==============================================================================
// AIVO Status Page — Shared Types (Frontend)
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

export interface ComponentGroupInfo {
  id: string;
  name: string;
  description: string;
  order: number;
}

export interface ComponentInfo {
  id: string;
  name: string;
  description: string;
  status: StatusLevel;
}

export interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  message: string;
  components: string[];
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  is_auto: boolean;
  updates?: IncidentUpdate[];
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
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
}

export interface StatusResponse {
  overall: StatusLevel;
  groups: {
    group: ComponentGroupInfo;
    components: ComponentInfo[];
  }[];
  active_incidents: Incident[];
  upcoming_maintenance: MaintenanceWindow[];
  updated_at: string;
}

export interface UptimeHistory {
  days: number;
  components: Record<string, { date: string; uptime_percent: number }[]>;
}

export const STATUS_LABELS: Record<StatusLevel, string> = {
  operational: 'Operational',
  degraded: 'Degraded Performance',
  partial_outage: 'Partial Outage',
  major_outage: 'Major Outage',
  maintenance: 'Under Maintenance',
};

export const STATUS_COLORS: Record<StatusLevel, string> = {
  operational: 'bg-status-operational',
  degraded: 'bg-status-degraded',
  partial_outage: 'bg-status-partial_outage',
  major_outage: 'bg-status-major_outage',
  maintenance: 'bg-status-maintenance',
};

export const STATUS_TEXT_COLORS: Record<StatusLevel, string> = {
  operational: 'text-status-operational',
  degraded: 'text-status-degraded',
  partial_outage: 'text-status-partial_outage',
  major_outage: 'text-status-major_outage',
  maintenance: 'text-status-maintenance',
};
