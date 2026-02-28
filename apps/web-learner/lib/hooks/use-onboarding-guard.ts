'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface OnboardingGuardState {
  /** True when learner has completed onboarding + baseline. */
  isReady: boolean;
  /** Loading while the check is in-flight. */
  isLoading: boolean;
  /** Where the learner should be redirected (null if ready). */
  redirectTo: string | null;
}

/**
 * Client-side onboarding guard hook.
 *
 * Fetches onboarding progress and baseline status from the BFF,
 * then redirects the learner if they haven't finished setup.
 *
 * This is a supplementary client-side check. The authoritative guard
 * lives in the server layout (lib/onboarding-guard.ts).
 */
export function useOnboardingGuard(): OnboardingGuardState {
  const router = useRouter();
  const [state, setState] = useState<OnboardingGuardState>({
    isReady: false,
    isLoading: true,
    redirectTo: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        // 1. Check onboarding
        const onboardingCompleted = localStorage.getItem('onboarding_completed');
        if (onboardingCompleted !== 'true') {
          if (!cancelled) {
            setState({ isReady: false, isLoading: false, redirectTo: '/onboarding' });
            router.replace('/onboarding');
          }
          return;
        }

        // 2. Check baseline via profile API
        const res = await fetch('/api/learner/profile');
        if (res.ok) {
          const json = await res.json();
          const baselineStatus: string = json?.profile?.baselineStatus ?? 'completed';

          if (baselineStatus === 'not_started' || baselineStatus === 'in_progress') {
            if (!cancelled) {
              setState({ isReady: false, isLoading: false, redirectTo: '/baseline' });
              router.replace('/baseline');
            }
            return;
          }
        }

        // Everything OK
        if (!cancelled) {
          setState({ isReady: true, isLoading: false, redirectTo: null });
        }
      } catch (err) {
        console.error('[useOnboardingGuard] Error:', err);
        // On error, let them through rather than blocking.
        if (!cancelled) {
          setState({ isReady: true, isLoading: false, redirectTo: null });
        }
      }
    }

    check();
    return () => { cancelled = true; };
  }, [router]);

  return state;
}
