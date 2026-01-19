import { createClient } from '../../lib/supabase';
import type {
  GradeLevel,
  SubjectInfo,
  Lesson,
  SubjectProgress,
  PersonalizedContent,
  ContentRecommendation,
  LearningAdaptation,
  SUBJECTS_BY_GRADE,
} from './types';

// =============================================================================
// Subject Content Engine
// =============================================================================

/**
 * SubjectEngine handles all subject-related content retrieval,
 * personalization, and progress tracking.
 */
export class SubjectEngine {
  private supabase = createClient();

  // ---------------------------------------------------------------------------
  // Get Subject Content (with AI Personalization)
  // ---------------------------------------------------------------------------

  async getSubjectContent(
    gradeLevel: GradeLevel,
    subjectId: string,
    learnerId: string
  ): Promise<PersonalizedContent> {
    // Fetch subject from Supabase
    const { data: subject, error: subjectError } = await this.supabase
      .from('subjects')
      .select(`
        *,
        lessons(*)
      `)
      .eq('grade_level', gradeLevel)
      .eq('id', subjectId)
      .single();

    if (subjectError) {
      console.warn('Failed to fetch subject from Supabase:', subjectError);
    }

    // Get learner progress
    const { data: progress } = await this.supabase
      .from('learner_progress')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('subject_id', subjectId);

    // Call AI for personalized content ordering and recommendations
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/ai/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          progress,
          learnerId,
          gradeLevel,
        }),
      });

      if (response.ok) {
        const personalized = await response.json();
        return personalized as PersonalizedContent;
      }
    } catch (error) {
      console.warn('AI personalization unavailable, using default content:', error);
    }

    // Fallback: Return basic content without AI personalization
    return this.buildBasicContent(subject, progress);
  }

  // ---------------------------------------------------------------------------
  // Get All Subjects for Grade Level
  // ---------------------------------------------------------------------------

  async getSubjectsForGrade(gradeLevel: GradeLevel): Promise<SubjectInfo[]> {
    const { data, error } = await this.supabase
      .from('subjects')
      .select('*')
      .eq('grade_level', gradeLevel)
      .order('name');

    if (error || !data || data.length === 0) {
      // Fallback to hardcoded subjects
      const { SUBJECTS_BY_GRADE } = await import('./types');
      return SUBJECTS_BY_GRADE[gradeLevel] || [];
    }

    return data.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      description: s.description,
      color: s.color,
      gradeLevel: s.grade_level as GradeLevel,
      category: 'math' as const, // Default category
    }));
  }

  // ---------------------------------------------------------------------------
  // Get Lessons for Subject
  // ---------------------------------------------------------------------------

  async getLessons(subjectId: string): Promise<Lesson[]> {
    const { data, error } = await this.supabase
      .from('lessons')
      .select('*')
      .eq('subject_id', subjectId)
      .order('order_index');

    if (error || !data) {
      return [];
    }

    return data.map((l) => ({
      id: l.id,
      subjectId: l.subject_id,
      title: l.title,
      description: l.description,
      orderIndex: l.order_index,
      durationMinutes: l.duration_minutes,
      type: 'interactive' as const,
      objectives: [],
      content: l.content as Lesson['content'],
    }));
  }

  // ---------------------------------------------------------------------------
  // Get Learner Progress
  // ---------------------------------------------------------------------------

  async getProgress(learnerId: string, subjectId: string): Promise<SubjectProgress | null> {
    const { data: progressRecords, error } = await this.supabase
      .from('learner_progress')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('subject_id', subjectId);

    if (error || !progressRecords || progressRecords.length === 0) {
      return null;
    }

    // Get total lessons count
    const { count: totalLessons } = await this.supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .eq('subject_id', subjectId);

    const completedLessons = progressRecords.filter((p) => p.completed_at).length;
    const overallProgress = totalLessons ? (completedLessons / totalLessons) * 100 : 0;
    const totalTime = progressRecords.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);

    // Find current lesson (first incomplete)
    const currentLesson = progressRecords.find((p) => !p.completed_at);

    return {
      subjectId,
      learnerId,
      lessonsCompleted: completedLessons,
      totalLessons: totalLessons || 0,
      overallProgress,
      currentLessonId: currentLesson?.lesson_id,
      scores: progressRecords
        .filter((p) => p.completed_at && p.score !== null)
        .map((p) => ({
          lessonId: p.lesson_id || '',
          score: p.score || 0,
          completedAt: p.completed_at || '',
          attempts: 1,
        })),
      timeSpentMinutes: totalTime,
      lastAccessedAt: progressRecords[0]?.updated_at || new Date().toISOString(),
      masteryLevel: overallProgress >= 90 ? 'mastered' : overallProgress >= 60 ? 'proficient' : overallProgress > 0 ? 'in_progress' : 'not_started',
    };
  }

  // ---------------------------------------------------------------------------
  // Record Lesson Progress
  // ---------------------------------------------------------------------------

  async recordLessonProgress(
    learnerId: string,
    lessonId: string,
    subjectId: string,
    progress: number,
    score?: number,
    completed?: boolean
  ): Promise<void> {
    const { error } = await this.supabase
      .from('learner_progress')
      .upsert({
        learner_id: learnerId,
        lesson_id: lessonId,
        subject_id: subjectId,
        progress_percentage: progress,
        score: score || null,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'learner_id,subject_id,lesson_id',
      });

    if (error) {
      console.error('Failed to record progress:', error);
      throw error;
    }
  }

  // ---------------------------------------------------------------------------
  // Record Time Spent
  // ---------------------------------------------------------------------------

  async recordTimeSpent(
    learnerId: string,
    subjectId: string,
    lessonId: string,
    minutes: number
  ): Promise<void> {
    // Get current progress record
    const { data: existing } = await this.supabase
      .from('learner_progress')
      .select('time_spent_minutes')
      .eq('learner_id', learnerId)
      .eq('subject_id', subjectId)
      .eq('lesson_id', lessonId)
      .single();

    const currentTime = existing?.time_spent_minutes || 0;

    await this.supabase
      .from('learner_progress')
      .upsert({
        learner_id: learnerId,
        subject_id: subjectId,
        lesson_id: lessonId,
        time_spent_minutes: currentTime + minutes,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'learner_id,subject_id,lesson_id',
      });
  }

  // ---------------------------------------------------------------------------
  // Get Recommendations
  // ---------------------------------------------------------------------------

  async getRecommendations(
    learnerId: string,
    gradeLevel: GradeLevel,
    limit: number = 5
  ): Promise<ContentRecommendation[]> {
    // Call AI for personalized recommendations
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiUrl}/api/ai/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          gradeLevel,
          limit,
        }),
      });

      if (response.ok) {
        const recommendations = await response.json();
        return recommendations as ContentRecommendation[];
      }
    } catch (error) {
      console.warn('AI recommendations unavailable:', error);
    }

    // Fallback: Return basic recommendations
    return this.buildBasicRecommendations(learnerId, gradeLevel, limit);
  }

  // ---------------------------------------------------------------------------
  // Private Helper Methods
  // ---------------------------------------------------------------------------

  private buildBasicContent(
    subject: unknown,
    progress: unknown[] | null
  ): PersonalizedContent {
    // Build content without AI personalization
    const subjectData = subject as Record<string, unknown>;
    const lessons = (subjectData?.lessons as unknown[]) || [];

    return {
      subject: {
        id: subjectData?.id as string || '',
        name: subjectData?.name as string || 'Unknown Subject',
        emoji: subjectData?.emoji as string || '📚',
        description: subjectData?.description as string || '',
        color: subjectData?.color as string || 'from-blue-400 to-blue-600',
        gradeLevel: subjectData?.grade_level as GradeLevel || 'K5',
        category: 'math' as const,
      },
      lessons: lessons.map((l: unknown) => {
        const lesson = l as Record<string, unknown>;
        return {
          id: lesson.id as string,
          subjectId: lesson.subject_id as string,
          title: lesson.title as string,
          description: lesson.description as string,
          orderIndex: lesson.order_index as number,
          durationMinutes: lesson.duration_minutes as number,
          type: 'interactive' as const,
          objectives: [],
          content: lesson.content as Lesson['content'],
        };
      }),
      recommendations: [],
      adaptations: [],
    };
  }

  private async buildBasicRecommendations(
    learnerId: string,
    gradeLevel: GradeLevel,
    limit: number
  ): Promise<ContentRecommendation[]> {
    // Get subjects for grade level
    const subjects = await this.getSubjectsForGrade(gradeLevel);

    // Get progress for each subject
    const recommendations: ContentRecommendation[] = [];

    for (const subject of subjects.slice(0, limit)) {
      const progress = await this.getProgress(learnerId, subject.id);

      if (!progress || progress.overallProgress < 100) {
        recommendations.push({
          type: progress ? 'lesson' : 'lesson',
          lessonId: progress?.currentLessonId || `${subject.id}-lesson-1`,
          title: progress ? `Continue ${subject.name}` : `Start ${subject.name}`,
          reason: progress
            ? `You're ${Math.round(progress.overallProgress)}% through this subject`
            : 'Begin your learning journey',
          priority: progress ? progress.overallProgress : 0,
        });
      }
    }

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, limit);
  }
}

// Singleton instance
let subjectEngineInstance: SubjectEngine | null = null;

export function getSubjectEngine(): SubjectEngine {
  if (!subjectEngineInstance) {
    subjectEngineInstance = new SubjectEngine();
  }
  return subjectEngineInstance;
}
