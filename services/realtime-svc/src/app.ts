/**
 * Realtime Service - Fastify Application
 *
 * HTTP server for health checks and WebSocket gateway initialization.
 */

import Fastify, { type FastifyInstance } from 'fastify';

import { config } from './config.js';
import { AlertRulesEngine } from './engine/alert-rules.js';
import { WebSocketGateway } from './gateway/index.js';
import { SessionEventHandler, AnalyticsEventHandler } from './handlers/index.js';
import { ClassroomMonitorHandler } from './handlers/classroom-monitor.handler.js';
import { registerMonitorRoutes } from './routes/monitor.routes.js';
import { PresenceService, RoomService, MessageBrokerService } from './services/index.js';
import { ClassroomMonitorService } from './services/classroom-monitor.service.js';

export interface AppServices {
  gateway: WebSocketGateway;
  presenceService: PresenceService;
  roomService: RoomService;
  messageBroker: MessageBrokerService;
  sessionEventHandler: SessionEventHandler;
  analyticsEventHandler: AnalyticsEventHandler;
  alertRulesEngine: AlertRulesEngine;
  classroomMonitorService: ClassroomMonitorService;
  classroomMonitorHandler: ClassroomMonitorHandler;
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

  // Initialize classroom monitoring
  const alertRulesEngine = new AlertRulesEngine();
  const classroomMonitorService = new ClassroomMonitorService(alertRulesEngine);

  // Initialize WebSocket gateway
  const gateway = new WebSocketGateway(presenceService, roomService, messageBroker);
  await gateway.initialize(app);

  // Initialize event handlers
  const sessionEventHandler = new SessionEventHandler(messageBroker, gateway);
  const analyticsEventHandler = new AnalyticsEventHandler(messageBroker, gateway);
  const classroomMonitorHandler = new ClassroomMonitorHandler(
    classroomMonitorService,
    messageBroker,
    gateway
  );

  sessionEventHandler.initialize();
  analyticsEventHandler.initialize();
  classroomMonitorHandler.initialize();

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

  // Register monitor routes
  await registerMonitorRoutes(app, classroomMonitorService);

  const services: AppServices = {
    gateway,
    presenceService,
    roomService,
    messageBroker,
    sessionEventHandler,
    analyticsEventHandler,
    alertRulesEngine,
    classroomMonitorService,
    classroomMonitorHandler,
  };

  return { app, services };
}
