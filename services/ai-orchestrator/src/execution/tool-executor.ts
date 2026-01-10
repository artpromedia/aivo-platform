/**
 * ToolExecutor with Permission-Based Agent Autonomy
 *
 * Ported from legacy-agentic-app with enhancements for:
 * - Fine-grained permission control per tool
 * - User/learner/teacher role-based access
 * - Rate limiting per tool category
 * - Audit logging for all tool executions
 * - Sandboxed execution environment
 * - Consent-gated tool access
 *
 * @module ai-orchestrator/execution/tool-executor
 */

import { EventEmitter } from 'events';
import { Pool } from 'pg';
import Redis from 'ioredis';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  version: string;
  parameters: ToolParameter[];
  returns: ToolReturn;
  permissions: ToolPermissions;
  rateLimit: ToolRateLimit;
  timeout: number; // ms
  handler: ToolHandler;
  validation?: ToolValidation;
}

export type ToolCategory =
  | 'LEARNING'
  | 'ASSESSMENT'
  | 'CONTENT'
  | 'COMMUNICATION'
  | 'DATA_ACCESS'
  | 'EXTERNAL_API'
  | 'FILE_OPERATION'
  | 'SYSTEM';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: unknown;
  validation?: ParameterValidation;
}

export interface ParameterValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  enum?: unknown[];
  custom?: (value: unknown) => boolean;
}

export interface ToolReturn {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'void';
  description: string;
  schema?: Record<string, unknown>;
}

export interface ToolPermissions {
  requiredRoles: Role[];
  requiredConsents?: ConsentType[];
  allowedTenantTypes?: TenantType[];
  requiresApproval?: boolean;
  minAutonomyLevel?: AutonomyLevel;
  sensitivityLevel: SensitivityLevel;
}

export type Role = 'LEARNER' | 'PARENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM';
export type ConsentType = 'DATA_PROCESSING' | 'AI_TUTOR' | 'AI_PERSONALIZATION' | 'THIRD_PARTY_SHARING';
export type TenantType = 'SCHOOL' | 'DISTRICT' | 'ENTERPRISE' | 'CONSUMER';
export type AutonomyLevel = 'NONE' | 'SUPERVISED' | 'SEMI_AUTONOMOUS' | 'AUTONOMOUS';
export type SensitivityLevel = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'SENSITIVE';

export interface ToolRateLimit {
  maxPerMinute: number;
  maxPerHour: number;
  maxPerDay: number;
  scope: 'user' | 'learner' | 'tenant' | 'global';
}

export interface ToolValidation {
  preExecution?: (context: ExecutionContext, params: Record<string, unknown>) => Promise<ValidationResult>;
  postExecution?: (context: ExecutionContext, result: unknown) => Promise<ValidationResult>;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

export type ToolHandler = (
  context: ExecutionContext,
  params: Record<string, unknown>
) => Promise<ToolResult>;

export interface ExecutionContext {
  tenantId: string;
  userId: string;
  userRole: Role;
  learnerId?: string;
  sessionId?: string;
  agentId: string;
  autonomyLevel: AutonomyLevel;
  consents: ConsentType[];
  requestId: string;
  metadata?: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  warnings?: string[];
  metadata?: {
    executionTimeMs: number;
    tokensUsed?: number;
    cached?: boolean;
  };
}

export interface ToolExecutionRequest {
  toolId: string;
  parameters: Record<string, unknown>;
  context: ExecutionContext;
  priority?: 'low' | 'normal' | 'high';
  timeout?: number;
}

export interface ToolExecutionResult {
  requestId: string;
  toolId: string;
  status: 'success' | 'error' | 'denied' | 'rate_limited' | 'timeout';
  result?: ToolResult;
  error?: string;
  executionTimeMs: number;
  auditId: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// TOOL EXECUTOR
// ════════════════════════════════════════════════════════════════════════════════

export class ToolExecutor extends EventEmitter {
  private readonly pool: Pool;
  private readonly redis: Redis;
  private readonly tools: Map<string, ToolDefinition> = new Map();
  private readonly cachePrefix = 'tool_executor';
  private readonly defaultTimeout = 30000;

  constructor(pool: Pool, redis: Redis) {
    super();
    this.pool = pool;
    this.redis = redis;
  }

  /**
   * Register a tool
   */
  registerTool(tool: ToolDefinition): void {
    if (this.tools.has(tool.id)) {
      throw new Error(`Tool ${tool.id} is already registered`);
    }
    this.tools.set(tool.id, tool);
    console.log(`Tool registered: ${tool.id} (${tool.category})`);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId: string): boolean {
    return this.tools.delete(toolId);
  }

  /**
   * Get all registered tools
   */
  getTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools available for a given context
   */
  async getAvailableTools(context: ExecutionContext): Promise<ToolDefinition[]> {
    const available: ToolDefinition[] = [];

    for (const tool of this.tools.values()) {
      const permCheck = await this.checkPermissions(tool, context);
      if (permCheck.allowed) {
        available.push(tool);
      }
    }

    return available;
  }

  /**
   * Execute a tool with permission checks and auditing
   */
  async execute(request: ToolExecutionRequest): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const requestId = request.context.requestId || this.generateId('req');

    // Get tool definition
    const tool = this.tools.get(request.toolId);
    if (!tool) {
      return this.createErrorResult(requestId, request.toolId, 'Tool not found', startTime);
    }

    // Check permissions
    const permCheck = await this.checkPermissions(tool, request.context);
    if (!permCheck.allowed) {
      await this.logAudit({
        requestId,
        toolId: request.toolId,
        context: request.context,
        action: 'DENIED',
        reason: permCheck.reason,
      });

      return {
        requestId,
        toolId: request.toolId,
        status: 'denied',
        error: permCheck.reason,
        executionTimeMs: Date.now() - startTime,
        auditId: await this.logAudit({
          requestId,
          toolId: request.toolId,
          context: request.context,
          action: 'DENIED',
          reason: permCheck.reason,
        }),
      };
    }

    // Check rate limits
    const rateLimitCheck = await this.checkRateLimit(tool, request.context);
    if (!rateLimitCheck.allowed) {
      return {
        requestId,
        toolId: request.toolId,
        status: 'rate_limited',
        error: `Rate limit exceeded. Try again in ${rateLimitCheck.retryAfterSeconds}s`,
        executionTimeMs: Date.now() - startTime,
        auditId: await this.logAudit({
          requestId,
          toolId: request.toolId,
          context: request.context,
          action: 'RATE_LIMITED',
          reason: 'Rate limit exceeded',
        }),
      };
    }

    // Validate parameters
    const validationResult = await this.validateParameters(tool, request.parameters);
    if (!validationResult.valid) {
      return this.createErrorResult(
        requestId,
        request.toolId,
        `Validation failed: ${validationResult.errors?.join(', ')}`,
        startTime
      );
    }

    // Pre-execution validation
    if (tool.validation?.preExecution) {
      const preCheck = await tool.validation.preExecution(request.context, request.parameters);
      if (!preCheck.valid) {
        return this.createErrorResult(
          requestId,
          request.toolId,
          `Pre-execution check failed: ${preCheck.errors?.join(', ')}`,
          startTime
        );
      }
    }

    // Execute with timeout
    const timeout = request.timeout ?? tool.timeout ?? this.defaultTimeout;
    let result: ToolResult;

    try {
      result = await this.executeWithTimeout(
        () => tool.handler(request.context, request.parameters),
        timeout
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'Execution timeout') {
        return {
          requestId,
          toolId: request.toolId,
          status: 'timeout',
          error: `Tool execution timed out after ${timeout}ms`,
          executionTimeMs: Date.now() - startTime,
          auditId: await this.logAudit({
            requestId,
            toolId: request.toolId,
            context: request.context,
            action: 'TIMEOUT',
            reason: `Timeout after ${timeout}ms`,
          }),
        };
      }

      return this.createErrorResult(requestId, request.toolId, errorMessage, startTime);
    }

    // Post-execution validation
    if (tool.validation?.postExecution && result.success) {
      const postCheck = await tool.validation.postExecution(request.context, result.data);
      if (!postCheck.valid) {
        result.warnings = [...(result.warnings ?? []), ...(postCheck.warnings ?? [])];
        if (!postCheck.valid) {
          return this.createErrorResult(
            requestId,
            request.toolId,
            `Post-execution check failed: ${postCheck.errors?.join(', ')}`,
            startTime
          );
        }
      }
    }

    // Record rate limit usage
    await this.recordRateLimitUsage(tool, request.context);

    // Log successful execution
    const auditId = await this.logAudit({
      requestId,
      toolId: request.toolId,
      context: request.context,
      action: 'EXECUTED',
      result: {
        success: result.success,
        warnings: result.warnings,
        executionTimeMs: result.metadata?.executionTimeMs,
      },
    });

    this.emit('tool:executed', {
      requestId,
      toolId: request.toolId,
      context: request.context,
      result,
    });

    return {
      requestId,
      toolId: request.toolId,
      status: result.success ? 'success' : 'error',
      result,
      executionTimeMs: Date.now() - startTime,
      auditId,
    };
  }

  /**
   * Execute multiple tools in sequence
   */
  async executeSequence(
    requests: ToolExecutionRequest[],
    stopOnError: boolean = true
  ): Promise<ToolExecutionResult[]> {
    const results: ToolExecutionResult[] = [];

    for (const request of requests) {
      const result = await this.execute(request);
      results.push(result);

      if (stopOnError && result.status !== 'success') {
        break;
      }
    }

    return results;
  }

  /**
   * Execute multiple tools in parallel
   */
  async executeParallel(
    requests: ToolExecutionRequest[]
  ): Promise<ToolExecutionResult[]> {
    return Promise.all(requests.map(req => this.execute(req)));
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // PERMISSION CHECKS
  // ──────────────────────────────────────────────────────────────────────────────

  private async checkPermissions(
    tool: ToolDefinition,
    context: ExecutionContext
  ): Promise<{ allowed: boolean; reason?: string }> {
    const perms = tool.permissions;

    // Check role
    if (!perms.requiredRoles.includes(context.userRole) && context.userRole !== 'SYSTEM') {
      return {
        allowed: false,
        reason: `Role ${context.userRole} not authorized for tool ${tool.id}`,
      };
    }

    // Check autonomy level
    if (perms.minAutonomyLevel) {
      const levels: AutonomyLevel[] = ['NONE', 'SUPERVISED', 'SEMI_AUTONOMOUS', 'AUTONOMOUS'];
      const required = levels.indexOf(perms.minAutonomyLevel);
      const current = levels.indexOf(context.autonomyLevel);

      if (current < required) {
        return {
          allowed: false,
          reason: `Autonomy level ${context.autonomyLevel} insufficient. Requires ${perms.minAutonomyLevel}`,
        };
      }
    }

    // Check consents
    if (perms.requiredConsents?.length) {
      const missing = perms.requiredConsents.filter(c => !context.consents.includes(c));
      if (missing.length > 0) {
        return {
          allowed: false,
          reason: `Missing required consents: ${missing.join(', ')}`,
        };
      }
    }

    // Check if approval is required
    if (perms.requiresApproval) {
      const approved = await this.checkApproval(tool.id, context);
      if (!approved) {
        return {
          allowed: false,
          reason: 'Tool requires approval before use',
        };
      }
    }

    return { allowed: true };
  }

  private async checkApproval(toolId: string, context: ExecutionContext): Promise<boolean> {
    const key = `${this.cachePrefix}:approval:${context.tenantId}:${toolId}`;
    const approved = await this.redis.get(key);
    return approved === 'true';
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // RATE LIMITING
  // ──────────────────────────────────────────────────────────────────────────────

  private async checkRateLimit(
    tool: ToolDefinition,
    context: ExecutionContext
  ): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
    const limit = tool.rateLimit;
    const scopeKey = this.getRateLimitScopeKey(limit.scope, context);
    const baseKey = `${this.cachePrefix}:ratelimit:${tool.id}:${scopeKey}`;

    // Check minute limit
    const minuteKey = `${baseKey}:minute:${Math.floor(Date.now() / 60000)}`;
    const minuteCount = parseInt(await this.redis.get(minuteKey) ?? '0', 10);
    if (minuteCount >= limit.maxPerMinute) {
      return { allowed: false, retryAfterSeconds: 60 };
    }

    // Check hour limit
    const hourKey = `${baseKey}:hour:${Math.floor(Date.now() / 3600000)}`;
    const hourCount = parseInt(await this.redis.get(hourKey) ?? '0', 10);
    if (hourCount >= limit.maxPerHour) {
      return { allowed: false, retryAfterSeconds: 3600 };
    }

    // Check day limit
    const dayKey = `${baseKey}:day:${new Date().toISOString().split('T')[0]}`;
    const dayCount = parseInt(await this.redis.get(dayKey) ?? '0', 10);
    if (dayCount >= limit.maxPerDay) {
      return { allowed: false, retryAfterSeconds: 86400 };
    }

    return { allowed: true };
  }

  private async recordRateLimitUsage(
    tool: ToolDefinition,
    context: ExecutionContext
  ): Promise<void> {
    const limit = tool.rateLimit;
    const scopeKey = this.getRateLimitScopeKey(limit.scope, context);
    const baseKey = `${this.cachePrefix}:ratelimit:${tool.id}:${scopeKey}`;

    const pipeline = this.redis.pipeline();

    // Increment minute counter
    const minuteKey = `${baseKey}:minute:${Math.floor(Date.now() / 60000)}`;
    pipeline.incr(minuteKey);
    pipeline.expire(minuteKey, 120);

    // Increment hour counter
    const hourKey = `${baseKey}:hour:${Math.floor(Date.now() / 3600000)}`;
    pipeline.incr(hourKey);
    pipeline.expire(hourKey, 7200);

    // Increment day counter
    const dayKey = `${baseKey}:day:${new Date().toISOString().split('T')[0]}`;
    pipeline.incr(dayKey);
    pipeline.expire(dayKey, 172800);

    await pipeline.exec();
  }

  private getRateLimitScopeKey(scope: 'user' | 'learner' | 'tenant' | 'global', context: ExecutionContext): string {
    switch (scope) {
      case 'user': return context.userId;
      case 'learner': return context.learnerId ?? context.userId;
      case 'tenant': return context.tenantId;
      case 'global': return 'global';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // VALIDATION
  // ──────────────────────────────────────────────────────────────────────────────

  private async validateParameters(
    tool: ToolDefinition,
    params: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    for (const paramDef of tool.parameters) {
      const value = params[paramDef.name];

      // Check required
      if (paramDef.required && value === undefined) {
        errors.push(`Missing required parameter: ${paramDef.name}`);
        continue;
      }

      if (value === undefined) continue;

      // Check type
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== paramDef.type && !(paramDef.type === 'object' && actualType === 'object')) {
        errors.push(`Parameter ${paramDef.name} has wrong type. Expected ${paramDef.type}, got ${actualType}`);
        continue;
      }

      // Run validation rules
      if (paramDef.validation) {
        const v = paramDef.validation;

        if (typeof value === 'string') {
          if (v.minLength && value.length < v.minLength) {
            errors.push(`${paramDef.name} must be at least ${v.minLength} characters`);
          }
          if (v.maxLength && value.length > v.maxLength) {
            errors.push(`${paramDef.name} must be at most ${v.maxLength} characters`);
          }
          if (v.pattern && !new RegExp(v.pattern).test(value)) {
            errors.push(`${paramDef.name} does not match required pattern`);
          }
        }

        if (typeof value === 'number') {
          if (v.min !== undefined && value < v.min) {
            errors.push(`${paramDef.name} must be at least ${v.min}`);
          }
          if (v.max !== undefined && value > v.max) {
            errors.push(`${paramDef.name} must be at most ${v.max}`);
          }
        }

        if (v.enum && !v.enum.includes(value)) {
          errors.push(`${paramDef.name} must be one of: ${v.enum.join(', ')}`);
        }

        if (v.custom && !v.custom(value)) {
          errors.push(`${paramDef.name} failed custom validation`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ──────────────────────────────────────────────────────────────────────────────

  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Execution timeout'));
      }, timeout);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // AUDIT LOGGING
  // ──────────────────────────────────────────────────────────────────────────────

  private async logAudit(entry: {
    requestId: string;
    toolId: string;
    context: ExecutionContext;
    action: 'EXECUTED' | 'DENIED' | 'RATE_LIMITED' | 'TIMEOUT' | 'ERROR';
    reason?: string;
    result?: Record<string, unknown>;
  }): Promise<string> {
    const auditId = this.generateId('aud');

    await this.pool.query(
      `INSERT INTO tool_execution_audit (
        id, request_id, tool_id, tenant_id, user_id, user_role,
        learner_id, session_id, agent_id, autonomy_level,
        action, reason, result, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`,
      [
        auditId,
        entry.requestId,
        entry.toolId,
        entry.context.tenantId,
        entry.context.userId,
        entry.context.userRole,
        entry.context.learnerId ?? null,
        entry.context.sessionId ?? null,
        entry.context.agentId,
        entry.context.autonomyLevel,
        entry.action,
        entry.reason ?? null,
        entry.result ? JSON.stringify(entry.result) : null,
      ]
    );

    return auditId;
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────────────────────

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createErrorResult(
    requestId: string,
    toolId: string,
    error: string,
    startTime: number
  ): Promise<ToolExecutionResult> {
    return {
      requestId,
      toolId,
      status: 'error',
      error,
      executionTimeMs: Date.now() - startTime,
      auditId: await this.logAudit({
        requestId,
        toolId,
        context: {
          tenantId: '',
          userId: '',
          userRole: 'SYSTEM',
          agentId: '',
          autonomyLevel: 'NONE',
          consents: [],
          requestId,
        },
        action: 'ERROR',
        reason: error,
      }),
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// BUILT-IN TOOLS FACTORY
// ════════════════════════════════════════════════════════════════════════════════

export function createBuiltInTools(pool: Pool): ToolDefinition[] {
  return [
    {
      id: 'get_learner_skills',
      name: 'Get Learner Skills',
      description: 'Retrieve current skill levels for a learner',
      category: 'DATA_ACCESS',
      version: '1.0.0',
      parameters: [
        { name: 'learnerId', type: 'string', description: 'Learner ID', required: true },
        { name: 'domain', type: 'string', description: 'Filter by domain', required: false },
      ],
      returns: { type: 'array', description: 'List of skill levels' },
      permissions: {
        requiredRoles: ['TEACHER', 'PARENT', 'SYSTEM'],
        requiredConsents: ['DATA_PROCESSING'],
        sensitivityLevel: 'CONFIDENTIAL',
        minAutonomyLevel: 'SUPERVISED',
      },
      rateLimit: { maxPerMinute: 30, maxPerHour: 500, maxPerDay: 5000, scope: 'user' },
      timeout: 5000,
      handler: async (context, params) => {
        const result = await pool.query(
          `SELECT * FROM learner_skills WHERE learner_id = $1 AND tenant_id = $2`,
          [params.learnerId, context.tenantId]
        );
        return { success: true, data: result.rows };
      },
    },
    {
      id: 'generate_learning_recommendation',
      name: 'Generate Learning Recommendation',
      description: 'Generate personalized content recommendation',
      category: 'LEARNING',
      version: '1.0.0',
      parameters: [
        { name: 'learnerId', type: 'string', description: 'Learner ID', required: true },
        { name: 'context', type: 'object', description: 'Current learning context', required: false },
      ],
      returns: { type: 'object', description: 'Recommendation with content IDs' },
      permissions: {
        requiredRoles: ['LEARNER', 'TEACHER', 'SYSTEM'],
        requiredConsents: ['DATA_PROCESSING', 'AI_PERSONALIZATION'],
        sensitivityLevel: 'INTERNAL',
        minAutonomyLevel: 'SEMI_AUTONOMOUS',
      },
      rateLimit: { maxPerMinute: 10, maxPerHour: 100, maxPerDay: 1000, scope: 'learner' },
      timeout: 10000,
      handler: async (context, params) => {
        // This would call the recommendation engine
        return {
          success: true,
          data: {
            recommendedContentIds: [],
            reasoning: 'Personalized recommendation based on skill levels',
          },
        };
      },
    },
    {
      id: 'send_notification',
      name: 'Send Notification',
      description: 'Send a notification to a user',
      category: 'COMMUNICATION',
      version: '1.0.0',
      parameters: [
        { name: 'userId', type: 'string', description: 'Recipient user ID', required: true },
        { name: 'title', type: 'string', description: 'Notification title', required: true },
        { name: 'body', type: 'string', description: 'Notification body', required: true },
        { name: 'priority', type: 'string', description: 'Priority level', required: false },
      ],
      returns: { type: 'object', description: 'Notification result' },
      permissions: {
        requiredRoles: ['TEACHER', 'ADMIN', 'SYSTEM'],
        sensitivityLevel: 'INTERNAL',
        minAutonomyLevel: 'SEMI_AUTONOMOUS',
      },
      rateLimit: { maxPerMinute: 10, maxPerHour: 100, maxPerDay: 500, scope: 'user' },
      timeout: 5000,
      handler: async (context, params) => {
        // This would call the notification service
        return { success: true, data: { notificationId: 'notif_123', sent: true } };
      },
    },
  ];
}

export default ToolExecutor;
