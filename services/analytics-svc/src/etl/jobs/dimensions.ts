/**
 * Dimension Sync Jobs
 *
 * ETL jobs for populating dimension tables from OLTP sources.
 * These run daily (or hourly) to keep dimensions in sync.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { getSourcePool, getWarehousePool, withTransaction } from '../db.js';
import { runJob, createLogger } from '../logger.js';
import type { JobResult } from '../types.js';

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DIM_TENANT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sync tenant dimension from OLTP tenants table.
 * Uses SCD Type 2 for tracking changes.
 */
export async function jobSyncDimTenant(force = false): Promise<JobResult> {
  return runJob('sync_dim_tenant', null, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('sync_dim_tenant');

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsUpdated = 0;

    // Fetch current tenants from OLTP
    const tenantsResult = await source.query(`
      SELECT 
        id as tenant_id,
        name as tenant_name,
        COALESCE(type, 'SCHOOL') as tenant_type,
        district_id,
        state,
        COALESCE(country, 'US') as country,
        COALESCE(timezone, 'America/New_York') as timezone,
        COALESCE(is_active, true) as is_active,
        created_at
      FROM tenants
      WHERE deleted_at IS NULL
    `);

    const tenants = tenantsResult.rows as {
      tenant_id: string;
      tenant_name: string;
      tenant_type: string;
      district_id: string | null;
      state: string | null;
      country: string;
      timezone: string;
      is_active: boolean;
      created_at: Date;
    }[];

    rowsProcessed = tenants.length;
    logger.info(`Fetched ${rowsProcessed} tenants from OLTP`);

    // Upsert into warehouse
    await withTransaction(warehouse, async (client) => {
      for (const tenant of tenants) {
        // Check if tenant exists and has changed
        const existing = await client.query(
          `SELECT tenant_key, tenant_name, tenant_type, is_active 
           FROM dim_tenant 
           WHERE tenant_id = $1 AND is_current = true`,
          [tenant.tenant_id]
        );

        if (existing.rowCount === 0) {
          // Insert new tenant
          await client.query(
            `INSERT INTO dim_tenant (
              tenant_id, tenant_name, tenant_type, district_id,
              state, country, timezone, is_active, created_at,
              effective_from, is_current
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), true)`,
            [
              tenant.tenant_id,
              tenant.tenant_name,
              tenant.tenant_type,
              tenant.district_id,
              tenant.state,
              tenant.country,
              tenant.timezone,
              tenant.is_active,
              tenant.created_at,
            ]
          );
          rowsInserted++;
        } else {
          const row = existing.rows[0] as {
            tenant_key: number;
            tenant_name: string;
            tenant_type: string;
            is_active: boolean;
          };

          // Check if anything changed (SCD Type 2)
          if (
            row.tenant_name !== tenant.tenant_name ||
            row.tenant_type !== tenant.tenant_type ||
            row.is_active !== tenant.is_active
          ) {
            // Close old record
            await client.query(
              `UPDATE dim_tenant SET effective_to = NOW(), is_current = false
               WHERE tenant_key = $1`,
              [row.tenant_key]
            );

            // Insert new version
            await client.query(
              `INSERT INTO dim_tenant (
                tenant_id, tenant_name, tenant_type, district_id,
                state, country, timezone, is_active, created_at,
                effective_from, is_current
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), true)`,
              [
                tenant.tenant_id,
                tenant.tenant_name,
                tenant.tenant_type,
                tenant.district_id,
                tenant.state,
                tenant.country,
                tenant.timezone,
                tenant.is_active,
                tenant.created_at,
              ]
            );
            rowsUpdated++;
          }
        }
      }
    });

    return {
      jobName: 'sync_dim_tenant',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated,
      rowsDeleted: 0,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DIM_LEARNER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sync learner dimension from OLTP learners table.
 */
export async function jobSyncDimLearner(force = false): Promise<JobResult> {
  return runJob('sync_dim_learner', null, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('sync_dim_learner');

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsUpdated = 0;

    // Fetch current learners from OLTP
    const learnersResult = await source.query(`
      SELECT 
        id as learner_id,
        tenant_id,
        grade_band,
        grade_level,
        COALESCE(is_active, true) as is_active,
        created_at
      FROM learners
      WHERE deleted_at IS NULL
    `);

    const learners = learnersResult.rows as {
      learner_id: string;
      tenant_id: string;
      grade_band: string;
      grade_level: number | null;
      is_active: boolean;
      created_at: Date;
    }[];

    rowsProcessed = learners.length;
    logger.info(`Fetched ${rowsProcessed} learners from OLTP`);

    // Upsert into warehouse
    await withTransaction(warehouse, async (client) => {
      for (const learner of learners) {
        // Get tenant key
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [learner.tenant_id]
        );

        if (tenantResult.rowCount === 0) {
          logger.warn(`Tenant not found in dimension: ${learner.tenant_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;

        // Check if learner exists
        const existing = await client.query(
          `SELECT learner_key, grade_band, is_active 
           FROM dim_learner 
           WHERE learner_id = $1 AND is_current = true`,
          [learner.learner_id]
        );

        if (existing.rowCount === 0) {
          await client.query(
            `INSERT INTO dim_learner (
              learner_id, tenant_key, grade_band, grade_level, is_active, 
              created_at, effective_from, is_current
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), true)`,
            [
              learner.learner_id,
              tenantKey,
              learner.grade_band,
              learner.grade_level,
              learner.is_active,
              learner.created_at,
            ]
          );
          rowsInserted++;
        } else {
          const row = existing.rows[0] as {
            learner_key: number;
            grade_band: string;
            is_active: boolean;
          };

          if (row.grade_band !== learner.grade_band || row.is_active !== learner.is_active) {
            // Close old record
            await client.query(
              `UPDATE dim_learner SET effective_to = NOW(), is_current = false
               WHERE learner_key = $1`,
              [row.learner_key]
            );

            // Insert new version
            await client.query(
              `INSERT INTO dim_learner (
                learner_id, tenant_key, grade_band, grade_level, is_active, 
                created_at, effective_from, is_current
              ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), true)`,
              [
                learner.learner_id,
                tenantKey,
                learner.grade_band,
                learner.grade_level,
                learner.is_active,
                learner.created_at,
              ]
            );
            rowsUpdated++;
          }
        }
      }
    });

    return {
      jobName: 'sync_dim_learner',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated,
      rowsDeleted: 0,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DIM_USER
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sync user dimension from OLTP users table.
 */
export async function jobSyncDimUser(force = false): Promise<JobResult> {
  return runJob('sync_dim_user', null, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('sync_dim_user');

    let rowsProcessed = 0;
    let rowsInserted = 0;
    let rowsUpdated = 0;

    // Fetch current users from OLTP
    const usersResult = await source.query(`
      SELECT 
        id as user_id,
        tenant_id,
        role,
        COALESCE(is_active, true) as is_active,
        created_at
      FROM users
      WHERE deleted_at IS NULL
    `);

    const users = usersResult.rows as {
      user_id: string;
      tenant_id: string;
      role: string;
      is_active: boolean;
      created_at: Date;
    }[];

    rowsProcessed = users.length;
    logger.info(`Fetched ${rowsProcessed} users from OLTP`);

    await withTransaction(warehouse, async (client) => {
      for (const user of users) {
        // Get tenant key
        const tenantResult = await client.query(
          `SELECT tenant_key FROM dim_tenant WHERE tenant_id = $1 AND is_current = true`,
          [user.tenant_id]
        );

        if (tenantResult.rowCount === 0) {
          logger.warn(`Tenant not found in dimension: ${user.tenant_id}`);
          continue;
        }

        const tenantKey = (tenantResult.rows[0] as { tenant_key: number }).tenant_key;

        const existing = await client.query(
          `SELECT user_key, role, is_active 
           FROM dim_user 
           WHERE user_id = $1 AND is_current = true`,
          [user.user_id]
        );

        if (existing.rowCount === 0) {
          await client.query(
            `INSERT INTO dim_user (
              user_id, tenant_key, role, is_active, 
              created_at, effective_from, is_current
            ) VALUES ($1, $2, $3, $4, $5, NOW(), true)`,
            [user.user_id, tenantKey, user.role, user.is_active, user.created_at]
          );
          rowsInserted++;
        } else {
          const row = existing.rows[0] as {
            user_key: number;
            role: string;
            is_active: boolean;
          };

          if (row.role !== user.role || row.is_active !== user.is_active) {
            await client.query(
              `UPDATE dim_user SET effective_to = NOW(), is_current = false
               WHERE user_key = $1`,
              [row.user_key]
            );

            await client.query(
              `INSERT INTO dim_user (
                user_id, tenant_key, role, is_active, 
                created_at, effective_from, is_current
              ) VALUES ($1, $2, $3, $4, $5, NOW(), true)`,
              [user.user_id, tenantKey, user.role, user.is_active, user.created_at]
            );
            rowsUpdated++;
          }
        }
      }
    });

    return {
      jobName: 'sync_dim_user',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated,
      rowsDeleted: 0,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DIM_SUBJECT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sync subject dimension (static configuration).
 */
export async function jobSyncDimSubject(force = false): Promise<JobResult> {
  return runJob('sync_dim_subject', null, force, async () => {
    const warehouse = getWarehousePool();
    const logger = createLogger('sync_dim_subject');

    // Static subject configuration
    const subjects = [
      {
        code: 'ELA',
        name: 'English Language Arts',
        description: 'Reading, writing, and language skills',
      },
      {
        code: 'MATH',
        name: 'Mathematics',
        description: 'Mathematical concepts and problem solving',
      },
      { code: 'SCIENCE', name: 'Science', description: 'Scientific inquiry and natural world' },
      {
        code: 'SEL',
        name: 'Social-Emotional Learning',
        description: 'Social and emotional competencies',
      },
      { code: 'SPEECH', name: 'Speech', description: 'Speech therapy and language development' },
      { code: 'OTHER', name: 'Other', description: 'Other subjects' },
    ];

    let rowsInserted = 0;

    await withTransaction(warehouse, async (client) => {
      for (const subject of subjects) {
        const existing = await client.query(
          `SELECT subject_key FROM dim_subject WHERE subject_code = $1`,
          [subject.code]
        );

        if (existing.rowCount === 0) {
          await client.query(
            `INSERT INTO dim_subject (subject_code, subject_name, description)
             VALUES ($1, $2, $3)`,
            [subject.code, subject.name, subject.description]
          );
          rowsInserted++;
        }
      }
    });

    logger.info(`Synced ${subjects.length} subjects, inserted ${rowsInserted}`);

    return {
      jobName: 'sync_dim_subject',
      status: 'SUCCESS',
      rowsProcessed: subjects.length,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted: 0,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// SYNC DIM_SKILL
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sync skill dimension from OLTP skills table.
 */
export async function jobSyncDimSkill(force = false): Promise<JobResult> {
  return runJob('sync_dim_skill', null, force, async () => {
    const source = getSourcePool();
    const warehouse = getWarehousePool();
    const logger = createLogger('sync_dim_skill');

    let rowsProcessed = 0;
    let rowsInserted = 0;

    // Fetch skills from OLTP
    const skillsResult = await source.query(`
      SELECT 
        id as skill_id,
        code as skill_code,
        name as skill_name,
        description,
        subject,
        grade_band,
        parent_skill_id,
        depth
      FROM skills
      WHERE deleted_at IS NULL
    `);

    const skills = skillsResult.rows as {
      skill_id: string;
      skill_code: string;
      skill_name: string;
      description: string | null;
      subject: string;
      grade_band: string | null;
      parent_skill_id: string | null;
      depth: number;
    }[];

    rowsProcessed = skills.length;
    logger.info(`Fetched ${rowsProcessed} skills from OLTP`);

    await withTransaction(warehouse, async (client) => {
      for (const skill of skills) {
        // Get subject key
        const subjectResult = await client.query(
          `SELECT subject_key FROM dim_subject WHERE subject_code = $1`,
          [skill.subject]
        );

        if (subjectResult.rowCount === 0) {
          logger.warn(`Subject not found in dimension: ${skill.subject}`);
          continue;
        }

        const subjectKey = (subjectResult.rows[0] as { subject_key: number }).subject_key;

        const existing = await client.query(`SELECT skill_key FROM dim_skill WHERE skill_id = $1`, [
          skill.skill_id,
        ]);

        if (existing.rowCount === 0) {
          await client.query(
            `INSERT INTO dim_skill (
              skill_id, subject_key, skill_code, skill_name, 
              description, grade_band, parent_skill_id, depth
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              skill.skill_id,
              subjectKey,
              skill.skill_code,
              skill.skill_name,
              skill.description,
              skill.grade_band,
              skill.parent_skill_id,
              skill.depth,
            ]
          );
          rowsInserted++;
        }
      }
    });

    return {
      jobName: 'sync_dim_skill',
      status: 'SUCCESS',
      rowsProcessed,
      rowsInserted,
      rowsUpdated: 0,
      rowsDeleted: 0,
      durationMs: 0,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// RUN ALL DIMENSION SYNCS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Run all dimension sync jobs in order.
 */
export async function runAllDimensionSyncs(force = false): Promise<JobResult[]> {
  const results: JobResult[] = [];

  // Order matters: subjects before skills, tenants before learners/users
  results.push(await jobSyncDimSubject(force));
  results.push(await jobSyncDimTenant(force));
  results.push(await jobSyncDimLearner(force));
  results.push(await jobSyncDimUser(force));
  results.push(await jobSyncDimSkill(force));

  return results;
}
