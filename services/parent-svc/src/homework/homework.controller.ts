/**
 * Homework Controller
 *
 * REST API endpoints for parent homework monitoring.
 * Provides visibility into student homework helper sessions.
 */

import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { HomeworkService } from './homework.service.js';
import { ParentAuthRequest } from '../auth/parent-auth.middleware.js';

@Controller('homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  /**
   * Get homework overview for all linked children
   * Provides a dashboard view of recent homework activity across all students
   */
  @Get('overview')
  async getHomeworkOverview(@Req() req: ParentAuthRequest) {
    return this.homeworkService.getHomeworkOverview(req.parent!.id);
  }

  /**
   * Get homework submissions for a specific student
   */
  @Get('students/:studentId')
  async getStudentHomework(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.homeworkService.getStudentHomework(req.parent!.id, studentId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      subject,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get detailed view of a specific homework session
   * Includes all steps, responses, and progress
   */
  @Get('students/:studentId/sessions/:homeworkId')
  async getHomeworkDetail(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Param('homeworkId') homeworkId: string
  ) {
    return this.homeworkService.getHomeworkDetail(req.parent!.id, studentId, homeworkId);
  }

  /**
   * Get homework summary for a student over a time period
   * Aggregated stats including completion rates by subject
   */
  @Get('students/:studentId/summary')
  async getHomeworkSummary(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Query('days') days?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.homeworkService.getHomeworkSummary(req.parent!.id, studentId, {
      days: days ? parseInt(days, 10) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  /**
   * Get homework trends over time for a student
   * Shows daily or weekly progression data
   */
  @Get('students/:studentId/trends')
  async getHomeworkTrends(
    @Req() req: ParentAuthRequest,
    @Param('studentId') studentId: string,
    @Query('days') days?: string,
    @Query('granularity') granularity?: 'day' | 'week'
  ) {
    return this.homeworkService.getHomeworkTrends(req.parent!.id, studentId, {
      days: days ? parseInt(days, 10) : undefined,
      granularity,
    });
  }
}
