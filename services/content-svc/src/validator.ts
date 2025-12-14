/**
 * Content Validator
 *
 * Validates Learning Object content for:
 * - Safety (no disallowed/explicit content)
 * - Modality requirements (required fields per content type)
 * - Accessibility completeness
 * - K-12 appropriateness
 */

import { z } from 'zod';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export interface ContentJson {
  type: string;
  body?: Record<string, unknown>;
  passageText?: string;
  questions?: ContentQuestion[];
  problemStatement?: string;
  solution?: string;
  hints?: string[];
  [key: string]: unknown;
}

export interface ContentQuestion {
  id: string;
  prompt: string;
  answerChoices?: string[];
  correctIndex?: number;
  correctAnswer?: string;
  hints?: string[];
  rationale?: string;
}

export interface AccessibilityJson {
  requiresReading?: boolean;
  hasAudioSupport?: boolean;
  hasAltText?: boolean;
  supportsScreenReader?: boolean;
  colorSafe?: boolean;
  cognitiveLoad?: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedMinutes?: number;
  [key: string]: unknown;
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY PATTERNS - K-12 Content Safety
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Disallowed content patterns for K-12 educational content.
 * These are case-insensitive regex patterns.
 */
const DISALLOWED_PATTERNS: { pattern: RegExp; category: string }[] = [
  // Violence
  { pattern: /\b(kill|murder|torture|suicide|self[- ]?harm)\b/i, category: 'violence' },
  { pattern: /\b(bomb|weapon|gun|knife|attack)\b/i, category: 'violence' },

  // Explicit content
  { pattern: /\b(sex|nude|pornograph|explicit)\b/i, category: 'explicit' },

  // Substances
  { pattern: /\b(drug|cocaine|heroin|meth|marijuana|alcohol)\b/i, category: 'substances' },

  // Hate speech indicators
  { pattern: /\b(hate|racist|sexist|discriminat)\b/i, category: 'hate' },

  // Medical/therapy (should not provide diagnoses)
  {
    pattern: /\b(diagnos(e|is|ed)|prescri(be|ption)|treatment plan|therapy session)\b/i,
    category: 'medical',
  },

  // PII collection attempts
  { pattern: /\b(social security|ssn|credit card|password)\b/i, category: 'pii' },
];

/**
 * Patterns that warrant a warning but aren't necessarily blocked.
 */
const WARNING_PATTERNS: { pattern: RegExp; category: string; message: string }[] = [
  {
    pattern: /\b(scary|frightening|horror|nightmare)\b/i,
    category: 'age-appropriateness',
    message: 'Content may be too intense for younger learners',
  },
  {
    pattern: /\b(death|dying|dead|funeral)\b/i,
    category: 'sensitive-topic',
    message: 'Contains potentially sensitive topic (death) - ensure age-appropriate handling',
  },
  {
    pattern: /\b(divorce|separated parents)\b/i,
    category: 'family-situation',
    message: 'References family situations that may be sensitive for some learners',
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT TYPE SCHEMAS
// ══════════════════════════════════════════════════════════════════════════════

const QuestionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().min(1, 'Question prompt is required'),
  answerChoices: z.array(z.string()).min(2).optional(),
  correctIndex: z.number().int().min(0).optional(),
  correctAnswer: z.string().optional(),
  hints: z.array(z.string()).optional(),
  rationale: z.string().optional(),
});

const ReadingPassageSchema = z.object({
  type: z.literal('reading_passage'),
  passageText: z.string().min(50, 'Passage must be at least 50 characters'),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
  lexileLevel: z.number().int().optional(),
  wordCount: z.number().int().optional(),
});

const MathProblemSchema = z.object({
  type: z.literal('math_problem'),
  problemStatement: z.string().min(10, 'Problem statement is required'),
  solution: z.string().optional(),
  hints: z.array(z.string()).optional(),
  questions: z.array(QuestionSchema).optional(),
  difficulty: z.number().int().min(1).max(10).optional(),
});

const QuizSchema = z.object({
  type: z.literal('quiz'),
  questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
  timeLimit: z.number().int().positive().optional(),
  shuffleQuestions: z.boolean().optional(),
});

const GenericContentSchema = z.object({
  type: z.literal('generic'),
  body: z.record(z.unknown()),
  title: z.string().optional(),
  instructions: z.string().optional(),
});

// ══════════════════════════════════════════════════════════════════════════════
// VALIDATOR FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Extract all text content from content JSON for safety scanning.
 */
function extractTextContent(content: ContentJson): string[] {
  const texts: string[] = [];

  function recurse(obj: unknown): void {
    if (typeof obj === 'string') {
      texts.push(obj);
    } else if (Array.isArray(obj)) {
      obj.forEach(recurse);
    } else if (obj && typeof obj === 'object') {
      Object.values(obj).forEach(recurse);
    }
  }

  recurse(content);
  return texts;
}

/**
 * Check content for disallowed safety patterns.
 */
function validateSafety(content: ContentJson): ValidationError[] {
  const errors: ValidationError[] = [];
  const texts = extractTextContent(content);
  const fullText = texts.join(' ');

  for (const { pattern, category } of DISALLOWED_PATTERNS) {
    const match = pattern.exec(fullText);
    if (match) {
      errors.push({
        field: 'content',
        code: `SAFETY_${category.toUpperCase()}`,
        message: `Content contains disallowed ${category} content: "${match[0]}"`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Check content for warning patterns.
 */
function validateWarnings(content: ContentJson): ValidationError[] {
  const warnings: ValidationError[] = [];
  const texts = extractTextContent(content);
  const fullText = texts.join(' ');

  for (const { pattern, category, message } of WARNING_PATTERNS) {
    if (pattern.test(fullText)) {
      warnings.push({
        field: 'content',
        code: `WARNING_${category.toUpperCase()}`,
        message,
        severity: 'warning',
      });
    }
  }

  return warnings;
}

/**
 * Validate content structure based on content type.
 */
function validateContentStructure(content: ContentJson): ValidationError[] {
  const errors: ValidationError[] = [];

  const contentType = content.type;

  let schema: z.ZodType<unknown> | null = null;
  switch (contentType) {
    case 'reading_passage':
      schema = ReadingPassageSchema;
      break;
    case 'math_problem':
      schema = MathProblemSchema;
      break;
    case 'quiz':
      schema = QuizSchema;
      break;
    case 'generic':
      schema = GenericContentSchema;
      break;
    default:
      // Allow unknown types with warning
      return [
        {
          field: 'type',
          code: 'UNKNOWN_CONTENT_TYPE',
          message: `Unknown content type: ${contentType}. Consider using a known type for better validation.`,
          severity: 'warning',
        },
      ];
  }

  const result = schema.safeParse(content);
  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push({
        field: issue.path.join('.'),
        code: 'SCHEMA_VALIDATION',
        message: issue.message,
        severity: 'error',
      });
    }
  }

  // Additional validation for questions
  if (content.questions && Array.isArray(content.questions)) {
    for (let i = 0; i < content.questions.length; i++) {
      const q = content.questions[i];
      if (q.answerChoices && q.correctIndex !== undefined) {
        if (q.correctIndex >= q.answerChoices.length) {
          errors.push({
            field: `questions[${i}].correctIndex`,
            code: 'INVALID_CORRECT_INDEX',
            message: `Correct index ${q.correctIndex} is out of bounds for ${q.answerChoices.length} choices`,
            severity: 'error',
          });
        }
        // Check for empty answer choices
        const emptyChoices = q.answerChoices.filter((c) => !c || c.trim() === '');
        if (emptyChoices.length > 0) {
          errors.push({
            field: `questions[${i}].answerChoices`,
            code: 'EMPTY_ANSWER_CHOICE',
            message: 'Answer choices cannot be empty',
            severity: 'error',
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Validate accessibility metadata completeness.
 */
function validateAccessibility(accessibility: AccessibilityJson | null): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!accessibility || Object.keys(accessibility).length === 0) {
    errors.push({
      field: 'accessibilityJson',
      code: 'MISSING_ACCESSIBILITY',
      message: 'Accessibility metadata is required',
      severity: 'warning',
    });
    return errors;
  }

  // Check for required accessibility fields
  const requiredFields = ['requiresReading', 'cognitiveLoad'];
  for (const field of requiredFields) {
    if (accessibility[field] === undefined) {
      errors.push({
        field: `accessibilityJson.${field}`,
        code: 'MISSING_ACCESSIBILITY_FIELD',
        message: `Accessibility field "${field}" should be specified`,
        severity: 'warning',
      });
    }
  }

  // Recommend audio support if content requires reading
  if (accessibility.requiresReading && !accessibility.hasAudioSupport) {
    errors.push({
      field: 'accessibilityJson.hasAudioSupport',
      code: 'RECOMMEND_AUDIO',
      message: 'Content requires reading but has no audio support - consider adding TTS or audio',
      severity: 'warning',
    });
  }

  return errors;
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ══════════════════════════════════════════════════════════════════════════════

export interface ValidateContentInput {
  contentJson: ContentJson;
  accessibilityJson?: AccessibilityJson | null;
  subject?: string;
  gradeBand?: string;
}

/**
 * Validate Learning Object content.
 *
 * @param input - Content and metadata to validate
 * @returns Validation result with errors and warnings
 */
export function validateContent(input: ValidateContentInput): ValidationResult {
  const { contentJson, accessibilityJson } = input;

  const allErrors: ValidationError[] = [];

  // 1. Safety validation (blocking)
  allErrors.push(...validateSafety(contentJson));

  // 2. Content structure validation
  allErrors.push(...validateContentStructure(contentJson));

  // 3. Accessibility validation
  allErrors.push(...validateAccessibility(accessibilityJson ?? null));

  // 4. Warning patterns
  allErrors.push(...validateWarnings(contentJson));

  // Separate errors and warnings
  const errors = allErrors.filter((e) => e.severity === 'error');
  const warnings = allErrors.filter((e) => e.severity === 'warning');

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick safety check - returns true if content passes safety validation.
 */
export function isContentSafe(content: ContentJson): boolean {
  const safetyErrors = validateSafety(content);
  return safetyErrors.length === 0;
}

/**
 * Get validation errors as a formatted string for display.
 */
export function formatValidationErrors(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const err of result.errors) {
      lines.push(`  - [${err.code}] ${err.field}: ${err.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('Warnings:');
    for (const warn of result.warnings) {
      lines.push(`  - [${warn.code}] ${warn.field}: ${warn.message}`);
    }
  }

  return lines.join('\n');
}
