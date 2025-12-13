/**
 * Focus State Repository
 *
 * Persistent storage for learner focus states, pings, and interventions.
 */

import { prisma, FocusState, InterventionType, FocusLossReason } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// LEARNER FOCUS STATE
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusStateUpdate {
  currentState?: FocusState;
  sessionId?: string | null;
  focusScore?: number;
  consecutiveFocusedPings?: number;
  consecutiveDistractedPings?: number;
  lastBreakAt?: Date;
  breaksTakenToday?: number;
  lastPingAt?: Date;
  lastInteractionAt?: Date;
}

/**
 * Get or create learner focus state
 */
export async function getOrCreateFocusState(tenantId: string, learnerId: string) {
  const now = new Date();

  const state = await prisma.learnerFocusState.upsert({
    where: { learnerId },
    update: {}, // Just return existing
    create: {
      tenantId,
      learnerId,
      currentState: 'FOCUSED',
      focusScore: 1.0,
      consecutiveFocusedPings: 0,
      consecutiveDistractedPings: 0,
      breaksTakenToday: 0,
      lastPingAt: now,
      lastInteractionAt: now,
    },
  });

  return state;
}

/**
 * Update learner focus state
 */
export async function updateFocusState(
  learnerId: string,
  update: FocusStateUpdate
) {
  const state = await prisma.learnerFocusState.update({
    where: { learnerId },
    data: {
      ...(update.currentState !== undefined && { currentState: update.currentState }),
      ...(update.sessionId !== undefined && { sessionId: update.sessionId }),
      ...(update.focusScore !== undefined && { focusScore: update.focusScore }),
      ...(update.consecutiveFocusedPings !== undefined && {
        consecutiveFocusedPings: update.consecutiveFocusedPings,
      }),
      ...(update.consecutiveDistractedPings !== undefined && {
        consecutiveDistractedPings: update.consecutiveDistractedPings,
      }),
      ...(update.lastBreakAt !== undefined && { lastBreakAt: update.lastBreakAt }),
      ...(update.breaksTakenToday !== undefined && { breaksTakenToday: update.breaksTakenToday }),
      ...(update.lastPingAt !== undefined && { lastPingAt: update.lastPingAt }),
      ...(update.lastInteractionAt !== undefined && { lastInteractionAt: update.lastInteractionAt }),
    },
  });

  return state;
}

/**
 * Reset daily break count (called at start of new day)
 */
export async function resetDailyBreakCount(learnerId: string) {
  return prisma.learnerFocusState.update({
    where: { learnerId },
    data: { breaksTakenToday: 0 },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// FOCUS PING LOGGING
// ══════════════════════════════════════════════════════════════════════════════

export interface FocusPingData {
  tenantId: string;
  learnerId: string;
  sessionId: string;
  focusScore: number;
  isOnTask: boolean;
  activityId?: string;
  focusLossDetected: boolean;
  lossReasons: FocusLossReason[];
  idleTimeMs?: number;
  interactionCount?: number;
  errorCount?: number;
}

/**
 * Log a focus ping
 */
export async function logFocusPing(data: FocusPingData) {
  return prisma.focusPingLog.create({
    data: {
      tenantId: data.tenantId,
      learnerId: data.learnerId,
      sessionId: data.sessionId,
      focusScore: data.focusScore,
      isOnTask: data.isOnTask,
      activityId: data.activityId,
      focusLossDetected: data.focusLossDetected,
      lossReasons: data.lossReasons,
      idleTimeMs: data.idleTimeMs,
      interactionCount: data.interactionCount ?? 0,
      errorCount: data.errorCount ?? 0,
    },
  });
}

/**
 * Get recent pings for a session
 */
export async function getRecentPings(sessionId: string, limit: number = 10) {
  return prisma.focusPingLog.findMany({
    where: { sessionId },
    orderBy: { recordedAt: 'desc' },
    take: limit,
  });
}

/**
 * Get focus ping stats for a session
 */
export async function getSessionFocusStats(sessionId: string) {
  const stats = await prisma.focusPingLog.aggregate({
    where: { sessionId },
    _avg: { focusScore: true },
    _count: { id: true },
    _sum: { interactionCount: true, errorCount: true },
  });

  const focusLossCount = await prisma.focusPingLog.count({
    where: { sessionId, focusLossDetected: true },
  });

  return {
    totalPings: stats._count.id,
    avgFocusScore: stats._avg.focusScore,
    totalInteractions: stats._sum.interactionCount ?? 0,
    totalErrors: stats._sum.errorCount ?? 0,
    focusLossEvents: focusLossCount,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERVENTIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateInterventionData {
  tenantId: string;
  learnerId: string;
  sessionId: string;
  interventionType: InterventionType;
  triggerReasons: FocusLossReason[];
  focusScoreBefore?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Create a new intervention record
 */
export async function createIntervention(data: CreateInterventionData) {
  return prisma.focusIntervention.create({
    data: {
      tenantId: data.tenantId,
      learnerId: data.learnerId,
      sessionId: data.sessionId,
      interventionType: data.interventionType,
      triggerReasons: data.triggerReasons,
      focusScoreBefore: data.focusScoreBefore,
      metadataJson: data.metadata ?? {},
    },
  });
}

/**
 * Mark intervention as acknowledged
 */
export async function acknowledgeIntervention(interventionId: string) {
  return prisma.focusIntervention.update({
    where: { id: interventionId },
    data: { acknowledgedAt: new Date() },
  });
}

/**
 * Complete an intervention with outcome
 */
export async function completeIntervention(
  interventionId: string,
  outcome: {
    wasAccepted: boolean;
    focusScoreAfter?: number;
    regulationActivityId?: string;
    regulationDurationMs?: number;
  }
) {
  return prisma.focusIntervention.update({
    where: { id: interventionId },
    data: {
      completedAt: new Date(),
      wasAccepted: outcome.wasAccepted,
      focusScoreAfter: outcome.focusScoreAfter,
      regulationActivityId: outcome.regulationActivityId,
      regulationDurationMs: outcome.regulationDurationMs,
    },
  });
}

/**
 * Get intervention stats for a learner
 */
export async function getLearnerInterventionStats(
  tenantId: string,
  learnerId: string,
  fromDate: Date,
  toDate: Date
) {
  const interventions = await prisma.focusIntervention.groupBy({
    by: ['interventionType'],
    where: {
      tenantId,
      learnerId,
      triggeredAt: { gte: fromDate, lte: toDate },
    },
    _count: { id: true },
  });

  const acceptedCount = await prisma.focusIntervention.count({
    where: {
      tenantId,
      learnerId,
      triggeredAt: { gte: fromDate, lte: toDate },
      wasAccepted: true,
    },
  });

  return {
    byType: interventions.reduce(
      (acc, i) => {
        acc[i.interventionType] = i._count.id;
        return acc;
      },
      {} as Record<string, number>
    ),
    total: interventions.reduce((sum, i) => sum + i._count.id, 0),
    acceptedCount,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// BREAK SESSIONS
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateBreakData {
  tenantId: string;
  learnerId: string;
  sessionId: string;
  breakType: 'scheduled' | 'regulation' | 'user_initiated';
  suggestedActivityId?: string;
  preFocusScore?: number;
}

/**
 * Start a break session
 */
export async function startBreak(data: CreateBreakData) {
  return prisma.breakSession.create({
    data: {
      tenantId: data.tenantId,
      learnerId: data.learnerId,
      sessionId: data.sessionId,
      breakType: data.breakType,
      suggestedActivityId: data.suggestedActivityId,
      preFocusScore: data.preFocusScore,
    },
  });
}

/**
 * End a break session
 */
export async function endBreak(
  breakId: string,
  outcome: {
    postFocusScore?: number;
    activityCompleted?: boolean;
  }
) {
  const breakSession = await prisma.breakSession.findUnique({
    where: { id: breakId },
  });

  if (!breakSession) {
    return null;
  }

  const endedAt = new Date();
  const durationMs = endedAt.getTime() - breakSession.startedAt.getTime();

  const wasEffective =
    outcome.postFocusScore !== undefined && breakSession.preFocusScore !== undefined
      ? outcome.postFocusScore > breakSession.preFocusScore
      : null;

  return prisma.breakSession.update({
    where: { id: breakId },
    data: {
      endedAt,
      durationMs,
      postFocusScore: outcome.postFocusScore,
      activityCompleted: outcome.activityCompleted ?? false,
      wasEffective,
    },
  });
}

/**
 * Get break stats for a session
 */
export async function getSessionBreakStats(sessionId: string) {
  const breaks = await prisma.breakSession.findMany({
    where: { sessionId },
    orderBy: { startedAt: 'asc' },
  });

  const completedBreaks = breaks.filter((b) => b.endedAt !== null);

  return {
    totalBreaks: breaks.length,
    completedBreaks: completedBreaks.length,
    totalBreakDurationMs: completedBreaks.reduce((sum, b) => sum + (b.durationMs ?? 0), 0),
    effectiveBreaks: completedBreaks.filter((b) => b.wasEffective === true).length,
    activitiesCompleted: completedBreaks.filter((b) => b.activityCompleted).length,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DAILY SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

export interface DailySummaryUpdate {
  totalSessionsCount?: number;
  totalSessionDurationMs?: bigint;
  avgFocusScore?: number;
  focusedTimeMs?: bigint;
  distractedTimeMs?: bigint;
  interventionCount?: number;
  breaksCount?: number;
  regulationActivitiesCount?: number;
  totalPings?: number;
  focusLossEvents?: number;
  focusRatio?: number;
}

/**
 * Upsert daily focus summary
 */
export async function upsertDailySummary(
  tenantId: string,
  learnerId: string,
  date: Date,
  update: DailySummaryUpdate
) {
  // Normalize date to start of day
  const normalizedDate = new Date(date);
  normalizedDate.setHours(0, 0, 0, 0);

  return prisma.dailyFocusSummary.upsert({
    where: {
      tenantId_learnerId_date: {
        tenantId,
        learnerId,
        date: normalizedDate,
      },
    },
    update: {
      ...(update.totalSessionsCount !== undefined && {
        totalSessionsCount: { increment: update.totalSessionsCount },
      }),
      ...(update.totalSessionDurationMs !== undefined && {
        totalSessionDurationMs: { increment: update.totalSessionDurationMs },
      }),
      ...(update.avgFocusScore !== undefined && { avgFocusScore: update.avgFocusScore }),
      ...(update.focusedTimeMs !== undefined && {
        focusedTimeMs: { increment: update.focusedTimeMs },
      }),
      ...(update.distractedTimeMs !== undefined && {
        distractedTimeMs: { increment: update.distractedTimeMs },
      }),
      ...(update.interventionCount !== undefined && {
        interventionCount: { increment: update.interventionCount },
      }),
      ...(update.breaksCount !== undefined && {
        breaksCount: { increment: update.breaksCount },
      }),
      ...(update.regulationActivitiesCount !== undefined && {
        regulationActivitiesCount: { increment: update.regulationActivitiesCount },
      }),
      ...(update.totalPings !== undefined && {
        totalPings: { increment: update.totalPings },
      }),
      ...(update.focusLossEvents !== undefined && {
        focusLossEvents: { increment: update.focusLossEvents },
      }),
      ...(update.focusRatio !== undefined && { focusRatio: update.focusRatio }),
    },
    create: {
      tenantId,
      learnerId,
      date: normalizedDate,
      totalSessionsCount: update.totalSessionsCount ?? 0,
      totalSessionDurationMs: update.totalSessionDurationMs ?? BigInt(0),
      avgFocusScore: update.avgFocusScore,
      focusedTimeMs: update.focusedTimeMs ?? BigInt(0),
      distractedTimeMs: update.distractedTimeMs ?? BigInt(0),
      interventionCount: update.interventionCount ?? 0,
      breaksCount: update.breaksCount ?? 0,
      regulationActivitiesCount: update.regulationActivitiesCount ?? 0,
      totalPings: update.totalPings ?? 0,
      focusLossEvents: update.focusLossEvents ?? 0,
      focusRatio: update.focusRatio,
    },
  });
}

/**
 * Get daily summaries for date range
 */
export async function getDailySummaries(
  tenantId: string,
  learnerId: string,
  fromDate: Date,
  toDate: Date
) {
  return prisma.dailyFocusSummary.findMany({
    where: {
      tenantId,
      learnerId,
      date: { gte: fromDate, lte: toDate },
    },
    orderBy: { date: 'asc' },
  });
}

/**
 * Calculate focus ratio for a summary
 */
export function calculateFocusRatio(focusedTimeMs: bigint, totalTimeMs: bigint): number {
  if (totalTimeMs === BigInt(0)) return 1.0;
  return Number(focusedTimeMs) / Number(totalTimeMs);
}
