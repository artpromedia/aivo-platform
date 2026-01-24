/**
 * Children Enhanced API Route
 *
 * Returns enhanced children data with activity status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';
const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value || request.headers.get('Authorization')?.replace('Bearer ', '');

    // Try to call parent-svc
    if (token) {
      try {
        const response = await fetch(`${PARENT_SVC_URL}/api/v1/parent/students`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          // Transform to enhanced format
          const children = (data.students || data || []).map((student: Record<string, unknown>) => ({
            id: student.id,
            name: `${student.givenName || student.firstName || ''} ${student.familyName || student.lastName || ''}`.trim(),
            firstName: student.givenName || student.firstName || '',
            lastName: student.familyName || student.lastName || '',
            grade: student.grade || '2',
            avatar: student.photoUrl || null,
            subjects: ['Math', 'ELA', 'Science'],
            lastActive: new Date().toISOString(),
            currentStreak: 5,
            todayProgress: {
              minutesLearned: 15,
              lessonsCompleted: 2,
            },
            status: 'offline',
          }));
          return NextResponse.json({ children });
        }
      } catch (error) {
        console.log('[Children API] Parent service unavailable, using mock data');
      }
    }

    // Return mock data in development
    if (isDev) {
      return NextResponse.json({
        children: [
          {
            id: 'learner_test123',
            name: 'TestChild User',
            firstName: 'TestChild',
            lastName: 'User',
            grade: '2',
            avatar: null,
            subjects: ['Math', 'ELA', 'Science'],
            lastActive: new Date().toISOString(),
            currentStreak: 5,
            todayProgress: {
              minutesLearned: 15,
              lessonsCompleted: 2,
            },
            status: 'offline',
          },
        ],
      });
    }

    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  } catch (error) {
    console.error('[Children API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
