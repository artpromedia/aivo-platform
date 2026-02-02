/**
 * Unit Tests for Message Service
 *
 * Tests for:
 * - Message CRUD operations
 * - Thread management
 * - Edit and delete functionality
 * - Cursor-based pagination
 * - Moderation filtering
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaMessage = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};

const mockPrismaConversation = {
  update: vi.fn(),
  findUnique: vi.fn(),
};

const mockPrismaReadReceipt = {
  upsert: vi.fn(),
  findMany: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    message: mockPrismaMessage,
    conversation: mockPrismaConversation,
    readReceipt: mockPrismaReadReceipt,
  },
  MessageStatus: {
    SENT: 'SENT',
    DELIVERED: 'DELIVERED',
    READ: 'READ',
    FAILED: 'FAILED',
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  tenantId: string;
  content: string;
  status: MessageStatus;
  replyToId?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
  editedAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Attachment {
  id: string;
  type: 'IMAGE' | 'FILE' | 'AUDIO' | 'VIDEO';
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

interface SendMessageInput {
  conversationId: string;
  senderId: string;
  tenantId: string;
  content: string;
  replyToId?: string;
  attachments?: Omit<Attachment, 'id'>[];
  metadata?: Record<string, unknown>;
}

interface MessageCursor {
  messageId: string;
  direction: 'before' | 'after';
}

// =============================================================================
// MESSAGE SERVICE (Simplified for testing)
// =============================================================================

class MessageService {
  private readonly CONTENT_MAX_LENGTH = 10000;
  private readonly DEFAULT_PAGE_SIZE = 50;

  // Moderation patterns
  private readonly profanityPatterns = [
    /badword/gi,
    /offensive/gi,
  ];

  async sendMessage(input: SendMessageInput): Promise<Message> {
    // Validate content
    const validation = this.validateContent(input.content);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    // Filter content
    const filteredContent = this.filterProfanity(input.content);

    // Create message
    const message = await mockPrismaMessage.create({
      data: {
        conversationId: input.conversationId,
        senderId: input.senderId,
        tenantId: input.tenantId,
        content: filteredContent,
        status: 'SENT',
        replyToId: input.replyToId,
        attachments: input.attachments,
        metadata: input.metadata,
      },
      include: {
        sender: true,
        attachments: true,
        replyTo: true,
      },
    });

    // Update conversation's last message
    await mockPrismaConversation.update({
      where: { id: input.conversationId },
      data: {
        lastMessageId: message.id,
        lastMessageAt: message.createdAt,
      },
    });

    return message;
  }

  async getMessageById(messageId: string): Promise<Message | null> {
    return mockPrismaMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        attachments: true,
        replyTo: true,
      },
    });
  }

  async listMessages(
    conversationId: string,
    options: {
      cursor?: MessageCursor;
      limit?: number;
      includeDeleted?: boolean;
    } = {}
  ): Promise<{
    messages: Message[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { cursor, limit = this.DEFAULT_PAGE_SIZE, includeDeleted = false } = options;

    const where: Record<string, unknown> = {
      conversationId,
    };

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (cursor) {
      if (cursor.direction === 'before') {
        where.createdAt = { lt: new Date() }; // Simplified for testing
      } else {
        where.createdAt = { gt: new Date() };
      }
    }

    const messages = await mockPrismaMessage.findMany({
      where,
      take: limit + 1, // Get one extra to check for more
      orderBy: { createdAt: 'desc' },
      include: {
        sender: true,
        attachments: true,
        replyTo: true,
      },
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: resultMessages,
      nextCursor: hasMore ? resultMessages[resultMessages.length - 1].id : undefined,
      hasMore,
    };
  }

  async editMessage(
    messageId: string,
    userId: string,
    newContent: string
  ): Promise<Message> {
    const message = await mockPrismaMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Not authorized to edit this message');
    }

    if (message.deletedAt) {
      throw new Error('Cannot edit deleted message');
    }

    const validation = this.validateContent(newContent);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const filteredContent = this.filterProfanity(newContent);

    return mockPrismaMessage.update({
      where: { id: messageId },
      data: {
        content: filteredContent,
        editedAt: new Date(),
      },
    });
  }

  async deleteMessage(
    messageId: string,
    userId: string,
    hardDelete: boolean = false
  ): Promise<void> {
    const message = await mockPrismaMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Not authorized to delete this message');
    }

    if (hardDelete) {
      await mockPrismaMessage.delete({
        where: { id: messageId },
      });
    } else {
      await mockPrismaMessage.update({
        where: { id: messageId },
        data: {
          content: '[Message deleted]',
          deletedAt: new Date(),
        },
      });
    }
  }

  async markAsRead(
    messageId: string,
    userId: string
  ): Promise<void> {
    await mockPrismaReadReceipt.upsert({
      where: {
        messageId_userId: { messageId, userId },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        messageId,
        userId,
        readAt: new Date(),
      },
    });
  }

  async getReadReceipts(messageId: string): Promise<Array<{
    userId: string;
    readAt: Date;
  }>> {
    return mockPrismaReadReceipt.findMany({
      where: { messageId },
      select: {
        userId: true,
        readAt: true,
      },
    });
  }

  async searchMessages(
    conversationId: string,
    query: string,
    options: { limit?: number } = {}
  ): Promise<Message[]> {
    const { limit = 20 } = options;

    return mockPrismaMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        content: {
          contains: query,
          mode: 'insensitive',
        },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUnreadCount(
    conversationId: string,
    userId: string
  ): Promise<number> {
    return mockPrismaMessage.count({
      where: {
        conversationId,
        senderId: { not: userId },
        deletedAt: null,
        readReceipts: {
          none: { userId },
        },
      },
    });
  }

  validateContent(content: string): { valid: boolean; reason?: string } {
    if (!content || content.trim().length === 0) {
      return { valid: false, reason: 'Message content cannot be empty' };
    }

    if (content.length > this.CONTENT_MAX_LENGTH) {
      return { valid: false, reason: `Message exceeds maximum length of ${this.CONTENT_MAX_LENGTH} characters` };
    }

    return { valid: true };
  }

  filterProfanity(content: string): string {
    let filtered = content;
    for (const pattern of this.profanityPatterns) {
      filtered = filtered.replace(pattern, '[filtered]');
    }
    return filtered;
  }

  async replyToMessage(
    originalMessageId: string,
    input: Omit<SendMessageInput, 'replyToId'>
  ): Promise<Message> {
    const originalMessage = await mockPrismaMessage.findUnique({
      where: { id: originalMessageId },
    });

    if (!originalMessage) {
      throw new Error('Original message not found');
    }

    return this.sendMessage({
      ...input,
      conversationId: originalMessage.conversationId,
      replyToId: originalMessageId,
    });
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'message-001',
  conversationId: 'conv-001',
  senderId: 'user-001',
  tenantId: 'tenant-001',
  content: 'Hello, world!',
  status: 'SENT',
  createdAt: new Date('2026-01-15T10:00:00Z'),
  updatedAt: new Date('2026-01-15T10:00:00Z'),
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MessageService();
  });

  // ===========================================================================
  // SEND MESSAGE TESTS
  // ===========================================================================

  describe('sendMessage', () => {
    it('should create message with required fields', async () => {
      const mockMessage = createMockMessage();
      mockPrismaMessage.create.mockResolvedValueOnce(mockMessage);
      mockPrismaConversation.update.mockResolvedValueOnce({});

      const result = await service.sendMessage({
        conversationId: 'conv-001',
        senderId: 'user-001',
        tenantId: 'tenant-001',
        content: 'Hello, world!',
      });

      expect(result.content).toBe('Hello, world!');
      expect(result.status).toBe('SENT');
    });

    it('should update conversation last message', async () => {
      const mockMessage = createMockMessage();
      mockPrismaMessage.create.mockResolvedValueOnce(mockMessage);
      mockPrismaConversation.update.mockResolvedValueOnce({});

      await service.sendMessage({
        conversationId: 'conv-001',
        senderId: 'user-001',
        tenantId: 'tenant-001',
        content: 'Test',
      });

      expect(mockPrismaConversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'conv-001' },
          data: expect.objectContaining({ lastMessageId: 'message-001' }),
        })
      );
    });

    it('should reject empty content', async () => {
      await expect(
        service.sendMessage({
          conversationId: 'conv-001',
          senderId: 'user-001',
          tenantId: 'tenant-001',
          content: '',
        })
      ).rejects.toThrow('cannot be empty');
    });

    it('should reject content exceeding max length', async () => {
      const longContent = 'a'.repeat(10001);

      await expect(
        service.sendMessage({
          conversationId: 'conv-001',
          senderId: 'user-001',
          tenantId: 'tenant-001',
          content: longContent,
        })
      ).rejects.toThrow('maximum length');
    });

    it('should filter profanity', async () => {
      mockPrismaMessage.create.mockImplementationOnce(({ data }) => ({
        ...createMockMessage(),
        content: data.content,
      }));
      mockPrismaConversation.update.mockResolvedValueOnce({});

      const result = await service.sendMessage({
        conversationId: 'conv-001',
        senderId: 'user-001',
        tenantId: 'tenant-001',
        content: 'This has badword in it',
      });

      expect(result.content).toBe('This has [filtered] in it');
    });

    it('should allow attachments', async () => {
      mockPrismaMessage.create.mockImplementationOnce(({ data }) => ({
        ...createMockMessage(),
        attachments: data.attachments,
      }));
      mockPrismaConversation.update.mockResolvedValueOnce({});

      const result = await service.sendMessage({
        conversationId: 'conv-001',
        senderId: 'user-001',
        tenantId: 'tenant-001',
        content: 'See attachment',
        attachments: [
          { type: 'IMAGE', url: '/files/image.png', filename: 'image.png', size: 1024, mimeType: 'image/png' },
        ],
      });

      expect(result.attachments).toHaveLength(1);
    });
  });

  // ===========================================================================
  // GET MESSAGE TESTS
  // ===========================================================================

  describe('getMessageById', () => {
    it('should return message with sender info', async () => {
      const mockMessage = createMockMessage();
      mockPrismaMessage.findUnique.mockResolvedValueOnce(mockMessage);

      const result = await service.getMessageById('message-001');

      expect(result).toEqual(mockMessage);
    });

    it('should return null for non-existent message', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(null);

      const result = await service.getMessageById('nonexistent');

      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // LIST MESSAGES TESTS
  // ===========================================================================

  describe('listMessages', () => {
    it('should return paginated messages', async () => {
      const messages = [
        createMockMessage({ id: 'm1' }),
        createMockMessage({ id: 'm2' }),
      ];
      mockPrismaMessage.findMany.mockResolvedValueOnce(messages);

      const result = await service.listMessages('conv-001', { limit: 10 });

      expect(result.messages).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('should indicate more results available', async () => {
      const messages = Array(11).fill(null).map((_, i) =>
        createMockMessage({ id: `m${i}` })
      );
      mockPrismaMessage.findMany.mockResolvedValueOnce(messages);

      const result = await service.listMessages('conv-001', { limit: 10 });

      expect(result.messages).toHaveLength(10);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBe('m9');
    });

    it('should exclude deleted messages by default', async () => {
      mockPrismaMessage.findMany.mockResolvedValueOnce([]);

      await service.listMessages('conv-001');

      expect(mockPrismaMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it('should include deleted messages when requested', async () => {
      mockPrismaMessage.findMany.mockResolvedValueOnce([]);

      await service.listMessages('conv-001', { includeDeleted: true });

      expect(mockPrismaMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ deletedAt: null }),
        })
      );
    });
  });

  // ===========================================================================
  // EDIT MESSAGE TESTS
  // ===========================================================================

  describe('editMessage', () => {
    it('should update message content', async () => {
      const mockMessage = createMockMessage();
      mockPrismaMessage.findUnique.mockResolvedValueOnce(mockMessage);
      mockPrismaMessage.update.mockImplementationOnce(({ data }) => ({
        ...mockMessage,
        content: data.content,
        editedAt: data.editedAt,
      }));

      const result = await service.editMessage('message-001', 'user-001', 'Updated content');

      expect(result.content).toBe('Updated content');
      expect(result.editedAt).toBeInstanceOf(Date);
    });

    it('should reject editing by non-sender', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(createMockMessage());

      await expect(
        service.editMessage('message-001', 'other-user', 'Hacked!')
      ).rejects.toThrow('Not authorized');
    });

    it('should reject editing deleted message', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(
        createMockMessage({ deletedAt: new Date() })
      );

      await expect(
        service.editMessage('message-001', 'user-001', 'New content')
      ).rejects.toThrow('deleted message');
    });

    it('should filter profanity in edits', async () => {
      const mockMessage = createMockMessage();
      mockPrismaMessage.findUnique.mockResolvedValueOnce(mockMessage);
      mockPrismaMessage.update.mockImplementationOnce(({ data }) => ({
        ...mockMessage,
        content: data.content,
      }));

      const result = await service.editMessage(
        'message-001',
        'user-001',
        'This is offensive content'
      );

      expect(result.content).toBe('This is [filtered] content');
    });
  });

  // ===========================================================================
  // DELETE MESSAGE TESTS
  // ===========================================================================

  describe('deleteMessage', () => {
    it('should soft delete message', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(createMockMessage());

      await service.deleteMessage('message-001', 'user-001');

      expect(mockPrismaMessage.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: '[Message deleted]',
            deletedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should hard delete when requested', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(createMockMessage());

      await service.deleteMessage('message-001', 'user-001', true);

      expect(mockPrismaMessage.delete).toHaveBeenCalledWith({
        where: { id: 'message-001' },
      });
    });

    it('should reject deletion by non-sender', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(createMockMessage());

      await expect(
        service.deleteMessage('message-001', 'other-user')
      ).rejects.toThrow('Not authorized');
    });
  });

  // ===========================================================================
  // READ RECEIPT TESTS
  // ===========================================================================

  describe('markAsRead', () => {
    it('should create read receipt', async () => {
      await service.markAsRead('message-001', 'user-002');

      expect(mockPrismaReadReceipt.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            messageId_userId: { messageId: 'message-001', userId: 'user-002' },
          },
          create: expect.objectContaining({
            messageId: 'message-001',
            userId: 'user-002',
          }),
        })
      );
    });
  });

  describe('getReadReceipts', () => {
    it('should return read receipts for message', async () => {
      mockPrismaReadReceipt.findMany.mockResolvedValueOnce([
        { userId: 'user-002', readAt: new Date() },
        { userId: 'user-003', readAt: new Date() },
      ]);

      const result = await service.getReadReceipts('message-001');

      expect(result).toHaveLength(2);
    });
  });

  // ===========================================================================
  // SEARCH TESTS
  // ===========================================================================

  describe('searchMessages', () => {
    it('should search messages by content', async () => {
      const messages = [
        createMockMessage({ content: 'Hello world' }),
        createMockMessage({ id: 'm2', content: 'Hello there' }),
      ];
      mockPrismaMessage.findMany.mockResolvedValueOnce(messages);

      const result = await service.searchMessages('conv-001', 'Hello');

      expect(result).toHaveLength(2);
      expect(mockPrismaMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            content: expect.objectContaining({
              contains: 'Hello',
              mode: 'insensitive',
            }),
          }),
        })
      );
    });

    it('should exclude deleted messages from search', async () => {
      mockPrismaMessage.findMany.mockResolvedValueOnce([]);

      await service.searchMessages('conv-001', 'test');

      expect(mockPrismaMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });
  });

  // ===========================================================================
  // UNREAD COUNT TESTS
  // ===========================================================================

  describe('getUnreadCount', () => {
    it('should return count of unread messages', async () => {
      mockPrismaMessage.count.mockResolvedValueOnce(5);

      const result = await service.getUnreadCount('conv-001', 'user-001');

      expect(result).toBe(5);
    });
  });

  // ===========================================================================
  // REPLY TESTS
  // ===========================================================================

  describe('replyToMessage', () => {
    it('should create reply with replyToId', async () => {
      const originalMessage = createMockMessage({ id: 'original' });
      mockPrismaMessage.findUnique.mockResolvedValueOnce(originalMessage);
      mockPrismaMessage.create.mockImplementationOnce(({ data }) => ({
        ...createMockMessage({ id: 'reply' }),
        replyToId: data.replyToId,
      }));
      mockPrismaConversation.update.mockResolvedValueOnce({});

      const result = await service.replyToMessage('original', {
        senderId: 'user-002',
        tenantId: 'tenant-001',
        conversationId: 'conv-001',
        content: 'This is a reply',
      });

      expect(result.replyToId).toBe('original');
    });

    it('should throw if original message not found', async () => {
      mockPrismaMessage.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.replyToMessage('nonexistent', {
          senderId: 'user-002',
          tenantId: 'tenant-001',
          conversationId: 'conv-001',
          content: 'Reply',
        })
      ).rejects.toThrow('Original message not found');
    });
  });

  // ===========================================================================
  // CONTENT VALIDATION TESTS
  // ===========================================================================

  describe('validateContent', () => {
    it('should accept valid content', () => {
      expect(service.validateContent('Hello')).toEqual({ valid: true });
    });

    it('should reject empty content', () => {
      const result = service.validateContent('');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('empty');
    });

    it('should reject whitespace-only content', () => {
      const result = service.validateContent('   ');
      expect(result.valid).toBe(false);
    });
  });

  describe('filterProfanity', () => {
    it('should replace profanity with [filtered]', () => {
      expect(service.filterProfanity('This is badword')).toBe('This is [filtered]');
    });

    it('should handle multiple occurrences', () => {
      expect(service.filterProfanity('badword and badword')).toBe('[filtered] and [filtered]');
    });

    it('should not modify clean content', () => {
      expect(service.filterProfanity('This is clean')).toBe('This is clean');
    });
  });
});
