/**
 * Functioning Profile Routes
 *
 * API endpoints for managing learner functioning profiles and sensory profiles
 * for accessibility support.
 *
 * @author AIVO Platform Team
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { prisma, Prisma, AssessmentMode } from '../prisma.js';
import type { TenantContext } from '../types/index.js';

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const FunctioningLevelEnum = z.enum(['TYPICAL', 'MILD', 'MODERATE', 'SEVERE', 'PROFOUND']);
const SensoryImpairmentTypeEnum = z.enum([
  'NONE',
  'BLIND',
  'LOW_VISION',
  'DEAF',
  'HARD_OF_HEARING',
  'DEAFBLIND',
]);
const InputMethodEnum = z.enum([
  'STANDARD',
  'LARGE_TOUCH',
  'SWITCH_SINGLE',
  'SWITCH_DUAL',
  'EYE_GAZE',
  'VOICE_CONTROL',
  'PARTNER_ASSISTED',
  'HEAD_TRACKING',
]);
const CommunicationModalityEnum = z.enum([
  'VERBAL',
  'WRITTEN',
  'SIGN_LANGUAGE',
  'PICTURE_SYMBOLS',
  'AAC_DEVICE',
  'GESTURES',
  'COMBINATION',
]);
const AACSystemTypeEnum = z.enum([
  'NONE',
  'PECS',
  'PROLOQUO2GO',
  'LAMP',
  'TOUCHCHAT',
  'SNAP_CORE',
  'BOARDMAKER',
  'CUSTOM',
]);

const CreateFunctioningProfileSchema = z.object({
  functioningLevel: FunctioningLevelEnum,
  cognitiveIndicators: z
    .object({
      followsSimpleInstructions: z.boolean().optional(),
      recognizesSymbols: z.boolean().optional(),
      respondsToName: z.boolean().optional(),
      maintainsAttention: z.string().optional(),
      problemSolving: z.string().optional(),
    })
    .optional(),
  dailyLivingSkills: z
    .object({
      selfCare: z.string().optional(),
      mobility: z.string().optional(),
      communication: z.string().optional(),
      socialSkills: z.string().optional(),
    })
    .optional(),
  supportNeeds: z
    .object({
      requiresConstantSupervision: z.boolean().optional(),
      requiresPhysicalAssistance: z.boolean().optional(),
      requiresPrompting: z.string().optional(),
      breakFrequency: z.string().optional(),
    })
    .optional(),
  assessmentNotes: z.string().optional(),
  determinedBy: z.enum(['PARENT_ASSESSMENT', 'IEP_IMPORT', 'CLINICAL_EVALUATION', 'MANUAL_ENTRY']),
});

const UpdateFunctioningProfileSchema = CreateFunctioningProfileSchema.partial();

const CreateSensoryProfileSchema = z.object({
  sensoryImpairmentType: SensoryImpairmentTypeEnum,
  visionProfile: z
    .object({
      hasUsableVision: z.boolean().optional(),
      usesScreenMagnification: z.boolean().optional(),
      magnificationLevel: z.number().optional(),
      usesScreenReader: z.boolean().optional(),
      screenReaderType: z.string().optional(),
      preferredFontSize: z.number().optional(),
      requiresHighContrast: z.boolean().optional(),
      lightSensitivity: z.string().optional(),
    })
    .optional(),
  hearingProfile: z
    .object({
      hasUsableHearing: z.boolean().optional(),
      usesHearingAid: z.boolean().optional(),
      hearingAidType: z.string().optional(),
      usesCochlearImplant: z.boolean().optional(),
      preferredVolume: z.number().optional(),
      requiresCaptions: z.boolean().optional(),
      captionStyle: z.string().optional(),
      usesSignLanguage: z.boolean().optional(),
      signLanguageType: z.string().optional(),
    })
    .optional(),
  aacSettings: z
    .object({
      usesAAC: z.boolean().optional(),
      aacSystemType: AACSystemTypeEnum.optional(),
      symbolSet: z.string().optional(),
      gridSize: z.string().optional(),
      voiceOutput: z.boolean().optional(),
    })
    .optional(),
  inputMethods: z.array(InputMethodEnum),
  preferredInputMethod: InputMethodEnum,
  communicationModality: CommunicationModalityEnum,
});

const UpdateSensoryProfileSchema = CreateSensoryProfileSchema.partial();

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface LearnerParams {
  learnerId: string;
}

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

function extractTenantContext(request: FastifyRequest): TenantContext {
  const tenantId = request.headers['x-tenant-id'] as string | undefined;
  const userId = request.headers['x-user-id'] as string | undefined;
  const userRole = request.headers['x-user-role'] as string | undefined;

  if (!tenantId || !userId || !userRole) {
    throw new Error('Missing tenant context');
  }

  return {
    tenantId,
    userId,
    userRole: userRole as TenantContext['userRole'],
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerFunctioningProfileRoutes(app: FastifyInstance): Promise<void> {
  // ────────────────────────────────────────────────────────────────────────────
  // FUNCTIONING PROFILE ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  // GET /learners/:learnerId/functioning-profile
  app.get<{ Params: LearnerParams }>(
    '/learners/:learnerId/functioning-profile',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      try {
        const profile = await prisma.learnerFunctioningProfile.findUnique({
          where: {
            tenantId_learnerId: {
              tenantId: context.tenantId,
              learnerId,
            },
          },
        });

        if (!profile) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Functioning profile not found',
          });
        }

        return reply.status(200).send({ profile });
      } catch (error) {
        console.error('[functioning-profile-routes] get_functioning_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get functioning profile',
        });
      }
    }
  );

  // POST /learners/:learnerId/functioning-profile
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/functioning-profile',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const parseResult = CreateFunctioningProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      try {
        const cognitiveIndicatorsJson = parseResult.data.cognitiveIndicators
          ? toJsonValue(parseResult.data.cognitiveIndicators)
          : undefined;
        const dailyLivingSkillsJson = parseResult.data.dailyLivingSkills
          ? toJsonValue(parseResult.data.dailyLivingSkills)
          : undefined;
        const supportNeedsJson = parseResult.data.supportNeeds
          ? toJsonValue(parseResult.data.supportNeeds)
          : undefined;

        const profile = await prisma.learnerFunctioningProfile.upsert({
          where: {
            tenantId_learnerId: {
              tenantId: context.tenantId,
              learnerId,
            },
          },
          create: {
            id: crypto.randomUUID(),
            learnerId,
            tenantId: context.tenantId,
            functioningLevel: parseResult.data.functioningLevel,
            cognitiveIndicatorsJson,
            dailyLivingSkillsJson,
            supportNeedsJson,
            professionalNotes: parseResult.data.assessmentNotes ?? undefined,
            createdByUserId: context.userId,
          },
          update: {
            functioningLevel: parseResult.data.functioningLevel,
            cognitiveIndicatorsJson,
            dailyLivingSkillsJson,
            supportNeedsJson,
            professionalNotes: parseResult.data.assessmentNotes ?? undefined,
            updatedByUserId: context.userId,
          },
        });

        console.log('[functioning-profile-routes] functioning_profile_created', {
          learnerId,
          profileId: profile.id,
          functioningLevel: profile.functioningLevel,
          determinedBy: parseResult.data.determinedBy,
        });

        return reply.status(201).send({ profile });
      } catch (error) {
        console.error('[functioning-profile-routes] create_functioning_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to create functioning profile',
        });
      }
    }
  );

  // PATCH /learners/:learnerId/functioning-profile
  app.patch<{ Params: LearnerParams }>(
    '/learners/:learnerId/functioning-profile',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const parseResult = UpdateFunctioningProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      try {
        const cognitiveIndicatorsJson = parseResult.data.cognitiveIndicators
          ? toJsonValue(parseResult.data.cognitiveIndicators)
          : undefined;
        const dailyLivingSkillsJson = parseResult.data.dailyLivingSkills
          ? toJsonValue(parseResult.data.dailyLivingSkills)
          : undefined;
        const supportNeedsJson = parseResult.data.supportNeeds
          ? toJsonValue(parseResult.data.supportNeeds)
          : undefined;

        const profile = await prisma.learnerFunctioningProfile.update({
          where: {
            tenantId_learnerId: {
              learnerId,
              tenantId: context.tenantId,
            },
          },
          data: {
            functioningLevel: parseResult.data.functioningLevel ?? undefined,
            cognitiveIndicatorsJson,
            dailyLivingSkillsJson,
            supportNeedsJson,
            professionalNotes: parseResult.data.assessmentNotes ?? undefined,
            updatedByUserId: context.userId,
          },
        });

        console.log('[functioning-profile-routes] functioning_profile_updated', {
          learnerId,
          profileId: profile.id,
        });

        return reply.status(200).send({ profile });
      } catch (error) {
        console.error('[functioning-profile-routes] update_functioning_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to update functioning profile',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // SENSORY PROFILE ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  // GET /learners/:learnerId/sensory-profile
  app.get<{ Params: LearnerParams }>(
    '/learners/:learnerId/sensory-profile',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      try {
        const profile = await prisma.learnerSensoryProfile.findUnique({
          where: {
            tenantId_learnerId: {
              learnerId,
              tenantId: context.tenantId,
            },
          },
        });

        if (!profile) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'Sensory profile not found',
          });
        }

        return reply.status(200).send({ profile });
      } catch (error) {
        console.error('[functioning-profile-routes] get_sensory_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get sensory profile',
        });
      }
    }
  );

  // POST /learners/:learnerId/sensory-profile
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/sensory-profile',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const parseResult = CreateSensoryProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      try {
        const alternativeInputMethod = parseResult.data.inputMethods.find(
          (method) => method !== parseResult.data.preferredInputMethod
        );

        const profile = await prisma.learnerSensoryProfile.upsert({
          where: {
            tenantId_learnerId: {
              learnerId,
              tenantId: context.tenantId,
            },
          },
          create: {
            id: crypto.randomUUID(),
            learnerId,
            tenantId: context.tenantId,
            sensoryImpairmentType: parseResult.data.sensoryImpairmentType,
            visionProfileJson: parseResult.data.visionProfile
              ? toJsonValue(parseResult.data.visionProfile)
              : undefined,
            hearingProfileJson: parseResult.data.hearingProfile
              ? toJsonValue(parseResult.data.hearingProfile)
              : undefined,
            primaryCommunication: parseResult.data.communicationModality,
            aacSystemType: parseResult.data.aacSettings?.aacSystemType ?? undefined,
            aacSettingsJson: parseResult.data.aacSettings
              ? toJsonValue(parseResult.data.aacSettings)
              : undefined,
            preferredInputMethod: parseResult.data.preferredInputMethod,
            alternativeInputMethod,
            createdByUserId: context.userId,
          },
          update: {
            sensoryImpairmentType: parseResult.data.sensoryImpairmentType,
            visionProfileJson: parseResult.data.visionProfile
              ? toJsonValue(parseResult.data.visionProfile)
              : undefined,
            hearingProfileJson: parseResult.data.hearingProfile
              ? toJsonValue(parseResult.data.hearingProfile)
              : undefined,
            primaryCommunication: parseResult.data.communicationModality,
            aacSystemType: parseResult.data.aacSettings?.aacSystemType ?? undefined,
            aacSettingsJson: parseResult.data.aacSettings
              ? toJsonValue(parseResult.data.aacSettings)
              : undefined,
            preferredInputMethod: parseResult.data.preferredInputMethod,
            alternativeInputMethod,
            updatedByUserId: context.userId,
          },
        });

        console.log('[functioning-profile-routes] sensory_profile_created', {
          learnerId,
          profileId: profile.id,
          sensoryImpairmentType: profile.sensoryImpairmentType,
        });

        return reply.status(201).send({ profile });
      } catch (error) {
        console.error('[functioning-profile-routes] create_sensory_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to create sensory profile',
        });
      }
    }
  );

  // PATCH /learners/:learnerId/sensory-profile
  app.patch<{ Params: LearnerParams }>(
    '/learners/:learnerId/sensory-profile',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const parseResult = UpdateSensoryProfileSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      try {
        const alternativeInputMethod = parseResult.data.inputMethods?.find(
          (method) => method !== parseResult.data.preferredInputMethod
        );

        const profile = await prisma.learnerSensoryProfile.update({
          where: {
            tenantId_learnerId: {
              learnerId,
              tenantId: context.tenantId,
            },
          },
          data: {
            sensoryImpairmentType: parseResult.data.sensoryImpairmentType ?? undefined,
            visionProfileJson: parseResult.data.visionProfile
              ? toJsonValue(parseResult.data.visionProfile)
              : undefined,
            hearingProfileJson: parseResult.data.hearingProfile
              ? toJsonValue(parseResult.data.hearingProfile)
              : undefined,
            primaryCommunication: parseResult.data.communicationModality ?? undefined,
            aacSystemType: parseResult.data.aacSettings?.aacSystemType ?? undefined,
            aacSettingsJson: parseResult.data.aacSettings
              ? toJsonValue(parseResult.data.aacSettings)
              : undefined,
            preferredInputMethod: parseResult.data.preferredInputMethod ?? undefined,
            alternativeInputMethod,
            updatedByUserId: context.userId,
          },
        });

        console.log('[functioning-profile-routes] sensory_profile_updated', {
          learnerId,
          profileId: profile.id,
        });

        return reply.status(200).send({ profile });
      } catch (error) {
        console.error('[functioning-profile-routes] update_sensory_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to update sensory profile',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // ASSESSMENT MODE DECISION ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  // GET /learners/:learnerId/assessment-mode
  // Get the current assessment mode decision for a learner
  app.get<{ Params: LearnerParams }>(
    '/learners/:learnerId/assessment-mode',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      try {
        const decision = await prisma.assessmentModeDecision.findFirst({
          where: {
            learnerId,
            tenantId: context.tenantId,
          },
          orderBy: {
            decidedAt: 'desc',
          },
        });

        if (!decision) {
          return reply.status(404).send({
            error: 'Not Found',
            message: 'No assessment mode decision found',
          });
        }

        return reply.status(200).send({ decision });
      } catch (error) {
        console.error('[functioning-profile-routes] get_assessment_mode_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get assessment mode',
        });
      }
    }
  );

  // POST /learners/:learnerId/assessment-mode
  // Record an assessment mode decision
  app.post<{ Params: LearnerParams }>(
    '/learners/:learnerId/assessment-mode',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      const schema = z.object({
        mode: z.enum(['STANDARD', 'MODIFIED', 'SUPPORTED', 'OBSERVATIONAL', 'SENSORY_ADAPTED']),
        functioningLevel: FunctioningLevelEnum,
        sensoryImpairment: SensoryImpairmentTypeEnum.optional(),
        inputMethod: InputMethodEnum.optional(),
        accommodations: z.array(
          z.object({
            type: z.string(),
            value: z.unknown(),
            reason: z.string(),
          })
        ),
        flags: z
          .array(
            z.object({
              flag: z.string(),
              severity: z.enum(['info', 'warning', 'critical']),
              recommendation: z.string(),
            })
          )
          .optional(),
        reasoning: z.string(),
        confidence: z.number().min(0).max(1),
        source: z.enum(['PARENT_ASSESSMENT', 'IEP_IMPORT', 'MANUAL_OVERRIDE', 'SYSTEM_DETECTION']),
      });

      const parseResult = schema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      try {
        const decision = await prisma.assessmentModeDecision.create({
          data: {
            id: crypto.randomUUID(),
            learnerId,
            tenantId: context.tenantId,
            inputFactorsJson: toJsonValue({
              functioningLevel: parseResult.data.functioningLevel,
              sensoryImpairment: parseResult.data.sensoryImpairment,
              inputMethod: parseResult.data.inputMethod,
              accommodations: parseResult.data.accommodations,
              flags: parseResult.data.flags,
              reasoning: parseResult.data.reasoning,
              source: parseResult.data.source,
            }),
            algorithmRecommendation: parseResult.data.mode as AssessmentMode,
            recommendationConfidence: parseResult.data.confidence,
            reasoningExplanation: parseResult.data.reasoning,
            finalSelectedMode: parseResult.data.mode as AssessmentMode,
            decidedAt: new Date(),
          },
        });

        console.log('[functioning-profile-routes] assessment_mode_decision_recorded', {
          learnerId,
          decisionId: decision.id,
          mode: decision.finalSelectedMode,
          source: parseResult.data.source,
        });

        return reply.status(201).send({ decision });
      } catch (error) {
        console.error('[functioning-profile-routes] record_assessment_mode_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to record assessment mode decision',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // COMBINED ACCESSIBILITY PROFILE
  // ────────────────────────────────────────────────────────────────────────────

  // GET /learners/:learnerId/accessibility
  // Get complete accessibility profile (functioning + sensory + assessment mode)
  app.get<{ Params: LearnerParams }>(
    '/learners/:learnerId/accessibility',
    async (request, reply: FastifyReply) => {
      const context = extractTenantContext(request);
      const { learnerId } = request.params;

      try {
        const [functioningProfile, sensoryProfile, assessmentModeDecision] = await Promise.all([
          prisma.learnerFunctioningProfile.findUnique({
            where: {
              tenantId_learnerId: {
                learnerId,
                tenantId: context.tenantId,
              },
            },
          }),
          prisma.learnerSensoryProfile.findUnique({
            where: {
              tenantId_learnerId: {
                learnerId,
                tenantId: context.tenantId,
              },
            },
          }),
          prisma.assessmentModeDecision.findFirst({
            where: {
              learnerId,
              tenantId: context.tenantId,
            },
            orderBy: {
              decidedAt: 'desc',
            },
          }),
        ]);

        return reply.status(200).send({
          learnerId,
          functioningProfile,
          sensoryProfile,
          assessmentModeDecision,
          hasAccessibilityNeeds:
            functioningProfile?.functioningLevel !== 'TYPICAL' ||
            sensoryProfile?.sensoryImpairmentType !== 'NONE',
        });
      } catch (error) {
        console.error('[functioning-profile-routes] get_accessibility_profile_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get accessibility profile',
        });
      }
    }
  );

  // ────────────────────────────────────────────────────────────────────────────
  // INTERNAL SERVICE-TO-SERVICE ROUTES
  // ────────────────────────────────────────────────────────────────────────────

  // POST /internal/learner-functioning-profile
  // Called by baseline-svc to sync parent assessment results
  app.post(
    '/internal/learner-functioning-profile',
    async (request: FastifyRequest, reply: FastifyReply) => {
      // Verify internal service call
      const internalService = request.headers['x-internal-service'] as string | undefined;
      if (!internalService) {
        return reply.status(403).send({ error: 'Internal service header required' });
      }

      const schema = z.object({
        tenantId: z.string().uuid(),
        learnerId: z.string().uuid(),
        assessmentType: z.enum([
          'STANDARD',
          'STANDARD_WITH_ACCOMMODATIONS',
          'MODIFIED',
          'ALTERNATE',
        ]),
        parentAssessmentScore: z.number().min(0).max(100).optional(),
        hasIepDocumentation: z.boolean().optional(),
        createdByUserId: z.string(),
      });

      const parseResult = schema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Invalid request body',
          details: parseResult.error.flatten(),
        });
      }

      const data = parseResult.data;

      try {
        // Map AssessmentType from baseline-svc to profile-svc enum
        // Also set legacy AssessmentMode for backward compatibility
        const legacyModeMap: Record<
          string,
          'STANDARD' | 'MODIFIED' | 'SUPPORTED' | 'OBSERVATIONAL'
        > = {
          STANDARD: 'STANDARD',
          STANDARD_WITH_ACCOMMODATIONS: 'STANDARD',
          MODIFIED: 'MODIFIED',
          ALTERNATE: 'SUPPORTED',
        };

        // Map to FunctioningLevel based on assessment type
        const functioningLevelMap: Record<string, 'TYPICAL' | 'MILD' | 'MODERATE' | 'SEVERE'> = {
          STANDARD: 'TYPICAL',
          STANDARD_WITH_ACCOMMODATIONS: 'MILD',
          ALTERNATE: 'SEVERE',
        };

        const profile = await prisma.learnerFunctioningProfile.upsert({
          where: {
            tenantId_learnerId: {
              tenantId: data.tenantId,
              learnerId: data.learnerId,
            },
          },
          create: {
            tenantId: data.tenantId,
            learnerId: data.learnerId,
            functioningLevel: functioningLevelMap[data.assessmentType],
            assessmentType: data.assessmentType,
            assessmentTypeConfirmed: true,
            recommendedAssessmentMode: legacyModeMap[data.assessmentType],
            assessmentModeConfirmed: true,
            parentAssessmentScore: data.parentAssessmentScore,
            hasIepDocumentation: data.hasIepDocumentation || false,
            createdByUserId: data.createdByUserId,
            updatedByUserId: data.createdByUserId,
          },
          update: {
            functioningLevel: functioningLevelMap[data.assessmentType],
            assessmentType: data.assessmentType,
            assessmentTypeConfirmed: true,
            recommendedAssessmentMode: legacyModeMap[data.assessmentType],
            assessmentModeConfirmed: true,
            parentAssessmentScore: data.parentAssessmentScore,
            hasIepDocumentation: data.hasIepDocumentation || false,
            updatedByUserId: data.createdByUserId,
          },
        });

        console.log('[internal/learner-functioning-profile] Profile synced', {
          learnerId: data.learnerId,
          assessmentType: data.assessmentType,
          profileId: profile.id,
        });

        return reply.status(200).send({
          success: true,
          profileId: profile.id,
          assessmentType: profile.assessmentType,
        });
      } catch (error) {
        console.error('[internal/learner-functioning-profile] Failed to sync profile', {
          learnerId: data.learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to sync functioning profile',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  // GET /internal/learner-functioning-profile/:learnerId
  // Called by web-learner to fetch assessment type for baseline assessment
  app.get<{ Params: { learnerId: string }; Querystring: { tenantId?: string } }>(
    '/internal/learner-functioning-profile/:learnerId',
    async (request, reply: FastifyReply) => {
      const { learnerId } = request.params;
      const tenantId = request.query.tenantId || (request.headers['x-tenant-id'] as string);

      if (!tenantId) {
        return reply.status(400).send({ error: 'tenantId is required' });
      }

      try {
        const profile = await prisma.learnerFunctioningProfile.findUnique({
          where: {
            tenantId_learnerId: {
              tenantId,
              learnerId,
            },
          },
        });

        if (!profile) {
          return reply.status(404).send({ error: 'Functioning profile not found' });
        }

        return reply.status(200).send({
          learnerId,
          tenantId,
          assessmentType: profile.assessmentType,
          selectedAssessmentType: profile.selectedAssessmentType,
          assessmentTypeConfirmed: profile.assessmentTypeConfirmed,
          functioningLevel: profile.functioningLevel,
          parentAssessmentScore: profile.parentAssessmentScore,
          hasIepDocumentation: profile.hasIepDocumentation,
          // Legacy fields
          recommendedAssessmentMode: profile.recommendedAssessmentMode,
          selectedAssessmentMode: profile.selectedAssessmentMode,
        });
      } catch (error) {
        console.error('[internal/learner-functioning-profile] Failed to get profile', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get functioning profile',
        });
      }
    }
  );
}
