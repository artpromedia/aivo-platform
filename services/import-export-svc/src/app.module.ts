// ══════════════════════════════════════════════════════════════════════════════
// IMPORT-EXPORT SERVICE APP MODULE
// Main application module for the import-export microservice
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

// Feature modules
import { ImportModule } from './import/import.module';
import { ExportModule } from './export/export.module';
import { LTIModule } from './lti/lti.module';
import { XAPIModule } from './xapi/xapi.module';
import { SCORMModule } from './scorm/scorm.module';

// Shared modules
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';

// Configuration validation
import * as Joi from 'joi';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        
        // AWS
        AWS_REGION: Joi.string().default('us-east-1'),
        CONTENT_BUCKET: Joi.string().required(),
        
        // LTI Configuration
        LTI_PLATFORM_ISSUER: Joi.string().required(),
        LTI_PLATFORM_PRIVATE_KEY: Joi.string().required(),
        LTI_TOOL_CLIENT_ID: Joi.string().required(),
        LTI_TOOL_PRIVATE_KEY: Joi.string().required(),
        LTI_TOOL_PUBLIC_KEY: Joi.string().required(),
        
        // xAPI Configuration
        XAPI_BASE_IRI: Joi.string().default('https://aivo.education'),
        
        // App
        APP_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
      }),
    }),

    // Rate limiting - 100 requests per minute for import/export operations
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000, // 1 minute
        limit: 100,
      },
      {
        name: 'file-operations',
        ttl: 600000, // 10 minutes
        limit: 20, // Lower limit for expensive file operations
      },
    ]),

    // Event handling
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),

    // Scheduling for cleanup jobs
    ScheduleModule.forRoot(),

    // Auth
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Shared modules
    PrismaModule,
    AuthModule,
    HealthModule,

    // Feature modules
    ImportModule,
    ExportModule,
    LTIModule,
    XAPIModule,
    SCORMModule,
  ],
  providers: [
    // Enable rate limiting globally
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
