/**
 * Event publisher for Virtual Brain initialization and parent notifications.
 *
 * After baseline is accepted:
 * 1. Calls learner-model-svc to initialize the virtual brain
 * 2. Calls notify-svc to send parent app download notification
 */

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

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
    // Fetch profile with attempt, skill estimates, and parent assessment
    const profile = await prisma.baselineProfile.findUnique({
      where: { id: event.profileId },
      include: {
        finalAttempt: {
          include: {
            skillEstimates: true,
          },
        },
        parentAssessment: true,
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

    // Include parent assessment insights if available
    const parentContext = profile.parentAssessment?.status === 'COMPLETED'
      ? {
          learningStyleNotes: profile.parentAssessment.learningStyleNotes,
          strengthsNotes: profile.parentAssessment.strengthsNotes,
          challengesNotes: profile.parentAssessment.challengesNotes,
          behaviorNotes: profile.parentAssessment.behaviorNotes,
          enrolledByRole: profile.parentAssessment.enrolledByRole,
        }
      : null;

    // Call learner-model-svc to initialize virtual brain
    const initPayload = {
      tenantId: profile.tenantId,
      learnerId: profile.learnerId,
      baselineProfileId: profile.id,
      baselineAttemptId: profile.finalAttempt.id,
      gradeBand: profile.gradeBand,
      skillEstimates,
      parentContext, // Include parent assessment insights
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

    // Send parent notification for app download
    await notifyParentOfBaselineCompletion(event, profile.finalAttempt.skillEstimates.length);

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

// ══════════════════════════════════════════════════════════════════════════════
// PARENT NOTIFICATION
// ══════════════════════════════════════════════════════════════════════════════

interface ParentInfo {
  parentId: string;
  parentEmail: string;
  parentPhone?: string;
  parentName: string;
}

/**
 * Notify parent that learner completed baseline assessment.
 * Sends email/SMS with parent app download link.
 */
async function notifyParentOfBaselineCompletion(
  event: Omit<BaselineAcceptedEvent, 'type' | 'timestamp'>,
  domainsAssessed: number
): Promise<void> {
  try {
    // Find the parent linked to this learner
    const parentInfo = await findParentForLearner(event.tenantId, event.learnerId);

    if (!parentInfo) {
      console.log('[EventPublisher] No parent found for learner, skipping notification');
      return;
    }

    // Get learner name
    const learner = await prisma.baselineProfile.findFirst({
      where: { learnerId: event.learnerId },
      select: { learnerId: true },
    });

    // Fetch learner details from learner table if available
    let learnerName = 'Your child';
    try {
      const learnerData = await prisma.$queryRaw<{ firstName: string }[]>`
        SELECT "firstName" FROM "learners" WHERE id = ${event.learnerId} LIMIT 1
      `;
      if (learnerData?.[0]?.firstName) {
        learnerName = learnerData[0].firstName;
      }
    } catch {
      // Table might not exist in test environment, use default name
    }

    // Call notify-svc to send the notification
    const notifySvcUrl = config.notifySvcUrl || 'http://localhost:4012';

    const payload = {
      tenantId: event.tenantId,
      learnerId: event.learnerId,
      learnerName,
      parentId: parentInfo.parentId,
      parentEmail: parentInfo.parentEmail,
      parentPhone: parentInfo.parentPhone,
      parentName: parentInfo.parentName,
      domainsAssessed: domainsAssessed > 0 ? domainsAssessed : 5, // Default to 5 domains
    };

    console.log('[EventPublisher] Sending parent notification:', JSON.stringify(payload));

    const response = await fetch(`${notifySvcUrl}/onboarding/baseline-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[EventPublisher] Parent notification failed:', response.status, errorBody);
      return;
    }

    const result = await response.json();
    console.log('[EventPublisher] Parent notification sent:', JSON.stringify(result));
  } catch (error) {
    // Don't fail the main flow if notification fails
    console.error('[EventPublisher] Error sending parent notification:', error);
  }
}

/**
 * Find parent information for a learner.
 * Queries parent-learner link table.
 */
async function findParentForLearner(
  tenantId: string,
  learnerId: string
): Promise<ParentInfo | null> {
  try {
    // Query the parent-learner link to find the parent
    const result = await prisma.$queryRaw<ParentInfo[]>`
      SELECT
        p.id as "parentId",
        p.email as "parentEmail",
        p.phone as "parentPhone",
        COALESCE(p."givenName", p."firstName", 'Parent') as "parentName"
      FROM "parentLearnerLinks" pll
      JOIN "parents" p ON p.id = pll."parentId"
      WHERE pll."learnerId" = ${learnerId}
        AND pll."isPrimary" = true
      LIMIT 1
    `;

    if (result && result.length > 0) {
      return result[0];
    }

    return null;
  } catch (error) {
    console.error('[EventPublisher] Error finding parent:', error);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// IEP COMPARISON EVENTS
// ══════════════════════════════════════════════════════════════════════════════

export interface IepComparisonReadyEvent {
  type: 'IEP_COMPARISON_READY';
  tenantId: string;
  learnerId: string;
  profileId: string;
  comparisonId: string;
  overallMatchScore: number;
  timestamp: string;
}

export interface IepDecisionMadeEvent {
  type: 'IEP_DECISION_MADE';
  tenantId: string;
  learnerId: string;
  profileId: string;
  comparisonId: string;
  decision: string;
  timestamp: string;
}

/**
 * Publish event when IEP comparison is ready for review.
 * Triggers notification to parent/teacher to review comparison results.
 */
export async function publishIepComparisonReady(
  event: Omit<IepComparisonReadyEvent, 'type' | 'timestamp'>
): Promise<void> {
  const fullEvent: IepComparisonReadyEvent = {
    type: 'IEP_COMPARISON_READY',
    ...event,
    timestamp: new Date().toISOString(),
  };

  console.log('[EventPublisher] IEP_COMPARISON_READY event:', JSON.stringify(fullEvent));

  try {
    // Find the parent linked to this learner
    const parentInfo = await findParentForLearner(event.tenantId, event.learnerId);

    if (!parentInfo) {
      console.log('[EventPublisher] No parent found for learner, skipping notification');
      return;
    }

    // Get learner name
    let learnerName = 'Your child';
    try {
      const learnerData = await prisma.$queryRaw<{ firstName: string }[]>`
        SELECT "firstName" FROM "learners" WHERE id = ${event.learnerId} LIMIT 1
      `;
      if (learnerData?.[0]?.firstName) {
        learnerName = learnerData[0].firstName;
      }
    } catch {
      // Table might not exist in test environment
    }

    // Determine match description
    let matchDescription: string;
    if (event.overallMatchScore >= 0.8) {
      matchDescription = 'strong alignment';
    } else if (event.overallMatchScore >= 0.6) {
      matchDescription = 'good alignment with some differences';
    } else if (event.overallMatchScore >= 0.4) {
      matchDescription = 'moderate alignment';
    } else {
      matchDescription = 'significant differences';
    }

    // Call notify-svc to send the notification
    const notifySvcUrl = config.notifySvcUrl || 'http://localhost:4012';

    const payload = {
      tenantId: event.tenantId,
      learnerId: event.learnerId,
      learnerName,
      parentId: parentInfo.parentId,
      parentEmail: parentInfo.parentEmail,
      parentPhone: parentInfo.parentPhone,
      parentName: parentInfo.parentName,
      comparisonId: event.comparisonId,
      matchDescription,
      overallMatchScore: event.overallMatchScore,
    };

    console.log('[EventPublisher] Sending IEP comparison notification:', JSON.stringify(payload));

    const response = await fetch(`${notifySvcUrl}/iep/comparison-ready`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('[EventPublisher] IEP comparison notification failed:', response.status, errorBody);
      return;
    }

    const result = await response.json();
    console.log('[EventPublisher] IEP comparison notification sent:', JSON.stringify(result));
  } catch (error) {
    console.error('[EventPublisher] Error sending IEP comparison notification:', error);
  }
}

/**
 * Publish event when parent/teacher makes decision on IEP comparison.
 * Triggers downstream processing based on decision.
 */
export async function publishIepDecisionMade(
  event: Omit<IepDecisionMadeEvent, 'type' | 'timestamp'>
): Promise<void> {
  const fullEvent: IepDecisionMadeEvent = {
    type: 'IEP_DECISION_MADE',
    ...event,
    timestamp: new Date().toISOString(),
  };

  console.log('[EventPublisher] IEP_DECISION_MADE event:', JSON.stringify(fullEvent));

  try {
    // Based on decision, trigger appropriate downstream action
    switch (event.decision) {
      case 'AGREE_WITH_SYSTEM':
        // Trigger new IEP generation based on assessment
        await triggerIepGeneration(event);
        break;

      case 'PREFER_EXISTING':
        // Import existing IEP goals into the system
        await triggerExistingIepImport(event);
        break;

      case 'MERGE_BOTH':
        // Generate merged IEP with both sources
        await triggerMergedIepGeneration(event);
        break;

      case 'REQUEST_REVIEW':
        // Notify special education coordinator for review
        await triggerProfessionalReview(event);
        break;

      default:
        console.log('[EventPublisher] Unknown decision type:', event.decision);
    }

    // Notify parent of next steps
    await notifyParentOfDecisionProcessing(event);
  } catch (error) {
    console.error('[EventPublisher] Error processing IEP decision:', error);
  }
}

/**
 * Trigger generation of new IEP based on assessment results.
 */
async function triggerIepGeneration(
  event: Omit<IepDecisionMadeEvent, 'type' | 'timestamp'>
): Promise<void> {
  const iepSvcUrl = config.iepSvcUrl || 'http://localhost:4016';

  try {
    const response = await fetch(`${iepSvcUrl}/ieps/generate-from-assessment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify({
        tenantId: event.tenantId,
        learnerId: event.learnerId,
        profileId: event.profileId,
        comparisonId: event.comparisonId,
        source: 'BASELINE_ASSESSMENT',
      }),
    });

    if (!response.ok) {
      console.error('[EventPublisher] IEP generation failed:', response.status);
    } else {
      console.log('[EventPublisher] IEP generation triggered successfully');
    }
  } catch (error) {
    console.error('[EventPublisher] Error triggering IEP generation:', error);
  }
}

/**
 * Trigger import of existing IEP goals into the system.
 */
async function triggerExistingIepImport(
  event: Omit<IepDecisionMadeEvent, 'type' | 'timestamp'>
): Promise<void> {
  const iepSvcUrl = config.iepSvcUrl || 'http://localhost:4016';

  try {
    const response = await fetch(`${iepSvcUrl}/ieps/import-from-document`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify({
        tenantId: event.tenantId,
        learnerId: event.learnerId,
        profileId: event.profileId,
        comparisonId: event.comparisonId,
        source: 'UPLOADED_IEP',
      }),
    });

    if (!response.ok) {
      console.error('[EventPublisher] IEP import failed:', response.status);
    } else {
      console.log('[EventPublisher] IEP import triggered successfully');
    }
  } catch (error) {
    console.error('[EventPublisher] Error triggering IEP import:', error);
  }
}

/**
 * Trigger generation of merged IEP combining both sources.
 */
async function triggerMergedIepGeneration(
  event: Omit<IepDecisionMadeEvent, 'type' | 'timestamp'>
): Promise<void> {
  const iepSvcUrl = config.iepSvcUrl || 'http://localhost:4016';

  try {
    const response = await fetch(`${iepSvcUrl}/ieps/generate-merged`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify({
        tenantId: event.tenantId,
        learnerId: event.learnerId,
        profileId: event.profileId,
        comparisonId: event.comparisonId,
        sources: ['UPLOADED_IEP', 'BASELINE_ASSESSMENT'],
      }),
    });

    if (!response.ok) {
      console.error('[EventPublisher] Merged IEP generation failed:', response.status);
    } else {
      console.log('[EventPublisher] Merged IEP generation triggered successfully');
    }
  } catch (error) {
    console.error('[EventPublisher] Error triggering merged IEP generation:', error);
  }
}

/**
 * Trigger professional review request for the IEP comparison.
 */
async function triggerProfessionalReview(
  event: Omit<IepDecisionMadeEvent, 'type' | 'timestamp'>
): Promise<void> {
  const notifySvcUrl = config.notifySvcUrl || 'http://localhost:4012';

  try {
    const response = await fetch(`${notifySvcUrl}/iep/request-review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify({
        tenantId: event.tenantId,
        learnerId: event.learnerId,
        profileId: event.profileId,
        comparisonId: event.comparisonId,
        reviewType: 'IEP_COMPARISON_DISCREPANCY',
      }),
    });

    if (!response.ok) {
      console.error('[EventPublisher] Review request failed:', response.status);
    } else {
      console.log('[EventPublisher] Professional review requested successfully');
    }
  } catch (error) {
    console.error('[EventPublisher] Error requesting professional review:', error);
  }
}

/**
 * Notify parent that their decision is being processed.
 */
async function notifyParentOfDecisionProcessing(
  event: Omit<IepDecisionMadeEvent, 'type' | 'timestamp'>
): Promise<void> {
  try {
    const parentInfo = await findParentForLearner(event.tenantId, event.learnerId);

    if (!parentInfo) {
      return;
    }

    const notifySvcUrl = config.notifySvcUrl || 'http://localhost:4012';

    // Get decision description
    let decisionDescription: string;
    switch (event.decision) {
      case 'AGREE_WITH_SYSTEM':
        decisionDescription = 'We are generating a new IEP based on the assessment results.';
        break;
      case 'PREFER_EXISTING':
        decisionDescription = 'We are importing goals from your existing IEP.';
        break;
      case 'MERGE_BOTH':
        decisionDescription = 'We are creating a comprehensive IEP combining both sources.';
        break;
      case 'REQUEST_REVIEW':
        decisionDescription = 'A specialist will review the comparison and contact you.';
        break;
      default:
        decisionDescription = 'Your decision has been recorded.';
    }

    const response = await fetch(`${notifySvcUrl}/iep/decision-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.serviceToken || ''}`,
      },
      body: JSON.stringify({
        tenantId: event.tenantId,
        parentId: parentInfo.parentId,
        parentEmail: parentInfo.parentEmail,
        parentName: parentInfo.parentName,
        decision: event.decision,
        decisionDescription,
      }),
    });

    if (!response.ok) {
      console.error('[EventPublisher] Decision confirmation failed:', response.status);
    }
  } catch (error) {
    console.error('[EventPublisher] Error sending decision confirmation:', error);
  }
}
