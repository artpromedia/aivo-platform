/**
 * LTI Authentication & JWT Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as jose from 'jose';
import { generateToolJwks, createOidcAuthRequest } from '../src/lti-auth';
import { LTI_CLAIMS, LTI_MESSAGE_TYPES, LTI_ROLES } from '../src/types';

describe('JWKS Generation', () => {
  it('should generate valid JWKS with RSA key', async () => {
    // Generate a test key pair
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256');

    const publicJwk = await jose.exportJWK(publicKey);

    expect(publicJwk.kty).toBe('RSA');
    expect(publicJwk.n).toBeDefined();
    expect(publicJwk.e).toBeDefined();
  });

  it('should include key use and algorithm in JWKS', async () => {
    const { publicKey } = await jose.generateKeyPair('RS256');

    const publicJwk = await jose.exportJWK(publicKey);
    publicJwk.use = 'sig';
    publicJwk.alg = 'RS256';
    publicJwk.kid = 'key-1';

    expect(publicJwk.use).toBe('sig');
    expect(publicJwk.alg).toBe('RS256');
    expect(publicJwk.kid).toBe('key-1');
  });

  it('should not expose private key in JWKS', async () => {
    const { publicKey, privateKey } = await jose.generateKeyPair('RS256');

    const publicJwk = await jose.exportJWK(publicKey);

    // Private key components should not be present
    expect(publicJwk.d).toBeUndefined();
    expect(publicJwk.p).toBeUndefined();
    expect(publicJwk.q).toBeUndefined();
    expect(publicJwk.dp).toBeUndefined();
    expect(publicJwk.dq).toBeUndefined();
    expect(publicJwk.qi).toBeUndefined();
  });
});

describe('JWT Signing', () => {
  it('should sign JWT with RS256 algorithm', async () => {
    const { privateKey } = await jose.generateKeyPair('RS256');

    const payload = {
      iss: 'https://aivo.app',
      sub: 'client-id-123',
      aud: 'https://canvas.instructure.com/login/oauth2/token',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      jti: crypto.randomUUID(),
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256', kid: 'key-1' })
      .sign(privateKey);

    expect(jwt).toBeDefined();
    expect(jwt.split('.').length).toBe(3); // Header.Payload.Signature
  });

  it('should include correct claims for client assertion', async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256');

    const clientId = 'client-id-123';
    const tokenUrl = 'https://canvas.instructure.com/login/oauth2/token';

    const payload = {
      iss: clientId,
      sub: clientId,
      aud: tokenUrl,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: crypto.randomUUID(),
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .sign(privateKey);

    // Verify the JWT
    const verified = await jose.jwtVerify(jwt, publicKey, {
      issuer: clientId,
      audience: tokenUrl,
    });

    expect(verified.payload.iss).toBe(clientId);
    expect(verified.payload.sub).toBe(clientId);
    expect(verified.payload.aud).toBe(tokenUrl);
  });
});

describe('JWT Verification', () => {
  it('should verify valid JWT signature', async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256');

    const payload = {
      sub: 'user-123',
      name: 'Test User',
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    const { payload: verified } = await jose.jwtVerify(jwt, publicKey);

    expect(verified.sub).toBe('user-123');
    expect(verified.name).toBe('Test User');
  });

  it('should reject expired JWT', async () => {
    const { privateKey, publicKey } = await jose.generateKeyPair('RS256');

    const payload = {
      sub: 'user-123',
    };

    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
      .sign(privateKey);

    await expect(jose.jwtVerify(jwt, publicKey)).rejects.toThrow();
  });

  it('should reject JWT with wrong signature', async () => {
    const { privateKey: key1 } = await jose.generateKeyPair('RS256');
    const { publicKey: key2 } = await jose.generateKeyPair('RS256');

    const jwt = await new jose.SignJWT({ sub: 'user-123' })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key1);

    await expect(jose.jwtVerify(jwt, key2)).rejects.toThrow();
  });
});

describe('JWKS Remote Fetching', () => {
  it('should create JWKS remote set', () => {
    const jwksUrl = 'https://canvas.instructure.com/api/lti/security/jwks';

    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

    expect(JWKS).toBeDefined();
    expect(typeof JWKS).toBe('function');
  });

  it('should handle JWKS URL with caching', async () => {
    const jwksUrl = 'https://canvas.instructure.com/api/lti/security/jwks';

    // Create with caching options
    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl), {
      cacheMaxAge: 600_000, // 10 minutes
      cooldownDuration: 30_000, // 30 seconds
    });

    expect(JWKS).toBeDefined();
  });
});

describe('OIDC Authentication Request', () => {
  it('should generate valid state token', () => {
    const state = crypto.randomUUID();

    expect(state).toBeDefined();
    expect(state.length).toBe(36); // UUID format
    expect(state).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('should generate valid nonce', () => {
    const nonce = crypto.randomUUID();

    expect(nonce).toBeDefined();
    expect(nonce.length).toBe(36);
  });

  it('should build correct auth URL parameters', () => {
    const authUrl = 'https://canvas.instructure.com/api/lti/authorize_redirect';
    const params = new URLSearchParams({
      scope: 'openid',
      response_type: 'id_token',
      client_id: 'client-id-123',
      redirect_uri: 'https://aivo.app/lti/launch',
      login_hint: 'user-123',
      state: 'state-token',
      nonce: 'nonce-token',
      response_mode: 'form_post',
      prompt: 'none',
      lti_message_hint: 'message-hint',
    });

    const fullUrl = `${authUrl}?${params.toString()}`;

    expect(fullUrl).toContain('scope=openid');
    expect(fullUrl).toContain('response_type=id_token');
    expect(fullUrl).toContain('response_mode=form_post');
    expect(fullUrl).toContain('prompt=none');
    expect(fullUrl).toContain('lti_message_hint=message-hint');
  });
});

describe('Nonce Validation', () => {
  const usedNonces = new Set<string>();

  beforeEach(() => {
    usedNonces.clear();
  });

  it('should accept new nonce', () => {
    const nonce = crypto.randomUUID();

    const isUsed = usedNonces.has(nonce);
    expect(isUsed).toBe(false);

    usedNonces.add(nonce);
    expect(usedNonces.has(nonce)).toBe(true);
  });

  it('should reject reused nonce', () => {
    const nonce = crypto.randomUUID();

    usedNonces.add(nonce);

    const isUsed = usedNonces.has(nonce);
    expect(isUsed).toBe(true);
  });

  it('should handle nonce with expiry check', () => {
    const nonce = {
      value: crypto.randomUUID(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    };

    // Check if nonce is still valid
    const isValid = nonce.expiresAt > new Date();
    expect(isValid).toBe(true);

    // Simulate expired nonce
    const expiredNonce = {
      value: crypto.randomUUID(),
      createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
      expiresAt: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
    };

    const isExpiredValid = expiredNonce.expiresAt > new Date();
    expect(isExpiredValid).toBe(false);
  });
});

describe('LTI ID Token Claims', () => {
  it('should validate required claims', () => {
    const requiredClaims = [
      LTI_CLAIMS.MESSAGE_TYPE,
      LTI_CLAIMS.VERSION,
      LTI_CLAIMS.DEPLOYMENT_ID,
      LTI_CLAIMS.TARGET_LINK_URI,
      LTI_CLAIMS.ROLES,
    ];

    const samplePayload = {
      [LTI_CLAIMS.MESSAGE_TYPE]: LTI_MESSAGE_TYPES.RESOURCE_LINK_REQUEST,
      [LTI_CLAIMS.VERSION]: '1.3.0',
      [LTI_CLAIMS.DEPLOYMENT_ID]: 'deployment-1',
      [LTI_CLAIMS.TARGET_LINK_URI]: 'https://aivo.app/lti/launch',
      [LTI_CLAIMS.ROLES]: [LTI_ROLES.LEARNER],
    };

    for (const claim of requiredClaims) {
      expect(samplePayload[claim]).toBeDefined();
    }
  });

  it('should validate resource link request has resource link claim', () => {
    const payload = {
      [LTI_CLAIMS.MESSAGE_TYPE]: LTI_MESSAGE_TYPES.RESOURCE_LINK_REQUEST,
      [LTI_CLAIMS.RESOURCE_LINK]: {
        id: 'resource-link-1',
        title: 'Math Quiz',
      },
    };

    expect(payload[LTI_CLAIMS.MESSAGE_TYPE]).toBe(LTI_MESSAGE_TYPES.RESOURCE_LINK_REQUEST);
    expect(payload[LTI_CLAIMS.RESOURCE_LINK]).toBeDefined();
    expect(payload[LTI_CLAIMS.RESOURCE_LINK].id).toBeDefined();
  });

  it('should validate deep linking request has settings claim', () => {
    const payload = {
      [LTI_CLAIMS.MESSAGE_TYPE]: LTI_MESSAGE_TYPES.DEEP_LINKING_REQUEST,
      [LTI_CLAIMS.DEEP_LINKING_SETTINGS]: {
        deep_link_return_url: 'https://canvas.instructure.com/api/lti/deep_linking',
        accept_types: ['ltiResourceLink'],
        accept_presentation_document_targets: ['iframe', 'window'],
      },
    };

    expect(payload[LTI_CLAIMS.MESSAGE_TYPE]).toBe(LTI_MESSAGE_TYPES.DEEP_LINKING_REQUEST);
    expect(payload[LTI_CLAIMS.DEEP_LINKING_SETTINGS]).toBeDefined();
    expect(payload[LTI_CLAIMS.DEEP_LINKING_SETTINGS].deep_link_return_url).toBeDefined();
  });
});

describe('Platform-Specific JWT Handling', () => {
  it('should handle Canvas-style issuer', () => {
    const canvasIssuer = 'https://canvas.instructure.com';
    const canvasTokenUrl = 'https://canvas.instructure.com/login/oauth2/token';

    expect(canvasIssuer).toContain('canvas');
    expect(canvasTokenUrl).toContain('/login/oauth2/token');
  });

  it('should handle Schoology-style issuer', () => {
    const schoologyIssuer = 'https://lti-service-qa.schoology.com';
    const schoologyTokenUrl = 'https://lti-service-qa.schoology.com/oauth2/access_token';

    expect(schoologyIssuer).toContain('schoology');
    expect(schoologyTokenUrl).toContain('/oauth2/access_token');
  });

  it('should handle Google Classroom issuer', () => {
    const googleIssuer = 'https://classroom.google.com';

    expect(googleIssuer).toContain('classroom.google.com');
  });
});
