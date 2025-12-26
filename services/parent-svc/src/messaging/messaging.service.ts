/**
 * Parent-Teacher Messaging Service
 *
 * Secure messaging with:
 * - Content moderation
 * - Read receipts
 * - Translation support
 * - Rate limiting
 * - Audit logging
 */

import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { logger, metrics } from '@aivo/ts-observability';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { ContentModerationService } from '../moderation/content-moderation.service.js';
import { config } from '../config.js';
import {
  CreateConversationDto,
  SendMessageDto,
  ReportMessageDto,
  Conversation,
  ConversationWithParticipants,
  Message,
  MessageThread,
  SenderType,
  ConversationStatus,
  MessageStatus,
  ReportStatus,
  ModerationResult,
} from './messaging.types.js';

@Injectable()
export class MessagingService {
  private readonly MAX_MESSAGE_LENGTH = 2000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notifications: NotificationService,
    private readonly moderation: ContentModerationService,
  ) {}

  /**
   * Create a new conversation thread
   */
  async createConversation(
    parentId: string,
    dto: CreateConversationDto
  ): Promise<Conversation> {
    // Verify parent has access to student
    const link = await this.prisma.parentStudentLink.findUnique({
      where: {
        parentId_studentId: {
          parentId,
          studentId: dto.studentId,
        },
      },
      include: {
        student: {
          include: {
            enrollments: {
              where: { status: 'active' },
              include: {
                class: {
                  include: {
                    enrollments: {
                      where: { role: 'teacher' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!link || link.status !== 'active') {
      throw new ForbiddenException('You do not have access to this student');
    }

    // Check messaging permission
    const permissions = link.permissions as { messageTeacher?: boolean } | null;
    if (!permissions?.messageTeacher) {
      throw new ForbiddenException('Messaging is not enabled for this student');
    }

    // Find teacher
    const teacherEnrollment = link.student.enrollments
      .flatMap((e) => e.class.enrollments)
      .find((e) => e.profileId === dto.teacherId);

    if (!teacherEnrollment) {
      throw new NotFoundException('Teacher not found for this student');
    }

    // Check for existing conversation
    let conversation = await this.prisma.parentConversation.findFirst({
      where: {
        parentId,
        teacherId: dto.teacherId,
        studentId: dto.studentId,
        status: ConversationStatus.ACTIVE,
      },
    });

    if (!conversation) {
      conversation = await this.prisma.parentConversation.create({
        data: {
          parentId,
          teacherId: dto.teacherId,
          studentId: dto.studentId,
          subject: dto.subject,
          status: ConversationStatus.ACTIVE,
          parentLastReadAt: new Date(),
          teacherLastReadAt: null,
        },
      });

      logger.info('Conversation created', {
        conversationId: conversation.id,
        parentId,
        teacherId: dto.teacherId,
      });
    }

    return this.toConversation(conversation);
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(
    senderId: string,
    senderType: SenderType,
    dto: SendMessageDto
  ): Promise<Message> {
    // Get conversation
    const conversation = await this.prisma.parentConversation.findUnique({
      where: { id: dto.conversationId },
      include: {
        parent: true,
        teacher: true,
        student: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Verify sender is part of conversation
    if (senderType === SenderType.PARENT && conversation.parentId !== senderId) {
      throw new ForbiddenException('You are not part of this conversation');
    }
    if (senderType === SenderType.TEACHER && conversation.teacherId !== senderId) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Check rate limiting
    await this.checkRateLimit(senderId, senderType);

    // Validate message content
    if (dto.content.length > this.MAX_MESSAGE_LENGTH) {
      throw new BadRequestException(
        `Message exceeds maximum length of ${this.MAX_MESSAGE_LENGTH} characters`
      );
    }

    // Content moderation
    let moderationResult: ModerationResult = { approved: true, score: 0 };
    if (config.moderationEnabled) {
      moderationResult = await this.moderation.checkContent(dto.content);
      if (!moderationResult.approved) {
        throw new BadRequestException(
          `Message contains inappropriate content: ${moderationResult.reason}`
        );
      }
    }

    // Create message
    const message = await this.prisma.parentMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderId,
        senderType,
        content: dto.content,
        contentHtml: this.sanitizeHtml(dto.content),
        attachments: dto.attachments,
        status: MessageStatus.SENT,
        moderationScore: moderationResult.score,
      },
    });

    // Update conversation
    await this.prisma.parentConversation.update({
      where: { id: dto.conversationId },
      data: {
        lastMessageAt: new Date(),
        lastMessagePreview: dto.content.substring(0, 100),
        ...(senderType === SenderType.PARENT
          ? { parentLastReadAt: new Date() }
          : { teacherLastReadAt: new Date() }),
      },
    });

    // Send notification to recipient
    const recipientId =
      senderType === SenderType.PARENT ? conversation.teacherId : conversation.parentId;
    const recipientType = senderType === SenderType.PARENT ? 'teacher' : 'parent';
    const senderName =
      senderType === SenderType.PARENT
        ? conversation.parent.givenName
        : conversation.teacher.givenName;

    await this.notifications.send({
      userId: recipientId,
      userType: recipientType,
      type: 'new_message',
      title: `New message from ${senderName}`,
      body: dto.content.substring(0, 100),
      data: {
        conversationId: dto.conversationId,
        messageId: message.id,
      },
    });

    // Emit event
    this.eventEmitter.emit('message.sent', {
      conversationId: dto.conversationId,
      messageId: message.id,
      senderId,
      senderType,
    });

    metrics.increment('message.sent', { senderType });

    return this.toMessage(message);
  }

  /**
   * Get conversations for a parent
   */
  async getParentConversations(parentId: string): Promise<ConversationWithParticipants[]> {
    const conversations = await this.prisma.parentConversation.findMany({
      where: {
        parentId,
        status: { in: [ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED] },
      },
      include: {
        teacher: {
          select: { id: true, givenName: true, familyName: true, photoUrl: true },
        },
        student: {
          select: { id: true, givenName: true, familyName: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status as ConversationStatus,
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
      teacher: {
        id: c.teacher.id,
        name: `${c.teacher.givenName} ${c.teacher.familyName}`,
        photoUrl: c.teacher.photoUrl,
      },
      parent: {
        id: parentId,
        name: '', // Will be filled by caller
        photoUrl: null,
      },
      student: {
        id: c.student.id,
        name: `${c.student.givenName} ${c.student.familyName}`,
      },
      lastMessage: c.messages[0]
        ? {
            content: c.messages[0].content.substring(0, 100),
            sentAt: c.messages[0].createdAt,
            senderType: c.messages[0].senderType as SenderType,
          }
        : null,
      unreadCount: c.parentLastReadAt
        ? c.messages.filter(
            (m) =>
              m.createdAt > c.parentLastReadAt! && m.senderType === SenderType.TEACHER
          ).length
        : c.messages.filter((m) => m.senderType === SenderType.TEACHER).length,
    }));
  }

  /**
   * Get conversations for a teacher
   */
  async getTeacherConversations(teacherId: string): Promise<ConversationWithParticipants[]> {
    const conversations = await this.prisma.parentConversation.findMany({
      where: {
        teacherId,
        status: { in: [ConversationStatus.ACTIVE, ConversationStatus.ARCHIVED] },
      },
      include: {
        parent: {
          select: { id: true, givenName: true, familyName: true, photoUrl: true },
        },
        student: {
          select: { id: true, givenName: true, familyName: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { lastMessageAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      subject: c.subject,
      status: c.status as ConversationStatus,
      createdAt: c.createdAt,
      lastMessageAt: c.lastMessageAt,
      parent: {
        id: c.parent.id,
        name: `${c.parent.givenName} ${c.parent.familyName}`,
        photoUrl: c.parent.photoUrl,
      },
      teacher: {
        id: teacherId,
        name: '', // Will be filled by caller
        photoUrl: null,
      },
      student: {
        id: c.student.id,
        name: `${c.student.givenName} ${c.student.familyName}`,
      },
      lastMessage: c.messages[0]
        ? {
            content: c.messages[0].content.substring(0, 100),
            sentAt: c.messages[0].createdAt,
            senderType: c.messages[0].senderType as SenderType,
          }
        : null,
      unreadCount: c.teacherLastReadAt
        ? c.messages.filter(
            (m) =>
              m.createdAt > c.teacherLastReadAt! && m.senderType === SenderType.PARENT
          ).length
        : c.messages.filter((m) => m.senderType === SenderType.PARENT).length,
    }));
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(
    userId: string,
    userType: SenderType,
    conversationId: string,
    options: { cursor?: string; limit?: number } = {}
  ): Promise<MessageThread> {
    const { cursor, limit = 50 } = options;

    // Verify access
    const conversation = await this.prisma.parentConversation.findUnique({
      where: { id: conversationId },
      include: {
        parent: {
          select: { id: true, givenName: true, familyName: true, photoUrl: true },
        },
        teacher: {
          select: { id: true, givenName: true, familyName: true, photoUrl: true },
        },
        student: {
          select: { id: true, givenName: true, familyName: true },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (userType === SenderType.PARENT && conversation.parentId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (userType === SenderType.TEACHER && conversation.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // Get messages
    const messages = await this.prisma.parentMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, -1) : messages;

    // Mark as read
    await this.prisma.parentConversation.update({
      where: { id: conversationId },
      data: {
        ...(userType === SenderType.PARENT
          ? { parentLastReadAt: new Date() }
          : { teacherLastReadAt: new Date() }),
      },
    });

    // Mark messages as read
    const oppositeType = userType === SenderType.PARENT ? SenderType.TEACHER : SenderType.PARENT;
    await this.prisma.parentMessage.updateMany({
      where: {
        conversationId,
        senderType: oppositeType,
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return {
      conversation: {
        id: conversation.id,
        subject: conversation.subject,
        parent: {
          id: conversation.parent.id,
          name: `${conversation.parent.givenName} ${conversation.parent.familyName}`,
          photoUrl: conversation.parent.photoUrl,
        },
        teacher: {
          id: conversation.teacher.id,
          name: `${conversation.teacher.givenName} ${conversation.teacher.familyName}`,
          photoUrl: conversation.teacher.photoUrl,
        },
        student: {
          id: conversation.student.id,
          name: `${conversation.student.givenName} ${conversation.student.familyName}`,
        },
      },
      messages: messagesToReturn.reverse().map(this.toMessage),
      hasMore,
      nextCursor: hasMore ? messagesToReturn[messagesToReturn.length - 1].id : null,
    };
  }

  /**
   * Archive a conversation
   */
  async archiveConversation(
    userId: string,
    userType: SenderType,
    conversationId: string
  ): Promise<void> {
    const conversation = await this.prisma.parentConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      (userType === SenderType.PARENT && conversation.parentId !== userId) ||
      (userType === SenderType.TEACHER && conversation.teacherId !== userId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.parentConversation.update({
      where: { id: conversationId },
      data: { status: ConversationStatus.ARCHIVED },
    });
  }

  /**
   * Report a message
   */
  async reportMessage(
    userId: string,
    userType: SenderType,
    dto: ReportMessageDto
  ): Promise<void> {
    const message = await this.prisma.parentMessage.findUnique({
      where: { id: dto.messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify reporter is part of conversation
    const conversation = message.conversation;
    if (
      (userType === SenderType.PARENT && conversation.parentId !== userId) ||
      (userType === SenderType.TEACHER && conversation.teacherId !== userId)
    ) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.messageReport.create({
      data: {
        messageId: dto.messageId,
        reporterId: userId,
        reporterType: userType,
        reason: dto.reason,
        status: ReportStatus.PENDING,
      },
    });

    logger.warn('Message reported', {
      messageId: dto.messageId,
      reporterId: userId,
      reason: dto.reason,
    });
  }

  /**
   * Get unread message count for a parent
   */
  async getUnreadCount(parentId: string): Promise<number> {
    const conversations = await this.prisma.parentConversation.findMany({
      where: {
        parentId,
        status: ConversationStatus.ACTIVE,
      },
      include: {
        messages: {
          where: {
            senderType: SenderType.TEACHER,
          },
        },
      },
    });

    return conversations.reduce((total, conv) => {
      const unread = conv.messages.filter(
        (m) => !conv.parentLastReadAt || m.createdAt > conv.parentLastReadAt
      ).length;
      return total + unread;
    }, 0);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async checkRateLimit(userId: string, userType: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const messageCount = await this.prisma.parentMessage.count({
      where: {
        senderId: userId,
        senderType: userType,
        createdAt: { gte: today },
      },
    });

    if (messageCount >= config.messagingRateLimitPerDay) {
      throw new BadRequestException(
        `You have reached the maximum of ${config.messagingRateLimitPerDay} messages per day`
      );
    }
  }

  private sanitizeHtml(content: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  }

  private toConversation(conversation: {
    id: string;
    subject?: string | null;
    status: string;
    createdAt: Date;
    lastMessageAt?: Date | null;
  }): Conversation {
    return {
      id: conversation.id,
      subject: conversation.subject,
      status: conversation.status as ConversationStatus,
      createdAt: conversation.createdAt,
      lastMessageAt: conversation.lastMessageAt,
    };
  }

  private toMessage(message: {
    id: string;
    conversationId: string;
    senderId: string;
    senderType: string;
    content: string;
    contentHtml?: string | null;
    attachments?: unknown;
    status: string;
    readAt?: Date | null;
    createdAt: Date;
  }): Message {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderType: message.senderType as SenderType,
      content: message.content,
      contentHtml: message.contentHtml ?? undefined,
      attachments: message.attachments as Message['attachments'],
      status: message.status as MessageStatus,
      readAt: message.readAt,
      createdAt: message.createdAt,
    };
  }
}
