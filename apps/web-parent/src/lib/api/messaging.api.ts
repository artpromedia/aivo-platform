/**
 * Messaging API Client
 * Sprint 1.8: Integrate Web Parent Messaging with messaging-svc
 *
 * Provides typed API methods for parent-teacher messaging functionality
 * including conversations, messages, and real-time updates.
 */

import { apiClient, isDevMode } from './client';

// ============================================================================
// Types
// ============================================================================

/**
 * Participant in a conversation (teacher or parent)
 */
export interface Participant {
  id: string;
  type: 'parent' | 'teacher' | 'admin';
  name: string;
  avatar?: string;
  role?: string;
  subject?: string;
}

/**
 * Student context for a conversation
 */
export interface StudentContext {
  id: string;
  name: string;
  grade?: string;
  avatar?: string;
}

/**
 * Attachment in a message
 */
export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  thumbnailUrl?: string;
}

/**
 * Message in a conversation
 */
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'parent' | 'teacher' | 'admin' | 'system';
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  readAt?: string;
  deliveredAt?: string;
  attachments?: Attachment[];
  metadata?: Record<string, unknown>;
  replyTo?: string;
  isEdited?: boolean;
  editedAt?: string;
}

/**
 * Conversation between parent and teacher
 */
export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'announcement';
  participants: Participant[];
  student: StudentContext;
  subject: string;
  lastMessage?: {
    content: string;
    sentAt: string;
    senderId: string;
    senderName: string;
  };
  unreadCount: number;
  archived: boolean;
  muted: boolean;
  createdAt: string;
  updatedAt: string;
  // Computed fields for UI
  teacherId?: string;
  teacherName?: string;
  teacherAvatar?: string;
  teacherSubject?: string;
  studentId?: string;
  studentName?: string;
  lastMessageAt?: string;
}

/**
 * Paginated message response
 */
export interface MessagePage {
  messages: Message[];
  conversation: Conversation;
  hasMore: boolean;
  nextCursor?: string;
  totalCount?: number;
}

/**
 * Paginated conversations response
 */
export interface ConversationsPage {
  conversations: Conversation[];
  hasMore: boolean;
  nextCursor?: string;
  totalCount: number;
  totalUnread: number;
}

/**
 * Options for fetching messages
 */
export interface GetMessagesOptions {
  cursor?: string;
  limit?: number;
  before?: string;
  after?: string;
}

/**
 * Options for fetching conversations
 */
export interface GetConversationsOptions {
  includeArchived?: boolean;
  filter?: 'all' | 'unread' | 'starred';
  search?: string;
  cursor?: string;
  limit?: number;
}

/**
 * New message payload
 */
export interface SendMessagePayload {
  content: string;
  attachments?: File[];
  replyTo?: string;
  metadata?: Record<string, unknown>;
}

/**
 * New conversation payload
 */
export interface CreateConversationPayload {
  recipientId: string;
  recipientType: 'teacher' | 'admin';
  studentId: string;
  subject: string;
  initialMessage: string;
  attachments?: File[];
}

/**
 * Teacher info for compose
 */
export interface Teacher {
  id: string;
  name: string;
  avatar?: string;
  subject?: string;
  email?: string;
}

/**
 * Child with teachers for compose
 */
export interface ChildWithTeachers {
  id: string;
  name: string;
  grade?: string;
  avatar?: string;
  teachers: Teacher[];
}

/**
 * Typing indicator event
 */
export interface TypingIndicator {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

/**
 * Read receipt event
 */
export interface ReadReceipt {
  conversationId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

/**
 * Unread counts response
 */
export interface UnreadCounts {
  total: number;
  byConversation: Record<string, number>;
}

// ============================================================================
// Mock Data Generators
// ============================================================================

function generateMockConversations(includeArchived = false): Conversation[] {
  const conversations: Conversation[] = [
    {
      id: 'conv-1',
      type: 'direct',
      participants: [
        { id: 'parent-1', type: 'parent', name: 'Sarah Johnson' },
        { id: 'teacher-1', type: 'teacher', name: 'Mrs. Anderson', subject: 'Math' },
      ],
      student: { id: 'student-1', name: 'Emma', grade: '4' },
      subject: 'Great progress this week!',
      lastMessage: {
        content: 'Emma has been showing excellent progress in fractions...',
        sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        senderId: 'teacher-1',
        senderName: 'Mrs. Anderson',
      },
      unreadCount: 2,
      archived: false,
      muted: false,
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      teacherId: 'teacher-1',
      teacherName: 'Mrs. Anderson',
      teacherSubject: 'Math',
      studentId: 'student-1',
      studentName: 'Emma',
      lastMessageAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'conv-2',
      type: 'direct',
      participants: [
        { id: 'parent-1', type: 'parent', name: 'Sarah Johnson' },
        { id: 'teacher-2', type: 'teacher', name: 'Mr. Chen', subject: 'Science' },
      ],
      student: { id: 'student-1', name: 'Emma', grade: '4' },
      subject: 'Science Fair Project',
      lastMessage: {
        content: 'Just a reminder about the upcoming science fair...',
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        senderId: 'teacher-2',
        senderName: 'Mr. Chen',
      },
      unreadCount: 0,
      archived: false,
      muted: false,
      createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      teacherId: 'teacher-2',
      teacherName: 'Mr. Chen',
      teacherSubject: 'Science',
      studentId: 'student-1',
      studentName: 'Emma',
      lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'conv-3',
      type: 'direct',
      participants: [
        { id: 'parent-1', type: 'parent', name: 'Sarah Johnson' },
        { id: 'teacher-1', type: 'teacher', name: 'Mrs. Anderson', subject: 'Math' },
      ],
      student: { id: 'student-2', name: 'Noah', grade: '2' },
      subject: 'Parent-Teacher Conference',
      lastMessage: {
        content: "I'd like to schedule a brief conference to discuss Noah's progress...",
        sentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        senderId: 'teacher-1',
        senderName: 'Mrs. Anderson',
      },
      unreadCount: 0,
      archived: false,
      muted: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      teacherId: 'teacher-1',
      teacherName: 'Mrs. Anderson',
      teacherSubject: 'Math',
      studentId: 'student-2',
      studentName: 'Noah',
      lastMessageAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  if (includeArchived) {
    conversations.push({
      id: 'conv-archived-1',
      type: 'direct',
      participants: [
        { id: 'parent-1', type: 'parent', name: 'Sarah Johnson' },
        { id: 'teacher-3', type: 'teacher', name: 'Ms. Williams', subject: 'Reading' },
      ],
      student: { id: 'student-1', name: 'Emma', grade: '4' },
      subject: 'Reading Assignment Question',
      lastMessage: {
        content: 'Thanks for clarifying!',
        sentAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        senderId: 'parent-1',
        senderName: 'Sarah Johnson',
      },
      unreadCount: 0,
      archived: true,
      muted: false,
      createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      teacherId: 'teacher-3',
      teacherName: 'Ms. Williams',
      teacherSubject: 'Reading',
      studentId: 'student-1',
      studentName: 'Emma',
      lastMessageAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  return conversations.filter((c) => includeArchived || !c.archived);
}

function generateMockMessages(conversationId: string): Message[] {
  const baseMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId,
      senderId: 'teacher-1',
      senderType: 'teacher',
      senderName: 'Mrs. Anderson',
      content: "Hello! I wanted to share some updates about Emma's progress in class.",
      sentAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 4 * 60 * 60 * 1000 + 1000).toISOString(),
    },
    {
      id: 'msg-2',
      conversationId,
      senderId: 'teacher-1',
      senderType: 'teacher',
      senderName: 'Mrs. Anderson',
      content:
        'Emma has been showing excellent progress in fractions. She helped other students understand the concept today! Her ability to explain math concepts to her peers really demonstrates her understanding.',
      sentAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 3.5 * 60 * 60 * 1000 + 1000).toISOString(),
    },
    {
      id: 'msg-3',
      conversationId,
      senderId: 'parent-1',
      senderType: 'parent',
      senderName: 'Sarah Johnson',
      content:
        "Thank you so much for letting me know! We've been practicing at home with some fraction worksheets. It's great to hear that the extra practice is paying off!",
      sentAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      readAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
      deliveredAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 500).toISOString(),
    },
    {
      id: 'msg-4',
      conversationId,
      senderId: 'teacher-1',
      senderType: 'teacher',
      senderName: 'Mrs. Anderson',
      content:
        "That's wonderful to hear! The extra practice at home really does make a difference. Would you like me to send some additional resources that might help continue building on this success?",
      sentAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    },
  ];

  return baseMessages;
}

function generateMockChildrenWithTeachers(): ChildWithTeachers[] {
  return [
    {
      id: 'student-1',
      name: 'Emma',
      grade: '4',
      teachers: [
        { id: 'teacher-1', name: 'Mrs. Anderson', subject: 'Math' },
        { id: 'teacher-2', name: 'Mr. Chen', subject: 'Science' },
        { id: 'teacher-3', name: 'Ms. Williams', subject: 'Reading' },
        { id: 'teacher-4', name: 'Mr. Davis', subject: 'Social Studies' },
      ],
    },
    {
      id: 'student-2',
      name: 'Noah',
      grade: '2',
      teachers: [
        { id: 'teacher-5', name: 'Mrs. Brown', subject: 'General' },
        { id: 'teacher-6', name: 'Mr. Wilson', subject: 'Art' },
      ],
    },
  ];
}

// ============================================================================
// API Client
// ============================================================================

export const messagingApi = {
  // ==========================================================================
  // Conversations
  // ==========================================================================

  /**
   * Get list of conversations for the current user
   */
  async getConversations(options?: GetConversationsOptions): Promise<ConversationsPage> {
    const params = new URLSearchParams();

    if (options?.includeArchived) {
      params.append('includeArchived', 'true');
    }
    if (options?.filter && options.filter !== 'all') {
      params.append('filter', options.filter);
    }
    if (options?.search) {
      params.append('search', options.search);
    }
    if (options?.cursor) {
      params.append('cursor', options.cursor);
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }

    const queryString = params.toString();
    const url = `/messaging/conversations${queryString ? `?${queryString}` : ''}`;

    try {
      return await apiClient.get<ConversationsPage>(url);
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Using mock conversations data');
        const conversations = generateMockConversations(options?.includeArchived);
        return {
          conversations,
          hasMore: false,
          totalCount: conversations.length,
          totalUnread: conversations.reduce((sum, c) => sum + c.unreadCount, 0),
        };
      }
      throw error;
    }
  },

  /**
   * Get a single conversation by ID
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    try {
      return await apiClient.get<Conversation>(`/messaging/conversations/${conversationId}`);
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Using mock conversation data');
        const conversations = generateMockConversations(true);
        const conversation = conversations.find((c) => c.id === conversationId);
        if (!conversation) {
          throw new Error('Conversation not found');
        }
        return conversation;
      }
      throw error;
    }
  },

  /**
   * Create a new conversation
   */
  async createConversation(payload: CreateConversationPayload): Promise<Conversation> {
    try {
      return await apiClient.post<Conversation>('/messaging/conversations', {
        recipientId: payload.recipientId,
        recipientType: payload.recipientType,
        studentId: payload.studentId,
        subject: payload.subject,
        message: payload.initialMessage,
      });
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating conversation creation');
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newConversation: Conversation = {
          id: `conv-${Date.now()}`,
          type: 'direct',
          participants: [
            { id: 'parent-1', type: 'parent', name: 'Sarah Johnson' },
            { id: payload.recipientId, type: payload.recipientType, name: 'Teacher' },
          ],
          student: { id: payload.studentId, name: 'Child' },
          subject: payload.subject,
          lastMessage: {
            content: payload.initialMessage,
            sentAt: new Date().toISOString(),
            senderId: 'parent-1',
            senderName: 'Sarah Johnson',
          },
          unreadCount: 0,
          archived: false,
          muted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          teacherId: payload.recipientId,
          teacherName: 'Teacher',
          studentId: payload.studentId,
          studentName: 'Child',
          lastMessageAt: new Date().toISOString(),
        };

        return newConversation;
      }
      throw error;
    }
  },

  /**
   * Archive a conversation
   */
  async archiveConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.put(`/messaging/conversations/${conversationId}/archive`, {});
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating archive conversation');
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }
      throw error;
    }
  },

  /**
   * Unarchive a conversation
   */
  async unarchiveConversation(conversationId: string): Promise<void> {
    try {
      await apiClient.put(`/messaging/conversations/${conversationId}/unarchive`, {});
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating unarchive conversation');
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }
      throw error;
    }
  },

  /**
   * Mute/unmute a conversation
   */
  async setMuted(conversationId: string, muted: boolean): Promise<void> {
    try {
      await apiClient.put(`/messaging/conversations/${conversationId}/mute`, { muted });
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating mute conversation');
        await new Promise((resolve) => setTimeout(resolve, 200));
        return;
      }
      throw error;
    }
  },

  // ==========================================================================
  // Messages
  // ==========================================================================

  /**
   * Get messages in a conversation with pagination
   */
  async getMessages(conversationId: string, options?: GetMessagesOptions): Promise<MessagePage> {
    const params = new URLSearchParams();

    if (options?.cursor) {
      params.append('cursor', options.cursor);
    }
    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.before) {
      params.append('before', options.before);
    }
    if (options?.after) {
      params.append('after', options.after);
    }

    const queryString = params.toString();
    const url = `/messaging/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`;

    try {
      return await apiClient.get<MessagePage>(url);
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Using mock messages data');
        const messages = generateMockMessages(conversationId);
        const conversations = generateMockConversations(true);
        const conversation = conversations.find((c) => c.id === conversationId) || conversations[0];

        return {
          messages,
          conversation,
          hasMore: false,
          totalCount: messages.length,
        };
      }
      throw error;
    }
  },

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, payload: SendMessagePayload): Promise<Message> {
    try {
      // Handle file attachments if present
      if (payload.attachments && payload.attachments.length > 0) {
        const formData = new FormData();
        formData.append('content', payload.content);
        if (payload.replyTo) {
          formData.append('replyTo', payload.replyTo);
        }
        payload.attachments.forEach((file) => {
          formData.append('attachments', file);
        });

        // Use fetch directly for FormData
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || ''}/messaging/conversations/${conversationId}/messages`,
          {
            method: 'POST',
            body: formData,
            credentials: 'include',
          }
        );

        if (!response.ok) {
          throw new Error('Failed to send message with attachments');
        }

        return response.json() as Promise<Message>;
      }

      // Regular message without attachments
      return await apiClient.post<Message>(`/messaging/conversations/${conversationId}/messages`, {
        content: payload.content,
        replyTo: payload.replyTo,
        metadata: payload.metadata,
      });
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating message send');
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          conversationId,
          senderId: 'parent-1',
          senderType: 'parent',
          senderName: 'Sarah Johnson',
          content: payload.content,
          sentAt: new Date().toISOString(),
          deliveredAt: new Date().toISOString(),
        };

        return newMessage;
      }
      throw error;
    }
  },

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string, messageId?: string): Promise<void> {
    try {
      await apiClient.post(`/messaging/conversations/${conversationId}/read`, {
        messageId,
      });
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating mark as read');
        return;
      }
      throw error;
    }
  },

  /**
   * Delete a message (only own messages within time limit)
   */
  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    try {
      await apiClient.delete(`/messaging/conversations/${conversationId}/messages/${messageId}`);
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating message deletion');
        await new Promise((resolve) => setTimeout(resolve, 300));
        return;
      }
      throw error;
    }
  },

  /**
   * Edit a message (only own messages within time limit)
   */
  async editMessage(conversationId: string, messageId: string, content: string): Promise<Message> {
    try {
      return await apiClient.put<Message>(
        `/messaging/conversations/${conversationId}/messages/${messageId}`,
        { content }
      );
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Simulating message edit');
        await new Promise((resolve) => setTimeout(resolve, 300));

        return {
          id: messageId,
          conversationId,
          senderId: 'parent-1',
          senderType: 'parent',
          senderName: 'Sarah Johnson',
          content,
          sentAt: new Date().toISOString(),
          isEdited: true,
          editedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  },

  // ==========================================================================
  // Typing Indicators
  // ==========================================================================

  /**
   * Send typing indicator
   */
  async sendTypingIndicator(conversationId: string, isTyping: boolean): Promise<void> {
    try {
      await apiClient.post(`/messaging/conversations/${conversationId}/typing`, { isTyping });
    } catch {
      // Silently fail typing indicators
      if (isDevMode()) {
        console.warn('[DEV] Typing indicator skipped');
      }
    }
  },

  // ==========================================================================
  // Unread Counts
  // ==========================================================================

  /**
   * Get unread message counts
   */
  async getUnreadCounts(): Promise<UnreadCounts> {
    try {
      return await apiClient.get<UnreadCounts>('/messaging/unread');
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Using mock unread counts');
        const conversations = generateMockConversations();
        const byConversation: Record<string, number> = {};
        let total = 0;

        conversations.forEach((c) => {
          if (c.unreadCount > 0) {
            byConversation[c.id] = c.unreadCount;
            total += c.unreadCount;
          }
        });

        return { total, byConversation };
      }
      throw error;
    }
  },

  // ==========================================================================
  // Children & Teachers
  // ==========================================================================

  /**
   * Get children with their teachers for compose modal
   */
  async getChildrenWithTeachers(): Promise<ChildWithTeachers[]> {
    try {
      return await apiClient.get<ChildWithTeachers[]>('/parent/children/with-teachers');
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Using mock children with teachers');
        return generateMockChildrenWithTeachers();
      }
      throw error;
    }
  },

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Search messages across all conversations
   */
  async searchMessages(
    query: string,
    options?: { limit?: number; cursor?: string }
  ): Promise<{ messages: Message[]; hasMore: boolean; nextCursor?: string }> {
    const params = new URLSearchParams();
    params.append('q', query);

    if (options?.limit) {
      params.append('limit', String(options.limit));
    }
    if (options?.cursor) {
      params.append('cursor', options.cursor);
    }

    try {
      return await apiClient.get(`/messaging/search?${params.toString()}`);
    } catch (error) {
      if (isDevMode()) {
        console.warn('[DEV] Using mock message search');
        // Return empty results in dev mode
        return { messages: [], hasMore: false };
      }
      throw error;
    }
  },
};

// ============================================================================
// Export Mock Generators for Testing
// ============================================================================

export { generateMockConversations, generateMockMessages, generateMockChildrenWithTeachers };
