import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const ASSESSMENT_SVC_URL = process.env.ASSESSMENT_SVC_URL || 'http://localhost:3009';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { sessionId } = params;

    // Get auth token from cookies
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token')?.value;

    // Try to get results from assessment service
    try {
      const response = await fetch(
        `${ASSESSMENT_SVC_URL}/api/assessment/session/${sessionId}/results`,
        {
          headers: {
            ...(authToken && { Authorization: `Bearer ${authToken}` }),
          },
        }
      );

      if (response.ok) {
        const results = await response.json();
        return NextResponse.json(results);
      }
    } catch {
      console.log('Assessment service offline');
    }

    // Return 404 if no results found
    return NextResponse.json(
      { error: 'Results not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Get results error:', error);
    return NextResponse.json(
      { error: 'Failed to get assessment results' },
      { status: 500 }
    );
  }
}
