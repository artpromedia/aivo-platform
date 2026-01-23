/**
 * Question Validator
 *
 * Ensures all assessment questions meet educational quality standards
 * before being presented to learners.
 *
 * Validation Rules:
 * - Stem must be clear and unambiguous
 * - Options must be plausible distractors
 * - Correct answer must be definitively correct
 * - Reading level appropriate for grade
 * - No cultural bias or inappropriate content
 * - Proper grammar and formatting
 *
 * @module question.validator
 */

import type { GradeBand } from '../types/baseline.js';
import type {
  GeneratedQuestion,
  QuestionValidationResult,
  ValidationRuleResult,
  CognitiveLevel,
} from '../types/questions.types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const VALIDATION_CONFIG = {
  /** Minimum stem length in characters */
  minStemLength: 10,
  /** Maximum stem length in characters */
  maxStemLength: 500,
  /** Minimum option length in characters */
  minOptionLength: 1,
  /** Maximum option length in characters */
  maxOptionLength: 200,
  /** Minimum explanation length */
  minExplanationLength: 20,
  /** Words that indicate unclear questions */
  ambiguousIndicators: [
    'maybe',
    'possibly',
    'might',
    'could be',
    'sometimes',
    'often',
    'rarely',
    'usually',
    'generally',
    'in most cases',
    'it depends',
  ],
  /** Biased or inappropriate content patterns */
  biasPatterns: [
    // Gender stereotypes
    /\b(boys are|girls are|men are|women are)\s+(better|worse|smarter|stronger)/i,
    // Racial/ethnic stereotypes (simplified pattern)
    /\b(all|every|most)\s+(asians?|blacks?|whites?|hispanics?|latinos?)\b/i,
    // Religious bias
    /\b(the (right|true|only) religion|heathens?|infidels?)\b/i,
    // Socioeconomic assumptions
    /\b(poor people|rich people)\s+(always|never|can't|don't)\b/i,
  ],
  /** Inappropriate content patterns */
  inappropriatePatterns: [
    /\b(violence|violent|kill|murder|death|dying|dead)\b/i,
    /\b(drugs?|alcohol|drunk|smoking|cigarette)\b/i,
    /\b(sex|sexual|nude|naked)\b/i,
    /\b(damn|hell|crap)\b/i,
  ],
  /** Option patterns that are too similar */
  optionSimilarityThreshold: 0.8,
  /** Reading level tolerances by grade band */
  readingLevelTolerances: {
    K5: { target: 3, tolerance: 2 },
    G6_8: { target: 7, tolerance: 2 },
    G9_12: { target: 10, tolerance: 3 },
  } as Record<string, { target: number; tolerance: number }>,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// READING LEVEL CALCULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate Flesch-Kincaid Grade Level for text.
 * Formula: 0.39 × (total words / total sentences) + 11.8 × (total syllables / total words) - 15.59
 */
function calculateReadingLevel(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w));

  if (sentences.length === 0 || words.length === 0) {
    return 0;
  }

  const syllableCount = words.reduce((sum, word) => sum + countSyllables(word), 0);

  const avgWordsPerSentence = words.length / sentences.length;
  const avgSyllablesPerWord = syllableCount / words.length;

  const gradeLevel = 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;

  return Math.max(0, Math.round(gradeLevel * 10) / 10);
}

/**
 * Count syllables in a word using a heuristic approach.
 */
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;

  // Count vowel groups
  const vowelGroups = word.match(/[aeiouy]+/g);
  let syllables = vowelGroups ? vowelGroups.length : 1;

  // Adjust for silent 'e' at end
  if (word.endsWith('e') && syllables > 1) {
    syllables--;
  }

  // Adjust for common suffixes
  if (word.endsWith('le') && word.length > 2 && !/[aeiouy]/.test(word[word.length - 3])) {
    syllables++;
  }

  return Math.max(1, syllables);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEXT SIMILARITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate similarity between two strings using Jaccard index on words.
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size > 0 ? intersection.size / union.size : 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate question stem clarity.
 */
function validateStemClarity(question: GeneratedQuestion): ValidationRuleResult {
  const stem = question.stem;
  const issues: string[] = [];

  // Check minimum length
  if (stem.length < VALIDATION_CONFIG.minStemLength) {
    issues.push('Stem is too short to be a meaningful question');
  }

  // Check maximum length
  if (stem.length > VALIDATION_CONFIG.maxStemLength) {
    issues.push('Stem is too long and may confuse learners');
  }

  // Check for question mark or clear directive
  const hasQuestionStructure =
    stem.includes('?') ||
    /^(what|which|who|where|when|why|how|select|choose|identify|determine|calculate|find|explain)/i.test(
      stem.trim()
    );
  if (!hasQuestionStructure) {
    issues.push('Stem should be a clear question or directive');
  }

  // Check for ambiguous language
  const foundAmbiguous = VALIDATION_CONFIG.ambiguousIndicators.filter((word) =>
    stem.toLowerCase().includes(word)
  );
  if (foundAmbiguous.length > 0) {
    issues.push(`Stem contains ambiguous language: ${foundAmbiguous.join(', ')}`);
  }

  // Check for double negatives
  if (/\bnot\b.*\bnot\b/i.test(stem) || /\bno\b.*\bnot\b/i.test(stem)) {
    issues.push('Avoid double negatives which confuse learners');
  }

  // Check for "all of the above" / "none of the above" in stem
  if (/\b(all|none)\s+of\s+the\s+(above|following)\b/i.test(stem)) {
    issues.push('Move "all/none of the above" to options, not stem');
  }

  return {
    rule: 'stem-clarity',
    passed: issues.length === 0,
    severity: issues.length > 0 ? 'error' : 'info',
    message: issues.length > 0 ? issues.join('; ') : 'Stem is clear and unambiguous',
    details: { issues, stemLength: stem.length },
  };
}

/**
 * Validate answer options for multiple-choice questions.
 */
function validateOptions(question: GeneratedQuestion): ValidationRuleResult {
  if (
    question.type !== 'multiple-choice' &&
    question.type !== 'multiple-select' &&
    question.type !== 'true-false'
  ) {
    return {
      rule: 'options-quality',
      passed: true,
      severity: 'info',
      message: 'Not a multiple-choice question',
    };
  }

  const options = question.options || [];
  const issues: string[] = [];

  // Check option count
  const expectedOptions = question.type === 'true-false' ? 2 : 4;
  if (options.length < expectedOptions) {
    issues.push(`Expected ${expectedOptions} options, found ${options.length}`);
  }

  // Check for exactly one correct answer (for single-choice)
  if (question.type === 'multiple-choice') {
    const correctCount = options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) {
      issues.push(`Multiple-choice should have exactly 1 correct answer, found ${correctCount}`);
    }
  }

  // Check option lengths
  for (const opt of options) {
    if (opt.text.length < VALIDATION_CONFIG.minOptionLength) {
      issues.push(`Option ${opt.id} is too short`);
    }
    if (opt.text.length > VALIDATION_CONFIG.maxOptionLength) {
      issues.push(`Option ${opt.id} is too long`);
    }
  }

  // Check for "all of the above" or "none of the above" patterns
  const allNoneOptions = options.filter((o) =>
    /\b(all|none)\s+of\s+the\s+(above|below)\b/i.test(o.text)
  );
  if (allNoneOptions.length > 0) {
    issues.push('"All/None of the above" options are generally discouraged');
  }

  // Check for similar options (bad distractors)
  for (let i = 0; i < options.length; i++) {
    for (let j = i + 1; j < options.length; j++) {
      const similarity = calculateSimilarity(options[i].text, options[j].text);
      if (similarity > VALIDATION_CONFIG.optionSimilarityThreshold) {
        issues.push(`Options ${options[i].id} and ${options[j].id} are too similar`);
      }
    }
  }

  // Check correct answer is not obviously different in length
  const correctOption = options.find((o) => o.isCorrect);
  if (correctOption) {
    const incorrectLengths = options.filter((o) => !o.isCorrect).map((o) => o.text.length);
    const avgIncorrectLength =
      incorrectLengths.reduce((a, b) => a + b, 0) / incorrectLengths.length || 0;
    if (correctOption.text.length > avgIncorrectLength * 2) {
      issues.push('Correct answer is significantly longer than distractors (may be a giveaway)');
    }
  }

  return {
    rule: 'options-quality',
    passed: issues.length === 0,
    severity: issues.length > 0 ? 'warning' : 'info',
    message:
      issues.length > 0 ? issues.join('; ') : 'Options are well-formed with plausible distractors',
    details: { issues, optionCount: options.length },
  };
}

/**
 * Validate reading level is appropriate for grade.
 */
function validateReadingLevel(
  question: GeneratedQuestion,
  gradeBand?: GradeBand
): ValidationRuleResult {
  const fullText =
    question.stem +
    ' ' +
    (question.options?.map((o) => o.text).join(' ') || '') +
    ' ' +
    (question.explanation || '');

  const readingLevel = calculateReadingLevel(fullText);
  const tolerance = gradeBand
    ? VALIDATION_CONFIG.readingLevelTolerances[gradeBand]
    : VALIDATION_CONFIG.readingLevelTolerances.G6_8;

  const isAppropriate =
    readingLevel >= tolerance.target - tolerance.tolerance &&
    readingLevel <= tolerance.target + tolerance.tolerance;

  return {
    rule: 'reading-level',
    passed: isAppropriate,
    severity: isAppropriate ? 'info' : 'warning',
    message: isAppropriate
      ? `Reading level (${readingLevel}) is appropriate for ${gradeBand || 'the grade'}`
      : `Reading level (${readingLevel}) may be ${readingLevel > tolerance.target + tolerance.tolerance ? 'too high' : 'too low'} for ${gradeBand || 'the grade'}`,
    details: {
      calculatedLevel: readingLevel,
      targetLevel: tolerance.target,
      tolerance: tolerance.tolerance,
    },
  };
}

/**
 * Validate content for bias and appropriateness.
 */
function validateContent(question: GeneratedQuestion): ValidationRuleResult {
  const fullText =
    question.stem +
    ' ' +
    (question.options?.map((o) => o.text).join(' ') || '') +
    ' ' +
    (question.explanation || '');

  const issues: string[] = [];
  const flags: string[] = [];

  // Check for bias patterns
  for (const pattern of VALIDATION_CONFIG.biasPatterns) {
    if (pattern.test(fullText)) {
      issues.push(`Potential bias detected: ${pattern.source}`);
      flags.push('bias');
    }
  }

  // Check for inappropriate content
  for (const pattern of VALIDATION_CONFIG.inappropriatePatterns) {
    const match = fullText.match(pattern);
    if (match) {
      issues.push(`Potentially inappropriate content: "${match[0]}"`);
      flags.push('inappropriate');
    }
  }

  // Check for all-caps (shouting)
  const wordsAllCaps = fullText.match(/\b[A-Z]{4,}\b/g);
  if (wordsAllCaps && wordsAllCaps.length > 2) {
    issues.push('Excessive use of ALL CAPS');
    flags.push('formatting');
  }

  return {
    rule: 'content-appropriateness',
    passed: issues.length === 0,
    severity: issues.length > 0 ? 'error' : 'info',
    message: issues.length > 0 ? issues.join('; ') : 'Content is appropriate and unbiased',
    details: { issues, flags },
  };
}

/**
 * Validate grammar and formatting.
 */
function validateGrammar(question: GeneratedQuestion): ValidationRuleResult {
  const stem = question.stem;
  const issues: string[] = [];

  // Check for proper capitalization
  const firstChar = stem.charAt(0);
  if (stem.length > 0 && firstChar !== firstChar.toUpperCase()) {
    issues.push('Stem should start with a capital letter');
  }

  // Check for proper punctuation at end
  if (!/[.?!:]$/.test(stem.trim())) {
    issues.push('Stem should end with proper punctuation');
  }

  // Check for multiple spaces
  if (/\s{2,}/.test(stem)) {
    issues.push('Remove extra spaces');
  }

  // Check for common typos/issues
  if (/\bi\b/.test(stem)) {
    // lowercase 'i' for first person
    issues.push('Capitalize "I" for first person pronoun');
  }

  // Check options formatting
  if (question.options) {
    for (const opt of question.options) {
      const firstChar = opt.text.charAt(0);
      if (opt.text.length > 0 && firstChar !== firstChar.toUpperCase()) {
        // This is often intentional, so just a warning
        issues.push(`Option ${opt.id} should start with capital letter`);
      }
    }
  }

  return {
    rule: 'grammar-formatting',
    passed: issues.length <= 1, // Allow one minor issue
    severity: issues.length > 1 ? 'warning' : 'info',
    message: issues.length > 0 ? issues.join('; ') : 'Grammar and formatting are correct',
    details: { issues },
  };
}

/**
 * Validate explanation quality.
 */
function validateExplanation(question: GeneratedQuestion): ValidationRuleResult {
  const explanation = question.explanation || '';
  const issues: string[] = [];

  if (!explanation || explanation.length < VALIDATION_CONFIG.minExplanationLength) {
    issues.push('Explanation is too brief or missing');
  }

  // Check that explanation doesn't just repeat the answer
  if (question.type === 'multiple-choice' && question.options) {
    const correctOption = question.options.find((o) => o.isCorrect);
    if (correctOption && explanation.toLowerCase().includes(correctOption.text.toLowerCase())) {
      // This is actually fine if there's more context
      if (explanation.length < correctOption.text.length * 2) {
        issues.push('Explanation should elaborate beyond just stating the answer');
      }
    }
  }

  // Check for educational value
  const hasEducationalValue =
    /because|reason|due to|since|therefore|shows|demonstrates|indicates|means/i.test(explanation);
  if (!hasEducationalValue && explanation.length < 100) {
    issues.push('Explanation should provide educational reasoning');
  }

  return {
    rule: 'explanation-quality',
    passed: issues.length === 0,
    severity: issues.length > 0 ? 'warning' : 'info',
    message: issues.length > 0 ? issues.join('; ') : 'Explanation provides good educational value',
    details: { issues, explanationLength: explanation.length },
  };
}

/**
 * Validate standards alignment.
 */
function validateStandardsAlignment(question: GeneratedQuestion): ValidationRuleResult {
  const standards = question.standardsAlignment || [];

  if (standards.length === 0) {
    return {
      rule: 'standards-alignment',
      passed: false,
      severity: 'warning',
      message: 'Question should be aligned to at least one educational standard',
      details: { standardsCount: 0 },
    };
  }

  // Validate standard code format (basic check)
  const validStandardPattern = /^[A-Z]{2,5}[.-_]?[A-Z0-9]+/;
  const invalidStandards = standards.filter((s) => !validStandardPattern.test(s));

  return {
    rule: 'standards-alignment',
    passed: invalidStandards.length === 0,
    severity: invalidStandards.length > 0 ? 'info' : 'info',
    message:
      invalidStandards.length > 0
        ? `Some standards may have invalid format: ${invalidStandards.join(', ')}`
        : `Aligned to ${standards.length} standard(s)`,
    details: { standardsCount: standards.length, invalidStandards },
  };
}

/**
 * Validate cognitive level appropriateness.
 */
function validateCognitiveLevel(
  question: GeneratedQuestion,
  gradeBand?: GradeBand
): ValidationRuleResult {
  const level = question.cognitiveLevel;

  // Higher cognitive levels should be less common for younger grades
  const appropriateLevels: Record<string, CognitiveLevel[]> = {
    K5: ['remember', 'understand', 'apply'],
    G6_8: ['remember', 'understand', 'apply', 'analyze'],
    G9_12: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
  };

  const band = gradeBand ?? 'G6_8';
  const allowed = appropriateLevels[band] ?? appropriateLevels.G6_8;

  const isAppropriate = allowed.includes(level);

  return {
    rule: 'cognitive-level',
    passed: true, // Don't block, just inform
    severity: 'info',
    message: isAppropriate
      ? `Cognitive level "${level}" is appropriate for ${band}`
      : `Cognitive level "${level}" may be advanced for ${band}`,
    details: { level, gradeBand: band, isTypical: isAppropriate },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a question against all quality rules.
 */
export function validateQuestion(
  question: GeneratedQuestion,
  gradeBand?: GradeBand
): QuestionValidationResult {
  const rules: ValidationRuleResult[] = [
    validateStemClarity(question),
    validateOptions(question),
    validateReadingLevel(question, gradeBand),
    validateContent(question),
    validateGrammar(question),
    validateExplanation(question),
    validateStandardsAlignment(question),
    validateCognitiveLevel(question, gradeBand),
  ];

  // Calculate overall validity (must pass all error-level rules)
  const errors = rules.filter((r) => !r.passed && r.severity === 'error');
  const warnings = rules.filter((r) => !r.passed && r.severity === 'warning');

  const isValid = errors.length === 0;

  // Calculate overall score
  const ruleWeight = 1 / rules.length;
  const overallScore = rules.reduce((score, rule) => {
    if (rule.passed) return score + ruleWeight;
    if (rule.severity === 'error') return score;
    if (rule.severity === 'warning') return score + ruleWeight * 0.5;
    return score + ruleWeight * 0.8;
  }, 0);

  // Generate suggestions
  const suggestions: string[] = [];
  if (errors.length > 0) {
    suggestions.push(...errors.map((e) => `Fix: ${e.message}`));
  }
  if (warnings.length > 0) {
    suggestions.push(...warnings.map((w) => `Consider: ${w.message}`));
  }

  return {
    questionId: question.id,
    isValid,
    overallScore: Math.round(overallScore * 100) / 100,
    rules,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Quick validation check - returns true if question passes basic checks.
 */
export function isQuestionValid(question: GeneratedQuestion): boolean {
  const result = validateQuestion(question);
  return result.isValid;
}

/**
 * Get validation score for sorting/ranking questions.
 */
export function getValidationScore(question: GeneratedQuestion, gradeBand?: GradeBand): number {
  const result = validateQuestion(question, gradeBand);
  return result.overallScore;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate multiple questions and return summary.
 */
export function validateQuestions(
  questions: GeneratedQuestion[],
  gradeBand?: GradeBand
): {
  results: QuestionValidationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    averageScore: number;
    commonIssues: { issue: string; count: number }[];
  };
} {
  const results = questions.map((q) => validateQuestion(q, gradeBand));

  const passed = results.filter((r) => r.isValid).length;
  const failed = results.filter((r) => !r.isValid).length;
  const averageScore = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length || 0;

  // Count common issues
  const issueCount = new Map<string, number>();
  for (const result of results) {
    for (const rule of result.rules) {
      if (!rule.passed) {
        const key = rule.rule;
        issueCount.set(key, (issueCount.get(key) || 0) + 1);
      }
    }
  }

  const commonIssues = [...issueCount.entries()]
    .map(([issue, count]) => ({ issue, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    results,
    summary: {
      total: questions.length,
      passed,
      failed,
      averageScore: Math.round(averageScore * 100) / 100,
      commonIssues,
    },
  };
}

export default {
  validateQuestion,
  validateQuestions,
  isQuestionValid,
  getValidationScore,
};
