/**
 * Lesson Builder Service
 *
 * Manages lesson templates, blocks, versioning, and AI-assisted content
 *
 * NOTE: This service maps lesson concepts to the LearningObject schema:
 * - Lesson -> LearningObject
 * - LessonVersion -> LearningObjectVersion
 * - LessonBlock -> stored in LearningObjectVersion.contentJson
 */

import { prisma, type TransactionClient } from '../prisma.js';
import type {
  LessonBlock,
  BlockType,
  LessonPreviewMode
} from '../types/lesson-builder.js';
import { randomUUID } from 'crypto';

// ══════════════════════════════════════════════════════════════════════════════
// HELPER TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ContentJson {
  blocks: LessonBlock[];
  description?: string;
  [key: string]: unknown;
}

// Helper to parse contentJson
function parseContentJson(contentJson: unknown): ContentJson {
  if (typeof contentJson === 'object' && contentJson !== null) {
    const content = contentJson as Record<string, unknown>;
    return {
      ...content,
      blocks: Array.isArray(content.blocks) ? content.blocks : [],
    };
  }
  return { blocks: [] };
}

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
   * Maps to LearningObject + LearningObjectVersion
   */
  static async createLesson(input: CreateLessonInput) {
    const lesson = await prisma.$transaction(async (tx: TransactionClient) => {
      // Generate a slug from the title
      const slug = input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Create learning object (lesson)
      const newLesson = await tx.learningObject.create({
        data: {
          tenantId: input.tenantId,
          title: input.title,
          slug: `${slug}-${Date.now()}`,
          subject: input.subject.toUpperCase(),
          gradeBand: input.gradeBand.toUpperCase().replace('-', '_'),
          createdByUserId: input.createdByUserId,
          isActive: false, // Not published yet
        },
      });

      // Create initial version with description in contentJson
      const version = await tx.learningObjectVersion.create({
        data: {
          learningObjectId: newLesson.id,
          versionNumber: 1,
          state: 'DRAFT',
          createdByUserId: input.createdByUserId,
          contentJson: {
            blocks: [],
            description: input.description || '',
          },
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
   * Maps to LearningObject with LearningObjectVersion
   */
  static async getLesson(lessonId: string, includeBlocks = true) {
    const lesson = await prisma.learningObject.findUnique({
      where: { id: lessonId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!lesson) {
      return null;
    }

    const latestVersion = lesson.versions[0] || null;

    // Parse blocks from contentJson if requested
    let currentVersion = latestVersion;
    if (latestVersion && includeBlocks) {
      const contentData = parseContentJson(latestVersion.contentJson);
      // Sort blocks by position
      const blocks = contentData.blocks.sort((a: LessonBlock, b: LessonBlock) => a.position - b.position);
      currentVersion = {
        ...latestVersion,
        blocks,
        description: contentData.description,
      };
    }

    return {
      ...lesson,
      description: currentVersion?.description || '',
      isPublished: lesson.isActive,
      currentVersion,
    };
  }

  /**
   * Update lesson metadata
   * Maps to LearningObject update
   */
  static async updateLesson(lessonId: string, input: UpdateLessonInput) {
    // Update description in the latest version's contentJson if provided
    if (input.description !== undefined) {
      const versions = await prisma.learningObjectVersion.findMany({
        where: { learningObjectId: lessonId },
        orderBy: { versionNumber: 'desc' },
        take: 1,
      });

      if (versions[0]) {
        const contentData = parseContentJson(versions[0].contentJson);
        await prisma.learningObjectVersion.update({
          where: { id: versions[0].id },
          data: {
            contentJson: {
              ...contentData,
              description: input.description,
            },
          },
        });
      }
    }

    const lesson = await prisma.learningObject.update({
      where: { id: lessonId },
      data: {
        title: input.title,
        subject: input.subject?.toUpperCase(),
        gradeBand: input.gradeBand?.toUpperCase().replace('-', '_'),
        isActive: input.isPublished,
        updatedAt: new Date(),
      },
    });

    return lesson;
  }

  /**
   * Delete lesson (soft delete via isActive flag)
   * Maps to LearningObject.isActive = false
   */
  static async deleteLesson(lessonId: string) {
    await prisma.learningObject.update({
      where: { id: lessonId },
      data: { isActive: false },
    });
  }

  /**
   * Duplicate/copy a lesson
   * Maps to LearningObject + LearningObjectVersion duplication
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

    const duplicate = await prisma.$transaction(async (tx: TransactionClient) => {
      const title = newTitle || `${originalLesson.title} (Copy)`;
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      // Create new learning object
      const newLesson = await tx.learningObject.create({
        data: {
          tenantId: originalLesson.tenantId,
          title,
          slug: `${slug}-${Date.now()}`,
          subject: originalLesson.subject,
          gradeBand: originalLesson.gradeBand,
          createdByUserId,
          isActive: false,
        },
      });

      // Copy blocks from original version
      const blocks = originalLesson.currentVersion?.blocks || [];
      const copiedBlocks = blocks.map((block: LessonBlock) => ({
        id: randomUUID(),
        type: block.type,
        position: block.position,
        content: block.content,
        settings: block.settings,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      // Create version with copied blocks in contentJson
      await tx.learningObjectVersion.create({
        data: {
          learningObjectId: newLesson.id,
          versionNumber: 1,
          state: 'DRAFT',
          createdByUserId,
          contentJson: {
            blocks: copiedBlocks,
            description: originalLesson.description || '',
          },
        },
      });

      return newLesson;
    });

    return duplicate;
  }

  /**
   * Add a block to a lesson version
   * Blocks are stored in LearningObjectVersion.contentJson
   */
  static async addBlock(versionId: string, input: CreateBlockInput) {
    // Get current version with contentJson
    const version = await prisma.learningObjectVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    const contentData = parseContentJson(version.contentJson);

    // Shift positions of blocks after insertion point
    const updatedBlocks = contentData.blocks.map((block: LessonBlock) => {
      if (block.position >= input.position) {
        return { ...block, position: block.position + 1 };
      }
      return block;
    });

    // Create new block
    const newBlock: LessonBlock = {
      id: randomUUID(),
      versionId,
      type: input.type,
      position: input.position,
      content: input.content,
      settings: input.settings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to blocks array and sort by position
    updatedBlocks.push(newBlock);
    updatedBlocks.sort((a: LessonBlock, b: LessonBlock) => a.position - b.position);

    // Update contentJson
    await prisma.learningObjectVersion.update({
      where: { id: versionId },
      data: {
        contentJson: {
          ...contentData,
          blocks: updatedBlocks,
        },
      },
    });

    return newBlock;
  }

  /**
   * Update a block
   * Finds and updates the block within contentJson
   */
  static async updateBlock(blockId: string, input: UpdateBlockInput) {
    // Find the version containing this block
    const versions = await prisma.learningObjectVersion.findMany({});

    let targetVersion = null;
    let targetBlock: LessonBlock | null = null;

    for (const version of versions) {
      const contentData = parseContentJson(version.contentJson);
      const block = contentData.blocks.find((b: LessonBlock) => b.id === blockId);
      if (block) {
        targetVersion = version;
        targetBlock = block;
        break;
      }
    }

    if (!targetVersion || !targetBlock) {
      throw new Error('Block not found');
    }

    const contentData = parseContentJson(targetVersion.contentJson);

    // Update the block
    const updatedBlocks = contentData.blocks.map((block: LessonBlock) => {
      if (block.id === blockId) {
        return {
          ...block,
          type: input.type ?? block.type,
          content: input.content ?? block.content,
          settings: input.settings ?? block.settings,
          updatedAt: new Date(),
        };
      }
      return block;
    });

    // Update contentJson
    await prisma.learningObjectVersion.update({
      where: { id: targetVersion.id },
      data: {
        contentJson: {
          ...contentData,
          blocks: updatedBlocks,
        },
      },
    });

    return updatedBlocks.find((b: LessonBlock) => b.id === blockId);
  }

  /**
   * Delete a block
   * Removes the block from contentJson and shifts positions
   */
  static async deleteBlock(blockId: string) {
    // Find the version containing this block
    const versions = await prisma.learningObjectVersion.findMany({});

    let targetVersion = null;
    let targetBlock: LessonBlock | null = null;

    for (const version of versions) {
      const contentData = parseContentJson(version.contentJson);
      const block = contentData.blocks.find((b: LessonBlock) => b.id === blockId);
      if (block) {
        targetVersion = version;
        targetBlock = block;
        break;
      }
    }

    if (!targetVersion || !targetBlock) {
      throw new Error('Block not found');
    }

    const contentData = parseContentJson(targetVersion.contentJson);
    const deletedPosition = targetBlock.position;

    // Remove the block and shift remaining positions
    const updatedBlocks = contentData.blocks
      .filter((block: LessonBlock) => block.id !== blockId)
      .map((block: LessonBlock) => {
        if (block.position > deletedPosition) {
          return { ...block, position: block.position - 1 };
        }
        return block;
      });

    // Update contentJson
    await prisma.learningObjectVersion.update({
      where: { id: targetVersion.id },
      data: {
        contentJson: {
          ...contentData,
          blocks: updatedBlocks,
        },
      },
    });
  }

  /**
   * Reorder blocks
   * Updates block positions in contentJson
   */
  static async reorderBlocks(versionId: string, input: ReorderBlocksInput) {
    const version = await prisma.learningObjectVersion.findUnique({
      where: { id: versionId },
    });

    if (!version) {
      throw new Error('Version not found');
    }

    const contentData = parseContentJson(version.contentJson);

    // Create a map of blockId -> new position
    const positionMap = new Map(
      input.blockOrders.map(({ blockId, position }) => [blockId, position])
    );

    // Update block positions
    const updatedBlocks = contentData.blocks.map((block: LessonBlock) => {
      const newPosition = positionMap.get(block.id);
      if (newPosition !== undefined) {
        return { ...block, position: newPosition };
      }
      return block;
    });

    // Sort by position
    updatedBlocks.sort((a: LessonBlock, b: LessonBlock) => a.position - b.position);

    // Update contentJson
    await prisma.learningObjectVersion.update({
      where: { id: versionId },
      data: {
        contentJson: {
          ...contentData,
          blocks: updatedBlocks,
        },
      },
    });

    return updatedBlocks;
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
   * Maps to LearningObjectVersion state change
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

    const published = await prisma.$transaction(async (tx: TransactionClient) => {
      // Mark current version as published
      await tx.learningObjectVersion.update({
        where: { id: currentVersion.id },
        data: {
          state: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      // Get contentJson from current version
      const currentVersionData = await tx.learningObjectVersion.findUnique({
        where: { id: currentVersion.id },
        select: { contentJson: true },
      });

      // Create new draft version for future edits
      const newVersion = await tx.learningObjectVersion.create({
        data: {
          learningObjectId: lessonId,
          versionNumber: currentVersion.versionNumber + 1,
          state: 'DRAFT',
          createdByUserId: userId,
          contentJson: currentVersionData?.contentJson || { blocks: [] },
        },
      });

      // Mark learning object as active (published)
      await tx.learningObject.update({
        where: { id: lessonId },
        data: { isActive: true },
      });

      return newVersion;
    });

    return published;
  }

  /**
   * Get lesson templates
   * Note: Templates are not yet implemented in the database schema.
   * This method returns an empty array as a placeholder.
   */
  static async getTemplates(_tenantId: string | null) {
    // LessonTemplate model does not exist in the current schema.
    // Templates would need to be added to the Prisma schema to enable this feature.
    // For now, return an empty array.
    return [] as Array<{
      id: string;
      tenantId: string | null;
      name: string;
      description: string | null;
      blocks: Array<{
        id: string;
        templateId: string;
        type: string;
        position: number;
        content: Record<string, any>;
        settings: Record<string, any> | null;
      }>;
      createdAt: Date;
    }>;
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
    _tx: TransactionClient,
    _templateId: string,
    _versionId: string
  ) {
    // LessonTemplate and LessonTemplateBlock models do not exist in the current schema.
    // Templates would need to be added to the Prisma schema to enable this feature.
    // For now, this is a no-op.
    console.warn('copyBlocksFromTemplate: Templates are not yet implemented in the database schema.');
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
