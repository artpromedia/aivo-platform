/**
 * Safety Post-Filter Module
 *
 * Inspects LLM responses AFTER generation but BEFORE returning to user.
 * Responsibilities:
 * - Detect and block direct homework answers (for HOMEWORK_HELPER)
 * - Detect and block medical/psychological diagnoses
 * - Detect self-harm instructions or encouragement
 * - Detect explicit content in responses
 * - Transform unsafe responses into safe alternatives
 *
 * Design:
 * - Pure function module
 * - Agent-type aware (different rules for different agents)
 * - Returns final output, safety actions, and incidents to log
 */

import type {
  AiRequest,
  IncidentInput,
  PostFilterResult,
  SafetyAction,
} from '../types/aiRequest.js';

import {
  getDiagnosisResponse,
  getHomeworkScaffoldResponse,
  getSafeResponse,
} from './safetyResponses.js';

// ────────────────────────────────────────────────────────────────────────────
// DETECTION PATTERNS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Patterns that indicate a direct homework answer.
 * These look for answer-giving language followed by specific values.
 */
const HOMEWORK_ANSWER_PATTERNS = {
  // Direct numerical answers
  MATH_ANSWER: /(?:the answer is|answer:|equals|=)\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)/gi,

  // Multiple choice answers
  MULTIPLE_CHOICE:
    /(?:the (?:correct )?answer is|the answer would be|select|choose)\s*(?:option\s+)?([A-Da-d])(?:\)|\.|\s|$)/gi,

  // Fill in the blank answers
  FILL_BLANK:
    /(?:the (?:correct )?(?:answer|word|term) is|blank should be|fill in with)\s*["']?([^"'\n.]{1,50})["']?/gi,

  // "Simply" or "Just" followed by the answer (lazy answers)
  LAZY_ANSWER: /(?:simply|just)\s+(?:put|write|enter|select|answer)\s+(.{1,30})/gi,

  // Direct solution statements
  DIRECT_SOLUTION: /(?:the solution is|x\s*=|y\s*=|z\s*=)\s*(-?\d+(?:\.\d+)?)/gi,

  // "Therefore" followed by final answer
  THEREFORE_ANSWER: /therefore[,:]?\s+(?:the answer is\s+)?(-?\d+(?:\.\d+)?|[A-Da-d])\b/gi,
};

/**
 * Patterns that indicate a diagnosis or medical claim.
 */
const DIAGNOSIS_PATTERNS = [
  /\byou (?:have|are|likely have|probably have|seem to have|appear to have)\s+(?:adhd|autism|dyslexia|depression|anxiety|add|ocd|bipolar)/gi,
  /\bthis (?:suggests|indicates|shows|means) you (?:have|are|might be)\s+(?:autistic|adhd|depressed|anxious|dyslexic)/gi,
  /\bbased on (?:this|what you(?:'ve| have) (?:said|described)),?\s+(?:you|it seems you)\s+(?:have|are|might be|probably)\s+/gi,
  /\bi (?:think|believe) you (?:have|are|might be)\s+(?:autistic|adhd|depressed|anxious|dyslexic)/gi,
  /\bmy (?:diagnosis|assessment) is (?:that you have|that you are)/gi,
  /\byou (?:fit the|match the|show the)\s+(?:criteria|profile|signs)\s+(?:for|of)\s+(?:adhd|autism|dyslexia|depression|anxiety)/gi,
];

/**
 * Patterns that indicate self-harm encouragement or instructions.
 */
const SELF_HARM_OUTPUT_PATTERNS = [
  /\b(?:ways to|how to|methods to|steps to)\s+(?:kill yourself|commit suicide|end your life|hurt yourself|self-harm)/gi,
  /\b(?:it's okay to|you should|you could)\s+(?:hurt yourself|end it|give up)/gi,
  /\bno one would miss you\b/gi,
  /\byou'd be better off dead\b/gi,
  /\blife isn't worth living\b/gi,
];

/**
 * Patterns for explicit/inappropriate content in responses.
 */
const EXPLICIT_OUTPUT_PATTERNS = [
  /\b(?:sexual|erotic|pornographic)\s+(?:content|material|act|position)/gi,
  /\b(?:graphic|detailed)\s+(?:violence|gore|torture)/gi,
  /\b(?:step-by-step|instructions for|how to make)\s+(?:bomb|weapon|drugs|poison)/gi,
];

/**
 * Patterns for bias, hate, or harassment.
 */
const BIAS_OUTPUT_PATTERNS = [
  /\b(?:all|every)\s+(?:jews|muslims|christians|blacks|whites|asians|mexicans|women|men)\s+(?:are|should)/gi,
  /\b(?:inferior|superior)\s+race\b/gi,
];

// ────────────────────────────────────────────────────────────────────────────
// POST-FILTER IMPLEMENTATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Main safety post-filter function.
 *
 * Analyzes LLM output for safety concerns BEFORE returning to user.
 *
 * @param request - The original AI request
 * @param rawOutput - The raw LLM output
 * @returns PostFilterResult with final output, actions, and incidents
 */
export function safetyPostFilter(request: AiRequest, rawOutput: string): PostFilterResult {
  const safetyActions: SafetyAction[] = [];
  const incidents: IncidentInput[] = [];
  let finalOutput = rawOutput;
  let action: 'PASS' | 'TRANSFORM' | 'BLOCK' = 'PASS';

  // ─── Check for BLOCKING conditions (highest priority) ────────────────────

  // 1. Self-harm encouragement in output - BLOCK immediately
  if (containsSelfHarmOutput(rawOutput)) {
    action = 'BLOCK';
    safetyActions.push('MODIFIED_UNSAFE_RESPONSE');
    finalOutput = getSafeResponse('SELF_HARM', request.locale);

    incidents.push(
      createIncident(
        request,
        'HIGH',
        'SELF_HARM',
        rawOutput,
        'Self-harm encouragement detected in LLM output'
      )
    );

    return { action, finalOutput, safetyActions, incidents };
  }

  // 2. Explicit/dangerous content - BLOCK
  if (containsExplicitOutput(rawOutput)) {
    action = 'BLOCK';
    safetyActions.push('MODIFIED_UNSAFE_RESPONSE');
    finalOutput = getSafeResponse('EXPLICIT_CONTENT', request.locale);

    incidents.push(
      createIncident(
        request,
        'HIGH',
        'EXPLICIT_CONTENT',
        rawOutput,
        'Explicit or dangerous content detected in LLM output'
      )
    );

    return { action, finalOutput, safetyActions, incidents };
  }

  // 3. Bias/hate content - BLOCK
  if (containsBiasOutput(rawOutput)) {
    action = 'BLOCK';
    safetyActions.push('MODIFIED_UNSAFE_RESPONSE');
    finalOutput = getSafeResponse('OTHER', request.locale);

    incidents.push(
      createIncident(
        request,
        'HIGH',
        'OTHER',
        rawOutput,
        'Biased or hateful content detected in LLM output'
      )
    );

    return { action, finalOutput, safetyActions, incidents };
  }

  // ─── Check for TRANSFORM conditions ──────────────────────────────────────

  // 4. Diagnosis attempts - TRANSFORM
  if (containsDiagnosisOutput(rawOutput)) {
    action = 'TRANSFORM';
    safetyActions.push('BLOCKED_DIAGNOSIS_ATTEMPT');
    finalOutput = getDiagnosisResponse(request.locale);

    incidents.push(
      createIncident(
        request,
        'MEDIUM',
        'DIAGNOSIS_ATTEMPT',
        rawOutput,
        'Diagnosis-like statement detected in LLM output'
      )
    );

    return { action, finalOutput, safetyActions, incidents };
  }

  // 5. Homework answers - TRANSFORM (only for HOMEWORK_HELPER)
  if (request.agentType === 'HOMEWORK_HELPER') {
    const answerCheck = detectHomeworkAnswer(rawOutput);
    if (answerCheck.hasDirectAnswer) {
      action = 'TRANSFORM';
      safetyActions.push('BLOCKED_HOMEWORK_ANSWER');

      // Generate scaffolding response instead
      const subject = request.meta?.subject ?? 'MATH';
      finalOutput = getHomeworkScaffoldResponse(subject, rawOutput, request.locale);

      incidents.push(
        createIncident(
          request,
          'LOW',
          'HOMEWORK_ANSWER_BLOCKED',
          rawOutput,
          `Direct answer detected: ${answerCheck.matchedPatterns.join(', ')}`
        )
      );

      return { action, finalOutput, safetyActions, incidents };
    }
  }

  // ─── No safety concerns detected ─────────────────────────────────────────

  return {
    action: 'PASS',
    finalOutput: rawOutput,
    safetyActions: [],
    incidents: [],
  };
}

// ────────────────────────────────────────────────────────────────────────────
// DETECTION FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Detect if output contains direct homework answers.
 */
function detectHomeworkAnswer(output: string): {
  hasDirectAnswer: boolean;
  matchedPatterns: string[];
  detectedAnswers: string[];
} {
  const matchedPatterns: string[] = [];
  const detectedAnswers: string[] = [];

  for (const [patternName, pattern] of Object.entries(HOMEWORK_ANSWER_PATTERNS)) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(output)) !== null) {
      matchedPatterns.push(patternName);
      if (match[1]) {
        detectedAnswers.push(match[1]);
      }
    }

    // Reset for next use
    pattern.lastIndex = 0;
  }

  // Additional heuristic: very short responses that look like answers
  const trimmed = output.trim();
  if (trimmed.length < 20 && /^(-?\d+(?:\.\d+)?|[A-Da-d])\.?$/.test(trimmed)) {
    matchedPatterns.push('SHORT_ANSWER');
    detectedAnswers.push(trimmed);
  }

  return {
    hasDirectAnswer: matchedPatterns.length > 0,
    matchedPatterns: [...new Set(matchedPatterns)],
    detectedAnswers: [...new Set(detectedAnswers)],
  };
}

/**
 * Check if output contains diagnosis-like statements.
 */
function containsDiagnosisOutput(output: string): boolean {
  for (const pattern of DIAGNOSIS_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(output)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}

/**
 * Check if output contains self-harm encouragement.
 */
function containsSelfHarmOutput(output: string): boolean {
  for (const pattern of SELF_HARM_OUTPUT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(output)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}

/**
 * Check if output contains explicit or dangerous content.
 */
function containsExplicitOutput(output: string): boolean {
  for (const pattern of EXPLICIT_OUTPUT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(output)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}

/**
 * Check if output contains bias or hate.
 */
function containsBiasOutput(output: string): boolean {
  for (const pattern of BIAS_OUTPUT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(output)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create an incident from post-filter detection.
 */
function createIncident(
  request: AiRequest,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  category: string,
  rawOutput: string,
  reason: string
): IncidentInput {
  // Create a short, redacted summary of the output (max 100 chars)
  const outputSummary = summarizeForIncident(rawOutput, 100);

  const incident: IncidentInput = {
    tenantId: request.tenantId,
    agentType: request.agentType,
    severity,
    category: category as IncidentInput['category'],
    inputSummary: summarizeForIncident(request.input, 100),
    outputSummary,
    metadata: {
      reason,
      locale: request.locale,
      sessionId: request.sessionId,
      agentType: request.agentType,
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
 */
function summarizeForIncident(text: string, maxLength: number): string {
  // Remove potential PII patterns
  let summary = text;
  summary = summary.replaceAll(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gi, '[EMAIL]');
  summary = summary.replaceAll(
    /\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    '[PHONE]'
  );

  // Truncate
  if (summary.length > maxLength) {
    summary = summary.slice(0, maxLength - 3) + '...';
  }

  return summary;
}

/**
 * Strip direct answers from output while keeping explanation.
 * Used when we want to preserve educational content but remove answers.
 */
export function stripDirectAnswers(output: string): string {
  let result = output;

  // Replace "The answer is X" patterns with prompts
  result = result.replaceAll(
    /(?:the answer is|answer:|equals)\s*(-?\d+(?:\.\d+)?(?:\/\d+)?)/gi,
    'Now, can you work through this to find the answer?'
  );

  // Replace multiple choice answers
  result = result.replaceAll(
    /(?:the (?:correct )?answer is|select|choose)\s*(?:option\s+)?([A-Da-d])(?:\)|\.|\s|$)/gi,
    'Try working through each option to find the correct answer.'
  );

  return result;
}

// ────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ────────────────────────────────────────────────────────────────────────────

export {
  // For testing
  HOMEWORK_ANSWER_PATTERNS,
  DIAGNOSIS_PATTERNS,
  SELF_HARM_OUTPUT_PATTERNS,
  EXPLICIT_OUTPUT_PATTERNS,
  detectHomeworkAnswer,
  containsDiagnosisOutput,
  containsSelfHarmOutput,
  containsExplicitOutput,
  containsBiasOutput,
};
