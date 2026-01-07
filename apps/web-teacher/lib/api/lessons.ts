/**
 * Lessons API Client
 * Types and fetch functions for lesson builder.
 *
 * Backend Service: content-svc (port 3010)
 */

const CONTENT_SVC_URL = process.env.NEXT_PUBLIC_CONTENT_SVC_URL || 'http://localhost:3010';
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
  // Map frontend status to backend status (backend uses UPPERCASE)
  if (options?.status) params.set('status', options.status.toUpperCase());
  if (options?.subject) params.set('subject', options.subject);
  if (options?.search) params.set('search', options.search);

  const res = await fetch(`${CONTENT_SVC_URL}/lessons?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch lessons: ${res.status}`);
  }

  const data = await res.json();
  // content-svc returns { items: [...], pagination: {...} }
  const items = data.items ?? data;
  return items.map(transformLessonResponse);
}

// Helper to transform backend lesson response to frontend interface
function transformLessonResponse(lesson: any): LessonSummary {
  return {
    id: lesson.id,
    title: lesson.title,
    subject: lesson.subject ?? extractSubjectFromBlocks(lesson.blocks),
    gradeLevel: lesson.gradeLevel ?? lesson.settings?.gradeLevel ?? 'K-5',
    duration: lesson.duration ?? estimateDuration(lesson.blocks),
    objectives: lesson.objectives ?? lesson.settings?.objectives ?? [],
    status: (lesson.status ?? 'draft').toLowerCase() as LessonStatus,
    lastModified: lesson.updatedAt ?? lesson.lastModified,
    hasAdaptiveContent: lesson.hasAdaptiveContent ?? checkForAdaptiveContent(lesson.blocks),
  };
}

// Helper to extract subject from lesson blocks
function extractSubjectFromBlocks(blocks: any[]): string {
  if (!blocks || blocks.length === 0) return 'General';
  const block = blocks.find((b: any) => b.content?.subject);
  return block?.content?.subject ?? 'General';
}

// Helper to estimate duration from blocks
function estimateDuration(blocks: any[]): number {
  if (!blocks || blocks.length === 0) return 30;
  return blocks.reduce((sum: number, block: any) => {
    return sum + (block.content?.duration ?? 5);
  }, 0);
}

// Helper to check if lesson has adaptive content
function checkForAdaptiveContent(blocks: any[]): boolean {
  if (!blocks || blocks.length === 0) return false;
  return blocks.some((b: any) => b.type === 'adaptive-game' || b.adaptiveRules?.length > 0);
}

export async function fetchLesson(id: string, accessToken: string): Promise<Lesson> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const lesson = mockLessonDetail(id);
    if (!lesson) throw new Error('Lesson not found');
    return lesson;
  }

  const res = await fetch(`${CONTENT_SVC_URL}/lessons/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch lesson: ${res.status}`);
  }

  const data = await res.json();
  return transformFullLessonResponse(data);
}

// Helper to transform full lesson response to frontend interface
function transformFullLessonResponse(lesson: any): Lesson {
  return {
    ...transformLessonResponse(lesson),
    description: lesson.description,
    standards: lesson.settings?.standards ?? [],
    activities: (lesson.blocks ?? []).map((block: any) => ({
      id: block.id,
      title: block.content?.title ?? block.type,
      type: mapBlockTypeToActivityType(block.type),
      duration: block.content?.duration ?? 5,
      contentId: block.content?.contentId,
    })),
    createdAt: lesson.createdAt,
    authorId: lesson.createdById ?? lesson.authorId,
  };
}

// Helper to map backend block types to frontend activity types
function mapBlockTypeToActivityType(blockType: string): LessonActivity['type'] {
  const typeMap: Record<string, LessonActivity['type']> = {
    'adaptive-game': 'adaptive-game',
    'video': 'video',
    'reading': 'reading',
    'text': 'reading',
    'quiz': 'quiz',
    'discussion': 'discussion',
    'assessment': 'quiz',
  };
  return typeMap[blockType] ?? 'reading';
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

  // Transform frontend lesson format to backend format
  const backendLesson = {
    title: lesson.title,
    description: lesson.description,
    blocks: (lesson.activities ?? []).map((activity, index) => ({
      id: activity.id ?? `block-${index}`,
      type: activity.type,
      content: {
        title: activity.title,
        duration: activity.duration,
        contentId: activity.contentId,
      },
      order: index,
    })),
    settings: {
      subject: lesson.subject,
      gradeLevel: lesson.gradeLevel,
      duration: lesson.duration,
      objectives: lesson.objectives,
      standards: lesson.standards,
    },
  };

  const res = await fetch(`${CONTENT_SVC_URL}/lessons`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backendLesson),
  });

  if (!res.ok) {
    throw new Error(`Failed to create lesson: ${res.status}`);
  }

  const data = await res.json();
  return transformFullLessonResponse(data);
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

  // Transform frontend updates to backend format
  const backendUpdates: Record<string, any> = {};
  if (updates.title) backendUpdates.title = updates.title;
  if (updates.description) backendUpdates.description = updates.description;
  if (updates.activities) {
    backendUpdates.blocks = updates.activities.map((activity, index) => ({
      id: activity.id ?? `block-${index}`,
      type: activity.type,
      content: {
        title: activity.title,
        duration: activity.duration,
        contentId: activity.contentId,
      },
      order: index,
    }));
  }
  if (updates.subject || updates.gradeLevel || updates.duration || updates.objectives || updates.standards) {
    backendUpdates.settings = {
      subject: updates.subject,
      gradeLevel: updates.gradeLevel,
      duration: updates.duration,
      objectives: updates.objectives,
      standards: updates.standards,
    };
  }

  const res = await fetch(`${CONTENT_SVC_URL}/lessons/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(backendUpdates),
  });

  if (!res.ok) {
    throw new Error(`Failed to update lesson: ${res.status}`);
  }

  const data = await res.json();
  return transformFullLessonResponse(data);
}

export async function deleteLesson(id: string, accessToken: string): Promise<void> {
  if (USE_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    return;
  }

  const res = await fetch(`${CONTENT_SVC_URL}/lessons/${id}`, {
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
