/**
 * Content Validator
 *
 * Validates AI-generated educational content for:
 * - Accuracy and appropriateness
 * - Grade-level alignment
 * - Learning objective coverage
 * - Accessibility compliance
 */

import type { GeneratedBlock, GradeLevel } from '../generation/types.js';

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  location?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

interface LessonValidationInput {
  title: string;
  objectives: string[];
  blocks: GeneratedBlock[];
  gradeLevel: GradeLevel;
}

interface QuestionValidationInput {
  stem: string;
  options?: Array<{ text: string; correct: boolean }>;
  type: string;
  gradeLevel: GradeLevel;
}

// Grade level reading complexity expectations
const GRADE_COMPLEXITY: Record<string, { maxSentenceLength: number; maxWordLength: number }> = {
  k: { maxSentenceLength: 8, maxWordLength: 5 },
  '1': { maxSentenceLength: 10, maxWordLength: 6 },
  '2': { maxSentenceLength: 12, maxWordLength: 6 },
  '3': { maxSentenceLength: 14, maxWordLength: 7 },
  '4': { maxSentenceLength: 16, maxWordLength: 7 },
  '5': { maxSentenceLength: 18, maxWordLength: 8 },
  '6': { maxSentenceLength: 20, maxWordLength: 8 },
  '7': { maxSentenceLength: 22, maxWordLength: 9 },
  '8': { maxSentenceLength: 24, maxWordLength: 9 },
  '9': { maxSentenceLength: 26, maxWordLength: 10 },
  '10': { maxSentenceLength: 28, maxWordLength: 10 },
  '11': { maxSentenceLength: 30, maxWordLength: 11 },
  '12': { maxSentenceLength: 32, maxWordLength: 11 },
  college: { maxSentenceLength: 35, maxWordLength: 12 },
};

// Inappropriate content patterns
const INAPPROPRIATE_PATTERNS = [
  /\b(violence|violent|kill|murder|weapon|gun|bomb)\b/gi,
  /\b(drug|cocaine|heroin|marijuana|cannabis)\b/gi,
  /\b(sex|sexual|nude|naked|porn)\b/gi,
  /\b(hate|racist|sexist|discriminat)\b/gi,
  /\b(suicide|self-harm|cutting)\b/gi,
];

// Educational action verbs for objectives (Bloom's taxonomy)
const ACTION_VERBS = [
  // Remember
  'define', 'describe', 'identify', 'label', 'list', 'match', 'name', 'recall', 'recognize', 'select', 'state',
  // Understand
  'classify', 'compare', 'contrast', 'demonstrate', 'explain', 'illustrate', 'interpret', 'paraphrase', 'summarize',
  // Apply
  'apply', 'calculate', 'construct', 'develop', 'implement', 'modify', 'operate', 'predict', 'produce', 'solve', 'use',
  // Analyze
  'analyze', 'categorize', 'differentiate', 'distinguish', 'examine', 'infer', 'organize', 'outline', 'research',
  // Evaluate
  'appraise', 'argue', 'assess', 'conclude', 'critique', 'defend', 'evaluate', 'judge', 'justify', 'support',
  // Create
  'combine', 'compose', 'create', 'design', 'devise', 'formulate', 'generate', 'integrate', 'invent', 'plan', 'propose',
];

export class ContentValidator {
  /**
   * Validate a generated lesson
   */
  async validateLesson(input: LessonValidationInput): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Validate title
    if (!input.title || input.title.length < 5) {
      issues.push({
        type: 'error',
        code: 'INVALID_TITLE',
        message: 'Lesson title is missing or too short',
        severity: 'high',
      });
    }

    // Validate objectives
    if (!input.objectives || input.objectives.length === 0) {
      issues.push({
        type: 'error',
        code: 'NO_OBJECTIVES',
        message: 'Lesson must have at least one learning objective',
        severity: 'high',
      });
    } else {
      const objectiveValidation = this.validateObjectives(input.objectives);
      issues.push(...objectiveValidation.issues);
      warnings.push(...objectiveValidation.warnings);
      suggestions.push(...objectiveValidation.suggestions);
    }

    // Validate blocks
    if (!input.blocks || input.blocks.length === 0) {
      issues.push({
        type: 'error',
        code: 'NO_CONTENT',
        message: 'Lesson must have content blocks',
        severity: 'critical',
      });
    } else {
      const blockValidation = this.validateBlocks(input.blocks, input.gradeLevel);
      issues.push(...blockValidation.issues);
      warnings.push(...blockValidation.warnings);
    }

    // Check for inappropriate content
    const allText = this.extractAllText(input);
    const contentCheck = this.checkInappropriateContent(allText);
    issues.push(...contentCheck.issues);

    // Calculate overall validity
    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;
    const valid = criticalIssues === 0 && highIssues <= 1;

    // Calculate score (0-100)
    const score = Math.max(
      0,
      100 - criticalIssues * 30 - highIssues * 15 - issues.length * 5 - warnings.length * 2
    );

    return { valid, score, issues, warnings, suggestions };
  }

  /**
   * Validate generated questions
   */
  async validateQuestion(input: QuestionValidationInput): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Validate stem
    if (!input.stem || input.stem.length < 10) {
      issues.push({
        type: 'error',
        code: 'INVALID_STEM',
        message: 'Question stem is missing or too short',
        severity: 'high',
      });
    }

    // Validate question ends with appropriate punctuation
    if (input.stem && !/[?.]$/.test(input.stem.trim())) {
      warnings.push({
        code: 'PUNCTUATION',
        message: 'Question stem should end with a question mark or period',
        suggestion: 'Add appropriate ending punctuation',
      });
    }

    // Validate options for multiple choice
    if (input.type === 'multiple_choice' || input.type === 'multi_select') {
      if (!input.options || input.options.length < 2) {
        issues.push({
          type: 'error',
          code: 'INSUFFICIENT_OPTIONS',
          message: 'Multiple choice questions need at least 2 options',
          severity: 'high',
        });
      } else {
        const correctCount = input.options.filter((o) => o.correct).length;

        if (correctCount === 0) {
          issues.push({
            type: 'error',
            code: 'NO_CORRECT_ANSWER',
            message: 'Question must have at least one correct answer',
            severity: 'critical',
          });
        }

        if (input.type === 'multiple_choice' && correctCount > 1) {
          issues.push({
            type: 'error',
            code: 'MULTIPLE_CORRECT',
            message: 'Single-answer multiple choice should have exactly one correct answer',
            severity: 'high',
          });
        }

        // Check for "All of the above" or "None of the above"
        const hasAllNone = input.options.some((o) =>
          /all of the above|none of the above/i.test(o.text)
        );
        if (hasAllNone) {
          warnings.push({
            code: 'ALL_NONE_OPTION',
            message: '"All/None of the above" options are generally discouraged',
            suggestion: 'Consider using more specific distractors',
          });
        }

        // Check for similar length options
        const lengths = input.options.map((o) => o.text.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        const hasOutlier = lengths.some((l) => Math.abs(l - avgLength) > avgLength * 0.5);
        if (hasOutlier) {
          warnings.push({
            code: 'OPTION_LENGTH_VARIANCE',
            message: 'Options have significantly different lengths',
            suggestion: 'Make options similar in length to avoid giving clues',
          });
        }
      }
    }

    // Check grade-level appropriateness
    const readabilityCheck = this.checkReadability(input.stem, input.gradeLevel);
    warnings.push(...readabilityCheck.warnings);

    // Check for inappropriate content
    const contentCheck = this.checkInappropriateContent(input.stem);
    issues.push(...contentCheck.issues);

    const criticalIssues = issues.filter((i) => i.severity === 'critical').length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;
    const valid = criticalIssues === 0 && highIssues === 0;
    const score = Math.max(0, 100 - criticalIssues * 30 - highIssues * 15 - warnings.length * 5);

    return { valid, score, issues, warnings, suggestions };
  }

  /**
   * Validate feedback content
   */
  async validateFeedback(feedback: {
    specificFeedback: string;
    strengths: string[];
    areasForImprovement: string[];
    encouragement: string;
  }): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Check for constructive tone
    if (!feedback.specificFeedback || feedback.specificFeedback.length < 50) {
      warnings.push({
        code: 'BRIEF_FEEDBACK',
        message: 'Feedback is quite brief',
        suggestion: 'Provide more detailed, specific feedback',
      });
    }

    // Check for strengths
    if (!feedback.strengths || feedback.strengths.length === 0) {
      warnings.push({
        code: 'NO_STRENGTHS',
        message: 'Feedback should include specific strengths',
        suggestion: "Identify at least one thing the student did well",
      });
    }

    // Check for constructive improvement areas
    if (!feedback.areasForImprovement || feedback.areasForImprovement.length === 0) {
      warnings.push({
        code: 'NO_IMPROVEMENTS',
        message: 'Feedback should include areas for improvement',
        suggestion: 'Suggest specific ways the student can improve',
      });
    }

    // Check for encouragement
    if (!feedback.encouragement) {
      warnings.push({
        code: 'NO_ENCOURAGEMENT',
        message: 'Feedback should end with encouragement',
        suggestion: 'Add an encouraging closing message',
      });
    }

    // Check for negative or discouraging language
    const negativePatterns = [
      /\bwrong\b/gi,
      /\bbad\b/gi,
      /\bterrible\b/gi,
      /\bawful\b/gi,
      /\bstupid\b/gi,
      /\bfailed\b/gi,
    ];

    const allFeedbackText = [
      feedback.specificFeedback,
      ...(feedback.strengths ?? []),
      ...(feedback.areasForImprovement ?? []),
      feedback.encouragement,
    ].join(' ');

    for (const pattern of negativePatterns) {
      if (pattern.test(allFeedbackText)) {
        warnings.push({
          code: 'NEGATIVE_LANGUAGE',
          message: 'Feedback contains potentially discouraging language',
          suggestion: 'Use more positive, constructive phrasing',
        });
        break;
      }
    }

    const valid = issues.filter((i) => i.severity === 'critical' || i.severity === 'high').length === 0;
    const score = Math.max(0, 100 - issues.length * 10 - warnings.length * 5);

    return { valid, score, issues, warnings, suggestions };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ────────────────────────────────────────────────────────────────────────────

  private validateObjectives(objectives: string[]): {
    issues: ValidationIssue[];
    warnings: ValidationWarning[];
    suggestions: string[];
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    for (let i = 0; i < objectives.length; i++) {
      const objective = objectives[i].toLowerCase();

      // Check for action verbs
      const hasActionVerb = ACTION_VERBS.some((verb) => objective.includes(verb.toLowerCase()));
      if (!hasActionVerb) {
        warnings.push({
          code: 'NO_ACTION_VERB',
          message: `Objective ${i + 1} may not have a clear action verb`,
          suggestion: "Use verbs like 'explain', 'analyze', 'create', 'evaluate'",
        });
      }

      // Check minimum length
      if (objective.length < 20) {
        warnings.push({
          code: 'SHORT_OBJECTIVE',
          message: `Objective ${i + 1} is very brief`,
          suggestion: 'Make objectives more specific and measurable',
        });
      }

      // Check for vague language
      const vagueTerms = ['understand', 'know', 'learn', 'appreciate'];
      if (vagueTerms.some((term) => objective.startsWith(term))) {
        warnings.push({
          code: 'VAGUE_OBJECTIVE',
          message: `Objective ${i + 1} starts with a vague term`,
          suggestion: 'Use more specific, measurable action verbs',
        });
      }
    }

    if (objectives.length < 3) {
      suggestions.push('Consider adding more learning objectives (3-5 recommended)');
    }

    if (objectives.length > 7) {
      suggestions.push('Consider consolidating objectives (3-5 recommended for focus)');
    }

    return { issues, warnings, suggestions };
  }

  private validateBlocks(
    blocks: GeneratedBlock[],
    gradeLevel: GradeLevel
  ): { issues: ValidationIssue[]; warnings: ValidationWarning[] } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];

    // Check for variety of block types
    const blockTypes = new Set(blocks.map((b) => b.type));
    if (blockTypes.size < 2) {
      warnings.push({
        code: 'LIMITED_BLOCK_VARIETY',
        message: 'Lesson uses limited content types',
        suggestion: 'Consider adding headings, activities, or examples for variety',
      });
    }

    // Check for at least one heading
    if (!blocks.some((b) => b.type === 'heading')) {
      warnings.push({
        code: 'NO_HEADINGS',
        message: 'Lesson has no section headings',
        suggestion: 'Add headings to organize content into sections',
      });
    }

    // Check text blocks for readability
    const textBlocks = blocks.filter((b) => b.type === 'text' || b.type === 'paragraph');
    for (const block of textBlocks) {
      const content = (block.data.content ?? block.data.text ?? '') as string;
      if (content) {
        const readability = this.checkReadability(content, gradeLevel);
        warnings.push(...readability.warnings);
      }
    }

    return { issues, warnings };
  }

  private checkReadability(
    text: string,
    gradeLevel: GradeLevel
  ): { warnings: ValidationWarning[] } {
    const warnings: ValidationWarning[] = [];
    const expectations = GRADE_COMPLEXITY[gradeLevel] ?? GRADE_COMPLEXITY['6'];

    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (sentences.length > 0) {
      const avgSentenceLength = words.length / sentences.length;
      if (avgSentenceLength > expectations.maxSentenceLength * 1.5) {
        warnings.push({
          code: 'LONG_SENTENCES',
          message: `Sentences may be too long for ${gradeLevel} grade level`,
          suggestion: 'Consider breaking long sentences into shorter ones',
        });
      }
    }

    // Check for complex words
    const longWords = words.filter((w) => w.length > expectations.maxWordLength);
    if (longWords.length > words.length * 0.2) {
      warnings.push({
        code: 'COMPLEX_VOCABULARY',
        message: `Vocabulary may be too complex for ${gradeLevel} grade level`,
        suggestion: 'Consider using simpler words or providing definitions',
      });
    }

    return { warnings };
  }

  private checkInappropriateContent(text: string): { issues: ValidationIssue[] } {
    const issues: ValidationIssue[] = [];

    for (const pattern of INAPPROPRIATE_PATTERNS) {
      if (pattern.test(text)) {
        issues.push({
          type: 'error',
          code: 'INAPPROPRIATE_CONTENT',
          message: 'Content may contain inappropriate material',
          severity: 'critical',
        });
        break;
      }
    }

    return { issues };
  }

  private extractAllText(input: LessonValidationInput): string {
    const texts: string[] = [input.title, ...input.objectives];

    for (const block of input.blocks) {
      if (block.data.content) texts.push(block.data.content as string);
      if (block.data.text) texts.push(block.data.text as string);
      if (block.data.title) texts.push(block.data.title as string);
      if (block.data.instructions) texts.push(block.data.instructions as string);
    }

    return texts.join(' ');
  }
}
