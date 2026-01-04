/**
 * Teacher Community Service
 *
 * Handles teacher community features including:
 * - Teacher profiles with content portfolios
 * - Following other teachers
 * - Teacher content feeds
 * - Content recommendations based on grade/subject
 * - Collections/playlists of content
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';

export interface TeacherProfileParams {
  userId: string;
  displayName?: string;
  bio?: string;
  school?: string;
  district?: string;
  subjects?: string[];
  gradeBands?: string[];
  avatarUrl?: string;
}

export interface CreateCollectionParams {
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  tags?: string[];
}

export interface AddToCollectionParams {
  collectionId: string;
  contentShareId: string;
  userId: string;
  notes?: string;
}

export interface DiscoverTeachersParams {
  subject?: string;
  gradeBand?: string;
  school?: string;
  district?: string;
  searchQuery?: string;
  sortBy?: 'POPULAR' | 'ACTIVE' | 'RECENT';
  page?: number;
  pageSize?: number;
}

/**
 * Get or create teacher profile
 */
export async function getOrCreateTeacherProfile(userId: string) {
  let profile = await prisma.teacherProfile.findUnique({
    where: { userId },
    include: {
      _count: {
        select: {
          sharedContent: true,
          followers: true,
          following: true,
          collections: true,
        },
      },
    },
  });

  if (!profile) {
    profile = await prisma.teacherProfile.create({
      data: {
        userId,
        displayName: null,
        bio: null,
        school: null,
        district: null,
        subjects: [],
        gradeBands: [],
        avatarUrl: null,
      },
      include: {
        _count: {
          select: {
            sharedContent: true,
            followers: true,
            following: true,
            collections: true,
          },
        },
      },
    });
  }

  return profile;
}

/**
 * Update teacher profile
 */
export async function updateTeacherProfile(params: TeacherProfileParams) {
  const { userId, ...updateData } = params;

  await getOrCreateTeacherProfile(userId);

  return await prisma.teacherProfile.update({
    where: { userId },
    data: {
      ...updateData,
      updatedAt: new Date(),
    },
    include: {
      _count: {
        select: {
          sharedContent: true,
          followers: true,
          following: true,
          collections: true,
        },
      },
    },
  });
}

/**
 * Get teacher profile with stats
 */
export async function getTeacherProfile(userId: string) {
  const profile = await getOrCreateTeacherProfile(userId);

  // Get additional stats
  const [totalDownloads, totalViews, averageRating] = await Promise.all([
    prisma.contentShare
      .aggregate({
        where: { sharedByUserId: userId },
        _sum: { downloadCount: true },
      })
      .then((result) => result._sum.downloadCount || 0),
    prisma.contentShare
      .aggregate({
        where: { sharedByUserId: userId },
        _sum: { viewCount: true },
      })
      .then((result) => result._sum.viewCount || 0),
    prisma.contentShare
      .aggregate({
        where: { sharedByUserId: userId, averageRating: { not: null } },
        _avg: { averageRating: true },
      })
      .then((result) => result._avg.averageRating || null),
  ]);

  return {
    ...profile,
    stats: {
      sharedContentCount: profile._count.sharedContent,
      followerCount: profile._count.followers,
      followingCount: profile._count.following,
      collectionCount: profile._count.collections,
      totalDownloads,
      totalViews,
      averageRating,
    },
  };
}

/**
 * Get teacher's shared content
 */
export async function getTeacherContent(
  userId: string,
  options: { page?: number; pageSize?: number; includePrivate?: boolean } = {}
) {
  const { page = 1, pageSize = 20, includePrivate = false } = options;

  const where: Prisma.ContentShareWhereInput = {
    sharedByUserId: userId,
    isActive: true,
  };

  if (!includePrivate) {
    where.visibility = { not: 'PRIVATE' };
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

/**
 * Follow a teacher
 */
export async function followTeacher(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  // Ensure both profiles exist
  await Promise.all([
    getOrCreateTeacherProfile(followerId),
    getOrCreateTeacherProfile(followingId),
  ]);

  // Check if already following
  const existing = await prisma.teacherFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return await prisma.teacherFollow.create({
    data: {
      followerId,
      followingId,
    },
  });
}

/**
 * Unfollow a teacher
 */
export async function unfollowTeacher(followerId: string, followingId: string) {
  await prisma.teacherFollow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });

  return { success: true };
}

/**
 * Check if following a teacher
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const follow = await prisma.teacherFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  return !!follow;
}

/**
 * Get list of teachers user is following
 */
export async function getFollowing(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.teacherFollow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          include: {
            _count: {
              select: {
                sharedContent: true,
                followers: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.teacherFollow.count({ where: { followerId: userId } }),
  ]);

  return {
    items: items.map((follow) => ({
      userId: follow.following.userId,
      displayName: follow.following.displayName,
      bio: follow.following.bio,
      school: follow.following.school,
      district: follow.following.district,
      subjects: follow.following.subjects,
      gradeBands: follow.following.gradeBands,
      avatarUrl: follow.following.avatarUrl,
      contentCount: follow.following._count.sharedContent,
      followerCount: follow.following._count.followers,
      followedAt: follow.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get list of followers
 */
export async function getFollowers(userId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.teacherFollow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          include: {
            _count: {
              select: {
                sharedContent: true,
                followers: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.teacherFollow.count({ where: { followingId: userId } }),
  ]);

  return {
    items: items.map((follow) => ({
      userId: follow.follower.userId,
      displayName: follow.follower.displayName,
      bio: follow.follower.bio,
      school: follow.follower.school,
      district: follow.follower.district,
      subjects: follow.follower.subjects,
      gradeBands: follow.follower.gradeBands,
      avatarUrl: follow.follower.avatarUrl,
      contentCount: follow.follower._count.sharedContent,
      followerCount: follow.follower._count.followers,
      followedAt: follow.createdAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Discover teachers by subject/grade
 */
export async function discoverTeachers(params: DiscoverTeachersParams) {
  const {
    subject,
    gradeBand,
    school,
    district,
    searchQuery,
    sortBy = 'POPULAR',
    page = 1,
    pageSize = 20,
  } = params;

  const where: Prisma.TeacherProfileWhereInput = {};

  if (subject) {
    where.subjects = { has: subject };
  }

  if (gradeBand) {
    where.gradeBands = { has: gradeBand };
  }

  if (school) {
    where.school = { contains: school, mode: 'insensitive' };
  }

  if (district) {
    where.district = { contains: district, mode: 'insensitive' };
  }

  if (searchQuery) {
    where.OR = [
      { displayName: { contains: searchQuery, mode: 'insensitive' } },
      { bio: { contains: searchQuery, mode: 'insensitive' } },
    ];
  }

  let orderBy: Prisma.TeacherProfileOrderByWithRelationInput;
  switch (sortBy) {
    case 'RECENT':
      orderBy = { createdAt: 'desc' };
      break;
    case 'ACTIVE':
      orderBy = { updatedAt: 'desc' };
      break;
    case 'POPULAR':
    default:
      orderBy = { followers: { _count: 'desc' } };
      break;
  }

  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.teacherProfile.findMany({
      where,
      include: {
        _count: {
          select: {
            sharedContent: true,
            followers: true,
          },
        },
      },
      orderBy,
      skip,
      take: pageSize,
    }),
    prisma.teacherProfile.count({ where }),
  ]);

  return {
    items: items.map((profile) => ({
      userId: profile.userId,
      displayName: profile.displayName,
      bio: profile.bio,
      school: profile.school,
      district: profile.district,
      subjects: profile.subjects,
      gradeBands: profile.gradeBands,
      avatarUrl: profile.avatarUrl,
      contentCount: profile._count.sharedContent,
      followerCount: profile._count.followers,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Create a content collection
 */
export async function createCollection(params: CreateCollectionParams) {
  const { userId, name, description, isPublic, tags } = params;

  // Ensure profile exists
  await getOrCreateTeacherProfile(userId);

  const collection = await prisma.contentCollection.create({
    data: {
      userId,
      name,
      description,
      isPublic,
    },
  });

  // Add tags if provided
  if (tags && tags.length > 0) {
    await prisma.collectionTag.createMany({
      data: tags.map((tag) => ({
        collectionId: collection.id,
        tag,
      })),
    });
  }

  return collection;
}

/**
 * Add content to collection
 */
export async function addToCollection(params: AddToCollectionParams) {
  const { collectionId, contentShareId, userId, notes } = params;

  // Verify collection belongs to user
  const collection = await prisma.contentCollection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error('Collection not found');
  }

  if (collection.userId !== userId) {
    throw new Error('You do not own this collection');
  }

  // Check if content is already in collection
  const existing = await prisma.collectionItem.findUnique({
    where: {
      collectionId_contentShareId: {
        collectionId,
        contentShareId,
      },
    },
  });

  if (existing) {
    // Update notes if provided
    if (notes !== undefined) {
      return await prisma.collectionItem.update({
        where: { id: existing.id },
        data: { notes },
      });
    }
    return existing;
  }

  // Add to collection
  return await prisma.collectionItem.create({
    data: {
      collectionId,
      contentShareId,
      notes,
    },
  });
}

/**
 * Remove content from collection
 */
export async function removeFromCollection(
  collectionId: string,
  contentShareId: string,
  userId: string
) {
  // Verify collection belongs to user
  const collection = await prisma.contentCollection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new Error('Collection not found');
  }

  if (collection.userId !== userId) {
    throw new Error('You do not own this collection');
  }

  await prisma.collectionItem.deleteMany({
    where: {
      collectionId,
      contentShareId,
    },
  });

  return { success: true };
}

/**
 * Get user's collections
 */
export async function getUserCollections(userId: string, includePrivate = true) {
  const where: Prisma.ContentCollectionWhereInput = { userId };

  if (!includePrivate) {
    where.isPublic = true;
  }

  const collections = await prisma.contentCollection.findMany({
    where,
    include: {
      _count: {
        select: {
          items: true,
        },
      },
      tags: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return collections.map((collection) => ({
    id: collection.id,
    name: collection.name,
    description: collection.description,
    isPublic: collection.isPublic,
    itemCount: collection._count.items,
    tags: collection.tags.map((t) => t.tag),
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt,
  }));
}

/**
 * Get collection items
 */
export async function getCollectionItems(collectionId: string, page = 1, pageSize = 20) {
  const skip = (page - 1) * pageSize;

  const [items, total] = await Promise.all([
    prisma.collectionItem.findMany({
      where: { collectionId },
      include: {
        contentShare: {
          include: {
            learningObject: {
              include: {
                tags: true,
              },
            },
          },
        },
      },
      orderBy: { addedAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.collectionItem.count({ where: { collectionId } }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      contentShare: {
        id: item.contentShare.id,
        learningObject: {
          id: item.contentShare.learningObject.id,
          title: item.contentShare.learningObject.title,
          subject: item.contentShare.learningObject.subject,
          gradeBand: item.contentShare.learningObject.gradeBand,
          tags: item.contentShare.learningObject.tags.map((t) => t.tag),
        },
        visibility: item.contentShare.visibility,
        downloadCount: item.contentShare.downloadCount,
        averageRating: item.contentShare.averageRating,
      },
      notes: item.notes,
      addedAt: item.addedAt,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get content recommendations for a user based on their profile
 */
export async function getRecommendedContent(
  userId: string,
  page = 1,
  pageSize = 20
) {
  const profile = await getOrCreateTeacherProfile(userId);

  const where: Prisma.ContentShareWhereInput = {
    isActive: true,
    visibility: { in: ['PUBLIC', 'DISTRICT'] },
    sharedByUserId: { not: userId }, // Exclude own content
  };

  // Filter by user's subjects and grade bands if set
  if (profile.subjects.length > 0 || profile.gradeBands.length > 0) {
    where.learningObject = {};

    if (profile.subjects.length > 0) {
      where.learningObject.subject = { in: profile.subjects as any };
    }

    if (profile.gradeBands.length > 0) {
      where.learningObject.gradeBand = { in: profile.gradeBands as any };
    }
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
        _count: {
          select: {
            reviews: true,
          },
        },
      },
      orderBy: [
        { averageRating: 'desc' },
        { downloadCount: 'desc' },
        { createdAt: 'desc' },
      ],
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
