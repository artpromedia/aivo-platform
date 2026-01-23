/**
 * AI IEP Generation Routes
 *
 * REST API endpoints for AI-powered IEP goal generation:
 * - Generate IEP goals based on student profile
 * - Generate objectives for existing goals
 * - Suggest accommodations
 *
 * Uses LLMOrchestrator for real AI-powered generation with IDEA compliance validation.
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { createIEPGenerationService } from '../generation/iep-generation.service.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { IEPDomain, DisabilityCategory } from '../types/iep.types.js';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ────────────────────────────────────────────────────────────────────────────

const DOMAINS = [
  'ELA',
  'MATH',
  'SCIENCE',
  'SPEECH',
  'SEL',
  'BEHAVIOR',
  'MOTOR',
  'ADAPTIVE',
  'VOCATIONAL',
  'OTHER',
] as const;

const DISABILITY_CATEGORIES = [
  'specific-learning-disability',
  'speech-language-impairment',
  'other-health-impairment',
  'autism',
  'emotional-disturbance',
  'intellectual-disability',
  'multiple-disabilities',
  'hearing-impairment',
  'visual-impairment',
  'orthopedic-impairment',
  'traumatic-brain-injury',
  'deaf-blindness',
  'developmental-delay',
  'deafness',
] as const;

const iepGoalGenerationSchema = z.object({
  // Student context
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  gradeLevel: z.string().min(1),
  age: z.number().min(3).max(22).optional(),
  disabilities: z.array(z.enum(DISABILITY_CATEGORIES)).optional(),

  // Goal parameters
  domain: z.enum(DOMAINS),
  currentPerformance: z.string().min(1).describe('Present Level of Performance (PLOP)'),
  strengthsAndWeaknesses: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }),
  previousGoals: z
    .array(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        status: z.enum(['met', 'in-progress', 'not-met']),
        progress: z.string().optional(),
      })
    )
    .optional(),
  targetSkills: z.array(z.string()).optional(),
  timeframe: z.enum(['quarter', 'semester', 'annual']).default('annual'),
  numberOfGoals: z.number().min(1).max(5).default(3),

  // Additional context
  interests: z.array(z.string()).optional(),
  supports: z.array(z.string()).optional(),
  transitionNeeds: z
    .object({
      postSecondaryGoals: z.array(z.string()),
      coursesOfStudy: z.array(z.string()),
      agencyLinks: z.array(z.string()),
    })
    .optional(),

  // Tenant info for multi-tenancy
  tenantId: z.string().optional(),
  userId: z.string().optional(),
});

const iepObjectiveGenerationSchema = z.object({
  goalTitle: z.string().min(1),
  goalDescription: z.string().min(1),
  domain: z.enum(DOMAINS),
  gradeLevel: z.string().min(1),
  numberOfObjectives: z.number().min(1).max(6).default(4),
});

const accommodationSuggestionSchema = z.object({
  disabilities: z.array(z.enum(DISABILITY_CATEGORIES)),
  gradeLevel: z.string().min(1),
  domains: z.array(z.enum(DOMAINS)),
  needs: z.array(z.string()).optional(),
  existingAccommodations: z.array(z.string()).optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// ROUTE OPTIONS
// ────────────────────────────────────────────────────────────────────────────

interface IEPGenerationRoutesOptions {
  llmOrchestrator: LLMOrchestrator;
}

// ────────────────────────────────────────────────────────────────────────────
// ROUTES
// ────────────────────────────────────────────────────────────────────────────

const iepGenerationRoutes: FastifyPluginAsync<IEPGenerationRoutesOptions> = async (
  fastify: FastifyInstance,
  options: IEPGenerationRoutesOptions
) => {
  const { llmOrchestrator } = options;

  // Initialize the IEP generation service
  const iepService = createIEPGenerationService(llmOrchestrator);

  /**
   * Generate IEP goals based on student profile
   * Uses real AI-powered generation with IDEA compliance validation
   */
  fastify.post(
    '/goals',
    {
      schema: {
        tags: ['IEP Generation'],
        summary: 'Generate IDEA-compliant IEP goals',
        description:
          'Uses AI to generate individualized, measurable IEP goals based on student profile and needs. Includes validation for IDEA compliance.',
        body: {
          type: 'object',
          required: [
            'studentId',
            'studentName',
            'gradeLevel',
            'domain',
            'currentPerformance',
            'strengthsAndWeaknesses',
          ],
          properties: {
            studentId: { type: 'string', format: 'uuid' },
            studentName: { type: 'string' },
            gradeLevel: { type: 'string' },
            age: { type: 'number', minimum: 3, maximum: 22 },
            disabilities: { type: 'array', items: { type: 'string' } },
            domain: { type: 'string', enum: DOMAINS },
            currentPerformance: {
              type: 'string',
              description: 'Present Level of Performance (PLOP)',
            },
            strengthsAndWeaknesses: {
              type: 'object',
              properties: {
                strengths: { type: 'array', items: { type: 'string' } },
                weaknesses: { type: 'array', items: { type: 'string' } },
              },
            },
            previousGoals: { type: 'array' },
            targetSkills: { type: 'array', items: { type: 'string' } },
            interests: { type: 'array', items: { type: 'string' } },
            supports: { type: 'array', items: { type: 'string' } },
            timeframe: { type: 'string', enum: ['quarter', 'semester', 'annual'] },
            numberOfGoals: { type: 'number', minimum: 1, maximum: 5 },
            transitionNeeds: { type: 'object' },
            tenantId: { type: 'string' },
            userId: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              goals: { type: 'array' },
              rationale: { type: 'string' },
              suggestedAccommodations: { type: 'array' },
              suggestedServices: { type: 'array' },
              confidence: { type: 'number' },
              metadata: { type: 'object' },
              disclaimer: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const validated = iepGoalGenerationSchema.parse(request.body);

        // Build the student context matching IEPStudentContext
        const studentContext = {
          learnerId: validated.studentId,
          gradeLevel: validated.gradeLevel,
          disabilities: (validated.disabilities ?? []) as DisabilityCategory[],
          currentPerformanceLevels: [
            {
              subject: validated.domain,
              level: 'current',
              description: validated.currentPerformance,
            },
          ],
          strengths: validated.strengthsAndWeaknesses.strengths,
          needs: validated.strengthsAndWeaknesses.weaknesses,
          previousGoals: validated.previousGoals?.map((g) => {
            const mapGoalStatus = (
              status: string
            ): 'met' | 'partially-met' | 'not-met' | 'in-progress' => {
              if (status === 'in-progress') return 'in-progress';
              if (status === 'met') return 'met';
              return 'not-met';
            };
            return {
              description: g.description ?? g.title,
              domain: validated.domain as IEPDomain,
              status: mapGoalStatus(g.status),
              progressNotes: g.progress,
            };
          }),
          effectiveAccommodations: validated.supports,
        };

        const result = await iepService.generateGoals({
          tenantId: validated.tenantId ?? 'default',
          studentContext,
          focusAreas: [validated.domain as IEPDomain],
          goalsPerArea: validated.numberOfGoals,
          timeframe: validated.timeframe,
          requestId: undefined,
        });

        return reply.send(result);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        console.error('IEP goal generation error:', error);
        return reply.status(500).send({
          error: 'Failed to generate IEP goals',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Generate objectives/benchmarks for an existing goal
   */
  fastify.post(
    '/objectives',
    {
      schema: {
        tags: ['IEP Generation'],
        summary: 'Generate IEP objectives/benchmarks',
        description:
          'Uses AI to generate short-term objectives that scaffold progress toward an annual goal',
        body: {
          type: 'object',
          required: ['goalTitle', 'goalDescription', 'domain', 'gradeLevel'],
          properties: {
            goalTitle: { type: 'string' },
            goalDescription: { type: 'string' },
            domain: { type: 'string', enum: DOMAINS },
            gradeLevel: { type: 'string' },
            numberOfObjectives: { type: 'number', minimum: 1, maximum: 6 },
            baseline: { type: 'string' },
            timeframe: { type: 'string', enum: ['quarter', 'semester', 'annual'] },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              objectives: { type: 'array' },
              generatedAt: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const validated = iepObjectiveGenerationSchema.parse(request.body);

        const objectives = await iepService.generateObjectives(
          validated.goalTitle,
          validated.goalDescription,
          validated.domain as IEPDomain,
          validated.gradeLevel,
          validated.numberOfObjectives
        );

        return reply.send({
          objectives,
          generatedAt: new Date().toISOString(),
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        console.error('IEP objective generation error:', error);
        return reply.status(500).send({
          error: 'Failed to generate objectives',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * Suggest accommodations for a student
   */
  fastify.post(
    '/accommodations',
    {
      schema: {
        tags: ['IEP Generation'],
        summary: 'Suggest accommodations',
        description:
          'Uses AI to suggest appropriate accommodations based on student disabilities and needs',
        body: {
          type: 'object',
          required: ['disabilities', 'gradeLevel', 'domains'],
          properties: {
            disabilities: { type: 'array', items: { type: 'string', enum: DISABILITY_CATEGORIES } },
            gradeLevel: { type: 'string' },
            domains: { type: 'array', items: { type: 'string', enum: DOMAINS } },
            needs: { type: 'array', items: { type: 'string' } },
            existingAccommodations: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accommodations: { type: 'array' },
              generatedAt: { type: 'string' },
              disclaimer: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const validated = accommodationSuggestionSchema.parse(request.body);

        const accommodations = await iepService.generateAccommodations(
          validated.disabilities as DisabilityCategory[],
          validated.gradeLevel,
          validated.domains as IEPDomain[],
          undefined, // needs
          validated.existingAccommodations
        );

        return reply.send({
          accommodations,
          generatedAt: new Date().toISOString(),
          disclaimer:
            'Accommodation suggestions should be discussed with the IEP team and tailored to individual student needs. All accommodations must be documented in the IEP and implemented consistently across settings.',
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.status(400).send({ error: 'Validation error', details: error.errors });
        }
        console.error('Accommodation generation error:', error);
        return reply.status(500).send({
          error: 'Failed to generate accommodations',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
};

export default iepGenerationRoutes;
