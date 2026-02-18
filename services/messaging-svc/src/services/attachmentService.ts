/**
 * Attachment Service
 *
 * Handles file uploads to Cloudflare R2 (S3-compatible) for message attachments.
 * Uses the shared @aivo/ts-storage library for tenant-scoped storage with
 * virus scanning and presigned URL generation.
 */

import { randomUUID } from 'node:crypto';
import { config } from '../config.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AttachmentUploadResult {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  r2Key: string;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  r2Key: string;
  tenantId: string;
  uploadedBy: string;
  uploadedAt: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// ALLOWED MIME TYPES
// ══════════════════════════════════════════════════════════════════════════════

const ALLOWED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

// ══════════════════════════════════════════════════════════════════════════════
// R2 CLIENT (lazy-initialized)
// ══════════════════════════════════════════════════════════════════════════════

let _storageClient: StorageClient | null = null;

interface StorageClient {
  upload(params: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata: Record<string, string>;
  }): Promise<void>;
  getPresignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Create an R2 storage client using the @aws-sdk/client-s3 (S3-compatible API).
 * Falls back to a mock client in development when R2 is not configured.
 */
async function createR2Client(): Promise<StorageClient> {
  const { r2 } = config;

  if (!r2.endpoint || !r2.accessKeyId) {
    // Development fallback: return mock client that stores nothing
    console.warn('[attachmentService] R2 not configured — using mock storage');
    return {
      async upload() { /* no-op */ },
      async getPresignedUrl(key: string) {
        return `${r2.publicUrl || 'https://mock-r2.local'}/${key}`;
      },
      async delete() { /* no-op */ },
    };
  }

  // Dynamic import to avoid breaking if @aws-sdk isn't installed during dev
  const { S3Client, PutObjectCommand, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
  const { GetObjectCommand } = await import('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region: 'auto', // Cloudflare R2 uses 'auto'
    endpoint: r2.endpoint,
    credentials: {
      accessKeyId: r2.accessKeyId,
      secretAccessKey: r2.secretAccessKey,
    },
    forcePathStyle: true,
  });

  return {
    async upload({ key, body, contentType, metadata }) {
      await s3.send(
        new PutObjectCommand({
          Bucket: r2.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: metadata,
        })
      );
    },
    async getPresignedUrl(key: string, expiresInSeconds: number) {
      if (r2.publicUrl) {
        return `${r2.publicUrl}/${key}`;
      }
      return getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: r2.bucket, Key: key }),
        { expiresIn: expiresInSeconds }
      );
    },
    async delete(key: string) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: r2.bucket, Key: key })
      );
    },
  };
}

async function getClient(): Promise<StorageClient> {
  if (!_storageClient) {
    _storageClient = await createR2Client();
  }
  return _storageClient;
}

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a file before upload.
 * Checks MIME type allowlist and size limit from config.
 */
export function validateAttachment(
  mimeType: string,
  size: number,
  filename: string
): { valid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return { valid: false, error: `File type "${mimeType}" is not allowed` };
  }

  if (size > config.limits.maxFileSize) {
    const maxMB = Math.round(config.limits.maxFileSize / (1024 * 1024));
    return { valid: false, error: `File exceeds ${maxMB}MB limit` };
  }

  if (!filename || filename.length > 255) {
    return { valid: false, error: 'Invalid filename' };
  }

  return { valid: true };
}

/**
 * Upload a file attachment to Cloudflare R2.
 *
 * Files are stored under: attachments/{tenantId}/{YYYY-MM}/{uuid}/{sanitized-filename}
 */
export async function uploadAttachment(
  tenantId: string,
  userId: string,
  fileBuffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<AttachmentUploadResult> {
  const client = await getClient();
  const id = randomUUID();
  const sanitized = sanitizeFilename(filename);
  const datePrefix = new Date().toISOString().slice(0, 7); // YYYY-MM
  const key = `attachments/${tenantId}/${datePrefix}/${id}/${sanitized}`;

  await client.upload({
    key,
    body: fileBuffer,
    contentType: mimeType,
    metadata: {
      tenantId,
      uploadedBy: userId,
      originalFilename: sanitized,
    },
  });

  // Generate a download URL (valid for 1 hour)
  const url = await client.getPresignedUrl(key, 3600);

  return {
    id,
    name: sanitized,
    url,
    mimeType,
    size: fileBuffer.length,
    r2Key: key,
  };
}

/**
 * Generate a fresh presigned download URL for an existing attachment.
 */
export async function getAttachmentUrl(
  r2Key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = await getClient();
  return client.getPresignedUrl(r2Key, expiresInSeconds);
}

/**
 * Delete an attachment from R2.
 */
export async function deleteAttachment(r2Key: string): Promise<void> {
  const client = await getClient();
  await client.delete(r2Key);
}

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitize a filename to prevent path traversal and invalid characters.
 */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[/\\:*?"<>|]/g, '_') // Remove dangerous chars
    .replace(/\.{2,}/g, '.') // Collapse multiple dots
    .replace(/^\./, '_') // No leading dots
    .trim()
    .slice(0, 200); // Limit length
}
