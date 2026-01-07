/**
 * Post Service
 * Business logic for community posts
 */

import { prisma, PostCategory, UserRole } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreatePostInput {
  tenantId: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  authorSchool?: string;
  title: string;
  content: string;
  category?: PostCategory;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  category?: PostCategory;
}

export interface ListPostsOptions {
  tenantId: string;
  category?: PostCategory;
  authorId?: string;
  limit?: number;
  offset?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export const postService = {
  /**
   * Create a new post
   */
  async createPost(input: CreatePostInput) {
    return prisma.post.create({
      data: {
        tenantId: input.tenantId,
        authorId: input.authorId,
        authorName: input.authorName,
        authorRole: input.authorRole,
        authorSchool: input.authorSchool,
        title: input.title,
        content: input.content,
        category: input.category ?? 'GENERAL',
      },
    });
  },

  /**
   * Get post by ID
   */
  async getPostById(id: string, tenantId: string) {
    return prisma.post.findFirst({
      where: { id, tenantId, isPublished: true },
      include: {
        _count: {
          select: { comments: true, likes: true },
        },
      },
    });
  },

  /**
   * List posts with optional filtering
   */
  async listPosts(options: ListPostsOptions) {
    const { tenantId, category, authorId, limit = 20, offset = 0 } = options;

    const where = {
      tenantId,
      isPublished: true,
      ...(category && { category }),
      ...(authorId && { authorId }),
    };

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.post.count({ where }),
    ]);

    return { items, total, limit, offset };
  },

  /**
   * Update a post
   */
  async updatePost(id: string, tenantId: string, authorId: string, input: UpdatePostInput) {
    // Verify ownership
    const post = await prisma.post.findFirst({
      where: { id, tenantId, authorId },
    });

    if (!post) {
      return null;
    }

    return prisma.post.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Delete a post
   */
  async deletePost(id: string, tenantId: string, authorId: string) {
    const post = await prisma.post.findFirst({
      where: { id, tenantId, authorId },
    });

    if (!post) {
      return false;
    }

    await prisma.post.delete({ where: { id } });
    return true;
  },

  /**
   * Like a post
   */
  async likePost(postId: string, tenantId: string, userId: string) {
    // Check if already liked
    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (existingLike) {
      return { alreadyLiked: true };
    }

    // Create like and increment counter in transaction
    await prisma.$transaction([
      prisma.postLike.create({
        data: { tenantId, postId, userId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { success: true };
  },

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string) {
    const existingLike = await prisma.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });

    if (!existingLike) {
      return { notLiked: true };
    }

    await prisma.$transaction([
      prisma.postLike.delete({
        where: { postId_userId: { postId, userId } },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  },

  /**
   * Add a comment to a post
   */
  async addComment(
    postId: string,
    tenantId: string,
    authorId: string,
    authorName: string,
    authorRole: UserRole,
    content: string
  ) {
    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: {
          tenantId,
          postId,
          authorId,
          authorName,
          authorRole,
          content,
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);

    return comment;
  },

  /**
   * Get comments for a post
   */
  async getComments(postId: string, tenantId: string, limit = 50, offset = 0) {
    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where: { postId, tenantId },
        orderBy: { createdAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      prisma.comment.count({ where: { postId, tenantId } }),
    ]);

    return { items, total };
  },

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, tenantId: string, authorId: string) {
    const comment = await prisma.comment.findFirst({
      where: { id: commentId, tenantId, authorId },
    });

    if (!comment) {
      return false;
    }

    await prisma.$transaction([
      prisma.comment.delete({ where: { id: commentId } }),
      prisma.post.update({
        where: { id: comment.postId },
        data: { commentsCount: { decrement: 1 } },
      }),
    ]);

    return true;
  },
};
