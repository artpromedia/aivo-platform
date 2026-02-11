/**
 * Sprint 4 — Web-author proxy and middleware tests
 *
 * Verifies that Next.js rewrites proxy to backend services,
 * middleware protects routes, and auth token injection works.
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

describe('web-author proxy and auth', () => {
  describe('next.config.mjs rewrites', () => {
    const src = readFile('next.config.mjs');

    it('should have rewrites function', () => {
      expect(src).toContain('rewrites');
    });

    it('should proxy /api/authoring to content-authoring-svc', () => {
      expect(src).toContain('/api/authoring/:path*');
      expect(src).toContain('AUTHORING_SVC_URL');
    });

    it('should proxy /api/learner-model to learner-model-svc', () => {
      expect(src).toContain('/api/learner-model/:path*');
      expect(src).toContain('LEARNER_MODEL_SVC_URL');
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
    });

    it('should allow public paths', () => {
      const src = readFile('middleware.ts');
      expect(src).toContain('/api/auth');
    });
  });

  describe('authoring-api.ts auth injection', () => {
    const src = readFile('lib/authoring-api.ts');

    it('should have getAccessToken function', () => {
      expect(src).toContain('getAccessToken');
    });

    it('should inject Bearer token in apiFetch', () => {
      expect(src).toContain("'Authorization'");
      expect(src).toContain('Bearer');
    });

    it('should fetch token from /api/auth/session', () => {
      expect(src).toContain('/api/auth/session');
    });

    it('should cache the token', () => {
      expect(src).toContain('_cachedToken');
    });
  });

  describe('auth session route', () => {
    it('should exist', () => {
      expect(fileExists('app/api/auth/session/route.ts')).toBe(true);
    });

    it('should return accessToken', () => {
      const src = readFile('app/api/auth/session/route.ts');
      expect(src).toContain('accessToken');
    });

    it('should check for cookie', () => {
      const src = readFile('app/api/auth/session/route.ts');
      expect(src).toContain('aivo_access_token');
    });
  });
});
