/**
 * Realtime Service - Fastify Application
 *
 * HTTP server for health checks and WebSocket gateway initialization.
 */

import Fastify, { FastifyInstance } from 'fastify';
import { config } from './config.js';
import { WebSocketGateway } from './gateway/index.js';
import { PresenceService, RoomService, MessageBrokerService } from './services/index.js';
import { SessionEventHandler, AnalyticsEventHandler } from './handlers/index.js';

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

  // Health check endpoint
  app.get('/health', async () => ({
    status: 'ok',
    service: 'realtime-svc',
    connections: gateway.getConnectionCount(),
  }));

  // Readiness check endpoint
  app.get('/ready', async () => ({
    status: 'ok',
    service: 'realtime-svc',
  }));

  // Metrics endpoint
  app.get('/metrics', async () => ({
    connections: gateway.getConnectionCount(),
    serverId: process.pid,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  }));

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
