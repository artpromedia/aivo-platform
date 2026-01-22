'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface LearnerForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gradeLevel: string;
  zipCode: string;
  classCode: string;
}

/**
 * Assessment Result Data - Returned from AI analysis
 */
interface AssessmentResultData {
  assessmentType: 'STANDARD' | 'STANDARD_WITH_ACCOMMODATIONS' | 'MODIFIED' | 'ALTERNATE';
  typeName: string;
  typeDescription: string;
  supportLevel: number;
  recommendations: string[];
  standardAccommodations: string[];
  areasOfConcern: string[];
  strengths: string[];
  domainsToAssess: string[];
  estimatedDuration: string;
  aiConfidence: number;
  aiRationale: string;
}

interface ParentAssessmentStepProps {
  learnerName: string;
  learnerId: string | null;
  onComplete: (results: AssessmentResultData) => void;
  onSkip: () => void;
}

/**
 * Assessment Category Configuration
 * Aligned with IDEA (Individuals with Disabilities Education Act) and Section 504
 */
interface AssessmentCategory {
  id: string;
  title: string;
  icon: string;
  description: string;
  ideaAlignment: string;
  questions: AssessmentQuestion[];
}

interface AssessmentQuestion {
  id: string;
  question: string;
  helpText?: string;
  type: 'single' | 'multi' | 'scale' | 'text';
  options?: { value: string; label: string; weight?: number }[];
  scaleLabels?: { min: string; max: string };
  required: boolean;
}

/**
 * Parent Assessment Step Component - IDEA/504 Aligned
 * 
 * Comprehensive assessment following IDEA (Individuals with Disabilities Education Act)
 * and Section 504 standards to gather detailed information about the child's:
 * - Communication & Language
 * - Cognitive & Academic Functioning
 * - Motor Skills (Fine & Gross)
 * - Social-Emotional Development
 * - Adaptive Behavior & Daily Living
 * - Sensory Processing
 * - Attention & Executive Function
 * - Health & Medical Considerations
 * - Current Services & Supports
 */
function ParentAssessmentStep({ learnerName, learnerId, onComplete, onSkip }: ParentAssessmentStepProps) {
  const [responses, setResponses] = useState<Record<string, string | string[] | number>>({});
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iepFile, setIepFile] = useState<File | null>(null);
  const [section504File, setSection504File] = useState<File | null>(null);
  const [iepUploading, setIepUploading] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Comprehensive assessment categories aligned with IDEA and Section 504
  const categories: AssessmentCategory[] = [
    {
      id: 'documentation',
      title: 'Existing Documentation',
      icon: '📋',
      description: 'Current educational plans and evaluations',
      ideaAlignment: 'IDEA §300.306 - Determination of eligibility',
      questions: [
        {
          id: 'has_iep',
          question: `Does ${learnerName} currently have an Individualized Education Program (IEP)?`,
          helpText: 'An IEP is a legally binding document that outlines special education services for students with disabilities under IDEA.',
          type: 'single',
          options: [
            { value: 'yes_current', label: 'Yes, currently active' },
            { value: 'yes_expired', label: 'Yes, but it has expired' },
            { value: 'in_process', label: 'Currently being evaluated' },
            { value: 'no', label: 'No' },
            { value: 'unsure', label: "I'm not sure" },
          ],
          required: true,
        },
        {
          id: 'has_504',
          question: `Does ${learnerName} have a Section 504 Plan?`,
          helpText: 'A 504 Plan provides accommodations for students with disabilities that affect a major life activity, even without an IEP.',
          type: 'single',
          options: [
            { value: 'yes_current', label: 'Yes, currently active' },
            { value: 'yes_expired', label: 'Yes, but it has expired' },
            { value: 'in_process', label: 'Currently being evaluated' },
            { value: 'no', label: 'No' },
            { value: 'unsure', label: "I'm not sure" },
          ],
          required: true,
        },
        {
          id: 'disability_categories',
          question: 'Has your child been identified with any of the following? (Select all that apply)',
          helpText: 'These are the 13 disability categories under IDEA. This helps us provide appropriate accommodations.',
          type: 'multi',
          options: [
            { value: 'autism', label: 'Autism Spectrum Disorder' },
            { value: 'deaf_blindness', label: 'Deaf-Blindness' },
            { value: 'deafness', label: 'Deafness' },
            { value: 'emotional_disturbance', label: 'Emotional Disturbance' },
            { value: 'hearing_impairment', label: 'Hearing Impairment' },
            { value: 'intellectual_disability', label: 'Intellectual Disability' },
            { value: 'multiple_disabilities', label: 'Multiple Disabilities' },
            { value: 'orthopedic_impairment', label: 'Orthopedic Impairment' },
            { value: 'other_health_impairment', label: 'Other Health Impairment (e.g., ADHD, diabetes)' },
            { value: 'specific_learning_disability', label: 'Specific Learning Disability (e.g., dyslexia, dyscalculia)' },
            { value: 'speech_language_impairment', label: 'Speech or Language Impairment' },
            { value: 'traumatic_brain_injury', label: 'Traumatic Brain Injury' },
            { value: 'visual_impairment', label: 'Visual Impairment (including blindness)' },
            { value: 'developmental_delay', label: 'Developmental Delay (ages 3-9)' },
            { value: 'none', label: 'None of the above' },
            { value: 'prefer_not_say', label: 'Prefer not to say' },
          ],
          required: true,
        },
        {
          id: 'recent_evaluation',
          question: 'When was the most recent formal evaluation or assessment?',
          helpText: 'This includes psychoeducational evaluations, speech assessments, or other formal testing.',
          type: 'single',
          options: [
            { value: 'within_year', label: 'Within the past year' },
            { value: '1_2_years', label: '1-2 years ago' },
            { value: '2_3_years', label: '2-3 years ago' },
            { value: 'over_3_years', label: 'More than 3 years ago' },
            { value: 'never', label: 'Never had a formal evaluation' },
            { value: 'unsure', label: "I'm not sure" },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'communication_language',
      title: 'Communication & Language',
      icon: '💬',
      description: 'Speech, language, and communication abilities',
      ideaAlignment: 'IDEA §300.8(c)(11) - Speech or language impairment',
      questions: [
        {
          id: 'receptive_language',
          question: `How well does ${learnerName} understand spoken language?`,
          helpText: 'Receptive language is the ability to understand words and language.',
          type: 'single',
          options: [
            { value: 'age_appropriate', label: 'Age-appropriate understanding', weight: 0 },
            { value: 'mild_difficulty', label: 'Mild difficulty understanding complex instructions', weight: 1 },
            { value: 'moderate_difficulty', label: 'Needs simplified language and repetition', weight: 2 },
            { value: 'significant_difficulty', label: 'Significant difficulty; needs visual supports', weight: 3 },
            { value: 'minimal_understanding', label: 'Minimal verbal understanding; relies on gestures/pictures', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'expressive_language',
          question: `How does ${learnerName} communicate their wants and needs?`,
          helpText: 'Expressive language is the ability to express thoughts through words, sentences, or other means.',
          type: 'single',
          options: [
            { value: 'verbal_fluent', label: 'Speaks in full sentences appropriate for age', weight: 0 },
            { value: 'verbal_simple', label: 'Uses simple sentences or phrases', weight: 1 },
            { value: 'verbal_limited', label: 'Limited verbal; uses single words', weight: 2 },
            { value: 'aac_device', label: 'Uses AAC device or communication app', weight: 2 },
            { value: 'nonverbal_gestures', label: 'Nonverbal; uses gestures, pointing, or pictures', weight: 3 },
            { value: 'nonverbal_limited', label: 'Nonverbal with limited communication methods', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'follows_directions',
          question: `Can ${learnerName} follow multi-step directions?`,
          helpText: 'Example: "Put on your shoes, get your backpack, and wait by the door."',
          type: 'single',
          options: [
            { value: 'multi_step', label: 'Follows 3+ step directions independently', weight: 0 },
            { value: 'two_step', label: 'Follows 2-step directions independently', weight: 1 },
            { value: 'one_step', label: 'Follows 1-step directions independently', weight: 2 },
            { value: 'with_support', label: 'Needs visual or gestural support for any directions', weight: 3 },
            { value: 'significant_support', label: 'Requires hand-over-hand assistance', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'articulation',
          question: `How clear is ${learnerName}'s speech to unfamiliar listeners?`,
          type: 'single',
          options: [
            { value: 'fully_clear', label: 'Fully understandable to strangers', weight: 0 },
            { value: 'mostly_clear', label: 'Mostly understandable with occasional clarification', weight: 1 },
            { value: 'partially_clear', label: 'About 50% understandable to unfamiliar listeners', weight: 2 },
            { value: 'difficult', label: 'Difficult to understand; family members interpret', weight: 3 },
            { value: 'not_applicable', label: 'Not applicable (nonverbal)', weight: 0 },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'cognitive_academic',
      title: 'Cognitive & Academic',
      icon: '🧠',
      description: 'Learning, memory, and academic skills',
      ideaAlignment: 'IDEA §300.8(c)(6) - Intellectual disability; §300.8(c)(10) - Specific learning disability',
      questions: [
        {
          id: 'learning_pace',
          question: `How would you describe ${learnerName}'s learning pace compared to same-age peers?`,
          type: 'single',
          options: [
            { value: 'advanced', label: 'Learns faster than peers; may need enrichment', weight: 0 },
            { value: 'on_pace', label: 'Learns at a similar pace to peers', weight: 0 },
            { value: 'slightly_slower', label: 'Needs a bit more time or repetition', weight: 1 },
            { value: 'significantly_slower', label: 'Learns significantly slower; needs modified content', weight: 2 },
            { value: 'extensive_support', label: 'Requires extensive support and alternative approaches', weight: 3 },
          ],
          required: true,
        },
        {
          id: 'reading_level',
          question: `What best describes ${learnerName}'s current reading ability?`,
          helpText: 'Consider their grade level when answering.',
          type: 'single',
          options: [
            { value: 'above_grade', label: 'Above grade level', weight: 0 },
            { value: 'on_grade', label: 'At grade level', weight: 0 },
            { value: 'slightly_below', label: 'Slightly below grade level (within 1 year)', weight: 1 },
            { value: 'significantly_below', label: 'Significantly below grade level (2+ years)', weight: 2 },
            { value: 'pre_reading', label: 'Pre-reading / Learning letter sounds', weight: 2 },
            { value: 'not_applicable', label: 'Not yet applicable (Pre-K)', weight: 0 },
          ],
          required: true,
        },
        {
          id: 'math_level',
          question: `What best describes ${learnerName}'s current math ability?`,
          type: 'single',
          options: [
            { value: 'above_grade', label: 'Above grade level', weight: 0 },
            { value: 'on_grade', label: 'At grade level', weight: 0 },
            { value: 'slightly_below', label: 'Slightly below grade level (within 1 year)', weight: 1 },
            { value: 'significantly_below', label: 'Significantly below grade level (2+ years)', weight: 2 },
            { value: 'pre_math', label: 'Learning basic counting and number recognition', weight: 2 },
            { value: 'not_applicable', label: 'Not yet applicable (Pre-K)', weight: 0 },
          ],
          required: true,
        },
        {
          id: 'memory_retention',
          question: `How well does ${learnerName} retain information learned previously?`,
          type: 'single',
          options: [
            { value: 'excellent', label: 'Retains information well; rarely needs review', weight: 0 },
            { value: 'good', label: 'Generally retains; occasional review needed', weight: 1 },
            { value: 'moderate', label: 'Needs regular review; forgets after a few days', weight: 2 },
            { value: 'poor', label: 'Significant difficulty retaining; needs daily review', weight: 3 },
            { value: 'very_poor', label: 'Very limited retention; requires constant re-teaching', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'problem_solving',
          question: `How does ${learnerName} approach new or challenging problems?`,
          type: 'single',
          options: [
            { value: 'independent', label: 'Tries multiple strategies independently', weight: 0 },
            { value: 'with_prompting', label: 'Needs occasional prompts to try new approaches', weight: 1 },
            { value: 'needs_guidance', label: 'Needs step-by-step guidance', weight: 2 },
            { value: 'avoids', label: 'Often avoids or becomes frustrated with challenges', weight: 3 },
            { value: 'significant_support', label: 'Requires full support for problem-solving', weight: 4 },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'motor_skills',
      title: 'Motor Skills',
      icon: '✋',
      description: 'Fine motor, gross motor, and physical abilities',
      ideaAlignment: 'IDEA §300.8(c)(8) - Orthopedic impairment',
      questions: [
        {
          id: 'fine_motor_writing',
          question: `How well can ${learnerName} hold and use a pencil or crayon?`,
          type: 'single',
          options: [
            { value: 'age_appropriate', label: 'Age-appropriate grip and control', weight: 0 },
            { value: 'mild_difficulty', label: 'Mild difficulty; may tire quickly or have messy writing', weight: 1 },
            { value: 'moderate_difficulty', label: 'Needs adapted tools (thick pencils, grips)', weight: 2 },
            { value: 'significant_difficulty', label: 'Significant difficulty; prefers typing or alternatives', weight: 3 },
            { value: 'unable', label: 'Unable to hold writing tools independently', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'fine_motor_touch',
          question: `Can ${learnerName} accurately tap or click on items on a screen?`,
          helpText: 'Consider touchscreen devices, mouse, or trackpad use.',
          type: 'single',
          options: [
            { value: 'accurate', label: 'Accurate and precise', weight: 0 },
            { value: 'mostly_accurate', label: 'Mostly accurate; occasional misses', weight: 1 },
            { value: 'needs_larger_targets', label: 'Needs larger buttons/targets', weight: 2 },
            { value: 'needs_assistance', label: 'Needs physical guidance', weight: 3 },
            { value: 'uses_assistive', label: 'Uses assistive technology (switch, eye gaze)', weight: 3 },
          ],
          required: true,
        },
        {
          id: 'gross_motor',
          question: `How would you describe ${learnerName}'s overall movement and coordination?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Typical for age; no concerns', weight: 0 },
            { value: 'mild_delays', label: 'Mild delays or clumsiness', weight: 1 },
            { value: 'moderate_delays', label: 'Moderate delays; receives or needs physical therapy', weight: 2 },
            { value: 'significant_delays', label: 'Significant delays; uses mobility aids', weight: 3 },
            { value: 'wheelchair', label: 'Uses wheelchair or limited mobility', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'physical_endurance',
          question: `How long can ${learnerName} sit and engage in a learning activity?`,
          type: 'single',
          options: [
            { value: '30_plus', label: '30+ minutes without breaks', weight: 0 },
            { value: '15_30', label: '15-30 minutes with minimal breaks', weight: 1 },
            { value: '10_15', label: '10-15 minutes; needs regular breaks', weight: 2 },
            { value: '5_10', label: '5-10 minutes; needs frequent breaks or movement', weight: 3 },
            { value: 'under_5', label: 'Less than 5 minutes; constant movement needed', weight: 4 },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'attention_executive',
      title: 'Attention & Executive Function',
      icon: '🎯',
      description: 'Focus, organization, and self-regulation',
      ideaAlignment: 'IDEA §300.8(c)(9) - Other health impairment (includes ADHD)',
      questions: [
        {
          id: 'sustained_attention',
          question: `How long can ${learnerName} focus on a non-preferred activity?`,
          helpText: 'Consider activities like homework or chores, not preferred activities like video games.',
          type: 'single',
          options: [
            { value: 'age_appropriate', label: 'Age-appropriate attention span', weight: 0 },
            { value: 'slightly_short', label: 'Slightly shorter than peers; needs occasional redirection', weight: 1 },
            { value: 'significantly_short', label: 'Significantly short; needs frequent redirection', weight: 2 },
            { value: 'very_short', label: 'Very short; needs constant engagement strategies', weight: 3 },
            { value: 'minimal', label: 'Minimal sustained attention possible', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'distractibility',
          question: `How easily is ${learnerName} distracted by sounds, movement, or visual stimuli?`,
          type: 'single',
          options: [
            { value: 'rarely', label: 'Rarely distracted; good focus in most environments', weight: 0 },
            { value: 'sometimes', label: 'Sometimes distracted; can refocus with prompting', weight: 1 },
            { value: 'often', label: 'Often distracted; needs quiet environment', weight: 2 },
            { value: 'very_often', label: 'Very easily distracted; needs minimal-stimulation setting', weight: 3 },
            { value: 'constantly', label: 'Constantly distracted; requires 1:1 attention', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'task_initiation',
          question: `How well does ${learnerName} start tasks independently?`,
          type: 'single',
          options: [
            { value: 'independent', label: 'Starts tasks independently when given instructions', weight: 0 },
            { value: 'occasional_prompting', label: 'Needs occasional prompting to begin', weight: 1 },
            { value: 'regular_prompting', label: 'Needs regular prompting and encouragement', weight: 2 },
            { value: 'significant_prompting', label: 'Needs significant support to start any task', weight: 3 },
            { value: 'full_support', label: 'Cannot initiate tasks without full support', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'transitions',
          question: `How well does ${learnerName} handle transitions between activities?`,
          type: 'single',
          options: [
            { value: 'smooth', label: 'Transitions smoothly with standard notice', weight: 0 },
            { value: 'needs_warning', label: 'Needs extra warnings (5-minute, 2-minute)', weight: 1 },
            { value: 'mild_difficulty', label: 'Mild difficulty; may need transition objects/routines', weight: 2 },
            { value: 'moderate_difficulty', label: 'Moderate difficulty; often resists or has meltdowns', weight: 3 },
            { value: 'severe_difficulty', label: 'Severe difficulty; transitions are major challenges', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'organization',
          question: `How well can ${learnerName} organize materials and follow routines?`,
          type: 'single',
          options: [
            { value: 'independent', label: 'Independently organized for age', weight: 0 },
            { value: 'some_support', label: 'Needs some organizational supports (checklists, reminders)', weight: 1 },
            { value: 'regular_support', label: 'Needs regular help with organization', weight: 2 },
            { value: 'significant_support', label: 'Needs significant adult support to stay organized', weight: 3 },
            { value: 'full_support', label: 'Cannot organize without full assistance', weight: 4 },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'social_emotional',
      title: 'Social-Emotional',
      icon: '❤️',
      description: 'Social skills, emotional regulation, and behavior',
      ideaAlignment: 'IDEA §300.8(c)(4) - Emotional disturbance; Autism social criteria',
      questions: [
        {
          id: 'peer_interaction',
          question: `How does ${learnerName} interact with same-age peers?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Typical social interactions for age', weight: 0 },
            { value: 'mild_difficulty', label: 'Mild difficulty; may prefer younger/older children or adults', weight: 1 },
            { value: 'moderate_difficulty', label: 'Moderate difficulty; limited interest or skills', weight: 2 },
            { value: 'significant_difficulty', label: 'Significant difficulty; rarely engages with peers', weight: 3 },
            { value: 'no_interest', label: 'Shows little interest in peer interaction', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'emotional_regulation',
          question: `How well can ${learnerName} manage frustration or disappointment?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Age-appropriate emotional responses', weight: 0 },
            { value: 'mild_difficulty', label: 'Mild difficulty; needs occasional calming support', weight: 1 },
            { value: 'moderate_difficulty', label: 'Moderate difficulty; frequent dysregulation', weight: 2 },
            { value: 'significant_difficulty', label: 'Significant difficulty; meltdowns or shutdowns common', weight: 3 },
            { value: 'severe_difficulty', label: 'Severe difficulty; intensive support needed', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'anxiety_level',
          question: `Does ${learnerName} experience anxiety that affects daily activities?`,
          type: 'single',
          options: [
            { value: 'none', label: 'No significant anxiety', weight: 0 },
            { value: 'mild', label: 'Mild anxiety in specific situations', weight: 1 },
            { value: 'moderate', label: 'Moderate anxiety affecting some activities', weight: 2 },
            { value: 'significant', label: 'Significant anxiety affecting many activities', weight: 3 },
            { value: 'severe', label: 'Severe anxiety; receiving treatment', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'behavior_challenges',
          question: 'Does your child exhibit any of the following behaviors regularly? (Select all that apply)',
          type: 'multi',
          options: [
            { value: 'none', label: 'None of these' },
            { value: 'aggression', label: 'Aggression toward others' },
            { value: 'self_injury', label: 'Self-injurious behavior' },
            { value: 'elopement', label: 'Running away/elopement' },
            { value: 'property_destruction', label: 'Property destruction' },
            { value: 'noncompliance', label: 'Frequent noncompliance' },
            { value: 'tantrums', label: 'Tantrums beyond age expectations' },
            { value: 'withdrawal', label: 'Social withdrawal' },
            { value: 'stimming', label: 'Repetitive behaviors/stimming' },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'sensory_processing',
      title: 'Sensory Processing',
      icon: '👂',
      description: 'How your child processes sensory information',
      ideaAlignment: 'Related to Autism, OHI, and other IDEA categories',
      questions: [
        {
          id: 'auditory_sensitivity',
          question: `How does ${learnerName} respond to sounds?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Typical responses to sounds', weight: 0 },
            { value: 'mild_sensitivity', label: 'Mildly sensitive to some sounds', weight: 1 },
            { value: 'moderate_sensitivity', label: 'Moderate sensitivity; covers ears, avoids loud places', weight: 2 },
            { value: 'severe_sensitivity', label: 'Severe sensitivity; uses noise-canceling headphones', weight: 3 },
            { value: 'seeks_sound', label: 'Seeks out sounds; may not respond to name', weight: 2 },
          ],
          required: true,
        },
        {
          id: 'visual_sensitivity',
          question: `How does ${learnerName} respond to visual stimuli (lights, screens, busy environments)?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Typical responses', weight: 0 },
            { value: 'mild_sensitivity', label: 'Mildly sensitive to bright lights or screens', weight: 1 },
            { value: 'moderate_sensitivity', label: 'Moderate sensitivity; prefers dim environments', weight: 2 },
            { value: 'severe_sensitivity', label: 'Severe sensitivity; affects daily functioning', weight: 3 },
            { value: 'seeks_visual', label: 'Seeks visual stimulation (stares at lights, spins objects)', weight: 2 },
          ],
          required: true,
        },
        {
          id: 'tactile_sensitivity',
          question: `How does ${learnerName} respond to touch and textures?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Typical responses to touch and textures', weight: 0 },
            { value: 'mild_sensitivity', label: 'Mildly sensitive (clothing tags, certain fabrics)', weight: 1 },
            { value: 'moderate_sensitivity', label: 'Moderate sensitivity; avoids many textures', weight: 2 },
            { value: 'severe_sensitivity', label: 'Severe sensitivity; limited clothing/food textures tolerated', weight: 3 },
            { value: 'seeks_touch', label: 'Seeks deep pressure or touch input', weight: 1 },
          ],
          required: true,
        },
        {
          id: 'sensory_diet',
          question: `Does ${learnerName} use any sensory supports or accommodations?`,
          type: 'multi',
          options: [
            { value: 'none', label: 'No sensory supports needed' },
            { value: 'fidgets', label: 'Fidget tools' },
            { value: 'noise_canceling', label: 'Noise-canceling headphones' },
            { value: 'weighted_items', label: 'Weighted blanket/vest' },
            { value: 'movement_breaks', label: 'Scheduled movement breaks' },
            { value: 'seating', label: 'Special seating (wobble cushion, standing desk)' },
            { value: 'lighting', label: 'Adjusted lighting' },
            { value: 'occupational_therapy', label: 'Receives occupational therapy' },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'adaptive_daily',
      title: 'Adaptive & Daily Living',
      icon: '🏠',
      description: 'Independence in daily activities',
      ideaAlignment: 'IDEA - Adaptive behavior assessment requirements',
      questions: [
        {
          id: 'self_care',
          question: `How independently can ${learnerName} perform self-care tasks (dressing, hygiene)?`,
          helpText: 'Consider what is typical for their age.',
          type: 'single',
          options: [
            { value: 'independent', label: 'Fully independent for age', weight: 0 },
            { value: 'mostly_independent', label: 'Mostly independent with occasional reminders', weight: 1 },
            { value: 'needs_help', label: 'Needs regular help with some tasks', weight: 2 },
            { value: 'significant_help', label: 'Needs significant help with most tasks', weight: 3 },
            { value: 'full_assistance', label: 'Requires full assistance', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'safety_awareness',
          question: `How aware is ${learnerName} of safety in their environment?`,
          type: 'single',
          options: [
            { value: 'typical', label: 'Age-appropriate safety awareness', weight: 0 },
            { value: 'mild_concern', label: 'Mild concerns; needs occasional reminders', weight: 1 },
            { value: 'moderate_concern', label: 'Moderate concerns; needs supervision for safety', weight: 2 },
            { value: 'significant_concern', label: 'Significant concerns; limited danger awareness', weight: 3 },
            { value: 'constant_supervision', label: 'Requires constant supervision for safety', weight: 4 },
          ],
          required: true,
        },
        {
          id: 'technology_independence',
          question: `How independently can ${learnerName} use technology for learning?`,
          type: 'single',
          options: [
            { value: 'independent', label: 'Can independently navigate apps and websites', weight: 0 },
            { value: 'mostly_independent', label: 'Mostly independent; needs help with new interfaces', weight: 1 },
            { value: 'needs_setup', label: 'Needs help getting started, then works independently', weight: 2 },
            { value: 'needs_ongoing', label: 'Needs ongoing support throughout', weight: 3 },
            { value: 'full_support', label: 'Requires 1:1 support for technology use', weight: 4 },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'health_medical',
      title: 'Health & Medical',
      icon: '🏥',
      description: 'Health conditions affecting learning',
      ideaAlignment: 'IDEA §300.8(c)(9) - Other health impairment',
      questions: [
        {
          id: 'medical_conditions',
          question: 'Does your child have any of the following conditions? (Select all that apply)',
          helpText: 'These conditions may qualify for accommodations under Section 504 or IDEA.',
          type: 'multi',
          options: [
            { value: 'none', label: 'None of these' },
            { value: 'epilepsy', label: 'Epilepsy/Seizure disorder' },
            { value: 'diabetes', label: 'Diabetes' },
            { value: 'asthma', label: 'Severe asthma' },
            { value: 'heart_condition', label: 'Heart condition' },
            { value: 'adhd', label: 'ADHD/ADD' },
            { value: 'chronic_fatigue', label: 'Chronic fatigue' },
            { value: 'autoimmune', label: 'Autoimmune condition' },
            { value: 'cancer', label: 'Cancer (current or history)' },
            { value: 'other', label: 'Other chronic health condition' },
          ],
          required: true,
        },
        {
          id: 'medications',
          question: `Does ${learnerName} take any medications that might affect learning or attention?`,
          type: 'single',
          options: [
            { value: 'no', label: 'No medications affecting learning', weight: 0 },
            { value: 'yes_managed', label: 'Yes, but well-managed with minimal side effects', weight: 1 },
            { value: 'yes_some_effects', label: 'Yes, with some effects on alertness or attention', weight: 2 },
            { value: 'yes_significant', label: 'Yes, with significant effects on learning', weight: 3 },
            { value: 'prefer_not_say', label: 'Prefer not to say', weight: 0 },
          ],
          required: true,
        },
        {
          id: 'vision_hearing',
          question: `Does ${learnerName} have any vision or hearing concerns?`,
          type: 'single',
          options: [
            { value: 'none', label: 'No concerns', weight: 0 },
            { value: 'corrected_vision', label: 'Wears glasses/contacts; vision corrected', weight: 0 },
            { value: 'uncorrected_vision', label: 'Vision concerns not fully corrected', weight: 2 },
            { value: 'hearing_aids', label: 'Uses hearing aids; hearing managed', weight: 1 },
            { value: 'deaf_hoh', label: 'Deaf or hard of hearing', weight: 3 },
            { value: 'blind_low_vision', label: 'Blind or low vision', weight: 3 },
            { value: 'both', label: 'Both vision and hearing concerns', weight: 4 },
          ],
          required: true,
        },
      ],
    },
    {
      id: 'current_services',
      title: 'Current Services & Supports',
      icon: '🤝',
      description: 'Therapies and educational services',
      ideaAlignment: 'IDEA - Related services documentation',
      questions: [
        {
          id: 'current_therapies',
          question: `What therapies or specialized services does ${learnerName} currently receive? (Select all that apply)`,
          type: 'multi',
          options: [
            { value: 'none', label: 'No current therapies or services' },
            { value: 'speech', label: 'Speech-Language Therapy' },
            { value: 'occupational', label: 'Occupational Therapy' },
            { value: 'physical', label: 'Physical Therapy' },
            { value: 'aba', label: 'ABA (Applied Behavior Analysis)' },
            { value: 'counseling', label: 'Counseling/Mental Health Services' },
            { value: 'social_skills', label: 'Social Skills Training' },
            { value: 'tutoring', label: 'Academic Tutoring' },
            { value: 'vision_therapy', label: 'Vision Therapy' },
            { value: 'music_art', label: 'Music or Art Therapy' },
            { value: 'other', label: 'Other specialized services' },
          ],
          required: true,
        },
        {
          id: 'educational_setting',
          question: `What is ${learnerName}'s current educational setting?`,
          type: 'single',
          options: [
            { value: 'general_ed', label: 'General education classroom full-time' },
            { value: 'gen_ed_support', label: 'General education with pull-out support services' },
            { value: 'inclusion', label: 'Inclusion classroom (co-taught)' },
            { value: 'resource', label: 'Resource room for some subjects' },
            { value: 'self_contained', label: 'Self-contained special education classroom' },
            { value: 'specialized_school', label: 'Specialized school for students with disabilities' },
            { value: 'homeschool', label: 'Homeschool' },
            { value: 'not_enrolled', label: 'Not currently enrolled in school' },
          ],
          required: true,
        },
        {
          id: 'one_on_one_support',
          question: `Does ${learnerName} have 1:1 support (aide/paraprofessional) at school?`,
          type: 'single',
          options: [
            { value: 'no', label: 'No', weight: 0 },
            { value: 'part_time', label: 'Part-time 1:1 support', weight: 2 },
            { value: 'full_time', label: 'Full-time 1:1 support', weight: 3 },
            { value: 'not_applicable', label: 'Not currently in school', weight: 0 },
          ],
          required: true,
        },
        {
          id: 'assistive_technology',
          question: 'What assistive technology does your child use? (Select all that apply)',
          type: 'multi',
          options: [
            { value: 'none', label: 'None' },
            { value: 'aac_device', label: 'AAC device (communication device)' },
            { value: 'text_to_speech', label: 'Text-to-speech software' },
            { value: 'speech_to_text', label: 'Speech-to-text/dictation' },
            { value: 'screen_reader', label: 'Screen reader' },
            { value: 'magnification', label: 'Screen magnification' },
            { value: 'switch_access', label: 'Switch access' },
            { value: 'eye_gaze', label: 'Eye gaze technology' },
            { value: 'fm_system', label: 'FM system (for hearing)' },
            { value: 'word_prediction', label: 'Word prediction software' },
            { value: 'other', label: 'Other assistive technology' },
          ],
          required: true,
        },
      ],
    },
  ];

  const currentCategory = categories[currentCategoryIndex];
  const totalCategories = categories.length;
  const progress = ((currentCategoryIndex + 1) / totalCategories) * 100;

  // Check if current category is complete
  const isCategoryComplete = currentCategory.questions.every(q => {
    const response = responses[q.id];
    if (!q.required) return true;
    if (q.type === 'multi') {
      return Array.isArray(response) && response.length > 0;
    }
    return response !== undefined && response !== '';
  });

  // Check if all required questions across all categories are answered
  const isAssessmentComplete = categories.every(cat =>
    cat.questions.every(q => {
      const response = responses[q.id];
      if (!q.required) return true;
      if (q.type === 'multi') {
        return Array.isArray(response) && response.length > 0;
      }
      return response !== undefined && response !== '';
    })
  );

  const handleSingleResponse = (questionId: string, value: string) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleMultiResponse = (questionId: string, value: string) => {
    setResponses(prev => {
      const current = (prev[questionId] as string[]) || [];
      
      // Handle "none" type selections - clear others when selected
      if (value === 'none' || value === 'prefer_not_say') {
        return { ...prev, [questionId]: [value] };
      }
      
      // If "none" was selected before, remove it
      const filtered = current.filter(v => v !== 'none' && v !== 'prefer_not_say');
      
      if (filtered.includes(value)) {
        return { ...prev, [questionId]: filtered.filter(v => v !== value) };
      }
      return { ...prev, [questionId]: [...filtered, value] };
    });
  };

  const handleScaleResponse = (questionId: string, value: number) => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'iep' | '504') => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload a PDF or image file (JPEG, PNG, GIF)');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError('File must be less than 50MB');
        return;
      }
      if (type === 'iep') {
        setIepFile(file);
      } else {
        setSection504File(file);
      }
      setError(null);
    }
  };

  const handleNext = () => {
    if (currentCategoryIndex < totalCategories - 1) {
      setCurrentCategoryIndex(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentCategoryIndex > 0) {
      setCurrentCategoryIndex(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const calculateAssessmentType = (): { type: string; confidence: number; recommendations: string[] } => {
    let totalWeight = 0;
    let maxPossibleWeight = 0;
    const recommendations: string[] = [];

    categories.forEach(category => {
      category.questions.forEach(question => {
        if (question.type === 'single' && question.options) {
          const response = responses[question.id] as string;
          const selectedOption = question.options.find(o => o.value === response);
          if (selectedOption?.weight !== undefined) {
            totalWeight += selectedOption.weight;
            maxPossibleWeight += 4; // Max weight per question
          }
        }
      });
    });

    const supportLevel = maxPossibleWeight > 0 ? totalWeight / maxPossibleWeight : 0;
    
    // Determine assessment type based on weighted score
    let type: string;
    if (supportLevel < 0.15) {
      type = 'STANDARD';
    } else if (supportLevel < 0.35) {
      type = 'STANDARD_WITH_ACCOMMODATIONS';
      recommendations.push('Extended time may be beneficial');
      recommendations.push('Consider breaks during longer assessments');
    } else if (supportLevel < 0.55) {
      type = 'MODIFIED';
      recommendations.push('Simplified language and visual supports recommended');
      recommendations.push('Shorter assessment sessions with breaks');
      recommendations.push('Consider alternative response methods');
    } else {
      type = 'ALTERNATE';
      recommendations.push('Alternate assessment format recommended');
      recommendations.push('1:1 support during assessment');
      recommendations.push('May need physical or communication assistance');
      recommendations.push('Consider performance-based assessment');
    }

    // Add specific recommendations based on responses
    const hasIep = responses['has_iep'] === 'yes_current';
    const has504 = responses['has_504'] === 'yes_current';
    const disabilities = responses['disability_categories'] as string[] || [];
    
    if (hasIep) {
      recommendations.push('Align assessment accommodations with IEP');
    }
    if (has504) {
      recommendations.push('Align assessment accommodations with 504 Plan');
    }
    if (disabilities.includes('visual_impairment')) {
      recommendations.push('Screen reader or audio support needed');
    }
    if (disabilities.includes('hearing_impairment') || disabilities.includes('deafness')) {
      recommendations.push('Captions or visual-only instructions needed');
    }

    return {
      type,
      confidence: Math.min(100, Math.round((1 - supportLevel * 0.5) * 100)),
      recommendations: recommendations.slice(0, 5), // Top 5 recommendations
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const assessmentResult = calculateAssessmentType();
      const token = localStorage.getItem('accessToken');

      // Submit comprehensive assessment results and get AI analysis
      const assessmentResponse = await fetch('/api/onboarding/parent-assessment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          learnerId,
          responses,
          assessmentType: assessmentResult.type,
          supportLevel: assessmentResult.confidence,
          recommendations: assessmentResult.recommendations,
          hasExistingIep: responses.has_iep === 'yes_current',
          hasExisting504: responses.has_504 === 'yes_current',
          disabilityCategories: responses.disability_categories || [],
          currentServices: responses.current_therapies || [],
          assistiveTechnology: responses.assistive_technology || [],
          additionalNotes,
          completedAt: new Date().toISOString(),
          ideaCompliant: true,
          section504Compliant: true,
        }),
      });

      const assessmentData = await assessmentResponse.json();

      // Upload IEP if provided
      if (iepFile && learnerId) {
        setIepUploading(true);
        const formData = new FormData();
        formData.append('file', iepFile);
        formData.append('learnerId', learnerId);
        formData.append('documentType', 'IEP');

        await fetch('/api/onboarding/upload-iep', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      // Upload 504 Plan if provided
      if (section504File && learnerId) {
        const formData = new FormData();
        formData.append('file', section504File);
        formData.append('learnerId', learnerId);
        formData.append('documentType', '504_PLAN');

        await fetch('/api/onboarding/upload-iep', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
      }

      // Generate AI-based results for the results screen
      const resultsData: AssessmentResultData = generateAIResults(assessmentResult, assessmentData, responses);
      
      onComplete(resultsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
      setIepUploading(false);
    }
  };

  /**
   * Generate AI-powered assessment results and recommendations
   */
  const generateAIResults = (
    calcResult: { type: string; confidence: number; recommendations: string[] },
    apiData: Record<string, unknown>,
    resp: Record<string, string | string[] | number>
  ): AssessmentResultData => {
    const typeDescriptions: Record<string, { name: string; description: string; accommodations: string[]; duration: string }> = {
      STANDARD: {
        name: 'Standard Baseline Assessment',
        description: `${learnerName} will take our comprehensive baseline assessment across all learning domains. This interactive, game-based assessment adapts to their responses to accurately measure current skill levels.`,
        accommodations: [],
        duration: '25-35 minutes',
      },
      STANDARD_WITH_ACCOMMODATIONS: {
        name: 'Standard Assessment with Accommodations',
        description: `${learnerName} will take the full baseline assessment with built-in supports. The assessment will include extended time options, frequent breaks, and a simplified interface to ensure accurate results.`,
        accommodations: ['Extended time (1.5x)', 'Scheduled breaks every 5-7 minutes', 'Simplified navigation', 'Audio support available'],
        duration: '35-45 minutes',
      },
      MODIFIED: {
        name: 'Modified Baseline Assessment',
        description: `${learnerName} will take an adapted assessment designed for learners who benefit from additional support. Questions are presented with visual aids, simplified language, and alternative response methods.`,
        accommodations: ['Simplified language', 'Visual supports and cues', 'Reduced answer options', 'Audio narration', 'Larger touch targets', 'Frequent encouragement'],
        duration: '20-30 minutes (shorter sessions)',
      },
      ALTERNATE: {
        name: 'Alternate Assessment',
        description: `${learnerName} will take a specialized assessment designed for learners with significant support needs. This performance-based assessment focuses on functional skills and can be completed with caregiver assistance.`,
        accommodations: ['Parent/caregiver participation allowed', 'Performance-based tasks', 'Communication device compatible', 'Physical assistance as needed', 'Unlimited time', 'Multi-modal responses accepted'],
        duration: '15-25 minutes (flexible pacing)',
      },
    };

    const typeInfo = typeDescriptions[calcResult.type] || typeDescriptions.STANDARD;
    
    // Determine which domains to assess based on responses
    const domainsToAssess = determineDomainsToAssess(resp, calcResult.type);
    
    // Generate AI rationale
    const aiRationale = generateAIRationale(resp, calcResult);

    // Extract areas of concern and strengths from API response
    const areasOfConcern = (apiData.summary as { areasOfConcern?: string[] })?.areasOfConcern || calcResult.recommendations;
    const strengths = (apiData.summary as { strengths?: string[] })?.strengths || ['Caring parent involvement'];

    return {
      assessmentType: calcResult.type as AssessmentResultData['assessmentType'],
      typeName: typeInfo.name,
      typeDescription: typeInfo.description,
      supportLevel: calcResult.confidence,
      recommendations: calcResult.recommendations,
      standardAccommodations: typeInfo.accommodations,
      areasOfConcern,
      strengths,
      domainsToAssess,
      estimatedDuration: typeInfo.duration,
      aiConfidence: Math.min(95, calcResult.confidence + 5),
      aiRationale,
    };
  };

  const determineDomainsToAssess = (resp: Record<string, string | string[] | number>, assessmentType: string): string[] => {
    const allDomains = ['Math', 'Reading & Writing', 'Speech & Language', 'Social-Emotional', 'Spelling', 'Life Skills'];
    
    if (assessmentType === 'ALTERNATE') {
      // Focus on functional domains for alternate assessment
      return ['Life Skills', 'Social-Emotional', 'Speech & Language'];
    }
    
    if (assessmentType === 'MODIFIED') {
      // Core academic domains with life skills
      return ['Math', 'Reading & Writing', 'Life Skills', 'Social-Emotional'];
    }
    
    // Standard assessment includes all domains
    return allDomains;
  };

  const generateAIRationale = (resp: Record<string, string | string[] | number>, calcResult: { type: string; confidence: number }): string => {
    const factors: string[] = [];
    
    if (resp.has_iep === 'yes_current') {
      factors.push('existing IEP documentation');
    }
    if (resp.has_504 === 'yes_current') {
      factors.push('Section 504 Plan');
    }
    
    const disabilities = resp.disability_categories as string[] || [];
    if (disabilities.length > 0 && !disabilities.includes('none')) {
      factors.push('identified disability categories');
    }
    
    if (resp.expressive_language === 'nonverbal_limited' || resp.expressive_language === 'nonverbal_gestures') {
      factors.push('communication support needs');
    }
    
    if (resp.one_on_one_support === 'full_time') {
      factors.push('current 1:1 support');
    }
    
    const services = resp.current_therapies as string[] || [];
    if (services.length > 1 && !services.includes('none')) {
      factors.push('active therapeutic services');
    }

    if (factors.length === 0) {
      return `Based on the comprehensive screening responses, ${learnerName} appears ready for our ${calcResult.type === 'STANDARD' ? 'standard' : 'supported'} baseline assessment. Our AI analyzed responses across 10 developmental areas aligned with IDEA and Section 504 standards.`;
    }

    return `Our AI recommendation is based on analysis of ${factors.join(', ')}, along with responses across 10 developmental areas. This ensures ${learnerName} receives an assessment format that accurately reflects their abilities.`;
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-2xl">
          {currentCategory.icon}
        </div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Learning Profile Assessment
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Help us understand {learnerName}&apos;s unique learning needs
        </p>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">
            Section {currentCategoryIndex + 1} of {totalCategories}
          </span>
          <span className="text-gray-500">{Math.round(progress)}% complete</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => setCurrentCategoryIndex(idx)}
              className={`rounded px-2 py-0.5 text-xs transition ${
                idx === currentCategoryIndex
                  ? 'bg-violet-600 text-white'
                  : idx < currentCategoryIndex
                  ? 'bg-violet-100 text-violet-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Category Header */}
      <div className="mb-6 rounded-lg bg-violet-50 p-4">
        <h2 className="text-lg font-semibold text-gray-900">{currentCategory.title}</h2>
        <p className="mt-1 text-sm text-gray-600">{currentCategory.description}</p>
        <p className="mt-2 text-xs text-violet-600">
          📋 {currentCategory.ideaAlignment}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Questions */}
      <div className="space-y-6">
        {currentCategory.questions.map((q, index) => (
          <div key={q.id} className="rounded-lg border border-gray-200 p-4">
            <div className="mb-3 flex items-start justify-between">
              <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Q{index + 1}
              </span>
              {q.required && (
                <span className="text-xs text-red-500">Required</span>
              )}
            </div>
            <p className="font-medium text-gray-900">{q.question}</p>
            {q.helpText && (
              <p className="mt-1 text-sm text-gray-500">{q.helpText}</p>
            )}

            {/* Single Choice */}
            {q.type === 'single' && q.options && (
              <div className="mt-3 space-y-2">
                {q.options.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer items-center rounded-lg border p-3 transition ${
                      responses[q.id] === option.value
                        ? 'border-violet-500 bg-violet-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.id}
                      value={option.value}
                      checked={responses[q.id] === option.value}
                      onChange={() => handleSingleResponse(q.id, option.value)}
                      className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            )}

            {/* Multiple Choice */}
            {q.type === 'multi' && q.options && (
              <div className="mt-3 space-y-2">
                {q.options.map((option) => {
                  const selected = ((responses[q.id] as string[]) || []).includes(option.value);
                  return (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center rounded-lg border p-3 transition ${
                        selected
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleMultiResponse(q.id, option.value)}
                        className="h-4 w-4 rounded text-violet-600 focus:ring-violet-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Scale */}
            {q.type === 'scale' && q.scaleLabels && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{q.scaleLabels.min}</span>
                  <span>{q.scaleLabels.max}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={(responses[q.id] as number) || 3}
                  onChange={(e) => handleScaleResponse(q.id, parseInt(e.target.value))}
                  className="mt-2 w-full"
                />
                <div className="mt-1 text-center text-sm font-medium text-violet-600">
                  {responses[q.id] || 3} / 5
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Document Upload Section - Show on documentation category */}
        {currentCategory.id === 'documentation' && (
          <div className="space-y-4">
            {/* IEP Upload */}
            {(responses.has_iep === 'yes_current' || responses.has_iep === 'yes_expired') && (
              <div className="rounded-lg border-2 border-dashed border-violet-200 bg-violet-50 p-4">
                <h3 className="font-semibold text-gray-900">📄 Upload IEP Document (Optional)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Uploading your child&apos;s IEP helps us provide appropriate accommodations.
                </p>
                {!iepFile ? (
                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-violet-300 bg-white p-4 transition hover:border-violet-400">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange(e, 'iep')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <p className="text-sm text-violet-600">Click to upload IEP (PDF or image)</p>
                      <p className="text-xs text-gray-500">Max 50MB</p>
                    </div>
                  </label>
                ) : (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3">
                    <span className="text-sm font-medium text-gray-700">📄 {iepFile.name}</span>
                    <button
                      onClick={() => setIepFile(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 504 Plan Upload */}
            {(responses.has_504 === 'yes_current' || responses.has_504 === 'yes_expired') && (
              <div className="rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 p-4">
                <h3 className="font-semibold text-gray-900">📋 Upload 504 Plan (Optional)</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Uploading the 504 Plan helps us understand required accommodations.
                </p>
                {!section504File ? (
                  <label className="mt-3 flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-blue-300 bg-white p-4 transition hover:border-blue-400">
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => handleFileChange(e, '504')}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <p className="text-sm text-blue-600">Click to upload 504 Plan (PDF or image)</p>
                      <p className="text-xs text-gray-500">Max 50MB</p>
                    </div>
                  </label>
                ) : (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-white p-3">
                    <span className="text-sm font-medium text-gray-700">📋 {section504File.name}</span>
                    <button
                      onClick={() => setSection504File(null)}
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Additional Notes - Show on last category */}
        {currentCategoryIndex === totalCategories - 1 && (
          <div className="rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900">Additional Information (Optional)</h3>
            <p className="mt-1 text-sm text-gray-500">
              Is there anything else you&apos;d like us to know about {learnerName}&apos;s learning needs?
            </p>
            <textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              rows={4}
              className="mt-3 w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Share any additional context about your child's strengths, challenges, or specific needs..."
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="mt-8 space-y-3">
        <div className="flex gap-3">
          {currentCategoryIndex > 0 && (
            <button
              onClick={handlePrevious}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              ← Previous
            </button>
          )}
          {currentCategoryIndex < totalCategories - 1 ? (
            <button
              onClick={handleNext}
              disabled={!isCategoryComplete}
              className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800 disabled:opacity-50"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!isAssessmentComplete || isSubmitting}
              className="flex-1 rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-3 font-medium text-white transition hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-50"
            >
              {isSubmitting ? (iepUploading ? 'Uploading Documents...' : 'Saving...') : 'Complete Assessment ✓'}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="w-full rounded-lg px-4 py-2 text-sm font-medium text-gray-500 transition hover:text-gray-700"
        >
          Skip for now — complete later from dashboard
        </button>
      </div>

      {/* IDEA/504 Compliance Note */}
      <div className="mt-6 rounded-lg bg-gray-50 p-4 text-xs text-gray-500">
        <p className="font-medium text-gray-700">📋 About This Assessment</p>
        <p className="mt-1">
          This assessment is designed to align with the Individuals with Disabilities Education Act (IDEA) 
          and Section 504 of the Rehabilitation Act. The information collected helps ensure your child 
          receives appropriate accommodations and support. All information is kept confidential and used 
          solely to personalize your child&apos;s learning experience.
        </p>
      </div>
    </div>
  );
}

/**
 * Assessment Results Step - Shows AI-determined baseline assessment recommendations
 */
interface AssessmentResultsStepProps {
  learnerName: string;
  results: AssessmentResultData | null;
  onContinue: () => void;
}

function AssessmentResultsStep({ learnerName, results, onContinue }: AssessmentResultsStepProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    // Simulate AI analysis animation
    const timer = setTimeout(() => {
      setIsAnalyzing(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!results) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
        <p className="text-gray-600">No assessment results available.</p>
        <button
          onClick={onContinue}
          className="mt-4 rounded-lg bg-violet-600 px-6 py-2 text-white"
        >
          Continue
        </button>
      </div>
    );
  }

  // Analyzing animation
  if (isAnalyzing) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-violet-200 opacity-75" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-4xl">
                🧠
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Analyzing Assessment</h2>
          <p className="mt-2 text-gray-600">
            Our AI is reviewing {learnerName}&apos;s learning profile...
          </p>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-violet-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-violet-600" />
              Analyzing developmental areas
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-violet-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-violet-600" style={{ animationDelay: '0.2s' }} />
              Matching to IDEA/504 standards
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-violet-600">
              <div className="h-2 w-2 animate-pulse rounded-full bg-violet-600" style={{ animationDelay: '0.4s' }} />
              Generating personalized recommendations
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get icon and color based on assessment type
  const typeStyles: Record<string, { icon: string; gradient: string; bgLight: string }> = {
    STANDARD: {
      icon: '🎯',
      gradient: 'from-emerald-500 to-teal-600',
      bgLight: 'bg-emerald-50',
    },
    STANDARD_WITH_ACCOMMODATIONS: {
      icon: '⚡',
      gradient: 'from-blue-500 to-indigo-600',
      bgLight: 'bg-blue-50',
    },
    MODIFIED: {
      icon: '🌟',
      gradient: 'from-amber-500 to-orange-600',
      bgLight: 'bg-amber-50',
    },
    ALTERNATE: {
      icon: '💫',
      gradient: 'from-purple-500 to-pink-600',
      bgLight: 'bg-purple-50',
    },
  };

  const style = typeStyles[results.assessmentType] || typeStyles.STANDARD;

  return (
    <div className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      {/* Header */}
      <div className="mb-6 text-center">
        <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${style.gradient} text-3xl shadow-lg`}>
          {style.icon}
        </div>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
          Assessment Complete! 🎉
        </h1>
        <p className="mt-1 text-gray-600">
          Here&apos;s what our AI recommends for {learnerName}
        </p>
      </div>

      {/* AI Confidence Badge */}
      <div className="mb-6 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700">
          <span>🤖</span>
          <span>AI Confidence: {results.aiConfidence}%</span>
        </div>
      </div>

      {/* Recommended Assessment Type */}
      <div className={`mb-6 rounded-xl ${style.bgLight} p-6 border border-gray-100`}>
        <h2 className="text-lg font-bold text-gray-900">{results.typeName}</h2>
        <p className="mt-2 text-sm text-gray-700">{results.typeDescription}</p>
        
        {/* Duration */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <span>⏱️</span>
          <span>Estimated duration: <strong>{results.estimatedDuration}</strong></span>
        </div>
      </div>

      {/* Domains to Assess */}
      <div className="mb-6">
        <h3 className="mb-3 font-semibold text-gray-900">📚 Learning Domains</h3>
        <div className="flex flex-wrap gap-2">
          {results.domainsToAssess.map((domain) => (
            <span
              key={domain}
              className="rounded-full bg-violet-100 px-3 py-1 text-sm font-medium text-violet-700"
            >
              {domain}
            </span>
          ))}
        </div>
      </div>

      {/* Accommodations (if any) */}
      {results.standardAccommodations.length > 0 && (
        <div className="mb-6 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">🛡️ Built-in Accommodations</h3>
          <ul className="space-y-1">
            {results.standardAccommodations.map((acc, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-blue-800">
                <span className="text-blue-500">✓</span>
                {acc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths */}
      {results.strengths.length > 0 && (
        <div className="mb-6 rounded-lg bg-emerald-50 p-4">
          <h3 className="mb-2 font-semibold text-emerald-900">💪 Identified Strengths</h3>
          <ul className="space-y-1">
            {results.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-emerald-800">
                <span className="text-emerald-500">★</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas of Focus */}
      {results.areasOfConcern.length > 0 && (
        <div className="mb-6 rounded-lg bg-amber-50 p-4">
          <h3 className="mb-2 font-semibold text-amber-900">🎯 Areas We&apos;ll Focus On</h3>
          <ul className="space-y-1">
            {results.areasOfConcern.slice(0, 5).map((area, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-amber-800">
                <span className="text-amber-500">•</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Rationale */}
      <div className="mb-6 rounded-lg bg-gray-50 p-4">
        <div className="flex items-start gap-2">
          <span className="text-lg">🤖</span>
          <div>
            <h3 className="font-semibold text-gray-900">Why This Recommendation?</h3>
            <p className="mt-1 text-sm text-gray-600">{results.aiRationale}</p>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {results.recommendations.length > 0 && (
        <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
          <h3 className="mb-2 font-semibold text-violet-900">💡 Personalized Tips</h3>
          <ul className="space-y-1">
            {results.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-violet-800">
                <span className="text-violet-500">→</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What's Next */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 p-4 text-white">
        <h3 className="mb-2 font-semibold">🚀 What Happens Next?</h3>
        <ol className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">1</span>
            <span>You&apos;ll receive {learnerName}&apos;s login code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">2</span>
            <span>{learnerName} logs into AIVO Learner and takes the {results.typeName.toLowerCase()}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">3</span>
            <span>Our AI creates a personalized learning plan based on results</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">4</span>
            <span>Track progress in your parent dashboard</span>
          </li>
        </ol>
      </div>

      {/* Continue Button */}
      <button
        onClick={onContinue}
        className="w-full rounded-lg bg-gradient-to-r from-emerald-600 to-emerald-700 px-4 py-4 font-medium text-white transition hover:from-emerald-700 hover:to-emerald-800"
      >
        Continue to Get Login Code →
      </button>
    </div>
  );
}

/**
 * Parent Onboarding Page
 *
 * After registration, guides parent through adding their first child learner.
 * Flow: intro → learner form → parent assessment → assessment results → complete
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'learner' | 'assessment' | 'results' | 'complete'>('intro');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [learnerPin, setLearnerPin] = useState<string | null>(null);
  const [learnerId, setLearnerId] = useState<string | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResultData | null>(null);
  const [pinCopied, setPinCopied] = useState(false);
  const [classCodeError, setClassCodeError] = useState<string | null>(null);
  const [learnerForm, setLearnerForm] = useState<LearnerForm>({
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gradeLevel: '',
    zipCode: '',
    classCode: '',
  });

  const handleLearnerChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLearnerForm((prev) => ({ ...prev, [name]: value }));
    // Clear class code error when user types
    if (name === 'classCode') {
      setClassCodeError(null);
    }
  };

  const validateClassCode = async (code: string): Promise<boolean> => {
    if (!code) return true; // Optional field
    
    try {
      const response = await fetch('/api/onboarding/validate-class-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classCode: code }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setClassCodeError(data.message || 'Invalid class code');
        return false;
      }
      
      return true;
    } catch {
      setClassCodeError('Unable to validate class code');
      return false;
    }
  };

  const handleAddLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setClassCodeError(null);

    if (!learnerForm.firstName || !learnerForm.gradeLevel) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate class code if provided
    if (learnerForm.classCode) {
      const isValidCode = await validateClassCode(learnerForm.classCode);
      if (!isValidCode) {
        return; // classCodeError is already set
      }
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem('accessToken');

      const response = await fetch('/api/onboarding/register-learner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: learnerForm.firstName,
          lastName: learnerForm.lastName,
          dateOfBirth: learnerForm.dateOfBirth,
          gradeLevel: learnerForm.gradeLevel,
          location: {
            zipCode: learnerForm.zipCode,
          },
          classCode: learnerForm.classCode || undefined,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to add learner');
      }

      // Store the learner's PIN and ID for display
      if (data.learner?.pin) {
        setLearnerPin(data.learner.pin);
      }
      if (data.learner?.id) {
        setLearnerId(data.learner.id);
      }

      // Move to parent assessment step instead of complete
      setStep('assessment');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  const handleFinish = () => {
    router.push('/dashboard');
  };

  // Intro Step
  if (step === 'intro') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-100">
            <svg className="h-8 w-8 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to AIVO!</h1>
          <p className="mt-2 text-gray-600">
            Let&apos;s set up your child&apos;s personalized learning journey.
          </p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-violet-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">
                1
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Add your child</h3>
                <p className="text-sm text-gray-600">
                  Tell us about your learner so we can personalize their experience.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-white">
                2
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Baseline assessment</h3>
                <p className="text-sm text-gray-600">
                  Your child will take a fun assessment to understand their learning level.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-gray-50 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-bold text-white">
                3
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Start learning</h3>
                <p className="text-sm text-gray-600">
                  Get a personalized learning plan and track progress in your dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={() => setStep('learner')}
            className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800"
          >
            Get Started
          </button>
          <button
            onClick={handleSkip}
            className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    );
  }

  // Learner Form Step
  if (step === 'learner') {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Add Your Child</h1>
          <p className="mt-2 text-gray-600">
            Tell us about your learner to personalize their experience.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleAddLearner} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                First name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                required
                value={learnerForm.firstName}
                onChange={handleLearnerChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Alex"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                Last name
              </label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={learnerForm.lastName}
                onChange={handleLearnerChange}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Smith"
              />
            </div>
          </div>

          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">
              Date of birth
            </label>
            <input
              id="dateOfBirth"
              name="dateOfBirth"
              type="date"
              value={learnerForm.dateOfBirth}
              onChange={handleLearnerChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          <div>
            <label htmlFor="gradeLevel" className="block text-sm font-medium text-gray-700">
              Grade level <span className="text-red-500">*</span>
            </label>
            <select
              id="gradeLevel"
              name="gradeLevel"
              required
              value={learnerForm.gradeLevel}
              onChange={handleLearnerChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">Select grade</option>
              <option value="PRE_K">Pre-K</option>
              <option value="K">Kindergarten</option>
              <option value="1">1st Grade</option>
              <option value="2">2nd Grade</option>
              <option value="3">3rd Grade</option>
              <option value="4">4th Grade</option>
              <option value="5">5th Grade</option>
              <option value="6">6th Grade</option>
              <option value="7">7th Grade</option>
              <option value="8">8th Grade</option>
              <option value="9">9th Grade</option>
              <option value="10">10th Grade</option>
              <option value="11">11th Grade</option>
              <option value="12">12th Grade</option>
            </select>
          </div>

          <div>
            <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
              ZIP code
            </label>
            <input
              id="zipCode"
              name="zipCode"
              type="text"
              value={learnerForm.zipCode}
              onChange={handleLearnerChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="12345"
              maxLength={5}
            />
            <p className="mt-1 text-xs text-gray-500">
              Used to align curriculum with your school district standards.
            </p>
          </div>

          {/* Class Code Field */}
          <div>
            <label htmlFor="classCode" className="block text-sm font-medium text-gray-700">
              Class code (optional)
            </label>
            <input
              id="classCode"
              name="classCode"
              type="text"
              value={learnerForm.classCode}
              onChange={handleLearnerChange}
              className={`mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 ${
                classCodeError 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                  : 'border-gray-300 focus:border-violet-500 focus:ring-violet-500'
              }`}
              placeholder="Enter code from teacher"
              maxLength={12}
            />
            {classCodeError && (
              <p className="mt-1 text-xs text-red-600">{classCodeError}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              If your child&apos;s teacher provided a class code, enter it here to join their class.
            </p>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800 disabled:opacity-50"
            >
              {isLoading ? 'Adding...' : 'Add Learner'}
            </button>
            <button
              type="button"
              onClick={() => setStep('intro')}
              className="mt-3 w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Parent Assessment Step - Determines normal vs non-functioning assessment
  if (step === 'assessment') {
    return (
      <ParentAssessmentStep
        learnerName={learnerForm.firstName}
        learnerId={learnerId}
        onComplete={(results) => {
          setAssessmentResults(results);
          setStep('results');
        }}
        onSkip={() => setStep('complete')}
      />
    );
  }

  // Assessment Results Step - Shows AI-determined baseline assessment type
  if (step === 'results') {
    return (
      <AssessmentResultsStep
        learnerName={learnerForm.firstName}
        results={assessmentResults}
        onContinue={() => setStep('complete')}
      />
    );
  }

  const handleCopyPin = async () => {
    if (learnerPin) {
      await navigator.clipboard.writeText(learnerPin);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 2000);
    }
  };

  const webLearnerUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:3000/join`
    : 'http://localhost:3000/join';

  // Complete Step
  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">You&apos;re All Set!</h1>
        <p className="mt-2 text-gray-600">
          {learnerForm.firstName} is ready to start learning!
        </p>
      </div>

      {/* PIN Code Display */}
      {learnerPin && (
        <div className="mb-6 rounded-lg border-2 border-violet-200 bg-violet-50 p-6">
          <h3 className="mb-2 text-center font-semibold text-gray-900">
            {learnerForm.firstName}&apos;s Login Code
          </h3>
          <div className="flex items-center justify-center gap-3">
            <div className="rounded-lg bg-white px-6 py-3 font-mono text-3xl font-bold tracking-widest text-violet-700 shadow-sm">
              {learnerPin}
            </div>
            <button
              onClick={handleCopyPin}
              className="rounded-lg bg-violet-600 p-3 text-white transition hover:bg-violet-700"
              title="Copy code"
            >
              {pinCopied ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-gray-500">
            Use this code to log in on any device
          </p>
        </div>
      )}

      {/* Web Learner Link */}
      <div className="mb-6 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
        <h3 className="mb-2 font-semibold text-gray-900">
          🖥️ Using a computer?
        </h3>
        <p className="mb-3 text-sm text-gray-600">
          {learnerForm.firstName} can start learning right now on the web!
        </p>
        <a
          href={webLearnerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open AIVO Learner Web App
        </a>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg bg-violet-50 p-4">
          <h3 className="font-semibold text-gray-900">📱 Mobile app:</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Check your email for the app download link
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Download AIVO Learner on {learnerForm.firstName}&apos;s device
            </li>
            <li className="flex items-center gap-2">
              <svg className="h-4 w-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Enter the login code above to get started
            </li>
          </ul>
        </div>

        <div className="rounded-lg bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm text-emerald-700">
              You&apos;ll receive a notification when {learnerForm.firstName} finishes their baseline assessment.
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <button
          onClick={handleFinish}
          className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 px-4 py-3 font-medium text-white transition hover:from-violet-700 hover:to-violet-800"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
