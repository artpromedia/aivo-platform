export type SafetyStatus = 'OK' | 'BLOCKED' | 'NEEDS_REVIEW';

export interface SafetyResult {
  status: SafetyStatus;
  reason?: string;
  transformedContent?: string;
}

export interface SafetyContext {
  tenantId: string;
  agentType: string;
  userRole?: string;
  learnerId?: string;
}

interface RawResponse {
  content: string;
}

const SELF_HARM_KEYWORDS = ['kill myself', 'suicide', 'hurt myself', 'end it all'];
const EXPLICIT_KEYWORDS = ['explicit sex', 'porn', 'sexual act'];
const DIAGNOSIS_PATTERNS = ['you are autistic', 'you have adhd', 'you have autism', 'you are adhd'];

const FALLBACK_MESSAGE =
  "I'm not able to answer that. Please talk to a trusted adult or professional.";

/**
 * Simple, deterministic safety evaluator. For extensibility, an external safety service (e.g.,
 * classifier model or third-party API) could be called here, and tenant-specific policies could
 * be injected to choose thresholds or rule sets.
 */
export function evaluateSafety(context: SafetyContext, rawResponse: RawResponse): SafetyResult {
  const text = rawResponse.content.toLowerCase();

  if (matchesAny(text, SELF_HARM_KEYWORDS)) {
    return {
      status: 'BLOCKED',
      reason: 'self-harm',
      transformedContent: FALLBACK_MESSAGE,
    };
  }

  if (matchesAny(text, EXPLICIT_KEYWORDS)) {
    return {
      status: 'BLOCKED',
      reason: 'explicit-content',
      transformedContent: FALLBACK_MESSAGE,
    };
  }

  if (matchesAny(text, DIAGNOSIS_PATTERNS)) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'diagnosis-like-statement',
      transformedContent: FALLBACK_MESSAGE,
    };
  }

  return { status: 'OK' };
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
