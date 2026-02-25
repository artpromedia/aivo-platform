// ════════════════════════════════════════════════════════════════
// Cron Scheduler — schedules evidence collectors
// ════════════════════════════════════════════════════════════════

import cron from 'node-cron';
import type { PrismaClient } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { COLLECTORS } from '../control-registry.js';
import { runCollector, getCollectorFn } from './collector-runner.js';
import type { CollectionFrequency } from '../types.js';

/** Map schedule frequency → cron expression */
const SCHEDULE_CRONS: Record<CollectionFrequency, string> = {
  daily: '0 2 * * *',           // 02:00 UTC daily
  weekly: '0 3 * * 1',          // 03:00 UTC Monday
  monthly: '0 4 1 * *',         // 04:00 UTC 1st of month
  quarterly: '0 5 1 1,4,7,10 *', // 05:00 UTC 1st of Q
  annual: '0 6 1 1 *',          // 06:00 UTC Jan 1
};

const jobs: cron.ScheduledTask[] = [];

export async function startScheduler(
  prisma: PrismaClient,
  log: FastifyInstance['log'],
): Promise<void> {
  // Seed schedules from registry if not already in DB
  for (const collector of COLLECTORS) {
    if (!collector.enabled) continue;

    const existing = await prisma.collectorSchedule.findUnique({
      where: { collectorId: collector.id },
    });

    if (!existing) {
      await prisma.collectorSchedule.create({
        data: {
          collectorId: collector.id,
          cronExpr: SCHEDULE_CRONS[collector.schedule],
          enabled: true,
        },
      });
    }
  }

  // Load schedules and start cron tasks
  const schedules = await prisma.collectorSchedule.findMany({
    where: { enabled: true },
  });

  for (const schedule of schedules) {
    if (!getCollectorFn(schedule.collectorId)) {
      log.warn(`No implementation for collector ${schedule.collectorId} — skipping schedule`);
      continue;
    }

    const task = cron.schedule(schedule.cronExpr, async () => {
      log.info(`[scheduler] Running collector: ${schedule.collectorId}`);
      try {
        const result = await runCollector(prisma, {
          collectorId: schedule.collectorId,
          triggeredBy: 'scheduled',
        });
        log.info(`[scheduler] ${schedule.collectorId} completed — ${result.evidenceCount} artifacts`);
      } catch (err) {
        log.error(`[scheduler] ${schedule.collectorId} failed: ${(err as Error).message}`);
      }
    });

    jobs.push(task);
    log.info(`[scheduler] Scheduled ${schedule.collectorId}: ${schedule.cronExpr}`);
  }
}

export function stopScheduler(): void {
  for (const job of jobs) {
    job.stop();
  }
  jobs.length = 0;
}
