/**
 * Messaging Service Types
 *
 * Type definitions for parent-teacher messaging,
 * conversations, and content moderation.
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum ConversationStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
}

export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

export enum SenderType {
  PARENT = 'parent',
  TEACHER = 'teacher',
}

export enum ReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

// ============================================================================
// DTOs - Input Types
// ============================================================================

export interface CreateConversationDto {
  studentId: string;
  teacherId: string;
  subject?: string;
}

export interface SendMessageDto {
  conversationId: string;
  content: string;
  attachments?: MessageAttachment[];
}

export interface ReportMessageDto {
  messageId: string;
  reason: string;
}

export interface MessageAttachment {
  name: string;
  url: string;
  mimeType: string;
  size?: number;
}

// ============================================================================
// OUTPUT TYPES
// ============================================================================

export interface Conversation {
  id: string;
  subject?: string | null;
  status: ConversationStatus;
  createdAt: Date;
  lastMessageAt?: Date | null;
}

export interface ConversationWithParticipants extends Conversation {
  parent: ParticipantInfo;
  teacher: ParticipantInfo;
  student: StudentInfo;
  lastMessage?: MessagePreview | null;
  unreadCount: number;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  photoUrl?: string | null;
}

export interface StudentInfo {
  id: string;
  name: string;
}

export interface MessagePreview {
  content: string;
  sentAt: Date;
  senderType: SenderType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  contentHtml?: string;
  attachments?: MessageAttachment[] | null;
  status: MessageStatus;
  readAt?: Date | null;
  createdAt: Date;
}

export interface MessageThread {
  conversation: ConversationDetails;
  messages: Message[];
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface ConversationDetails {
  id: string;
  subject?: string | null;
  parent: ParticipantInfo;
  teacher: ParticipantInfo;
  student: StudentInfo;
}

export interface ModerationResult {
  approved: boolean;
  score: number;
  reason?: string;
  flaggedCategories?: string[];
}

export interface MessageReport {
  id: string;
  messageId: string;
  reporterId: string;
  reporterType: SenderType;
  reason: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date | null;
  resolution?: string | null;
}
