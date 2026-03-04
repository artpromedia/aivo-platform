/**
 * API Gateway - Root Application Module
 *
 * Central gateway service providing security middleware, rate limiting,
 * authentication/authorization, and request routing for the AIVO platform.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './security/security.module';
import { HealthController } from './health.controller';

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
export class AppModule {}
