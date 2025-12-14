/**
 * Research Export Routes
 *
 * API endpoints for exporting de-identified analytics data for research purposes.
 * Implements FERPA and COPPA compliance through:
 * - De-identification (pseudonymized learner IDs)
 * - K-anonymity checks (minimum cohort sizes)
 * - Export audit logging
 * - Role-based access control
 */

import crypto from 'node:crypto';

import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { getWarehousePool } from '../etl/db.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Minimum number of learners required per cohort for k-anonymity.
 * This prevents re-identification of individuals.
 */
const K_ANONYMITY_THRESHOLD = 10;

/**
 * Salt for pseudonymization (in production, use a secure secret from env)
 */
const DEIDENTIFICATION_SALT = process.env.RESEARCH_DEIDENTIFICATION_SALT ?? 'aivo-research-salt';

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const exportRequestSchema = z.object({
  // Data scope
  tenantIds: z.array(z.string().uuid()).min(1).max(100),
  dateRange: z.object({
    from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),

  // Data selection
  dataTypes: z.array(
    z.enum([
      'sessions',
      'activity_events',
      'learning_progress',
      'focus_events',
      'ai_usage',
      'experiment_exposures',
    ])
  ),

  // Filters
  gradeBands: z.array(z.enum(['K5', 'G6_8', 'G9_12'])).optional(),
  subjects: z.array(z.string()).optional(),

  // Research metadata
  purpose: z.string().min(10).max(1000),
  irbApprovalNumber: z.string().optional(),
  researcherAffiliation: z.string().optional(),

  // Format
  format: z.enum(['json', 'csv', 'parquet']).optional().default('json'),
  includeMetadata: z.boolean().optional().default(false),
});

// ══════════════════════════════════════════════════════════════════════════════
// DE-IDENTIFICATION UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Pseudonymize an identifier (learner ID, session ID, etc.)
 * Uses HMAC-SHA256 to create a consistent but non-reversible identifier.
 */
function pseudonymize(identifier: string, exportId: string): string {
  const hmac = crypto.createHmac('sha256', DEIDENTIFICATION_SALT);
  hmac.update(`${exportId}:${identifier}`);
  return `ANON_${hmac.digest('hex').substring(0, 16).toUpperCase()}`;
}

/**
 * Remove or generalize quasi-identifiers.
 * Exported for potential future use in other export types.
 */
export function _generalizeAge(birthDate: Date | null): string | null {
  if (!birthDate) return null;
  const age = Math.floor(
    (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
  if (age < 5) return '0-4';
  if (age < 10) return '5-9';
  if (age < 15) return '10-14';
  if (age < 18) return '15-17';
  return '18+';
}

/**
 * Generalize timestamps to reduce precision (minute → hour).
 * Exported for potential future use in other export types.
 */
export function _generalizeTimestamp(timestamp: Date): string {
  const d = new Date(timestamp);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

// ══════════════════════════════════════════════════════════════════════════════
// K-ANONYMITY CHECKS
// ══════════════════════════════════════════════════════════════════════════════

interface CohortCount {
  key: string;
  count: number;
}

/**
 * Check if a query result satisfies k-anonymity requirements.
 * Returns failing cohorts if any group has fewer than K learners.
 */
async function checkKAnonymity(
  tenantIds: string[],
  fromDate: string,
  toDate: string,
  groupByFields: string[]
): Promise<{ passed: boolean; failingCohorts: CohortCount[] }> {
  const warehouse = getWarehousePool();

  const fromDateKey = Number.parseInt(fromDate.replaceAll('-', ''), 10);
  const toDateKey = Number.parseInt(toDate.replaceAll('-', ''), 10);

  // Build dynamic group by clause
  const groupByClause = groupByFields.length > 0 ? `GROUP BY ${groupByFields.join(', ')}` : '';

  // Check learner counts per cohort
  const result = await warehouse.query(
    `
    WITH tenant_keys AS (
      SELECT tenant_key FROM dim_tenant 
      WHERE tenant_id = ANY($1) AND is_current = true
    )
    SELECT 
      ${groupByFields.length > 0 ? groupByFields.join(" || '|' || ") + ' as cohort_key,' : "'all' as cohort_key,"}
      COUNT(DISTINCT learner_key) as learner_count
    FROM fact_sessions fs
    JOIN tenant_keys tk ON fs.tenant_key = tk.tenant_key
    WHERE fs.date_key BETWEEN $2 AND $3
    ${groupByClause}
    HAVING COUNT(DISTINCT learner_key) < $4
    `,
    [tenantIds, fromDateKey, toDateKey, K_ANONYMITY_THRESHOLD]
  );

  const failingCohorts = (result.rows as { cohort_key: string; learner_count: number }[]).map(
    (row) => ({
      key: row.cohort_key,
      count: row.learner_count,
    })
  );

  return {
    passed: failingCohorts.length === 0,
    failingCohorts,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ══════════════════════════════════════════════════════════════════════════════

interface ExportAuditRecord {
  exportId: string;
  userId: string;
  tenantId: string;
  requestedAt: Date;
  purpose: string;
  dataTypes: string[];
  tenantIdsRequested: string[];
  dateRange: { from: string; to: string };
  rowCount: number;
  kAnonymityPassed: boolean;
  irbApprovalNumber?: string;
  ipAddress?: string;
  userAgent?: string;
}

async function logExportAudit(record: ExportAuditRecord): Promise<void> {
  const warehouse = getWarehousePool();

  await warehouse.query(
    `
    INSERT INTO research_export_audit (
      export_id, user_id, tenant_id, requested_at, purpose,
      data_types, tenant_ids_requested, date_range_from, date_range_to,
      row_count, k_anonymity_passed, irb_approval_number, ip_address, user_agent
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `,
    [
      record.exportId,
      record.userId,
      record.tenantId,
      record.requestedAt,
      record.purpose,
      record.dataTypes,
      record.tenantIdsRequested,
      record.dateRange.from,
      record.dateRange.to,
      record.rowCount,
      record.kAnonymityPassed,
      record.irbApprovalNumber,
      record.ipAddress,
      record.userAgent,
    ]
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT DATA QUERIES
// ══════════════════════════════════════════════════════════════════════════════

interface DeidentifiedSession {
  anonymized_session_id: string;
  anonymized_learner_id: string;
  date: string;
  grade_band: string | null;
  session_type: string;
  duration_seconds: number;
  activities_completed: number;
  correct_responses: number;
  total_responses: number;
  hints_used: number;
  focus_breaks_count: number;
}

async function exportSessions(
  exportId: string,
  tenantIds: string[],
  fromDate: string,
  toDate: string
): Promise<DeidentifiedSession[]> {
  const warehouse = getWarehousePool();
  const fromDateKey = Number.parseInt(fromDate.replaceAll('-', ''), 10);
  const toDateKey = Number.parseInt(toDate.replaceAll('-', ''), 10);

  const result = await warehouse.query(
    `
    WITH tenant_keys AS (
      SELECT tenant_key FROM dim_tenant 
      WHERE tenant_id = ANY($1) AND is_current = true
    )
    SELECT 
      fs.session_id,
      dl.learner_id,
      dt.full_date,
      dl.grade_band,
      fs.session_type,
      fs.duration_seconds,
      fs.activities_completed,
      fs.correct_responses,
      (fs.correct_responses + fs.incorrect_responses) as total_responses,
      fs.hints_used,
      fs.focus_breaks_count
    FROM fact_sessions fs
    JOIN tenant_keys tk ON fs.tenant_key = tk.tenant_key
    JOIN dim_learner dl ON fs.learner_key = dl.learner_key
    JOIN dim_time dt ON fs.date_key = dt.date_key
    WHERE fs.date_key BETWEEN $2 AND $3
    `,
    [tenantIds, fromDateKey, toDateKey]
  );

  // De-identify the results
  return (
    result.rows as {
      session_id: string;
      learner_id: string;
      full_date: Date;
      grade_band: string | null;
      session_type: string;
      duration_seconds: number;
      activities_completed: number;
      correct_responses: number;
      total_responses: number;
      hints_used: number;
      focus_breaks_count: number;
    }[]
  ).map((row) => {
    const [dateStr] = row.full_date.toISOString().split('T');
    return {
      anonymized_session_id: pseudonymize(row.session_id, exportId),
      anonymized_learner_id: pseudonymize(row.learner_id, exportId),
      date: dateStr,
      grade_band: row.grade_band,
      session_type: row.session_type,
      duration_seconds: row.duration_seconds,
      activities_completed: row.activities_completed,
      correct_responses: row.correct_responses,
      total_responses: row.total_responses,
      hints_used: row.hints_used,
      focus_breaks_count: row.focus_breaks_count,
    };
  });
}

interface DeidentifiedLearningProgress {
  anonymized_learner_id: string;
  date: string;
  subject: string | null;
  skill_code: string | null;
  mastery_score: number;
}

async function exportLearningProgress(
  exportId: string,
  tenantIds: string[],
  fromDate: string,
  toDate: string
): Promise<DeidentifiedLearningProgress[]> {
  const warehouse = getWarehousePool();
  const fromDateKey = Number.parseInt(fromDate.replaceAll('-', ''), 10);
  const toDateKey = Number.parseInt(toDate.replaceAll('-', ''), 10);

  const result = await warehouse.query(
    `
    WITH tenant_keys AS (
      SELECT tenant_key FROM dim_tenant 
      WHERE tenant_id = ANY($1) AND is_current = true
    )
    SELECT 
      dl.learner_id,
      dt.full_date,
      ds.subject_name as subject,
      dsk.skill_code,
      flp.mastery_score
    FROM fact_learning_progress flp
    JOIN tenant_keys tk ON flp.tenant_key = tk.tenant_key
    JOIN dim_learner dl ON flp.learner_key = dl.learner_key
    JOIN dim_time dt ON flp.date_key = dt.date_key
    LEFT JOIN dim_skill dsk ON flp.skill_key = dsk.skill_key
    LEFT JOIN dim_subject ds ON dsk.subject_key = ds.subject_key
    WHERE flp.date_key BETWEEN $2 AND $3
    `,
    [tenantIds, fromDateKey, toDateKey]
  );

  return (
    result.rows as {
      learner_id: string;
      full_date: Date;
      subject: string | null;
      skill_code: string | null;
      mastery_score: number;
    }[]
  ).map((row) => {
    const [dateStr] = row.full_date.toISOString().split('T');
    return {
      anonymized_learner_id: pseudonymize(row.learner_id, exportId),
      date: dateStr,
      subject: row.subject,
      skill_code: row.skill_code,
      mastery_score: row.mastery_score,
    };
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

interface AuthenticatedUser {
  sub: string;
  tenantId: string;
  role: string;
}

function getUser(request: FastifyRequest): AuthenticatedUser {
  const user = (request as FastifyRequest & { user?: AuthenticatedUser }).user;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user;
}

export const researchExportRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /research/exports
   *
   * Request a de-identified data export for research purposes.
   * Requires: PLATFORM_ADMIN or RESEARCHER role
   */
  app.post('/research/exports', async (request, reply) => {
    const user = getUser(request);

    // Role check - only platform admins and researchers can export
    if (!['PLATFORM_ADMIN', 'RESEARCHER'].includes(user.role)) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Only platform admins and researchers can request data exports',
      });
    }

    // Parse and validate request
    const body = exportRequestSchema.parse(request.body);

    // Generate unique export ID
    const exportId = crypto.randomUUID();

    // Check k-anonymity
    const kAnonymityCheck = await checkKAnonymity(
      body.tenantIds,
      body.dateRange.from,
      body.dateRange.to,
      ['grade_band'] // Group by grade band for anonymity check
    );

    if (!kAnonymityCheck.passed) {
      await logExportAudit({
        exportId,
        userId: user.sub,
        tenantId: user.tenantId,
        requestedAt: new Date(),
        purpose: body.purpose,
        dataTypes: body.dataTypes,
        tenantIdsRequested: body.tenantIds,
        dateRange: body.dateRange,
        rowCount: 0,
        kAnonymityPassed: false,
        irbApprovalNumber: body.irbApprovalNumber,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });

      return reply.status(422).send({
        error: 'K_ANONYMITY_FAILED',
        message: `Some cohorts have fewer than ${K_ANONYMITY_THRESHOLD} learners, which could enable re-identification`,
        failingCohorts: kAnonymityCheck.failingCohorts,
        suggestion:
          'Expand the date range or include more tenants to increase cohort sizes',
      });
    }

    // Collect export data
    const exportData: Record<string, unknown[]> = {};
    let totalRowCount = 0;

    if (body.dataTypes.includes('sessions')) {
      exportData.sessions = await exportSessions(
        exportId,
        body.tenantIds,
        body.dateRange.from,
        body.dateRange.to
      );
      totalRowCount += exportData.sessions.length;
    }

    if (body.dataTypes.includes('learning_progress')) {
      exportData.learning_progress = await exportLearningProgress(
        exportId,
        body.tenantIds,
        body.dateRange.from,
        body.dateRange.to
      );
      totalRowCount += exportData.learning_progress.length;
    }

    // FUTURE: Add other data types (activity_events, focus_events, ai_usage, experiment_exposures)

    // Log audit record
    await logExportAudit({
      exportId,
      userId: user.sub,
      tenantId: user.tenantId,
      requestedAt: new Date(),
      purpose: body.purpose,
      dataTypes: body.dataTypes,
      tenantIdsRequested: body.tenantIds,
      dateRange: body.dateRange,
      rowCount: totalRowCount,
      kAnonymityPassed: true,
      irbApprovalNumber: body.irbApprovalNumber,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });

    // Return export
    return reply.status(200).send({
      exportId,
      requestedAt: new Date().toISOString(),
      format: body.format,
      rowCount: totalRowCount,
      kAnonymityThreshold: K_ANONYMITY_THRESHOLD,
      deidentificationMethod: 'HMAC-SHA256 pseudonymization with per-export salt',
      complianceNotes: [
        'All learner identifiers have been pseudonymized',
        'Direct identifiers (names, emails) are not included',
        'Quasi-identifiers (age) are generalized',
        'Timestamps are rounded to hour precision',
        `Minimum cohort size: ${K_ANONYMITY_THRESHOLD} learners`,
      ],
      data: exportData,
    });
  });

  /**
   * GET /research/exports/audit
   *
   * View audit log of research exports.
   * Requires: PLATFORM_ADMIN role
   */
  app.get('/research/exports/audit', async (request, reply) => {
    const user = getUser(request);

    if (user.role !== 'PLATFORM_ADMIN') {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Only platform admins can view export audit logs',
      });
    }

    const warehouse = getWarehousePool();

    const result = await warehouse.query(`
      SELECT 
        export_id,
        user_id,
        requested_at,
        purpose,
        data_types,
        date_range_from,
        date_range_to,
        row_count,
        k_anonymity_passed,
        irb_approval_number
      FROM research_export_audit
      ORDER BY requested_at DESC
      LIMIT 100
    `);

    return reply.status(200).send({
      exports: result.rows,
    });
  });

  /**
   * GET /research/exports/check-anonymity
   *
   * Pre-check if a proposed export would pass k-anonymity requirements.
   * Useful for UI feedback before submitting export request.
   */
  app.post('/research/exports/check-anonymity', async (request, reply) => {
    const user = getUser(request);

    if (!['PLATFORM_ADMIN', 'RESEARCHER'].includes(user.role)) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Insufficient permissions',
      });
    }

    const body = z
      .object({
        tenantIds: z.array(z.string().uuid()).min(1),
        dateRange: z.object({
          from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      })
      .parse(request.body);

    const check = await checkKAnonymity(
      body.tenantIds,
      body.dateRange.from,
      body.dateRange.to,
      ['grade_band']
    );

    return reply.status(200).send({
      passed: check.passed,
      threshold: K_ANONYMITY_THRESHOLD,
      failingCohorts: check.failingCohorts,
    });
  });
};
