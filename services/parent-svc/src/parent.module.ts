/**
 * Parent Module
 *
 * Main NestJS module for the parent service.
 */

import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { ParentController } from './parent/parent.controller.js';
import { AuthController } from './auth/auth.controller.js';
import { MessagingController } from './messaging/messaging.controller.js';
import { ReportsController } from './pdf/reports.controller.js';

// Services
import { ParentService } from './parent/parent.service.js';
import { ParentAuthService } from './auth/parent-auth.service.js';
import { MessagingService } from './messaging/messaging.service.js';
import { WeeklyDigestService } from './digest/weekly-digest.service.js';
import { NotificationService } from './notification/notification.service.js';
import { EmailService } from './email/email.service.js';
import { ContentModerationService } from './moderation/content-moderation.service.js';
import { PdfReportService } from './pdf/pdf-report.service.js';
import { PrismaService } from './prisma/prisma.service.js';
import { CryptoService } from './crypto/crypto.service.js';
import { I18nService } from './i18n/i18n.service.js';

// Middleware
import { ParentAuthMiddleware } from './auth/parent-auth.middleware.js';
import { RateLimitMiddleware } from './auth/rate-limit.middleware.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
  ],
  controllers: [
    ParentController,
    AuthController,
    MessagingController,
    ReportsController,
  ],
  providers: [
    // Core services
    PrismaService,
    CryptoService,
    I18nService,
    EmailService,

    // Business services
    ParentService,
    ParentAuthService,
    MessagingService,
    WeeklyDigestService,
    NotificationService,
    ContentModerationService,
    PdfReportService,
  ],
  exports: [
    ParentService,
    MessagingService,
    NotificationService,
  ],
})
export class ParentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply rate limiting to all routes
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes('*');

    // Apply authentication to protected routes
    consumer
      .apply(ParentAuthMiddleware)
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'auth/refresh', method: RequestMethod.POST },
        { path: 'auth/verify-email', method: RequestMethod.GET },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        { path: 'auth/reset-password', method: RequestMethod.POST },
        { path: 'health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
