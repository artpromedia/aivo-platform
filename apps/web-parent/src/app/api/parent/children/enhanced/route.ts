/**
 * Children Enhanced API Route
 *
 * Returns enhanced children data with activity status,
 * fetched from parent-svc student summaries.
 */

import { cookies } from 'next/headers';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PARENT_SVC_URL = process.env.PARENT_SVC_URL || 'http://localhost:3010';

/**
 * Fetch a student summary from parent-svc.
 * Returns null on failure so one student's error doesn't break the list.
 */
async function fetchStudentSummary(
  studentId: string,
  token: string
): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${PARENT_SVC_URL}/api/v1/parent/students/${studentId}/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) return (await res.json()) as Record<string, unknown>;
  } catch {
    // Swallow — individual summary failure is non-fatal
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token =
      cookieStore.get('aivo_access_token')?.value ||
      request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      // Fetch linked students list from parent-svc
      const response = await fetch(`${PARENT_SVC_URL}/api/v1/parent/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const data = (await response.json()) as Record<string, unknown>;

      // parent-svc returns { active: [...], revoked: [...] }
      const activeLinks = Array.isArray(data.active)
        ? (data.active as Record<string, unknown>[])
        : [];

      // Fallback: if the response is a flat array or has a students[] key
      let studentEntries: { studentId: string; studentName: string }[] = [];
      if (activeLinks.length > 0) {
        studentEntries = activeLinks.map((link) => ({
          studentId:
            typeof link.studentId === 'string'
              ? link.studentId
              : typeof link.id === 'string'
                ? link.id
                : '',
          studentName: typeof link.studentName === 'string' ? link.studentName : '',
        }));
      } else if (Array.isArray(data)) {
        studentEntries = (data as Record<string, unknown>[]).map((s) => {
          const sid = typeof s.id === 'string' ? s.id : '';
          const first =
            typeof s.givenName === 'string'
              ? s.givenName
              : typeof s.firstName === 'string'
                ? s.firstName
                : '';
          const last =
            typeof s.familyName === 'string'
              ? s.familyName
              : typeof s.lastName === 'string'
                ? s.lastName
                : '';
          return { studentId: sid, studentName: `${first} ${last}`.trim() };
        });
      }

      // Fetch summaries for all linked students in parallel
      const summaries = await Promise.all(
        studentEntries.map(async (entry) => {
          const summary = await fetchStudentSummary(entry.studentId, token);
          return { entry, summary };
        })
      );

      const children = summaries.map(({ entry, summary }) => {
        const givenName =
          summary && typeof summary.givenName === 'string'
            ? summary.givenName
            : (entry.studentName.split(' ')[0] ?? '');
        const familyName =
          summary && typeof summary.familyName === 'string'
            ? summary.familyName
            : entry.studentName.split(' ').slice(1).join(' ');

        // Extract real data from student summary
        const weeklyStats = (summary?.weeklyStats ?? {}) as Record<string, unknown>;
        const recentActivity = Array.isArray(summary?.recentActivity)
          ? (summary.recentActivity as Record<string, unknown>[])
          : [];

        // Derive subjects from recent activity or class info
        const activitySubjects = new Set<string>();
        for (const act of recentActivity) {
          const title = typeof act.lessonTitle === 'string' ? act.lessonTitle : '';
          if (/math/i.test(title)) activitySubjects.add('Math');
          if (/read|ela|writ/i.test(title)) activitySubjects.add('ELA');
          if (/sci/i.test(title)) activitySubjects.add('Science');
        }
        const subjects =
          activitySubjects.size > 0 ? [...activitySubjects] : ['Math', 'ELA', 'Science'];

        // Use real weekly stats
        const daysActive = typeof weeklyStats.daysActive === 'number' ? weeklyStats.daysActive : 0;
        const totalMinutes =
          typeof weeklyStats.totalMinutes === 'number' ? weeklyStats.totalMinutes : 0;
        const sessionsCount =
          typeof weeklyStats.sessionsCount === 'number' ? weeklyStats.sessionsCount : 0;

        // Determine last active time from most recent session
        const rawStartedAt = recentActivity.length > 0 ? recentActivity[0].startedAt : undefined;
        const lastActive =
          typeof rawStartedAt === 'string' ? rawStartedAt : new Date(0).toISOString();

        // Determine online status: active within last 10 minutes
        const lastActiveMs = new Date(lastActive).getTime();
        const isOnline = Date.now() - lastActiveMs < 10 * 60 * 1000;

        return {
          id: entry.studentId,
          name: `${givenName} ${familyName}`.trim(),
          firstName: givenName,
          lastName: familyName,
          grade: summary?.grade ?? '2',
          avatar: summary?.photoUrl ?? null,
          subjects,
          lastActive,
          currentStreak: daysActive,
          todayProgress: {
            minutesLearned: totalMinutes,
            lessonsCompleted: sessionsCount,
          },
          status: isOnline ? 'online' : 'offline',
        };
      });

      return NextResponse.json({ children });
    } catch {
      console.log('[Children API] Parent service unavailable');
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error('[Children API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
