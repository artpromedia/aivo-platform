/* eslint-disable @typescript-eslint/no-unnecessary-condition */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/await-thenable */
/* eslint-disable @typescript-eslint/no-confusing-void-expression */
/**
 * Realtime Service - Fastify Application
 *
 * HTTP server for health checks, metrics, admin routes, and WebSocket gateway initialization.
 */

import Fastify, { type FastifyInstance } from 'fastify';

import { config } from './config.js';
import { WebSocketGateway } from './gateway/index.js';
import { SessionEventHandler, AnalyticsEventHandler } from './handlers/index.js';
import {
  httpAuthMiddleware,
  type AuthenticatedRequest,
} from './middleware/http-auth.middleware.js';
import { PresenceService, RoomService, MessageBrokerService } from './services/index.js';

export interface AppServices {
  gateway: WebSocketGateway;
  presenceService: PresenceService;
  roomService: RoomService;
  messageBroker: MessageBrokerService;
  sessionEventHandler: SessionEventHandler;
  analyticsEventHandler: AnalyticsEventHandler;
}

export async function buildApp(): Promise<{ app: FastifyInstance; services: AppServices }> {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
      transport:
        config.nodeEnv !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  });

  // Initialize HTTP auth middleware
  await httpAuthMiddleware.initialize();

  // Initialize services
  const presenceService = new PresenceService();
  const roomService = new RoomService();
  const messageBroker = new MessageBrokerService();

  // Initialize message broker
  await messageBroker.initialize();

  // Initialize WebSocket gateway
  const gateway = new WebSocketGateway(presenceService, roomService, messageBroker);
  await gateway.initialize(app);

  // Initialize event handlers
  const sessionEventHandler = new SessionEventHandler(messageBroker, gateway);
  const analyticsEventHandler = new AnalyticsEventHandler(messageBroker, gateway);

  sessionEventHandler.initialize();
  analyticsEventHandler.initialize();

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK ENDPOINTS (No auth - for K8s probes)
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => ({
    status: 'ok',
    service: 'realtime-svc',
    connections: gateway.getConnectionCount(),
  }));

  app.get('/ready', async () => ({
    status: 'ok',
    service: 'realtime-svc',
  }));

  app.get('/live', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }));

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS ENDPOINT (Protected - for Prometheus/Grafana)
  // ═══════════════════════════════════════════════════════════════════════════

  app.get('/metrics', { preHandler: httpAuthMiddleware.requireMetricsAuth }, async () => {
    const memUsage = process.memoryUsage();
    return {
      connections: {
        total: gateway.getConnectionCount(),
        byTenant: gateway.getConnectionCountByTenant?.() ?? {},
      },
      server: {
        serverId: process.pid,
        uptime: process.uptime(),
        uptimeFormatted: formatUptime(process.uptime()),
      },
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        rssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
      rooms: {
        active: roomService.getActiveRoomCount?.() ?? 0,
      },
      presence: {
        onlineUsers: presenceService.getOnlineUserCount?.() ?? 0,
      },
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ADMIN ENDPOINTS (Requires admin role)
  // ═══════════════════════════════════════════════════════════════════════════

  app.get(
    '/admin/connections',
    { preHandler: httpAuthMiddleware.requireAdmin },
    async (request) => {
      const user = (request as AuthenticatedRequest).user;
      const tenantId = user?.tenantId;

      // Platform admins can see all connections, tenant admins only their tenant
      const isPlatformAdmin = user?.role === 'platform_admin' || user?.role === 'super_admin';

      return {
        total: gateway.getConnectionCount(),
        connections: isPlatformAdmin
          ? (gateway.getAllConnections?.() ?? [])
          : (gateway.getConnectionsByTenant?.(tenantId ?? '') ?? []),
      };
    }
  );

  app.post(
    '/admin/broadcast',
    { preHandler: httpAuthMiddleware.requireAdmin },
    async (request, reply) => {
      const body = request.body as { event: string; data: unknown; tenantId?: string };

      if (!body.event) {
        return reply.status(400).send({ error: 'Missing event name' });
      }

      const user = (request as AuthenticatedRequest).user;
      const targetTenant = body.tenantId ?? user?.tenantId;

      if (!targetTenant) {
        return reply.status(400).send({ error: 'Missing target tenant' });
      }

      // Only platform admins can broadcast to other tenants
      const isPlatformAdmin = user?.role === 'platform_admin' || user?.role === 'super_admin';
      if (body.tenantId && body.tenantId !== user?.tenantId && !isPlatformAdmin) {
        return reply.status(403).send({ error: 'Cannot broadcast to other tenants' });
      }

      await gateway.broadcastToTenant?.(targetTenant, body.event, body.data);

      return {
        success: true,
        message: `Broadcast sent to tenant ${targetTenant}`,
      };
    }
  );

  app.post(
    '/admin/disconnect-user/:userId',
    { preHandler: httpAuthMiddleware.requireAdmin },
    async (request, reply) => {
      const params = request.params as { userId: string };
      const body = request.body as { reason?: string } | undefined;
      const user = (request as AuthenticatedRequest).user;

      // Check tenant isolation
      const targetConnections = gateway.getConnectionsByUser?.(params.userId) ?? [];
      const isPlatformAdmin = user?.role === 'platform_admin' || user?.role === 'super_admin';

      if (!isPlatformAdmin) {
        const hasCrossTenant = targetConnections.some((c) => c.tenantId !== user?.tenantId);
        if (hasCrossTenant) {
          return reply.status(403).send({ error: 'Cannot disconnect users from other tenants' });
        }
      }

      const disconnected = await gateway.disconnectUser?.(params.userId, body?.reason);

      return {
        success: true,
        disconnected: disconnected ?? 0,
        message: `Disconnected ${disconnected ?? 0} connection(s) for user ${params.userId}`,
      };
    }
  );

  app.get('/admin/rooms', { preHandler: httpAuthMiddleware.requireAdmin }, async (request) => {
    const user = (request as AuthenticatedRequest).user;
    const isPlatformAdmin = user?.role === 'platform_admin' || user?.role === 'super_admin';

    return {
      rooms: isPlatformAdmin
        ? (roomService.getAllRooms?.() ?? [])
        : (roomService.getRoomsByTenant?.(user?.tenantId ?? '') ?? []),
    };
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVICE-TO-SERVICE ENDPOINTS (Requires service key or admin JWT)
  // ═══════════════════════════════════════════════════════════════════════════

  app.post(
    '/internal/emit',
    { preHandler: httpAuthMiddleware.requireServiceAuth },
    async (request, reply) => {
      const body = request.body as {
        userId?: string;
        tenantId?: string;
        roomId?: string;
        event: string;
        data: unknown;
      };

      if (!body.event) {
        return reply.status(400).send({ error: 'Missing event name' });
      }

      if (body.userId) {
        await gateway.emitToUser?.(body.userId, body.event, body.data);
      } else if (body.roomId) {
        await gateway.emitToRoom?.(body.roomId, body.event, body.data);
      } else if (body.tenantId) {
        await gateway.broadcastToTenant?.(body.tenantId, body.event, body.data);
      } else {
        return reply.status(400).send({ error: 'Must specify userId, roomId, or tenantId' });
      }

      return { success: true };
    }
  );

  app.post(
    '/internal/presence/update',
    { preHandler: httpAuthMiddleware.requireServiceAuth },
    async (request, reply) => {
      const body = request.body as { userId: string; status: string; metadata?: unknown };

      if (!body.userId || !body.status) {
        return reply.status(400).send({ error: 'Missing userId or status' });
      }

      await presenceService.updatePresence?.(body.userId, body.status, body.metadata);

      return { success: true };
    }
  );

  const services: AppServices = {
    gateway,
    presenceService,
    roomService,
    messageBroker,
    sessionEventHandler,
    analyticsEventHandler,
  };

  return { app, services };
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}
