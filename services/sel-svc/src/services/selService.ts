/**
 * AIVO SEL Service - Core SEL Service
 */

import { startOfWeek, endOfWeek, subDays } from 'date-fns';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// STUDENT PROFILES
// ══════════════════════════════════════════════════════════════════════════════

export async function createStudentProfile(tenantId: string, input: any) {
  return prisma.studentSELProfile.create({
    data: {
      tenantId,
      studentId: input.studentId,
      riskLevel: input.riskLevel || 'LOW',
      riskFactors: input.riskFactors || [],
      protectiveFactors: input.protectiveFactors || [],
      preferredCheckInTime: input.preferredCheckInTime,
      preferredActivities: input.preferredActivities || [],
      strengths: input.strengths,
      growthAreas: input.growthAreas,
      supportStrategies: input.supportStrategies,
    },
  });
}

export async function getStudentProfile(tenantId: string, profileId: string) {
  return prisma.studentSELProfile.findFirst({
    where: { id: profileId, tenantId },
    include: {
      checkIns: { orderBy: { checkInTime: 'desc' }, take: 10 },
      assessments: { orderBy: { administeredAt: 'desc' }, take: 5, include: { template: true } },
      interventions: { where: { status: 'ACTIVE' }, take: 5 },
      goals: { where: { status: 'ACTIVE' } },
    },
  });
}

export async function listStudentProfiles(tenantId: string, query: any) {
  const { riskLevel, search, page = 1, pageSize = 20 } = query;

  const where: any = {
    tenantId,
    ...(riskLevel && { riskLevel }),
    ...(search && { studentId: { contains: search, mode: 'insensitive' } }),
  };

  const skip = (page - 1) * pageSize;

  const [profiles, totalItems] = await Promise.all([
    prisma.studentSELProfile.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.studentSELProfile.count({ where }),
  ]);

  return {
    data: profiles,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

export async function updateStudentProfile(tenantId: string, profileId: string, input: any) {
  return prisma.studentSELProfile.update({
    where: { id: profileId },
    data: input,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CHECK-INS
// ══════════════════════════════════════════════════════════════════════════════

export async function createCheckIn(tenantId: string, profileId: string, input: any) {
  const checkIn = await prisma.checkIn.create({
    data: {
      tenantId,
      studentProfileId: profileId,
      checkInType: input.checkInType || 'MOOD',
      moodRating: input.moodRating,
      moodEmoji: input.moodEmoji,
      emotions: input.emotions || [],
      energyLevel: input.energyLevel,
      context: input.context,
      location: input.location,
      trigger: input.trigger,
      reflection: input.reflection,
      gratitude: input.gratitude,
      goal: input.goal,
      needsSupport: input.needsSupport || false,
      isPrivate: input.isPrivate || false,
    },
  });

  // Update last check-in time on profile
  await prisma.studentSELProfile.update({
    where: { id: profileId },
    data: { lastCheckInAt: new Date() },
  });

  // Check for alerts
  if (input.needsSupport || (input.moodRating && input.moodRating <= 2)) {
    await createAlert(tenantId, profileId, {
      alertType: input.needsSupport ? 'FOLLOW_UP_REQUIRED' : 'LOW_MOOD_PATTERN',
      severity: input.moodRating === 1 ? 'HIGH' : 'MEDIUM',
      title: input.needsSupport ? 'Student requested support' : 'Low mood check-in',
      description: `Student reported ${input.moodRating ? `mood rating of ${input.moodRating}` : 'needing support'}`,
    });
  }

  return checkIn;
}

export async function getCheckIns(tenantId: string, profileId: string, options: any = {}) {
  const { fromDate, toDate, page = 1, pageSize = 20 } = options;

  const where: any = {
    tenantId,
    studentProfileId: profileId,
    ...(fromDate || toDate
      ? {
          checkInTime: {
            ...(fromDate && { gte: new Date(fromDate) }),
            ...(toDate && { lte: new Date(toDate) }),
          },
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  const [checkIns, totalItems] = await Promise.all([
    prisma.checkIn.findMany({ where, orderBy: { checkInTime: 'desc' }, skip, take: pageSize }),
    prisma.checkIn.count({ where }),
  ]);

  return {
    data: checkIns,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

export async function getMoodTrends(tenantId: string, profileId: string, days = 30) {
  const since = subDays(new Date(), days);

  const checkIns = await prisma.checkIn.findMany({
    where: {
      tenantId,
      studentProfileId: profileId,
      checkInTime: { gte: since },
      moodRating: { not: null },
    },
    orderBy: { checkInTime: 'asc' },
    select: { checkInTime: true, moodRating: true, energyLevel: true, emotions: true },
  });

  const emotionCounts: Record<string, number> = {};
  let moodSum = 0;
  let energySum = 0;
  let count = 0;

  for (const checkIn of checkIns) {
    if (checkIn.moodRating) {
      moodSum += checkIn.moodRating;
      count++;
    }
    if (checkIn.energyLevel) energySum += checkIn.energyLevel;
    for (const emotion of checkIn.emotions) {
      emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
    }
  }

  return {
    period: { days, since: since.toISOString() },
    totalCheckIns: checkIns.length,
    averageMood: count > 0 ? Math.round((moodSum / count) * 100) / 100 : null,
    averageEnergy: count > 0 ? Math.round((energySum / count) * 100) / 100 : null,
    topEmotions: Object.entries(emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5),
    dataPoints: checkIns.map((c) => ({
      date: c.checkInTime,
      mood: c.moodRating,
      energy: c.energyLevel,
    })),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ASSESSMENTS
// ══════════════════════════════════════════════════════════════════════════════

export async function createAssessment(tenantId: string, profileId: string, input: any) {
  return prisma.assessment.create({
    data: {
      tenantId,
      studentProfileId: profileId,
      templateId: input.templateId,
      administeredBy: input.administeredBy,
      administrationContext: input.administrationContext,
      status: 'IN_PROGRESS',
    },
  });
}

export async function submitAssessmentResponse(
  assessmentId: string,
  itemNumber: number,
  response: string,
  responseTime?: number
) {
  const item = await prisma.assessmentItem.findFirst({
    where: { template: { assessments: { some: { id: assessmentId } } }, itemNumber },
  });

  let score: number | undefined;
  if (item && !isNaN(Number(response))) {
    score = item.reverseScored ? item.maxScore - Number(response) + 1 : Number(response);
  }

  return prisma.assessmentResponse.upsert({
    where: { assessmentId_itemNumber: { assessmentId, itemNumber } },
    create: {
      assessmentId,
      itemNumber,
      response,
      score: score ?? null,
      responseTime: responseTime ?? null,
    },
    update: { response, score: score ?? null, responseTime: responseTime ?? null },
  });
}

export async function completeAssessment(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      responses: true,
      template: { include: { items: { include: { competency: true } } } },
    },
  });

  if (!assessment) throw new Error('Assessment not found');

  // Calculate scores by competency
  const competencyScores: Record<string, { sum: number; count: number }> = {};
  let totalScore = 0;

  for (const response of assessment.responses) {
    if (response.score != null) {
      totalScore += response.score;
      const item = assessment.template.items.find((i) => i.itemNumber === response.itemNumber);
      if (item?.competencyId) {
        const competencyId = item.competencyId;
        if (!competencyScores[competencyId]) {
          competencyScores[competencyId] = { sum: 0, count: 0 };
        }
        const entry = competencyScores[competencyId];
        if (entry) {
          entry.sum += response.score;
          entry.count++;
        }
      }
    }
  }

  const competencyAverages: Record<string, number> = {};
  for (const [id, { sum, count }] of Object.entries(competencyScores)) {
    competencyAverages[id] = Math.round((sum / count) * 100) / 100;
  }

  return prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      totalScore,
      competencyScores: competencyAverages,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ACTIVITIES
// ══════════════════════════════════════════════════════════════════════════════

export async function listActivities(tenantId: string, query: any) {
  const {
    competencyId,
    activityType,
    gradeLevel,
    type,
    category,
    difficulty,
    subtype,
    maxDuration,
    page = 1,
    pageSize = 20,
  } = query;

  const where: any = {
    tenantId,
    isActive: true,
    ...(competencyId && { competencyId }),
    ...(activityType && { activityType }),
    ...(type && { activityType: type }),
    ...(category && { category }),
    ...(difficulty && { difficulty }),
    ...(subtype && { subtype }),
    ...(maxDuration && { duration: { lte: maxDuration } }),
    ...(gradeLevel && {
      gradeRangeStart: { lte: gradeLevel },
      gradeRangeEnd: { gte: gradeLevel },
    }),
  };

  const skip = (page - 1) * pageSize;

  const [activities, totalItems] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: pageSize,
      include: { competency: true },
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    data: activities,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

export async function getActivity(tenantId: string, activityId: string) {
  return prisma.activity.findFirst({
    where: { id: activityId, tenantId },
    include: { competency: true },
  });
}

export async function toggleActivityFavorite(
  profileId: string,
  activityId: string,
  favorite: boolean
) {
  // Use upsert to create or update the favorite relationship
  if (favorite) {
    await prisma.activityFavorite.upsert({
      where: { studentProfileId_activityId: { studentProfileId: profileId, activityId } },
      create: { studentProfileId: profileId, activityId },
      update: {},
    });
  } else {
    await prisma.activityFavorite.deleteMany({
      where: { studentProfileId: profileId, activityId },
    });
  }
}

export async function recordActivityCompletion(profileId: string, activityId: string, input: any) {
  return prisma.activityCompletion.create({
    data: {
      studentProfileId: profileId,
      activityId,
      duration: input.duration,
      rating: input.rating,
      reflection: input.reflection,
      helpfulness: input.helpfulness,
      assignedBy: input.assignedBy,
      context: input.context,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// INTERVENTIONS
// ══════════════════════════════════════════════════════════════════════════════

export async function createIntervention(
  tenantId: string,
  profileId: string,
  userId: string,
  input: any
) {
  return prisma.intervention.create({
    data: {
      tenantId,
      studentProfileId: profileId,
      name: input.name,
      description: input.description,
      interventionType: input.interventionType,
      targetCompetencies: input.targetCompetencies || [],
      strategies: input.strategies || [],
      frequency: input.frequency,
      duration: input.duration,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      interventionist: input.interventionist,
      supportTeam: input.supportTeam || [],
      baselineData: input.baselineData,
      goalData: input.goalData,
      status: 'PLANNED',
      createdBy: userId,
    },
  });
}

export async function logInterventionSession(interventionId: string, input: any) {
  return prisma.interventionLog.create({
    data: {
      interventionId,
      duration: input.duration,
      activitiesCompleted: input.activitiesCompleted || [],
      studentResponse: input.studentResponse,
      progressNotes: input.progressNotes,
      dataPoints: input.dataPoints,
      loggedBy: input.loggedBy,
    },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ══════════════════════════════════════════════════════════════════════════════

async function createAlert(tenantId: string, profileId: string, input: any) {
  return prisma.sELAlert.create({
    data: {
      tenantId,
      studentProfileId: profileId,
      alertType: input.alertType,
      severity: input.severity,
      title: input.title,
      description: input.description,
      triggerData: input.triggerData,
      status: 'NEW',
    },
  });
}

export async function getAlerts(tenantId: string, options: any = {}) {
  const { status, severity, page = 1, pageSize = 20 } = options;

  const where: any = {
    tenantId,
    ...(status && { status }),
    ...(severity && { severity }),
  };

  const skip = (page - 1) * pageSize;

  const [alerts, totalItems] = await Promise.all([
    prisma.sELAlert.findMany({
      where,
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: pageSize,
    }),
    prisma.sELAlert.count({ where }),
  ]);

  return {
    data: alerts,
    pagination: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}

export async function acknowledgeAlert(alertId: string, userId: string) {
  return prisma.sELAlert.update({
    where: { id: alertId },
    data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date(), acknowledgedBy: userId },
  });
}

export async function resolveAlert(alertId: string, userId: string, resolution: string) {
  return prisma.sELAlert.update({
    where: { id: alertId },
    data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: userId, resolution },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════

export async function getDashboard(tenantId: string) {
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(today);

  const [
    totalProfiles,
    riskCounts,
    weeklyCheckIns,
    activeInterventions,
    openAlerts,
    recentCheckIns,
  ] = await Promise.all([
    prisma.studentSELProfile.count({ where: { tenantId } }),
    prisma.studentSELProfile.groupBy({
      by: ['riskLevel'],
      where: { tenantId },
      _count: { riskLevel: true },
    }),
    prisma.checkIn.count({ where: { tenantId, checkInTime: { gte: weekStart, lte: weekEnd } } }),
    prisma.intervention.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.sELAlert.count({ where: { tenantId, status: { in: ['NEW', 'ACKNOWLEDGED'] } } }),
    prisma.checkIn.findMany({
      where: { tenantId, checkInTime: { gte: subDays(today, 1) } },
      orderBy: { checkInTime: 'desc' },
      take: 10,
      select: {
        id: true,
        studentProfileId: true,
        moodRating: true,
        checkInTime: true,
        needsSupport: true,
      },
    }),
  ]);

  return {
    totalProfiles,
    byRiskLevel: Object.fromEntries(riskCounts.map((r) => [r.riskLevel, r._count.riskLevel])),
    weeklyCheckIns,
    activeInterventions,
    openAlerts,
    recentCheckIns,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE COMPATIBILITY - JOURNAL
// ══════════════════════════════════════════════════════════════════════════════

export async function getJournalEntries(
  tenantId: string,
  learnerId: string,
  options: { limit?: number } = {}
) {
  const { limit = 20 } = options;

  return prisma.journalEntry.findMany({
    where: { tenantId, studentProfileId: learnerId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function createJournalEntry(
  tenantId: string,
  learnerId: string,
  input: { content: string; mood?: string; tags?: string[] }
) {
  return prisma.journalEntry.create({
    data: {
      tenantId,
      studentProfileId: learnerId,
      content: input.content,
      mood: input.mood,
      tags: input.tags || [],
    },
  });
}

export async function deleteJournalEntry(entryId: string) {
  return prisma.journalEntry.delete({
    where: { id: entryId },
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE COMPATIBILITY - PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

export async function getLearnerProgress(tenantId: string, learnerId: string) {
  const thirtyDaysAgo = subDays(new Date(), 30);

  const [profile, checkInCount, activityCount, recentMoods, streakData] = await Promise.all([
    prisma.studentSELProfile.findFirst({
      where: { tenantId, studentId: learnerId },
      select: { riskLevel: true, lastCheckInAt: true, preferredActivities: true },
    }),
    prisma.checkIn.count({
      where: { tenantId, studentProfileId: learnerId, checkInTime: { gte: thirtyDaysAgo } },
    }),
    prisma.activityCompletion.count({
      where: { studentProfileId: learnerId, completedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.checkIn.findMany({
      where: {
        tenantId,
        studentProfileId: learnerId,
        checkInTime: { gte: thirtyDaysAgo },
        moodRating: { not: null },
      },
      orderBy: { checkInTime: 'desc' },
      take: 7,
      select: { moodRating: true, checkInTime: true },
    }),
    // Calculate streak - consecutive days with check-ins
    prisma.checkIn.findMany({
      where: { tenantId, studentProfileId: learnerId },
      orderBy: { checkInTime: 'desc' },
      take: 30,
      select: { checkInTime: true },
    }),
  ]);

  // Calculate current streak
  let currentStreak = 0;
  if (streakData.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = streakData.map((c) => {
      const d = new Date(c.checkInTime);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    });

    const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);

    for (let i = 0; i < uniqueDates.length; i++) {
      const expectedDate = today.getTime() - i * 24 * 60 * 60 * 1000;
      if (uniqueDates[i] === expectedDate) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Calculate average mood
  const avgMood =
    recentMoods.length > 0
      ? Math.round(
          (recentMoods.reduce((sum, c) => sum + (c.moodRating || 0), 0) / recentMoods.length) * 10
        ) / 10
      : null;

  return {
    learnerId,
    checkInsLast30Days: checkInCount,
    activitiesLast30Days: activityCount,
    currentStreak,
    averageMoodLast7Days: avgMood,
    riskLevel: profile?.riskLevel || 'LOW',
    lastCheckIn: profile?.lastCheckInAt,
    moodTrend: recentMoods.map((m) => ({ date: m.checkInTime, mood: m.moodRating })),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// MOBILE COMPATIBILITY - SOCIAL SCENARIOS
// ══════════════════════════════════════════════════════════════════════════════

export async function submitScenarioResponse(
  learnerId: string,
  scenarioId: string,
  choiceId: string
) {
  // Find the scenario (activity) and its choices
  const scenario = await prisma.activity.findUnique({
    where: { id: scenarioId },
  });

  if (!scenario) {
    throw new Error('Scenario not found');
  }

  // Parse the scenario content to find the correct choice and feedback
  const scenarioContent = scenario.content as {
    choices?: { id: string; text: string; isCorrect?: boolean; feedback?: string }[];
  } | null;
  const choices = scenarioContent?.choices || [];
  const selectedChoice = choices.find((c) => c.id === choiceId);

  // Record the completion
  await prisma.activityCompletion.create({
    data: {
      studentProfileId: learnerId,
      activityId: scenarioId,
      reflection: JSON.stringify({ choiceId, choice: selectedChoice }),
    },
  });

  return {
    isCorrect: selectedChoice?.isCorrect ?? false,
    feedback: selectedChoice?.feedback || 'Thank you for your response!',
    correctChoiceId: choices.find((c) => c.isCorrect)?.id,
  };
}
