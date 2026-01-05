/**
 * Lessons API Client
 * Types and fetch functions for lesson builder.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

export type LessonStatus = 'draft' | 'published' | 'archived';

export interface LessonActivity {
  id: string;
  title: string;
  type: 'adaptive-game' | 'video' | 'reading' | 'quiz' | 'discussion';
  duration: number;
  contentId?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  objectives: string[];
  standards?: string[];
  activities: LessonActivity[];
  status: LessonStatus;
  hasAdaptiveContent: boolean;
  createdAt: string;
  lastModified: string;
  authorId: string;
}

export interface LessonSummary {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  duration: number;
  objectives: string[];
  status: LessonStatus;
  lastModified: string;
  hasAdaptiveContent: boolean;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOCK DATA
// ══════════════════════════════════════════════════════════════════════════════

function mockLessons(): LessonSummary[] {
  return [
    {
      id: '1',
      title: 'Introduction to Fractions',
      subject: 'Math',
      gradeLevel: '4th Grade',
      duration: 45,
      objectives: ['Identify fractions', 'Compare fractions with same denominator'],
      status: 'published',
      lastModified: '2024-12-15',
      hasAdaptiveContent: true,
    },
    {
      id: '2',
      title: 'Reading Comprehension: Main Ideas',
      subject: 'Reading',
      gradeLevel: '3rd Grade',
      duration: 30,
      objectives: ['Identify main idea', 'Find supporting details'],
      status: 'published',
      lastModified: '2024-12-14',
      hasAdaptiveContent: true,
    },
    {
      id: '3',
      title: 'Scientific Method Overview',
      subject: 'Science',
      gradeLevel: '5th Grade',
      duration: 50,
      objectives: ['Understand scientific method steps', 'Form hypotheses'],
      status: 'draft',
      lastModified: '2024-12-13',
      hasAdaptiveContent: false,
    },
    {
      id: '4',
      title: 'Multiplication Facts Practice',
      subject: 'Math',
      gradeLevel: '3rd Grade',
      duration: 25,
      objectives: ['Practice multiplication tables 1-10'],
      status: 'published',
      lastModified: '2024-12-12',
      hasAdaptiveContent: true,
    },
    {
      id: '5',
      title: 'Poetry Analysis',
      subject: 'Reading',
      gradeLevel: '5th Grade',
      duration: 40,
      objectives: ['Identify poetic devices', 'Analyze rhythm and rhyme'],
      status: 'archived',
      lastModified: '2024-11-20',
      hasAdaptiveContent: false,
    },
  ];
}

function mockLessonDetail(id: string): Lesson | null {
  const lessons = mockLessons();
  const summary = lessons.find((l) => l.id === id);
  if (!summary) return null;

  return {
    ...summary,
    description: `Detailed lesson plan for ${summary.title}`,
    standards: ['CCSS.MATH.CONTENT.4.NF.A.1'],
    activities: [
      { id: 'act-1', title: 'Warm-up Discussion', type: 'discussion', duration: 5 },
      {
        id: 'act-2',
        title: 'Adaptive Practice',
        type: 'adaptive-game',
        duration: 20,
        contentId: 'game-123',
      },
      { id: 'act-3', title: 'Exit Ticket', type: 'quiz', duration: 10 },
    ],
    createdAt: '2024-12-01',
    authorId: 'teacher-1',
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// API CLIENT
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchLessons(
  accessToken: string,
  options?: { status?: LessonStatus; subject?: string; search?: string }
): Promise<LessonSummary[]> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    let lessons = mockLessons();
    if (options?.status && options.status !== 'draft') {
      lessons = lessons.filter((l) => l.status === options.status);
    }
    if (options?.search) {
      const query = options.search.toLowerCase();
      lessons = lessons.filter((l) => l.title.toLowerCase().includes(query));
    }
    return lessons;
  }

  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.subject) params.set('subject', options.subject);
  if (options?.search) params.set('search', options.search);

  const res = await fetch(`${API_BASE_URL}/api/v1/lessons?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch lessons: ${res.status}`);
  }

  return res.json() as Promise<LessonSummary[]>;
}

export async function fetchLesson(id: string, accessToken: string): Promise<Lesson> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lesson = mockLessonDetail(id);
    if (!lesson) throw new Error('Lesson not found');
    return lesson;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/lessons/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch lesson: ${res.status}`);
  }

  return res.json() as Promise<Lesson>;
}

export async function createLesson(
  lesson: Omit<Lesson, 'id' | 'createdAt' | 'lastModified' | 'authorId'>,
  accessToken: string
): Promise<Lesson> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return {
      id: `lesson-${Date.now()}`,
      ...lesson,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      authorId: 'teacher-1',
    };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/lessons`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(lesson),
  });

  if (!res.ok) {
    throw new Error(`Failed to create lesson: ${res.status}`);
  }

  return res.json() as Promise<Lesson>;
}

export async function updateLesson(
  id: string,
  updates: Partial<Lesson>,
  accessToken: string
): Promise<Lesson> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const lesson = mockLessonDetail(id);
    if (!lesson) throw new Error('Lesson not found');
    return { ...lesson, ...updates, lastModified: new Date().toISOString() };
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/lessons/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    throw new Error(`Failed to update lesson: ${res.status}`);
  }

  return res.json() as Promise<Lesson>;
}

export async function deleteLesson(id: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${API_BASE_URL}/api/v1/lessons/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to delete lesson: ${res.status}`);
  }
}
