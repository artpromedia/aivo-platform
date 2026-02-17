/**
 * COPPA/Consent Module — Consent State Machine
 * Migrated from consent-svc
 *
 * States: PENDING, GRANTED, REVOKED, EXPIRED
 * Transitions:
 *   PENDING → GRANTED (parent grants consent)
 *   PENDING → REVOKED (parent declines or admin revokes)
 *   GRANTED → REVOKED (parent or admin revokes)
 *   GRANTED → EXPIRED (automatic expiration)
 * Terminal states: REVOKED, EXPIRED (no transitions out)
 */

import type { ConsentRecord, ConsentStatusType } from './types.js';

export class TransitionError extends Error {
  constructor(
    message: string,
    public readonly fromStatus: ConsentStatusType,
    public readonly toStatus: ConsentStatusType,
  ) {
    super(message);
    this.name = 'TransitionError';
  }
}

const allowedTransitions: Record<ConsentStatusType, ConsentStatusType[]> = {
  PENDING: ['GRANTED', 'REVOKED'],
  GRANTED: ['REVOKED', 'EXPIRED'],
  REVOKED: [],
  EXPIRED: [],
};

export interface TransitionContext {
  changedByUserId: string | null;
  reason: string;
  metadata?: Record<string, unknown> | null;
  grantedByParentId?: string | null;
  expiresAt?: Date | null | undefined;
  ipAddress?: string | null;
  userAgent?: string | null;
  verificationMethodId?: string | null;
}

export interface TransitionResult {
  updates: Partial<ConsentRecord> & { status: ConsentStatusType };
  audit: {
    previous_status: ConsentStatusType;
    new_status: ConsentStatusType;
    changed_by_user_id: string | null;
    change_reason: string;
    metadata_json: Record<string, unknown> | null;
    ip_address: string | null;
    user_agent: string | null;
    verification_method_id: string | null;
  };
}

export function validateTransition(current: ConsentStatusType, next: ConsentStatusType): void {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw new TransitionError(
      `Transition ${current} → ${next} is not allowed. Valid transitions from ${current}: ${allowed.join(', ') || 'none (terminal state)'}`,
      current,
      next,
    );
  }
}

export function isValidTransition(current: ConsentStatusType, next: ConsentStatusType): boolean {
  const allowed = allowedTransitions[current] ?? [];
  return allowed.includes(next);
}

export function isTerminalState(status: ConsentStatusType): boolean {
  return allowedTransitions[status]?.length === 0;
}

export function getValidNextStates(current: ConsentStatusType): ConsentStatusType[] {
  return allowedTransitions[current] ?? [];
}

export function buildTransition(
  consent: ConsentRecord,
  nextStatus: ConsentStatusType,
  ctx: TransitionContext,
): TransitionResult {
  if (!ctx.reason || ctx.reason.trim().length === 0) {
    throw new TransitionError(
      'Transition reason is required for audit compliance',
      consent.status,
      nextStatus,
    );
  }

  validateTransition(consent.status, nextStatus);

  const now = new Date();
  const updates: TransitionResult['updates'] = {
    status: nextStatus,
    updated_at: now,
  };

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

export function isConsentActive(consent: ConsentRecord): boolean {
  if (consent.status !== 'GRANTED') return false;
  if (consent.expires_at && consent.expires_at < new Date()) return false;
  return true;
}

export function needsExpiration(consent: ConsentRecord): boolean {
  return (
    consent.status === 'GRANTED' &&
    consent.expires_at !== null &&
    consent.expires_at < new Date()
  );
}

export const AllowedTransitions = allowedTransitions;
