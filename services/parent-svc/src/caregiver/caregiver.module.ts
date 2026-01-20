/**
 * Caregiver Module
 *
 * Module for caregiver delegation functionality.
 */

import { Module } from '@nestjs/common';
import { CaregiverService } from './caregiver.service.js';
import { CaregiverController } from './caregiver.controller.js';

@Module({
  controllers: [CaregiverController],
  providers: [CaregiverService],
  exports: [CaregiverService],
})
export class CaregiverModule {}
