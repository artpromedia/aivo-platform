/**
 * Guardrails module for ensuring AI responses don't contain direct answers.
 *
 * These checks are applied AFTER receiving AI responses to provide a final
 * safety layer. The AI agent prompt also includes guardrail instructions,
 * but post-processing catches any leaks.
 *
 * In a production system, this would integrate with the SAFETY agent for
 * more sophisticated content moderation.
 */

// ══════════════════════════════════════════════════════════════════════════════
// DIRECT ANSWER DETECTION PATTERNS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate a direct answer is being given.
 * These are checked case-insensitively.
 */
const DIRECT_ANSWER_PATTERNS = [
  // Explicit answer phrases
  /\bthe answer is\b/i,
  /\bfinal answer[:\s]/i,
  /\bthe solution is\b/i,
  /\bthe correct answer\b/i,
  /\banswer[:\s]*=\s*\d/i,

  // Math-specific direct answers
  /\bx\s*=\s*-?\d+(\.\d+)?(?!\s*\?)/i, // x = 5 (but not "x = ?" as a question)
  /\by\s*=\s*-?\d+(\.\d+)?(?!\s*\?)/i,
  /\bequals\s+-?\d+(\.\d+)?\s*$/im, // "equals 42" at end of line

  // Conclusion phrases that give away answers
  /\btherefore,?\s+the\s+(answer|result|value)\b/i,
  /\bso\s+the\s+(answer|result|value)\s+is\b/i,
  /\bthis\s+(gives|equals|means)\s+-?\d+(\.\d+)?/i,

  // Science-specific
  /\bthe\s+formula\s+gives\s+us\b/i,
  /\bsubstituting.*we\s+get\s+-?\d/i,

  // ELA-specific (for reading comprehension)
  /\bthe\s+(main\s+idea|theme|moral)\s+is\s+that\b/i,
  /\bthe\s+author\s+(means|is\s+saying)\s+that\b/i,
];

/**
 * Phrases that should trigger review but might be acceptable in context.
 * These generate warnings but don't automatically redact.
 */
const WARNING_PATTERNS = [
  /\blet me show you\b/i,
  /\bhere's how to solve\b/i,
  /\bthe trick is\b/i,
  /\bjust\s+(multiply|divide|add|subtract)\b/i,
];

// ══════════════════════════════════════════════════════════════════════════════
// REPLACEMENT TEXT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generic scaffolding replacements for different contexts.
 */
const GENERIC_SCAFFOLDS = {
  math: "Let's think about this step by step. What operation do you think we should use here?",
  ela: "That's a great question to explore! What clues in the text help you understand this?",
  science: 'Good thinking! What scientific concept might help us understand this?',
  default: "Let's work through this together. What do you think the first step should be?",
};

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if text contains patterns that indicate a direct answer.
 * @param text - The text to check
 * @returns true if direct answer patterns are detected
 */
export function containsDirectAnswer(text: string): boolean {
  return DIRECT_ANSWER_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Check if text contains warning patterns that might need review.
 * @param text - The text to check
 * @returns Array of matched warning patterns
 */
export function checkWarningPatterns(text: string): string[] {
  const warnings: string[] = [];
  for (const pattern of WARNING_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push(pattern.source);
    }
  }
  return warnings;
}

/**
 * Apply guardrails to AI-generated text.
 * Removes or replaces content that gives direct answers.
 *
 * @param text - The AI-generated text to sanitize
 * @param subject - Optional subject for context-appropriate replacement
 * @returns Sanitized text with direct answers removed
 */
export function applyGuardrails(
  text: string,
  subject?: 'MATH' | 'ELA' | 'SCIENCE' | 'OTHER'
): string {
  let sanitized = text;

  // Check each pattern and replace if found
  for (const pattern of DIRECT_ANSWER_PATTERNS) {
    if (pattern.test(sanitized)) {
      // Find the sentence containing the match and replace it
      const sentences = sanitized.split(/(?<=[.!?])\s+/);
      sanitized = sentences
        .map((sentence) => {
          if (pattern.test(sentence)) {
            // Replace the problematic sentence with a scaffolding question
            return getReplacementScaffold(subject);
          }
          return sentence;
        })
        .join(' ');
    }
  }

  return sanitized.trim();
}

/**
 * Get a context-appropriate replacement scaffold.
 */
function getReplacementScaffold(subject?: 'MATH' | 'ELA' | 'SCIENCE' | 'OTHER'): string {
  switch (subject) {
    case 'MATH':
      return GENERIC_SCAFFOLDS.math;
    case 'ELA':
      return GENERIC_SCAFFOLDS.ela;
    case 'SCIENCE':
      return GENERIC_SCAFFOLDS.science;
    default:
      return GENERIC_SCAFFOLDS.default;
  }
}

/**
 * Full guardrail analysis result.
 */
export interface GuardrailResult {
  /** The sanitized text */
  sanitizedText: string;

  /** Whether any direct answer patterns were found and removed */
  directAnswersRemoved: boolean;

  /** Warning patterns that were detected but not removed */
  warnings: string[];

  /** Whether the text was modified */
  wasModified: boolean;
}

/**
 * Analyze and sanitize text with full reporting.
 * Use this for detailed guardrail analysis.
 *
 * @param text - The text to analyze
 * @param subject - Optional subject for context
 * @returns Full guardrail analysis result
 */
export function analyzeAndSanitize(
  text: string,
  subject?: 'MATH' | 'ELA' | 'SCIENCE' | 'OTHER'
): GuardrailResult {
  const directAnswersRemoved = containsDirectAnswer(text);
  const warnings = checkWarningPatterns(text);
  const sanitizedText = applyGuardrails(text, subject);
  const wasModified = sanitizedText !== text;

  return {
    sanitizedText,
    directAnswersRemoved,
    warnings,
    wasModified,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// SAFETY AGENT INTEGRATION (stub for future implementation)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Placeholder for SAFETY agent integration.
 * In production, this would call the ai-orchestrator SAFETY agent
 * for more sophisticated content analysis.
 *
 * @param _text - Text to analyze
 * @returns Promise resolving to safety check result
 */
export async function checkWithSafetyAgent(_text: string): Promise<{
  isSafe: boolean;
  concerns: string[];
}> {
  // TODO: Implement SAFETY agent integration
  // const response = await aiOrchestratorClient.callSafetyAgent(text);
  // return response;

  // For now, just use static patterns
  return {
    isSafe: true,
    concerns: [],
  };
}
