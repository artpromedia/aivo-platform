/**
 * Parent Safety Notification Service
 *
 * Implements automatic parent/guardian notification for safety incidents
 * per COPPA compliance requirements.
 *
 * When a safety incident is detected (self-harm, abuse, violence), this service:
 * 1. Retrieves parent/guardian contact information
 * 2. Sends immediate notification via email and push notification
 * 3. Creates an audit trail of the notification
 * 4. Escalates to school admin if parent cannot be reached
 *
 * Created: January 2026 - Enterprise QA Audit requirement
 */

import type { Pool } from 'pg';
import { logger, metrics } from '@aivo/ts-observability';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export interface SafetyIncidentNotification {
  tenantId: string;
  learnerId: string;
  incidentId: string;
  incidentType: 'SELF_HARM' | 'ABUSE_DETECTED' | 'VIOLENCE_DETECTED';
  severity: 'HIGH' | 'CRITICAL';
  timestamp: Date;
  inputSummary?: string;
}

export interface ParentContact {
  parentId: string;
  email: string;
  phone?: string;
  name: string;
  relationship: string;
  notificationPreferences: {
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
  };
}

export interface NotificationResult {
  success: boolean;
  parentNotified: boolean;
  schoolAdminNotified: boolean;
  notificationIds: string[];
  errors?: string[];
}

export interface EmailService {
  sendEmail(params: {
    to: string;
    subject: string;
    templateId: string;
    templateData: Record<string, unknown>;
    priority: 'high' | 'normal';
  }): Promise<{ messageId: string }>;
}

export interface PushService {
  sendPush(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    priority: 'high' | 'normal';
  }): Promise<{ notificationId: string }>;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════════════

const NOTIFICATION_TEMPLATES = {
  SELF_HARM: {
    subject: 'Important: Safety concern detected for your child',
    templateId: 'safety-incident-self-harm',
  },
  ABUSE_DETECTED: {
    subject: 'Important: Safety concern detected for your child',
    templateId: 'safety-incident-abuse',
  },
  VIOLENCE_DETECTED: {
    subject: 'Important: Safety concern detected for your child',
    templateId: 'safety-incident-violence',
  },
};

const INCIDENT_TYPE_DISPLAY: Record<string, string> = {
  SELF_HARM: 'concerning messages about self-harm',
  ABUSE_DETECTED: 'concerning messages about potential harm',
  VIOLENCE_DETECTED: 'concerning messages about safety',
};

// ════════════════════════════════════════════════════════════════════════════════
// SERVICE
// ════════════════════════════════════════════════════════════════════════════════

export class ParentSafetyNotificationService {
  private readonly pool: Pool;
  private readonly emailService: EmailService;
  private readonly pushService: PushService;
  private readonly baseUrl: string;

  constructor(options: {
    pool: Pool;
    emailService: EmailService;
    pushService: PushService;
    baseUrl: string;
  }) {
    this.pool = options.pool;
    this.emailService = options.emailService;
    this.pushService = options.pushService;
    this.baseUrl = options.baseUrl;
  }

  /**
   * Notify parents/guardians about a safety incident
   *
   * This is called automatically when preFilter or postFilter blocks content
   * due to safety concerns (self-harm, abuse, violence).
   */
  async notifyParentsOfIncident(
    incident: SafetyIncidentNotification
  ): Promise<NotificationResult> {
    const startTime = Date.now();
    const notificationIds: string[] = [];
    const errors: string[] = [];
    let parentNotified = false;
    let schoolAdminNotified = false;

    try {
      // 1. Get learner and parent information
      const learnerInfo = await this.getLearnerInfo(incident.learnerId, incident.tenantId);
      if (!learnerInfo) {
        errors.push(`Learner not found: ${incident.learnerId}`);
        // Still escalate to school admin
        await this.notifySchoolAdmin(incident, null, 'Learner not found');
        return { success: false, parentNotified, schoolAdminNotified: true, notificationIds, errors };
      }

      // 2. Get parent/guardian contacts
      const parentContacts = await this.getParentContacts(incident.learnerId, incident.tenantId);

      if (parentContacts.length === 0) {
        errors.push('No parent contacts found');
        // Escalate to school admin
        await this.notifySchoolAdmin(incident, learnerInfo, 'No parent contacts found');
        schoolAdminNotified = true;
      } else {
        // 3. Send notifications to all linked parents/guardians
        for (const parent of parentContacts) {
          try {
            const result = await this.notifyParent(incident, learnerInfo, parent);
            notificationIds.push(...result.notificationIds);
            parentNotified = true;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            errors.push(`Failed to notify parent ${parent.parentId}: ${errorMessage}`);
            logger.error('Failed to notify parent', {
              parentId: parent.parentId,
              incidentId: incident.incidentId,
              error: errorMessage,
            });
          }
        }

        // If no parent was successfully notified, escalate
        if (!parentNotified) {
          await this.notifySchoolAdmin(incident, learnerInfo, 'All parent notifications failed');
          schoolAdminNotified = true;
        }
      }

      // 4. Log the notification attempt
      await this.logNotificationAttempt(incident, {
        parentNotified,
        schoolAdminNotified,
        notificationIds,
        errors,
      });

      // 5. Update metrics
      metrics.increment('safety.parent_notification.attempted', {
        incident_type: incident.incidentType,
        tenant_id: incident.tenantId,
      });

      if (parentNotified) {
        metrics.increment('safety.parent_notification.success');
      }

      const duration = Date.now() - startTime;
      metrics.histogram('safety.parent_notification.duration_ms', duration);

      return {
        success: parentNotified || schoolAdminNotified,
        parentNotified,
        schoolAdminNotified,
        notificationIds,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Parent safety notification failed', {
        incidentId: incident.incidentId,
        error: errorMessage,
      });

      metrics.increment('safety.parent_notification.error');

      return {
        success: false,
        parentNotified: false,
        schoolAdminNotified: false,
        notificationIds: [],
        errors: [errorMessage],
      };
    }
  }

  /**
   * Get learner information
   */
  private async getLearnerInfo(
    learnerId: string,
    tenantId: string
  ): Promise<{ id: string; name: string; grade?: string } | null> {
    const result = await this.pool.query(
      `SELECT id, given_name, family_name, grade_level
       FROM profiles
       WHERE id = $1 AND tenant_id = $2`,
      [learnerId, tenantId]
    );

    if (result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: `${row.given_name || ''} ${row.family_name || ''}`.trim() || 'Student',
      grade: row.grade_level,
    };
  }

  /**
   * Get parent/guardian contacts for a learner
   */
  private async getParentContacts(
    learnerId: string,
    tenantId: string
  ): Promise<ParentContact[]> {
    const result = await this.pool.query(
      `SELECT
         p.id as parent_id,
         p.email,
         p.phone,
         p.given_name,
         p.family_name,
         psl.relationship,
         p.notification_preferences
       FROM parent_student_links psl
       JOIN parents p ON p.id = psl.parent_id
       WHERE psl.student_id = $1
         AND psl.tenant_id = $2
         AND psl.status = 'ACTIVE'
         AND p.status = 'ACTIVE'`,
      [learnerId, tenantId]
    );

    return result.rows.map((row) => ({
      parentId: row.parent_id,
      email: row.email,
      phone: row.phone,
      name: `${row.given_name || ''} ${row.family_name || ''}`.trim() || 'Parent/Guardian',
      relationship: row.relationship || 'parent',
      notificationPreferences: row.notification_preferences || {
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
      },
    }));
  }

  /**
   * Send notification to a specific parent
   */
  private async notifyParent(
    incident: SafetyIncidentNotification,
    learner: { id: string; name: string; grade?: string },
    parent: ParentContact
  ): Promise<{ notificationIds: string[] }> {
    const notificationIds: string[] = [];
    const template = NOTIFICATION_TEMPLATES[incident.incidentType];
    const incidentDisplay = INCIDENT_TYPE_DISPLAY[incident.incidentType] || 'a safety concern';

    // Send email notification
    if (parent.notificationPreferences.emailEnabled && parent.email) {
      const emailResult = await this.emailService.sendEmail({
        to: parent.email,
        subject: template.subject,
        templateId: template.templateId,
        priority: 'high',
        templateData: {
          parentName: parent.name,
          learnerName: learner.name,
          incidentType: incidentDisplay,
          timestamp: incident.timestamp.toISOString(),
          supportUrl: `${this.baseUrl}/parent/support`,
          dashboardUrl: `${this.baseUrl}/parent/dashboard`,
          crisisHotline: '988',
          crisisText: '741741',
        },
      });
      notificationIds.push(emailResult.messageId);

      logger.info('Safety notification email sent', {
        parentId: parent.parentId,
        learnerId: learner.id,
        incidentId: incident.incidentId,
        messageId: emailResult.messageId,
      });
    }

    // Send push notification
    if (parent.notificationPreferences.pushEnabled) {
      try {
        const pushResult = await this.pushService.sendPush({
          userId: parent.parentId,
          title: 'Important Safety Alert',
          body: `We detected ${incidentDisplay} in ${learner.name}'s conversation. Please check your email and speak with your child.`,
          priority: 'high',
          data: {
            type: 'safety_incident',
            incidentId: incident.incidentId,
            learnerId: learner.id,
          },
        });
        notificationIds.push(pushResult.notificationId);
      } catch (error) {
        // Push notification failure is not critical
        logger.warn('Push notification failed', {
          parentId: parent.parentId,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }

    return { notificationIds };
  }

  /**
   * Notify school admin when parents cannot be reached
   */
  private async notifySchoolAdmin(
    incident: SafetyIncidentNotification,
    learner: { id: string; name: string; grade?: string } | null,
    reason: string
  ): Promise<void> {
    // Get school admin contacts
    const result = await this.pool.query(
      `SELECT u.id, u.email, u.given_name
       FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       WHERE ur.role = 'school_admin'
         AND ur.tenant_id = $1
         AND u.status = 'ACTIVE'
       LIMIT 5`,
      [incident.tenantId]
    );

    for (const admin of result.rows) {
      try {
        await this.emailService.sendEmail({
          to: admin.email,
          subject: '[URGENT] Safety incident - Parent notification failed',
          templateId: 'safety-incident-admin-escalation',
          priority: 'high',
          templateData: {
            adminName: admin.given_name || 'Administrator',
            learnerName: learner?.name || 'Unknown student',
            learnerId: incident.learnerId,
            incidentType: INCIDENT_TYPE_DISPLAY[incident.incidentType],
            incidentId: incident.incidentId,
            timestamp: incident.timestamp.toISOString(),
            escalationReason: reason,
            dashboardUrl: `${this.baseUrl}/admin/safety-incidents/${incident.incidentId}`,
          },
        });

        logger.info('Safety incident escalated to admin', {
          adminId: admin.id,
          incidentId: incident.incidentId,
          reason,
        });
      } catch (error) {
        logger.error('Failed to notify school admin', {
          adminId: admin.id,
          error: error instanceof Error ? error.message : 'Unknown',
        });
      }
    }
  }

  /**
   * Log notification attempt for audit trail
   */
  private async logNotificationAttempt(
    incident: SafetyIncidentNotification,
    result: {
      parentNotified: boolean;
      schoolAdminNotified: boolean;
      notificationIds: string[];
      errors: string[];
    }
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO safety_notification_logs (
         tenant_id,
         incident_id,
         learner_id,
         incident_type,
         parent_notified,
         school_admin_notified,
         notification_ids,
         errors,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        incident.tenantId,
        incident.incidentId,
        incident.learnerId,
        incident.incidentType,
        result.parentNotified,
        result.schoolAdminNotified,
        JSON.stringify(result.notificationIds),
        result.errors.length > 0 ? JSON.stringify(result.errors) : null,
      ]
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

let serviceInstance: ParentSafetyNotificationService | null = null;

export function createParentNotificationService(options: {
  pool: Pool;
  emailService: EmailService;
  pushService: PushService;
  baseUrl: string;
}): ParentSafetyNotificationService {
  serviceInstance = new ParentSafetyNotificationService(options);
  return serviceInstance;
}

export function getParentNotificationService(): ParentSafetyNotificationService | null {
  return serviceInstance;
}
