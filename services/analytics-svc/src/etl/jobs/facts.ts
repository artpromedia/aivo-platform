/**
 * Fact Table Jobs
 *
 * ETL jobs for building fact tables from OLTP sources.
 * These run daily to populate warehouse facts.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { toDateKey, formatDate, startOfDay, endOfDay } from '../dateUtils.js';
import { getSourcePool, getWarehousePool, withTransaction } from '../db.js';
import { runJob, createLogger } from '../logger.js';
import type { JobResult } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// BUILD FACT_SESSIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_sessions for a target date.
 * Aggregates session events into session-level facts.
 */
export async function jobBuildFactSessions(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_fact_sessions', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_sessions');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch sessions for target date with aggregated event data
    const sessionsResult = await source.query(
      `
      WITH session_stats AS (
        SELECT 
          se.session_id,
          COUNT(*) FILTER (WHERE se.event_type IN ('ACTIVITY_STARTED')) as activities_assigned,
          COUNT(*) FILTER (WHERE se.event_type = 'ACTIVITY_COMPLETED') as activities_completed,
          COUNT(*) FILTER (WHERE se.event_type = 'ACTIVITY_SKIPPED') as activities_skipped,
          COUNT(*) FILTER (WHERE se.event_type = 'ACTIVITY_RESPONSE_SUBMITTED' 
            AND (se.metadata_json->>'isCorrect')::boolean = true) as correct_responses,
          COUNT(*) FILTER (WHERE se.event_type = 'ACTIVITY_RESPONSE_SUBMITTED' 
            AND (se.metadata_json->>'isCorrect')::boolean = false) as incorrect_responses,
          COUNT(*) FILTER (WHERE se.event_type = 'HOMEWORK_HINT_REQUESTED') as hints_used,
          COUNT(*) FILTER (WHERE se.event_type IN ('FOCUS_BREAK_STARTED')) as focus_breaks,
          COUNT(*) FILTER (WHERE se.event_type = 'FOCUS_INTERVENTION_SHOWN') as focus_interventions
        FROM session_events se
        WHERE se.event_time >= $1 AND se.event_time < $2
        GROUP BY se.session_id
      )
      SELECT 
        s.id as session_id,
        s.tenant_id,
        s.learner_id,
        s.session_type,
        s.origin,
        COALESCE(s.duration_ms / 1000, 0) as duration_seconds,
        COALESCE(ss.activities_assigned, 0) as activities_assigned,
        COALESCE(ss.activities_completed, 0) as activities_completed,
        COALESCE(ss.activities_skipped, 0) as activities_skipped,
        COALESCE(ss.correct_responses, 0) as correct_responses,
        COALESCE(ss.incorrect_responses, 0) as incorrect_responses,
        COALESCE(ss.hints_used, 0) as hints_used,
        COALESCE(ss.focus_breaks, 0) as focus_breaks,
        COALESCE(ss.focus_interventions, 0) as focus_interventions,
        s.started_at,
        s.ended_at
      FROM sessions s
      LEFT JOIN session_stats ss ON ss.session_id = s.id
      WHERE s.started_at >= $1 AND s.started_at < $2
      `,
      [dayStart, dayEnd]
    );

    const sessions = sessionsResult.rows as {
      session_id: string;
      tenant_id: string;
      learner_id: string;
      session_type: string;
      origin: string;
      duration_seconds: number;
      activities_assigned: number;
      activities_completed: number;
      activities_skipped: number;
      correct_responses: number;
      incorrect_responses: number;
      hints_used: number;
      focus_breaks: number;
      focus_interventions: number;
      started_at: Date;
      ended_at: Date | null;
    }[];

    rowsProcessed = sessions.length;
    logger.info(`Fetched ${rowsProcessed} sessions for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(`DELETE FROM fact_sessions WHERE date_key = $1`, [
        dateKey,
      ]);
      rowsDeleted = deleteResult.rowCount ?? 0;

      if (rowsDeleted > 0) {
        logger.info(`Deleted ${rowsDeleted} existing rows for date_key ${dateKey}`);
      }

      // Insert new rows
      for (const session of sessions) {
        // Look up dimension keys
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [session.tenant_id]
        );
        const learnerResult = await client.query(
          `SELECT learner_key FROM dim_learner WHERE learner_id = $1 AND is_current = true`,
          [session.learner_id]
        );

        if (tenantResult.rowCount === 0 || learnerResult.rowCount === 0) {
          logger.warn(`Missing dimension for session ${session.session_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;
        const learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;

        await client.query(
          `INSERT INTO fact_sessions (
            session_id, date_key, tenant_key, learner_key,
            session_type, origin, duration_seconds,
            activities_assigned, activities_completed, activities_skipped,
            correct_responses, incorrect_responses, hints_used,
            focus_breaks_count, focus_interventions_count,
            started_at, ended_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            session.session_id,
            dateKey,
            tenantKey,
            learnerKey,
            session.session_type,
            session.origin,
            session.duration_seconds,
            session.activities_assigned,
            session.activities_completed,
            session.activities_skipped,
            session.correct_responses,
            session.incorrect_responses,
            session.hints_used,
            session.focus_breaks,
            session.focus_interventions,
            session.started_at,
            session.ended_at,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_sessions',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD FACT_FOCUS_EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_focus_events for a target date.
 * Extracts focus-related events from session_events.
 */
export async function jobBuildFactFocusEvents(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_fact_focus_events', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_focus_events');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch focus events for target date
    const eventsResult = await source.query(
      `
      SELECT 
        se.id as event_id,
        se.session_id,
        se.tenant_id,
        se.learner_id,
        se.event_type,
        se.event_time,
        se.metadata_json->>'durationSeconds' as duration_seconds,
        se.metadata_json->>'interventionType' as intervention_type,
        (se.metadata_json->>'interventionCompleted')::boolean as intervention_completed,
        (se.metadata_json->>'focusScore')::numeric as focus_score
      FROM session_events se
      WHERE se.event_type IN (
        'FOCUS_LOSS_DETECTED',
        'FOCUS_BREAK_STARTED',
        'FOCUS_BREAK_ENDED',
        'FOCUS_INTERVENTION_SHOWN',
        'FOCUS_INTERVENTION_COMPLETED'
      )
      AND se.event_time >= $1 AND se.event_time < $2
      `,
      [dayStart, dayEnd]
    );

    const events = eventsResult.rows as {
      event_id: string;
      session_id: string;
      tenant_id: string;
      learner_id: string;
      event_type: string;
      event_time: Date;
      duration_seconds: string | null;
      intervention_type: string | null;
      intervention_completed: boolean | null;
      focus_score: number | null;
    }[];

    rowsProcessed = events.length;
    logger.info(`Fetched ${rowsProcessed} focus events for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(`DELETE FROM fact_focus_events WHERE date_key = $1`, [
        dateKey,
      ]);
      rowsDeleted = deleteResult.rowCount ?? 0;

      for (const event of events) {
        // Look up dimension keys
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [event.tenant_id]
        );
        const learnerResult = await client.query(
          `SELECT learner_key FROM dim_learner WHERE learner_id = $1 AND is_current = true`,
          [event.learner_id]
        );

        // Look up session key (may not exist in fact_sessions yet)
        const sessionResult = await client.query(
          `SELECT session_key FROM fact_sessions WHERE session_id = $1`,
          [event.session_id]
        );

        if (tenantResult.rowCount === 0 || learnerResult.rowCount === 0) {
          logger.warn(`Missing dimension for focus event ${event.event_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;
        const learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;
        const sessionKey =
          sessionResult.rowCount === 0
            ? null
            : (sessionResult.rows[0] as { session_key: number }).session_key;

        await client.query(
          `INSERT INTO fact_focus_events (
            event_id, session_key, date_key, tenant_key, learner_key,
            event_type, event_time, duration_seconds,
            intervention_type, intervention_completed, focus_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            event.event_id,
            sessionKey,
            dateKey,
            tenantKey,
            learnerKey,
            event.event_type,
            event.event_time,
            event.duration_seconds ? parseInt(event.duration_seconds) : null,
            event.intervention_type,
            event.intervention_completed,
            event.focus_score,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_focus_events',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD FACT_HOMEWORK_EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_homework_events for a target date.
 * Aggregates homework submissions and steps.
 */
export async function jobBuildFactHomeworkEvents(
  targetDate: Date,
  force = false
): Promise<JobResult> {
  return runJob('build_fact_homework_events', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_homework_events');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch homework submissions with aggregated step data
    const submissionsResult = await source.query(
      `
      WITH step_stats AS (
        SELECT 
          hs.submission_id,
          COUNT(*) FILTER (WHERE hs.hint_revealed) as hints_revealed,
          COUNT(*) as total_steps,
          COUNT(*) FILTER (WHERE hs.is_completed) as steps_completed
        FROM homework_steps hs
        GROUP BY hs.submission_id
      ),
      response_stats AS (
        SELECT 
          hs.submission_id,
          COUNT(*) FILTER (WHERE hsr.is_correct = true) as correct_responses,
          COUNT(*) as total_responses
        FROM homework_steps hs
        JOIN homework_step_responses hsr ON hsr.step_id = hs.id
        GROUP BY hs.submission_id
      )
      SELECT 
        s.id as submission_id,
        s.tenant_id,
        s.learner_id,
        s.session_id,
        s.subject,
        s.grade_band,
        s.step_count,
        s.steps_completed,
        COALESCE(ss.hints_revealed, 0) as hints_revealed,
        COALESCE(rs.correct_responses, 0) as correct_responses,
        COALESCE(rs.total_responses, 0) as total_responses,
        CASE WHEN s.step_count > 0 
          THEN s.steps_completed::numeric / s.step_count 
          ELSE 0 END as completion_rate,
        s.created_at as submitted_at,
        CASE WHEN s.status = 'COMPLETED' THEN s.updated_at END as completed_at
      FROM homework_submissions s
      LEFT JOIN step_stats ss ON ss.submission_id = s.id
      LEFT JOIN response_stats rs ON rs.submission_id = s.id
      WHERE s.created_at >= $1 AND s.created_at < $2
      `,
      [dayStart, dayEnd]
    );

    const submissions = submissionsResult.rows as {
      submission_id: string;
      tenant_id: string;
      learner_id: string;
      session_id: string | null;
      subject: string;
      grade_band: string;
      step_count: number;
      steps_completed: number;
      hints_revealed: number;
      correct_responses: number;
      total_responses: number;
      completion_rate: number;
      submitted_at: Date;
      completed_at: Date | null;
    }[];

    rowsProcessed = submissions.length;
    logger.info(`Fetched ${rowsProcessed} homework submissions for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(
        `DELETE FROM fact_homework_events WHERE date_key = $1`,
        [dateKey]
      );
      rowsDeleted = deleteResult.rowCount ?? 0;

      for (const sub of submissions) {
        // Look up dimension keys
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [sub.tenant_id]
        );
        const learnerResult = await client.query(
          `SELECT learner_key FROM dim_learner WHERE learner_id = $1 AND is_current = true`,
          [sub.learner_id]
        );

        if (tenantResult.rowCount === 0 || learnerResult.rowCount === 0) {
          logger.warn(`Missing dimension for homework ${sub.submission_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;
        const learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;

        // Look up session key if available
        let sessionKey: number | null = null;
        if (sub.session_id) {
          const sessionResult = await client.query(
            `SELECT session_key FROM fact_sessions WHERE session_id = $1`,
            [sub.session_id]
          );
          if (sessionResult.rowCount && sessionResult.rowCount > 0) {
            sessionKey = (sessionResult.rows[0] as { session_key: number }).session_key;
          }
        }

        await client.query(
          `INSERT INTO fact_homework_events (
            submission_id, session_key, date_key, tenant_key, learner_key,
            subject, grade_band, step_count, steps_completed,
            hints_revealed, correct_responses, total_responses,
            completion_rate, submitted_at, completed_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
          [
            sub.submission_id,
            sessionKey,
            dateKey,
            tenantKey,
            learnerKey,
            sub.subject,
            sub.grade_band,
            sub.step_count,
            sub.steps_completed,
            sub.hints_revealed,
            sub.correct_responses,
            sub.total_responses,
            sub.completion_rate,
            sub.submitted_at,
            sub.completed_at,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_homework_events',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD FACT_LEARNING_PROGRESS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_learning_progress for a target date.
 * Snapshots learner skill states at end of day.
 */
export async function jobBuildFactLearningProgress(
  targetDate: Date,
  force = false
): Promise<JobResult> {
  return runJob('build_fact_learning_progress', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_learning_progress');

    const dateKey = toDateKey(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Aggregate learner skill states by subject
    const progressResult = await source.query(
      `
      WITH skill_subject AS (
        SELECT s.id as skill_id, s.subject
        FROM skills s
      ),
      learner_progress AS (
        SELECT 
          lss.learner_id,
          lss.tenant_id,
          ss.subject,
          COUNT(DISTINCT lss.skill_id) as total_skills,
          COUNT(DISTINCT lss.skill_id) FILTER (WHERE lss.mastery_level >= 0.8) as mastered_skills,
          COUNT(DISTINCT lss.skill_id) FILTER (WHERE lss.mastery_level > 0 AND lss.mastery_level < 0.8) as in_progress_skills,
          COUNT(DISTINCT lss.skill_id) FILTER (WHERE lss.mastery_level = 0 OR lss.mastery_level IS NULL) as not_started_skills,
          AVG(lss.mastery_level) as average_mastery
        FROM learner_skill_states lss
        JOIN skill_subject ss ON ss.skill_id = lss.skill_id
        WHERE lss.updated_at <= $1
        GROUP BY lss.learner_id, lss.tenant_id, ss.subject
      ),
      daily_gains AS (
        SELECT 
          lss.learner_id,
          ss.subject,
          COUNT(DISTINCT lss.skill_id) FILTER (WHERE lss.mastery_level >= 0.8 
            AND lss.updated_at >= $2::date) as skills_gained_today
        FROM learner_skill_states lss
        JOIN skill_subject ss ON ss.skill_id = lss.skill_id
        WHERE lss.updated_at <= $1
        GROUP BY lss.learner_id, ss.subject
      ),
      practice_time AS (
        SELECT 
          s.learner_id,
          COALESCE(SUM(s.duration_ms) / 60000, 0) as practice_minutes_today
        FROM sessions s
        WHERE s.started_at >= $2::date AND s.started_at < $1
          AND s.session_type IN ('LEARNING', 'PRACTICE')
        GROUP BY s.learner_id
      )
      SELECT 
        lp.learner_id,
        lp.tenant_id,
        lp.subject,
        lp.total_skills,
        lp.mastered_skills,
        lp.in_progress_skills,
        lp.not_started_skills,
        lp.average_mastery,
        COALESCE(dg.skills_gained_today, 0) as skills_gained_today,
        COALESCE(pt.practice_minutes_today, 0) as practice_minutes_today
      FROM learner_progress lp
      LEFT JOIN daily_gains dg ON dg.learner_id = lp.learner_id AND dg.subject = lp.subject
      LEFT JOIN practice_time pt ON pt.learner_id = lp.learner_id
      `,
      [dayEnd, formatDate(targetDate)]
    );

    const progressRows = progressResult.rows as {
      learner_id: string;
      tenant_id: string;
      subject: string;
      total_skills: number;
      mastered_skills: number;
      in_progress_skills: number;
      not_started_skills: number;
      average_mastery: number;
      skills_gained_today: number;
      practice_minutes_today: number;
    }[];

    rowsProcessed = progressRows.length;
    logger.info(`Fetched ${rowsProcessed} progress snapshots for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(
        `DELETE FROM fact_learning_progress WHERE date_key = $1`,
        [dateKey]
      );
      rowsDeleted = deleteResult.rowCount ?? 0;

      for (const progress of progressRows) {
        // Look up dimension keys
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [progress.tenant_id]
        );
        const learnerResult = await client.query(
          `SELECT learner_key FROM dim_learner WHERE learner_id = $1 AND is_current = true`,
          [progress.learner_id]
        );
        const subjectResult = await client.query(
          `SELECT subject_key FROM dim_subject WHERE subject_code = $1`,
          [progress.subject]
        );

        if (
          tenantResult.rowCount === 0 ||
          learnerResult.rowCount === 0 ||
          subjectResult.rowCount === 0
        ) {
          logger.warn(`Missing dimension for progress ${progress.learner_id}/${progress.subject}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;
        const learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;
        const subjectKey = (subjectResult.rows[0] as { subject_key: number }).subject_key;

        await client.query(
          `INSERT INTO fact_learning_progress (
            date_key, tenant_key, learner_key, subject_key,
            total_skills, mastered_skills, in_progress_skills, not_started_skills,
            average_mastery, skills_gained_today, practice_minutes_today,
            snapshot_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            dateKey,
            tenantKey,
            learnerKey,
            subjectKey,
            progress.total_skills,
            progress.mastered_skills,
            progress.in_progress_skills,
            progress.not_started_skills,
            progress.average_mastery,
            progress.skills_gained_today,
            progress.practice_minutes_today,
            dayEnd,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_learning_progress',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// BUILD FACT_RECOMMENDATION_EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_recommendation_events for a target date.
 * Maps recommendation creation and response events.
 */
export async function jobBuildFactRecommendationEvents(
  targetDate: Date,
  force = false
): Promise<JobResult> {
  return runJob('build_fact_recommendation_events', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_recommendation_events');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch recommendations created on target date
    const recsResult = await source.query(
      `
      SELECT 
        r.id as recommendation_id,
        r.tenant_id,
        r.learner_id,
        r.skill_id,
        r.recommendation_type,
        r.source,
        r.was_accepted,
        r.was_declined,
        EXTRACT(EPOCH FROM (r.responded_at - r.created_at)) as response_time_seconds,
        r.created_at,
        r.responded_at
      FROM recommendations r
      WHERE r.created_at >= $1 AND r.created_at < $2
      `,
      [dayStart, dayEnd]
    );

    const recommendations = recsResult.rows as {
      recommendation_id: string;
      tenant_id: string;
      learner_id: string;
      skill_id: string | null;
      recommendation_type: string;
      source: string;
      was_accepted: boolean | null;
      was_declined: boolean | null;
      response_time_seconds: number | null;
      created_at: Date;
      responded_at: Date | null;
    }[];

    rowsProcessed = recommendations.length;
    logger.info(`Fetched ${rowsProcessed} recommendations for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(
        `DELETE FROM fact_recommendation_events WHERE date_key = $1`,
        [dateKey]
      );
      rowsDeleted = deleteResult.rowCount ?? 0;

      for (const rec of recommendations) {
        // Look up dimension keys
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [rec.tenant_id]
        );
        const learnerResult = await client.query(
          `SELECT learner_key FROM dim_learner WHERE learner_id = $1 AND is_current = true`,
          [rec.learner_id]
        );

        if (tenantResult.rowCount === 0 || learnerResult.rowCount === 0) {
          logger.warn(`Missing dimension for recommendation ${rec.recommendation_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;
        const learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;

        // Look up skill key if available
        let skillKey: number | null = null;
        if (rec.skill_id) {
          const skillResult = await client.query(
            `SELECT skill_key FROM dim_skill WHERE skill_id = $1`,
            [rec.skill_id]
          );
          if (skillResult.rowCount && skillResult.rowCount > 0) {
            skillKey = (skillResult.rows[0] as { skill_key: number }).skill_key;
          }
        }

        await client.query(
          `INSERT INTO fact_recommendation_events (
            recommendation_id, date_key, tenant_key, learner_key, skill_key,
            recommendation_type, source, was_accepted, was_declined,
            response_time_seconds, created_at, responded_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            rec.recommendation_id,
            dateKey,
            tenantKey,
            learnerKey,
            skillKey,
            rec.recommendation_type,
            rec.source,
            rec.was_accepted,
            rec.was_declined,
            rec.response_time_seconds,
            rec.created_at,
            rec.responded_at,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_recommendation_events',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RUN ALL FACT BUILDS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run all fact table builds for a target date.
 */
export async function runAllFactBuilds(targetDate: Date, force = false): Promise<JobResult[]> {
  const results: JobResult[] = [];

  // Order: sessions first (other facts may reference session_key)
  results.push(await jobBuildFactSessions(targetDate, force));
  results.push(await jobBuildFactFocusEvents(targetDate, force));
  results.push(await jobBuildFactHomeworkEvents(targetDate, force));
  results.push(await jobBuildFactLearningProgress(targetDate, force));
  results.push(await jobBuildFactRecommendationEvents(targetDate, force));

  return results;
}
