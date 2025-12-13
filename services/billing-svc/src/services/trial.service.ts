/**
 * Trial Service
 *
 * Manages 30-day free trial eligibility and tracking for add-on SKUs.
 * Ensures each tenant/learner/SKU combination can only use one free trial.
 */

import type { ParentSku } from '@aivo/billing-common';
import { isTrialEligible } from '@aivo/billing-common';

import { prisma } from '../prisma.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface TrialEligibilityResult {
  sku: ParentSku;
  learnerId: string;
  eligible: boolean;
  reason?: string;
  previousTrialEndedAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIAL SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class TrialService {
  /**
   * Check if a tenant/learner is eligible for a free trial of a specific SKU
   */
  async checkEligibility(
    tenantId: string,
    learnerId: string,
    sku: ParentSku
  ): Promise<TrialEligibilityResult> {
    // Check if SKU supports trials
    if (!isTrialEligible(sku)) {
      return {
        sku,
        learnerId,
        eligible: false,
        reason: 'This product does not offer a free trial',
      };
    }

    // Check for existing trial record
    const existingTrial = await prisma.$queryRaw<
      Array<{
        id: string;
        started_at: Date;
        ends_at: Date;
        converted_at: Date | null;
        canceled_at: Date | null;
      }>
    >`
      SELECT id, started_at, ends_at, converted_at, canceled_at
      FROM trial_records
      WHERE tenant_id = ${tenantId}::uuid
        AND learner_id = ${learnerId}::uuid
        AND sku = ${sku}
      LIMIT 1
    `;

    if (existingTrial.length > 0) {
      const trial = existingTrial[0];
      const now = new Date();

      // Trial is currently active
      if (!trial.converted_at && !trial.canceled_at && trial.ends_at > now) {
        return {
          sku,
          learnerId,
          eligible: false,
          reason: 'Trial is currently active',
          previousTrialEndedAt: trial.ends_at.toISOString(),
        };
      }

      // Trial was already used (converted or expired)
      return {
        sku,
        learnerId,
        eligible: false,
        reason: 'Free trial has already been used for this product',
        previousTrialEndedAt: (trial.converted_at ?? trial.canceled_at ?? trial.ends_at).toISOString(),
      };
    }

    // No previous trial - eligible
    return {
      sku,
      learnerId,
      eligible: true,
    };
  }

  /**
   * Check trial eligibility for multiple learners and SKUs
   */
  async checkBulkEligibility(
    tenantId: string,
    learnerIds: string[],
    skus: ParentSku[]
  ): Promise<TrialEligibilityResult[]> {
    const results: TrialEligibilityResult[] = [];

    for (const learnerId of learnerIds) {
      for (const sku of skus) {
        const eligibility = await this.checkEligibility(tenantId, learnerId, sku);
        results.push(eligibility);
      }
    }

    return results;
  }

  /**
   * Record the start of a trial
   */
  async recordTrialStart(
    tenantId: string,
    learnerId: string,
    sku: ParentSku,
    subscriptionId?: string
  ): Promise<{ trialId: string; endsAt: Date }> {
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 30); // 30-day trial

    // Use raw query because trial_records is in migration but not yet in Prisma schema
    const result = await prisma.$queryRaw<Array<{ id: string; ends_at: Date }>>`
      INSERT INTO trial_records (tenant_id, learner_id, sku, ends_at, subscription_item_id)
      VALUES (${tenantId}::uuid, ${learnerId}::uuid, ${sku}, ${endsAt}, ${subscriptionId}::uuid)
      ON CONFLICT (tenant_id, learner_id, sku) DO NOTHING
      RETURNING id, ends_at
    `;

    if (result.length === 0) {
      // Trial already exists, fetch it
      const existing = await prisma.$queryRaw<Array<{ id: string; ends_at: Date }>>`
        SELECT id, ends_at FROM trial_records
        WHERE tenant_id = ${tenantId}::uuid
          AND learner_id = ${learnerId}::uuid
          AND sku = ${sku}
      `;
      return { trialId: existing[0].id, endsAt: existing[0].ends_at };
    }

    return { trialId: result[0].id, endsAt: result[0].ends_at };
  }

  /**
   * Mark a trial as converted (user continued after trial ended)
   */
  async markTrialConverted(tenantId: string, learnerId: string, sku: ParentSku): Promise<void> {
    await prisma.$executeRaw`
      UPDATE trial_records
      SET converted_at = now(), updated_at = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND learner_id = ${learnerId}::uuid
        AND sku = ${sku}
        AND converted_at IS NULL
    `;
  }

  /**
   * Mark a trial as canceled
   */
  async markTrialCanceled(tenantId: string, learnerId: string, sku: ParentSku): Promise<void> {
    await prisma.$executeRaw`
      UPDATE trial_records
      SET canceled_at = now(), updated_at = now()
      WHERE tenant_id = ${tenantId}::uuid
        AND learner_id = ${learnerId}::uuid
        AND sku = ${sku}
        AND canceled_at IS NULL
        AND converted_at IS NULL
    `;
  }

  /**
   * Get all active trials for a tenant
   */
  async getActiveTrials(tenantId: string): Promise<
    Array<{
      id: string;
      learnerId: string;
      sku: string;
      startedAt: Date;
      endsAt: Date;
      daysRemaining: number;
    }>
  > {
    const trials = await prisma.$queryRaw<
      Array<{
        id: string;
        learner_id: string;
        sku: string;
        started_at: Date;
        ends_at: Date;
      }>
    >`
      SELECT id, learner_id, sku, started_at, ends_at
      FROM trial_records
      WHERE tenant_id = ${tenantId}::uuid
        AND converted_at IS NULL
        AND canceled_at IS NULL
        AND ends_at > now()
      ORDER BY ends_at ASC
    `;

    const now = new Date();
    return trials.map((trial) => ({
      id: trial.id,
      learnerId: trial.learner_id,
      sku: trial.sku,
      startedAt: trial.started_at,
      endsAt: trial.ends_at,
      daysRemaining: Math.ceil((trial.ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }

  /**
   * Get trials ending soon (for notification purposes)
   */
  async getTrialsEndingSoon(
    daysThreshold = 7
  ): Promise<
    Array<{
      id: string;
      tenantId: string;
      learnerId: string;
      sku: string;
      endsAt: Date;
      daysRemaining: number;
    }>
  > {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

    const trials = await prisma.$queryRaw<
      Array<{
        id: string;
        tenant_id: string;
        learner_id: string;
        sku: string;
        ends_at: Date;
      }>
    >`
      SELECT id, tenant_id, learner_id, sku, ends_at
      FROM trial_records
      WHERE converted_at IS NULL
        AND canceled_at IS NULL
        AND ends_at > now()
        AND ends_at <= ${thresholdDate}
      ORDER BY ends_at ASC
    `;

    const now = new Date();
    return trials.map((trial) => ({
      id: trial.id,
      tenantId: trial.tenant_id,
      learnerId: trial.learner_id,
      sku: trial.sku,
      endsAt: trial.ends_at,
      daysRemaining: Math.ceil((trial.ends_at.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
    }));
  }

  /**
   * Get trial conversion stats for analytics
   */
  async getTrialStats(
    tenantId?: string,
    _startDate?: Date,
    _endDate?: Date
  ): Promise<{
    totalTrials: number;
    converted: number;
    canceled: number;
    active: number;
    expired: number;
    conversionRate: number;
  }> {
    const stats = await prisma.$queryRaw<
      Array<{
        total: bigint;
        converted: bigint;
        canceled: bigint;
        active: bigint;
        expired: bigint;
      }>
    >`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE converted_at IS NOT NULL) as converted,
        COUNT(*) FILTER (WHERE canceled_at IS NOT NULL) as canceled,
        COUNT(*) FILTER (WHERE converted_at IS NULL AND canceled_at IS NULL AND ends_at > now()) as active,
        COUNT(*) FILTER (WHERE converted_at IS NULL AND canceled_at IS NULL AND ends_at <= now()) as expired
      FROM trial_records
      WHERE 1=1 ${tenantId ? prisma.$queryRaw`AND tenant_id = ${tenantId}::uuid` : prisma.$queryRaw``}
    `;

    const s = stats[0];
    const total = Number(s.total);
    const converted = Number(s.converted);

    return {
      totalTrials: total,
      converted,
      canceled: Number(s.canceled),
      active: Number(s.active),
      expired: Number(s.expired),
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
    };
  }
}

// Export singleton
export const trialService = new TrialService();
