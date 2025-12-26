/**
 * Realtime Service - WebSocket Gateway
 *
 * Production-ready WebSocket gateway with:
 * - JWT authentication
 * - Room management
 * - Presence tracking
 * - Collaborative editing support
 * - Horizontal scaling via Redis adapter
 */

import { createAdapter } from '@socket.io/redis-adapter';
import type { FastifyInstance } from 'fastify';
import * as jose from 'jose';
import { nanoid } from 'nanoid';
import { Server, type Socket } from 'socket.io';

import { config } from '../config.js';
import { getRedisClient, getSubscriberClient, RedisKeys } from '../redis/index.js';
import type { MessageBrokerService } from '../services/message-broker.service.js';
import type { PresenceService } from '../services/presence.service.js';
import type { RoomService } from '../services/room.service.js';
import {
  WSEventType,
  type SocketData,
  type JWTPayload,
  type DeviceType,
  type RoomJoinPayload,
  type RoomLeavePayload,
  type RoomMessagePayload,
  type PresenceUpdatePayload,
  type PresenceSyncPayload,
  type CollabOperationPayload,
  type CollabCursorPayload,
  type CollabLockPayload,
  type CollabUnlockPayload,
  type AnalyticsSubscribePayload,
} from '../types.js';

// Color palette for collaborative cursors
const USER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
];

/**
 * WebSocket Gateway class
 */
export class WebSocketGateway {
  private io: Server;
  private readonly serverId: string;
  private heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();
  private metricsInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly presenceService: PresenceService,
    private readonly roomService: RoomService,
    private readonly messageBroker: MessageBrokerService
  ) {
    this.serverId = `server_${process.pid}_${Date.now()}`;
  }

  /**
   * Initialize the WebSocket gateway
   */
  async initialize(fastify: FastifyInstance): Promise<Server> {
    this.io = new Server(fastify.server, {
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      pingInterval: config.websocket.pingInterval,
      pingTimeout: config.websocket.pingTimeout,
      maxHttpBufferSize: config.websocket.maxBufferSize,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: false,
      },
    });

    // Set up Redis adapter for horizontal scaling
    await this.setupRedisAdapter();

    // Subscribe to cross-server messages
    this.messageBroker.subscribe(RedisKeys.channels.broadcast, (message) => {
      this.handleCrossServerMessage(message);
    });

    // Register event handlers
    this.io.on('connection', (socket) => this.handleConnection(socket));

    // Start metrics collection
    this.startMetricsCollection();

    console.log(`[WebSocket] Gateway initialized on server ${this.serverId}`);
    return this.io;
  }

  /**
   * Set up Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(): Promise<void> {
    const pubClient = getRedisClient();
    const subClient = getSubscriberClient();

    this.io.adapter(createAdapter(pubClient, subClient));
    console.log('[WebSocket] Redis adapter configured for horizontal scaling');
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(socket: Socket): Promise<void> {
    const startTime = Date.now();

    try {
      // Authenticate the connection
      const user = await this.authenticateSocket(socket);

      if (!user) {
        socket.emit(WSEventType.ERROR, {
          code: 'AUTH_FAILED',
          message: 'Authentication failed',
        });
        socket.disconnect(true);
        return;
      }

      // Initialize socket data
      const socketData: SocketData = {
        userId: user.sub,
        tenantId: user.tenantId,
        role: user.role,
        displayName: user.displayName,
        sessionId: socket.id,
        rooms: new Set(),
        lastActivity: new Date(),
        device: this.detectDevice(socket),
      };
      socket.data = socketData;

      // Join tenant room for tenant-wide broadcasts
      await socket.join(`tenant:${user.tenantId}`);

      // Join user's personal room for direct messages
      await socket.join(`user:${user.sub}`);

      // Register presence
      await this.presenceService.setOnline(user.sub, user.tenantId, {
        userId: user.sub,
        displayName: user.displayName,
        status: 'online',
        lastSeen: new Date(),
        device: socketData.device,
        color: this.getUserColor(user.sub),
      });

      // Set up heartbeat
      this.setupHeartbeat(socket);

      // Register event handlers
      this.registerEventHandlers(socket);

      // Send connection acknowledgment
      socket.emit(WSEventType.CONNECT, {
        sessionId: socket.id,
        userId: user.sub,
        serverId: this.serverId,
        timestamp: new Date().toISOString(),
      });

      console.log(`[WebSocket] Connection established`, {
        socketId: socket.id,
        userId: user.sub,
        tenantId: user.tenantId,
        duration: Date.now() - startTime,
      });
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      socket.emit(WSEventType.ERROR, {
        code: 'CONNECTION_ERROR',
        message: 'Failed to establish connection',
      });
      socket.disconnect(true);
    }
  }

  /**
   * Authenticate socket connection via JWT
   */
  private async authenticateSocket(socket: Socket): Promise<JWTPayload | null> {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        console.warn('[WebSocket] No auth token provided');
        return null;
      }

      const secret = new TextEncoder().encode(config.jwtSecret);
      const { payload } = await jose.jwtVerify(token, secret);

      return {
        sub: payload.sub as string,
        tenantId: payload.tenantId as string,
        role: payload.role as string,
        displayName: (payload.displayName as string) || (payload.name as string) || 'Unknown',
        email: payload.email as string | undefined,
      };
    } catch (error) {
      console.warn('[WebSocket] Authentication failed:', (error as Error).message);
      return null;
    }
  }

  /**
   * Register all event handlers for a socket
   */
  private registerEventHandlers(socket: Socket): void {
    // Disconnect handler
    socket.on('disconnect', () => this.handleDisconnect(socket));

    // Room events
    socket.on(WSEventType.ROOM_JOIN, (payload, callback) =>
      this.handleRoomJoin(socket, payload, callback)
    );
    socket.on(WSEventType.ROOM_LEAVE, (payload, callback) =>
      this.handleRoomLeave(socket, payload, callback)
    );
    socket.on(WSEventType.ROOM_MESSAGE, (payload, callback) =>
      this.handleRoomMessage(socket, payload, callback)
    );

    // Presence events
    socket.on(WSEventType.PRESENCE_UPDATE, (payload, callback) =>
      this.handlePresenceUpdate(socket, payload, callback)
    );
    socket.on(WSEventType.PRESENCE_SYNC, (payload, callback) =>
      this.handlePresenceSync(socket, payload, callback)
    );

    // Collaboration events
    socket.on(WSEventType.COLLAB_OPERATION, (payload, callback) =>
      this.handleCollabOperation(socket, payload, callback)
    );
    socket.on(WSEventType.COLLAB_CURSOR, (payload, callback) =>
      this.handleCollabCursor(socket, payload, callback)
    );
    socket.on(WSEventType.COLLAB_LOCK, (payload, callback) =>
      this.handleCollabLock(socket, payload, callback)
    );
    socket.on(WSEventType.COLLAB_UNLOCK, (payload, callback) =>
      this.handleCollabUnlock(socket, payload, callback)
    );

    // Analytics events
    socket.on(WSEventType.ANALYTICS_SUBSCRIBE, (payload, callback) =>
      this.handleAnalyticsSubscribe(socket, payload, callback)
    );
    socket.on(WSEventType.ALERT_ACKNOWLEDGE, (payload, callback) =>
      this.handleAlertAcknowledge(socket, payload, callback)
    );
  }

  /**
   * Handle disconnection
   */
  private async handleDisconnect(socket: Socket): Promise<void> {
    const data = socket.data as SocketData;

    if (!data?.userId) {
      return;
    }

    try {
      // Clear heartbeat timer
      const timer = this.heartbeatTimers.get(socket.id);
      if (timer) {
        clearInterval(timer);
        this.heartbeatTimers.delete(socket.id);
      }

      // Leave all rooms
      for (const roomId of data.rooms) {
        await this.leaveRoom(socket, roomId);
      }

      // Update presence with grace period for reconnection
      await this.presenceService.setOffline(data.userId, data.tenantId, {
        gracePeriod: config.presence.offlineGracePeriod,
      });

      console.log(`[WebSocket] Disconnected`, {
        socketId: socket.id,
        userId: data.userId,
      });
    } catch (error) {
      console.error('[WebSocket] Error handling disconnect:', error);
    }
  }

  /**
   * Handle room join
   */
  private async handleRoomJoin(
    socket: Socket,
    payload: RoomJoinPayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;
    const { roomId, roomType } = payload;

    try {
      // Validate room access
      const canJoin = await this.roomService.canJoinRoom(
        data.userId,
        data.tenantId,
        roomId,
        roomType
      );

      if (!canJoin) {
        callback?.({ error: 'Not authorized to join this room' });
        return;
      }

      // Join the socket.io room
      await socket.join(roomId);
      data.rooms.add(roomId);

      // Register in room service
      await this.roomService.addMember(roomId, {
        socketId: socket.id,
        userId: data.userId,
        displayName: data.displayName,
        joinedAt: new Date(),
        role: data.role,
        tenantId: data.tenantId,
      });

      // Get current room state
      const roomState = await this.roomService.getRoomState(roomId);

      // Notify other room members
      socket.to(roomId).emit(WSEventType.PRESENCE_JOIN, {
        userId: data.userId,
        displayName: data.displayName,
        roomId,
        timestamp: new Date().toISOString(),
      });

      // Send room state to joining user
      socket.emit(WSEventType.ROOM_STATE, {
        roomId,
        members: roomState.members,
        state: roomState.state,
      });

      // Update presence with current room
      await this.presenceService.updatePresence(data.userId, data.tenantId, {
        currentRoom: roomId,
      });

      console.log(`[WebSocket] User joined room`, {
        userId: data.userId,
        roomId,
        roomType,
      });

      callback?.({ success: true, roomId });
    } catch (error) {
      console.error('[WebSocket] Error joining room:', error);
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle room leave
   */
  private async handleRoomLeave(
    socket: Socket,
    payload: RoomLeavePayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    try {
      await this.leaveRoom(socket, payload.roomId);
      callback?.({ success: true });
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle room message
   */
  private async handleRoomMessage(
    socket: Socket,
    payload: RoomMessagePayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const socketData = socket.data as SocketData;
    const { roomId, type, data, targetUsers } = payload;

    // Validate sender is in room
    if (!socketData.rooms.has(roomId)) {
      callback?.({ error: 'Not a member of this room' });
      return;
    }

    const message = {
      type,
      data,
      sender: {
        userId: socketData.userId,
        displayName: socketData.displayName,
      },
      roomId,
      timestamp: new Date().toISOString(),
      messageId: `msg_${nanoid()}`,
    };

    if (targetUsers && targetUsers.length > 0) {
      // Send to specific users in the room
      for (const userId of targetUsers) {
        this.io.to(`user:${userId}`).emit(WSEventType.ROOM_MESSAGE, message);
      }
    } else {
      // Broadcast to all room members except sender
      socket.to(roomId).emit(WSEventType.ROOM_MESSAGE, message);
    }

    // For persistent rooms, store message history
    const roomConfig = await this.roomService.getRoomConfig(roomId);
    if (roomConfig?.persistent) {
      await this.roomService.addMessage(roomId, message);
    }

    callback?.({ success: true, messageId: message.messageId });
  }

  /**
   * Handle presence update
   */
  private async handlePresenceUpdate(
    socket: Socket,
    payload: PresenceUpdatePayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    try {
      // Update presence
      await this.presenceService.updatePresence(data.userId, data.tenantId, payload);

      // Broadcast to rooms user is in
      for (const roomId of data.rooms) {
        socket.to(roomId).emit(WSEventType.PRESENCE_UPDATE, {
          userId: data.userId,
          ...payload,
          timestamp: new Date().toISOString(),
        });
      }

      callback?.({ success: true });
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle presence sync request
   */
  private async handlePresenceSync(
    socket: Socket,
    payload: PresenceSyncPayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    try {
      let presences;

      if (payload.roomId) {
        presences = await this.presenceService.getRoomPresence(payload.roomId);
      } else if (payload.userIds) {
        presences = await this.presenceService.getPresence(payload.userIds, data.tenantId);
      } else {
        callback?.({ error: 'Must specify userIds or roomId' });
        return;
      }

      callback?.({ presences });
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle collaborative operation
   */
  private async handleCollabOperation(
    socket: Socket,
    payload: CollabOperationPayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;
    const { roomId, documentId, operation, version } = payload;

    try {
      const result = await this.roomService.applyOperation(
        documentId,
        operation,
        version,
        data.userId
      );

      if (result.success) {
        // Broadcast transformed operation to other clients
        socket.to(roomId).emit(WSEventType.COLLAB_OPERATION, {
          documentId,
          operation: result.transformedOperation,
          version: result.newVersion,
          userId: data.userId,
          timestamp: new Date().toISOString(),
        });

        callback?.({
          success: true,
          version: result.newVersion,
          acknowledgedOperation: result.acknowledgedOperation,
        });
      } else {
        callback?.({
          success: false,
          conflict: true,
          serverVersion: result.serverVersion,
          serverState: result.serverState,
        });
      }
    } catch (error) {
      console.error('[WebSocket] Collab operation error:', error);
      callback?.({ error: 'Failed to apply operation' });
    }
  }

  /**
   * Handle cursor update for collaboration
   */
  private async handleCollabCursor(
    socket: Socket,
    payload: CollabCursorPayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    socket.to(payload.roomId).emit(WSEventType.COLLAB_CURSOR, {
      userId: data.userId,
      displayName: data.displayName,
      documentId: payload.documentId,
      cursor: payload.cursor,
      color: this.getUserColor(data.userId),
      timestamp: new Date().toISOString(),
    });

    callback?.({ success: true });
  }

  /**
   * Handle document lock request
   */
  private async handleCollabLock(
    socket: Socket,
    payload: CollabLockPayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    try {
      const lock = await this.roomService.acquireLock(
        payload.documentId,
        payload.elementId,
        data.userId,
        data.displayName,
        payload.duration || config.collaboration.lockDefaultTtl
      );

      if (lock.acquired) {
        // Notify other users about the lock
        this.io.to(`document:${payload.documentId}`).emit(WSEventType.COLLAB_LOCK, {
          documentId: payload.documentId,
          elementId: payload.elementId,
          lockedBy: {
            userId: data.userId,
            displayName: data.displayName,
          },
          expiresAt: lock.expiresAt,
        });

        callback?.({
          success: true,
          lockId: lock.lockId,
          expiresAt: lock.expiresAt,
        });
      } else {
        callback?.({
          success: false,
          lockedBy: lock.currentHolder,
          expiresAt: lock.expiresAt,
        });
      }
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle document unlock
   */
  private async handleCollabUnlock(
    socket: Socket,
    payload: CollabUnlockPayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    try {
      const released = await this.roomService.releaseLock(
        payload.documentId,
        payload.elementId,
        payload.lockId,
        data.userId
      );

      if (released) {
        this.io.to(`document:${payload.documentId}`).emit(WSEventType.COLLAB_UNLOCK, {
          documentId: payload.documentId,
          elementId: payload.elementId,
          releasedBy: data.userId,
        });
      }

      callback?.({ success: released });
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle analytics subscription
   */
  private async handleAnalyticsSubscribe(
    socket: Socket,
    payload: AnalyticsSubscribePayload,
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    try {
      // Verify teacher has access to class
      const hasAccess = await this.roomService.canAccessClass(data.userId, payload.classId);
      if (!hasAccess) {
        callback?.({ error: 'Not authorized to access this class' });
        return;
      }

      // Join analytics room for this class
      const analyticsRoom = `analytics:${payload.classId}`;
      await socket.join(analyticsRoom);
      data.rooms.add(analyticsRoom);

      // Send current analytics state
      const currentAnalytics = await this.roomService.getCurrentAnalytics(payload.classId);
      socket.emit(WSEventType.ANALYTICS_UPDATE, {
        classId: payload.classId,
        data: currentAnalytics,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true, subscribed: payload.metrics });
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Handle alert acknowledgment
   */
  private async handleAlertAcknowledge(
    socket: Socket,
    payload: { alertId: string },
    callback?: (response: unknown) => void
  ): Promise<void> {
    const data = socket.data as SocketData;

    try {
      await this.messageBroker.publish(RedisKeys.channels.alerts, {
        type: 'acknowledge',
        alertId: payload.alertId,
        acknowledgedBy: data.userId,
        timestamp: new Date().toISOString(),
      });

      callback?.({ success: true });
    } catch (error) {
      callback?.({ error: (error as Error).message });
    }
  }

  /**
   * Leave a room
   */
  private async leaveRoom(socket: Socket, roomId: string): Promise<void> {
    const data = socket.data as SocketData;

    await socket.leave(roomId);
    data.rooms.delete(roomId);

    await this.roomService.removeMember(roomId, socket.id);

    socket.to(roomId).emit(WSEventType.PRESENCE_LEAVE, {
      userId: data.userId,
      displayName: data.displayName,
      roomId,
      timestamp: new Date().toISOString(),
    });

    // Update presence
    if (data.rooms.size === 0) {
      await this.presenceService.updatePresence(data.userId, data.tenantId, {
        currentRoom: undefined,
      });
    }
  }

  /**
   * Set up heartbeat for a socket
   */
  private setupHeartbeat(socket: Socket): void {
    const timer = setInterval(() => {
      const data = socket.data as SocketData;
      if (data) {
        data.lastActivity = new Date();
        this.presenceService.heartbeat(data.userId, data.tenantId);
      }
    }, config.presence.heartbeatInterval);

    this.heartbeatTimers.set(socket.id, timer);
  }

  /**
   * Detect device type from user agent
   */
  private detectDevice(socket: Socket): DeviceType {
    const userAgent = (socket.handshake.headers['user-agent'] as string) || '';
    if (/mobile/i.test(userAgent)) return 'mobile';
    if (/tablet|ipad/i.test(userAgent)) return 'tablet';
    return 'web';
  }

  /**
   * Get consistent color for user
   */
  private getUserColor(userId: string): string {
    const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return USER_COLORS[hash % USER_COLORS.length];
  }

  /**
   * Handle cross-server messages
   */
  private handleCrossServerMessage(message: unknown): void {
    const msg = message as { type: string; room?: string; event: string; data: unknown };
    if (msg.type === 'broadcast' && msg.room) {
      this.io.to(msg.room).emit(msg.event, msg.data);
    }
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      const connections = this.io.sockets.sockets.size;
      console.log(`[WebSocket] Active connections: ${connections}`);
      // TODO: Emit to Prometheus metrics
    }, 30000);
  }

  /**
   * Broadcast to a room (for use by event handlers)
   */
  public broadcastToRoom(roomId: string, event: string, data: unknown): void {
    this.io.to(roomId).emit(event, data);
  }

  /**
   * Broadcast to a user (for use by event handlers)
   */
  public broadcastToUser(userId: string, event: string, data: unknown): void {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast to a tenant (for use by event handlers)
   */
  public broadcastToTenant(tenantId: string, event: string, data: unknown): void {
    this.io.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Get connection count
   */
  public getConnectionCount(): number {
    return this.io.sockets.sockets.size;
  }

  /**
   * Shutdown the gateway
   */
  async shutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();

    // Close all connections gracefully
    this.io.disconnectSockets(true);

    console.log('[WebSocket] Gateway shutdown complete');
  }
}
