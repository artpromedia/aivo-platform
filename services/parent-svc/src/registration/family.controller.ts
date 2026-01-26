/**
 * Family Dashboard Controller
 *
 * REST API endpoints for the family dashboard,
 * allowing caregivers to view and manage their linked learners.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { FamilyService } from './family.service.js';
import {
  FamilyDashboardResponse,
  LearnerOverview,
} from './registration.types.js';

// Interface for authenticated caregiver request
interface CaregiverAuthRequest extends Request {
  caregiver?: {
    id: string;
    email: string;
    givenName: string;
    familyName: string;
  };
}

// Import the caregiver auth guard from the existing caregiver module
// This should be replaced with the actual guard path
import { CaregiverAuthGuard } from './guards/caregiver-auth.guard.js';

@Controller('api/v1/family')
@UseGuards(CaregiverAuthGuard)
export class FamilyController {
  constructor(private readonly familyService: FamilyService) {}

  /**
   * Get family dashboard overview
   * GET /api/v1/family/dashboard
   */
  @Get('dashboard')
  async getDashboard(
    @Req() req: CaregiverAuthRequest,
  ): Promise<FamilyDashboardResponse> {
    const caregiverId = req.caregiver!.id;
    return this.familyService.getFamilyDashboard(caregiverId);
  }

  /**
   * Switch active learner context
   * POST /api/v1/family/active-learner
   */
  @Post('active-learner')
  @HttpCode(HttpStatus.OK)
  async setActiveLearner(
    @Req() req: CaregiverAuthRequest,
    @Body() body: { learnerId: string },
  ): Promise<{ success: boolean; learner: { id: string; name: string } }> {
    const caregiverId = req.caregiver!.id;
    return this.familyService.setActiveLearner(caregiverId, body.learnerId);
  }

  /**
   * Get learner details
   * GET /api/v1/family/learners/:learnerId
   */
  @Get('learners/:learnerId')
  async getLearnerDetails(
    @Req() req: CaregiverAuthRequest,
    @Param('learnerId') learnerId: string,
  ): Promise<LearnerOverview & {
    recentSessions: Array<{
      id: string;
      subject: string;
      duration: number;
      score: number | null;
      completedAt: Date;
    }>;
    achievements: Array<{
      id: string;
      name: string;
      description: string;
      earnedAt: Date;
    }>;
  }> {
    const caregiverId = req.caregiver!.id;
    return this.familyService.getLearnerDetails(caregiverId, learnerId);
  }
}
