/**
 * File Storage Routes
 *
 * Tenant-scoped file upload, download, and management with:
 * - Presigned URL generation for client-side uploads/downloads
 * - Virus scanning integration
 * - Role-based access control
 * - Soft delete with lifecycle management
 */

import {
  StorageService,
  createVirusScanner,
  FileAccessControl,
  createAccessContext,
  type UploadOptions,
  type FileCategory as StorageFileCategory,
} from '@aivo/ts-storage';
import multipart from '@fastify/multipart';
import { type FileCategory, type VirusScanStatus } from '@prisma/client';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

// Build virus scanner config without undefined optional properties
const virusScannerConfig: Parameters<typeof createVirusScanner>[0] = {
  provider: (process.env.VIRUS_SCANNER_PROVIDER as 'clamav' | 'virustotal' | 'mock') ?? 'mock',
  skipInDev: process.env.NODE_ENV === 'development',
};
if (process.env.CLAMAV_HOST) {
  virusScannerConfig.clamavHost = process.env.CLAMAV_HOST;
}
if (process.env.CLAMAV_PORT) {
  virusScannerConfig.clamavPort = Number.parseInt(process.env.CLAMAV_PORT, 10);
}
if (process.env.VIRUSTOTAL_API_KEY) {
  virusScannerConfig.virustotalApiKey = process.env.VIRUSTOTAL_API_KEY;
}

const virusScanner = createVirusScanner(virusScannerConfig);

// Build storage config without undefined optional properties
const storageConfig: Parameters<typeof StorageService>[0] = {
  bucket: process.env.S3_BUCKET ?? 'aivo-files',
  region: process.env.S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
};
if (process.env.S3_ENDPOINT) {
  storageConfig.endpoint = process.env.S3_ENDPOINT;
}
if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  storageConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  };
}

const storageService = new StorageService(storageConfig, virusScanner);

const accessControl = new FileAccessControl();

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const FileCategoryEnum = z.enum([
  'IEP_DOCUMENT',
  'HOMEWORK_IMAGE',
  'ASSESSMENT_AUDIO',
  'ASSESSMENT_VIDEO',
  'AVATAR_IMAGE',
  'EXPORTED_REPORT',
  'ATTACHMENT',
  'OTHER',
]);

const GetPresignedUploadUrlSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  category: FileCategoryEnum,
  contentLength: z
    .number()
    .int()
    .positive()
    .max(100 * 1024 * 1024), // Max 100MB
  metadata: z.record(z.string()).optional(),
});

const GetPresignedDownloadUrlSchema = z.object({
  expiresInSeconds: z.number().int().min(60).max(86400).optional(), // 1 min to 24 hours
  disposition: z.enum(['inline', 'attachment']).optional(),
});

const ListFilesQuerySchema = z.object({
  category: FileCategoryEnum.optional(),
  ownerId: z.string().uuid().optional(),
  includeDeleted: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const FinalizeUploadSchema = z.object({
  s3Key: z.string().min(1),
  filename: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(100),
  category: FileCategoryEnum,
  metadata: z.record(z.string()).optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  roles?: string[];
  role?: string;
}

function getUserFromRequest(request: FastifyRequest): JwtUser | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = (request as any).user;
  if (!user || typeof user.sub !== 'string') return null;
  return user as JwtUser;
}

function getUserTenantId(user: JwtUser): string | undefined {
  return user.tenantId ?? user.tenant_id;
}

function getUserRoles(user: JwtUser): string[] {
  if (user.roles && Array.isArray(user.roles)) {
    return user.roles;
  }
  if (user.role) {
    return [user.role];
  }
  return [];
}

function mapToPrismaCategory(category: z.infer<typeof FileCategoryEnum>): FileCategory {
  return category as FileCategory;
}

function mapToStorageCategory(category: z.infer<typeof FileCategoryEnum>): StorageFileCategory {
  return category as StorageFileCategory;
}

function mapPrismaToStoredFile(file: {
  id: string;
  tenantId: string;
  ownerId: string;
  ownerType: string;
  category: string;
  filename: string;
  mimeType: string;
  sizeBytes: bigint;
  s3Bucket: string;
  s3Key: string;
  virusScanStatus: string;
  virusScannedAt: Date | null;
  virusScanResult: unknown;
  isDeleted: boolean;
  metadataJson: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: file.id,
    tenantId: file.tenantId,
    ownerId: file.ownerId,
    ownerType: file.ownerType as 'user' | 'system' | 'tenant',
    category: file.category as StorageFileCategory,
    filename: file.filename,
    mimeType: file.mimeType,
    sizeBytes: Number(file.sizeBytes),
    s3Bucket: file.s3Bucket,
    s3Key: file.s3Key,
    virusScanStatus: file.virusScanStatus as
      | 'PENDING'
      | 'SCANNING'
      | 'CLEAN'
      | 'INFECTED'
      | 'ERROR',
    virusScannedAt: file.virusScannedAt ?? undefined,
    virusScanResult: file.virusScanResult ? JSON.stringify(file.virusScanResult) : undefined,
    isDeleted: file.isDeleted,
    metadata: file.metadataJson as Record<string, string>,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function fileRoutes(fastify: FastifyInstance) {
  // Register multipart support for direct uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 1,
    },
  });

  /**
   * POST /files/presigned-upload
   * Get a presigned URL for client-side upload
   */
  fastify.post('/files/presigned-upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const tenantId = getUserTenantId(user);
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant context required' });
    }

    const parseResult = GetPresignedUploadUrlSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { filename, mimeType, category, contentLength, metadata } = parseResult.data;

    // Check upload permission
    const context = createAccessContext(user.sub, tenantId, getUserRoles(user));
    const canCreate = accessControl.canCreateInCategory(mapToStorageCategory(category), context);

    if (!canCreate.allowed) {
      return reply.status(403).send({
        error: 'Permission denied',
        reason: canCreate.reason,
        requiredRoles: canCreate.requiredRoles,
      });
    }

    // Generate presigned upload URL
    const uploadOptions: UploadOptions = {
      tenantId,
      ownerId: user.sub,
      ownerType: 'user',
      category: mapToStorageCategory(category),
      filename,
      mimeType,
      contentLength,
      metadata,
    };

    const result = await storageService.getPresignedUploadUrl(uploadOptions, {
      expiresInSeconds: 3600, // 1 hour
    });

    return reply.send({
      uploadUrl: result.uploadUrl,
      s3Key: result.s3Key,
      expiresAt: result.expiresAt.toISOString(),
    });
  });

  /**
   * POST /files/finalize
   * Finalize a client-side upload (verify and scan)
   */
  fastify.post('/files/finalize', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const tenantId = getUserTenantId(user);
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant context required' });
    }

    const parseResult = FinalizeUploadSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { s3Key, filename, mimeType, category, metadata } = parseResult.data;

    // Validate the S3 key belongs to this tenant
    if (!storageService.validateTenantKey(s3Key, tenantId)) {
      return reply.status(403).send({ error: 'Cross-tenant access denied' });
    }

    // Finalize upload (verify exists and run virus scan)
    const uploadOptions: UploadOptions = {
      tenantId,
      ownerId: user.sub,
      ownerType: 'user',
      category: mapToStorageCategory(category),
      filename,
      mimeType,
      metadata,
    };

    const result = await storageService.finalizeUpload(s3Key, tenantId, uploadOptions);

    if (!result.scanPassed) {
      return reply.status(422).send({
        error: 'File rejected',
        reason: 'Virus detected',
        scanResult: result.scanResult,
      });
    }

    // Save file record to database
    const dbFile = await prisma.storedFile.create({
      data: {
        id: result.file.id,
        tenantId,
        ownerId: user.sub,
        ownerType: 'USER',
        category: mapToPrismaCategory(category),
        filename,
        mimeType,
        sizeBytes: result.file.sizeBytes,
        s3Bucket: result.file.s3Bucket,
        s3Key: result.file.s3Key,
        virusScanStatus: result.file.virusScanStatus as VirusScanStatus,
        virusScannedAt: result.file.virusScannedAt,
        virusScanResult: result.scanResult ? structuredClone(result.scanResult) : undefined,
        metadataJson: metadata ?? {},
      },
    });

    return reply.status(201).send({
      file: {
        id: dbFile.id,
        filename: dbFile.filename,
        mimeType: dbFile.mimeType,
        sizeBytes: Number(dbFile.sizeBytes),
        category: dbFile.category,
        virusScanStatus: dbFile.virusScanStatus,
        createdAt: dbFile.createdAt.toISOString(),
      },
    });
  });

  /**
   * POST /files/upload
   * Direct server-side upload (for smaller files or server-generated content)
   */
  fastify.post('/files/upload', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const tenantId = getUserTenantId(user);
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant context required' });
    }

    // Parse multipart form data
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    const category = (data.fields.category as { value?: string })?.value ?? 'OTHER';
    const categoryParsed = FileCategoryEnum.safeParse(category);
    if (!categoryParsed.success) {
      return reply.status(400).send({ error: 'Invalid file category' });
    }

    // Check upload permission
    const context = createAccessContext(user.sub, tenantId, getUserRoles(user));
    const canCreate = accessControl.canCreateInCategory(
      mapToStorageCategory(categoryParsed.data),
      context
    );

    if (!canCreate.allowed) {
      return reply.status(403).send({
        error: 'Permission denied',
        reason: canCreate.reason,
      });
    }

    // Read file content
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const content = Buffer.concat(chunks);

    // Upload file
    const uploadOptions: UploadOptions = {
      tenantId,
      ownerId: user.sub,
      ownerType: 'user',
      category: mapToStorageCategory(categoryParsed.data),
      filename: data.filename,
      mimeType: data.mimetype,
      contentLength: content.length,
    };

    const result = await storageService.uploadFile(content, uploadOptions);

    if (!result.scanPassed) {
      return reply.status(422).send({
        error: 'File rejected',
        reason: 'Virus detected',
        scanResult: result.scanResult,
      });
    }

    // Save file record to database
    const dbFile = await prisma.storedFile.create({
      data: {
        id: result.file.id,
        tenantId,
        ownerId: user.sub,
        ownerType: 'USER',
        category: mapToPrismaCategory(categoryParsed.data),
        filename: data.filename,
        mimeType: data.mimetype,
        sizeBytes: content.length,
        s3Bucket: result.file.s3Bucket,
        s3Key: result.file.s3Key,
        virusScanStatus: result.file.virusScanStatus as VirusScanStatus,
        virusScannedAt: result.file.virusScannedAt,
        virusScanResult: result.scanResult ? structuredClone(result.scanResult) : undefined,
        metadataJson: {},
      },
    });

    return reply.status(201).send({
      file: {
        id: dbFile.id,
        filename: dbFile.filename,
        mimeType: dbFile.mimeType,
        sizeBytes: Number(dbFile.sizeBytes),
        category: dbFile.category,
        virusScanStatus: dbFile.virusScanStatus,
        createdAt: dbFile.createdAt.toISOString(),
      },
    });
  });

  /**
   * GET /files/:id
   * Get file metadata
   */
  fastify.get(
    '/files/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant context required' });
      }

      const { id } = request.params;

      const file = await prisma.storedFile.findFirst({
        where: {
          id,
          tenantId,
          isDeleted: false,
        },
      });

      if (!file) {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Check access permission
      const context = createAccessContext(user.sub, tenantId, getUserRoles(user));
      const storedFile = mapPrismaToStoredFile(file);
      const canRead = await accessControl.canRead(storedFile, context);

      if (!canRead) {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      return reply.send({
        file: {
          id: file.id,
          filename: file.filename,
          mimeType: file.mimeType,
          sizeBytes: Number(file.sizeBytes),
          category: file.category,
          virusScanStatus: file.virusScanStatus,
          createdAt: file.createdAt.toISOString(),
          updatedAt: file.updatedAt.toISOString(),
          metadata: file.metadataJson,
        },
      });
    }
  );

  /**
   * GET /files/:id/download
   * Get presigned download URL
   */
  fastify.get(
    '/files/:id/download',
    async (
      request: FastifyRequest<{ Params: { id: string }; Querystring: unknown }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant context required' });
      }

      const { id } = request.params;

      const parseResult = GetPresignedDownloadUrlSchema.safeParse(request.query);
      const options = parseResult.success ? parseResult.data : {};

      const file = await prisma.storedFile.findFirst({
        where: {
          id,
          tenantId,
          isDeleted: false,
          virusScanStatus: 'CLEAN', // Only allow downloads of clean files
        },
      });

      if (!file) {
        return reply.status(404).send({ error: 'File not found or not available' });
      }

      // Check access permission
      const context = createAccessContext(user.sub, tenantId, getUserRoles(user));
      const storedFile = mapPrismaToStoredFile(file);
      const canRead = await accessControl.canRead(storedFile, context);

      if (!canRead) {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      // Generate presigned download URL
      const disposition =
        options.disposition === 'inline'
          ? 'inline'
          : `attachment; filename="${encodeURIComponent(file.filename)}"`;

      const result = await storageService.getPresignedDownloadUrl(file.s3Key, tenantId, {
        expiresInSeconds: options.expiresInSeconds ?? 3600,
        responseContentDisposition: disposition,
      });

      return reply.send({
        downloadUrl: result.downloadUrl,
        expiresAt: result.expiresAt.toISOString(),
        filename: file.filename,
        mimeType: file.mimeType,
        sizeBytes: Number(file.sizeBytes),
      });
    }
  );

  /**
   * GET /files
   * List files for the current user/tenant
   */
  fastify.get('/files', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const tenantId = getUserTenantId(user);
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant context required' });
    }

    const parseResult = ListFilesQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { category, ownerId, includeDeleted, page, pageSize } = parseResult.data;
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: Parameters<typeof prisma.storedFile.findMany>[0]['where'] = {
      tenantId,
    };

    if (category) {
      where.category = mapToPrismaCategory(category);
    }

    if (ownerId) {
      where.ownerId = ownerId;
    } else {
      // Default to current user's files unless they have admin role
      const roles = getUserRoles(user);
      if (
        !roles.includes('admin') &&
        !roles.includes('platform_admin') &&
        !roles.includes('district_admin')
      ) {
        where.ownerId = user.sub;
      }
    }

    if (!includeDeleted) {
      where.isDeleted = false;
    }

    const [files, total] = await Promise.all([
      prisma.storedFile.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          filename: true,
          mimeType: true,
          sizeBytes: true,
          category: true,
          virusScanStatus: true,
          isDeleted: true,
          createdAt: true,
        },
      }),
      prisma.storedFile.count({ where }),
    ]);

    return reply.send({
      files: files.map((f) => ({
        id: f.id,
        filename: f.filename,
        mimeType: f.mimeType,
        sizeBytes: Number(f.sizeBytes),
        category: f.category,
        virusScanStatus: f.virusScanStatus,
        isDeleted: f.isDeleted,
        createdAt: f.createdAt.toISOString(),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  });

  /**
   * DELETE /files/:id
   * Soft delete a file
   */
  fastify.delete(
    '/files/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant context required' });
      }

      const { id } = request.params;

      const file = await prisma.storedFile.findFirst({
        where: {
          id,
          tenantId,
          isDeleted: false,
        },
      });

      if (!file) {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Check delete permission
      const context = createAccessContext(user.sub, tenantId, getUserRoles(user));
      const storedFile = mapPrismaToStoredFile(file);
      const canDelete = await accessControl.canDelete(storedFile, context);

      if (!canDelete) {
        return reply.status(403).send({ error: 'Permission denied' });
      }

      // Soft delete
      await prisma.storedFile.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedByUserId: user.sub,
        },
      });

      return reply.status(204).send();
    }
  );

  /**
   * POST /files/:id/restore
   * Restore a soft-deleted file
   */
  fastify.post(
    '/files/:id/restore',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant context required' });
      }

      const { id } = request.params;

      // Check if user has admin role
      const roles = getUserRoles(user);
      if (
        !roles.includes('admin') &&
        !roles.includes('platform_admin') &&
        !roles.includes('district_admin')
      ) {
        return reply.status(403).send({ error: 'Admin role required to restore files' });
      }

      const file = await prisma.storedFile.findFirst({
        where: {
          id,
          tenantId,
          isDeleted: true,
        },
      });

      if (!file) {
        return reply.status(404).send({ error: 'Deleted file not found' });
      }

      // Verify file still exists in S3
      const exists = await storageService.fileExists(file.s3Key, tenantId);
      if (!exists) {
        return reply.status(410).send({ error: 'File has been permanently deleted from storage' });
      }

      // Restore
      await prisma.storedFile.update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
        },
      });

      return reply.send({ message: 'File restored successfully' });
    }
  );

  /**
   * DELETE /files/:id/permanent
   * Permanently delete a file (admin only)
   */
  fastify.delete(
    '/files/:id/permanent',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const tenantId = getUserTenantId(user);
      if (!tenantId) {
        return reply.status(400).send({ error: 'Tenant context required' });
      }

      const { id } = request.params;

      // Check if user has admin role
      const roles = getUserRoles(user);
      if (!roles.includes('platform_admin') && !roles.includes('platform_super_admin')) {
        return reply
          .status(403)
          .send({ error: 'Platform admin role required for permanent deletion' });
      }

      const file = await prisma.storedFile.findFirst({
        where: {
          id,
          tenantId,
        },
      });

      if (!file) {
        return reply.status(404).send({ error: 'File not found' });
      }

      // Delete from S3
      try {
        await storageService.deleteFile(file.s3Key, tenantId);
      } catch (error) {
        // Log but continue - file may already be deleted from S3
        fastify.log.warn({ error, fileId: id }, 'Failed to delete file from S3');
      }

      // Delete from database
      await prisma.storedFile.delete({
        where: { id },
      });

      return reply.status(204).send();
    }
  );

  /**
   * GET /files/storage-usage
   * Get storage usage statistics for the tenant
   */
  fastify.get('/files/storage-usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserFromRequest(request);
    if (!user) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const tenantId = getUserTenantId(user);
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant context required' });
    }

    // Check if user has admin role
    const roles = getUserRoles(user);
    if (
      !roles.includes('admin') &&
      !roles.includes('platform_admin') &&
      !roles.includes('district_admin')
    ) {
      return reply.status(403).send({ error: 'Admin role required to view storage usage' });
    }

    // Get storage usage from database (more accurate than S3 listing)
    const usage = await prisma.storedFile.groupBy({
      by: ['category'],
      where: {
        tenantId,
        isDeleted: false,
      },
      _sum: {
        sizeBytes: true,
      },
      _count: {
        id: true,
      },
    });

    const totalBytes = usage.reduce(
      (sum, cat) => sum + (cat._sum.sizeBytes ? Number(cat._sum.sizeBytes) : 0),
      0
    );
    const totalFiles = usage.reduce((sum, cat) => sum + cat._count.id, 0);

    const byCategory: Record<string, { bytes: number; count: number }> = {};
    for (const cat of usage) {
      byCategory[cat.category] = {
        bytes: cat._sum.sizeBytes ? Number(cat._sum.sizeBytes) : 0,
        count: cat._count.id,
      };
    }

    return reply.send({
      totalBytes,
      totalFiles,
      byCategory,
      formattedTotal: formatBytes(totalBytes),
    });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
