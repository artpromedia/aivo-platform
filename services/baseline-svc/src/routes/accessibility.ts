/**
 * Accessibility Routes
 *
 * API endpoints for accessibility features including:
 * - Assessment mode determination
 * - Low-functioning assessment management
 * - Sensory accessibility configuration
 * - Alternative input configuration
 *
 * @author AIVO Platform Team
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import { alternativeInputService, type InputMethod } from '../lib/alternativeInput.js';
import { determineAssessmentMode, type ParentResponses } from '../lib/assessmentModeRouter.js';
import {
  LowFunctioningAssessmentService,
  type FunctionalDomain,
} from '../lib/lowFunctioningAssessment.js';
import {
  sensoryAccessibilityService,
  type SensoryImpairmentType,
  type BrailleGrade,
} from '../lib/sensoryAccessibility.js';

// ══════════════════════════════════════════════════════════════════════════════
// ZOD SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const DetermineAssessmentModeSchema = z.object({
  learnerId: z.string().uuid(),
  responses: z.record(z.unknown()),
});

const StartLowFunctioningAssessmentSchema = z.object({
  learnerId: z.string().uuid(),
  accommodations: z
    .array(
      z.object({
        type: z.string(),
        description: z.string(),
        settings: z.record(z.unknown()),
      })
    )
    .optional(),
  domains: z.array(z.string()).optional(),
});

const RecordObservationalItemSchema = z.object({
  learnerId: z.string().uuid(),
  assessmentId: z.string().uuid(),
  itemId: z.string(),
  observedBehavior: z.enum([
    'NOT_OBSERVED',
    'EMERGING',
    'WITH_FULL_SUPPORT',
    'WITH_PARTIAL_SUPPORT',
    'INDEPENDENT',
  ]),
  partnerNotes: z.string().optional(),
  promptingLevel: z
    .enum(['none', 'verbal', 'gestural', 'physical_partial', 'physical_full'])
    .optional(),
});

const GetSensoryConfigSchema = z.object({
  sensoryType: z.enum(['NONE', 'BLIND', 'LOW_VISION', 'DEAF', 'HARD_OF_HEARING', 'DEAFBLIND']),
  options: z
    .object({
      signLanguageType: z.enum(['ASL', 'BSL', 'Auslan', 'LSF', 'DGS', 'JSL', 'other']).optional(),
      screenReaderType: z
        .enum(['NVDA', 'JAWS', 'VoiceOver', 'TalkBack', 'Narrator', 'Orca', 'other'])
        .optional(),
      brailleGrade: z.union([z.literal(1), z.literal(2)]).optional(),
      captionStyle: z.enum(['standard', 'simplified', 'detailed', 'verbatim']).optional(),
    })
    .optional(),
});

const TransformContentSchema = z.object({
  content: z.object({
    id: z.string(),
    type: z.enum(['text', 'image', 'audio', 'video', 'interactive', 'question']),
    content: z.string(),
    metadata: z.record(z.unknown()).optional(),
  }),
  sensoryType: z.enum(['NONE', 'BLIND', 'LOW_VISION', 'DEAF', 'HARD_OF_HEARING', 'DEAFBLIND']),
});

const GetInputConfigSchema = z.object({
  inputMethod: z.enum([
    'STANDARD',
    'LARGE_TOUCH',
    'SWITCH_SINGLE',
    'SWITCH_DUAL',
    'EYE_GAZE',
    'VOICE_CONTROL',
    'PARTNER_ASSISTED',
    'HEAD_TRACKING',
  ]),
  options: z.record(z.unknown()).optional(),
});

const GetLayoutConfigSchema = z.object({
  inputMethod: z.enum([
    'STANDARD',
    'LARGE_TOUCH',
    'SWITCH_SINGLE',
    'SWITCH_DUAL',
    'EYE_GAZE',
    'VOICE_CONTROL',
    'PARTNER_ASSISTED',
    'HEAD_TRACKING',
  ]),
  itemCount: z.number().min(1).max(20),
});

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

interface JwtUser {
  sub: string;
  tenantId?: string;
  tenant_id?: string;
  role: string;
}

function getUserFromRequest(
  request: FastifyRequest
): { sub: string; tenantId: string; role: string } | null {
  const user = (request as unknown as { user?: JwtUser }).user;
  if (!user) return null;
  return {
    sub: user.sub,
    tenantId: user.tenantId ?? user.tenant_id ?? '',
    role: user.role,
  };
}

const VALID_DOMAINS = new Set<FunctionalDomain>([
  'RECEPTIVE_COMMUNICATION',
  'EXPRESSIVE_COMMUNICATION',
  'VISUAL_DISCRIMINATION',
  'CHOICE_MAKING',
  'CAUSE_EFFECT',
  'ATTENTION_ENGAGEMENT',
  'BASIC_CONCEPTS',
  'DAILY_LIVING',
]);

function isValidDomain(domain: string): domain is FunctionalDomain {
  return VALID_DOMAINS.has(domain as FunctionalDomain);
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════════

export async function registerAccessibilityRoutes(app: FastifyInstance): Promise<void> {
  const lowFunctioningService = new LowFunctioningAssessmentService();

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/determine-assessment-mode
  // Analyze parent assessment responses and determine appropriate assessment mode
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/accessibility/determine-assessment-mode',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = DetermineAssessmentModeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      const { learnerId, responses } = parseResult.data;

      try {
        const decision = determineAssessmentMode(responses as ParentResponses);

        console.log('[accessibility-routes] assessment_mode_determined', {
          learnerId,
          recommendedMode: decision.recommendedMode,
          functioningLevel: decision.functioningLevel,
          confidence: decision.confidence,
          userId: user.sub,
        });

        return reply.status(200).send({
          decision,
          learnerId,
        });
      } catch (error) {
        console.error('[accessibility-routes] assessment_mode_determination_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to determine assessment mode',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/low-functioning/start
  // Start a low-functioning assessment session
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/accessibility/low-functioning/start',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = StartLowFunctioningAssessmentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      const { learnerId, accommodations, domains } = parseResult.data;

      try {
        const config = lowFunctioningService.createAssessmentConfig(
          'OBSERVATIONAL',
          accommodations ?? []
        );

        // Generate questions for requested domains or all domains
        const selectedDomains: FunctionalDomain[] = (
          domains ?? [
            'RECEPTIVE_COMMUNICATION',
            'VISUAL_DISCRIMINATION',
            'CHOICE_MAKING',
            'CAUSE_EFFECT',
            'ATTENTION_ENGAGEMENT',
          ]
        ).filter(isValidDomain);

        const questions = selectedDomains.flatMap((domain) =>
          lowFunctioningService.generateDomainQuestions(domain, config)
        );

        const observationalItems = selectedDomains.flatMap((domain) =>
          lowFunctioningService.generateObservationalItems(domain)
        );

        console.log('[accessibility-routes] low_functioning_assessment_started', {
          learnerId,
          domainCount: selectedDomains.length,
          questionCount: questions.length,
          observationalItemCount: observationalItems.length,
          userId: user.sub,
        });

        return reply.status(200).send({
          assessmentId: crypto.randomUUID(),
          learnerId,
          config,
          questions,
          observationalItems,
          domains: selectedDomains,
        });
      } catch (error) {
        console.error('[accessibility-routes] low_functioning_assessment_start_failed', {
          learnerId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to start low-functioning assessment',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/low-functioning/record-observation
  // Record an observational item during partner-assisted assessment
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/accessibility/low-functioning/record-observation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = getUserFromRequest(request);
      if (!user) {
        return reply.status(401).send({ error: 'Unauthorized' });
      }

      const parseResult = RecordObservationalItemSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      const observation = parseResult.data;

      console.log('[accessibility-routes] observation_recorded', {
        learnerId: observation.learnerId,
        assessmentId: observation.assessmentId,
        itemId: observation.itemId,
        observedBehavior: observation.observedBehavior,
        userId: user.sub,
      });

      // In production, save to database
      return reply.status(200).send({
        success: true,
        observation,
      });
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/sensory/config
  // Get sensory accessibility configuration for a learner
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/accessibility/sensory/config',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = GetSensoryConfigSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      const { sensoryType, options } = parseResult.data;

      try {
        const typedOptions = options
          ? {
              ...options,
              brailleGrade: options.brailleGrade as BrailleGrade | undefined,
            }
          : undefined;

        const config = sensoryAccessibilityService.createAccessibilityConfig(
          sensoryType as SensoryImpairmentType,
          typedOptions
        );

        return reply.status(200).send({ config });
      } catch (error) {
        console.error('[accessibility-routes] sensory_config_failed', {
          sensoryType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get sensory configuration',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/sensory/transform
  // Transform content for sensory accessibility
  // ──────────────────────────────────────────────────────────────────────────
  app.post(
    '/accessibility/sensory/transform',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parseResult = TransformContentSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation Error',
          details: parseResult.error.issues,
        });
      }

      const { content, sensoryType } = parseResult.data;

      try {
        const config = sensoryAccessibilityService.createAccessibilityConfig(
          sensoryType as SensoryImpairmentType
        );

        if (!config) {
          return reply.status(200).send({
            accessibleContent: {
              originalContent: content,
              transformations: [],
            },
          });
        }

        const accessibleContent = await sensoryAccessibilityService.transformContent(
          content,
          sensoryType as SensoryImpairmentType,
          config
        );

        return reply.status(200).send({ accessibleContent });
      } catch (error) {
        console.error('[accessibility-routes] content_transform_failed', {
          contentId: content.id,
          sensoryType,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to transform content',
        });
      }
    }
  );

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/input/config
  // Get input method configuration
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/accessibility/input/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = GetInputConfigSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
    }

    const { inputMethod, options } = parseResult.data;

    try {
      const config = alternativeInputService.createInputConfig(inputMethod as InputMethod, options);

      return reply.status(200).send({ config });
    } catch (error) {
      console.error('[accessibility-routes] input_config_failed', {
        inputMethod,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        error: 'Failed to get input configuration',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // POST /accessibility/input/layout
  // Get layout configuration for input method
  // ──────────────────────────────────────────────────────────────────────────
  app.post('/accessibility/input/layout', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = GetLayoutConfigSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: parseResult.error.issues,
      });
    }

    const { inputMethod, itemCount } = parseResult.data;

    try {
      const layout = alternativeInputService.getLayoutConfig(inputMethod as InputMethod, itemCount);

      return reply.status(200).send({ layout });
    } catch (error) {
      console.error('[accessibility-routes] layout_config_failed', {
        inputMethod,
        itemCount,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return reply.status(500).send({
        error: 'Failed to get layout configuration',
      });
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // GET /accessibility/navigation/:sensoryType/:inputMethod
  // Get navigation instructions for sensory type and input method
  // ──────────────────────────────────────────────────────────────────────────
  app.get<{
    Params: { sensoryType: string; inputMethod: string };
  }>(
    '/accessibility/navigation/:sensoryType/:inputMethod',
    async (request, reply: FastifyReply) => {
      const { sensoryType, inputMethod } = request.params;

      try {
        const navigation = sensoryAccessibilityService.getNavigationInstructions(
          sensoryType as SensoryImpairmentType,
          inputMethod as InputMethod
        );

        return reply.status(200).send({ navigation });
      } catch (error) {
        console.error('[accessibility-routes] navigation_instructions_failed', {
          sensoryType,
          inputMethod,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return reply.status(500).send({
          error: 'Failed to get navigation instructions',
        });
      }
    }
  );
}
