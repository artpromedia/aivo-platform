/**
 * Event publisher for Virtual Brain initialization.
 * Calls learner-model-svc to initialize the virtual brain after baseline is accepted.
 */

import { config } from '../config.js';
import { prisma } from '../prisma.js';

export interface BaselineAcceptedEvent {
  type: 'BASELINE_ACCEPTED';
  tenantId: string;
  learnerId: string;
  profileId: string;
  attemptId: string;
  timestamp: string;
}

export interface VirtualBrainInitResult {
  success: boolean;
  virtualBrainId?: string;
  skillsInitialized?: number;
  skillsMissing?: string[];
  error?: string;
}

/**
 * Initialize the Virtual Brain for a learner after their baseline is accepted.
 *
 * 1. Fetches baseline profile and skill estimates
 * 2. Calls learner-model-svc to initialize the virtual brain
 * 3. Returns initialization result
 */
export async function publishBaselineAccepted(
  event: Omit<BaselineAcceptedEvent, 'type' | 'timestamp'>
): Promise<VirtualBrainInitResult> {
  const fullEvent: BaselineAcceptedEvent = {
    type: 'BASELINE_ACCEPTED',
    ...event,
    timestamp: new Date().toISOString(),
  };

  console.log('[EventPublisher] BASELINE_ACCEPTED event:', JSON.stringify(fullEvent));

  try {
    // Fetch profile with attempt and skill estimates
    const profile = await prisma.baselineProfile.findUnique({
      where: { id: event.profileId },
      include: {
        finalAttempt: {
          include: {
            skillEstimates: true,
          },
        },
      },
    });

    if (!profile) {
      console.error('[EventPublisher] Profile not found:', event.profileId);
      return { success: false, error: 'Profile not found' };
    }

    if (profile.status !== 'FINAL_ACCEPTED') {
      console.error('[EventPublisher] Profile not in FINAL_ACCEPTED status:', profile.status);
      return { success: false, error: 'Profile not finalized' };
    }

    if (!profile.finalAttempt) {
      console.error('[EventPublisher] No final attempt found');
      return { success: false, error: 'No final attempt' };
    }

    // Build skill estimates payload
    const skillEstimates = profile.finalAttempt.skillEstimates.map((se) => ({
      skillCode: se.skillCode,
      domain: se.domain,
      estimatedLevel: Number(se.estimatedLevel),
      confidence: Number(se.confidence),
    }));

    // Call learner-model-svc to initialize virtual brain
    const initPayload = {
      tenantId: profile.tenantId,
      learnerId: profile.learnerId,
      baselineProfileId: profile.id,
      baselineAttemptId: profile.finalAttempt.id,
      gradeBand: profile.gradeBand,
      skillEstimates,
    };

    const learnerModelUrl = config.learnerModelSvcUrl || 'http://localhost:4015';
    const response = await fetch(`${learnerModelUrl}/virtual-brains/initialize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use service-to-service auth (in production, use a service token)
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify(initPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[EventPublisher] Virtual brain init failed:', response.status, errorBody);

      // 409 Conflict means already initialized - that's OK
      if (response.status === 409) {
        console.log('[EventPublisher] Virtual brain already exists');
        return { success: true, error: 'Already initialized' };
      }

      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const result = (await response.json()) as {
      virtualBrainId: string;
      skillsInitialized: number;
      skillsMissing: string[];
    };

    console.log('[EventPublisher] Virtual brain initialized:', result.virtualBrainId);

    return {
      success: true,
      virtualBrainId: result.virtualBrainId,
      skillsInitialized: result.skillsInitialized,
      skillsMissing: result.skillsMissing,
    };
  } catch (error) {
    console.error('[EventPublisher] Error initializing virtual brain:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
