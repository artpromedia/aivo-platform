/**
 * Package Builder
 *
 * Utilities for building content package manifests and managing content URLs.
 * In production, this would integrate with S3 for storage and pre-signed URLs.
 */

import { prisma } from './prisma.js';
import type {
  ContentLocale,
  LearningObjectGradeBand,
  LearningObjectSubject,
} from '@prisma/client';
import { createHash } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ManifestItem {
  loVersionId: string;
  learningObjectId: string;
  contentKey: string;
  checksum: string;
  contentUrl: string;
  sizeBytes: number;
  subject: string;
  gradeBand: string;
  versionNumber: number;
  locale: string;
  publishedAt: string;
  updatedAt: string;
}

interface ContentPackageManifest {
  packageId: string;
  manifestVersion: string;
  tenantId: string;
  gradeBands: string[];
  subjects: string[];
  locales: string[];
  generatedAt: string;
  expiresAt: string;
  totalItems: number;
  totalSizeBytes: number;
  items: ManifestItem[];
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════════════════════

const MANIFEST_VERSION = '1.0.0';
const CONTENT_BASE_URL = process.env.CONTENT_BASE_URL ?? 'https://content.aivo.ai';

// ══════════════════════════════════════════════════════════════════════════════
// FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Build a content package manifest for the given criteria.
 */
export async function buildPackageManifest(
  packageId: string,
  tenantId: string,
  gradeBands: LearningObjectGradeBand[],
  subjects: LearningObjectSubject[],
  locales: ContentLocale[],
  updatedSince: Date | null,
  urlExpirationHours: number
): Promise<ContentPackageManifest> {
  // Query published LO versions matching criteria
  const versions = await prisma.learningObjectVersion.findMany({
    where: {
      state: 'PUBLISHED',
      learningObject: {
        OR: [
          { tenantId },
          { tenantId: null }, // Include global content
        ],
        subject: { in: subjects },
        gradeBand: { in: gradeBands },
        isActive: true,
      },
      ...(updatedSince && {
        OR: [
          { publishedAt: { gte: updatedSince } },
          { updatedAt: { gte: updatedSince } },
        ],
      }),
    },
    include: {
      learningObject: {
        select: {
          id: true,
          subject: true,
          gradeBand: true,
          title: true,
        },
      },
    },
    orderBy: [
      { learningObject: { subject: 'asc' } },
      { learningObject: { gradeBand: 'asc' } },
      { versionNumber: 'desc' },
    ],
  });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + urlExpirationHours * 60 * 60 * 1000);

  // Build manifest items (one per locale)
  const items: ManifestItem[] = [];
  let totalSizeBytes = 0;

  for (const version of versions) {
    for (const locale of locales) {
      const contentJson = version.contentJson as Record<string, unknown>;
      const contentStr = JSON.stringify(contentJson);
      const sizeBytes = Buffer.byteLength(contentStr, 'utf-8');
      const checksum = computeChecksum(contentStr);

      items.push({
        loVersionId: version.id,
        learningObjectId: version.learningObjectId,
        contentKey: `LO_VERSION:${version.id}:locale:${locale}`,
        checksum: `sha256:${checksum}`,
        contentUrl: generateContentUrl(version.id, locale, urlExpirationHours),
        sizeBytes,
        subject: version.learningObject.subject,
        gradeBand: version.learningObject.gradeBand,
        versionNumber: version.versionNumber,
        locale,
        publishedAt: version.publishedAt?.toISOString() ?? version.createdAt.toISOString(),
        updatedAt: version.updatedAt.toISOString(),
      });

      totalSizeBytes += sizeBytes;
    }
  }

  return {
    packageId,
    manifestVersion: MANIFEST_VERSION,
    tenantId,
    gradeBands,
    subjects,
    locales,
    generatedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    totalItems: items.length,
    totalSizeBytes,
    items,
  };
}

/**
 * Generate a pre-signed URL for content download.
 * In production, this would use S3 pre-signed URLs.
 */
export function generateContentUrl(
  loVersionId: string,
  locale: string,
  expirationHours: number
): string {
  // In production, generate actual S3 pre-signed URL
  // For now, return a placeholder URL pattern
  const expiresAt = Date.now() + expirationHours * 60 * 60 * 1000;
  const signature = computeChecksum(`${loVersionId}:${locale}:${expiresAt}`).substring(0, 16);

  return `${CONTENT_BASE_URL}/v1/content/${loVersionId}/${locale}?expires=${expiresAt}&sig=${signature}`;
}

/**
 * Compute SHA-256 checksum of content.
 */
export function computeChecksum(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

/**
 * Record a content version change for delta tracking.
 * Called when LO versions are published/updated/retired.
 */
export async function recordContentChange(
  loVersionId: string,
  learningObjectId: string,
  tenantId: string | null,
  subject: LearningObjectSubject,
  gradeBand: LearningObjectGradeBand,
  versionNumber: number,
  changeType: 'ADDED' | 'UPDATED' | 'REMOVED',
  contentJson?: Record<string, unknown>
): Promise<void> {
  // Default locales for now
  const locales: ContentLocale[] = ['en'];

  for (const locale of locales) {
    let checksum: string | null = null;
    let sizeBytes: bigint | null = null;

    if (changeType !== 'REMOVED' && contentJson) {
      const contentStr = JSON.stringify(contentJson);
      checksum = `sha256:${computeChecksum(contentStr)}`;
      sizeBytes = BigInt(Buffer.byteLength(contentStr, 'utf-8'));
    }

    await prisma.contentVersionChange.create({
      data: {
        loVersionId,
        learningObjectId,
        tenantId,
        subject,
        gradeBand,
        versionNumber,
        changeType,
        checksum,
        sizeBytes,
        locale,
      },
    });
  }
}

/**
 * Calculate estimated download size for a package request.
 */
export async function estimatePackageSize(
  tenantId: string,
  gradeBands: LearningObjectGradeBand[],
  subjects: LearningObjectSubject[],
  locales: ContentLocale[],
  updatedSince?: Date
): Promise<{ itemCount: number; sizeBytes: number }> {
  // Count matching versions
  const count = await prisma.learningObjectVersion.count({
    where: {
      state: 'PUBLISHED',
      learningObject: {
        OR: [{ tenantId }, { tenantId: null }],
        subject: { in: subjects },
        gradeBand: { in: gradeBands },
        isActive: true,
      },
      ...(updatedSince && {
        OR: [
          { publishedAt: { gte: updatedSince } },
          { updatedAt: { gte: updatedSince } },
        ],
      }),
    },
  });

  // Multiply by locale count
  const itemCount = count * locales.length;

  // Estimate size (average ~10KB per item - would be more accurate with actual stats)
  const avgSizePerItem = 10_000;
  const sizeBytes = itemCount * avgSizePerItem;

  return { itemCount, sizeBytes };
}
