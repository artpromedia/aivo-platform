/**
 * AI IEP Generation Routes
 *
 * REST API endpoints for AI-powered IEP goal generation:
 * - Generate IEP goals based on student profile
 * - Generate objectives for existing goals
 * - Suggest accommodations
 */

import { type FastifyInstance, type FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

// ────────────────────────────────────────────────────────────────────────────
// SCHEMAS
// ────────────────────────────────────────────────────────────────────────────

const iepGoalGenerationSchema = z.object({
  studentId: z.string().uuid(),
  studentName: z.string().min(1),
  gradeLevel: z.string().min(1),
  domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', 'BEHAVIOR', 'MOTOR', 'OTHER']),
  currentPerformance: z.string().min(1).describe('Present Level of Performance (PLOP)'),
  strengthsAndWeaknesses: z.object({
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }),
  previousGoals: z.array(z.object({
    title: z.string(),
    status: z.enum(['met', 'in-progress', 'not-met']),
  })).optional(),
  targetSkills: z.array(z.string()).optional(),
  timeframe: z.enum(['quarter', 'semester', 'annual']).default('annual'),
  numberOfGoals: z.number().min(1).max(5).default(3),
});

const iepObjectiveGenerationSchema = z.object({
  goalTitle: z.string().min(1),
  goalDescription: z.string().min(1),
  domain: z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', 'BEHAVIOR', 'MOTOR', 'OTHER']),
  gradeLevel: z.string().min(1),
  numberOfObjectives: z.number().min(1).max(5).default(3),
});

const accommodationSuggestionSchema = z.object({
  studentId: z.string().uuid(),
  disabilities: z.array(z.string()),
  gradeLevel: z.string().min(1),
  domains: z.array(z.enum(['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', 'BEHAVIOR', 'MOTOR', 'OTHER'])),
  existingAccommodations: z.array(z.string()).optional(),
});

// ────────────────────────────────────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────────────────────────────────────

interface IEPGoal {
  title: string;
  description: string;
  domain: string;
  measurableCriteria: string;
  baselineLevel: string;
  targetLevel: string;
  objectives: IEPObjective[];
  suggestedAccommodations: string[];
  alignedStandards?: string[];
}

interface IEPObjective {
  description: string;
  successCriteria: string;
  targetDate: string;
  measurementMethod: string;
}

interface AccommodationSuggestion {
  category: string;
  accommodation: string;
  rationale: string;
  implementation: string;
}

// ────────────────────────────────────────────────────────────────────────────
// MOCK AI GENERATION (In production, would use LLM)
// ────────────────────────────────────────────────────────────────────────────

function generateIEPGoals(request: z.infer<typeof iepGoalGenerationSchema>): IEPGoal[] {
  const { domain, gradeLevel, currentPerformance, numberOfGoals, strengthsAndWeaknesses } = request;

  // Domain-specific goal templates
  const domainGoals: Record<string, IEPGoal[]> = {
    MATH: [
      {
        title: 'Improve Mathematical Problem-Solving Skills',
        description: `By the end of the IEP period, ${request.studentName} will demonstrate improved mathematical problem-solving skills by correctly solving multi-step word problems involving addition, subtraction, multiplication, and division with ${gradeLevel}-appropriate numbers.`,
        domain: 'MATH',
        measurableCriteria: '80% accuracy on grade-level math assessments over 3 consecutive data points',
        baselineLevel: currentPerformance,
        targetLevel: '80% accuracy on multi-step word problems',
        objectives: [
          {
            description: 'Identify key information and operation needed in single-step word problems',
            successCriteria: '85% accuracy',
            targetDate: '3 months',
            measurementMethod: 'Weekly word problem assessments',
          },
          {
            description: 'Solve two-step word problems with addition and subtraction',
            successCriteria: '80% accuracy',
            targetDate: '6 months',
            measurementMethod: 'Bi-weekly problem sets',
          },
          {
            description: 'Solve multi-step word problems with all four operations',
            successCriteria: '80% accuracy',
            targetDate: '9 months',
            measurementMethod: 'Monthly assessments',
          },
        ],
        suggestedAccommodations: [
          'Extended time on math assessments',
          'Use of manipulatives for problem-solving',
          'Calculator for computation-heavy problems',
          'Graphic organizers for word problems',
        ],
        alignedStandards: ['CCSS.MATH.CONTENT.4.OA.A.3'],
      },
      {
        title: 'Strengthen Number Sense and Fluency',
        description: `${request.studentName} will improve number sense and computational fluency by demonstrating automaticity with basic math facts and place value understanding.`,
        domain: 'MATH',
        measurableCriteria: '90% accuracy on basic facts within time limits',
        baselineLevel: currentPerformance,
        targetLevel: '90% accuracy with basic facts, 40 facts per minute',
        objectives: [
          {
            description: 'Master addition facts 0-10',
            successCriteria: '95% accuracy, 30 facts/minute',
            targetDate: '2 months',
            measurementMethod: 'Timed fact fluency assessments',
          },
          {
            description: 'Master subtraction facts 0-10',
            successCriteria: '95% accuracy, 30 facts/minute',
            targetDate: '4 months',
            measurementMethod: 'Timed fact fluency assessments',
          },
          {
            description: 'Master multiplication facts 0-10',
            successCriteria: '90% accuracy, 25 facts/minute',
            targetDate: '8 months',
            measurementMethod: 'Timed fact fluency assessments',
          },
        ],
        suggestedAccommodations: [
          'Fact fluency practice apps',
          'Multiplication chart for reference',
          'Visual number lines',
        ],
      },
    ],
    ELA: [
      {
        title: 'Improve Reading Comprehension',
        description: `${request.studentName} will improve reading comprehension skills by accurately answering questions about main idea, supporting details, and making inferences from grade-level texts.`,
        domain: 'ELA',
        measurableCriteria: '80% accuracy on reading comprehension assessments',
        baselineLevel: currentPerformance,
        targetLevel: '80% accuracy on grade-level reading comprehension',
        objectives: [
          {
            description: 'Identify main idea and supporting details in informational text',
            successCriteria: '85% accuracy',
            targetDate: '3 months',
            measurementMethod: 'Reading response activities',
          },
          {
            description: 'Make text-based inferences with evidence',
            successCriteria: '75% accuracy',
            targetDate: '6 months',
            measurementMethod: 'Inference graphic organizers',
          },
          {
            description: 'Compare and contrast elements across texts',
            successCriteria: '80% accuracy',
            targetDate: '9 months',
            measurementMethod: 'Comparison essays',
          },
        ],
        suggestedAccommodations: [
          'Audiobooks and text-to-speech',
          'Graphic organizers for comprehension',
          'Reduced length of reading passages',
          'Highlighted key vocabulary',
        ],
        alignedStandards: ['CCSS.ELA-LITERACY.RI.4.2'],
      },
      {
        title: 'Develop Written Expression Skills',
        description: `${request.studentName} will improve written expression by producing organized, coherent paragraphs with appropriate grammar and mechanics.`,
        domain: 'ELA',
        measurableCriteria: 'Score of 3 or higher on writing rubric (4-point scale)',
        baselineLevel: currentPerformance,
        targetLevel: 'Consistently produce organized paragraphs with minimal errors',
        objectives: [
          {
            description: 'Write complete sentences with correct capitalization and punctuation',
            successCriteria: '90% accuracy',
            targetDate: '3 months',
            measurementMethod: 'Daily writing samples',
          },
          {
            description: 'Write paragraphs with clear topic sentence and supporting details',
            successCriteria: 'Score 3/4 on rubric',
            targetDate: '6 months',
            measurementMethod: 'Weekly paragraph writing',
          },
          {
            description: 'Write multi-paragraph essays with introduction, body, and conclusion',
            successCriteria: 'Score 3/4 on rubric',
            targetDate: '9 months',
            measurementMethod: 'Monthly essay assessments',
          },
        ],
        suggestedAccommodations: [
          'Speech-to-text software',
          'Word prediction software',
          'Sentence starters',
          'Writing templates and graphic organizers',
        ],
      },
    ],
    SEL: [
      {
        title: 'Improve Self-Regulation Skills',
        description: `${request.studentName} will demonstrate improved self-regulation by using appropriate coping strategies when experiencing frustration or anxiety.`,
        domain: 'SEL',
        measurableCriteria: 'Reduce behavioral incidents by 50% from baseline',
        baselineLevel: currentPerformance,
        targetLevel: 'Use coping strategies independently 80% of the time',
        objectives: [
          {
            description: 'Identify personal emotional triggers',
            successCriteria: 'Accurately identify triggers 4/5 times',
            targetDate: '2 months',
            measurementMethod: 'Self-reflection logs',
          },
          {
            description: 'Use breathing techniques when prompted',
            successCriteria: 'Use techniques successfully 80% of the time',
            targetDate: '4 months',
            measurementMethod: 'Teacher observation data',
          },
          {
            description: 'Independently select and use appropriate coping strategy',
            successCriteria: 'Independent use 75% of the time',
            targetDate: '8 months',
            measurementMethod: 'Behavior tracking data',
          },
        ],
        suggestedAccommodations: [
          'Calm-down corner access',
          'Sensory tools (fidgets, stress ball)',
          'Visual coping strategy cards',
          'Check-in/check-out with counselor',
        ],
      },
    ],
    SPEECH: [
      {
        title: 'Improve Articulation Skills',
        description: `${request.studentName} will improve articulation by correctly producing target speech sounds in words, sentences, and conversation.`,
        domain: 'SPEECH',
        measurableCriteria: '80% accuracy on target sounds in conversation',
        baselineLevel: currentPerformance,
        targetLevel: 'Correct production of target sounds at conversational level',
        objectives: [
          {
            description: 'Produce target sounds correctly at word level',
            successCriteria: '90% accuracy',
            targetDate: '3 months',
            measurementMethod: 'Word-level probes',
          },
          {
            description: 'Produce target sounds correctly at sentence level',
            successCriteria: '85% accuracy',
            targetDate: '6 months',
            measurementMethod: 'Sentence repetition tasks',
          },
          {
            description: 'Produce target sounds correctly in conversation',
            successCriteria: '80% accuracy',
            targetDate: '9 months',
            measurementMethod: 'Conversational speech samples',
          },
        ],
        suggestedAccommodations: [
          'Preferential seating near teacher',
          'Visual cues for sound production',
          'Extra wait time for responses',
        ],
      },
    ],
  };

  const goals = domainGoals[domain] || domainGoals['MATH'];
  return goals.slice(0, numberOfGoals);
}

function generateObjectives(request: z.infer<typeof iepObjectiveGenerationSchema>): IEPObjective[] {
  return [
    {
      description: `Given explicit instruction and practice, the student will ${request.goalTitle.toLowerCase()} with minimal prompts.`,
      successCriteria: '80% accuracy on 3 consecutive assessments',
      targetDate: '3 months',
      measurementMethod: 'Teacher-administered assessments',
    },
    {
      description: `Using learned strategies, the student will independently demonstrate ${request.goalTitle.toLowerCase()}.`,
      successCriteria: '75% accuracy across settings',
      targetDate: '6 months',
      measurementMethod: 'Work samples and observation data',
    },
    {
      description: `The student will generalize ${request.goalTitle.toLowerCase()} skills to novel situations.`,
      successCriteria: '70% accuracy in new contexts',
      targetDate: '9 months',
      measurementMethod: 'Cross-curricular assessments',
    },
  ].slice(0, request.numberOfObjectives);
}

function generateAccommodations(request: z.infer<typeof accommodationSuggestionSchema>): AccommodationSuggestion[] {
  const accommodations: AccommodationSuggestion[] = [
    {
      category: 'Presentation',
      accommodation: 'Audio recordings of written materials',
      rationale: 'Supports students who benefit from auditory input alongside visual information',
      implementation: 'Provide audio versions of textbooks and worksheets; use text-to-speech software',
    },
    {
      category: 'Response',
      accommodation: 'Extended time on assignments and tests',
      rationale: 'Allows student adequate processing time without pressure',
      implementation: 'Provide 1.5x standard time; break longer assessments into segments',
    },
    {
      category: 'Setting',
      accommodation: 'Preferential seating',
      rationale: 'Reduces distractions and increases engagement',
      implementation: 'Seat near teacher and away from high-traffic areas and windows',
    },
    {
      category: 'Scheduling',
      accommodation: 'Frequent breaks during extended work periods',
      rationale: 'Supports attention and reduces fatigue',
      implementation: 'Provide 5-minute break every 20-30 minutes of focused work',
    },
    {
      category: 'Technology',
      accommodation: 'Access to assistive technology',
      rationale: 'Supports independence and reduces barriers',
      implementation: 'Provide word prediction software, speech-to-text, and calculator access',
    },
  ];

  return accommodations;
}

// ────────────────────────────────────────────────────────────────────────────
// ROUTES
// ────────────────────────────────────────────────────────────────────────────

const iepGenerationRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /**
   * Generate IEP goals based on student profile
   */
  fastify.post('/goals', {
    schema: {
      tags: ['IEP Generation'],
      summary: 'Generate IEP goals',
      description: 'Uses AI to generate individualized IEP goals based on student profile and needs',
      body: {
        type: 'object',
        required: ['studentId', 'studentName', 'gradeLevel', 'domain', 'currentPerformance', 'strengthsAndWeaknesses'],
        properties: {
          studentId: { type: 'string', format: 'uuid' },
          studentName: { type: 'string' },
          gradeLevel: { type: 'string' },
          domain: { type: 'string', enum: ['ELA', 'MATH', 'SCIENCE', 'SPEECH', 'SEL', 'BEHAVIOR', 'MOTOR', 'OTHER'] },
          currentPerformance: { type: 'string' },
          strengthsAndWeaknesses: {
            type: 'object',
            properties: {
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
            },
          },
          previousGoals: { type: 'array' },
          targetSkills: { type: 'array', items: { type: 'string' } },
          timeframe: { type: 'string', enum: ['quarter', 'semester', 'annual'] },
          numberOfGoals: { type: 'number', minimum: 1, maximum: 5 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            goals: { type: 'array' },
            generatedAt: { type: 'string' },
            disclaimer: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    try {
      const validated = iepGoalGenerationSchema.parse(request.body);
      const goals = generateIEPGoals(validated);

      return reply.send({
        goals,
        generatedAt: new Date().toISOString(),
        disclaimer: 'AI-generated goals should be reviewed and customized by qualified IEP team members. These suggestions are starting points and may need adjustment to meet individual student needs.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Generate objectives for an existing goal
   */
  fastify.post('/objectives', {
    schema: {
      tags: ['IEP Generation'],
      summary: 'Generate IEP objectives',
      description: 'Uses AI to generate short-term objectives for an IEP goal',
    },
  }, async (request, reply) => {
    try {
      const validated = iepObjectiveGenerationSchema.parse(request.body);
      const objectives = generateObjectives(validated);

      return reply.send({
        objectives,
        generatedAt: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });

  /**
   * Suggest accommodations for a student
   */
  fastify.post('/accommodations', {
    schema: {
      tags: ['IEP Generation'],
      summary: 'Suggest accommodations',
      description: 'Uses AI to suggest appropriate accommodations based on student needs',
    },
  }, async (request, reply) => {
    try {
      const validated = accommodationSuggestionSchema.parse(request.body);
      const accommodations = generateAccommodations(validated);

      return reply.send({
        accommodations,
        generatedAt: new Date().toISOString(),
        disclaimer: 'Accommodation suggestions should be discussed with the IEP team and tailored to individual student needs.',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Validation error', details: error.errors });
      }
      throw error;
    }
  });
};

export default iepGenerationRoutes;
