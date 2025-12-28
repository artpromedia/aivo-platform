// ══════════════════════════════════════════════════════════════════════════════
// SCORM MODULE - SCORM runtime and tracking
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { SCORMRuntimeService } from './scorm-runtime.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SCORMRuntimeService],
  exports: [SCORMRuntimeService],
})
export class SCORMModule {}
