import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessagingService } from '../src/messaging/messaging.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentModerationService } from '../src/moderation/content-moderation.service';
import { NotificationService } from '../src/notification/notification.service';
import { eventBus } from '../src/event-bus';
import { SenderType, ConversationStatus } from '../src/messaging/messaging.types';
import { ForbiddenException, NotFoundException, BadRequestException } from '../src/errors';

describe('MessagingService', () => {
  let messagingService: MessagingService;
  let prisma: any;
  let moderation: any;
  let notifications: any;

  beforeEach(() => {
    prisma = {
      parentConversation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      parentMessage: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        count: vi.fn(),
      },
      parentStudentLink: {
        findUnique: vi.fn(),
      },
      messageReport: {
        create: vi.fn(),
      },
    };
    moderation = {
      checkContent: vi.fn().mockResolvedValue({ approved: true, score: 0 }),
    };
    notifications = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    messagingService = new MessagingService(
      prisma as unknown as PrismaService,
      eventBus,
      notifications as unknown as NotificationService,
      moderation as unknown as ContentModerationService
    );
  });

  describe('getParentConversations', () => {
    it('should return conversations for parent', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          parentId: 'parent-1',
          teacherId: 'teacher-1',
          studentId: 'student-1',
          subject: 'Math Progress',
          status: ConversationStatus.ACTIVE,
          createdAt: new Date(),
          lastMessageAt: new Date(),
          parentLastReadAt: new Date(),
          teacher: { id: 'teacher-1', givenName: 'Mr.', familyName: 'Smith', photoUrl: null },
          student: { id: 'student-1', givenName: 'Jane', familyName: 'Doe' },
          messages: [{ content: 'Hello', createdAt: new Date(), senderType: SenderType.PARENT }],
        },
      ];

      prisma.parentConversation.findMany.mockResolvedValue(mockConversations);

      const result = await messagingService.getParentConversations('parent-1');

      expect(result).toHaveLength(1);
      expect(result[0].subject).toBe('Math Progress');
      expect(result[0].teacher.name).toBe('Mr. Smith');
    });
  });

  describe('createConversation', () => {
    it('should create new conversation when parent has access', async () => {
      prisma.parentStudentLink.findUnique.mockResolvedValue({
        parentId: 'parent-1',
        studentId: 'student-1',
        status: 'active',
        permissions: { messageTeacher: true },
        student: {
          enrollments: [
            {
              status: 'active',
              class: {
                enrollments: [{ profileId: 'teacher-1', role: 'teacher' }],
              },
            },
          ],
        },
      });

      prisma.parentConversation.findFirst.mockResolvedValue(null);

      const mockConversation = {
        id: 'new-conv',
        parentId: 'parent-1',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        subject: 'Question about homework',
        status: ConversationStatus.ACTIVE,
        createdAt: new Date(),
        lastMessageAt: null,
        parentLastReadAt: new Date(),
        teacherLastReadAt: null,
      };

      prisma.parentConversation.create.mockResolvedValue(mockConversation);

      const result = await messagingService.createConversation('parent-1', {
        studentId: 'student-1',
        teacherId: 'teacher-1',
        subject: 'Question about homework',
      });

      expect(result.id).toBe('new-conv');
      expect(prisma.parentConversation.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when parent has no access', async () => {
      prisma.parentStudentLink.findUnique.mockResolvedValue(null);

      await expect(
        messagingService.createConversation('parent-1', {
          studentId: 'student-1',
          teacherId: 'teacher-1',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('sendMessage', () => {
    it('should send a message in conversation', async () => {
      prisma.parentConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        parentId: 'parent-1',
        teacherId: 'teacher-1',
        parent: { givenName: 'John' },
        teacher: { givenName: 'Mr.' },
        student: { givenName: 'Jane' },
      });

      prisma.parentMessage.count.mockResolvedValue(5);

      const mockMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        content: 'Reply message',
        contentHtml: 'Reply message',
        senderId: 'parent-1',
        senderType: SenderType.PARENT,
        status: 'sent',
        createdAt: new Date(),
        attachments: null,
        moderationScore: 0,
      };

      prisma.parentMessage.create.mockResolvedValue(mockMessage);
      prisma.parentConversation.update.mockResolvedValue({});

      const result = await messagingService.sendMessage('parent-1', SenderType.PARENT, {
        conversationId: 'conv-1',
        content: 'Reply message',
      });

      expect(result.content).toBe('Reply message');
    });

    it('should reject message with inappropriate content', async () => {
      prisma.parentConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        parentId: 'parent-1',
        teacherId: 'teacher-1',
        parent: { givenName: 'John' },
        teacher: { givenName: 'Mr.' },
        student: { givenName: 'Jane' },
      });

      prisma.parentMessage.count.mockResolvedValue(0);

      moderation.checkContent.mockResolvedValue({
        approved: false,
        score: 0.8,
        reason: 'Inappropriate content detected',
      });

      await expect(
        messagingService.sendMessage('parent-1', SenderType.PARENT, {
          conversationId: 'conv-1',
          content: 'Bad content',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent conversation', async () => {
      prisma.parentConversation.findUnique.mockResolvedValue(null);

      await expect(
        messagingService.sendMessage('parent-1', SenderType.PARENT, {
          conversationId: 'non-existent',
          content: 'Hello',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reportMessage', () => {
    it('should create message report', async () => {
      prisma.parentMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'teacher-1',
        senderType: SenderType.TEACHER,
        conversation: {
          parentId: 'parent-1',
          teacherId: 'teacher-1',
        },
      });

      prisma.messageReport.create.mockResolvedValue({
        id: 'report-1',
        messageId: 'msg-1',
        reporterId: 'parent-1',
        reporterType: SenderType.PARENT,
        reason: 'Inappropriate content',
        status: 'pending',
        createdAt: new Date(),
      });

      await messagingService.reportMessage('parent-1', SenderType.PARENT, {
        messageId: 'msg-1',
        reason: 'Inappropriate content',
      });

      expect(prisma.messageReport.create).toHaveBeenCalled();
    });
  });
});
