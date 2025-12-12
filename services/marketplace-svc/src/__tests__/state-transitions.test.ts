/**
 * State Transition Tests for Marketplace Versions
 *
 * Tests the version status workflow:
 * DRAFT → PENDING_REVIEW → IN_REVIEW → APPROVED/REJECTED
 */

import { describe, it, expect } from 'vitest';
import { validateSubmission, ALLOWED_TOOL_SCOPES } from '../services/validation.service.js';
import type {
  MarketplaceItem,
  MarketplaceItemVersion,
  ContentPackItem,
  EmbeddedToolConfig,
} from '../types/index.js';

// Type helpers for test data
type TestMarketplaceItem = Omit<MarketplaceItem, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
};

type TestVersion = Omit<MarketplaceItemVersion, 'createdAt' | 'updatedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  contentPackItems?: Array<Omit<ContentPackItem, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }>;
  embeddedToolConfig?: (Omit<EmbeddedToolConfig, 'createdAt' | 'updatedAt'> & { createdAt: Date; updatedAt: Date }) | null;
};

describe('validateSubmission', () => {
  const baseItem: TestMarketplaceItem = {
    id: 'item-1',
    slug: 'test-item',
    title: 'Test Item',
    shortDescription: 'A short description for the item',
    longDescription: 'A longer description that explains the item in detail. This needs to be at least 50 characters.',
    itemType: 'CONTENT_PACK',
    subjects: ['MATH'],
    gradeBands: ['K_2'],
    modalities: ['GAME'],
    iconUrl: null,
    screenshotsJson: null,
    isActive: true,
    pricingModel: 'FREE',
    priceCents: null,
    metadataJson: null,
    searchKeywords: [],
    vendorId: 'vendor-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseVersion: TestVersion = {
    id: 'version-1',
    itemId: 'item-1',
    version: '1.0.0',
    status: 'DRAFT',
    changelog: null,
    reviewNotes: null,
    submittedAt: null,
    reviewedAt: null,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe('Required Fields', () => {
    it('should pass validation for a complete content pack', () => {
      const version: TestVersion = {
        ...baseVersion,
        contentPackItems: [
          {
            id: 'cp-1',
            versionId: 'version-1',
            loVersionId: 'lo-version-1',
            loId: 'lo-1',
            position: 0,
            isHighlight: false,
            metadataJson: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, baseItem as MarketplaceItem);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if title is too short', () => {
      const item = { ...baseItem, title: 'AB' };
      const result = validateSubmission(baseVersion as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, item as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    });

    it('should fail if short description is too short', () => {
      const item = { ...baseItem, shortDescription: 'Short' };
      const result = validateSubmission(baseVersion as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, item as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'shortDescription')).toBe(true);
    });

    it('should fail if no subjects are selected', () => {
      const item = { ...baseItem, subjects: [] };
      const result = validateSubmission(baseVersion as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, item as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'subjects')).toBe(true);
    });

    it('should fail if no grade bands are selected', () => {
      const item = { ...baseItem, gradeBands: [] };
      const result = validateSubmission(baseVersion as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, item as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'gradeBands')).toBe(true);
    });

    it('should fail if long description is too short', () => {
      const item = { ...baseItem, longDescription: 'Short' };
      const result = validateSubmission(baseVersion as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, item as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'longDescription')).toBe(true);
    });
  });

  describe('Content Pack Validation', () => {
    it('should fail when content pack has no items', () => {
      const version: TestVersion = { ...baseVersion, contentPackItems: [] };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, baseItem as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'contentPackItems')).toBe(true);
    });

    it('should warn about duplicate LOs', () => {
      const version: TestVersion = {
        ...baseVersion,
        contentPackItems: [
          { id: 'cp-1', versionId: 'version-1', loVersionId: 'lo-v-1', loId: 'lo-1', position: 0, isHighlight: false, metadataJson: null, createdAt: new Date(), updatedAt: new Date() },
          { id: 'cp-2', versionId: 'version-1', loVersionId: 'lo-v-1', loId: 'lo-1', position: 1, isHighlight: false, metadataJson: null, createdAt: new Date(), updatedAt: new Date() },
        ],
      };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, baseItem as MarketplaceItem);
      expect(result.warnings.some((w) => w.code === 'DUPLICATE_LO')).toBe(true);
    });
  });

  describe('Embedded Tool Validation', () => {
    const toolItem: TestMarketplaceItem = { ...baseItem, itemType: 'EMBEDDED_TOOL' };

    const baseToolConfig = {
      id: 'tool-1',
      versionId: 'version-1',
      launchUrl: 'https://tool.example.com/launch',
      launchType: 'IFRAME_WEB' as const,
      requiredScopes: ['LEARNER_PROFILE_MIN'],
      optionalScopes: [] as string[],
      configSchemaJson: null,
      defaultConfigJson: null,
      webhookUrl: null,
      cspDirectives: null,
      sandboxAttributes: [] as string[],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should pass with valid tool configuration', () => {
      const version: TestVersion = { ...baseVersion, embeddedToolConfig: baseToolConfig };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, toolItem as MarketplaceItem);
      expect(result.valid).toBe(true);
    });

    it('should fail when tool config is missing', () => {
      const version: TestVersion = { ...baseVersion, embeddedToolConfig: null };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, toolItem as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'embeddedToolConfig')).toBe(true);
    });

    it('should fail when launch URL is missing', () => {
      const version: TestVersion = {
        ...baseVersion,
        embeddedToolConfig: { ...baseToolConfig, launchUrl: '' },
      };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, toolItem as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'launchUrl')).toBe(true);
    });

    it('should warn when launch URL uses HTTP instead of HTTPS', () => {
      const version: TestVersion = {
        ...baseVersion,
        embeddedToolConfig: { ...baseToolConfig, launchUrl: 'http://insecure.example.com' },
      };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, toolItem as MarketplaceItem);
      expect(result.warnings.some((w) => w.code === 'INSECURE_URL')).toBe(true);
    });

    it('should fail when no required scopes are specified', () => {
      const version: TestVersion = {
        ...baseVersion,
        embeddedToolConfig: { ...baseToolConfig, requiredScopes: [] },
      };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, toolItem as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'requiredScopes')).toBe(true);
    });

    it('should fail when invalid scope is requested', () => {
      const version: TestVersion = {
        ...baseVersion,
        embeddedToolConfig: { ...baseToolConfig, requiredScopes: ['LEARNER_PROFILE_MIN', 'ADMIN_FULL_ACCESS'] },
      };
      const result = validateSubmission(version as unknown as MarketplaceItemVersion & { contentPackItems?: ContentPackItem[]; embeddedToolConfig?: EmbeddedToolConfig | null }, toolItem as MarketplaceItem);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_SCOPE')).toBe(true);
    });
  });
});

describe('ALLOWED_TOOL_SCOPES', () => {
  it('should include basic learner profile scope', () => {
    expect(ALLOWED_TOOL_SCOPES).toContain('LEARNER_PROFILE_MIN');
  });

  it('should include progress scopes', () => {
    expect(ALLOWED_TOOL_SCOPES).toContain('LEARNER_PROGRESS_READ');
    expect(ALLOWED_TOOL_SCOPES).toContain('LEARNER_PROGRESS_WRITE');
  });

  it('should include session event scopes', () => {
    expect(ALLOWED_TOOL_SCOPES).toContain('SESSION_EVENTS_READ');
    expect(ALLOWED_TOOL_SCOPES).toContain('SESSION_EVENTS_WRITE');
  });

  it('should not include admin scopes', () => {
    expect(ALLOWED_TOOL_SCOPES).not.toContain('ADMIN_FULL_ACCESS');
    expect(ALLOWED_TOOL_SCOPES).not.toContain('TENANT_ADMIN');
  });
});

describe('Version Status Transitions', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['PENDING_REVIEW'],
    PENDING_REVIEW: ['IN_REVIEW', 'DRAFT'],
    IN_REVIEW: ['APPROVED', 'REJECTED'],
    APPROVED: ['PUBLISHED'],
    REJECTED: ['DRAFT'],
    PUBLISHED: ['DEPRECATED'],
    DEPRECATED: [],
  };

  function isValidTransition(from: string, to: string): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
  }

  describe('allowed transitions', () => {
    it('should allow DRAFT → PENDING_REVIEW (submit)', () => {
      expect(isValidTransition('DRAFT', 'PENDING_REVIEW')).toBe(true);
    });

    it('should allow PENDING_REVIEW → IN_REVIEW (start review)', () => {
      expect(isValidTransition('PENDING_REVIEW', 'IN_REVIEW')).toBe(true);
    });

    it('should allow PENDING_REVIEW → DRAFT (withdraw)', () => {
      expect(isValidTransition('PENDING_REVIEW', 'DRAFT')).toBe(true);
    });

    it('should allow IN_REVIEW → APPROVED (approve)', () => {
      expect(isValidTransition('IN_REVIEW', 'APPROVED')).toBe(true);
    });

    it('should allow IN_REVIEW → REJECTED (reject)', () => {
      expect(isValidTransition('IN_REVIEW', 'REJECTED')).toBe(true);
    });

    it('should allow APPROVED → PUBLISHED (publish)', () => {
      expect(isValidTransition('APPROVED', 'PUBLISHED')).toBe(true);
    });

    it('should allow REJECTED → DRAFT (revise)', () => {
      expect(isValidTransition('REJECTED', 'DRAFT')).toBe(true);
    });

    it('should allow PUBLISHED → DEPRECATED (deprecate)', () => {
      expect(isValidTransition('PUBLISHED', 'DEPRECATED')).toBe(true);
    });
  });

  describe('disallowed transitions', () => {
    it('should not allow DRAFT → APPROVED (skip review)', () => {
      expect(isValidTransition('DRAFT', 'APPROVED')).toBe(false);
    });

    it('should not allow PENDING_REVIEW → APPROVED (skip in_review)', () => {
      expect(isValidTransition('PENDING_REVIEW', 'APPROVED')).toBe(false);
    });

    it('should not allow APPROVED → DRAFT (rollback)', () => {
      expect(isValidTransition('APPROVED', 'DRAFT')).toBe(false);
    });

    it('should not allow PUBLISHED → DRAFT (rollback)', () => {
      expect(isValidTransition('PUBLISHED', 'DRAFT')).toBe(false);
    });

    it('should not allow DEPRECATED → any state', () => {
      expect(isValidTransition('DEPRECATED', 'DRAFT')).toBe(false);
      expect(isValidTransition('DEPRECATED', 'PUBLISHED')).toBe(false);
    });

    it('should not allow skipping states', () => {
      expect(isValidTransition('DRAFT', 'PUBLISHED')).toBe(false);
      expect(isValidTransition('DRAFT', 'IN_REVIEW')).toBe(false);
    });
  });
});
