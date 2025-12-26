import { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';
import { config } from '../config.js';
import { SyncEventEmitter } from '../services/sync-events.js';
import { syncService } from '../services/sync-service.js';
import {
  AuthContext,
  WebSocketMessageType,
  WebSocketMessage,
  ChangeNotification,
  PushChangesRequestSchema,
  PullChangesRequestSchema,
  ConflictResolutionRequestSchema,
} from '../types.js';

interface WebSocketClient {
  socket: WebSocket;
  userId: string;
  tenantId: string;
  deviceId: string;
  subscriptions: Set<string>;
  lastPing: number;
}

/**
 * WebSocket Handler
 *
 * Real-time sync using WebSocket connections for instant
 * change notifications across devices.
 */
export class WebSocketHandler {
  private clients: Map<string, WebSocketClient> = new Map();
  private eventEmitter: SyncEventEmitter;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.eventEmitter = SyncEventEmitter.getInstance();
    this.setupEventListeners();
  }

  /**
   * Register WebSocket routes with Fastify
   */
  async register(fastify: FastifyInstance): Promise<void> {
    await fastify.register(import('@fastify/websocket'));

    fastify.get('/ws', { websocket: true }, (socket, request) => {
      this.handleConnection(socket, request.user as AuthContext);
    });

    // Start heartbeat checker
    this.startHeartbeat();

    console.log('🔌 WebSocket handler registered');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, ctx: AuthContext): void {
    const clientId = `${ctx.userId}:${ctx.deviceId}`;

    // Close existing connection from same device
    const existingClient = this.clients.get(clientId);
    if (existingClient) {
      existingClient.socket.close(1000, 'New connection from same device');
    }

    // Create client entry
    const client: WebSocketClient = {
      socket,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      deviceId: ctx.deviceId,
      subscriptions: new Set(),
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);
    console.log(`📱 Client connected: ${clientId}`);

    // Set up message handler
    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        await this.handleMessage(client, message);
      } catch (error) {
        this.sendError(client, 'Invalid message format');
      }
    });

    // Handle close
    socket.on('close', () => {
      this.clients.delete(clientId);
      console.log(`📱 Client disconnected: ${clientId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${clientId}:`, error);
      this.clients.delete(clientId);
    });

    // Send welcome message
    this.send(client, {
      type: WebSocketMessageType.SYNC_COMPLETE,
      payload: { message: 'Connected to sync service' },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(
    client: WebSocketClient,
    message: WebSocketMessage
  ): Promise<void> {
    const ctx: AuthContext = {
      userId: client.userId,
      tenantId: client.tenantId,
      deviceId: client.deviceId,
      roles: [],
    };

    switch (message.type) {
      case WebSocketMessageType.PING:
        client.lastPing = Date.now();
        this.send(client, {
          type: WebSocketMessageType.PONG,
          requestId: message.requestId,
          payload: {},
          timestamp: new Date().toISOString(),
        });
        break;

      case WebSocketMessageType.SUBSCRIBE:
        await this.handleSubscribe(client, message);
        break;

      case WebSocketMessageType.UNSUBSCRIBE:
        await this.handleUnsubscribe(client, message);
        break;

      case WebSocketMessageType.PUSH_CHANGE:
        await this.handlePushChange(client, ctx, message);
        break;

      case WebSocketMessageType.PULL_CHANGES:
        await this.handlePullChanges(client, ctx, message);
        break;

      case WebSocketMessageType.RESOLVE_CONFLICT:
        await this.handleResolveConflict(client, ctx, message);
        break;

      default:
        this.sendError(client, `Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle subscribe message
   */
  private async handleSubscribe(
    client: WebSocketClient,
    message: WebSocketMessage
  ): Promise<void> {
    const { entityTypes } = message.payload as { entityTypes: string[] };

    for (const entityType of entityTypes) {
      client.subscriptions.add(entityType);
    }

    this.send(client, {
      type: WebSocketMessageType.SYNC_COMPLETE,
      requestId: message.requestId,
      payload: {
        subscribed: entityTypes,
        totalSubscriptions: client.subscriptions.size,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle unsubscribe message
   */
  private async handleUnsubscribe(
    client: WebSocketClient,
    message: WebSocketMessage
  ): Promise<void> {
    const { entityTypes } = message.payload as { entityTypes: string[] };

    for (const entityType of entityTypes) {
      client.subscriptions.delete(entityType);
    }

    this.send(client, {
      type: WebSocketMessageType.SYNC_COMPLETE,
      requestId: message.requestId,
      payload: {
        unsubscribed: entityTypes,
        totalSubscriptions: client.subscriptions.size,
      },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle push change message
   */
  private async handlePushChange(
    client: WebSocketClient,
    ctx: AuthContext,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const payload = PushChangesRequestSchema.parse(message.payload);
      const result = await syncService.pushChanges(ctx, payload.operations);

      this.send(client, {
        type: WebSocketMessageType.SYNC_COMPLETE,
        requestId: message.requestId,
        payload: {
          success: result.success,
          acceptedCount: result.acceptedOperations.length,
          rejectedCount: result.rejectedOperations.length,
          serverTimestamp: result.serverTimestamp,
        },
        timestamp: new Date().toISOString(),
      });

      // Send conflict notifications if any
      for (const conflict of result.conflicts) {
        this.send(client, {
          type: WebSocketMessageType.CONFLICT_NOTIFICATION,
          payload: {
            conflictId: conflict.id,
            entityType: conflict.entityType,
            entityId: conflict.entityId,
            suggestedResolution: conflict.suggestedResolution,
          },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      this.sendError(
        client,
        error instanceof Error ? error.message : 'Push failed',
        message.requestId
      );
    }
  }

  /**
   * Handle pull changes message
   */
  private async handlePullChanges(
    client: WebSocketClient,
    ctx: AuthContext,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const payload = PullChangesRequestSchema.parse(message.payload);
      const result = await syncService.pullChanges(
        ctx,
        payload.lastSyncTimestamp,
        payload.entityTypes,
        payload.limit
      );

      this.send(client, {
        type: WebSocketMessageType.SYNC_COMPLETE,
        requestId: message.requestId,
        payload: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.sendError(
        client,
        error instanceof Error ? error.message : 'Pull failed',
        message.requestId
      );
    }
  }

  /**
   * Handle resolve conflict message
   */
  private async handleResolveConflict(
    client: WebSocketClient,
    ctx: AuthContext,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const payload = ConflictResolutionRequestSchema.parse(message.payload);
      await syncService.resolveConflict(
        ctx,
        payload.conflictId,
        payload.resolution,
        payload.mergedData
      );

      this.send(client, {
        type: WebSocketMessageType.SYNC_COMPLETE,
        requestId: message.requestId,
        payload: { success: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.sendError(
        client,
        error instanceof Error ? error.message : 'Resolve failed',
        message.requestId
      );
    }
  }

  /**
   * Set up event listeners for sync events
   */
  private setupEventListeners(): void {
    // Listen for changes and broadcast to relevant clients
    this.eventEmitter.on('change', (notification: ChangeNotification) => {
      this.broadcastChange(notification);
    });

    // Listen for conflict resolutions
    this.eventEmitter.on(
      'conflict',
      (notification: { userId: string; conflictId: string }) => {
        this.notifyConflictResolved(
          notification.userId,
          notification.conflictId
        );
      }
    );
  }

  /**
   * Broadcast change to all subscribed clients
   */
  private broadcastChange(notification: ChangeNotification): void {
    for (const [clientId, client] of this.clients) {
      // Don't send to source device
      if (client.deviceId === notification.deviceId) {
        continue;
      }

      // Check if client is subscribed to this entity type
      if (
        client.subscriptions.has('*') ||
        client.subscriptions.has(notification.entityType)
      ) {
        this.send(client, {
          type: WebSocketMessageType.CHANGE_NOTIFICATION,
          payload: {
            entityType: notification.entityType,
            entityId: notification.entityId,
            operation: notification.operation,
            version: notification.version,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Notify user of conflict resolution
   */
  private notifyConflictResolved(
    userId: string,
    conflictId: string
  ): void {
    for (const [_, client] of this.clients) {
      if (client.userId === userId) {
        this.send(client, {
          type: WebSocketMessageType.CONFLICT_NOTIFICATION,
          payload: {
            conflictId,
            resolved: true,
          },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Send message to client
   */
  private send(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(
    client: WebSocketClient,
    message: string,
    requestId?: string
  ): void {
    this.send(client, {
      type: WebSocketMessageType.ERROR,
      requestId,
      payload: { error: message },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Start heartbeat checker
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = config.websocket.clientTimeoutMs;

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          console.log(`📱 Client timed out: ${clientId}`);
          client.socket.close(1000, 'Connection timeout');
          this.clients.delete(clientId);
        }
      }
    }, config.websocket.heartbeatIntervalMs);
  }

  /**
   * Stop heartbeat checker
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Get connected client count
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    for (const [_, client] of this.clients) {
      client.socket.close(1000, 'Server shutting down');
    }
    this.clients.clear();
    this.stopHeartbeat();
  }
}

// Export singleton instance
export const webSocketHandler = new WebSocketHandler();
