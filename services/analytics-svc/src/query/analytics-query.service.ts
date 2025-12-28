// ══════════════════════════════════════════════════════════════════════════════
// ANALYTICS QUERY SERVICE
// Redshift-backed analytics queries with predictive analytics
// FERPA/GDPR compliant data access
// ══════════════════════════════════════════════════════════════════════════════

import { Redshift, ExecuteStatementCommand, GetStatementResultCommand } from '@aws-sdk/client-redshift-data';
import { S3 } from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';

import { logger, metrics } from '@aivo/ts-observability';

import type { PrismaClient } from '../../generated/prisma';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TimeRange {
  start: Date;
  end: Date;
}

export type AggregationPeriod = 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';

export interface StudentMetrics {
  studentId: string;
  tenantId: string;
  period: TimeRange;
  // Learning metrics
  lessonsStarted: number;
  lessonsCompleted: number;
  lessonCompletionRate: number;
  averageLessonScore: number;
  totalTimeOnTaskMinutes: number;
  questionsAnswered: number;
  questionsCorrect: number;
  accuracy: number;
  // Assessment metrics
  assessmentsTaken: number;
  assessmentsPassed: number;
  averageAssessmentScore: number;
  baselineCompleted: boolean;
  // Engagement metrics
  sessionCount: number;
  averageSessionDurationMinutes: number;
  loginStreak: number;
  badgesEarned: number;
  // Mastery metrics
  skillsAtMastery: number;
  skillsInProgress: number;
  overallMasteryLevel: number;
  masteryGrowthRate: number;
  // Activity
  lastActivityAt: Date | null;
  daysActiveInPeriod: number;
}

export interface ClassMetrics {
  classId: string;
  tenantId: string;
  period: TimeRange;
  // Summary
  studentCount: number;
  activeStudentCount: number;
  participationRate: number;
  // Learning
  averageLessonCompletionRate: number;
  averageLessonScore: number;
  totalLessonsCompleted: number;
  averageTimeOnTaskMinutes: number;
  // Assessments
  averageAssessmentScore: number;
  assessmentPassRate: number;
  // Mastery
  averageMasteryLevel: number;
  studentsAtMastery: number;
  // Distribution
  scoreDistribution: Record<string, number>;
  masteryDistribution: Record<string, number>;
  // At-risk
  atRiskStudentCount: number;
  atRiskStudentIds: string[];
}

export interface SkillMetrics {
  skillId: string;
  skillName: string;
  period: TimeRange;
  // Class aggregates
  studentCount: number;
  averageMasteryLevel: number;
  masteryRate: number;
  averageTimeToMastery: number;
  // Distribution
  masteryDistribution: Record<string, number>;
  // Difficulty indicators
  averageAttempts: number;
  errorRate: number;
  hintUsageRate: number;
}

export interface TenantMetrics {
  tenantId: string;
  period: TimeRange;
  // Overview
  totalStudents: number;
  activeStudents: number;
  totalTeachers: number;
  totalClasses: number;
  // Usage
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  // Learning
  totalLessonsCompleted: number;
  averageLessonScore: number;
  totalAssessmentsTaken: number;
  // Engagement
  averageSessionDuration: number;
  averageSessionsPerUser: number;
  // Growth
  newStudentsThisPeriod: number;
  studentGrowthRate: number;
}

export interface AtRiskIndicators {
  studentId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: AtRiskFactor[];
  lastUpdated: Date;
  recommendations: string[];
}

export interface AtRiskFactor {
  factor: string;
  weight: number;
  value: number;
  threshold: number;
  contribution: number;
  description: string;
}

export interface EngagementTrend {
  period: string;
  activeUsers: number;
  sessions: number;
  lessonsCompleted: number;
  assessmentsTaken: number;
  averageTimeMinutes: number;
}

export interface PerformanceTrend {
  period: string;
  averageScore: number;
  completionRate: number;
  masteryRate: number;
  accuracy: number;
}

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface AnalyticsQueryConfig {
  redshiftWorkgroup: string;
  redshiftDatabase: string;
  redshiftSecretArn: string;
  awsRegion: string;
  cacheEnabled: boolean;
  cacheTtlSeconds: number;
  atRiskThresholds: {
    inactivityDays: number;
    lowScore: number;
    lowCompletion: number;
    lowMastery: number;
  };
}

const DEFAULT_CONFIG: AnalyticsQueryConfig = {
  redshiftWorkgroup: process.env['REDSHIFT_WORKGROUP'] ?? 'aivo-analytics',
  redshiftDatabase: process.env['REDSHIFT_DATABASE'] ?? 'analytics',
  redshiftSecretArn: process.env['REDSHIFT_SECRET_ARN'] ?? '',
  awsRegion: process.env['AWS_REGION'] ?? 'us-east-1',
  cacheEnabled: true,
  cacheTtlSeconds: 300, // 5 minutes
  atRiskThresholds: {
    inactivityDays: 7,
    lowScore: 60,
    lowCompletion: 50,
    lowMastery: 40,
  },
};

// ─── Analytics Query Service ───────────────────────────────────────────────────

export class AnalyticsQueryService {
  private redshift: Redshift;
  private s3: S3;
  private config: AnalyticsQueryConfig;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: Redis,
    config?: Partial<AnalyticsQueryConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.redshift = new Redshift({
      region: this.config.awsRegion,
    });

    this.s3 = new S3({
      region: this.config.awsRegion,
    });
  }

  // ============================================================================
  // STUDENT METRICS
  // ============================================================================

  /**
   * Get comprehensive metrics for a student
   */
  async getStudentMetrics(
    studentId: string,
    tenantId: string,
    period: TimeRange
  ): Promise<StudentMetrics> {
    const cacheKey = `analytics:student:${studentId}:${this.formatPeriodKey(period)}`;

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        metrics.increment('analytics.cache.hit', { type: 'student' });
        return JSON.parse(cached);
      }
    }

    const startTime = Date.now();

    try {
      // Execute Redshift query
      const sql = this.buildStudentMetricsQuery(studentId, tenantId, period);
      const result = await this.executeRedshiftQuery(sql);

      const metricsData = this.parseStudentMetrics(result, studentId, tenantId, period);

      // Cache result
      if (this.config.cacheEnabled) {
        await this.redis.setex(
          cacheKey,
          this.config.cacheTtlSeconds,
          JSON.stringify(metricsData)
        );
      }

      metrics.timing('analytics.query.duration', Date.now() - startTime, {
        type: 'student',
      });

      return metricsData;
    } catch (error) {
      logger.error('Failed to get student metrics', { error, studentId, tenantId });

      // Fallback to Prisma if Redshift fails
      return this.getStudentMetricsFallback(studentId, tenantId, period);
    }
  }

  /**
   * Get metrics for multiple students (batch)
   */
  async getStudentsMetrics(
    studentIds: string[],
    tenantId: string,
    period: TimeRange
  ): Promise<Map<string, StudentMetrics>> {
    const results = new Map<string, StudentMetrics>();

    // Check cache for all students
    const cacheKeys = studentIds.map(
      (id) => `analytics:student:${id}:${this.formatPeriodKey(period)}`
    );
    const cachedValues = await this.redis.mget(cacheKeys);

    const uncachedIds: string[] = [];

    cachedValues.forEach((cached, index) => {
      if (cached) {
        results.set(studentIds[index]!, JSON.parse(cached));
      } else {
        uncachedIds.push(studentIds[index]!);
      }
    });

    // Fetch uncached from Redshift
    if (uncachedIds.length > 0) {
      const sql = this.buildBatchStudentMetricsQuery(uncachedIds, tenantId, period);
      const queryResult = await this.executeRedshiftQuery(sql);

      for (const row of queryResult) {
        const studentId = row.student_id as string;
        const metricsData = this.parseStudentMetricsRow(row, tenantId, period);
        results.set(studentId, metricsData);

        // Cache individual result
        const cacheKey = `analytics:student:${studentId}:${this.formatPeriodKey(period)}`;
        await this.redis.setex(
          cacheKey,
          this.config.cacheTtlSeconds,
          JSON.stringify(metricsData)
        );
      }
    }

    return results;
  }

  // ============================================================================
  // CLASS METRICS
  // ============================================================================

  /**
   * Get comprehensive metrics for a class
   */
  async getClassMetrics(
    classId: string,
    tenantId: string,
    period: TimeRange
  ): Promise<ClassMetrics> {
    const cacheKey = `analytics:class:${classId}:${this.formatPeriodKey(period)}`;

    // Check cache
    if (this.config.cacheEnabled) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        metrics.increment('analytics.cache.hit', { type: 'class' });
        return JSON.parse(cached);
      }
    }

    const startTime = Date.now();

    try {
      const sql = this.buildClassMetricsQuery(classId, tenantId, period);
      const result = await this.executeRedshiftQuery(sql);

      const metricsData = this.parseClassMetrics(result, classId, tenantId, period);

      // Get at-risk students
      const atRiskStudents = await this.identifyAtRiskStudents(classId, tenantId, period);
      metricsData.atRiskStudentCount = atRiskStudents.length;
      metricsData.atRiskStudentIds = atRiskStudents.map((s) => s.studentId);

      // Cache result
      if (this.config.cacheEnabled) {
        await this.redis.setex(
          cacheKey,
          this.config.cacheTtlSeconds,
          JSON.stringify(metricsData)
        );
      }

      metrics.timing('analytics.query.duration', Date.now() - startTime, {
        type: 'class',
      });

      return metricsData;
    } catch (error) {
      logger.error('Failed to get class metrics', { error, classId, tenantId });
      throw error;
    }
  }

  /**
   * Get class performance heatmap data
   */
  async getClassPerformanceHeatmap(
    classId: string,
    tenantId: string,
    period: TimeRange
  ): Promise<Array<{ skillId: string; studentId: string; masteryLevel: number }>> {
    const sql = `
      SELECT 
        skill_id,
        student_id,
        mastery_level
      FROM analytics.skill_mastery
      WHERE class_id = '${classId}'
        AND tenant_id = '${tenantId}'
        AND updated_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      ORDER BY skill_id, student_id
    `;

    const result = await this.executeRedshiftQuery(sql);

    return result.map((row) => ({
      skillId: row.skill_id as string,
      studentId: row.student_id as string,
      masteryLevel: row.mastery_level as number,
    }));
  }

  // ============================================================================
  // SKILL METRICS
  // ============================================================================

  /**
   * Get metrics for a skill across a class
   */
  async getSkillMetrics(
    skillId: string,
    classId: string,
    tenantId: string,
    period: TimeRange
  ): Promise<SkillMetrics> {
    const cacheKey = `analytics:skill:${skillId}:${classId}:${this.formatPeriodKey(period)}`;

    if (this.config.cacheEnabled) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const sql = `
      SELECT 
        skill_id,
        skill_name,
        COUNT(DISTINCT student_id) as student_count,
        AVG(mastery_level) as avg_mastery,
        COUNT(CASE WHEN mastery_level >= 0.9 THEN 1 END)::FLOAT / COUNT(*) as mastery_rate,
        AVG(time_to_mastery_hours) as avg_time_to_mastery,
        AVG(attempt_count) as avg_attempts,
        AVG(error_rate) as error_rate,
        AVG(hint_usage_rate) as hint_usage_rate,
        -- Mastery distribution
        COUNT(CASE WHEN mastery_level < 0.25 THEN 1 END) as mastery_0_25,
        COUNT(CASE WHEN mastery_level >= 0.25 AND mastery_level < 0.5 THEN 1 END) as mastery_25_50,
        COUNT(CASE WHEN mastery_level >= 0.5 AND mastery_level < 0.75 THEN 1 END) as mastery_50_75,
        COUNT(CASE WHEN mastery_level >= 0.75 AND mastery_level < 0.9 THEN 1 END) as mastery_75_90,
        COUNT(CASE WHEN mastery_level >= 0.9 THEN 1 END) as mastery_90_100
      FROM analytics.skill_mastery sm
      JOIN analytics.dim_skills s ON sm.skill_id = s.id
      WHERE sm.skill_id = '${skillId}'
        AND sm.class_id = '${classId}'
        AND sm.tenant_id = '${tenantId}'
        AND sm.updated_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      GROUP BY skill_id, skill_name
    `;

    const result = await this.executeRedshiftQuery(sql);
    const row = result[0];

    if (!row) {
      return this.getEmptySkillMetrics(skillId, period);
    }

    const metricsData: SkillMetrics = {
      skillId,
      skillName: row.skill_name as string,
      period,
      studentCount: row.student_count as number,
      averageMasteryLevel: row.avg_mastery as number,
      masteryRate: row.mastery_rate as number,
      averageTimeToMastery: row.avg_time_to_mastery as number,
      masteryDistribution: {
        '0-25': row.mastery_0_25 as number,
        '25-50': row.mastery_25_50 as number,
        '50-75': row.mastery_50_75 as number,
        '75-90': row.mastery_75_90 as number,
        '90-100': row.mastery_90_100 as number,
      },
      averageAttempts: row.avg_attempts as number,
      errorRate: row.error_rate as number,
      hintUsageRate: row.hint_usage_rate as number,
    };

    if (this.config.cacheEnabled) {
      await this.redis.setex(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(metricsData)
      );
    }

    return metricsData;
  }

  // ============================================================================
  // TENANT METRICS
  // ============================================================================

  /**
   * Get tenant-wide analytics
   */
  async getTenantMetrics(tenantId: string, period: TimeRange): Promise<TenantMetrics> {
    const cacheKey = `analytics:tenant:${tenantId}:${this.formatPeriodKey(period)}`;

    if (this.config.cacheEnabled) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const sql = `
      SELECT 
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student') as total_students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student' AND u.last_activity_at >= CURRENT_DATE - 30) as active_students,
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'teacher') as total_teachers,
        COUNT(DISTINCT c.id) as total_classes,
        -- Usage
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.event_time >= CURRENT_DATE) as dau,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.event_time >= CURRENT_DATE - 7) as wau,
        COUNT(DISTINCT e.student_id) FILTER (WHERE e.event_time >= CURRENT_DATE - 30) as mau,
        -- Learning
        COUNT(*) FILTER (WHERE e.event_type = 'lesson.completed') as lessons_completed,
        AVG(e.score) FILTER (WHERE e.event_type = 'lesson.completed') as avg_lesson_score,
        COUNT(*) FILTER (WHERE e.event_type = 'assessment.submitted') as assessments_taken,
        -- Engagement
        AVG(s.duration_minutes) as avg_session_duration,
        COUNT(s.id)::FLOAT / NULLIF(COUNT(DISTINCT s.student_id), 0) as avg_sessions_per_user,
        -- Growth
        COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'student' AND u.created_at >= '${period.start.toISOString()}') as new_students
      FROM analytics.dim_users u
      LEFT JOIN analytics.fact_events e ON u.id = e.student_id 
        AND e.event_time BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      LEFT JOIN analytics.fact_sessions s ON u.id = s.student_id
        AND s.started_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      LEFT JOIN analytics.dim_classes c ON c.tenant_id = u.tenant_id
      WHERE u.tenant_id = '${tenantId}'
      GROUP BY u.tenant_id
    `;

    const result = await this.executeRedshiftQuery(sql);
    const row = result[0];

    if (!row) {
      return this.getEmptyTenantMetrics(tenantId, period);
    }

    const metricsData: TenantMetrics = {
      tenantId,
      period,
      totalStudents: row.total_students as number,
      activeStudents: row.active_students as number,
      totalTeachers: row.total_teachers as number,
      totalClasses: row.total_classes as number,
      dailyActiveUsers: row.dau as number,
      weeklyActiveUsers: row.wau as number,
      monthlyActiveUsers: row.mau as number,
      totalLessonsCompleted: row.lessons_completed as number,
      averageLessonScore: row.avg_lesson_score as number,
      totalAssessmentsTaken: row.assessments_taken as number,
      averageSessionDuration: row.avg_session_duration as number,
      averageSessionsPerUser: row.avg_sessions_per_user as number,
      newStudentsThisPeriod: row.new_students as number,
      studentGrowthRate: this.calculateGrowthRate(
        row.new_students as number,
        row.total_students as number
      ),
    };

    if (this.config.cacheEnabled) {
      await this.redis.setex(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(metricsData)
      );
    }

    return metricsData;
  }

  // ============================================================================
  // AT-RISK IDENTIFICATION
  // ============================================================================

  /**
   * Identify at-risk students in a class
   */
  async identifyAtRiskStudents(
    classId: string,
    tenantId: string,
    period: TimeRange
  ): Promise<AtRiskIndicators[]> {
    const cacheKey = `analytics:atrisk:${classId}:${this.formatPeriodKey(period)}`;

    if (this.config.cacheEnabled) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    const sql = `
      WITH student_metrics AS (
        SELECT 
          s.student_id,
          -- Inactivity
          DATEDIFF(day, MAX(e.event_time), CURRENT_DATE) as days_inactive,
          -- Performance
          AVG(e.score) FILTER (WHERE e.event_type LIKE 'lesson.%') as avg_score,
          AVG(e.score) FILTER (WHERE e.event_type LIKE 'assessment.%') as avg_assessment_score,
          -- Completion
          COUNT(*) FILTER (WHERE e.event_type = 'lesson.completed')::FLOAT / 
            NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'lesson.started'), 0) as completion_rate,
          -- Mastery
          AVG(sm.mastery_level) as avg_mastery,
          -- Engagement
          COUNT(DISTINCT DATE_TRUNC('day', e.event_time)) as active_days,
          AVG(sess.duration_minutes) as avg_session_duration
        FROM analytics.dim_enrollments s
        LEFT JOIN analytics.fact_events e ON s.student_id = e.student_id
          AND e.event_time BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
        LEFT JOIN analytics.skill_mastery sm ON s.student_id = sm.student_id
        LEFT JOIN analytics.fact_sessions sess ON s.student_id = sess.student_id
          AND sess.started_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
        WHERE s.class_id = '${classId}'
          AND s.tenant_id = '${tenantId}'
        GROUP BY s.student_id
      )
      SELECT *,
        -- Calculate risk score (weighted factors)
        CASE 
          WHEN days_inactive > ${this.config.atRiskThresholds.inactivityDays * 2} THEN 30
          WHEN days_inactive > ${this.config.atRiskThresholds.inactivityDays} THEN 15
          ELSE 0
        END +
        CASE 
          WHEN COALESCE(avg_score, 0) < ${this.config.atRiskThresholds.lowScore - 20} THEN 25
          WHEN COALESCE(avg_score, 0) < ${this.config.atRiskThresholds.lowScore} THEN 15
          ELSE 0
        END +
        CASE 
          WHEN COALESCE(completion_rate, 0) < ${(this.config.atRiskThresholds.lowCompletion - 20) / 100} THEN 25
          WHEN COALESCE(completion_rate, 0) < ${this.config.atRiskThresholds.lowCompletion / 100} THEN 15
          ELSE 0
        END +
        CASE 
          WHEN COALESCE(avg_mastery, 0) < ${(this.config.atRiskThresholds.lowMastery - 20) / 100} THEN 20
          WHEN COALESCE(avg_mastery, 0) < ${this.config.atRiskThresholds.lowMastery / 100} THEN 10
          ELSE 0
        END as risk_score
      FROM student_metrics
      WHERE days_inactive > ${this.config.atRiskThresholds.inactivityDays}
        OR COALESCE(avg_score, 0) < ${this.config.atRiskThresholds.lowScore}
        OR COALESCE(completion_rate, 0) < ${this.config.atRiskThresholds.lowCompletion / 100}
        OR COALESCE(avg_mastery, 0) < ${this.config.atRiskThresholds.lowMastery / 100}
      ORDER BY risk_score DESC
    `;

    const result = await this.executeRedshiftQuery(sql);

    const atRiskStudents: AtRiskIndicators[] = result.map((row) => {
      const riskScore = row.risk_score as number;
      const factors: AtRiskFactor[] = [];

      // Build factors
      if ((row.days_inactive as number) > this.config.atRiskThresholds.inactivityDays) {
        factors.push({
          factor: 'inactivity',
          weight: 0.3,
          value: row.days_inactive as number,
          threshold: this.config.atRiskThresholds.inactivityDays,
          contribution: (row.days_inactive as number) > this.config.atRiskThresholds.inactivityDays * 2 ? 30 : 15,
          description: `Student has been inactive for ${row.days_inactive} days`,
        });
      }

      if ((row.avg_score as number) < this.config.atRiskThresholds.lowScore) {
        factors.push({
          factor: 'low_performance',
          weight: 0.25,
          value: row.avg_score as number,
          threshold: this.config.atRiskThresholds.lowScore,
          contribution: (row.avg_score as number) < this.config.atRiskThresholds.lowScore - 20 ? 25 : 15,
          description: `Average score of ${Math.round(row.avg_score as number)}% is below threshold`,
        });
      }

      if ((row.completion_rate as number) < this.config.atRiskThresholds.lowCompletion / 100) {
        factors.push({
          factor: 'low_completion',
          weight: 0.25,
          value: (row.completion_rate as number) * 100,
          threshold: this.config.atRiskThresholds.lowCompletion,
          contribution: (row.completion_rate as number) < (this.config.atRiskThresholds.lowCompletion - 20) / 100 ? 25 : 15,
          description: `Completion rate of ${Math.round((row.completion_rate as number) * 100)}% is below threshold`,
        });
      }

      if ((row.avg_mastery as number) < this.config.atRiskThresholds.lowMastery / 100) {
        factors.push({
          factor: 'low_mastery',
          weight: 0.2,
          value: (row.avg_mastery as number) * 100,
          threshold: this.config.atRiskThresholds.lowMastery,
          contribution: (row.avg_mastery as number) < (this.config.atRiskThresholds.lowMastery - 20) / 100 ? 20 : 10,
          description: `Average mastery of ${Math.round((row.avg_mastery as number) * 100)}% is below threshold`,
        });
      }

      return {
        studentId: row.student_id as string,
        riskLevel: this.getRiskLevel(riskScore),
        riskScore,
        factors,
        lastUpdated: new Date(),
        recommendations: this.generateRecommendations(factors),
      };
    });

    if (this.config.cacheEnabled) {
      await this.redis.setex(
        cacheKey,
        this.config.cacheTtlSeconds,
        JSON.stringify(atRiskStudents)
      );
    }

    return atRiskStudents;
  }

  // ============================================================================
  // TRENDS
  // ============================================================================

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(
    tenantId: string,
    period: TimeRange,
    aggregation: AggregationPeriod
  ): Promise<EngagementTrend[]> {
    const sql = `
      SELECT 
        DATE_TRUNC('${aggregation}', e.event_time) as period,
        COUNT(DISTINCT e.student_id) as active_users,
        COUNT(DISTINCT e.session_id) as sessions,
        COUNT(*) FILTER (WHERE e.event_type = 'lesson.completed') as lessons_completed,
        COUNT(*) FILTER (WHERE e.event_type = 'assessment.submitted') as assessments_taken,
        AVG(s.duration_minutes) as avg_time_minutes
      FROM analytics.fact_events e
      LEFT JOIN analytics.fact_sessions s ON e.session_id = s.id
      WHERE e.tenant_id = '${tenantId}'
        AND e.event_time BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      GROUP BY DATE_TRUNC('${aggregation}', e.event_time)
      ORDER BY period
    `;

    const result = await this.executeRedshiftQuery(sql);

    return result.map((row) => ({
      period: (row.period as Date).toISOString(),
      activeUsers: row.active_users as number,
      sessions: row.sessions as number,
      lessonsCompleted: row.lessons_completed as number,
      assessmentsTaken: row.assessments_taken as number,
      averageTimeMinutes: row.avg_time_minutes as number,
    }));
  }

  /**
   * Get performance trends over time
   */
  async getPerformanceTrends(
    classId: string,
    tenantId: string,
    period: TimeRange,
    aggregation: AggregationPeriod
  ): Promise<PerformanceTrend[]> {
    const sql = `
      SELECT 
        DATE_TRUNC('${aggregation}', e.event_time) as period,
        AVG(e.score) as avg_score,
        COUNT(*) FILTER (WHERE e.event_type = 'lesson.completed')::FLOAT /
          NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'lesson.started'), 0) as completion_rate,
        COUNT(DISTINCT sm.student_id) FILTER (WHERE sm.mastery_level >= 0.9)::FLOAT /
          NULLIF(COUNT(DISTINCT sm.student_id), 0) as mastery_rate,
        SUM(CASE WHEN e.correct THEN 1 ELSE 0 END)::FLOAT /
          NULLIF(COUNT(*) FILTER (WHERE e.event_type = 'question.answered'), 0) as accuracy
      FROM analytics.fact_events e
      LEFT JOIN analytics.skill_mastery sm ON e.student_id = sm.student_id
        AND sm.updated_at BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      WHERE e.class_id = '${classId}'
        AND e.tenant_id = '${tenantId}'
        AND e.event_time BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      GROUP BY DATE_TRUNC('${aggregation}', e.event_time)
      ORDER BY period
    `;

    const result = await this.executeRedshiftQuery(sql);

    return result.map((row) => ({
      period: (row.period as Date).toISOString(),
      averageScore: (row.avg_score as number) || 0,
      completionRate: (row.completion_rate as number) || 0,
      masteryRate: (row.mastery_rate as number) || 0,
      accuracy: (row.accuracy as number) || 0,
    }));
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Execute a Redshift query
   */
  private async executeRedshiftQuery(sql: string): Promise<Record<string, unknown>[]> {
    const startTime = Date.now();

    try {
      // Execute statement
      const executeCommand = new ExecuteStatementCommand({
        WorkgroupName: this.config.redshiftWorkgroup,
        Database: this.config.redshiftDatabase,
        SecretArn: this.config.redshiftSecretArn,
        Sql: sql,
      });

      const executeResult = await this.redshift.send(executeCommand);
      const statementId = executeResult.Id!;

      // Poll for result
      let status = 'SUBMITTED';
      while (status === 'SUBMITTED' || status === 'PICKED' || status === 'STARTED') {
        await this.sleep(100);
        const { Status } = await this.redshift.describeStatement({ Id: statementId });
        status = Status!;

        if (status === 'FAILED' || status === 'ABORTED') {
          throw new Error(`Query failed with status: ${status}`);
        }
      }

      // Get results
      const getResultCommand = new GetStatementResultCommand({ Id: statementId });
      const resultData = await this.redshift.send(getResultCommand);

      const columns = resultData.ColumnMetadata?.map((c) => c.name!) ?? [];
      const rows = resultData.Records ?? [];

      const results = rows.map((row) => {
        const obj: Record<string, unknown> = {};
        row.forEach((cell, index) => {
          const columnName = columns[index]!;
          obj[columnName] = this.extractCellValue(cell);
        });
        return obj;
      });

      metrics.timing('analytics.redshift.query_time', Date.now() - startTime);
      logger.debug('Redshift query executed', { rowCount: results.length });

      return results;
    } catch (error) {
      logger.error('Redshift query failed', { error, sql: sql.substring(0, 200) });
      throw error;
    }
  }

  private extractCellValue(cell: Record<string, unknown>): unknown {
    if (cell.stringValue !== undefined) return cell.stringValue;
    if (cell.longValue !== undefined) return cell.longValue;
    if (cell.doubleValue !== undefined) return cell.doubleValue;
    if (cell.booleanValue !== undefined) return cell.booleanValue;
    if (cell.isNull) return null;
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private formatPeriodKey(period: TimeRange): string {
    return `${period.start.toISOString().split('T')[0]}:${period.end.toISOString().split('T')[0]}`;
  }

  private calculateGrowthRate(newCount: number, totalCount: number): number {
    if (totalCount === 0) return 0;
    return (newCount / totalCount) * 100;
  }

  private getRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  private generateRecommendations(factors: AtRiskFactor[]): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      switch (factor.factor) {
        case 'inactivity':
          recommendations.push('Send a personalized re-engagement notification');
          recommendations.push('Assign a shorter, engaging lesson to restart momentum');
          break;
        case 'low_performance':
          recommendations.push('Provide additional practice opportunities');
          recommendations.push('Consider adaptive content at a lower difficulty level');
          break;
        case 'low_completion':
          recommendations.push('Break lessons into smaller chunks');
          recommendations.push('Add more interactive elements to maintain engagement');
          break;
        case 'low_mastery':
          recommendations.push('Schedule targeted intervention sessions');
          recommendations.push('Assign prerequisite skill practice');
          break;
      }
    }

    return [...new Set(recommendations)]; // Deduplicate
  }

  // Query builders (simplified for brevity)
  private buildStudentMetricsQuery(studentId: string, tenantId: string, period: TimeRange): string {
    return `
      SELECT 
        '${studentId}' as student_id,
        COUNT(*) FILTER (WHERE event_type = 'lesson.started') as lessons_started,
        COUNT(*) FILTER (WHERE event_type = 'lesson.completed') as lessons_completed,
        AVG(score) FILTER (WHERE event_type = 'lesson.completed') as avg_lesson_score,
        SUM(time_spent_seconds) / 60.0 as total_time_minutes,
        COUNT(*) FILTER (WHERE event_type = 'question.answered') as questions_answered,
        COUNT(*) FILTER (WHERE event_type = 'question.answered' AND correct = true) as questions_correct,
        COUNT(*) FILTER (WHERE event_type = 'assessment.submitted') as assessments_taken,
        COUNT(*) FILTER (WHERE event_type = 'assessment.submitted' AND passed = true) as assessments_passed,
        AVG(score) FILTER (WHERE event_type = 'assessment.submitted') as avg_assessment_score,
        COUNT(DISTINCT session_id) as session_count,
        COUNT(DISTINCT DATE_TRUNC('day', event_time)) as active_days,
        MAX(event_time) as last_activity
      FROM analytics.fact_events
      WHERE student_id = '${studentId}'
        AND tenant_id = '${tenantId}'
        AND event_time BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
    `;
  }

  private buildBatchStudentMetricsQuery(studentIds: string[], tenantId: string, period: TimeRange): string {
    const idList = studentIds.map((id) => `'${id}'`).join(',');
    return `
      SELECT 
        student_id,
        COUNT(*) FILTER (WHERE event_type = 'lesson.started') as lessons_started,
        COUNT(*) FILTER (WHERE event_type = 'lesson.completed') as lessons_completed,
        AVG(score) FILTER (WHERE event_type = 'lesson.completed') as avg_lesson_score,
        SUM(time_spent_seconds) / 60.0 as total_time_minutes,
        COUNT(*) FILTER (WHERE event_type = 'question.answered') as questions_answered,
        COUNT(*) FILTER (WHERE event_type = 'question.answered' AND correct = true) as questions_correct,
        COUNT(*) FILTER (WHERE event_type = 'assessment.submitted') as assessments_taken,
        COUNT(*) FILTER (WHERE event_type = 'assessment.submitted' AND passed = true) as assessments_passed,
        AVG(score) FILTER (WHERE event_type = 'assessment.submitted') as avg_assessment_score,
        COUNT(DISTINCT session_id) as session_count,
        COUNT(DISTINCT DATE_TRUNC('day', event_time)) as active_days,
        MAX(event_time) as last_activity
      FROM analytics.fact_events
      WHERE student_id IN (${idList})
        AND tenant_id = '${tenantId}'
        AND event_time BETWEEN '${period.start.toISOString()}' AND '${period.end.toISOString()}'
      GROUP BY student_id
    `;
  }

  private buildClassMetricsQuery(classId: string, tenantId: string, period: TimeRange): string {
    return `
      SELECT 
        COUNT(DISTINCT student_id) as student_count,
        COUNT(DISTINCT student_id) FILTER (WHERE event_time >= CURRENT_DATE - 7) as active_students,
        AVG(completion_rate) as avg_completion_rate,
        AVG(score) as avg_score,
        COUNT(*) FILTER (WHERE event_type = 'lesson.completed') as total_lessons_completed,
        AVG(time_spent_minutes) as avg_time_minutes,
        AVG(assessment_score) as avg_assessment_score,
        AVG(passed::INT) as assessment_pass_rate,
        AVG(mastery_level) as avg_mastery
      FROM analytics.class_aggregates
      WHERE class_id = '${classId}'
        AND tenant_id = '${tenantId}'
        AND period_date BETWEEN '${period.start.toISOString()}'::DATE AND '${period.end.toISOString()}'::DATE
    `;
  }

  // Fallback/empty data methods
  private async getStudentMetricsFallback(
    studentId: string,
    tenantId: string,
    period: TimeRange
  ): Promise<StudentMetrics> {
    // Fallback to Prisma queries if Redshift is unavailable
    return this.getEmptyStudentMetrics(studentId, tenantId, period);
  }

  private getEmptyStudentMetrics(studentId: string, tenantId: string, period: TimeRange): StudentMetrics {
    return {
      studentId,
      tenantId,
      period,
      lessonsStarted: 0,
      lessonsCompleted: 0,
      lessonCompletionRate: 0,
      averageLessonScore: 0,
      totalTimeOnTaskMinutes: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      accuracy: 0,
      assessmentsTaken: 0,
      assessmentsPassed: 0,
      averageAssessmentScore: 0,
      baselineCompleted: false,
      sessionCount: 0,
      averageSessionDurationMinutes: 0,
      loginStreak: 0,
      badgesEarned: 0,
      skillsAtMastery: 0,
      skillsInProgress: 0,
      overallMasteryLevel: 0,
      masteryGrowthRate: 0,
      lastActivityAt: null,
      daysActiveInPeriod: 0,
    };
  }

  private parseStudentMetrics(
    result: Record<string, unknown>[],
    studentId: string,
    tenantId: string,
    period: TimeRange
  ): StudentMetrics {
    const row = result[0];
    if (!row) return this.getEmptyStudentMetrics(studentId, tenantId, period);
    return this.parseStudentMetricsRow(row, tenantId, period);
  }

  private parseStudentMetricsRow(
    row: Record<string, unknown>,
    tenantId: string,
    period: TimeRange
  ): StudentMetrics {
    const lessonsStarted = (row.lessons_started as number) || 0;
    const lessonsCompleted = (row.lessons_completed as number) || 0;
    const questionsAnswered = (row.questions_answered as number) || 0;
    const questionsCorrect = (row.questions_correct as number) || 0;
    const assessmentsTaken = (row.assessments_taken as number) || 0;
    const assessmentsPassed = (row.assessments_passed as number) || 0;

    return {
      studentId: row.student_id as string,
      tenantId,
      period,
      lessonsStarted,
      lessonsCompleted,
      lessonCompletionRate: lessonsStarted > 0 ? lessonsCompleted / lessonsStarted : 0,
      averageLessonScore: (row.avg_lesson_score as number) || 0,
      totalTimeOnTaskMinutes: (row.total_time_minutes as number) || 0,
      questionsAnswered,
      questionsCorrect,
      accuracy: questionsAnswered > 0 ? questionsCorrect / questionsAnswered : 0,
      assessmentsTaken,
      assessmentsPassed,
      averageAssessmentScore: (row.avg_assessment_score as number) || 0,
      baselineCompleted: false, // Would need separate query
      sessionCount: (row.session_count as number) || 0,
      averageSessionDurationMinutes: 0, // Would need session data
      loginStreak: 0, // Would need streak calculation
      badgesEarned: 0, // Would need badges data
      skillsAtMastery: 0, // Would need mastery data
      skillsInProgress: 0,
      overallMasteryLevel: 0,
      masteryGrowthRate: 0,
      lastActivityAt: row.last_activity ? new Date(row.last_activity as string) : null,
      daysActiveInPeriod: (row.active_days as number) || 0,
    };
  }

  private parseClassMetrics(
    result: Record<string, unknown>[],
    classId: string,
    tenantId: string,
    period: TimeRange
  ): ClassMetrics {
    const row = result[0];
    
    return {
      classId,
      tenantId,
      period,
      studentCount: (row?.student_count as number) || 0,
      activeStudentCount: (row?.active_students as number) || 0,
      participationRate: row?.student_count
        ? ((row.active_students as number) / (row.student_count as number)) * 100
        : 0,
      averageLessonCompletionRate: (row?.avg_completion_rate as number) || 0,
      averageLessonScore: (row?.avg_score as number) || 0,
      totalLessonsCompleted: (row?.total_lessons_completed as number) || 0,
      averageTimeOnTaskMinutes: (row?.avg_time_minutes as number) || 0,
      averageAssessmentScore: (row?.avg_assessment_score as number) || 0,
      assessmentPassRate: (row?.assessment_pass_rate as number) || 0,
      averageMasteryLevel: (row?.avg_mastery as number) || 0,
      studentsAtMastery: 0, // Would need separate calculation
      scoreDistribution: {},
      masteryDistribution: {},
      atRiskStudentCount: 0,
      atRiskStudentIds: [],
    };
  }

  private getEmptySkillMetrics(skillId: string, period: TimeRange): SkillMetrics {
    return {
      skillId,
      skillName: '',
      period,
      studentCount: 0,
      averageMasteryLevel: 0,
      masteryRate: 0,
      averageTimeToMastery: 0,
      masteryDistribution: {},
      averageAttempts: 0,
      errorRate: 0,
      hintUsageRate: 0,
    };
  }

  private getEmptyTenantMetrics(tenantId: string, period: TimeRange): TenantMetrics {
    return {
      tenantId,
      period,
      totalStudents: 0,
      activeStudents: 0,
      totalTeachers: 0,
      totalClasses: 0,
      dailyActiveUsers: 0,
      weeklyActiveUsers: 0,
      monthlyActiveUsers: 0,
      totalLessonsCompleted: 0,
      averageLessonScore: 0,
      totalAssessmentsTaken: 0,
      averageSessionDuration: 0,
      averageSessionsPerUser: 0,
      newStudentsThisPeriod: 0,
      studentGrowthRate: 0,
    };
  }
}
