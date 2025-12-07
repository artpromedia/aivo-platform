import type { Consent, ConsentStatus } from './types.js';

export class TransitionError extends Error {}

const allowedTransitions: Record<ConsentStatus, ConsentStatus[]> = {
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
}

export interface TransitionResult {
  updates: Partial<Consent> & { status: ConsentStatus };
  audit: {
    previous_status: ConsentStatus;
    new_status: ConsentStatus;
    changed_by_user_id: string | null;
    change_reason: string;
    metadata_json: Record<string, unknown> | null;
  };
}

export function validateTransition(current: ConsentStatus, next: ConsentStatus) {
  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw new TransitionError(`Transition ${current} -> ${next} is not allowed`);
  }
}

export function buildTransition(
  consent: Consent,
  nextStatus: ConsentStatus,
  ctx: TransitionContext
): TransitionResult {
  if (!ctx.reason || ctx.reason.trim().length === 0) {
    throw new TransitionError('Transition reason is required');
  }
  validateTransition(consent.status, nextStatus);

  const now = new Date();
  const updates: TransitionResult['updates'] = {
    status: nextStatus,
    updated_at: now,
  };

  if (nextStatus === 'GRANTED') {
    updates.granted_at = now;
    updates.revoked_at = null;
    updates.expires_at = ctx.expiresAt ?? consent.expires_at ?? null;
    updates.granted_by_parent_id =
      ctx.grantedByParentId ?? ctx.changedByUserId ?? consent.granted_by_parent_id ?? null;
  }

  if (nextStatus === 'REVOKED') {
    updates.revoked_at = now;
  }

  if (nextStatus === 'EXPIRED') {
    updates.expires_at = ctx.expiresAt ?? consent.expires_at ?? now;
  }

  const audit = {
    previous_status: consent.status,
    new_status: nextStatus,
    changed_by_user_id: ctx.changedByUserId,
    change_reason: ctx.reason,
    metadata_json: ctx.metadata ?? null,
  } as TransitionResult['audit'];

  return { updates, audit };
}

export const AllowedTransitions = allowedTransitions;
