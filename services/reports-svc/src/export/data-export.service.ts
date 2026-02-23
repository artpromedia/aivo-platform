/**
 * Data Export Service — Bulk CSV / XLSX / JSON exports for district data warehouses.
 *
 * FERPA-compliant:
 * - All queries scoped to tenantId
 * - Exports auto-expire (presigned URLs TTL 24 h)
 * - Audit trail via ExportJob rows
 *
 * Flow:
 *  1. Route handler creates ExportJob (status=queued)
 *  2. processExportJob() fetches data via service clients, streams to S3
 *  3. On completion, generates presigned download URL + optional email delivery
 */

import { S3, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { stringify } from 'csv-stringify/sync';
import ExcelJS from 'exceljs';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateExportJobInput {
  tenantId: string;
  requestedBy: string;
  exportType: string;
  format: 'csv' | 'excel' | 'json';
  filters?: Record<string, unknown>;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  deliveryMethod?: 'download' | 'email' | 'sftp';
  deliveryTarget?: string;
}

export interface ExportRow {
  [key: string]: string | number | boolean | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// S3 CLIENT
// ══════════════════════════════════════════════════════════════════════════════

const s3 = new S3({ region: config.s3Region });

const PRESIGN_TTL = 60 * 60 * 24; // 24 hours

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new export job record (queued). The caller should then trigger
 * processExportJob() asynchronously (via NATS or in-process).
 */
export async function createExportJob(input: CreateExportJobInput) {
  return prisma.exportJob.create({
    data: {
      tenantId: input.tenantId,
      requestedBy: input.requestedBy,
      exportType: input.exportType as never,
      format: input.format as never,
      filters: (input.filters ?? {}) as Record<string, never>,
      dateRangeStart: input.dateRangeStart,
      dateRangeEnd: input.dateRangeEnd,
      deliveryMethod: (input.deliveryMethod ?? 'download') as never,
      deliveryTarget: input.deliveryTarget,
    },
  });
}

/**
 * Core processor: fetches data, serialises to the requested format,
 * uploads to S3, and updates the ExportJob record.
 */
export async function processExportJob(jobId: string, token: string): Promise<void> {
  const t0 = Date.now();

  await prisma.exportJob.update({
    where: { id: jobId },
    data: { status: 'processing' as never, startedAt: new Date() },
  });

  try {
    const job = await prisma.exportJob.findUniqueOrThrow({ where: { id: jobId } });

    // 1. Fetch rows from upstream services
    const rows = await fetchDataForExport(
      job.exportType,
      job.tenantId,
      job.filters as Record<string, unknown>,
      job.dateRangeStart,
      job.dateRangeEnd,
      token
    );

    // 2. Serialise
    const { buffer, contentType, extension } = await serialise(rows, job.format);

    // 3. Upload to S3
    const s3Key = `exports/${job.tenantId}/${job.id}.${extension}`;
    await s3.send(
      new PutObjectCommand({
        Bucket: config.s3Bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: contentType,
        ServerSideEncryption: 'AES256',
        Metadata: {
          tenantId: job.tenantId,
          exportType: job.exportType,
          requestedBy: job.requestedBy,
        },
      })
    );

    // 4. Presigned URL
    const downloadUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: config.s3Bucket, Key: s3Key }),
      { expiresIn: PRESIGN_TTL }
    );

    const expiresAt = new Date(Date.now() + PRESIGN_TTL * 1000);

    // 5. Update job
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'completed' as never,
        s3Key,
        downloadUrl,
        expiresAt,
        rowCount: rows.length,
        fileSizeBytes: buffer.byteLength,
        completedAt: new Date(),
      },
    });

    // 6. Optional email delivery
    if (job.deliveryMethod === 'email' && job.deliveryTarget) {
      await sendExportEmail(job.deliveryTarget, downloadUrl, job.exportType, expiresAt);
    }

    console.log(
      `Export ${jobId} completed — ${rows.length} rows, ${buffer.byteLength} bytes, ${Date.now() - t0}ms`
    );
  } catch (err) {
    console.error(`Export ${jobId} failed:`, err);
    await prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed' as never,
        errorMessage: (err as Error).message,
        completedAt: new Date(),
      },
    });
  }
}

/**
 * List export jobs for a tenant.
 */
export async function listExportJobs(
  tenantId: string,
  opts: { limit?: number; offset?: number; status?: string } = {}
) {
  const { limit = 50, offset = 0, status } = opts;
  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;

  const [jobs, total] = await Promise.all([
    prisma.exportJob.findMany({
      where: where as never,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.exportJob.count({ where: where as never }),
  ]);

  return { jobs, total, limit, offset };
}

/**
 * Get a single export job by ID (scoped to tenant).
 */
export async function getExportJob(tenantId: string, jobId: string) {
  return prisma.exportJob.findFirst({
    where: { id: jobId, tenantId },
  });
}

/**
 * Refresh presigned URL if expired.
 */
export async function refreshDownloadUrl(tenantId: string, jobId: string) {
  const job = await prisma.exportJob.findFirst({
    where: { id: jobId, tenantId, status: 'completed' as never },
  });
  if (!job || !job.s3Key) return null;

  const downloadUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.s3Bucket, Key: job.s3Key }),
    { expiresIn: PRESIGN_TTL }
  );
  const expiresAt = new Date(Date.now() + PRESIGN_TTL * 1000);

  await prisma.exportJob.update({
    where: { id: jobId },
    data: { downloadUrl, expiresAt },
  });

  return { downloadUrl, expiresAt };
}

/**
 * Delete an export job and its S3 object.
 */
export async function deleteExportJob(tenantId: string, jobId: string) {
  const job = await prisma.exportJob.findFirst({
    where: { id: jobId, tenantId },
  });
  if (!job) return false;

  // Best-effort S3 deletion
  if (job.s3Key) {
    try {
      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      await s3.send(new DeleteObjectCommand({ Bucket: config.s3Bucket, Key: job.s3Key }));
    } catch {
      /* log but don't block */
    }
  }

  await prisma.exportJob.delete({ where: { id: jobId } });
  return true;
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA FETCHERS
// ══════════════════════════════════════════════════════════════════════════════

async function fetchJson<T>(url: string, token: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      console.error(`Export fetch failed: ${url} → ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error(`Export fetch error: ${url}`, err);
    return null;
  }
}

/**
 * Route data fetch to the correct service client based on exportType.
 */
async function fetchDataForExport(
  exportType: string,
  tenantId: string,
  filters: Record<string, unknown>,
  dateStart: Date | null,
  dateEnd: Date | null,
  token: string
): Promise<ExportRow[]> {
  const qs = new URLSearchParams({ tenantId });
  if (dateStart) qs.set('startDate', dateStart.toISOString());
  if (dateEnd) qs.set('endDate', dateEnd.toISOString());

  // Forward filter arrays as repeated params
  for (const [k, v] of Object.entries(filters)) {
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, String(item)));
    else if (v != null) qs.set(k, String(v));
  }

  switch (exportType) {
    case 'student_roster': {
      const data = await fetchJson<{ students: ExportRow[] }>(
        `${config.services.profile}/profiles?${qs}`,
        token
      );
      return data?.students ?? [];
    }
    case 'assessment_results': {
      const data = await fetchJson<{ results: ExportRow[] }>(
        `${config.services.assessment}/results?${qs}`,
        token
      );
      return data?.results ?? [];
    }
    case 'session_activity': {
      const data = await fetchJson<{ sessions: ExportRow[] }>(
        `${config.services.session}/sessions?${qs}`,
        token
      );
      return data?.sessions ?? [];
    }
    case 'skill_mastery': {
      const data = await fetchJson<{ skills: ExportRow[] }>(
        `${config.services.learnerModel}/mastery?${qs}`,
        token
      );
      return data?.skills ?? [];
    }
    case 'engagement_metrics': {
      const data = await fetchJson<{ metrics: ExportRow[] }>(
        `${config.services.analytics}/engagement?${qs}`,
        token
      );
      return data?.metrics ?? [];
    }
    case 'gradebook': {
      const data = await fetchJson<{ grades: ExportRow[] }>(
        `${config.services.analytics}/gradebook?${qs}`,
        token
      );
      return data?.grades ?? [];
    }
    case 'iep_progress': {
      const data = await fetchJson<{ progress: ExportRow[] }>(
        `${config.services.goal}/iep-progress?${qs}`,
        token
      );
      return data?.progress ?? [];
    }
    default:
      throw new Error(`Unknown export type: ${exportType}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SERIALISERS
// ══════════════════════════════════════════════════════════════════════════════

async function serialise(
  rows: ExportRow[],
  format: string
): Promise<{ buffer: Buffer; contentType: string; extension: string }> {
  switch (format) {
    case 'csv':
      return serialiseCsv(rows);
    case 'excel':
      return serialiseXlsx(rows);
    case 'json':
      return serialiseJson(rows);
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

function serialiseCsv(rows: ExportRow[]) {
  if (rows.length === 0) {
    return { buffer: Buffer.from(''), contentType: 'text/csv', extension: 'csv' };
  }
  const columns = Object.keys(rows[0]);
  const csv = stringify(rows, { header: true, columns });
  return { buffer: Buffer.from(csv), contentType: 'text/csv', extension: 'csv' };
}

async function serialiseXlsx(rows: ExportRow[]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Export');

  if (rows.length > 0) {
    const columns = Object.keys(rows[0]);
    sheet.columns = columns.map((key) => ({ header: key, key, width: 20 }));
    for (const row of rows) {
      sheet.addRow(row);
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(arrayBuffer),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  };
}

function serialiseJson(rows: ExportRow[]) {
  const json = JSON.stringify({ data: rows, exportedAt: new Date().toISOString() }, null, 2);
  return { buffer: Buffer.from(json), contentType: 'application/json', extension: 'json' };
}

// ══════════════════════════════════════════════════════════════════════════════
// EMAIL DELIVERY
// ══════════════════════════════════════════════════════════════════════════════

async function sendExportEmail(
  recipient: string,
  downloadUrl: string,
  exportType: string,
  expiresAt: Date
) {
  try {
    await fetch(`${config.services.notify}/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: recipient,
        subject: `Your ${exportType.replace(/_/g, ' ')} export is ready`,
        html: `
          <p>Your data export is ready for download.</p>
          <p><a href="${downloadUrl}">Download Export</a></p>
          <p><em>This link expires on ${expiresAt.toISOString()}.</em></p>
        `,
      }),
    });
  } catch (err) {
    console.error('Export email delivery failed:', err);
  }
}
