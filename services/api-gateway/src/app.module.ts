/**
 * API Gateway - Root Application Module
 *
 * Central gateway service providing security middleware, rate limiting,
 * authentication/authorization, and request routing for the AIVO platform.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    SecurityModule,
  ],
  controllers: [HealthController],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- NestJS modules are decorated empty classes by design
export class AppModule {}
