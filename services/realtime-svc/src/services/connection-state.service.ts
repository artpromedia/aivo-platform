/**
 * Connection State Manager
 *
 * Manages WebSocket connection state with:
 * - Connection tracking
 * - Health monitoring
 * - Metrics collection
 * - Graceful degradation
 */

import os from 'os';

import type { Server, Socket } from 'socket.io';

import { logger } from '../logger.js';
import { getRedisClient } from '../redis/index.js';

/**
 * Connection state
 */
export type ConnectionState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'error';

/**
 * Connection info
 */
export interface ConnectionInfo {
  socketId: string;
  oderId: string;
  tenantId: string;
  state: ConnectionState;
  connectedAt: Date;
  lastActivity: Date;
  reconnectCount: number;
  serverId: string;
  device: string;
  ip: string;
  rooms: string[];
}

/**
 * Connection metrics
 */
export interface ConnectionMetrics {
  totalConnections: number;
  activeConnections: number;
  connectionsByTenant: Record<string, number>;
  connectionsByDevice: Record<string, number>;
  avgConnectionDuration: number;
  reconnectionRate: number;
  messagesPerSecond: number;
}

/**
 * Server health
 */
export interface ServerHealth {
  serverId: string;
  connections: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: number;
  uptime: number;
  lastHeartbeat: Date;
  healthy: boolean;
}

/**
 * Connection State Manager
 */
export class ConnectionStateManager {
  private readonly serverId: string;
  private connections = new Map<string, ConnectionInfo>();
  private messageCount = 0;
  private readonly startTime: Date;
  private metricsInterval: ReturnType<typeof setInterval> | null = null;
  private healthInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.serverId = `server_${process.pid}_${Date.now()}`;
    this.startTime = new Date();
  }

  /**
   * Initialize the connection manager
   */
  async initialize(_io: Server): Promise<void> {
    // Start metrics collection
    this.startMetricsCollection();

    // Start health reporting
    this.startHealthReporting();

    // Register for server shutdown
    process.on('SIGTERM', () => void this.shutdown());
    process.on('SIGINT', () => void this.shutdown());

    logger.info({ serverId: this.serverId }, 'ConnectionManager initialized');
  }

  /**
   * Track new connection
   */
  trackConnection(
    socket: Socket,
    oderId: string,
    tenantId: string,
    device: string
  ): ConnectionInfo {
    const info: ConnectionInfo = {
      socketId: socket.id,
      oderId,
      tenantId,
      state: 'connected',
      connectedAt: new Date(),
      lastActivity: new Date(),
      reconnectCount: 0,
      serverId: this.serverId,
      device,
      ip: this.getClientIP(socket),
      rooms: [],
    };

    this.connections.set(socket.id, info);
    void this.updateRedisConnection(info);

    return info;
  }

  /**
   * Update connection state
   */
  updateState(socketId: string, state: ConnectionState): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.state = state;
      info.lastActivity = new Date();
      void this.updateRedisConnection(info);
    }
  }

  /**
   * Track reconnection
   */
  trackReconnection(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.reconnectCount++;
      info.state = 'connected';
      info.lastActivity = new Date();
      void this.updateRedisConnection(info);
    }
  }

  /**
   * Track room join
   */
  trackRoomJoin(socketId: string, roomId: string): void {
    const info = this.connections.get(socketId);
    if (info && !info.rooms.includes(roomId)) {
      info.rooms.push(roomId);
      info.lastActivity = new Date();
      void this.updateRedisConnection(info);
    }
  }

  /**
   * Track room leave
   */
  trackRoomLeave(socketId: string, roomId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.rooms = info.rooms.filter((r) => r !== roomId);
      info.lastActivity = new Date();
      void this.updateRedisConnection(info);
    }
  }

  /**
   * Track activity
   */
  trackActivity(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      info.lastActivity = new Date();
    }
    this.messageCount++;
  }

  /**
   * Remove connection
   */
  removeConnection(socketId: string): void {
    const info = this.connections.get(socketId);
    if (info) {
      this.connections.delete(socketId);
      void this.removeRedisConnection(socketId);
    }
  }

  /**
   * Get connection info
   */
  getConnection(socketId: string): ConnectionInfo | undefined {
    return this.connections.get(socketId);
  }

  /**
   * Get user's connections
   */
  getUserConnections(oderId: string): ConnectionInfo[] {
    return Array.from(this.connections.values()).filter((c) => c.oderId === oderId);
  }

  /**
   * Get tenant connections count
   */
  getTenantConnectionCount(tenantId: string): number {
    return Array.from(this.connections.values()).filter((c) => c.tenantId === tenantId).length;
  }

  /**
   * Get all connections
   */
  getAllConnections(): ConnectionInfo[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connection metrics
   */
  async getMetrics(): Promise<ConnectionMetrics> {
    const connections = Array.from(this.connections.values());
    const now = Date.now();

    // Calculate metrics
    const totalConnections = connections.length;
    const activeConnections = connections.filter(
      (c) => c.state === 'connected' && now - c.lastActivity.getTime() < 300000
    ).length;

    const connectionsByTenant: Record<string, number> = {};
    const connectionsByDevice: Record<string, number> = {};
    let totalDuration = 0;
    let totalReconnects = 0;

    for (const conn of connections) {
      connectionsByTenant[conn.tenantId] = (connectionsByTenant[conn.tenantId] || 0) + 1;
      connectionsByDevice[conn.device] = (connectionsByDevice[conn.device] || 0) + 1;
      totalDuration += now - conn.connectedAt.getTime();
      totalReconnects += conn.reconnectCount;
    }

    const avgConnectionDuration = totalConnections > 0 ? totalDuration / totalConnections : 0;
    const reconnectionRate = totalConnections > 0 ? totalReconnects / totalConnections : 0;

    // Calculate messages per second (based on last 60 seconds)
    const uptimeSeconds = (now - this.startTime.getTime()) / 1000;
    const messagesPerSecond = uptimeSeconds > 0 ? this.messageCount / uptimeSeconds : 0;

    return {
      totalConnections,
      activeConnections,
      connectionsByTenant,
      connectionsByDevice,
      avgConnectionDuration,
      reconnectionRate,
      messagesPerSecond,
    };
  }

  /**
   * Get server health
   */
  async getServerHealth(): Promise<ServerHealth> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();

    return {
      serverId: this.serverId,
      connections: this.connections.size,
      memory: {
        used: memoryUsage.heapUsed,
        total: totalMemory,
        percentage: (memoryUsage.heapUsed / totalMemory) * 100,
      },
      cpu: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: process.uptime(),
      lastHeartbeat: new Date(),
      healthy: true,
    };
  }

  /**
   * Get all servers health (from Redis)
   */
  async getAllServersHealth(): Promise<ServerHealth[]> {
    const redis = getRedisClient();
    const keys = await redis.keys('ws:server:health:*');
    const servers: ServerHealth[] = [];

    for (const key of keys) {
      const data = await redis.get(key);
      if (data) {
        servers.push(JSON.parse(data));
      }
    }

    return servers;
  }

  /**
   * Check if connection should be terminated (idle/stale)
   */
  isConnectionStale(socketId: string, maxIdleMs = 300000): boolean {
    const info = this.connections.get(socketId);
    if (!info) return true;

    return Date.now() - info.lastActivity.getTime() > maxIdleMs;
  }

  /**
   * Get stale connections
   */
  getStaleConnections(maxIdleMs = 300000): ConnectionInfo[] {
    const now = Date.now();
    return Array.from(this.connections.values()).filter(
      (c) => now - c.lastActivity.getTime() > maxIdleMs
    );
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private getClientIP(socket: Socket): string {
    const headers = socket.handshake.headers;
    const forwardedFor = headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0];
      return ips.trim();
    }
    return socket.handshake.address || 'unknown';
  }

  private async updateRedisConnection(info: ConnectionInfo): Promise<void> {
    const redis = getRedisClient();
    const key = `ws:conn:${info.socketId}`;
    await redis.setex(key, 3600, JSON.stringify(info));

    // Update user's connection list
    await redis.sadd(`ws:user:${info.oderId}:connections`, info.socketId);
    await redis.expire(`ws:user:${info.oderId}:connections`, 3600);
  }

  private async removeRedisConnection(socketId: string): Promise<void> {
    const redis = getRedisClient();
    const info = this.connections.get(socketId);

    await redis.del(`ws:conn:${socketId}`);

    if (info) {
      await redis.srem(`ws:user:${info.oderId}:connections`, socketId);
    }
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      const metrics = await this.getMetrics();
      const redis = getRedisClient();

      await redis.setex(
        `ws:metrics:${this.serverId}`,
        120,
        JSON.stringify({
          ...metrics,
          timestamp: new Date(),
          serverId: this.serverId,
        })
      );
    }, 30000); // Every 30 seconds
  }

  private startHealthReporting(): void {
    this.healthInterval = setInterval(async () => {
      const health = await this.getServerHealth();
      const redis = getRedisClient();

      await redis.setex(`ws:server:health:${this.serverId}`, 60, JSON.stringify(health));
    }, 15000); // Every 15 seconds
  }

  private async shutdown(): Promise<void> {
    logger.info({ serverId: this.serverId }, 'ConnectionManager shutting down');

    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }

    // Clean up Redis entries
    const redis = getRedisClient();
    await redis.del(`ws:server:health:${this.serverId}`);
    await redis.del(`ws:metrics:${this.serverId}`);

    // Remove all connection entries
    for (const socketId of this.connections.keys()) {
      await this.removeRedisConnection(socketId);
    }

    this.connections.clear();
    logger.info('ConnectionManager shutdown complete');
  }
}

// Export singleton instance
export const connectionStateManager = new ConnectionStateManager();
