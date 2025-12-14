/**
 * Safety Pre-Filter Module
 *
 * Inspects incoming AI requests BEFORE they reach the LLM.
 * Responsibilities:
 * - PII detection and redaction (names, addresses, phone numbers, emails)
 * - Sensitive topic detection (self-harm, abuse, violence)
 * - Disallowed content blocking (explicit sexual content, hate speech)
 * - Medical/diagnostic language detection
 *
 * Design:
 * - Pure function module (no side effects)
 * - Rule-based regex + keyword detection (ML-ready for future)
 * - Returns action (ALLOW/REDACT/BLOCK), sanitized input, and flags
 */

import type { AiRequest, IncidentInput, PreFilterResult, SafetyFlag } from '../types/aiRequest.js';

import { getSafeResponse } from './safetyResponses.js';

// ────────────────────────────────────────────────────────────────────────────
// PATTERN DEFINITIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * PII Detection Patterns
 * These patterns identify potentially sensitive personal information.
 */
const PII_PATTERNS = {
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone numbers (US and international formats)
  PHONE: /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,

  // Social Security Numbers
  SSN: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,

  // Street addresses (simplified pattern)
  ADDRESS:
    /\b\d{1,5}\s+[A-Za-z0-9\s]{2,30}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Circle|Cir|Place|Pl)\b/gi,

  // Names (very simplified - captures "My name is X" patterns)
  NAME_INTRO: /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi,

  // Credit card numbers (simplified)
  CREDIT_CARD: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g,
};

/**
 * Self-harm and suicidal ideation patterns.
 * These require IMMEDIATE blocking and safe response.
 */
const SELF_HARM_PATTERNS = [
  // Direct statements
  /\b(?:want to|going to|thinking about|plan to)\s+(?:kill|hurt|harm)\s+(?:myself|me)\b/i,
  /\b(?:don't want to|do not want to)\s+(?:live|be alive|exist)\s+(?:anymore)?\b/i,
  /\b(?:end|take)\s+(?:my|own)\s+life\b/i,
  /\bsuicid(?:e|al)\b/i,
  /\bself[- ]?harm\b/i,
  /\bcut(?:ting)?\s+(?:myself|me)\b/i,
  /\b(?:wish i was|wish i were)\s+dead\b/i,
  /\bno(?:body|one)\s+(?:would|will)\s+(?:miss|care)\b/i,
  /\b(?:everyone|world)\s+(?:would be|is)\s+better\s+(?:off|without)\s+(?:me|if i)\b/i,
];

/**
 * Abuse detection patterns.
 * Indicates potential abuse situations that need adult intervention.
 */
const ABUSE_PATTERNS = [
  /\b(?:someone|he|she|they)\s+(?:hit|hits|hurt|hurts|touch|touches)\s+me\b/i,
  /\bafraid\s+(?:of|to go)\s+home\b/i,
  /\b(?:parent|mom|dad|guardian|teacher|coach)\s+(?:hit|hits|hurt|hurts)\b/i,
  /\bsex(?:ual)?\s+(?:abuse|assault|touch)\b/i,
  /\binappropriate\s+touch/i,
  /\bdomestic\s+(?:violence|abuse)\b/i,
];

/**
 * Violence patterns (threats or descriptions of violence).
 */
const VIOLENCE_PATTERNS = [
  /\b(?:want to|going to|will)\s+(?:kill|hurt|harm|attack)\s+(?:someone|them|him|her|people)\b/i,
  /\bbring(?:ing)?\s+(?:a\s+)?(?:gun|weapon|knife)\s+to\s+school\b/i,
  /\bshoot(?:ing)?\s+up\b/i,
  /\bterrorist|bomb\s+threat\b/i,
];

/**
 * Explicit sexual content patterns.
 */
const EXPLICIT_PATTERNS = [
  /\b(?:porn|pornograph|explicit\s+sex|sexual\s+act)\b/i,
  /\bnude|naked\s+(?:picture|photo|image|video)\b/i,
  /\bsexting\b/i,
];

/**
 * Medical/diagnostic seeking patterns.
 * Users should not be "diagnosed" by AI.
 */
const DIAGNOSIS_SEEKING_PATTERNS = [
  /\bdo\s+i\s+have\s+(?:adhd|autism|dyslexia|depression|anxiety|add|ocd)\b/i,
  /\bdiagnose\s+me\b/i,
  /\bam\s+i\s+(?:autistic|adhd|depressed|anxious|dyslexic)\b/i,
  /\bwhat(?:'s| is)\s+(?:wrong|my\s+diagnosis)\s+(?:with me)?\b/i,
  /\bi\s+(?:think|feel)\s+(?:i'm|i am|like i)\s+(?:autistic|adhd|depressed)\b/i,
];

/**
 * Hate speech and harassment patterns.
 */
const HATE_PATTERNS = [
  /\b(?:hate|kill|attack)\s+(?:all)?\s*(?:jews|muslims|christians|blacks|whites|asians|gays|lesbians|trans)\b/i,
  /\bracist|racism\b/i,
  /\bn[i1]gg[e3a]r\b/i,
  /\bf[a4]gg[o0]t\b/i,
];

// ────────────────────────────────────────────────────────────────────────────
// PRE-FILTER IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Main safety pre-filter function.
 *
 * Analyzes input for safety concerns BEFORE sending to the LLM.
 *
 * @param request - The AI request to filter
 * @returns PreFilterResult with action, sanitized input, and flags
 */
export function safetyPreFilter(request: AiRequest): PreFilterResult {
  const input = request.input;
  const flags: SafetyFlag[] = [];
  let sanitizedInput = input;
  let shouldBlock = false;
  let blockCategory:
    | 'SELF_HARM'
    | 'ABUSE_DETECTED'
    | 'VIOLENCE_DETECTED'
    | 'EXPLICIT_CONTENT'
    | null = null;

  // ─── Check for BLOCKING conditions (highest priority) ────────────────────

  // 1. Self-harm / Suicidal ideation - BLOCK immediately
  for (const pattern of SELF_HARM_PATTERNS) {
    if (pattern.test(input)) {
      flags.push({
        category: 'SELF_HARM',
        severity: 'HIGH',
        confidence: 0.95,
        matchedPattern: pattern.source,
      });
      shouldBlock = true;
      blockCategory = 'SELF_HARM';
      break;
    }
  }

  // 2. Abuse detection - BLOCK and escalate
  if (!shouldBlock) {
    for (const pattern of ABUSE_PATTERNS) {
      if (pattern.test(input)) {
        flags.push({
          category: 'ABUSE_DETECTED',
          severity: 'HIGH',
          confidence: 0.9,
          matchedPattern: pattern.source,
        });
        shouldBlock = true;
        blockCategory = 'ABUSE_DETECTED';
        break;
      }
    }
  }

  // 3. Violence threats - BLOCK
  if (!shouldBlock) {
    for (const pattern of VIOLENCE_PATTERNS) {
      if (pattern.test(input)) {
        flags.push({
          category: 'VIOLENCE_DETECTED',
          severity: 'HIGH',
          confidence: 0.9,
          matchedPattern: pattern.source,
        });
        shouldBlock = true;
        blockCategory = 'VIOLENCE_DETECTED';
        break;
      }
    }
  }

  // 4. Explicit content - BLOCK
  if (!shouldBlock) {
    for (const pattern of EXPLICIT_PATTERNS) {
      if (pattern.test(input)) {
        flags.push({
          category: 'EXPLICIT_CONTENT',
          severity: 'HIGH',
          confidence: 0.9,
          matchedPattern: pattern.source,
        });
        shouldBlock = true;
        blockCategory = 'EXPLICIT_CONTENT';
        break;
      }
    }
  }

  // 5. Hate speech - BLOCK
  if (!shouldBlock) {
    for (const pattern of HATE_PATTERNS) {
      if (pattern.test(input)) {
        flags.push({
          category: 'OTHER',
          severity: 'HIGH',
          confidence: 0.9,
          matchedPattern: pattern.source,
        });
        shouldBlock = true;
        blockCategory = 'EXPLICIT_CONTENT'; // Treat hate as explicit/disallowed
        break;
      }
    }
  }

  // If blocking, return immediately with safe response
  if (shouldBlock && blockCategory) {
    const safeResponse = getSafeResponse(blockCategory, request.locale);
    const firstFlag = flags[0];
    const result: PreFilterResult = {
      action: 'BLOCK',
      sanitizedInput: '',
      flags,
      safeResponse,
    };
    if (firstFlag) {
      result.incident = createIncident(request, firstFlag, input);
    }
    return result;
  }

  // ─── Check for REDACTION conditions ──────────────────────────────────────

  let hasRedactions = false;

  // Redact PII
  sanitizedInput = redactPII(sanitizedInput, (category) => {
    hasRedactions = true;
    flags.push({
      category: 'PII_DETECTED',
      severity: 'LOW',
      confidence: 0.85,
      matchedPattern: category,
    });
  });

  // ─── Check for LOW severity flags (don't block, but log) ─────────────────

  // Medical/diagnostic seeking - flag but don't block (post-filter handles response)
  for (const pattern of DIAGNOSIS_SEEKING_PATTERNS) {
    if (pattern.test(input)) {
      flags.push({
        category: 'DIAGNOSIS_ATTEMPT',
        severity: 'MEDIUM',
        confidence: 0.8,
        matchedPattern: pattern.source,
      });
      // Don't break - we still want to proceed but flag it
      break;
    }
  }

  // ─── Return result ───────────────────────────────────────────────────────

  if (hasRedactions) {
    const hasSignificantFlag = flags.some((f) => f.severity === 'MEDIUM' || f.severity === 'HIGH');
    const firstFlag = flags[0];
    const result: PreFilterResult = {
      action: 'REDACT',
      sanitizedInput,
      flags,
    };
    if (hasSignificantFlag && firstFlag) {
      result.incident = createIncident(request, firstFlag, input);
    }
    return result;
  }

  // Check if we need to create a low-priority incident for flags
  const incidentFlag = flags.find((f) => f.severity === 'MEDIUM');

  const result: PreFilterResult = {
    action: 'ALLOW',
    sanitizedInput,
    flags,
  };

  if (incidentFlag) {
    result.incident = createIncident(request, incidentFlag, input);
  }

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Redact PII from text using pattern matching.
 *
 * @param text - Input text to redact
 * @param onRedact - Callback when a redaction occurs
 * @returns Redacted text
 */
function redactPII(text: string, onRedact: (category: string) => void): string {
  let result = text;

  // Redact emails
  if (PII_PATTERNS.EMAIL.test(result)) {
    onRedact('EMAIL');
    result = result.replace(PII_PATTERNS.EMAIL, '[EMAIL]');
  }

  // Reset regex lastIndex
  PII_PATTERNS.EMAIL.lastIndex = 0;

  // Redact phone numbers
  if (PII_PATTERNS.PHONE.test(result)) {
    onRedact('PHONE');
    result = result.replace(PII_PATTERNS.PHONE, '[PHONE]');
  }
  PII_PATTERNS.PHONE.lastIndex = 0;

  // Redact SSN
  if (PII_PATTERNS.SSN.test(result)) {
    onRedact('SSN');
    result = result.replace(PII_PATTERNS.SSN, '[SSN]');
  }
  PII_PATTERNS.SSN.lastIndex = 0;

  // Redact addresses
  if (PII_PATTERNS.ADDRESS.test(result)) {
    onRedact('ADDRESS');
    result = result.replace(PII_PATTERNS.ADDRESS, '[ADDRESS]');
  }
  PII_PATTERNS.ADDRESS.lastIndex = 0;

  // Redact name introductions (capture and replace the name part)
  const namePattern = /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  if (namePattern.test(result)) {
    namePattern.lastIndex = 0;
    onRedact('NAME');
    result = result.replace(namePattern, (match, _name) => {
      return match.replace(_name as string, '[NAME]');
    });
  }

  // Redact credit cards
  if (PII_PATTERNS.CREDIT_CARD.test(result)) {
    onRedact('CREDIT_CARD');
    result = result.replace(PII_PATTERNS.CREDIT_CARD, '[CARD]');
  }
  PII_PATTERNS.CREDIT_CARD.lastIndex = 0;

  return result;
}

/**
 * Create an incident input from detected flags.
 */
function createIncident(request: AiRequest, flag: SafetyFlag, rawInput: string): IncidentInput {
  // Create a short, redacted summary of the input (max 100 chars)
  const inputSummary = summarizeForIncident(rawInput, 100);

  const incident: IncidentInput = {
    tenantId: request.tenantId,
    agentType: request.agentType,
    severity: flag.severity,
    category: flag.category,
    inputSummary,
    metadata: {
      detectedPattern: flag.matchedPattern,
      confidence: flag.confidence,
      locale: request.locale,
      sessionId: request.sessionId,
    },
  };

  // Only add optional fields if they have values
  if (request.learnerId) {
    incident.learnerId = request.learnerId;
  }
  if (request.userId) {
    incident.userId = request.userId;
  }

  return incident;
}

/**
 * Create a short, redacted summary for incident logging.
 * Removes potential PII and truncates.
 */
function summarizeForIncident(text: string, maxLength: number): string {
  // First pass: redact obvious PII
  let summary = text;
  summary = summary.replace(PII_PATTERNS.EMAIL, '[EMAIL]');
  summary = summary.replace(PII_PATTERNS.PHONE, '[PHONE]');
  summary = summary.replace(PII_PATTERNS.SSN, '[SSN]');

  // Truncate
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength - 3) + '...';
  }

  return summary;
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export {
  // For testing
  PII_PATTERNS,
  SELF_HARM_PATTERNS,
  ABUSE_PATTERNS,
  VIOLENCE_PATTERNS,
  EXPLICIT_PATTERNS,
  DIAGNOSIS_SEEKING_PATTERNS,
  HATE_PATTERNS,
  redactPII,
};
