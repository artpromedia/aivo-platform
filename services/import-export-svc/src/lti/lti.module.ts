// ══════════════════════════════════════════════════════════════════════════════
// LTI MODULE
// NestJS module for LTI 1.3 functionality
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

// Controllers
import { LTIController } from './lti.controller';

// Services
import { LTIProviderService } from './lti-provider.service';
import { LTIPlatformService } from './lti-platform.service';

// Strategies
import { LTITokenStrategy } from './strategies/lti-token.strategy';

// Shared modules
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    PrismaModule,
  ],
  controllers: [LTIController],
  providers: [
    LTIProviderService,
    LTIPlatformService,
    LTITokenStrategy,
  ],
  exports: [
    LTIProviderService,
    LTIPlatformService,
  ],
})
export class LTIModule {}
