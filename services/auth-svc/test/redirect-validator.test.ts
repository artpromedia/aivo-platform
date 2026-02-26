import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  tenantSsoConfig: { findFirst: vi.fn() },
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

describe('RedirectValidator', () => {
  let redirectModule: typeof import('../src/lib/sso/redirect-validator');

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.ALLOWED_REDIRECT_DOMAINS = 'example.com,app.example.com';
    redirectModule = await import('../src/lib/sso/redirect-validator');
  });

  describe('validateRedirectUri', () => {
    it('allows valid HTTPS redirect URI on whitelisted domain', async () => {
      mockPrisma.tenantSsoConfig.findFirst.mockResolvedValue(null);
      const result = await redirectModule.validateRedirectUri('https://app.example.com/callback', 'tenant-1');
      expect(result).toBeDefined();
    });

    it('rejects non-URL strings', async () => {
      await expect(
        redirectModule.validateRedirectUri('not-a-url', 'tenant-1'),
      ).rejects.toThrow();
    });

    it('rejects URIs with fragments', async () => {
      await expect(
        redirectModule.validateRedirectUri('https://app.example.com/callback#fragment', 'tenant-1'),
      ).rejects.toThrow();
    });

    it('rejects URIs with credentials', async () => {
      await expect(
        redirectModule.validateRedirectUri('https://user:pass@app.example.com/callback', 'tenant-1'),
      ).rejects.toThrow();
    });

    it('allows localhost in development', async () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      try {
        const result = await redirectModule.validateRedirectUri('http://localhost:3000/callback', 'tenant-1');
        expect(result).toBeDefined();
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    it('rejects domains not in whitelist', async () => {
      mockPrisma.tenantSsoConfig.findFirst.mockResolvedValue(null);
      await expect(
        redirectModule.validateRedirectUri('https://evil.com/callback', 'tenant-1'),
      ).rejects.toThrow();
    });
  });
});
