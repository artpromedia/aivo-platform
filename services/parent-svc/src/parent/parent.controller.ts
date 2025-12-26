/**
 * Parent Controller
 *
 * REST API endpoints for parent portal functionality.
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
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ParentService } from './parent.service.js';
import { ParentAuthRequest } from '../auth/parent-auth.middleware.js';
import {
  CreateConsentInput,
  UpdatePrivacySettingsInput,
} from './parent.types.js';

@Controller('parent')
export class ParentController {
  constructor(private readonly parentService: ParentService) {}

  /**
   * Get parent profile with linked students
   */
  @Get('profile')
  async getProfile(@Req() req: ParentAuthRequest) {
    return this.parentService.getParentProfile(req.parent!.id);
  }

  /**
   * Update parent profile
   */
  @Put('profile')
  async updateProfile(
    @Req() req: ParentAuthRequest,
    @Body() body: { firstName?: string; lastName?: string; phone?: string; language?: string }
  ) {
    return this.parentService.updateProfile(req.parent!.id, body);
  }

  /**
   * Get summary for a linked student
   */
  @Get('students/:studentId/summary')
  async getStudentSummary(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string
  ) {
    return this.parentService.getStudentSummary(req.parent!.id, studentId);
  }

  /**
   * Get detailed progress report for a student
   */
  @Get('students/:studentId/progress')
  async getProgressReport(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.parentService.getProgressReport(req.parent!.id, studentId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get weekly summary for a student
   */
  @Get('students/:studentId/weekly-summary')
  async getWeeklySummary(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Query('weekOf') weekOf?: string
  ) {
    return this.parentService.generateWeeklySummary(
      req.parent!.id,
      studentId,
      weekOf ? new Date(weekOf) : new Date()
    );
  }

  /**
   * Get consent records for a student
   */
  @Get('students/:studentId/consent')
  async getConsentRecords(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string
  ) {
    return this.parentService.getConsentRecords(req.parent!.id, studentId);
  }

  /**
   * Record consent for a student
   */
  @Post('students/:studentId/consent')
  @HttpCode(HttpStatus.CREATED)
  async recordConsent(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Body() body: CreateConsentInput
  ) {
    return this.parentService.recordConsent({
      parentId: req.parent!.id,
      studentId,
      ...body,
    });
  }

  /**
   * Update privacy settings
   */
  @Put('privacy-settings')
  async updatePrivacySettings(
    @Req() req: ParentAuthRequest,
    @Body() body: UpdatePrivacySettingsInput
  ) {
    return this.parentService.updatePrivacySettings(req.parent!.id, body);
  }

  /**
   * Get notifications
   */
  @Get('notifications')
  async getNotifications(
    @Req() req: ParentAuthRequest,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string
  ) {
    return this.parentService.getNotifications(req.parent!.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  /**
   * Mark notifications as read
   */
  @Put('notifications/read')
  async markNotificationsRead(
    @Req() req: ParentAuthRequest,
    @Body() body: { notificationIds: string[] }
  ) {
    return this.parentService.markNotificationsRead(req.parent!.id, body.notificationIds);
  }

  /**
   * Update notification preferences
   */
  @Put('notification-preferences')
  async updateNotificationPreferences(
    @Req() req: ParentAuthRequest,
    @Body() body: Record<string, boolean>
  ) {
    return this.parentService.updateNotificationPreferences(req.parent!.id, body);
  }

  /**
   * Register push subscription
   */
  @Post('push-subscription')
  @HttpCode(HttpStatus.CREATED)
  async registerPushSubscription(
    @Req() req: ParentAuthRequest,
    @Body() body: { platform: string; token?: string; endpoint: string; keys?: Record<string, string> }
  ) {
    return this.parentService.registerPushSubscription(req.parent!.id, body);
  }
}
