/**
 * Registration Module
 *
 * Provides caregiver self-registration functionality including:
 * - Registration flow with email verification
 * - Learner linking with school verification
 * - Family dashboard
 * - Admin verification endpoints
 */

import { Module } from '@nestjs/common';
import { RegistrationController } from './registration.controller.js';
import { AdminVerificationController } from './admin-verification.controller.js';
import { FamilyController } from './family.controller.js';
import { RegistrationService } from './registration.service.js';
import { FamilyService } from './family.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CryptoService } from '../crypto/crypto.service.js';
import { EmailService } from '../email/email.service.js';
import { RegistrationRateLimitGuard, FraudDetectionGuard } from './guards/registration-rate-limit.guard.js';
import { CaptchaGuard } from './guards/captcha.guard.js';
import { SchoolAdminGuard } from './guards/school-admin.guard.js';
import { CaregiverAuthGuard } from './guards/caregiver-auth.guard.js';

@Module({
  controllers: [
    RegistrationController,
    AdminVerificationController,
    FamilyController,
  ],
  providers: [
    RegistrationService,
    FamilyService,
    PrismaService,
    CryptoService,
    EmailService,
    RegistrationRateLimitGuard,
    FraudDetectionGuard,
    CaptchaGuard,
    SchoolAdminGuard,
    CaregiverAuthGuard,
  ],
  exports: [RegistrationService, FamilyService],
})
export class RegistrationModule {}
