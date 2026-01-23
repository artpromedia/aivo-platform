/**
 * IEP Goal Validator
 *
 * Validates AI-generated IEP goals for IDEA compliance and educational appropriateness.
 * Ensures goals meet federal requirements and best practices for special education.
 *
 * @module validators/iep-validator
 */

import type {
  IEPGoal,
  IEPBenchmark,
  IEPGoalValidationResult,
  IEPValidationResult,
  ValidationIssue,
  IEPDomain,
} from '../types/iep.types.js';

// ════════════════════════════════════════════════════════════════════════════════
// VALIDATION PATTERNS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate measurable criteria
 */
const MEASURABLE_PATTERNS = [
  /\d+\s*%/, // Percentage (e.g., "80%")
  /\d+\s*out\s*of\s*\d+/i, // Ratio (e.g., "4 out of 5")
  /\d+\/\d+/, // Fraction (e.g., "4/5")
  /\d+\s*consecutive/i, // Consecutive (e.g., "3 consecutive")
  /\d+\s*times?/i, // Frequency (e.g., "5 times")
  /\d+\s*trials?/i, // Trials (e.g., "10 trials")
  /\d+\s*minutes?/i, // Duration (e.g., "20 minutes")
  /\d+\s*words?\s*per\s*minute/i, // WPM (e.g., "100 words per minute")
  /\d+\s*(?:wpm|wcpm)/i, // WPM abbreviation
  /accuracy/i, // Word "accuracy" (often with percentage)
  /independence|independently/i, // Independence measure
  /with(?:out)?\s+(?:\d+|no|minimal|moderate)\s*prompts?/i, // Prompting level
];

/**
 * Patterns that indicate timeframe
 */
const TIMEFRAME_PATTERNS = [
  /by\s+january\s+\d{4}/i,
  /by\s+february\s+\d{4}/i,
  /by\s+march\s+\d{4}/i,
  /by\s+april\s+\d{4}/i,
  /by\s+may\s+\d{4}/i,
  /by\s+june\s+\d{4}/i,
  /by\s+july\s+\d{4}/i,
  /by\s+august\s+\d{4}/i,
  /by\s+september\s+\d{4}/i,
  /by\s+october\s+\d{4}/i,
  /by\s+november\s+\d{4}/i,
  /by\s+december\s+\d{4}/i,
  /by\s+\d{1,2}\/\d{1,2}\/\d{2,4}/i, // Date format MM/DD/YYYY
  /by\s+\d{4}-\d{2}-\d{2}/i, // ISO date format
  /within\s+\d+\s*months?/i, // Duration in months
  /within\s+\d+\s*weeks?/i, // Duration in weeks
  /within\s+\d+\s*days?/i, // Duration in days
  /by\s+the\s+end\s+of\s+the\s+iep/i, // End of IEP period
  /by\s+the\s+end\s+of\s+the\s+year/i, // End of year
  /\d+\s*months?/i, // Month count
  /quarter/i, // Academic terms
  /semester/i,
  /annual/i,
];

/**
 * Observable action verbs for IEP goals
 */
const OBSERVABLE_VERBS = [
  'identify',
  'demonstrate',
  'complete',
  'solve',
  'read',
  'write',
  'calculate',
  'explain',
  'describe',
  'use',
  'apply',
  'compare',
  'analyze',
  'evaluate',
  'create',
  'produce',
  'perform',
  'show',
  'express',
  'communicate',
  'follow',
  'respond',
  'participate',
  'initiate',
  'maintain',
  'reduce',
  'increase',
];

/**
 * Check if text contains observable behavior language
 */
function hasObservableBehavior(text: string): boolean {
  const lowerText = text.toLowerCase();
  return OBSERVABLE_VERBS.some((verb) => {
    // Check for "will <verb>" or "will be able to <verb>" patterns
    const willRegex = /will\s+(\w+)/gi;
    const ableRegex = /will\s+be\s+able\s+to\s+(\w+)/gi;

    let match: RegExpExecArray | null;
    while ((match = willRegex.exec(lowerText)) !== null) {
      if (match[1] === verb) return true;
    }
    while ((match = ableRegex.exec(lowerText)) !== null) {
      if (match[1] === verb) return true;
    }
    return false;
  });
}

/**
 * Common IEP compliance issues
 */
const COMPLIANCE_CODES = {
  MISSING_MEASURABLE_CRITERIA: 'IEP-001',
  MISSING_TIMEFRAME: 'IEP-002',
  VAGUE_BEHAVIOR: 'IEP-003',
  MISSING_BASELINE: 'IEP-004',
  INSUFFICIENT_BENCHMARKS: 'IEP-005',
  MISSING_MEASUREMENT_METHOD: 'IEP-006',
  UNREALISTIC_CRITERIA: 'IEP-007',
  MISSING_ACCOMMODATIONS: 'IEP-008',
  MISSING_SERVICE_MINUTES: 'IEP-009',
  MISSING_PROVIDER: 'IEP-010',
  INVALID_BENCHMARK_DATES: 'IEP-011',
  CRITERIA_MISMATCH: 'IEP-012',
} as const;

// ════════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Validate a single IEP goal for IDEA compliance
 */
export function validateIEPGoal(goal: IEPGoal): IEPGoalValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: string[] = [];

  // Validate measurable criteria
  const measurableResult = validateMeasurableCriteria(goal.annualGoal, goal.targetCriteria);
  errors.push(...measurableResult.errors);
  warnings.push(...measurableResult.warnings);
  suggestions.push(...measurableResult.suggestions);

  // Validate timeframe
  const timeframeResult = validateTimeframe(goal.annualGoal);
  if (!timeframeResult.hasTimeframe) {
    warnings.push({
      code: COMPLIANCE_CODES.MISSING_TIMEFRAME,
      message: 'Annual goal should include a specific timeframe or target date',
      field: 'annualGoal',
      suggestion: 'Add a completion date (e.g., "by June 2025" or "by the end of the IEP period")',
    });
  }

  // Validate observable behavior
  const behaviorResult = validateObservableBehavior(goal.annualGoal);
  warnings.push(...behaviorResult.warnings);
  suggestions.push(...behaviorResult.suggestions);

  // Validate baseline
  if (!goal.baseline || goal.baseline.trim().length < 10) {
    errors.push({
      code: COMPLIANCE_CODES.MISSING_BASELINE,
      message: 'Baseline/present level of performance is required and must be descriptive',
      field: 'baseline',
      suggestion:
        'Include current performance data (e.g., "Currently reading at 45 WPM with 85% accuracy")',
    });
  }

  // Validate benchmarks
  const benchmarkResult = validateBenchmarks(goal.benchmarks, goal.targetCriteria);
  errors.push(...benchmarkResult.errors);
  warnings.push(...benchmarkResult.warnings);
  suggestions.push(...benchmarkResult.suggestions);

  // Validate measurement method
  if (!goal.measurementMethod) {
    errors.push({
      code: COMPLIANCE_CODES.MISSING_MEASUREMENT_METHOD,
      message: 'Measurement method is required',
      field: 'measurementMethod',
      suggestion:
        'Specify how progress will be measured (e.g., "curriculum-based assessment", "work samples")',
    });
  }

  // Validate accommodations
  if (!goal.accommodations || goal.accommodations.length === 0) {
    warnings.push({
      code: COMPLIANCE_CODES.MISSING_ACCOMMODATIONS,
      message: 'Goal should include relevant accommodations',
      field: 'accommodations',
      suggestion: 'Add accommodations that support the student in achieving this goal',
    });
  }

  // Validate service minutes
  if (!goal.serviceMinutes || goal.serviceMinutes <= 0) {
    errors.push({
      code: COMPLIANCE_CODES.MISSING_SERVICE_MINUTES,
      message: 'Service minutes must be specified',
      field: 'serviceMinutes',
      suggestion: 'Specify weekly service minutes (e.g., 60 minutes)',
    });
  }

  // Validate provider
  if (!goal.provider) {
    errors.push({
      code: COMPLIANCE_CODES.MISSING_PROVIDER,
      message: 'Service provider must be specified',
      field: 'provider',
      suggestion: 'Specify who will provide services (e.g., "special-education-teacher")',
    });
  }

  // Calculate compliance score
  const ideaComplianceScore = calculateComplianceScore(errors, warnings);

  return {
    valid: errors.length === 0,
    goalId: goal.id,
    errors,
    warnings,
    suggestions,
    ideaComplianceScore,
  };
}

/**
 * Validate multiple IEP goals
 */
export function validateIEPGoals(goals: IEPGoal[]): IEPValidationResult {
  const goalValidations = goals.map((goal) => validateIEPGoal(goal));

  const allErrors = goalValidations.flatMap((v) => v.errors.map((e) => e.message));
  const allWarnings = goalValidations.flatMap((v) => v.warnings.map((w) => w.message));

  const overallComplianceScore =
    goalValidations.reduce((sum, v) => sum + v.ideaComplianceScore, 0) /
    Math.max(goalValidations.length, 1);

  return {
    valid: allErrors.length === 0,
    goalValidations,
    overallComplianceScore,
    errorSummary: [...new Set(allErrors)],
    warningSummary: [...new Set(allWarnings)],
  };
}

// ════════════════════════════════════════════════════════════════════════════════
// SPECIFIC VALIDATORS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Validate that goal has measurable criteria
 */
function validateMeasurableCriteria(
  annualGoal: string,
  targetCriteria: string
): { errors: ValidationIssue[]; warnings: ValidationIssue[]; suggestions: string[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: string[] = [];

  const combinedText = `${annualGoal} ${targetCriteria}`;
  const hasMeasurable = MEASURABLE_PATTERNS.some((pattern) => pattern.test(combinedText));

  if (!hasMeasurable) {
    errors.push({
      code: COMPLIANCE_CODES.MISSING_MEASURABLE_CRITERIA,
      message: 'Goal must include measurable criteria (e.g., percentage, frequency, duration)',
      field: 'targetCriteria',
      suggestion: 'Add specific criteria like "80% accuracy" or "4 out of 5 trials"',
    });
    suggestions.push(
      'Consider adding: percentage (80%), frequency (4 out of 5), or trials (3 consecutive)'
    );
  }

  // Check for unrealistic criteria
  const percentageRegex = /(\d+)\s*%/;
  const percentageMatch = percentageRegex.exec(combinedText);
  if (percentageMatch?.[1]) {
    const percentage = Number.parseInt(percentageMatch[1], 10);
    if (percentage > 100) {
      errors.push({
        code: COMPLIANCE_CODES.UNREALISTIC_CRITERIA,
        message: 'Percentage cannot exceed 100%',
        field: 'targetCriteria',
      });
    } else if (percentage === 100) {
      warnings.push({
        code: COMPLIANCE_CODES.UNREALISTIC_CRITERIA,
        message: '100% criteria may be unrealistically high for most students',
        field: 'targetCriteria',
        suggestion: 'Consider 80-95% for most goals to allow for typical variability',
      });
    } else if (percentage < 50) {
      warnings.push({
        code: COMPLIANCE_CODES.UNREALISTIC_CRITERIA,
        message: 'Criteria below 50% may be too low to demonstrate meaningful progress',
        field: 'targetCriteria',
        suggestion: 'Consider whether higher criteria would be appropriate',
      });
    }
  }

  return { errors, warnings, suggestions };
}

/**
 * Validate that goal has a timeframe
 */
function validateTimeframe(annualGoal: string): { hasTimeframe: boolean } {
  const hasTimeframe = TIMEFRAME_PATTERNS.some((pattern) => pattern.test(annualGoal));
  return { hasTimeframe };
}

/**
 * Validate that goal uses observable behavior language
 */
function validateObservableBehavior(annualGoal: string): {
  warnings: ValidationIssue[];
  suggestions: string[];
} {
  const warnings: ValidationIssue[] = [];
  const suggestions: string[] = [];

  const hasObservable = hasObservableBehavior(annualGoal);

  if (!hasObservable) {
    warnings.push({
      code: COMPLIANCE_CODES.VAGUE_BEHAVIOR,
      message: 'Goal should describe an observable, measurable behavior',
      field: 'annualGoal',
      suggestion:
        'Use action verbs like: identify, demonstrate, complete, solve, read, write, calculate',
    });
    suggestions.push('Start with "The student will..." followed by an observable action verb');
  }

  // Check for vague language
  const vagueTerms = ['understand', 'know', 'learn', 'appreciate', 'improve', 'better'];
  const lowerGoal = annualGoal.toLowerCase();

  for (const term of vagueTerms) {
    // Check if term appears and is not part of "will [term]"
    const termIndex = lowerGoal.indexOf(term);
    const willTermIndex = lowerGoal.indexOf(`will ${term}`);
    if (
      termIndex !== -1 &&
      termIndex < 50 && // Only flag if near the beginning
      willTermIndex === -1 // Not preceded by "will"
    ) {
      warnings.push({
        code: COMPLIANCE_CODES.VAGUE_BEHAVIOR,
        message: `"${term}" is difficult to measure. Use observable behaviors instead.`,
        field: 'annualGoal',
        suggestion: `Instead of "${term}", describe what the student will do to show they ${term}`,
      });
    }
  }

  return { warnings, suggestions };
}

/**
 * Validate benchmarks/objectives
 */
function validateBenchmarks(
  benchmarks: IEPBenchmark[],
  _targetCriteria: string
): { errors: ValidationIssue[]; warnings: ValidationIssue[]; suggestions: string[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const suggestions: string[] = [];

  if (!benchmarks || benchmarks.length === 0) {
    errors.push({
      code: COMPLIANCE_CODES.INSUFFICIENT_BENCHMARKS,
      message: 'At least one benchmark/short-term objective is required',
      field: 'benchmarks',
      suggestion: 'Add 3-4 benchmarks that scaffold progress toward the annual goal',
    });
    return { errors, warnings, suggestions };
  }

  if (benchmarks.length < 3) {
    warnings.push({
      code: COMPLIANCE_CODES.INSUFFICIENT_BENCHMARKS,
      message: 'Typically 3-4 benchmarks are recommended for an annual goal',
      field: 'benchmarks',
      suggestion: 'Consider adding more benchmarks to track quarterly progress',
    });
  }

  // Validate each benchmark
  for (let i = 0; i < benchmarks.length; i++) {
    const benchmark = benchmarks[i];

    if (!benchmark.targetDate) {
      errors.push({
        code: COMPLIANCE_CODES.INVALID_BENCHMARK_DATES,
        message: `Benchmark ${i + 1} is missing a target date`,
        field: `benchmarks[${i}].targetDate`,
      });
    }

    if (!benchmark.criteria) {
      errors.push({
        code: COMPLIANCE_CODES.MISSING_MEASURABLE_CRITERIA,
        message: `Benchmark ${i + 1} is missing success criteria`,
        field: `benchmarks[${i}].criteria`,
      });
    }

    if (!benchmark.measurementMethod) {
      warnings.push({
        code: COMPLIANCE_CODES.MISSING_MEASUREMENT_METHOD,
        message: `Benchmark ${i + 1} should specify how progress will be measured`,
        field: `benchmarks[${i}].measurementMethod`,
      });
    }
  }

  // Check for progressive difficulty
  if (benchmarks.length >= 2) {
    const percentageRegex = /(\d+)\s*%/;
    const criteriaValues = benchmarks
      .map((b) => {
        const match = percentageRegex.exec(b.criteria ?? '');
        return match?.[1] ? Number.parseInt(match[1], 10) : null;
      })
      .filter((v): v is number => v !== null);

    if (criteriaValues.length >= 2) {
      const isProgressive = criteriaValues.every((v, i, arr) => i === 0 || v >= arr[i - 1]);

      if (!isProgressive) {
        warnings.push({
          code: COMPLIANCE_CODES.CRITERIA_MISMATCH,
          message: 'Benchmark criteria should show progressive increase toward the annual goal',
          field: 'benchmarks',
          suggestion: 'Ensure later benchmarks have equal or higher criteria than earlier ones',
        });
      }
    }
  }

  return { errors, warnings, suggestions };
}

// ════════════════════════════════════════════════════════════════════════════════
// SCORING
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Calculate IDEA compliance score (0-100)
 */
function calculateComplianceScore(errors: ValidationIssue[], warnings: ValidationIssue[]): number {
  // Start at 100
  let score = 100;

  // Deduct points for errors (major issues)
  const errorDeductions: Record<string, number> = {
    [COMPLIANCE_CODES.MISSING_MEASURABLE_CRITERIA]: 25,
    [COMPLIANCE_CODES.MISSING_BASELINE]: 20,
    [COMPLIANCE_CODES.INSUFFICIENT_BENCHMARKS]: 15,
    [COMPLIANCE_CODES.MISSING_MEASUREMENT_METHOD]: 15,
    [COMPLIANCE_CODES.MISSING_SERVICE_MINUTES]: 10,
    [COMPLIANCE_CODES.MISSING_PROVIDER]: 10,
    [COMPLIANCE_CODES.INVALID_BENCHMARK_DATES]: 10,
    [COMPLIANCE_CODES.UNREALISTIC_CRITERIA]: 10,
  };

  for (const error of errors) {
    score -= errorDeductions[error.code] ?? 10;
  }

  // Deduct points for warnings (minor issues)
  const warningDeductions: Record<string, number> = {
    [COMPLIANCE_CODES.MISSING_TIMEFRAME]: 5,
    [COMPLIANCE_CODES.VAGUE_BEHAVIOR]: 5,
    [COMPLIANCE_CODES.MISSING_ACCOMMODATIONS]: 5,
    [COMPLIANCE_CODES.CRITERIA_MISMATCH]: 5,
  };

  for (const warning of warnings) {
    score -= warningDeductions[warning.code] ?? 3;
  }

  return Math.max(0, Math.min(100, score));
}

// ════════════════════════════════════════════════════════════════════════════════
// CONTENT SAFETY VALIDATORS
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Check goal for educational appropriateness
 */
export function validateEducationalAppropriateness(goal: IEPGoal): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check for inappropriate content patterns
  const inappropriatePatterns = [
    /\b(stupid|dumb|idiot|retard|crazy|mental)\b/i,
    /\b(punishment|punish|detention|suspension)\b/i,
    /\b(never|always|can't|won't)\b/i, // Absolute language
  ];

  const textToCheck = `${goal.annualGoal} ${goal.baseline} ${goal.benchmarks.map((b) => b.description).join(' ')}`;

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(textToCheck)) {
      issues.push({
        code: 'INAPPROPRIATE_CONTENT',
        message: 'Goal contains potentially inappropriate or negative language',
        suggestion: 'Use positive, student-centered language focused on growth',
      });
      break;
    }
  }

  return issues;
}

/**
 * Validate goal is age-appropriate for the student's grade level
 */
export function validateAgeAppropriateness(
  goal: IEPGoal,
  gradeLevel: number | string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const grade = typeof gradeLevel === 'string' ? Number.parseInt(gradeLevel, 10) || 0 : gradeLevel;

  // Check for elementary-specific terms in high school goals
  const elementaryTerms = ['circle time', 'nap time', 'playground', 'recess'];
  const highSchoolTerms = ['career', 'employment', 'post-secondary', 'independent living'];

  if (grade >= 9) {
    for (const term of elementaryTerms) {
      if (goal.annualGoal.toLowerCase().includes(term)) {
        issues.push({
          code: 'AGE_INAPPROPRIATE',
          message: `"${term}" may not be age-appropriate for a high school student`,
          field: 'annualGoal',
        });
      }
    }
  }

  if (grade <= 5) {
    for (const term of highSchoolTerms) {
      if (goal.annualGoal.toLowerCase().includes(term)) {
        issues.push({
          code: 'AGE_INAPPROPRIATE',
          message: `"${term}" is typically used for transition-age students (14+)`,
          field: 'annualGoal',
        });
      }
    }
  }

  return issues;
}

/**
 * Check if service minutes are within reasonable ranges for the domain
 */
export function validateServiceMinutes(
  serviceMinutes: number,
  domain: IEPDomain
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Typical service minute ranges by domain (weekly)
  const ranges: Record<IEPDomain, { min: number; max: number; typical: string }> = {
    ELA: { min: 30, max: 300, typical: '60-150 minutes' },
    MATH: { min: 30, max: 300, typical: '60-150 minutes' },
    SCIENCE: { min: 30, max: 150, typical: '30-60 minutes' },
    SPEECH: { min: 15, max: 90, typical: '30-60 minutes' },
    SEL: { min: 15, max: 120, typical: '30-60 minutes' },
    BEHAVIOR: { min: 30, max: 300, typical: '60-120 minutes' },
    MOTOR: { min: 15, max: 90, typical: '30-60 minutes' },
    ADAPTIVE: { min: 30, max: 300, typical: '60-150 minutes' },
    VOCATIONAL: { min: 30, max: 300, typical: '60-180 minutes' },
    OTHER: { min: 15, max: 300, typical: '30-120 minutes' },
  };

  const range = ranges[domain] ?? ranges.OTHER;

  if (serviceMinutes < range.min) {
    issues.push({
      code: 'SERVICE_MINUTES_LOW',
      message: `${serviceMinutes} minutes may be insufficient for ${domain} goals`,
      field: 'serviceMinutes',
      suggestion: `Typical range for ${domain} is ${range.typical} per week`,
    });
  }

  if (serviceMinutes > range.max) {
    issues.push({
      code: 'SERVICE_MINUTES_HIGH',
      message: `${serviceMinutes} minutes exceeds typical range for ${domain} goals`,
      field: 'serviceMinutes',
      suggestion: `Typical range for ${domain} is ${range.typical} per week`,
    });
  }

  return issues;
}
