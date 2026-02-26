import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { ApiClient } from '../src/lib/api-client';

function ok<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    headers: new Headers(),
  };
}

function errResponse(status: number, message = 'error') {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ message }),
    headers: new Headers(),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ── ApiClient.getSession ─────────────────────────────────────────

describe('ApiClient.getSession', () => {
  it('returns session on success', async () => {
    const client = new ApiClient('http://localhost:3004');
    const session = { user: { id: 'u1', email: 'a@b.com' }, subscription: null };
    mockFetch.mockResolvedValue(ok(session));

    const result = await client.getSession();
    expect(result.data?.user.id).toBe('u1');
    expect(result.status).toBe(200);
  });

  it('returns error on failure', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockResolvedValue(errResponse(401, 'Unauthorized'));

    const result = await client.getSession();
    expect(result.error).toBe('Unauthorized');
    expect(result.status).toBe(401);
  });
});

// ── ApiClient.checkAuth ──────────────────────────────────────────

describe('ApiClient.checkAuth', () => {
  it('returns isAuthenticated true when user exists', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockResolvedValue(ok({ user: { id: 'u1' }, subscription: null }));

    const result = await client.checkAuth();
    expect(result.isAuthenticated).toBe(true);
    expect(result.user?.id).toBe('u1');
  });

  it('returns isAuthenticated false on network error', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await client.checkAuth();
    expect(result.isAuthenticated).toBe(false);
  });

  it('returns isAuthenticated false on 500 status', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockResolvedValue(errResponse(500, 'Internal error'));

    const result = await client.checkAuth();
    expect(result.isAuthenticated).toBe(false);
  });
});

// ── ApiClient.logout ─────────────────────────────────────────────

describe('ApiClient.logout', () => {
  it('sends POST request', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockResolvedValue(ok(null));

    await client.logout();
    const call = mockFetch.mock.calls[0];
    expect(call[1].method).toBe('POST');
  });
});

// ── ApiClient.createCheckoutSession ──────────────────────────────

describe('ApiClient.createCheckoutSession', () => {
  it('returns checkout URL on success', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockResolvedValue(ok({ url: 'https://checkout.stripe.com/session' }));

    const result = await client.createCheckoutSession({
      plan: 'pro',
      interval: 'monthly',
    });
    expect(result.data?.url).toContain('stripe.com');
  });

  it('sends body with plan and interval', async () => {
    const client = new ApiClient('http://localhost:3004');
    mockFetch.mockResolvedValue(ok({ url: 'https://checkout.stripe.com/session' }));

    await client.createCheckoutSession({
      plan: 'premium',
      interval: 'annual',
    });

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.plan).toBe('premium');
    expect(body.interval).toBe('annual');
  });
});

// ── ApiClient.getAppUrl / buildAppUrl ────────────────────────────

describe('ApiClient URL helpers', () => {
  it('getAppUrl returns base URL', () => {
    const client = new ApiClient('http://localhost:3004');
    expect(client.getAppUrl()).toBe('http://localhost:3004');
  });

  it('buildAppUrl appends path', () => {
    const client = new ApiClient('http://localhost:3004');
    const url = client.buildAppUrl('/dashboard');
    expect(url).toBe('http://localhost:3004/dashboard');
  });

  it('buildAppUrl appends query params', () => {
    const client = new ApiClient('http://localhost:3004');
    const url = client.buildAppUrl('/register', { plan: 'pro', ref: 'abc' });
    expect(url).toContain('plan=pro');
    expect(url).toContain('ref=abc');
  });

  it('buildAppUrl skips undefined params', () => {
    const client = new ApiClient('http://localhost:3004');
    const url = client.buildAppUrl('/register', { plan: 'pro', ref: undefined });
    expect(url).toContain('plan=pro');
    expect(url).not.toContain('ref');
  });
});
