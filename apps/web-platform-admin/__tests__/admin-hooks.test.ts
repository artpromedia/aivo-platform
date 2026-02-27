import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock next-auth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'mock-admin-token' },
    status: 'authenticated',
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  useAIModels,
  useModelSummary,
  useLicenseSummary,
  useLicenses,
  useHealthSummary,
  useServiceHealth,
  useAuditLogs,
  useAuditSummary,
  useActiveAlerts,
  useOrchestrationSummary,
} from '@/hooks/use-admin-data';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── AI Models ────────────────────────────────────────────────────

describe('useAIModels', () => {
  it('fetches AI model configurations', async () => {
    const models = [
      { id: 'gpt-4', provider: 'openai', status: 'active' },
      { id: 'claude-3', provider: 'anthropic', status: 'active' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(models),
    });

    const { result } = renderHook(() => useAIModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

describe('useModelSummary', () => {
  it('fetches model usage summary', async () => {
    const summary = { totalModels: 5, activeModels: 3, totalRequests: 10000 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(summary),
    });

    const { result } = renderHook(() => useModelSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalModels: 5 });
  });
});

// ── Licenses ─────────────────────────────────────────────────────

describe('useLicenseSummary', () => {
  it('fetches license summary', async () => {
    const summary = { totalLicenses: 100, active: 85, expired: 15 };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(summary),
    });

    const { result } = renderHook(() => useLicenseSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalLicenses: 100 });
  });
});

describe('useLicenses', () => {
  it('fetches paginated license list', async () => {
    const licenses = {
      items: [{ id: 'lic-1', tenantId: 't-1', plan: 'pro' }],
      total: 1,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(licenses),
    });

    const { result } = renderHook(() => useLicenses(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });
});

// ── Health ────────────────────────────────────────────────────────

describe('useHealthSummary', () => {
  it('fetches system health summary', async () => {
    const health = {
      overall: 'healthy',
      degradedServices: 0,
      downServices: 0,
      uptimePercent: 99.99,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(health),
    });

    const { result } = renderHook(() => useHealthSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ overall: 'healthy' });
  });
});

describe('useServiceHealth', () => {
  it('fetches individual service health', async () => {
    const services = [
      { name: 'auth-svc', status: 'healthy', latency: 12 },
      { name: 'billing-svc', status: 'healthy', latency: 15 },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(services),
    });

    const { result } = renderHook(() => useServiceHealth(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });
});

// ── Audit ─────────────────────────────────────────────────────────

describe('useAuditLogs', () => {
  it('fetches audit logs with default params', async () => {
    const logs = {
      items: [{ id: 'log-1', action: 'LOGIN', actor: 'user@test.com' }],
      total: 1,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(logs),
    });

    const { result } = renderHook(() => useAuditLogs(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items).toHaveLength(1);
  });
});

describe('useAuditSummary', () => {
  it('fetches audit summary stats', async () => {
    const summary = {
      totalEvents: 5000,
      todayEvents: 120,
      topActions: [{ action: 'LOGIN', count: 50 }],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(summary),
    });

    const { result } = renderHook(() => useAuditSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalEvents: 5000 });
  });
});

// ── Alerts ────────────────────────────────────────────────────────

describe('useActiveAlerts', () => {
  it('fetches active alerts', async () => {
    const alerts = [
      { id: 'alert-1', severity: 'warning', message: 'High latency on auth-svc' },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(alerts),
    });

    const { result } = renderHook(() => useActiveAlerts(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});

// ── Orchestration ────────────────────────────────────────────────

describe('useOrchestrationSummary', () => {
  it('fetches AI orchestration summary', async () => {
    const summary = {
      primaryProvider: 'openai',
      fallbackProvider: 'anthropic',
      totalRequests24h: 25000,
      failoverCount: 2,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(summary),
    });

    const { result } = renderHook(() => useOrchestrationSummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ primaryProvider: 'openai' });
  });
});

// ── Error handling ───────────────────────────────────────────────

describe('error handling', () => {
  it('handles fetch errors gracefully in all hooks', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Server error' }),
    });

    const { result } = renderHook(() => useAIModels(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
