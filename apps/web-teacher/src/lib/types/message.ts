/**
 * Message/Communication Types for Teacher Portal
 *
 * Parent-teacher communication and messaging
 */

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'parent' | 'admin' | 'system';
  senderPhotoUrl?: string;
  content: string;
  contentType: 'text' | 'html';
  attachments?: MessageAttachment[];
  readBy: string[];
  createdAt: Date;
  editedAt?: Date;
  isSystemMessage?: boolean;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group' | 'announcement';
  subject?: string;
  participants: ConversationParticipant[];
  studentId?: string; // For parent-teacher conversations about a specific student
  studentName?: string;
  classId?: string;
  className?: string;
  lastMessage?: {
    content: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
  };
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  userId: string;
  name: string;
  role: 'teacher' | 'parent' | 'admin';
  photoUrl?: string;
  email?: string;
  lastReadAt?: Date;
  isActive: boolean;
}

export interface MessageRecipient {
  type: 'user' | 'class' | 'group';
  id: string;
  name: string;
  email?: string;
  studentId?: string; // If sending to parent, reference the student
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  thumbnailUrl?: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  subject?: string;
  content: string;
  variables: string[]; // e.g., ['{{studentName}}', '{{className}}']
  isDefault: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TemplateCategory =
  | 'welcome'
  | 'progress_update'
  | 'missing_work'
  | 'behavior'
  | 'celebration'
  | 'meeting_request'
  | 'iep_update'
  | 'general'
  | 'custom';

export interface MessageNotification {
  id: string;
  type: 'new_message' | 'reply' | 'mention';
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  preview: string;
  isRead: boolean;
  createdAt: Date;
}

export interface MessageFilter {
  [key: string]: unknown;
  type?: Conversation['type'];
  classId?: string;
  studentId?: string;
  isUnread?: boolean;
  isArchived?: boolean;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface MessageStats {
  totalConversations: number;
  unreadCount: number;
  sentThisWeek: number;
  averageResponseTime: number; // in minutes
  parentEngagementRate: number;
}

// DTOs
export interface SendMessageDto {
  conversationId?: string; // For existing conversations
  recipients?: MessageRecipient[]; // For new conversations
  subject?: string;
  content: string;
  contentType?: 'text' | 'html';
  attachments?: Omit<MessageAttachment, 'id'>[];
  studentId?: string;
  classId?: string;
  templateId?: string;
  templateVariables?: Record<string, string>;
  scheduledAt?: Date;
}

export interface CreateConversationDto {
  type: 'direct' | 'group' | 'announcement';
  subject?: string;
  recipients: MessageRecipient[];
  studentId?: string;
  classId?: string;
  initialMessage: string;
}

export interface BulkMessageDto {
  recipients: MessageRecipient[];
  subject: string;
  content: string;
  templateId?: string;
  templateVariables?: Record<string, Record<string, string>>; // Per-recipient variables
  attachments?: Omit<MessageAttachment, 'id'>[];
  scheduledAt?: Date;
}
