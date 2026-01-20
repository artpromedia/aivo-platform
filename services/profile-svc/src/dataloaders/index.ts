/**
 * Profile Service DataLoaders
 *
 * Provides batched, cached data loading for profile entities.
 * Addresses P0: N+1 Query Prevention for profile-svc.
 *
 * @module profile-svc/dataloaders
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

export interface ProfileDataLoaders {
  /** Load learner profiles by ID */
  learnerProfileById: DataLoader<string, LearnerProfileEntity>;
  /** Load learner profiles by user ID */
  learnerProfileByUserId: DataLoader<string, LearnerProfileEntity>;
  /** Load accommodations by learner profile ID (returns array) */
  accommodationsByProfileId: DataLoader<string, AccommodationEntity[]>;
  /** Load goal links by learner profile ID (returns array) */
  goalLinksByProfileId: DataLoader<string, GoalLinkEntity[]>;
  /** Load IEP document refs by learner profile ID (returns array) */
  iepDocsByProfileId: DataLoader<string, IepDocRefEntity[]>;
  /** Load change logs by learner profile ID (returns array) */
  changeLogsByProfileId: DataLoader<string, ChangeLogEntity[]>;
}

interface LearnerProfileEntity {
  id: string;
  tenantId: string;
  userId: string;
  externalLmsId: string | null;
  displayName: string;
  origin: string;
  sensitivityLevel: string;
  accommodationsJson: object | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AccommodationEntity {
  id: string;
  learnerProfileId: string;
  category: string;
  name: string;
  isEnabled: boolean;
  source: string;
  validFrom: Date | null;
  validUntil: Date | null;
}

interface GoalLinkEntity {
  id: string;
  learnerProfileId: string;
  goalId: string;
  goalType: string;
  isPrimary: boolean;
  createdAt: Date;
}

interface IepDocRefEntity {
  id: string;
  learnerProfileId: string;
  documentUrl: string;
  documentName: string;
  uploadedAt: Date;
  accessScope: string;
}

interface ChangeLogEntity {
  id: string;
  learnerProfileId: string;
  changedBy: string;
  changeType: string;
  changedFields: object;
  createdAt: Date;
}

// ══════════════════════════════════════════════════════════════════════════════
// LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create DataLoaders for profile service.
 * Call once per request to ensure request-scoped caching.
 *
 * @param tenantId - Tenant ID for tenant-scoped queries (required for security)
 * @returns Object containing all profile DataLoaders
 *
 * @example
 * ```typescript
 * // In request hook
 * fastify.addHook('preHandler', async (request) => {
 *   const tenantId = request.user?.tenantId;
 *   if (tenantId) {
 *     request.loaders = createProfileDataLoaders(tenantId);
 *   }
 * });
 *
 * // In route handler - batch load profiles for class roster
 * const profiles = await Promise.all(
 *   userIds.map(id => request.loaders.learnerProfileByUserId.load(id))
 * );
 * ```
 */
export function createProfileDataLoaders(tenantId: string): ProfileDataLoaders {
  return {
    /**
     * Load learner profiles by ID with tenant scoping
     */
    learnerProfileById: createIdLoader<string, LearnerProfileEntity>(
      async (ids: string[]) => {
        return prisma.learnerProfile.findMany({
          where: {
            id: { in: ids },
            tenantId,
          },
        }) as Promise<LearnerProfileEntity[]>;
      },
      { name: 'LearnerProfileByIdLoader' }
    ),

    /**
     * Load learner profiles by user ID with tenant scoping
     */
    learnerProfileByUserId: createIdLoader<string, LearnerProfileEntity>(
      async (userIds: string[]) => {
        const profiles = await prisma.learnerProfile.findMany({
          where: {
            userId: { in: userIds },
            tenantId,
          },
        });

        // Map results by userId for correct ordering
        const profileMap = new Map(profiles.map((p) => [p.userId, p]));
        return userIds.map((userId) => profileMap.get(userId) ?? null);
      },
      { name: 'LearnerProfileByUserIdLoader' }
    ),

    /**
     * Load accommodations for profiles (one-to-many relation)
     */
    accommodationsByProfileId: createRelationLoader<AccommodationEntity>(
      async (profileIds: string[]) => {
        return prisma.learnerAccommodation.findMany({
          where: { learnerProfileId: { in: profileIds } },
        }) as Promise<AccommodationEntity[]>;
      },
      (acc) => acc.learnerProfileId,
      { name: 'AccommodationsByProfileLoader' }
    ),

    /**
     * Load goal links for profiles (one-to-many relation)
     */
    goalLinksByProfileId: createRelationLoader<GoalLinkEntity>(
      async (profileIds: string[]) => {
        return prisma.learnerGoalLink.findMany({
          where: { learnerProfileId: { in: profileIds } },
        }) as Promise<GoalLinkEntity[]>;
      },
      (link) => link.learnerProfileId,
      { name: 'GoalLinksByProfileLoader' }
    ),

    /**
     * Load IEP document references for profiles (one-to-many relation)
     */
    iepDocsByProfileId: createRelationLoader<IepDocRefEntity>(
      async (profileIds: string[]) => {
        return prisma.iepDocumentRef.findMany({
          where: { learnerProfileId: { in: profileIds } },
          orderBy: { uploadedAt: 'desc' },
        }) as Promise<IepDocRefEntity[]>;
      },
      (doc) => doc.learnerProfileId,
      { name: 'IepDocsByProfileLoader' }
    ),

    /**
     * Load change logs for profiles (one-to-many relation)
     */
    changeLogsByProfileId: createRelationLoader<ChangeLogEntity>(
      async (profileIds: string[]) => {
        return prisma.profileChangeLog.findMany({
          where: { learnerProfileId: { in: profileIds } },
          orderBy: { createdAt: 'desc' },
          take: 100, // Limit to avoid huge result sets
        }) as Promise<ChangeLogEntity[]>;
      },
      (log) => log.learnerProfileId,
      { name: 'ChangeLogsByProfileLoader' }
    ),
  };
}

export type { DataLoader };
