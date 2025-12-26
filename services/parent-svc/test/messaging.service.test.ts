import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessagingService } from '../src/messaging/messaging.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentModerationService } from '../src/moderation/content-moderation.service';

describe('MessagingService', () => {
  let messagingService: MessagingService;
  let prisma: any;
  let moderation: ContentModerationService;

  beforeEach(() => {
    prisma = {
      parentConversation: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      parentMessage: {
        findMany: vi.fn(),
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      messageReport: {
        create: vi.fn(),
      },
    };
    moderation = new ContentModerationService();
    messagingService = new MessagingService(
      prisma as unknown as PrismaService,
      moderation
    );
  });

  describe('getConversations', () => {
    it('should return conversations for parent', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          parentId: 'parent-1',
          teacherId: 'teacher-1',
          studentId: 'student-1',
          subject: 'Math Progress',
          teacher: { firstName: 'Mr.', lastName: 'Smith' },
          student: { firstName: 'Jane', lastName: 'Doe' },
          messages: [
            { content: 'Hello', sentAt: new Date(), isRead: false },
          ],
          _count: { messages: 5 },
        },
      ];

      prisma.parentConversation.findMany.mockResolvedValue(mockConversations);

      const result = await messagingService.getConversations('parent-1');

      expect(result).toHaveLength(1);
      expect(result[0].subject).toBe('Math Progress');
    });
  });

  describe('getConversationById', () => {
    it('should return conversation with messages', async () => {
      const mockConversation = {
        id: 'conv-1',
        parentId: 'parent-1',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        subject: 'Math Progress',
        teacher: { id: 'teacher-1', firstName: 'Mr.', lastName: 'Smith' },
        student: { id: 'student-1', firstName: 'Jane', lastName: 'Doe' },
        messages: [
          {
            id: 'msg-1',
            content: 'Hello',
            senderId: 'parent-1',
            senderType: 'parent',
            sentAt: new Date(),
            isRead: true,
          },
        ],
      };

      prisma.parentConversation.findUnique.mockResolvedValue(mockConversation);

      const result = await messagingService.getConversationById('conv-1', 'parent-1');

      expect(result).toBeDefined();
      expect(result?.messages).toHaveLength(1);
    });

    it('should return null if parent does not own conversation', async () => {
      prisma.parentConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        parentId: 'other-parent',
      });

      const result = await messagingService.getConversationById('conv-1', 'parent-1');

      expect(result).toBeNull();
    });
  });

  describe('createConversation', () => {
    it('should create new conversation with initial message', async () => {
      const createDto = {
        parentId: 'parent-1',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        subject: 'Question about homework',
        message: 'Hi, I have a question...',
      };

      const mockConversation = {
        id: 'new-conv',
        ...createDto,
        messages: [
          {
            id: 'msg-1',
            content: createDto.message,
            senderId: 'parent-1',
            senderType: 'parent',
          },
        ],
      };

      prisma.parentConversation.create.mockResolvedValue(mockConversation);

      const result = await messagingService.createConversation(createDto);

      expect(result.id).toBe('new-conv');
      expect(prisma.parentConversation.create).toHaveBeenCalled();
    });

    it('should reject message with inappropriate content', async () => {
      const createDto = {
        parentId: 'parent-1',
        teacherId: 'teacher-1',
        studentId: 'student-1',
        subject: 'Test',
        message: 'This contains bad words...',
      };

      vi.spyOn(moderation, 'moderateContent').mockResolvedValue({
        allowed: false,
        reason: 'Inappropriate content detected',
        flaggedPhrases: ['bad words'],
      });

      await expect(messagingService.createConversation(createDto)).rejects.toThrow(
        'Message rejected'
      );
    });
  });

  describe('sendMessage', () => {
    it('should add message to conversation', async () => {
      prisma.parentConversation.findUnique.mockResolvedValue({
        id: 'conv-1',
        parentId: 'parent-1',
      });

      const mockMessage = {
        id: 'msg-2',
        conversationId: 'conv-1',
        content: 'Reply message',
        senderId: 'parent-1',
        senderType: 'parent',
        sentAt: new Date(),
      };

      prisma.parentMessage.create.mockResolvedValue(mockMessage);

      const result = await messagingService.sendMessage(
        'conv-1',
        'parent-1',
        'parent',
        'Reply message'
      );

      expect(result.content).toBe('Reply message');
    });
  });

  describe('reportMessage', () => {
    it('should create message report', async () => {
      const mockReport = {
        id: 'report-1',
        messageId: 'msg-1',
        reporterId: 'parent-1',
        reason: 'Inappropriate content',
      };

      prisma.messageReport.create.mockResolvedValue(mockReport);

      const result = await messagingService.reportMessage(
        'msg-1',
        'parent-1',
        'Inappropriate content'
      );

      expect(result.id).toBe('report-1');
    });
  });
});
