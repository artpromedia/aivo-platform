/**
 * Theme Provider — Next.js API Route Tests
 *
 * Tests for the GET endpoint that proxies tenant branding.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// We need to dynamically import after mocking
let GET: typeof import('../src/next-api').GET;

beforeEach(async () => {
  vi.resetModules();
  mockFetch.mockReset();
  const mod = await import('../src/next-api');
  GET = mod.GET;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createMockRequest(url: string, headers: Record<string, string> = {}): any {
  return {
    url,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  };
}

// =============================================================================
// GET /api/branding
// =============================================================================

describe('GET /api/branding', () => {
  it('should return 400 if domain parameter is missing and no host header', async () => {
    const req = createMockRequest('http://localhost:3000/api/branding');
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing domain parameter');
  });

  it('should use domain query parameter when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: 'Test School' }),
    });

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=school.example.com',
    );
    await GET(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('domain=school.example.com'),
      expect.any(Object),
    );
  });

  it('should fall back to host header when domain param is absent', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: 'Host School' }),
    });

    const req = createMockRequest('http://localhost:3000/api/branding', {
      host: 'myschool.aivolearning.com:3000',
    });
    await GET(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('domain=myschool.aivolearning.com'),
      expect.any(Object),
    );
  });

  it('should return upstream data on successful proxy', async () => {
    const upstreamData = {
      displayName: 'Oak Valley School',
      colorPrimary: '#FF5500',
      fontFamily: 'Roboto, sans-serif',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => upstreamData,
    });

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=oakvalley.edu',
    );
    const response = await GET(req);
    const body = await response.json();

    expect(body.displayName).toBe('Oak Valley School');
    expect(body.colorPrimary).toBe('#FF5500');
  });

  it('should include cache headers on successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: 'Cached School' }),
    });

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=cached.edu',
    );
    const response = await GET(req);

    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
  });

  it('should fall back to DEFAULT_THEME when upstream returns non-OK', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=error.edu',
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.displayName).toBe('Aivo Learning');
    expect(body.colorPrimary).toBe('#6366F1');
  });

  it('should fall back to DEFAULT_THEME when fetch throws (network error)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=offline.edu',
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.displayName).toBe('Aivo Learning');
  });

  it('should encode domain parameter in upstream URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ displayName: 'Encoded' }),
    });

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=schöol.example.com',
    );
    await GET(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('sch%C3%B6ol.example.com'),
      expect.any(Object),
    );
  });

  it('should pass Accept: application/json header to upstream', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    const req = createMockRequest(
      'http://localhost:3000/api/branding?domain=test.edu',
    );
    await GET(req);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: 'application/json' }),
      }),
    );
  });
});
