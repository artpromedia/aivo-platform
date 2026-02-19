/**
 * API Gateway - Bootstrap
 *
 * Starts the NestJS API Gateway service with security middleware,
 * rate limiting, authentication, and request routing.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('ApiGateway');
  const port = process.env.PORT || 3000;

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  logger.log(`API Gateway running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start API Gateway:', err);
  process.exit(1);
});
