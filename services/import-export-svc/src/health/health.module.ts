// ══════════════════════════════════════════════════════════════════════════════
// HEALTH MODULE - Health check endpoints for import-export service
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
