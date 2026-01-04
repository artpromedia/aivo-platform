/**
 * Lesson Builder Service
 *
 * Manages lesson templates, blocks, versioning, and AI-assisted content
 */

import { prisma } from '../prisma.js';
import type {
  LessonBlock,
  BlockType,
  LessonVersion,
  LessonPreviewMode
} from '../types/lesson-builder.js';

// ══════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateLessonInput {
  tenantId: string | null;
  title: string;
  description?: string;
  subject: string;
  gradeBand: string;
  createdByUserId: string;
  templateId?: string;
}

export interface UpdateLessonInput {
  title?: string;
  description?: string;
  subject?: string;
  gradeBand?: string;
  isPublished?: boolean;
}

export interface CreateBlockInput {
  type: BlockType;
  position: number;
  content: Record<string, any>;
  settings?: Record<string, any>;
}

export interface UpdateBlockInput {
  type?: BlockType;
  content?: Record<string, any>;
  settings?: Record<string, any>;
}

export interface ReorderBlocksInput {
  blockOrders: Array<{ blockId: string; position: number }>;
}

export interface LessonPreview {
  lessonId: string;
  title: string;
  description?: string;
  blocks: LessonBlock[];
  mode: LessonPreviewMode;
  metadata: {
    subject: string;
    gradeBand: string;
    totalBlocks: number;
    estimatedDuration: number;
    version: number;
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class LessonBuilderService {
  /**
   * Create a new lesson with initial version
   */
  static async createLesson(input: CreateLessonInput) {
    const lesson = await prisma.$transaction(async (tx) => {
      // Create lesson
      const newLesson = await tx.lesson.create({
        data: {
          tenantId: input.tenantId,
          title: input.title,
          description: input.description,
          subject: input.subject,
          gradeBand: input.gradeBand,
          createdByUserId: input.createdByUserId,
          isPublished: false,
        },
      });

      // Create initial version
      const version = await tx.lessonVersion.create({
        data: {
          lessonId: newLesson.id,
          versionNumber: 1,
          isDraft: true,
          createdByUserId: input.createdByUserId,
        },
      });

      // If template provided, copy blocks from template
      if (input.templateId) {
        await this.copyBlocksFromTemplate(tx, input.templateId, version.id);
      }

      return { ...newLesson, currentVersion: version };
    });

    return lesson;
  }

  /**
   * Get lesson by ID with current version and blocks
   */
  static async getLesson(lessonId: string, includeBlocks = true) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: includeBlocks
            ? {
                blocks: {
                  orderBy: { position: 'asc' },
                },
              }
            : false,
        },
      },
    });

    if (!lesson) {
      return null;
    }

    return {
      ...lesson,
      currentVersion: lesson.versions[0] || null,
    };
  }

  /**
   * Update lesson metadata
   */
  static async updateLesson(lessonId: string, input: UpdateLessonInput) {
    const lesson = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        title: input.title,
        description: input.description,
        subject: input.subject,
        gradeBand: input.gradeBand,
        isPublished: input.isPublished,
        updatedAt: new Date(),
      },
    });

    return lesson;
  }

  /**
   * Delete lesson (soft delete)
   */
  static async deleteLesson(lessonId: string) {
    await prisma.lesson.update({
      where: { id: lessonId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Duplicate/copy a lesson
   */
  static async duplicateLesson(
    lessonId: string,
    createdByUserId: string,
    newTitle?: string
  ) {
    const originalLesson = await this.getLesson(lessonId, true);
    if (!originalLesson) {
      throw new Error('Original lesson not found');
    }

    const duplicate = await prisma.$transaction(async (tx) => {
      // Create new lesson
      const newLesson = await tx.lesson.create({
        data: {
          tenantId: originalLesson.tenantId,
          title: newTitle || `${originalLesson.title} (Copy)`,
          description: originalLesson.description,
          subject: originalLesson.subject,
          gradeBand: originalLesson.gradeBand,
          createdByUserId,
          isPublished: false,
        },
      });

      // Create version
      const version = await tx.lessonVersion.create({
        data: {
          lessonId: newLesson.id,
          versionNumber: 1,
          isDraft: true,
          createdByUserId,
        },
      });

      // Copy blocks
      const blocks = originalLesson.currentVersion?.blocks || [];
      for (const block of blocks) {
        await tx.lessonBlock.create({
          data: {
            versionId: version.id,
            type: block.type,
            position: block.position,
            content: block.content as any,
            settings: block.settings as any,
          },
        });
      }

      return newLesson;
    });

    return duplicate;
  }

  /**
   * Add a block to a lesson
   */
  static async addBlock(versionId: string, input: CreateBlockInput) {
    // Shift positions of blocks after insertion point
    await prisma.lessonBlock.updateMany({
      where: {
        versionId,
        position: { gte: input.position },
      },
      data: {
        position: { increment: 1 },
      },
    });

    const block = await prisma.lessonBlock.create({
      data: {
        versionId,
        type: input.type,
        position: input.position,
        content: input.content as any,
        settings: input.settings as any,
      },
    });

    return block;
  }

  /**
   * Update a block
   */
  static async updateBlock(blockId: string, input: UpdateBlockInput) {
    const block = await prisma.lessonBlock.update({
      where: { id: blockId },
      data: {
        type: input.type,
        content: input.content as any,
        settings: input.settings as any,
        updatedAt: new Date(),
      },
    });

    return block;
  }

  /**
   * Delete a block
   */
  static async deleteBlock(blockId: string) {
    const block = await prisma.lessonBlock.findUnique({
      where: { id: blockId },
      select: { versionId: true, position: true },
    });

    if (!block) {
      throw new Error('Block not found');
    }

    await prisma.$transaction([
      // Delete the block
      prisma.lessonBlock.delete({
        where: { id: blockId },
      }),
      // Shift remaining blocks
      prisma.lessonBlock.updateMany({
        where: {
          versionId: block.versionId,
          position: { gt: block.position },
        },
        data: {
          position: { decrement: 1 },
        },
      }),
    ]);
  }

  /**
   * Reorder blocks
   */
  static async reorderBlocks(versionId: string, input: ReorderBlocksInput) {
    await prisma.$transaction(
      input.blockOrders.map(({ blockId, position }) =>
        prisma.lessonBlock.update({
          where: { id: blockId },
          data: { position },
        })
      )
    );

    const blocks = await prisma.lessonBlock.findMany({
      where: { versionId },
      orderBy: { position: 'asc' },
    });

    return blocks;
  }

  /**
   * Generate lesson preview
   */
  static async generatePreview(
    lessonId: string,
    mode: LessonPreviewMode = 'desktop'
  ): Promise<LessonPreview> {
    const lesson = await this.getLesson(lessonId, true);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const blocks = lesson.currentVersion?.blocks || [];
    const estimatedDuration = this.calculateEstimatedDuration(blocks);

    return {
      lessonId: lesson.id,
      title: lesson.title,
      description: lesson.description || undefined,
      blocks: blocks as LessonBlock[],
      mode,
      metadata: {
        subject: lesson.subject,
        gradeBand: lesson.gradeBand,
        totalBlocks: blocks.length,
        estimatedDuration,
        version: lesson.currentVersion?.versionNumber || 1,
      },
    };
  }

  /**
   * Publish a lesson (creates new version)
   */
  static async publishLesson(lessonId: string, userId: string) {
    const lesson = await this.getLesson(lessonId, true);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const currentVersion = lesson.currentVersion;
    if (!currentVersion) {
      throw new Error('No version to publish');
    }

    const published = await prisma.$transaction(async (tx) => {
      // Mark current version as published
      await tx.lessonVersion.update({
        where: { id: currentVersion.id },
        data: {
          isDraft: false,
          publishedAt: new Date(),
        },
      });

      // Create new draft version for future edits
      const newVersion = await tx.lessonVersion.create({
        data: {
          lessonId,
          versionNumber: currentVersion.versionNumber + 1,
          isDraft: true,
          createdByUserId: userId,
        },
      });

      // Copy blocks to new version
      const blocks = await tx.lessonBlock.findMany({
        where: { versionId: currentVersion.id },
        orderBy: { position: 'asc' },
      });

      for (const block of blocks) {
        await tx.lessonBlock.create({
          data: {
            versionId: newVersion.id,
            type: block.type,
            position: block.position,
            content: block.content as any,
            settings: block.settings as any,
          },
        });
      }

      // Mark lesson as published
      await tx.lesson.update({
        where: { id: lessonId },
        data: { isPublished: true },
      });

      return newVersion;
    });

    return published;
  }

  /**
   * Get lesson templates
   */
  static async getTemplates(tenantId: string | null) {
    const templates = await prisma.lessonTemplate.findMany({
      where: {
        OR: [{ tenantId }, { tenantId: null }],
      },
      include: {
        blocks: {
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates;
  }

  /**
   * AI-assisted content suggestions
   */
  static async generateContentSuggestions(
    lessonId: string,
    blockType: BlockType,
    context?: string
  ): Promise<any> {
    // Mock implementation - in production, integrate with AI service
    const suggestions = {
      text: [
        { content: 'Introduction to the topic...' },
        { content: 'Key concepts include...' },
        { content: 'Practice exercise: ...' },
      ],
      quiz: [
        {
          question: 'What is the main idea?',
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
        },
      ],
      activity: [
        {
          title: 'Group Discussion',
          instructions: 'Discuss the following questions in small groups...',
        },
      ],
    };

    return suggestions[blockType] || [];
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ════════════════════════════════════════════════════════════════════════════

  private static async copyBlocksFromTemplate(
    tx: any,
    templateId: string,
    versionId: string
  ) {
    const templateBlocks = await tx.lessonTemplateBlock.findMany({
      where: { templateId },
      orderBy: { position: 'asc' },
    });

    for (const block of templateBlocks) {
      await tx.lessonBlock.create({
        data: {
          versionId,
          type: block.type,
          position: block.position,
          content: block.content,
          settings: block.settings,
        },
      });
    }
  }

  private static calculateEstimatedDuration(blocks: any[]): number {
    // Estimate reading time based on block types
    const durations: Record<string, number> = {
      TEXT_PARAGRAPH: 2,
      TEXT_HEADING: 0.5,
      TEXT_LIST: 2,
      TEXT_QUOTE: 1,
      MEDIA_IMAGE: 1,
      MEDIA_VIDEO: 5,
      MEDIA_AUDIO: 3,
      QUIZ: 3,
      POLL: 2,
      FLASHCARD: 2,
      ACTIVITY_WORKSHEET: 10,
      ACTIVITY_ASSIGNMENT: 15,
      ACTIVITY_DISCUSSION: 10,
    };

    return blocks.reduce((total, block) => {
      return total + (durations[block.type] || 2);
    }, 0);
  }
}
