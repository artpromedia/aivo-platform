/**
 * Teacher Analytics Service
 *
 * Core analytics service for teacher dashboards.
 * Provides class overview, student analytics, skill mastery,
 * early warning indicators, and IEP progress tracking.
 *
 * Designed for the 5-minute teacher check-in use case -
 * every metric is actionable and instantly understandable.
 */

import { logger, metrics } from '@aivo/ts-observability';

import { redisClient } from '../config';
import { prisma } from '../prisma';

// =====================
// Type Definitions
// =====================

export type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year';
export type RiskLevel = 'on-track' | 'watch' | 'at-risk' | 'critical';
export type EngagementLevel = 'highly-engaged' | 'engaged' | 'passive' | 'disengaged' | 'absent';

export interface TrendData {
  direction: 'up' | 'down' | 'stable';
  percentChange: number;
  dataPoints: { date: string; value: number }[];
}

export interface ClassInsight {
  type: 'success' | 'warning' | 'info' | 'action';
  priority: number;
  title: string;
  description: string;
  affectedStudents?: string[];
  suggestedAction?: string;
  relatedSkillId?: string;
}

export interface ClassOverviewMetrics {
  classId: string;
  className: string;
  period: TimePeriod;
  totalStudents: number;
  activeStudents: number;
  averageMastery: number;
  averageEngagement: number;
  totalLearningTime: number;
  masteryDistribution: {
    mastered: number;
    proficient: number;
    developing: number;
    beginning: number;
  };
  riskDistribution: {
    onTrack: number;
    watch: number;
    atRisk: number;
    critical: number;
  };
  masteryTrend: TrendData;
  engagementTrend: TrendData;
  insights: ClassInsight[];
  previousPeriodComparison: {
    masteryChange: number;
    engagementChange: number;
    timeChange: number;
  };
}

export interface SkillMasteryMatrix {
  classId: string;
  skills: {
    skillId: string;
    skillName: string;
    domain: string;
    standardId?: string;
  }[];
  students: {
    studentId: string;
    studentName: string;
    masteryBySkill: Record<
      string,
      { mastery: number; trend: 'up' | 'down' | 'stable'; attempts: number }
    >;
  }[];
  classAverageBySkill: Record<string, number>;
  skillsNeedingAttention: string[];
}

export interface EarlyWarningStudent {
  studentId: string;
  studentName: string;
  riskLevel: RiskLevel;
  riskScore: number;
  primaryRiskFactors: { factor: string; severity: number; description: string }[];
  daysAtRisk: number;
  suggestedInterventions: string[];
  lastTeacherContact?: Date;
}

export interface EarlyWarningReport {
  classId: string;
  generatedAt: Date;
  criticalStudents: EarlyWarningStudent[];
  atRiskStudents: EarlyWarningStudent[];
  watchStudents: EarlyWarningStudent[];
  classLevelWarnings: {
    type: string;
    severity: 'high' | 'medium' | 'low';
    message: string;
    affectedCount: number;
  }[];
}

// =====================
// Service Implementation
// =====================

const CACHE_TTL = 300; // 5 minutes

/**
 * Get period date range
 */
function getPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case 'quarter':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case 'year':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }

  return { startDate, endDate };
}

/**
 * Calculate average of numeric array
 */
function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Get class overview metrics
 */
export async function getClassOverview(
  classId: string,
  teacherId: string,
  period: TimePeriod = 'week'
): Promise<ClassOverviewMetrics> {
  const startTime = Date.now();
  const cacheKey = `class-overview:${classId}:${period}`;

  // Check cache
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      metrics.increment('analytics.cache.hit');
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn('Cache read failed', { error });
  }

  metrics.increment('analytics.cache.miss');

  const { startDate, endDate } = getPeriodDates(period);

  // Get class with students
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: {
        where: { status: 'active' },
        include: {
          student: {
            include: {
              sessions: {
                where: {
                  startTime: { gte: startDate },
                  endTime: { lte: endDate },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!classInfo) {
    throw new Error('Class not found');
  }

  const students = classInfo.enrollments.map((e) => e.student);
  const totalStudents = students.length;

  // Calculate active students
  const activeStudents = students.filter((s) =>
    s.sessions.some((session) => new Date(session.startTime) >= startDate)
  ).length;

  // Get real mastery scores from learner model snapshots
  const studentIds = students.map((s) => s.id);
  const latestSnapshots = await prisma.learnerModelSnapshot.findMany({
    where: {
      learnerId: { in: studentIds },
      classId: classId,
    },
    orderBy: { snapshotDate: 'desc' },
    distinct: ['learnerId'],
  });

  // Build mastery map for quick lookup
  const masteryMap = new Map(latestSnapshots.map((s) => [s.learnerId, s.overallMastery]));
  const masteryScores = students.map((s) => masteryMap.get(s.id) ?? 0);
  const averageMastery = masteryScores.length > 0 ? calculateAverage(masteryScores) : 0;

  // Calculate mastery distribution
  const masteryDistribution = {
    mastered: masteryScores.filter((s) => s >= 0.9).length,
    proficient: masteryScores.filter((s) => s >= 0.7 && s < 0.9).length,
    developing: masteryScores.filter((s) => s >= 0.5 && s < 0.7).length,
    beginning: masteryScores.filter((s) => s < 0.5).length,
  };

  // Get real engagement scores from learner model snapshots
  const engagementMap = new Map(latestSnapshots.map((s) => [s.learnerId, s.engagementScore]));
  const engagementScores = students.map((s) => engagementMap.get(s.id) ?? 0);
  const averageEngagement = engagementScores.length > 0 ? calculateAverage(engagementScores) : 0;

  // Get real risk levels from learner model snapshots
  const riskMap = new Map(latestSnapshots.map((s) => [s.learnerId, s.riskLevel]));
  const riskLevels = students.map((s) => {
    const risk = riskMap.get(s.id);
    switch (risk) {
      case 'LOW':
        return 'on-track';
      case 'MEDIUM':
        return 'watch';
      case 'HIGH':
        return 'at-risk';
      case 'CRITICAL':
        return 'critical';
      default:
        return 'on-track';
    }
  });

  const riskDistribution = {
    onTrack: riskLevels.filter((r) => r === 'on-track').length,
    watch: riskLevels.filter((r) => r === 'watch').length,
    atRisk: riskLevels.filter((r) => r === 'at-risk').length,
    critical: riskLevels.filter((r) => r === 'critical').length,
  };

  // Calculate learning time
  const totalLearningTime = students.reduce((total, student) => {
    return (
      total +
      student.sessions.reduce((sessionTotal, session) => {
        if (session.endTime) {
          return (
            sessionTotal +
            (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000
          );
        }
        return sessionTotal;
      }, 0)
    );
  }, 0);

  // Generate real trends from ClassAnalyticsSummary
  const historicalSummaries = await prisma.classAnalyticsSummary.findMany({
    where: {
      classId: classId,
      summaryDate: { gte: startDate, lte: endDate },
    },
    orderBy: { summaryDate: 'asc' },
  });

  const masteryTrend: TrendData = calculateTrendFromHistory(
    historicalSummaries.map((s) => ({
      date: s.summaryDate.toISOString().split('T')[0],
      value: s.avgClassMastery,
    })),
    averageMastery
  );

  const engagementTrend: TrendData = calculateTrendFromHistory(
    historicalSummaries.map((s) => ({
      date: s.summaryDate.toISOString().split('T')[0],
      value: s.avgEngagement,
    })),
    averageEngagement
  );

  // Generate insights
  const insights: ClassInsight[] = [];

  if (masteryDistribution.mastered >= totalStudents * 0.3) {
    insights.push({
      type: 'success',
      priority: 7,
      title: 'Strong class performance',
      description: `${masteryDistribution.mastered} students (${Math.round((masteryDistribution.mastered / totalStudents) * 100)}%) have mastered the material.`,
      suggestedAction: 'Consider enrichment activities for top performers.',
    });
  }

  if (riskDistribution.critical + riskDistribution.atRisk > 0) {
    insights.push({
      type: 'warning',
      priority: 9,
      title: `${riskDistribution.critical + riskDistribution.atRisk} students need attention`,
      description: 'These students show signs of falling behind and may need intervention.',
      suggestedAction: 'Schedule one-on-one check-ins with at-risk students.',
    });
  }

  const result: ClassOverviewMetrics = {
    classId,
    className: classInfo.name,
    period,
    totalStudents,
    activeStudents,
    averageMastery,
    averageEngagement,
    totalLearningTime: Math.round(totalLearningTime),
    masteryDistribution,
    riskDistribution,
    masteryTrend,
    engagementTrend,
    insights: insights.sort((a, b) => b.priority - a.priority).slice(0, 5),
    previousPeriodComparison: {
      masteryChange: masteryTrend.percentChange,
      engagementChange: engagementTrend.percentChange,
      timeChange: calculateTimeChange(historicalSummaries),
    },
  };

  // Cache result
  try {
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  } catch (error) {
    logger.warn('Cache write failed', { error });
  }

  metrics.histogram('analytics.class_overview.duration_ms', Date.now() - startTime);

  return result;
}

/**
 * Get skill mastery matrix
 */
export async function getSkillMasteryMatrix(
  classId: string,
  teacherId: string,
  domainFilter?: string
): Promise<SkillMasteryMatrix> {
  const cacheKey = `skill-matrix:${classId}:${domainFilter || 'all'}`;

  // Check cache
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.warn('Cache read failed', { error });
  }

  // Get class with students and skills
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: {
        where: { status: 'active' },
        include: {
          student: true,
        },
      },
    },
  });

  if (!classInfo) {
    throw new Error('Class not found');
  }

  // Get skill breakdown from learner model snapshots
  const studentIds = classInfo.enrollments.map((e) => e.student.id);
  const latestSnapshots = await prisma.learnerModelSnapshot.findMany({
    where: {
      learnerId: { in: studentIds },
      classId: classId,
    },
    orderBy: { snapshotDate: 'desc' },
    distinct: ['learnerId'],
  });

  // Extract unique skills from skill breakdowns
  const skillsSet = new Map<string, { skillId: string; skillName: string; domain: string; standardId?: string }>();
  for (const snapshot of latestSnapshots) {
    const skillBreakdown = snapshot.skillBreakdown as { skillId: string; skillName: string; domain: string; standardId?: string; mastery: number }[];
    if (Array.isArray(skillBreakdown)) {
      for (const skill of skillBreakdown) {
        if (!domainFilter || skill.domain === domainFilter) {
          skillsSet.set(skill.skillId, {
            skillId: skill.skillId,
            skillName: skill.skillName,
            domain: skill.domain,
            standardId: skill.standardId,
          });
        }
      }
    }
  }
  const skills = Array.from(skillsSet.values());

  // Build student mastery data from real snapshots
  const snapshotMap = new Map(latestSnapshots.map((s) => [s.learnerId, s]));
  const students = classInfo.enrollments.map((enrollment) => {
    const student = enrollment.student;
    const snapshot = snapshotMap.get(student.id);
    const masteryBySkill: Record<
      string,
      { mastery: number; trend: 'up' | 'down' | 'stable'; attempts: number }
    > = {};

    if (snapshot && Array.isArray(snapshot.skillBreakdown)) {
      const skillBreakdown = snapshot.skillBreakdown as { skillId: string; mastery: number; trend?: string; attempts?: number }[];
      for (const skillData of skillBreakdown) {
        if (skills.some((s) => s.skillId === skillData.skillId)) {
          masteryBySkill[skillData.skillId] = {
            mastery: skillData.mastery ?? 0,
            trend: (skillData.trend as 'up' | 'down' | 'stable') ?? 'stable',
            attempts: skillData.attempts ?? 0,
          };
        }
      }
    }

    // Fill in missing skills with zero values
    for (const skill of skills) {
      if (!masteryBySkill[skill.skillId]) {
        masteryBySkill[skill.skillId] = { mastery: 0, trend: 'stable', attempts: 0 };
      }
    }

    return {
      studentId: student.id,
      studentName: `${student.givenName} ${student.familyName}`,
      masteryBySkill,
    };
  });

  // Calculate class averages
  const classAverageBySkill: Record<string, number> = {};
  const skillsNeedingAttention: string[] = [];

  for (const skill of skills) {
    const masteries = students.map((s) => s.masteryBySkill[skill.skillId]?.mastery || 0);
    const avg = calculateAverage(masteries);
    classAverageBySkill[skill.skillId] = avg;
    if (avg < 0.6) {
      skillsNeedingAttention.push(skill.skillId);
    }
  }

  const result: SkillMasteryMatrix = {
    classId,
    skills,
    students,
    classAverageBySkill,
    skillsNeedingAttention,
  };

  // Cache result
  try {
    await redisClient.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
  } catch (error) {
    logger.warn('Cache write failed', { error });
  }

  return result;
}

/**
 * Get early warning report
 */
export async function getEarlyWarningReport(
  classId: string,
  teacherId: string
): Promise<EarlyWarningReport> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get class with students
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: {
        where: { status: 'active' },
        include: {
          student: {
            include: {
              sessions: {
                where: { startTime: { gte: thirtyDaysAgo } },
                orderBy: { startTime: 'desc' },
              },
            },
          },
        },
      },
    },
  });

  if (!classInfo) {
    throw new Error('Class not found');
  }

  const warningStudents: EarlyWarningStudent[] = [];

  for (const enrollment of classInfo.enrollments) {
    const student = enrollment.student;
    const warning = calculateStudentWarning(student, thirtyDaysAgo);

    if (warning.riskLevel !== 'on-track') {
      warningStudents.push({
        studentId: student.id,
        studentName: `${student.givenName} ${student.familyName}`,
        riskLevel: warning.riskLevel,
        riskScore: warning.riskScore,
        primaryRiskFactors: warning.riskFactors.slice(0, 3),
        daysAtRisk: warning.daysAtRisk,
        suggestedInterventions: warning.interventions,
        lastTeacherContact: undefined,
      });
    }
  }

  // Sort by risk score
  warningStudents.sort((a, b) => b.riskScore - a.riskScore);

  // Categorize
  const criticalStudents = warningStudents.filter((s) => s.riskLevel === 'critical');
  const atRiskStudents = warningStudents.filter((s) => s.riskLevel === 'at-risk');
  const watchStudents = warningStudents.filter((s) => s.riskLevel === 'watch');

  // Generate class-level warnings
  const classLevelWarnings: EarlyWarningReport['classLevelWarnings'] = [];
  const atRiskPercentage = (warningStudents.length / classInfo.enrollments.length) * 100;

  if (atRiskPercentage > 30) {
    classLevelWarnings.push({
      type: 'high_risk_percentage',
      severity: 'high',
      message: `${Math.round(atRiskPercentage)}% of the class is at risk`,
      affectedCount: warningStudents.length,
    });
  }

  return {
    classId,
    generatedAt: new Date(),
    criticalStudents,
    atRiskStudents,
    watchStudents,
    classLevelWarnings,
  };
}

/**
 * Get IEP progress report
 */
export async function getIEPProgressReport(classId: string, teacherId: string) {
  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: {
        where: { status: 'active' },
        include: {
          student: true,
        },
      },
    },
  });

  if (!classInfo) {
    throw new Error('Class not found');
  }

  // Get real IEP data from database
  const studentIds = classInfo.enrollments.map((e) => e.student.id);

  const iepGoals = await prisma.iEPGoal.findMany({
    where: {
      learnerId: { in: studentIds },
      classId: classId,
    },
    include: {
      progressRecords: {
        orderBy: { recordedAt: 'desc' },
        take: 5,
      },
    },
  });

  const accommodations = await prisma.studentAccommodation.findMany({
    where: {
      learnerId: { in: studentIds },
      isActive: true,
    },
  });

  const upcomingReviews = await prisma.iEPReviewSchedule.findMany({
    where: {
      classId: classId,
      isCompleted: false,
      reviewDate: { gte: new Date() },
    },
    orderBy: { reviewDate: 'asc' },
    take: 10,
  });

  // Group goals and accommodations by student
  const goalsByStudent = new Map<string, typeof iepGoals>();
  for (const goal of iepGoals) {
    const existing = goalsByStudent.get(goal.learnerId) || [];
    existing.push(goal);
    goalsByStudent.set(goal.learnerId, existing);
  }

  const accommodationsByStudent = new Map<string, typeof accommodations>();
  for (const acc of accommodations) {
    const existing = accommodationsByStudent.get(acc.learnerId) || [];
    existing.push(acc);
    accommodationsByStudent.set(acc.learnerId, existing);
  }

  // Build student IEP data
  const studentsWithIEP = classInfo.enrollments
    .filter((e) => goalsByStudent.has(e.student.id) || accommodationsByStudent.has(e.student.id))
    .map((e) => {
      const studentGoals = goalsByStudent.get(e.student.id) || [];
      const studentAccommodations = accommodationsByStudent.get(e.student.id) || [];

      const goals = studentGoals.map((g) => ({
        goalId: g.id,
        description: g.description,
        category: g.category,
        targetDate: g.targetDate,
        currentProgress: g.currentProgress,
        expectedProgress: g.expectedProgress,
        status: g.status.toLowerCase().replace('_', '-') as 'on-track' | 'behind' | 'at-risk' | 'completed' | 'discontinued',
        recentProgress: g.progressRecords.map((p) => ({
          date: p.recordedAt,
          value: p.progressValue,
          notes: p.notes,
        })),
        relatedSkill: g.relatedSkillName,
      }));

      const goalsAtRisk = goals.filter((g) => g.status === 'at-risk' || g.status === 'behind').length;
      const avgProgress = goals.length > 0
        ? goals.reduce((sum, g) => sum + g.currentProgress, 0) / goals.length
        : 0;

      return {
        studentId: e.student.id,
        studentName: `${e.student.givenName} ${e.student.familyName}`,
        goals,
        accommodations: studentAccommodations.map((a) => ({
          type: a.accommodationType,
          description: a.description,
          isActive: a.isActive,
        })),
        overallProgress: avgProgress,
        goalsAtRisk,
      };
    });

  const totalGoals = studentsWithIEP.reduce((sum, s) => sum + s.goals.length, 0);
  const goalsOnTrack = studentsWithIEP.reduce(
    (sum, s) => sum + s.goals.filter((g) => g.status === 'on-track' || g.status === 'completed').length,
    0
  );
  const goalsAtRiskTotal = studentsWithIEP.reduce((sum, s) => sum + s.goalsAtRisk, 0);

  return {
    classId,
    className: classInfo.name,
    totalStudentsWithIEP: studentsWithIEP.length,
    totalGoals,
    goalsOnTrack,
    goalsAtRisk: goalsAtRiskTotal,
    students: studentsWithIEP,
    upcomingReviewDates: upcomingReviews.map((r) => ({
      reviewDate: r.reviewDate,
      reviewType: r.reviewType,
      learnerId: r.learnerId,
    })),
  };
}

/**
 * Get student analytics
 */
export async function getStudentAnalytics(
  studentId: string,
  teacherId: string,
  period: TimePeriod = 'month'
) {
  const { startDate } = getPeriodDates(period);

  const student = await prisma.profile.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      sessions: {
        where: { startTime: { gte: startDate } },
        orderBy: { startTime: 'desc' },
        take: 20,
      },
    },
  });

  if (!student) {
    throw new Error('Student not found');
  }

  // Get learner model snapshot for real mastery/engagement data
  const latestSnapshot = await prisma.learnerModelSnapshot.findFirst({
    where: { learnerId: studentId },
    orderBy: { snapshotDate: 'desc' },
  });

  // Get historical snapshots for trend
  const historicalSnapshots = await prisma.learnerModelSnapshot.findMany({
    where: {
      learnerId: studentId,
      snapshotDate: { gte: startDate },
    },
    orderBy: { snapshotDate: 'asc' },
  });

  // Get IEP goals and accommodations
  const iepGoals = await prisma.iEPGoal.findMany({
    where: { learnerId: studentId },
    include: { progressRecords: { orderBy: { recordedAt: 'desc' }, take: 3 } },
  });

  const accommodations = await prisma.studentAccommodation.findMany({
    where: { learnerId: studentId, isActive: true },
  });

  // Calculate mastery trend from historical data
  const masteryTrend = calculateTrendFromHistory(
    historicalSnapshots.map((s) => ({
      date: s.snapshotDate.toISOString().split('T')[0],
      value: s.overallMastery,
    })),
    latestSnapshot?.overallMastery ?? 0
  );

  // Calculate engagement level
  const engagementScore = latestSnapshot?.engagementScore ?? 0;
  let engagementLevel: EngagementLevel;
  if (engagementScore >= 0.8) engagementLevel = 'highly-engaged';
  else if (engagementScore >= 0.6) engagementLevel = 'engaged';
  else if (engagementScore >= 0.4) engagementLevel = 'passive';
  else if (engagementScore >= 0.2) engagementLevel = 'disengaged';
  else engagementLevel = 'absent';

  // Map risk level
  let riskLevel: RiskLevel;
  switch (latestSnapshot?.riskLevel) {
    case 'LOW':
      riskLevel = 'on-track';
      break;
    case 'MEDIUM':
      riskLevel = 'watch';
      break;
    case 'HIGH':
      riskLevel = 'at-risk';
      break;
    case 'CRITICAL':
      riskLevel = 'critical';
      break;
    default:
      riskLevel = 'on-track';
  }

  // Extract skill mastery from snapshot
  const skillBreakdown = (latestSnapshot?.skillBreakdown ?? []) as { skillId: string; skillName: string; mastery: number; trend?: string }[];
  const strengthAreas = skillBreakdown.filter((s) => s.mastery >= 0.8).map((s) => s.skillName);
  const growthAreas = skillBreakdown.filter((s) => s.mastery < 0.5).map((s) => s.skillName);

  // Calculate real session metrics
  const completedSessions = student.sessions.filter((s) => s.status === 'completed');
  const totalLearningTime = completedSessions.reduce((sum, s) => {
    if (s.endTime) {
      return sum + Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000);
    }
    return sum;
  }, 0);
  const avgSessionLength = completedSessions.length > 0 ? totalLearningTime / completedSessions.length : 0;

  return {
    studentId,
    studentName: `${student.givenName} ${student.familyName}`,
    gradeLevel: student.gradeLevel || 5,
    overallMastery: latestSnapshot?.overallMastery ?? 0,
    masteryTrend,
    engagementLevel,
    riskLevel,
    riskFactors: (latestSnapshot?.riskFactors ?? []) as { factor: string; severity: number; description: string }[],
    totalLearningTime,
    averageSessionLength: Math.round(avgSessionLength),
    sessionsCompleted: completedSessions.length,
    lastActiveDate: student.sessions[0]?.startTime || new Date(),
    streakDays: latestSnapshot?.sessionsCompleted ?? 0,
    skillMastery: skillBreakdown.map((s) => ({
      skillId: s.skillId,
      skillName: s.skillName,
      mastery: s.mastery,
      trend: (s.trend as 'up' | 'down' | 'stable') ?? 'stable',
    })),
    strengthAreas: strengthAreas.slice(0, 3),
    growthAreas: growthAreas.slice(0, 3),
    engagementMetrics: {
      averageTimeOnTask: Math.round(avgSessionLength),
      completionRate: completedSessions.length / Math.max(student.sessions.length, 1),
      hintUsageRate: 0, // Would need to query session events
      correctFirstAttemptRate: 0, // Would need to query session events
    },
    iepProgress: iepGoals.length > 0
      ? {
          goalsCount: iepGoals.length,
          onTrack: iepGoals.filter((g) => g.status === 'ON_TRACK').length,
          atRisk: iepGoals.filter((g) => g.status === 'AT_RISK' || g.status === 'BEHIND').length,
        }
      : undefined,
    activeAccommodations: accommodations.map((a) => ({
      type: a.accommodationType,
      description: a.description,
    })),
    recentSessions: student.sessions.slice(0, 5).map((s) => ({
      sessionId: s.id,
      date: s.startTime,
      duration: s.endTime
        ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)
        : 0,
      activitiesCompleted: 0, // Would need to count session events
      averageScore: 0, // Would need to query assessment results
      skillsPracticed: [],
      engagementLevel: engagementLevel,
    })),
    recommendations: generateStudentRecommendations(riskLevel, growthAreas, engagementLevel),
  };
}

/**
 * Get engagement analytics
 */
export async function getEngagementAnalytics(
  classId: string,
  teacherId: string,
  period: TimePeriod = 'week'
) {
  const { startDate } = getPeriodDates(period);

  const classInfo = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: {
        where: { status: 'active' },
        include: {
          student: {
            include: {
              sessions: {
                where: { startTime: { gte: startDate } },
              },
            },
          },
        },
      },
    },
  });

  if (!classInfo) {
    throw new Error('Class not found');
  }

  const students = classInfo.enrollments.map((e) => e.student);
  const activeStudents = students.filter((s) => s.sessions.length > 0).length;

  // Get learner model snapshots for engagement data
  const studentIds = students.map((s) => s.id);
  const latestSnapshots = await prisma.learnerModelSnapshot.findMany({
    where: {
      learnerId: { in: studentIds },
      classId: classId,
    },
    orderBy: { snapshotDate: 'desc' },
    distinct: ['learnerId'],
  });

  const engagementMap = new Map(latestSnapshots.map((s) => [s.learnerId, s.engagementScore]));

  // Calculate real engagement metrics
  const allSessions = students.flatMap((s) => s.sessions);
  const completedSessions = allSessions.filter((s) => s.status === 'completed');
  const totalDuration = completedSessions.reduce((sum, s) => {
    if (s.endTime) {
      return sum + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
    }
    return sum;
  }, 0);

  const avgTimeOnTask = completedSessions.length > 0 ? totalDuration / completedSessions.length : 0;
  const completionRate = allSessions.length > 0 ? completedSessions.length / allSessions.length : 0;
  const daysInPeriod = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const avgSessionsPerWeek = daysInPeriod > 0 ? allSessions.length / daysInPeriod : 0;

  // Calculate engagement distribution from snapshots
  const distribution = {
    highlyEngaged: 0,
    engaged: 0,
    passive: 0,
    disengaged: 0,
    absent: 0,
  };

  for (const student of students) {
    const engagement = engagementMap.get(student.id) ?? 0;
    if (engagement >= 0.8) distribution.highlyEngaged++;
    else if (engagement >= 0.6) distribution.engaged++;
    else if (engagement >= 0.4) distribution.passive++;
    else if (engagement >= 0.2) distribution.disengaged++;
    else distribution.absent++;
  }

  // Get historical summaries for trends
  const historicalSummaries = await prisma.classAnalyticsSummary.findMany({
    where: {
      classId: classId,
      summaryDate: { gte: startDate, lte: endDate },
    },
    orderBy: { summaryDate: 'asc' },
  });

  // Calculate weekly activity from sessions
  const sessionsByDay = new Map<number, { count: number; totalDuration: number }>();
  for (const session of allSessions) {
    const day = new Date(session.startTime).getDay();
    const existing = sessionsByDay.get(day) || { count: 0, totalDuration: 0 };
    existing.count++;
    if (session.endTime) {
      existing.totalDuration += (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000;
    }
    sessionsByDay.set(day, existing);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyActivity = [1, 2, 3, 4, 5].map((dayNum) => {
    const dayData = sessionsByDay.get(dayNum) || { count: 0, totalDuration: 0 };
    return {
      day: dayNames[dayNum],
      sessions: dayData.count,
      avgDuration: dayData.count > 0 ? Math.round(dayData.totalDuration / dayData.count) : 0,
    };
  });

  // Find low engagement students
  const lowEngagementStudents = students
    .map((s) => ({
      studentId: s.id,
      studentName: `${s.givenName} ${s.familyName}`,
      engagementScore: engagementMap.get(s.id) ?? 0,
      lastActiveDate: s.sessions[0]?.startTime || null,
    }))
    .filter((s) => s.engagementScore < 0.4)
    .sort((a, b) => a.engagementScore - b.engagementScore)
    .slice(0, 5)
    .map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      engagementLevel: (s.engagementScore < 0.2 ? 'absent' : 'disengaged') as EngagementLevel,
      lastActiveDate: s.lastActiveDate || new Date(0),
    }));

  return {
    classId,
    totalStudents: students.length,
    activeStudents,
    averageTimeOnTask: Math.round(avgTimeOnTask),
    completionRate,
    averageSessionsPerWeek: Math.round(avgSessionsPerWeek * 10) / 10,
    timeOnTaskTrend: calculateTrendFromHistory(
      historicalSummaries.map((s) => ({
        date: s.summaryDate.toISOString().split('T')[0],
        value: s.totalTimeMinutes / Math.max(s.totalStudents, 1),
      })),
      avgTimeOnTask
    ),
    completionRateTrend: calculateTrendFromHistory(
      historicalSummaries.map((s) => ({
        date: s.summaryDate.toISOString().split('T')[0],
        value: s.avgEngagement,
      })),
      completionRate
    ),
    sessionsTrend: calculateTrendFromHistory(
      historicalSummaries.map((s) => ({
        date: s.summaryDate.toISOString().split('T')[0],
        value: s.totalStudents,
      })),
      allSessions.length
    ),
    distribution,
    weeklyActivity,
    lowEngagementStudents,
  };
}

// =====================
// Helper Functions
// =====================

/**
 * Calculate trend data from historical data points
 */
function calculateTrendFromHistory(
  dataPoints: { date: string; value: number }[],
  currentValue: number
): TrendData {
  if (dataPoints.length < 2) {
    return {
      direction: 'stable',
      percentChange: 0,
      dataPoints: dataPoints.length > 0 ? dataPoints : [{ date: new Date().toISOString().split('T')[0], value: currentValue }],
    };
  }

  // Calculate trend direction and percent change
  const firstHalf = dataPoints.slice(0, Math.floor(dataPoints.length / 2));
  const secondHalf = dataPoints.slice(Math.floor(dataPoints.length / 2));

  const firstAvg = firstHalf.reduce((sum, p) => sum + p.value, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, p) => sum + p.value, 0) / secondHalf.length;

  const percentChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

  let direction: 'up' | 'down' | 'stable';
  if (percentChange > 2) direction = 'up';
  else if (percentChange < -2) direction = 'down';
  else direction = 'stable';

  return {
    direction,
    percentChange: Math.round(percentChange * 10) / 10,
    dataPoints,
  };
}

/**
 * Calculate time change from historical summaries
 */
function calculateTimeChange(summaries: { totalTimeMinutes: number }[]): number {
  if (summaries.length < 2) return 0;

  const firstHalf = summaries.slice(0, Math.floor(summaries.length / 2));
  const secondHalf = summaries.slice(Math.floor(summaries.length / 2));

  const firstTotal = firstHalf.reduce((sum, s) => sum + s.totalTimeMinutes, 0);
  const secondTotal = secondHalf.reduce((sum, s) => sum + s.totalTimeMinutes, 0);

  if (firstTotal === 0) return 0;
  return Math.round(((secondTotal - firstTotal) / firstTotal) * 100);
}

/**
 * Generate recommendations for a student based on their metrics
 */
function generateStudentRecommendations(
  riskLevel: RiskLevel,
  growthAreas: string[],
  engagementLevel: EngagementLevel
): string[] {
  const recommendations: string[] = [];

  // Risk-based recommendations
  if (riskLevel === 'critical' || riskLevel === 'at-risk') {
    recommendations.push('Schedule a one-on-one check-in to assess barriers to progress');
    recommendations.push('Consider contacting family about additional support');
  } else if (riskLevel === 'watch') {
    recommendations.push('Monitor progress closely over the next week');
  }

  // Growth area recommendations
  if (growthAreas.length > 0) {
    recommendations.push(`Focus additional practice on: ${growthAreas.slice(0, 2).join(', ')}`);
  }

  // Engagement-based recommendations
  if (engagementLevel === 'absent' || engagementLevel === 'disengaged') {
    recommendations.push('Check for technical barriers or access issues');
    recommendations.push('Consider alternative learning activities to boost engagement');
  } else if (engagementLevel === 'passive') {
    recommendations.push('Try interactive activities to increase active participation');
  }

  if (recommendations.length === 0) {
    recommendations.push('Student is on track - continue current learning plan');
  }

  return recommendations.slice(0, 5);
}

function calculateStudentWarning(
  student: { sessions: { startTime: Date; status: string }[] },
  since: Date
): {
  riskLevel: RiskLevel;
  riskScore: number;
  riskFactors: { factor: string; severity: number; description: string }[];
  daysAtRisk: number;
  interventions: string[];
} {
  const riskFactors: { factor: string; severity: number; description: string }[] = [];
  let riskScore = 0;

  const recentSessions = student.sessions.filter((s) => new Date(s.startTime) >= since);

  // Factor: No recent activity
  if (recentSessions.length === 0) {
    riskScore += 25;
    riskFactors.push({
      factor: 'No recent activity',
      severity: 25,
      description: 'Student has not been active in the past 30 days',
    });
  } else if (recentSessions.length < 5) {
    riskScore += 10;
    riskFactors.push({
      factor: 'Low activity',
      severity: 10,
      description: `Only ${recentSessions.length} sessions in the past 30 days`,
    });
  }

  // Factor: Low completion
  const completedRate =
    recentSessions.length > 0
      ? recentSessions.filter((s) => s.status === 'completed').length / recentSessions.length
      : 0;

  if (completedRate < 0.5 && recentSessions.length > 0) {
    riskScore += 10;
    riskFactors.push({
      factor: 'Low completion rate',
      severity: 10,
      description: `Only ${Math.round(completedRate * 100)}% of sessions completed`,
    });
  }

  // Determine risk level
  let riskLevel: RiskLevel;
  if (riskScore >= 60) {
    riskLevel = 'critical';
  } else if (riskScore >= 40) {
    riskLevel = 'at-risk';
  } else if (riskScore >= 20) {
    riskLevel = 'watch';
  } else {
    riskLevel = 'on-track';
  }

  // Generate interventions
  const interventions = riskFactors.flatMap((f) => {
    if (f.factor.includes('activity')) {
      return ['Contact family about engagement', 'Check for barriers to access'];
    }
    if (f.factor.includes('completion')) {
      return ['Check for technical issues', 'Consider shorter sessions'];
    }
    return [];
  });

  return {
    riskLevel,
    riskScore,
    riskFactors,
    daysAtRisk: 0,
    interventions: [...new Set(interventions)].slice(0, 5),
  };
}

export default {
  getClassOverview,
  getSkillMasteryMatrix,
  getEarlyWarningReport,
  getIEPProgressReport,
  getStudentAnalytics,
  getEngagementAnalytics,
};
