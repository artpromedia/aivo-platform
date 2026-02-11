/**
 * Sprint 4 — Platform admin new routes tests
 *
 * Verifies that the 6 new route files exist and contain
 * expected patterns (breadcrumbs, auth, data fetching).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

function fileExists(relPath: string): boolean {
  return existsSync(resolve(ROOT, relPath));
}

function readPage(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

describe('new platform admin routes', () => {
  it('ai/[modelId]/page.tsx should exist', () => {
    expect(fileExists('app/ai/[modelId]/page.tsx')).toBe(true);
  });

  it('billing/[billingId]/page.tsx should exist', () => {
    expect(fileExists('app/billing/[billingId]/page.tsx')).toBe(true);
  });

  it('compliance/[auditId]/page.tsx should exist', () => {
    expect(fileExists('app/compliance/[auditId]/page.tsx')).toBe(true);
  });

  it('marketplace/[appId]/page.tsx should exist', () => {
    expect(fileExists('app/marketplace/[appId]/page.tsx')).toBe(true);
  });

  it('tenants/[tenantId]/[settingId]/page.tsx should exist', () => {
    expect(fileExists('app/tenants/[tenantId]/[settingId]/page.tsx')).toBe(true);
  });

  it('tenants/new/page.tsx should exist', () => {
    expect(fileExists('app/tenants/new/page.tsx')).toBe(true);
  });

  describe('ai/[modelId] page', () => {
    const src = readPage('app/ai/[modelId]/page.tsx');

    it('should be a client component', () => {
      expect(src).toContain("'use client'");
    });

    it('should use useModelMetrics hook', () => {
      expect(src).toContain('useModelMetrics');
    });

    it('should have breadcrumb navigation', () => {
      expect(src).toContain('<nav');
    });
  });

  describe('billing/[billingId] page', () => {
    const src = readPage('app/billing/[billingId]/page.tsx');

    it('should be a client component', () => {
      expect(src).toContain("'use client'");
    });

    it('should use useQuote hook', () => {
      expect(src).toContain('useQuote');
    });
  });

  describe('tenants/new page', () => {
    const src = readPage('app/tenants/new/page.tsx');

    it('should be a client component', () => {
      expect(src).toContain("'use client'");
    });

    it('should have a form element', () => {
      expect(src).toContain('<form');
    });

    it('should POST to /api/tenants', () => {
      expect(src).toContain("'/api/tenants'");
    });

    it('should import TenantType', () => {
      expect(src).toContain('TenantType');
    });
  });

  describe('tenants/[tenantId]/[settingId] page', () => {
    const src = readPage('app/tenants/[tenantId]/[settingId]/page.tsx');

    it('should be a server component (no use client)', () => {
      expect(src).not.toContain("'use client'");
    });

    it('should use requirePlatformAdmin', () => {
      expect(src).toContain('requirePlatformAdmin');
    });

    it('should use async params', () => {
      expect(src).toContain('Promise<');
    });
  });
});
