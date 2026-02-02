/**
 * Unit Tests for Conversation Service
 *
 * Tests for:
 * - Conversation CRUD operations
 * - Participant management
 * - Direct message helpers
 * - Group conversations
 * - Archive functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// MOCK SETUP
// =============================================================================

const mockPrismaConversation = {
  create: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};

const mockPrismaParticipant = {
  create: vi.fn(),
  createMany: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
};

const mockPrismaMessage = {
  count: vi.fn(),
};

vi.mock('../prisma.js', () => ({
  prisma: {
    conversation: mockPrismaConversation,
    participant: mockPrismaParticipant,
    message: mockPrismaMessage,
  },
  ConversationType: {
    DIRECT: 'DIRECT',
    GROUP: 'GROUP',
    CHANNEL: 'CHANNEL',
  },
  ParticipantRole: {
    MEMBER: 'MEMBER',
    ADMIN: 'ADMIN',
    OWNER: 'OWNER',
  },
}));

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

type ConversationType = 'DIRECT' | 'GROUP' | 'CHANNEL';
type ParticipantRole = 'MEMBER' | 'ADMIN' | 'OWNER';

interface Conversation {
  id: string;
  tenantId: string;
  type: ConversationType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  lastMessageId?: string;
  lastMessageAt?: Date;
  metadata?: Record<string, unknown>;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Participant {
  id: string;
  conversationId: string;
  userId: string;
  role: ParticipantRole;
  nickname?: string;
  mutedUntil?: Date;
  lastReadAt?: Date;
  joinedAt: Date;
  leftAt?: Date;
}

interface CreateConversationInput {
  tenantId: string;
  type: ConversationType;
  name?: string;
  description?: string;
  creatorId: string;
  participantIds: string[];
  metadata?: Record<string, unknown>;
}

// =============================================================================
// CONVERSATION SERVICE (Simplified for testing)
// =============================================================================

class ConversationService {
  private readonly MAX_GROUP_PARTICIPANTS = 100;
  private readonly MAX_NAME_LENGTH = 100;

  async createConversation(input: CreateConversationInput): Promise<Conversation> {
    // Validation
    if (input.type === 'DIRECT' && input.participantIds.length !== 1) {
      throw new Error('Direct conversations must have exactly one other participant');
    }

    if (input.type !== 'DIRECT' && !input.name) {
      throw new Error('Group conversations require a name');
    }

    if (input.name && input.name.length > this.MAX_NAME_LENGTH) {
      throw new Error(`Name exceeds maximum length of ${this.MAX_NAME_LENGTH}`);
    }

    if (input.participantIds.length > this.MAX_GROUP_PARTICIPANTS) {
      throw new Error(`Cannot exceed ${this.MAX_GROUP_PARTICIPANTS} participants`);
    }

    // Create conversation
    const conversation = await mockPrismaConversation.create({
      data: {
        tenantId: input.tenantId,
        type: input.type,
        name: input.name,
        description: input.description,
        metadata: input.metadata,
      },
    });

    // Add creator as owner
    await mockPrismaParticipant.create({
      data: {
        conversationId: conversation.id,
        userId: input.creatorId,
        role: 'OWNER',
        joinedAt: new Date(),
      },
    });

    // Add other participants
    if (input.participantIds.length > 0) {
      await mockPrismaParticipant.createMany({
        data: input.participantIds.map((userId) => ({
          conversationId: conversation.id,
          userId,
          role: 'MEMBER',
          joinedAt: new Date(),
        })),
      });
    }

    return conversation;
  }

  async getConversationById(
    conversationId: string,
    includeParticipants: boolean = false
  ): Promise<Conversation | null> {
    return mockPrismaConversation.findUnique({
      where: { id: conversationId },
      include: includeParticipants ? { participants: true } : undefined,
    });
  }

  async listConversations(
    userId: string,
    tenantId: string,
    options: {
      type?: ConversationType;
      includeArchived?: boolean;
      limit?: number;
      cursor?: string;
    } = {}
  ): Promise<{
    conversations: Conversation[];
    nextCursor?: string;
    hasMore: boolean;
  }> {
    const { type, includeArchived = false, limit = 20, cursor } = options;

    const where: Record<string, unknown> = {
      tenantId,
      participants: {
        some: {
          userId,
          leftAt: null,
        },
      },
    };

    if (type) {
      where.type = type;
    }

    if (!includeArchived) {
      where.archivedAt = null;
    }

    if (cursor) {
      where.id = { gt: cursor };
    }

    const conversations = await mockPrismaConversation.findMany({
      where,
      take: limit + 1,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participants: {
          where: { leftAt: null },
          take: 5,
        },
      },
    });

    const hasMore = conversations.length > limit;
    const result = hasMore ? conversations.slice(0, limit) : conversations;

    return {
      conversations: result,
      nextCursor: hasMore ? result[result.length - 1].id : undefined,
      hasMore,
    };
  }

  async findOrCreateDirectConversation(
    tenantId: string,
    userId1: string,
    userId2: string
  ): Promise<Conversation> {
    // Check if direct conversation already exists
    const existing = await mockPrismaConversation.findFirst({
      where: {
        tenantId,
        type: 'DIRECT',
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
        ],
      },
    });

    if (existing) {
      return existing;
    }

    // Create new direct conversation
    return this.createConversation({
      tenantId,
      type: 'DIRECT',
      creatorId: userId1,
      participantIds: [userId2],
    });
  }

  async addParticipant(
    conversationId: string,
    userId: string,
    addedById: string,
    role: ParticipantRole = 'MEMBER'
  ): Promise<Participant> {
    const conversation = await mockPrismaConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type === 'DIRECT') {
      throw new Error('Cannot add participants to direct conversations');
    }

    // Check if adder has permission
    const adderParticipant = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId: addedById },
    });

    if (!adderParticipant || !['ADMIN', 'OWNER'].includes(adderParticipant.role)) {
      throw new Error('Not authorized to add participants');
    }

    // Check if already a participant
    const existing = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (existing && !existing.leftAt) {
      throw new Error('User is already a participant');
    }

    if (existing) {
      // Rejoin
      return mockPrismaParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null, role },
      });
    }

    return mockPrismaParticipant.create({
      data: {
        conversationId,
        userId,
        role,
        joinedAt: new Date(),
      },
    });
  }

  async removeParticipant(
    conversationId: string,
    userId: string,
    removedById: string
  ): Promise<void> {
    const conversation = await mockPrismaConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.type === 'DIRECT') {
      throw new Error('Cannot remove participants from direct conversations');
    }

    // Check permission (self-removal or admin)
    if (userId !== removedById) {
      const removerParticipant = await mockPrismaParticipant.findFirst({
        where: { conversationId, userId: removedById },
      });

      if (!removerParticipant || !['ADMIN', 'OWNER'].includes(removerParticipant.role)) {
        throw new Error('Not authorized to remove participants');
      }
    }

    await mockPrismaParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { leftAt: new Date() },
    });
  }

  async updateConversation(
    conversationId: string,
    userId: string,
    updates: Partial<Pick<Conversation, 'name' | 'description' | 'avatarUrl' | 'metadata'>>
  ): Promise<Conversation> {
    // Check permission
    const participant = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant || !['ADMIN', 'OWNER'].includes(participant.role)) {
      throw new Error('Not authorized to update conversation');
    }

    if (updates.name && updates.name.length > this.MAX_NAME_LENGTH) {
      throw new Error(`Name exceeds maximum length of ${this.MAX_NAME_LENGTH}`);
    }

    return mockPrismaConversation.update({
      where: { id: conversationId },
      data: updates,
    });
  }

  async archiveConversation(conversationId: string, userId: string): Promise<Conversation> {
    const participant = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant || participant.role !== 'OWNER') {
      throw new Error('Only owner can archive conversation');
    }

    return mockPrismaConversation.update({
      where: { id: conversationId },
      data: { archivedAt: new Date() },
    });
  }

  async unarchiveConversation(conversationId: string, userId: string): Promise<Conversation> {
    const participant = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant || participant.role !== 'OWNER') {
      throw new Error('Only owner can unarchive conversation');
    }

    return mockPrismaConversation.update({
      where: { id: conversationId },
      data: { archivedAt: null },
    });
  }

  async muteConversation(
    conversationId: string,
    userId: string,
    until?: Date
  ): Promise<Participant> {
    return mockPrismaParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { mutedUntil: until ?? new Date('2099-12-31') },
    });
  }

  async unmuteConversation(conversationId: string, userId: string): Promise<Participant> {
    return mockPrismaParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { mutedUntil: null },
    });
  }

  async getParticipants(
    conversationId: string,
    includeLeft: boolean = false
  ): Promise<Participant[]> {
    const where: Record<string, unknown> = { conversationId };
    if (!includeLeft) {
      where.leftAt = null;
    }

    return mockPrismaParticipant.findMany({ where });
  }

  async changeParticipantRole(
    conversationId: string,
    userId: string,
    newRole: ParticipantRole,
    changedById: string
  ): Promise<Participant> {
    // Only owner can change roles
    const changer = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId: changedById },
    });

    if (!changer || changer.role !== 'OWNER') {
      throw new Error('Only owner can change participant roles');
    }

    return mockPrismaParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { role: newRole },
    });
  }

  async getUnreadCount(conversationId: string, userId: string): Promise<number> {
    const participant = await mockPrismaParticipant.findFirst({
      where: { conversationId, userId },
    });

    if (!participant) return 0;

    return mockPrismaMessage.count({
      where: {
        conversationId,
        createdAt: { gt: participant.lastReadAt ?? new Date(0) },
        senderId: { not: userId },
      },
    });
  }

  async markAsRead(conversationId: string, userId: string): Promise<Participant> {
    return mockPrismaParticipant.update({
      where: {
        conversationId_userId: { conversationId, userId },
      },
      data: { lastReadAt: new Date() },
    });
  }
}

// =============================================================================
// FIXTURES
// =============================================================================

const createMockConversation = (overrides: Partial<Conversation> = {}): Conversation => ({
  id: 'conv-001',
  tenantId: 'tenant-001',
  type: 'GROUP',
  name: 'Study Group',
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  ...overrides,
});

const createMockParticipant = (overrides: Partial<Participant> = {}): Participant => ({
  id: 'part-001',
  conversationId: 'conv-001',
  userId: 'user-001',
  role: 'OWNER',
  joinedAt: new Date('2026-01-15'),
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('ConversationService', () => {
  let service: ConversationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ConversationService();
  });

  // ===========================================================================
  // CREATE CONVERSATION TESTS
  // ===========================================================================

  describe('createConversation', () => {
    it('should create group conversation', async () => {
      const mockConv = createMockConversation();
      mockPrismaConversation.create.mockResolvedValueOnce(mockConv);
      mockPrismaParticipant.create.mockResolvedValueOnce(createMockParticipant());
      mockPrismaParticipant.createMany.mockResolvedValueOnce({ count: 2 });

      const result = await service.createConversation({
        tenantId: 'tenant-001',
        type: 'GROUP',
        name: 'Study Group',
        creatorId: 'user-001',
        participantIds: ['user-002', 'user-003'],
      });

      expect(result.type).toBe('GROUP');
      expect(result.name).toBe('Study Group');
    });

    it('should create direct conversation', async () => {
      const mockConv = createMockConversation({ type: 'DIRECT', name: undefined });
      mockPrismaConversation.create.mockResolvedValueOnce(mockConv);
      mockPrismaParticipant.create.mockResolvedValueOnce(createMockParticipant());
      mockPrismaParticipant.createMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.createConversation({
        tenantId: 'tenant-001',
        type: 'DIRECT',
        creatorId: 'user-001',
        participantIds: ['user-002'],
      });

      expect(result.type).toBe('DIRECT');
    });

    it('should reject direct conversation with wrong participant count', async () => {
      await expect(
        service.createConversation({
          tenantId: 'tenant-001',
          type: 'DIRECT',
          creatorId: 'user-001',
          participantIds: ['user-002', 'user-003'],
        })
      ).rejects.toThrow('exactly one other participant');
    });

    it('should require name for group conversations', async () => {
      await expect(
        service.createConversation({
          tenantId: 'tenant-001',
          type: 'GROUP',
          creatorId: 'user-001',
          participantIds: ['user-002'],
        })
      ).rejects.toThrow('require a name');
    });

    it('should reject name exceeding max length', async () => {
      const longName = 'a'.repeat(101);

      await expect(
        service.createConversation({
          tenantId: 'tenant-001',
          type: 'GROUP',
          name: longName,
          creatorId: 'user-001',
          participantIds: [],
        })
      ).rejects.toThrow('maximum length');
    });

    it('should reject too many participants', async () => {
      const manyParticipants = Array(101).fill(null).map((_, i) => `user-${i}`);

      await expect(
        service.createConversation({
          tenantId: 'tenant-001',
          type: 'GROUP',
          name: 'Huge Group',
          creatorId: 'owner',
          participantIds: manyParticipants,
        })
      ).rejects.toThrow('Cannot exceed');
    });
  });

  // ===========================================================================
  // GET CONVERSATION TESTS
  // ===========================================================================

  describe('getConversationById', () => {
    it('should return conversation', async () => {
      const mockConv = createMockConversation();
      mockPrismaConversation.findUnique.mockResolvedValueOnce(mockConv);

      const result = await service.getConversationById('conv-001');

      expect(result).toEqual(mockConv);
    });

    it('should include participants when requested', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce({
        ...createMockConversation(),
        participants: [createMockParticipant()],
      });

      await service.getConversationById('conv-001', true);

      expect(mockPrismaConversation.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: { participants: true },
        })
      );
    });
  });

  // ===========================================================================
  // LIST CONVERSATIONS TESTS
  // ===========================================================================

  describe('listConversations', () => {
    it('should return user conversations', async () => {
      const conversations = [createMockConversation()];
      mockPrismaConversation.findMany.mockResolvedValueOnce(conversations);

      const result = await service.listConversations('user-001', 'tenant-001');

      expect(result.conversations).toHaveLength(1);
    });

    it('should filter by type', async () => {
      mockPrismaConversation.findMany.mockResolvedValueOnce([]);

      await service.listConversations('user-001', 'tenant-001', { type: 'GROUP' });

      expect(mockPrismaConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'GROUP' }),
        })
      );
    });

    it('should exclude archived by default', async () => {
      mockPrismaConversation.findMany.mockResolvedValueOnce([]);

      await service.listConversations('user-001', 'tenant-001');

      expect(mockPrismaConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ archivedAt: null }),
        })
      );
    });

    it('should include archived when requested', async () => {
      mockPrismaConversation.findMany.mockResolvedValueOnce([]);

      await service.listConversations('user-001', 'tenant-001', { includeArchived: true });

      expect(mockPrismaConversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({ archivedAt: null }),
        })
      );
    });
  });

  // ===========================================================================
  // FIND OR CREATE DIRECT TESTS
  // ===========================================================================

  describe('findOrCreateDirectConversation', () => {
    it('should return existing direct conversation', async () => {
      const existing = createMockConversation({ type: 'DIRECT' });
      mockPrismaConversation.findFirst.mockResolvedValueOnce(existing);

      const result = await service.findOrCreateDirectConversation(
        'tenant-001',
        'user-001',
        'user-002'
      );

      expect(result).toEqual(existing);
      expect(mockPrismaConversation.create).not.toHaveBeenCalled();
    });

    it('should create new direct conversation if none exists', async () => {
      mockPrismaConversation.findFirst.mockResolvedValueOnce(null);
      const newConv = createMockConversation({ type: 'DIRECT' });
      mockPrismaConversation.create.mockResolvedValueOnce(newConv);
      mockPrismaParticipant.create.mockResolvedValueOnce(createMockParticipant());
      mockPrismaParticipant.createMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.findOrCreateDirectConversation(
        'tenant-001',
        'user-001',
        'user-002'
      );

      expect(result.type).toBe('DIRECT');
    });
  });

  // ===========================================================================
  // ADD PARTICIPANT TESTS
  // ===========================================================================

  describe('addParticipant', () => {
    it('should add participant to group', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(createMockConversation());
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'ADMIN' }));
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(null); // Not already participant
      mockPrismaParticipant.create.mockImplementationOnce(({ data }) => ({
        id: 'new-part',
        ...data,
      }));

      const result = await service.addParticipant('conv-001', 'user-003', 'user-001');

      expect(result.userId).toBe('user-003');
    });

    it('should reject adding to direct conversation', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(
        createMockConversation({ type: 'DIRECT' })
      );

      await expect(
        service.addParticipant('conv-001', 'user-003', 'user-001')
      ).rejects.toThrow('Cannot add participants to direct');
    });

    it('should reject if adder not authorized', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(createMockConversation());
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'MEMBER' }));

      await expect(
        service.addParticipant('conv-001', 'user-003', 'user-002')
      ).rejects.toThrow('Not authorized');
    });

    it('should allow rejoining after leaving', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(createMockConversation());
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'OWNER' }));
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(
        createMockParticipant({ userId: 'user-003', leftAt: new Date() })
      );
      mockPrismaParticipant.update.mockImplementationOnce(({ data }) => ({
        ...createMockParticipant({ userId: 'user-003' }),
        leftAt: data.leftAt,
      }));

      const result = await service.addParticipant('conv-001', 'user-003', 'user-001');

      expect(result.leftAt).toBeNull();
    });
  });

  // ===========================================================================
  // REMOVE PARTICIPANT TESTS
  // ===========================================================================

  describe('removeParticipant', () => {
    it('should allow self-removal', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(createMockConversation());

      await service.removeParticipant('conv-001', 'user-002', 'user-002');

      expect(mockPrismaParticipant.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ leftAt: expect.any(Date) }),
        })
      );
    });

    it('should allow admin removal', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(createMockConversation());
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'ADMIN' }));

      await service.removeParticipant('conv-001', 'user-003', 'user-001');

      expect(mockPrismaParticipant.update).toHaveBeenCalled();
    });

    it('should reject removal from direct conversation', async () => {
      mockPrismaConversation.findUnique.mockResolvedValueOnce(
        createMockConversation({ type: 'DIRECT' })
      );

      await expect(
        service.removeParticipant('conv-001', 'user-002', 'user-001')
      ).rejects.toThrow('Cannot remove participants from direct');
    });
  });

  // ===========================================================================
  // UPDATE CONVERSATION TESTS
  // ===========================================================================

  describe('updateConversation', () => {
    it('should update conversation details', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'ADMIN' }));
      mockPrismaConversation.update.mockImplementationOnce(({ data }) => ({
        ...createMockConversation(),
        ...data,
      }));

      const result = await service.updateConversation('conv-001', 'user-001', {
        name: 'New Name',
        description: 'New Description',
      });

      expect(result.name).toBe('New Name');
    });

    it('should reject if not admin/owner', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'MEMBER' }));

      await expect(
        service.updateConversation('conv-001', 'user-002', { name: 'Hacked' })
      ).rejects.toThrow('Not authorized');
    });
  });

  // ===========================================================================
  // ARCHIVE TESTS
  // ===========================================================================

  describe('archiveConversation', () => {
    it('should archive conversation', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'OWNER' }));
      mockPrismaConversation.update.mockImplementationOnce(({ data }) => ({
        ...createMockConversation(),
        archivedAt: data.archivedAt,
      }));

      const result = await service.archiveConversation('conv-001', 'user-001');

      expect(result.archivedAt).toBeInstanceOf(Date);
    });

    it('should reject if not owner', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'ADMIN' }));

      await expect(
        service.archiveConversation('conv-001', 'user-002')
      ).rejects.toThrow('Only owner');
    });
  });

  describe('unarchiveConversation', () => {
    it('should unarchive conversation', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'OWNER' }));
      mockPrismaConversation.update.mockImplementationOnce(({ data }) => ({
        ...createMockConversation({ archivedAt: new Date() }),
        archivedAt: data.archivedAt,
      }));

      const result = await service.unarchiveConversation('conv-001', 'user-001');

      expect(result.archivedAt).toBeNull();
    });
  });

  // ===========================================================================
  // MUTE TESTS
  // ===========================================================================

  describe('muteConversation', () => {
    it('should mute conversation until specified time', async () => {
      const until = new Date('2026-02-01');
      mockPrismaParticipant.update.mockImplementationOnce(({ data }) => ({
        ...createMockParticipant(),
        mutedUntil: data.mutedUntil,
      }));

      const result = await service.muteConversation('conv-001', 'user-001', until);

      expect(result.mutedUntil).toEqual(until);
    });

    it('should mute indefinitely when no date provided', async () => {
      mockPrismaParticipant.update.mockImplementationOnce(({ data }) => ({
        ...createMockParticipant(),
        mutedUntil: data.mutedUntil,
      }));

      const result = await service.muteConversation('conv-001', 'user-001');

      expect(result.mutedUntil?.getFullYear()).toBe(2099);
    });
  });

  describe('unmuteConversation', () => {
    it('should unmute conversation', async () => {
      mockPrismaParticipant.update.mockImplementationOnce(({ data }) => ({
        ...createMockParticipant({ mutedUntil: new Date() }),
        mutedUntil: data.mutedUntil,
      }));

      const result = await service.unmuteConversation('conv-001', 'user-001');

      expect(result.mutedUntil).toBeNull();
    });
  });

  // ===========================================================================
  // ROLE CHANGE TESTS
  // ===========================================================================

  describe('changeParticipantRole', () => {
    it('should change participant role', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'OWNER' }));
      mockPrismaParticipant.update.mockImplementationOnce(({ data }) => ({
        ...createMockParticipant({ userId: 'user-002', role: 'MEMBER' }),
        role: data.role,
      }));

      const result = await service.changeParticipantRole('conv-001', 'user-002', 'ADMIN', 'user-001');

      expect(result.role).toBe('ADMIN');
    });

    it('should reject if not owner', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(createMockParticipant({ role: 'ADMIN' }));

      await expect(
        service.changeParticipantRole('conv-001', 'user-002', 'ADMIN', 'user-001')
      ).rejects.toThrow('Only owner');
    });
  });

  // ===========================================================================
  // UNREAD COUNT TESTS
  // ===========================================================================

  describe('getUnreadCount', () => {
    it('should return unread message count', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(
        createMockParticipant({ lastReadAt: new Date('2026-01-14') })
      );
      mockPrismaMessage.count.mockResolvedValueOnce(5);

      const result = await service.getUnreadCount('conv-001', 'user-001');

      expect(result).toBe(5);
    });

    it('should return 0 when not a participant', async () => {
      mockPrismaParticipant.findFirst.mockResolvedValueOnce(null);

      const result = await service.getUnreadCount('conv-001', 'nonparticipant');

      expect(result).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should update lastReadAt', async () => {
      mockPrismaParticipant.update.mockImplementationOnce(({ data }) => ({
        ...createMockParticipant(),
        lastReadAt: data.lastReadAt,
      }));

      const result = await service.markAsRead('conv-001', 'user-001');

      expect(result.lastReadAt).toBeInstanceOf(Date);
    });
  });
});
