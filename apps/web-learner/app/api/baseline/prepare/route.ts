import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const AI_ORCHESTRATOR_URL = process.env.AI_ORCHESTRATOR_URL || 'http://localhost:4010';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'dev-internal-key';
const PROFILE_SVC_URL = process.env.PROFILE_SVC_URL || 'http://localhost:3420';

/**
 * Assessment Type from parent assessment
 */
type AssessmentType = 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';
type GradeBand = 'PRE_K' | 'K_2' | 'GRADE_3_5' | 'GRADE_6_8' | 'GRADE_9_12';

/**
 * Domain configuration based on assessment type
 */
interface DomainConfig {
  domain: string;
  name: string;
  skillCodes: string[];
  questionsPerDomain: number;
  enabled: boolean;
}

/**
 * Learner profile from parent assessment
 */
interface LearnerProfile {
  learnerId: string;
  firstName: string;
  gradeLevel: number;
  gradeBand: GradeBand;
  assessmentType: AssessmentType;
  accommodations: string[];
  areasOfConcern: string[];
  hasIep: boolean;
  has504: boolean;
}

/**
 * Skill codes for each domain
 */
const DOMAIN_SKILL_CODES: Record<string, string[]> = {
  MATH: ['MATH_NUMBER_SENSE', 'MATH_OPERATIONS', 'MATH_FRACTIONS', 'MATH_GEOMETRY', 'MATH_PROBLEM_SOLVING'],
  ELA: ['ELA_PHONEMIC_AWARENESS', 'ELA_VOCABULARY', 'ELA_FLUENCY', 'ELA_COMPREHENSION', 'ELA_WRITING'],
  SPEECH: ['SPEECH_ARTICULATION', 'SPEECH_FLUENCY', 'SPEECH_VOICE', 'SPEECH_LANGUAGE', 'SPEECH_PRAGMATICS'],
  SEL: ['SEL_SELF_AWARENESS', 'SEL_SELF_MANAGEMENT', 'SEL_SOCIAL_AWARENESS', 'SEL_RELATIONSHIPS', 'SEL_DECISIONS'],
  SPELLING: ['SPELL_PATTERNS', 'SPELL_PHONICS', 'SPELL_RULES', 'SPELL_SIGHT_WORDS', 'SPELL_COMPOUND'],
  CREATIVE_WRITING: ['CW_STORY_ELEMENTS', 'CW_CHARACTER', 'CW_SETTING', 'CW_DESCRIPTIVE', 'CW_IMAGINATION'],
  LIFE_SKILLS: ['LIFE_TIME', 'LIFE_MONEY', 'LIFE_SAFETY', 'LIFE_HYGIENE', 'LIFE_ORGANIZATION'],
  SCIENCE: ['SCI_OBSERVATION', 'SCI_HYPOTHESIS', 'SCI_EXPERIMENT', 'SCI_DATA', 'SCI_CONCLUSION'],
  // New IEP-specific domains
  MOTOR: ['MOTOR_FINE_GRASP', 'MOTOR_FINE_MANIPULATION', 'MOTOR_VISUAL_MOTOR', 'MOTOR_GROSS_BALANCE', 'MOTOR_GROSS_COORDINATION'],
  EXECUTIVE_FUNCTION: ['EF_WORKING_MEMORY', 'EF_INHIBITION', 'EF_FLEXIBILITY', 'EF_PLANNING', 'EF_METACOGNITION'],
  SENSORY_PROCESSING: ['SENSORY_MODULATION', 'SENSORY_DISCRIMINATION', 'SENSORY_AWARENESS', 'SENSORY_STRATEGIES', 'SENSORY_INTEGRATION'],
};

/**
 * IEP-related disability categories that trigger specific domain assessments
 */
const IEP_DOMAIN_TRIGGERS: Record<string, string[]> = {
  // Disability categories that indicate motor assessment is needed
  MOTOR: [
    'orthopedic_impairment',
    'other_health_impairment',
    'traumatic_brain_injury',
    'multiple_disabilities',
    'developmental_delay',
    'cerebral_palsy',
    'muscular_dystrophy',
  ],
  // Disability categories that indicate executive function assessment
  EXECUTIVE_FUNCTION: [
    'specific_learning_disability',
    'other_health_impairment', // Often ADHD
    'emotional_disturbance',
    'autism',
    'traumatic_brain_injury',
    'intellectual_disability',
  ],
  // Disability categories that indicate sensory processing assessment
  SENSORY_PROCESSING: [
    'autism',
    'developmental_delay',
    'sensory_processing_disorder',
    'deafblindness',
    'hearing_impairment',
    'visual_impairment',
    'multiple_disabilities',
  ],
  // Categories that indicate enhanced life skills focus
  LIFE_SKILLS: [
    'intellectual_disability',
    'autism',
    'multiple_disabilities',
    'developmental_delay',
    'traumatic_brain_injury',
  ],
};

/**
 * Determine which additional domains should be assessed based on IEP and parent assessment
 */
function getAdaptiveDomains(
  hasIep: boolean,
  disabilityCategories: string[],
  areasOfConcern: string[],
  iepGoalDomains: string[]
): string[] {
  const additionalDomains: Set<string> = new Set();

  if (!hasIep && disabilityCategories.length === 0 && areasOfConcern.length === 0) {
    return [];
  }

  // Check disability categories against domain triggers
  for (const [domain, triggers] of Object.entries(IEP_DOMAIN_TRIGGERS)) {
    const hasMatchingCategory = disabilityCategories.some(cat => 
      triggers.includes(cat.toLowerCase().replace(/\s+/g, '_'))
    );
    if (hasMatchingCategory) {
      additionalDomains.add(domain);
    }
  }

  // Check areas of concern from parent assessment
  const concernKeywords: Record<string, string[]> = {
    MOTOR: ['motor', 'coordination', 'handwriting', 'grasp', 'balance', 'physical', 'movement', 'fine motor', 'gross motor'],
    EXECUTIVE_FUNCTION: ['attention', 'focus', 'organization', 'planning', 'memory', 'impulse', 'adhd', 'executive', 'distract'],
    SENSORY_PROCESSING: ['sensory', 'noise', 'texture', 'light', 'overwhelmed', 'meltdown', 'sensitive', 'overstimulated'],
    LIFE_SKILLS: ['daily living', 'self-care', 'independence', 'hygiene', 'safety', 'routine'],
  };

  for (const concern of areasOfConcern) {
    const lowerConcern = concern.toLowerCase();
    for (const [domain, keywords] of Object.entries(concernKeywords)) {
      if (keywords.some(kw => lowerConcern.includes(kw))) {
        additionalDomains.add(domain);
      }
    }
  }

  // Add domains from IEP goals
  for (const goalDomain of iepGoalDomains) {
    const normalizedDomain = goalDomain.toUpperCase().replace(/\s+/g, '_');
    if (DOMAIN_SKILL_CODES[normalizedDomain]) {
      additionalDomains.add(normalizedDomain);
    }
    // Map common IEP goal domains
    if (goalDomain.toLowerCase().includes('motor') || goalDomain.toLowerCase().includes('ot') || goalDomain.toLowerCase().includes('pt')) {
      additionalDomains.add('MOTOR');
    }
    if (goalDomain.toLowerCase().includes('executive') || goalDomain.toLowerCase().includes('attention') || goalDomain.toLowerCase().includes('organization')) {
      additionalDomains.add('EXECUTIVE_FUNCTION');
    }
    if (goalDomain.toLowerCase().includes('sensory')) {
      additionalDomains.add('SENSORY_PROCESSING');
    }
  }

  return Array.from(additionalDomains);
}

/**
 * Domain configurations by assessment type
 */
const DOMAIN_CONFIGS: Record<AssessmentType, DomainConfig[]> = {
  STANDARD: [
    { domain: 'MATH', name: 'Math', skillCodes: DOMAIN_SKILL_CODES.MATH, questionsPerDomain: 5, enabled: true },
    { domain: 'ELA', name: 'Reading & Language', skillCodes: DOMAIN_SKILL_CODES.ELA, questionsPerDomain: 5, enabled: true },
    { domain: 'SPELLING', name: 'Spelling', skillCodes: DOMAIN_SKILL_CODES.SPELLING, questionsPerDomain: 5, enabled: true },
    { domain: 'SPEECH', name: 'Speech & Language', skillCodes: DOMAIN_SKILL_CODES.SPEECH, questionsPerDomain: 5, enabled: true },
    { domain: 'CREATIVE_WRITING', name: 'Creative Writing', skillCodes: DOMAIN_SKILL_CODES.CREATIVE_WRITING, questionsPerDomain: 5, enabled: true },
    { domain: 'SEL', name: 'Social-Emotional', skillCodes: DOMAIN_SKILL_CODES.SEL, questionsPerDomain: 5, enabled: true },
    { domain: 'LIFE_SKILLS', name: 'Life Skills', skillCodes: DOMAIN_SKILL_CODES.LIFE_SKILLS, questionsPerDomain: 5, enabled: true },
  ],
  STANDARD_WITH_ACCOMMODATIONS: [
    { domain: 'MATH', name: 'Math', skillCodes: DOMAIN_SKILL_CODES.MATH, questionsPerDomain: 5, enabled: true },
    { domain: 'ELA', name: 'Reading & Language', skillCodes: DOMAIN_SKILL_CODES.ELA, questionsPerDomain: 5, enabled: true },
    { domain: 'SPELLING', name: 'Spelling', skillCodes: DOMAIN_SKILL_CODES.SPELLING, questionsPerDomain: 5, enabled: true },
    { domain: 'SPEECH', name: 'Speech & Language', skillCodes: DOMAIN_SKILL_CODES.SPEECH, questionsPerDomain: 5, enabled: true },
    { domain: 'CREATIVE_WRITING', name: 'Creative Writing', skillCodes: DOMAIN_SKILL_CODES.CREATIVE_WRITING, questionsPerDomain: 5, enabled: true },
    { domain: 'SEL', name: 'Social-Emotional', skillCodes: DOMAIN_SKILL_CODES.SEL, questionsPerDomain: 5, enabled: true },
    { domain: 'LIFE_SKILLS', name: 'Life Skills', skillCodes: DOMAIN_SKILL_CODES.LIFE_SKILLS, questionsPerDomain: 5, enabled: true },
  ],
  MODIFIED: [
    { domain: 'MATH', name: 'Numbers', skillCodes: DOMAIN_SKILL_CODES.MATH.slice(0, 3), questionsPerDomain: 4, enabled: true },
    { domain: 'ELA', name: 'Reading', skillCodes: DOMAIN_SKILL_CODES.ELA.slice(0, 3), questionsPerDomain: 4, enabled: true },
    { domain: 'LIFE_SKILLS', name: 'Daily Skills', skillCodes: DOMAIN_SKILL_CODES.LIFE_SKILLS.slice(0, 3), questionsPerDomain: 4, enabled: true },
    { domain: 'SEL', name: 'Feelings', skillCodes: DOMAIN_SKILL_CODES.SEL.slice(0, 3), questionsPerDomain: 4, enabled: true },
    { domain: 'SPEECH', name: 'Talking', skillCodes: DOMAIN_SKILL_CODES.SPEECH.slice(0, 2), questionsPerDomain: 3, enabled: true },
  ],
  ALTERNATE: [
    { domain: 'LIFE_SKILLS', name: 'Daily Living', skillCodes: DOMAIN_SKILL_CODES.LIFE_SKILLS.slice(0, 3), questionsPerDomain: 3, enabled: true },
    { domain: 'SEL', name: 'Feelings & Friends', skillCodes: DOMAIN_SKILL_CODES.SEL.slice(0, 3), questionsPerDomain: 3, enabled: true },
    { domain: 'MATH', name: 'Counting', skillCodes: DOMAIN_SKILL_CODES.MATH.slice(0, 2), questionsPerDomain: 3, enabled: true },
    { domain: 'ELA', name: 'Words', skillCodes: DOMAIN_SKILL_CODES.ELA.slice(0, 2), questionsPerDomain: 3, enabled: true },
  ],
};

/**
 * IEP-specific domain configurations (added based on learner's IEP)
 */
const IEP_DOMAIN_CONFIGS: Record<string, Record<AssessmentType, DomainConfig>> = {
  MOTOR: {
    STANDARD: { domain: 'MOTOR', name: 'Motor Skills', skillCodes: DOMAIN_SKILL_CODES.MOTOR, questionsPerDomain: 5, enabled: true },
    STANDARD_WITH_ACCOMMODATIONS: { domain: 'MOTOR', name: 'Motor Skills', skillCodes: DOMAIN_SKILL_CODES.MOTOR, questionsPerDomain: 5, enabled: true },
    MODIFIED: { domain: 'MOTOR', name: 'Movement', skillCodes: DOMAIN_SKILL_CODES.MOTOR.slice(0, 3), questionsPerDomain: 3, enabled: true },
    ALTERNATE: { domain: 'MOTOR', name: 'Moving', skillCodes: DOMAIN_SKILL_CODES.MOTOR.slice(0, 2), questionsPerDomain: 2, enabled: true },
  },
  EXECUTIVE_FUNCTION: {
    STANDARD: { domain: 'EXECUTIVE_FUNCTION', name: 'Thinking Skills', skillCodes: DOMAIN_SKILL_CODES.EXECUTIVE_FUNCTION, questionsPerDomain: 5, enabled: true },
    STANDARD_WITH_ACCOMMODATIONS: { domain: 'EXECUTIVE_FUNCTION', name: 'Thinking Skills', skillCodes: DOMAIN_SKILL_CODES.EXECUTIVE_FUNCTION, questionsPerDomain: 5, enabled: true },
    MODIFIED: { domain: 'EXECUTIVE_FUNCTION', name: 'Planning', skillCodes: DOMAIN_SKILL_CODES.EXECUTIVE_FUNCTION.slice(0, 3), questionsPerDomain: 3, enabled: true },
    ALTERNATE: { domain: 'EXECUTIVE_FUNCTION', name: 'Focus', skillCodes: DOMAIN_SKILL_CODES.EXECUTIVE_FUNCTION.slice(0, 2), questionsPerDomain: 2, enabled: true },
  },
  SENSORY_PROCESSING: {
    STANDARD: { domain: 'SENSORY_PROCESSING', name: 'Sensory Awareness', skillCodes: DOMAIN_SKILL_CODES.SENSORY_PROCESSING, questionsPerDomain: 5, enabled: true },
    STANDARD_WITH_ACCOMMODATIONS: { domain: 'SENSORY_PROCESSING', name: 'Sensory Awareness', skillCodes: DOMAIN_SKILL_CODES.SENSORY_PROCESSING, questionsPerDomain: 5, enabled: true },
    MODIFIED: { domain: 'SENSORY_PROCESSING', name: 'Senses', skillCodes: DOMAIN_SKILL_CODES.SENSORY_PROCESSING.slice(0, 3), questionsPerDomain: 3, enabled: true },
    ALTERNATE: { domain: 'SENSORY_PROCESSING', name: 'Feelings', skillCodes: DOMAIN_SKILL_CODES.SENSORY_PROCESSING.slice(0, 2), questionsPerDomain: 2, enabled: true },
  },
};

/**
 * Fetch learner profile from profile service
 */
async function fetchLearnerProfile(authToken?: string): Promise<LearnerProfile> {
  // Default profile for development/unauthenticated
  const defaultProfile: LearnerProfile = {
    learnerId: 'dev-learner',
    firstName: 'Learner',
    gradeLevel: 2,
    gradeBand: 'K_2',
    assessmentType: 'STANDARD',
    accommodations: [],
    areasOfConcern: [],
    hasIep: false,
    has504: false,
  };

  if (!authToken) {
    return defaultProfile;
  }

  try {
    // Try to get profile from learner profile endpoint
    const response = await fetch(`${PROFILE_SVC_URL}/api/learner/profile`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as {
        id?: string;
        firstName?: string;
        gradeLevel?: string;
        gradeBand?: GradeBand;
        parentAssessment?: {
          assessmentType?: AssessmentType;
          accommodations?: string[];
          areasOfConcern?: string[];
          hasIep?: boolean;
          has504?: boolean;
        };
      };
      return {
        learnerId: data.id || 'learner',
        firstName: data.firstName || 'Learner',
        gradeLevel: Number.parseInt(data.gradeLevel || '2', 10) || 2,
        gradeBand: data.gradeBand || 'K_2',
        assessmentType: data.parentAssessment?.assessmentType || 'STANDARD',
        accommodations: data.parentAssessment?.accommodations || [],
        areasOfConcern: data.parentAssessment?.areasOfConcern || [],
        hasIep: data.parentAssessment?.hasIep || false,
        has504: data.parentAssessment?.has504 || false,
      };
    }
  } catch (error) {
    console.log('[fetchLearnerProfile] Error fetching profile:', error);
  }

  return defaultProfile;
}

/**
 * Generate questions for a single domain via AI orchestrator
 */
async function generateDomainQuestions(
  domain: string,
  skillCodes: string[],
  profile: LearnerProfile,
  count: number
): Promise<{ questions: unknown[]; source: string; generationId?: string }> {
  try {
    console.log(`[Prepare] Generating ${domain} questions for ${profile.assessmentType} assessment`);
    
    const response = await fetch(`${AI_ORCHESTRATOR_URL}/internal/ai/baseline/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-api-key': INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        tenantId: 'default',
        learnerId: profile.learnerId,
        agentType: 'BASELINE',
        payload: {
          gradeBand: profile.gradeBand,
          gradeLevel: profile.gradeLevel,
          domain,
          skillCodes: skillCodes.slice(0, count),
          assessmentType: profile.assessmentType,
          accommodations: profile.accommodations,
          // Pass areas of concern to help AI focus on relevant skills
          areasOfConcern: profile.areasOfConcern,
          hasIep: profile.hasIep,
          has504: profile.has504,
        },
      }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        questions?: Record<string, unknown>[];
        generationId?: string;
      };
      return {
        questions: data.questions || [],
        source: 'ai',
        generationId: data.generationId,
      };
    } else {
      console.log(`[Prepare] AI orchestrator returned ${response.status} for ${domain}`);
    }
  } catch (error) {
    console.log(`[Prepare] AI orchestrator error for ${domain}:`, error);
  }

  // Return empty - fallback will be handled by questions endpoint
  return { questions: [], source: 'fallback' };
}

/**
 * Fetch IEP data from profile service if available
 */
async function fetchIepData(authToken?: string): Promise<{
  iepGoals: string[];
  disabilityCategories: string[];
}> {
  const defaultIep = { iepGoals: [], disabilityCategories: [] };

  if (!authToken) {
    return defaultIep;
  }

  try {
    const response = await fetch(`${PROFILE_SVC_URL}/api/learner/iep`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (response.ok) {
      const data = (await response.json()) as {
        goals?: Array<{ domain?: string }>;
        disabilityCategories?: string[];
      };
      return {
        iepGoals: (data.goals || []).map((g) => g.domain || '').filter(Boolean),
        disabilityCategories: data.disabilityCategories || [],
      };
    }
  } catch (error) {
    console.log('[fetchIepData] Error fetching IEP data:', error);
  }

  return defaultIep;
}

/**
 * POST /api/baseline/prepare
 * 
 * Pre-generates ALL domain questions based on the learner's profile from parent assessment.
 * This endpoint should be called when the baseline assessment page loads to:
 * 1. Fetch learner profile (including parent assessment results)
 * 2. Determine appropriate assessment type and accommodations
 * 3. Analyze IEP goals and parent assessment to select adaptive domains
 * 4. Pre-generate questions for all domains (standard + IEP-specific) in parallel
 * 5. Return all questions so the assessment can proceed without waiting
 */
export async function POST(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Fetch learner profile (includes parent assessment data)
    console.log('[Prepare] Fetching learner profile...');
    const profile = await fetchLearnerProfile(authToken);
    console.log(`[Prepare] Profile loaded: ${profile.firstName}, Grade ${profile.gradeLevel}, Assessment Type: ${profile.assessmentType}`);

    // Fetch IEP data if learner has an IEP
    let iepGoals: string[] = [];
    let disabilityCategories: string[] = [];
    if (profile.hasIep) {
      console.log('[Prepare] Learner has IEP, fetching IEP data...');
      const iepData = await fetchIepData(authToken);
      iepGoals = iepData.iepGoals;
      disabilityCategories = iepData.disabilityCategories;
      console.log(`[Prepare] IEP data loaded: ${iepGoals.length} goals, ${disabilityCategories.length} disability categories`);
    }

    // Get base domain configurations for this assessment type
    const baseDomainConfigs = DOMAIN_CONFIGS[profile.assessmentType];
    let enabledDomains = baseDomainConfigs.filter(d => d.enabled);

    // Determine adaptive domains based on IEP and parent assessment
    const adaptiveDomains = getAdaptiveDomains(
      profile.hasIep,
      disabilityCategories,
      profile.areasOfConcern,
      iepGoals
    );

    // Add IEP-specific domains if needed
    if (adaptiveDomains.length > 0) {
      console.log(`[Prepare] Adding adaptive domains based on IEP/parent assessment: ${adaptiveDomains.join(', ')}`);
      for (const domain of adaptiveDomains) {
        // Only add if not already in the base config
        if (!enabledDomains.some(d => d.domain === domain)) {
          const iepConfig = IEP_DOMAIN_CONFIGS[domain]?.[profile.assessmentType];
          if (iepConfig) {
            enabledDomains = [...enabledDomains, iepConfig];
          }
        }
      }
    }

    console.log(`[Prepare] Generating questions for ${enabledDomains.length} domains (including ${adaptiveDomains.length} adaptive)...`);

    // Generate questions for all domains in parallel
    const domainPromises = enabledDomains.map(async (domainConfig) => {
      const result = await generateDomainQuestions(
        domainConfig.domain,
        domainConfig.skillCodes,
        profile,
        domainConfig.questionsPerDomain
      );

      return {
        domain: domainConfig.domain,
        name: domainConfig.name,
        questions: (result.questions as Record<string, unknown>[]).map((q, idx) => {
          const options = q.options;
          const correctAnswer = q.correctAnswer;
          return {
            id: `${domainConfig.domain.toLowerCase()}-${idx + 1}`,
            domain: domainConfig.domain,
            skillCode: (q.skillCode as string) || '',
            questionType: (q.questionType as string) || 'MULTIPLE_CHOICE',
            questionText: (q.questionText as string) || '',
            options: Array.isArray(options) ? options : [],
            difficulty: 2,
            questionNumber: idx + 1,
            correctAnswer: typeof correctAnswer === 'number' ? correctAnswer : 0,
          };
        }),
        source: result.source,
        generationId: result.generationId,
        questionsPerDomain: domainConfig.questionsPerDomain,
      };
    });

    const domainResults = await Promise.all(domainPromises);
    const totalTime = Date.now() - startTime;

    console.log(`[Prepare] All questions generated in ${totalTime}ms`);

    // Build response with all pre-generated questions
    const response = {
      success: true,
      profile: {
        learnerId: profile.learnerId,
        firstName: profile.firstName,
        gradeLevel: profile.gradeLevel,
        gradeBand: profile.gradeBand,
        assessmentType: profile.assessmentType,
        accommodations: profile.accommodations,
        hasIep: profile.hasIep,
        has504: profile.has504,
        areasOfConcern: profile.areasOfConcern,
      },
      // Include IEP-based adaptive assessment info
      adaptiveAssessment: {
        enabled: adaptiveDomains.length > 0,
        additionalDomains: adaptiveDomains,
        iepGoalsDetected: iepGoals.length,
        disabilityCategoriesDetected: disabilityCategories.length,
      },
      domains: domainResults.map(d => ({
        domain: d.domain,
        name: d.name,
        questions: d.questions,
        source: d.source,
        generationId: d.generationId,
        questionsPerDomain: d.questionsPerDomain,
        isAdaptive: adaptiveDomains.includes(d.domain), // Mark IEP-specific domains
      })),
      totalQuestions: domainResults.reduce((sum, d) => sum + d.questions.length, 0),
      generationTimeMs: totalTime,
      preparedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Prepare] Error preparing assessment:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to prepare assessment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/baseline/prepare
 * 
 * Returns information about the preparation process (for status checking)
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/baseline/prepare',
    description: 'Pre-generates all baseline assessment questions based on learner profile',
    method: 'POST',
    returns: {
      profile: 'Learner profile including assessment type from parent assessment',
      domains: 'Array of domains with pre-generated questions',
      totalQuestions: 'Total number of questions generated',
      generationTimeMs: 'Time taken to generate all questions',
    },
  });
}
