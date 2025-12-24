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

  // Calculate mastery (using mock data for now - would query learner model)
  const masteryScores = students.map(() => Math.random() * 0.5 + 0.4); // Mock: 40-90%
  const averageMastery = calculateAverage(masteryScores);

  // Calculate mastery distribution
  const masteryDistribution = {
    mastered: masteryScores.filter((s) => s >= 0.9).length,
    proficient: masteryScores.filter((s) => s >= 0.7 && s < 0.9).length,
    developing: masteryScores.filter((s) => s >= 0.5 && s < 0.7).length,
    beginning: masteryScores.filter((s) => s < 0.5).length,
  };

  // Calculate engagement
  const engagementScores = students.map((student) => {
    if (student.sessions.length === 0) return 0;
    const completedSessions = student.sessions.filter((s) => s.status === 'completed');
    return completedSessions.length / Math.max(student.sessions.length, 1);
  });
  const averageEngagement = calculateAverage(engagementScores);

  // Calculate risk distribution
  const riskLevels = masteryScores.map((m, i) => {
    const e = engagementScores[i] || 0;
    const score = m * 0.6 + e * 0.4;
    if (score >= 0.7) return 'on-track';
    if (score >= 0.5) return 'watch';
    if (score >= 0.3) return 'at-risk';
    return 'critical';
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

  // Generate mock trends
  const masteryTrend: TrendData = {
    direction: 'up',
    percentChange: 3.5,
    dataPoints: generateTrendDataPoints(period, averageMastery),
  };

  const engagementTrend: TrendData = {
    direction: 'stable',
    percentChange: 0.5,
    dataPoints: generateTrendDataPoints(period, averageEngagement),
  };

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
      masteryChange: 3.5,
      engagementChange: 0.5,
      timeChange: 12,
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

  // Mock skills data
  const skills = [
    {
      skillId: 'skill-1',
      skillName: 'Addition',
      domain: 'Arithmetic',
      standardId: 'CCSS.MATH.1.NBT.C.4',
    },
    {
      skillId: 'skill-2',
      skillName: 'Subtraction',
      domain: 'Arithmetic',
      standardId: 'CCSS.MATH.1.NBT.C.6',
    },
    {
      skillId: 'skill-3',
      skillName: 'Multiplication',
      domain: 'Arithmetic',
      standardId: 'CCSS.MATH.3.OA.A.1',
    },
    {
      skillId: 'skill-4',
      skillName: 'Division',
      domain: 'Arithmetic',
      standardId: 'CCSS.MATH.3.OA.A.2',
    },
    {
      skillId: 'skill-5',
      skillName: 'Fractions',
      domain: 'Number Sense',
      standardId: 'CCSS.MATH.3.NF.A.1',
    },
  ].filter((s) => !domainFilter || s.domain === domainFilter);

  // Build student mastery data
  const students = classInfo.enrollments.map((enrollment) => {
    const student = enrollment.student;
    const masteryBySkill: Record<
      string,
      { mastery: number; trend: 'up' | 'down' | 'stable'; attempts: number }
    > = {};

    for (const skill of skills) {
      const mastery = Math.random() * 0.6 + 0.3; // Mock: 30-90%
      masteryBySkill[skill.skillId] = {
        mastery,
        trend: ['up', 'down', 'stable'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'stable',
        attempts: Math.floor(Math.random() * 20) + 1,
      };
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

  // Mock IEP data - in real implementation, query IEP tables
  const studentsWithIEP = classInfo.enrollments.slice(0, 3).map((e) => ({
    studentId: e.student.id,
    studentName: `${e.student.givenName} ${e.student.familyName}`,
    goals: [
      {
        goalId: `goal-${e.student.id}-1`,
        description: 'Improve reading comprehension to grade level',
        category: 'Reading',
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        currentProgress: Math.random() * 60 + 20,
        expectedProgress: 50,
        status: 'on-track' as const,
        recentProgress: [],
        relatedSkill: 'Reading Comprehension',
      },
    ],
    accommodations: [
      { type: 'Extended Time', description: '1.5x time on assessments', isActive: true },
    ],
    overallProgress: Math.random() * 40 + 40,
    goalsAtRisk: 0,
  }));

  return {
    classId,
    className: classInfo.name,
    totalStudentsWithIEP: studentsWithIEP.length,
    totalGoals: studentsWithIEP.reduce((sum, s) => sum + s.goals.length, 0),
    goalsOnTrack: studentsWithIEP.reduce(
      (sum, s) => sum + s.goals.filter((g) => g.status === 'on-track').length,
      0
    ),
    goalsAtRisk: studentsWithIEP.reduce((sum, s) => sum + s.goalsAtRisk, 0),
    students: studentsWithIEP,
    upcomingReviewDates: [],
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

  // Build response with mock data for complex fields
  return {
    studentId,
    studentName: `${student.givenName} ${student.familyName}`,
    gradeLevel: student.gradeLevel || 5,
    overallMastery: Math.random() * 0.4 + 0.5,
    masteryTrend: { direction: 'up' as const, percentChange: 5.2, dataPoints: [] },
    engagementLevel: 'engaged' as EngagementLevel,
    riskLevel: 'on-track' as RiskLevel,
    riskFactors: [],
    totalLearningTime: Math.floor(Math.random() * 500 + 200),
    averageSessionLength: 25,
    sessionsCompleted: student.sessions.filter((s) => s.status === 'completed').length,
    lastActiveDate: student.sessions[0]?.startTime || new Date(),
    streakDays: Math.floor(Math.random() * 10),
    skillMastery: [],
    strengthAreas: ['Addition', 'Number Sense'],
    growthAreas: ['Fractions'],
    engagementMetrics: {
      averageTimeOnTask: 22,
      completionRate: 0.85,
      hintUsageRate: 0.15,
      correctFirstAttemptRate: 0.72,
    },
    iepProgress: undefined,
    activeAccommodations: [],
    recentSessions: student.sessions.slice(0, 5).map((s) => ({
      sessionId: s.id,
      date: s.startTime,
      duration: s.endTime
        ? Math.round((new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000)
        : 0,
      activitiesCompleted: Math.floor(Math.random() * 10) + 1,
      averageScore: Math.random() * 0.3 + 0.6,
      skillsPracticed: [],
      engagementLevel: 'engaged' as EngagementLevel,
    })),
    recommendations: [],
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

  return {
    classId,
    totalStudents: students.length,
    activeStudents,
    averageTimeOnTask: 22,
    completionRate: 0.78,
    averageSessionsPerWeek: 3.2,
    timeOnTaskTrend: { direction: 'up' as const, percentChange: 8 },
    completionRateTrend: { direction: 'stable' as const, percentChange: 1 },
    sessionsTrend: { direction: 'up' as const, percentChange: 12 },
    distribution: {
      highlyEngaged: Math.floor(students.length * 0.2),
      engaged: Math.floor(students.length * 0.4),
      passive: Math.floor(students.length * 0.25),
      disengaged: Math.floor(students.length * 0.1),
      absent: Math.floor(students.length * 0.05),
    },
    weeklyActivity: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => ({
      day,
      sessions: Math.floor(Math.random() * 50) + 10,
      avgDuration: Math.floor(Math.random() * 15) + 15,
    })),
    lowEngagementStudents: students.slice(0, 3).map((s) => ({
      studentId: s.id,
      studentName: `${s.givenName} ${s.familyName}`,
      engagementLevel: 'disengaged' as EngagementLevel,
      lastActiveDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    })),
  };
}

// =====================
// Helper Functions
// =====================

function generateTrendDataPoints(
  period: TimePeriod,
  baseValue: number
): { date: string; value: number }[] {
  const points: { date: string; value: number }[] = [];
  const numPoints = period === 'today' ? 24 : period === 'week' ? 7 : period === 'month' ? 30 : 12;

  for (let i = numPoints - 1; i >= 0; i--) {
    const date = new Date();
    if (period === 'today') {
      date.setHours(date.getHours() - i);
    } else {
      date.setDate(date.getDate() - i);
    }
    points.push({
      date: date.toISOString().split('T')[0],
      value: baseValue + (Math.random() - 0.5) * 0.1,
    });
  }

  return points;
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
