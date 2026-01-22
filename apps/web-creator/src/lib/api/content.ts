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

export const contentApi = {
  async getLessons(): Promise<Lesson[]> {
    return [];
  },
  async getLesson(_id: string): Promise<Lesson | null> {
    return null;
  },
  async getLessonVersion(_lessonId: string, _versionId: string): Promise<LessonVersion | null> {
    return null;
  },
  async getLessonVersions(_lessonId: string): Promise<LessonVersion[]> {
    return [];
  },
  async createLessonVersion(_lessonId: string, _data: Partial<LessonVersion>): Promise<LessonVersion> {
    throw new Error('Not implemented');
  },
  async restoreVersion(_lessonId: string, _versionId: string): Promise<void> {
    throw new Error('Not implemented');
  },
};
