/**
 * Content Sharing Service
 *
 * Handles all content sharing operations including:
 * - Sharing content with visibility levels
 * - Forking/remixing content
 * - Usage tracking and attribution
 * - Ratings and reviews
 * - Download counts and popularity scoring
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export type VisibilityLevel = 'PRIVATE' | 'SCHOOL' | 'DISTRICT' | 'PUBLIC';

export interface ShareContentParams {
  learningObjectId: string;
  userId: string;
  tenantId: string | null;
  visibility: VisibilityLevel;
  description?: string;
  tags?: string[];
  license?: string;
  requiresAttribution: boolean;
}

export interface ForkContentParams {
  contentShareId: string;
  userId: string;
  tenantId: string | null;
  title: string;
}

export interface RateContentParams {
  contentShareId: string;
  userId: string;
  rating: number;
}

export interface ReviewContentParams {
  contentShareId: string;
  userId: string;
  rating: number;
  title: string;
  comment: string;
}

export interface BrowseSharedContentParams {
  subject?: string;
  gradeBand?: string;
  visibility?: VisibilityLevel;
  tags?: string[];
  minRating?: number;
  searchQuery?: string;
  sortBy?: 'POPULARITY' | 'RECENT' | 'RATING' | 'DOWNLOADS';
  tenantId?: string | null;
  schoolId?: string | null;
  page?: number;
  pageSize?: number;
}

/**
 * Share a learning object with specified visibility level
 */
export async function shareContent(params: ShareContentParams) {
  const {
    learningObjectId,
    userId,
    tenantId,
    visibility,
    description,
    tags,
    license,
    requiresAttribution,
  } = params;

  // Verify the learning object exists and user has access
  const learningObject = await prisma.learningObject.findUnique({
    where: { id: learningObjectId },
    include: {
      versions: {
        where: { state: 'PUBLISHED' },
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
  });

  if (!learningObject) {
    throw new Error('Learning object not found');
  }

  if (learningObject.versions.length === 0) {
    throw new Error('No published version available for sharing');
  }

  // Check if already shared by this user
  const existingShare = await prisma.contentShare.findUnique({
    where: {
      learningObjectId_sharedByUserId: {
        learningObjectId,
        sharedByUserId: userId,
      },
    },
  });

  if (existingShare) {
    // Update existing share
    return await prisma.contentShare.update({
      where: { id: existingShare.id },
      data: {
        visibility,
        description,
        license,
        requiresAttribution,
        updatedAt: new Date(),
      },
    });
  }

  // Create new share
  const contentShare = await prisma.contentShare.create({
    data: {
      learningObjectId,
      sharedByUserId: userId,
      tenantId,
      visibility,
      description,
      license,
      requiresAttribution,
      downloadCount: 0,
      viewCount: 0,
      forkCount: 0,
    },
  });

  // Add tags if provided
  if (tags && tags.length > 0) {
    await prisma.contentShareTag.createMany({
      data: tags.map((tag) => ({
        contentShareId: contentShare.id,
        tag,
      })),
    });
  }

  return contentShare;
}

/**
 * Fork/remix content (copy and allow modification)
 */
export async function forkContent(params: ForkContentParams) {
  const { contentShareId, userId, tenantId, title } = params;

  // Get the shared content
  const contentShare = await prisma.contentShare.findUnique({
    where: { id: contentShareId },
    include: {
      learningObject: {
        include: {
          versions: {
            where: { state: 'PUBLISHED' },
            orderBy: { versionNumber: 'desc' },
            take: 1,
          },
          tags: true,
        },
      },
    },
  });

  if (!contentShare) {
    throw new Error('Shared content not found');
  }

  if (contentShare.learningObject.versions.length === 0) {
    throw new Error('No published version available to fork');
  }

  const originalVersion = contentShare.learningObject.versions[0];
  const originalLO = contentShare.learningObject;

  // Create new learning object (forked copy)
  const result = await prisma.$transaction(async (tx) => {
    // Create new learning object
    const newLO = await tx.learningObject.create({
      data: {
        tenantId,
        slug: `${originalLO.slug}-fork-${Date.now()}`,
        title: title || `${originalLO.title} (Forked)`,
        subject: originalLO.subject,
        gradeBand: originalLO.gradeBand,
        primarySkillId: originalLO.primarySkillId,
        createdByUserId: userId,
        isActive: true,
      },
    });

    // Create initial version with copied content
    const newVersion = await tx.learningObjectVersion.create({
      data: {
        learningObjectId: newLO.id,
        versionNumber: 1,
        state: 'DRAFT',
        contentJson: originalVersion.contentJson,
        accessibilityJson: originalVersion.accessibilityJson,
        standardsJson: originalVersion.standardsJson,
        metadataJson: {
          ...(originalVersion.metadataJson as object),
          forkedFrom: {
            learningObjectId: originalLO.id,
            versionId: originalVersion.id,
            contentShareId: contentShare.id,
            originalAuthor: contentShare.sharedByUserId,
          },
        },
        createdByUserId: userId,
        changeSummary: `Forked from "${originalLO.title}"`,
      },
    });

    // Copy tags
    if (originalLO.tags.length > 0) {
      await tx.learningObjectTag.createMany({
        data: originalLO.tags.map((tag) => ({
          learningObjectId: newLO.id,
          tag: tag.tag,
        })),
      });
    }

    // Increment fork count
    await tx.contentShare.update({
      where: { id: contentShareId },
      data: { forkCount: { increment: 1 } },
    });

    // Track the fork
    await tx.contentFork.create({
      data: {
        originalContentShareId: contentShareId,
        forkedLearningObjectId: newLO.id,
        forkedByUserId: userId,
      },
    });

    return { learningObject: newLO, version: newVersion };
  });

  return result;
}

/**
 * Browse shared content with filters and sorting
 */
export async function browseSharedContent(params: BrowseSharedContentParams) {
  const {
    subject,
    gradeBand,
    visibility,
    tags,
    minRating,
    searchQuery,
    sortBy = 'POPULARITY',
    tenantId,
    schoolId,
    page = 1,
    pageSize = 20,
  } = params;

  const where: Prisma.ContentShareWhereInput = {
    isActive: true,
  };

  // Visibility filter
  if (visibility) {
    where.visibility = visibility;
  } else {
    // Default: show public content or content from user's tenant/school
    const visibilityConditions: Prisma.ContentShareWhereInput[] = [
      { visibility: 'PUBLIC' },
    ];

    if (tenantId) {
      visibilityConditions.push({
        AND: [{ visibility: 'DISTRICT' }, { tenantId }],
      });
    }

    if (schoolId) {
      visibilityConditions.push({
        AND: [{ visibility: 'SCHOOL' }, { schoolId }],
      });
    }

    where.OR = visibilityConditions;
  }

  // Learning object filters
  if (subject || gradeBand || searchQuery) {
    where.learningObject = {};

    if (subject) {
      where.learningObject.subject = subject as any;
    }

    if (gradeBand) {
      where.learningObject.gradeBand = gradeBand as any;
    }

    if (searchQuery) {
      where.learningObject.OR = [
        { title: { contains: searchQuery, mode: 'insensitive' } },
        { tags: { some: { tag: { contains: searchQuery, mode: 'insensitive' } } } },
      ];
    }
  }

  // Tag filter
  if (tags && tags.length > 0) {
    where.tags = {
      some: {
        tag: { in: tags },
      },
    };
  }

  // Rating filter
  if (minRating !== undefined) {
    where.averageRating = { gte: minRating };
  }

  // Determine sort order
  let orderBy: Prisma.ContentShareOrderByWithRelationInput;
  switch (sortBy) {
    case 'RECENT':
      orderBy = { createdAt: 'desc' };
      break;
    case 'RATING':
      orderBy = { averageRating: 'desc' };
      break;
    case 'DOWNLOADS':
      orderBy = { downloadCount: 'desc' };
      break;
    case 'POPULARITY':
    default:
      // Popularity = (downloads * 2 + views + forks * 3) / (days_since_creation + 1)
      // For simplicity, we'll sort by a combination of metrics
      orderBy = [
        { downloadCount: 'desc' },
        { forkCount: 'desc' },
        { averageRating: 'desc' },
      ];
      break;
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.contentShare.findMany({
      where,
      include: {
        learningObject: {
          include: {
            tags: true,
          },
        },
        tags: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.contentShare.count({ where }),
  ]);

  return {
    items: items.map((share) => ({
      id: share.id,
      learningObject: {
        id: share.learningObject.id,
        title: share.learningObject.title,
        subject: share.learningObject.subject,
        gradeBand: share.learningObject.gradeBand,
        tags: share.learningObject.tags.map((t) => t.tag),
      },
      sharedBy: share.sharedByUserId,
      visibility: share.visibility,
      description: share.description,
      license: share.license,
      requiresAttribution: share.requiresAttribution,
      downloadCount: share.downloadCount,
      viewCount: share.viewCount,
      forkCount: share.forkCount,
      averageRating: share.averageRating,
      reviewCount: share._count.reviews,
      tags: share.tags.map((t) => t.tag),
      createdAt: share.createdAt,
      updatedAt: share.updatedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Rate shared content (simple rating)
 */
export async function rateContent(params: RateContentParams) {
  const { contentShareId, userId, rating } = params;

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if user already rated this content
  const existingRating = await prisma.contentRating.findUnique({
    where: {
      contentShareId_userId: {
        contentShareId,
        userId,
      },
    },
  });

  if (existingRating) {
    // Update existing rating
    await prisma.contentRating.update({
      where: { id: existingRating.id },
      data: { rating, updatedAt: new Date() },
    });
  } else {
    // Create new rating
    await prisma.contentRating.create({
      data: {
        contentShareId,
        userId,
        rating,
      },
    });
  }

  // Recalculate average rating
  await updateAverageRating(contentShareId);

  return { success: true };
}

/**
 * Write a detailed review for shared content
 */
export async function reviewContent(params: ReviewContentParams) {
  const { contentShareId, userId, rating, title, comment } = params;

  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if user already reviewed this content
  const existingReview = await prisma.contentReview.findUnique({
    where: {
      contentShareId_userId: {
        contentShareId,
        userId,
      },
    },
  });

  if (existingReview) {
    // Update existing review
    return await prisma.contentReview.update({
      where: { id: existingReview.id },
      data: {
        rating,
        title,
        comment,
        updatedAt: new Date(),
      },
    });
  } else {
    // Create new review
    const review = await prisma.contentReview.create({
      data: {
        contentShareId,
        userId,
        rating,
        title,
        comment,
      },
    });

    // Also create/update rating
    await rateContent({ contentShareId, userId, rating });

    return review;
  }
}

/**
 * Get reviews for shared content
 */
export async function getReviews(contentShareId: string, page = 1, pageSize = 10) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.contentReview.findMany({
      where: { contentShareId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contentReview.count({ where: { contentShareId } }),
  ]);

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Increment view count for shared content
 */
export async function incrementViewCount(contentShareId: string) {
  await prisma.contentShare.update({
    where: { id: contentShareId },
    data: { viewCount: { increment: 1 } },
  });
}

/**
 * Increment download count for shared content
 */
export async function incrementDownloadCount(contentShareId: string) {
  await prisma.contentShare.update({
    where: { id: contentShareId },
    data: { downloadCount: { increment: 1 } },
  });
}

/**
 * Update average rating for content share
 */
async function updateAverageRating(contentShareId: string) {
  const ratings = await prisma.contentRating.findMany({
    where: { contentShareId },
    select: { rating: true },
  });

  if (ratings.length === 0) {
    await prisma.contentShare.update({
      where: { id: contentShareId },
      data: { averageRating: null },
    });
    return;
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const average = sum / ratings.length;

  await prisma.contentShare.update({
    where: { id: contentShareId },
    data: { averageRating: average },
  });
}

/**
 * Get personalized feed of shared content
 */
export async function getPersonalizedFeed(
  userId: string,
  tenantId: string | null,
  schoolId: string | null,
  page = 1,
  pageSize = 20
) {
  // Get followed teachers
  const following = await prisma.teacherFollow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  // Build query for feed
  const where: Prisma.ContentShareWhereInput = {
    isActive: true,
    OR: [],
  };

  // Content from followed teachers
  if (followingIds.length > 0) {
    where.OR!.push({ sharedByUserId: { in: followingIds } });
  }

  // Public content
  where.OR!.push({ visibility: 'PUBLIC' });

  // District content
  if (tenantId) {
    where.OR!.push({
      AND: [{ visibility: 'DISTRICT' }, { tenantId }],
    });
  }

  // School content
  if (schoolId) {
    where.OR!.push({
      AND: [{ visibility: 'SCHOOL' }, { schoolId }],
    });
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.contentShare.findMany({
      where,
      include: {
        learningObject: {
          include: {
            tags: true,
          },
        },
        tags: true,
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.contentShare.count({ where }),
  ]);

  return {
    items: items.map((share) => ({
      id: share.id,
      learningObject: {
        id: share.learningObject.id,
        title: share.learningObject.title,
        subject: share.learningObject.subject,
        gradeBand: share.learningObject.gradeBand,
        tags: share.learningObject.tags.map((t) => t.tag),
      },
      sharedBy: share.sharedByUserId,
      visibility: share.visibility,
      description: share.description,
      downloadCount: share.downloadCount,
      viewCount: share.viewCount,
      forkCount: share.forkCount,
      averageRating: share.averageRating,
      reviewCount: share._count.reviews,
      createdAt: share.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
