/**
 * Content Service DataLoaders
 *
 * Provides batched, cached data loading for content entities.
 * Addresses P0: N+1 Query Prevention for content-svc.
 *
 * @module content-svc/dataloaders
 */

import {
  createIdLoader,
  createRelationLoader,
  type DataLoader,
} from '@aivo/ts-api-utils';

import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ContentDataLoaders {
  /** Load learning objects by ID */
  learningObjectById: DataLoader<string, LearningObjectEntity>;
  /** Load versions by learning object ID (returns array) */
  versionsByLearningObjectId: DataLoader<string, VersionEntity[]>;
  /** Load tags by learning object ID (returns array) */
  tagsByLearningObjectId: DataLoader<string, TagEntity[]>;
  /** Load published version by learning object ID */
  publishedVersionByLearningObjectId: DataLoader<string, VersionEntity>;
}

interface LearningObjectEntity {
  id: string;
  tenantId: string | null;
  slug: string;
  title: string;
  subject: string;
  gradeBand: string;
  primarySkillId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface VersionEntity {
  id: string;
  learningObjectId: string;
  versionNumber: number;
  state: string;
  createdAt: Date;
  publishedAt: Date | null;
}

interface TagEntity {
  id: string;
  learningObjectId: string;
  tag: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create DataLoaders for content service.
 * Call once per request to ensure request-scoped caching.
 *
 * @param tenantId - Optional tenant ID for tenant-scoped queries
 * @returns Object containing all content DataLoaders
 *
 * @example
 * ```typescript
 * // In request hook
 * fastify.addHook('preHandler', async (request) => {
 *   const tenantId = request.user?.tenantId;
 *   request.loaders = createContentDataLoaders(tenantId);
 * });
 *
 * // In route handler
 * const content = await request.loaders.learningObjectById.load(contentId);
 * const versions = await request.loaders.versionsByLearningObjectId.load(contentId);
 * ```
 */
export function createContentDataLoaders(tenantId?: string): ContentDataLoaders {
  return {
    /**
     * Load learning objects by ID with optional tenant scoping
     */
    learningObjectById: createIdLoader<string, LearningObjectEntity>(
      async (ids: string[]) => {
        const where: { id: { in: string[] }; tenantId?: string | null; OR?: object[] } = {
          id: { in: ids },
        };

        // If tenantId provided, scope to tenant + global content
        if (tenantId) {
          where.OR = [{ tenantId }, { tenantId: null }];
        }

        return prisma.learningObject.findMany({ where }) as Promise<LearningObjectEntity[]>;
      },
      { name: 'LearningObjectByIdLoader' }
    ),

    /**
     * Load all versions for learning objects (one-to-many relation)
     */
    versionsByLearningObjectId: createRelationLoader<VersionEntity>(
      async (learningObjectIds: string[]) => {
        return prisma.learningObjectVersion.findMany({
          where: { learningObjectId: { in: learningObjectIds } },
          orderBy: { versionNumber: 'desc' },
        }) as Promise<VersionEntity[]>;
      },
      (version) => version.learningObjectId,
      { name: 'VersionsByLearningObjectLoader' }
    ),

    /**
     * Load tags for learning objects (one-to-many relation)
     */
    tagsByLearningObjectId: createRelationLoader<TagEntity>(
      async (learningObjectIds: string[]) => {
        return prisma.learningObjectTag.findMany({
          where: { learningObjectId: { in: learningObjectIds } },
        }) as Promise<TagEntity[]>;
      },
      (tag) => tag.learningObjectId,
      { name: 'TagsByLearningObjectLoader' }
    ),

    /**
     * Load only the published version for each learning object
     */
    publishedVersionByLearningObjectId: createIdLoader<string, VersionEntity>(
      async (learningObjectIds: string[]) => {
        const versions = await prisma.learningObjectVersion.findMany({
          where: {
            learningObjectId: { in: learningObjectIds },
            state: 'PUBLISHED',
          },
          orderBy: { versionNumber: 'desc' },
        });

        // Group by learningObjectId and take first (highest version)
        const versionMap = new Map<string, VersionEntity>();
        for (const v of versions) {
          if (!versionMap.has(v.learningObjectId)) {
            versionMap.set(v.learningObjectId, v as VersionEntity);
          }
        }

        return learningObjectIds.map((id) => versionMap.get(id) ?? null);
      },
      { name: 'PublishedVersionByLearningObjectLoader' }
    ),
  };
}

export type { DataLoader } from '@aivo/ts-api-utils';
