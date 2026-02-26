import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  getStatus,
  getStatusSummary,
  getUptimeHistory,
  getIncidents,
  getIncident,
  getMaintenanceWindows,
  subscribe,
} from '@/lib/api';

// ── Mock global fetch ────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok(data: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(data), text: () => Promise.resolve('') };
}
function err(status: number, body = 'error') {
  return { ok: false, status, json: () => Promise.resolve({}), text: () => Promise.resolve(body) };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── getStatus ────────────────────────────────────────────────────

describe('getStatus', () => {
  it('fetches /api/status and returns data', async () => {
    const data = { overall: 'operational', groups: [], active_incidents: [], upcoming_maintenance: [], updated_at: '' };
    mockFetch.mockResolvedValue(ok(data));
    const result = await getStatus();
    expect(result.overall).toBe('operational');
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/status'), expect.any(Object));
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValue(err(500, 'Internal Server Error'));
    await expect(getStatus()).rejects.toThrow('API error 500');
  });
});

// ── getStatusSummary ─────────────────────────────────────────────

describe('getStatusSummary', () => {
  it('fetches /api/status/summary', async () => {
    const data = { status: 'operational', active_incidents: 0, updated_at: '2024-01-01' };
    mockFetch.mockResolvedValue(ok(data));
    const result = await getStatusSummary();
    expect(result.status).toBe('operational');
    expect(result.active_incidents).toBe(0);
  });
});

// ── getUptimeHistory ─────────────────────────────────────────────

describe('getUptimeHistory', () => {
  it('defaults to 90 days', async () => {
    mockFetch.mockResolvedValue(ok({ days: 90, components: {} }));
    await getUptimeHistory();
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('days=90');
  });

  it('passes custom days and component', async () => {
    mockFetch.mockResolvedValue(ok({ days: 30, components: {} }));
    await getUptimeHistory(30, 'api-gateway');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('days=30');
    expect(url).toContain('component=api-gateway');
  });
});

// ── getIncidents ─────────────────────────────────────────────────

describe('getIncidents', () => {
  it('fetches incidents with default pagination', async () => {
    const data = { incidents: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    mockFetch.mockResolvedValue(ok(data));
    const result = await getIncidents();
    expect(result.incidents).toEqual([]);
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('limit=20');
  });

  it('passes custom page, limit, and status filter', async () => {
    const data = { incidents: [], pagination: { page: 2, limit: 10, total: 0, pages: 0 } };
    mockFetch.mockResolvedValue(ok(data));
    await getIncidents(2, 10, 'resolved');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('page=2');
    expect(url).toContain('limit=10');
    expect(url).toContain('status=resolved');
  });
});

// ── getIncident ──────────────────────────────────────────────────

describe('getIncident', () => {
  it('fetches a single incident by id', async () => {
    const data = { id: 'inc-1', title: 'Test', severity: 'minor', status: 'resolved' };
    mockFetch.mockResolvedValue(ok(data));
    const result = await getIncident('inc-1');
    expect(result.id).toBe('inc-1');
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('/api/incidents/inc-1');
  });
});

// ── getMaintenanceWindows ────────────────────────────────────────

describe('getMaintenanceWindows', () => {
  it('fetches maintenance windows', async () => {
    const data = { maintenance: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    mockFetch.mockResolvedValue(ok(data));
    const result = await getMaintenanceWindows();
    expect(result.maintenance).toEqual([]);
  });
});

// ── subscribe ────────────────────────────────────────────────────

describe('subscribe', () => {
  it('posts subscription with email', async () => {
    const data = { message: 'Subscribed', id: 'sub-1' };
    mockFetch.mockResolvedValue(ok(data));
    const result = await subscribe('test@example.com');
    expect(result.id).toBe('sub-1');
    const opts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body as string);
    expect(body.email).toBe('test@example.com');
  });

  it('includes webhook_url and components when provided', async () => {
    mockFetch.mockResolvedValue(ok({ message: 'ok', id: 'sub-2' }));
    await subscribe('a@b.com', 'https://hook.example.com', ['api', 'db']);
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.webhook_url).toBe('https://hook.example.com');
    expect(body.components).toEqual(['api', 'db']);
  });
});
