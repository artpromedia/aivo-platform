/**
 * Autonomous Decision Execution Framework
 *
 * Enables agents to autonomously execute decisions with:
 * - Teacher-configurable autonomy levels per learner
 * - Guardrails for high-stakes decisions
 * - Approval workflows for sensitive actions
 * - Action reversibility and audit trails
 * - Risk assessment for autonomous decisions
 *
 * @module ai-orchestrator/agentic/autonomous-executor
 */

import { EventEmitter } from 'events';
import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Autonomy level for learner AI interactions
 */
export type AutonomyLevel =
  | 'NONE'            // AI makes no decisions, only provides information
  | 'SUGGESTION'      // AI suggests, human approves
  | 'SUPERVISED'      // AI acts on low-risk, requests approval for high-risk
  | 'SEMI_AUTONOMOUS' // AI acts on most things, escalates critical decisions
  | 'AUTONOMOUS';     // AI acts independently within guardrails

/**
 * Risk level of a decision
 */
export type DecisionRisk =
  | 'LOW'       // Routine decisions (e.g., selecting next problem)
  | 'MEDIUM'    // Moderate impact (e.g., adjusting difficulty)
  | 'HIGH'      // Significant impact (e.g., modifying learning path)
  | 'CRITICAL'; // Major decisions (e.g., alerting parent/teacher)

/**
 * Category of autonomous action
 */
export type ActionCategory =
  | 'CONTENT_SELECTION'
  | 'DIFFICULTY_ADJUSTMENT'
  | 'SCHEDULE_MODIFICATION'
  | 'INTERVENTION'
  | 'ASSESSMENT'
  | 'COMMUNICATION'
  | 'GOAL_MODIFICATION'
  | 'ACCOMMODATION';

/**
 * Autonomy settings for a learner
 */
export interface LearnerAutonomySettings {
  tenantId: string;
  learnerId: string;
  level: AutonomyLevel;
  categoryOverrides: Partial<Record<ActionCategory, AutonomyLevel>>;
  riskThresholds: {
    autoApproveMaxRisk: DecisionRisk;
    requireTeacherApprovalRisk: DecisionRisk;
  };
  cooldowns: {
    /** Minimum time between autonomous actions of same type (ms) */
    sameActionCooldownMs: number;
    /** Maximum autonomous actions per hour */
    maxActionsPerHour: number;
  };
  restrictions: {
    /** Actions that are never allowed autonomously */
    blockedActions: ActionCategory[];
    /** Time windows when autonomous actions are allowed */
    allowedTimeWindows?: { start: string; end: string }[];
    /** Whether parent/guardian must approve autonomy settings */
    requireParentApproval: boolean;
  };
  configuredBy: string;
  configuredAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
}

/**
 * A decision the AI wants to make
 */
export interface AutonomousDecision {
  id: string;
  tenantId: string;
  learnerId: string;
  agentType: string;
  category: ActionCategory;
  action: {
    type: string;
    parameters: Record<string, unknown>;
    description: string;
  };
  rationale: string;
  expectedOutcome: string;
  risk: {
    level: DecisionRisk;
    factors: string[];
    mitigations: string[];
  };
  reversible: boolean;
  reversalAction?: {
    type: string;
    parameters: Record<string, unknown>;
  };
  context: {
    sessionId: string;
    currentActivity?: string;
    triggerEvent: string;
    learnerState?: Record<string, unknown>;
  };
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Result of decision execution
 */
export interface DecisionExecutionResult {
  decisionId: string;
  status: DecisionStatus;
  executedAt?: Date;
  executedBy: 'SYSTEM' | 'TEACHER' | 'PARENT';
  result?: unknown;
  error?: string;
  approvalInfo?: {
    requiredFrom: 'TEACHER' | 'PARENT';
    requestedAt: Date;
    respondedAt?: Date;
    approvedBy?: string;
    rejectionReason?: string;
  };
}

export type DecisionStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED'
  | 'EXPIRED'
  | 'REVERSED';

/**
 * Action executor interface
 */
export interface ActionExecutor {
  category: ActionCategory;
  execute(decision: AutonomousDecision): Promise<{ success: boolean; result?: unknown; error?: string }>;
  reverse?(decision: AutonomousDecision): Promise<{ success: boolean; error?: string }>;
}

/**
 * Configuration for the autonomous executor
 */
export interface AutonomousExecutorConfig {
  /** Default decision expiration (ms) */
  defaultDecisionExpirationMs: number;

  /** Whether to require explicit parent approval for autonomy */
  requireParentApprovalForAutonomy: boolean;

  /** Maximum pending decisions per learner */
  maxPendingDecisions: number;

  /** Default cooldown between same actions (ms) */
  defaultCooldownMs: number;

  /** Enable execution audit logging */
  enableAuditLogging: boolean;
}

export const DEFAULT_EXECUTOR_CONFIG: AutonomousExecutorConfig = {
  defaultDecisionExpirationMs: 3600000, // 1 hour
  requireParentApprovalForAutonomy: true,
  maxPendingDecisions: 10,
  defaultCooldownMs: 60000, // 1 minute
  enableAuditLogging: true,
};

/**
 * Default autonomy settings for new learners
 */
export const DEFAULT_AUTONOMY_SETTINGS: Omit<LearnerAutonomySettings, 'tenantId' | 'learnerId' | 'configuredBy' | 'configuredAt'> = {
  level: 'SUGGESTION',
  categoryOverrides: {},
  riskThresholds: {
    autoApproveMaxRisk: 'LOW',
    requireTeacherApprovalRisk: 'HIGH',
  },
  cooldowns: {
    sameActionCooldownMs: 60000,
    maxActionsPerHour: 20,
  },
  restrictions: {
    blockedActions: ['COMMUNICATION'], // Parent/teacher contact always requires approval
    requireParentApproval: true,
  },
};

// ════════════════════════════════════════════════════════════════════════════════
// RISK ASSESSMENT
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Risk factors for autonomous decisions
 */
const RISK_FACTORS: Record<ActionCategory, { baseRisk: DecisionRisk; factors: string[] }> = {
  CONTENT_SELECTION: {
    baseRisk: 'LOW',
    factors: ['content_appropriateness', 'difficulty_mismatch'],
  },
  DIFFICULTY_ADJUSTMENT: {
    baseRisk: 'LOW',
    factors: ['frustration_risk', 'confidence_impact'],
  },
  SCHEDULE_MODIFICATION: {
    baseRisk: 'MEDIUM',
    factors: ['learning_time_impact', 'parent_expectations'],
  },
  INTERVENTION: {
    baseRisk: 'MEDIUM',
    factors: ['emotional_impact', 'learning_disruption'],
  },
  ASSESSMENT: {
    baseRisk: 'MEDIUM',
    factors: ['grade_impact', 'stress_induction'],
  },
  COMMUNICATION: {
    baseRisk: 'HIGH',
    factors: ['privacy_concerns', 'message_appropriateness'],
  },
  GOAL_MODIFICATION: {
    baseRisk: 'HIGH',
    factors: ['iep_alignment', 'parent_expectations', 'progress_impact'],
  },
  ACCOMMODATION: {
    baseRisk: 'CRITICAL',
    factors: ['legal_compliance', 'iep_504_alignment', 'effectiveness'],
  },
};

/**
 * Assess risk level for a decision
 */
export function assessDecisionRisk(
  category: ActionCategory,
  context: {
    hasIEP?: boolean;
    has504?: boolean;
    emotionalState?: string;
    recentFailures?: number;
    timeOfDay?: number;
  }
): { level: DecisionRisk; factors: string[]; mitigations: string[] } {
  const baseInfo = RISK_FACTORS[category];
  let level = baseInfo.baseRisk;
  const factors = [...baseInfo.factors];
  const mitigations: string[] = [];

  // Elevate risk for IEP/504 learners
  if (context.hasIEP || context.has504) {
    if (category === 'GOAL_MODIFICATION' || category === 'ACCOMMODATION') {
      level = 'CRITICAL';
      factors.push('iep_504_compliance_required');
    } else if (level === 'LOW') {
      level = 'MEDIUM';
      factors.push('iep_504_learner');
    }
    mitigations.push('verify_iep_504_alignment');
  }

  // Consider emotional state
  if (context.emotionalState === 'frustrated' || context.emotionalState === 'anxious') {
    if (level === 'LOW') level = 'MEDIUM';
    factors.push('elevated_emotional_state');
    mitigations.push('consider_emotional_impact');
  }

  // Consider recent performance
  if (context.recentFailures && context.recentFailures > 3) {
    if (level === 'LOW') level = 'MEDIUM';
    factors.push('recent_struggles');
    mitigations.push('provide_additional_support');
  }

  // Time-based risk adjustment
  if (context.timeOfDay !== undefined) {
    const hour = context.timeOfDay;
    if (hour < 6 || hour > 22) {
      level = 'HIGH';
      factors.push('outside_normal_hours');
      mitigations.push('verify_appropriate_timing');
    }
  }

  return { level, factors, mitigations };
}

// ════════════════════════════════════════════════════════════════════════════════
// AUTONOMOUS EXECUTOR
// ════════════════════════════════════════════════════════════════════════════════

export class AutonomousExecutor extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly config: AutonomousExecutorConfig;
  private readonly executors: Map<ActionCategory, ActionExecutor> = new Map();
  private readonly cachePrefix = 'autonomous_executor';

  constructor(
    pool: Pool,
    redis: Redis,
    config: Partial<AutonomousExecutorConfig> = {}
  ) {
    super();
    this.pool = pool;
    this.redis = redis;
    this.config = { ...DEFAULT_EXECUTOR_CONFIG, ...config };
  }

  /**
   * Register an action executor for a category
   */
  registerExecutor(executor: ActionExecutor): void {
    this.executors.set(executor.category, executor);
    console.log(`Registered action executor: ${executor.category}`);
  }

  /**
   * Get autonomy settings for a learner
   */
  async getAutonomySettings(
    tenantId: string,
    learnerId: string
  ): Promise<LearnerAutonomySettings> {
    // Check cache first
    const cacheKey = `${this.cachePrefix}:settings:${tenantId}:${learnerId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Query database
    const { rows } = await this.pool.query(
      `SELECT * FROM learner_autonomy_settings WHERE tenant_id = $1 AND learner_id = $2`,
      [tenantId, learnerId]
    );

    if (rows.length === 0) {
      // Return default settings
      return {
        ...DEFAULT_AUTONOMY_SETTINGS,
        tenantId,
        learnerId,
        configuredBy: 'SYSTEM',
        configuredAt: new Date(),
      };
    }

    const settings = this.rowToSettings(rows[0]);

    // Cache for 5 minutes
    await this.redis.setex(cacheKey, 300, JSON.stringify(settings));

    return settings;
  }

  /**
   * Update autonomy settings for a learner
   */
  async updateAutonomySettings(
    settings: LearnerAutonomySettings
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO learner_autonomy_settings (
        tenant_id, learner_id, level, category_overrides, risk_thresholds,
        cooldowns, restrictions, configured_by, configured_at, approved_by, approved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (tenant_id, learner_id) DO UPDATE SET
        level = $3, category_overrides = $4, risk_thresholds = $5,
        cooldowns = $6, restrictions = $7, configured_by = $8, configured_at = $9,
        approved_by = $10, approved_at = $11`,
      [
        settings.tenantId,
        settings.learnerId,
        settings.level,
        JSON.stringify(settings.categoryOverrides),
        JSON.stringify(settings.riskThresholds),
        JSON.stringify(settings.cooldowns),
        JSON.stringify(settings.restrictions),
        settings.configuredBy,
        settings.configuredAt,
        settings.approvedBy ?? null,
        settings.approvedAt ?? null,
      ]
    );

    // Invalidate cache
    const cacheKey = `${this.cachePrefix}:settings:${settings.tenantId}:${settings.learnerId}`;
    await this.redis.del(cacheKey);

    this.emit('settings:updated', settings);
  }

  /**
   * Submit a decision for autonomous execution
   */
  async submitDecision(decision: AutonomousDecision): Promise<DecisionExecutionResult> {
    // Get learner autonomy settings
    const settings = await this.getAutonomySettings(decision.tenantId, decision.learnerId);

    // Check if action is blocked
    if (settings.restrictions.blockedActions.includes(decision.category)) {
      return this.createRejectedResult(decision, 'Action category is blocked for autonomous execution');
    }

    // Check time window restrictions
    if (!this.isWithinAllowedTimeWindow(settings)) {
      return this.createRejectedResult(decision, 'Outside allowed time window for autonomous actions');
    }

    // Check cooldown
    const cooldownResult = await this.checkCooldown(decision, settings);
    if (!cooldownResult.allowed) {
      return this.createRejectedResult(decision, `Cooldown active: ${cooldownResult.remainingMs}ms remaining`);
    }

    // Check hourly limit
    const limitResult = await this.checkHourlyLimit(decision, settings);
    if (!limitResult.allowed) {
      return this.createRejectedResult(decision, 'Hourly action limit reached');
    }

    // Determine effective autonomy level for this category
    const effectiveLevel = settings.categoryOverrides[decision.category] ?? settings.level;

    // Decide whether to auto-execute, request approval, or reject
    const executionDecision = this.determineExecutionPath(
      decision,
      settings,
      effectiveLevel
    );

    switch (executionDecision) {
      case 'AUTO_EXECUTE':
        return this.executeDecision(decision);

      case 'REQUEST_TEACHER_APPROVAL':
        return this.requestApproval(decision, 'TEACHER');

      case 'REQUEST_PARENT_APPROVAL':
        return this.requestApproval(decision, 'PARENT');

      case 'REJECT':
        return this.createRejectedResult(
          decision,
          'Decision exceeds autonomy level for this learner'
        );
    }
  }

  /**
   * Process approval for a pending decision
   */
  async processApproval(
    decisionId: string,
    approved: boolean,
    approvedBy: string,
    rejectionReason?: string
  ): Promise<DecisionExecutionResult> {
    // Get pending decision
    const { rows } = await this.pool.query(
      `SELECT * FROM autonomous_decisions WHERE id = $1 AND status = 'PENDING_APPROVAL'`,
      [decisionId]
    );

    if (rows.length === 0) {
      throw new Error('Decision not found or not pending approval');
    }

    const decision = this.rowToDecision(rows[0]);

    if (approved) {
      // Execute the decision
      const result = await this.executeDecision(decision);
      result.approvalInfo = {
        requiredFrom: rows[0].approval_required_from,
        requestedAt: new Date(rows[0].created_at),
        respondedAt: new Date(),
        approvedBy,
      };
      return result;
    } else {
      // Update decision status
      await this.pool.query(
        `UPDATE autonomous_decisions SET status = 'REJECTED', rejection_reason = $2 WHERE id = $1`,
        [decisionId, rejectionReason]
      );

      this.emit('decision:rejected', { decisionId, rejectionReason, approvedBy });

      return {
        decisionId,
        status: 'REJECTED',
        executedBy: 'TEACHER',
        approvalInfo: {
          requiredFrom: rows[0].approval_required_from,
          requestedAt: new Date(rows[0].created_at),
          respondedAt: new Date(),
          approvedBy,
          rejectionReason,
        },
      };
    }
  }

  /**
   * Reverse a previously executed decision
   */
  async reverseDecision(decisionId: string, reversedBy: string): Promise<{ success: boolean; error?: string }> {
    const { rows } = await this.pool.query(
      `SELECT * FROM autonomous_decisions WHERE id = $1 AND status = 'EXECUTED'`,
      [decisionId]
    );

    if (rows.length === 0) {
      return { success: false, error: 'Decision not found or not executed' };
    }

    const decision = this.rowToDecision(rows[0]);

    if (!decision.reversible) {
      return { success: false, error: 'Decision is not reversible' };
    }

    const executor = this.executors.get(decision.category);
    if (!executor?.reverse) {
      return { success: false, error: 'No reversal handler for this action category' };
    }

    const result = await executor.reverse(decision);

    if (result.success) {
      await this.pool.query(
        `UPDATE autonomous_decisions SET status = 'REVERSED', reversed_by = $2, reversed_at = NOW() WHERE id = $1`,
        [decisionId, reversedBy]
      );

      this.emit('decision:reversed', { decisionId, reversedBy });
    }

    return result;
  }

  /**
   * Get pending decisions for a learner
   */
  async getPendingDecisions(
    tenantId: string,
    learnerId: string
  ): Promise<AutonomousDecision[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM autonomous_decisions
       WHERE tenant_id = $1 AND learner_id = $2 AND status = 'PENDING_APPROVAL'
       ORDER BY created_at DESC`,
      [tenantId, learnerId]
    );

    return rows.map(row => this.rowToDecision(row));
  }

  /**
   * Get decision history for a learner
   */
  async getDecisionHistory(
    tenantId: string,
    learnerId: string,
    options: {
      limit?: number;
      statuses?: DecisionStatus[];
      categories?: ActionCategory[];
    } = {}
  ): Promise<AutonomousDecision[]> {
    const conditions = ['tenant_id = $1', 'learner_id = $2'];
    const params: unknown[] = [tenantId, learnerId];
    let paramIndex = 3;

    if (options.statuses && options.statuses.length > 0) {
      conditions.push(`status = ANY($${paramIndex})`);
      params.push(options.statuses);
      paramIndex++;
    }

    if (options.categories && options.categories.length > 0) {
      conditions.push(`category = ANY($${paramIndex})`);
      params.push(options.categories);
      paramIndex++;
    }

    const limit = options.limit ?? 50;
    const sql = `
      SELECT * FROM autonomous_decisions
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    const { rows } = await this.pool.query(sql, params);
    return rows.map(row => this.rowToDecision(row));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ──────────────────────────────────────────────────────────────────────────────

  private determineExecutionPath(
    decision: AutonomousDecision,
    settings: LearnerAutonomySettings,
    effectiveLevel: AutonomyLevel
  ): 'AUTO_EXECUTE' | 'REQUEST_TEACHER_APPROVAL' | 'REQUEST_PARENT_APPROVAL' | 'REJECT' {
    const riskLevels: DecisionRisk[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const riskIndex = riskLevels.indexOf(decision.risk.level);
    const autoApproveMaxIndex = riskLevels.indexOf(settings.riskThresholds.autoApproveMaxRisk);
    const teacherApprovalIndex = riskLevels.indexOf(settings.riskThresholds.requireTeacherApprovalRisk);

    switch (effectiveLevel) {
      case 'NONE':
        return 'REJECT';

      case 'SUGGESTION':
        return 'REQUEST_TEACHER_APPROVAL';

      case 'SUPERVISED':
        if (riskIndex <= autoApproveMaxIndex) {
          return 'AUTO_EXECUTE';
        }
        return 'REQUEST_TEACHER_APPROVAL';

      case 'SEMI_AUTONOMOUS':
        if (riskIndex <= autoApproveMaxIndex) {
          return 'AUTO_EXECUTE';
        }
        if (riskIndex >= teacherApprovalIndex) {
          return settings.restrictions.requireParentApproval
            ? 'REQUEST_PARENT_APPROVAL'
            : 'REQUEST_TEACHER_APPROVAL';
        }
        return 'REQUEST_TEACHER_APPROVAL';

      case 'AUTONOMOUS':
        if (decision.risk.level === 'CRITICAL') {
          return 'REQUEST_TEACHER_APPROVAL';
        }
        return 'AUTO_EXECUTE';

      default:
        return 'REJECT';
    }
  }

  private async executeDecision(decision: AutonomousDecision): Promise<DecisionExecutionResult> {
    const executor = this.executors.get(decision.category);

    if (!executor) {
      return {
        decisionId: decision.id,
        status: 'FAILED',
        executedBy: 'SYSTEM',
        error: `No executor registered for category: ${decision.category}`,
      };
    }

    try {
      // Store decision
      await this.storeDecision(decision, 'EXECUTED');

      // Execute the action
      const result = await executor.execute(decision);

      if (result.success) {
        // Record cooldown
        await this.recordCooldown(decision);

        // Increment hourly counter
        await this.incrementHourlyCounter(decision);

        this.emit('decision:executed', { decision, result });

        // Log audit if enabled
        if (this.config.enableAuditLogging) {
          await this.logAudit(decision, 'EXECUTED', result);
        }

        return {
          decisionId: decision.id,
          status: 'EXECUTED',
          executedAt: new Date(),
          executedBy: 'SYSTEM',
          result: result.result,
        };
      } else {
        await this.pool.query(
          `UPDATE autonomous_decisions SET status = 'FAILED', error = $2 WHERE id = $1`,
          [decision.id, result.error]
        );

        return {
          decisionId: decision.id,
          status: 'FAILED',
          executedBy: 'SYSTEM',
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.pool.query(
        `UPDATE autonomous_decisions SET status = 'FAILED', error = $2 WHERE id = $1`,
        [decision.id, errorMessage]
      );

      return {
        decisionId: decision.id,
        status: 'FAILED',
        executedBy: 'SYSTEM',
        error: errorMessage,
      };
    }
  }

  private async requestApproval(
    decision: AutonomousDecision,
    requiredFrom: 'TEACHER' | 'PARENT'
  ): Promise<DecisionExecutionResult> {
    await this.storeDecision(decision, 'PENDING_APPROVAL', requiredFrom);

    this.emit('decision:approval_requested', { decision, requiredFrom });

    return {
      decisionId: decision.id,
      status: 'PENDING_APPROVAL',
      executedBy: 'SYSTEM',
      approvalInfo: {
        requiredFrom,
        requestedAt: new Date(),
      },
    };
  }

  private async storeDecision(
    decision: AutonomousDecision,
    status: DecisionStatus,
    approvalRequiredFrom?: 'TEACHER' | 'PARENT'
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO autonomous_decisions (
        id, tenant_id, learner_id, agent_type, category, action, rationale,
        expected_outcome, risk_level, risk_factors, risk_mitigations,
        reversible, reversal_action, context, status, approval_required_from,
        created_at, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
      [
        decision.id,
        decision.tenantId,
        decision.learnerId,
        decision.agentType,
        decision.category,
        JSON.stringify(decision.action),
        decision.rationale,
        decision.expectedOutcome,
        decision.risk.level,
        JSON.stringify(decision.risk.factors),
        JSON.stringify(decision.risk.mitigations),
        decision.reversible,
        decision.reversalAction ? JSON.stringify(decision.reversalAction) : null,
        JSON.stringify(decision.context),
        status,
        approvalRequiredFrom ?? null,
        decision.createdAt,
        decision.expiresAt,
      ]
    );
  }

  private createRejectedResult(
    decision: AutonomousDecision,
    reason: string
  ): DecisionExecutionResult {
    this.emit('decision:rejected', { decision, reason });

    return {
      decisionId: decision.id,
      status: 'REJECTED',
      executedBy: 'SYSTEM',
      error: reason,
    };
  }

  private isWithinAllowedTimeWindow(settings: LearnerAutonomySettings): boolean {
    if (!settings.restrictions.allowedTimeWindows?.length) {
      return true; // No restrictions
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return settings.restrictions.allowedTimeWindows.some(window =>
      currentTime >= window.start && currentTime <= window.end
    );
  }

  private async checkCooldown(
    decision: AutonomousDecision,
    settings: LearnerAutonomySettings
  ): Promise<{ allowed: boolean; remainingMs?: number }> {
    const key = `${this.cachePrefix}:cooldown:${decision.tenantId}:${decision.learnerId}:${decision.category}`;
    const lastAction = await this.redis.get(key);

    if (!lastAction) {
      return { allowed: true };
    }

    const lastActionTime = Number.parseInt(lastAction);
    const elapsed = Date.now() - lastActionTime;
    const cooldown = settings.cooldowns.sameActionCooldownMs;

    if (elapsed < cooldown) {
      return { allowed: false, remainingMs: cooldown - elapsed };
    }

    return { allowed: true };
  }

  private async recordCooldown(decision: AutonomousDecision): Promise<void> {
    const key = `${this.cachePrefix}:cooldown:${decision.tenantId}:${decision.learnerId}:${decision.category}`;
    await this.redis.setex(key, 3600, Date.now().toString());
  }

  private async checkHourlyLimit(
    decision: AutonomousDecision,
    settings: LearnerAutonomySettings
  ): Promise<{ allowed: boolean }> {
    const key = `${this.cachePrefix}:hourly:${decision.tenantId}:${decision.learnerId}`;
    const count = await this.redis.get(key);

    if (!count) {
      return { allowed: true };
    }

    if (Number.parseInt(count) >= settings.cooldowns.maxActionsPerHour) {
      return { allowed: false };
    }

    return { allowed: true };
  }

  private async incrementHourlyCounter(decision: AutonomousDecision): Promise<void> {
    const key = `${this.cachePrefix}:hourly:${decision.tenantId}:${decision.learnerId}`;
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, 3600);
    await pipeline.exec();
  }

  private async logAudit(
    decision: AutonomousDecision,
    action: string,
    result: unknown
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO autonomous_decision_audit (
        id, decision_id, tenant_id, learner_id, action, result, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        randomUUID(),
        decision.id,
        decision.tenantId,
        decision.learnerId,
        action,
        JSON.stringify(result),
      ]
    );
  }

  private rowToSettings(row: Record<string, unknown>): LearnerAutonomySettings {
    return {
      tenantId: row.tenant_id as string,
      learnerId: row.learner_id as string,
      level: row.level as AutonomyLevel,
      categoryOverrides: typeof row.category_overrides === 'string'
        ? JSON.parse(row.category_overrides)
        : row.category_overrides ?? {},
      riskThresholds: typeof row.risk_thresholds === 'string'
        ? JSON.parse(row.risk_thresholds)
        : row.risk_thresholds,
      cooldowns: typeof row.cooldowns === 'string'
        ? JSON.parse(row.cooldowns)
        : row.cooldowns,
      restrictions: typeof row.restrictions === 'string'
        ? JSON.parse(row.restrictions)
        : row.restrictions,
      configuredBy: row.configured_by as string,
      configuredAt: new Date(row.configured_at as string),
      approvedBy: row.approved_by as string | undefined,
      approvedAt: row.approved_at ? new Date(row.approved_at as string) : undefined,
    };
  }

  private rowToDecision(row: Record<string, unknown>): AutonomousDecision {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      learnerId: row.learner_id as string,
      agentType: row.agent_type as string,
      category: row.category as ActionCategory,
      action: typeof row.action === 'string' ? JSON.parse(row.action) : row.action,
      rationale: row.rationale as string,
      expectedOutcome: row.expected_outcome as string,
      risk: {
        level: row.risk_level as DecisionRisk,
        factors: typeof row.risk_factors === 'string'
          ? JSON.parse(row.risk_factors)
          : row.risk_factors ?? [],
        mitigations: typeof row.risk_mitigations === 'string'
          ? JSON.parse(row.risk_mitigations)
          : row.risk_mitigations ?? [],
      },
      reversible: row.reversible as boolean,
      reversalAction: row.reversal_action
        ? (typeof row.reversal_action === 'string'
          ? JSON.parse(row.reversal_action)
          : row.reversal_action)
        : undefined,
      context: typeof row.context === 'string' ? JSON.parse(row.context) : row.context,
      createdAt: new Date(row.created_at as string),
      expiresAt: new Date(row.expires_at as string),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Create a new autonomous decision
 */
export function createDecision(input: {
  tenantId: string;
  learnerId: string;
  agentType: string;
  category: ActionCategory;
  action: {
    type: string;
    parameters: Record<string, unknown>;
    description: string;
  };
  rationale: string;
  expectedOutcome: string;
  context: {
    sessionId: string;
    currentActivity?: string;
    triggerEvent: string;
    learnerState?: Record<string, unknown>;
  };
  reversible?: boolean;
  reversalAction?: {
    type: string;
    parameters: Record<string, unknown>;
  };
  expirationMs?: number;
  riskContext?: {
    hasIEP?: boolean;
    has504?: boolean;
    emotionalState?: string;
    recentFailures?: number;
    timeOfDay?: number;
  };
}): AutonomousDecision {
  const risk = assessDecisionRisk(input.category, input.riskContext ?? {});
  const now = new Date();

  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    learnerId: input.learnerId,
    agentType: input.agentType,
    category: input.category,
    action: input.action,
    rationale: input.rationale,
    expectedOutcome: input.expectedOutcome,
    risk,
    reversible: input.reversible ?? true,
    reversalAction: input.reversalAction,
    context: input.context,
    createdAt: now,
    expiresAt: new Date(now.getTime() + (input.expirationMs ?? 3600000)),
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════════

export default AutonomousExecutor;
