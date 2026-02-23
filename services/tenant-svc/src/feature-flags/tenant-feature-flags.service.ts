/**
 * Tenant Feature Flags Service
 *
 * Manages district-toggleable feature flags per tenant.
 * Flags are stored in Postgres with a Redis cache for fast reads.
 *
 * @module feature-flags/tenant-feature-flags.service
 */

import type { Redis as RedisType } from 'ioredis';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════════════════════════════════════

/**
 * The canonical set of flags that district administrators may toggle.
 * Adding a new flag here automatically exposes it via the API.
 */
export const DISTRICT_TOGGLEABLE_FLAGS = [
  'homework_helper',
  'focus_mode',
  'parent_portal',
  'teacher_dashboard',
  'advanced_analytics',
  'ai_tutor_v2',
  'gamification',
  'offline_mode',
] as const;

export type DistrictToggleableFlag = (typeof DISTRICT_TOGGLEABLE_FLAGS)[number];

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export interface FeatureFlagEntry {
  id: string;
  tenantId: string;
  flag: string;
  enabled: boolean;
  setBy: string | null;
  setAt: Date;
}

export interface SetFlagInput {
  tenantId: string;
  flag: string;
  enabled: boolean;
  setBy?: string;
}

export interface FlagStatus {
  flag: string;
  enabled: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// Service
// ══════════════════════════════════════════════════════════════════════════════

const FLAGS_CACHE_PREFIX = 'tenant:feature-flags:';
const FLAGS_CACHE_TTL = 120;

export class TenantFeatureFlagsService {
  constructor(private readonly redis?: RedisType | null) {}

  // ──────────────────────── Set / Toggle ────────────────────────

  /**
   * Set a feature flag for a tenant (upsert).
   * Only flags in DISTRICT_TOGGLEABLE_FLAGS are accepted.
   */
  async setFlag(input: SetFlagInput): Promise<FeatureFlagEntry> {
    if (
      !DISTRICT_TOGGLEABLE_FLAGS.includes(input.flag as DistrictToggleableFlag)
    ) {
      throw new Error(`Flag "${input.flag}" is not a valid toggleable flag.`);
    }

    // Prisma upsert keyed on (tenantId, flag) unique constraint
    const entry = await prisma.tenantFeatureFlag.upsert({
      where: {
        tenantId_flag: {
          tenantId: input.tenantId,
          flag: input.flag,
        },
      },
      create: {
        tenantId: input.tenantId,
        flag: input.flag,
        enabled: input.enabled,
        setBy: input.setBy ?? null,
        setAt: new Date(),
      },
      update: {
        enabled: input.enabled,
        setBy: input.setBy ?? null,
        setAt: new Date(),
      },
    });

    await this.invalidateCache(input.tenantId);

    // Fire NATS event (best-effort, if available via global)
    this.emitFlagChanged(input.tenantId, input.flag, input.enabled);

    return entry as FeatureFlagEntry;
  }

  // ──────────────────────── Queries ────────────────────────

  /** Get all flags for a tenant, filling in defaults for missing ones. */
  async getFlags(tenantId: string): Promise<FlagStatus[]> {
    const cached = await this.getCachedFlags(tenantId);
    if (cached) return cached;

    const rows = await prisma.tenantFeatureFlag.findMany({
      where: { tenantId },
    });

    const flagMap = new Map(rows.map((r) => [r.flag, r.enabled]));

    const result: FlagStatus[] = DISTRICT_TOGGLEABLE_FLAGS.map((flag) => ({
      flag,
      enabled: flagMap.get(flag) ?? false,
    }));

    await this.setCachedFlags(tenantId, result);
    return result;
  }

  /** Check if a specific flag is enabled for a tenant. */
  async isFlagEnabled(tenantId: string, flag: string): Promise<boolean> {
    const flags = await this.getFlags(tenantId);
    const match = flags.find((f) => f.flag === flag);
    return match?.enabled ?? false;
  }

  // ──────────────────────── Cache ────────────────────────

  private async getCachedFlags(
    tenantId: string,
  ): Promise<FlagStatus[] | null> {
    if (!this.redis) return null;
    try {
      const raw = await this.redis.get(`${FLAGS_CACHE_PREFIX}${tenantId}`);
      if (raw) return JSON.parse(raw) as FlagStatus[];
    } catch {
      // fall through
    }
    return null;
  }

  private async setCachedFlags(
    tenantId: string,
    flags: FlagStatus[],
  ): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.set(
        `${FLAGS_CACHE_PREFIX}${tenantId}`,
        JSON.stringify(flags),
        'EX',
        FLAGS_CACHE_TTL,
      );
    } catch {
      // ignore
    }
  }

  private async invalidateCache(tenantId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.redis.del(`${FLAGS_CACHE_PREFIX}${tenantId}`);
    } catch {
      // ignore
    }
  }

  // ──────────────────────── Events ────────────────────────

  /**
   * Emit a NATS event when a flag changes.
   * Uses the global natsConnection if present; otherwise no-ops.
   */
  private emitFlagChanged(
    tenantId: string,
    flag: string,
    enabled: boolean,
  ): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nats = (globalThis as any).__natsConnection;
      if (nats?.publish) {
        const subject = `tenant.feature-flag.changed`;
        const payload = JSON.stringify({ tenantId, flag, enabled, ts: Date.now() });
        nats.publish(subject, new TextEncoder().encode(payload));
      }
    } catch {
      // NATS is optional — never block on it
    }
  }
}
