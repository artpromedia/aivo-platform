/**
 * Learner AI Settings Service
 *
 * Manages per-learner AI feature settings for IEP/504 accommodation support.
 * CRITICAL: Allows teachers to disable AI for specific students who need
 * human-only instruction (e.g., certain IEP accommodations, assessment conditions).
 */

import { prisma } from '../prisma.js';
import type { TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type AiDisabledReason =
  | 'IEP_ACCOMMODATION'
  | 'PLAN_504'
  | 'PARENT_REQUEST'
  | 'TEACHER_DECISION'
  | 'ADMIN_POLICY'
  | 'ASSESSMENT_MODE'
  | 'BEHAVIORAL'
  | 'OTHER';

export interface LearnerAiSettings {
  aiEnabled: boolean;
  aiDisabledReason?: string;
  disabledBy?: string;
  disabledAt?: Date;
  tutorEnabled: boolean;
  homeworkHelperEnabled: boolean;
  hintsEnabled: boolean;
  focusModeEnabled: boolean;
  recommendationsEnabled: boolean;
  temporaryDisableUntil?: Date;
}

export interface UpdateAiSettingsRequest {
  aiEnabled?: boolean;
  disabledReason?: AiDisabledReason;
  disabledReasonText?: string;
  tutorEnabled?: boolean;
  homeworkHelperEnabled?: boolean;
  hintsEnabled?: boolean;
  focusModeEnabled?: boolean;
  recommendationsEnabled?: boolean;
  temporaryDisableUntil?: Date | null;
  temporaryDisableReason?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// GET AI SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get learner AI settings.
 * Returns default (AI enabled) if no settings exist.
 */
export async function getLearnerAiSettings(
  tenantId: string,
  learnerId: string
): Promise<LearnerAiSettings> {
  const settings = await prisma.learnerAiSettings.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
  });

  // Check for temporary disable expiration
  if (settings?.temporaryDisableUntil && new Date() > settings.temporaryDisableUntil) {
    // Temporary disable has expired - treat as enabled
    return {
      aiEnabled: settings.aiEnabled,
      aiDisabledReason: settings.disabledReasonText ?? undefined,
      disabledBy: settings.disabledByUserId ?? undefined,
      disabledAt: settings.disabledAt ?? undefined,
      tutorEnabled: settings.tutorEnabled,
      homeworkHelperEnabled: settings.homeworkHelperEnabled,
      hintsEnabled: settings.hintsEnabled,
      focusModeEnabled: settings.focusModeEnabled,
      recommendationsEnabled: settings.recommendationsEnabled,
      // Expired temporary disable
      temporaryDisableUntil: undefined,
    };
  }

  if (!settings) {
    // Return default settings (AI enabled)
    return {
      aiEnabled: true,
      tutorEnabled: true,
      homeworkHelperEnabled: true,
      hintsEnabled: true,
      focusModeEnabled: true,
      recommendationsEnabled: true,
    };
  }

  // Check if temporarily disabled
  const isTemporarilyDisabled =
    settings.temporaryDisableUntil && new Date() < settings.temporaryDisableUntil;

  return {
    aiEnabled: isTemporarilyDisabled ? false : settings.aiEnabled,
    aiDisabledReason: isTemporarilyDisabled
      ? settings.temporaryDisableReason ?? 'Temporarily disabled'
      : settings.disabledReasonText ?? undefined,
    disabledBy: settings.disabledByUserId ?? undefined,
    disabledAt: settings.disabledAt ?? undefined,
    tutorEnabled: settings.tutorEnabled,
    homeworkHelperEnabled: settings.homeworkHelperEnabled,
    hintsEnabled: settings.hintsEnabled,
    focusModeEnabled: settings.focusModeEnabled,
    recommendationsEnabled: settings.recommendationsEnabled,
    temporaryDisableUntil: settings.temporaryDisableUntil ?? undefined,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// UPDATE AI SETTINGS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Update learner AI settings.
 * Creates settings record if it doesn't exist.
 * Logs all changes for compliance tracking.
 */
export async function updateLearnerAiSettings(
  tenantId: string,
  learnerId: string,
  data: UpdateAiSettingsRequest,
  context: TenantContext
): Promise<LearnerAiSettings> {
  // Get existing settings
  const existing = await prisma.learnerAiSettings.findUnique({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
  });

  const previousEnabled = existing?.aiEnabled ?? true;
  const newEnabled = data.aiEnabled ?? previousEnabled;

  // Determine if this is a disable or enable action
  const isDisabling = previousEnabled && !newEnabled;
  const isEnabling = !previousEnabled && newEnabled;

  const now = new Date();

  // Upsert settings
  const settings = await prisma.learnerAiSettings.upsert({
    where: {
      tenantId_learnerId: { tenantId, learnerId },
    },
    create: {
      tenantId,
      learnerId,
      aiEnabled: data.aiEnabled ?? true,
      disabledReason: data.disabledReason,
      disabledReasonText: data.disabledReasonText,
      disabledAt: isDisabling ? now : null,
      disabledByUserId: isDisabling ? context.userId : null,
      disabledByRole: isDisabling ? context.userRole : null,
      tutorEnabled: data.tutorEnabled ?? true,
      homeworkHelperEnabled: data.homeworkHelperEnabled ?? true,
      hintsEnabled: data.hintsEnabled ?? true,
      focusModeEnabled: data.focusModeEnabled ?? true,
      recommendationsEnabled: data.recommendationsEnabled ?? true,
      temporaryDisableUntil: data.temporaryDisableUntil,
      temporaryDisableReason: data.temporaryDisableReason,
      createdByUserId: context.userId,
    },
    update: {
      aiEnabled: data.aiEnabled ?? existing?.aiEnabled,
      disabledReason: isDisabling ? data.disabledReason : isEnabling ? null : existing?.disabledReason,
      disabledReasonText: isDisabling ? data.disabledReasonText : isEnabling ? null : existing?.disabledReasonText,
      disabledAt: isDisabling ? now : isEnabling ? null : existing?.disabledAt,
      disabledByUserId: isDisabling ? context.userId : isEnabling ? null : existing?.disabledByUserId,
      disabledByRole: isDisabling ? context.userRole : isEnabling ? null : existing?.disabledByRole,
      tutorEnabled: data.tutorEnabled ?? existing?.tutorEnabled,
      homeworkHelperEnabled: data.homeworkHelperEnabled ?? existing?.homeworkHelperEnabled,
      hintsEnabled: data.hintsEnabled ?? existing?.hintsEnabled,
      focusModeEnabled: data.focusModeEnabled ?? existing?.focusModeEnabled,
      recommendationsEnabled: data.recommendationsEnabled ?? existing?.recommendationsEnabled,
      temporaryDisableUntil: data.temporaryDisableUntil,
      temporaryDisableReason: data.temporaryDisableReason,
      updatedByUserId: context.userId,
    },
  });

  // Create audit log entry
  let action = 'UPDATED';
  if (isDisabling) action = 'DISABLED';
  else if (isEnabling) action = 'ENABLED';
  else if (data.temporaryDisableUntil) action = 'TEMPORARY_DISABLE';

  await prisma.learnerAiSettingsLog.create({
    data: {
      tenantId,
      learnerId,
      action,
      previousEnabled,
      newEnabled,
      reason: data.disabledReasonText ?? data.temporaryDisableReason,
      changedByUserId: context.userId,
      changedByRole: context.userRole,
      metadata: {
        disabledReason: data.disabledReason,
        temporaryDisableUntil: data.temporaryDisableUntil?.toISOString(),
        featureChanges: {
          tutorEnabled: data.tutorEnabled,
          homeworkHelperEnabled: data.homeworkHelperEnabled,
          hintsEnabled: data.hintsEnabled,
          focusModeEnabled: data.focusModeEnabled,
          recommendationsEnabled: data.recommendationsEnabled,
        },
      },
    },
  });

  return {
    aiEnabled: settings.aiEnabled,
    aiDisabledReason: settings.disabledReasonText ?? undefined,
    disabledBy: settings.disabledByUserId ?? undefined,
    disabledAt: settings.disabledAt ?? undefined,
    tutorEnabled: settings.tutorEnabled,
    homeworkHelperEnabled: settings.homeworkHelperEnabled,
    hintsEnabled: settings.hintsEnabled,
    focusModeEnabled: settings.focusModeEnabled,
    recommendationsEnabled: settings.recommendationsEnabled,
    temporaryDisableUntil: settings.temporaryDisableUntil ?? undefined,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// DISABLE AI FOR LEARNER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Disable AI for a specific learner (convenience function).
 * Use for IEP/504 accommodations or teacher decisions.
 */
export async function disableAiForLearner(
  tenantId: string,
  learnerId: string,
  reason: AiDisabledReason,
  reasonText: string,
  context: TenantContext
): Promise<LearnerAiSettings> {
  return updateLearnerAiSettings(
    tenantId,
    learnerId,
    {
      aiEnabled: false,
      disabledReason: reason,
      disabledReasonText: reasonText,
    },
    context
  );
}

/**
 * Enable AI for a specific learner (convenience function).
 */
export async function enableAiForLearner(
  tenantId: string,
  learnerId: string,
  context: TenantContext
): Promise<LearnerAiSettings> {
  return updateLearnerAiSettings(
    tenantId,
    learnerId,
    {
      aiEnabled: true,
      temporaryDisableUntil: null,
    },
    context
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TEMPORARY DISABLE (ASSESSMENT MODE)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Temporarily disable AI for a learner (e.g., during assessments).
 */
export async function temporarilyDisableAi(
  tenantId: string,
  learnerId: string,
  until: Date,
  reason: string,
  context: TenantContext
): Promise<LearnerAiSettings> {
  return updateLearnerAiSettings(
    tenantId,
    learnerId,
    {
      temporaryDisableUntil: until,
      temporaryDisableReason: reason,
    },
    context
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get AI settings for multiple learners (for class/roster views).
 */
export async function getBulkLearnerAiSettings(
  tenantId: string,
  learnerIds: string[]
): Promise<Map<string, LearnerAiSettings>> {
  const settings = await prisma.learnerAiSettings.findMany({
    where: {
      tenantId,
      learnerId: { in: learnerIds },
    },
  });

  const settingsMap = new Map<string, LearnerAiSettings>();

  // Add found settings
  for (const s of settings) {
    const isTemporarilyDisabled =
      s.temporaryDisableUntil && new Date() < s.temporaryDisableUntil;

    settingsMap.set(s.learnerId, {
      aiEnabled: isTemporarilyDisabled ? false : s.aiEnabled,
      aiDisabledReason: isTemporarilyDisabled
        ? s.temporaryDisableReason ?? 'Temporarily disabled'
        : s.disabledReasonText ?? undefined,
      disabledBy: s.disabledByUserId ?? undefined,
      disabledAt: s.disabledAt ?? undefined,
      tutorEnabled: s.tutorEnabled,
      homeworkHelperEnabled: s.homeworkHelperEnabled,
      hintsEnabled: s.hintsEnabled,
      focusModeEnabled: s.focusModeEnabled,
      recommendationsEnabled: s.recommendationsEnabled,
      temporaryDisableUntil: s.temporaryDisableUntil ?? undefined,
    });
  }

  // Add default settings for learners without records
  for (const learnerId of learnerIds) {
    if (!settingsMap.has(learnerId)) {
      settingsMap.set(learnerId, {
        aiEnabled: true,
        tutorEnabled: true,
        homeworkHelperEnabled: true,
        hintsEnabled: true,
        focusModeEnabled: true,
        recommendationsEnabled: true,
      });
    }
  }

  return settingsMap;
}

/**
 * Get audit log for a learner's AI settings changes.
 */
export async function getAiSettingsAuditLog(
  tenantId: string,
  learnerId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<{
  logs: {
    action: string;
    previousEnabled: boolean;
    newEnabled: boolean;
    reason: string | null;
    changedBy: string;
    changedByRole: string;
    changedAt: Date;
  }[];
  total: number;
}> {
  const { limit = 50, offset = 0 } = options;

  const [logs, total] = await Promise.all([
    prisma.learnerAiSettingsLog.findMany({
      where: { tenantId, learnerId },
      orderBy: { changedAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.learnerAiSettingsLog.count({
      where: { tenantId, learnerId },
    }),
  ]);

  return {
    logs: logs.map((log) => ({
      action: log.action,
      previousEnabled: log.previousEnabled,
      newEnabled: log.newEnabled,
      reason: log.reason,
      changedBy: log.changedByUserId,
      changedByRole: log.changedByRole,
      changedAt: log.changedAt,
    })),
    total,
  };
}
