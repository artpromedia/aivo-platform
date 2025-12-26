/**
 * Parent Service Entry Point
 *
 * Provides parent engagement functionality including:
 * - Parent account management and student linkage
 * - Progress visibility and weekly summaries
 * - Parent-teacher secure messaging
 * - Consent management (COPPA/FERPA)
 * - Multi-language support
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { logger } from '@aivo/ts-observability';
import { AppModule } from './app.module.js';
import { config } from './config.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    })
  );

  // CORS configuration
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = config.port || 3010;
  await app.listen(port);

  logger.info(`Parent service running on port ${port}`, {
    service: 'parent-svc',
    environment: config.environment,
  });
}

bootstrap().catch((error) => {
  logger.error('Failed to start parent service', { error: error.message });
  process.exit(1);
});

export * from './parent/parent.service.js';
export * from './parent/parent.types.js';
export * from './messaging/messaging.service.js';
export * from './messaging/messaging.types.js';
export * from './digest/weekly-digest.service.js';
