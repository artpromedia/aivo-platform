/**
 * Scheduled Export Service — Recurring data export schedules.
 *
 * Extends the existing ScheduledReport model to support bulk data export
 * schedules alongside enterprise PDF/HTML reports.
 *
 * Uses the ScheduledReport model with deliveryMethod = 'export' convention
 * and stores export-specific params in the `parameters` JSON column.
 */

import { prisma } from '../prisma.js';
import { createExportJob, processExportJob } from './data-export.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateScheduledExportInput {
  tenantId: string;
  createdBy: string;
  exportType: string;
  format: 'csv' | 'excel' | 'json';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  time?: string;
  timezone?: string;
  recipients: string[];
  filters?: Record<string, unknown>;
  emailSubject?: string;
  emailMessage?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a scheduled export using the existing ScheduledReport model.
 * We store the export type in parameters.exportType and set
 * deliveryMethod to differentiate from standard reports.
 */
export async function createScheduledExport(input: CreateScheduledExportInput) {
  const nextRunAt = computeNextRun(
    input.frequency,
    input.time ?? '06:00',
    input.timezone ?? 'America/New_York',
    input.dayOfWeek,
    input.dayOfMonth
  );

  return prisma.scheduledReport.create({
    data: {
      tenantId: input.tenantId,
      createdBy: input.createdBy,
      // Re-use an existing ReportType; 'district_dashboard' is the closest
      // generic bucket for data-warehouse exports.
      type: 'district_dashboard' as never,
      format: (input.format === 'excel' ? 'excel' : input.format) as never,
      frequency: input.frequency as never,
      dayOfWeek: input.dayOfWeek,
      dayOfMonth: input.dayOfMonth,
      time: input.time ?? '06:00',
      timezone: input.timezone ?? 'America/New_York',
      nextRunAt,
      recipients: input.recipients,
      emailSubject: input.emailSubject,
      emailMessage: input.emailMessage,
      deliveryMethod: 'email',
      parameters: {
        isExport: true,
        exportType: input.exportType,
        filters: input.filters ?? {},
      },
    },
  });
}

/**
 * List scheduled exports for a tenant (those with isExport=true in params).
 */
export async function listScheduledExports(
  tenantId: string,
  opts: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = opts;

  const all = await prisma.scheduledReport.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // Filter to export schedules (isExport flag in parameters JSON)
  const exports = all.filter((s) => {
    const params = s.parameters as Record<string, unknown>;
    return params?.isExport === true;
  });

  return { schedules: exports, total: exports.length, limit, offset };
}

/**
 * Get a single scheduled export by ID.
 */
export async function getScheduledExport(tenantId: string, id: string) {
  const sched = await prisma.scheduledReport.findFirst({
    where: { id, tenantId },
  });
  if (!sched) return null;
  const params = sched.parameters as Record<string, unknown>;
  if (!params?.isExport) return null;
  return sched;
}

/**
 * Update schedule (frequency, time, recipients, filters, status).
 */
export async function updateScheduledExport(
  tenantId: string,
  id: string,
  updates: Partial<{
    frequency: string;
    dayOfWeek: number;
    dayOfMonth: number;
    time: string;
    timezone: string;
    recipients: string[];
    filters: Record<string, unknown>;
    status: string;
  }>
) {
  const existing = await getScheduledExport(tenantId, id);
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (updates.frequency) data.frequency = updates.frequency;
  if (updates.dayOfWeek !== undefined) data.dayOfWeek = updates.dayOfWeek;
  if (updates.dayOfMonth !== undefined) data.dayOfMonth = updates.dayOfMonth;
  if (updates.time) data.time = updates.time;
  if (updates.timezone) data.timezone = updates.timezone;
  if (updates.recipients) data.recipients = updates.recipients;
  if (updates.status) data.status = updates.status;

  if (updates.filters) {
    const existingParams = existing.parameters as Record<string, unknown>;
    data.parameters = { ...existingParams, filters: updates.filters };
  }

  // Recompute next run if schedule config changed
  if (updates.frequency || updates.time || updates.dayOfWeek !== undefined || updates.dayOfMonth !== undefined) {
    data.nextRunAt = computeNextRun(
      (updates.frequency ?? existing.frequency) as string,
      (updates.time ?? existing.time) as string,
      (updates.timezone ?? existing.timezone) as string,
      updates.dayOfWeek ?? existing.dayOfWeek ?? undefined,
      updates.dayOfMonth ?? existing.dayOfMonth ?? undefined
    );
  }

  return prisma.scheduledReport.update({
    where: { id },
    data: data as never,
  });
}

/**
 * Delete a scheduled export.
 */
export async function deleteScheduledExport(tenantId: string, id: string) {
  const existing = await getScheduledExport(tenantId, id);
  if (!existing) return false;
  await prisma.scheduledReport.delete({ where: { id } });
  return true;
}

/**
 * Run a single scheduled export immediately (ad-hoc trigger).
 */
export async function runScheduledExportNow(tenantId: string, id: string, token: string) {
  const sched = await getScheduledExport(tenantId, id);
  if (!sched) return null;

  const params = sched.parameters as Record<string, unknown>;

  const job = await createExportJob({
    tenantId: sched.tenantId,
    requestedBy: sched.createdBy,
    exportType: params.exportType as string,
    format: sched.format as 'csv' | 'excel' | 'json',
    filters: (params.filters as Record<string, unknown>) ?? {},
    deliveryMethod: 'email',
    deliveryTarget: sched.recipients[0],
  });

  // Process in background
  processExportJob(job.id, token).catch((err) =>
    console.error(`Scheduled export run failed: ${id}`, err)
  );

  // Update schedule metadata
  await prisma.scheduledReport.update({
    where: { id },
    data: {
      lastRunAt: new Date(),
      runCount: { increment: 1 },
      nextRunAt: computeNextRun(
        sched.frequency,
        sched.time,
        sched.timezone,
        sched.dayOfWeek ?? undefined,
        sched.dayOfMonth ?? undefined
      ),
    },
  });

  return job;
}

/**
 * Cron-like runner: find all active scheduled exports where nextRunAt <= now
 * and trigger them. Call this from a setInterval (e.g., every 15 minutes).
 */
export async function runDueScheduledExports(systemToken: string) {
  const now = new Date();

  const due = await prisma.scheduledReport.findMany({
    where: {
      status: 'active' as never,
      nextRunAt: { lte: now },
    },
  });

  // Filter to export schedules only
  const exportSchedules = due.filter((s) => {
    const p = s.parameters as Record<string, unknown>;
    return p?.isExport === true;
  });

  console.log(`[ScheduledExports] ${exportSchedules.length} due export schedule(s) found`);

  for (const sched of exportSchedules) {
    try {
      await runScheduledExportNow(sched.tenantId, sched.id, systemToken);
    } catch (err) {
      console.error(`[ScheduledExports] Failed to run schedule ${sched.id}:`, err);
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEDULE HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the next execution time for a schedule.
 */
function computeNextRun(
  frequency: string,
  time: string,
  _timezone: string, // stored but we use UTC internally
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hours, minutes, 0, 0);

  // If the computed time is in the past, advance by one period
  if (next <= now) {
    switch (frequency) {
      case 'daily':
        next.setUTCDate(next.getUTCDate() + 1);
        break;
      case 'weekly':
        next.setUTCDate(next.getUTCDate() + 7);
        break;
      case 'monthly':
        next.setUTCMonth(next.getUTCMonth() + 1);
        break;
      case 'quarterly':
        next.setUTCMonth(next.getUTCMonth() + 3);
        break;
    }
  }

  // Adjust for day-of-week (weekly schedules)
  if (frequency === 'weekly' && dayOfWeek !== undefined) {
    const currentDay = next.getUTCDay();
    const diff = (dayOfWeek - currentDay + 7) % 7;
    if (diff > 0) next.setUTCDate(next.getUTCDate() + diff);
  }

  // Adjust for day-of-month
  if ((frequency === 'monthly' || frequency === 'quarterly') && dayOfMonth !== undefined) {
    next.setUTCDate(Math.min(dayOfMonth, 28)); // cap at 28 to avoid rollover
  }

  return next;
}
