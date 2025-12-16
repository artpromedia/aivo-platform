/**
 * Export Job Service
 *
 * Handles export job creation, execution, and file generation.
 */

import type { DatasetGranularity, ExportFormat, ExportJobStatus } from '@prisma/client';

import { config } from '../config.js';
import {
  publishExportCompleted,
  publishExportFailed,
  publishExportRequested,
} from '../events/publisher.js';
import { prisma } from '../prisma.js';
import { getWarehousePool } from '../warehouse.js';

import { validateUserAccess } from './accessGrantService.js';
import { recordAuditLog, type AuditContext } from './auditService.js';
import { DEFAULT_CONSTRAINTS, transformDataset, type PrivacyConstraints } from './privacyGuard.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateExportJobInput {
  tenantId: string;
  researchProjectId: string;
  datasetDefinitionId: string;
  cohortId: string;
  requestedByUserId: string;
  format: ExportFormat;
  dateRangeFrom: Date;
  dateRangeTo: Date;
}

export interface ExportResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  suppressedRowCount: number;
  transformations: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate that an export job can be created
 */
async function validateExportRequest(input: CreateExportJobInput): Promise<{
  valid: boolean;
  error?: string;
  project?: Awaited<ReturnType<typeof prisma.researchProject.findFirst>>;
  dataset?: Awaited<ReturnType<typeof prisma.researchDatasetDefinition.findFirst>>;
  cohort?: Awaited<ReturnType<typeof prisma.researchCohort.findFirst>>;
}> {
  // 1. Check project exists and is approved
  const project = await prisma.researchProject.findFirst({
    where: { id: input.researchProjectId, tenantId: input.tenantId },
    include: {
      dataUseAgreements: {
        where: { status: 'ACTIVE' },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  if (!project) {
    return { valid: false, error: 'Project not found' };
  }

  if (project.status !== 'APPROVED') {
    return { valid: false, error: `Project is not approved (status: ${project.status})` };
  }

  // 2. Check DUA is active
  if (project.dataUseAgreements.length === 0) {
    return { valid: false, error: 'No active Data Use Agreement for this project' };
  }

  // 3. Check dataset definition exists
  const dataset = await prisma.researchDatasetDefinition.findFirst({
    where: { id: input.datasetDefinitionId, researchProjectId: input.researchProjectId },
  });

  if (!dataset) {
    return { valid: false, error: 'Dataset definition not found' };
  }

  // 4. Check cohort exists
  const cohort = await prisma.researchCohort.findFirst({
    where: { id: input.cohortId, researchProjectId: input.researchProjectId },
  });

  if (!cohort) {
    return { valid: false, error: 'Cohort not found' };
  }

  // 5. Check user has access with sufficient scope
  const requiredScope = granularityToScope(dataset.granularity);
  const accessCheck = await validateUserAccess(
    input.researchProjectId,
    input.requestedByUserId,
    requiredScope
  );

  if (!accessCheck.valid) {
    return { valid: false, error: accessCheck.error };
  }

  // 6. Check user has accepted DUA
  if (!accessCheck.grant?.duaAcceptedAt) {
    return { valid: false, error: 'User has not accepted the Data Use Agreement' };
  }

  return { valid: true, project, dataset, cohort };
}

function granularityToScope(
  granularity: DatasetGranularity
): 'AGG_ONLY' | 'DEIDENTIFIED_LEARNER_LEVEL' | 'INTERNAL_FULL_ACCESS' {
  switch (granularity) {
    case 'AGGREGATED':
      return 'AGG_ONLY';
    case 'DEIDENTIFIED_LEARNER_LEVEL':
      return 'DEIDENTIFIED_LEARNER_LEVEL';
    case 'INTERNAL_LEARNER_LEVEL':
      return 'INTERNAL_FULL_ACCESS';
    default:
      return 'AGG_ONLY';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export Job Management
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new export job
 */
export async function createExportJob(input: CreateExportJobInput, auditContext: AuditContext) {
  // Validate request
  const validation = await validateExportRequest(input);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create job
  const job = await prisma.researchExportJob.create({
    data: {
      tenantId: input.tenantId,
      researchProjectId: input.researchProjectId,
      datasetDefinitionId: input.datasetDefinitionId,
      cohortId: input.cohortId,
      requestedByUserId: input.requestedByUserId,
      format: input.format,
      dateRangeFrom: input.dateRangeFrom,
      dateRangeTo: input.dateRangeTo,
      status: 'QUEUED',
    },
  });

  // Audit log
  await recordAuditLog(auditContext, 'EXPORT_REQUESTED', input.researchProjectId, {
    exportJobId: job.id,
    datasetDefinitionId: input.datasetDefinitionId,
    cohortId: input.cohortId,
    format: input.format,
    dateRange: {
      from: input.dateRangeFrom.toISOString(),
      to: input.dateRangeTo.toISOString(),
    },
  });

  // Publish event
  await publishExportRequested({
    exportJobId: job.id,
    projectId: input.researchProjectId,
    tenantId: input.tenantId,
    datasetDefinitionId: input.datasetDefinitionId,
    cohortId: input.cohortId,
    format: input.format,
    requestedByUserId: input.requestedByUserId,
    timestamp: new Date().toISOString(),
  });

  return job;
}

/**
 * Get export jobs for a user
 */
export async function getUserExportJobs(
  userId: string | undefined,
  tenantId: string,
  options: {
    projectId?: string;
    status?: ExportJobStatus[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const { projectId, status, limit = 20, offset = 0 } = options;

  return prisma.researchExportJob.findMany({
    where: {
      ...(userId ? { requestedByUserId: userId } : {}),
      tenantId,
      ...(projectId ? { researchProjectId: projectId } : {}),
      ...(status && status.length > 0 ? { status: { in: status } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      datasetDefinition: { select: { name: true, granularity: true } },
      cohort: { select: { name: true } },
    },
  });
}

/**
 * Get export jobs for a project
 */
export async function getProjectExportJobs(
  projectId: string,
  tenantId: string,
  options: {
    status?: ExportJobStatus[];
    limit?: number;
    offset?: number;
  } = {}
) {
  const { status, limit = 20, offset = 0 } = options;

  return prisma.researchExportJob.findMany({
    where: {
      researchProjectId: projectId,
      tenantId,
      ...(status && status.length > 0 ? { status: { in: status } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      datasetDefinition: { select: { name: true, granularity: true } },
      cohort: { select: { name: true } },
    },
  });
}

/**
 * Get an export job by ID
 */
export async function getExportJob(jobId: string, userId: string) {
  return prisma.researchExportJob.findFirst({
    where: {
      id: jobId,
      requestedByUserId: userId,
    },
    include: {
      datasetDefinition: true,
      cohort: true,
      researchProject: { select: { title: true, status: true } },
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export Execution (Worker)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process an export job (called by worker)
 */
export async function processExportJob(jobId: string): Promise<void> {
  // Get job with all related data
  const job = await prisma.researchExportJob.findUnique({
    where: { id: jobId },
    include: {
      datasetDefinition: true,
      cohort: true,
    },
  });

  if (!job) {
    throw new Error(`Export job ${jobId} not found`);
  }

  if (job.status !== 'QUEUED') {
    throw new Error(`Export job ${jobId} is not queued (status: ${job.status})`);
  }

  // Update status to RUNNING
  await prisma.researchExportJob.update({
    where: { id: jobId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  try {
    // Execute export
    const result = await executeExport(job);

    // Generate file and upload
    const { storagePath, fileSizeBytes } = await generateAndUploadFile(
      job.id,
      result.rows,
      job.format
    );

    // Update job as succeeded
    await prisma.researchExportJob.update({
      where: { id: jobId },
      data: {
        status: 'SUCCEEDED',
        completedAt: new Date(),
        rowCount: result.rowCount,
        suppressedRowCount: result.suppressedRowCount,
        fileSizeBytes: BigInt(fileSizeBytes),
        storagePath,
        storageExpiresAt: new Date(Date.now() + config.exportRetentionDays * 24 * 60 * 60 * 1000),
        kAnonymityPassed: true,
      },
    });

    await publishExportCompleted({
      exportJobId: job.id,
      projectId: job.researchProjectId,
      tenantId: job.tenantId,
      rowCount: result.rowCount,
      fileSizeBytes,
      storagePath,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof Error && 'code' in error ? String(error.code) : 'UNKNOWN';

    await prisma.researchExportJob.update({
      where: { id: jobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage,
        errorCode,
      },
    });

    await publishExportFailed({
      exportJobId: job.id,
      projectId: job.researchProjectId,
      tenantId: job.tenantId,
      errorCode,
      errorMessage,
      timestamp: new Date().toISOString(),
    });

    throw error;
  }
}

/**
 * Execute the actual data export
 */
async function executeExport(job: {
  id: string;
  tenantId: string;
  dateRangeFrom: Date;
  dateRangeTo: Date;
  datasetDefinition: {
    granularity: DatasetGranularity;
    schemaJson: unknown;
    privacyConstraintsJson: unknown;
  };
  cohort: {
    filterJson: unknown;
  };
}): Promise<ExportResult> {
  const warehouse = getWarehousePool();

  // Parse constraints
  const defaultConstraints = DEFAULT_CONSTRAINTS[job.datasetDefinition.granularity];
  const customConstraints = job.datasetDefinition.privacyConstraintsJson as
    | Partial<PrivacyConstraints>
    | undefined;

  // Filter out undefined values from custom constraints and merge with defaults
  const filteredCustom: Partial<PrivacyConstraints> = {};
  if (customConstraints) {
    for (const [key, value] of Object.entries(customConstraints)) {
      if (value !== undefined) {
        (filteredCustom as Record<string, unknown>)[key] = value;
      }
    }
  }

  const constraints = {
    ...defaultConstraints,
    ...filteredCustom,
  } as PrivacyConstraints;

  // Parse schema for dynamic query building
  const schema = job.datasetDefinition.schemaJson as {
    factTables?: string[];
    dimensions?: string[];
    metrics?: string[];
  };

  // Determine which fact tables to use (defaults to sessions)
  const factTable = schema.factTables?.[0] ?? 'fact_sessions';

  // Build select clause from metrics (use defaults if not specified)
  const defaultMetrics = [
    'session_type',
    'duration_seconds',
    'activities_completed',
    'correct_responses',
    'hints_used',
  ];
  const selectMetrics = schema.metrics?.length ? schema.metrics : defaultMetrics;

  // Parse cohort filter
  const filter = job.cohort.filterJson as {
    gradeBands?: string[];
    profileTags?: string[];
    schools?: string[];
  };

  // Build and execute query (simplified example using sessions)
  const fromDateStr = job.dateRangeFrom.toISOString().split('T')[0] ?? '';
  const fromDateKey = Number.parseInt(fromDateStr.replaceAll('-', ''), 10);
  const toDateStr = job.dateRangeTo.toISOString().split('T')[0] ?? '';
  const toDateKey = Number.parseInt(toDateStr.replaceAll('-', ''), 10);

  // Build dynamic query based on schema configuration
  const metricsSelect = selectMetrics.map((m) => `fs.${m}`).join(',\n      ');

  const query = `
    WITH tenant_filter AS (
      SELECT tenant_key FROM dim_tenant 
      WHERE tenant_id = $1 AND is_current = true
    )
    SELECT 
      dl.learner_id,
      dt.full_date as session_date,
      dl.grade_band,
      ${metricsSelect},
      (fs.correct_responses + fs.incorrect_responses) as total_responses
    FROM ${factTable} fs
    JOIN tenant_filter tf ON fs.tenant_key = tf.tenant_key
    JOIN dim_learner dl ON fs.learner_key = dl.learner_key AND dl.is_current = true
    JOIN dim_time dt ON fs.date_key = dt.date_key
    WHERE fs.date_key BETWEEN $2 AND $3
    ${filter.gradeBands && filter.gradeBands.length > 0 ? `AND dl.grade_band = ANY($4)` : ''}
    ORDER BY dt.full_date, dl.learner_id
  `;

  const params: (string | number | string[])[] = [job.tenantId, fromDateKey, toDateKey];
  if (filter.gradeBands && filter.gradeBands.length > 0) {
    params.push(filter.gradeBands);
  }

  const result = await warehouse.query(query, params);
  const rawRows = result.rows as Record<string, unknown>[];

  // Apply privacy transformations
  const transformed = transformDataset(rawRows, job.id, constraints, {
    isAggregated: job.datasetDefinition.granularity === 'AGGREGATED',
    learnerCountColumn: 'learner_count',
  });

  return {
    rows: transformed.rows,
    rowCount: transformed.rows.length,
    suppressedRowCount: transformed.suppressedRowCount,
    transformations: transformed.transformations,
  };
}

/**
 * Generate file and upload to storage
 */
async function generateAndUploadFile(
  jobId: string,
  rows: Record<string, unknown>[],
  format: ExportFormat
): Promise<{ storagePath: string; fileSizeBytes: number }> {
  let content: string;
  let filename: string;

  switch (format) {
    case 'CSV':
      content = convertToCSV(rows);
      filename = `${jobId}.csv`;
      break;
    case 'JSON':
      content = JSON.stringify(rows, null, 2);
      filename = `${jobId}.json`;
      break;
    case 'PARQUET':
      // In production, use a parquet library
      content = JSON.stringify(rows);
      filename = `${jobId}.parquet.json`;
      break;
    default:
      content = JSON.stringify(rows);
      filename = `${jobId}.json`;
  }

  // In production, upload to S3
  // For now, we'll simulate storage
  const storagePath = `s3://${config.s3Bucket}/exports/${filename}`;
  const fileSizeBytes = Buffer.byteLength(content, 'utf8');

  console.log(`[Storage] Would upload ${fileSizeBytes} bytes to ${storagePath}`);

  return { storagePath, fileSizeBytes };
}

/**
 * Convert rows to CSV format
 */
function convertToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const firstRow = rows[0];
  if (!firstRow) return '';

  const headers = Object.keys(firstRow);
  const csvRows = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'object') {
            const jsonStr = JSON.stringify(val);
            return `"${jsonStr.replaceAll('"', '""')}"`;
          }
          const strVal = typeof val === 'string' ? val : String(val as string | number | boolean);
          if (strVal.includes(',') || strVal.includes('"')) {
            return `"${strVal.replaceAll('"', '""')}"`;
          }
          return strVal;
        })
        .join(',')
    ),
  ];

  return csvRows.join('\n');
}

/**
 * Mark export as downloaded (for audit)
 */
export async function recordDownload(
  jobId: string,
  userId: string,
  auditContext: AuditContext
): Promise<void> {
  const job = await prisma.researchExportJob.findFirst({
    where: { id: jobId, requestedByUserId: userId },
  });

  if (!job) {
    throw new Error('Export job not found');
  }

  await recordAuditLog(auditContext, 'EXPORT_DOWNLOADED', job.researchProjectId, {
    exportJobId: job.id,
    rowCount: job.rowCount,
    format: job.format,
  });
}
