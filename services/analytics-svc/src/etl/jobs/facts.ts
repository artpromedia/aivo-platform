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
            event.duration_seconds ? Number.parseInt(event.duration_seconds) : null,
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
// BUILD FACT_ACTIVITY_EVENTS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_activity_event for a target date.
 * Granular learner activity events (responses, completions, hints).
 */
export async function jobBuildFactActivityEvents(
  targetDate: Date,
  force = false
): Promise<JobResult> {
  return runJob('build_fact_activity_events', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_activity_events');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch activity events from session_events
    const eventsResult = await source.query(
      `
      SELECT 
        se.id as event_id,
        se.session_id,
        s.tenant_id,
        s.learner_id,
        se.activity_id as content_id,
        se.event_type,
        se.metadata_json->>'questionId' as question_id,
        (se.metadata_json->>'isCorrect')::boolean as is_correct,
        (se.metadata_json->>'responseTimeMs')::integer as response_time_ms,
        (se.metadata_json->>'attemptNumber')::integer as attempt_number,
        (se.metadata_json->>'preMasteryScore')::numeric as pre_mastery_score,
        (se.metadata_json->>'postMasteryScore')::numeric as post_mastery_score,
        COALESCE((se.metadata_json->>'aiHintProvided')::boolean, false) as ai_hint_provided,
        COALESCE((se.metadata_json->>'aiExplanationProvided')::boolean, false) as ai_explanation_provided,
        se.event_time as occurred_at,
        se.metadata_json as metadata
      FROM session_events se
      JOIN sessions s ON se.session_id = s.id
      WHERE se.event_time >= $1 AND se.event_time < $2
        AND se.event_type IN (
          'ACTIVITY_RESPONSE_SUBMITTED',
          'ACTIVITY_COMPLETED',
          'ACTIVITY_SKIPPED',
          'HOMEWORK_HINT_REQUESTED',
          'HOMEWORK_EXPLANATION_VIEWED'
        )
      ORDER BY se.event_time
      `,
      [dayStart, dayEnd]
    );

    const events = eventsResult.rows as {
      event_id: string;
      session_id: string;
      tenant_id: string;
      learner_id: string;
      content_id: string | null;
      event_type: string;
      question_id: string | null;
      is_correct: boolean | null;
      response_time_ms: number | null;
      attempt_number: number | null;
      pre_mastery_score: number | null;
      post_mastery_score: number | null;
      ai_hint_provided: boolean;
      ai_explanation_provided: boolean;
      occurred_at: Date;
      metadata: Record<string, unknown>;
    }[];

    rowsProcessed = events.length;
    logger.info(`Fetched ${rowsProcessed} activity events for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(
        `DELETE FROM fact_activity_event WHERE date_key = $1`,
        [dateKey]
      );
      rowsDeleted = deleteResult.rowCount ?? 0;

      if (rowsDeleted > 0) {
        logger.info(`Deleted ${rowsDeleted} existing rows for date_key ${dateKey}`);
      }

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

        if (tenantResult.rowCount === 0 || learnerResult.rowCount === 0) {
          logger.warn(`Missing dimension for event ${event.event_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;
        const learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;

        // Look up optional dimension keys
        let contentKey: number | null = null;
        if (event.content_id) {
          const contentResult = await client.query(
            `SELECT content_key FROM dim_content WHERE content_id = $1 AND is_current = true`,
            [event.content_id]
          );
          if (contentResult.rowCount && contentResult.rowCount > 0) {
            contentKey = (contentResult.rows[0] as { content_key: number }).content_key;
          }
        }

        let sessionKey: number | null = null;
        if (event.session_id) {
          const sessionResult = await client.query(
            `SELECT session_key FROM fact_sessions WHERE session_id = $1`,
            [event.session_id]
          );
          if (sessionResult.rowCount && sessionResult.rowCount > 0) {
            sessionKey = (sessionResult.rows[0] as { session_key: number }).session_key;
          }
        }

        // Map event type to canonical names
        const eventTypeMap: Record<string, string> = {
          ACTIVITY_RESPONSE_SUBMITTED: 'response',
          ACTIVITY_COMPLETED: 'completed',
          ACTIVITY_SKIPPED: 'skipped',
          HOMEWORK_HINT_REQUESTED: 'hint_used',
          HOMEWORK_EXPLANATION_VIEWED: 'explanation_viewed',
        };
        const eventType = eventTypeMap[event.event_type] ?? event.event_type.toLowerCase();

        // Calculate mastery delta if both scores available
        const masteryDelta =
          event.pre_mastery_score != null && event.post_mastery_score != null
            ? event.post_mastery_score - event.pre_mastery_score
            : null;

        await client.query(
          `INSERT INTO fact_activity_event (
            event_id, date_key, tenant_key, learner_key, content_key, session_key,
            event_type, question_id, is_correct, response_time_ms, attempt_number,
            pre_mastery_score, post_mastery_score, mastery_delta,
            ai_hint_provided, ai_explanation_provided, occurred_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [
            event.event_id,
            dateKey,
            tenantKey,
            learnerKey,
            contentKey,
            sessionKey,
            eventType,
            event.question_id,
            event.is_correct,
            event.response_time_ms,
            event.attempt_number,
            event.pre_mastery_score,
            event.post_mastery_score,
            masteryDelta,
            event.ai_hint_provided,
            event.ai_explanation_provided,
            event.occurred_at,
            event.metadata,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_activity_events',
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
// BUILD FACT_AI_USAGE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_ai_usage for a target date.
 * Tracks AI model invocations, tokens, costs, and latency.
 */
export async function jobBuildFactAIUsage(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_fact_ai_usage', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_ai_usage');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch AI call logs from ai-orchestrator database
    // Note: In production, this would query the ai-orchestrator's ai_call_logs table
    const aiLogsResult = await source.query(
      `
      SELECT 
        id as call_id,
        tenant_id,
        learner_id,
        session_id,
        agent_type,
        model_name,
        provider,
        input_tokens,
        output_tokens,
        (input_tokens + output_tokens) as total_tokens,
        cost_microdollars,
        latency_ms,
        COALESCE(was_cached, false) as was_cached,
        cache_hit_rate,
        COALESCE(was_filtered, false) as was_filtered,
        user_rating,
        feedback_type,
        feature_area,
        created_at as called_at,
        metadata_json as metadata
      FROM ai_call_logs
      WHERE created_at >= $1 AND created_at < $2
      ORDER BY created_at
      `,
      [dayStart, dayEnd]
    );

    const aiLogs = aiLogsResult.rows as {
      call_id: string;
      tenant_id: string;
      learner_id: string | null;
      session_id: string | null;
      agent_type: string;
      model_name: string;
      provider: string;
      input_tokens: number;
      output_tokens: number;
      total_tokens: number;
      cost_microdollars: number;
      latency_ms: number;
      was_cached: boolean;
      cache_hit_rate: number | null;
      was_filtered: boolean;
      user_rating: number | null;
      feedback_type: string | null;
      feature_area: string | null;
      called_at: Date;
      metadata: Record<string, unknown>;
    }[];

    rowsProcessed = aiLogs.length;
    logger.info(`Fetched ${rowsProcessed} AI call logs for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(`DELETE FROM fact_ai_usage WHERE date_key = $1`, [
        dateKey,
      ]);
      rowsDeleted = deleteResult.rowCount ?? 0;

      if (rowsDeleted > 0) {
        logger.info(`Deleted ${rowsDeleted} existing rows for date_key ${dateKey}`);
      }

      for (const log of aiLogs) {
        // Look up dimension keys
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [log.tenant_id]
        );

        if (tenantResult.rowCount === 0) {
          logger.warn(`Missing tenant dimension for AI call ${log.call_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;

        // Optional dimension keys
        let learnerKey: number | null = null;
        if (log.learner_id) {
          const learnerResult = await client.query(
            `SELECT learner_key FROM dim_learner WHERE learner_id = $1 AND is_current = true`,
            [log.learner_id]
          );
          if (learnerResult.rowCount && learnerResult.rowCount > 0) {
            learnerKey = (learnerResult.rows[0] as { learner_key: number }).learner_key;
          }
        }

        let sessionKey: number | null = null;
        if (log.session_id) {
          const sessionResult = await client.query(
            `SELECT session_key FROM fact_sessions WHERE session_id = $1`,
            [log.session_id]
          );
          if (sessionResult.rowCount && sessionResult.rowCount > 0) {
            sessionKey = (sessionResult.rows[0] as { session_key: number }).session_key;
          }
        }

        await client.query(
          `INSERT INTO fact_ai_usage (
            call_id, date_key, tenant_key, learner_key, session_key,
            agent_type, model_name, provider,
            input_tokens, output_tokens, total_tokens, cost_microdollars,
            latency_ms, was_cached, cache_hit_rate,
            was_filtered, user_rating, feedback_type, feature_area,
            called_at, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            log.call_id,
            dateKey,
            tenantKey,
            learnerKey,
            sessionKey,
            log.agent_type,
            log.model_name,
            log.provider,
            log.input_tokens,
            log.output_tokens,
            log.total_tokens,
            log.cost_microdollars,
            log.latency_ms,
            log.was_cached,
            log.cache_hit_rate,
            log.was_filtered,
            log.user_rating,
            log.feedback_type,
            log.feature_area,
            log.called_at,
            log.metadata,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_ai_usage',
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
// BUILD FACT_BILLING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build fact_billing for a target date.
 * Tracks invoices and revenue by tenant.
 */
export async function jobBuildFactBilling(targetDate: Date, force = false): Promise<JobResult> {
  return runJob('build_fact_billing', targetDate, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('build_fact_billing');

    const dateKey = toDateKey(targetDate);
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsDeleted = 0;

    // Fetch invoices from billing-svc
    const invoicesResult = await source.query(
      `
      SELECT 
        i.id as invoice_id,
        i.tenant_id,
        i.period_start,
        i.period_end,
        sub.tier as subscription_tier,
        sub.billing_frequency,
        sub.seat_count,
        i.base_amount_cents,
        COALESCE(i.discount_amount_cents, 0) as discount_amount_cents,
        COALESCE(i.tax_amount_cents, 0) as tax_amount_cents,
        i.total_amount_cents,
        i.status as payment_status,
        i.payment_method,
        COALESCE(i.ai_overage_cents, 0) as ai_overage_cents,
        COALESCE(i.storage_overage_cents, 0) as storage_overage_cents,
        i.invoice_date,
        i.due_date,
        i.paid_date,
        i.stripe_invoice_id,
        i.metadata_json as metadata
      FROM invoices i
      JOIN subscriptions sub ON i.subscription_id = sub.id
      WHERE i.invoice_date >= $1 AND i.invoice_date < $2
      ORDER BY i.invoice_date
      `,
      [dayStart, dayEnd]
    );

    const invoices = invoicesResult.rows as {
      invoice_id: string;
      tenant_id: string;
      period_start: Date;
      period_end: Date;
      subscription_tier: string;
      billing_frequency: string;
      seat_count: number | null;
      base_amount_cents: number;
      discount_amount_cents: number;
      tax_amount_cents: number;
      total_amount_cents: number;
      payment_status: string;
      payment_method: string | null;
      ai_overage_cents: number;
      storage_overage_cents: number;
      invoice_date: Date;
      due_date: Date;
      paid_date: Date | null;
      stripe_invoice_id: string | null;
      metadata: Record<string, unknown>;
    }[];

    rowsProcessed = invoices.length;
    logger.info(`Fetched ${rowsProcessed} invoices for ${formatDate(targetDate)}`);

    await withTransaction(warehouse, async (client) => {
      // Delete existing rows for this date (idempotency)
      const deleteResult = await client.query(`DELETE FROM fact_billing WHERE date_key = $1`, [
        dateKey,
      ]);
      rowsDeleted = deleteResult.rowCount ?? 0;

      if (rowsDeleted > 0) {
        logger.info(`Deleted ${rowsDeleted} existing rows for date_key ${dateKey}`);
      }

      for (const invoice of invoices) {
        // Look up tenant dimension key
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [invoice.tenant_id]
        );

        if (tenantResult.rowCount === 0) {
          logger.warn(`Missing tenant dimension for invoice ${invoice.invoice_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;

        await client.query(
          `INSERT INTO fact_billing (
            invoice_id, date_key, tenant_key,
            period_start, period_end,
            subscription_tier, billing_frequency, seat_count,
            base_amount_cents, discount_amount_cents, tax_amount_cents, total_amount_cents,
            payment_status, payment_method,
            ai_overage_cents, storage_overage_cents,
            invoice_date, due_date, paid_date,
            stripe_invoice_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
          [
            invoice.invoice_id,
            dateKey,
            tenantKey,
            invoice.period_start,
            invoice.period_end,
            invoice.subscription_tier,
            invoice.billing_frequency,
            invoice.seat_count,
            invoice.base_amount_cents,
            invoice.discount_amount_cents,
            invoice.tax_amount_cents,
            invoice.total_amount_cents,
            invoice.payment_status,
            invoice.payment_method,
            invoice.ai_overage_cents,
            invoice.storage_overage_cents,
            invoice.invoice_date,
            invoice.due_date,
            invoice.paid_date,
            invoice.stripe_invoice_id,
            invoice.metadata,
          ]
        );
        rowsInserted++;
      }
    });

    return {
      jobName: 'build_fact_billing',
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
  // Order: sessions first (other facts may reference session_key)
  const results: JobResult[] = [
    await jobBuildFactSessions(targetDate, force),
    await jobBuildFactFocusEvents(targetDate, force),
    await jobBuildFactHomeworkEvents(targetDate, force),
    await jobBuildFactLearningProgress(targetDate, force),
    await jobBuildFactRecommendationEvents(targetDate, force),
    await jobBuildFactActivityEvents(targetDate, force),
    await jobBuildFactAIUsage(targetDate, force),
    await jobBuildFactBilling(targetDate, force),
  ];

  return results;
}
