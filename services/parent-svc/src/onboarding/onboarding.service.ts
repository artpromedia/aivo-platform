/**
 * Onboarding Service
 *
 * Handles family/learner onboarding with automatic district detection
 * and curriculum alignment based on ZIP code.
 */

import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  LocationInput,
  DistrictInfo,
  CurriculumInfo,
  OnboardingLocationResult,
  RegisterLearnerInput,
  RegisterLearnerResult,
  OnboardingStatus,
} from './onboarding.types.js';

// Default curriculum for when district lookup fails
const DEFAULT_CURRICULUM: CurriculumInfo = {
  stateCode: 'US',
  stateName: 'United States',
  mathFramework: 'COMMON_CORE',
  elaFramework: 'COMMON_CORE',
  scienceFramework: 'NGSS',
  socialStudiesFramework: 'C3',
  additionalFrameworks: [],
  curriculumStandards: ['COMMON_CORE', 'NGSS', 'C3'],
};

@Injectable()
export class OnboardingService {
  private readonly tenantServiceUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://tenant-svc:3000';
  }

  /**
   * Look up district and curriculum from ZIP code
   * This is called when parent enters their location during onboarding
   */
  async lookupLocation(location: LocationInput): Promise<OnboardingLocationResult> {
    try {
      const response = await fetch(
        `${this.tenantServiceUrl}/districts/auto-detect`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(location),
        }
      );

      if (!response.ok) {
        // If lookup fails, return default curriculum
        return {
          success: true,
          curriculum: DEFAULT_CURRICULUM,
          message: 'Using default curriculum standards. District lookup unavailable.',
        };
      }

      const data = await response.json() as {
        district?: DistrictInfo;
        curriculum: CurriculumInfo;
      };

      return {
        success: true,
        district: data.district,
        curriculum: data.curriculum,
      };
    } catch (error) {
      console.error('District lookup error:', error);
      return {
        success: true,
        curriculum: DEFAULT_CURRICULUM,
        message: 'Using default curriculum standards. District lookup unavailable.',
      };
    }
  }

  /**
   * Get districts for a state (for manual selection)
   */
  async getDistrictsByState(
    stateCode: string,
    options?: { search?: string; limit?: number; offset?: number }
  ): Promise<{ districts: DistrictInfo[]; total: number }> {
    try {
      const params = new URLSearchParams();
      if (options?.search) params.append('search', options.search);
      if (options?.limit) params.append('limit', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));

      const response = await fetch(
        `${this.tenantServiceUrl}/districts/lookup/state/${stateCode}?${params}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        return { districts: [], total: 0 };
      }

      const data = await response.json() as {
        districts: DistrictInfo[];
        total: number;
      };

      return data;
    } catch (error) {
      console.error('District state lookup error:', error);
      return { districts: [], total: 0 };
    }
  }

  /**
   * Register a new learner with location-based curriculum
   */
  async registerLearner(
    parentId: string,
    input: RegisterLearnerInput
  ): Promise<RegisterLearnerResult> {
    // Look up district and curriculum
    const locationResult = await this.lookupLocation(input.location);

    // Determine which district to use (selected or auto-detected)
    let district = locationResult.district;
    if (input.selectedDistrictId && input.selectedDistrictId !== district?.ncesDistrictId) {
      // Fetch the selected district
      try {
        const response = await fetch(
          `${this.tenantServiceUrl}/districts/${input.selectedDistrictId}`,
          { method: 'GET' }
        );
        if (response.ok) {
          const data = await response.json() as { district: DistrictInfo };
          district = data.district;
        }
      } catch (error) {
        console.error('District fetch error:', error);
      }
    }

    // Create learner record in parent-svc database
    // Note: This creates the parent-learner link. The actual learner profile
    // is managed by profile-svc, and virtual brain by learner-model-svc
    const learner = await this.prisma.learner.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: new Date(input.dateOfBirth),
        gradeLevel: input.gradeLevel,
        // Location info for curriculum alignment
        stateCode: input.location.stateCode || district?.stateCode || null,
        zipCode: input.location.zipCode,
        ncesDistrictId: district?.ncesDistrictId || null,
        districtName: district?.districtName || null,
        curriculumStandards: locationResult.curriculum.curriculumStandards,
        // Link to parent
        parentLinks: {
          create: {
            parentId,
            relationship: 'PARENT',
            isPrimary: true,
          },
        },
      },
    });

    return {
      learnerId: learner.id,
      location: input.location,
      district,
      curriculumStandards: locationResult.curriculum.curriculumStandards,
      needsBaseline: true, // New learners need baseline assessment
    };
  }

  /**
   * Get onboarding status for a parent
   */
  async getOnboardingStatus(parentId: string): Promise<OnboardingStatus> {
    // Check if parent has any learners
    const learners = await this.prisma.learner.findMany({
      where: {
        parentLinks: {
          some: { parentId },
        },
      },
      include: {
        baselineAttempts: {
          where: { status: 'COMPLETED' },
          take: 1,
        },
      },
    });

    if (learners.length === 0) {
      return {
        step: 'location',
        baselineComplete: false,
      };
    }

    const learner = learners[0];
    const hasCompletedBaseline = learner.baselineAttempts.length > 0;

    if (!learner.zipCode) {
      return {
        step: 'location',
        learnerId: learner.id,
        baselineComplete: hasCompletedBaseline,
      };
    }

    if (!hasCompletedBaseline) {
      return {
        step: 'baseline',
        learnerId: learner.id,
        location: {
          zipCode: learner.zipCode,
          stateCode: learner.stateCode || undefined,
        },
        curriculumStandards: learner.curriculumStandards,
        baselineComplete: false,
      };
    }

    return {
      step: 'complete',
      learnerId: learner.id,
      location: {
        zipCode: learner.zipCode,
        stateCode: learner.stateCode || undefined,
      },
      district: learner.ncesDistrictId ? {
        ncesDistrictId: learner.ncesDistrictId,
        districtName: learner.districtName || '',
        stateCode: learner.stateCode || '',
        stateName: '',
      } : undefined,
      curriculumStandards: learner.curriculumStandards,
      baselineComplete: true,
    };
  }

  /**
   * Update learner location (and re-detect curriculum)
   */
  async updateLearnerLocation(
    parentId: string,
    learnerId: string,
    location: LocationInput
  ): Promise<{ curriculumStandards: string[]; district?: DistrictInfo }> {
    // Verify parent has access to this learner
    const link = await this.prisma.parentLearnerLink.findUnique({
      where: {
        parentId_learnerId: { parentId, learnerId },
      },
    });

    if (!link) {
      throw new HttpException('Learner not found', HttpStatus.NOT_FOUND);
    }

    // Look up new district and curriculum
    const locationResult = await this.lookupLocation(location);

    // Update learner
    await this.prisma.learner.update({
      where: { id: learnerId },
      data: {
        stateCode: location.stateCode || locationResult.district?.stateCode,
        zipCode: location.zipCode,
        ncesDistrictId: locationResult.district?.ncesDistrictId,
        districtName: locationResult.district?.districtName,
        curriculumStandards: locationResult.curriculum.curriculumStandards,
      },
    });

    // TODO: Call learner-model-svc to update Virtual Brain curriculum
    // This would be done via a message queue or direct API call

    return {
      curriculumStandards: locationResult.curriculum.curriculumStandards,
      district: locationResult.district,
    };
  }
}
