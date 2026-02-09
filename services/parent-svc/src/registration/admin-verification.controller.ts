/**
 * School Admin Verification Controller
 *
 * REST API endpoints for school administrators to verify
 * caregiver-learner link requests.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { RegistrationService } from './registration.service.js';
import { UpdateLinkRequestDto, VerificationStatus } from './registration.types.js';

// This interface should match your auth middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
    schoolId?: string;
  };
}

// Placeholder guard - replace with actual school admin auth guard
import { SchoolAdminGuard } from './guards/school-admin.guard.js';

@Controller('api/v1/admin')
@UseGuards(SchoolAdminGuard)
export class AdminVerificationController {
  constructor(private readonly registrationService: RegistrationService) {}

  /**
   * Get pending link requests for a school
   * GET /api/v1/admin/schools/:schoolId/learner-link-requests
   */
  @Get('schools/:schoolId/learner-link-requests')
  async getPendingLinkRequests(
    @Param('schoolId') schoolId: string,
    @Query('status') status?: VerificationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<{
    requests: {
      id: string;
      registrationId: string;
      caregiverName: string;
      caregiverEmail: string;
      relationship: string;
      identificationMethod: string;
      learnerInfo: {
        email?: string;
        studentId?: string;
        firstName?: string;
        lastName?: string;
        dateOfBirth?: string;
      };
      verificationMethod: string;
      verificationStatus: string;
      createdAt: Date;
      matchedLearner?: { id: string; name: string; grade?: string };
    }[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.registrationService.getPendingLinkRequests(schoolId, {
      status,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Approve or reject a link request
   * PUT /api/v1/admin/learner-link-requests/:requestId
   */
  @Put('learner-link-requests/:requestId')
  @HttpCode(HttpStatus.OK)
  async updateLinkRequest(
    @Param('requestId') requestId: string,
    @Body() dto: UpdateLinkRequestDto,
    @Req() req: AuthenticatedRequest
  ): Promise<{ success: boolean; message: string }> {
    const adminUserId = req.user?.id || 'unknown';

    await this.registrationService.updateLinkRequestStatus(
      requestId,
      dto.status,
      adminUserId,
      dto.rejectionReason,
      {
        ipAddress: this.getClientIp(req),
        userAgent: req.headers['user-agent'],
      }
    );

    return {
      success: true,
      message:
        dto.status === 'APPROVED'
          ? 'Link request approved successfully.'
          : 'Link request rejected.',
    };
  }

  /**
   * Generate verification code for parent pickup
   * POST /api/v1/admin/learners/:learnerId/generate-parent-code
   */
  @Post('learners/:learnerId/generate-parent-code')
  @HttpCode(HttpStatus.CREATED)
  async generateParentCode(
    @Param('learnerId') learnerId: string,
    @Req() req: AuthenticatedRequest
  ): Promise<{
    code: string;
    expiresAt: Date;
    learnerId: string;
    learnerName: string;
  }> {
    const schoolId = req.user?.schoolId;
    const issuedById = req.user?.id;

    if (!schoolId || !issuedById) {
      throw new Error('School context required');
    }

    return this.registrationService.generateParentVerificationCode(schoolId, learnerId, issuedById);
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
