/**
 * Screen Time Enforcement Service
 *
 * Active enforcement of screen time limits with:
 * - Per-learner configurable daily limits
 * - Tenant/school-wide policies
 * - Break enforcement (mandatory breaks after X minutes)
 * - Scheduled availability windows
 * - Parent override capabilities
 * - Real-time limit tracking
 * - Warning notifications before limit reached
 *
 * @module focus-svc/services/screen-time-enforcement
 */

import { Pool, PoolClient } from 'pg';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ScreenTimePolicy {
  id: string;
  tenantId: string;
  scope: PolicyScope;
  scopeId: string; // tenant ID, school ID, learner ID, etc.
  name: string;
  dailyLimitMinutes: number;
  sessionLimitMinutes: number;
  breakAfterMinutes: number;
  breakDurationMinutes: number;
  schedule: AvailabilitySchedule;
  enforcementLevel: EnforcementLevel;
  warningThresholds: number[]; // percentages like [75, 90, 95]
  exemptActivities: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export type PolicyScope = 'tenant' | 'school' | 'class' | 'learner';

export type EnforcementLevel = 'soft' | 'medium' | 'strict';

export interface AvailabilitySchedule {
  timezone: string;
  windows: AvailabilityWindow[];
  blackoutDates?: string[]; // ISO dates
}

export interface AvailabilityWindow {
  dayOfWeek: number; // 0 = Sunday
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  enabled: boolean;
}

export interface LearnerScreenTimeStatus {
  learnerId: string;
  tenantId: string;
  date: string; // ISO date
  effectivePolicy: ScreenTimePolicy;
  dailyUsedMinutes: number;
  dailyRemainingMinutes: number;
  dailyLimitMinutes: number;
  currentSessionMinutes: number;
  sessionLimitMinutes: number;
  lastBreakAt: Date | null;
  minutesSinceLastBreak: number;
  breakRequired: boolean;
  isWithinAvailability: boolean;
  currentAvailabilityWindow: AvailabilityWindow | null;
  nextAvailabilityStart: Date | null;
  warnings: ScreenTimeWarning[];
  enforcement: EnforcementAction | null;
}

export interface ScreenTimeWarning {
  id: string;
  type: WarningType;
  threshold: number;
  message: string;
  triggeredAt: Date;
  acknowledged: boolean;
}

export type WarningType =
  | 'DAILY_LIMIT_APPROACHING'
  | 'SESSION_LIMIT_APPROACHING'
  | 'BREAK_NEEDED'
  | 'OUTSIDE_AVAILABILITY'
  | 'LIMIT_EXCEEDED';

export interface EnforcementAction {
  type: EnforcementActionType;
  triggeredAt: Date;
  reason: string;
  expiresAt?: Date;
  overriddenBy?: string;
  overriddenAt?: Date;
}

export type EnforcementActionType =
  | 'WARNING_DISPLAYED'
  | 'SESSION_PAUSED'
  | 'CONTENT_LOCKED'
  | 'BREAK_REQUIRED'
  | 'SESSION_ENDED'
  | 'ACCESS_BLOCKED';

export interface ScreenTimeEvent {
  id: string;
  learnerId: string;
  tenantId: string;
  eventType: ScreenTimeEventType;
  durationMinutes?: number;
  policyId?: string;
  details: Record<string, unknown>;
  timestamp: Date;
}

export type ScreenTimeEventType =
  | 'SESSION_START'
  | 'SESSION_END'
  | 'SESSION_PAUSE'
  | 'SESSION_RESUME'
  | 'BREAK_START'
  | 'BREAK_END'
  | 'WARNING_TRIGGERED'
  | 'LIMIT_REACHED'
  | 'ENFORCEMENT_APPLIED'
  | 'OVERRIDE_APPLIED'
  | 'POLICY_CHANGED';

export interface ParentOverride {
  id: string;
  learnerId: string;
  tenantId: string;
  parentId: string;
  overrideType: OverrideType;
  additionalMinutes?: number;
  bypassUntil?: Date;
  reason: string;
  createdAt: Date;
  expiresAt: Date;
  usedMinutes: number;
}

export type OverrideType = 'ADD_TIME' | 'EXTEND_SESSION' | 'BYPASS_LIMIT' | 'SKIP_BREAK';

// ════════════════════════════════════════════════════════════════════════════════
// DEFAULT POLICIES
// ════════════════════════════════════════════════════════════════════════════════

const DEFAULT_POLICY: Omit<ScreenTimePolicy, 'id' | 'tenantId' | 'scopeId' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
  scope: 'tenant',
  name: 'Default Screen Time Policy',
  dailyLimitMinutes: 120, // 2 hours
  sessionLimitMinutes: 45,
  breakAfterMinutes: 25,
  breakDurationMinutes: 5,
  schedule: {
    timezone: 'America/New_York',
    windows: [
      { dayOfWeek: 1, startTime: '08:00', endTime: '20:00', enabled: true },
      { dayOfWeek: 2, startTime: '08:00', endTime: '20:00', enabled: true },
      { dayOfWeek: 3, startTime: '08:00', endTime: '20:00', enabled: true },
      { dayOfWeek: 4, startTime: '08:00', endTime: '20:00', enabled: true },
      { dayOfWeek: 5, startTime: '08:00', endTime: '20:00', enabled: true },
      { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', enabled: true },
      { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', enabled: true },
    ],
  },
  enforcementLevel: 'medium',
  warningThresholds: [75, 90, 95],
  exemptActivities: ['ASSESSMENT', 'IEP_REQUIRED'],
  isActive: true,
};

// ════════════════════════════════════════════════════════════════════════════════
// SCREEN TIME ENFORCEMENT SERVICE
// ════════════════════════════════════════════════════════════════════════════════

export class ScreenTimeEnforcementService extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly cachePrefix = 'screentime';
  private readonly sessionCheckInterval = 60000; // 1 minute
  private checkIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(pool: Pool, redis: Redis) {
    super();
    this.pool = pool;
    this.redis = redis;
  }

  /**
   * Start the enforcement service
   */
  start(): void {
    // Start periodic session checks
    this.checkIntervalId = setInterval(() => {
      this.checkActiveSessions();
    }, this.sessionCheckInterval);

    console.log('Screen Time Enforcement Service started');
  }

  /**
   * Stop the enforcement service
   */
  stop(): void {
    if (this.checkIntervalId) {
      clearInterval(this.checkIntervalId);
      this.checkIntervalId = null;
    }
    console.log('Screen Time Enforcement Service stopped');
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // POLICY MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Create a new screen time policy
   */
  async createPolicy(
    policy: Omit<ScreenTimePolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ScreenTimePolicy> {
    const result = await this.pool.query<ScreenTimePolicy>(
      `INSERT INTO screen_time_policies (
        id, tenant_id, scope, scope_id, name, daily_limit_minutes,
        session_limit_minutes, break_after_minutes, break_duration_minutes,
        schedule, enforcement_level, warning_thresholds, exempt_activities,
        created_by, is_active, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW()
      ) RETURNING *`,
      [
        policy.tenantId,
        policy.scope,
        policy.scopeId,
        policy.name,
        policy.dailyLimitMinutes,
        policy.sessionLimitMinutes,
        policy.breakAfterMinutes,
        policy.breakDurationMinutes,
        JSON.stringify(policy.schedule),
        policy.enforcementLevel,
        policy.warningThresholds,
        policy.exemptActivities,
        policy.createdBy,
        policy.isActive,
      ]
    );

    // Invalidate cache
    await this.invalidatePolicyCache(policy.tenantId, policy.scopeId);

    this.emit('policy:created', result.rows[0]);
    return result.rows[0];
  }

  /**
   * Get effective policy for a learner (respects hierarchy)
   */
  async getEffectivePolicy(
    tenantId: string,
    learnerId: string
  ): Promise<ScreenTimePolicy> {
    // Check cache first
    const cacheKey = `${this.cachePrefix}:policy:${tenantId}:${learnerId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query policies in order of specificity
    const result = await this.pool.query<ScreenTimePolicy>(
      `SELECT p.* FROM screen_time_policies p
       WHERE p.tenant_id = $1 AND p.is_active = true
       AND (
         (p.scope = 'learner' AND p.scope_id = $2)
         OR (p.scope = 'class' AND p.scope_id IN (
           SELECT class_id FROM learner_class_enrollments WHERE learner_id = $2
         ))
         OR (p.scope = 'school' AND p.scope_id IN (
           SELECT school_id FROM learners WHERE id = $2
         ))
         OR (p.scope = 'tenant' AND p.scope_id = $1)
       )
       ORDER BY
         CASE p.scope
           WHEN 'learner' THEN 1
           WHEN 'class' THEN 2
           WHEN 'school' THEN 3
           WHEN 'tenant' THEN 4
         END
       LIMIT 1`,
      [tenantId, learnerId]
    );

    const policy = result.rows[0] ?? this.getDefaultPolicy(tenantId);

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(policy));

    return policy;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // SCREEN TIME TRACKING
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Get current screen time status for a learner
   */
  async getLearnerStatus(
    tenantId: string,
    learnerId: string
  ): Promise<LearnerScreenTimeStatus> {
    const today = new Date().toISOString().split('T')[0];
    const policy = await this.getEffectivePolicy(tenantId, learnerId);

    // Get today's usage from Redis
    const usageKey = `${this.cachePrefix}:usage:${tenantId}:${learnerId}:${today}`;
    const usage = await this.redis.hgetall(usageKey);

    const dailyUsedMinutes = parseInt(usage.dailyMinutes ?? '0', 10);
    const currentSessionMinutes = parseInt(usage.sessionMinutes ?? '0', 10);
    const lastBreakAt = usage.lastBreakAt ? new Date(usage.lastBreakAt) : null;

    // Calculate remaining time
    const dailyRemainingMinutes = Math.max(0, policy.dailyLimitMinutes - dailyUsedMinutes);
    const sessionRemainingMinutes = Math.max(0, policy.sessionLimitMinutes - currentSessionMinutes);

    // Check break status
    const minutesSinceLastBreak = lastBreakAt
      ? Math.floor((Date.now() - lastBreakAt.getTime()) / 60000)
      : currentSessionMinutes;
    const breakRequired = minutesSinceLastBreak >= policy.breakAfterMinutes;

    // Check availability
    const { isWithin, currentWindow, nextStart } = this.checkAvailability(policy.schedule);

    // Get active warnings
    const warningsKey = `${this.cachePrefix}:warnings:${tenantId}:${learnerId}`;
    const warningsData = await this.redis.lrange(warningsKey, 0, -1);
    const warnings = warningsData.map(w => JSON.parse(w) as ScreenTimeWarning);

    // Get current enforcement if any
    const enforcementKey = `${this.cachePrefix}:enforcement:${tenantId}:${learnerId}`;
    const enforcementData = await this.redis.get(enforcementKey);
    const enforcement = enforcementData ? JSON.parse(enforcementData) as EnforcementAction : null;

    return {
      learnerId,
      tenantId,
      date: today,
      effectivePolicy: policy,
      dailyUsedMinutes,
      dailyRemainingMinutes,
      dailyLimitMinutes: policy.dailyLimitMinutes,
      currentSessionMinutes,
      sessionLimitMinutes: policy.sessionLimitMinutes,
      lastBreakAt,
      minutesSinceLastBreak,
      breakRequired,
      isWithinAvailability: isWithin,
      currentAvailabilityWindow: currentWindow,
      nextAvailabilityStart: nextStart,
      warnings,
      enforcement,
    };
  }

  /**
   * Record screen time activity
   */
  async recordActivity(params: {
    tenantId: string;
    learnerId: string;
    activityType: string;
    durationMinutes: number;
    sessionId?: string;
  }): Promise<{ allowed: boolean; status: LearnerScreenTimeStatus; action?: EnforcementAction }> {
    const status = await this.getLearnerStatus(params.tenantId, params.learnerId);
    const policy = status.effectivePolicy;

    // Check if activity is exempt
    if (policy.exemptActivities.includes(params.activityType)) {
      return { allowed: true, status };
    }

    // Check availability window
    if (!status.isWithinAvailability) {
      const action = await this.applyEnforcement({
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        type: 'ACCESS_BLOCKED',
        reason: 'Outside of allowed time window',
        policy,
      });
      return { allowed: false, status, action };
    }

    // Check daily limit
    if (status.dailyRemainingMinutes <= 0) {
      const action = await this.applyEnforcement({
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        type: 'SESSION_ENDED',
        reason: 'Daily limit reached',
        policy,
      });
      return { allowed: false, status, action };
    }

    // Check if break is required
    if (status.breakRequired) {
      const action = await this.applyEnforcement({
        tenantId: params.tenantId,
        learnerId: params.learnerId,
        type: 'BREAK_REQUIRED',
        reason: `Break required after ${policy.breakAfterMinutes} minutes`,
        policy,
      });

      // For medium/soft enforcement, still allow but warn
      if (policy.enforcementLevel !== 'strict') {
        await this.triggerWarning(params.tenantId, params.learnerId, 'BREAK_NEEDED', 100);
        return { allowed: true, status, action };
      }

      return { allowed: false, status, action };
    }

    // Update usage tracking
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `${this.cachePrefix}:usage:${params.tenantId}:${params.learnerId}:${today}`;

    await this.redis.hincrby(usageKey, 'dailyMinutes', params.durationMinutes);
    await this.redis.hincrby(usageKey, 'sessionMinutes', params.durationMinutes);
    await this.redis.expire(usageKey, 86400); // 24 hour TTL

    // Check warning thresholds
    const usagePercentage = ((status.dailyUsedMinutes + params.durationMinutes) / policy.dailyLimitMinutes) * 100;
    for (const threshold of policy.warningThresholds) {
      if (usagePercentage >= threshold && (status.dailyUsedMinutes / policy.dailyLimitMinutes) * 100 < threshold) {
        await this.triggerWarning(params.tenantId, params.learnerId, 'DAILY_LIMIT_APPROACHING', threshold);
      }
    }

    // Log event
    await this.logEvent({
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      eventType: 'SESSION_RESUME',
      durationMinutes: params.durationMinutes,
      policyId: policy.id,
      details: { activityType: params.activityType, sessionId: params.sessionId },
    });

    // Refresh status
    const updatedStatus = await this.getLearnerStatus(params.tenantId, params.learnerId);
    return { allowed: true, status: updatedStatus };
  }

  /**
   * Start a break
   */
  async startBreak(
    tenantId: string,
    learnerId: string,
    breakType: 'scheduled' | 'user_initiated' | 'enforced'
  ): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `${this.cachePrefix}:usage:${tenantId}:${learnerId}:${today}`;

    // Reset session minutes and record break time
    await this.redis.hmset(usageKey, {
      sessionMinutes: '0',
      lastBreakAt: new Date().toISOString(),
      breakType,
    });

    // Clear any break enforcement
    await this.clearEnforcement(tenantId, learnerId, 'BREAK_REQUIRED');

    // Log event
    await this.logEvent({
      learnerId,
      tenantId,
      eventType: 'BREAK_START',
      details: { breakType },
    });

    this.emit('break:started', { tenantId, learnerId, breakType });
  }

  /**
   * End a break
   */
  async endBreak(tenantId: string, learnerId: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const usageKey = `${this.cachePrefix}:usage:${tenantId}:${learnerId}:${today}`;

    await this.redis.hset(usageKey, 'sessionMinutes', '0');

    await this.logEvent({
      learnerId,
      tenantId,
      eventType: 'BREAK_END',
      details: {},
    });

    this.emit('break:ended', { tenantId, learnerId });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PARENT OVERRIDES
  // ──────────────────────────────────────────────────────────────────────────────

  /**
   * Create a parent override
   */
  async createOverride(params: {
    tenantId: string;
    learnerId: string;
    parentId: string;
    overrideType: OverrideType;
    additionalMinutes?: number;
    bypassUntil?: Date;
    reason: string;
    expiresAt: Date;
  }): Promise<ParentOverride> {
    const override: ParentOverride = {
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      parentId: params.parentId,
      overrideType: params.overrideType,
      additionalMinutes: params.additionalMinutes,
      bypassUntil: params.bypassUntil,
      reason: params.reason,
      createdAt: new Date(),
      expiresAt: params.expiresAt,
      usedMinutes: 0,
    };

    // Store in database
    await this.pool.query(
      `INSERT INTO screen_time_overrides (
        id, tenant_id, learner_id, parent_id, override_type,
        additional_minutes, bypass_until, reason, expires_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        override.id,
        params.tenantId,
        params.learnerId,
        params.parentId,
        params.overrideType,
        params.additionalMinutes ?? null,
        params.bypassUntil ?? null,
        params.reason,
        params.expiresAt,
      ]
    );

    // Cache for quick access
    const overrideKey = `${this.cachePrefix}:override:${params.tenantId}:${params.learnerId}`;
    await this.redis.setex(
      overrideKey,
      Math.floor((params.expiresAt.getTime() - Date.now()) / 1000),
      JSON.stringify(override)
    );

    // Clear any current enforcement
    await this.clearEnforcement(params.tenantId, params.learnerId);

    await this.logEvent({
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      eventType: 'OVERRIDE_APPLIED',
      details: {
        overrideId: override.id,
        overrideType: params.overrideType,
        parentId: params.parentId,
      },
    });

    this.emit('override:created', override);
    return override;
  }

  /**
   * Get active override for a learner
   */
  async getActiveOverride(
    tenantId: string,
    learnerId: string
  ): Promise<ParentOverride | null> {
    const overrideKey = `${this.cachePrefix}:override:${tenantId}:${learnerId}`;
    const cached = await this.redis.get(overrideKey);

    if (cached) {
      const override = JSON.parse(cached) as ParentOverride;
      if (new Date(override.expiresAt) > new Date()) {
        return override;
      }
    }

    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  private getDefaultPolicy(tenantId: string): ScreenTimePolicy {
    return {
      ...DEFAULT_POLICY,
      id: 'default',
      tenantId,
      scopeId: tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'system',
    };
  }

  private checkAvailability(schedule: AvailabilitySchedule): {
    isWithin: boolean;
    currentWindow: AvailabilityWindow | null;
    nextStart: Date | null;
  } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.toTimeString().substring(0, 5);

    // Find current window
    const todayWindow = schedule.windows.find(w => w.dayOfWeek === dayOfWeek && w.enabled);

    if (todayWindow) {
      if (currentTime >= todayWindow.startTime && currentTime <= todayWindow.endTime) {
        return { isWithin: true, currentWindow: todayWindow, nextStart: null };
      }

      // Before today's window starts
      if (currentTime < todayWindow.startTime) {
        const [hours, minutes] = todayWindow.startTime.split(':').map(Number);
        const nextStart = new Date(now);
        nextStart.setHours(hours, minutes, 0, 0);
        return { isWithin: false, currentWindow: null, nextStart };
      }
    }

    // Find next available window
    for (let i = 1; i <= 7; i++) {
      const checkDay = (dayOfWeek + i) % 7;
      const window = schedule.windows.find(w => w.dayOfWeek === checkDay && w.enabled);

      if (window) {
        const [hours, minutes] = window.startTime.split(':').map(Number);
        const nextStart = new Date(now);
        nextStart.setDate(nextStart.getDate() + i);
        nextStart.setHours(hours, minutes, 0, 0);
        return { isWithin: false, currentWindow: null, nextStart };
      }
    }

    return { isWithin: false, currentWindow: null, nextStart: null };
  }

  private async applyEnforcement(params: {
    tenantId: string;
    learnerId: string;
    type: EnforcementActionType;
    reason: string;
    policy: ScreenTimePolicy;
  }): Promise<EnforcementAction> {
    const action: EnforcementAction = {
      type: params.type,
      triggeredAt: new Date(),
      reason: params.reason,
    };

    // Check if there's an active override
    const override = await this.getActiveOverride(params.tenantId, params.learnerId);
    if (override) {
      if (override.overrideType === 'BYPASS_LIMIT' ||
          (override.overrideType === 'SKIP_BREAK' && params.type === 'BREAK_REQUIRED')) {
        return { ...action, type: 'WARNING_DISPLAYED' };
      }
    }

    // For soft enforcement, only warn
    if (params.policy.enforcementLevel === 'soft') {
      action.type = 'WARNING_DISPLAYED';
    }

    // Store enforcement
    const enforcementKey = `${this.cachePrefix}:enforcement:${params.tenantId}:${params.learnerId}`;
    await this.redis.setex(enforcementKey, 3600, JSON.stringify(action)); // 1 hour TTL

    await this.logEvent({
      learnerId: params.learnerId,
      tenantId: params.tenantId,
      eventType: 'ENFORCEMENT_APPLIED',
      policyId: params.policy.id,
      details: { actionType: action.type, reason: action.reason },
    });

    this.emit('enforcement:applied', { ...params, action });

    return action;
  }

  private async clearEnforcement(
    tenantId: string,
    learnerId: string,
    specificType?: EnforcementActionType
  ): Promise<void> {
    const enforcementKey = `${this.cachePrefix}:enforcement:${tenantId}:${learnerId}`;

    if (specificType) {
      const current = await this.redis.get(enforcementKey);
      if (current) {
        const enforcement = JSON.parse(current) as EnforcementAction;
        if (enforcement.type === specificType) {
          await this.redis.del(enforcementKey);
        }
      }
    } else {
      await this.redis.del(enforcementKey);
    }
  }

  private async triggerWarning(
    tenantId: string,
    learnerId: string,
    type: WarningType,
    threshold: number
  ): Promise<void> {
    const warning: ScreenTimeWarning = {
      id: `warning_${Date.now()}`,
      type,
      threshold,
      message: this.getWarningMessage(type, threshold),
      triggeredAt: new Date(),
      acknowledged: false,
    };

    const warningsKey = `${this.cachePrefix}:warnings:${tenantId}:${learnerId}`;
    await this.redis.lpush(warningsKey, JSON.stringify(warning));
    await this.redis.ltrim(warningsKey, 0, 9); // Keep last 10 warnings
    await this.redis.expire(warningsKey, 86400);

    await this.logEvent({
      learnerId,
      tenantId,
      eventType: 'WARNING_TRIGGERED',
      details: { warningType: type, threshold },
    });

    this.emit('warning:triggered', { tenantId, learnerId, warning });
  }

  private getWarningMessage(type: WarningType, threshold: number): string {
    switch (type) {
      case 'DAILY_LIMIT_APPROACHING':
        return `You've used ${threshold}% of your daily screen time`;
      case 'SESSION_LIMIT_APPROACHING':
        return `Your current session is ${threshold}% complete`;
      case 'BREAK_NEEDED':
        return 'Time for a break! Take a few minutes to rest your eyes';
      case 'OUTSIDE_AVAILABILITY':
        return 'AIVO is not available at this time';
      case 'LIMIT_EXCEEDED':
        return 'Daily screen time limit reached';
      default:
        return 'Screen time notice';
    }
  }

  private async checkActiveSessions(): Promise<void> {
    // This would check all active sessions and apply enforcement as needed
    // Implementation depends on session tracking mechanism
  }

  private async logEvent(event: Omit<ScreenTimeEvent, 'id' | 'timestamp'>): Promise<void> {
    const fullEvent: ScreenTimeEvent = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    await this.pool.query(
      `INSERT INTO screen_time_events (
        id, tenant_id, learner_id, event_type, duration_minutes,
        policy_id, details, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        fullEvent.id,
        event.tenantId,
        event.learnerId,
        event.eventType,
        event.durationMinutes ?? null,
        event.policyId ?? null,
        JSON.stringify(event.details),
      ]
    );
  }

  private async invalidatePolicyCache(tenantId: string, scopeId: string): Promise<void> {
    const pattern = `${this.cachePrefix}:policy:${tenantId}:*`;
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

export default ScreenTimeEnforcementService;
