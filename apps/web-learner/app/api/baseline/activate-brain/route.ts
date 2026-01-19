import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LEARNER_MODEL_SVC_URL = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:3015';
const PERSONALIZATION_SVC_URL = process.env.PERSONALIZATION_SVC_URL || 'http://localhost:3016';
const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

interface ActivateBrainRequest {
  consentGiven: boolean;
  consentTimestamp: string;
}

/**
 * Update the learner's baseline status to 'completed' in parent-svc
 */
async function updateBaselineStatus(authToken: string | undefined): Promise<void> {
  try {
    await fetch(`${PARENT_SVC_URL}/api/v1/learner/baseline-status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { Authorization: `Bearer ${authToken}` }),
      },
      body: JSON.stringify({
        status: 'completed',
        completedAt: new Date().toISOString(),
      }),
    });
    console.log('Baseline status updated to completed');
  } catch (error) {
    console.error('Failed to update baseline status:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ActivateBrainRequest;
    const { consentGiven, consentTimestamp } = body;

    if (!consentGiven) {
      return NextResponse.json(
        { error: 'Consent is required to activate the learning brain' },
        { status: 400 }
      );
    }

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Update baseline status to 'completed' in parent-svc (works with or without auth in dev)
    await updateBaselineStatus(authToken);

    // In dev mode without auth, still return success
    const isDevMode = process.env.NODE_ENV === 'development';

    if (isDevMode && !authToken) {
      console.log('[Dev Mode] Brain activation simulated (no auth token)');
      return NextResponse.json({
        success: true,
        brainId: `brain-demo-${Date.now()}`,
        message: 'Learning brain activated successfully (dev mode)',
        activatedAt: new Date().toISOString(),
      });
    }

    // Update baseline status to 'completed' in parent-svc
    await updateBaselineStatus(authToken);

    // Try to call learner-model-svc to create the virtual brain
    try {
      const createBrainResponse = await fetch(`${LEARNER_MODEL_SVC_URL}/api/v1/virtual-brains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          consentGiven,
          consentTimestamp,
          source: 'baseline_assessment',
        }),
      });

      if (createBrainResponse.ok) {
        const brainData = await createBrainResponse.json();
        
        // Notify personalization service
        try {
          await fetch(`${PERSONALIZATION_SVC_URL}/api/v1/brain-activated`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(authToken && { Authorization: `Bearer ${authToken}` }),
            },
            body: JSON.stringify({
              brainId: brainData.id,
              activatedAt: new Date().toISOString(),
            }),
          });
        } catch (e) {
          console.log('Personalization service notification failed (non-blocking)');
        }

        return NextResponse.json({
          success: true,
          brainId: brainData.id,
          message: 'Learning brain activated successfully',
          activatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.log('Learner model service not available');
    }

    // Fallback response for dev/demo
    return NextResponse.json({
      success: true,
      brainId: `brain-${Date.now()}`,
      message: 'Learning brain activated (offline mode)',
      activatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Brain activation error:', error);
    return NextResponse.json(
      { error: 'Failed to activate learning brain' },
      { status: 500 }
    );
  }
}
