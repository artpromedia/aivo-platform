/**
 * Realtime Service Types
 *
 * Core type definitions for the WebSocket gateway, presence, and collaboration.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WebSocket event types
 */
export enum WSEventType {
  // Connection events
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  ERROR = 'error',

  // Presence events
  PRESENCE_JOIN = 'presence:join',
  PRESENCE_LEAVE = 'presence:leave',
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_SYNC = 'presence:sync',

  // Room events
  ROOM_JOIN = 'room:join',
  ROOM_LEAVE = 'room:leave',
  ROOM_MESSAGE = 'room:message',
  ROOM_STATE = 'room:state',

  // Session events
  SESSION_UPDATE = 'session:update',
  SESSION_ACTIVITY = 'session:activity',
  SESSION_PROGRESS = 'session:progress',
  SESSION_COMPLETE = 'session:complete',

  // Collaboration events
  COLLAB_CURSOR = 'collab:cursor',
  COLLAB_SELECTION = 'collab:selection',
  COLLAB_OPERATION = 'collab:operation',
  COLLAB_SYNC = 'collab:sync',
  COLLAB_LOCK = 'collab:lock',
  COLLAB_UNLOCK = 'collab:unlock',

  // Notification events
  NOTIFICATION_PUSH = 'notification:push',
  NOTIFICATION_READ = 'notification:read',

  // Analytics events
  ANALYTICS_UPDATE = 'analytics:update',
  ANALYTICS_ALERT = 'analytics:alert',
  ANALYTICS_SUBSCRIBE = 'analytics:subscribe',
  ALERT_ACKNOWLEDGE = 'alert:acknowledge',
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET DATA TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * JWT payload after verification
 */
export interface JWTPayload {
  sub: string;
  tenantId: string;
  role: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

/**
 * Socket data attached after authentication
 */
export interface SocketData {
  userId: string;
  tenantId: string;
  role: string;
  displayName: string;
  sessionId: string;
  rooms: Set<string>;
  lastActivity: Date;
  device: DeviceType;
}

/**
 * Device type for presence
 */
export type DeviceType = 'web' | 'mobile' | 'tablet';

/**
 * User status for presence
 */
export type UserStatus = 'online' | 'away' | 'busy' | 'offline';

// ═══════════════════════════════════════════════════════════════════════════════
// PRESENCE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Presence information for a user
 */
export interface UserPresence {
  userId: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  lastSeen: Date;
  currentRoom?: string;
  cursorPosition?: CursorPosition;
  selectedElement?: string;
  device: DeviceType;
  color?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cursor position for collaboration
 */
export interface CursorPosition {
  x: number;
  y: number;
}

/**
 * Presence entry stored in Redis
 */
export interface PresenceEntry {
  presence: UserPresence;
  expiresAt: number;
  serverId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROOM TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Room types
 */
export type RoomType = 'class' | 'session' | 'document' | 'planning' | 'analytics';

/**
 * Room configuration
 */
export interface RoomConfig {
  id: string;
  type: RoomType;
  maxMembers?: number;
  persistent?: boolean;
  allowAnonymous?: boolean;
  permissions?: RoomPermissions;
}

/**
 * Room permissions
 */
export interface RoomPermissions {
  canBroadcast?: string[];
  canEdit?: string[];
  canView?: string[];
}

/**
 * Room member
 */
export interface RoomMember {
  socketId: string;
  userId: string;
  displayName: string;
  joinedAt: Date;
  role?: string;
  tenantId?: string;
}

/**
 * Room state
 */
export interface RoomState {
  members: RoomMember[];
  state: Record<string, unknown>;
  version: number;
  lastModified: Date;
}

/**
 * Room message
 */
export interface RoomMessage {
  type: string;
  data: unknown;
  sender: {
    userId: string;
    displayName: string;
  };
  roomId: string;
  timestamp: string;
  messageId: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLABORATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Collaborative operation types
 */
export type OperationType = 'insert' | 'delete' | 'retain' | 'format';

/**
 * Collaborative operation structure (for OT/CRDT)
 */
export interface CollaborativeOperation {
  type: OperationType;
  position?: number;
  length?: number;
  text?: string;
  attributes?: Record<string, unknown>;
}

/**
 * Document state for collaboration
 */
export interface DocumentState {
  content: string;
  version: number;
  operations: CollaborativeOperation[];
  lastModified: Date;
}

/**
 * Document lock
 */
export interface DocumentLock {
  lockId: string;
  userId: string;
  displayName: string;
  elementId?: string;
  acquiredAt: Date;
  expiresAt: Date;
}

/**
 * Lock acquisition result
 */
export interface LockResult {
  acquired: boolean;
  lockId?: string;
  expiresAt?: Date;
  currentHolder?: { userId: string; displayName: string };
}

/**
 * Operation result
 */
export interface OperationResult {
  success: boolean;
  transformedOperation?: CollaborativeOperation;
  newVersion?: number;
  acknowledgedOperation?: CollaborativeOperation;
  serverVersion?: number;
  serverState?: string;
  conflict?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SESSION & ANALYTICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Session status
 */
export type SessionStatus = 'started' | 'progress' | 'completed' | 'paused';

/**
 * Live session update
 */
export interface LiveSessionUpdate {
  sessionId: string;
  studentId: string;
  studentName: string;
  status: SessionStatus;
  progress: number;
  currentActivity?: string;
  currentSkill?: string;
  score?: number;
  timestamp: Date;
}

/**
 * Live analytics update
 */
export interface LiveAnalyticsUpdate {
  classId: string;
  metric: string;
  value: number;
  previousValue?: number;
  timestamp: Date;
}

/**
 * Alert types
 */
export type AlertType = 'engagement' | 'frustration' | 'milestone' | 'help_needed';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Live alert
 */
export interface LiveAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  studentId: string;
  studentName: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Room join payload
 */
export interface RoomJoinPayload {
  roomId: string;
  roomType: RoomType;
}

/**
 * Room leave payload
 */
export interface RoomLeavePayload {
  roomId: string;
}

/**
 * Room message payload
 */
export interface RoomMessagePayload {
  roomId: string;
  type: string;
  data: unknown;
  targetUsers?: string[];
}

/**
 * Presence update payload
 */
export interface PresenceUpdatePayload {
  status?: UserStatus;
  cursorPosition?: CursorPosition;
  selectedElement?: string;
  metadata?: Record<string, unknown>;
  currentRoom?: string;
}

/**
 * Presence sync payload
 */
export interface PresenceSyncPayload {
  userIds?: string[];
  roomId?: string;
}

/**
 * Collaboration operation payload
 */
export interface CollabOperationPayload {
  roomId: string;
  documentId: string;
  operation: CollaborativeOperation;
  version: number;
}

/**
 * Collaboration cursor payload
 */
export interface CollabCursorPayload {
  roomId: string;
  documentId: string;
  cursor: {
    position: number;
    selectionStart?: number;
    selectionEnd?: number;
  };
}

/**
 * Collaboration lock payload
 */
export interface CollabLockPayload {
  documentId: string;
  elementId?: string;
  duration?: number;
}

/**
 * Collaboration unlock payload
 */
export interface CollabUnlockPayload {
  documentId: string;
  elementId?: string;
  lockId: string;
}

/**
 * Analytics subscription payload
 */
export interface AnalyticsSubscribePayload {
  classId: string;
  metrics: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TUTOR SESSION EVENTS & PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tutor session WebSocket event names.
 *
 * Uses "tutor:" namespace to avoid collisions with other event types.
 * These events drive the stream-then-synthesize pattern:
 *   1. Client sends MESSAGE_SEND
 *   2. Server replies with TYPING → MESSAGE_CHUNK (×N) → MESSAGE_END
 *   3. Client plays audio with lip-sync from MESSAGE_END visemes
 */
export const TutorEvents = {
  /** Client → Server: Student sends a message to the tutor */
  MESSAGE_SEND: 'tutor:message:send',
  /** Server → Client: AI tutor is processing the message */
  TYPING: 'tutor:typing',
  /** Server → Client: A chunk of the AI response (streamed text) */
  MESSAGE_CHUNK: 'tutor:message:chunk',
  /** Server → Client: Full response complete with audio + visemes */
  MESSAGE_END: 'tutor:message:end',
  /** Server → Client: Avatar state change (without audio) */
  AVATAR_STATE: 'tutor:avatar:state',
  /** Server → Client: Error during tutor processing */
  ERROR: 'tutor:error',
  /** Client → Server: Student requests to replay audio for a message */
  AUDIO_REPLAY: 'tutor:audio:replay',
  /** Client → Server: Join a tutor session room */
  JOIN_SESSION: 'tutor:session:join',
  /** Client → Server: Leave a tutor session room */
  LEAVE_SESSION: 'tutor:session:leave',
  /** Server → Client: Session state update (paused, ended by time limit, etc.) */
  SESSION_STATE: 'tutor:session:state',
} as const;

/**
 * Payload for tutor:message:send
 */
export interface TutorMessageSendPayload {
  sessionId: string;
  content: string;
}

/**
 * Payload for tutor:typing
 */
export interface TutorTypingPayload {
  sessionId: string;
  personaName: string;
  avatarState: 'thinking';
}

/**
 * Payload for tutor:message:chunk
 */
export interface TutorMessageChunkPayload {
  sessionId: string;
  chunkText: string;
  accumulatedText: string;
  chunkIndex: number;
}

/**
 * Payload for tutor:message:end
 */
export interface TutorMessageEndPayload {
  sessionId: string;
  messageId: string;
  content: string;
  audioUrl: string | null;
  visemes: Array<{
    offsetMs: number;
    visemeId: number;
    mouthOpen: number;
    durationMs: number;
  }>;
  emotionTag: string;
  avatarState: string;
  voiceInfo: {
    voiceUsed: string;
    locale: string;
    fallbackUsed: boolean;
  } | null;
}

/**
 * Payload for tutor:avatar:state
 */
export interface TutorAvatarStatePayload {
  sessionId: string;
  avatarState: string;
  emotionTag?: string;
  durationMs?: number;
}

/**
 * Payload for tutor:error
 */
export interface TutorErrorPayload {
  sessionId: string;
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Payload for tutor:session:state
 */
export interface TutorSessionStatePayload {
  sessionId: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'EXPIRED';
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-SERVER MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Cross-server broadcast message
 */
export interface BroadcastMessage {
  type: 'broadcast' | 'targeted' | 'room';
  room?: string;
  event: string;
  data: unknown;
  targetUserIds?: string[];
  excludeSocketId?: string;
}

/**
 * Server metrics
 */
export interface ServerMetrics {
  serverId: string;
  connections: number;
  rooms: number;
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
}
