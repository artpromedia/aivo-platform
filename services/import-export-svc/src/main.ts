/**
 * Import/Export Service Entry Point
 *
 * NestJS microservice for content import/export operations.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Main');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Import/Export Service')
    .setDescription('Content import/export API - SCORM, QTI, Common Cartridge, LTI, xAPI')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('export', 'Content export operations')
    .addTag('lti', 'LTI 1.3 integration')
    .addTag('xapi', 'xAPI/Learning Record Store')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Import/Export service listening on port ${port}`);
}

bootstrap();
