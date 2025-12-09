export type SafetyStatus = 'OK' | 'BLOCKED' | 'NEEDS_REVIEW';

/** More granular safety labels for logging and incident management */
export type SafetyLabel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface SafetyResult {
  status: SafetyStatus;
  /** Granular label for logging/incidents */
  label: SafetyLabel;
  reason?: string | undefined;
  transformedContent?: string | undefined;
}

export interface SafetyContext {
  tenantId: string;
  agentType: string;
  userRole?: string | undefined;
  learnerId?: string | undefined;
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
      label: 'HIGH',
      reason: 'self-harm',
      transformedContent: FALLBACK_MESSAGE,
    };
  }

  if (matchesAny(text, EXPLICIT_KEYWORDS)) {
    return {
      status: 'BLOCKED',
      label: 'HIGH',
      reason: 'explicit-content',
      transformedContent: FALLBACK_MESSAGE,
    };
  }

  if (matchesAny(text, DIAGNOSIS_PATTERNS)) {
    return {
      status: 'NEEDS_REVIEW',
      label: 'MEDIUM',
      reason: 'diagnosis-like-statement',
      transformedContent: FALLBACK_MESSAGE,
    };
  }

  return { status: 'OK', label: 'SAFE' };
}

function matchesAny(text: string, keywords: string[]): boolean {
  return keywords.some((kw) => text.includes(kw));
}
