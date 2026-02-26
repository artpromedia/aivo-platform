import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock global fetch ────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    blob: () => Promise.resolve(new Blob(['data'])),
    headers: new Headers({ 'content-type': 'application/json' }),
  };
}

function err(status: number, body = { message: 'Error' }) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(body.message),
    headers: new Headers(),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// We need to re-import after stubbing fetch
// Use dynamic import to work around module caching
describe('api module', () => {
  it('api export has CRUD methods', async () => {
    const mod = await import('@/src/lib/api');
    expect(mod.api).toBeDefined();
    expect(typeof mod.api.get).toBe('function');
    expect(typeof mod.api.post).toBe('function');
    expect(typeof mod.api.put).toBe('function');
    expect(typeof mod.api.delete).toBe('function');
  });
});

describe('api.get', () => {
  it('makes GET request and returns JSON', async () => {
    mockFetch.mockResolvedValue(ok({ items: [1, 2, 3] }));
    const { api } = await import('@/src/lib/api');
    const result = await api.get('/test-endpoint');
    expect(result).toEqual({ items: [1, 2, 3] });
  });
});

describe('api.post', () => {
  it('makes POST request with body', async () => {
    mockFetch.mockResolvedValue(ok({ id: 'new-1' }));
    const { api } = await import('@/src/lib/api');
    const result = await api.post('/items', { name: 'Test' });
    expect(result).toEqual({ id: 'new-1' });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('POST');
  });
});

describe('api.put', () => {
  it('makes PUT request', async () => {
    mockFetch.mockResolvedValue(ok({ updated: true }));
    const { api } = await import('@/src/lib/api');
    const result = await api.put('/items/1', { name: 'Updated' });
    expect(result).toEqual({ updated: true });

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('PUT');
  });
});

describe('api.delete', () => {
  it('makes DELETE request', async () => {
    mockFetch.mockResolvedValue(ok(null));
    const { api } = await import('@/src/lib/api');
    await api.delete('/items/1');

    const [, opts] = mockFetch.mock.calls[0];
    expect(opts.method).toBe('DELETE');
  });
});

describe('getBlob', () => {
  it('returns a blob from response', async () => {
    const blob = new Blob(['test'], { type: 'application/pdf' });
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(blob),
    });
    const { api } = await import('@/src/lib/api');
    const result = await api.getBlob('/download/file.pdf');
    expect(result).toBeInstanceOf(Blob);
  });
});

describe('isDevMode', () => {
  it('returns a boolean', async () => {
    const { isDevMode } = await import('@/src/lib/api');
    expect(typeof isDevMode()).toBe('boolean');
  });
});
