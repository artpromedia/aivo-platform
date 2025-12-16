/**
 * Entitlement Service
 *
 * Core service for checking and managing content entitlements.
 * This is the hot-path service for "can this teacher/learner access this LO?"
 *
 * Design decisions:
 * - Uses denormalized TenantContentEntitlement table for fast lookups
 * - Supports caching for high-frequency checks (Redis integration ready)
 * - Handles both B2B (tenant licenses) and D2C (parent purchases)
 * - Enforces seat limits with atomic seat assignment
 */

import { prisma } from '../prisma.js';
import type {
  EntitlementCheckRequest,
  EntitlementCheckResponse,
  BatchEntitlementCheckRequest,
  BatchEntitlementCheckResponse,
  LicenseStatus,
  MarketplaceGradeBand,
} from '../types/index.js';

// Transaction client type for Prisma $transaction callbacks
type TransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// Helper to build response with optional reason
function buildEntitlementResponse(
  base: Omit<EntitlementCheckResponse, 'reason'>,
  reason?: string
): EntitlementCheckResponse {
  if (reason !== undefined) {
    return { ...base, reason };
  }
  return base;
}

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface CacheEntry {
  response: EntitlementCheckResponse;
  expiresAt: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

export class EntitlementService {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;

  constructor(cacheTtlMs = 60_000) {
    // Default 1 minute cache
    this.cacheTtlMs = cacheTtlMs;
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PUBLIC API
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Check if a tenant has entitlement to a specific Learning Object.
   * This is the primary hot-path method called by content-svc and AI orchestrator.
   *
   * @param request - Entitlement check parameters
   * @returns EntitlementCheckResponse with entitled status and details
   */
  async checkEntitlement(request: EntitlementCheckRequest): Promise<EntitlementCheckResponse> {
    const { tenantId, loId, learnerId, schoolId, classroomId, gradeBand } = request;

    // Check cache first
    const cacheKey = this.buildCacheKey(request);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Step 1: Find active entitlement for this tenant + LO
    const entitlement = await prisma.tenantContentEntitlement.findFirst({
      where: {
        tenantId,
        loId,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      include: {
        license: {
          include: {
            marketplaceItem: {
              select: { title: true },
            },
          },
        },
      },
    });

    // No entitlement found - check if it's Aivo-native content (always entitled)
    if (!entitlement) {
      const response: EntitlementCheckResponse = {
        entitled: false,
        reason: 'No active license found for this content',
      };
      this.setCache(cacheKey, response);
      return response;
    }

    const license = entitlement.license;

    // Step 2: Check license status
    if (license.status !== 'ACTIVE') {
      const response: EntitlementCheckResponse = {
        entitled: false,
        reason: `License is ${license.status.toLowerCase()}`,
        license: this.buildLicenseSummary(license),
      };
      this.setCache(cacheKey, response);
      return response;
    }

    // Step 3: Check scope restrictions
    const scopeResult = this.checkScopeRestrictions(entitlement, {
      schoolId,
      classroomId,
      gradeBand,
    });

    if (!scopeResult.allowed) {
      const response = buildEntitlementResponse(
        {
          entitled: false,
          license: this.buildLicenseSummary(license),
        },
        scopeResult.reason
      );
      this.setCache(cacheKey, response);
      return response;
    }

    // Step 4: Check D2C learner restrictions (for parent-purchased licenses)
    if (license.purchaserParentUserId && learnerId) {
      if (license.learnerIds.length > 0 && !license.learnerIds.includes(learnerId)) {
        const response: EntitlementCheckResponse = {
          entitled: false,
          reason: 'Learner not covered by this license',
          license: this.buildLicenseSummary(license),
        };
        this.setCache(cacheKey, response);
        return response;
      }
    }

    // Step 5: Check seat limits
    if (license.seatLimit !== null) {
      const seatAvailable = license.seatsUsed < license.seatLimit;
      const response: EntitlementCheckResponse = {
        entitled: true,
        license: this.buildLicenseSummary(license),
        seatRequired: true,
        seatAvailable,
      };
      this.setCache(cacheKey, response);
      return response;
    }

    // Full entitlement granted
    const response: EntitlementCheckResponse = {
      entitled: true,
      license: this.buildLicenseSummary(license),
    };
    this.setCache(cacheKey, response);
    return response;
  }

  /**
   * Batch check entitlements for multiple LOs.
   * Optimized for teacher content picker that needs to filter a list of LOs.
   *
   * @param request - Batch check parameters
   * @returns Map of loId -> EntitlementCheckResponse
   */
  async batchCheckEntitlements(
    request: BatchEntitlementCheckRequest
  ): Promise<BatchEntitlementCheckResponse> {
    const { tenantId, loIds, learnerId, schoolId, classroomId, gradeBand } = request;

    // First, get all entitlements for these LOs in one query
    const entitlements = await prisma.tenantContentEntitlement.findMany({
      where: {
        tenantId,
        loId: { in: loIds },
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
      },
      include: {
        license: true,
      },
    });

    // Build a map of loId -> entitlement
    const entitlementMap = new Map<string, (typeof entitlements)[0]>();
    for (const ent of entitlements) {
      entitlementMap.set(ent.loId, ent);
    }

    // Check each LO
    const results: Record<string, EntitlementCheckResponse> = {};
    const context = { learnerId, schoolId, classroomId, gradeBand };

    for (const loId of loIds) {
      results[loId] = this.checkSingleLoEntitlement(entitlementMap.get(loId), context);
    }

    return { results };
  }

  /**
   * Check entitlement for a single LO (used by batch check)
   */
  private checkSingleLoEntitlement(
    entitlement:
      | {
          license: {
            status: LicenseStatus;
            purchaserParentUserId: string | null;
            learnerIds: string[];
            seatLimit: number | null;
            seatsUsed: number;
          } & Record<string, unknown>;
          allowedSchoolIds: string[];
          allowedGradeBands: MarketplaceGradeBand[];
        }
      | undefined,
    context: {
      learnerId?: string;
      schoolId?: string;
      classroomId?: string;
      gradeBand?: MarketplaceGradeBand;
    }
  ): EntitlementCheckResponse {
    if (!entitlement) {
      return { entitled: false, reason: 'No active license found for this content' };
    }

    const { license } = entitlement;
    const licenseSummary = this.buildLicenseSummary(license);

    // Check license status
    if (license.status !== 'ACTIVE') {
      return {
        entitled: false,
        reason: `License is ${license.status.toLowerCase()}`,
        license: licenseSummary,
      };
    }

    // Check scope restrictions
    const scopeResult = this.checkScopeRestrictions(entitlement, context);
    if (!scopeResult.allowed) {
      return buildEntitlementResponse(
        { entitled: false, license: licenseSummary },
        scopeResult.reason
      );
    }

    // Check D2C learner restrictions
    if (this.isLearnerExcluded(license, context.learnerId)) {
      return {
        entitled: false,
        reason: 'Learner not covered by this license',
        license: licenseSummary,
      };
    }

    // Check seat limits
    if (license.seatLimit !== null) {
      return {
        entitled: true,
        license: licenseSummary,
        seatRequired: true,
        seatAvailable: license.seatsUsed < license.seatLimit,
      };
    }

    return { entitled: true, license: licenseSummary };
  }

  /**
   * Check if learner is excluded from a D2C license
   */
  private isLearnerExcluded(
    license: { purchaserParentUserId: string | null; learnerIds: string[] },
    learnerId: string | undefined
  ): boolean {
    if (!license.purchaserParentUserId || !learnerId) return false;
    return license.learnerIds.length > 0 && !license.learnerIds.includes(learnerId);
  }

  /**
   * Get all entitled LO IDs for a tenant.
   * Used for filtering content picker results.
   *
   * @param tenantId - Tenant to get entitlements for
   * @param options - Optional scope filters
   * @returns Array of entitled LO IDs
   */
  async getEntitledLoIds(
    tenantId: string,
    options?: {
      schoolId?: string;
      gradeBand?: MarketplaceGradeBand;
      activeOnly?: boolean;
    }
  ): Promise<string[]> {
    const { schoolId, gradeBand, activeOnly = true } = options ?? {};

    // Build where clause incrementally to avoid undefined property issues
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      tenantId,
      license: {
        status: 'ACTIVE',
      },
    };

    if (activeOnly) {
      where.isActive = true;
      where.OR = [{ expiresAt: null }, { expiresAt: { gte: new Date() } }];
    }

    // Filter by school if provided
    if (schoolId) {
      where.OR = [
        { allowedSchoolIds: { isEmpty: true } }, // No restrictions
        { allowedSchoolIds: { has: schoolId } }, // School is allowed
      ];
    }

    // Filter by grade band if provided
    if (gradeBand) {
      where.OR = [
        ...(where.OR ?? []),
        { allowedGradeBands: { isEmpty: true } }, // No restrictions
        { allowedGradeBands: { has: gradeBand } }, // Grade band is allowed
      ];
    }

    const entitlements = await prisma.tenantContentEntitlement.findMany({
      where,
      select: { loId: true },
      distinct: ['loId'],
    });

    return entitlements.map((e: { loId: string }) => e.loId);
  }

  /**
   * Assign a seat to a learner for a licensed marketplace item.
   * Uses atomic increment to prevent race conditions.
   *
   * @param licenseId - License to assign seat from
   * @param learnerId - Learner to assign seat to
   * @param assignedByUserId - User making the assignment
   * @param options - Optional school/classroom context
   * @returns Success/failure with details
   */
  async assignSeat(
    licenseId: string,
    learnerId: string,
    assignedByUserId: string,
    options?: {
      schoolId?: string;
      classroomId?: string;
    }
  ): Promise<{ success: boolean; error?: string; assignment?: { id: string } }> {
    return await prisma.$transaction(async (tx: TransactionClient) => {
      // Get license with lock
      const license = await tx.tenantContentLicense.findUnique({
        where: { id: licenseId },
      });

      if (!license) {
        return { success: false, error: 'License not found' };
      }

      if (license.status !== 'ACTIVE') {
        return { success: false, error: 'License is not active' };
      }

      if (license.seatLimit !== null && license.seatsUsed >= license.seatLimit) {
        return { success: false, error: 'No seats available' };
      }

      // Check if learner already has a seat
      const existingSeat = await tx.learnerSeatAssignment.findFirst({
        where: {
          licenseId,
          learnerId,
          releasedAt: null,
        },
      });

      if (existingSeat) {
        return { success: true, assignment: { id: existingSeat.id } };
      }

      // Create seat assignment and increment usage atomically
      // Build assignment data with proper null handling for optional fields
      const assignmentData: {
        licenseId: string;
        tenantId: string;
        learnerId: string;
        assignedByUserId: string;
        schoolId?: string | null;
        classroomId?: string | null;
      } = {
        licenseId,
        tenantId: license.tenantId,
        learnerId,
        assignedByUserId,
      };
      if (options?.schoolId !== undefined) {
        assignmentData.schoolId = options.schoolId;
      }
      if (options?.classroomId !== undefined) {
        assignmentData.classroomId = options.classroomId;
      }

      const [assignment] = await Promise.all([
        tx.learnerSeatAssignment.create({
          data: assignmentData,
        }),
        tx.tenantContentLicense.update({
          where: { id: licenseId },
          data: {
            seatsUsed: { increment: 1 },
          },
        }),
      ]);

      return { success: true, assignment: { id: assignment.id } };
    });
  }

  /**
   * Release a learner's seat assignment.
   *
   * @param assignmentId - Seat assignment to release
   * @param releasedByUserId - User releasing the seat
   * @param reason - Optional reason for release
   */
  async releaseSeat(
    assignmentId: string,
    releasedByUserId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    return await prisma.$transaction(async (tx: TransactionClient) => {
      const assignment = await tx.learnerSeatAssignment.findUnique({
        where: { id: assignmentId },
      });

      if (!assignment) {
        return { success: false, error: 'Seat assignment not found' };
      }

      if (assignment.releasedAt) {
        return { success: true }; // Already released
      }

      // Release seat and decrement usage atomically
      // Build update data with proper handling for optional reason
      const updateData: {
        releasedAt: Date;
        releasedByUserId: string;
        releaseReason?: string | null;
      } = {
        releasedAt: new Date(),
        releasedByUserId,
      };
      if (reason !== undefined) {
        updateData.releaseReason = reason;
      }

      await Promise.all([
        tx.learnerSeatAssignment.update({
          where: { id: assignmentId },
          data: updateData,
        }),
        tx.tenantContentLicense.update({
          where: { id: assignment.licenseId },
          data: {
            seatsUsed: { decrement: 1 },
          },
        }),
      ]);

      return { success: true };
    });
  }

  /**
   * Invalidate cache for a tenant (called when licenses change)
   */
  invalidateTenantCache(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Check if a tenant is entitled to a specific marketplace item (not tied to a specific LO).
   * Used for general item access checks (e.g., can teacher browse this content pack).
   */
  async checkMarketplaceItemEntitlement(request: {
    tenantId: string;
    marketplaceItemId: string;
    learnerId?: string;
    schoolId?: string;
    classroomId?: string;
    gradeBand?: MarketplaceGradeBand;
  }): Promise<{
    entitled: boolean;
    reason?: string;
    license?: EntitlementCheckResponse['license'];
    seatRequired?: boolean;
    seatAvailable?: boolean;
    entitledPacks?: { id: string; title: string }[];
  }> {
    const { tenantId, marketplaceItemId, schoolId, classroomId, gradeBand, learnerId } = request;

    // Find active license for this marketplace item
    const license = await prisma.tenantContentLicense.findFirst({
      where: {
        tenantId,
        marketplaceItemId,
        status: 'ACTIVE',
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      include: {
        marketplaceItem: {
          select: { id: true, title: true },
        },
      },
    });

    if (!license) {
      return { entitled: false, reason: 'No active license for this content' };
    }

    // Check scope restrictions
    const scopeResult = this.checkLicenseScopeRestrictions(license, {
      schoolId,
      classroomId,
      gradeBand,
    });

    if (!scopeResult.allowed) {
      return buildEntitlementResponse(
        {
          entitled: false,
          license: this.buildLicenseSummary(license),
        },
        scopeResult.reason
      );
    }

    // Check D2C learner restrictions
    if (license.purchaserParentUserId && learnerId) {
      if (license.learnerIds.length > 0 && !license.learnerIds.includes(learnerId)) {
        return {
          entitled: false,
          reason: 'Learner not covered by this license',
          license: this.buildLicenseSummary(license),
        };
      }
    }

    // Check seat limits
    if (license.seatLimit !== null) {
      return {
        entitled: true,
        license: this.buildLicenseSummary(license),
        seatRequired: true,
        seatAvailable: license.seatsUsed < license.seatLimit,
        entitledPacks: [{ id: license.marketplaceItem.id, title: license.marketplaceItem.title }],
      };
    }

    return {
      entitled: true,
      license: this.buildLicenseSummary(license),
      entitledPacks: [{ id: license.marketplaceItem.id, title: license.marketplaceItem.title }],
    };
  }

  /**
   * Get all entitled marketplace items for a tenant.
   * Used by the content picker's partner content tab.
   */
  async getEntitledMarketplaceItems(options: {
    tenantId: string;
    schoolId?: string;
    classroomId?: string;
    gradeBand?: MarketplaceGradeBand;
    subject?: string;
    itemType?: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
    limit: number;
    offset: number;
  }): Promise<{
    items: {
      id: string;
      slug: string;
      title: string;
      shortDescription: string;
      itemType: string;
      subjects: string[];
      gradeBands: string[];
      iconUrl: string | null;
      vendor: { id: string; slug: string; name: string; logoUrl: string | null };
      license: {
        id: string;
        status: string;
        seatLimit: number | null;
        seatsUsed: number;
        validUntil: Date | null;
      };
      loCount: number;
      accessibilityTags: string[];
      safetyTags: string[];
    }[];
    total: number;
  }> {
    const { tenantId, schoolId, gradeBand, subject, itemType, limit, offset } = options;

    // Build where clause for licenses
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const licenseWhere: any = {
      tenantId,
      status: 'ACTIVE',
      OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
    };

    // Get active licenses with marketplace items
    const licenses = await prisma.tenantContentLicense.findMany({
      where: licenseWhere,
      include: {
        marketplaceItem: {
          include: {
            vendor: {
              select: { id: true, slug: true, name: true, logoUrl: true },
            },
            versions: {
              where: { status: 'PUBLISHED' },
              orderBy: { publishedAt: 'desc' },
              take: 1,
              include: {
                contentPackItems: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by scope restrictions and other criteria
    type LicenseWithItem = (typeof licenses)[number];
    const filteredItems = licenses
      .filter((license: LicenseWithItem) => {
        // Check scope restrictions
        const scopeCheck = this.checkLicenseScopeRestrictions(license, {
          schoolId,
          gradeBand,
          classroomId: undefined,
        });
        if (!scopeCheck.allowed) return false;

        const item = license.marketplaceItem;
        if (!item.isActive) return false;

        // Filter by item type
        if (itemType && item.itemType !== itemType) return false;

        // Filter by subject
        if (subject && !item.subjects.includes(subject as never)) return false;

        return true;
      })
      .map((license: LicenseWithItem) => {
        const item = license.marketplaceItem;
        const latestVersion = item.versions[0];

        // Type for the version with content items
        const versionTags = latestVersion?.policyTags ?? [];

        return {
          id: item.id,
          slug: item.slug,
          title: item.title,
          shortDescription: item.shortDescription,
          itemType: item.itemType,
          subjects: item.subjects,
          gradeBands: item.gradeBands,
          iconUrl: item.iconUrl,
          vendor: item.vendor,
          license: {
            id: license.id,
            status: license.status,
            seatLimit: license.seatLimit,
            seatsUsed: license.seatsUsed,
            validUntil: license.validUntil,
          },
          loCount: latestVersion?.contentPackItems.length ?? 0,
          accessibilityTags: versionTags.filter((t: string) =>
            ['TTS', 'DYSLEXIA_FRIENDLY', 'CAPTIONS', 'HIGH_CONTRAST'].includes(t)
          ),
          safetyTags: versionTags.filter((t: string) =>
            ['NO_ADS', 'NO_CHAT', 'NO_SOCIAL', 'NO_VIDEO'].includes(t)
          ),
        };
      });

    const total = filteredItems.length;
    const paginatedItems = filteredItems.slice(offset, offset + limit);

    return { items: paginatedItems, total };
  }

  /**
   * Check license scope restrictions
   */
  private checkLicenseScopeRestrictions(
    license: {
      scopeType: string;
      allowedSchoolIds: string[];
      allowedGradeBands: MarketplaceGradeBand[];
      allowedClassroomIds: string[];
    },
    context: {
      schoolId: string | undefined;
      classroomId: string | undefined;
      gradeBand: MarketplaceGradeBand | undefined;
    }
  ): { allowed: boolean; reason?: string } {
    // Tenant-wide licenses have no restrictions
    if (license.scopeType === 'TENANT') {
      return { allowed: true };
    }

    // Get the relevant check for this scope type
    return this.checkScopeByType(license, context);
  }

  /**
   * Check scope restriction by scope type
   */
  private checkScopeByType(
    license: {
      scopeType: string;
      allowedSchoolIds: string[];
      allowedGradeBands: MarketplaceGradeBand[];
      allowedClassroomIds: string[];
    },
    context: {
      schoolId: string | undefined;
      classroomId: string | undefined;
      gradeBand: MarketplaceGradeBand | undefined;
    }
  ): { allowed: boolean; reason?: string } {
    switch (license.scopeType) {
      case 'SCHOOL':
        return this.checkAllowedList(
          context.schoolId,
          license.allowedSchoolIds,
          'School not covered by license'
        );
      case 'CLASSROOM':
        return this.checkAllowedList(
          context.classroomId,
          license.allowedClassroomIds,
          'Classroom not covered by license'
        );
      case 'GRADE_BAND':
        return this.checkAllowedList(
          context.gradeBand,
          license.allowedGradeBands,
          'Grade band not covered by license'
        );
      default:
        return { allowed: true };
    }
  }

  /**
   * Check if a value is in the allowed list
   */
  private checkAllowedList(
    value: string | undefined,
    allowedValues: string[],
    reason: string
  ): { allowed: boolean; reason?: string } {
    if (!value || allowedValues.length === 0) {
      return { allowed: true };
    }
    if (allowedValues.includes(value)) {
      return { allowed: true };
    }
    return { allowed: false, reason };
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════════

  private buildCacheKey(request: EntitlementCheckRequest): string {
    const parts = [
      request.tenantId,
      request.loId,
      request.learnerId ?? '',
      request.schoolId ?? '',
      request.classroomId ?? '',
      request.gradeBand ?? '',
    ];
    return parts.join(':');
  }

  private getFromCache(key: string): EntitlementCheckResponse | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  private setCache(key: string, response: EntitlementCheckResponse): void {
    this.cache.set(key, {
      response,
      expiresAt: Date.now() + this.cacheTtlMs,
    });
  }

  private checkScopeRestrictions(
    entitlement: {
      allowedSchoolIds: string[];
      allowedGradeBands: MarketplaceGradeBand[];
    },
    context: {
      schoolId: string | undefined;
      classroomId: string | undefined;
      gradeBand: MarketplaceGradeBand | undefined;
    }
  ): { allowed: boolean; reason?: string } {
    // Check school restriction
    if (entitlement.allowedSchoolIds.length > 0 && context.schoolId) {
      if (!entitlement.allowedSchoolIds.includes(context.schoolId)) {
        return { allowed: false, reason: 'School not covered by license' };
      }
    }

    // Check grade band restriction
    if (entitlement.allowedGradeBands.length > 0 && context.gradeBand) {
      if (!entitlement.allowedGradeBands.includes(context.gradeBand)) {
        return { allowed: false, reason: 'Grade band not covered by license' };
      }
    }

    return { allowed: true };
  }

  private buildLicenseSummary(license: {
    id: string;
    marketplaceItemId: string;
    status: LicenseStatus;
    validUntil: Date | null;
    seatLimit: number | null;
    seatsUsed: number;
  }): NonNullable<EntitlementCheckResponse['license']> {
    return {
      id: license.id,
      marketplaceItemId: license.marketplaceItemId,
      status: license.status,
      expiresAt: license.validUntil,
      seatLimit: license.seatLimit,
      seatsUsed: license.seatsUsed,
    };
  }
}

// Export singleton instance
export const entitlementService = new EntitlementService();
