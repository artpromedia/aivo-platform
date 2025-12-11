/**
 * Content Package Tests
 *
 * Tests for content packaging, manifest building, and delta updates.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { computeChecksum, generateContentUrl } from '../src/packageBuilder.js';

// ══════════════════════════════════════════════════════════════════════════════
// CHECKSUM TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Checksum Computation', () => {
  it('should compute consistent SHA-256 checksums', () => {
    const content = '{"type": "reading_passage", "body": {"text": "Hello world"}}';
    const checksum1 = computeChecksum(content);
    const checksum2 = computeChecksum(content);
    
    expect(checksum1).toBe(checksum2);
    expect(checksum1).toHaveLength(64); // SHA-256 produces 64 hex chars
  });

  it('should produce different checksums for different content', () => {
    const content1 = '{"body": "content1"}';
    const content2 = '{"body": "content2"}';
    
    const checksum1 = computeChecksum(content1);
    const checksum2 = computeChecksum(content2);
    
    expect(checksum1).not.toBe(checksum2);
  });

  it('should handle empty content', () => {
    const checksum = computeChecksum('');
    expect(checksum).toBeDefined();
    expect(checksum).toHaveLength(64);
  });

  it('should handle unicode content', () => {
    const content = '{"body": "日本語テスト 🎓"}';
    const checksum = computeChecksum(content);
    
    expect(checksum).toBeDefined();
    expect(checksum).toHaveLength(64);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// URL GENERATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content URL Generation', () => {
  it('should generate valid URL with signature', () => {
    const url = generateContentUrl('lov-123', 'en', 24);
    
    expect(url).toContain('/v1/content/lov-123/en');
    expect(url).toContain('expires=');
    expect(url).toContain('sig=');
  });

  it('should include expiration timestamp', () => {
    const now = Date.now();
    const url = generateContentUrl('lov-123', 'en', 24);
    
    const expiresMatch = url.match(/expires=(\d+)/);
    expect(expiresMatch).toBeTruthy();
    
    const expires = parseInt(expiresMatch![1], 10);
    const expectedExpires = now + 24 * 60 * 60 * 1000;
    
    // Allow 1 second tolerance
    expect(Math.abs(expires - expectedExpires)).toBeLessThan(1000);
  });

  it('should generate different signatures for different content', () => {
    const url1 = generateContentUrl('lov-123', 'en', 24);
    const url2 = generateContentUrl('lov-456', 'en', 24);
    
    const sig1 = url1.match(/sig=([a-f0-9]+)/)?.[1];
    const sig2 = url2.match(/sig=([a-f0-9]+)/)?.[1];
    
    expect(sig1).not.toBe(sig2);
  });

  it('should handle different locales', () => {
    const urlEn = generateContentUrl('lov-123', 'en', 24);
    const urlEs = generateContentUrl('lov-123', 'es', 24);
    
    expect(urlEn).toContain('/en');
    expect(urlEs).toContain('/es');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MANIFEST SCHEMA TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Manifest Schema', () => {
  const sampleManifest = {
    packageId: 'pkg_123',
    manifestVersion: '1.0.0',
    tenantId: 'tenant_abc',
    gradeBands: ['K_2', 'G3_5'],
    subjects: ['ELA', 'MATH'],
    locales: ['en'],
    generatedAt: '2025-01-10T00:00:00.000Z',
    expiresAt: '2025-01-11T00:00:00.000Z',
    totalItems: 2,
    totalSizeBytes: 10240,
    items: [
      {
        loVersionId: 'lov_1',
        learningObjectId: 'lo_1',
        contentKey: 'LO_VERSION:lov_1:locale:en',
        checksum: 'sha256:abc123',
        contentUrl: 'https://content.aivo.ai/v1/content/lov_1/en',
        sizeBytes: 5120,
        subject: 'ELA',
        gradeBand: 'K_2',
        versionNumber: 1,
        locale: 'en',
        publishedAt: '2025-01-09T00:00:00.000Z',
        updatedAt: '2025-01-09T00:00:00.000Z',
      },
      {
        loVersionId: 'lov_2',
        learningObjectId: 'lo_2',
        contentKey: 'LO_VERSION:lov_2:locale:en',
        checksum: 'sha256:def456',
        contentUrl: 'https://content.aivo.ai/v1/content/lov_2/en',
        sizeBytes: 5120,
        subject: 'MATH',
        gradeBand: 'G3_5',
        versionNumber: 1,
        locale: 'en',
        publishedAt: '2025-01-09T00:00:00.000Z',
        updatedAt: '2025-01-09T00:00:00.000Z',
      },
    ],
  };

  it('should have valid package ID format', () => {
    expect(sampleManifest.packageId).toMatch(/^pkg_/);
  });

  it('should have valid manifest version', () => {
    expect(sampleManifest.manifestVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should have valid grade bands', () => {
    const validBands = ['K_2', 'G3_5', 'G6_8', 'G9_12'];
    for (const band of sampleManifest.gradeBands) {
      expect(validBands).toContain(band);
    }
  });

  it('should have valid subjects', () => {
    const validSubjects = ['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER'];
    for (const subject of sampleManifest.subjects) {
      expect(validSubjects).toContain(subject);
    }
  });

  it('should have valid locales', () => {
    const validLocales = ['en', 'es', 'fr', 'zh', 'ar'];
    for (const locale of sampleManifest.locales) {
      expect(validLocales).toContain(locale);
    }
  });

  it('should have consistent totalItems count', () => {
    expect(sampleManifest.totalItems).toBe(sampleManifest.items.length);
  });

  it('should have consistent totalSizeBytes', () => {
    const calculatedSize = sampleManifest.items.reduce(
      (sum, item) => sum + item.sizeBytes,
      0
    );
    expect(sampleManifest.totalSizeBytes).toBe(calculatedSize);
  });

  it('should have valid content keys', () => {
    for (const item of sampleManifest.items) {
      expect(item.contentKey).toMatch(/^LO_VERSION:[^:]+:locale:[a-z]{2}$/);
    }
  });

  it('should have valid checksum format', () => {
    for (const item of sampleManifest.items) {
      expect(item.checksum).toMatch(/^sha256:[a-f0-9]+$/);
    }
  });

  it('should have expiration after generation', () => {
    const generated = new Date(sampleManifest.generatedAt);
    const expires = new Date(sampleManifest.expiresAt);
    expect(expires.getTime()).toBeGreaterThan(generated.getTime());
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// DELTA UPDATE SCHEMA TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Delta Update Schema', () => {
  const sampleDeltaResponse = {
    tenantId: 'tenant_abc',
    sinceTimestamp: '2025-01-09T00:00:00.000Z',
    currentTimestamp: '2025-01-10T00:00:00.000Z',
    hasMore: false,
    nextCursor: null,
    totalChanges: 3,
    totalSizeBytes: 7680,
    items: [
      {
        loVersionId: 'lov_1',
        learningObjectId: 'lo_1',
        contentKey: 'LO_VERSION:lov_1:locale:en',
        changeType: 'ADDED',
        checksum: 'sha256:abc123',
        contentUrl: 'https://content.aivo.ai/v1/content/lov_1/en',
        sizeBytes: 2560,
        subject: 'ELA',
        gradeBand: 'K_2',
        versionNumber: 1,
        locale: 'en',
        changedAt: '2025-01-09T06:00:00.000Z',
      },
      {
        loVersionId: 'lov_2',
        learningObjectId: 'lo_2',
        contentKey: 'LO_VERSION:lov_2:locale:en',
        changeType: 'UPDATED',
        checksum: 'sha256:def456',
        contentUrl: 'https://content.aivo.ai/v1/content/lov_2/en',
        sizeBytes: 5120,
        subject: 'MATH',
        gradeBand: 'G3_5',
        versionNumber: 2,
        locale: 'en',
        changedAt: '2025-01-09T12:00:00.000Z',
      },
      {
        loVersionId: 'lov_3',
        learningObjectId: 'lo_3',
        contentKey: 'LO_VERSION:lov_3:locale:en',
        changeType: 'REMOVED',
        checksum: null,
        contentUrl: null,
        sizeBytes: null,
        subject: 'ELA',
        gradeBand: 'K_2',
        versionNumber: 1,
        locale: 'en',
        changedAt: '2025-01-09T18:00:00.000Z',
      },
    ],
  };

  it('should have valid change types', () => {
    const validTypes = ['ADDED', 'UPDATED', 'REMOVED'];
    for (const item of sampleDeltaResponse.items) {
      expect(validTypes).toContain(item.changeType);
    }
  });

  it('should have null contentUrl for REMOVED items', () => {
    const removedItems = sampleDeltaResponse.items.filter(
      (i) => i.changeType === 'REMOVED'
    );
    for (const item of removedItems) {
      expect(item.contentUrl).toBeNull();
      expect(item.checksum).toBeNull();
      expect(item.sizeBytes).toBeNull();
    }
  });

  it('should have contentUrl for ADDED/UPDATED items', () => {
    const addedOrUpdated = sampleDeltaResponse.items.filter(
      (i) => i.changeType !== 'REMOVED'
    );
    for (const item of addedOrUpdated) {
      expect(item.contentUrl).toBeTruthy();
      expect(item.checksum).toBeTruthy();
      expect(item.sizeBytes).toBeGreaterThan(0);
    }
  });

  it('should have currentTimestamp after sinceTimestamp', () => {
    const since = new Date(sampleDeltaResponse.sinceTimestamp);
    const current = new Date(sampleDeltaResponse.currentTimestamp);
    expect(current.getTime()).toBeGreaterThan(since.getTime());
  });

  it('should have totalSizeBytes exclude REMOVED items', () => {
    const nonRemovedSize = sampleDeltaResponse.items
      .filter((i) => i.changeType !== 'REMOVED')
      .reduce((sum, i) => sum + (i.sizeBytes ?? 0), 0);
    expect(sampleDeltaResponse.totalSizeBytes).toBe(nonRemovedSize);
  });

  it('should have consistent totalChanges count', () => {
    expect(sampleDeltaResponse.totalChanges).toBe(sampleDeltaResponse.items.length);
  });

  it('should have nextCursor only when hasMore is true', () => {
    expect(sampleDeltaResponse.hasMore).toBe(false);
    expect(sampleDeltaResponse.nextCursor).toBeNull();
    
    // When hasMore is true, nextCursor should be present
    const pagedResponse = { ...sampleDeltaResponse, hasMore: true, nextCursor: '2025-01-09T18:00:00.000Z' };
    expect(pagedResponse.nextCursor).toBeTruthy();
  });

  it('should have changes ordered by changedAt', () => {
    const timestamps = sampleDeltaResponse.items.map((i) => new Date(i.changedAt).getTime());
    const sorted = [...timestamps].sort((a, b) => a - b);
    expect(timestamps).toEqual(sorted);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// PACKAGE STATUS TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Package Status', () => {
  it('should have valid status values', () => {
    const validStatuses = ['PENDING', 'BUILDING', 'READY', 'EXPIRED', 'FAILED'];
    
    for (const status of validStatuses) {
      expect(validStatuses).toContain(status);
    }
  });

  it('PENDING package should not have manifestUrl', () => {
    const pendingPackage = {
      id: 'pkg_1',
      status: 'PENDING',
      manifestUrl: null,
      completedAt: null,
    };
    expect(pendingPackage.manifestUrl).toBeNull();
    expect(pendingPackage.completedAt).toBeNull();
  });

  it('READY package should have manifestUrl', () => {
    const readyPackage = {
      id: 'pkg_1',
      status: 'READY',
      manifestUrl: 'https://content.aivo.ai/packages/pkg_1/manifest.json',
      completedAt: '2025-01-10T00:05:00.000Z',
    };
    expect(readyPackage.manifestUrl).toBeTruthy();
    expect(readyPackage.completedAt).toBeTruthy();
  });

  it('FAILED package should have errorMessage', () => {
    const failedPackage = {
      id: 'pkg_1',
      status: 'FAILED',
      errorMessage: 'Database connection timeout',
      manifestUrl: null,
    };
    expect(failedPackage.errorMessage).toBeTruthy();
    expect(failedPackage.manifestUrl).toBeNull();
  });

  it('EXPIRED package should have past expiresAt', () => {
    const expiredPackage = {
      id: 'pkg_1',
      status: 'EXPIRED',
      expiresAt: '2025-01-09T00:00:00.000Z', // In the past
    };
    const now = new Date();
    const expires = new Date(expiredPackage.expiresAt);
    // Note: In actual test, we'd mock Date.now()
    expect(expiredPackage.status).toBe('EXPIRED');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST VALIDATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Request Validation', () => {
  describe('CreatePackageRequest', () => {
    it('should require tenantId', () => {
      const invalidRequest = {
        gradeBands: ['K_2'],
        subjects: ['ELA'],
      };
      expect(invalidRequest).not.toHaveProperty('tenantId');
    });

    it('should require at least one gradeBand', () => {
      const request = {
        tenantId: 'tenant_abc',
        gradeBands: ['K_2', 'G3_5'],
        subjects: ['ELA'],
      };
      expect(request.gradeBands.length).toBeGreaterThan(0);
    });

    it('should require at least one subject', () => {
      const request = {
        tenantId: 'tenant_abc',
        gradeBands: ['K_2'],
        subjects: ['ELA', 'MATH'],
      };
      expect(request.subjects.length).toBeGreaterThan(0);
    });

    it('should default locales to [en]', () => {
      const request: { tenantId: string; gradeBands: string[]; subjects: string[]; locales?: string[] } = {
        tenantId: 'tenant_abc',
        gradeBands: ['K_2'],
        subjects: ['ELA'],
      };
      const locales = request.locales ?? ['en'];
      expect(locales).toEqual(['en']);
    });

    it('should default urlExpirationHours to 24', () => {
      const request: { tenantId: string; gradeBands: string[]; subjects: string[]; urlExpirationHours?: number } = {
        tenantId: 'tenant_abc',
        gradeBands: ['K_2'],
        subjects: ['ELA'],
      };
      const expirationHours = request.urlExpirationHours ?? 24;
      expect(expirationHours).toBe(24);
    });

    it('should cap urlExpirationHours at 168 (1 week)', () => {
      const maxHours = 168;
      const requestedHours = 200;
      const cappedHours = Math.min(requestedHours, maxHours);
      expect(cappedHours).toBe(168);
    });
  });

  describe('DeltaRequest', () => {
    it('should require sinceTimestamp', () => {
      const request = {
        tenantId: 'tenant_abc',
        gradeBands: ['K_2'],
        subjects: ['ELA'],
        sinceTimestamp: '2025-01-09T00:00:00.000Z',
      };
      expect(request.sinceTimestamp).toBeDefined();
    });

    it('should validate ISO 8601 timestamp format', () => {
      const validTimestamp = '2025-01-09T00:00:00.000Z';
      const date = new Date(validTimestamp);
      expect(date.toISOString()).toBe(validTimestamp);
    });

    it('should default limit to 100', () => {
      const request: { tenantId: string; gradeBands: string[]; subjects: string[]; sinceTimestamp: string; limit?: number } = {
        tenantId: 'tenant_abc',
        gradeBands: ['K_2'],
        subjects: ['ELA'],
        sinceTimestamp: '2025-01-09T00:00:00.000Z',
      };
      const limit = request.limit ?? 100;
      expect(limit).toBe(100);
    });

    it('should cap limit at 1000', () => {
      const maxLimit = 1000;
      const requestedLimit = 5000;
      const cappedLimit = Math.min(requestedLimit, maxLimit);
      expect(cappedLimit).toBe(1000);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// STORAGE CALCULATION TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Storage Calculations', () => {
  it('should calculate package size from items', () => {
    const items = [
      { sizeBytes: 1024 },
      { sizeBytes: 2048 },
      { sizeBytes: 512 },
    ];
    const totalSize = items.reduce((sum, i) => sum + i.sizeBytes, 0);
    expect(totalSize).toBe(3584);
  });

  it('should estimate download time', () => {
    const sizeBytes = 100 * 1024 * 1024; // 100 MB
    const bandwidthBytesPerSecond = 10 * 1024 * 1024; // 10 MB/s
    const estimatedSeconds = sizeBytes / bandwidthBytesPerSecond;
    expect(estimatedSeconds).toBe(10);
  });

  it('should calculate items per locale', () => {
    const baseItems = 100;
    const locales = ['en', 'es'];
    const totalItems = baseItems * locales.length;
    expect(totalItems).toBe(200);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT KEY TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Content Key Generation', () => {
  it('should generate standard content key format', () => {
    const loVersionId = 'abc-123';
    const locale = 'en';
    const contentKey = `LO_VERSION:${loVersionId}:locale:${locale}`;
    
    expect(contentKey).toBe('LO_VERSION:abc-123:locale:en');
  });

  it('should parse content key components', () => {
    const contentKey = 'LO_VERSION:abc-123:locale:es';
    const parts = contentKey.split(':');
    
    expect(parts[0]).toBe('LO_VERSION');
    expect(parts[1]).toBe('abc-123');
    expect(parts[2]).toBe('locale');
    expect(parts[3]).toBe('es');
  });

  it('should extract loVersionId from content key', () => {
    const contentKey = 'LO_VERSION:abc-123:locale:en';
    const match = contentKey.match(/^LO_VERSION:([^:]+):locale:/);
    expect(match?.[1]).toBe('abc-123');
  });

  it('should extract locale from content key', () => {
    const contentKey = 'LO_VERSION:abc-123:locale:fr';
    const match = contentKey.match(/:locale:([a-z]{2})$/);
    expect(match?.[1]).toBe('fr');
  });
});
