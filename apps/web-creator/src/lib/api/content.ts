/**
 * Content API types
 */

export interface AdaptiveCondition {
  id: string;
  type:
    | 'performance'
    | 'attempts'
    | 'time'
    | 'engagement'
    | 'skill'
    | 'custom'
    | 'mastery'
    | 'previous_answer'
    | 'attempt_count'
    | 'time_spent';
  operator:
    | 'equals'
    | 'greater'
    | 'less'
    | 'between'
    | 'contains'
    | 'greater_than'
    | 'less_than'
    | 'not_equals';
  value: string | number | boolean;
  targetBlockId?: string;
  skillId?: string;
}

export interface ContentBlock {
  id: string;
  type: string;
  label: string;
  content: unknown;
  conditions?: AdaptiveCondition[];
}

export interface LessonBlock {
  id: string;
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: Record<string, any>;
  order: number;
}

export interface LessonVersion {
  id: string;
  version: number;
  versionNumber: number;
  status: 'draft' | 'published' | 'archived';
  blocks: LessonBlock[];
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
  note?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  versions: LessonVersion[];
  currentVersion?: LessonVersion;
  blocks?: LessonBlock[];
  createdAt: string;
  updatedAt: string;
}

// Content service base URL - defaults to local development
const CONTENT_SERVICE_URL = process.env.NEXT_PUBLIC_CONTENT_SERVICE_URL || '/api/content';

/**
 * Helper function to make API requests to the content service
 */
async function contentFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${CONTENT_SERVICE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Content API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export const contentApi = {
  async getLessons(): Promise<Lesson[]> {
    try {
      return await contentFetch<Lesson[]>('/lessons');
    } catch (error) {
      console.error('Failed to fetch lessons:', error);
      return [];
    }
  },

  async getLesson(id: string): Promise<Lesson | null> {
    try {
      return await contentFetch<Lesson>(`/lessons/${id}`);
    } catch (error) {
      console.error(`Failed to fetch lesson ${id}:`, error);
      return null;
    }
  },

  async getLessonVersion(lessonId: string, versionId: string): Promise<LessonVersion | null> {
    try {
      return await contentFetch<LessonVersion>(`/lessons/${lessonId}/versions/${versionId}`);
    } catch (error) {
      console.error(`Failed to fetch lesson version ${lessonId}/${versionId}:`, error);
      return null;
    }
  },

  async getLessonVersions(lessonId: string): Promise<LessonVersion[]> {
    try {
      return await contentFetch<LessonVersion[]>(`/lessons/${lessonId}/versions`);
    } catch (error) {
      console.error(`Failed to fetch lesson versions for ${lessonId}:`, error);
      return [];
    }
  },

  async createLessonVersion(lessonId: string, data: Partial<LessonVersion>): Promise<LessonVersion> {
    return await contentFetch<LessonVersion>(`/lessons/${lessonId}/versions`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async restoreVersion(lessonId: string, versionId: string): Promise<void> {
    await contentFetch<void>(`/lessons/${lessonId}/versions/${versionId}/restore`, {
      method: 'POST',
    });
  },
};
