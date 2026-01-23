/**
 * IEP Generation Prompts
 *
 * Well-engineered prompts for AI-powered IEP goal generation.
 * Designed for IDEA compliance and educational best practices.
 *
 * @module prompts/iep-prompts
 */

import type {
  IEPStudentContext,
  IEPDomain,
  IEPGoalCategory,
  DisabilityCategory,
  IEPGoal,
} from '../types/iep.types.js';

// ════════════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * System prompt for IEP goal generation
 */
export const IEP_GOAL_GENERATION_SYSTEM_PROMPT = `You are an expert special education consultant with 20+ years of experience developing IEPs (Individualized Education Programs). You have deep knowledge of:

1. **IDEA Compliance**: The Individuals with Disabilities Education Act requirements for measurable annual goals
2. **Evidence-Based Practices**: Current research on effective interventions for students with disabilities
3. **Universal Design for Learning**: Multiple means of engagement, representation, and action/expression
4. **Disability-Specific Strategies**: Tailored approaches for different disability categories

## IEP Goal Requirements (IDEA-Compliant)

Every IEP goal MUST include:
1. **Measurable Criteria**: Specific, quantifiable targets (percentages, frequencies, durations)
2. **Timeframe**: Clear deadline (typically annual with quarterly benchmarks)
3. **Condition**: The circumstances under which the skill will be demonstrated
4. **Behavior**: Observable, measurable action the student will perform
5. **Criteria**: Level of performance that indicates mastery

## Goal Writing Formula
"Given [condition], [student] will [behavior] with [criteria] by [timeframe]."

Example: "Given a grade-level reading passage and graphic organizer, Maria will identify the main idea and three supporting details with 80% accuracy across 4 consecutive sessions by June 2025."

## Response Format
You MUST respond with valid JSON matching the requested schema. Do not include any explanation outside the JSON.`;

/**
 * System prompt for accommodation suggestions
 */
export const ACCOMMODATION_SUGGESTION_SYSTEM_PROMPT = `You are an expert in special education accommodations and modifications. You understand:

1. **Accommodation vs. Modification**: Accommodations change HOW a student learns; modifications change WHAT they learn
2. **IDEA Categories**: Presentation, Response, Setting, Timing/Scheduling
3. **Assistive Technology**: Tools that support student access and participation
4. **Research-Based Practices**: Evidence-based accommodations for each disability category

## Accommodation Principles
- Must be individualized based on student need
- Should be the least restrictive option that enables access
- Must not fundamentally alter the academic standards
- Should be consistently implemented across settings

Respond with valid JSON only.`;

/**
 * System prompt for objective generation
 */
export const OBJECTIVE_GENERATION_SYSTEM_PROMPT = `You are an expert in writing IEP short-term objectives and benchmarks. You understand:

1. **Scaffolded Progression**: Objectives build toward the annual goal
2. **Measurable Milestones**: Each objective has specific, measurable criteria
3. **Reasonable Timeframes**: Typically 3-4 objectives spread across the IEP year
4. **Data Collection**: Each objective includes how progress will be measured

## Objective Structure
Each objective should:
- Represent incremental progress toward the annual goal
- Include specific success criteria
- Specify a realistic target date
- Include an appropriate measurement method

Respond with valid JSON only.`;

// ════════════════════════════════════════════════════════════════════════════════
// PROMPT BUILDERS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Build the user prompt for IEP goal generation
 */
export function buildIEPGoalPrompt(
  studentContext: IEPStudentContext,
  focusAreas: IEPDomain[],
  goalsPerArea = 2,
  _timeframe: 'quarter' | 'semester' | 'annual' = 'annual',
  customPrompt?: string
): string {
  const gradeLabel = formatGradeLevel(studentContext.gradeLevel);
  const disabilityText = formatDisabilities(studentContext.disabilities);
  const performanceSummary = formatPerformanceLevels(studentContext.currentPerformanceLevels);
  const strengthsText = studentContext.strengths.join(', ') || 'Not specified';
  const needsText = studentContext.needs.join(', ') || 'Not specified';

  let prompt = `## Student Profile

**Grade Level**: ${gradeLabel}
**Disability Categories**: ${disabilityText}
**Primary Language**: ${studentContext.primaryLanguage || 'English'}

### Present Levels of Performance
${performanceSummary}

### Strengths
${strengthsText}

### Areas of Need
${needsText}
`;

  if (studentContext.parentConcerns) {
    prompt += `
### Parent/Guardian Input
${studentContext.parentConcerns}
`;
  }

  if (studentContext.studentInput) {
    prompt += `
### Student Input
${studentContext.studentInput}
`;
  }

  if (studentContext.effectiveAccommodations?.length) {
    prompt += `
### Effective Accommodations (from previous IEPs)
${studentContext.effectiveAccommodations.map((a) => `- ${a}`).join('\n')}
`;
  }

  if (studentContext.previousGoals?.length) {
    const goalLines = studentContext.previousGoals
      .map((g) => {
        const progressNote = g.progressNotes ? ' - ' + g.progressNotes : '';
        return '- **' + g.domain + '** (' + g.status + '): ' + g.description + progressNote;
      })
      .join('\n');
    prompt += `
### Previous IEP Goals
${goalLines}
`;
  }

  prompt += `
## Generation Request

Generate ${goalsPerArea} IDEA-compliant IEP goal(s) for EACH of the following focus areas: ${focusAreas.join(', ')}.

Each goal MUST:
1. Be measurable with specific criteria (percentages, frequencies, etc.)
2. Include 3-4 short-term benchmarks/objectives
3. Specify appropriate measurement methods
4. Include relevant accommodations
5. Recommend service minutes and provider type
6. Align to standards when applicable

${customPrompt ? `\n### Additional Instructions\n${customPrompt}` : ''}

## Required JSON Response Format

{
  "goals": [
    {
      "id": "unique-id",
      "category": "academic|functional|behavioral|social-emotional",
      "subject": "optional subject",
      "domain": "${focusAreas[0]}",
      "annualGoal": "Given [condition], the student will [behavior] with [criteria] by [date].",
      "baseline": "Current performance level description",
      "targetCriteria": "80% accuracy across 4 consecutive sessions",
      "measurementMethod": "observation|work-samples|curriculum-based-assessment|etc.",
      "benchmarks": [
        {
          "targetDate": "3 months",
          "description": "Short-term objective description",
          "criteria": "Specific measurable criteria",
          "measurementMethod": "How it will be measured"
        }
      ],
      "accommodations": ["Specific accommodation 1", "Specific accommodation 2"],
      "serviceMinutes": 60,
      "provider": "special-education-teacher",
      "alignedStandards": ["CCSS.ELA-LITERACY.RI.4.2"],
      "confidence": 0.85,
      "rationale": "Brief explanation of why this goal is appropriate"
    }
  ],
  "rationale": "Overall rationale for the goal set",
  "suggestedAccommodations": ["General accommodations applicable across goals"],
  "suggestedServices": [
    {
      "service": "Speech-Language Therapy",
      "frequency": "2x per week",
      "durationMinutes": 30,
      "provider": "speech-language-pathologist",
      "rationale": "To address expressive language needs"
    }
  ],
  "confidence": 0.85
}`;

  return prompt;
}

/**
 * Build prompt for accommodation suggestions
 */
export function buildAccommodationPrompt(
  disabilities: DisabilityCategory[],
  gradeLevel: number | string,
  domains: IEPDomain[],
  needs?: string[],
  existingAccommodations?: string[]
): string {
  const disabilityText = formatDisabilities(disabilities);
  const gradeLabel = formatGradeLevel(gradeLevel);

  let prompt = `## Student Information

**Grade Level**: ${gradeLabel}
**Disability Categories**: ${disabilityText}
**Target Domains**: ${domains.join(', ')}
`;

  if (needs?.length) {
    prompt += `
### Identified Needs
${needs.map((n) => `- ${n}`).join('\n')}
`;
  }

  if (existingAccommodations?.length) {
    prompt += `
### Current Accommodations (avoid duplicating)
${existingAccommodations.map((a) => `- ${a}`).join('\n')}
`;
  }

  prompt += `
## Request

Generate 8-10 research-based accommodation suggestions for this student. Include accommodations from each category:
- Presentation (how information is presented)
- Response (how student demonstrates knowledge)
- Setting (physical environment)
- Timing/Scheduling (time allowances)
- Assistive Technology (tools and devices)

## Required JSON Response Format

{
  "accommodations": [
    {
      "category": "presentation|response|setting|timing-scheduling|assistive-technology",
      "accommodation": "Specific accommodation description",
      "rationale": "Why this accommodation is appropriate for this student",
      "implementation": "How to implement this accommodation in the classroom"
    }
  ]
}`;

  return prompt;
}

/**
 * Build prompt for objective generation
 */
export function buildObjectivePrompt(
  goalTitle: string,
  goalDescription: string,
  domain: IEPDomain,
  gradeLevel: number | string,
  numberOfObjectives = 3,
  baseline?: string,
  timeframe: 'quarter' | 'semester' | 'annual' = 'annual'
): string {
  const gradeLabel = formatGradeLevel(gradeLevel);
  let timeframeMonths = 12;
  if (timeframe === 'quarter') {
    timeframeMonths = 3;
  } else if (timeframe === 'semester') {
    timeframeMonths = 6;
  }

  let prompt = `## Annual Goal

**Title**: ${goalTitle}
**Description**: ${goalDescription}
**Domain**: ${domain}
**Grade Level**: ${gradeLabel}
**Timeframe**: ${timeframeMonths} months
`;

  if (baseline) {
    prompt += `**Baseline**: ${baseline}
`;
  }

  prompt += `
## Request

Generate ${numberOfObjectives} short-term objectives/benchmarks that scaffold progress toward this annual goal. Each objective should:
1. Represent incremental progress (increasing difficulty/complexity)
2. Have measurable success criteria
3. Include realistic target dates spread across the ${timeframeMonths}-month timeframe
4. Specify appropriate measurement methods

## Required JSON Response Format

{
  "objectives": [
    {
      "targetDate": "3 months",
      "description": "Short-term objective description",
      "criteria": "Specific measurable criteria (e.g., 80% accuracy)",
      "measurementMethod": "How progress will be measured"
    }
  ]
}`;

  return prompt;
}

// ════════════════════════════════════════════════════════════════════════════════
// DOMAIN-SPECIFIC GUIDANCE
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get domain-specific guidance for goal generation
 */
export function getDomainGuidance(domain: IEPDomain): string {
  const guidance: Record<IEPDomain, string> = {
    ELA: `
For English Language Arts goals, consider:
- Reading fluency (words per minute, accuracy)
- Reading comprehension (main idea, inference, vocabulary)
- Written expression (sentence structure, paragraph organization, mechanics)
- Phonemic awareness and phonics (for younger students)
- Vocabulary development
- Listening comprehension`,

    MATH: `
For Mathematics goals, consider:
- Number sense and operations fluency
- Mathematical reasoning and problem-solving
- Computational accuracy and efficiency
- Math vocabulary and communication
- Application to real-world situations
- Grade-appropriate content standards`,

    SCIENCE: `
For Science goals, consider:
- Scientific inquiry and investigation skills
- Content knowledge appropriate to grade level
- Scientific vocabulary and communication
- Data collection and interpretation
- Lab safety and procedures`,

    SPEECH: `
For Speech-Language goals, consider:
- Articulation of specific sounds
- Expressive language (vocabulary, syntax, narrative)
- Receptive language (following directions, comprehension)
- Pragmatic/social language skills
- Voice and fluency`,

    SEL: `
For Social-Emotional Learning goals, consider:
- Self-awareness (identifying emotions, strengths)
- Self-management (impulse control, stress management)
- Social awareness (empathy, perspective-taking)
- Relationship skills (communication, cooperation)
- Responsible decision-making`,

    BEHAVIOR: `
For Behavioral goals, consider:
- Specific observable behaviors to increase or decrease
- Function of behavior (what need is it meeting?)
- Replacement behaviors
- Environmental modifications
- Positive reinforcement strategies`,

    MOTOR: `
For Motor skills goals, consider:
- Fine motor (handwriting, cutting, manipulation)
- Gross motor (balance, coordination, strength)
- Visual-motor integration
- Activities of daily living
- Adaptive equipment needs`,

    ADAPTIVE: `
For Adaptive/Life Skills goals, consider:
- Self-care skills (hygiene, dressing, eating)
- Domestic skills (cleaning, cooking, laundry)
- Community skills (shopping, transportation, safety)
- Leisure skills
- Time management and organization`,

    VOCATIONAL: `
For Vocational/Transition goals, consider:
- Career awareness and exploration
- Job-related social skills
- Work habits and behaviors
- Specific vocational skills
- Post-secondary education preparation
- Independent living skills`,

    OTHER: `
For other goal areas, ensure:
- Goals are individualized to student need
- Measurable criteria are included
- Progress can be monitored regularly
- Goals align with overall IEP focus`,
  };

  return guidance[domain] || guidance.OTHER;
}

/**
 * Get disability-specific considerations
 */
export function getDisabilityGuidance(disability: DisabilityCategory): string {
  const guidance: Record<DisabilityCategory, string> = {
    autism: `
Consider for Autism Spectrum Disorder:
- Visual supports and schedules
- Social skills instruction
- Communication supports (including AAC if needed)
- Sensory accommodations
- Transition supports between activities
- Clear, concrete language`,

    'specific-learning-disability': `
Consider for Specific Learning Disability:
- Multi-sensory instruction
- Explicit, systematic teaching
- Additional practice opportunities
- Assistive technology for reading/writing
- Modified presentation of materials
- Extended time for processing`,

    'speech-language-impairment': `
Consider for Speech-Language Impairment:
- Articulation practice opportunities
- Vocabulary supports
- Sentence starters and frames
- Wait time for responses
- Alternative communication supports
- Collaboration with SLP`,

    'emotional-disturbance': `
Consider for Emotional Disturbance:
- Behavior intervention plan
- Self-regulation strategies
- Mental health supports
- Positive behavioral interventions
- Safe space/break options
- Counseling services`,

    'other-health-impairment': `
Consider for Other Health Impairment (including ADHD):
- Frequent breaks
- Movement opportunities
- Organizational supports
- Chunked assignments
- Reduced distractions
- Executive function strategies`,

    'intellectual-disability': `
Consider for Intellectual Disability:
- Simplified language and instructions
- Repeated practice with varied materials
- Functional life skills integration
- Concrete, hands-on learning
- Community-based instruction
- Generalization across settings`,

    'developmental-delay': `
Consider for Developmental Delay:
- Age-appropriate activities with support
- Play-based learning opportunities
- Early intervention strategies
- Family involvement
- Multi-domain approach`,

    'deaf-blindness': `
Consider for Deaf-Blindness:
- Specialized communication systems
- Tactile learning materials
- Orientation and mobility training
- Intervener services
- Environmental modifications`,

    deafness: `
Consider for Deafness:
- Visual communication supports
- Sign language instruction/interpreter
- Captioning services
- Preferential seating
- Visual alerting systems`,

    'hearing-impairment': `
Consider for Hearing Impairment:
- Amplification devices
- Preferential seating
- Visual supports
- Reduced background noise
- Captioning when available`,

    'orthopedic-impairment': `
Consider for Orthopedic Impairment:
- Physical accessibility
- Adaptive equipment
- Physical therapy integration
- Fatigue management
- Alternative response methods`,

    'multiple-disabilities': `
Consider for Multiple Disabilities:
- Integrated therapy approach
- Multi-modal communication
- Assistive technology assessment
- Collaborative team planning
- Individualized accommodations`,

    'traumatic-brain-injury': `
Consider for Traumatic Brain Injury:
- Cognitive rehabilitation strategies
- Memory supports
- Reduced workload as needed
- Fatigue management
- Ongoing assessment of needs`,

    'visual-impairment': `
Consider for Visual Impairment:
- Large print or braille materials
- Orientation and mobility training
- Assistive technology (screen readers)
- Tactile learning materials
- Preferential seating`,
  };

  return guidance[disability] || '';
}

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Format grade level for display
 */
function formatGradeLevel(gradeLevel: number | string): string {
  if (typeof gradeLevel === 'number') {
    if (gradeLevel === 0) return 'Kindergarten';
    if (gradeLevel <= 12) return `Grade ${gradeLevel}`;
    return `Post-secondary`;
  }
  return gradeLevel;
}

/**
 * Format disability categories for display
 */
function formatDisabilities(disabilities: DisabilityCategory[]): string {
  if (!disabilities.length) return 'Not specified';

  const labels: Record<DisabilityCategory, string> = {
    autism: 'Autism Spectrum Disorder',
    'deaf-blindness': 'Deaf-Blindness',
    deafness: 'Deafness',
    'developmental-delay': 'Developmental Delay',
    'emotional-disturbance': 'Emotional Disturbance',
    'hearing-impairment': 'Hearing Impairment',
    'intellectual-disability': 'Intellectual Disability',
    'multiple-disabilities': 'Multiple Disabilities',
    'orthopedic-impairment': 'Orthopedic Impairment',
    'other-health-impairment': 'Other Health Impairment',
    'specific-learning-disability': 'Specific Learning Disability',
    'speech-language-impairment': 'Speech-Language Impairment',
    'traumatic-brain-injury': 'Traumatic Brain Injury',
    'visual-impairment': 'Visual Impairment',
  };

  return disabilities.map((d) => labels[d] || d).join(', ');
}

/**
 * Format performance levels for the prompt
 */
function formatPerformanceLevels(levels: IEPStudentContext['currentPerformanceLevels']): string {
  if (!levels.length) return 'Not provided';

  return levels
    .map((level) => {
      let text = `**${level.subject}** (${level.level}): ${level.description}`;
      if (level.quantitativeBaseline) {
        text += ` [Baseline: ${level.quantitativeBaseline}]`;
      }
      return text;
    })
    .join('\n');
}

/**
 * Get appropriate goal category for a domain
 */
export function getDefaultCategory(domain: IEPDomain): IEPGoalCategory {
  const categoryMap: Record<IEPDomain, IEPGoalCategory> = {
    ELA: 'academic',
    MATH: 'academic',
    SCIENCE: 'academic',
    SPEECH: 'functional',
    SEL: 'social-emotional',
    BEHAVIOR: 'behavioral',
    MOTOR: 'functional',
    ADAPTIVE: 'functional',
    VOCATIONAL: 'functional',
    OTHER: 'functional',
  };
  return categoryMap[domain];
}

/**
 * Validate that a generated goal has required fields
 */
export function validateGoalStructure(goal: Partial<IEPGoal>): string[] {
  const errors: string[] = [];

  if (!goal.annualGoal) errors.push('Missing annual goal statement');
  if (!goal.baseline) errors.push('Missing baseline');
  if (!goal.targetCriteria) errors.push('Missing target criteria');
  if (!goal.measurementMethod) errors.push('Missing measurement method');
  if (!goal.benchmarks?.length) errors.push('Missing benchmarks/objectives');
  if (!goal.accommodations?.length) errors.push('Missing accommodations');
  if (!goal.serviceMinutes) errors.push('Missing service minutes');
  if (!goal.provider) errors.push('Missing service provider');

  return errors;
}
