/**
 * Caregiver Self-Registration Controller
 *
 * REST API endpoints for the self-service registration flow.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { CaptchaGuard } from './guards/captcha.guard.js';
import { RegistrationRateLimitGuard } from './guards/registration-rate-limit.guard.js';
import { RegistrationService } from './registration.service.js';
import {
  RegisterCaregiverDto,
  VerifyEmailDto,
  AddLearnerLinkDto,
  VerifyLearnerCodeDto,
  RegistrationResponse,
  VerifyEmailResponse,
  LearnerLinkResponse,
  VerifyLearnerCodeResponse,
  RegistrationStatusResponse,
} from './registration.types.js';

@Controller('api/v1/caregiver')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  /**
   * Step 1: Initial Registration
   * POST /api/v1/caregiver/register
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RegistrationRateLimitGuard, CaptchaGuard)
  async register(
    @Body() dto: RegisterCaregiverDto,
    @Req() req: Request
  ): Promise<RegistrationResponse> {
    return this.registrationService.registerCaregiver(dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Step 2: Email Verification
   * POST /api/v1/caregiver/verify-email
   */
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RegistrationRateLimitGuard)
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() req: Request
  ): Promise<VerifyEmailResponse> {
    return this.registrationService.verifyEmail(dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Step 3: Add Learner Link Request
   * POST /api/v1/caregiver/:registrationId/learners
   */
  @Post(':registrationId/learners')
  @HttpCode(HttpStatus.CREATED)
  async addLearnerLink(
    @Param('registrationId') registrationId: string,
    @Body() dto: AddLearnerLinkDto,
    @Req() req: Request
  ): Promise<LearnerLinkResponse> {
    return this.registrationService.addLearnerLink(registrationId, dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Step 4: Submit Verification Code (if applicable)
   * POST /api/v1/caregiver/learners/:linkRequestId/verify
   */
  @Post('learners/:linkRequestId/verify')
  @HttpCode(HttpStatus.OK)
  async verifyLearnerCode(
    @Param('linkRequestId') linkRequestId: string,
    @Body() dto: VerifyLearnerCodeDto,
    @Req() req: Request
  ): Promise<VerifyLearnerCodeResponse> {
    return this.registrationService.verifyLearnerCode(linkRequestId, dto, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Check Registration Status
   * GET /api/v1/caregiver/:registrationId/status
   */
  @Get(':registrationId/status')
  async getRegistrationStatus(
    @Param('registrationId') registrationId: string
  ): Promise<RegistrationStatusResponse> {
    return this.registrationService.getRegistrationStatus(registrationId);
  }

  /**
   * Resend Verification Email
   * POST /api/v1/caregiver/:registrationId/resend-verification
   */
  @Post(':registrationId/resend-verification')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RegistrationRateLimitGuard)
  async resendVerification(
    @Param('registrationId') registrationId: string,
    @Req() req: Request
  ): Promise<{ success: boolean; message: string }> {
    return this.registrationService.resendVerificationEmail(registrationId, {
      ipAddress: this.getClientIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
      return forwarded[0];
    }
    return req.socket?.remoteAddress || 'unknown';
  }
}
