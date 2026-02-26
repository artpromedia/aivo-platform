import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  listCreatorItems,
  getCreatorItem,
  createItem,
  updateItem,
  createVersion,
  submitForReview,
  discardVersion,
} from '../lib/api';

// ── Mock global fetch ────────────────────────────────────────────

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function ok<T>(data: T) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
  };
}

function err(status: number) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    json: () => Promise.resolve({ error: `Error ${status}` }),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
  // First call to getAccessToken (session endpoint), then actual call
  mockFetch.mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/api/auth/session')) {
      return Promise.resolve(ok({ accessToken: 'test-token' }));
    }
    return Promise.resolve(ok({ data: [] }));
  });
});

// ── listCreatorItems ─────────────────────────────────────────────

describe('listCreatorItems', () => {
  it('fetches items for a vendor', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(ok({ data: [{ id: 'i1', title: 'Item 1' }] }));
    });

    const result = await listCreatorItems('v1');
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('i1');
  });

  it('calls correct endpoint', async () => {
    await listCreatorItems('vendor-abc');
    const apiCall = mockFetch.mock.calls.find(
      (c: string[]) => typeof c[0] === 'string' && c[0].includes('/creators/vendor-abc/items')
    );
    expect(apiCall).toBeDefined();
  });
});

// ── getCreatorItem ───────────────────────────────────────────────

describe('getCreatorItem', () => {
  it('fetches a single item', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(ok({ data: { id: 'i1', title: 'Item' } }));
    });

    const result = await getCreatorItem('v1', 'i1');
    expect(result.data.id).toBe('i1');
  });
});

// ── createItem ───────────────────────────────────────────────────

describe('createItem', () => {
  it('posts new item correctly', async () => {
    mockFetch.mockImplementation((url: string, opts?: RequestInit) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(ok({ data: { id: 'new-1', title: 'New' } }));
    });

    const result = await createItem('v1', {
      title: 'New',
      shortDescription: 'Desc',
      itemType: 'CONTENT_PACK',
    } as any);
    expect(result.data.id).toBe('new-1');
  });

  it('uses POST method', async () => {
    await createItem('v1', { title: 'X' } as any);
    const apiCall = mockFetch.mock.calls.find(
      (c: [string, RequestInit?]) => c[1]?.method === 'POST' && !c[0].includes('/api/auth/')
    );
    expect(apiCall).toBeDefined();
  });
});

// ── createVersion ────────────────────────────────────────────────

describe('createVersion', () => {
  it('creates a version with changelog', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(ok({ data: { id: 'v1', version: '1.0.0', status: 'DRAFT' } }));
    });

    const result = await createVersion('vendor-1', 'item-1', '1.0.0', 'Initial');
    expect(result.data.status).toBe('DRAFT');
  });
});

// ── submitForReview ──────────────────────────────────────────────

describe('submitForReview', () => {
  it('submits version for review', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(ok({ data: { id: 'v1', status: 'PENDING_REVIEW' }, message: 'Submitted' }));
    });

    const result = await submitForReview('v', 'i', 'vid', 'Please review');
    expect(result.message).toBe('Submitted');
  });
});

// ── discardVersion ───────────────────────────────────────────────

describe('discardVersion', () => {
  it('sends DELETE request', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(ok(undefined));
    });

    await discardVersion('v', 'i', 'vid');
    const deleteCall = mockFetch.mock.calls.find(
      (c: [string, RequestInit?]) => c[1]?.method === 'DELETE'
    );
    expect(deleteCall).toBeDefined();
  });
});

// ── Error handling ───────────────────────────────────────────────

describe('API error handling', () => {
  it('throws on non-ok response', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth/session')) return Promise.resolve(ok({ accessToken: 'tok' }));
      return Promise.resolve(err(404));
    });

    await expect(listCreatorItems('v1')).rejects.toThrow();
  });
});
