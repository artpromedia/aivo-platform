/**
 * Collaboration Types
 *
 * Shared types for the collaboration system
 */

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

export interface ConnectionInfo {
  socketId: string;
  userId: string;
  tenantId: string;
  state: ConnectionState;
  latency: number;
  serverTime: number;
}

// ============================================================================
// PRESENCE TYPES
// ============================================================================

export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  status: UserStatus;
  customStatus?: string;
  lastSeen: Date;
  currentRoom?: string;
  currentActivity?: string;
}

export interface PresenceUpdate {
  status: UserStatus;
  customStatus?: string;
}

// ============================================================================
// ROOM TYPES
// ============================================================================

export type RoomType =
  | 'class'
  | 'lesson'
  | 'assessment'
  | 'whiteboard'
  | 'document'
  | 'session'
  | 'chat';

export interface RoomUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  role?: string;
  joinedAt: Date;
}

export interface RoomState {
  id: string;
  type: RoomType;
  users: RoomUser[];
  cursors: Record<string, CursorData>;
  selections: Record<string, SelectionData>;
  document?: unknown;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CURSOR TYPES
// ============================================================================

export interface Position2D {
  x: number;
  y: number;
}

export interface TextPosition {
  line: number;
  column: number;
}

export type CursorPosition = Position2D | TextPosition;

export interface CursorData {
  userId: string;
  displayName: string;
  color: string;
  position: CursorPosition;
  elementId?: string;
  timestamp: number;
}

// ============================================================================
// SELECTION TYPES
// ============================================================================

export interface TextRange {
  start: TextPosition;
  end: TextPosition;
}

export interface SelectionData {
  userId: string;
  displayName: string;
  color: string;
  selection: TextRange | null;
  elementId?: string;
  timestamp: number;
}

// ============================================================================
// DOCUMENT TYPES
// ============================================================================

export interface DocumentInfo {
  id: string;
  version: number;
  synced: boolean;
  pending: boolean;
}

export interface DocumentUpdate {
  documentId: string;
  update: Uint8Array | number[];
  origin: string;
  clientId: number;
  version: number;
  timestamp: number;
}

export interface SyncState {
  synced: boolean;
  pending: boolean;
  version: number;
  lastSync: Date | null;
}

// ============================================================================
// CHAT TYPES
// ============================================================================

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  type: 'text' | 'system' | 'file' | 'image';
  replyTo?: string;
  threadId?: string;
  attachments?: ChatAttachment[];
  reactions: ChatReaction[];
  mentions?: string[];
  edited: boolean;
  editedAt?: Date;
  deleted: boolean;
  createdAt: Date;
}

export interface ChatAttachment {
  id: string;
  type: 'file' | 'image' | 'video' | 'audio' | 'link';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
}

export interface ChatReaction {
  emoji: string;
  userIds: string[];
}

export interface TypingUser {
  userId: string;
  displayName: string;
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

export type ActivityType =
  | 'lesson.created'
  | 'lesson.updated'
  | 'lesson.published'
  | 'lesson.completed'
  | 'assessment.created'
  | 'assessment.submitted'
  | 'assessment.graded'
  | 'class.joined'
  | 'class.left'
  | 'comment.added'
  | 'comment.resolved'
  | 'achievement.earned'
  | 'badge.awarded'
  | 'goal.completed'
  | 'collaboration.started'
  | 'collaboration.ended'
  | 'user.online'
  | 'user.offline'
  | 'system.announcement';

export type ActivityScope = 'user' | 'class' | 'tenant' | 'global';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  scope: ActivityScope;
  scopeId: string;
  actorId: string;
  actorName: string;
  actorAvatarUrl?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  message: string;
  data?: Record<string, unknown>;
  metadata?: {
    url?: string;
    icon?: string;
    color?: string;
  };
  createdAt: Date;
  read?: boolean;
}

// ============================================================================
// COMMENT TYPES
// ============================================================================

export interface Comment {
  id: string;
  targetType: 'lesson' | 'block' | 'assessment' | 'response';
  targetId: string;
  content: string;
  position?: Position2D | { start: number; end: number };
  parentId?: string;
  userId: string;
  displayName: string;
  avatarUrl?: string;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  replies?: Comment[];
}

// ============================================================================
// WHITEBOARD TYPES
// ============================================================================

export type WhiteboardTool =
  | 'select'
  | 'pen'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'sticky';

export interface WhiteboardElement {
  id: string;
  type: 'path' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'image' | 'sticky';
  points?: Position2D[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  imageUrl?: string;
  color: string;
  fillColor?: string;
  strokeWidth: number;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
  rotation?: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
  duration?: number;
  dismissible?: boolean;
  timestamp: Date;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

export interface SocketEvents {
  // Connection events
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (error: { code: string; message: string }) => void;
  connected: (info: ConnectionInfo) => void;

  // Room events
  'room:user-joined': (user: RoomUser) => void;
  'room:user-left': (data: { userId: string; timestamp: number }) => void;
  'room:state': (state: RoomState) => void;

  // Cursor events
  'cursor:moved': (cursor: CursorData) => void;
  'selection:changed': (selection: SelectionData) => void;

  // Document events
  'doc:updated': (update: DocumentUpdate) => void;
  'doc:synced': (data: { documentId: string; version: number }) => void;
  'doc:awareness-update': (data: { userId: string; awareness: unknown }) => void;

  // Presence events
  'presence:changed': (presence: PresenceUser) => void;

  // Chat events
  'chat:message': (message: ChatMessage) => void;
  'chat:reaction': (data: { messageId: string; userId: string; emoji: string; added: boolean }) => void;
  'chat:user-typing': (data: TypingUser & { isTyping: boolean }) => void;
  'chat:message-edited': (message: ChatMessage) => void;
  'chat:message-deleted': (data: { messageId: string }) => void;

  // Comment events
  'comment:added': (comment: Comment) => void;
  'comment:resolved': (data: { commentId: string; resolved: boolean; resolvedBy: string }) => void;
  'comment:deleted': (data: { commentId: string }) => void;

  // Activity events
  'activity:new': (activity: ActivityItem) => void;

  // Notification events
  'notification:new': (notification: Notification) => void;
}
