/**
 * Pilot Program Service
 *
 * Manages pilot programs for districts and nonprofits including:
 * - Pilot program creation and management
 * - License provisioning for pilots
 * - Extension handling
 * - Conversion to paid contracts/subscriptions
 */

import { prisma } from '../prisma.js';
import type { Prisma } from '../prisma.js';

import { getLicenseVaultService } from './license-vault.service.js';
import { reminderService } from './reminder.service.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type PilotProgramType =
  | 'DISTRICT_PILOT'
  | 'NONPROFIT_PILOT'
  | 'CHARTER_PILOT'
  | 'ENTERPRISE_TRIAL'
  | 'PROMOTIONAL';

export type PilotProgramStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXTENDED'
  | 'CONVERTING'
  | 'CONVERTED'
  | 'EXPIRED'
  | 'CANCELLED';

interface CreatePilotParams {
  tenantId: string;
  enterpriseCustomerId?: string;
  enterpriseDealId?: string;
  type: PilotProgramType;
  name: string;
  description?: string;
  seats: number;
  durationDays?: number;
  startDate?: Date;
  primaryContactName?: string;
  primaryContactEmail?: string;
  primaryContactPhone?: string;
  features?: string[];
  successCriteria?: Record<string, unknown>;
  autoConvertEnabled?: boolean;
  conversionDiscountPct?: number;
  conversionPricePerSeatCents?: number;
  createdBy: string;
  notes?: string;
}

interface ExtendPilotParams {
  pilotId: string;
  additionalDays: number;
  reason?: string;
  approvedBy: string;
}

interface ConvertPilotParams {
  pilotId: string;
  contractTermMonths?: number;
  pricePerSeatCents?: number;
  applyPromotionalPricing?: boolean;
  convertedBy: string;
  notes?: string;
}

interface ListPilotsParams {
  tenantId?: string;
  enterpriseCustomerId?: string;
  status?: PilotProgramStatus;
  type?: PilotProgramType;
  endingWithinDays?: number;
  limit: number;
  offset: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PILOT SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

class PilotProgramService {
  // Default pilot duration in days
  private readonly defaultDurationDays = Number.parseInt(
    process.env.PILOT_DEFAULT_DURATION_DAYS ?? '90',
    10
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // PILOT LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new pilot program
   */
  async createPilot(params: CreatePilotParams): Promise<{
    pilot: {
      id: string;
      name: string;
      type: string;
      status: string;
      seats: number;
      startDate: Date;
      endDate: Date;
    };
    licenses: { id: string; displayKey: string }[];
    remindersScheduled: number;
  }> {
    const startDate = params.startDate ?? new Date();
    const durationDays = params.durationDays ?? this.defaultDurationDays;
    const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

    // Create the pilot program
    const pilot = await prisma.pilotProgram.create({
      data: {
        tenantId: params.tenantId,
        enterpriseCustomerId: params.enterpriseCustomerId,
        enterpriseDealId: params.enterpriseDealId,
        type: params.type,
        status: startDate <= new Date() ? 'ACTIVE' : 'PENDING',
        name: params.name,
        description: params.description,
        seats: params.seats,
        startDate,
        originalEndDate: endDate,
        endDate,
        primaryContactName: params.primaryContactName,
        primaryContactEmail: params.primaryContactEmail,
        primaryContactPhone: params.primaryContactPhone,
        featuresJson: params.features ?? [],
        successCriteriaJson: (params.successCriteria ?? {}) as Prisma.InputJsonValue,
        autoConvertEnabled: params.autoConvertEnabled ?? false,
        conversionDiscountPct: params.conversionDiscountPct,
        conversionPricePerSeatCents: params.conversionPricePerSeatCents,
        createdBy: params.createdBy,
        notes: params.notes,
      },
    });

    // Provision licenses for the pilot
    const vaultService = getLicenseVaultService();
    const licenseResult = await vaultService.generateBulkLicenses({
      tenantId: params.tenantId,
      type: 'TRIAL', // Pilots use trial license type
      seatsPerLicense: 1,
      quantity: params.seats,
      validDays: durationDays,
      features: params.features ?? [],
      issuedBy: params.createdBy,
    });

    // Link licenses to pilot program
    for (const license of licenseResult.licenses) {
      await prisma.vaultLicense.update({
        where: { id: license.id },
        data: { pilotProgramId: pilot.id },
      });
    }

    // Schedule reminders
    const reminderResult = await reminderService.schedulePilotReminders(
      pilot.id,
      endDate,
      params.primaryContactEmail,
      false, // No payment method initially
      params.conversionPricePerSeatCents
    );

    return {
      pilot: {
        id: pilot.id,
        name: pilot.name,
        type: pilot.type,
        status: pilot.status,
        seats: pilot.seats,
        startDate: pilot.startDate,
        endDate: pilot.endDate,
      },
      licenses: licenseResult.licenses,
      remindersScheduled: reminderResult.remindersCreated,
    };
  }

  /**
   * Get a pilot program by ID
   */
  async getPilot(pilotId: string): Promise<{
    id: string;
    tenantId: string;
    enterpriseCustomerId: string | null;
    type: string;
    status: string;
    name: string;
    description: string | null;
    seats: number;
    seatsUsed: number;
    startDate: Date;
    endDate: Date;
    originalEndDate: Date;
    extensionCount: number;
    primaryContactName: string | null;
    primaryContactEmail: string | null;
    features: string[];
    hasPaymentMethodOnFile: boolean;
    autoConvertEnabled: boolean;
    conversionDiscountPct: number | null;
    conversionPricePerSeatCents: number | null;
    convertedContractId: string | null;
    convertedAt: Date | null;
    daysRemaining: number;
    isExpired: boolean;
    licenses: { id: string; status: string; seatsUsed: number }[];
    extensions: { id: string; previousEndDate: Date; newEndDate: Date; reason: string | null }[];
  } | null> {
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: pilotId },
      include: {
        licenses: {
          select: { id: true, status: true, seatsUsed: true },
        },
        extensions: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            previousEndDate: true,
            newEndDate: true,
            reason: true,
          },
        },
      },
    });

    if (!pilot) return null;

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((pilot.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      id: pilot.id,
      tenantId: pilot.tenantId,
      enterpriseCustomerId: pilot.enterpriseCustomerId,
      type: pilot.type,
      status: pilot.status,
      name: pilot.name,
      description: pilot.description,
      seats: pilot.seats,
      seatsUsed: pilot.seatsUsed,
      startDate: pilot.startDate,
      endDate: pilot.endDate,
      originalEndDate: pilot.originalEndDate,
      extensionCount: pilot.extensionCount,
      primaryContactName: pilot.primaryContactName,
      primaryContactEmail: pilot.primaryContactEmail,
      features: (pilot.featuresJson as string[]) ?? [],
      hasPaymentMethodOnFile: pilot.hasPaymentMethodOnFile,
      autoConvertEnabled: pilot.autoConvertEnabled,
      conversionDiscountPct: pilot.conversionDiscountPct,
      conversionPricePerSeatCents: pilot.conversionPricePerSeatCents,
      convertedContractId: pilot.convertedContractId,
      convertedAt: pilot.convertedAt,
      daysRemaining,
      isExpired: pilot.endDate < now,
      licenses: pilot.licenses,
      extensions: pilot.extensions,
    };
  }

  /**
   * List pilot programs with filters
   */
  async listPilots(params: ListPilotsParams): Promise<{
    pilots: {
      id: string;
      tenantId: string;
      type: string;
      status: string;
      name: string;
      seats: number;
      seatsUsed: number;
      startDate: Date;
      endDate: Date;
      daysRemaining: number;
      primaryContactEmail: string | null;
    }[];
    total: number;
  }> {
    const where: Prisma.PilotProgramWhereInput = {};

    if (params.tenantId) where.tenantId = params.tenantId;
    if (params.enterpriseCustomerId) where.enterpriseCustomerId = params.enterpriseCustomerId;
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.endingWithinDays !== undefined) {
      const endThreshold = new Date();
      endThreshold.setDate(endThreshold.getDate() + params.endingWithinDays);
      where.endDate = { lte: endThreshold };
      where.status = { in: ['ACTIVE', 'EXTENDED'] };
    }

    const [pilots, total] = await Promise.all([
      prisma.pilotProgram.findMany({
        where,
        orderBy: { endDate: 'asc' },
        take: params.limit,
        skip: params.offset,
      }),
      prisma.pilotProgram.count({ where }),
    ]);

    const now = new Date();

    return {
      pilots: pilots.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        type: p.type,
        status: p.status,
        name: p.name,
        seats: p.seats,
        seatsUsed: p.seatsUsed,
        startDate: p.startDate,
        endDate: p.endDate,
        daysRemaining: Math.max(
          0,
          Math.ceil((p.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        ),
        primaryContactEmail: p.primaryContactEmail,
      })),
      total,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PILOT EXTENSIONS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Extend a pilot program
   */
  async extendPilot(params: ExtendPilotParams): Promise<{
    success: boolean;
    newEndDate?: Date;
    extensionNumber?: number;
    error?: string;
  }> {
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: params.pilotId },
    });

    if (!pilot) {
      return { success: false, error: 'Pilot program not found' };
    }

    if (!['ACTIVE', 'EXTENDED'].includes(pilot.status)) {
      return { success: false, error: `Cannot extend pilot with status: ${pilot.status}` };
    }

    if (pilot.extensionCount >= pilot.maxExtensions) {
      return {
        success: false,
        error: `Maximum extensions (${pilot.maxExtensions}) reached`,
      };
    }

    const previousEndDate = pilot.endDate;
    const newEndDate = new Date(
      previousEndDate.getTime() + params.additionalDays * 24 * 60 * 60 * 1000
    );

    // Update pilot
    await prisma.pilotProgram.update({
      where: { id: params.pilotId },
      data: {
        endDate: newEndDate,
        status: 'EXTENDED',
        extensionCount: { increment: 1 },
      },
    });

    // Record extension
    await prisma.pilotExtension.create({
      data: {
        pilotId: params.pilotId,
        previousEndDate,
        newEndDate,
        reason: params.reason,
        approvedBy: params.approvedBy,
      },
    });

    // Extend licenses
    await prisma.vaultLicense.updateMany({
      where: { pilotProgramId: params.pilotId },
      data: {
        expiresAt: newEndDate,
      },
    });

    // Reschedule reminders
    await reminderService.reschedulePilotReminders(params.pilotId, newEndDate);

    return {
      success: true,
      newEndDate,
      extensionNumber: pilot.extensionCount + 1,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PILOT CONVERSION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Find and apply promotional pricing for pilot conversion
   */
  private async applyPromotionalPricing(
    pilot: { id: string; tenantId: string; seats: number; conversionDiscountPct: number | null },
    originalPriceCents: number,
    termMonths: number,
    convertedBy: string,
    notes?: string
  ): Promise<{ finalPriceCents: number; discountPercent: number }> {
    let discountPercent = pilot.conversionDiscountPct ?? 0;
    let finalPriceCents =
      discountPercent > 0
        ? Math.round(originalPriceCents * (1 - discountPercent / 100))
        : originalPriceCents;

    const now = new Date();
    const promoRule = await prisma.promotionalPricing.findFirst({
      where: {
        type: 'PILOT_CONVERSION',
        isActive: true,
        AND: [
          { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
          { OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
          { OR: [{ maxRedemptions: null }, { redemptionCount: { lt: 999999 } }] },
        ],
      },
      orderBy: { priority: 'desc' },
    });

    const validPromoRule =
      promoRule &&
      (promoRule.maxRedemptions === null || promoRule.redemptionCount < promoRule.maxRedemptions)
        ? promoRule
        : null;

    if (!validPromoRule) {
      return { finalPriceCents, discountPercent };
    }

    if (validPromoRule.discountPercent) {
      discountPercent = Math.max(discountPercent, validPromoRule.discountPercent);
      finalPriceCents = Math.round(originalPriceCents * (1 - discountPercent / 100));
    }
    if (validPromoRule.discountAmountCents) {
      finalPriceCents = Math.max(0, originalPriceCents - validPromoRule.discountAmountCents);
    }
    if (validPromoRule.pricePerSeatCents) {
      finalPriceCents = validPromoRule.pricePerSeatCents * pilot.seats * termMonths;
    }

    await prisma.promotionalPricingRedemption.create({
      data: {
        pricingId: validPromoRule.id,
        tenantId: pilot.tenantId,
        pilotProgramId: pilot.id,
        originalPriceCents,
        finalPriceCents,
        discountCents: originalPriceCents - finalPriceCents,
        redeemedBy: convertedBy,
        notes,
      },
    });

    await prisma.promotionalPricing.update({
      where: { id: validPromoRule.id },
      data: { redemptionCount: { increment: 1 } },
    });

    return { finalPriceCents, discountPercent };
  }

  /**
   * Convert a pilot to a paid contract/subscription
   */
  async convertPilot(params: ConvertPilotParams): Promise<{
    success: boolean;
    contractId?: string;
    subscriptionId?: string;
    originalPriceCents?: number;
    finalPriceCents?: number;
    discountApplied?: number;
    error?: string;
  }> {
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: params.pilotId },
      include: { licenses: true },
    });

    if (!pilot) {
      return { success: false, error: 'Pilot program not found' };
    }

    if (!['ACTIVE', 'EXTENDED', 'EXPIRED'].includes(pilot.status)) {
      return { success: false, error: `Cannot convert pilot with status: ${pilot.status}` };
    }

    // Calculate pricing
    const termMonths = params.contractTermMonths ?? 12;
    const basePrice = params.pricePerSeatCents ?? pilot.conversionPricePerSeatCents ?? 5000;
    const originalPriceCents = basePrice * pilot.seats * termMonths;

    // Apply promotional pricing if requested
    const { finalPriceCents } = params.applyPromotionalPricing
      ? await this.applyPromotionalPricing(
          pilot,
          originalPriceCents,
          termMonths,
          params.convertedBy,
          params.notes
        )
      : { finalPriceCents: originalPriceCents };

    // Mark pilot as converting
    await prisma.pilotProgram.update({
      where: { id: params.pilotId },
      data: { status: 'CONVERTING' },
    });

    try {
      await prisma.pilotProgram.update({
        where: { id: params.pilotId },
        data: { status: 'CONVERTED', convertedAt: new Date() },
      });

      await prisma.vaultLicense.updateMany({
        where: { pilotProgramId: params.pilotId },
        data: {
          type: 'ENTERPRISE',
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + termMonths * 30 * 24 * 60 * 60 * 1000),
        },
      });

      await reminderService.cancelPilotReminders(params.pilotId);

      return {
        success: true,
        originalPriceCents,
        finalPriceCents,
        discountApplied: originalPriceCents - finalPriceCents,
      };
    } catch (error) {
      await prisma.pilotProgram.update({
        where: { id: params.pilotId },
        data: { status: 'ACTIVE' },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PAYMENT METHOD MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Attach payment method to pilot for auto-conversion
   */
  async attachPaymentMethod(
    pilotId: string,
    billingInstrumentId: string
  ): Promise<{ success: boolean; error?: string }> {
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: pilotId },
    });

    if (!pilot) {
      return { success: false, error: 'Pilot program not found' };
    }

    await prisma.pilotProgram.update({
      where: { id: pilotId },
      data: {
        hasPaymentMethodOnFile: true,
        billingInstrumentId,
      },
    });

    return { success: true };
  }

  /**
   * Remove payment method from pilot
   */
  async removePaymentMethod(pilotId: string): Promise<{ success: boolean; error?: string }> {
    await prisma.pilotProgram.update({
      where: { id: pilotId },
      data: {
        hasPaymentMethodOnFile: false,
        billingInstrumentId: null,
        autoConvertEnabled: false, // Can't auto-convert without payment method
      },
    });

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PILOT CANCELLATION
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Cancel a pilot program
   */
  async cancelPilot(
    pilotId: string,
    reason?: string,
    cancelledBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    const pilot = await prisma.pilotProgram.findUnique({
      where: { id: pilotId },
    });

    if (!pilot) {
      return { success: false, error: 'Pilot program not found' };
    }

    if (['CONVERTED', 'CANCELLED'].includes(pilot.status)) {
      return { success: false, error: `Pilot is already ${pilot.status.toLowerCase()}` };
    }

    // Update pilot status
    await prisma.pilotProgram.update({
      where: { id: pilotId },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${pilot.notes ?? ''}\n\nCancelled: ${reason}` : pilot.notes,
      },
    });

    // Revoke licenses
    const revokeReason = reason ? `Pilot cancelled: ${reason}` : 'Pilot cancelled';
    await prisma.vaultLicense.updateMany({
      where: { pilotProgramId: pilotId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokeReason,
      },
    });

    // Cancel reminders
    await reminderService.cancelPilotReminders(pilotId);

    return { success: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ANALYTICS
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get pilot program statistics
   */
  async getPilotStats(): Promise<{
    byStatus: { status: string; count: number }[];
    byType: { type: string; count: number }[];
    conversionRate: number;
    totalSeats: number;
    seatsInUse: number;
    endingThisWeek: number;
    endingThisMonth: number;
  }> {
    const now = new Date();
    const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [byStatus, byType, seatStats, endingThisWeek, endingThisMonth, converted, total] =
      await Promise.all([
        prisma.pilotProgram.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.pilotProgram.groupBy({
          by: ['type'],
          _count: true,
        }),
        prisma.pilotProgram.aggregate({
          _sum: { seats: true, seatsUsed: true },
        }),
        prisma.pilotProgram.count({
          where: {
            status: { in: ['ACTIVE', 'EXTENDED'] },
            endDate: { lte: oneWeekFromNow, gt: now },
          },
        }),
        prisma.pilotProgram.count({
          where: {
            status: { in: ['ACTIVE', 'EXTENDED'] },
            endDate: { lte: oneMonthFromNow, gt: now },
          },
        }),
        prisma.pilotProgram.count({
          where: { status: 'CONVERTED' },
        }),
        prisma.pilotProgram.count({
          where: { status: { in: ['CONVERTED', 'EXPIRED', 'CANCELLED'] } },
        }),
      ]);

    return {
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byType: byType.map((t) => ({ type: t.type, count: t._count })),
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      totalSeats: seatStats._sum.seats ?? 0,
      seatsInUse: seatStats._sum.seatsUsed ?? 0,
      endingThisWeek,
      endingThisMonth,
    };
  }

  /**
   * Get pilots ending soon (for proactive outreach)
   */
  async getPilotsEndingSoon(daysThreshold = 14): Promise<{
    pilots: {
      id: string;
      name: string;
      type: string;
      seats: number;
      seatsUsed: number;
      endDate: Date;
      daysRemaining: number;
      primaryContactEmail: string | null;
      hasPaymentMethod: boolean;
    }[];
  }> {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    const pilots = await prisma.pilotProgram.findMany({
      where: {
        status: { in: ['ACTIVE', 'EXTENDED'] },
        endDate: { lte: threshold, gt: now },
      },
      orderBy: { endDate: 'asc' },
    });

    return {
      pilots: pilots.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        seats: p.seats,
        seatsUsed: p.seatsUsed,
        endDate: p.endDate,
        daysRemaining: Math.ceil((p.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        primaryContactEmail: p.primaryContactEmail,
        hasPaymentMethod: p.hasPaymentMethodOnFile,
      })),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export const pilotProgramService = new PilotProgramService();
