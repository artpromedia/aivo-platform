/**
 * Conversation Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Prisma before importing services
vi.mock('../src/prisma.js', () => ({
  prisma: {
    conversation: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    participant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  ConversationType: {
    DIRECT: 'DIRECT',
    GROUP: 'GROUP',
    CHANNEL: 'CHANNEL',
  },
  ParticipantRole: {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
  },
}));

import { prisma, ConversationType, ParticipantRole } from '../src/prisma.js';
import * as conversationService from '../src/services/conversationService.js';

describe('ConversationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createConversation', () => {
    it('should create a direct conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        tenantId: 'tenant-1',
        type: ConversationType.DIRECT,
        createdBy: 'user-1',
        participants: [
          { userId: 'user-1', role: ParticipantRole.OWNER },
          { userId: 'user-2', role: ParticipantRole.MEMBER },
        ],
      };

      vi.mocked(prisma.conversation.create).mockResolvedValue(mockConversation as any);

      const result = await conversationService.createConversation({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        type: ConversationType.DIRECT,
        participantIds: ['user-2'],
      });

      expect(prisma.conversation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          type: ConversationType.DIRECT,
          createdBy: 'user-1',
          participants: {
            create: expect.arrayContaining([
              expect.objectContaining({ userId: 'user-1', role: ParticipantRole.OWNER }),
              expect.objectContaining({ userId: 'user-2', role: ParticipantRole.MEMBER }),
            ]),
          },
        }),
        include: { participants: true },
      });

      expect(result.id).toBe('conv-1');
    });

    it('should create a group conversation with name', async () => {
      const mockConversation = {
        id: 'conv-2',
        tenantId: 'tenant-1',
        type: ConversationType.GROUP,
        name: 'Team Chat',
        createdBy: 'user-1',
        participants: [],
      };

      vi.mocked(prisma.conversation.create).mockResolvedValue(mockConversation as any);

      await conversationService.createConversation({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        type: ConversationType.GROUP,
        name: 'Team Chat',
        participantIds: ['user-2', 'user-3'],
      });

      expect(prisma.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: ConversationType.GROUP,
            name: 'Team Chat',
          }),
        })
      );
    });

    it('should deduplicate participants including creator', async () => {
      vi.mocked(prisma.conversation.create).mockResolvedValue({ id: 'conv-3' } as any);

      await conversationService.createConversation({
        tenantId: 'tenant-1',
        createdBy: 'user-1',
        participantIds: ['user-1', 'user-2', 'user-1'], // duplicate
      });

      // Should only create 2 participants
      const call = vi.mocked(prisma.conversation.create).mock.calls[0][0];
      const participantCreates = (call.data as any).participants.create;
      expect(participantCreates).toHaveLength(2);
    });
  });

  describe('listConversations', () => {
    it('should return paginated conversations', async () => {
      const mockParticipants = [
        { conversationId: 'conv-1' },
        { conversationId: 'conv-2' },
      ];

      const mockConversations = [
        { id: 'conv-1', name: 'Chat 1' },
        { id: 'conv-2', name: 'Chat 2' },
      ];

      vi.mocked(prisma.participant.findMany).mockResolvedValue(mockParticipants as any);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue(mockConversations as any);
      vi.mocked(prisma.conversation.count).mockResolvedValue(2);

      const result = await conversationService.listConversations(
        { tenantId: 'tenant-1', userId: 'user-1' },
        { page: 1, pageSize: 10 }
      );

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should filter by conversation type', async () => {
      vi.mocked(prisma.participant.findMany).mockResolvedValue([{ conversationId: 'conv-1' }] as any);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversation.count).mockResolvedValue(0);

      await conversationService.listConversations({
        tenantId: 'tenant-1',
        userId: 'user-1',
        type: ConversationType.GROUP,
      });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: ConversationType.GROUP,
          }),
        })
      );
    });

    it('should filter by archived status', async () => {
      vi.mocked(prisma.participant.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversation.findMany).mockResolvedValue([]);
      vi.mocked(prisma.conversation.count).mockResolvedValue(0);

      await conversationService.listConversations({
        tenantId: 'tenant-1',
        userId: 'user-1',
        isArchived: true,
      });

      expect(prisma.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isArchived: true,
          }),
        })
      );
    });
  });

  describe('findOrCreateDirectConversation', () => {
    it('should return existing conversation', async () => {
      const mockParticipant = {
        conversationId: 'existing-conv',
        conversation: {
          id: 'existing-conv',
          type: ConversationType.DIRECT,
          participants: [],
        },
      };

      vi.mocked(prisma.participant.findFirst).mockResolvedValue(mockParticipant as any);

      const result = await conversationService.findOrCreateDirectConversation(
        'tenant-1',
        'user-1',
        'user-2'
      );

      expect(result.id).toBe('existing-conv');
      expect(prisma.conversation.create).not.toHaveBeenCalled();
    });

    it('should create new conversation if none exists', async () => {
      vi.mocked(prisma.participant.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.conversation.create).mockResolvedValue({
        id: 'new-conv',
        type: ConversationType.DIRECT,
      } as any);

      const result = await conversationService.findOrCreateDirectConversation(
        'tenant-1',
        'user-1',
        'user-2'
      );

      expect(result.id).toBe('new-conv');
      expect(prisma.conversation.create).toHaveBeenCalled();
    });
  });

  describe('updateConversation', () => {
    it('should update conversation properties', async () => {
      const mockUpdated = {
        id: 'conv-1',
        name: 'New Name',
        isArchived: false,
      };

      vi.mocked(prisma.conversation.update).mockResolvedValue(mockUpdated as any);

      await conversationService.updateConversation('conv-1', 'tenant-1', {
        name: 'New Name',
      });

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: expect.objectContaining({ name: 'New Name' }),
        include: { participants: true },
      });
    });
  });

  describe('deleteConversation', () => {
    it('should soft delete by archiving', async () => {
      vi.mocked(prisma.conversation.update).mockResolvedValue({ id: 'conv-1' } as any);

      await conversationService.deleteConversation('conv-1', 'tenant-1');

      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-1' },
        data: { isArchived: true },
      });
    });
  });
});
