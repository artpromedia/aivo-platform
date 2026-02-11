/**
 * Sprint 4 — Platform admin mock cleanup tests
 *
 * Verifies that mock data fallbacks have been removed from
 * tenant detail, incident detail, and model detail pages.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '..');

function readPage(relPath: string): string {
  return readFileSync(resolve(ROOT, relPath), 'utf-8');
}

describe('mock data cleanup', () => {
  describe('tenants/[tenantId]/page.tsx', () => {
    const src = readPage('app/tenants/[tenantId]/page.tsx');

    it('should not contain MOCK_TENANT constant', () => {
      expect(src).not.toContain('MOCK_TENANT');
    });

    it('should not contain MOCK_FLAGS constant', () => {
      expect(src).not.toContain('MOCK_FLAGS');
    });

    it('should not contain MOCK_ENTITLEMENTS constant', () => {
      expect(src).not.toContain('MOCK_ENTITLEMENTS');
    });

    it('should not contain MOCK_AI_ACTIVITY constant', () => {
      expect(src).not.toContain('MOCK_AI_ACTIVITY');
    });

    it('should not contain MOCK_EFFECTIVE_POLICY constant', () => {
      expect(src).not.toContain('MOCK_EFFECTIVE_POLICY');
    });

    it('should call notFound() in catch block', () => {
      expect(src).toContain('notFound()');
    });

    it('should not contain hardcoded tenant-1 fallback', () => {
      expect(src).not.toMatch(/tenantId\s*===\s*['"]tenant-1['"]/);
    });
  });

  describe('ai/incidents/[incidentId]/page.tsx', () => {
    const src = readPage('app/ai/incidents/[incidentId]/page.tsx');

    it('should not contain MOCK_INCIDENT constant', () => {
      expect(src).not.toContain('MOCK_INCIDENT');
    });

    it('should not contain MOCK_CALLS constant', () => {
      expect(src).not.toContain('MOCK_CALLS');
    });

    it('should call notFound() in catch block', () => {
      expect(src).toContain('notFound()');
    });

    it('should not contain hardcoded inc-1 fallback', () => {
      expect(src).not.toMatch(/incidentId\s*===\s*['"]inc-1['"]/);
    });
  });

  describe('models/[modelKey]/page.tsx', () => {
    const src = readPage('app/models/[modelKey]/page.tsx');

    it('should not contain MOCK_MODEL constant', () => {
      expect(src).not.toContain('MOCK_MODEL');
    });

    it('should call notFound() in catch block', () => {
      expect(src).toContain('notFound()');
    });

    it('should not contain AIVO_TUTOR_V1 fallback', () => {
      expect(src).not.toMatch(/modelKey\s*===\s*['"]AIVO_TUTOR_V1['"]/);
    });

    it('should use async params (Promise<>)', () => {
      expect(src).toContain('Promise<{ modelKey: string }>');
    });

    it('should await params', () => {
      expect(src).toContain('await params');
    });
  });
});
