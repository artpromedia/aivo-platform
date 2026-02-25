// ════════════════════════════════════════════════════════════════
// S3 Evidence Storage Client
// ════════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { config } from '../config.js';
import type { EvidenceFormat } from '../types.js';

const s3 = new S3Client({
  region: config.s3.region,
  ...(config.s3.endpoint ? { endpoint: config.s3.endpoint, forcePathStyle: true } : {}),
});

const CONTENT_TYPE_MAP: Record<EvidenceFormat, string> = {
  json: 'application/json',
  markdown: 'text/markdown',
  csv: 'text/csv',
  pdf: 'application/pdf',
  sarif: 'application/sarif+json',
};

// ── Helpers ──────────────────────────────────────────────────

/** Build the canonical S3 key for an evidence artifact */
export function buildEvidenceKey(
  controlId: string,
  collectorId: string,
  filename: string,
  date: Date = new Date(),
): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const ts = date.toISOString().replace(/[:.]/g, '-');
  return `evidence/${y}/${m}/${controlId}/${collectorId}/${ts}_${filename}`;
}

/** SHA-256 hex digest */
export function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

// ── Upload ───────────────────────────────────────────────────

export interface UploadResult {
  s3Key: string;
  s3Bucket: string;
  sizeBytes: number;
  sha256: string;
}

export async function uploadEvidence(
  s3Key: string,
  body: string | Buffer,
  format: EvidenceFormat,
  metadata?: Record<string, string>,
): Promise<UploadResult> {
  const buf = typeof body === 'string' ? Buffer.from(body, 'utf-8') : body;
  const hash = sha256(buf);

  const params: PutObjectCommandInput = {
    Bucket: config.s3.bucket,
    Key: s3Key,
    Body: buf,
    ContentType: CONTENT_TYPE_MAP[format] ?? 'application/octet-stream',
    Metadata: {
      ...metadata,
      sha256: hash,
    },
    // Object Lock (Governance mode) — evidence immutability
    ObjectLockMode: 'GOVERNANCE',
    ObjectLockRetainUntilDate: new Date(
      Date.now() + config.immutableLockDays * 86_400_000,
    ),
  };

  await s3.send(new PutObjectCommand(params));

  return {
    s3Key,
    s3Bucket: config.s3.bucket,
    sizeBytes: buf.length,
    sha256: hash,
  };
}

// ── Download ─────────────────────────────────────────────────

export async function downloadEvidence(s3Key: string): Promise<Buffer> {
  const resp = await s3.send(
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: s3Key }),
  );
  const chunks: Uint8Array[] = [];
  for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

// ── Presigned URL ────────────────────────────────────────────

export async function presignedDownloadUrl(
  s3Key: string,
  expiresInSec = 3600,
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: config.s3.bucket, Key: s3Key }),
    { expiresIn: expiresInSec },
  );
}

// ── List ─────────────────────────────────────────────────────

export interface S3ListItem {
  key: string;
  lastModified: Date;
  sizeBytes: number;
}

export async function listEvidence(
  prefix: string,
  maxKeys = 1000,
): Promise<S3ListItem[]> {
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: config.s3.bucket,
      Prefix: prefix,
      MaxKeys: maxKeys,
    }),
  );

  return (result.Contents ?? []).map(obj => ({
    key: obj.Key,
    lastModified: obj.LastModified,
    sizeBytes: obj.Size ?? 0,
  }));
}

// ── Head ─────────────────────────────────────────────────────

export async function evidenceExists(s3Key: string): Promise<boolean> {
  try {
    await s3.send(
      new HeadObjectCommand({ Bucket: config.s3.bucket, Key: s3Key }),
    );
    return true;
  } catch {
    return false;
  }
}
