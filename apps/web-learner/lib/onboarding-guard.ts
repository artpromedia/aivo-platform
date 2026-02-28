/**
 * Server-side onboarding / baseline guard utilities.
 *
 * Used in the (learning) layout to redirect learners who have not
 * completed onboarding or baseline assessment.
 *
 * Set env `SKIP_ONBOARDING_GUARD=true` to bypass in development.
 */

import { getRawToken, proxyGet } from './api-route-helpers';

const PROFILE_SVC_URL = process.env.PROFILE_SVC_URL || 'http://localhost:3420';
const LEARNER_MODEL_SVC_URL = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:3012';

// ── Types ──────────────────────────────────────────────────

export interface OnboardingStatus {
  completed: boolean;
  currentStep?: string;
}

export type BaselineStatus = 'not_started' | 'in_progress' | 'completed';

export interface GuardResult {
  /** True when learner may proceed to dashboard / content pages. */
  isReady: boolean;
  /** If not ready, where to send the learner. */
  redirectTo: string | null;
}

// ── Fetch helpers ──────────────────────────────────────────

/**
 * Ask the learner-model-svc whether onboarding is complete.
 *
 * Falls back to "completed" when the service is unreachable so that
 * existing users are not suddenly locked out during an outage.
 */
export async function getOnboardingStatus(learnerId: string): Promise<OnboardingStatus> {
  try {
    const token = await getRawToken();
    const data = await proxyGet<{ completed?: boolean; currentStep?: string }>(
      LEARNER_MODEL_SVC_URL,
      `/api/learner/${learnerId}/onboarding-progress`,
      token,
    );

    if (data && typeof data.completed === 'boolean') {
      return { completed: data.completed, currentStep: data.currentStep };
    }

    // Service returned unexpected shape — treat as complete to avoid blocking.
    return { completed: true };
  } catch {
    // Service unreachable — default safe: let them through.
    return { completed: true };
  }
}

/**
 * Ask the profile / baseline services for the learner's baseline status.
 *
 * Falls back to "completed" when the service is unreachable.
 */
export async function getBaselineStatus(learnerId: string): Promise<BaselineStatus> {
  try {
    const token = await getRawToken();
    const data = await proxyGet<{ profile?: { baselineStatus?: string }; success?: boolean }>(
      PROFILE_SVC_URL,
      `/api/v1/profiles/${learnerId}`,
      token,
    );

    if (data && (data as any).baselineStatus) {
      return (data as any).baselineStatus as BaselineStatus;
    }

    // Nested under `profile` key from the BFF route shape
    if (data?.profile?.baselineStatus) {
      return data.profile.baselineStatus as BaselineStatus;
    }

    // Unknown shape — assume completed.
    return 'completed';
  } catch {
    return 'completed';
  }
}

// ── Main guard logic ───────────────────────────────────────

/**
 * Evaluate whether a learner should be redirected before entering
 * the (learning) layout.
 *
 * Order mirrors the mobile GoRouter redirect:
 *   1. Onboarding incomplete → /onboarding
 *   2. Baseline not started / in-progress → /baseline
 *   3. Everything complete → ready
 */
export async function evaluateOnboardingGuard(learnerId: string): Promise<GuardResult> {
  // Dev bypass
  if (process.env.SKIP_ONBOARDING_GUARD === 'true') {
    return { isReady: true, redirectTo: null };
  }

  const onboarding = await getOnboardingStatus(learnerId);

  if (!onboarding.completed) {
    return { isReady: false, redirectTo: '/onboarding' };
  }

  const baseline = await getBaselineStatus(learnerId);

  if (baseline === 'not_started' || baseline === 'in_progress') {
    return { isReady: false, redirectTo: '/baseline' };
  }

  return { isReady: true, redirectTo: null };
}
