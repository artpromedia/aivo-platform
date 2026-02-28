/**
 * Fastify Application Setup
 *
 * Main application builder for parent-svc.
 * Registers all plugins, hooks, and routes.
 */

import { logger } from '@aivo/ts-observability';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyError } from 'fastify';

// Auth hooks

// Route modules
import { authRoutes } from './auth/auth.controller.js';
import { learnerAuthHook } from './auth/learner-auth.middleware.js';
import { parentAuthHook } from './auth/parent-auth.middleware.js';

// Services (instantiated once, shared across routes)
import { ParentAuthService } from './auth/parent-auth.service.js';
import { rateLimitHook } from './auth/rate-limit.middleware.js';
import { caregiverRoutes } from './caregiver/caregiver.controller.js';
import { CaregiverService } from './caregiver/caregiver.service.js';
import { config } from './config.js';
import { CryptoService } from './crypto/crypto.service.js';
import { dataRightsRoutes } from './data-rights/data-rights.controller.js';
import { DataRightsService } from './data-rights/data-rights.service.js';
import { WeeklyDigestService } from './digest/weekly-digest.service.js';
import { EmailService } from './email/email.service.js';
import { eventBus } from './event-bus.js';
import { FirebaseService } from './firebase/firebase.service.js';
import { homeworkRoutes } from './homework/homework.controller.js';
import { HomeworkService } from './homework/homework.service.js';
import { I18nService } from './i18n/i18n.service.js';
import { internalRoutes } from './internal/internal.controller.js';
import { learnerPinRoutes } from './learner/learner-pin.controller.js';
import { learnerRoutes } from './learner/learner.controller.js';
import { messagingRoutes } from './messaging/messaging.controller.js';
import { MessagingService } from './messaging/messaging.service.js';
import { ContentModerationService } from './moderation/content-moderation.service.js';
import { NotificationService } from './notification/notification.service.js';
import { onboardingRoutes } from './onboarding/onboarding.controller.js';
import { OnboardingService } from './onboarding/onboarding.service.js';
import { parentRoutes } from './parent/parent.controller.js';
import { ParentService } from './parent/parent.service.js';
import { PdfReportService } from './pdf/pdf-report.service.js';
import { reportsRoutes } from './pdf/reports.controller.js';
import { prisma, connectDatabase, disconnectDatabase } from './prisma/prisma.service.js';
import { adminVerificationRoutes } from './registration/admin-verification.controller.js';
import { familyRoutes } from './registration/family.controller.js';
import { FamilyService } from './registration/family.service.js';
import { registrationRoutes } from './registration/registration.controller.js';
import { RegistrationService } from './registration/registration.service.js';

// Extend Fastify instance with our services
declare module 'fastify' {
  interface FastifyInstance {
    services: {
      prisma: typeof prisma;
      parentAuth: ParentAuthService;
      parent: ParentService;
      messaging: MessagingService;
      caregiver: CaregiverService;
      homework: HomeworkService;
      onboarding: OnboardingService;
      weeklyDigest: WeeklyDigestService;
      pdfReport: PdfReportService;
      notification: NotificationService;
      email: EmailService;
      moderation: ContentModerationService;
      crypto: CryptoService;
      i18n: I18nService;
      registration: RegistrationService;
      family: FamilyService;
      dataRights: DataRightsService;
    };
  }
}

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.environment === 'production' ? 'info' : 'debug',
      transport:
        config.environment === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { colorize: true } },
    },
  });

  // ════════════════════════════════════════════════════════════════════════════
  // DATABASE
  // ════════════════════════════════════════════════════════════════════════════

  await connectDatabase();

  // ════════════════════════════════════════════════════════════════════════════
  // SERVICE INITIALIZATION
  // ════════════════════════════════════════════════════════════════════════════

  const crypto = new CryptoService();
  const i18n = new I18nService();
  const emailService = new EmailService();
  const firebaseService = new FirebaseService();
  const notificationService = new NotificationService(prisma, emailService, i18n, firebaseService);
  const moderationService = new ContentModerationService();
  const parentAuthService = new ParentAuthService(prisma, crypto, notificationService);
  const parentService = new ParentService(prisma, eventBus, i18n, crypto, notificationService);
  const messagingService = new MessagingService(
    prisma,
    eventBus,
    notificationService,
    moderationService
  );
  const caregiverService = new CaregiverService(
    prisma,
    eventBus,
    i18n,
    crypto,
    notificationService,
    emailService
  );
  const homeworkService = new HomeworkService(prisma);
  const onboardingService = new OnboardingService(prisma);
  const pdfReportService = new PdfReportService(i18n);
  const weeklyDigestService = new WeeklyDigestService(prisma, i18n, emailService, parentService);
  const registrationService = new RegistrationService(prisma, eventBus, crypto, emailService);
  const familyService = new FamilyService(prisma);
  const dataRightsService = new DataRightsService(prisma, eventBus);

  // Decorate app with services
  app.decorate('services', {
    prisma,
    parentAuth: parentAuthService,
    parent: parentService,
    messaging: messagingService,
    caregiver: caregiverService,
    homework: homeworkService,
    onboarding: onboardingService,
    weeklyDigest: weeklyDigestService,
    pdfReport: pdfReportService,
    notification: notificationService,
    email: emailService,
    moderation: moderationService,
    crypto,
    i18n,
    registration: registrationService,
    family: familyService,
    dataRights: dataRightsService,
  });

  // ════════════════════════════════════════════════════════════════════════════
  // CORS
  // ════════════════════════════════════════════════════════════════════════════

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && config.corsOrigins.includes(origin)) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Credentials', 'true');
      reply.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      reply.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    }
    if (request.method === 'OPTIONS') {
      reply.status(204).send();
      return;
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // GLOBAL RATE LIMITING
  // ════════════════════════════════════════════════════════════════════════════

  app.addHook('onRequest', rateLimitHook);

  // ════════════════════════════════════════════════════════════════════════════
  // HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════════════

  app.get('/health', async () => ({ status: 'ok', service: 'parent-svc' }));
  app.get('/ready', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'parent-svc' };
    } catch {
      return { status: 'not ready', service: 'parent-svc' };
    }
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ERROR HANDLER
  // ════════════════════════════════════════════════════════════════════════════

  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      app.log.error({ err: error, requestId: request.id }, 'Server error');
    } else {
      app.log.warn({ err: error, requestId: request.id }, 'Client error');
    }

    return reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      message: error.message,
      ...(config.environment !== 'production' && { stack: error.stack }),
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // REGISTER ROUTES — all under /api/v1 prefix
  // ════════════════════════════════════════════════════════════════════════════

  await app.register(
    async (apiApp) => {
      // ── Public routes (no auth required) ──────────────────────────────────
      await apiApp.register(authRoutes, { prefix: '/auth' });
      await apiApp.register(onboardingRoutes, { prefix: '/onboarding' });
      await apiApp.register(learnerRoutes, { prefix: '/learner' });
      await apiApp.register(learnerPinRoutes, { prefix: '/learner' });
      await apiApp.register(internalRoutes, { prefix: '/internal' });

      // ── Caregiver public & protected routes ───────────────────────────────
      await apiApp.register(caregiverRoutes, { prefix: '/caregiver' });

      // ── Registration (self-service) routes ────────────────────────────────
      await apiApp.register(registrationRoutes, { prefix: '/caregiver' });
      await apiApp.register(adminVerificationRoutes, { prefix: '/admin' });
      await apiApp.register(familyRoutes, { prefix: '/family' });

      // ── Parent-authenticated routes ───────────────────────────────────────
      await apiApp.register(async (protectedApp) => {
        // Apply parent auth to all routes in this scope
        protectedApp.addHook('preHandler', parentAuthHook);

        await protectedApp.register(parentRoutes, { prefix: '/parent' });
        await protectedApp.register(messagingRoutes, { prefix: '/messages' });
        await protectedApp.register(reportsRoutes, { prefix: '/reports' });
        await protectedApp.register(homeworkRoutes, { prefix: '/homework' });
        await protectedApp.register(dataRightsRoutes, { prefix: '/parent/students' });
      });
    },
    { prefix: '/api/v1' }
  );

  // ════════════════════════════════════════════════════════════════════════════
  // SHUTDOWN HOOKS
  // ════════════════════════════════════════════════════════════════════════════

  app.addHook('onClose', async () => {
    await disconnectDatabase();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // WEEKLY DIGEST SCHEDULER
  // ════════════════════════════════════════════════════════════════════════════

  // Start the weekly digest cron-like scheduler
  // Schedule weekly digest: Sunday at 6 PM UTC
  const SUNDAY_6PM_MS = 1000 * 60 * 60 * 24 * 7; // fallback interval
  const scheduleNextDigest = () => {
    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setUTCDate(now.getUTCDate() + ((7 - now.getUTCDay()) % 7 || 7));
    nextSunday.setUTCHours(18, 0, 0, 0);
    if (nextSunday <= now) nextSunday.setUTCDate(nextSunday.getUTCDate() + 7);
    const delay = nextSunday.getTime() - now.getTime();
    setTimeout(async () => {
      try {
        await weeklyDigestService.sendWeeklyDigests();
      } catch (e) {
        app.log.error(e, 'Weekly digest failed');
      }
      scheduleNextDigest();
    }, delay);
  };
  if (config.environment !== 'development') scheduleNextDigest();

  return app;
}
