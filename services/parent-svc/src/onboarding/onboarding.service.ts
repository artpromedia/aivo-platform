/**
 * Onboarding Service
 *
 * Handles family/learner onboarding with automatic district detection
 * and curriculum alignment based on ZIP code.
 */

import { logger } from '@aivo/ts-observability';

import { NotFoundException } from '../errors.js';
import type { PrismaService } from '../prisma/prisma.service.js';

import type {
  LocationInput,
  RegisterLearnerInput,
  DistrictInfo,
  CurriculumInfo,
  OnboardingLocationResult,
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

/**
 * Map a learner's grade level (e.g. "K", "1", "6", "10") to the
 * curriculum-template grade bands so we only generate content the
 * learner actually needs.
 */
function gradeToGradeBands(gradeLevel?: string | null): string[] | undefined {
  if (!gradeLevel) return undefined; // no filter — trigger all bands

  const g = gradeLevel.trim().toUpperCase();
  if (['PK', 'PRE-K', 'K', '1', '2'].includes(g)) return ['K_2', 'K_5'];
  if (['3', '4', '5'].includes(g)) return ['THREE_FIVE', 'K_5'];
  if (['6', '7', '8'].includes(g)) return ['SIX_EIGHT'];
  if (['9', '10', '11', '12'].includes(g)) return ['NINE_TWELVE'];
  return undefined; // unknown grade — generate everything
}

export class OnboardingService {
  private readonly tenantServiceUrl: string;
  private readonly notifySvcUrl: string;
  private readonly learnerModelSvcUrl: string;
  private readonly brainEngineUrl: string;
  private readonly curriculumSvcUrl: string;

  constructor(private readonly prisma: PrismaService) {
    this.tenantServiceUrl = process.env.TENANT_SERVICE_URL || 'http://tenant-svc:3000';
    this.notifySvcUrl = process.env.NOTIFY_SERVICE_URL || 'http://notify-svc:4012';
    this.learnerModelSvcUrl =
      process.env.LEARNER_MODEL_SERVICE_URL || 'http://learner-model-svc:4008';
    this.brainEngineUrl = process.env.BRAIN_ENGINE_URL || 'http://brain-engine:8001';
    this.curriculumSvcUrl = process.env.CURRICULUM_SVC_URL || 'http://localhost:4012';
  }

  /**
   * Look up district and curriculum from ZIP code
   * This is called when parent enters their location during onboarding
   */
  async lookupLocation(location: LocationInput): Promise<OnboardingLocationResult> {
    try {
      const response = await fetch(`${this.tenantServiceUrl}/districts/auto-detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location),
      });

      if (!response.ok) {
        // If lookup fails, return default curriculum
        return {
          success: true,
          curriculum: DEFAULT_CURRICULUM,
          message: 'Using default curriculum standards. District lookup unavailable.',
        };
      }

      const data = (await response.json()) as {
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
   * Persist detected curriculum standards to TenantConfig so that
   * downstream services (curriculum-svc, session-svc) can use them
   * to filter curricula by the tenant's geographic standards.
   */
  private async persistCurriculumStandards(
    tenantId: string,
    curriculumStandards: string[],
    location?: LocationInput,
    district?: DistrictInfo
  ): Promise<void> {
    try {
      const body: Record<string, unknown> = {
        curriculum_standards: curriculumStandards,
      };

      // Also persist geographic metadata when available
      if (location?.zipCode) {
        body.custom_settings = {
          ...(location.stateCode && { state_code: location.stateCode }),
          ...(location.zipCode && { zip_code: location.zipCode }),
          ...(district?.ncesDistrictId && { nces_district_id: district.ncesDistrictId }),
          ...(district?.name && { district_name: district.name }),
        };
      }

      const response = await fetch(`${this.tenantServiceUrl}/internal/tenants/${tenantId}/curriculum-standards`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'parent-svc',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(
          { tenantId, status: response.status, error: errorText },
          'Failed to persist curriculum standards to TenantConfig'
        );
      } else {
        logger.info(
          { tenantId, curriculumStandards },
          'Persisted curriculum standards to TenantConfig'
        );
      }
    } catch (error) {
      // Non-critical — log and continue. Curriculum will still work with defaults.
      logger.warn(
        { tenantId, error },
        'Error persisting curriculum standards to TenantConfig'
      );
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

      const data = (await response.json()) as {
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

    // Persist detected curriculum standards to TenantConfig
    // so curriculum-svc can filter curricula by the tenant's geo-based standards
    const tenantId = process.env.CONSUMER_TENANT_ID || 'consumer';
    await this.persistCurriculumStandards(
      tenantId,
      locationResult.curriculum.curriculumStandards,
      input.location,
      locationResult.district
    );

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
          const data = (await response.json()) as { district: DistrictInfo };
          district = data.district;
        }
      } catch (error) {
        console.error('District fetch error:', error);
      }
    }

    // Generate a PIN for the learner
    const learnerPin = this.generateLearnerPin();

    // Hash the PIN for storage
    const crypto = await import('node:crypto');
    const pinHash = crypto.createHash('sha256').update(learnerPin).digest('hex');

    // Create learner profile in parent-svc database
    // Note: The Profile model stores the learner profile.
    // Location info is passed to brain-engine for curriculum alignment.
    const learner = await this.prisma.profile.create({
      data: {
        givenName: input.firstName,
        familyName: input.lastName || '',
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        grade: input.gradeLevel || null,
        pin: learnerPin,
        pinHash,
        baselineStatus: 'not_started',
        status: 'active',
      },
    });

    // Create parent-student link
    await this.prisma.parentStudentLink.create({
      data: {
        parentId,
        studentId: learner.id,
        relationship: 'parent',
        isPrimary: true,
        status: 'active',
        consentStatus: 'pending',
      },
    });

    // Get parent details for notification
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        email: true,
        phone: true,
        givenName: true,
        familyName: true,
      },
    });

    // Send learner app download notification to parent
    if (parent) {
      await this.sendLearnerAppDownloadNotification({
        tenantId: process.env.CONSUMER_TENANT_ID || 'consumer',
        learnerId: learner.id,
        learnerName: input.firstName,
        learnerPin,
        parentId: parent.id,
        parentEmail: parent.email,
        parentPhone: parent.phone || undefined,
        parentName: parent.givenName || 'Parent',
      });
    }

    // Align learner's brain with curriculum based on location
    // This initializes the brain-engine with curriculum-specific knowledge
    await this.alignBrainWithCurriculum(learner.id, input.location, district);

    // Fire-and-forget: trigger AI-generated curriculum for this homeschool learner
    this.triggerHomeschoolCurriculum({
      tenantId,
      stateCode: input.location.stateCode || locationResult.curriculum.stateCode || 'US',
      curriculumStandards: locationResult.curriculum.curriculumStandards,
      gradeLevel: input.gradeLevel,
      triggeredBy: `homeschool:register-learner:${learner.id}`,
    });

    return {
      learnerId: learner.id,
      learnerPin,
      location: input.location,
      district,
      curriculumStandards: locationResult.curriculum.curriculumStandards,
      needsBaseline: true, // New learners need baseline assessment
    };
  }

  /**
   * Generate a 6-digit PIN for learner login
   */
  private generateLearnerPin(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Send notification to parent with learner app download link
   */
  private async sendLearnerAppDownloadNotification(payload: {
    tenantId: string;
    learnerId: string;
    learnerName: string;
    learnerPin: string;
    parentId: string;
    parentEmail: string;
    parentPhone?: string;
    parentName: string;
  }): Promise<void> {
    try {
      const response = await fetch(`${this.notifySvcUrl}/onboarding/learner-added`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        logger.info('Learner app download notification sent successfully');
      } else {
        const errorBody = await response.text();
        logger.error({ error: errorBody }, 'Failed to send learner app notification');
      }
    } catch (error) {
      // Don't fail the registration if notification fails
      logger.error({ error }, 'Error sending learner app notification');
    }
  }

  /**
   * Get onboarding status for a parent
   */
  async getOnboardingStatus(parentId: string): Promise<OnboardingStatus> {
    // Check if parent has any learners via ParentStudentLink
    const parentLinks = await this.prisma.parentStudentLink.findMany({
      where: { parentId, status: 'active' },
      include: {
        student: true,
      },
    });

    if (parentLinks.length === 0) {
      return {
        step: 'location',
        baselineComplete: false,
      };
    }

    const learner = parentLinks[0].student;
    const hasCompletedBaseline = learner.baselineStatus === 'completed';

    if (!hasCompletedBaseline) {
      return {
        step: 'baseline',
        learnerId: learner.id,
        baselineComplete: false,
      };
    }

    return {
      step: 'complete',
      learnerId: learner.id,
      baselineComplete: true,
    };
  }

  /**
   * Update learner location (and re-detect curriculum)
   * Note: Location data is passed to brain-engine for curriculum alignment,
   * but not stored on the Profile model directly.
   */
  async updateLearnerLocation(
    parentId: string,
    learnerId: string,
    location: LocationInput
  ): Promise<{ curriculumStandards: string[]; district?: DistrictInfo }> {
    // Verify parent has access to this learner via ParentStudentLink
    const link = await this.prisma.parentStudentLink.findFirst({
      where: {
        parentId,
        studentId: learnerId,
        status: 'active',
      },
    });

    if (!link) {
      throw new NotFoundException('Learner not found');
    }

    // Look up new district and curriculum
    const locationResult = await this.lookupLocation(location);

    // Persist updated curriculum standards to TenantConfig
    const tenantId = process.env.CONSUMER_TENANT_ID || 'consumer';
    await this.persistCurriculumStandards(
      tenantId,
      locationResult.curriculum.curriculumStandards,
      location,
      locationResult.district
    );

    // Note: Location fields are not stored on Profile model.
    // They are passed to brain-engine for curriculum alignment.

    // Call learner-model-svc to update Virtual Brain curriculum alignment
    await this.updateLearnerModelCurriculum(
      learnerId,
      locationResult.curriculum.curriculumStandards,
      location.stateCode || locationResult.district?.stateCode
    );

    // Call brain-engine to align the learner's brain with curriculum
    await this.alignBrainWithCurriculum(learnerId, location, locationResult.district);

    // Fire-and-forget: re-trigger AI-generated curriculum for new location
    this.triggerHomeschoolCurriculum({
      tenantId,
      stateCode: location.stateCode || locationResult.curriculum.stateCode || 'US',
      curriculumStandards: locationResult.curriculum.curriculumStandards,
      gradeLevel: undefined, // grade unknown on location-only update
      triggeredBy: `homeschool:update-location:${learnerId}`,
    });

    return {
      curriculumStandards: locationResult.curriculum.curriculumStandards,
      district: locationResult.district,
    };
  }

  /**
   * Update the learner's Virtual Brain curriculum alignment in learner-model-svc
   * This ensures the adaptive learning model uses the correct curriculum standards
   */
  private async updateLearnerModelCurriculum(
    learnerId: string,
    curriculumStandards: string[],
    stateCode?: string | null
  ): Promise<void> {
    try {
      const response = await fetch(`${this.learnerModelSvcUrl}/learners/${learnerId}/curriculum`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'parent-svc',
        },
        body: JSON.stringify({
          curriculumStandards,
          stateCode: stateCode || undefined,
          updatedAt: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        logger.info(
          {
            learnerId,
            curriculumStandards,
          },
          'Learner model curriculum updated successfully'
        );
      } else {
        const errorBody = await response.text();
        logger.warn(
          {
            learnerId,
            status: response.status,
            error: errorBody,
          },
          'Failed to update learner model curriculum'
        );
        // Don't throw - this is a non-critical operation that shouldn't block the main flow
      }
    } catch (error) {
      // Log but don't throw - curriculum sync can be retried later
      logger.error(
        {
          learnerId,
          error,
        },
        'Error calling learner-model-svc to update curriculum'
      );
    }
  }

  /**
   * Align the learner's brain with curriculum in brain-engine
   * This is called when a learner's location is set or updated to ensure
   * the brain's knowledge graph and training use the correct curriculum standards.
   */
  private async alignBrainWithCurriculum(
    learnerId: string,
    location: LocationInput,
    district?: DistrictInfo
  ): Promise<void> {
    try {
      const response = await fetch(`${this.brainEngineUrl}/brain/${learnerId}/curriculum`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Name': 'parent-svc',
        },
        body: JSON.stringify({
          state_code: location.stateCode || district?.stateCode,
          zip_code: location.zipCode,
          district_id: district?.ncesDistrictId,
          district_name: district?.districtName,
        }),
      });

      if (response.ok) {
        logger.info(
          {
            learnerId,
            stateCode: location.stateCode || district?.stateCode,
            districtId: district?.ncesDistrictId,
          },
          'Brain curriculum alignment successful'
        );
      } else {
        const errorBody = await response.text();
        logger.warn(
          {
            learnerId,
            status: response.status,
            error: errorBody,
          },
          'Failed to align brain with curriculum'
        );
        // Don't throw - brain alignment can be retried later
      }
    } catch (error) {
      // Log but don't throw - brain alignment is async and non-blocking
      logger.error(
        {
          learnerId,
          error,
        },
        'Error calling brain-engine to align curriculum'
      );
    }
  }

  /**
   * Trigger AI-generated curriculum content for a homeschool/consumer learner.
   *
   * Fetches available curriculum templates from curriculum-svc, optionally
   * filtered by the learner's grade band, then POSTs a generation trigger
   * for each matching template.
   *
   * This is fire-and-forget — failures are logged but never block the
   * registration or location-update flows.
   */
  private triggerHomeschoolCurriculum(opts: {
    tenantId: string;
    stateCode: string;
    curriculumStandards: string[];
    gradeLevel?: string | null;
    triggeredBy: string;
  }): void {
    const { tenantId, stateCode, curriculumStandards, gradeLevel, triggeredBy } = opts;

    // Run entirely in the background so the parent doesn't wait
    void (async () => {
      try {
        logger.info(
          { tenantId, stateCode, curriculumStandards, gradeLevel },
          '[HomeschoolCurriculum] Starting curriculum generation for homeschool learner',
        );

        // 1. Fetch available templates
        const res = await fetch(`${this.curriculumSvcUrl}/generation/templates`);
        if (!res.ok) {
          logger.error(
            { status: res.status },
            '[HomeschoolCurriculum] Failed to fetch templates from curriculum-svc',
          );
          return;
        }

        const body = (await res.json()) as {
          templates: { id: string; name: string; subject: string; gradeBand: string }[];
        };
        let templates = body.templates ?? [];

        if (templates.length === 0) {
          logger.warn('[HomeschoolCurriculum] No curriculum templates found — skipping');
          return;
        }

        // 2. Filter by grade band if we can map the learner's grade
        const bands = gradeToGradeBands(gradeLevel);
        if (bands) {
          templates = templates.filter((t) => bands.includes(t.gradeBand));
          logger.info(
            { bands, matched: templates.length },
            '[HomeschoolCurriculum] Filtered templates by grade band',
          );
        }

        if (templates.length === 0) {
          logger.warn(
            { gradeLevel, bands },
            '[HomeschoolCurriculum] No templates matched grade band — skipping',
          );
          return;
        }

        // 3. Trigger generation for each template
        let triggered = 0;
        let skipped = 0;
        let failed = 0;

        for (const tpl of templates) {
          try {
            const trigRes = await fetch(`${this.curriculumSvcUrl}/generation/trigger`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-tenant-id': tenantId,
              },
              body: JSON.stringify({
                templateId: tpl.id,
                targetStandards: curriculumStandards,
                stateCode,
                triggeredBy,
              }),
            });

            if (trigRes.status === 201) {
              triggered++;
            } else if (trigRes.status === 409) {
              skipped++; // already generated — idempotency guard
            } else {
              failed++;
              const text = await trigRes.text().catch(() => 'unknown');
              logger.warn(
                { templateId: tpl.id, status: trigRes.status, body: text.slice(0, 200) },
                '[HomeschoolCurriculum] Template trigger failed',
              );
            }
          } catch (err) {
            failed++;
            logger.warn(
              { templateId: tpl.id, err },
              '[HomeschoolCurriculum] Template trigger error',
            );
          }
        }

        logger.info(
          { tenantId, triggered, skipped, failed, total: templates.length },
          '[HomeschoolCurriculum] Generation trigger complete',
        );
      } catch (err) {
        logger.error(
          { err },
          '[HomeschoolCurriculum] Unexpected error during curriculum generation trigger',
        );
      }
    })();
  }
}
