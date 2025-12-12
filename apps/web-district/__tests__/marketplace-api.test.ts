import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getItemTypeLabel,
  getSubjectLabel,
  getGradeBandLabel,
  getInstallationStatusLabel,
  getInstallationStatusColor,
  type MarketplaceCatalogItem,
  type MarketplaceInstallation,
} from '../lib/marketplace-api';

// ══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

describe('Marketplace API Helpers', () => {
  describe('getItemTypeLabel', () => {
    it('returns correct label for CONTENT_PACK', () => {
      expect(getItemTypeLabel('CONTENT_PACK')).toBe('Content Pack');
    });

    it('returns correct label for EMBEDDED_TOOL', () => {
      expect(getItemTypeLabel('EMBEDDED_TOOL')).toBe('Embedded Tool');
    });

    it('returns the type as fallback for unknown types', () => {
      expect(getItemTypeLabel('UNKNOWN' as any)).toBe('UNKNOWN');
    });
  });

  describe('getSubjectLabel', () => {
    it('returns correct labels for all subjects', () => {
      expect(getSubjectLabel('MATHEMATICS')).toBe('Mathematics');
      expect(getSubjectLabel('ENGLISH_LANGUAGE_ARTS')).toBe('English Language Arts');
      expect(getSubjectLabel('SCIENCE')).toBe('Science');
      expect(getSubjectLabel('SOCIAL_STUDIES')).toBe('Social Studies');
      expect(getSubjectLabel('COMPUTER_SCIENCE')).toBe('Computer Science');
    });

    it('returns the subject code as fallback', () => {
      expect(getSubjectLabel('UNKNOWN_SUBJECT')).toBe('UNKNOWN_SUBJECT');
    });
  });

  describe('getGradeBandLabel', () => {
    it('returns correct labels for all grade bands', () => {
      expect(getGradeBandLabel('PRE_K')).toBe('Pre-K');
      expect(getGradeBandLabel('K_2')).toBe('K–2');
      expect(getGradeBandLabel('GRADES_3_5')).toBe('3–5');
      expect(getGradeBandLabel('GRADES_6_8')).toBe('6–8');
      expect(getGradeBandLabel('GRADES_9_12')).toBe('9–12');
    });

    it('returns the grade band code as fallback', () => {
      expect(getGradeBandLabel('UNKNOWN_GRADE')).toBe('UNKNOWN_GRADE');
    });
  });

  describe('getInstallationStatusLabel', () => {
    it('returns correct labels for all statuses', () => {
      expect(getInstallationStatusLabel('PENDING_APPROVAL')).toBe('Pending Approval');
      expect(getInstallationStatusLabel('ACTIVE')).toBe('Active');
      expect(getInstallationStatusLabel('DISABLED')).toBe('Disabled');
      expect(getInstallationStatusLabel('REVOKED')).toBe('Revoked');
    });

    it('returns the status code as fallback', () => {
      expect(getInstallationStatusLabel('UNKNOWN_STATUS' as any)).toBe('UNKNOWN_STATUS');
    });
  });

  describe('getInstallationStatusColor', () => {
    it('returns correct colors for all statuses', () => {
      expect(getInstallationStatusColor('PENDING_APPROVAL')).toBe('yellow');
      expect(getInstallationStatusColor('ACTIVE')).toBe('green');
      expect(getInstallationStatusColor('DISABLED')).toBe('gray');
      expect(getInstallationStatusColor('REVOKED')).toBe('red');
    });

    it('returns gray as fallback for unknown statuses', () => {
      expect(getInstallationStatusColor('UNKNOWN_STATUS' as any)).toBe('gray');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA HELPERS
// ══════════════════════════════════════════════════════════════════════════════

export function createMockCatalogItem(
  overrides: Partial<MarketplaceCatalogItem> = {}
): MarketplaceCatalogItem {
  return {
    id: 'item-123',
    slug: 'test-item',
    title: 'Test Content Pack',
    shortDescription: 'A test content pack for unit testing',
    iconUrl: 'https://example.com/icon.png',
    itemType: 'CONTENT_PACK',
    vendor: {
      id: 'vendor-1',
      name: 'Test Vendor',
      logoUrl: 'https://example.com/logo.png',
    },
    currentVersion: {
      id: 'version-1',
      version: '1.0.0',
    },
    subjects: ['MATHEMATICS'],
    gradeBands: ['GRADES_6_8'],
    tags: ['algebra', 'equations'],
    rating: 4.5,
    reviewCount: 128,
    installCount: 500,
    safetyCertified: true,
    publishedAt: '2024-01-15T00:00:00Z',
    ...overrides,
  };
}

export function createMockInstallation(
  overrides: Partial<MarketplaceInstallation> = {}
): MarketplaceInstallation {
  return {
    id: 'installation-123',
    tenantId: 'tenant-1',
    marketplaceItem: {
      id: 'item-123',
      slug: 'test-item',
      title: 'Test Content Pack',
      iconUrl: 'https://example.com/icon.png',
      itemType: 'CONTENT_PACK',
      vendor: {
        id: 'vendor-1',
        name: 'Test Vendor',
      },
    },
    version: {
      id: 'version-1',
      version: '1.0.0',
    },
    status: 'ACTIVE',
    gradeBandConfig: ['GRADES_6_8', 'GRADES_9_12'],
    config: {},
    installedAt: '2024-02-01T00:00:00Z',
    installedBy: 'admin-user-1',
    ...overrides,
  };
}

describe('Mock Data Helpers', () => {
  it('creates valid catalog item with defaults', () => {
    const item = createMockCatalogItem();

    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('slug');
    expect(item).toHaveProperty('title');
    expect(item).toHaveProperty('itemType');
    expect(item).toHaveProperty('vendor');
    expect(item).toHaveProperty('subjects');
    expect(item).toHaveProperty('gradeBands');
  });

  it('allows overriding catalog item properties', () => {
    const item = createMockCatalogItem({
      title: 'Custom Title',
      itemType: 'EMBEDDED_TOOL',
    });

    expect(item.title).toBe('Custom Title');
    expect(item.itemType).toBe('EMBEDDED_TOOL');
  });

  it('creates valid installation with defaults', () => {
    const installation = createMockInstallation();

    expect(installation).toHaveProperty('id');
    expect(installation).toHaveProperty('tenantId');
    expect(installation).toHaveProperty('marketplaceItem');
    expect(installation).toHaveProperty('version');
    expect(installation).toHaveProperty('status');
    expect(installation).toHaveProperty('installedAt');
  });

  it('allows overriding installation properties', () => {
    const installation = createMockInstallation({
      status: 'DISABLED',
      schoolId: 'school-1',
    });

    expect(installation.status).toBe('DISABLED');
    expect(installation.schoolId).toBe('school-1');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// API FUNCTION MOCKING
// ══════════════════════════════════════════════════════════════════════════════

describe('API Function Mocking', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    global.fetch = vi.fn();
  });

  it('searchCatalog builds correct query params', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    });

    const { searchCatalog } = await import('../lib/marketplace-api');

    await searchCatalog({
      query: 'math',
      type: 'CONTENT_PACK',
      subjects: ['MATHEMATICS'],
      gradeBands: ['GRADES_6_8'],
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('q=math'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('type=CONTENT_PACK'),
      expect.any(Object)
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('subjects=MATHEMATICS'),
      expect.any(Object)
    );
  });

  it('listInstallations includes tenant ID', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
    });

    const { listInstallations } = await import('../lib/marketplace-api');

    await listInstallations('tenant-123');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('tenants/tenant-123/installations'),
      expect.any(Object)
    );
  });
});
