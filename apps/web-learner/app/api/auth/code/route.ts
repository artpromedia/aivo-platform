import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Service URLs
const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';
const TEACHER_SVC_URL = process.env.TEACHER_SVC_URL || 'http://localhost:3002';

const isDev = process.env.NODE_ENV !== 'production';

interface LearnerData {
  id: string;
  firstName: string;
  lastName?: string;
  avatarUrl?: string;
  baselineStatus: 'not_started' | 'in_progress' | 'completed';
}

interface CodeAuthResponse {
  accessToken: string;
  refreshToken: string;
  learner: LearnerData;
}

interface CodeRequest {
  code: string;
  type?: 'pin' | 'class';
}

/**
 * Fetch learner data from parent service by PIN
 * Used to get the actual learner's name even in dev mode
 */
async function fetchLearnerByPin(pin: string): Promise<LearnerData | null> {
  try {
    // Try to get learner data from parent service
    const response = await fetch(`${PARENT_SVC_URL}/api/v1/learner/by-pin/${pin}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json() as { learner?: LearnerData };
      return data.learner || null;
    }
  } catch (error) {
    console.log('[DEV] Could not fetch learner by PIN:', error);
  }
  return null;
}

/**
 * Generate a mock JWT for development mode
 */
function generateDevToken(learnerId: string, firstName: string): string {
  // Simple base64-encoded mock token for dev mode
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    sub: learnerId,
    type: 'learner',
    firstName,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
  })).toString('base64url');
  const signature = Buffer.from('dev-signature').toString('base64url');
  return `${header}.${payload}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as CodeRequest;
    const { code, type } = body;

    if (!code || code.length < 6) {
      return NextResponse.json(
        { error: 'Invalid code format' },
        { status: 400 }
      );
    }

    let response: Response | null = null;
    let data: CodeAuthResponse | null = null;

    const isPin = type === 'pin' || /^\d{6}$/.test(code);

    if (isPin) {
      // PIN-based login (6 digits from parent)
      try {
        response = await fetch(`${PARENT_SVC_URL}/api/v1/learner/pin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: code }),
        });
      } catch (fetchError) {
        // Service not available - handle dev mode fallback
        if (isDev) {
          console.log('[DEV] Parent service not available, trying to fetch learner data for PIN:', code);

          // Try to get actual learner data even in dev mode
          const actualLearner = await fetchLearnerByPin(code);

          const learnerId = actualLearner?.id || `demo_learner_${code}`;
          const firstName = actualLearner?.firstName || 'Friend'; // Use friendly fallback instead of 'Demo'
          const lastName = actualLearner?.lastName || '';
          const baselineStatus = actualLearner?.baselineStatus || 'not_started';

          console.log(`[DEV] Using ${actualLearner ? 'actual' : 'fallback'} learner data: ${firstName}`);

          data = {
            accessToken: generateDevToken(learnerId, firstName),
            refreshToken: generateDevToken(learnerId, firstName),
            learner: {
              id: learnerId,
              firstName,
              lastName,
              avatarUrl: actualLearner?.avatarUrl,
              baselineStatus,
            },
          };
        } else {
          throw fetchError;
        }
      }
    } else {
      // Class code login (alphanumeric from teacher)
      try {
        response = await fetch(`${TEACHER_SVC_URL}/api/v1/class/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ classCode: code }),
        });
      } catch (fetchError) {
        // Service not available - handle dev mode fallback
        if (isDev) {
          console.log('[DEV] Teacher service not available, using mock data for class code:', code);
          const learnerId = `class_learner_${code}`;
          const firstName = 'Friend'; // Use friendly fallback

          data = {
            accessToken: generateDevToken(learnerId, firstName),
            refreshToken: generateDevToken(learnerId, firstName),
            learner: {
              id: learnerId,
              firstName,
              lastName: '',
              avatarUrl: undefined,
              baselineStatus: 'not_started',
            },
          };
        } else {
          throw fetchError;
        }
      }
    }

    // If we got a response from a service, process it
    if (response && !data) {
      if (!response.ok) {
        // Service returned an error - in dev mode, still allow mock login
        if (isDev && response.status === 401) {
          console.log('[DEV] Service returned 401, trying to fetch actual learner data for code:', code);

          // Try to get actual learner data even in dev mode
          const actualLearner = isPin ? await fetchLearnerByPin(code) : null;

          const learnerId = actualLearner?.id || (isPin ? `demo_learner_${code}` : `class_learner_${code}`);
          const firstName = actualLearner?.firstName || 'Friend'; // Use friendly fallback

          data = {
            accessToken: generateDevToken(learnerId, firstName),
            refreshToken: generateDevToken(learnerId, firstName),
            learner: {
              id: learnerId,
              firstName,
              lastName: actualLearner?.lastName || '',
              avatarUrl: actualLearner?.avatarUrl,
              baselineStatus: actualLearner?.baselineStatus || 'not_started',
            },
          };
        } else {
          const errorData = await response.json().catch(() => ({ message: '' })) as { message?: string };
          return NextResponse.json(
            { error: errorData.message || 'Invalid code. Please check and try again.' },
            { status: response.status }
          );
        }
      } else {
        data = await response.json() as CodeAuthResponse;
      }
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Unable to verify code. Please try again.' },
        { status: 500 }
      );
    }

    // Store tokens in httpOnly cookies
    const cookieStore = cookies();
    
    cookieStore.set('auth-token', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    cookieStore.set('refresh-token', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Determine if learner needs baseline assessment
    const needsBaseline = data.learner.baselineStatus === 'not_started';

    return NextResponse.json({
      success: true,
      learner: {
        id: data.learner.id,
        firstName: data.learner.firstName,
        avatarUrl: data.learner.avatarUrl,
      },
      needsBaseline,
      devMode: isDev && !response?.ok,
    });
  } catch (error) {
    console.error('Code auth error:', error);
    return NextResponse.json(
      { error: 'Unable to verify code. Please try again.' },
      { status: 500 }
    );
  }
}
