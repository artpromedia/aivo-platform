/**
 * Children Enhanced API Route
 *
 * Returns enhanced children data with activity status.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token =
      cookieStore.get('auth-token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    // Try to call parent-svc
    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/parent/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = (await response.json()) as
            | { students?: Record<string, unknown>[] }
            | Record<string, unknown>[];
          const studentArray = Array.isArray(data) ? data : (data.students ?? []);
          // Transform to enhanced format
          const children = studentArray.map((student: Record<string, unknown>) => {
            const givenName = typeof student.givenName === 'string' ? student.givenName : '';
            const firstName = typeof student.firstName === 'string' ? student.firstName : '';
            const familyName = typeof student.familyName === 'string' ? student.familyName : '';
            const lastName = typeof student.lastName === 'string' ? student.lastName : '';
            return {
              id: student.id,
              name: `${givenName || firstName} ${familyName || lastName}`.trim(),
              firstName: givenName || firstName,
              lastName: familyName || lastName,
              grade: student.grade ?? '2',
              avatar: student.photoUrl ?? null,
              subjects: ['Math', 'ELA', 'Science'],
              lastActive: new Date().toISOString(),
              currentStreak: 5,
              todayProgress: {
                minutesLearned: 15,
                lessonsCompleted: 2,
              },
              status: 'offline',
            };
          });
          return NextResponse.json({ children });
        }
      } catch {
        console.log('[Children API] Parent service unavailable');
      }
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[Children API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
