/**
 * GDPR Data Export Service
 *
 * Implements GDPR Article 20 "Right to Data Portability".
 * Supports JSON, CSV, XML export formats with optional
 * AES-256-GCM encryption for at-rest protection.
 *
 * Ported from services/dsr-svc during Sprint-2 consolidation.
 */

import { createCipheriv, createHash, randomBytes } from 'crypto';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { Readable, Transform } from 'stream';

import type { Pool } from 'pg';
import type { FastifyRequest, FastifyReply } from 'fastify';

// ════════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════════

export type ExportFormat = 'json' | 'csv' | 'xml';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface DataExportRequest {
  id: string;
  tenantId: string;
  userId: string;
  learnerId: string;
  format: ExportFormat;
  categories: DataCategory[];
  includeMetadata: boolean;
  encryptionKey?: string;
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  downloadUrl?: string;
  fileSize?: number;
  checksum?: string;
}

export type DataCategory =
  | 'profile'
  | 'academic'
  | 'assessments'
  | 'learning_sessions'
  | 'ai_interactions'
  | 'consent_records'
  | 'messages'
  | 'notifications'
  | 'goals'
  | 'analytics'
  | 'gamification'
  | 'recommendations'
  | 'parent_data';

interface DataSource {
  category: DataCategory;
  service: string;
  endpoint: string;
  description: string;
}

export interface ExportedData {
  category: DataCategory;
  data: unknown[];
  count: number;
  exportedAt: string;
}

interface CategoryData {
  category: DataCategory;
  records: unknown[];
  metadata?: {
    totalRecords: number;
    filteredRecords: number;
    dateRange?: { from: string; to: string };
  };
}

interface ExportMetadata {
  exportId: string;
  tenantId: string;
  learnerId: string;
  format: ExportFormat;
  categories: DataCategory[];
  generatedAt: string;
  dataRetentionNotice: string;
  gdprArticle20Notice: string;
  totalCategories: number;
  totalRecords: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// DATA SOURCE REGISTRY
// ════════════════════════════════════════════════════════════════════════════════

const DATA_SOURCES: DataSource[] = [
  { category: 'profile', service: 'profile-svc', endpoint: '/internal/export-learner', description: 'Learner profile and demographic data' },
  { category: 'academic', service: 'learner-model-svc', endpoint: '/internal/export-learner', description: 'Academic records and competency data' },
  { category: 'assessments', service: 'assessment-svc', endpoint: '/internal/export-learner', description: 'Assessment results and responses' },
  { category: 'learning_sessions', service: 'session-svc', endpoint: '/internal/export-learner', description: 'Learning session history' },
  { category: 'ai_interactions', service: 'ai-orchestrator', endpoint: '/internal/export-learner', description: 'AI tutoring interaction logs' },
  { category: 'consent_records', service: 'compliance-svc', endpoint: '/internal/export-learner', description: 'Consent and privacy records' },
  { category: 'goals', service: 'goal-svc', endpoint: '/internal/export-learner', description: 'Learning goals and milestones' },
  { category: 'gamification', service: 'gamification-svc', endpoint: '/internal/export-learner', description: 'Points, badges, achievements' },
];

// ════════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════════

function getServiceEndpoint(service: string): { host: string; port: number } {
  const envKey = service.toUpperCase().replace(/-/g, '_');
  const host = process.env[`${envKey}_HOST`] || 'localhost';
  const port = Number.parseInt(process.env[`${envKey}_PORT`] || '3000', 10);
  return { host, port };
}

function getDataSourcesForCategories(categories: DataCategory[]): DataSource[] {
  if (categories.length === 0) return DATA_SOURCES;
  return DATA_SOURCES.filter((ds) => categories.includes(ds.category));
}

// ════════════════════════════════════════════════════════════════════════════════
// FORMAT CONVERTERS
// ════════════════════════════════════════════════════════════════════════════════

function toJson(metadata: ExportMetadata, categories: CategoryData[]): string {
  return JSON.stringify(
    {
      metadata,
      data: categories.reduce(
        (acc, cat) => {
          acc[cat.category] = {
            records: cat.records,
            metadata: cat.metadata,
          };
          return acc;
        },
        {} as Record<string, unknown>,
      ),
    },
    null,
    2,
  );
}

function toCsv(categories: CategoryData[]): string {
  const lines: string[] = [];

  for (const cat of categories) {
    lines.push(`# Category: ${cat.category}`);
    lines.push(`# Records: ${cat.records.length}`);

    if (cat.records.length > 0) {
      const firstRecord = cat.records[0] as Record<string, unknown>;
      const headers = Object.keys(firstRecord);
      lines.push(headers.join(','));

      for (const record of cat.records) {
        const row = headers.map((h) => {
          const val = (record as Record<string, unknown>)[h];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Escape CSV values
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        lines.push(row.join(','));
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}

function toXml(metadata: ExportMetadata, categories: CategoryData[]): string {
  const escapeXml = (str: string): string =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const indent = (level: number) => '  '.repeat(level);

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<gdpr-export>\n';
  xml += `${indent(1)}<metadata>\n`;
  xml += `${indent(2)}<exportId>${escapeXml(metadata.exportId)}</exportId>\n`;
  xml += `${indent(2)}<generatedAt>${escapeXml(metadata.generatedAt)}</generatedAt>\n`;
  xml += `${indent(2)}<format>${escapeXml(metadata.format)}</format>\n`;
  xml += `${indent(2)}<totalRecords>${metadata.totalRecords}</totalRecords>\n`;
  xml += `${indent(1)}</metadata>\n`;

  for (const cat of categories) {
    xml += `${indent(1)}<category name="${escapeXml(cat.category)}">\n`;
    for (const record of cat.records) {
      xml += `${indent(2)}<record>\n`;
      for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
        const strValue = value === null || value === undefined ? '' : String(value);
        xml += `${indent(3)}<${escapeXml(key)}>${escapeXml(strValue)}</${escapeXml(key)}>\n`;
      }
      xml += `${indent(2)}</record>\n`;
    }
    xml += `${indent(1)}</category>\n`;
  }

  xml += '</gdpr-export>\n';
  return xml;
}

// ════════════════════════════════════════════════════════════════════════════════
// ENCRYPTION
// ════════════════════════════════════════════════════════════════════════════════

function encryptExport(data: string, encryptionKey: string): Buffer {
  const key = createHash('sha256').update(encryptionKey).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]);
}

function calculateChecksum(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// ════════════════════════════════════════════════════════════════════════════════
// STREAMING
// ════════════════════════════════════════════════════════════════════════════════

function createJsonStream(categories: CategoryData[]): Readable {
  let index = 0;

  return new Readable({
    read() {
      if (index === 0) {
        this.push('{"data":[');
      }

      if (index < categories.length) {
        const prefix = index === 0 ? '' : ',';
        this.push(prefix + JSON.stringify(categories[index]));
        index++;
      } else {
        this.push(']}');
        this.push(null);
      }
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════════
// EXPORT PROCESSING
// ════════════════════════════════════════════════════════════════════════════════

async function processExport(
  pool: Pool,
  exportRequest: DataExportRequest,
): Promise<{ content: string; checksum: string; fileSize: number }> {
  const dataSources = getDataSourcesForCategories(exportRequest.categories);
  const allCategoryData: CategoryData[] = [];

  for (const ds of dataSources) {
    try {
      const endpoint = getServiceEndpoint(ds.service);
      const url = `http://${endpoint.host}:${endpoint.port}${ds.endpoint}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Request': 'true',
          'X-Tenant-ID': exportRequest.tenantId,
        },
        body: JSON.stringify({
          tenantId: exportRequest.tenantId,
          learnerId: exportRequest.learnerId,
        }),
      });

      if (response.ok) {
        const body = (await response.json()) as { records?: unknown[]; metadata?: CategoryData['metadata'] };
        allCategoryData.push({
          category: ds.category,
          records: body.records ?? [],
          metadata: body.metadata,
        });
      } else {
        console.warn(`Export data fetch failed for ${ds.service}: HTTP ${response.status}`);
        allCategoryData.push({
          category: ds.category,
          records: [],
          metadata: { totalRecords: 0, filteredRecords: 0 },
        });
      }
    } catch (error) {
      console.warn(`Export data fetch error for ${ds.service}:`, error);
      allCategoryData.push({
        category: ds.category,
        records: [],
        metadata: { totalRecords: 0, filteredRecords: 0 },
      });
    }
  }

  const totalRecords = allCategoryData.reduce((sum, cat) => sum + cat.records.length, 0);

  const metadata: ExportMetadata = {
    exportId: exportRequest.id,
    tenantId: exportRequest.tenantId,
    learnerId: exportRequest.learnerId,
    format: exportRequest.format,
    categories: exportRequest.categories,
    generatedAt: new Date().toISOString(),
    dataRetentionNotice:
      'This export contains personal data subject to GDPR/FERPA/COPPA regulations. Handle according to your data protection obligations.',
    gdprArticle20Notice:
      'This data is provided in a structured, commonly used, machine-readable format per GDPR Article 20.',
    totalCategories: allCategoryData.length,
    totalRecords,
  };

  let content: string;

  switch (exportRequest.format) {
    case 'csv':
      content = toCsv(allCategoryData);
      break;
    case 'xml':
      content = toXml(metadata, allCategoryData);
      break;
    case 'json':
    default:
      content = toJson(metadata, allCategoryData);
      break;
  }

  if (exportRequest.encryptionKey) {
    const encrypted = encryptExport(content, exportRequest.encryptionKey);
    return {
      content: encrypted.toString('base64'),
      checksum: calculateChecksum(encrypted),
      fileSize: encrypted.length,
    };
  }

  return {
    content,
    checksum: calculateChecksum(content),
    fileSize: Buffer.byteLength(content),
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════════════════════════════════════════════

function validateExportRequest(body: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
  parsed?: {
    learnerId: string;
    format: ExportFormat;
    categories: DataCategory[];
    includeMetadata: boolean;
    encryptionKey?: string;
  };
} {
  const errors: string[] = [];

  if (!body.learnerId || typeof body.learnerId !== 'string') {
    errors.push('learnerId is required and must be a string');
  }

  const validFormats: ExportFormat[] = ['json', 'csv', 'xml'];
  const format = (body.format as ExportFormat) || 'json';
  if (!validFormats.includes(format)) {
    errors.push(`format must be one of: ${validFormats.join(', ')}`);
  }

  const validCategories: DataCategory[] = [
    'profile', 'academic', 'assessments', 'learning_sessions',
    'ai_interactions', 'consent_records', 'messages', 'notifications',
    'goals', 'analytics', 'gamification', 'recommendations', 'parent_data',
  ];

  const categories =
    Array.isArray(body.categories) && body.categories.length > 0
      ? body.categories.filter((c: unknown): c is DataCategory =>
          validCategories.includes(c as DataCategory),
        )
      : validCategories;

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    parsed: {
      learnerId: body.learnerId as string,
      format,
      categories,
      includeMetadata: body.includeMetadata !== false,
      encryptionKey: body.encryptionKey as string | undefined,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER FACTORY
// ════════════════════════════════════════════════════════════════════════════════

export function createExportHandlers(pool: Pool) {
  return {
    async createExport(request: FastifyRequest, reply: FastifyReply) {
      const body = request.body as Record<string, unknown>;
      const auth = (request as any).auth as { tenantId: string; userId: string };
      const validation = validateExportRequest(body);

      if (!validation.valid || !validation.parsed) {
        return reply.code(400).send({ error: 'Invalid request', details: validation.errors });
      }

      const { learnerId, format, categories, includeMetadata, encryptionKey } = validation.parsed;
      const exportId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const result = await pool.query(
        `INSERT INTO data_exports (id, tenant_id, user_id, learner_id, format, categories, include_metadata, status, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), NOW() + INTERVAL '7 days')
         RETURNING *`,
        [exportId, auth.tenantId, auth.userId, learnerId, format, JSON.stringify(categories), includeMetadata],
      );

      return reply.code(202).send({
        id: result.rows[0].id,
        status: 'pending',
        message: 'Export request submitted',
      });
    },

    async getExport(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const auth = (request as any).auth as { tenantId: string };

      const result = await pool.query(
        `SELECT * FROM data_exports WHERE id = $1 AND tenant_id = $2`,
        [id, auth.tenantId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Export not found' });
      }

      return reply.send(result.rows[0]);
    },

    async listExports(request: FastifyRequest, reply: FastifyReply) {
      const auth = (request as any).auth as { tenantId: string; userId: string };
      const query = request.query as { limit?: string; offset?: string };
      const limit = Math.min(Number(query.limit) || 20, 100);
      const offset = Number(query.offset) || 0;

      const result = await pool.query(
        `SELECT * FROM data_exports WHERE tenant_id = $1 AND user_id = $2
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [auth.tenantId, auth.userId, limit, offset],
      );

      return reply.send({ exports: result.rows, limit, offset });
    },

    async downloadExport(request: FastifyRequest, reply: FastifyReply) {
      const { id } = request.params as { id: string };
      const auth = (request as any).auth as { tenantId: string };

      const result = await pool.query(
        `SELECT * FROM data_exports WHERE id = $1 AND tenant_id = $2 AND status = 'completed'`,
        [id, auth.tenantId],
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Export not found or not completed' });
      }

      const exportRow = result.rows[0];
      if (new Date(exportRow.expires_at) < new Date()) {
        return reply.code(410).send({ error: 'Export has expired' });
      }

      return reply.send({
        downloadUrl: exportRow.download_url,
        checksum: exportRow.checksum,
        fileSize: exportRow.file_size,
        expiresAt: exportRow.expires_at,
      });
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// NAMESPACE EXPORT
// ════════════════════════════════════════════════════════════════════════════════

export const GdprExporter = {
  processExport,
  validateExportRequest,
  createExportHandlers,
  encryptExport,
  calculateChecksum,
  toJson,
  toCsv,
  toXml,
  createJsonStream,
  getDataSourcesForCategories,
  DATA_SOURCES,
} as const;

export default GdprExporter;
