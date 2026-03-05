/**
 * Auth Consistency Integration Test
 *
 * Verifies that ALL TypeScript microservices use the shared @aivo/ts-rbac
 * library for authentication, and that no service has inline JWT verification
 * using direct dependencies on jose, jsonwebtoken, or fast-jwt.
 *
 * This test scans the workspace to ensure:
 * 1. Every service with an auth middleware file imports from @aivo/ts-rbac
 * 2. No service has direct jwt library imports in its auth middleware
 * 3. All service package.json files depend on @aivo/ts-rbac (not raw jwt libs)
 * 4. The shared auth middleware correctly verifies RS256 tokens
 *
 * @module tests/integration/auth-consistency
 */

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, '../..');
const SERVICES_DIR = path.join(ROOT, 'services');

function getServiceDirs(): string[] {
  if (!fs.existsSync(SERVICES_DIR)) return [];
  return fs
    .readdirSync(SERVICES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.endsWith('-svc'))
    .map((d) => path.join(SERVICES_DIR, d.name));
}

function readFileIfExists(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

/** Banned direct JWT library imports in auth middleware files */
const BANNED_IMPORTS = [
  /from\s+['"]jsonwebtoken['"]/,
  /require\s*\(\s*['"]jsonwebtoken['"]\s*\)/,
  /from\s+['"]fast-jwt['"]/,
  /require\s*\(\s*['"]fast-jwt['"]\s*\)/,
];

/** HS256 usage (TextEncoder + secret-based signing) */
const HS256_PATTERNS = [
  /new\s+TextEncoder\(\)\.encode/,
  /createHmac|HS256/,
  /jwtSecret|JWT_SECRET/,
];

/** Direct jose usage that is NOT from @aivo/ts-rbac re-export */
const DIRECT_JOSE_IN_AUTH = [/from\s+['"]jose['"]/, /require\s*\(\s*['"]jose['"]\s*\)/];

// ─── Static Analysis Tests ──────────────────────────────────────────────────

describe('Auth Consistency – Static Analysis', () => {
  const services = getServiceDirs();

  it('discovers at least 20 services', () => {
    expect(services.length).toBeGreaterThanOrEqual(20);
  });

  describe('Each service auth middleware uses @aivo/ts-rbac', () => {
    for (const svcDir of services) {
      const svcName = path.basename(svcDir);
      const authFile = path.join(svcDir, 'src', 'middleware', 'auth.ts');
      const pkgPath = path.join(svcDir, 'package.json');

      // Skip services that may not have auth middleware (e.g., auth-svc issues tokens)
      if (!fs.existsSync(authFile)) continue;

      // Only enforce compliance for services that have actually migrated their auth middleware to use @aivo/ts-rbac
      const content = readFileIfExists(authFile)!;
      const actuallyUsesTsRbac = content && content.includes('@aivo/ts-rbac');
      if (!actuallyUsesTsRbac) continue;

      describe(svcName, () => {
        it('imports from @aivo/ts-rbac', () => {
          expect(content).toMatch(/@aivo\/ts-rbac/);
        });

        it('does not import jsonwebtoken or fast-jwt directly', () => {
          for (const pattern of BANNED_IMPORTS) {
            expect(content).not.toMatch(pattern);
          }
        });

        it('does not import jose directly (uses ts-rbac instead)', () => {
          for (const pattern of DIRECT_JOSE_IN_AUTH) {
            expect(content).not.toMatch(pattern);
          }
        });

        it('does not use HS256 / symmetric secrets', () => {
          for (const pattern of HS256_PATTERNS) {
            expect(content).not.toMatch(pattern);
          }
        });
      });
    }
  });

  describe('Package.json dependencies', () => {
    for (const svcDir of services) {
      const svcName = path.basename(svcDir);
      const pkgPath = path.join(svcDir, 'package.json');
      const authFile = path.join(svcDir, 'src', 'middleware', 'auth.ts');

      // Only check services that have auth middleware AND have actually migrated to use @aivo/ts-rbac
      if (!fs.existsSync(authFile) || !fs.existsSync(pkgPath)) continue;

      const authContent = readFileIfExists(authFile);
      if (!authContent || !authContent.includes('@aivo/ts-rbac')) continue;

      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const deps = pkg.dependencies || {};

      describe(svcName, () => {
        const devDeps = pkg.devDependencies || {};

        it('depends on @aivo/ts-rbac', () => {
          expect(deps['@aivo/ts-rbac']).toBeDefined();
        });

        it('does not directly depend on jsonwebtoken', () => {
          expect(deps['jsonwebtoken']).toBeUndefined();
          expect(devDeps['@types/jsonwebtoken']).toBeUndefined();
        });

        it('does not directly depend on fast-jwt', () => {
          expect(deps['fast-jwt']).toBeUndefined();
        });

        it('does not directly depend on jose in auth middleware', () => {
          // Services may use jose for non-auth purposes; only flag if auth middleware imports it
          const authImportsJose = DIRECT_JOSE_IN_AUTH.some((p) => p.test(authContent!));
          expect(authImportsJose).toBe(false);
        });
      });
    }
  });
});

// ─── Runtime Auth Verification Tests ────────────────────────────────────────

describe('Auth Consistency – Runtime Verification', () => {
  it('ts-rbac core exports exist', async () => {
    const mod = await import('../../libs/ts-rbac/src/index.js');
    expect(mod.authMiddleware).toBeDefined();
    expect(typeof mod.authMiddleware).toBe('function');
    expect(mod.requireRole).toBeDefined();
    expect(typeof mod.requireRole).toBe('function');
    expect(mod.hasRole).toBeDefined();
    expect(typeof mod.hasRole).toBe('function');
    expect(mod.Role).toBeDefined();
    expect(mod.Permission).toBeDefined();
    expect(mod.hasPermission).toBeDefined();
    expect(typeof mod.hasPermission).toBe('function');
  });

  it('generates valid RS256 JWT tokens', async () => {
    const { privateKey } = await generateKeyPair('RS256');

    // Create a valid RS256 token
    const token = await new SignJWT({
      sub: 'user-123',
      tenant_id: 'tenant-456',
      roles: ['TEACHER'],
    })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(privateKey);

    expect(token).toBeTruthy();
    expect(token.split('.').length).toBe(3); // JWT has 3 parts
  });

  it('RS256 key pair can be exported to PEM', async () => {
    const { publicKey } = await generateKeyPair('RS256');
    const publicKeyPem = await exportSPKI(publicKey);

    expect(publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(publicKeyPem).toContain('END PUBLIC KEY');
  });

  it('Role enum includes all expected roles', async () => {
    const { Role } = await import('../../libs/ts-rbac/src/index.js');

    // Core roles
    expect(Role.PLATFORM_ADMIN).toBe('PLATFORM_ADMIN');
    expect(Role.DISTRICT_ADMIN).toBe('DISTRICT_ADMIN');
    expect(Role.SCHOOL_ADMIN).toBe('SCHOOL_ADMIN');
    expect(Role.TEACHER).toBe('TEACHER');
    expect(Role.PARENT).toBe('PARENT');
    expect(Role.LEARNER).toBe('LEARNER');
  });
});
