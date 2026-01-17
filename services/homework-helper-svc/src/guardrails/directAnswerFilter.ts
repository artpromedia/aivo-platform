/**
 * Guardrails module for ensuring AI responses don't contain direct answers.
 *
 * These checks are applied AFTER receiving AI responses to provide a final
 * safety layer. The AI agent prompt also includes guardrail instructions,
 * but post-processing catches any leaks.
 *
 * Integrates with the ai-orchestrator SAFETY agent for comprehensive
 * content moderation and age-appropriate content verification.
 */

import { config } from '../config.js';

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
// SAFETY AGENT INTEGRATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Additional safety patterns for comprehensive content analysis.
 * These supplement the direct answer patterns with content safety checks.
 */
const CONTENT_SAFETY_PATTERNS = [
  // Self-harm related
  /\b(suicide|self-harm|kill\s+(myself|yourself)|hurt\s+(myself|yourself))\b/i,
  // Dangerous content
  /\b(bomb|weapon|gun)\s+(make|build|create)\b/i,
  /\bhow\s+(do\s+)?(i|to)\s+(make|build|create)\s+(a\s+)?(bomb|weapon|gun)\b/i,
  // Explicit content
  /\b(porn|pornography|xxx|explicit\s+content)\b/i,
  // Hate speech
  /\b(hate|kill)\s+(all|every)\s+\w+/i,
  // Diagnosis-like statements (inappropriate for AI tutor)
  /\byou\s+(are|have)\s+(autistic|autism|adhd|dyslexia|anxiety|depression)\b/i,
];

/**
 * Check content with the SAFETY agent via ai-orchestrator.
 *
 * Calls the ai-orchestrator's internal API for comprehensive safety analysis,
 * including age-appropriate content checks and content moderation.
 *
 * @param text - Text to analyze
 * @param context - Optional context for more accurate analysis
 * @returns Promise resolving to safety check result
 */
export async function checkWithSafetyAgent(
  text: string,
  context?: { tenantId?: string; learnerId?: string; agentType?: string }
): Promise<{
  isSafe: boolean;
  concerns: string[];
}> {
  const concerns: string[] = [];

  // First, do local pattern checking for fast response
  const lowerText = text.toLowerCase();
  for (const pattern of CONTENT_SAFETY_PATTERNS) {
    if (pattern.test(lowerText)) {
      concerns.push(`Pattern match: ${pattern.source}`);
    }
  }

  // If we found concerns locally, return early
  if (concerns.length > 0) {
    return {
      isSafe: false,
      concerns,
    };
  }

  // Call ai-orchestrator for comprehensive safety check (if configured)
  if (config.aiOrchestratorUrl && config.aiOrchestratorApiKey) {
    try {
      const response = await fetch(`${config.aiOrchestratorUrl}/internal/ai/test-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-API-Key': config.aiOrchestratorApiKey,
        },
        body: JSON.stringify({
          tenantId: context?.tenantId ?? 'homework-helper',
          agentType: 'SAFETY',
          payload: {
            content: text,
            checkType: 'content_moderation',
          },
          metadata: {
            source: 'homework-helper-svc',
            learnerId: context?.learnerId,
          },
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        const result = (await response.json()) as {
          response?: {
            status?: string;
            label?: string;
            reason?: string;
          };
        };

        // Check if the safety agent flagged the content
        if (result.response?.status === 'BLOCKED' || result.response?.status === 'NEEDS_REVIEW') {
          concerns.push(result.response.reason ?? 'Content flagged by safety agent');
          return {
            isSafe: false,
            concerns,
          };
        }
      } else {
        // Log but don't fail - graceful degradation
        console.warn('[SafetyAgent] ai-orchestrator returned non-OK status', {
          status: response.status,
        });
      }
    } catch (error) {
      // Log but don't fail - graceful degradation
      console.warn('[SafetyAgent] Failed to call ai-orchestrator', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // If no concerns from either local or remote checks
  return {
    isSafe: true,
    concerns: [],
  };
}
