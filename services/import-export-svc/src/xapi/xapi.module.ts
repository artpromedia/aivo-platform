// ══════════════════════════════════════════════════════════════════════════════
// xAPI MODULE
// NestJS module for xAPI / Learning Record Store functionality
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { XAPIController } from './xapi.controller';

// Services
import { XAPIExporter } from './xapi-statement.exporter';

// Strategies
import { XAPIAuthStrategy } from './strategies/xapi-auth.strategy';

// Shared modules
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PrismaModule,
  ],
  controllers: [XAPIController],
  providers: [
    XAPIExporter,
    XAPIAuthStrategy,
  ],
  exports: [XAPIExporter],
})
export class XAPIModule {}
