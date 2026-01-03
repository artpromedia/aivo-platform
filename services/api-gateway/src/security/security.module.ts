/**
 * Security Module
 * Central module for all security-related functionality
 */

import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';

// Middleware
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';
import { RequestSanitizationMiddleware } from './middleware/request-sanitization.middleware';
import { SecurityHeadersMiddleware } from './middleware/security-headers.middleware';

// Guards
import { AuthenticationGuard } from './guards/authentication.guard';
import { AuthorizationGuard } from './guards/authorization.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { ConsentGuard } from './guards/consent.guard';
import { AgeVerificationGuard } from './guards/age-verification.guard';

// Interceptors
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { ResponseSanitizationInterceptor } from './interceptors/response-sanitization.interceptor';

// Filters
import { SecurityExceptionFilter } from './filters/security-exception.filter';

// Services
import { EncryptionService } from './services/encryption.service';
import { HashingService } from './services/hashing.service';
import { TokenService } from './services/token.service';
import { AuditLogService } from './services/audit-log.service';
import { ConsentService } from './services/consent.service';
import { DataClassificationService } from './services/data-classification.service';
import { PIIDetectionService } from './services/pii-detection.service';
import { DataMaskingService } from './services/data-masking.service';
import { ThreatDetectionService } from './services/threat-detection.service';
import { SessionService } from './services/session.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    // Core Services
    EncryptionService,
    HashingService,
    TokenService,
    SessionService,
    
    // Audit & Compliance Services
    AuditLogService,
    ConsentService,
    
    // Data Protection Services
    DataClassificationService,
    PIIDetectionService,
    DataMaskingService,
    
    // Threat Detection
    ThreatDetectionService,
    
    // Global Guards (in order of execution)
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ConsentGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AgeVerificationGuard,
    },
    
    // Global Interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseSanitizationInterceptor,
    },
    
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: SecurityExceptionFilter,
    },
  ],
  exports: [
    EncryptionService,
    HashingService,
    TokenService,
    SessionService,
    AuditLogService,
    ConsentService,
    DataClassificationService,
    PIIDetectionService,
    DataMaskingService,
    ThreatDetectionService,
  ],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        CorrelationIdMiddleware,
        SecurityHeadersMiddleware,
        RequestSanitizationMiddleware,
      )
      .forRoutes('*');
  }
}
