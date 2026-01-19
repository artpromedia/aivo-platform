import { supabase } from '@/lib/supabase';

export type GradeLevel = 'K5' | 'MS' | 'HS';

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  type: string;
  order: number;
  contentUrl?: string;
}

export interface Assessment {
  id: string;
  title: string;
  type: 'quiz' | 'test' | 'practice';
  questionCount: number;
  duration: string;
}

export interface SubjectContent {
  id: string;
  title: string;
  gradeLevel: GradeLevel;
  subject: string;
  description: string;
  emoji: string;
  color: string;
  lessons: Lesson[];
  assessments: Assessment[];
  totalProgress: number;
}

export interface LearnerProgress {
  lessonId: string;
  progressPercentage: number;
  lastActivityAt: string;
  completedAt?: string;
}

export class SubjectEngine {
  /**
   * Get subject content with personalized recommendations from AI
   */
  async getSubjectContent(
    gradeLevel: string,
    subjectId: string,
    learnerId: string
  ): Promise<SubjectContent> {
    // Fetch subject from Supabase
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select(`
        *,
        lessons(*),
        assessments(*)
      `)
      .eq('grade_level', gradeLevel)
      .eq('id', subjectId)
      .single();

    if (subjectError) {
      console.error('Error fetching subject:', subjectError);
      throw new Error(`Failed to fetch subject: ${subjectError.message}`);
    }

    // Get learner progress for this subject
    const { data: progress, error: progressError } = await supabase
      .from('learner_progress')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('subject_id', subjectId);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
    }

    // Call AI service for personalized content ordering
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/personalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          progress: progress || [],
          learnerId,
        }),
      });

      if (response.ok) {
        const personalized = await response.json();
        return personalized;
      }
    } catch (error) {
      console.error('AI personalization failed, using default content:', error);
    }

    // Return default content if AI call fails
    return {
      id: subject.id,
      title: subject.name,
      gradeLevel: subject.grade_level as GradeLevel,
      subject: subjectId,
      description: subject.description || '',
      emoji: subject.emoji,
      color: subject.color,
      lessons: subject.lessons || [],
      assessments: subject.assessments || [],
      totalProgress: this.calculateTotalProgress(subject.lessons || [], progress || []),
    };
  }

  /**
   * Record progress for a specific lesson
   */
  async recordLessonProgress(
    learnerId: string,
    lessonId: string,
    progress: number
  ): Promise<void> {
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('lesson_progress')
      .upsert({
        learner_id: learnerId,
        lesson_id: lessonId,
        progress_percentage: progress,
        updated_at: now,
        completed_at: progress >= 100 ? now : null,
      }, {
        onConflict: 'learner_id,lesson_id',
      });

    if (error) {
      console.error('Error recording lesson progress:', error);
      throw new Error(`Failed to record progress: ${error.message}`);
    }

    // Notify AI Brain of progress update
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai/progress-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          lessonId,
          progress,
          timestamp: now,
        }),
      });
    } catch (error) {
      console.error('Failed to notify AI Brain:', error);
    }
  }

  /**
   * Get recommended next lesson based on AI analysis
   */
  async getNextRecommendedLesson(
    learnerId: string,
    subjectId: string
  ): Promise<Lesson | null> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai/recommend-lesson`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learnerId, subjectId }),
        }
      );

      if (response.ok) {
        const { lesson } = await response.json();
        return lesson;
      }
    } catch (error) {
      console.error('Failed to get AI recommendation:', error);
    }

    // Fallback: get first incomplete lesson
    const { data: lessonProgress } = await supabase
      .from('lesson_progress')
      .select('lesson_id, progress_percentage')
      .eq('learner_id', learnerId)
      .lt('progress_percentage', 100);

    if (lessonProgress && lessonProgress.length > 0) {
      const { data: lesson } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonProgress[0].lesson_id)
        .single();

      return lesson as Lesson;
    }

    return null;
  }

  /**
   * Start a subject assessment
   */
  async startSubjectAssessment(
    learnerId: string,
    subjectId: string,
    assessmentType: 'quiz' | 'test' | 'practice'
  ): Promise<{ sessionId: string; questions: unknown[] }> {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/assessment/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'subject',
          learnerId,
          subjectId,
          assessmentType,
        }),
      }
    );

    if (!response.ok) {
      throw new Error('Failed to start assessment');
    }

    const { sessionId, questions } = await response.json();

    // Record session start in Supabase
    await supabase
      .from('assessment_sessions')
      .insert({
        id: sessionId,
        learner_id: learnerId,
        type: 'subject',
        subject_id: subjectId,
        started_at: new Date().toISOString(),
      });

    return { sessionId, questions };
  }

  /**
   * Get learner's subject performance analytics
   */
  async getSubjectAnalytics(
    learnerId: string,
    subjectId: string
  ): Promise<{
    overallProgress: number;
    averageScore: number;
    timeSpent: number;
    streak: number;
    strengths: string[];
    areasForImprovement: string[];
  }> {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/analytics/subject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ learnerId, subjectId }),
        }
      );

      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }

    // Return default analytics
    return {
      overallProgress: 0,
      averageScore: 0,
      timeSpent: 0,
      streak: 0,
      strengths: [],
      areasForImprovement: [],
    };
  }

  /**
   * Calculate total progress across all lessons
   */
  private calculateTotalProgress(
    lessons: Lesson[],
    progress: Array<{ lesson_id: string; progress_percentage: number }>
  ): number {
    if (lessons.length === 0) return 0;

    const progressMap = new Map(
      progress.map(p => [p.lesson_id, p.progress_percentage])
    );

    const totalProgress = lessons.reduce((sum, lesson) => {
      return sum + (progressMap.get(lesson.id) || 0);
    }, 0);

    return Math.round(totalProgress / lessons.length);
  }

  /**
   * Get all subjects for a grade level
   */
  async getSubjectsByGradeLevel(gradeLevel: GradeLevel): Promise<SubjectContent[]> {
    const { data: subjects, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('grade_level', gradeLevel)
      .order('name');

    if (error) {
      console.error('Error fetching subjects:', error);
      throw new Error(`Failed to fetch subjects: ${error.message}`);
    }

    return (subjects || []).map(subject => ({
      id: subject.id,
      title: subject.name,
      gradeLevel: subject.grade_level as GradeLevel,
      subject: subject.id,
      description: subject.description || '',
      emoji: subject.emoji,
      color: subject.color,
      lessons: [],
      assessments: [],
      totalProgress: 0,
    }));
  }
}

// Export singleton instance
export const subjectEngine = new SubjectEngine();
