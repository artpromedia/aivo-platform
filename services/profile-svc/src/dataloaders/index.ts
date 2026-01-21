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
  learnerId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  profileVersion: number;
  summary: string | null;
  learningStyleJson: unknown;
  sensoryProfileJson: unknown;
  communicationPreferencesJson: unknown;
  interactionConstraintsJson: unknown;
  uiAccessibilityJson: unknown;
  origin: string;
}

interface AccommodationEntity {
  id: string;
  tenantId: string;
  learnerId: string;
  profileId: string | null;
  category: string;
  description: string;
  appliesToDomains: string[];
  source: string;
  sourceReference: string | null;
  priority: string;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
  requiresAcknowledgement: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface GoalLinkEntity {
  id: string;
  tenantId: string;
  learnerId: string;
  profileId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  goalId: string;
  notes: string | null;
}

interface IepDocRefEntity {
  id: string;
  tenantId: string;
  learnerId: string;
  description: string | null;
  fileUrl: string;
  accessScope: string;
  fileName: string | null;
  fileSizeBytes: number | null;
  uploadedAt: Date;
  uploadedByUserId: string;
  expiresAt: Date | null;
  archivedAt: Date | null;
  archivedByUserId: string | null;
  deletedAt: Date | null;
  deletedByUserId: string | null;
}

interface ChangeLogEntity {
  id: string;
  tenantId: string;
  learnerId: string;
  profileId: string;
  version: number;
  changedFields: string[];
  previousValuesJson: unknown;
  changedByUserId: string;
  changedByRole: string;
  changedAt: Date;
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
      async (learnerIds: string[]) => {
        const profiles = await prisma.learnerProfile.findMany({
          where: {
            learnerId: { in: learnerIds },
            tenantId,
          },
        });

        // Map results by learnerId for correct ordering
        const profileMap = new Map(profiles.map((p) => [p.learnerId, p]));
        return learnerIds.map((learnerId) => profileMap.get(learnerId) ?? null) as unknown as LearnerProfileEntity[];
      },
      { name: 'LearnerProfileByUserIdLoader' }
    ),

    /**
     * Load accommodations for profiles (one-to-many relation)
     */
    accommodationsByProfileId: createRelationLoader<AccommodationEntity>(
      async (profileIds: string[]) => {
        return prisma.learnerAccommodation.findMany({
          where: { profileId: { in: profileIds } },
        }) as unknown as Promise<AccommodationEntity[]>;
      },
      (acc) => acc.profileId ?? '',
      { name: 'AccommodationsByProfileLoader' }
    ),

    /**
     * Load goal links for profiles (one-to-many relation)
     */
    goalLinksByProfileId: createRelationLoader<GoalLinkEntity>(
      async (profileIds: string[]) => {
        return prisma.learnerGoalLink.findMany({
          where: { profileId: { in: profileIds } },
        }) as unknown as Promise<GoalLinkEntity[]>;
      },
      (link) => link.profileId ?? '',
      { name: 'GoalLinksByProfileLoader' }
    ),

    /**
     * Load IEP document references for learners (one-to-many relation)
     * Note: IEP docs are linked by learnerId, not profileId
     */
    iepDocsByProfileId: createRelationLoader<IepDocRefEntity>(
      async (learnerIds: string[]) => {
        return prisma.iepDocumentRef.findMany({
          where: { learnerId: { in: learnerIds } },
          orderBy: { uploadedAt: 'desc' },
        }) as unknown as Promise<IepDocRefEntity[]>;
      },
      (doc) => doc.learnerId,
      { name: 'IepDocsByProfileLoader' }
    ),

    /**
     * Load change logs for profiles (one-to-many relation)
     */
    changeLogsByProfileId: createRelationLoader<ChangeLogEntity>(
      async (profileIds: string[]) => {
        return prisma.profileChangeLog.findMany({
          where: { profileId: { in: profileIds } },
          orderBy: { changedAt: 'desc' },
          take: 100, // Limit to avoid huge result sets
        }) as unknown as Promise<ChangeLogEntity[]>;
      },
      (log) => log.profileId,
      { name: 'ChangeLogsByProfileLoader' }
    ),
  };
}

export type { DataLoader } from '@aivo/ts-api-utils';
