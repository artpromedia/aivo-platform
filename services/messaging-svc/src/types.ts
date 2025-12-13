/**
 * Messaging Service Types
 */

import type {
  ConversationType,
  ParticipantRole,
  MessageType,
} from './prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSATION TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface CreateConversationInput {
  tenantId: string;
  createdBy: string;
  type?: ConversationType;
  name?: string;
  description?: string;
  avatarUrl?: string;
  participantIds: string[];
  contextType?: string;
  contextId?: string;
}

export interface UpdateConversationInput {
  name?: string;
  description?: string;
  avatarUrl?: string;
  isArchived?: boolean;
  isMuted?: boolean;
}

export interface ConversationFilters {
  tenantId: string;
  userId: string;
  type?: ConversationType;
  isArchived?: boolean;
  contextType?: string;
  contextId?: string;
  search?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// PARTICIPANT TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface AddParticipantsInput {
  conversationId: string;
  tenantId: string;
  userIds: string[];
  role?: ParticipantRole;
  addedBy: string;
}

export interface UpdateParticipantInput {
  role?: ParticipantRole;
  isMuted?: boolean;
  isPinned?: boolean;
  notificationsEnabled?: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface SendMessageInput {
  tenantId: string;
  conversationId: string;
  senderId: string;
  type?: MessageType;
  content: string;
  metadata?: Record<string, unknown>;
  replyToId?: string;
}

export interface EditMessageInput {
  content: string;
  editedBy: string;
}

export interface MessageFilters {
  conversationId: string;
  tenantId: string;
  beforeId?: string;
  afterId?: string;
  senderId?: string;
  type?: MessageType;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGINATION
// ══════════════════════════════════════════════════════════════════════════════

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

export interface CursorPaginatedResult<T> {
  data: T[];
  hasMore: boolean;
  nextCursor?: string;
}
