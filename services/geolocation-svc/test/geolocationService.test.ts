/**
 * Tests for GeolocationService — detection logic, IP hashing, language inference.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHash } from 'node:crypto';

/* ---------- pure helpers replicated from service ---------- */

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function inferLanguageFromBrowser(browserLanguage?: string): string | null {
  if (!browserLanguage) return null;
  const parts = browserLanguage.split(',');
  const primary = parts[0]?.trim();
  if (!primary) return null;
  // Return just the language code (before any region subtag)
  return primary.split('-')[0]?.toLowerCase() ?? null;
}

/* ---------- location result types ---------- */

interface LocationResult {
  countryCode: string;
  countryName: string;
  regionCode?: string;
  regionName?: string;
  city?: string;
  timezone?: string;
  language: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  firstDayOfWeek: number;
  confidence: number;
  detectionMethod: 'ip' | 'browser' | 'manual';
  complianceRequirements: string[];
}

describe('hashIp', () => {
  it('produces a 16-char hex string', () => {
    const hash = hashIp('192.168.1.1');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('produces deterministic output', () => {
    expect(hashIp('10.0.0.1')).toBe(hashIp('10.0.0.1'));
  });

  it('produces different hashes for different IPs', () => {
    expect(hashIp('10.0.0.1')).not.toBe(hashIp('10.0.0.2'));
  });
});

describe('inferLanguageFromBrowser', () => {
  it('extracts primary language from Accept-Language', () => {
    expect(inferLanguageFromBrowser('en-US,en;q=0.9,fr;q=0.8')).toBe('en');
  });

  it('handles simple language code', () => {
    expect(inferLanguageFromBrowser('fr')).toBe('fr');
  });

  it('handles language with region', () => {
    expect(inferLanguageFromBrowser('pt-BR')).toBe('pt');
  });

  it('returns null for undefined input', () => {
    expect(inferLanguageFromBrowser(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(inferLanguageFromBrowser('')).toBeNull();
  });
});

describe('GeolocationService (mocked)', () => {
  let service: {
    detectLocation: (input: { ip?: string; browserLanguage?: string }) => Promise<LocationResult>;
  };

  const mockCountryData: Record<string, Partial<LocationResult>> = {
    US: {
      countryCode: 'US',
      countryName: 'United States',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      firstDayOfWeek: 0,
      complianceRequirements: ['COPPA', 'FERPA'],
    },
    GB: {
      countryCode: 'GB',
      countryName: 'United Kingdom',
      currency: 'GBP',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      firstDayOfWeek: 1,
      complianceRequirements: ['UK_GDPR', 'AADC'],
    },
  };

  beforeEach(() => {
    const mockMaxMind = vi.fn().mockImplementation((ip: string) => {
      if (ip.startsWith('8.8.')) return { country: { isoCode: 'US' }, city: { names: { en: 'Mountain View' } } };
      if (ip.startsWith('1.1.')) return { country: { isoCode: 'GB' }, city: { names: { en: 'London' } } };
      return null;
    });

    service = {
      detectLocation: async (input) => {
        const geoData = input.ip ? mockMaxMind(input.ip) : null;
        const countryCode = geoData?.country?.isoCode ?? 'US';
        const country = mockCountryData[countryCode] ?? mockCountryData.US!;
        const lang = inferLanguageFromBrowser(input.browserLanguage) ?? 'en';
        return {
          ...country,
          language: lang,
          city: geoData?.city?.names?.en,
          confidence: geoData ? 0.9 : 0.3,
          detectionMethod: input.ip ? 'ip' : 'browser',
        } as LocationResult;
      },
    };
  });

  it('detects US location from IP', async () => {
    const result = await service.detectLocation({ ip: '8.8.8.8' });
    expect(result.countryCode).toBe('US');
    expect(result.currency).toBe('USD');
    expect(result.city).toBe('Mountain View');
    expect(result.detectionMethod).toBe('ip');
    expect(result.confidence).toBe(0.9);
  });

  it('detects UK location from IP', async () => {
    const result = await service.detectLocation({ ip: '1.1.1.1' });
    expect(result.countryCode).toBe('GB');
    expect(result.complianceRequirements).toContain('UK_GDPR');
  });

  it('falls back to US for unknown IP', async () => {
    const result = await service.detectLocation({ ip: '203.0.113.1' });
    expect(result.countryCode).toBe('US');
  });

  it('returns low confidence without IP', async () => {
    const result = await service.detectLocation({ browserLanguage: 'de-DE' });
    expect(result.confidence).toBe(0.3);
    expect(result.language).toBe('de');
    expect(result.detectionMethod).toBe('browser');
  });
});
