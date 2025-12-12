/**
 * Safety Validation Service
 * 
 * Handles validation of marketplace items against safety policies,
 * domain allowlists, scope restrictions, and tenant policies.
 */

import { prisma } from '../prisma.js';
import type {
  PolicyViolation,
  InstallValidationResult,
  ToolLaunchValidationResult,
  ToolLaunchSafetyChecks,
  AutomatedChecksResult,
  SafetyRating,
  DataAccessProfile,
} from '../types/marketplace.types.js';

// Scopes that are never allowed
const DISALLOWED_SCOPES = new Set([
  'PII_EXPORT',
  'DIRECT_CONTACT',
  'EXTERNAL_TRACKING',
]);

// Safety rating hierarchy (higher index = more permissive)
const SAFETY_RATING_HIERARCHY: SafetyRating[] = [
  'REJECTED',
  'PENDING',
  'RESTRICTED',
  'APPROVED_K12',
];

// Data access profile hierarchy (higher index = more data access)
const DATA_ACCESS_HIERARCHY: DataAccessProfile[] = [
  'MINIMAL',
  'MODERATE',
  'HIGH',
];

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LogToolLaunchParams {
  installationId: string;
  versionId: string;
  tenantId: string;
  userId: string;
  userRole: string;
  launchUrl: string;
  scopesGranted: string[];
  context: string;
  checks: ToolLaunchSafetyChecks;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class SafetyValidationService {
  /**
   * Run automated safety checks on a marketplace item version
   */
  async runAutomatedChecks(versionId: string): Promise<AutomatedChecksResult> {
    const version = await prisma.marketplaceItemVersion.findUnique({
      where: { id: versionId },
      include: {
        marketplaceItem: {
          include: {
            vendor: {
              include: {
                domainAllowlist: true,
              },
            },
          },
        },
        embeddedToolConfig: true,
      },
    });

    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const result: AutomatedChecksResult = {
      checkedAt: new Date(),
      overall: true,
    };

    // Check domain allowlist for embedded tools
    if (version.embeddedToolConfig) {
      const launchUrl = version.embeddedToolConfig.launchUrl;
      const domain = this.extractDomain(launchUrl);
      const allowedDomains = version.marketplaceItem.vendor.domainAllowlist
        .filter((d: { isActive: boolean }) => d.isActive)
        .map((d: { domain: string }) => d.domain);

      const domainAllowed = allowedDomains.some(
        (allowed: string) => domain === allowed || domain.endsWith(`.${allowed}`)
      );

      result.domainAllowlistCheck = {
        passed: domainAllowed,
        domain,
        message: domainAllowed
          ? `Domain ${domain} is in vendor allowlist`
          : `Domain ${domain} is NOT in vendor allowlist. Allowed: ${allowedDomains.join(', ')}`,
      };

      if (!domainAllowed) {
        result.overall = false;
      }

      // Check scopes
      const requiredScopes = version.embeddedToolConfig.requiredScopes || [];
      const optionalScopes = version.embeddedToolConfig.optionalScopes || [];
      const allScopes = [...requiredScopes, ...optionalScopes];

      const scopeAllowlist = await prisma.safetyScopeAllowlist.findMany();
      const disallowedScopes = allScopes.filter((scope: string) => {
        const rule = scopeAllowlist.find((s: { scopeName: string }) => s.scopeName === scope);
        return rule?.isAllowed === false || DISALLOWED_SCOPES.has(scope);
      });

      result.scopeCheck = {
        passed: disallowedScopes.length === 0,
        disallowedScopes,
        message: disallowedScopes.length === 0
          ? 'All requested scopes are allowed'
          : `Disallowed scopes requested: ${disallowedScopes.join(', ')}`,
      };

      if (disallowedScopes.length > 0) {
        result.overall = false;
      }
    }

    return result;
  }

  /**
   * Validate if an item can be installed based on tenant policy
   */
  async validateInstallation(
    tenantId: string,
    itemId: string,
    versionId?: string
  ): Promise<InstallValidationResult> {
    const violations: PolicyViolation[] = [];

    // Get tenant policy
    const policy = await prisma.tenantMarketplacePolicy.findUnique({
      where: { tenantId },
    });

    // Get item with version
    const item = await prisma.marketplaceItem.findUnique({
      where: { id: itemId },
      include: {
        versions: versionId
          ? { where: { id: versionId } }
          : { where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 1 },
        vendor: true,
      },
    });

    if (!item) {
      return {
        isAllowed: false,
        violations: [{ type: 'BLOCKED_ITEM', message: 'Item not found' }],
        requiresApproval: false,
      };
    }

    const version = item.versions[0];
    if (!version) {
      return {
        isAllowed: false,
        violations: [{ type: 'BLOCKED_ITEM', message: 'No published version available' }],
        requiresApproval: false,
      };
    }

    // Apply policy checks
    if (policy) {
      this.checkPolicyViolations(violations, policy, item, version);
    } else {
      // Default: only allow APPROVED_K12 items
      if (version.safetyRating !== 'APPROVED_K12') {
        violations.push({
          type: 'SAFETY_RATING',
          message: `Item safety rating (${version.safetyRating}) does not meet default requirement (APPROVED_K12)`,
          actual: version.safetyRating,
          allowed: ['APPROVED_K12'],
        });
      }
    }

    // Determine if approval is required
    const requiresApproval = policy?.requireSafetyReview ?? false;
    const approvalReason = requiresApproval
      ? 'Tenant policy requires safety review approval for all installations'
      : undefined;

    return {
      isAllowed: violations.length === 0,
      violations,
      requiresApproval,
      approvalReason,
    };
  }

  /**
   * Check policy violations (extracted for complexity reduction)
   */
  private checkPolicyViolations(
    violations: PolicyViolation[],
    policy: {
      blockedVendorIds: string[];
      blockedItemIds: string[];
      allowedSafetyRatings: string[];
      allowedDataAccessProfiles: string[];
      blockedPolicyTags: string[];
    },
    item: { id: string; vendorId: string; vendor: { name: string } },
    version: { safetyRating: string; dataAccessProfile: string; policyTags: string[] }
  ): void {
    // Check blocked vendor
    if (policy.blockedVendorIds.includes(item.vendorId)) {
      violations.push({
        type: 'BLOCKED_VENDOR',
        message: `Vendor ${item.vendor.name} is blocked by tenant policy`,
        vendorId: item.vendorId,
      });
    }

    // Check blocked item
    if (policy.blockedItemIds.includes(item.id)) {
      violations.push({
        type: 'BLOCKED_ITEM',
        message: 'This item is blocked by tenant policy',
        itemId: item.id,
      });
    }

    // Check safety rating
    if (!policy.allowedSafetyRatings.includes(version.safetyRating)) {
      violations.push({
        type: 'SAFETY_RATING',
        message: `Item safety rating (${version.safetyRating}) is not in allowed ratings`,
        actual: version.safetyRating,
        allowed: policy.allowedSafetyRatings,
      });
    }

    // Check data access profile
    if (!policy.allowedDataAccessProfiles.includes(version.dataAccessProfile)) {
      violations.push({
        type: 'DATA_ACCESS',
        message: `Item data access profile (${version.dataAccessProfile}) is not in allowed profiles`,
        actual: version.dataAccessProfile,
        allowed: policy.allowedDataAccessProfiles,
      });
    }

    // Check blocked policy tags
    const blockedTags = version.policyTags.filter(
      (tag: string) => policy.blockedPolicyTags.includes(tag)
    );
    if (blockedTags.length > 0) {
      violations.push({
        type: 'BLOCKED_TAG',
        message: `Item has blocked policy tags: ${blockedTags.join(', ')}`,
        actual: blockedTags.join(', '),
        allowed: [],
      });
    }
  }

  /**
   * Validate if an embedded tool can be launched
   */
  async validateToolLaunch(
    installationId: string,
    userId: string,
    userRole: string,
    _context: string
  ): Promise<ToolLaunchValidationResult> {
    const violations: PolicyViolation[] = [];

    // Get installation with related data
    const installation = await prisma.marketplaceInstallation.findUnique({
      where: { id: installationId },
      include: {
        marketplaceItemVersion: {
          include: {
            embeddedToolConfig: true,
            marketplaceItem: {
              include: {
                vendor: {
                  include: {
                    domainAllowlist: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!installation) {
      return {
        isAllowed: false,
        checks: this.getFailedChecks(),
        violations: [{ type: 'BLOCKED_ITEM', message: 'Installation not found' }],
      };
    }

    const version = installation.marketplaceItemVersion;
    const toolConfig = version.embeddedToolConfig;

    if (!toolConfig) {
      return {
        isAllowed: false,
        checks: this.getFailedChecks(),
        violations: [{ type: 'BLOCKED_ITEM', message: 'No embedded tool configuration' }],
      };
    }

    const checks: ToolLaunchSafetyChecks = {
      installationActive: installation.status === 'ACTIVE',
      installationApproved: installation.approvedAt !== null || installation.status === 'ACTIVE',
      safetyRatingAcceptable: version.safetyRating === 'APPROVED_K12',
      domainAllowlisted: false,
      scopesAllowed: true,
      tenantPolicyPassed: true,
    };

    // Check installation status
    if (!checks.installationActive) {
      violations.push({
        type: 'BLOCKED_ITEM',
        message: `Installation is not active (status: ${installation.status})`,
      });
    }

    // Check safety rating against tenant policy
    const policy = await prisma.tenantMarketplacePolicy.findUnique({
      where: { tenantId: installation.tenantId },
    });

    if (policy) {
      checks.safetyRatingAcceptable = policy.allowedSafetyRatings.includes(version.safetyRating);
      if (!checks.safetyRatingAcceptable) {
        violations.push({
          type: 'SAFETY_RATING',
          message: `Safety rating ${version.safetyRating} not allowed by tenant policy`,
          actual: version.safetyRating,
          allowed: policy.allowedSafetyRatings,
        });
      }

      checks.tenantPolicyPassed = policy.allowedDataAccessProfiles.includes(version.dataAccessProfile);
      if (!checks.tenantPolicyPassed) {
        violations.push({
          type: 'DATA_ACCESS',
          message: `Data access profile ${version.dataAccessProfile} not allowed by tenant policy`,
          actual: version.dataAccessProfile,
          allowed: policy.allowedDataAccessProfiles,
        });
      }
    }

    // Check domain allowlist
    const launchDomain = this.extractDomain(toolConfig.launchUrl);
    const allowedDomains = version.marketplaceItem.vendor.domainAllowlist
      .filter((d: { isActive: boolean }) => d.isActive)
      .map((d: { domain: string }) => d.domain);

    checks.domainAllowlisted = allowedDomains.some(
      (allowed: string) => launchDomain === allowed || launchDomain.endsWith(`.${allowed}`)
    );

    if (!checks.domainAllowlisted) {
      violations.push({
        type: 'SCOPE_VIOLATION',
        message: `Launch domain ${launchDomain} is not in vendor's allowed domains`,
      });
    }

    // Check scopes
    const scopeAllowlist = await prisma.safetyScopeAllowlist.findMany();
    const requestedScopes = [...(toolConfig.requiredScopes || []), ...(toolConfig.optionalScopes || [])];
    
    const disallowedScopes = requestedScopes.filter((scope: string) => {
      const rule = scopeAllowlist.find((s: { scopeName: string }) => s.scopeName === scope);
      return rule?.isAllowed === false || DISALLOWED_SCOPES.has(scope);
    });

    checks.scopesAllowed = disallowedScopes.length === 0;
    if (!checks.scopesAllowed) {
      checks.disallowedScopes = disallowedScopes;
      violations.push({
        type: 'SCOPE_VIOLATION',
        message: `Disallowed scopes: ${disallowedScopes.join(', ')}`,
      });
    }

    // Determine granted scopes (only allowed ones)
    const grantedScopes = requestedScopes.filter((scope: string) => {
      const rule = scopeAllowlist.find((s: { scopeName: string }) => s.scopeName === scope);
      return rule?.isAllowed !== false && !DISALLOWED_SCOPES.has(scope);
    });

    return {
      isAllowed: violations.length === 0,
      checks,
      violations,
      launchUrl: toolConfig.launchUrl,
      grantedScopes,
    };
  }

  /**
   * Log a tool launch event
   */
  async logToolLaunch(params: LogToolLaunchParams): Promise<void> {
    await prisma.toolLaunchLog.create({
      data: {
        installationId: params.installationId,
        marketplaceItemVersionId: params.versionId,
        tenantId: params.tenantId,
        userId: params.userId,
        userRole: params.userRole,
        launchUrl: params.launchUrl,
        scopesGranted: params.scopesGranted,
        launchContext: params.context,
        safetyChecksPassed: Object.values(params.checks).every(v => v === true || Array.isArray(v)),
        safetyChecksJson: params.checks as unknown as Record<string, unknown>,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        sessionId: params.sessionId ?? null,
      },
    });
  }

  /**
   * Get safety details for transparency UI
   */
  async getSafetyDetails(versionId: string): Promise<{
    version: {
      id: string;
      safetyRating: string;
      dataAccessProfile: string;
      safetyNotes: string | null;
      policyTags: string[];
      dataCategoriesAccessed: string[];
      safetyReviewedAt: Date | null;
    };
    item: {
      title: string;
    };
    vendor: {
      name: string;
    };
    explanations: {
      safetyRating: string;
      dataAccessProfile: string;
      policyTags: Record<string, string>;
      dataCategories: Record<string, string>;
    };
  } | null> {
    const version = await prisma.marketplaceItemVersion.findUnique({
      where: { id: versionId },
      include: {
        marketplaceItem: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!version) {
      return null;
    }

    return {
      version: {
        id: version.id,
        safetyRating: version.safetyRating,
        dataAccessProfile: version.dataAccessProfile,
        safetyNotes: version.safetyNotes,
        policyTags: version.policyTags,
        dataCategoriesAccessed: version.dataCategoriesAccessed,
        safetyReviewedAt: version.safetyReviewedAt,
      },
      item: {
        title: version.marketplaceItem.title,
      },
      vendor: {
        name: version.marketplaceItem.vendor.name,
      },
      explanations: {
        safetyRating: this.explainSafetyRating(version.safetyRating as SafetyRating),
        dataAccessProfile: this.explainDataAccessProfile(version.dataAccessProfile as DataAccessProfile),
        policyTags: this.explainPolicyTags(version.policyTags),
        dataCategories: this.explainDataCategories(version.dataCategoriesAccessed),
      },
    };
  }

  /**
   * Check if a safety rating meets minimum requirement
   */
  meetsMinimumSafetyRating(actual: SafetyRating, minimum: SafetyRating): boolean {
    const actualIndex = SAFETY_RATING_HIERARCHY.indexOf(actual);
    const minimumIndex = SAFETY_RATING_HIERARCHY.indexOf(minimum);
    return actualIndex >= minimumIndex;
  }

  /**
   * Check if data access profile is within limit
   */
  isDataAccessWithinLimit(actual: DataAccessProfile, maximum: DataAccessProfile): boolean {
    const actualIndex = DATA_ACCESS_HIERARCHY.indexOf(actual);
    const maximumIndex = DATA_ACCESS_HIERARCHY.indexOf(maximum);
    return actualIndex <= maximumIndex;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  private getFailedChecks(): ToolLaunchSafetyChecks {
    return {
      installationActive: false,
      installationApproved: false,
      safetyRatingAcceptable: false,
      domainAllowlisted: false,
      scopesAllowed: false,
      tenantPolicyPassed: false,
    };
  }

  private explainSafetyRating(rating: SafetyRating): string {
    const explanations: Record<SafetyRating, string> = {
      PENDING: 'This item is awaiting safety review by our Trust & Safety team.',
      APPROVED_K12: 'This item has been reviewed and approved for K-12 classroom use.',
      RESTRICTED: 'This item has restrictions and may require additional approvals.',
      REJECTED: 'This item has been rejected and is not available for installation.',
    };
    return explanations[rating] ?? 'Unknown safety rating';
  }

  private explainDataAccessProfile(profile: DataAccessProfile): string {
    const explanations: Record<DataAccessProfile, string> = {
      MINIMAL: 'This item accesses only pseudonymous identifiers. No personal information is shared.',
      MODERATE: 'This item accesses learner context data such as grade level and progress information.',
      HIGH: 'This item accesses extended learner data. Review data categories for details.',
    };
    return explanations[profile] ?? 'Unknown data access profile';
  }

  private explainPolicyTags(tags: string[]): Record<string, string> {
    const tagExplanations: Record<string, string> = {
      NO_CHAT: 'This item does not include chat or messaging features.',
      NO_VIDEO: 'This item does not include video conferencing or recording.',
      NO_USER_GENERATED_CONTENT: 'This item does not allow user-generated content uploads.',
      REQUIRES_TEACHER_PRESENCE: 'This item should be used with teacher supervision.',
      EXTERNAL_LINKS: 'This item may contain links to external websites.',
      AI_POWERED: 'This item uses AI/ML features.',
      COLLECTS_ANALYTICS: 'This item collects usage analytics.',
    };

    const result: Record<string, string> = {};
    for (const tag of tags) {
      result[tag] = tagExplanations[tag] ?? `Policy tag: ${tag}`;
    }
    return result;
  }

  private explainDataCategories(categories: string[]): Record<string, string> {
    const categoryExplanations: Record<string, string> = {
      LEARNER_ID: 'Pseudonymous learner identifier',
      DISPLAY_NAME: 'Learner display name or nickname',
      GRADE_LEVEL: 'Current grade level',
      PROGRESS_DATA: 'Learning progress and completion data',
      ASSESSMENT_SCORES: 'Assessment results and scores',
      SESSION_EVENTS: 'Learning session activity events',
      CLASSROOM_CONTEXT: 'Classroom and teacher information',
      DEVICE_INFO: 'Device and browser information',
    };

    const result: Record<string, string> = {};
    for (const category of categories) {
      result[category] = categoryExplanations[category] ?? `Data category: ${category}`;
    }
    return result;
  }
}

// Singleton instance
let safetyValidationService: SafetyValidationService | null = null;

export function createSafetyValidationService(): SafetyValidationService {
  if (!safetyValidationService) {
    safetyValidationService = new SafetyValidationService();
  }
  return safetyValidationService;
}
