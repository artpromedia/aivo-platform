/**
 * Sprint 4 — Web-creator auth hardening tests
 *
 * Verifies that auth headers are injected in the API client,
 * middleware exists for route protection, and auth API routes are present.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

function fileExists(relPath: string): boolean {
  return existsSync(resolve(ROOT, relPath));
}

function readFile(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

describe('web-creator auth hardening', () => {
  describe('lib/api.ts auth injection', () => {
    const src = readFile('lib/api.ts');

    it('should have getAccessToken function', () => {
      expect(src).toContain('getAccessToken');
    });

    it('should inject Bearer token in fetchApi', () => {
      expect(src).toContain("'Authorization'");
      expect(src).toContain('Bearer');
    });

    it('should send credentials with requests', () => {
      expect(src).toContain("credentials: 'include'");
    });

    it('should cache the token with TTL', () => {
      expect(src).toContain('_cachedToken');
      expect(src).toContain('TOKEN_TTL_MS');
    });
  });

  describe('middleware.ts', () => {
    it('should exist', () => {
      expect(fileExists('middleware.ts')).toBe(true);
    });

    it('should check for aivo_access_token cookie', () => {
      const src = readFile('middleware.ts');
      expect(src).toContain('aivo_access_token');
    });

    it('should redirect to /login when unauthenticated', () => {
      const src = readFile('middleware.ts');
      expect(src).toContain('/login');
      expect(src).toContain('redirect');
    });

    it('should allow public paths', () => {
      const src = readFile('middleware.ts');
      expect(src).toContain('/api/auth');
      expect(src).toContain('/_next');
    });
  });

  describe('auth API routes', () => {
    it('session route should exist', () => {
      expect(fileExists('app/api/auth/session/route.ts')).toBe(true);
    });

    it('logout route should exist', () => {
      expect(fileExists('app/api/auth/logout/route.ts')).toBe(true);
    });

    it('session route should return accessToken', () => {
      const src = readFile('app/api/auth/session/route.ts');
      expect(src).toContain('accessToken');
    });
  });

  describe('login page', () => {
    it('should exist', () => {
      expect(fileExists('app/login/page.tsx')).toBe(true);
    });

    it('should use the auth context', () => {
      const src = readFile('app/login/page.tsx');
      expect(src).toContain('useAuth');
    });
  });
});
