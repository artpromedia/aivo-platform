import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      children: [
        {
          id: 'learner_test123',
          name: 'TestChild User',
          firstName: 'TestChild',
          lastName: 'User',
          grade: '2',
          avatarUrl: null,
          teachers: [
            {
              id: 'teacher-1',
              name: 'Ms. Johnson',
              subject: 'Math',
              email: 'johnson@school.edu',
            },
            {
              id: 'teacher-2',
              name: 'Mr. Smith',
              subject: 'Science',
              email: 'smith@school.edu',
            },
            {
              id: 'teacher-3',
              name: 'Mrs. Davis',
              subject: 'Reading',
              email: 'davis@school.edu',
            },
          ],
        },
      ],
    });
  }

  // In production, proxy to parent-svc
  try {
    const response = await fetch(
      `${process.env.PARENT_SERVICE_URL || 'http://localhost:3010'}/api/v1/parent/children/with-teachers`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch children with teachers:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}
