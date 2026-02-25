// ==============================================================================
// AIVO Status Page — API Client
// ==============================================================================

import type { StatusResponse, Incident, UptimeHistory, MaintenanceWindow } from './types';

const API_BASE = process.env.NEXT_PUBLIC_STATUS_API_URL || '';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${await res.text()}`);
  }

  return res.json() as Promise<T>;
}

/** Get current status of all components */
export async function getStatus(): Promise<StatusResponse> {
  return apiFetch<StatusResponse>('/api/status');
}

/** Get status summary (lightweight) */
export async function getStatusSummary(): Promise<{
  status: string;
  active_incidents: number;
  updated_at: string;
}> {
  return apiFetch('/api/status/summary');
}

/** Get uptime history */
export async function getUptimeHistory(
  days: number = 90,
  component?: string,
): Promise<UptimeHistory> {
  const params = new URLSearchParams({ days: days.toString() });
  if (component) params.set('component', component);
  return apiFetch<UptimeHistory>(`/api/status/history?${params}`);
}

/** List incidents */
export async function getIncidents(
  page: number = 1,
  limit: number = 20,
  status?: string,
): Promise<{
  incidents: Incident[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
  if (status) params.set('status', status);
  return apiFetch(`/api/incidents?${params}`);
}

/** Get single incident with updates */
export async function getIncident(id: string): Promise<Incident> {
  return apiFetch<Incident>(`/api/incidents/${id}`);
}

/** List maintenance windows */
export async function getMaintenanceWindows(
  page: number = 1,
  limit: number = 20,
): Promise<{
  maintenance: MaintenanceWindow[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> {
  return apiFetch(`/api/maintenance?page=${page}&limit=${limit}`);
}

/** Subscribe to status updates */
export async function subscribe(
  email: string,
  webhookUrl?: string,
  components?: string[],
): Promise<{ message: string; id: string }> {
  return apiFetch('/api/subscribers', {
    method: 'POST',
    body: JSON.stringify({ email, webhook_url: webhookUrl, components }),
  });
}
