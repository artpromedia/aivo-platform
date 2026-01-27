import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const isDev = process.env.NODE_ENV === 'development';

export async function GET(request: NextRequest) {
  // In development, return mock data
  if (isDev) {
    return NextResponse.json({
      resources: [
        {
          id: 'res-1',
          title: 'Math Practice Worksheets',
          description: 'Printable worksheets for practicing addition and subtraction',
          type: 'worksheet',
          subject: 'Math',
          gradeLevel: '2',
          url: '#',
          thumbnail: null,
          tags: ['math', 'practice', 'printable'],
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'res-2',
          title: 'Reading Comprehension Tips',
          description: 'Guide for parents to help children improve reading skills',
          type: 'article',
          subject: 'Reading',
          gradeLevel: 'all',
          url: '#',
          thumbnail: null,
          tags: ['reading', 'tips', 'parent-guide'],
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'res-3',
          title: 'Science Experiments at Home',
          description: 'Fun and safe science experiments for kids',
          type: 'video',
          subject: 'Science',
          gradeLevel: '1-3',
          url: '#',
          thumbnail: null,
          tags: ['science', 'experiments', 'fun'],
          duration: '15:30',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
      total: 3,
      categories: ['Math', 'Reading', 'Science', 'Writing'],
      types: ['worksheet', 'article', 'video', 'interactive'],
    });
  }

  // In production, proxy to content service
  try {
    const response = await fetch(
      `${process.env.CONTENT_SERVICE_URL || 'http://localhost:4020'}/api/v1/parent/resources`,
      {
        headers: {
          Authorization: request.headers.get('Authorization') || '',
        },
      }
    );
    const data: unknown = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    return NextResponse.json({ error: 'Failed to fetch resources' }, { status: 500 });
  }
}
