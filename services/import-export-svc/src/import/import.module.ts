// ══════════════════════════════════════════════════════════════════════════════
// IMPORT MODULE - Content import functionality
// ══════════════════════════════════════════════════════════════════════════════

import { Module } from '@nestjs/common';
import { ImportService } from './import.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
