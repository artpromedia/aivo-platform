/**
 * Notifications Aggregation API Route
 *
 * GET /api/notifications — aggregates alerts from multiple backend sources
 * into a unified notification list for the district admin bell dropdown.
 *
 * Sources:
 *  • iep-svc    → compliance alerts & overdue IEPs
 *  • sis-sync   → sync failures
 *  • billing    → license/seat warnings
 *  • analytics  → SSO / login anomalies
 */

import { NextResponse } from 'next/server';

const IEP_SVC_URL = process.env.IEP_SVC_URL || 'http://localhost:4070';
const SIS_SYNC_SVC_URL = process.env.SIS_SYNC_SVC_URL || 'http://localhost:4016';
const BILLING_SVC_URL = process.env.BILLING_SVC_URL || 'http://localhost:4060';
const ANALYTICS_SVC_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3010';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  category: 'compliance' | 'sync' | 'license' | 'sso' | 'iep';
  title: string;
  description: string;
  timestamp: string;
  link: string;
  severity: 'info' | 'warning' | 'error';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchJson<T>(url: string, timeout = 4000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => { controller.abort(); }, timeout);
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// ─── Source fetchers ─────────────────────────────────────────────────────────

async function fetchComplianceAlerts(): Promise<Notification[]> {
  const data = await fetchJson<{ alerts?: { id: string; message: string; createdAt?: string }[] }>(
    `${IEP_SVC_URL}/compliance/alerts?status=OPEN`,
  );
  if (!data?.alerts?.length) return [];
  return data.alerts.map((a) => ({
    id: `compliance-${a.id}`,
    category: 'compliance' as const,
    title: 'Compliance Alert',
    description: a.message,
    timestamp: a.createdAt ?? new Date().toISOString(),
    link: '/compliance',
    severity: 'warning' as const,
  }));
}

async function fetchOverdueIeps(): Promise<Notification[]> {
  const data = await fetchJson<{ count?: number; overdue?: number }>(
    `${IEP_SVC_URL}/compliance/overdue`,
  );
  const count = data?.count ?? data?.overdue ?? 0;
  if (count === 0) return [];
  return [
    {
      id: 'iep-overdue',
      category: 'iep',
      title: 'Overdue IEP Reviews',
      description: `${count} IEP annual review${count !== 1 ? 's' : ''} overdue`,
      timestamp: new Date().toISOString(),
      link: '/compliance',
      severity: 'error',
    },
  ];
}

async function fetchSyncFailures(tenantId: string): Promise<Notification[]> {
  if (!tenantId) return [];
  const data = await fetchJson<{
    status?: string;
    lastSync?: string;
    error?: string;
    failures?: { id: string; message: string; timestamp: string }[];
  }>(`${SIS_SYNC_SVC_URL}/api/sync/status?tenantId=${tenantId}`);
  if (!data) return [];

  const notifications: Notification[] = [];

  // Overall sync failure
  if (data.status === 'FAILED' || data.status === 'ERROR') {
    notifications.push({
      id: 'sync-failure',
      category: 'sync',
      title: 'Sync Failed',
      description: data.error ?? `Last sync failed${data.lastSync ? ` at ${new Date(data.lastSync).toLocaleTimeString()}` : ''}`,
      timestamp: data.lastSync ?? new Date().toISOString(),
      link: '/integrations/sis',
      severity: 'error',
    });
  }

  // Individual failures
  if (data.failures?.length) {
    for (const f of data.failures.slice(0, 3)) {
      notifications.push({
        id: `sync-${f.id}`,
        category: 'sync',
        title: 'Sync Issue',
        description: f.message,
        timestamp: f.timestamp,
        link: '/integrations/sis',
        severity: 'warning',
      });
    }
  }

  return notifications;
}

async function fetchLicenseWarnings(): Promise<Notification[]> {
  const data = await fetchJson<{
    seats?: { used: number; total: number };
    usage?: number;
    warningThreshold?: number;
  }>(`${BILLING_SVC_URL}/billing/seats`);
  if (!data) return [];

  let usagePercent = 0;
  if (data.usage !== undefined) {
    usagePercent = data.usage;
  } else if (data.seats && data.seats.total > 0) {
    usagePercent = Math.round((data.seats.used / data.seats.total) * 100);
  }

  if (usagePercent < (data.warningThreshold ?? 85)) return [];

  return [
    {
      id: 'license-seats',
      category: 'license',
      title: 'License Warning',
      description: `Seat usage at ${usagePercent}% capacity`,
      timestamp: new Date().toISOString(),
      link: '/billing',
      severity: usagePercent >= 95 ? 'error' : 'warning',
    },
  ];
}

async function fetchSsoIssues(): Promise<Notification[]> {
  const data = await fetchJson<{
    failedAttempts?: number;
    recentFailures?: number;
    period?: string;
  }>(`${ANALYTICS_SVC_URL}/auth/failed-logins?period=1h`);
  if (!data) return [];
  const count = data.failedAttempts ?? data.recentFailures ?? 0;
  if (count < 5) return []; // Only alert on significant volumes
  return [
    {
      id: 'sso-failures',
      category: 'sso',
      title: 'Login Anomaly',
      description: `${count} failed login attempt${count !== 1 ? 's' : ''} in the last hour`,
      timestamp: new Date().toISOString(),
      link: '/audit',
      severity: count >= 20 ? 'error' : 'warning',
    },
  ];
}

// ─── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId') ?? '';

  // Fetch all sources concurrently — each is fault-tolerant
  const [compliance, overdue, sync, license, sso] = await Promise.all([
    fetchComplianceAlerts(),
    fetchOverdueIeps(),
    fetchSyncFailures(tenantId),
    fetchLicenseWarnings(),
    fetchSsoIssues(),
  ]);

  const notifications: Notification[] = [
    ...compliance,
    ...overdue,
    ...sync,
    ...license,
    ...sso,
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return NextResponse.json({ notifications, count: notifications.length });
}
