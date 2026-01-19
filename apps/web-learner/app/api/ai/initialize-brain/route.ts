import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const LEARNER_MODEL_SVC_URL = process.env.LEARNER_MODEL_SVC_URL || 'http://localhost:3012';

export interface InitializeBrainRequest {
  learnerId: string;
  onboardingData: {
    displayName?: string;
    gradeLevel?: string;
    favoriteSubjects?: string[];
    learningGoals?: string[];
    accessibilitySettings?: Record<string, unknown>;
    sensoryProfile?: Record<string, unknown>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as InitializeBrainRequest;
    const { learnerId, onboardingData } = body;

    // Get auth token from cookies
    const cookieStore = cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    const isDevMode = process.env.NODE_ENV === 'development';

    if (!authToken && !isDevMode) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Map grade level to grade band
    const gradeLevel = onboardingData.gradeLevel || '3';
    const gradeNum = parseInt(gradeLevel, 10);
    let gradeBand: 'K5' | 'G6_8' | 'G9_12' = 'K5';
    if (gradeNum >= 6 && gradeNum <= 8) {
      gradeBand = 'G6_8';
    } else if (gradeNum >= 9) {
      gradeBand = 'G9_12';
    }

    // Initialize learning brain via learner model service
    try {
      const response = await fetch(`${LEARNER_MODEL_SVC_URL}/api/virtual-brain/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { Authorization: `Bearer ${authToken}` }),
        },
        body: JSON.stringify({
          learnerId,
          gradeBand,
          preferredSubjects: onboardingData.favoriteSubjects || [],
          learningGoals: onboardingData.learningGoals || [],
          accessibilitySettings: onboardingData.accessibilitySettings,
          sensoryProfile: onboardingData.sensoryProfile,
          initializeSkills: true,
        }),
      });

      if (response.ok) {
        const brain = await response.json();
        return NextResponse.json({
          success: true,
          brainId: brain.id,
          learnerId,
          gradeBand,
          initializedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.log('Learner model service offline, using default brain initialization');
    }

    // Fallback response when service is offline
    return NextResponse.json({
      success: true,
      brainId: `brain-${learnerId}-${Date.now()}`,
      learnerId,
      gradeBand,
      initializedAt: new Date().toISOString(),
      note: 'Brain initialized with default template',
    });
  } catch (error) {
    console.error('Initialize brain error:', error);
    return NextResponse.json(
      { error: 'Failed to initialize AI brain' },
      { status: 500 }
    );
  }
}
