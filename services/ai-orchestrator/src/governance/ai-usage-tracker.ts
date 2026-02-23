/**
 * AI Usage Tracker (Governance)
 *
 * Per-student, per-tenant AI rate limiting backed by Redis counters.
 * Writes audit entries to a Redis queue that is flushed in batches
 * to audit-svc every 10 seconds.
 *
 * Redis key layout:
 *   ai:usage:student:{studentId}:daily   – INCR, EXPIREAT midnight UTC
 *   ai:usage:tenant:{tenantId}:daily     – INCR, EXPIREAT midnight UTC
 *   ai:usage:student:{studentId}:hourly  – INCR, EXPIRE 3600
 *   ai:usage:model:{model}:daily         – INCR, EXPIREAT midnight UTC
 *   ratelimit:config:{tenantId}          – HASH with student/tenant limits
 *   audit:queue                          – LIST of JSON audit entries
 *
 * @module governance/ai-usage-tracker
 */

import { createHash } from 'node:crypto';

import type { Redis } from 'ioredis';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface TrackUsageParams {
  tenantId: string;
  userId: string;
  studentId: string;
  model: string;
  context: string;
  inputTokens: number;
  outputTokens: number;
  processingMs: number;
  confidence?: number;
  inputHash: string;
  outputHash: string;
}

export interface RateLimitCheckParams {
  tenantId: string;
  userId: string;
  studentId: string;
  context: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limitType?: 'student_daily' | 'student_hourly' | 'tenant_daily';
}

export interface TenantAiLimits {
  studentDailyLimit: number;
  studentHourlyLimit: number;
  tenantDailyLimit: number;
}

export interface UsageStats {
  totalRequests: number;
  uniqueStudents: number;
  modelBreakdown: Record<string, number>;
  hourlyDistribution: number[];
  topContexts: { context: string; count: number }[];
}

// ══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_STUDENT_DAILY = 100;
const DEFAULT_STUDENT_HOURLY = 20;
const DEFAULT_TENANT_DAILY = 10_000;
const AUDIT_QUEUE_KEY = 'audit:queue';
const FLUSH_INTERVAL_MS = 10_000;
const FLUSH_BATCH_SIZE = 200;

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/** Seconds until next midnight UTC */
function secondsUntilMidnightUtc(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return Math.ceil((tomorrow.getTime() - now.getTime()) / 1000);
}

/** Next midnight UTC Date */
function nextMidnightUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** Next hour boundary */
function nextHourBoundary(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

/** SHA-256 helper */
export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class AiGovernanceUsageTracker {
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly auditSvcUrl: string;

  constructor(
    private readonly redis: Redis,
    auditSvcUrl: string,
  ) {
    this.auditSvcUrl = auditSvcUrl.replace(/\/+$/, '');
    this.startFlushLoop();
  }

  // ──────────────────────── Track Usage ────────────────────────

  async trackUsage(params: TrackUsageParams): Promise<void> {
    const {
      tenantId,
      studentId,
      model,
      context,
      inputTokens,
      outputTokens,
      processingMs,
      confidence,
      inputHash,
      outputHash,
      userId,
    } = params;

    const ttlDaily = secondsUntilMidnightUtc();
    const pipe = this.redis.pipeline();

    // Student daily counter
    const studentDailyKey = `ai:usage:student:${studentId}:daily`;
    pipe.incr(studentDailyKey);
    pipe.expire(studentDailyKey, ttlDaily);

    // Tenant daily counter
    const tenantDailyKey = `ai:usage:tenant:${tenantId}:daily`;
    pipe.incr(tenantDailyKey);
    pipe.expire(tenantDailyKey, ttlDaily);

    // Student hourly counter
    const studentHourlyKey = `ai:usage:student:${studentId}:hourly`;
    pipe.incr(studentHourlyKey);
    pipe.expire(studentHourlyKey, 3600);

    // Model daily counter
    const modelDailyKey = `ai:usage:model:${model}:daily`;
    pipe.incr(modelDailyKey);
    pipe.expire(modelDailyKey, ttlDaily);

    // Context tracking (sorted set: member=context, score=count)
    pipe.zincrby(`ai:usage:tenant:${tenantId}:contexts`, 1, context);
    pipe.expire(`ai:usage:tenant:${tenantId}:contexts`, ttlDaily);

    // Unique students set
    pipe.sadd(`ai:usage:tenant:${tenantId}:students`, studentId);
    pipe.expire(`ai:usage:tenant:${tenantId}:students`, ttlDaily);

    // Hourly distribution (hash hour → count)
    const hour = new Date().getUTCHours();
    pipe.hincrby(`ai:usage:tenant:${tenantId}:hourly`, String(hour), 1);
    pipe.expire(`ai:usage:tenant:${tenantId}:hourly`, ttlDaily);

    await pipe.exec();

    // Queue audit entry
    const auditEntry = {
      type: 'AI_INTERACTION',
      tenantId,
      userId,
      resourceId: studentId,
      category: 'AI_INTERACTION',
      payload: {
        model,
        context,
        inputTokens,
        outputTokens,
        processingMs,
        confidence: confidence ?? null,
        inputHash,
        outputHash,
      },
      timestamp: new Date().toISOString(),
    };

    try {
      await this.redis.lpush(AUDIT_QUEUE_KEY, JSON.stringify(auditEntry));
    } catch {
      // Non-critical — audit queue write failure should never block the AI pipeline
    }
  }

  // ──────────────────────── Rate Limit Check ────────────────────────

  async checkRateLimit(params: RateLimitCheckParams): Promise<RateLimitResult> {
    const { tenantId, studentId } = params;
    const limits = await this.getTenantLimits(tenantId);

    // Student hourly check
    const hourlyCount = parseInt(
      (await this.redis.get(`ai:usage:student:${studentId}:hourly`)) ?? '0',
      10,
    );
    if (hourlyCount >= limits.studentHourlyLimit) {
      await this.emitRateLimitEvent(tenantId, studentId, 'student_hourly');
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextHourBoundary(),
        limitType: 'student_hourly',
      };
    }

    // Student daily check
    const dailyCount = parseInt(
      (await this.redis.get(`ai:usage:student:${studentId}:daily`)) ?? '0',
      10,
    );
    if (dailyCount >= limits.studentDailyLimit) {
      await this.emitRateLimitEvent(tenantId, studentId, 'student_daily');
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextMidnightUtc(),
        limitType: 'student_daily',
      };
    }

    // Tenant daily check
    const tenantCount = parseInt(
      (await this.redis.get(`ai:usage:tenant:${tenantId}:daily`)) ?? '0',
      10,
    );
    if (tenantCount >= limits.tenantDailyLimit) {
      await this.emitRateLimitEvent(tenantId, studentId, 'tenant_daily');
      return {
        allowed: false,
        remaining: 0,
        resetAt: nextMidnightUtc(),
        limitType: 'tenant_daily',
      };
    }

    // Allowed — return remaining for the tightest constraint
    const studentDailyRemaining = limits.studentDailyLimit - dailyCount;
    const studentHourlyRemaining = limits.studentHourlyLimit - hourlyCount;
    const remaining = Math.min(studentDailyRemaining, studentHourlyRemaining);

    return {
      allowed: true,
      remaining,
      resetAt: studentHourlyRemaining <= studentDailyRemaining ? nextHourBoundary() : nextMidnightUtc(),
    };
  }

  // ──────────────────────── Usage Stats ────────────────────────

  async getUsageStats(tenantId: string, _period: 'day' | 'week' | 'month'): Promise<UsageStats> {
    const pipe = this.redis.pipeline();

    pipe.get(`ai:usage:tenant:${tenantId}:daily`);
    pipe.scard(`ai:usage:tenant:${tenantId}:students`);
    pipe.hgetall(`ai:usage:tenant:${tenantId}:hourly`);
    pipe.zrevrangebyscore(
      `ai:usage:tenant:${tenantId}:contexts`,
      '+inf',
      '-inf',
      'WITHSCORES',
      'LIMIT',
      0,
      10,
    );

    const results = await pipe.exec();

    const totalRequests = parseInt((results?.[0]?.[1] as string) ?? '0', 10);
    const uniqueStudents = (results?.[1]?.[1] as number) ?? 0;

    // Hourly distribution (24 slots)
    const hourlyHash = (results?.[2]?.[1] ?? {}) as Record<string, string>;
    const hourlyDistribution = Array.from({ length: 24 }, (_, i) =>
      parseInt(hourlyHash[String(i)] ?? '0', 10),
    );

    // Top contexts
    const ctxRaw = (results?.[3]?.[1] ?? []) as string[];
    const topContexts: { context: string; count: number }[] = [];
    for (let i = 0; i < ctxRaw.length; i += 2) {
      topContexts.push({ context: ctxRaw[i]!, count: parseInt(ctxRaw[i + 1]!, 10) });
    }

    // Model breakdown — scan model keys
    const modelBreakdown: Record<string, number> = {};
    try {
      const modelKeys = await this.redis.keys('ai:usage:model:*:daily');
      if (modelKeys.length > 0) {
        const vals = await this.redis.mget(...modelKeys);
        modelKeys.forEach((key, idx) => {
          const model = key.replace('ai:usage:model:', '').replace(':daily', '');
          modelBreakdown[model] = parseInt(vals[idx] ?? '0', 10);
        });
      }
    } catch {
      // keys scan failure — return empty
    }

    return {
      totalRequests,
      uniqueStudents,
      modelBreakdown,
      hourlyDistribution,
      topContexts,
    };
  }

  // ──────────────────────── Tenant Limits ────────────────────────

  async setTenantLimits(tenantId: string, limits: TenantAiLimits): Promise<void> {
    await this.redis.hmset(`ratelimit:config:${tenantId}`, {
      studentDailyLimit: String(limits.studentDailyLimit),
      studentHourlyLimit: String(limits.studentHourlyLimit),
      tenantDailyLimit: String(limits.tenantDailyLimit),
    });
  }

  private async getTenantLimits(tenantId: string): Promise<TenantAiLimits> {
    const raw = await this.redis.hgetall(`ratelimit:config:${tenantId}`);
    if (raw && Object.keys(raw).length > 0) {
      return {
        studentDailyLimit: parseInt(raw.studentDailyLimit ?? String(DEFAULT_STUDENT_DAILY), 10),
        studentHourlyLimit: parseInt(raw.studentHourlyLimit ?? String(DEFAULT_STUDENT_HOURLY), 10),
        tenantDailyLimit: parseInt(raw.tenantDailyLimit ?? String(DEFAULT_TENANT_DAILY), 10),
      };
    }
    return {
      studentDailyLimit: DEFAULT_STUDENT_DAILY,
      studentHourlyLimit: DEFAULT_STUDENT_HOURLY,
      tenantDailyLimit: DEFAULT_TENANT_DAILY,
    };
  }

  // ──────────────────────── Audit Flush Loop ────────────────────────

  private startFlushLoop(): void {
    this.flushTimer = setInterval(() => {
      void this.flushAuditQueue();
    }, FLUSH_INTERVAL_MS);
    // Prevent timer from keeping the process alive
    if (this.flushTimer.unref) this.flushTimer.unref();
  }

  private async flushAuditQueue(): Promise<void> {
    try {
      const len = await this.redis.llen(AUDIT_QUEUE_KEY);
      if (len === 0) return;

      const batchSize = Math.min(len, FLUSH_BATCH_SIZE);
      const items: string[] = [];
      for (let i = 0; i < batchSize; i++) {
        const item = await this.redis.rpop(AUDIT_QUEUE_KEY);
        if (!item) break;
        items.push(item);
      }
      if (items.length === 0) return;

      const events = items.map((raw) => JSON.parse(raw));

      const resp = await fetch(`${this.auditSvcUrl}/audit/ingest/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events }),
      });

      if (!resp.ok) {
        // Push items back on failure
        const pipe = this.redis.pipeline();
        for (const item of items) {
          pipe.rpush(AUDIT_QUEUE_KEY, item);
        }
        await pipe.exec();
      }
    } catch {
      // Flush failure is non-critical — items remain in Redis
    }
  }

  private async emitRateLimitEvent(
    tenantId: string,
    studentId: string,
    limitType: string,
  ): Promise<void> {
    const event = {
      type: 'AI_RATE_LIMIT_HIT',
      tenantId,
      resourceId: studentId,
      category: 'AI_GOVERNANCE',
      payload: { limitType },
      timestamp: new Date().toISOString(),
    };
    try {
      await this.redis.lpush(AUDIT_QUEUE_KEY, JSON.stringify(event));
    } catch {
      // ignore
    }
  }

  /** Graceful shutdown — flush remaining audit entries */
  async close(): Promise<void> {
    if (this.flushTimer) clearInterval(this.flushTimer);
    await this.flushAuditQueue();
  }
}
