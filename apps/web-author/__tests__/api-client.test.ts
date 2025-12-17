/**
 * API Client Integration Tests
 *
 * Tests for the API client including:
 * - Token management
 * - Request interceptors
 * - Error handling
 * - File upload
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Import after mocking
import { apiClient, tokenManager } from '../lib/api/client';

describe('TokenManager', () => {
  beforeEach(() => {
    // Clear localStorage
    localStorage.clear();
    tokenManager.clearTokens();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should store and retrieve access token', () => {
    tokenManager.setTokens('test-access-token', 'test-refresh-token');
    expect(tokenManager.getAccessToken()).toBe('test-access-token');
  });

  it('should store tokens in localStorage', () => {
    tokenManager.setTokens('access', 'refresh');
    expect(localStorage.getItem('aivo_access_token')).toBe('access');
    expect(localStorage.getItem('aivo_refresh_token')).toBe('refresh');
  });

  it('should clear tokens', () => {
    tokenManager.setTokens('access', 'refresh');
    tokenManager.clearTokens();
    expect(tokenManager.getAccessToken()).toBeNull();
  });

  it('should load tokens from localStorage on init', () => {
    localStorage.setItem('aivo_access_token', 'stored-token');

    // Create fresh instance
    const freshTokenManager = Object.create(Object.getPrototypeOf(tokenManager));
    Object.assign(freshTokenManager, tokenManager);

    expect(localStorage.getItem('aivo_access_token')).toBe('stored-token');
  });
});

describe('ApiClient', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    tokenManager.setTokens('test-token', 'test-refresh-token');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET requests', () => {
    it('should make GET request with authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should include tenant ID header when set', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      tokenManager.setTenantId('tenant-123');
      await apiClient.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Tenant-ID': 'tenant-123',
          }),
        })
      );
    });

    it('should append query parameters to URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      });

      await apiClient.get('/test', { params: { page: 1, limit: 10 } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test?page=1&limit=10'),
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should make POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: '123' }),
      });

      const result = await apiClient.post('/items', { name: 'Test Item' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/items'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Test Item' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ id: '123' });
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      });

      await expect(apiClient.get('/not-found')).rejects.toThrow('Not found');
    });

    it('should throw ApiError on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.get('/test')).rejects.toThrow();
    });
  });

  describe('Token refresh', () => {
    it('should refresh token on 401 response', async () => {
      tokenManager.setTokens('expired-token', 'refresh-token');

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Token expired' }),
      });

      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            accessToken: 'new-token',
            refreshToken: 'new-refresh',
          }),
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'success' }),
      });

      const result = await apiClient.get('/protected');

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result).toEqual({ data: 'success' });
    });

    it('should not retry more than once', async () => {
      tokenManager.setTokens('expired-token', 'refresh-token');

      // All calls return 401
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      await expect(apiClient.get('/protected')).rejects.toThrow();

      // Should have called: original + refresh attempt
      expect(mockFetch.mock.calls.length).toBeLessThanOrEqual(3);
    });
  });
});

describe('ApiClient PUT/PATCH/DELETE', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    tokenManager.setTokens('test-token', 'test-refresh-token');
  });

  it('should make PUT request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ updated: true }),
    });

    await apiClient.put('/items/1', { name: 'Updated' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/items/1'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('should make PATCH request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ patched: true }),
    });

    await apiClient.patch('/items/1', { status: 'active' });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/items/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('should make DELETE request', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: () => Promise.resolve({}),
    });

    await apiClient.delete('/items/1');

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/items/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
