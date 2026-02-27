import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock fetch ───────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  formatAuditDate,
  formatRelativeTime,
  formatPolicyChange,
  getActionLabel,
  getActionColor,
  getActorIcon,
  getActorTypeLabel,
  getPolicyAuditLog,
  getTenantAuditLog,
} from '@/lib/audit-api';
import type { PolicyChangeJson, AuditActorType } from '@/lib/audit-api';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Formatting helpers ───────────────────────────────────────────

describe('formatAuditDate', () => {
  it('formats a date string for display', () => {
    const result = formatAuditDate('2026-02-15T14:30:00Z');
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
    // Should contain Feb and 2026
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/2026/);
  });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for very recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes ago for timestamps within the hour', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinAgo)).toBe('5 minutes ago');
  });

  it('returns hours ago for timestamps within the day', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
  });

  it('returns days ago for timestamps within the week', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
  });

  it('handles singular forms', () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();
    expect(formatRelativeTime(oneMinAgo)).toBe('1 minute ago');
  });

  it('falls back to formatted date for old timestamps', () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    // Should fall through to formatAuditDate
    expect(formatRelativeTime(oldDate)).toBeTruthy();
  });
});

describe('formatPolicyChange', () => {
  it('formats a full policy change', () => {
    const change: PolicyChangeJson = {
      policyName: 'Privacy Policy',
      policyVersion: '2.0',
      changedFields: ['scope', 'retention'],
    };
    const result = formatPolicyChange(change);
    expect(result).toContain('Privacy Policy');
    expect(result).toContain('2.0');
    expect(result).toContain('scope, retention');
  });

  it('handles empty change json', () => {
    expect(formatPolicyChange({})).toBe('Policy document modified');
  });

  it('handles partial policy change (name only)', () => {
    const result = formatPolicyChange({ policyName: 'Terms' });
    expect(result).toContain('Terms');
  });

  it('handles change with only changedFields', () => {
    const result = formatPolicyChange({ changedFields: ['title'] });
    expect(result).toContain('Changed: title');
  });
});

describe('getActionLabel', () => {
  it('returns human-readable labels for known actions', () => {
    expect(getActionLabel('CREATED')).toBe('Created');
    expect(getActionLabel('UPDATED')).toBe('Updated');
    expect(getActionLabel('DELETED')).toBe('Deleted');
    expect(getActionLabel('PUBLISHED')).toBe('Published');
    expect(getActionLabel('ARCHIVED')).toBe('Archived');
    expect(getActionLabel('ACTIVATED')).toBe('Activated');
    expect(getActionLabel('DEACTIVATED')).toBe('Deactivated');
  });

  it('returns the raw action for unknown actions', () => {
    expect(getActionLabel('CUSTOM_ACTION')).toBe('CUSTOM_ACTION');
  });
});

describe('getActionColor', () => {
  it('returns CSS class for known actions', () => {
    expect(getActionColor('CREATED')).toContain('green');
    expect(getActionColor('UPDATED')).toContain('blue');
    expect(getActionColor('DELETED')).toContain('red');
  });

  it('returns default class for unknown actions', () => {
    expect(getActionColor('UNKNOWN')).toContain('slate');
  });
});

describe('getActorIcon', () => {
  it('returns icon for each actor type', () => {
    expect(getActorIcon('USER')).toBe('👤');
    expect(getActorIcon('SYSTEM')).toBe('⚙️');
    expect(getActorIcon('AGENT')).toBe('🤖');
  });

  it('returns fallback for unknown actor type', () => {
    expect(getActorIcon('UNKNOWN' as AuditActorType)).toBe('❓');
  });
});

describe('getActorTypeLabel', () => {
  it('returns label for each actor type', () => {
    expect(getActorTypeLabel('USER')).toBe('User');
    expect(getActorTypeLabel('SYSTEM')).toBe('System');
    expect(getActorTypeLabel('AGENT')).toBe('AI Agent');
  });

  it('returns raw type for unknown', () => {
    expect(getActorTypeLabel('BOT' as AuditActorType)).toBe('BOT');
  });
});

// ── API Functions ────────────────────────────────────────────────

describe('getPolicyAuditLog', () => {
  it('fetches policy audit events', async () => {
    const response = {
      events: [{ id: '1', action: 'CREATED' }],
      total: 1,
      page: 1,
      pageSize: 20,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });

    const result = await getPolicyAuditLog('token-123');
    expect(result).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/audit/policies'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('passes filters as query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [], total: 0, page: 1, pageSize: 10 }),
    });

    await getPolicyAuditLog('token', {
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      tenantId: 'tenant-abc',
      page: 2,
      pageSize: 10,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('startDate=2026-01-01');
    expect(calledUrl).toContain('tenantId=tenant-abc');
    expect(calledUrl).toContain('page=2');
  });

  it('throws on API error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.resolve({ message: 'DB connection failed' }),
    });

    await expect(getPolicyAuditLog('token')).rejects.toThrow('DB connection failed');
  });
});

describe('getTenantAuditLog', () => {
  it('fetches events for a specific tenant', async () => {
    const response = { events: [{ id: '1' }], total: 1 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(response),
    });

    const result = await getTenantAuditLog('tok', 'tenant-xyz');
    expect(result).toEqual(response);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/audit/tenant/tenant-xyz'),
      expect.anything(),
    );
  });

  it('passes date filters as query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ events: [], total: 0 }),
    });

    await getTenantAuditLog('tok', 'tenant-1', {
      startDate: '2026-01-15',
      pageSize: 50,
    });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('startDate=2026-01-15');
    expect(calledUrl).toContain('pageSize=50');
  });
});
