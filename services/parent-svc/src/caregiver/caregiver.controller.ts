/**
 * Caregiver Controller
 *
 * REST API endpoints for caregiver delegation functionality.
 * Supports both parent (delegator) and caregiver (delegatee) operations.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CaregiverService } from './caregiver.service.js';
import type { AuthenticatedParentRequest } from '../auth/parent-auth.middleware.js';
import {
  CreateCaregiverInviteDto,
  AcceptCaregiverInviteDto,
  UpdateCaregiverProfileDto,
  UpdateCaregiverPermissionsDto,
  RevokeCaregiverAccessDto,
  ResendCaregiverInviteDto,
  CancelCaregiverInviteDto,
} from './caregiver.types.js';

// Type for authenticated caregiver requests
interface AuthenticatedCaregiverRequest {
  caregiver: {
    id: string;
    email: string;
  };
}

@Controller('caregiver')
export class CaregiverController {
  constructor(private readonly caregiverService: CaregiverService) {}

  // ============================================================================
  // PARENT ENDPOINTS (Managing caregivers for their children)
  // ============================================================================

  /**
   * Create a caregiver invitation (parent action)
   */
  @Post('invite')
  @HttpCode(HttpStatus.CREATED)
  async createCaregiverInvite(
    @Req() req: AuthenticatedParentRequest,
    @Body() body: CreateCaregiverInviteDto,
  ) {
    return this.caregiverService.createCaregiverInvite(req.parent.id, body);
  }

  /**
   * Resend a caregiver invitation (parent action)
   */
  @Post('invite/resend')
  @HttpCode(HttpStatus.OK)
  async resendCaregiverInvite(
    @Req() req: AuthenticatedParentRequest,
    @Body() body: ResendCaregiverInviteDto,
  ) {
    await this.caregiverService.resendCaregiverInvite(req.parent.id, body);
    return { success: true, message: 'Invitation resent successfully' };
  }

  /**
   * Cancel a pending caregiver invitation (parent action)
   */
  @Delete('invite/:inviteId')
  @HttpCode(HttpStatus.OK)
  async cancelCaregiverInvite(
    @Req() req: AuthenticatedParentRequest,
    @Param('inviteId') inviteId: string,
  ) {
    await this.caregiverService.cancelCaregiverInvite(req.parent.id, { inviteId });
    return { success: true, message: 'Invitation cancelled successfully' };
  }

  /**
   * Get caregivers for a student (parent action)
   */
  @Get('students/:studentId')
  async getStudentCaregivers(
    @Req() req: AuthenticatedParentRequest,
    @Param('studentId') studentId: string,
  ) {
    return this.caregiverService.getStudentCaregivers(req.parent.id, studentId);
  }

  /**
   * Get caregiver limit info for a student (parent action)
   */
  @Get('students/:studentId/limit')
  async getCaregiverLimit(
    @Req() req: AuthenticatedParentRequest,
    @Param('studentId') studentId: string,
  ) {
    return this.caregiverService.getCaregiverLimitInfo(studentId);
  }

  /**
   * Update caregiver permissions (parent action)
   */
  @Put('permissions')
  async updateCaregiverPermissions(
    @Req() req: AuthenticatedParentRequest,
    @Body() body: UpdateCaregiverPermissionsDto,
  ) {
    return this.caregiverService.updateCaregiverPermissions(req.parent.id, body);
  }

  /**
   * Revoke caregiver access (parent action)
   */
  @Delete('access')
  @HttpCode(HttpStatus.OK)
  async revokeCaregiverAccess(
    @Req() req: AuthenticatedParentRequest,
    @Body() body: RevokeCaregiverAccessDto,
  ) {
    await this.caregiverService.revokeCaregiverAccess(req.parent.id, body);
    return { success: true, message: 'Caregiver access revoked successfully' };
  }

  // ============================================================================
  // PUBLIC ENDPOINTS (Invite acceptance)
  // ============================================================================

  /**
   * Accept a caregiver invitation (public - no auth required)
   */
  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  async acceptCaregiverInvite(@Body() body: AcceptCaregiverInviteDto) {
    return this.caregiverService.acceptCaregiverInvite(body);
  }

  /**
   * Get invite details (public - for displaying invite info before accepting)
   */
  @Get('invite/:code')
  async getInviteDetails(@Param('code') code: string) {
    // This would be implemented in the service to return limited info
    // about the invite without requiring authentication
    return this.caregiverService.getInviteDetails(code);
  }

  // ============================================================================
  // CAREGIVER ENDPOINTS (Caregiver managing their own account)
  // ============================================================================

  /**
   * Get caregiver profile with linked students
   */
  @Get('profile')
  async getCaregiverProfile(@Req() req: AuthenticatedCaregiverRequest) {
    return this.caregiverService.getCaregiverProfile(req.caregiver.id);
  }

  /**
   * Update caregiver profile
   */
  @Put('profile')
  async updateCaregiverProfile(
    @Req() req: AuthenticatedCaregiverRequest,
    @Body() body: UpdateCaregiverProfileDto,
  ) {
    return this.caregiverService.updateCaregiverProfile(req.caregiver.id, body);
  }

  /**
   * Get student summary (for caregiver dashboard)
   * This uses the same data as parent dashboard but respects caregiver permissions
   */
  @Get('students/:studentId/summary')
  async getStudentSummaryForCaregiver(
    @Req() req: AuthenticatedCaregiverRequest,
    @Param('studentId') studentId: string,
  ) {
    return this.caregiverService.getStudentSummaryForCaregiver(req.caregiver.id, studentId);
  }

  /**
   * Get student progress (for caregiver dashboard)
   */
  @Get('students/:studentId/progress')
  async getStudentProgressForCaregiver(
    @Req() req: AuthenticatedCaregiverRequest,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.caregiverService.getStudentProgressForCaregiver(req.caregiver.id, studentId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get student achievements (for caregiver dashboard)
   */
  @Get('students/:studentId/achievements')
  async getStudentAchievementsForCaregiver(
    @Req() req: AuthenticatedCaregiverRequest,
    @Param('studentId') studentId: string,
  ) {
    return this.caregiverService.getStudentAchievementsForCaregiver(req.caregiver.id, studentId);
  }
}
