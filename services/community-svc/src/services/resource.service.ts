/**
 * Resource Service
 * Business logic for shared resources (lesson plans, worksheets, etc.)
 */

import { prisma, ResourceType } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateResourceInput {
  tenantId: string;
  authorId: string;
  authorName: string;
  title: string;
  description?: string;
  type: ResourceType;
  subject?: string;
  gradeLevel?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
}

export interface UpdateResourceInput {
  title?: string;
  description?: string;
  type?: ResourceType;
  subject?: string;
  gradeLevel?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  thumbnailUrl?: string;
}

export interface ListResourcesOptions {
  tenantId: string;
  type?: ResourceType;
  subject?: string;
  gradeLevel?: string;
  authorId?: string;
  limit?: number;
  offset?: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export const resourceService = {
  /**
   * Create a new resource
   */
  async createResource(input: CreateResourceInput) {
    return prisma.sharedResource.create({
      data: {
        tenantId: input.tenantId,
        authorId: input.authorId,
        authorName: input.authorName,
        title: input.title,
        description: input.description,
        type: input.type,
        subject: input.subject,
        gradeLevel: input.gradeLevel,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        thumbnailUrl: input.thumbnailUrl,
      },
    });
  },

  /**
   * Get resource by ID
   */
  async getResourceById(id: string, tenantId: string) {
    return prisma.sharedResource.findFirst({
      where: { id, tenantId, isPublished: true },
      include: {
        _count: {
          select: { likes: true },
        },
      },
    });
  },

  /**
   * List resources with optional filtering
   */
  async listResources(options: ListResourcesOptions) {
    const { tenantId, type, subject, gradeLevel, authorId, limit = 20, offset = 0 } = options;

    const where = {
      tenantId,
      isPublished: true,
      ...(type && { type }),
      ...(subject && { subject }),
      ...(gradeLevel && { gradeLevel }),
      ...(authorId && { authorId }),
    };

    const [items, total] = await Promise.all([
      prisma.sharedResource.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.sharedResource.count({ where }),
    ]);

    return { items, total, limit, offset };
  },

  /**
   * Update a resource
   */
  async updateResource(
    id: string,
    tenantId: string,
    authorId: string,
    input: UpdateResourceInput
  ) {
    const resource = await prisma.sharedResource.findFirst({
      where: { id, tenantId, authorId },
    });

    if (!resource) {
      return null;
    }

    return prisma.sharedResource.update({
      where: { id },
      data: input,
    });
  },

  /**
   * Delete a resource
   */
  async deleteResource(id: string, tenantId: string, authorId: string) {
    const resource = await prisma.sharedResource.findFirst({
      where: { id, tenantId, authorId },
    });

    if (!resource) {
      return false;
    }

    await prisma.sharedResource.delete({ where: { id } });
    return true;
  },

  /**
   * Like a resource
   */
  async likeResource(resourceId: string, tenantId: string, userId: string) {
    const existingLike = await prisma.resourceLike.findUnique({
      where: { resourceId_userId: { resourceId, userId } },
    });

    if (existingLike) {
      return { alreadyLiked: true };
    }

    await prisma.$transaction([
      prisma.resourceLike.create({
        data: { tenantId, resourceId, userId },
      }),
      prisma.sharedResource.update({
        where: { id: resourceId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { success: true };
  },

  /**
   * Unlike a resource
   */
  async unlikeResource(resourceId: string, userId: string) {
    const existingLike = await prisma.resourceLike.findUnique({
      where: { resourceId_userId: { resourceId, userId } },
    });

    if (!existingLike) {
      return { notLiked: true };
    }

    await prisma.$transaction([
      prisma.resourceLike.delete({
        where: { resourceId_userId: { resourceId, userId } },
      }),
      prisma.sharedResource.update({
        where: { id: resourceId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { success: true };
  },

  /**
   * Increment download count
   */
  async incrementDownload(resourceId: string) {
    await prisma.sharedResource.update({
      where: { id: resourceId },
      data: { downloadCount: { increment: 1 } },
    });
  },
};
