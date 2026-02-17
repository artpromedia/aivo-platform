/**
 * Annual FERPA Notification Scheduler
 *
 * Per 34 CFR § 99.7, educational agencies must annually notify parents and
 * eligible students of their FERPA rights. This scheduler:
 *
 * 1. Runs daily to check if any tenant is due for annual FERPA notification
 * 2. Queries all parents/guardians in each tenant
 * 3. Sends the compliance/annual-ferpa-notification template
 * 4. Tracks send history to prevent duplicate sends within the same school year
 */

import { sendTemplatedEmail } from '../channels/email/email.service.js';
import type { EmailTemplateContext } from '../channels/email/types.js';

// ============================================================================
// Types
// ============================================================================

interface FerpaSchedulerConfig {
  /** Check interval in ms — default: once per hour */
  checkIntervalMs?: number;
  /** Month (1-12) to send annual notification — default: August (8) */
  notificationMonth?: number;
  /** Day of month to target — default: 1 */
  notificationDay?: number;
}

interface TenantInfo {
  tenantId: string;
  districtName: string;
  contactName: string;
  contactEmail: string;
  schoolYear: string;
  privacySettingsUrl: string;
  dataRequestUrl: string;
  optOutDeadline: string;
}

interface ParentRecord {
  email: string;
  name: string;
  locale?: string;
}

// Track which tenants have already been notified for the current school year
const ferpaNotificationsSent = new Map<string, Date>();

// ============================================================================
// Scheduler
// ============================================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Get the school year string (e.g., "2025-2026") for a given date.
 * School year starts in July: dates Jul-Dec → currentYear-nextYear,
 * dates Jan-Jun → prevYear-currentYear.
 */
function getSchoolYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-indexed
  if (month >= 7) {
    return `${year}-${year + 1}`;
  }
  return `${year - 1}-${year}`;
}

/**
 * Check if today matches the scheduled notification date.
 */
function isDueForNotification(config: FerpaSchedulerConfig): boolean {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-indexed
  const day = now.getDate();
  const targetMonth = config.notificationMonth ?? 8;
  const targetDay = config.notificationDay ?? 1;

  // Allow a 7-day window starting from the target date
  if (month !== targetMonth) return false;
  return day >= targetDay && day <= targetDay + 6;
}

/**
 * Build the notification key for dedup: tenantId + schoolYear
 */
function notificationKey(tenantId: string, schoolYear: string): string {
  return `${tenantId}::${schoolYear}`;
}

/**
 * Check if this tenant has already been notified for the current school year.
 */
function alreadySent(tenantId: string): boolean {
  const schoolYear = getSchoolYear();
  return ferpaNotificationsSent.has(notificationKey(tenantId, schoolYear));
}

/**
 * Mark a tenant as notified for the current school year.
 */
function markSent(tenantId: string): void {
  const schoolYear = getSchoolYear();
  ferpaNotificationsSent.set(notificationKey(tenantId, schoolYear), new Date());
}

/**
 * Fetch all tenants that have FERPA notification enabled.
 * In production, this queries the database. Here we provide the interface.
 */
async function getTenantsForFerpaNotification(): Promise<TenantInfo[]> {
  try {
    const { prisma } = await import('../prisma.js');

    // Query tenants — in a real deployment, filter by those with
    // annual FERPA notification enabled in compliance settings
    const tenants = await (prisma as unknown as Record<string, unknown> & {
      tenant: {
        findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
      };
    }).tenant.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        contactName: true,
        contactEmail: true,
        domain: true,
      },
    });

    const schoolYear = getSchoolYear();
    const currentYear = new Date().getFullYear();

    return tenants.map((t: Record<string, unknown>) => ({
      tenantId: t.id as string,
      districtName: (t.name as string) || 'Your School District',
      contactName: (t.contactName as string) || 'Privacy Office',
      contactEmail: (t.contactEmail as string) || 'privacy@example.com',
      schoolYear,
      privacySettingsUrl: `https://${(t.domain as string) || 'app.aivo.com'}/settings/privacy`,
      dataRequestUrl: `https://${(t.domain as string) || 'app.aivo.com'}/data-rights`,
      optOutDeadline: `September 15, ${currentYear}`,
    }));
  } catch (error) {
    console.error('[FERPA Scheduler] Failed to fetch tenants:', error);
    return [];
  }
}

/**
 * Fetch all parents/guardians for a given tenant.
 */
async function getParentsForTenant(tenantId: string): Promise<ParentRecord[]> {
  try {
    const { prisma } = await import('../prisma.js');

    const parents = await (prisma as unknown as Record<string, unknown> & {
      user: {
        findMany: (args: Record<string, unknown>) => Promise<Array<Record<string, unknown>>>;
      };
    }).user.findMany({
      where: {
        tenantId,
        role: 'parent',
        active: true,
      },
      select: {
        email: true,
        firstName: true,
        lastName: true,
        locale: true,
      },
    });

    return parents.map((p: Record<string, unknown>) => ({
      email: p.email as string,
      name: `${(p.firstName as string) || ''} ${(p.lastName as string) || ''}`.trim() || 'Parent',
      locale: (p.locale as string) || undefined,
    }));
  } catch (error) {
    console.error(`[FERPA Scheduler] Failed to fetch parents for tenant ${tenantId}:`, error);
    return [];
  }
}

/**
 * Send FERPA notification to all parents in a tenant.
 */
async function sendFerpaNotificationsForTenant(tenant: TenantInfo): Promise<number> {
  const parents = await getParentsForTenant(tenant.tenantId);
  let sentCount = 0;

  for (const parent of parents) {
    try {
      const context: EmailTemplateContext = {
        appName: 'AIVO',
        appUrl: tenant.privacySettingsUrl.replace('/settings/privacy', ''),
        supportEmail: tenant.contactEmail,
        currentYear: new Date().getFullYear(),
        recipientName: parent.name,
        parentName: parent.name,
        districtName: tenant.districtName,
        schoolYear: tenant.schoolYear,
        districtContactName: tenant.contactName,
        districtContactEmail: tenant.contactEmail,
        privacySettingsUrl: tenant.privacySettingsUrl,
        dataRequestUrl: tenant.dataRequestUrl,
        optOutDeadline: tenant.optOutDeadline,
        brandColor: '#4f46e5',
        brandColorDark: '#3730a3',
      };

      await sendTemplatedEmail({
        templateName: 'compliance/annual-ferpa-notification',
        to: parent.email,
        context,
        locale: (parent.locale as 'en' | 'es') ?? 'en',
        category: 'compliance',
        tags: ['ferpa', 'annual-notification', tenant.schoolYear],
      });

      sentCount++;
    } catch (error) {
      console.error(
        `[FERPA Scheduler] Failed to send to ${parent.email} in tenant ${tenant.tenantId}:`,
        error,
      );
    }
  }

  return sentCount;
}

/**
 * Main processing loop — called periodically by the scheduler.
 */
async function processFerpaNotifications(config: FerpaSchedulerConfig): Promise<void> {
  if (!isDueForNotification(config)) {
    return; // Not the right time of year
  }

  console.info('[FERPA Scheduler] Checking for annual FERPA notifications…');

  const tenants = await getTenantsForFerpaNotification();

  for (const tenant of tenants) {
    if (alreadySent(tenant.tenantId)) {
      continue; // Already sent for this school year
    }

    console.info(
      `[FERPA Scheduler] Sending annual FERPA notification for tenant ${tenant.tenantId} (${tenant.districtName})`,
    );

    const sentCount = await sendFerpaNotificationsForTenant(tenant);
    markSent(tenant.tenantId);

    console.info(
      `[FERPA Scheduler] Sent ${sentCount} FERPA notifications for ${tenant.districtName} (${tenant.schoolYear})`,
    );
  }
}

/**
 * Start the annual FERPA notification scheduler.
 *
 * Checks once per hour whether it's time to send the annual notification.
 * Sends in August by default (start of school year).
 */
export function startFerpaScheduler(config: FerpaSchedulerConfig = {}): void {
  const checkInterval = config.checkIntervalMs ?? 60 * 60 * 1000; // 1 hour

  console.info('[FERPA Scheduler] Starting annual FERPA notification scheduler', {
    checkIntervalMs: checkInterval,
    notificationMonth: config.notificationMonth ?? 8,
    notificationDay: config.notificationDay ?? 1,
  });

  // Run immediately on startup
  void processFerpaNotifications(config);

  // Then check periodically
  schedulerInterval = setInterval(() => void processFerpaNotifications(config), checkInterval);
}

/**
 * Stop the FERPA scheduler.
 */
export function stopFerpaScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.info('[FERPA Scheduler] Stopped');
  }
}
