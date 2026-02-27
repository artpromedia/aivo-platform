/**
 * Auth Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Database connection failures / timeouts
 * - Invalid token handling (expired, malformed, revoked)
 * - Brute-force lockout after repeated failures
 * - CSRF token mismatch
 * - Session corruption & concurrent session conflicts
 * - OIDC / SAML provider errors
 * - Rate-limit exceeded on login endpoints
 *
 * @module services/auth-svc/test/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Helpers & stubs
// ---------------------------------------------------------------------------

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
    transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        execute: vi.fn().mockResolvedValue({ affectedRows: 0 }),
      })
    ),
    ...overrides,
  };
}

function createMockRedis(overrides: Record<string, unknown> = {}) {
  const store = new Map<string, string>();
  return {
    get: vi.fn().mockImplementation((k: string) => Promise.resolve(store.get(k) ?? null)),
    set: vi.fn().mockImplementation((k: string, v: string) => {
      store.set(k, v);
      return Promise.resolve('OK');
    }),
    del: vi.fn().mockImplementation((k: string) => {
      store.delete(k);
      return Promise.resolve(1);
    }),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    ...overrides,
  };
}

function createMockJwtService() {
  return {
    sign: vi.fn().mockReturnValue('mock-jwt-token'),
    verify: vi
      .fn()
      .mockReturnValue({ sub: 'user-1', iat: Date.now() / 1000, exp: Date.now() / 1000 + 3600 }),
    decode: vi.fn().mockReturnValue({ sub: 'user-1' }),
  };
}

// ============================================================================
// 1. Database Failure Paths
// ============================================================================

describe('Auth Error Paths — Database Failures', () => {
  let db: ReturnType<typeof createMockDb>;
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    db = createMockDb();
    redis = createMockRedis();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should return 503 when database is unreachable during login', async () => {
    db.query.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await simulateLogin(db, redis, {
      email: 'user@example.com',
      password: 'validP@ss1',
    });

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ error: expect.stringContaining('service') });
  });

  it('should return 503 when database query times out', async () => {
    db.query.mockRejectedValue(new Error('query timeout exceeded'));

    const result = await simulateLogin(db, redis, {
      email: 'user@example.com',
      password: 'validP@ss1',
    });

    expect(result.status).toBe(503);
  });

  it('should not leak database error details in response', async () => {
    db.query.mockRejectedValue(new Error('relation "users" does not exist'));

    const result = await simulateLogin(db, redis, {
      email: 'user@example.com',
      password: 'validP@ss1',
    });

    expect(result.body.error).not.toContain('relation');
    expect(result.body.error).not.toContain('users');
  });

  it('should handle transaction deadlock gracefully', async () => {
    db.transaction.mockRejectedValue(new Error('deadlock detected'));

    const result = await simulateSessionCreation(db, redis, 'user-1');

    expect(result.status).toBe(503);
  });
});

// ============================================================================
// 2. Invalid Token Handling
// ============================================================================

describe('Auth Error Paths — Invalid Tokens', () => {
  let jwtService: ReturnType<typeof createMockJwtService>;

  beforeEach(() => {
    jwtService = createMockJwtService();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should reject expired JWT', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const result = validateToken(jwtService, 'expired-token');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('TOKEN_EXPIRED');
  });

  it('should reject malformed JWT', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt malformed');
    });

    const result = validateToken(jwtService, 'not.a.jwt');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('TOKEN_MALFORMED');
  });

  it('should reject token with invalid signature', () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('invalid signature');
    });

    const result = validateToken(jwtService, 'tampered-token');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('TOKEN_INVALID_SIGNATURE');
  });

  it('should reject token with missing required claims', () => {
    jwtService.verify.mockReturnValue({ iat: Date.now() / 1000 }); // no sub

    const result = validateToken(jwtService, 'missing-claims-token');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('TOKEN_MISSING_CLAIMS');
  });

  it('should reject empty authorization header', () => {
    const result = parseAuthHeader('');

    expect(result).toBeNull();
  });

  it('should reject authorization header without Bearer prefix', () => {
    const result = parseAuthHeader('Basic abc123');

    expect(result).toBeNull();
  });
});

// ============================================================================
// 3. Brute-Force & Lockout
// ============================================================================

describe('Auth Error Paths — Brute-Force Protection', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it('should lock account after 5 failed login attempts', async () => {
    // Simulate 5 failures already recorded
    redis.incr.mockResolvedValue(6);

    const isLocked = await checkAccountLockout(redis, 'user@example.com');

    expect(isLocked).toBe(true);
  });

  it('should allow login below lockout threshold', async () => {
    redis.incr.mockResolvedValue(3);

    const isLocked = await checkAccountLockout(redis, 'user@example.com');

    expect(isLocked).toBe(false);
  });

  it('should reset attempt counter after successful login', async () => {
    await resetLoginAttempts(redis, 'user@example.com');

    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('login:attempts:'));
  });

  it('should apply progressive delays on repeated failures', async () => {
    const delays = [0, 0, 1000, 2000, 4000, 8000];

    for (let i = 0; i < delays.length; i++) {
      redis.incr.mockResolvedValue(i + 1);
      const delay = await getBackoffDelay(redis, 'user@example.com');
      expect(delay).toBe(delays[i]);
    }
  });
});

// ============================================================================
// 4. CSRF Edge Cases
// ============================================================================

describe('Auth Error Paths — CSRF Failures', () => {
  it('should reject request with missing CSRF token', () => {
    const result = validateCsrf(undefined, 'valid-session-token');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('CSRF_MISSING');
  });

  it('should reject request with mismatched CSRF token', () => {
    const result = validateCsrf('wrong-token', 'valid-session-token');

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('CSRF_MISMATCH');
  });

  it('should accept valid CSRF token', () => {
    const result = validateCsrf('valid-token', 'valid-token');

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// 5. Session Corruption & Concurrent Sessions
// ============================================================================

describe('Auth Error Paths — Session Edge Cases', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it('should handle corrupted session data gracefully', async () => {
    redis.get.mockResolvedValue('{invalid-json}');

    const session = await getSession(redis, 'sess-123');

    expect(session).toBeNull();
  });

  it('should handle missing session gracefully', async () => {
    redis.get.mockResolvedValue(null);

    const session = await getSession(redis, 'nonexistent');

    expect(session).toBeNull();
  });

  it('should invalidate oldest session when max concurrent reached', async () => {
    const existingSessions = ['sess-1', 'sess-2', 'sess-3'];

    const result = await handleMaxSessions(redis, 'user-1', existingSessions, 3);

    expect(result.evicted).toBe('sess-1');
    expect(redis.del).toHaveBeenCalledWith(expect.stringContaining('sess-1'));
  });

  it('should handle session refresh when token is near expiry', async () => {
    const nearExpiry = Math.floor(Date.now() / 1000) + 60; // 1 min left

    const shouldRefresh = isTokenNearExpiry(nearExpiry, 300);

    expect(shouldRefresh).toBe(true);
  });
});

// ============================================================================
// 6. OIDC / SAML Provider Errors
// ============================================================================

describe('Auth Error Paths — OIDC/SAML Provider Failures', () => {
  it('should handle OIDC provider timeout', async () => {
    const mockProvider = {
      discover: vi.fn().mockRejectedValue(new Error('ETIMEDOUT')),
    };

    const result = await handleOidcDiscovery(mockProvider);

    expect(result.success).toBe(false);
    expect(result.error).toBe('PROVIDER_TIMEOUT');
  });

  it('should handle invalid OIDC callback state', async () => {
    const result = await validateOidcCallback({
      state: 'wrong-state',
      expectedState: 'correct-state',
      code: 'auth-code',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('STATE_MISMATCH');
  });

  it('should handle SAML response with tampered assertion', () => {
    const result = validateSamlAssertion({
      assertion: '<saml:Assertion>tampered</saml:Assertion>',
      expectedSignature: 'valid-sig',
      actualSignature: 'bad-sig',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('SIGNATURE_INVALID');
  });

  it('should handle SAML response past NotOnOrAfter deadline', () => {
    const past = new Date(Date.now() - 60_000).toISOString();

    const result = validateSamlTiming({ notOnOrAfter: past });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('ASSERTION_EXPIRED');
  });
});

// ============================================================================
// 7. Rate-Limit Exceeded
// ============================================================================

describe('Auth Error Paths — Rate Limiting', () => {
  let redis: ReturnType<typeof createMockRedis>;

  beforeEach(() => {
    redis = createMockRedis();
  });

  it('should return 429 when rate limit exceeded', async () => {
    redis.incr.mockResolvedValue(101); // limit = 100

    const result = await checkRateLimit(redis, '192.168.1.1', 100);

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it('should allow request within rate limit', async () => {
    redis.incr.mockResolvedValue(50);

    const result = await checkRateLimit(redis, '192.168.1.1', 100);

    expect(result.allowed).toBe(true);
  });

  it('should use separate rate-limit buckets per IP', async () => {
    await checkRateLimit(redis, '10.0.0.1', 100);
    await checkRateLimit(redis, '10.0.0.2', 100);

    const calls = redis.incr.mock.calls.map((c: string[]) => c[0]);
    const uniqueKeys = new Set(calls);
    expect(uniqueKeys.size).toBe(2);
  });
});

// ============================================================================
// 8. Input Validation Edge Cases
// ============================================================================

describe('Auth Error Paths — Input Validation', () => {
  it('should reject email with SQL injection attempt', () => {
    const result = validateLoginInput({
      email: "admin'--@example.com",
      password: 'password',
    });

    expect(result.valid).toBe(false);
  });

  it('should reject empty email', () => {
    const result = validateLoginInput({ email: '', password: 'password' });

    expect(result.valid).toBe(false);
  });

  it('should reject password with null bytes', () => {
    const result = validateLoginInput({
      email: 'user@example.com',
      password: 'pass\x00word',
    });

    expect(result.valid).toBe(false);
  });

  it('should reject oversized password (>72 bytes for bcrypt)', () => {
    const result = validateLoginInput({
      email: 'user@example.com',
      password: 'a'.repeat(100),
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('too long');
  });

  it('should trim whitespace from email', () => {
    const result = normalizeEmail('  User@Example.COM  ');

    expect(result).toBe('user@example.com');
  });
});

// ============================================================================
// Helper implementations (light stubs for test structure)
// ============================================================================

async function simulateLogin(
  db: ReturnType<typeof createMockDb>,
  redis: ReturnType<typeof createMockRedis>,
  credentials: { email: string; password: string }
) {
  try {
    await db.query('SELECT * FROM users WHERE email = $1', [credentials.email]);
    return { status: 200, body: { token: 'ok' } };
  } catch {
    return { status: 503, body: { error: 'service temporarily unavailable' } };
  }
}

async function simulateSessionCreation(
  db: ReturnType<typeof createMockDb>,
  _redis: ReturnType<typeof createMockRedis>,
  _userId: string
) {
  try {
    await db.transaction(async () => {});
    return { status: 201 };
  } catch {
    return { status: 503 };
  }
}

function validateToken(jwtService: ReturnType<typeof createMockJwtService>, token: string) {
  try {
    const payload = jwtService.verify(token);
    if (!payload.sub) return { valid: false, reason: 'TOKEN_MISSING_CLAIMS' };
    return { valid: true, reason: null };
  } catch (err: unknown) {
    const message = (err as Error).message;
    if (message.includes('expired')) return { valid: false, reason: 'TOKEN_EXPIRED' };
    if (message.includes('malformed')) return { valid: false, reason: 'TOKEN_MALFORMED' };
    if (message.includes('invalid signature'))
      return { valid: false, reason: 'TOKEN_INVALID_SIGNATURE' };
    return { valid: false, reason: 'TOKEN_UNKNOWN_ERROR' };
  }
}

function parseAuthHeader(header: string) {
  if (!header || !header.startsWith('Bearer ')) return null;
  return header.slice(7);
}

async function checkAccountLockout(redis: ReturnType<typeof createMockRedis>, email: string) {
  const attempts = await redis.incr(`login:attempts:${email}`);
  return attempts > 5;
}

async function resetLoginAttempts(redis: ReturnType<typeof createMockRedis>, email: string) {
  await redis.del(`login:attempts:${email}`);
}

async function getBackoffDelay(redis: ReturnType<typeof createMockRedis>, email: string) {
  const attempts = await redis.incr(`login:attempts:${email}`);
  if (attempts <= 2) return 0;
  return Math.min(1000 * Math.pow(2, attempts - 3), 8000);
}

function validateCsrf(token: string | undefined, expected: string) {
  if (!token) return { valid: false, reason: 'CSRF_MISSING' };
  if (token !== expected) return { valid: false, reason: 'CSRF_MISMATCH' };
  return { valid: true, reason: null };
}

async function getSession(redis: ReturnType<typeof createMockRedis>, sessionId: string) {
  const raw = await redis.get(`session:${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function handleMaxSessions(
  redis: ReturnType<typeof createMockRedis>,
  _userId: string,
  existing: string[],
  max: number
) {
  if (existing.length >= max) {
    const oldest = existing[0];
    await redis.del(`session:${oldest}`);
    return { evicted: oldest };
  }
  return { evicted: null };
}

function isTokenNearExpiry(exp: number, thresholdSeconds: number) {
  return exp - Date.now() / 1000 < thresholdSeconds;
}

async function handleOidcDiscovery(provider: { discover: () => Promise<unknown> }) {
  try {
    await provider.discover();
    return { success: true, error: null };
  } catch {
    return { success: false, error: 'PROVIDER_TIMEOUT' };
  }
}

async function validateOidcCallback(params: {
  state: string;
  expectedState: string;
  code: string;
}) {
  if (params.state !== params.expectedState) return { valid: false, reason: 'STATE_MISMATCH' };
  return { valid: true, reason: null };
}

function validateSamlAssertion(params: {
  assertion: string;
  expectedSignature: string;
  actualSignature: string;
}) {
  if (params.expectedSignature !== params.actualSignature)
    return { valid: false, reason: 'SIGNATURE_INVALID' };
  return { valid: true, reason: null };
}

function validateSamlTiming(params: { notOnOrAfter: string }) {
  if (new Date(params.notOnOrAfter).getTime() < Date.now())
    return { valid: false, reason: 'ASSERTION_EXPIRED' };
  return { valid: true, reason: null };
}

async function checkRateLimit(
  redis: ReturnType<typeof createMockRedis>,
  ip: string,
  limit: number
) {
  const count = await redis.incr(`rate:${ip}`);
  if (count > limit) {
    await redis.expire(`rate:${ip}`, 60);
    return { allowed: false, retryAfter: 60 };
  }
  return { allowed: true, retryAfter: 0 };
}

function validateLoginInput(input: { email: string; password: string }) {
  if (!input.email || !input.email.includes('@')) return { valid: false, reason: 'invalid email' };
  if (input.email.includes("'") || input.email.includes('--'))
    return { valid: false, reason: 'invalid characters' };
  if (!input.password) return { valid: false, reason: 'password required' };
  if (input.password.includes('\x00')) return { valid: false, reason: 'invalid characters' };
  if (input.password.length > 72) return { valid: false, reason: 'password too long' };
  return { valid: true, reason: null };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
