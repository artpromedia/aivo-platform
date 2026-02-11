/**
 * Tests for @aivo/auth-web session utilities
 *
 * Covers verifyToken, setAuthCookies, clearAuthCookies, payloadToSession.
 * Server-side getServerSession/requireSession are integration-level (need next/headers).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import {
  verifyToken,
  setAuthCookies,
  clearAuthCookies,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  _resetKeyCache,
  type AuthSession,
} from './session';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let publicKeyPEM: string;
let privateKey: CryptoKey;

/**
 * Generate a valid JWT signed with our test key pair.
 */
async function signTestToken(payload: Record<string, unknown>, expiresIn = '1h'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(privateKey);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey as CryptoKey;
  publicKeyPEM = await exportSPKI(pair.publicKey as CryptoKey);

  // Inject the public key into env so verifyToken can find it
  process.env.AUTH_PUBLIC_KEY = publicKeyPEM;
  _resetKeyCache();
});

afterEach(() => {
  delete process.env.AUTH_PUBLIC_KEY;
  delete process.env.JWT_PUBLIC_KEY;
  _resetKeyCache();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('verifyToken', () => {
  it('returns a valid AuthSession for a properly signed JWT', async () => {
    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: ['TEACHER'],
      name: 'Jane Smith',
      email: 'jane@school.edu',
    });

    const session = await verifyToken(token);

    expect(session).not.toBeNull();
    expect(session!.userId).toBe('user-123');
    expect(session!.tenantId).toBe('tenant-456');
    expect(session!.roles).toEqual(['TEACHER']);
    expect(session!.name).toBe('Jane Smith');
    expect(session!.email).toBe('jane@school.edu');
    expect(session!.accessToken).toBe(token);
  });

  it('returns null for an expired token', async () => {
    const token = await signTestToken(
      { sub: 'user-123', tenant_id: 'tenant-456', roles: [] },
      '-1s' // already expired
    );

    const session = await verifyToken(token);
    expect(session).toBeNull();
  });

  it('returns null for a tampered token', async () => {
    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: [],
    });

    // Tamper with the payload
    const parts = token.split('.');
    parts[1] = parts[1] + 'tampered';
    const tampered = parts.join('.');

    const session = await verifyToken(tampered);
    expect(session).toBeNull();
  });

  it('returns null for a token signed with a different key', async () => {
    // Generate a completely different key pair
    const otherPair = await generateKeyPair('RS256');
    const otherToken = await new SignJWT({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: [],
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(otherPair.privateKey);

    const session = await verifyToken(otherToken);
    expect(session).toBeNull();
  });

  it('returns null when no public key is configured', async () => {
    delete process.env.AUTH_PUBLIC_KEY;
    _resetKeyCache();

    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: [],
    });

    const session = await verifyToken(token);
    expect(session).toBeNull();
  });

  it('returns null when JWT is missing required claims (sub)', async () => {
    const token = await signTestToken({
      tenant_id: 'tenant-456',
      roles: ['TEACHER'],
    });

    const session = await verifyToken(token);
    expect(session).toBeNull();
  });

  it('returns null when JWT is missing required claims (tenant_id)', async () => {
    const token = await signTestToken({
      sub: 'user-123',
      roles: ['TEACHER'],
    });

    const session = await verifyToken(token);
    expect(session).toBeNull();
  });

  it('handles multiple roles correctly', async () => {
    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: ['TEACHER', 'CURRICULUM_AUTHOR'],
      name: 'Multi-role User',
      email: 'multi@school.edu',
    });

    const session = await verifyToken(token);
    expect(session!.roles).toEqual(['TEACHER', 'CURRICULUM_AUTHOR']);
  });

  it('handles learnerId claim', async () => {
    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: ['LEARNER'],
      learnerId: 'learner-789',
    });

    const session = await verifyToken(token);
    expect(session!.learnerId).toBe('learner-789');
  });

  it('sets name and email to null when not present', async () => {
    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: ['LEARNER'],
    });

    const session = await verifyToken(token);
    expect(session!.name).toBeNull();
    expect(session!.email).toBeNull();
    expect(session!.learnerId).toBeNull();
  });

  it('uses JWT_PUBLIC_KEY as fallback env var', async () => {
    delete process.env.AUTH_PUBLIC_KEY;
    process.env.JWT_PUBLIC_KEY = publicKeyPEM;
    _resetKeyCache();

    const token = await signTestToken({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: [],
    });

    const session = await verifyToken(token);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe('user-123');
  });
});

describe('setAuthCookies', () => {
  it('sets access and refresh cookies', () => {
    const cookies: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
    const mockResponse = {
      cookies: {
        set(name: string, value: string, opts?: Record<string, unknown>) {
          cookies.push({ name, value, opts: opts ?? {} });
        },
      },
    };

    setAuthCookies(mockResponse, 'access-token-value', 'refresh-token-value');

    expect(cookies).toHaveLength(2);

    const accessCookie = cookies.find((c) => c.name === ACCESS_COOKIE);
    expect(accessCookie).toBeDefined();
    expect(accessCookie!.value).toBe('access-token-value');
    expect(accessCookie!.opts.httpOnly).toBe(true);
    expect(accessCookie!.opts.path).toBe('/');

    const refreshCookie = cookies.find((c) => c.name === REFRESH_COOKIE);
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie!.value).toBe('refresh-token-value');
    expect(refreshCookie!.opts.httpOnly).toBe(true);
  });
});

describe('clearAuthCookies', () => {
  it('clears both cookies by setting maxAge=0', () => {
    const cookies: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
    const mockResponse = {
      cookies: {
        set(name: string, value: string, opts?: Record<string, unknown>) {
          cookies.push({ name, value, opts: opts ?? {} });
        },
      },
    };

    clearAuthCookies(mockResponse);

    expect(cookies).toHaveLength(2);

    for (const cookie of cookies) {
      expect(cookie.value).toBe('');
      expect(cookie.opts.maxAge).toBe(0);
      expect(cookie.opts.httpOnly).toBe(true);
    }
  });
});
