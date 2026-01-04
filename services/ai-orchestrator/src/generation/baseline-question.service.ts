/**
 * Baseline Question Generation Service
 *
 * AI-powered unique question generation for learner baseline assessments.
 * Generates personalized questions for each learner to accurately assess
 * their current skill levels across domains.
 */

import { v4 as uuidv4 } from 'uuid';

import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type GradeBand = 'K5' | 'G6_8' | 'G9_12';
export type BaselineDomain = 'ELA' | 'MATH' | 'SCIENCE' | 'SPEECH' | 'SEL';

export interface BaselineQuestionRequest {
  tenantId: string;
  learnerId: string;
  gradeBand: GradeBand;
  domain: BaselineDomain;
  skillCodes: string[];
  /** Optional seed for reproducible randomization (for testing) */
  seed?: string;
}

export interface BaselineQuestion {
  skillCode: string;
  questionType: 'MULTIPLE_CHOICE' | 'OPEN_ENDED';
  questionText: string;
  options?: string[];
  correctAnswer: number | string;
  rubric?: string;
}

export interface BaselineQuestionResult {
  questions: BaselineQuestion[];
  generationId: string;
  learnerId: string;
  domain: BaselineDomain;
  gradeBand: GradeBand;
}

// ══════════════════════════════════════════════════════════════════════════════
// SKILL DESCRIPTIONS
// ══════════════════════════════════════════════════════════════════════════════

const SKILL_DESCRIPTIONS: Record<string, { name: string; description: string; sampleTopics: string[] }> = {
  // ELA Skills
  ELA_PHONEMIC_AWARENESS: {
    name: 'Phonemic Awareness',
    description: 'Ability to identify and manipulate individual sounds in spoken words',
    sampleTopics: ['rhyming', 'syllable counting', 'initial sounds', 'blending sounds'],
  },
  ELA_FLUENCY: {
    name: 'Reading Fluency',
    description: 'Ability to read text accurately, quickly, and with proper expression',
    sampleTopics: ['sight words', 'reading rate', 'expression', 'punctuation reading'],
  },
  ELA_VOCABULARY: {
    name: 'Vocabulary',
    description: 'Knowledge of word meanings and ability to use context clues',
    sampleTopics: ['word definitions', 'synonyms', 'antonyms', 'context clues', 'word relationships'],
  },
  ELA_COMPREHENSION: {
    name: 'Reading Comprehension',
    description: 'Ability to understand, analyze, and interpret text',
    sampleTopics: ['main idea', 'supporting details', 'inference', 'sequence', 'cause and effect'],
  },
  ELA_WRITING: {
    name: 'Writing Skills',
    description: 'Ability to express ideas clearly in written form',
    sampleTopics: ['sentence structure', 'paragraph organization', 'grammar', 'punctuation'],
  },

  // Math Skills
  MATH_NUMBER_SENSE: {
    name: 'Number Sense',
    description: 'Understanding of numbers, their relationships, and place value',
    sampleTopics: ['place value', 'number comparison', 'ordering numbers', 'rounding'],
  },
  MATH_OPERATIONS: {
    name: 'Operations',
    description: 'Ability to perform and understand arithmetic operations',
    sampleTopics: ['addition', 'subtraction', 'multiplication', 'division', 'order of operations'],
  },
  MATH_FRACTIONS: {
    name: 'Fractions & Decimals',
    description: 'Understanding of fractions, decimals, and their relationships',
    sampleTopics: ['fraction identification', 'equivalent fractions', 'decimals', 'conversions'],
  },
  MATH_GEOMETRY: {
    name: 'Geometry',
    description: 'Understanding of shapes, spatial relationships, and measurement',
    sampleTopics: ['shape identification', 'perimeter', 'area', 'angles', 'symmetry'],
  },
  MATH_PROBLEM_SOLVING: {
    name: 'Problem Solving',
    description: 'Ability to apply mathematical concepts to solve word problems',
    sampleTopics: ['word problems', 'multi-step problems', 'logical reasoning', 'patterns'],
  },

  // Science Skills
  SCI_OBSERVATION: {
    name: 'Scientific Observation',
    description: 'Ability to observe and describe natural phenomena',
    sampleTopics: ['using senses', 'recording observations', 'qualitative vs quantitative'],
  },
  SCI_HYPOTHESIS: {
    name: 'Hypothesis Formation',
    description: 'Ability to form testable predictions based on observations',
    sampleTopics: ['if-then statements', 'predictions', 'testable questions'],
  },
  SCI_EXPERIMENT: {
    name: 'Experimental Design',
    description: 'Understanding of how to design and conduct experiments',
    sampleTopics: ['variables', 'controls', 'fair tests', 'procedures'],
  },
  SCI_DATA: {
    name: 'Data Analysis',
    description: 'Ability to collect, organize, and interpret scientific data',
    sampleTopics: ['tables', 'graphs', 'measurements', 'patterns in data'],
  },
  SCI_CONCLUSION: {
    name: 'Drawing Conclusions',
    description: 'Ability to draw evidence-based conclusions from experiments',
    sampleTopics: ['evidence', 'reasoning', 'supporting claims', 'limitations'],
  },

  // Speech Skills
  SPEECH_ARTICULATION: {
    name: 'Articulation',
    description: 'Ability to produce speech sounds correctly',
    sampleTopics: ['consonant sounds', 'vowel sounds', 'blends', 'pronunciation'],
  },
  SPEECH_FLUENCY: {
    name: 'Speech Fluency',
    description: 'Smoothness and flow of speech production',
    sampleTopics: ['pacing', 'pausing', 'repetitions', 'prolongations'],
  },
  SPEECH_VOICE: {
    name: 'Voice Quality',
    description: 'Quality and characteristics of voice production',
    sampleTopics: ['volume', 'pitch', 'resonance', 'breath support'],
  },
  SPEECH_LANGUAGE: {
    name: 'Language Skills',
    description: 'Ability to understand and use language effectively',
    sampleTopics: ['vocabulary use', 'grammar in speech', 'sentence formation', 'word finding'],
  },
  SPEECH_PRAGMATICS: {
    name: 'Social Communication',
    description: 'Ability to use language appropriately in social contexts',
    sampleTopics: ['turn-taking', 'topic maintenance', 'nonverbal cues', 'audience awareness'],
  },

  // SEL Skills
  SEL_SELF_AWARENESS: {
    name: 'Self-Awareness',
    description: 'Ability to recognize own emotions, thoughts, and values',
    sampleTopics: ['identifying emotions', 'self-reflection', 'strengths and weaknesses', 'confidence'],
  },
  SEL_SELF_MANAGEMENT: {
    name: 'Self-Management',
    description: 'Ability to regulate emotions and behaviors',
    sampleTopics: ['impulse control', 'stress management', 'goal setting', 'organization'],
  },
  SEL_SOCIAL_AWARENESS: {
    name: 'Social Awareness',
    description: 'Ability to understand perspectives of others',
    sampleTopics: ['empathy', 'respect for others', 'diversity appreciation', 'community awareness'],
  },
  SEL_RELATIONSHIPS: {
    name: 'Relationship Skills',
    description: 'Ability to build and maintain healthy relationships',
    sampleTopics: ['communication', 'cooperation', 'conflict resolution', 'teamwork'],
  },
  SEL_DECISIONS: {
    name: 'Responsible Decision-Making',
    description: 'Ability to make constructive choices',
    sampleTopics: ['identifying problems', 'evaluating consequences', 'ethical responsibility', 'seeking help'],
  },
};

const GRADE_BAND_DESCRIPTIONS: Record<GradeBand, { grades: string; ageRange: string; complexity: string }> = {
  K5: {
    grades: 'Kindergarten through 5th grade',
    ageRange: '5-11 years old',
    complexity: 'Simple language, concrete concepts, visual/hands-on focus',
  },
  G6_8: {
    grades: '6th through 8th grade',
    ageRange: '11-14 years old',
    complexity: 'Moderate complexity, abstract thinking introduced, multi-step problems',
  },
  G9_12: {
    grades: '9th through 12th grade',
    ageRange: '14-18 years old',
    complexity: 'Advanced concepts, critical thinking, complex analysis',
  },
};

const BASELINE_SYSTEM_PROMPT = `You are an expert educational assessment designer creating baseline diagnostic questions.

Your goal is to generate questions that accurately assess a learner's current skill level without teaching.

Key principles:
1. Questions must be diagnostic, not instructional
2. Language should be grade-appropriate
3. Questions should be unambiguous with clear correct answers
4. Multiple choice options should include plausible distractors based on common misconceptions
5. Questions should be engaging and accessible
6. Each question should uniquely test the specified skill
7. Avoid trick questions or unnecessarily complex wording`;

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

export class BaselineQuestionGenerationService {
  constructor(private llm: LLMOrchestrator) {}

  /**
   * Generate unique baseline questions for a learner
   */
  async generateQuestions(request: BaselineQuestionRequest): Promise<BaselineQuestionResult> {
    const generationId = uuidv4();
    const startTime = Date.now();

    console.info('Starting baseline question generation', {
      generationId,
      learnerId: request.learnerId,
      domain: request.domain,
      gradeBand: request.gradeBand,
      skillCount: request.skillCodes.length,
    });

    try {
      incrementCounter('baseline_question_generation.started');

      const prompt = this.buildPrompt(request, generationId);
      const messages: LLMMessage[] = [
        { role: 'system', content: BASELINE_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.8, // Higher temperature for more variety
        maxTokens: 4000,
        metadata: {
          tenantId: request.tenantId,
          userId: request.learnerId,
          agentType: 'BASELINE',
        },
      });

      const questions = this.parseResponse(result.content, request.skillCodes);
      const validQuestions = this.validateAndFixQuestions(questions, request.skillCodes);

      // Randomize answer option order for each question
      const randomizedQuestions = this.randomizeOptions(validQuestions, request.seed);

      const latencyMs = Date.now() - startTime;
      recordHistogram('baseline_question_generation.duration', latencyMs);
      incrementCounter('baseline_question_generation.success');

      console.info('Baseline question generation completed', {
        generationId,
        learnerId: request.learnerId,
        generated: randomizedQuestions.length,
        latencyMs,
      });

      return {
        questions: randomizedQuestions,
        generationId,
        learnerId: request.learnerId,
        domain: request.domain,
        gradeBand: request.gradeBand,
      };
    } catch (error) {
      incrementCounter('baseline_question_generation.error');
      console.error('Baseline question generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(request: BaselineQuestionRequest, generationId: string): string {
    const gradeBandInfo = GRADE_BAND_DESCRIPTIONS[request.gradeBand];

    const parts: string[] = [
      `Generate ${request.skillCodes.length} unique baseline assessment questions for a learner.`,
      '',
      '═══ CONTEXT ═══',
      `Domain: ${request.domain}`,
      `Grade Band: ${gradeBandInfo.grades} (${gradeBandInfo.ageRange})`,
      `Complexity Level: ${gradeBandInfo.complexity}`,
      `Unique Generation ID: ${generationId}`,
      `Learner ID: ${request.learnerId}`,
      '',
      '═══ SKILLS TO ASSESS ═══',
    ];

    for (const skillCode of request.skillCodes) {
      const skill = SKILL_DESCRIPTIONS[skillCode];
      if (skill) {
        parts.push(`\n${skillCode}:`);
        parts.push(`  Name: ${skill.name}`);
        parts.push(`  Description: ${skill.description}`);
        parts.push(`  Sample Topics: ${skill.sampleTopics.join(', ')}`);
      } else {
        parts.push(`\n${skillCode}: (custom skill)`);
      }
    }

    parts.push('');
    parts.push('═══ REQUIREMENTS ═══');
    parts.push('1. Generate exactly ONE question per skill code');
    parts.push('2. Each question must be unique (do not reuse questions from previous assessments)');
    parts.push('3. Most questions should be MULTIPLE_CHOICE with 4 options (A, B, C, D)');
    parts.push('4. Include 1-2 OPEN_ENDED questions for writing/verbal skills if appropriate');
    parts.push('5. For MULTIPLE_CHOICE: correctAnswer is the index (0-3) of the correct option');
    parts.push('6. For OPEN_ENDED: correctAnswer is a sample correct response, include a rubric');
    parts.push('7. Make distractors plausible - based on common misconceptions');
    parts.push('8. Language must be appropriate for the grade band');
    parts.push('9. Questions should be clear, concise, and unambiguous');
    parts.push('');
    parts.push('═══ RESPONSE FORMAT ═══');
    parts.push('Respond with valid JSON:');
    parts.push(`{
  "questions": [
    {
      "skillCode": "SKILL_CODE",
      "questionType": "MULTIPLE_CHOICE",
      "questionText": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0
    },
    {
      "skillCode": "SKILL_CODE",
      "questionType": "OPEN_ENDED",
      "questionText": "The open-ended question here?",
      "correctAnswer": "Sample correct response",
      "rubric": "Scoring rubric for evaluating responses"
    }
  ]
}`);

    return parts.join('\n');
  }

  /**
   * Parse the LLM response into questions
   */
  private parseResponse(content: string, expectedSkillCodes: string[]): BaselineQuestion[] {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('No JSON found in baseline question response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as { questions?: unknown[] };
      const rawQuestions = parsed.questions ?? [];

      return rawQuestions.map((q) => {
        const question = q as Record<string, unknown>;
        const questionType = (question.questionType as string) === 'OPEN_ENDED'
          ? 'OPEN_ENDED'
          : 'MULTIPLE_CHOICE';

        return {
          skillCode: (question.skillCode as string) ?? expectedSkillCodes[0],
          questionType,
          questionText: (question.questionText as string) ?? '',
          options: questionType === 'MULTIPLE_CHOICE'
            ? (question.options as string[]) ?? ['A', 'B', 'C', 'D']
            : undefined,
          correctAnswer: question.correctAnswer as number | string ?? 0,
          rubric: questionType === 'OPEN_ENDED'
            ? (question.rubric as string)
            : undefined,
        };
      });
    } catch (error) {
      console.error('Failed to parse baseline question response', { error });
      return [];
    }
  }

  /**
   * Validate questions and fill in missing ones
   */
  private validateAndFixQuestions(
    questions: BaselineQuestion[],
    expectedSkillCodes: string[]
  ): BaselineQuestion[] {
    const result: BaselineQuestion[] = [];
    const coveredSkills = new Set<string>();

    // Add valid parsed questions
    for (const q of questions) {
      if (!q.questionText || q.questionText.length < 10) continue;

      if (q.questionType === 'MULTIPLE_CHOICE') {
        if (!q.options || q.options.length < 2) continue;
        if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
          q.correctAnswer = 0; // Default to first option if invalid
        }
      }

      if (expectedSkillCodes.includes(q.skillCode) && !coveredSkills.has(q.skillCode)) {
        coveredSkills.add(q.skillCode);
        result.push(q);
      }
    }

    // Generate fallback questions for missing skills
    for (const skillCode of expectedSkillCodes) {
      if (!coveredSkills.has(skillCode)) {
        const skill = SKILL_DESCRIPTIONS[skillCode];
        result.push({
          skillCode,
          questionType: 'MULTIPLE_CHOICE',
          questionText: skill
            ? `Which of the following best demonstrates understanding of ${skill.name.toLowerCase()}?`
            : `Which answer best demonstrates the skill: ${skillCode}?`,
          options: [
            'I can demonstrate this skill independently',
            'I need some help with this skill',
            'I am still learning this skill',
            'I have not yet learned this skill',
          ],
          correctAnswer: 0,
        });
      }
    }

    return result;
  }

  /**
   * Randomize option order while tracking correct answer
   */
  private randomizeOptions(questions: BaselineQuestion[], seed?: string): BaselineQuestion[] {
    return questions.map((q, qIndex) => {
      if (q.questionType !== 'MULTIPLE_CHOICE' || !q.options) {
        return q;
      }

      // Create a seeded random for reproducibility in tests
      const seedValue = seed
        ? this.hashString(`${seed}-${qIndex}`)
        : Date.now() + qIndex;

      const correctIndex = typeof q.correctAnswer === 'number' ? q.correctAnswer : 0;
      const correctOption = q.options[correctIndex];

      // Fisher-Yates shuffle with seeded random
      const shuffled = [...q.options];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = this.seededRandom(seedValue + i) % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      // Find new position of correct answer
      const newCorrectIndex = shuffled.indexOf(correctOption);

      return {
        ...q,
        options: shuffled,
        correctAnswer: newCorrectIndex,
      };
    });
  }

  /**
   * Simple hash function for seeding
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Simple seeded random
   */
  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return Math.floor((x - Math.floor(x)) * 1000000);
  }
}
