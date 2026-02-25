import { prisma } from './prisma.js';

// ─── Onboarding Progress ─────────────────────────────────────────────────────

export async function getProgress(userId: string, flowId: string) {
  return prisma.onboardingProgress.findUnique({
    where: { user_flow: { userId, flowId } },
  });
}

export async function getAllProgress(userId: string) {
  return prisma.onboardingProgress.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
  });
}

export async function upsertProgress(
  userId: string,
  tenantId: string,
  flowId: string,
) {
  return prisma.onboardingProgress.upsert({
    where: { user_flow: { userId, flowId } },
    create: {
      userId,
      tenantId,
      flowId,
      completedSteps: [],
      skippedSteps: [],
      currentStepId: null,
      dismissed: false,
    },
    update: {},
  });
}

export async function completeStep(
  userId: string,
  tenantId: string,
  flowId: string,
  stepId: string,
) {
  const record = await upsertProgress(userId, tenantId, flowId);

  const completedSteps = record.completedSteps.includes(stepId)
    ? record.completedSteps
    : [...record.completedSteps, stepId];

  // Remove from skipped if previously skipped
  const skippedSteps = record.skippedSteps.filter((s) => s !== stepId);

  return prisma.onboardingProgress.update({
    where: { id: record.id },
    data: {
      completedSteps,
      skippedSteps,
      updatedAt: new Date(),
    },
  });
}

export async function skipStep(
  userId: string,
  tenantId: string,
  flowId: string,
  stepId: string,
) {
  const record = await upsertProgress(userId, tenantId, flowId);

  const skippedSteps = record.skippedSteps.includes(stepId)
    ? record.skippedSteps
    : [...record.skippedSteps, stepId];

  return prisma.onboardingProgress.update({
    where: { id: record.id },
    data: {
      skippedSteps,
      updatedAt: new Date(),
    },
  });
}

export async function dismissFlow(userId: string, flowId: string) {
  const record = await prisma.onboardingProgress.findUnique({
    where: { user_flow: { userId, flowId } },
  });
  if (!record) return null;

  return prisma.onboardingProgress.update({
    where: { id: record.id },
    data: { dismissed: true, updatedAt: new Date() },
  });
}

export async function resetFlow(
  userId: string,
  tenantId: string,
  flowId: string,
) {
  const record = await prisma.onboardingProgress.findUnique({
    where: { user_flow: { userId, flowId } },
  });
  if (!record) {
    return upsertProgress(userId, tenantId, flowId);
  }

  return prisma.onboardingProgress.update({
    where: { id: record.id },
    data: {
      completedSteps: [],
      skippedSteps: [],
      currentStepId: null,
      completedAt: null,
      dismissed: false,
      updatedAt: new Date(),
    },
  });
}

// ─── Feature Seen ─────────────────────────────────────────────────────────────

export async function markFeatureSeen(
  userId: string,
  tenantId: string,
  featureKey: string,
) {
  return prisma.featureSeen.upsert({
    where: { user_feature: { userId, featureKey } },
    create: { userId, tenantId, featureKey },
    update: {},
  });
}

export async function checkFeaturesSeen(
  userId: string,
  featureKeys: string[],
) {
  const seen = await prisma.featureSeen.findMany({
    where: {
      userId,
      featureKey: { in: featureKeys },
    },
    select: { featureKey: true },
  });

  const seenSet = new Set(seen.map((s) => s.featureKey));
  return Object.fromEntries(featureKeys.map((k) => [k, seenSet.has(k)]));
}

export async function getFeatureSeenList(userId: string) {
  return prisma.featureSeen.findMany({
    where: { userId },
    select: { featureKey: true, seenAt: true },
    orderBy: { seenAt: 'desc' },
  });
}

// ─── Admin Analytics ──────────────────────────────────────────────────────────

export async function getFlowAnalytics(tenantId: string, flowId: string) {
  const [total, completed, dismissed] = await Promise.all([
    prisma.onboardingProgress.count({
      where: { tenantId, flowId },
    }),
    prisma.onboardingProgress.count({
      where: { tenantId, flowId, completedAt: { not: null } },
    }),
    prisma.onboardingProgress.count({
      where: { tenantId, flowId, dismissed: true },
    }),
  ]);

  return {
    flowId,
    totalStarted: total,
    totalCompleted: completed,
    totalDismissed: dismissed,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    dismissalRate: total > 0 ? Math.round((dismissed / total) * 100) : 0,
  };
}
