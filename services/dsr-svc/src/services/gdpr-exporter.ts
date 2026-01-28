/**
 * GDPR Data Export Service
 *
 * Handles data subject access requests (DSAR) and data portability exports
 * in compliance with GDPR Art. 15 and Art. 20, LGPD Art. 18, CCPA §1798.100.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash, createCipheriv, randomBytes } from 'crypto';
import { Transform, PassThrough } from 'stream';

import type { Pool } from 'pg';
import type { FastifyRequest, FastifyReply } from 'fastify';

/* ==========================================================================
   Type Definitions
   ========================================================================== */

export type ExportFormat = 'JSON' | 'CSV' | 'PDF' | 'XML';
export type ExportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';

export interface DataExportRequest {
  id: string;
  tenantId: string;
  dsrRequestId?: string;

  // Subject
  subjectId: string;
  subjectType: 'LEARNER' | 'PARENT' | 'TEACHER' | 'ADMIN';

  // Export configuration
  format: ExportFormat;
  categories: DataCategory[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  includeMetadata: boolean;
  encryptExport: boolean;
  encryptionKey?: string;

  // Processing
  status: ExportStatus;
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  failureReason?: string;

  // Output
  outputPath?: string;
  outputSize?: number;
  checksum?: string;
  downloadUrl?: string;
  downloadExpiresAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export type DataCategory =
  | 'PROFILE'
  | 'IDENTITY'
  | 'CONTACT'
  | 'EDUCATION'
  | 'LEARNING_PROGRESS'
  | 'ASSESSMENT_DATA'
  | 'BEHAVIORAL'
  | 'COMMUNICATIONS'
  | 'PAYMENT'
  | 'TECHNICAL'
  | 'AI_INTERACTIONS'
  | 'CONSENT'
  | 'ALL';

export interface DataSource {
  name: string;
  service: string;
  endpoint: string;
  categories: DataCategory[];
  description: string;
  retentionDays: number;
}

export interface ExportedData {
  exportId: string;
  subjectId: string;
  exportedAt: Date;
  format: ExportFormat;
  categories: DataCategory[];
  data: Record<string, CategoryData>;
  metadata: ExportMetadata;
}

export interface CategoryData {
  category: DataCategory;
  recordCount: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  data: Record<string, unknown>[];
}

export interface ExportMetadata {
  version: '1.0';
  regulation: string;
  controller: {
    name: string;
    contact: string;
    dpo?: string;
  };
  processingPurposes: string[];
  legalBases: string[];
  recipients: string[];
  retentionPeriods: Record<string, string>;
  rights: string[];
}

/* ==========================================================================
   Data Sources Registry
   ========================================================================== */

const DATA_SOURCES: DataSource[] = [
  {
    name: 'User Profile',
    service: 'user-svc',
    endpoint: '/api/users/{userId}/export',
    categories: ['PROFILE', 'IDENTITY', 'CONTACT'],
    description: 'Basic profile information, identity data, contact details',
    retentionDays: 365 * 3, // 3 years
  },
  {
    name: 'Learning Progress',
    service: 'learning-svc',
    endpoint: '/api/learners/{userId}/export',
    categories: ['EDUCATION', 'LEARNING_PROGRESS', 'ASSESSMENT_DATA'],
    description: 'Course enrollments, lesson completions, skill mastery, assessments',
    retentionDays: 365 * 7, // 7 years (educational records)
  },
  {
    name: 'AI Interactions',
    service: 'ai-orchestrator',
    endpoint: '/api/interactions/{userId}/export',
    categories: ['AI_INTERACTIONS'],
    description: 'Tutor conversations, homework help sessions, AI recommendations',
    retentionDays: 365 * 2, // 2 years
  },
  {
    name: 'Behavioral Analytics',
    service: 'analytics-svc',
    endpoint: '/api/analytics/users/{userId}/export',
    categories: ['BEHAVIORAL'],
    description: 'Engagement metrics, focus patterns, learning preferences',
    retentionDays: 365, // 1 year
  },
  {
    name: 'Communications',
    service: 'communication-svc',
    endpoint: '/api/communications/{userId}/export',
    categories: ['COMMUNICATIONS'],
    description: 'Messages, notifications, parent-teacher communications',
    retentionDays: 365 * 3, // 3 years
  },
  {
    name: 'Payment History',
    service: 'billing-svc',
    endpoint: '/api/billing/users/{userId}/export',
    categories: ['PAYMENT'],
    description: 'Subscriptions, invoices, payment methods (masked)',
    retentionDays: 365 * 7, // 7 years (financial records)
  },
  {
    name: 'Technical Data',
    service: 'session-svc',
    endpoint: '/api/sessions/{userId}/export',
    categories: ['TECHNICAL'],
    description: 'Login history, devices, IP addresses, session data',
    retentionDays: 90, // 90 days
  },
  {
    name: 'Consent Records',
    service: 'consent-svc',
    endpoint: '/api/consent/{userId}/export',
    categories: ['CONSENT'],
    description: 'Consent history, privacy preferences, opt-out records',
    retentionDays: 365 * 5, // 5 years (compliance records)
  },
];

/**
 * Get data sources for requested categories
 */
export function getDataSourcesForCategories(categories: DataCategory[]): DataSource[] {
  if (categories.includes('ALL')) {
    return DATA_SOURCES;
  }

  return DATA_SOURCES.filter((source) =>
    source.categories.some((cat) => categories.includes(cat))
  );
}

/* ==========================================================================
   Export Processing
   ========================================================================== */

/**
 * Collect data from a single source
 */
async function collectFromSource(
  source: DataSource,
  userId: string,
  options: {
    dateRange?: { from: Date; to: Date };
    categories: DataCategory[];
  }
): Promise<CategoryData[]> {
  // In production, this would make HTTP calls to the service
  // For now, return sample structure

  const categoryData: CategoryData[] = [];

  for (const category of source.categories) {
    if (!options.categories.includes(category) && !options.categories.includes('ALL')) {
      continue;
    }

    categoryData.push({
      category,
      recordCount: 0,
      dateRange: {
        earliest: options.dateRange?.from || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
        latest: options.dateRange?.to || new Date(),
      },
      data: [], // Would be populated from service response
    });
  }

  return categoryData;
}

/**
 * Generate export metadata for compliance
 */
function generateMetadata(
  tenantId: string,
  categories: DataCategory[],
  regulation: string = 'GDPR'
): ExportMetadata {
  return {
    version: '1.0',
    regulation,
    controller: {
      name: 'AIVO Learning Platform',
      contact: 'privacy@aivo.com',
      dpo: 'dpo@aivo.com',
    },
    processingPurposes: [
      'Educational service provision',
      'Learning personalization',
      'Progress tracking and reporting',
      'Parent/guardian communication',
      'Platform improvement',
    ],
    legalBases: [
      'Contract performance (Art. 6(1)(b) GDPR)',
      'Legitimate interests (Art. 6(1)(f) GDPR)',
      'Consent where required (Art. 6(1)(a) GDPR)',
    ],
    recipients: [
      'Cloud infrastructure providers (under DPA)',
      'Payment processors (for billing data)',
      'Analytics providers (anonymized data only)',
    ],
    retentionPeriods: {
      PROFILE: '3 years after account closure',
      EDUCATION: '7 years (educational records requirement)',
      PAYMENT: '7 years (financial records requirement)',
      TECHNICAL: '90 days',
      AI_INTERACTIONS: '2 years',
      BEHAVIORAL: '1 year',
      COMMUNICATIONS: '3 years',
      CONSENT: '5 years (compliance records)',
    },
    rights: [
      'Right to access (Art. 15)',
      'Right to rectification (Art. 16)',
      'Right to erasure (Art. 17)',
      'Right to restriction (Art. 18)',
      'Right to data portability (Art. 20)',
      'Right to object (Art. 21)',
    ],
  };
}

/**
 * Process complete data export
 */
export async function processExport(
  request: DataExportRequest,
  progressCallback?: (progress: number) => void
): Promise<ExportedData> {
  const sources = getDataSourcesForCategories(request.categories);
  const allCategoryData: Record<string, CategoryData> = {};

  let processed = 0;
  const total = sources.length;

  for (const source of sources) {
    const categoryData = await collectFromSource(source, request.subjectId, {
      dateRange: request.dateRange,
      categories: request.categories,
    });

    for (const cd of categoryData) {
      allCategoryData[cd.category] = cd;
    }

    processed++;
    if (progressCallback) {
      progressCallback(Math.round((processed / total) * 100));
    }
  }

  return {
    exportId: request.id,
    subjectId: request.subjectId,
    exportedAt: new Date(),
    format: request.format,
    categories: request.categories,
    data: allCategoryData,
    metadata: generateMetadata(request.tenantId, request.categories),
  };
}

/* ==========================================================================
   Format Converters
   ========================================================================== */

/**
 * Convert export to JSON format
 */
export function toJson(exportData: ExportedData): string {
  return JSON.stringify(exportData, null, 2);
}

/**
 * Convert export to CSV format (zip of CSVs per category)
 */
export function toCsv(exportData: ExportedData): Map<string, string> {
  const csvFiles = new Map<string, string>();

  for (const [category, categoryData] of Object.entries(exportData.data)) {
    if (categoryData.data.length === 0) continue;

    // Get headers from first record
    const headers = Object.keys(categoryData.data[0] || {});
    const rows = [headers.join(',')];

    for (const record of categoryData.data) {
      const values = headers.map((h) => {
        const value = (record as Record<string, unknown>)[h];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      rows.push(values.join(','));
    }

    csvFiles.set(`${category}.csv`, rows.join('\n'));
  }

  // Add metadata CSV
  const metadataRows = [
    'Key,Value',
    `Export ID,${exportData.exportId}`,
    `Subject ID,${exportData.subjectId}`,
    `Exported At,${exportData.exportedAt.toISOString()}`,
    `Format,${exportData.format}`,
    `Categories,${exportData.categories.join('; ')}`,
    `Controller,${exportData.metadata.controller.name}`,
    `DPO Contact,${exportData.metadata.controller.dpo}`,
  ];
  csvFiles.set('_metadata.csv', metadataRows.join('\n'));

  return csvFiles;
}

/**
 * Convert export to XML format
 */
export function toXml(exportData: ExportedData): string {
  const escapeXml = (str: string): string =>
    str.replace(/[<>&'"]/g, (c) => ({
      '<': '&lt;',
      '>': '&gt;',
      '&': '&amp;',
      "'": '&apos;',
      '"': '&quot;',
    }[c] || c));

  const objectToXml = (obj: unknown, indent: number = 0): string => {
    const spaces = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return '';
    }

    if (Array.isArray(obj)) {
      return obj.map((item, i) =>
        `${spaces}<item index="${i}">\n${objectToXml(item, indent + 1)}${spaces}</item>\n`
      ).join('');
    }

    if (typeof obj === 'object') {
      return Object.entries(obj as Record<string, unknown>).map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${spaces}<${key}/>\n`;
        }
        if (typeof value === 'object') {
          return `${spaces}<${key}>\n${objectToXml(value, indent + 1)}${spaces}</${key}>\n`;
        }
        return `${spaces}<${key}>${escapeXml(String(value))}</${key}>\n`;
      }).join('');
    }

    return escapeXml(String(obj));
  };

  return `<?xml version="1.0" encoding="UTF-8"?>
<DataExport>
  <exportId>${exportData.exportId}</exportId>
  <subjectId>${exportData.subjectId}</subjectId>
  <exportedAt>${exportData.exportedAt.toISOString()}</exportedAt>
  <format>${exportData.format}</format>
  <categories>
${exportData.categories.map((c) => `    <category>${c}</category>`).join('\n')}
  </categories>
  <data>
${Object.entries(exportData.data).map(([category, categoryData]) => `
    <${category}>
      <recordCount>${categoryData.recordCount}</recordCount>
      <dateRange>
        <earliest>${categoryData.dateRange.earliest.toISOString()}</earliest>
        <latest>${categoryData.dateRange.latest.toISOString()}</latest>
      </dateRange>
      <records>
${objectToXml(categoryData.data, 4)}      </records>
    </${category}>`).join('\n')}
  </data>
  <metadata>
${objectToXml(exportData.metadata, 2)}  </metadata>
</DataExport>`;
}

/* ==========================================================================
   Encryption
   ========================================================================== */

/**
 * Encrypt export data with AES-256-GCM
 */
export function encryptExport(data: string, passphrase: string): {
  encrypted: Buffer;
  iv: string;
  authTag: string;
  keyDerivation: string;
} {
  // Derive key from passphrase using PBKDF2-like approach
  const salt = randomBytes(16);
  const key = createHash('sha256').update(passphrase + salt.toString('hex')).digest();
  const iv = randomBytes(16);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    keyDerivation: salt.toString('hex'),
  };
}

/**
 * Calculate checksum for export
 */
export function calculateChecksum(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/* ==========================================================================
   Streaming Export
   ========================================================================== */

/**
 * Create a streaming JSON export
 */
export function createJsonStream(exportData: ExportedData): Transform {
  const stream = new PassThrough();

  // Write in chunks to handle large exports
  setImmediate(() => {
    stream.write('{\n');
    stream.write(`  "exportId": "${exportData.exportId}",\n`);
    stream.write(`  "subjectId": "${exportData.subjectId}",\n`);
    stream.write(`  "exportedAt": "${exportData.exportedAt.toISOString()}",\n`);
    stream.write(`  "format": "${exportData.format}",\n`);
    stream.write(`  "categories": ${JSON.stringify(exportData.categories)},\n`);
    stream.write('  "data": {\n');

    const categories = Object.entries(exportData.data);
    categories.forEach(([category, categoryData], index) => {
      stream.write(`    "${category}": ${JSON.stringify(categoryData)}`);
      stream.write(index < categories.length - 1 ? ',\n' : '\n');
    });

    stream.write('  },\n');
    stream.write(`  "metadata": ${JSON.stringify(exportData.metadata, null, 4).split('\n').join('\n  ')}\n`);
    stream.write('}\n');
    stream.end();
  });

  return stream;
}

/* ==========================================================================
   Request Validation
   ========================================================================== */

/**
 * Validate export request
 */
export function validateExportRequest(body: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  request?: Partial<DataExportRequest>;
} {
  const errors: string[] = [];

  // Required fields
  if (!body.subjectId) {
    errors.push('subjectId is required');
  }

  if (!body.format) {
    errors.push('format is required');
  } else if (!['JSON', 'CSV', 'PDF', 'XML'].includes(body.format as string)) {
    errors.push('format must be one of: JSON, CSV, PDF, XML');
  }

  if (!body.categories || !Array.isArray(body.categories)) {
    errors.push('categories array is required');
  }

  // Date range validation
  if (body.dateRange) {
    const dr = body.dateRange as { from?: string; to?: string };
    if (dr.from && isNaN(Date.parse(dr.from))) {
      errors.push('Invalid dateRange.from');
    }
    if (dr.to && isNaN(Date.parse(dr.to))) {
      errors.push('Invalid dateRange.to');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    request: {
      subjectId: body.subjectId as string,
      subjectType: (body.subjectType as DataExportRequest['subjectType']) || 'LEARNER',
      format: body.format as ExportFormat,
      categories: body.categories as DataCategory[],
      dateRange: body.dateRange
        ? {
            from: new Date((body.dateRange as { from: string }).from),
            to: new Date((body.dateRange as { to: string }).to),
          }
        : undefined,
      includeMetadata: body.includeMetadata !== false,
      encryptExport: body.encryptExport === true,
      encryptionKey: body.encryptionKey as string | undefined,
    },
  };
}

/* ==========================================================================
   Route Handlers
   ========================================================================== */

export interface ExportRouteHandlers {
  createExport: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  getExport: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  downloadExport: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  listExports: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  getDataSources: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

/**
 * Create export route handlers with database connection.
 * This factory injects the database pool into the handlers.
 */
export function createExportHandlers(pool: Pool): ExportRouteHandlers {
  return {
    async createExport(request, reply) {
      const body = request.body as Record<string, unknown>;
      const tenantId = (request as any).tenantId || 'default';
      const userId = (request as any).userId || 'system';

      const validation = validateExportRequest(body);
      if (!validation.valid) {
        return reply.status(400).send({ errors: validation.errors });
      }

      const dsrRequestId = body.dsrRequestId as string | undefined;

      // Create the export record in database
      const { rows: exportRows } = await pool.query(
        `INSERT INTO data_exports (
          tenant_id, dsr_request_id, subject_id, subject_type, format,
          categories, date_range_from, date_range_to, include_metadata,
          encrypt_export, status, progress, requested_by_user_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', 0, $11)
        RETURNING id, status, created_at`,
        [
          tenantId,
          dsrRequestId || null,
          validation.request!.subjectId,
          validation.request!.subjectType,
          validation.request!.format,
          JSON.stringify(validation.request!.categories),
          validation.request!.dateRange?.from || null,
          validation.request!.dateRange?.to || null,
          validation.request!.includeMetadata,
          validation.request!.encryptExport,
          userId,
        ]
      );

      const exportRecord = exportRows[0];

      // Queue the export job for async processing
      await pool.query(
        `INSERT INTO export_jobs (export_id, tenant_id, status, priority)
         VALUES ($1, $2, 'QUEUED', 'NORMAL')`,
        [exportRecord.id, tenantId]
      );

      reply.status(202).send({
        id: exportRecord.id,
        status: exportRecord.status,
        message: 'Export request accepted and queued for processing',
        estimatedCompletionTime: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes estimate
      });
    },

    async getExport(request, reply) {
      const { id } = request.params as { id: string };
      const tenantId = (request as any).tenantId || 'default';

      const { rows } = await pool.query(
        `SELECT id, tenant_id, dsr_request_id, subject_id, subject_type, format,
                categories, status, progress, output_path, output_size,
                checksum, download_url, download_expires_at,
                created_at, updated_at, completed_at, failure_reason
         FROM data_exports
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Export not found' });
      }

      const exportRecord = rows[0];
      reply.send({
        id: exportRecord.id,
        status: exportRecord.status,
        progress: exportRecord.progress,
        format: exportRecord.format,
        categories: exportRecord.categories,
        outputSize: exportRecord.output_size,
        downloadUrl: exportRecord.download_url,
        downloadExpiresAt: exportRecord.download_expires_at,
        createdAt: exportRecord.created_at,
        completedAt: exportRecord.completed_at,
        failureReason: exportRecord.failure_reason,
      });
    },

    async downloadExport(request, reply) {
      const { id } = request.params as { id: string };
      const tenantId = (request as any).tenantId || 'default';

      const { rows } = await pool.query(
        `SELECT id, status, output_path, format, download_expires_at
         FROM data_exports
         WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      if (rows.length === 0) {
        return reply.status(404).send({ error: 'Export not found' });
      }

      const exportRecord = rows[0];

      if (exportRecord.status !== 'COMPLETED') {
        return reply.status(400).send({ 
          error: 'Export not ready', 
          status: exportRecord.status 
        });
      }

      if (exportRecord.download_expires_at && new Date(exportRecord.download_expires_at) < new Date()) {
        return reply.status(410).send({ error: 'Export download has expired' });
      }

      if (!exportRecord.output_path || !fs.existsSync(exportRecord.output_path)) {
        return reply.status(404).send({ error: 'Export file not found' });
      }

      // Increment download counter
      await pool.query(
        `UPDATE data_exports SET download_count = COALESCE(download_count, 0) + 1 WHERE id = $1`,
        [id]
      );

      const fileStream = fs.createReadStream(exportRecord.output_path);
      const fileName = path.basename(exportRecord.output_path);

      reply
        .header('Content-Disposition', `attachment; filename="${fileName}"`)
        .header('Content-Type', getContentType(exportRecord.format))
        .send(fileStream);
    },

    async listExports(request, reply) {
      const { subjectId, limit = '50', offset = '0' } = request.query as { 
        subjectId?: string; 
        limit?: string;
        offset?: string;
      };
      const tenantId = (request as any).tenantId || 'default';

      let query = `
        SELECT id, tenant_id, subject_id, subject_type, format, categories,
               status, progress, created_at, completed_at
        FROM data_exports
        WHERE tenant_id = $1
      `;
      const params: (string | number)[] = [tenantId];
      let paramIndex = 2;

      if (subjectId) {
        query += ` AND subject_id = $${paramIndex}`;
        params.push(subjectId);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const { rows } = await pool.query(query, params);

      // Get total count
      let countQuery = `SELECT COUNT(*) FROM data_exports WHERE tenant_id = $1`;
      const countParams: string[] = [tenantId];
      if (subjectId) {
        countQuery += ` AND subject_id = $2`;
        countParams.push(subjectId);
      }
      const { rows: countRows } = await pool.query(countQuery, countParams);

      reply.send({ 
        exports: rows.map(r => ({
          id: r.id,
          subjectId: r.subject_id,
          subjectType: r.subject_type,
          format: r.format,
          categories: r.categories,
          status: r.status,
          progress: r.progress,
          createdAt: r.created_at,
          completedAt: r.completed_at,
        })),
        total: parseInt(countRows[0].count, 10),
      });
    },

    async getDataSources(_request, reply) {
      reply.send({
        sources: DATA_SOURCES.map((s) => ({
          name: s.name,
          categories: s.categories,
          description: s.description,
          retentionDays: s.retentionDays,
        })),
      });
    },
  };
}

function getContentType(format: string): string {
  switch (format) {
    case 'JSON': return 'application/json';
    case 'CSV': return 'text/csv';
    case 'PDF': return 'application/pdf';
    case 'XML': return 'application/xml';
    default: return 'application/octet-stream';
  }
}

// Legacy export handlers (without database - for backward compatibility)
export const exportHandlers: ExportRouteHandlers = {
  async createExport(request, reply) {
    reply.status(501).send({ 
      error: 'Export handlers require database connection. Use createExportHandlers(pool) factory.' 
    });
  },
  async getExport(_request, reply) {
    reply.status(501).send({ error: 'Use createExportHandlers(pool) factory.' });
  },
  async downloadExport(_request, reply) {
    reply.status(501).send({ error: 'Use createExportHandlers(pool) factory.' });
  },
  async listExports(_request, reply) {
    reply.status(501).send({ error: 'Use createExportHandlers(pool) factory.' });
  },
  async getDataSources(_request, reply) {
    reply.send({
      sources: DATA_SOURCES.map((s) => ({
        name: s.name,
        categories: s.categories,
        description: s.description,
        retentionDays: s.retentionDays,
      })),
    });
  },
};

/* ==========================================================================
   Exports
   ========================================================================== */

export const GdprExporter = {
  getDataSourcesForCategories,
  processExport,
  toJson,
  toCsv,
  toXml,
  encryptExport,
  calculateChecksum,
  createJsonStream,
  validateExportRequest,
  generateMetadata,
  exportHandlers,
};

export default GdprExporter;
