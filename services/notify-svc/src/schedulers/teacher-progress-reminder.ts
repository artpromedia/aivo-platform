/**
 * Teacher Progress Reminder Scheduler
 *
 * Sends a Monday-morning reminder email to teachers who have students
 * with IEP goals that haven't been updated in the past 7 days.
 *
 * PRD: "Monday reminder emails for teachers with stale progress data."
 *
 * Schedule: Checks every hour; on Mondays between 6-8 AM (tenant local time,
 * default UTC), sends reminder emails via the email service.
 */

import { sendTemplatedEmail } from '../channels/email/email.service.js';
import type { EmailTemplateContext } from '../channels/email/types.js';

// ============================================================================
// Types
// ============================================================================

interface TeacherRecord {
  email: string;
  name: string;
  teacherId: string;
  locale?: string;
}

interface StaleGoalSummary {
  studentName: string;
  goalDomain: string;
  lastUpdated: string;
  daysSinceUpdate: number;
}

interface TenantConfig {
  tenantId: string;
  districtName: string;
  domain: string;
  timezone: string;
}

// ============================================================================
// State
// ============================================================================

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

/** Track which teachers have already been notified this week */
const weeklyRemindersSent = new Map<string, Date>();

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get ISO week number to dedup within the same week.
 */
function getISOWeek(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 4);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNo}`;
}

function reminderKey(tenantId: string, teacherId: string, week: string): string {
  return `${tenantId}::${teacherId}::${week}`;
}

function alreadySentThisWeek(tenantId: string, teacherId: string): boolean {
  const week = getISOWeek();
  return weeklyRemindersSent.has(reminderKey(tenantId, teacherId, week));
}

function markSent(tenantId: string, teacherId: string): void {
  const week = getISOWeek();
  weeklyRemindersSent.set(reminderKey(tenantId, teacherId, week), new Date());

  // Cleanup old entries (older than 2 weeks)
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  for (const [key, date] of weeklyRemindersSent) {
    if (date.getTime() < cutoff) {
      weeklyRemindersSent.delete(key);
    }
  }
}

/**
 * Check if it's Monday morning (6-8 AM) in the given timezone.
 */
function isMondayMorning(timezone: string): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === 'weekday')?.value;
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0');

    return weekday === 'Monday' && hour >= 6 && hour < 8;
  } catch {
    // Fallback to UTC if timezone is invalid
    const now = new Date();
    return now.getUTCDay() === 1 && now.getUTCHours() >= 6 && now.getUTCHours() < 8;
  }
}

// ============================================================================
// Data Queries
// ============================================================================

/**
 * Fetch active tenants with their timezone configuration.
 */
async function getActiveTenants(): Promise<TenantConfig[]> {
  try {
    const { prisma } = await import('../prisma.js');

    const tenants = await (prisma as any).tenant.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        domain: true,
        timezone: true,
      },
    });

    return tenants.map((t: any) => ({
      tenantId: t.id,
      districtName: t.name || 'Your District',
      domain: t.domain || 'app.aivo.com',
      timezone: t.timezone || 'America/New_York',
    }));
  } catch (error) {
    console.error('[Teacher Reminder] Failed to fetch tenants:', error);
    return [];
  }
}

/**
 * Fetch teachers who have students with goals not updated in 7+ days.
 */
async function getTeachersWithStaleGoals(
  tenantId: string
): Promise<{ teacher: TeacherRecord; staleGoals: StaleGoalSummary[] }[]> {
  try {
    const { prisma } = await import('../prisma.js');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find IEP goals with no progress data in the last 7 days
    // that are assigned to active teachers
    const staleGoals = await (prisma as any).iEPGoal.findMany({
      where: {
        iep: { tenantId },
        status: 'ACTIVE',
        OR: [
          { progressData: { none: {} } },
          {
            progressData: {
              every: { recordDate: { lt: sevenDaysAgo } },
            },
          },
        ],
      },
      select: {
        id: true,
        domain: true,
        iep: {
          select: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
            assignedTeacherId: true,
          },
        },
        progressData: {
          orderBy: { recordDate: 'desc' as const },
          take: 1,
          select: { recordDate: true },
        },
      },
    });

    // Group by teacher
    const teacherGoals = new Map<string, { staleGoals: StaleGoalSummary[] }>();

    for (const goal of staleGoals) {
      const teacherId = goal.iep?.assignedTeacherId;
      if (!teacherId) continue;

      const lastUpdated = goal.progressData?.[0]?.recordDate;
      const daysSince = lastUpdated
        ? Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (24 * 60 * 60 * 1000))
        : 999; // Never updated

      const summary: StaleGoalSummary = {
        studentName: `${goal.iep.student?.firstName || ''} ${goal.iep.student?.lastName || ''}`.trim(),
        goalDomain: goal.domain || 'General',
        lastUpdated: lastUpdated ? new Date(lastUpdated).toLocaleDateString() : 'Never',
        daysSinceUpdate: daysSince,
      };

      if (!teacherGoals.has(teacherId)) {
        teacherGoals.set(teacherId, { staleGoals: [] });
      }
      teacherGoals.get(teacherId)!.staleGoals.push(summary);
    }

    // Fetch teacher info
    const teacherIds = Array.from(teacherGoals.keys());
    if (teacherIds.length === 0) return [];

    const teachers = await (prisma as any).user.findMany({
      where: {
        id: { in: teacherIds },
        tenantId,
        active: true,
        role: 'teacher',
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        locale: true,
      },
    });

    return teachers.map((t: any) => ({
      teacher: {
        teacherId: t.id,
        email: t.email,
        name: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Teacher',
        locale: t.locale,
      },
      staleGoals: teacherGoals.get(t.id)?.staleGoals || [],
    }));
  } catch (error) {
    console.error(`[Teacher Reminder] Failed to fetch stale goals for tenant ${tenantId}:`, error);
    return [];
  }
}

// ============================================================================
// Email Sending
// ============================================================================

/**
 * Send a progress reminder email to a single teacher.
 */
async function sendTeacherReminder(
  teacher: TeacherRecord,
  staleGoals: StaleGoalSummary[],
  tenant: TenantConfig,
): Promise<boolean> {
  try {
    // Build a summary table for the email
    const goalLines = staleGoals
      .slice(0, 10) // Cap at 10 to avoid huge emails
      .map((g) => `• ${g.studentName} — ${g.goalDomain} (last updated: ${g.lastUpdated})`)
      .join('\n');

    const additionalCount = staleGoals.length > 10 ? staleGoals.length - 10 : 0;

    const context: EmailTemplateContext = {
      appName: 'AIVO',
      appUrl: `https://${tenant.domain}`,
      supportEmail: `support@${tenant.domain}`,
      currentYear: new Date().getFullYear(),
      recipientName: teacher.name,
      subject: `Weekly Progress Reminder: ${staleGoals.length} goal(s) need attention`,
      heading: 'IEP Progress Update Reminder',
      bodyText: [
        `Hi ${teacher.name},`,
        '',
        `You have ${staleGoals.length} IEP goal(s) that haven't been updated in the past 7 days:`,
        '',
        goalLines,
        ...(additionalCount > 0 ? [`\n...and ${additionalCount} more.`] : []),
        '',
        'Regular progress data helps parents stay informed and ensures compliance with IDEA reporting requirements.',
        '',
        `Log in to update progress: https://${tenant.domain}/progress`,
      ].join('\n'),
    };

    await sendTemplatedEmail({
      templateName: 'teacher-progress-reminder',
      to: teacher.email,
      context,
      locale: (teacher.locale as any) || 'en',
      category: 'progress-reminder',
      tags: ['teacher-reminder', 'weekly-progress'],
    });

    return true;
  } catch (error) {
    console.error(
      `[Teacher Reminder] Failed to send to ${teacher.email} (tenant: ${tenant.tenantId}):`,
      error
    );
    return false;
  }
}

// ============================================================================
// Scheduler Core
// ============================================================================

/**
 * Main scheduler tick — runs hourly.
 */
async function runSchedulerTick(): Promise<void> {
  try {
    const tenants = await getActiveTenants();

    for (const tenant of tenants) {
      // Only send on Monday mornings in the tenant's timezone
      if (!isMondayMorning(tenant.timezone)) {
        continue;
      }

      const teachersWithStale = await getTeachersWithStaleGoals(tenant.tenantId);
      let sentCount = 0;

      for (const { teacher, staleGoals } of teachersWithStale) {
        if (staleGoals.length === 0) continue;
        if (alreadySentThisWeek(tenant.tenantId, teacher.teacherId)) continue;

        const sent = await sendTeacherReminder(teacher, staleGoals, tenant);
        if (sent) {
          markSent(tenant.tenantId, teacher.teacherId);
          sentCount++;
        }
      }

      if (sentCount > 0) {
        console.log(
          `[Teacher Reminder] Sent ${sentCount} reminder(s) for tenant ${tenant.tenantId} (${tenant.districtName})`
        );
      }
    }
  } catch (error) {
    console.error('[Teacher Reminder] Scheduler tick failed:', error);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Start the teacher progress reminder scheduler.
 * Runs every hour to check for Monday morning in each tenant's timezone.
 */
export function startTeacherReminderScheduler(
  intervalMs: number = 60 * 60 * 1000 // 1 hour
): void {
  if (schedulerInterval) {
    console.warn('[Teacher Reminder] Scheduler already running');
    return;
  }

  console.log('[Teacher Reminder] Starting scheduler (interval: hourly)');
  schedulerInterval = setInterval(() => {
    void runSchedulerTick();
  }, intervalMs);

  // Run immediately on startup to catch any pending reminders
  void runSchedulerTick();
}

/**
 * Stop the teacher progress reminder scheduler.
 */
export function stopTeacherReminderScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Teacher Reminder] Scheduler stopped');
  }
}
