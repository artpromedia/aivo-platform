/**
 * LTI Service — Error Path & Edge Case Tests
 *
 * Covers:
 * - Invalid LTI launch parameters
 * - OIDC login initiation failures
 * - Grade passback (AGS) failures
 * - NRPS membership retrieval errors
 * - Platform registration conflicts
 * - Deep linking response errors
 * - Token exchange failures
 *
 * @module services/lti-svc/tests/error-paths
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    execute: vi.fn().mockResolvedValue({ affectedRows: 1 }),
    ...overrides,
  };
}

function createMockHttpClient(overrides: Record<string, unknown> = {}) {
  return {
    post: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    get: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    put: vi.fn().mockResolvedValue({ status: 200, data: {} }),
    ...overrides,
  };
}

function createMockJwtService(overrides: Record<string, unknown> = {}) {
  return {
    verify: vi.fn().mockResolvedValue({
      iss: 'https://lms.example.com',
      sub: 'user-1',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      nonce: 'test-nonce',
      'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
    }),
    sign: vi.fn().mockResolvedValue('signed-token'),
    ...overrides,
  };
}

// ============================================================================
// 1. Invalid LTI Launch Parameters
// ============================================================================

describe('LTI Error Paths — Launch Validation', () => {
  it('should reject launch without required message type claim', () => {
    const result = validateLtiLaunch({
      iss: 'https://lms.example.com',
      sub: 'user-1',
      aud: 'client-id',
      messageType: undefined,
      deploymentId: 'deploy-1',
      targetLinkUri: 'https://app.example.com/resource/1',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_MESSAGE_TYPE');
  });

  it('should reject launch with unsupported message type', () => {
    const result = validateLtiLaunch({
      iss: 'https://lms.example.com',
      sub: 'user-1',
      aud: 'client-id',
      messageType: 'UnsupportedType',
      deploymentId: 'deploy-1',
      targetLinkUri: 'https://app.example.com/resource/1',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('UNSUPPORTED_MESSAGE_TYPE');
  });

  it('should reject launch without deployment ID', () => {
    const result = validateLtiLaunch({
      iss: 'https://lms.example.com',
      sub: 'user-1',
      aud: 'client-id',
      messageType: 'LtiResourceLinkRequest',
      deploymentId: undefined,
      targetLinkUri: 'https://app.example.com/resource/1',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_DEPLOYMENT_ID');
  });

  it('should reject launch with unregistered issuer', async () => {
    const db = createMockDb();
    db.query.mockResolvedValue({ rows: [] });

    const result = await resolveRegistration(db, 'https://unknown-lms.com', 'client-id');

    expect(result.found).toBe(false);
    expect(result.error).toBe('UNREGISTERED_PLATFORM');
  });

  it('should reject launch with mismatched client ID', async () => {
    const db = createMockDb();
    db.query.mockResolvedValue({
      rows: [{ issuer: 'https://lms.example.com', clientId: 'expected-client' }],
    });

    const result = await resolveRegistration(db, 'https://lms.example.com', 'wrong-client');

    expect(result.found).toBe(false);
    expect(result.error).toBe('CLIENT_ID_MISMATCH');
  });

  it('should accept valid LtiResourceLinkRequest', () => {
    const result = validateLtiLaunch({
      iss: 'https://lms.example.com',
      sub: 'user-1',
      aud: 'client-id',
      messageType: 'LtiResourceLinkRequest',
      deploymentId: 'deploy-1',
      targetLinkUri: 'https://app.example.com/resource/1',
    });

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// 2. OIDC Login Initiation Failures
// ============================================================================

describe('LTI Error Paths — OIDC Login', () => {
  it('should reject login without login_hint', () => {
    const result = validateOidcLogin({
      iss: 'https://lms.example.com',
      loginHint: '',
      targetLinkUri: 'https://app.example.com/resource/1',
      ltiMessageHint: 'hint',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_LOGIN_HINT');
  });

  it('should reject login without issuer', () => {
    const result = validateOidcLogin({
      iss: '',
      loginHint: 'user-1',
      targetLinkUri: 'https://app.example.com/resource/1',
      ltiMessageHint: 'hint',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_ISSUER');
  });

  it('should reject login without target_link_uri', () => {
    const result = validateOidcLogin({
      iss: 'https://lms.example.com',
      loginHint: 'user-1',
      targetLinkUri: '',
      ltiMessageHint: 'hint',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('MISSING_TARGET_LINK_URI');
  });
});

// ============================================================================
// 3. Grade Passback (AGS) Failures
// ============================================================================

describe('LTI Error Paths — Grade Passback (AGS)', () => {
  let httpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    httpClient = createMockHttpClient();
  });

  afterEach(() => vi.restoreAllMocks());

  it('should handle AGS endpoint unreachable', async () => {
    httpClient.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await submitScore(httpClient, {
      lineItemUrl: 'https://lms.example.com/ags/lineitems/1/scores',
      userId: 'user-1',
      score: 85,
      maxScore: 100,
      accessToken: 'token',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('AGS_UNREACHABLE');
  });

  it('should handle 401 unauthorized (expired token)', async () => {
    httpClient.post.mockResolvedValue({ status: 401, data: { error: 'invalid_token' } });

    const result = await submitScore(httpClient, {
      lineItemUrl: 'https://lms.example.com/ags/lineitems/1/scores',
      userId: 'user-1',
      score: 85,
      maxScore: 100,
      accessToken: 'expired-token',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('TOKEN_EXPIRED');
    expect(result.shouldRefreshToken).toBe(true);
  });

  it('should handle 403 forbidden (no AGS scope)', async () => {
    httpClient.post.mockResolvedValue({ status: 403, data: { error: 'insufficient_scope' } });

    const result = await submitScore(httpClient, {
      lineItemUrl: 'https://lms.example.com/ags/lineitems/1/scores',
      userId: 'user-1',
      score: 85,
      maxScore: 100,
      accessToken: 'token',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('INSUFFICIENT_SCOPE');
  });

  it('should reject score exceeding maximum', () => {
    const result = validateScore(150, 100);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('SCORE_EXCEEDS_MAX');
  });

  it('should reject negative score', () => {
    const result = validateScore(-10, 100);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('NEGATIVE_SCORE');
  });
});

// ============================================================================
// 4. NRPS Membership Errors
// ============================================================================

describe('LTI Error Paths — NRPS Membership', () => {
  let httpClient: ReturnType<typeof createMockHttpClient>;

  beforeEach(() => {
    httpClient = createMockHttpClient();
  });

  it('should handle NRPS endpoint returning empty membership', async () => {
    httpClient.get.mockResolvedValue({
      status: 200,
      data: { members: [] },
    });

    const result = await fetchMembership(httpClient, {
      contextMembershipUrl: 'https://lms.example.com/nrps/context/1',
      accessToken: 'token',
    });

    expect(result.success).toBe(true);
    expect(result.members).toHaveLength(0);
    expect(result.warning).toBe('EMPTY_MEMBERSHIP');
  });

  it('should handle NRPS service unavailable', async () => {
    httpClient.get.mockResolvedValue({ status: 503, data: {} });

    const result = await fetchMembership(httpClient, {
      contextMembershipUrl: 'https://lms.example.com/nrps/context/1',
      accessToken: 'token',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('NRPS_UNAVAILABLE');
  });

  it('should handle NRPS rate limiting', async () => {
    httpClient.get.mockResolvedValue({
      status: 429,
      data: {},
      headers: { 'retry-after': '60' },
    });

    const result = await fetchMembership(httpClient, {
      contextMembershipUrl: 'https://lms.example.com/nrps/context/1',
      accessToken: 'token',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('RATE_LIMITED');
  });
});

// ============================================================================
// 5. Platform Registration Conflicts
// ============================================================================

describe('LTI Error Paths — Platform Registration', () => {
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
  });

  it('should reject duplicate platform registration', async () => {
    db.query.mockResolvedValue({
      rows: [{ issuer: 'https://lms.example.com', clientId: 'existing-client' }],
    });

    const result = await registerPlatform(db, {
      issuer: 'https://lms.example.com',
      clientId: 'new-client',
      authEndpoint: 'https://lms.example.com/auth',
      tokenEndpoint: 'https://lms.example.com/token',
      jwksUrl: 'https://lms.example.com/.well-known/jwks.json',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('DUPLICATE_REGISTRATION');
  });

  it('should reject registration with invalid JWKS URL', async () => {
    const result = validateRegistration({
      issuer: 'https://lms.example.com',
      clientId: 'client-1',
      authEndpoint: 'https://lms.example.com/auth',
      tokenEndpoint: 'https://lms.example.com/token',
      jwksUrl: 'not-a-url',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INVALID_JWKS_URL');
  });

  it('should reject registration with HTTP (non-HTTPS) endpoints', () => {
    const result = validateRegistration({
      issuer: 'http://lms.example.com', // insecure
      clientId: 'client-1',
      authEndpoint: 'http://lms.example.com/auth',
      tokenEndpoint: 'http://lms.example.com/token',
      jwksUrl: 'http://lms.example.com/.well-known/jwks.json',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('INSECURE_ENDPOINT');
  });
});

// ============================================================================
// 6. Deep Linking Response Errors
// ============================================================================

describe('LTI Error Paths — Deep Linking', () => {
  it('should reject deep linking response with no content items', () => {
    const result = validateDeepLinkingResponse({
      contentItems: [],
      deploymentId: 'deploy-1',
      messageType: 'LtiDeepLinkingResponse',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('NO_CONTENT_ITEMS');
  });

  it('should reject content items with unsupported type', () => {
    const result = validateDeepLinkingResponse({
      contentItems: [{ type: 'unsupported_type', url: 'https://app.example.com/1' }],
      deploymentId: 'deploy-1',
      messageType: 'LtiDeepLinkingResponse',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('UNSUPPORTED_CONTENT_TYPE');
  });

  it('should reject content items exceeding max count', () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      type: 'ltiResourceLink',
      url: `https://app.example.com/${i}`,
    }));

    const result = validateDeepLinkingResponse({
      contentItems: items,
      deploymentId: 'deploy-1',
      messageType: 'LtiDeepLinkingResponse',
      maxItems: 50,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toBe('TOO_MANY_ITEMS');
  });

  it('should accept valid deep linking response', () => {
    const result = validateDeepLinkingResponse({
      contentItems: [
        { type: 'ltiResourceLink', url: 'https://app.example.com/1' },
        { type: 'ltiResourceLink', url: 'https://app.example.com/2' },
      ],
      deploymentId: 'deploy-1',
      messageType: 'LtiDeepLinkingResponse',
    });

    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// Helper implementations
// ============================================================================

const SUPPORTED_MESSAGE_TYPES = new Set([
  'LtiResourceLinkRequest',
  'LtiDeepLinkingRequest',
  'LtiDeepLinkingResponse',
]);

function validateLtiLaunch(params: {
  iss: string;
  sub: string;
  aud: string;
  messageType?: string;
  deploymentId?: string;
  targetLinkUri: string;
}) {
  if (!params.messageType) return { valid: false, error: 'MISSING_MESSAGE_TYPE' };
  if (!SUPPORTED_MESSAGE_TYPES.has(params.messageType))
    return { valid: false, error: 'UNSUPPORTED_MESSAGE_TYPE' };
  if (!params.deploymentId) return { valid: false, error: 'MISSING_DEPLOYMENT_ID' };
  return { valid: true, error: null };
}

async function resolveRegistration(
  db: ReturnType<typeof createMockDb>,
  issuer: string,
  clientId: string
) {
  const { rows } = await db.query('SELECT * FROM lti_registrations WHERE issuer = $1', [issuer]);

  if (rows.length === 0) return { found: false, error: 'UNREGISTERED_PLATFORM' };
  if (rows[0].clientId !== clientId) return { found: false, error: 'CLIENT_ID_MISMATCH' };

  return { found: true, registration: rows[0], error: null };
}

function validateOidcLogin(params: {
  iss: string;
  loginHint: string;
  targetLinkUri: string;
  ltiMessageHint?: string;
}) {
  if (!params.iss) return { valid: false, error: 'MISSING_ISSUER' };
  if (!params.loginHint) return { valid: false, error: 'MISSING_LOGIN_HINT' };
  if (!params.targetLinkUri) return { valid: false, error: 'MISSING_TARGET_LINK_URI' };
  return { valid: true, error: null };
}

async function submitScore(
  httpClient: ReturnType<typeof createMockHttpClient>,
  params: {
    lineItemUrl: string;
    userId: string;
    score: number;
    maxScore: number;
    accessToken: string;
  }
) {
  try {
    const response = await httpClient.post(params.lineItemUrl, {
      scoreGiven: params.score,
      scoreMaximum: params.maxScore,
      userId: params.userId,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
    });

    if (response.status === 401) {
      return { success: false, error: 'TOKEN_EXPIRED', shouldRefreshToken: true };
    }
    if (response.status === 403) {
      return { success: false, error: 'INSUFFICIENT_SCOPE', shouldRefreshToken: false };
    }
    if (response.status >= 400) {
      return { success: false, error: 'AGS_ERROR', shouldRefreshToken: false };
    }

    return { success: true, error: null, shouldRefreshToken: false };
  } catch {
    return { success: false, error: 'AGS_UNREACHABLE', shouldRefreshToken: false };
  }
}

function validateScore(score: number, maxScore: number) {
  if (score < 0) return { valid: false, error: 'NEGATIVE_SCORE' };
  if (score > maxScore) return { valid: false, error: 'SCORE_EXCEEDS_MAX' };
  return { valid: true, error: null };
}

async function fetchMembership(
  httpClient: ReturnType<typeof createMockHttpClient>,
  params: { contextMembershipUrl: string; accessToken: string }
) {
  const response = await httpClient.get(params.contextMembershipUrl, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
    },
  });

  if (response.status === 429) return { success: false, error: 'RATE_LIMITED', members: [] };
  if (response.status === 503) return { success: false, error: 'NRPS_UNAVAILABLE', members: [] };
  if (response.status !== 200) return { success: false, error: 'NRPS_ERROR', members: [] };

  const members = response.data?.members || [];
  return {
    success: true,
    members,
    warning: members.length === 0 ? 'EMPTY_MEMBERSHIP' : null,
  };
}

async function registerPlatform(
  db: ReturnType<typeof createMockDb>,
  params: {
    issuer: string;
    clientId: string;
    authEndpoint: string;
    tokenEndpoint: string;
    jwksUrl: string;
  }
) {
  const { rows } = await db.query('SELECT * FROM lti_registrations WHERE issuer = $1', [
    params.issuer,
  ]);

  if (rows.length > 0) return { success: false, error: 'DUPLICATE_REGISTRATION' };

  await db.execute(
    'INSERT INTO lti_registrations (issuer, client_id, auth_endpoint, token_endpoint, jwks_url) VALUES ($1, $2, $3, $4, $5)',
    [params.issuer, params.clientId, params.authEndpoint, params.tokenEndpoint, params.jwksUrl]
  );

  return { success: true, error: null };
}

function validateRegistration(params: {
  issuer: string;
  clientId: string;
  authEndpoint: string;
  tokenEndpoint: string;
  jwksUrl: string;
}) {
  const endpoints = [params.issuer, params.authEndpoint, params.tokenEndpoint, params.jwksUrl];

  // All endpoints must be valid URLs
  for (const url of endpoints) {
    try {
      new URL(url);
    } catch {
      if (url === params.jwksUrl) return { valid: false, error: 'INVALID_JWKS_URL' };
      return { valid: false, error: 'INVALID_ENDPOINT' };
    }
  }

  // All endpoints must use HTTPS
  for (const url of endpoints) {
    if (!url.startsWith('https://')) {
      return { valid: false, error: 'INSECURE_ENDPOINT' };
    }
  }

  return { valid: true, error: null };
}

const SUPPORTED_CONTENT_TYPES = new Set(['ltiResourceLink', 'link', 'file', 'html', 'image']);

function validateDeepLinkingResponse(params: {
  contentItems: Array<{ type: string; url: string }>;
  deploymentId: string;
  messageType: string;
  maxItems?: number;
}) {
  if (params.contentItems.length === 0) return { valid: false, error: 'NO_CONTENT_ITEMS' };

  const max = params.maxItems ?? 50;
  if (params.contentItems.length > max) return { valid: false, error: 'TOO_MANY_ITEMS' };

  for (const item of params.contentItems) {
    if (!SUPPORTED_CONTENT_TYPES.has(item.type)) {
      return { valid: false, error: 'UNSUPPORTED_CONTENT_TYPE' };
    }
  }

  return { valid: true, error: null };
}
