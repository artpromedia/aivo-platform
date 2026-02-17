/**
 * Device Sync WebSocket Handler
 *
 * Real-time sync using WebSocket connections for instant
 * change notifications across devices.
 *
 * Ported from sync-svc during Sprint 3 consolidation.
 */
/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import type { FastifyInstance } from 'fastify';
import { WebSocket } from 'ws';

import { deviceSyncConfig } from './config.js';
import { SyncEventEmitter } from './sync-events.js';
import type { DeviceSyncService } from './sync-service.js';
import {
  type DeviceSyncAuthContext as AuthContext,
  WebSocketMessageType,
  type WebSocketMessage,
  type ChangeNotification,
  PushChangesRequestSchema,
  PullChangesRequestSchema,
  ConflictResolutionRequestSchema,
} from './types.js';

type Timer = ReturnType<typeof setInterval>;

interface WebSocketClient {
  socket: WebSocket;
  userId: string;
  tenantId: string;
  deviceId: string;
  subscriptions: Set<string>;
  lastPing: number;
}

const logger = {
  info: (msg: string) => { console.log(`[device-sync-ws] ${msg}`); },
  debug: (ctx: Record<string, unknown>, msg: string) => {
    if (process.env.LOG_LEVEL === 'debug') { console.log(`[device-sync-ws] ${msg}`, ctx); }
  },
  error: (ctx: Record<string, unknown>, msg: string) => { console.error(`[device-sync-ws] ${msg}`, ctx); },
};

export class DeviceSyncWebSocketHandler {
  private readonly clients = new Map<string, WebSocketClient>();
  private readonly eventEmitter: SyncEventEmitter;
  private readonly syncService: DeviceSyncService;
  private heartbeatInterval: Timer | null = null;

  constructor(syncService: DeviceSyncService) {
    this.syncService = syncService;
    this.eventEmitter = SyncEventEmitter.getInstance();
    this.setupEventListeners();
  }

  /**
   * Register WebSocket routes with Fastify
   */
  async register(fastify: FastifyInstance): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await fastify.register(import('@fastify/websocket') as any);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fastify.get('/ws', { websocket: true } as any, (socket: any, request: any) => {
      this.handleConnection(socket, request.user as AuthContext);
    });

    this.startHeartbeat();
    logger.info('WebSocket handler registered');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, ctx: AuthContext): void {
    const clientId = `${ctx.userId}:${ctx.deviceId}`;

    const existingClient = this.clients.get(clientId);
    if (existingClient) {
      existingClient.socket.close(1000, 'New connection from same device');
    }

    const client: WebSocketClient = {
      socket,
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      deviceId: ctx.deviceId,
      subscriptions: new Set(),
      lastPing: Date.now(),
    };

    this.clients.set(clientId, client);
    logger.debug({ clientId }, 'Client connected');

    socket.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        await this.handleMessage(client, message);
      } catch {
        this.sendError(client, 'Invalid message format');
      }
    });

    socket.on('close', () => {
      this.clients.delete(clientId);
      logger.debug({ clientId }, 'Client disconnected');
    });

    socket.on('error', (error) => {
      logger.error({ err: error, clientId }, 'WebSocket error');
      this.clients.delete(clientId);
    });

    this.send(client, {
      type: WebSocketMessageType.SYNC_COMPLETE,
      payload: { message: 'Connected to device sync service' },
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

  private async handlePushChange(
    client: WebSocketClient,
    ctx: AuthContext,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const payload = PushChangesRequestSchema.parse(message.payload);
      const result = await this.syncService.pushChanges(ctx, payload.operations);

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

  private async handlePullChanges(
    client: WebSocketClient,
    ctx: AuthContext,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const payload = PullChangesRequestSchema.parse(message.payload);
      const result = await this.syncService.pullChanges(
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

  private async handleResolveConflict(
    client: WebSocketClient,
    ctx: AuthContext,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const payload = ConflictResolutionRequestSchema.parse(message.payload);
      await this.syncService.resolveConflict(
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

  private setupEventListeners(): void {
    this.eventEmitter.on('change', (notification: ChangeNotification) => {
      this.broadcastChange(notification);
    });

    this.eventEmitter.on(
      'conflict',
      (notification: { userId: string; conflictId: string }) => {
        this.notifyConflictResolved(notification.userId, notification.conflictId);
      }
    );
  }

  private broadcastChange(notification: ChangeNotification): void {
    for (const [, client] of this.clients) {
      if (client.deviceId === notification.deviceId) {
        continue;
      }

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

  private notifyConflictResolved(userId: string, conflictId: string): void {
    for (const [, client] of this.clients) {
      if (client.userId === userId) {
        this.send(client, {
          type: WebSocketMessageType.CONFLICT_NOTIFICATION,
          payload: { conflictId, resolved: true },
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private send(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.send(JSON.stringify(message));
    }
  }

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

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeout = deviceSyncConfig.websocket.clientTimeoutMs;

      for (const [clientId, client] of this.clients) {
        if (now - client.lastPing > timeout) {
          logger.debug({ clientId }, 'Client timed out');
          client.socket.close(1000, 'Connection timeout');
          this.clients.delete(clientId);
        }
      }
    }, deviceSyncConfig.websocket.heartbeatIntervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  disconnectAll(): void {
    for (const [, client] of this.clients) {
      client.socket.close(1000, 'Server shutting down');
    }
    this.clients.clear();
    this.stopHeartbeat();
  }
}
