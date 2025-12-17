/**
 * WebSocket Service
 *
 * Real-time collaboration service using Socket.io for:
 * - Presence tracking (who's online, cursor positions)
 * - Live content updates (collaborative editing)
 * - Review comments and notifications
 */

import { io, type Socket } from 'socket.io-client';

import { tokenManager } from '../api/client';
import type {
  Collaborator,
  CursorPosition,
  EditOperation,
  CollaborationEventType,
  LockState,
} from '../api/collaboration';
import { getUserColor } from '../api/collaboration';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface WebSocketConfig {
  url?: string;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
}

export interface JoinRoomPayload {
  contentId: string;
  versionId: string;
  userId: string;
  userName: string;
}

export interface ContentChangePayload {
  versionId: string;
  operation: EditOperation;
}

export interface CursorUpdatePayload {
  versionId: string;
  position: CursorPosition | null;
}

export type EventCallback<T = unknown> = (data: T) => void;

// ══════════════════════════════════════════════════════════════════════════════
// WEBSOCKET SERVICE CLASS
// ══════════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3003',
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
};

class WebSocketService {
  private socket: Socket | null = null;
  private readonly config: Required<WebSocketConfig>;
  private currentRoom: string | null = null;
  private readonly eventListeners = new Map<string, Set<EventCallback>>();
  private readonly pendingOperations = new Map<string, EditOperation>();
  private reconnectCount = 0;
  private userId: string | null = null;
  private userName: string | null = null;

  constructor(config?: WebSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CONNECTION MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Connect to the WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        resolve();
        return;
      }

      const token = tokenManager.getAccessToken();
      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      this.socket = io(this.config.url, {
        auth: { token },
        reconnection: this.config.reconnection,
        reconnectionAttempts: this.config.reconnectionAttempts,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionDelayMax: this.config.reconnectionDelayMax,
        timeout: this.config.timeout,
        transports: ['websocket', 'polling'],
      });

      this.setupSocketListeners();

      this.socket.on('connect', () => {
        this.reconnectCount = 0;
        console.log('[WebSocket] Connected:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error);
        reject(error);
      });
    });
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    if (this.currentRoom) {
      this.leaveRoom();
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.eventListeners.clear();
    this.pendingOperations.clear();
    console.log('[WebSocket] Disconnected');
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get socket ID
   */
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // ROOM MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Join a collaboration room for a specific version
   */
  joinRoom(payload: JoinRoomPayload): Promise<Collaborator[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to WebSocket server'));
        return;
      }

      const roomId = `version:${payload.versionId}`;

      this.userId = payload.userId;
      this.userName = payload.userName;

      this.socket.emit(
        'join_room',
        {
          roomId,
          contentId: payload.contentId,
          versionId: payload.versionId,
          user: {
            id: payload.userId,
            name: payload.userName,
            color: getUserColor(payload.userId),
          },
        },
        (response: { success: boolean; collaborators?: Collaborator[]; error?: string }) => {
          if (response.success && response.collaborators) {
            this.currentRoom = roomId;
            console.log('[WebSocket] Joined room:', roomId);
            resolve(response.collaborators);
          } else {
            reject(new Error(response.error || 'Failed to join room'));
          }
        }
      );
    });
  }

  /**
   * Leave the current room
   */
  leaveRoom(): void {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('leave_room', { roomId: this.currentRoom });
    console.log('[WebSocket] Left room:', this.currentRoom);
    this.currentRoom = null;
  }

  /**
   * Get current room ID
   */
  getCurrentRoom(): string | null {
    return this.currentRoom;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CURSOR & PRESENCE
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Update cursor position
   */
  updateCursor(position: CursorPosition | null): void {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('cursor_update', {
      roomId: this.currentRoom,
      position,
    });
  }

  /**
   * Send presence heartbeat
   */
  sendHeartbeat(currentBlockId?: string): void {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('presence_heartbeat', {
      roomId: this.currentRoom,
      currentBlockId,
      timestamp: Date.now(),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // CONTENT OPERATIONS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Send a content change operation
   */
  sendOperation(
    operation: Omit<EditOperation, 'userId' | 'timestamp'>
  ): Promise<{ operationId: string; applied: boolean }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected || !this.currentRoom) {
        reject(new Error('Not connected to collaboration session'));
        return;
      }

      if (!this.userId) {
        reject(new Error('User ID not set'));
        return;
      }

      const fullOperation: EditOperation = {
        ...operation,
        userId: this.userId,
        timestamp: Date.now(),
        applied: false,
      };

      // Track pending operation
      this.pendingOperations.set(fullOperation.id, fullOperation);

      this.socket.emit(
        'content_operation',
        {
          roomId: this.currentRoom,
          operation: fullOperation,
        },
        (response: { success: boolean; operationId: string; applied: boolean; error?: string }) => {
          this.pendingOperations.delete(fullOperation.id);

          if (response.success) {
            resolve({ operationId: response.operationId, applied: response.applied });
          } else {
            reject(new Error(response.error || 'Operation failed'));
          }
        }
      );
    });
  }

  /**
   * Acknowledge receiving an operation
   */
  acknowledgeOperation(operationId: string): void {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('operation_ack', {
      roomId: this.currentRoom,
      operationId,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // LOCKING
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Request a lock on a block
   */
  requestBlockLock(blockId: string): Promise<LockState> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected || !this.currentRoom) {
        reject(new Error('Not connected to collaboration session'));
        return;
      }

      this.socket.emit(
        'request_lock',
        {
          roomId: this.currentRoom,
          blockId,
        },
        (response: { success: boolean; lock?: LockState; error?: string }) => {
          if (response.success && response.lock) {
            resolve(response.lock);
          } else {
            reject(new Error(response.error || 'Failed to acquire lock'));
          }
        }
      );
    });
  }

  /**
   * Release a block lock
   */
  releaseBlockLock(blockId: string): void {
    if (!this.socket?.connected || !this.currentRoom) return;

    this.socket.emit('release_lock', {
      roomId: this.currentRoom,
      blockId,
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // EVENT SUBSCRIPTIONS
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to a collaboration event
   */
  on<T = unknown>(eventType: CollaborationEventType, callback: EventCallback<T>): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }

    const listeners = this.eventListeners.get(eventType);
    listeners?.add(callback as EventCallback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(callback as EventCallback);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off(eventType: CollaborationEventType, callback?: EventCallback): void {
    if (callback) {
      this.eventListeners.get(eventType)?.delete(callback);
    } else {
      this.eventListeners.delete(eventType);
    }
  }

  /**
   * Emit event to local listeners
   */
  private emitLocalEvent(eventType: CollaborationEventType, data: unknown): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${eventType} listener:`, error);
        }
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // SOCKET EVENT HANDLERS
  // ────────────────────────────────────────────────────────────────────────────

  private setupSocketListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
      this.emitLocalEvent('error', { type: 'disconnect', reason });
    });

    this.socket.on('reconnect', (attempt) => {
      console.log('[WebSocket] Reconnected after', attempt, 'attempts');

      // Rejoin room if we were in one
      if (this.currentRoom && this.userId && this.userName) {
        const versionId = this.currentRoom.replace('version:', '');
        this.joinRoom({
          contentId: '', // Will be ignored on reconnect
          versionId,
          userId: this.userId,
          userName: this.userName,
        }).catch(console.error);
      }
    });

    this.socket.on('reconnect_attempt', (attempt: number) => {
      this.reconnectCount = attempt;
      console.log('[WebSocket] Reconnection attempt:', attempt);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocket] Reconnection failed');
      this.emitLocalEvent('error', { type: 'reconnect_failed' });
    });

    // Collaboration events
    this.socket.on('user_joined', (data: Collaborator) => {
      console.log('[WebSocket] User joined:', data.userName);
      this.emitLocalEvent('user_joined', data);
    });

    this.socket.on('user_left', (data: { userId: string; userName: string }) => {
      console.log('[WebSocket] User left:', data.userName);
      this.emitLocalEvent('user_left', data);
    });

    this.socket.on('cursor_moved', (data: { userId: string; position: CursorPosition }) => {
      this.emitLocalEvent('cursor_moved', data);
    });

    this.socket.on('selection_changed', (data: { userId: string; selection: CursorPosition }) => {
      this.emitLocalEvent('selection_changed', data);
    });

    this.socket.on('block_locked', (data: { blockId: string; lock: LockState }) => {
      this.emitLocalEvent('block_locked', data);
    });

    this.socket.on('block_unlocked', (data: { blockId: string }) => {
      this.emitLocalEvent('block_unlocked', data);
    });

    this.socket.on('content_changed', (data: { operation: EditOperation }) => {
      // Don't emit our own operations back
      if (data.operation.userId !== this.userId) {
        this.emitLocalEvent('content_changed', data);
      }
    });

    this.socket.on('presence_update', (data: { collaborators: Collaborator[] }) => {
      this.emitLocalEvent('presence_update', data);
    });

    this.socket.on(
      'conflict_detected',
      (data: { operation: EditOperation; conflictWith: EditOperation }) => {
        console.warn('[WebSocket] Conflict detected:', data);
        this.emitLocalEvent('conflict_detected', data);
      }
    );

    this.socket.on('version_saved', (data: { versionId: string; savedAt: string }) => {
      this.emitLocalEvent('version_saved', data);
    });

    this.socket.on('error', (error: { message: string; code?: string }) => {
      console.error('[WebSocket] Server error:', error);
      this.emitLocalEvent('error', error);
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ══════════════════════════════════════════════════════════════════════════════

// Create singleton instance
let wsService: WebSocketService | null = null;

export function getWebSocketService(config?: WebSocketConfig): WebSocketService {
  wsService ??= new WebSocketService(config);
  return wsService;
}

export function resetWebSocketService(): void {
  if (wsService) {
    wsService.disconnect();
    wsService = null;
  }
}

export { WebSocketService };
export default getWebSocketService;
