/**
 * Admin Audit Logging
 *
 * Provides comprehensive audit logging for administrative actions.
 * Required for FERPA compliance and enterprise audit trails.
 *
 * CRITICAL: Addresses HIGH-009 - Missing audit log for admin actions
 *
 * Usage:
 * ```typescript
 * import { createAuditLogger, AuditAction } from '@aivo/ts-api-utils/audit';
 *
 * const auditLogger = createAuditLogger({
 *   serviceName: 'tenant-svc',
 *   transport: async (entry) => {
 *     await db.adminAuditLogs.create({ data: entry });
 *   },
 * });
 *
 * await auditLogger.log({
 *   action: 'USER_CREATED',
 *   actorId: 'admin-123',
 *   actorRole: 'DISTRICT_ADMIN',
 *   tenantId: 'district-1',
 *   resourceType: 'USER',
 *   resourceId: 'user-456',
 *   details: { email: 'teacher@school.edu', role: 'TEACHER' },
 * });
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Standard audit actions for admin operations
 */
export type AuditAction =
  // User management
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'USER_ROLE_CHANGED'
  | 'USER_STATUS_CHANGED'
  | 'USER_PASSWORD_RESET'
  | 'USER_MFA_ENABLED'
  | 'USER_MFA_DISABLED'
  // Authentication
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'SESSION_REVOKED'
  | 'TOKEN_REFRESHED'
  // Tenant/school management
  | 'TENANT_CREATED'
  | 'TENANT_UPDATED'
  | 'TENANT_SUSPENDED'
  | 'TENANT_DELETED'
  | 'SCHOOL_CREATED'
  | 'SCHOOL_UPDATED'
  | 'SCHOOL_DELETED'
  // Class/roster management
  | 'CLASS_CREATED'
  | 'CLASS_UPDATED'
  | 'CLASS_DELETED'
  | 'STUDENT_ENROLLED'
  | 'STUDENT_UNENROLLED'
  | 'ROSTER_IMPORTED'
  | 'ROSTER_SYNCED'
  // Permissions & access
  | 'PERMISSION_GRANTED'
  | 'PERMISSION_REVOKED'
  | 'ROLE_CREATED'
  | 'ROLE_UPDATED'
  | 'ROLE_DELETED'
  // Data management
  | 'DATA_EXPORTED'
  | 'DATA_DELETED'
  | 'BULK_OPERATION'
  | 'REPORT_GENERATED'
  // Settings & configuration
  | 'SETTING_CHANGED'
  | 'POLICY_UPDATED'
  | 'INTEGRATION_CONFIGURED'
  | 'SSO_CONFIGURED'
  // Content management
  | 'CONTENT_PUBLISHED'
  | 'CONTENT_UNPUBLISHED'
  | 'CONTENT_DELETED'
  // AI/Safety
  | 'AI_SETTING_CHANGED'
  | 'SAFETY_INCIDENT_REVIEWED'
  | 'AI_DISABLED_FOR_STUDENT'
  | 'AI_ENABLED_FOR_STUDENT'
  // Compliance
  | 'DSR_REQUEST_CREATED'
  | 'DSR_REQUEST_APPROVED'
  | 'DSR_REQUEST_REJECTED'
  | 'CONSENT_UPDATED'
  // Generic
  | 'OTHER';

/**
 * Resource types that can be audited
 */
export type AuditResourceType =
  | 'USER'
  | 'TENANT'
  | 'SCHOOL'
  | 'CLASS'
  | 'STUDENT'
  | 'TEACHER'
  | 'PARENT'
  | 'ROLE'
  | 'PERMISSION'
  | 'SETTING'
  | 'POLICY'
  | 'CONTENT'
  | 'REPORT'
  | 'DSR_REQUEST'
  | 'INTEGRATION'
  | 'AI_SETTING'
  | 'SAFETY_INCIDENT'
  | 'ROSTER'
  | 'BULK_OPERATION'
  | 'OTHER';

/**
 * Severity level of the audit event
 */
export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

/**
 * Input for creating an audit log entry
 */
export interface AuditLogInput {
  /** The action being performed */
  action: AuditAction;
  /** ID of the user performing the action */
  actorId: string;
  /** Role of the actor */
  actorRole: string;
  /** Tenant context */
  tenantId: string;
  /** Type of resource being affected */
  resourceType: AuditResourceType;
  /** ID of the specific resource */
  resourceId: string;
  /** Additional details about the action */
  details?: Record<string, unknown>;
  /** Previous state (for updates) */
  previousState?: Record<string, unknown>;
  /** New state (for updates/creates) */
  newState?: Record<string, unknown>;
  /** Severity level */
  severity?: AuditSeverity;
  /** IP address of the actor */
  ipAddress?: string;
  /** User agent string */
  userAgent?: string;
  /** Correlation ID for request tracing */
  correlationId?: string;
  /** Custom tags for filtering */
  tags?: string[];
}

/**
 * Complete audit log entry (with auto-generated fields)
 */
export interface AuditLogEntry extends AuditLogInput {
  /** Unique ID for this audit entry */
  id: string;
  /** Timestamp of the action */
  timestamp: string;
  /** Service that generated the log */
  serviceName: string;
  /** Severity level (defaults to INFO) */
  severity: AuditSeverity;
}

/**
 * Audit logger configuration
 */
export interface AuditLoggerConfig {
  /** Name of the service generating audit logs */
  serviceName: string;
  /** Custom transport function for persisting audit logs */
  transport?: (entry: AuditLogEntry) => Promise<void>;
  /** Whether to also log to console (default: false in production) */
  consoleOutput?: boolean;
  /** Default tags to add to all entries */
  defaultTags?: string[];
  /** Fields to redact from details */
  redactFields?: string[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Fields that should be redacted from audit logs
const DEFAULT_REDACT_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'token',
  'apiKey',
  'ssn',
  'creditCard',
];

// Actions that are critical and require special attention
const CRITICAL_ACTIONS: AuditAction[] = [
  'USER_DELETED',
  'TENANT_DELETED',
  'DATA_DELETED',
  'DSR_REQUEST_APPROVED',
  'PERMISSION_GRANTED',
  'ROLE_DELETED',
  'SSO_CONFIGURED',
  'AI_DISABLED_FOR_STUDENT',
];

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a unique audit log ID
 */
function generateAuditId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Redact sensitive fields from an object
 */
function redactSensitiveData(
  data: Record<string, unknown> | undefined,
  fieldsToRedact: string[]
): Record<string, unknown> | undefined {
  if (!data) return undefined;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    const shouldRedact = fieldsToRedact.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (shouldRedact) {
      result[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactSensitiveData(
        value as Record<string, unknown>,
        fieldsToRedact
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Determine severity based on action type
 */
function determineSeverity(action: AuditAction): AuditSeverity {
  if (CRITICAL_ACTIONS.includes(action)) {
    return 'CRITICAL';
  }
  if (action.includes('DELETED') || action.includes('REVOKED')) {
    return 'WARNING';
  }
  return 'INFO';
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create an audit logger instance
 */
export function createAuditLogger(config: AuditLoggerConfig) {
  const {
    serviceName,
    transport,
    consoleOutput = !IS_PRODUCTION,
    defaultTags = [],
    redactFields = DEFAULT_REDACT_FIELDS,
  } = config;

  /**
   * Log an administrative action
   */
  async function log(input: AuditLogInput): Promise<AuditLogEntry> {
    const entry: AuditLogEntry = {
      ...input,
      id: generateAuditId(),
      timestamp: new Date().toISOString(),
      serviceName,
      severity: input.severity ?? determineSeverity(input.action),
      details: redactSensitiveData(input.details, redactFields),
      previousState: redactSensitiveData(input.previousState, redactFields),
      newState: redactSensitiveData(input.newState, redactFields),
      tags: [...defaultTags, ...(input.tags ?? [])],
    };

    // Output to console if enabled
    if (consoleOutput) {
      const logMethod =
        entry.severity === 'CRITICAL'
          ? console.error
          : entry.severity === 'WARNING'
            ? console.warn
            : console.info;

      logMethod(JSON.stringify({
        audit: true,
        ...entry,
      }));
    }

    // Use custom transport if provided
    if (transport) {
      try {
        await transport(entry);
      } catch (error) {
        console.error('[AuditLogger] Failed to persist audit log:', error);
        // Re-throw in production to ensure audit logging failures are noticed
        if (IS_PRODUCTION) {
          throw error;
        }
      }
    }

    return entry;
  }

  /**
   * Log user management action
   */
  async function logUserAction(
    action: Extract<AuditAction, `USER_${string}`>,
    params: Omit<AuditLogInput, 'action' | 'resourceType'>
  ): Promise<AuditLogEntry> {
    return log({
      ...params,
      action,
      resourceType: 'USER',
    });
  }

  /**
   * Log data access/modification action
   */
  async function logDataAction(
    action: Extract<AuditAction, 'DATA_EXPORTED' | 'DATA_DELETED' | 'BULK_OPERATION'>,
    params: Omit<AuditLogInput, 'action'>
  ): Promise<AuditLogEntry> {
    return log({
      ...params,
      action,
      severity: action === 'DATA_DELETED' ? 'CRITICAL' : 'WARNING',
    });
  }

  /**
   * Log authentication action
   */
  async function logAuthAction(
    action: Extract<AuditAction, 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGOUT' | 'SESSION_REVOKED' | 'TOKEN_REFRESHED'>,
    params: Omit<AuditLogInput, 'action' | 'resourceType'>
  ): Promise<AuditLogEntry> {
    return log({
      ...params,
      action,
      resourceType: 'USER',
      severity: action === 'LOGIN_FAILED' ? 'WARNING' : 'INFO',
    });
  }

  /**
   * Log permission change
   */
  async function logPermissionChange(
    action: 'PERMISSION_GRANTED' | 'PERMISSION_REVOKED',
    params: Omit<AuditLogInput, 'action' | 'resourceType'>
  ): Promise<AuditLogEntry> {
    return log({
      ...params,
      action,
      resourceType: 'PERMISSION',
      severity: 'CRITICAL',
    });
  }

  return {
    log,
    logUserAction,
    logDataAction,
    logAuthAction,
    logPermissionChange,
    serviceName,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// QUERY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build SQL WHERE clause for audit log queries
 */
export function buildAuditQueryFilter(filters: {
  tenantId: string;
  actorId?: string;
  resourceType?: AuditResourceType;
  resourceId?: string;
  action?: AuditAction;
  severity?: AuditSeverity;
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
}): { sql: string; params: unknown[] } {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [filters.tenantId];
  let paramIndex = 2;

  if (filters.actorId) {
    conditions.push(`actor_id = $${paramIndex++}`);
    params.push(filters.actorId);
  }

  if (filters.resourceType) {
    conditions.push(`resource_type = $${paramIndex++}`);
    params.push(filters.resourceType);
  }

  if (filters.resourceId) {
    conditions.push(`resource_id = $${paramIndex++}`);
    params.push(filters.resourceId);
  }

  if (filters.action) {
    conditions.push(`action = $${paramIndex++}`);
    params.push(filters.action);
  }

  if (filters.severity) {
    conditions.push(`severity = $${paramIndex++}`);
    params.push(filters.severity);
  }

  if (filters.startDate) {
    conditions.push(`timestamp >= $${paramIndex++}`);
    params.push(filters.startDate.toISOString());
  }

  if (filters.endDate) {
    conditions.push(`timestamp <= $${paramIndex++}`);
    params.push(filters.endDate.toISOString());
  }

  if (filters.tags && filters.tags.length > 0) {
    conditions.push(`tags && $${paramIndex++}`);
    params.push(filters.tags);
  }

  return {
    sql: conditions.join(' AND '),
    params,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const AuditLog = {
  create: createAuditLogger,
  buildQueryFilter: buildAuditQueryFilter,
  criticalActions: CRITICAL_ACTIONS,
};
