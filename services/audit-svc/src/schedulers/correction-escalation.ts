/**
 * AIVO Audit Service - Correction Request Escalation Scheduler
 *
 * PRD: FERPA requires a 45-day response deadline for correction requests.
 * This scheduler runs daily to:
 *   - At 40 days: Auto-escalate PENDING requests to UNDER_REVIEW
 *   - At 45 days: Mark unresolved requests as overdue
 */

import { processCorrectionsEscalation } from '../services/correctionService.js';

const ESCALATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Run the escalation check once (useful for testing or manual triggers).
 */
export async function runEscalationCheck(logger?: { info: (...args: any[]) => void; error: (...args: any[]) => void }): Promise<{
  escalated: number;
  overdue: number;
}> {
  const log = logger ?? console;
  try {
    const result = await processCorrectionsEscalation();
    if (result.escalated > 0 || result.overdue > 0) {
      log.info(
        { escalated: result.escalated, overdue: result.overdue },
        'FERPA correction escalation processed',
      );
    }
    return result;
  } catch (err) {
    log.error({ err }, 'Failed to process correction escalations');
    return { escalated: 0, overdue: 0 };
  }
}

/**
 * Start the daily escalation scheduler.
 * Runs immediately on startup, then every 24 hours.
 */
export function startEscalationScheduler(logger?: { info: (...args: any[]) => void; error: (...args: any[]) => void }): void {
  const log = logger ?? console;
  log.info('Starting FERPA correction escalation scheduler (runs every 24h)');

  // Run immediately on startup
  void runEscalationCheck(logger);

  // Then run every 24 hours
  intervalHandle = setInterval(() => {
    void runEscalationCheck(logger);
  }, ESCALATION_INTERVAL_MS);
}

/**
 * Stop the escalation scheduler (for graceful shutdown).
 */
export function stopEscalationScheduler(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
