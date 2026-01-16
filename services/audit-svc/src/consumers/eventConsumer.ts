/**
 * AIVO Audit Service - Event Consumer
 *
 * Subscribes to events from other services and creates audit log entries.
 */

import { EventPublisher } from '@aivo/events';

import { config } from '../config.js';
import * as auditService from '../services/auditService.js';
import * as policyService from '../services/policyService.js';
import * as alertService from '../services/alertService.js';
import type { AuditCategory, AuditSeverity, AuditOutcome } from '../types/index.js';

// Event types that should be audited
const AUDIT_EVENT_MAPPINGS: Record<string, {
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  description: (payload: any) => string;
}> = {
  // Authentication events
  'auth.login.success': {
    category: 'AUTHENTICATION',
    severity: 'INFO',
    action: 'login',
    description: (p) => `User ${p.email || p.userId} logged in successfully`,
  },
  'auth.login.failure': {
    category: 'AUTHENTICATION',
    severity: 'WARNING',
    action: 'login_failed',
    description: (p) => `Failed login attempt for ${p.email || 'unknown user'}`,
  },
  'auth.logout': {
    category: 'AUTHENTICATION',
    severity: 'INFO',
    action: 'logout',
    description: (p) => `User ${p.email || p.userId} logged out`,
  },
  'auth.password.changed': {
    category: 'AUTHENTICATION',
    severity: 'NOTICE',
    action: 'password_change',
    description: (p) => `User ${p.email || p.userId} changed their password`,
  },
  'auth.mfa.enabled': {
    category: 'AUTHENTICATION',
    severity: 'NOTICE',
    action: 'mfa_enabled',
    description: (p) => `MFA enabled for user ${p.email || p.userId}`,
  },
  'auth.mfa.disabled': {
    category: 'AUTHENTICATION',
    severity: 'WARNING',
    action: 'mfa_disabled',
    description: (p) => `MFA disabled for user ${p.email || p.userId}`,
  },

  // Authorization events
  'auth.role.assigned': {
    category: 'AUTHORIZATION',
    severity: 'NOTICE',
    action: 'role_assigned',
    description: (p) => `Role ${p.role} assigned to user ${p.userId}`,
  },
  'auth.role.revoked': {
    category: 'AUTHORIZATION',
    severity: 'NOTICE',
    action: 'role_revoked',
    description: (p) => `Role ${p.role} revoked from user ${p.userId}`,
  },
  'auth.permission.denied': {
    category: 'AUTHORIZATION',
    severity: 'WARNING',
    action: 'permission_denied',
    description: (p) => `Permission denied for action ${p.action} on ${p.resource}`,
  },

  // Data access events
  'data.export.requested': {
    category: 'DATA_ACCESS',
    severity: 'NOTICE',
    action: 'export_requested',
    description: (p) => `Data export requested for ${p.dataType}`,
  },
  'data.export.completed': {
    category: 'DATA_ACCESS',
    severity: 'INFO',
    action: 'export_completed',
    description: (p) => `Data export completed for ${p.dataType}`,
  },
  'data.bulk.read': {
    category: 'DATA_ACCESS',
    severity: 'INFO',
    action: 'bulk_read',
    description: (p) => `Bulk read of ${p.recordCount} ${p.dataType} records`,
  },

  // Data modification events
  'content.created': {
    category: 'DATA_MODIFICATION',
    severity: 'INFO',
    action: 'create',
    description: (p) => `Content created: ${p.title || p.contentId}`,
  },
  'content.updated': {
    category: 'DATA_MODIFICATION',
    severity: 'INFO',
    action: 'update',
    description: (p) => `Content updated: ${p.title || p.contentId}`,
  },
  'content.deleted': {
    category: 'DATA_MODIFICATION',
    severity: 'NOTICE',
    action: 'delete',
    description: (p) => `Content deleted: ${p.title || p.contentId}`,
  },
  'user.created': {
    category: 'DATA_MODIFICATION',
    severity: 'INFO',
    action: 'create',
    description: (p) => `User account created: ${p.email}`,
  },
  'user.updated': {
    category: 'DATA_MODIFICATION',
    severity: 'INFO',
    action: 'update',
    description: (p) => `User account updated: ${p.email || p.userId}`,
  },
  'user.deleted': {
    category: 'DATA_MODIFICATION',
    severity: 'NOTICE',
    action: 'delete',
    description: (p) => `User account deleted: ${p.email || p.userId}`,
  },

  // Configuration events
  'tenant.settings.updated': {
    category: 'CONFIGURATION',
    severity: 'NOTICE',
    action: 'settings_update',
    description: (p) => `Tenant settings updated: ${p.setting}`,
  },
  'integration.configured': {
    category: 'CONFIGURATION',
    severity: 'NOTICE',
    action: 'integration_config',
    description: (p) => `Integration configured: ${p.integrationName}`,
  },

  // Security events
  'security.suspicious.activity': {
    category: 'SECURITY',
    severity: 'ALERT',
    action: 'suspicious_activity',
    description: (p) => `Suspicious activity detected: ${p.reason}`,
  },
  'security.session.hijack.attempt': {
    category: 'SECURITY',
    severity: 'CRITICAL',
    action: 'session_hijack_attempt',
    description: (p) => `Possible session hijacking attempt detected`,
  },
  'security.rate.limit.exceeded': {
    category: 'SECURITY',
    severity: 'WARNING',
    action: 'rate_limit_exceeded',
    description: (p) => `Rate limit exceeded for ${p.endpoint}`,
  },

  // Compliance events
  'consent.granted': {
    category: 'COMPLIANCE',
    severity: 'INFO',
    action: 'consent_granted',
    description: (p) => `Consent granted for ${p.consentType}`,
  },
  'consent.revoked': {
    category: 'COMPLIANCE',
    severity: 'NOTICE',
    action: 'consent_revoked',
    description: (p) => `Consent revoked for ${p.consentType}`,
  },
  'dsr.request.received': {
    category: 'COMPLIANCE',
    severity: 'NOTICE',
    action: 'dsr_received',
    description: (p) => `Data subject request received: ${p.requestType}`,
  },
  'dsr.request.completed': {
    category: 'COMPLIANCE',
    severity: 'INFO',
    action: 'dsr_completed',
    description: (p) => `Data subject request completed: ${p.requestType}`,
  },
};

let publisher: EventPublisher | null = null;

/**
 * Start the event consumer.
 */
export async function startEventConsumer(): Promise<void> {
  if (!config.nats.enabled) {
    console.log('NATS disabled, skipping event consumer');
    return;
  }

  try {
    publisher = new EventPublisher({
      natsUrl: config.nats.url,
      clientId: 'audit-svc',
      stream: 'AUDIT',
    });

    await publisher.connect();

    // Subscribe to all auditable event types
    for (const eventType of Object.keys(AUDIT_EVENT_MAPPINGS)) {
      console.log(`Subscribed to ${eventType} events`);
    }

    console.log('Audit event consumer started');
  } catch (error) {
    console.error('Failed to start event consumer:', error);
    throw error;
  }
}

/**
 * Stop the event consumer.
 */
export async function stopEventConsumer(): Promise<void> {
  if (publisher) {
    await publisher.disconnect();
    publisher = null;
  }
}

/**
 * Handle an incoming event.
 */
export async function handleEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  const mapping = AUDIT_EVENT_MAPPINGS[eventType];
  if (!mapping) {
    // Unknown event type, skip
    return;
  }

  const tenantId = payload.tenantId as string;
  if (!tenantId) {
    console.warn(`Event ${eventType} missing tenantId, skipping`);
    return;
  }

  // Determine outcome
  let outcome: AuditOutcome = 'SUCCESS';
  if (eventType.includes('.failure') || eventType.includes('.denied')) {
    outcome = 'FAILURE';
  } else if (eventType.includes('.error')) {
    outcome = 'ERROR';
  }

  try {
    // Create the audit log entry
    const auditLog = await auditService.createAuditLog(tenantId, {
      eventType,
      category: mapping.category,
      severity: mapping.severity,
      outcome,
      actorId: payload.actorId as string | undefined,
      actorType: (payload.actorType as string) || 'user',
      actorEmail: payload.actorEmail as string | undefined,
      actorRoles: (payload.actorRoles as string[]) || [],
      actorIpAddress: payload.ipAddress as string | undefined,
      actorUserAgent: payload.userAgent as string | undefined,
      actorSessionId: payload.sessionId as string | undefined,
      targetType: payload.targetType as string | undefined,
      targetId: payload.targetId as string | undefined,
      targetName: payload.targetName as string | undefined,
      action: mapping.action,
      description: mapping.description(payload),
      requestId: payload.requestId as string | undefined,
      sourceService: (payload.sourceService as string) || 'unknown',
      sourceVersion: payload.sourceVersion as string | undefined,
      metadata: payload,
      complianceFlags: (payload.complianceFlags as string[]) || [],
    });

    // Check if this event should trigger an alert
    const alertPolicies = await policyService.checkForAlerts(
      tenantId,
      mapping.category,
      mapping.severity,
      eventType
    );

    for (const policy of alertPolicies) {
      await alertService.createAlert(
        tenantId,
        `${mapping.category} Alert: ${eventType}`,
        mapping.description(payload),
        mapping.severity,
        eventType,
        mapping.category,
        [auditLog.id]
      );

      // TODO: Send webhook notification if configured
      if (policy.alertWebhookUrl) {
        // Send webhook notification
        console.log(`Would send webhook to ${policy.alertWebhookUrl}`);
      }
    }
  } catch (error) {
    console.error(`Failed to process audit event ${eventType}:`, error);
    throw error;
  }
}
