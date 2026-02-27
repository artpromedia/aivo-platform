import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock fetch ───────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  getControls,
  getControl,
  getControlSummary,
  getEvidence,
  getEvidenceDownloadUrl,
  getCollectors,
  getCollectorRuns,
  triggerCollector,
  triggerAllCollectors,
  updateCollectorSchedule,
  createAuditPackage,
  getAuditPackages,
  getAuditPackageDownloadUrl,
} from '@/lib/soc2-api';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Controls ─────────────────────────────────────────────────────

describe('getControls', () => {
  it('fetches all controls', async () => {
    const controls = [{ id: 'CC1.1', name: 'Access Control' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(controls),
    });

    const result = await getControls();
    expect(result).toEqual(controls);
  });

  it('passes category and section as query params', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await getControls({ category: 'security', section: 'access' });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('category=security');
    expect(url).toContain('section=access');
  });

  it('passes access token in Authorization header', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
    });

    await getControls({ accessToken: 'tok-123' });

    const options = mockFetch.mock.calls[0][1];
    expect(options.headers).toHaveProperty('Authorization', 'Bearer tok-123');
  });
});

describe('getControl', () => {
  it('fetches single control by ID', async () => {
    const control = { id: 'CC1.1', name: 'Access', recentEvidence: [] };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(control),
    });

    const result = await getControl('CC1.1');
    expect(result).toEqual(control);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/controls/CC1.1'),
      expect.anything(),
    );
  });
});

describe('getControlSummary', () => {
  it('fetches control summary', async () => {
    const summary = [{ id: 'CC1', total: 5, compliant: 4 }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(summary),
    });

    const result = await getControlSummary();
    expect(result).toEqual(summary);
  });
});

// ── Evidence ─────────────────────────────────────────────────────

describe('getEvidence', () => {
  it('fetches evidence with filters', async () => {
    const evidence = { items: [], total: 0 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(evidence),
    });

    await getEvidence({
      controlId: 'CC1.1',
      from: '2026-01-01',
      to: '2026-02-01',
      limit: 10,
      offset: 0,
    });

    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain('controlId=CC1.1');
    expect(url).toContain('from=2026-01-01');
    expect(url).toContain('limit=10');
  });

  it('fetches without filters', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ items: [], total: 0 }),
    });

    await getEvidence();
    expect(mockFetch).toHaveBeenCalled();
  });
});

describe('getEvidenceDownloadUrl', () => {
  it('fetches download URL for evidence', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ url: 'https://storage.example.com/evidence-1.pdf' }),
    });

    const result = await getEvidenceDownloadUrl('evidence-1');
    expect(result.url).toBe('https://storage.example.com/evidence-1.pdf');
  });
});

// ── Collectors ───────────────────────────────────────────────────

describe('getCollectors', () => {
  it('fetches all collectors', async () => {
    const collectors = [{ id: 'col-1', name: 'GitHub Collector' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(collectors),
    });

    const result = await getCollectors();
    expect(result).toEqual(collectors);
  });
});

describe('getCollectorRuns', () => {
  it('fetches runs for a collector', async () => {
    const runs = [{ id: 'run-1', status: 'completed' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(runs),
    });

    const result = await getCollectorRuns('col-1');
    expect(result).toEqual(runs);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/collectors/col-1/runs'),
      expect.anything(),
    );
  });
});

describe('triggerCollector', () => {
  it('triggers a specific collector', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Collector triggered' }),
    });

    const result = await triggerCollector('col-1');
    expect(result.message).toBe('Collector triggered');

    const options = mockFetch.mock.calls[0][1];
    expect(options.method).toBe('POST');
  });
});

describe('triggerAllCollectors', () => {
  it('triggers all collectors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'All collectors triggered' }),
    });

    const result = await triggerAllCollectors();
    expect(result.message).toBe('All collectors triggered');
  });
});

describe('updateCollectorSchedule', () => {
  it('updates collector cron schedule', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Schedule updated' }),
    });

    await updateCollectorSchedule('col-1', {
      cronExpr: '0 0 * * *',
      enabled: true,
    });

    const options = mockFetch.mock.calls[0][1];
    expect(options.method).toBe('PATCH');
    expect(JSON.parse(options.body)).toEqual({
      cronExpr: '0 0 * * *',
      enabled: true,
    });
  });
});

// ── Error handling ───────────────────────────────────────────────

describe('error handling', () => {
  it('throws on non-ok response with error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: () => Promise.resolve({ message: 'Access denied' }),
    });

    await expect(getControls()).rejects.toThrow('Access denied');
  });

  it('throws with status text when json parsing fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('parse failed')),
    });

    await expect(getControls()).rejects.toThrow('Internal Server Error');
  });
});
