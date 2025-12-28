/**
 * Analytics Aggregation Jobs
 *
 * ETL jobs for building analytics aggregation tables in Redshift.
 * These run on a schedule to populate daily/weekly/monthly aggregates.
 */

import { toDateKey, formatDate, startOfDay, endOfDay, startOfWeek, endOfWeek } from '../dateUtils.js';
import { getSourcePool, getWarehousePool, withTransaction } from '../db.js';
import { runJob, createLogger } from '../logger.js';
import type { JobResult } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD AGG_DAILY_STUDENT_METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build agg_daily_student_metrics for a target date.
 * Aggregates all student activity into daily metrics.
 */
export async function jobBuildDailyStudentMetrics(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_agg_daily_student_metrics', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_agg_daily_student_metrics');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;

    // Query source data - aggregate student metrics for the day
    const metricsResult = await source.query(
      `
      WITH session_metrics AS (
        SELECT 
          s.learner_id as user_id,
          s.tenant_id,
          COUNT(DISTINCT s.id) as sessions_count,
          SUM(COALESCE(s.duration_ms, 0)) / 1000 as total_time_seconds,
          COUNT(DISTINCT s.id) FILTER (WHERE s.session_type = 'LEARNING') as learning_sessions
        FROM sessions s
        WHERE s.started_at >= $1 AND s.started_at < $2
        GROUP BY s.learner_id, s.tenant_id
      ),
      activity_metrics AS (
        SELECT 
          se.user_id,
          se.tenant_id,
          COUNT(*) FILTER (WHERE se.event_type = 'CONTENT_COMPLETED') as lessons_completed,
          COUNT(*) FILTER (WHERE se.event_type = 'CONTENT_STARTED') as lessons_started,
          COUNT(*) FILTER (WHERE se.event_type = 'QUESTION_ANSWERED') as questions_answered,
          COUNT(*) FILTER (WHERE se.event_type = 'QUESTION_ANSWERED' AND 
            (se.metadata_json->>'correct')::boolean = true) as questions_correct
        FROM session_events se
        WHERE se.event_time >= $1 AND se.event_time < $2
        GROUP BY se.user_id, se.tenant_id
      ),
      assessment_metrics AS (
        SELECT 
          ar.user_id,
          ar.tenant_id,
          COUNT(*) as assessments_completed,
          AVG(ar.score) as avg_assessment_score
        FROM assessment_results ar
        WHERE ar.completed_at >= $1 AND ar.completed_at < $2
        GROUP BY ar.user_id, ar.tenant_id
      ),
      mastery_metrics AS (
        SELECT 
          sm.user_id,
          sm.tenant_id,
          AVG(sm.mastery_level) as avg_mastery_level,
          COUNT(*) FILTER (WHERE sm.mastery_level >= 0.9) as skills_mastered
        FROM skill_mastery_snapshots sm
        WHERE sm.recorded_at >= $1 AND sm.recorded_at < $2
        GROUP BY sm.user_id, sm.tenant_id
      ),
      engagement_metrics AS (
        SELECT 
          se.user_id,
          se.tenant_id,
          COUNT(DISTINCT DATE_TRUNC('hour', se.event_time)) as active_hours,
          MAX(se.event_time) as last_activity
        FROM session_events se
        WHERE se.event_time >= $1 AND se.event_time < $2
        GROUP BY se.user_id, se.tenant_id
      )
      SELECT 
        COALESCE(sm.user_id, am.user_id, ass.user_id, mm.user_id, em.user_id) as user_id,
        COALESCE(sm.tenant_id, am.tenant_id, ass.tenant_id, mm.tenant_id, em.tenant_id) as tenant_id,
        COALESCE(sm.sessions_count, 0) as sessions_count,
        COALESCE(sm.total_time_seconds, 0) as total_time_seconds,
        COALESCE(am.lessons_started, 0) as lessons_started,
        COALESCE(am.lessons_completed, 0) as lessons_completed,
        COALESCE(am.questions_answered, 0) as questions_answered,
        COALESCE(am.questions_correct, 0) as questions_correct,
        CASE WHEN COALESCE(am.questions_answered, 0) > 0 
          THEN am.questions_correct::float / am.questions_answered 
          ELSE 0 END as accuracy_rate,
        COALESCE(ass.assessments_completed, 0) as assessments_completed,
        COALESCE(ass.avg_assessment_score, 0) as avg_assessment_score,
        COALESCE(mm.avg_mastery_level, 0) as avg_mastery_level,
        COALESCE(mm.skills_mastered, 0) as skills_mastered,
        COALESCE(em.active_hours, 0) as active_hours,
        em.last_activity
      FROM session_metrics sm
      FULL OUTER JOIN activity_metrics am ON sm.user_id = am.user_id AND sm.tenant_id = am.tenant_id
      FULL OUTER JOIN assessment_metrics ass ON COALESCE(sm.user_id, am.user_id) = ass.user_id 
        AND COALESCE(sm.tenant_id, am.tenant_id) = ass.tenant_id
      FULL OUTER JOIN mastery_metrics mm ON COALESCE(sm.user_id, am.user_id, ass.user_id) = mm.user_id 
        AND COALESCE(sm.tenant_id, am.tenant_id, ass.tenant_id) = mm.tenant_id
      FULL OUTER JOIN engagement_metrics em ON COALESCE(sm.user_id, am.user_id, ass.user_id, mm.user_id) = em.user_id 
        AND COALESCE(sm.tenant_id, am.tenant_id, ass.tenant_id, mm.tenant_id) = em.tenant_id
      `,
      [dayStart, dayEnd]
    );

    const metrics = metricsResult.rows as Array<{
      user_id: string;
      tenant_id: string;
      sessions_count: number;
      total_time_seconds: number;
      lessons_started: number;
      lessons_completed: number;
      questions_answered: number;
      questions_correct: number;
      accuracy_rate: number;
      assessments_completed: number;
      avg_assessment_score: number;
      avg_mastery_level: number;
      skills_mastered: number;
      active_hours: number;
      last_activity: Date | null;
    }>;

    rowsProcessed = metrics.length;

    if (metrics.length === 0) {
      logger.info(`No student metrics to aggregate for ${formatDate(targetDate)}`);
      return { rowsProcessed: 0, rowsInserted: 0, rowsDeleted: 0 };
    }

    // Delete existing records for this date
    await warehouse.query(
      `DELETE FROM agg_daily_student_metrics WHERE date_key = $1`,
      [dateKey]
    );

    // Batch insert into Redshift
    const batchSize = 1000;
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize);
      
      const values = batch.map((m, idx) => {
        const offset = i + idx;
        return `($${offset * 17 + 1}, $${offset * 17 + 2}, $${offset * 17 + 3}, $${offset * 17 + 4}, 
                $${offset * 17 + 5}, $${offset * 17 + 6}, $${offset * 17 + 7}, $${offset * 17 + 8},
                $${offset * 17 + 9}, $${offset * 17 + 10}, $${offset * 17 + 11}, $${offset * 17 + 12},
                $${offset * 17 + 13}, $${offset * 17 + 14}, $${offset * 17 + 15}, $${offset * 17 + 16}, $${offset * 17 + 17})`;
      }).join(', ');

      const params = batch.flatMap(m => [
        dateKey, m.tenant_id, m.user_id, m.sessions_count, m.total_time_seconds,
        m.lessons_started, m.lessons_completed, m.questions_answered, m.questions_correct,
        m.accuracy_rate, m.assessments_completed, m.avg_assessment_score, m.avg_mastery_level,
        m.skills_mastered, m.active_hours, 0, // engagement_score - calculated separately
        new Date()
      ]);

      await warehouse.query(
        `INSERT INTO agg_daily_student_metrics (
          date_key, tenant_id, user_id, sessions_count, total_time_seconds,
          lessons_started, lessons_completed, questions_answered, questions_correct,
          accuracy_rate, assessments_completed, avg_assessment_score, avg_mastery_level,
          skills_mastered, active_hours, engagement_score, created_at
        ) VALUES ${values}`,
        params
      );

      rowsInserted += batch.length;
    }

    logger.info(`Aggregated ${rowsInserted} student metrics for ${formatDate(targetDate)}`);

    return { rowsProcessed, rowsInserted, rowsDeleted: rowsProcessed > 0 ? 1 : 0 };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD AGG_DAILY_CLASS_METRICS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build agg_daily_class_metrics for a target date.
 * Aggregates student metrics up to class level.
 */
export async function jobBuildDailyClassMetrics(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_agg_daily_class_metrics', targetDate, force, async () => {
    const warehouse = getWarehousePool();
    const logger = createLogger('build_agg_daily_class_metrics');

    const dateKey = toDateKey(targetDate);

    // Aggregate from student metrics (assumes class_memberships table exists)
    const result = await warehouse.query(
      `
      INSERT INTO agg_daily_class_metrics (
        date_key, tenant_id, class_id, teacher_id,
        total_students, active_students, total_sessions, total_time_seconds,
        avg_time_per_student, lessons_completed, avg_lessons_per_student,
        questions_answered, overall_accuracy, assessments_completed,
        avg_assessment_score, avg_mastery_level, at_risk_count, created_at
      )
      SELECT 
        $1 as date_key,
        asm.tenant_id,
        cm.class_id,
        c.teacher_id,
        COUNT(DISTINCT asm.user_id) as total_students,
        COUNT(DISTINCT asm.user_id) FILTER (WHERE asm.sessions_count > 0) as active_students,
        SUM(asm.sessions_count) as total_sessions,
        SUM(asm.total_time_seconds) as total_time_seconds,
        AVG(asm.total_time_seconds) as avg_time_per_student,
        SUM(asm.lessons_completed) as lessons_completed,
        AVG(asm.lessons_completed) as avg_lessons_per_student,
        SUM(asm.questions_answered) as questions_answered,
        AVG(asm.accuracy_rate) as overall_accuracy,
        SUM(asm.assessments_completed) as assessments_completed,
        AVG(asm.avg_assessment_score) as avg_assessment_score,
        AVG(asm.avg_mastery_level) as avg_mastery_level,
        COUNT(DISTINCT asm.user_id) FILTER (WHERE asm.avg_mastery_level < 0.5 OR asm.sessions_count = 0) as at_risk_count,
        NOW() as created_at
      FROM agg_daily_student_metrics asm
      JOIN class_memberships cm ON cm.student_id = asm.user_id
      JOIN classes c ON c.id = cm.class_id
      WHERE asm.date_key = $1
      GROUP BY asm.tenant_id, cm.class_id, c.teacher_id
      ON CONFLICT (date_key, class_id) DO UPDATE SET
        active_students = EXCLUDED.active_students,
        total_sessions = EXCLUDED.total_sessions,
        total_time_seconds = EXCLUDED.total_time_seconds,
        avg_time_per_student = EXCLUDED.avg_time_per_student,
        lessons_completed = EXCLUDED.lessons_completed,
        avg_lessons_per_student = EXCLUDED.avg_lessons_per_student,
        questions_answered = EXCLUDED.questions_answered,
        overall_accuracy = EXCLUDED.overall_accuracy,
        assessments_completed = EXCLUDED.assessments_completed,
        avg_assessment_score = EXCLUDED.avg_assessment_score,
        avg_mastery_level = EXCLUDED.avg_mastery_level,
        at_risk_count = EXCLUDED.at_risk_count,
        updated_at = NOW()
      `,
      [dateKey]
    );

    const rowsInserted = result.rowCount || 0;
    logger.info(`Aggregated ${rowsInserted} class metrics for ${formatDate(targetDate)}`);

    return { rowsProcessed: rowsInserted, rowsInserted, rowsDeleted: 0 };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILD AGG_SKILL_PERFORMANCE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build agg_skill_performance for a target date.
 * Tracks skill-level performance across students.
 */
export async function jobBuildSkillPerformance(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_agg_skill_performance', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_agg_skill_performance');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    // Query skill performance from source
    const skillsResult = await source.query(
      `
      SELECT 
        sm.skill_id,
        sm.tenant_id,
        s.subject_id,
        s.standard_id,
        COUNT(DISTINCT sm.user_id) as students_attempted,
        COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.mastery_level >= 0.9) as students_mastered,
        COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.mastery_level >= 0.5 AND sm.mastery_level < 0.9) as students_proficient,
        COUNT(DISTINCT sm.user_id) FILTER (WHERE sm.mastery_level < 0.5) as students_developing,
        AVG(sm.mastery_level) as avg_mastery_level,
        STDDEV(sm.mastery_level) as mastery_stddev,
        AVG(sm.practice_count) as avg_practice_count,
        SUM(qr.response_time_ms) / NULLIF(COUNT(qr.id), 0) as avg_response_time_ms
      FROM skill_mastery sm
      JOIN skills s ON s.id = sm.skill_id
      LEFT JOIN questions q ON q.skill_id = sm.skill_id
      LEFT JOIN question_responses qr ON qr.question_id = q.id 
        AND qr.user_id = sm.user_id
        AND qr.answered_at >= $1 AND qr.answered_at < $2
      WHERE sm.updated_at >= $1 AND sm.updated_at < $2
      GROUP BY sm.skill_id, sm.tenant_id, s.subject_id, s.standard_id
      `,
      [dayStart, dayEnd]
    );

    const skills = skillsResult.rows as Array<{
      skill_id: string;
      tenant_id: string;
      subject_id: string;
      standard_id: string | null;
      students_attempted: number;
      students_mastered: number;
      students_proficient: number;
      students_developing: number;
      avg_mastery_level: number;
      mastery_stddev: number | null;
      avg_practice_count: number;
      avg_response_time_ms: number | null;
    }>;

    if (skills.length === 0) {
      logger.info(`No skill performance data to aggregate for ${formatDate(targetDate)}`);
      return { rowsProcessed: 0, rowsInserted: 0, rowsDeleted: 0 };
    }

    // Delete existing records for this date
    await warehouse.query(
      `DELETE FROM agg_skill_performance WHERE date_key = $1`,
      [dateKey]
    );

    // Insert new records
    const batchSize = 500;
    let rowsInserted = 0;

    for (let i = 0; i < skills.length; i += batchSize) {
      const batch = skills.slice(i, i + batchSize);
      
      for (const skill of batch) {
        await warehouse.query(
          `INSERT INTO agg_skill_performance (
            date_key, tenant_id, skill_id, subject_id, standard_id,
            students_attempted, students_mastered, students_proficient, students_developing,
            avg_mastery_level, mastery_stddev, avg_practice_count, avg_response_time_ms, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            dateKey, skill.tenant_id, skill.skill_id, skill.subject_id, skill.standard_id,
            skill.students_attempted, skill.students_mastered, skill.students_proficient, skill.students_developing,
            skill.avg_mastery_level, skill.mastery_stddev, skill.avg_practice_count, skill.avg_response_time_ms,
            new Date()
          ]
        );
        rowsInserted++;
      }
    }

    logger.info(`Aggregated ${rowsInserted} skill performance records for ${formatDate(targetDate)}`);

    return { rowsProcessed: skills.length, rowsInserted, rowsDeleted: skills.length > 0 ? 1 : 0 };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE AT-RISK STUDENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update analytics_at_risk_students table with current at-risk calculations.
 * This job runs daily to identify students who need intervention.
 */
export async function jobUpdateAtRiskStudents(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('update_at_risk_students', targetDate, force, async () => {
    const warehouse = getWarehousePool();
    const logger = createLogger('update_at_risk_students');

    const dateKey = toDateKey(targetDate);

    // Calculate at-risk scores based on multiple factors
    const result = await warehouse.query(
      `
      WITH student_metrics AS (
        SELECT 
          asm.user_id,
          asm.tenant_id,
          AVG(asm.sessions_count) as avg_sessions,
          AVG(asm.total_time_seconds) as avg_time,
          AVG(asm.lessons_completed) as avg_lessons,
          AVG(asm.accuracy_rate) as avg_accuracy,
          AVG(asm.avg_mastery_level) as avg_mastery,
          MAX(asm.date_key) as last_active_date,
          DATEDIFF(day, MAX(asm.date_key)::date, $1::date) as days_inactive
        FROM agg_daily_student_metrics asm
        WHERE asm.date_key >= DATEADD(day, -30, $1)
        GROUP BY asm.user_id, asm.tenant_id
      ),
      risk_calculations AS (
        SELECT 
          sm.user_id,
          sm.tenant_id,
          -- Inactivity factor (0-40 points)
          LEAST(sm.days_inactive * 4, 40) as inactivity_score,
          -- Low performance factor (0-25 points)
          CASE 
            WHEN sm.avg_accuracy < 0.4 THEN 25
            WHEN sm.avg_accuracy < 0.6 THEN 15
            WHEN sm.avg_accuracy < 0.7 THEN 5
            ELSE 0
          END as performance_score,
          -- Low mastery factor (0-20 points)
          CASE 
            WHEN sm.avg_mastery < 0.3 THEN 20
            WHEN sm.avg_mastery < 0.5 THEN 12
            WHEN sm.avg_mastery < 0.7 THEN 5
            ELSE 0
          END as mastery_score,
          -- Low engagement factor (0-15 points)
          CASE 
            WHEN sm.avg_sessions < 1 THEN 15
            WHEN sm.avg_sessions < 3 THEN 8
            ELSE 0
          END as engagement_score,
          sm.days_inactive,
          sm.avg_accuracy,
          sm.avg_mastery,
          sm.avg_sessions,
          sm.last_active_date
        FROM student_metrics sm
      )
      INSERT INTO analytics_at_risk_students (
        user_id, tenant_id, risk_level, risk_score, risk_factors,
        last_active_date, calculated_at, created_at
      )
      SELECT 
        rc.user_id,
        rc.tenant_id,
        CASE 
          WHEN (rc.inactivity_score + rc.performance_score + rc.mastery_score + rc.engagement_score) >= 70 THEN 'critical'
          WHEN (rc.inactivity_score + rc.performance_score + rc.mastery_score + rc.engagement_score) >= 50 THEN 'high'
          WHEN (rc.inactivity_score + rc.performance_score + rc.mastery_score + rc.engagement_score) >= 30 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        (rc.inactivity_score + rc.performance_score + rc.mastery_score + rc.engagement_score)::float / 100 as risk_score,
        JSON_OBJECT(
          'inactivity_score', rc.inactivity_score,
          'performance_score', rc.performance_score,
          'mastery_score', rc.mastery_score,
          'engagement_score', rc.engagement_score,
          'days_inactive', rc.days_inactive,
          'avg_accuracy', rc.avg_accuracy,
          'avg_mastery', rc.avg_mastery,
          'avg_sessions', rc.avg_sessions
        ) as risk_factors,
        rc.last_active_date::date,
        NOW(),
        NOW()
      FROM risk_calculations rc
      WHERE (rc.inactivity_score + rc.performance_score + rc.mastery_score + rc.engagement_score) >= 30
      ON CONFLICT (user_id) DO UPDATE SET
        risk_level = EXCLUDED.risk_level,
        risk_score = EXCLUDED.risk_score,
        risk_factors = EXCLUDED.risk_factors,
        last_active_date = EXCLUDED.last_active_date,
        calculated_at = NOW(),
        updated_at = NOW()
      `,
      [dateKey]
    );

    const rowsInserted = result.rowCount || 0;

    // Clean up students who are no longer at risk
    const cleanupResult = await warehouse.query(
      `
      DELETE FROM analytics_at_risk_students
      WHERE calculated_at < DATEADD(day, -1, NOW())
      `
    );

    const rowsDeleted = cleanupResult.rowCount || 0;

    logger.info(`Updated ${rowsInserted} at-risk students, removed ${rowsDeleted} recovered students`);

    return { rowsProcessed: rowsInserted + rowsDeleted, rowsInserted, rowsDeleted };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run all analytics aggregation jobs for a target date.
 * Jobs run in dependency order.
 */
export async function runDailyAggregations(targetDate: Date, force = false): Promise<{
  jobs: { name: string; result: JobResult }[];
  success: boolean;
  duration: number;
}> {
  const startTime = Date.now();
  const results: { name: string; result: JobResult }[] = [];
  let success = true;

  const jobs = [
    { name: 'student_metrics', fn: jobBuildDailyStudentMetrics },
    { name: 'class_metrics', fn: jobBuildDailyClassMetrics },
    { name: 'skill_performance', fn: jobBuildSkillPerformance },
    { name: 'at_risk_students', fn: jobUpdateAtRiskStudents },
  ];

  for (const job of jobs) {
    try {
      const result = await job.fn(targetDate, force);
      results.push({ name: job.name, result });
    } catch (error) {
      console.error(`Job ${job.name} failed:`, error);
      results.push({
        name: job.name,
        result: {
          rowsProcessed: 0,
          rowsInserted: 0,
          rowsDeleted: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
      success = false;
    }
  }

  return {
    jobs: results,
    success,
    duration: Date.now() - startTime,
  };
}

export default {
  jobBuildDailyStudentMetrics,
  jobBuildDailyClassMetrics,
  jobBuildSkillPerformance,
  jobUpdateAtRiskStudents,
  runDailyAggregations,
};
