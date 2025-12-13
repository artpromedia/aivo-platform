import type { Consent, ConsentStatus } from './types.js';

// ════════════════════════════════════════════════════════════════════════════════
// CONSENT STATE MACHINE
// ════════════════════════════════════════════════════════════════════════════════
// Implements the consent FSM with states: PENDING, GRANTED, REVOKED, EXPIRED
// Transitions:
//   PENDING → GRANTED (parent grants consent)
//   PENDING → REVOKED (parent declines or admin revokes)
//   GRANTED → REVOKED (parent or admin revokes)
//   GRANTED → EXPIRED (automatic expiration)
// Terminal states: REVOKED, EXPIRED (no transitions out)

export class TransitionError extends Error {
  constructor(
    message: string,
    public readonly fromStatus: ConsentStatus,
    public readonly toStatus: ConsentStatus
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

/**
 * FSM transition rules - defines which transitions are allowed
 */
const allowedTransitions: Record<ConsentStatus, ConsentStatus[]> = {
  PENDING: ['GRANTED', 'REVOKED'],
  GRANTED: ['REVOKED', 'EXPIRED'],
  REVOKED: [], // Terminal state
  EXPIRED: [], // Terminal state
};

/**
 * Context for a consent state transition
 * Captures who triggered it and why, plus network metadata for audit
 */
export interface TransitionContext {
  /** User ID who triggered the transition */
  changedByUserId: string | null;
  /** Reason for the transition (required for audit compliance) */
  reason: string;
  /** Additional metadata for audit trail */
  metadata?: Record<string, unknown> | null;
  /** Parent ID who granted consent (for GRANTED transitions) */
  grantedByParentId?: string | null;
  /** New expiration date (for GRANTED/EXPIRED transitions) */
  expiresAt?: Date | null | undefined;
  /** Client IP address for audit */
  ipAddress?: string | null;
  /** Client user agent for audit */
  userAgent?: string | null;
  /** Verification method ID if consent was verified */
  verificationMethodId?: string | null;
}

/**
 * Result of building a transition - includes updates to apply and audit record
 */
export interface TransitionResult {
  updates: Partial<Consent> & { status: ConsentStatus };
  audit: {
    previous_status: ConsentStatus;
    new_status: ConsentStatus;
    changed_by_user_id: string | null;
    change_reason: string;
    metadata_json: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    verification_method_id: string | null;
  };
}

/**
 * Validate that a transition is allowed by the FSM rules
 * @throws TransitionError if transition is not allowed
 */
export function validateTransition(current: ConsentStatus, next: ConsentStatus): void {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw new TransitionError(
      `Transition ${current} → ${next} is not allowed. Valid transitions from ${current}: ${allowed.join(', ') || 'none (terminal state)'}`,
      current,
      next
    );
  }
}

/**
 * Check if a transition is valid without throwing
 */
export function isValidTransition(current: ConsentStatus, next: ConsentStatus): boolean {
  const allowed = allowedTransitions[current] ?? [];
  return allowed.includes(next);
}

/**
 * Check if a consent is in a terminal state (no further transitions allowed)
 */
export function isTerminalState(status: ConsentStatus): boolean {
  return allowedTransitions[status]?.length === 0;
}

/**
 * Get all valid next states from current state
 */
export function getValidNextStates(current: ConsentStatus): ConsentStatus[] {
  return allowedTransitions[current] ?? [];
}

/**
 * Build a transition result for applying to a consent record
 * Validates the transition and prepares both the consent update and audit record
 */
export function buildTransition(
  consent: Consent,
  nextStatus: ConsentStatus,
  ctx: TransitionContext
): TransitionResult {
  // Validate reason is provided (required for COPPA/GDPR compliance)
  if (!ctx.reason || ctx.reason.trim().length === 0) {
    throw new TransitionError('Transition reason is required for audit compliance', consent.status, nextStatus);
  }

  // Validate the transition is allowed
  validateTransition(consent.status, nextStatus);

  const now = new Date();
  const updates: TransitionResult['updates'] = {
    status: nextStatus,
    updated_at: now,
  };

  // Apply state-specific updates
  switch (nextStatus) {
    case 'GRANTED':
      updates.granted_at = now;
      updates.revoked_at = null;
      updates.expires_at = ctx.expiresAt ?? consent.expires_at ?? null;
      updates.granted_by_parent_id =
        ctx.grantedByParentId ?? ctx.changedByUserId ?? consent.granted_by_parent_id ?? null;
      break;

    case 'REVOKED':
      updates.revoked_at = now;
      break;

    case 'EXPIRED':
      updates.expires_at = ctx.expiresAt ?? consent.expires_at ?? now;
      break;
  }

  // Build audit record with full context
  const audit: TransitionResult['audit'] = {
    previous_status: consent.status,
    new_status: nextStatus,
    changed_by_user_id: ctx.changedByUserId,
    change_reason: ctx.reason,
    metadata_json: ctx.metadata ?? null,
    ip_address: ctx.ipAddress ?? null,
    user_agent: ctx.userAgent ?? null,
    verification_method_id: ctx.verificationMethodId ?? null,
  };

  return { updates, audit };
}

/**
 * Check if consent is currently active (GRANTED and not expired)
 */
export function isConsentActive(consent: Consent): boolean {
  if (consent.status !== 'GRANTED') {
    return false;
  }
  if (consent.expires_at && consent.expires_at < new Date()) {
    return false;
  }
  return true;
}

/**
 * Check if consent needs to be expired (GRANTED but past expiration)
 */
export function needsExpiration(consent: Consent): boolean {
  return (
    consent.status === 'GRANTED' &&
    consent.expires_at !== null &&
    consent.expires_at < new Date()
  );
}

export const AllowedTransitions = allowedTransitions;
