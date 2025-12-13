/**
 * Message Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma and config before importing services
vi.mock('../src/prisma.js', () => ({
  prisma: {
    message: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    participant: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    conversation: {
      update: vi.fn(),
    },
    readReceipt: {
      upsert: vi.fn(),
      findMany: vi.fn(),
    },
  },
  MessageType: {
    TEXT: 'TEXT',
    IMAGE: 'IMAGE',
    FILE: 'FILE',
    SYSTEM: 'SYSTEM',
    REPLY: 'REPLY',
  },
  MessageStatus: {
    SENDING: 'SENDING',
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
  },
  ParticipantRole: {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
  },
}));

vi.mock('../src/config.js', () => ({
  config: {
    limits: {
      maxMessageLength: 4000,
      maxParticipants: 100,
    },
  },
}));

import { prisma, MessageType, MessageStatus, ParticipantRole } from '../src/prisma.js';
import * as messageService from '../src/services/messageService.js';

describe('MessageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send a text message', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        type: MessageType.TEXT,
        content: 'Hello!',
        status: MessageStatus.SENT,
        createdAt: new Date(),
      };

      vi.mocked(prisma.participant.findFirst).mockResolvedValue({ id: 'p-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue(mockMessage as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue({} as any);
      vi.mocked(prisma.participant.updateMany).mockResolvedValue({ count: 1 });

      const result = await messageService.sendMessage({
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Hello!',
      });

      expect(prisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          type: MessageType.TEXT,
          content: 'Hello!',
          status: MessageStatus.SENT,
        }),
        include: expect.any(Object),
      });

      expect(result.id).toBe('msg-1');
    });

    it('should reject message from non-participant', async () => {
      vi.mocked(prisma.participant.findFirst).mockResolvedValue(null);

      await expect(
        messageService.sendMessage({
          tenantId: 'tenant-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: 'Hello!',
        })
      ).rejects.toThrow('User is not a participant in this conversation');
    });

    it('should reject message exceeding max length', async () => {
      const longContent = 'a'.repeat(5000);

      await expect(
        messageService.sendMessage({
          tenantId: 'tenant-1',
          conversationId: 'conv-1',
          senderId: 'user-1',
          content: longContent,
        })
      ).rejects.toThrow('Message exceeds maximum length');
    });

    it('should create message with reply reference', async () => {
      vi.mocked(prisma.participant.findFirst).mockResolvedValue({ id: 'p-1' } as any);
      vi.mocked(prisma.message.create).mockResolvedValue({
        id: 'msg-2',
        replyToId: 'msg-1',
      } as any);
      vi.mocked(prisma.conversation.update).mockResolvedValue({} as any);
      vi.mocked(prisma.participant.updateMany).mockResolvedValue({ count: 1 });

      await messageService.sendMessage({
        tenantId: 'tenant-1',
        conversationId: 'conv-1',
        senderId: 'user-1',
        content: 'Reply to you',
        replyToId: 'msg-1',
      });

      expect(prisma.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            replyToId: 'msg-1',
          }),
        })
      );
    });
  });

  describe('listMessages', () => {
    it('should return messages with cursor pagination', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'First' },
        { id: 'msg-2', content: 'Second' },
      ];

      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as any);

      const result = await messageService.listMessages(
        { conversationId: 'conv-1', tenantId: 'tenant-1' },
        50
      );

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should indicate hasMore when more messages exist', async () => {
      // Return pageSize + 1 messages to indicate more exist
      const mockMessages = Array.from({ length: 51 }, (_, i) => ({
        id: `msg-${i}`,
        content: `Message ${i}`,
      }));

      vi.mocked(prisma.message.findMany).mockResolvedValue(mockMessages as any);

      const result = await messageService.listMessages(
        { conversationId: 'conv-1', tenantId: 'tenant-1' },
        50
      );

      expect(result.data).toHaveLength(50);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('editMessage', () => {
    it('should edit message content', async () => {
      const mockMessage = {
        id: 'msg-1',
        senderId: 'user-1',
        content: 'Original',
        originalContent: null,
      };

      vi.mocked(prisma.message.findFirst).mockResolvedValue(mockMessage as any);
      vi.mocked(prisma.message.update).mockResolvedValue({
        ...mockMessage,
        content: 'Edited',
        isEdited: true,
      } as any);

      await messageService.editMessage('msg-1', 'tenant-1', {
        content: 'Edited',
        editedBy: 'user-1',
      });

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: expect.objectContaining({
          content: 'Edited',
          isEdited: true,
          originalContent: 'Original',
        }),
      });
    });

    it('should reject edit from non-sender', async () => {
      vi.mocked(prisma.message.findFirst).mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-1',
      } as any);

      await expect(
        messageService.editMessage('msg-1', 'tenant-1', {
          content: 'Edited',
          editedBy: 'user-2', // Different user
        })
      ).rejects.toThrow('Only the sender can edit this message');
    });

    it('should throw if message not found', async () => {
      vi.mocked(prisma.message.findFirst).mockResolvedValue(null);

      await expect(
        messageService.editMessage('msg-1', 'tenant-1', {
          content: 'Edited',
          editedBy: 'user-1',
        })
      ).rejects.toThrow('Message not found');
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message', async () => {
      vi.mocked(prisma.message.findFirst).mockResolvedValue({
        id: 'msg-1',
        senderId: 'user-1',
        conversationId: 'conv-1',
      } as any);
      vi.mocked(prisma.message.update).mockResolvedValue({ id: 'msg-1' } as any);

      await messageService.deleteMessage('msg-1', 'tenant-1', 'user-1');

      expect(prisma.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-1' },
        data: expect.objectContaining({
          isDeleted: true,
          deletedBy: 'user-1',
        }),
      });
    });
  });

  describe('markMessageRead', () => {
    it('should create/update read receipt', async () => {
      vi.mocked(prisma.readReceipt.upsert).mockResolvedValue({
        id: 'receipt-1',
        messageId: 'msg-1',
        userId: 'user-1',
        readAt: new Date(),
      } as any);

      await messageService.markMessageRead('msg-1', 'user-1', 'tenant-1');

      expect(prisma.readReceipt.upsert).toHaveBeenCalledWith({
        where: {
          messageId_userId: { messageId: 'msg-1', userId: 'user-1' },
        },
        update: { readAt: expect.any(Date) },
        create: expect.objectContaining({
          tenantId: 'tenant-1',
          messageId: 'msg-1',
          userId: 'user-1',
          readAt: expect.any(Date),
        }),
      });
    });
  });

  describe('getReadReceipts', () => {
    it('should return read receipts for message', async () => {
      const mockReceipts = [
        { userId: 'user-1', readAt: new Date() },
        { userId: 'user-2', readAt: new Date() },
      ];

      vi.mocked(prisma.readReceipt.findMany).mockResolvedValue(mockReceipts as any);

      const result = await messageService.getReadReceipts('msg-1');

      expect(result).toHaveLength(2);
      expect(prisma.readReceipt.findMany).toHaveBeenCalledWith({
        where: { messageId: 'msg-1' },
        orderBy: { readAt: 'desc' },
      });
    });
  });
});
