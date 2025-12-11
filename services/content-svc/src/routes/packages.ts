/**
 * Content Package Routes
 *
 * API endpoints for content packaging and delta updates:
 * - POST /content/packages - Create a new content package
 * - GET /content/packages/:id - Get package status
 * - GET /content/packages/:id/manifest - Download package manifest
 * - GET /content/packages/diff - Get delta updates since timestamp
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { buildPackageManifest, generateContentUrl } from '../packageBuilder.js';
import { prisma } from '../prisma.js';
import type {
  LearningObjectGradeBand,
  LearningObjectSubject,
} from '@prisma/client';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES (until Prisma schema is migrated)
// ══════════════════════════════════════════════════════════════════════════════

type ContentLocale = 'en' | 'es' | 'fr' | 'zh' | 'ar';
type ContentPackageStatus = 'PENDING' | 'BUILDING' | 'READY' | 'EXPIRED' | 'FAILED';

interface ContentPackageRecord {
  id: string;
  tenantId: string;
  gradeBands: LearningObjectGradeBand[];
  subjects: LearningObjectSubject[];
  locales: ContentLocale[];
  status: ContentPackageStatus;
  manifestUrl: string | null;
  bundleUrl: string | null;
  totalItems: number;
  totalSizeBytes: bigint;
  requestedAt: Date;
  completedAt: Date | null;
  expiresAt: Date | null;
  requestedByUserId: string;
  errorMessage: string | null;
  urlExpirationHours: number;
  updatedSince: Date | null;
}

interface ContentVersionChangeRecord {
  id: string;
  loVersionId: string;
  learningObjectId: string;
  tenantId: string | null;
  subject: LearningObjectSubject;
  gradeBand: LearningObjectGradeBand;
  versionNumber: number;
  changeType: string;
  checksum: string | null;
  sizeBytes: bigint | null;
  locale: ContentLocale;
  changedAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const GradeBandEnum = z.enum(['K_2', 'G3_5', 'G6_8', 'G9_12']);
const SubjectEnum = z.enum(['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER']);
const LocaleEnum = z.enum(['en', 'es', 'fr', 'zh', 'ar']);

const CreatePackageSchema = z.object({
  tenantId: z.string().uuid(),
  gradeBands: z.array(GradeBandEnum).min(1),
  subjects: z.array(SubjectEnum).min(1),
  locales: z.array(LocaleEnum).default(['en']),
  updatedSince: z.string().datetime().optional(),
  urlExpirationHours: z.number().min(1).max(168).default(24),
});

const DeltaRequestSchema = z.object({
  tenantId: z.string().uuid(),
  gradeBands: z.array(GradeBandEnum).min(1),
  subjects: z.array(SubjectEnum).min(1),
  locales: z.array(LocaleEnum).default(['en']),
  sinceTimestamp: z.string().datetime(),
  limit: z.number().min(1).max(1000).default(100),
  cursor: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
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

/**
 * Check if user has access to requested tenant's content.
 */
function canAccessTenant(user: JwtUser, tenantId: string): boolean {
  if (user.role === 'PLATFORM_ADMIN') return true;
  const userTenant = getUserTenantId(user);
  return userTenant === tenantId;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function contentPackageRoutes(fastify: FastifyInstance) {
  /**
   * POST /content/packages
   * Create a new content package for bulk download.
   */
  fastify.post(
    '/content/packages',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = CreatePackageSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const { tenantId, gradeBands, subjects, locales, updatedSince, urlExpirationHours } =
        parseResult.data;

      // Check tenant access
      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Access denied to tenant' });
      }

      // Create package record in PENDING state
      const contentPackage = await prisma.contentPackage.create({
        data: {
          tenantId,
          gradeBands: gradeBands as LearningObjectGradeBand[],
          subjects: subjects as LearningObjectSubject[],
          locales: locales as ContentLocale[],
          status: 'PENDING',
          requestedByUserId: user.sub,
          urlExpirationHours,
          updatedSince: updatedSince ? new Date(updatedSince) : null,
        },
      });

      // Trigger async package build (in production, this would be a job queue)
      // For now, we'll build synchronously but return immediately
      void buildPackageAsync(contentPackage.id);

      const estimatedCompletionAt = new Date(Date.now() + 60_000).toISOString(); // ~1 min estimate

      return reply.status(202).send({
        packageId: contentPackage.id,
        status: contentPackage.status,
        estimatedCompletionAt,
        statusUrl: `/api/content/packages/${contentPackage.id}`,
      });
    }
  );

  /**
   * GET /content/packages/:id
   * Get package status and download URLs.
   */
  fastify.get(
    '/content/packages/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const contentPackage = await prisma.contentPackage.findUnique({
        where: { id },
      });

      if (!contentPackage) {
        return reply.status(404).send({ error: 'Package not found' });
      }

      // Check tenant access
      if (!canAccessTenant(user, contentPackage.tenantId)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      // Check if package expired
      if (contentPackage.expiresAt && contentPackage.expiresAt < new Date()) {
        // Mark as expired if not already
        if (contentPackage.status !== 'EXPIRED') {
          await prisma.contentPackage.update({
            where: { id },
            data: { status: 'EXPIRED' },
          });
          contentPackage.status = 'EXPIRED' as ContentPackageStatus;
        }
      }

      return reply.send({
        package: {
          id: contentPackage.id,
          tenantId: contentPackage.tenantId,
          gradeBands: contentPackage.gradeBands,
          subjects: contentPackage.subjects,
          locales: contentPackage.locales,
          status: contentPackage.status,
          manifestUrl: contentPackage.manifestUrl,
          totalItems: contentPackage.totalItems,
          totalSizeBytes: Number(contentPackage.totalSizeBytes),
          requestedAt: contentPackage.requestedAt.toISOString(),
          completedAt: contentPackage.completedAt?.toISOString() ?? null,
          expiresAt: contentPackage.expiresAt?.toISOString() ?? null,
          requestedByUserId: contentPackage.requestedByUserId,
          errorMessage: contentPackage.errorMessage,
        },
        manifestDownloadUrl:
          contentPackage.status === 'READY' ? contentPackage.manifestUrl : null,
        bundleDownloadUrl:
          contentPackage.status === 'READY' ? contentPackage.bundleUrl : null,
      });
    }
  );

  /**
   * GET /content/packages/:id/manifest
   * Get the full package manifest (only when READY).
   */
  fastify.get(
    '/content/packages/:id/manifest',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const contentPackage = await prisma.contentPackage.findUnique({
        where: { id },
      });

      if (!contentPackage) {
        return reply.status(404).send({ error: 'Package not found' });
      }

      if (!canAccessTenant(user, contentPackage.tenantId)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      if (contentPackage.status !== 'READY') {
        return reply.status(400).send({
          error: 'Package not ready',
          status: contentPackage.status,
        });
      }

      // In production, fetch from S3; here we regenerate
      const manifest = await buildPackageManifest(
        contentPackage.id,
        contentPackage.tenantId,
        contentPackage.gradeBands,
        contentPackage.subjects,
        contentPackage.locales,
        contentPackage.updatedSince,
        contentPackage.urlExpirationHours
      );

      return reply.send(manifest);
    }
  );

  /**
   * GET /content/packages/diff
   * Get delta updates (changes since timestamp).
   */
  fastify.get(
    '/content/packages/diff',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = DeltaRequestSchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid query parameters',
          details: parseResult.error.flatten(),
        });
      }

      const { tenantId, gradeBands, subjects, locales, sinceTimestamp, limit, cursor } =
        parseResult.data;

      if (!canAccessTenant(user, tenantId)) {
        return reply.status(403).send({ error: 'Access denied to tenant' });
      }

      const sinceDate = new Date(sinceTimestamp);
      const cursorDate = cursor ? new Date(cursor) : sinceDate;

      // Query changes
      const changes = await prisma.contentVersionChange.findMany({
        where: {
          OR: [
            { tenantId },
            { tenantId: null }, // Global content
          ],
          subject: { in: subjects as LearningObjectSubject[] },
          gradeBand: { in: gradeBands as LearningObjectGradeBand[] },
          locale: { in: locales as ContentLocale[] },
          changedAt: { gt: cursorDate },
        },
        orderBy: { changedAt: 'asc' },
        take: limit + 1, // Fetch one extra to detect hasMore
      });

      const hasMore = changes.length > limit;
      const items = hasMore ? changes.slice(0, limit) : changes;
      const lastItem = items[items.length - 1];

      // Build response items
      const deltaItems = await Promise.all(
        items.map(async (change) => {
          let contentUrl: string | null = null;
          if (change.changeType !== 'REMOVED') {
            contentUrl = generateContentUrl(
              change.loVersionId,
              change.locale,
              24 // Default expiration
            );
          }

          return {
            loVersionId: change.loVersionId,
            learningObjectId: change.learningObjectId,
            contentKey: `LO_VERSION:${change.loVersionId}:locale:${change.locale}`,
            changeType: change.changeType as 'ADDED' | 'UPDATED' | 'REMOVED',
            checksum: change.checksum,
            contentUrl,
            sizeBytes: change.sizeBytes ? Number(change.sizeBytes) : null,
            subject: change.subject,
            gradeBand: change.gradeBand,
            versionNumber: change.versionNumber,
            locale: change.locale,
            changedAt: change.changedAt.toISOString(),
          };
        })
      );

      const totalSizeBytes = deltaItems
        .filter((i) => i.changeType !== 'REMOVED')
        .reduce((sum, i) => sum + (i.sizeBytes ?? 0), 0);

      return reply.send({
        tenantId,
        sinceTimestamp,
        currentTimestamp: new Date().toISOString(),
        hasMore,
        nextCursor: hasMore ? lastItem?.changedAt.toISOString() : null,
        totalChanges: items.length,
        totalSizeBytes,
        items: deltaItems,
      });
    }
  );

  /**
   * DELETE /content/packages/:id
   * Delete a content package.
   */
  fastify.delete(
    '/content/packages/:id',
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { id } = request.params;

      const contentPackage = await prisma.contentPackage.findUnique({
        where: { id },
      });

      if (!contentPackage) {
        return reply.status(404).send({ error: 'Package not found' });
      }

      if (!canAccessTenant(user, contentPackage.tenantId)) {
        return reply.status(403).send({ error: 'Access denied' });
      }

      await prisma.contentPackage.delete({ where: { id } });

      return reply.status(204).send();
    }
  );

  /**
   * GET /content/packages
   * List packages for a tenant.
   */
  fastify.get(
    '/content/packages',
    async (
      request: FastifyRequest<{
        Querystring: { tenantId?: string; status?: string; limit?: string };
      }>,
      reply: FastifyReply
    ) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const { tenantId, status, limit } = request.query;
      const limitNum = Math.min(parseInt(limit ?? '50', 10), 100);

      // Determine tenant filter
      let tenantFilter: string | undefined = tenantId;
      if (user.role !== 'PLATFORM_ADMIN') {
        tenantFilter = getUserTenantId(user);
        if (!tenantFilter) {
          return reply.status(403).send({ error: 'No tenant access' });
        }
      }

      const packages = await prisma.contentPackage.findMany({
        where: {
          ...(tenantFilter && { tenantId: tenantFilter }),
          ...(status && { status: status as ContentPackageStatus }),
        },
        orderBy: { requestedAt: 'desc' },
        take: limitNum,
      });

      return reply.send({
        packages: packages.map((pkg) => ({
          id: pkg.id,
          tenantId: pkg.tenantId,
          gradeBands: pkg.gradeBands,
          subjects: pkg.subjects,
          locales: pkg.locales,
          status: pkg.status,
          totalItems: pkg.totalItems,
          totalSizeBytes: Number(pkg.totalSizeBytes),
          requestedAt: pkg.requestedAt.toISOString(),
          completedAt: pkg.completedAt?.toISOString() ?? null,
          expiresAt: pkg.expiresAt?.toISOString() ?? null,
        })),
      });
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ASYNC PACKAGE BUILD
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build package manifest and store in S3.
 * In production, this would be a background job.
 */
async function buildPackageAsync(packageId: string): Promise<void> {
  try {
    // Update status to BUILDING
    await prisma.contentPackage.update({
      where: { id: packageId },
      data: { status: 'BUILDING' },
    });

    const pkg = await prisma.contentPackage.findUnique({
      where: { id: packageId },
    });

    if (!pkg) return;

    // Build the manifest
    const manifest = await buildPackageManifest(
      pkg.id,
      pkg.tenantId,
      pkg.gradeBands,
      pkg.subjects,
      pkg.locales,
      pkg.updatedSince,
      pkg.urlExpirationHours
    );

    // In production, upload manifest to S3 and get URL
    // For now, we'll use a placeholder URL
    const manifestUrl = `https://content.aivo.ai/packages/${packageId}/manifest.json`;

    // Calculate expiration
    const expiresAt = new Date(Date.now() + pkg.urlExpirationHours * 60 * 60 * 1000);

    // Update package record
    await prisma.contentPackage.update({
      where: { id: packageId },
      data: {
        status: 'READY',
        manifestUrl,
        totalItems: manifest.totalItems,
        totalSizeBytes: BigInt(manifest.totalSizeBytes),
        completedAt: new Date(),
        expiresAt,
      },
    });
  } catch (error) {
    // Mark as failed
    await prisma.contentPackage.update({
      where: { id: packageId },
      data: {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
}
