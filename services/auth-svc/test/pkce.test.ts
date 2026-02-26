import { describe, expect, it, vi, beforeEach } from 'vitest';

describe('PKCE (RFC 7636)', () => {
  let pkceModule: typeof import('../src/lib/sso/pkce');

  beforeEach(async () => {
    vi.resetModules();
    pkceModule = await import('../src/lib/sso/pkce');
  });

  describe('generatePKCE', () => {
    it('generates a valid PKCE pair', () => {
      const result = pkceModule.generatePKCE();
      expect(result).toHaveProperty('codeVerifier');
      expect(result).toHaveProperty('codeChallenge');
      expect(result.codeChallengeMethod).toBe('S256');
    });

    it('generates verifier of appropriate length (43-128 chars)', () => {
      const result = pkceModule.generatePKCE();
      expect(result.codeVerifier.length).toBeGreaterThanOrEqual(43);
      expect(result.codeVerifier.length).toBeLessThanOrEqual(128);
    });

    it('generates unique values on each call', () => {
      const a = pkceModule.generatePKCE();
      const b = pkceModule.generatePKCE();
      expect(a.codeVerifier).not.toBe(b.codeVerifier);
      expect(a.codeChallenge).not.toBe(b.codeChallenge);
    });

    it('verifier contains only unreserved characters', () => {
      const result = pkceModule.generatePKCE();
      // RFC 7636: unreserved characters = [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
      expect(result.codeVerifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    });
  });

  describe('verifyPKCE', () => {
    it('returns true for a valid verifier-challenge pair', () => {
      const { codeVerifier, codeChallenge, codeChallengeMethod } = pkceModule.generatePKCE();
      const result = pkceModule.verifyPKCE(codeVerifier, codeChallenge, codeChallengeMethod);
      expect(result).toBe(true);
    });

    it('returns false for an invalid verifier', () => {
      const { codeChallenge, codeChallengeMethod } = pkceModule.generatePKCE();
      const result = pkceModule.verifyPKCE('wrong-verifier-value', codeChallenge, codeChallengeMethod);
      expect(result).toBe(false);
    });

    it('returns false for a tampered challenge', () => {
      const { codeVerifier, codeChallengeMethod } = pkceModule.generatePKCE();
      const result = pkceModule.verifyPKCE(codeVerifier, 'tampered-challenge', codeChallengeMethod);
      expect(result).toBe(false);
    });
  });

  describe('validatePKCERequest', () => {
    it('accepts S256 method', () => {
      const { codeChallenge } = pkceModule.generatePKCE();
      expect(() => pkceModule.validatePKCERequest(codeChallenge, 'S256')).not.toThrow();
    });

    it('rejects plain method', () => {
      expect(() => pkceModule.validatePKCERequest('some-challenge', 'plain')).toThrow();
    });

    it('rejects missing code challenge', () => {
      expect(() => pkceModule.validatePKCERequest('', 'S256')).toThrow();
    });
  });
});
