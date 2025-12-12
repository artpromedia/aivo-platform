/**
 * Safety Validation & Policy Tests
 *
 * Tests for safety validation service, tenant policy enforcement,
 * domain allowlist checks, scope validation, and tool launch safety.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import type {
  SafetyRating,
  DataAccessProfile,
  PolicyViolation,
} from '../types/marketplace.types.js';

// Mock Prisma - must be before importing the service
vi.mock('../prisma.js', () => ({
  prisma: {
    marketplaceItemVersion: {
      findUnique: vi.fn(),
    },
    marketplaceItem: {
      findUnique: vi.fn(),
    },
    marketplaceInstallation: {
      findUnique: vi.fn(),
    },
    tenantMarketplacePolicy: {
      findUnique: vi.fn(),
    },
    safetyScopeAllowlist: {
      findMany: vi.fn(),
    },
    vendorDomainAllowlist: {
      findMany: vi.fn(),
    },
    toolLaunchLog: {
      create: vi.fn(),
    },
    safetyReview: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Import after mock
import { prisma } from '../prisma.js';
import { SafetyValidationService } from '../services/safety-validation.service.js';

describe('SafetyValidationService', () => {
  let service: SafetyValidationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SafetyValidationService();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTOMATED CHECKS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('runAutomatedChecks', () => {
    it('should pass all checks for compliant embedded tool', async () => {
      const mockVersion = {
        id: 'version-1',
        marketplaceItem: {
          vendor: {
            domainAllowlist: [
              { domain: 'tools.vendor.com', isActive: true },
              { domain: 'api.vendor.com', isActive: true },
            ],
          },
        },
        embeddedToolConfig: {
          launchUrl: 'https://tools.vendor.com/launch',
          requiredScopes: ['LEARNER_PROFILE_MIN', 'SESSION_EVENTS_WRITE'],
          optionalScopes: ['PROGRESS_READ'],
        },
      };

      vi.mocked(prisma.marketplaceItemVersion.findUnique).mockResolvedValue(mockVersion as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
        { scopeName: 'SESSION_EVENTS_WRITE', isAllowed: true },
        { scopeName: 'PROGRESS_READ', isAllowed: true },
      ] as any);

      const result = await service.runAutomatedChecks('version-1');

      expect(result.overall).toBe(true);
      expect(result.domainAllowlistCheck?.passed).toBe(true);
      expect(result.scopeCheck?.passed).toBe(true);
      expect(result.scopeCheck?.disallowedScopes).toEqual([]);
    });

    it('should fail domain check for non-allowlisted domain', async () => {
      const mockVersion = {
        id: 'version-1',
        marketplaceItem: {
          vendor: {
            domainAllowlist: [
              { domain: 'allowed.vendor.com', isActive: true },
            ],
          },
        },
        embeddedToolConfig: {
          launchUrl: 'https://malicious.hacker.com/launch',
          requiredScopes: ['LEARNER_PROFILE_MIN'],
          optionalScopes: [],
        },
      };

      vi.mocked(prisma.marketplaceItemVersion.findUnique).mockResolvedValue(mockVersion as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
      ] as any);

      const result = await service.runAutomatedChecks('version-1');

      expect(result.overall).toBe(false);
      expect(result.domainAllowlistCheck?.passed).toBe(false);
      expect(result.domainAllowlistCheck?.domain).toBe('malicious.hacker.com');
    });

    it('should fail scope check for disallowed scopes', async () => {
      const mockVersion = {
        id: 'version-1',
        marketplaceItem: {
          vendor: {
            domainAllowlist: [
              { domain: 'tools.vendor.com', isActive: true },
            ],
          },
        },
        embeddedToolConfig: {
          launchUrl: 'https://tools.vendor.com/launch',
          requiredScopes: ['LEARNER_PROFILE_MIN', 'PII_EXPORT'], // PII_EXPORT is disallowed
          optionalScopes: ['EXTERNAL_TRACKING'], // Also disallowed
        },
      };

      vi.mocked(prisma.marketplaceItemVersion.findUnique).mockResolvedValue(mockVersion as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
        { scopeName: 'PII_EXPORT', isAllowed: false },
        { scopeName: 'EXTERNAL_TRACKING', isAllowed: false },
      ] as any);

      const result = await service.runAutomatedChecks('version-1');

      expect(result.overall).toBe(false);
      expect(result.scopeCheck?.passed).toBe(false);
      expect(result.scopeCheck?.disallowedScopes).toContain('PII_EXPORT');
      expect(result.scopeCheck?.disallowedScopes).toContain('EXTERNAL_TRACKING');
    });

    it('should allow subdomain of allowlisted domain', async () => {
      const mockVersion = {
        id: 'version-1',
        marketplaceItem: {
          vendor: {
            domainAllowlist: [
              { domain: 'vendor.com', isActive: true },
            ],
          },
        },
        embeddedToolConfig: {
          launchUrl: 'https://tools.vendor.com/launch', // subdomain
          requiredScopes: ['LEARNER_PROFILE_MIN'],
          optionalScopes: [],
        },
      };

      vi.mocked(prisma.marketplaceItemVersion.findUnique).mockResolvedValue(mockVersion as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
      ] as any);

      const result = await service.runAutomatedChecks('version-1');

      expect(result.domainAllowlistCheck?.passed).toBe(true);
    });

    it('should skip embedded tool checks for content pack (no tool config)', async () => {
      const mockVersion = {
        id: 'version-1',
        marketplaceItem: {
          vendor: {
            domainAllowlist: [],
          },
        },
        embeddedToolConfig: null, // Content pack, no tool
      };

      vi.mocked(prisma.marketplaceItemVersion.findUnique).mockResolvedValue(mockVersion as any);

      const result = await service.runAutomatedChecks('version-1');

      expect(result.overall).toBe(true);
      expect(result.domainAllowlistCheck).toBeUndefined();
      expect(result.scopeCheck).toBeUndefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INSTALLATION VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateInstallation', () => {
    const createMockItem = (overrides: Partial<{
      safetyRating: SafetyRating;
      dataAccessProfile: DataAccessProfile;
      policyTags: string[];
      vendorId: string;
    }> = {}) => ({
      id: 'item-1',
      vendorId: overrides.vendorId ?? 'vendor-1',
      vendor: { name: 'Test Vendor' },
      versions: [{
        id: 'version-1',
        status: 'PUBLISHED',
        safetyRating: overrides.safetyRating ?? 'APPROVED_K12',
        dataAccessProfile: overrides.dataAccessProfile ?? 'MINIMAL',
        policyTags: overrides.policyTags ?? [],
      }],
    });

    it('should allow installation when item meets default policy (no tenant policy)', async () => {
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({ safetyRating: 'APPROVED_K12' }) as any
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should reject installation when item safety rating is PENDING (default policy)', async () => {
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({ safetyRating: 'PENDING' }) as any
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'SAFETY_RATING')).toBe(true);
    });

    it('should reject installation when vendor is blocked', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
        blockedVendorIds: ['vendor-1'], // Blocked!
        blockedItemIds: [],
        blockedPolicyTags: [],
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({ vendorId: 'vendor-1' }) as any
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'BLOCKED_VENDOR')).toBe(true);
    });

    it('should reject installation when item is blocked', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
        blockedVendorIds: [],
        blockedItemIds: ['item-1'], // Blocked!
        blockedPolicyTags: [],
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem() as any
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'BLOCKED_ITEM')).toBe(true);
    });

    it('should reject installation when safety rating not in allowed list', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'], // Only K12 allowed
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
        blockedVendorIds: [],
        blockedItemIds: [],
        blockedPolicyTags: [],
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({ safetyRating: 'RESTRICTED' }) as any // Not allowed
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'SAFETY_RATING')).toBe(true);
    });

    it('should reject installation when data access profile not in allowed list', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL'], // Only minimal allowed
        blockedVendorIds: [],
        blockedItemIds: [],
        blockedPolicyTags: [],
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({ dataAccessProfile: 'HIGH' }) as any // Not allowed
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'DATA_ACCESS')).toBe(true);
    });

    it('should reject installation when item has blocked policy tags', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE', 'HIGH'],
        blockedVendorIds: [],
        blockedItemIds: [],
        blockedPolicyTags: ['EXTERNAL_LINKS', 'AI_POWERED'], // These are blocked
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({ policyTags: ['AI_POWERED', 'NO_CHAT'] }) as any // Has blocked tag
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(false);
      expect(result.violations.some(v => v.type === 'BLOCKED_TAG')).toBe(true);
    });

    it('should allow installation when all policy requirements met', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12', 'RESTRICTED'],
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
        blockedVendorIds: ['bad-vendor'],
        blockedItemIds: ['bad-item'],
        blockedPolicyTags: ['EXTERNAL_LINKS'],
        requireSafetyReview: false,
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(
        createMockItem({
          safetyRating: 'APPROVED_K12',
          dataAccessProfile: 'MODERATE',
          policyTags: ['NO_CHAT', 'NO_VIDEO'],
        }) as any
      );

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should indicate approval required when policy requiresSafetyReview is true', async () => {
      const mockPolicy = {
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL'],
        blockedVendorIds: [],
        blockedItemIds: [],
        blockedPolicyTags: [],
        requireSafetyReview: true, // Requires approval
      };

      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(mockPolicy as any);
      vi.mocked(prisma.marketplaceItem.findUnique).mockResolvedValue(createMockItem() as any);

      const result = await service.validateInstallation('tenant-1', 'item-1');

      expect(result.isAllowed).toBe(true);
      expect(result.requiresApproval).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL LAUNCH VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateToolLaunch', () => {
    const createMockInstallation = (overrides: Partial<{
      status: string;
      approvedAt: Date | null;
      safetyRating: SafetyRating;
      dataAccessProfile: DataAccessProfile;
      launchUrl: string;
      requiredScopes: string[];
      vendorDomains: Array<{ domain: string; isActive: boolean }>;
    }> = {}) => ({
      id: 'installation-1',
      tenantId: 'tenant-1',
      status: overrides.status ?? 'ACTIVE',
      approvedAt: overrides.approvedAt ?? new Date(),
      marketplaceItemVersion: {
        id: 'version-1',
        safetyRating: overrides.safetyRating ?? 'APPROVED_K12',
        dataAccessProfile: overrides.dataAccessProfile ?? 'MINIMAL',
        marketplaceItem: {
          vendor: {
            domainAllowlist: overrides.vendorDomains ?? [
              { domain: 'tools.vendor.com', isActive: true },
            ],
          },
        },
        embeddedToolConfig: {
          launchUrl: overrides.launchUrl ?? 'https://tools.vendor.com/launch',
          requiredScopes: overrides.requiredScopes ?? ['LEARNER_PROFILE_MIN'],
          optionalScopes: [],
        },
      },
    });

    it('should allow launch for valid, active installation', async () => {
      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(
        createMockInstallation() as any
      );
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue({
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
      } as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
      ] as any);

      const result = await service.validateToolLaunch(
        'installation-1',
        'user-1',
        'TEACHER',
        'CLASSROOM'
      );

      expect(result.isAllowed).toBe(true);
      expect(result.launchUrl).toBe('https://tools.vendor.com/launch');
      expect(result.grantedScopes).toContain('LEARNER_PROFILE_MIN');
    });

    it('should reject launch for inactive installation', async () => {
      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(
        createMockInstallation({ status: 'DISABLED' }) as any
      );
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([]);

      const result = await service.validateToolLaunch(
        'installation-1',
        'user-1',
        'TEACHER',
        'CLASSROOM'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.checks.installationActive).toBe(false);
    });

    it('should reject launch when domain not in allowlist', async () => {
      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(
        createMockInstallation({
          launchUrl: 'https://malicious.site.com/launch',
          vendorDomains: [{ domain: 'legit.vendor.com', isActive: true }],
        }) as any
      );
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
      ] as any);

      const result = await service.validateToolLaunch(
        'installation-1',
        'user-1',
        'TEACHER',
        'CLASSROOM'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.checks.domainAllowlisted).toBe(false);
    });

    it('should reject launch when safety rating not allowed by tenant policy', async () => {
      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(
        createMockInstallation({ safetyRating: 'RESTRICTED' }) as any
      );
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue({
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'], // RESTRICTED not allowed
        allowedDataAccessProfiles: ['MINIMAL', 'MODERATE'],
      } as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
      ] as any);

      const result = await service.validateToolLaunch(
        'installation-1',
        'user-1',
        'TEACHER',
        'CLASSROOM'
      );

      expect(result.isAllowed).toBe(false);
      expect(result.checks.safetyRatingAcceptable).toBe(false);
    });

    it('should filter out disallowed scopes from granted scopes', async () => {
      vi.mocked(prisma.marketplaceInstallation.findUnique).mockResolvedValue(
        createMockInstallation({
          requiredScopes: ['LEARNER_PROFILE_MIN', 'PII_EXPORT'], // PII_EXPORT is disallowed
        }) as any
      );
      vi.mocked(prisma.tenantMarketplacePolicy.findUnique).mockResolvedValue({
        tenantId: 'tenant-1',
        allowedSafetyRatings: ['APPROVED_K12'],
        allowedDataAccessProfiles: ['MINIMAL'],
      } as any);
      vi.mocked(prisma.safetyScopeAllowlist.findMany).mockResolvedValue([
        { scopeName: 'LEARNER_PROFILE_MIN', isAllowed: true },
        { scopeName: 'PII_EXPORT', isAllowed: false },
      ] as any);

      const result = await service.validateToolLaunch(
        'installation-1',
        'user-1',
        'TEACHER',
        'CLASSROOM'
      );

      expect(result.isAllowed).toBe(false); // Because disallowed scopes requested
      expect(result.checks.scopesAllowed).toBe(false);
      expect(result.grantedScopes).toContain('LEARNER_PROFILE_MIN');
      expect(result.grantedScopes).not.toContain('PII_EXPORT');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOL LAUNCH LOGGING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('logToolLaunch', () => {
    it('should create tool launch log entry', async () => {
      vi.mocked(prisma.toolLaunchLog.create).mockResolvedValue({ id: 'log-1' } as any);

      await service.logToolLaunch({
        installationId: 'installation-1',
        versionId: 'version-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'TEACHER',
        launchUrl: 'https://tools.vendor.com/launch',
        scopesGranted: ['LEARNER_PROFILE_MIN'],
        context: 'CLASSROOM',
        checks: {
          installationActive: true,
          installationApproved: true,
          safetyRatingAcceptable: true,
          domainAllowlisted: true,
          scopesAllowed: true,
          tenantPolicyPassed: true,
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        sessionId: 'session-123',
      });

      expect(prisma.toolLaunchLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          installationId: 'installation-1',
          marketplaceItemVersionId: 'version-1',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'TEACHER',
          launchUrl: 'https://tools.vendor.com/launch',
          scopesGranted: ['LEARNER_PROFILE_MIN'],
          launchContext: 'CLASSROOM',
          safetyChecksPassed: true,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          sessionId: 'session-123',
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SAFETY RATING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('meetsMinimumSafetyRating', () => {
    it('should return true when actual rating equals minimum', () => {
      expect(service.meetsMinimumSafetyRating('APPROVED_K12', 'APPROVED_K12')).toBe(true);
    });

    it('should return true when actual rating is higher than minimum', () => {
      expect(service.meetsMinimumSafetyRating('APPROVED_K12', 'RESTRICTED')).toBe(true);
      expect(service.meetsMinimumSafetyRating('APPROVED_K12', 'PENDING')).toBe(true);
    });

    it('should return false when actual rating is lower than minimum', () => {
      expect(service.meetsMinimumSafetyRating('PENDING', 'APPROVED_K12')).toBe(false);
      expect(service.meetsMinimumSafetyRating('RESTRICTED', 'APPROVED_K12')).toBe(false);
      expect(service.meetsMinimumSafetyRating('REJECTED', 'PENDING')).toBe(false);
    });
  });

  describe('isDataAccessWithinLimit', () => {
    it('should return true when actual profile equals maximum', () => {
      expect(service.isDataAccessWithinLimit('MODERATE', 'MODERATE')).toBe(true);
    });

    it('should return true when actual profile is lower than maximum', () => {
      expect(service.isDataAccessWithinLimit('MINIMAL', 'MODERATE')).toBe(true);
      expect(service.isDataAccessWithinLimit('MINIMAL', 'HIGH')).toBe(true);
      expect(service.isDataAccessWithinLimit('MODERATE', 'HIGH')).toBe(true);
    });

    it('should return false when actual profile exceeds maximum', () => {
      expect(service.isDataAccessWithinLimit('HIGH', 'MODERATE')).toBe(false);
      expect(service.isDataAccessWithinLimit('HIGH', 'MINIMAL')).toBe(false);
      expect(service.isDataAccessWithinLimit('MODERATE', 'MINIMAL')).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// POLICY VIOLATION SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

describe('PolicyViolation scenarios', () => {
  it('should provide descriptive violation messages', () => {
    const violations: PolicyViolation[] = [
      {
        type: 'SAFETY_RATING',
        message: 'Item safety rating (PENDING) is not in allowed ratings',
        actual: 'PENDING',
        allowed: ['APPROVED_K12'],
      },
      {
        type: 'BLOCKED_VENDOR',
        message: 'Vendor "Bad Corp" is blocked by tenant policy',
        vendorId: 'vendor-123',
      },
      {
        type: 'SCOPE_VIOLATION',
        message: 'Disallowed scopes: PII_EXPORT, EXTERNAL_TRACKING',
      },
    ];

    expect(violations).toHaveLength(3);
    expect(violations[0].type).toBe('SAFETY_RATING');
    expect(violations[1].vendorId).toBe('vendor-123');
    expect(violations[2].message).toContain('PII_EXPORT');
  });
});
