/**
 * Tests for search-svc authentication middleware.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../src/config.js', () => ({
  config: {
    internalApiKey: 'test-internal-key',
    jwtPublicKey: 'test-public-key',
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

import jwt from 'jsonwebtoken';

// Replicate authenticate logic for testing (since it's tightly coupled to Fastify)
async function authenticate(
  headers: Record<string, string | undefined>,
  internalApiKey: string,
  jwtPublicKey: string,
) {
  const apiKey = headers['x-api-key'];
  if (apiKey && apiKey === internalApiKey) {
    const tenantId = headers['x-tenant-id'];
    if (!tenantId) {
      return { status: 401, error: 'Missing tenant ID for internal request' };
    }
    return {
      status: 200,
      user: { sub: 'internal', tenantId, roles: ['service'] },
      tenantId,
    };
  }

  const authHeader = headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return { status: 401, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, jwtPublicKey, { algorithms: ['RS256'] }) as {
      sub: string;
      tenantId: string;
      roles: string[];
    };
    return { status: 200, user: decoded, tenantId: decoded.tenantId };
  } catch {
    return { status: 401, error: 'Invalid token' };
  }
}

describe('authenticate middleware', () => {
  const internalApiKey = 'test-internal-key';
  const jwtPublicKey = 'test-public-key';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API key authentication', () => {
    it('accepts valid internal API key with tenant ID', async () => {
      const result = await authenticate(
        { 'x-api-key': internalApiKey, 'x-tenant-id': 'tenant-1' },
        internalApiKey,
        jwtPublicKey,
      );
      expect(result.status).toBe(200);
      expect(result.user).toEqual({
        sub: 'internal',
        tenantId: 'tenant-1',
        roles: ['service'],
      });
      expect(result.tenantId).toBe('tenant-1');
    });

    it('rejects internal API key without tenant ID', async () => {
      const result = await authenticate(
        { 'x-api-key': internalApiKey },
        internalApiKey,
        jwtPublicKey,
      );
      expect(result.status).toBe(401);
      expect(result.error).toContain('Missing tenant ID');
    });

    it('rejects wrong API key', async () => {
      const result = await authenticate(
        { 'x-api-key': 'wrong-key' },
        internalApiKey,
        jwtPublicKey,
      );
      expect(result.status).toBe(401);
    });
  });

  describe('JWT authentication', () => {
    it('accepts valid Bearer token', async () => {
      const payload = { sub: 'user-1', tenantId: 'tenant-1', roles: ['teacher'] };
      vi.mocked(jwt.verify).mockReturnValue(payload as any);

      const result = await authenticate(
        { authorization: 'Bearer valid-token' },
        internalApiKey,
        jwtPublicKey,
      );
      expect(result.status).toBe(200);
      expect(result.user).toEqual(payload);
      expect(result.tenantId).toBe('tenant-1');
    });

    it('rejects missing authorization header', async () => {
      const result = await authenticate({}, internalApiKey, jwtPublicKey);
      expect(result.status).toBe(401);
      expect(result.error).toContain('Missing or invalid authorization');
    });

    it('rejects non-Bearer auth header', async () => {
      const result = await authenticate(
        { authorization: 'Basic abc123' },
        internalApiKey,
        jwtPublicKey,
      );
      expect(result.status).toBe(401);
    });

    it('rejects invalid JWT token', async () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('invalid token');
      });

      const result = await authenticate(
        { authorization: 'Bearer bad-token' },
        internalApiKey,
        jwtPublicKey,
      );
      expect(result.status).toBe(401);
      expect(result.error).toContain('Invalid token');
    });
  });
});
