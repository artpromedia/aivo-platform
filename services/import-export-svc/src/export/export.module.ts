// ══════════════════════════════════════════════════════════════════════════════
// EXPORT MODULE
// NestJS module for content export functionality
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Controllers
import { ExportController } from './export.controller';

// Services
import { ExportService } from './export.service';
import { SCORMExporter } from './exporters/scorm.exporter';
import { QTIExporter } from './exporters/qti.exporter';
import { CommonCartridgeExporter } from './exporters/common-cartridge.exporter';

// Shared modules
import { PrismaModule } from '../prisma/prisma.module';
import { XAPIModule } from '../xapi/xapi.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
    XAPIModule,
  ],
  controllers: [ExportController],
  providers: [
    ExportService,
    SCORMExporter,
    QTIExporter,
    CommonCartridgeExporter,
  ],
  exports: [
    ExportService,
    SCORMExporter,
    QTIExporter,
    CommonCartridgeExporter,
  ],
})
export class ExportModule {}
