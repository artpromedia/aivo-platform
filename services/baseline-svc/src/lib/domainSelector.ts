/**
 * Dynamic Domain Selector
 *
 * Determines which assessment domains to include for a learner based on:
 * - IEP goals and services
 * - Parent assessment responses
 * - Assessment type (STANDARD, MODIFIED, ALTERNATE)
 * - Areas of concern
 *
 * This ensures learners receive assessments tailored to their needs,
 * including functional and developmental domains when appropriate.
 *
 * @module domainSelector
 */

import type {
  BaselineDomain,
  AssessmentType,
  IepGoalData,
  IepServiceData,
  DomainSelectionContext,
  DomainSelectionResult,
} from '../types/baseline.js';

import {
  CORE_DOMAINS,
  EXTENDED_ACADEMIC_DOMAINS,
  FUNCTIONAL_DOMAINS,
  DEVELOPMENTAL_DOMAINS,
} from '../types/baseline.js';

// ═══════════════════════════════════════════════════════════════════════════════
// KEYWORD MAPPINGS
// Maps IEP goals, services, and concerns to assessment domains
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Keywords that indicate a domain should be included based on IEP goals
 */
const IEP_GOAL_DOMAIN_KEYWORDS: Record<BaselineDomain, string[]> = {
  // Core domains
  ELA: ['reading', 'writing', 'literacy', 'phonics', 'comprehension', 'fluency', 'vocabulary', 'decoding', 'english', 'language arts'],
  MATH: ['math', 'mathematics', 'number', 'counting', 'arithmetic', 'calculation', 'geometry', 'algebra', 'measurement'],
  SCIENCE: ['science', 'scientific', 'experiment', 'hypothesis', 'observation', 'stem'],
  SPEECH: ['speech', 'language', 'articulation', 'communication', 'expressive', 'receptive', 'phonological', 'pragmatic', 'stuttering', 'fluency disorder'],
  SEL: ['social', 'emotional', 'behavior', 'self-regulation', 'coping', 'anger', 'anxiety', 'peer', 'friendship', 'conflict resolution'],

  // Extended academic
  SPELLING: ['spelling', 'spell', 'orthography', 'word patterns'],
  CREATIVE_WRITING: ['creative writing', 'story writing', 'narrative', 'fiction', 'imagination'],

  // Functional
  LIFE_SKILLS: ['daily living', 'life skills', 'functional', 'independence', 'self-help', 'hygiene', 'safety', 'money', 'time', 'schedule', 'routine', 'adaptive'],

  // Developmental
  MOTOR: ['motor', 'fine motor', 'gross motor', 'handwriting', 'grasp', 'coordination', 'balance', 'physical', 'occupational therapy', 'ot goal'],
  EXECUTIVE_FUNCTION: ['executive function', 'attention', 'focus', 'working memory', 'planning', 'organization', 'impulse', 'self-control', 'task completion', 'flexibility', 'adhd'],
  SENSORY_PROCESSING: ['sensory', 'sensory processing', 'sensory integration', 'vestibular', 'proprioceptive', 'tactile', 'auditory processing', 'visual processing', 'sensory diet'],
};

/**
 * Keywords that indicate a domain based on IEP services
 */
const IEP_SERVICE_DOMAIN_KEYWORDS: Record<string, BaselineDomain[]> = {
  'occupational therapy': ['MOTOR', 'SENSORY_PROCESSING', 'EXECUTIVE_FUNCTION'],
  'ot': ['MOTOR', 'SENSORY_PROCESSING'],
  'physical therapy': ['MOTOR'],
  'pt': ['MOTOR'],
  'speech therapy': ['SPEECH'],
  'speech-language': ['SPEECH'],
  'slp': ['SPEECH'],
  'counseling': ['SEL'],
  'social work': ['SEL'],
  'behavioral support': ['SEL', 'EXECUTIVE_FUNCTION'],
  'applied behavior analysis': ['SEL', 'EXECUTIVE_FUNCTION'],
  'aba': ['SEL', 'EXECUTIVE_FUNCTION'],
  'special education': ['ELA', 'MATH'],
  'reading intervention': ['ELA'],
  'math intervention': ['MATH'],
  'sensory integration': ['SENSORY_PROCESSING'],
  'adaptive pe': ['MOTOR'],
  'life skills training': ['LIFE_SKILLS'],
  'transition services': ['LIFE_SKILLS'],
  'vocational': ['LIFE_SKILLS'],
};

/**
 * Parent assessment concern keywords that indicate developmental domains
 */
const CONCERN_DOMAIN_KEYWORDS: Record<string, BaselineDomain[]> = {
  // Motor concerns
  'handwriting': ['MOTOR'],
  'pencil grip': ['MOTOR'],
  'clumsy': ['MOTOR'],
  'coordination': ['MOTOR'],
  'balance': ['MOTOR'],
  'fine motor': ['MOTOR'],
  'gross motor': ['MOTOR'],
  'cutting': ['MOTOR'],
  'buttons': ['MOTOR'],
  'tying shoes': ['MOTOR', 'LIFE_SKILLS'],

  // Executive function concerns
  'attention': ['EXECUTIVE_FUNCTION'],
  'focus': ['EXECUTIVE_FUNCTION'],
  'distracted': ['EXECUTIVE_FUNCTION'],
  'impulsive': ['EXECUTIVE_FUNCTION'],
  'hyperactive': ['EXECUTIVE_FUNCTION'],
  'organization': ['EXECUTIVE_FUNCTION'],
  'planning': ['EXECUTIVE_FUNCTION'],
  'forgetful': ['EXECUTIVE_FUNCTION'],
  'following directions': ['EXECUTIVE_FUNCTION'],
  'transitions': ['EXECUTIVE_FUNCTION'],
  'task completion': ['EXECUTIVE_FUNCTION'],

  // Sensory concerns
  'sensory': ['SENSORY_PROCESSING'],
  'sensitive to noise': ['SENSORY_PROCESSING'],
  'sensitive to touch': ['SENSORY_PROCESSING'],
  'sensitive to light': ['SENSORY_PROCESSING'],
  'picky eater': ['SENSORY_PROCESSING'],
  'texture': ['SENSORY_PROCESSING'],
  'meltdown': ['SENSORY_PROCESSING', 'SEL'],
  'overwhelmed': ['SENSORY_PROCESSING', 'SEL'],
  'sensory seeking': ['SENSORY_PROCESSING'],
  'sensory avoiding': ['SENSORY_PROCESSING'],

  // Life skills concerns
  'independence': ['LIFE_SKILLS'],
  'self-care': ['LIFE_SKILLS'],
  'hygiene': ['LIFE_SKILLS'],
  'dressing': ['LIFE_SKILLS'],
  'toileting': ['LIFE_SKILLS'],
  'eating': ['LIFE_SKILLS'],
  'safety awareness': ['LIFE_SKILLS'],
  'money': ['LIFE_SKILLS'],
  'time': ['LIFE_SKILLS'],
  'daily routine': ['LIFE_SKILLS'],
};

/**
 * Disability categories that indicate certain domains should be included
 */
const DISABILITY_DOMAIN_MAP: Record<string, BaselineDomain[]> = {
  'autism': ['SEL', 'EXECUTIVE_FUNCTION', 'SENSORY_PROCESSING', 'SPEECH'],
  'asd': ['SEL', 'EXECUTIVE_FUNCTION', 'SENSORY_PROCESSING', 'SPEECH'],
  'autism spectrum': ['SEL', 'EXECUTIVE_FUNCTION', 'SENSORY_PROCESSING', 'SPEECH'],
  'adhd': ['EXECUTIVE_FUNCTION', 'SEL'],
  'attention deficit': ['EXECUTIVE_FUNCTION', 'SEL'],
  'intellectual disability': ['LIFE_SKILLS', 'SEL', 'EXECUTIVE_FUNCTION'],
  'developmental delay': ['LIFE_SKILLS', 'MOTOR', 'EXECUTIVE_FUNCTION'],
  'global developmental delay': ['LIFE_SKILLS', 'MOTOR', 'EXECUTIVE_FUNCTION', 'SPEECH'],
  'specific learning disability': ['ELA', 'MATH', 'EXECUTIVE_FUNCTION'],
  'dyslexia': ['ELA', 'SPELLING'],
  'dyscalculia': ['MATH'],
  'dysgraphia': ['MOTOR', 'ELA'],
  'speech impairment': ['SPEECH'],
  'language impairment': ['SPEECH', 'ELA'],
  'emotional disturbance': ['SEL', 'EXECUTIVE_FUNCTION'],
  'emotional behavioral': ['SEL', 'EXECUTIVE_FUNCTION'],
  'orthopedic impairment': ['MOTOR'],
  'physical disability': ['MOTOR'],
  'cerebral palsy': ['MOTOR', 'SPEECH'],
  'sensory processing disorder': ['SENSORY_PROCESSING'],
  'spd': ['SENSORY_PROCESSING'],
  'occupational therapy': ['MOTOR', 'SENSORY_PROCESSING'],
  'multiple disabilities': ['LIFE_SKILLS', 'MOTOR', 'SEL', 'EXECUTIVE_FUNCTION'],
  'traumatic brain injury': ['EXECUTIVE_FUNCTION', 'MOTOR', 'SPEECH'],
  'tbi': ['EXECUTIVE_FUNCTION', 'MOTOR', 'SPEECH'],
};

// ═══════════════════════════════════════════════════════════════════════════════
// DOMAIN SELECTOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Select appropriate assessment domains based on learner context.
 *
 * Domain selection priority:
 * 1. Core domains (ELA, MATH, SCIENCE, SPEECH, SEL) - always included
 * 2. IEP goal-indicated domains - included if IEP has relevant goals
 * 3. IEP service-indicated domains - included if receiving relevant services
 * 4. Disability category domains - included based on documented disabilities
 * 5. Parent concern domains - included based on parent-identified concerns
 * 6. Assessment type domains - ALTERNATE/MODIFIED may add LIFE_SKILLS
 *
 * @param context - The learner's assessment context
 * @returns Selected domains with reasons and question counts
 */
export function selectDomainsForLearner(context: DomainSelectionContext): DomainSelectionResult {
  const selectedDomains = new Set<BaselineDomain>();
  const reasons: Record<string, string> = {};
  const questionsPerDomain: Record<string, number> = {};

  // ── Step 1: Always include core domains ──
  for (const domain of CORE_DOMAINS) {
    selectedDomains.add(domain);
    reasons[domain] = 'Core academic domain (always included)';
    questionsPerDomain[domain] = 5; // Standard 5 questions per domain
  }

  // ── Step 2: Check IEP goals for additional domains ──
  if (context.iepGoals && context.iepGoals.length > 0) {
    for (const goal of context.iepGoals) {
      const goalText = `${goal.domain || ''} ${goal.category || ''} ${goal.description || ''}`.toLowerCase();

      for (const [domain, keywords] of Object.entries(IEP_GOAL_DOMAIN_KEYWORDS)) {
        if (keywords.some(kw => goalText.includes(kw))) {
          if (!selectedDomains.has(domain as BaselineDomain)) {
            selectedDomains.add(domain as BaselineDomain);
            reasons[domain] = `IEP goal indicates need: "${goal.description?.substring(0, 50)}..."`;
            questionsPerDomain[domain] = getQuestionsForDomain(domain as BaselineDomain, context.assessmentType);
          }
        }
      }
    }
  }

  // ── Step 3: Check IEP services for additional domains ──
  if (context.iepServices && context.iepServices.length > 0) {
    for (const service of context.iepServices) {
      const serviceText = `${service.type || ''} ${service.provider || ''}`.toLowerCase();

      for (const [keyword, domains] of Object.entries(IEP_SERVICE_DOMAIN_KEYWORDS)) {
        if (serviceText.includes(keyword)) {
          for (const domain of domains) {
            if (!selectedDomains.has(domain)) {
              selectedDomains.add(domain);
              reasons[domain] = `Receiving related service: ${service.type}`;
              questionsPerDomain[domain] = getQuestionsForDomain(domain, context.assessmentType);
            }
          }
        }
      }
    }
  }

  // ── Step 4: Check disability categories ──
  if (context.disabilityCategories && context.disabilityCategories.length > 0) {
    for (const category of context.disabilityCategories) {
      const normalizedCategory = category.toLowerCase();

      for (const [keyword, domains] of Object.entries(DISABILITY_DOMAIN_MAP)) {
        if (normalizedCategory.includes(keyword)) {
          for (const domain of domains) {
            if (!selectedDomains.has(domain)) {
              selectedDomains.add(domain);
              reasons[domain] = `Disability category indicates need: ${category}`;
              questionsPerDomain[domain] = getQuestionsForDomain(domain, context.assessmentType);
            }
          }
        }
      }
    }
  }

  // ── Step 5: Check parent-identified concerns ──
  if (context.areasOfConcern && context.areasOfConcern.length > 0) {
    const concernsText = context.areasOfConcern.join(' ').toLowerCase();

    for (const [keyword, domains] of Object.entries(CONCERN_DOMAIN_KEYWORDS)) {
      if (concernsText.includes(keyword)) {
        for (const domain of domains) {
          if (!selectedDomains.has(domain)) {
            selectedDomains.add(domain);
            reasons[domain] = `Parent concern indicates need: "${keyword}"`;
            questionsPerDomain[domain] = getQuestionsForDomain(domain, context.assessmentType);
          }
        }
      }
    }
  }

  // ── Step 6: Assessment type specific domains ──
  if (context.assessmentType === 'ALTERNATE') {
    // ALTERNATE assessments focus on functional skills
    if (!selectedDomains.has('LIFE_SKILLS')) {
      selectedDomains.add('LIFE_SKILLS');
      reasons['LIFE_SKILLS'] = 'Alternate assessment includes functional life skills';
      questionsPerDomain['LIFE_SKILLS'] = 5;
    }

    // Reduce core academic questions for ALTERNATE
    for (const domain of CORE_DOMAINS) {
      questionsPerDomain[domain] = 3; // Fewer academic questions
    }
  } else if (context.assessmentType === 'MODIFIED') {
    // MODIFIED may include life skills if IEP indicates
    if (context.hasIep && !selectedDomains.has('LIFE_SKILLS')) {
      // Check if any IEP goals suggest functional focus
      const hasAdaptiveGoals = context.iepGoals?.some(g =>
        ['adaptive', 'functional', 'daily living', 'self-help'].some(kw =>
          (g.description || '').toLowerCase().includes(kw)
        )
      );

      if (hasAdaptiveGoals) {
        selectedDomains.add('LIFE_SKILLS');
        reasons['LIFE_SKILLS'] = 'IEP indicates functional skill focus';
        questionsPerDomain['LIFE_SKILLS'] = 3;
      }
    }
  }

  // ── Step 7: Ensure all selected domains have question counts ──
  for (const domain of selectedDomains) {
    if (!questionsPerDomain[domain]) {
      questionsPerDomain[domain] = getQuestionsForDomain(domain, context.assessmentType);
    }
  }

  console.log(`[DomainSelector] Selected ${selectedDomains.size} domains:`, {
    domains: Array.from(selectedDomains),
    assessmentType: context.assessmentType,
    hasIep: context.hasIep,
    iepGoalCount: context.iepGoals?.length ?? 0,
    iepServiceCount: context.iepServices?.length ?? 0,
    concernCount: context.areasOfConcern?.length ?? 0,
  });

  return {
    selectedDomains: Array.from(selectedDomains) as BaselineDomain[],
    reasons: reasons as Record<BaselineDomain, string>,
    questionsPerDomain: questionsPerDomain as Record<BaselineDomain, number>,
  };
}

/**
 * Get the number of questions for a domain based on assessment type
 */
function getQuestionsForDomain(domain: BaselineDomain, assessmentType: AssessmentType): number {
  // ALTERNATE assessments have fewer questions per domain
  if (assessmentType === 'ALTERNATE') {
    return 3;
  }

  // MODIFIED assessments have slightly reduced counts
  if (assessmentType === 'MODIFIED') {
    return 4;
  }

  // Developmental domains may have fewer questions
  if (DEVELOPMENTAL_DOMAINS.includes(domain)) {
    return 3;
  }

  // Standard is 5 questions
  return 5;
}

/**
 * Get a human-readable summary of why domains were selected
 */
export function getDomainSelectionSummary(result: DomainSelectionResult): string {
  const summaryParts: string[] = [];

  const coreCount = result.selectedDomains.filter(d => CORE_DOMAINS.includes(d)).length;
  const devCount = result.selectedDomains.filter(d => DEVELOPMENTAL_DOMAINS.includes(d)).length;
  const funcCount = result.selectedDomains.filter(d => FUNCTIONAL_DOMAINS.includes(d)).length;

  summaryParts.push(`${coreCount} core academic domains`);

  if (devCount > 0) {
    summaryParts.push(`${devCount} developmental domains (MOTOR/EXECUTIVE_FUNCTION/SENSORY_PROCESSING)`);
  }

  if (funcCount > 0) {
    summaryParts.push(`${funcCount} functional domains (LIFE_SKILLS)`);
  }

  const totalQuestions = Object.values(result.questionsPerDomain).reduce((a, b) => a + b, 0);
  summaryParts.push(`${totalQuestions} total questions`);

  return summaryParts.join(', ');
}

export default {
  selectDomainsForLearner,
  getDomainSelectionSummary,
};
