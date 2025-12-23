/**
 * Messages API Service
 */

import type {
  Message,
  Conversation,
  SendMessageDto,
  CreateConversationDto,
  BulkMessageDto,
  MessageTemplate,
  MessageFilter,
  MessageStats,
} from '../types/message';

import { api } from './client';

export const messagesApi = {
  /**
   * Get all conversations
   */
  getConversations: (params?: MessageFilter) =>
    api.get<Conversation[]>('/api/teacher/messages/conversations', params),

  /**
   * Get a single conversation
   */
  getConversation: (id: string) =>
    api.get<Conversation>(`/api/teacher/messages/conversations/${id}`),

  /**
   * Create a new conversation
   */
  createConversation: (data: CreateConversationDto) =>
    api.post<Conversation>('/api/teacher/messages/conversations', data),

  /**
   * Get messages in a conversation
   */
  getMessages: (conversationId: string, params?: { limit?: number; before?: Date }) =>
    api.get<Message[]>(`/api/teacher/messages/conversations/${conversationId}/messages`, params),

  /**
   * Send a message
   */
  send: (data: SendMessageDto) => api.post<Message>('/api/teacher/messages', data),

  /**
   * Send bulk messages
   */
  sendBulk: (data: BulkMessageDto) =>
    api.post<{ sent: number; failed: number }>('/api/teacher/messages/bulk', data),

  /**
   * Mark conversation as read
   */
  markAsRead: (conversationId: string) =>
    api.post<undefined>(`/api/teacher/messages/conversations/${conversationId}/read`),

  /**
   * Mark all conversations as read
   */
  markAllAsRead: () => api.post<undefined>('/api/teacher/messages/read-all'),

  /**
   * Archive a conversation
   */
  archive: (conversationId: string) =>
    api.post<undefined>(`/api/teacher/messages/conversations/${conversationId}/archive`),

  /**
   * Unarchive a conversation
   */
  unarchive: (conversationId: string) =>
    api.delete<undefined>(`/api/teacher/messages/conversations/${conversationId}/archive`),

  /**
   * Pin a conversation
   */
  pin: (conversationId: string) =>
    api.post<undefined>(`/api/teacher/messages/conversations/${conversationId}/pin`),

  /**
   * Unpin a conversation
   */
  unpin: (conversationId: string) =>
    api.delete<undefined>(`/api/teacher/messages/conversations/${conversationId}/pin`),

  /**
   * Mute a conversation
   */
  mute: (conversationId: string) =>
    api.post<undefined>(`/api/teacher/messages/conversations/${conversationId}/mute`),

  /**
   * Unmute a conversation
   */
  unmute: (conversationId: string) =>
    api.delete<undefined>(`/api/teacher/messages/conversations/${conversationId}/mute`),

  /**
   * Delete a message
   */
  deleteMessage: (conversationId: string, messageId: string) =>
    api.delete<undefined>(
      `/api/teacher/messages/conversations/${conversationId}/messages/${messageId}`
    ),

  /**
   * Get message templates
   */
  getTemplates: (category?: string) =>
    api.get<MessageTemplate[]>('/api/teacher/messages/templates', { category }),

  /**
   * Create message template
   */
  createTemplate: (template: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<MessageTemplate>('/api/teacher/messages/templates', template),

  /**
   * Update message template
   */
  updateTemplate: (id: string, template: Partial<MessageTemplate>) =>
    api.patch<MessageTemplate>(`/api/teacher/messages/templates/${id}`, template),

  /**
   * Delete message template
   */
  deleteTemplate: (id: string) => api.delete<undefined>(`/api/teacher/messages/templates/${id}`),

  /**
   * Get messaging statistics
   */
  getStats: () => api.get<MessageStats>('/api/teacher/messages/stats'),

  /**
   * Get unread count
   */
  getUnreadCount: () => api.get<{ count: number }>('/api/teacher/messages/unread-count'),

  /**
   * Search messages
   */
  search: (query: string, params?: { conversationId?: string; limit?: number }) =>
    api.get<Message[]>('/api/teacher/messages/search', { query, ...params }),

  /**
   * Upload attachment
   */
  uploadAttachment: (file: File) =>
    api.upload<{ id: string; name: string; url: string; type: string; size: number }>(
      '/api/teacher/messages/attachments',
      file
    ),
};
