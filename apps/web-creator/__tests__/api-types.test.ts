import { describe, it, expect } from 'vitest';

import type {
  Vendor,
  MarketplaceItem,
  Screenshot,
  ItemVersion,
  ContentPackItem,
  EmbeddedToolConfig,
  StatusTransition,
  CreateItemInput,
  VersionStatus,
} from '../lib/api';

// ── VersionStatus type ───────────────────────────────────────────

describe('VersionStatus type', () => {
  it('supports all 7 values', () => {
    const statuses: VersionStatus[] = [
      'DRAFT',
      'PENDING_REVIEW',
      'IN_REVIEW',
      'APPROVED',
      'REJECTED',
      'PUBLISHED',
      'DEPRECATED',
    ];
    expect(statuses).toHaveLength(7);
  });
});

// ── Interface shape tests ────────────────────────────────────────

describe('Vendor interface', () => {
  it('constructs valid AIVO vendor', () => {
    const vendor: Vendor = {
      id: 'v1',
      slug: 'aivo',
      name: 'AIVO',
      type: 'AIVO',
    };
    expect(vendor.type).toBe('AIVO');
  });

  it('constructs valid third-party vendor', () => {
    const vendor: Vendor = {
      id: 'v2',
      slug: 'partner-co',
      name: 'Partner Co',
      type: 'THIRD_PARTY',
    };
    expect(vendor.type).toBe('THIRD_PARTY');
  });
});

describe('MarketplaceItem interface', () => {
  it('constructs valid item', () => {
    const item: MarketplaceItem = {
      id: 'mi-1',
      slug: 'math-pack',
      title: 'Math Essentials',
      shortDescription: 'Core math lessons',
      longDescription: 'Comprehensive...',
      itemType: 'CONTENT_PACK',
      subjects: ['math'],
      gradeBands: ['K-2'],
      modalities: ['visual'],
      iconUrl: null,
      screenshotsJson: null,
      isActive: true,
      pricingModel: 'free',
      priceCents: null,
      metadataJson: null,
      searchKeywords: ['math'],
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };
    expect(item.itemType).toBe('CONTENT_PACK');
    expect(item.isActive).toBe(true);
  });
});

describe('EmbeddedToolConfig interface', () => {
  it('constructs valid config', () => {
    const config: EmbeddedToolConfig = {
      id: 'etc-1',
      launchUrl: 'https://tool.example.com/launch',
      launchType: 'IFRAME_WEB',
      requiredScopes: ['read:profile'],
      optionalScopes: [],
      configSchemaJson: null,
      defaultConfigJson: null,
      webhookUrl: null,
      cspDirectives: null,
      sandboxAttributes: ['allow-scripts'],
    };
    expect(config.launchType).toBe('IFRAME_WEB');
    expect(config.requiredScopes).toContain('read:profile');
  });
});

describe('Screenshot interface', () => {
  it('constructs a valid screenshot', () => {
    const ss: Screenshot = {
      url: 'https://img.example.com/ss.png',
      caption: 'Dashboard view',
      order: 0,
    };
    expect(ss.order).toBe(0);
    expect(ss.caption).toBe('Dashboard view');
  });
});
