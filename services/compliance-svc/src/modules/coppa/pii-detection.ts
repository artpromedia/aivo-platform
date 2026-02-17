/**
 * COPPA/Compliance PII Detection Module
 *
 * PRD: Detect and block PII in AI chat conversations with minors.
 * Children under 13 must not be able to share personal information
 * through AI tutoring sessions. This module provides real-time
 * PII scanning of chat messages before they reach the AI.
 *
 * Detected PII categories:
 * - Email addresses
 * - Phone numbers
 * - Physical addresses / street names
 * - Social security numbers
 * - Full names (when prefixed with "my name is")
 * - URLs / social media handles
 * - Credit card numbers
 * - Date of birth patterns
 */

export interface PiiDetectionResult {
  hasPii: boolean;
  detectedTypes: PiiType[];
  sanitizedText: string;
  details: PiiMatch[];
}

export interface PiiMatch {
  type: PiiType;
  value: string;
  startIndex: number;
  endIndex: number;
  confidence: number;
}

export type PiiType =
  | 'EMAIL'
  | 'PHONE'
  | 'SSN'
  | 'ADDRESS'
  | 'FULL_NAME'
  | 'URL'
  | 'SOCIAL_HANDLE'
  | 'CREDIT_CARD'
  | 'DATE_OF_BIRTH'
  | 'PHOTO_REQUEST'
  | 'LOCATION';

// PII detection patterns
const PII_PATTERNS: { type: PiiType; pattern: RegExp; confidence: number }[] = [
  // Email addresses
  {
    type: 'EMAIL',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi,
    confidence: 0.99,
  },
  // Phone numbers (US formats)
  {
    type: 'PHONE',
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    confidence: 0.95,
  },
  // Social Security Numbers
  {
    type: 'SSN',
    pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    confidence: 0.90,
  },
  // Credit card numbers
  {
    type: 'CREDIT_CARD',
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    confidence: 0.90,
  },
  // URLs
  {
    type: 'URL',
    pattern: /https?:\/\/[^\s]+/gi,
    confidence: 0.99,
  },
  // Social media handles
  {
    type: 'SOCIAL_HANDLE',
    pattern: /(?:@[A-Za-z0-9_]{3,30})\b/g,
    confidence: 0.85,
  },
  // Street addresses (simple pattern)
  {
    type: 'ADDRESS',
    pattern: /\b\d{1,5}\s+(?:[A-Za-z]+\s){1,3}(?:St(?:reet)?|Ave(?:nue)?|Blvd|Dr(?:ive)?|Rd|Road|Ln|Lane|Ct|Court|Way|Pl(?:ace)?)\b/gi,
    confidence: 0.85,
  },
  // "My name is..." pattern (children volunteering their name)
  {
    type: 'FULL_NAME',
    pattern: /\bmy (?:full )?name is\s+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})\b/gi,
    confidence: 0.80,
  },
  // "I live in/at..." pattern (location disclosure)
  {
    type: 'LOCATION',
    pattern: /\bI (?:live|stay|am) (?:in|at|on)\s+(.{5,40}?)(?:\.|,|$)/gi,
    confidence: 0.75,
  },
  // Date of birth patterns
  {
    type: 'DATE_OF_BIRTH',
    pattern: /\b(?:born on|birthday is|dob|date of birth)\b.*?\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/gi,
    confidence: 0.90,
  },
  // Photo/selfie requests (PRD: no photo collection from minors)
  {
    type: 'PHOTO_REQUEST',
    pattern: /\b(?:send|share|upload|take)\s+(?:a\s+)?(?:photo|picture|selfie|image|pic)\b/gi,
    confidence: 0.85,
  },
];

const REDACTION_PLACEHOLDER = '[REDACTED]';

/**
 * Scan text for PII and return detection results.
 */
export function detectPii(text: string): PiiDetectionResult {
  const matches: PiiMatch[] = [];
  let sanitizedText = text;

  for (const { type, pattern, confidence } of PII_PATTERNS) {
    // Reset pattern lastIndex for global patterns
    pattern.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type,
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        confidence,
      });
    }
  }

  // Sort matches by position (reverse) so we can replace without offset issues
  const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
  for (const m of sortedMatches) {
    sanitizedText =
      sanitizedText.slice(0, m.startIndex) +
      REDACTION_PLACEHOLDER +
      sanitizedText.slice(m.endIndex);
  }

  const detectedTypes = [...new Set(matches.map((m) => m.type))];

  return {
    hasPii: matches.length > 0,
    detectedTypes,
    sanitizedText,
    details: matches.sort((a, b) => a.startIndex - b.startIndex),
  };
}

/**
 * Check if a message should be blocked from AI processing.
 * PRD: Block messages containing PII from minors in AI chat.
 */
export function shouldBlockMessage(text: string, isMinor: boolean): {
  blocked: boolean;
  reason?: string;
  detectedPii?: PiiType[];
} {
  if (!isMinor) {
    return { blocked: false };
  }

  const result = detectPii(text);

  if (result.hasPii) {
    return {
      blocked: true,
      reason:
        'Your message contains personal information that cannot be shared. ' +
        'For your safety, please do not share personal details like your name, ' +
        'email, phone number, address, or photos.',
      detectedPii: result.detectedTypes,
    };
  }

  return { blocked: false };
}

/**
 * Sanitize a message by redacting PII.
 * Use when the message should still be processed but with PII removed.
 */
export function sanitizeMessage(text: string): string {
  const result = detectPii(text);
  return result.sanitizedText;
}
