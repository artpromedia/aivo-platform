/**
 * Onboarding Controller
 *
 * REST API endpoints for family/learner onboarding with district detection.
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
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import { ParentAuthRequest } from '../auth/parent-auth.middleware.js';
import {
  LocationInput,
  RegisterLearnerInput,
} from './onboarding.types.js';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * Look up district and curriculum from ZIP code
   * Called when parent enters their location
   */
  @Post('lookup-location')
  @HttpCode(HttpStatus.OK)
  async lookupLocation(@Body() location: LocationInput) {
    return this.onboardingService.lookupLocation(location);
  }

  /**
   * Get districts for a state (for manual selection)
   */
  @Get('districts/state/:stateCode')
  async getDistrictsByState(
    @Param('stateCode') stateCode: string,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    return this.onboardingService.getDistrictsByState(stateCode, {
      search,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Get current onboarding status
   */
  @Get('status')
  async getStatus(@Req() req: ParentAuthRequest) {
    return this.onboardingService.getOnboardingStatus(req.parent!.id);
  }

  /**
   * Register a new learner with location
   */
  @Post('register-learner')
  @HttpCode(HttpStatus.CREATED)
  async registerLearner(
    @Req() req: ParentAuthRequest,
    @Body() input: RegisterLearnerInput
  ) {
    return this.onboardingService.registerLearner(req.parent!.id, input);
  }

  /**
   * Update learner location (changes curriculum alignment)
   */
  @Put('learners/:learnerId/location')
  async updateLocation(
    @Req() req: ParentAuthRequest,
    @Param('learnerId') learnerId: string,
    @Body() location: LocationInput
  ) {
    return this.onboardingService.updateLearnerLocation(
      req.parent!.id,
      learnerId,
      location
    );
  }
}
