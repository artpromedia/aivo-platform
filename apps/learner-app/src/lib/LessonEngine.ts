import { supabase } from './supabase';

interface LessonPlan {
  id: string;
  subject: string;
  gradeLevel: string;
  title: string;
  objectives: string[];
  activities: Activity[];
  assessments: Assessment[];
  adaptiveRules: AdaptiveRule[];
}

interface Activity {
  id: string;
  type: 'video' | 'interactive' | 'reading' | 'game' | 'quiz';
  content: Record<string, unknown>;
  duration: number;
  difficulty: number;
}

interface Assessment {
  id: string;
  type: 'formative' | 'summative' | 'diagnostic';
  questions: Question[];
  passingScore: number;
}

interface Question {
  id: string;
  text: string;
  type: 'multiple_choice' | 'short_answer' | 'matching';
  options?: string[];
  correctAnswer: string | string[];
}

interface AdaptiveRule {
  id: string;
  condition: 'accuracy_below' | 'accuracy_above' | 'time_exceeded' | 'engagement_low';
  threshold: number;
  action: 'reduce_difficulty' | 'increase_difficulty' | 'show_hint' | 'skip_activity';
}

interface ActivityPerformance {
  completed: boolean;
  timeSpent: number;
  accuracy?: number;
  engagement?: number;
}

export class LessonEngine {
  private aiServiceUrl: string;

  constructor() {
    this.aiServiceUrl = process.env.NEXT_PUBLIC_AI_SERVICE_URL || process.env.AI_SERVICE_URL || '';
  }

  async getPersonalizedLesson(
    learnerId: string,
    subject: string,
    gradeLevel: string
  ): Promise<LessonPlan> {
    // Get learner's current progress
    const { data: progress } = await supabase
      .from('learner_progress')
      .select('*')
      .eq('learner_id', learnerId)
      .eq('subject_id', subject)
      .single();

    // Get learner's AI brain state
    const { data: brainState } = await supabase
      .from('learner_brain_states')
      .select('model_state')
      .eq('learner_id', learnerId)
      .single();

    // Call AI to generate personalized lesson
    const response = await fetch(this.aiServiceUrl + '/generate-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId,
        subject,
        gradeLevel,
        currentProgress: progress,
        brainState: brainState?.model_state,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate lesson: ${response.statusText}`);
    }

    const lesson = await response.json();

    // Save lesson plan
    await supabase
      .from('lesson_plans')
      .insert({
        learner_id: learnerId,
        subject,
        grade_level: gradeLevel,
        plan: lesson,
        generated_at: new Date().toISOString(),
      })
      .select()
      .single();

    return lesson;
  }

  async trackActivity(
    learnerId: string,
    lessonId: string,
    activityId: string,
    performance: ActivityPerformance
  ): Promise<void> {
    // Record activity completion
    await supabase
      .from('activity_completions')
      .insert({
        learner_id: learnerId,
        lesson_id: lessonId,
        activity_id: activityId,
        ...performance,
        completed_at: new Date().toISOString(),
      });

    // Update AI brain with new data
    await fetch(this.aiServiceUrl + '/update-brain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId,
        activityData: performance,
      }),
    });

    // Check if lesson complete
    const { data: lesson } = await supabase
      .from('lesson_plans')
      .select('plan')
      .eq('id', lessonId)
      .single();

    if (!lesson) return;

    const { data: activities } = await supabase
      .from('activity_completions')
      .select('*')
      .eq('lesson_id', lessonId)
      .eq('learner_id', learnerId);

    const completedCount = activities?.length || 0;
    const totalActivities = (lesson.plan as LessonPlan).activities?.length || 0;

    // If all activities done, mark lesson complete
    if (completedCount >= totalActivities) {
      await this.markLessonComplete(learnerId, lessonId);
    }
  }

  async getNextActivity(
    learnerId: string,
    lessonId: string
  ): Promise<Activity | null> {
    // Get completed activities
    const { data: completed } = await supabase
      .from('activity_completions')
      .select('activity_id')
      .eq('learner_id', learnerId)
      .eq('lesson_id', lessonId);

    const completedIds = completed?.map(c => c.activity_id) || [];

    // Get lesson plan
    const { data: lesson } = await supabase
      .from('lesson_plans')
      .select('plan')
      .eq('id', lessonId)
      .single();

    if (!lesson) return null;

    const lessonPlan = lesson.plan as LessonPlan;

    // Find next incomplete activity
    const nextActivity = lessonPlan.activities?.find(
      (a: Activity) => !completedIds.includes(a.id)
    );

    // If we need to adapt based on performance
    if (nextActivity) {
      // Get recent performance data
      const { data: recentPerformance } = await supabase
        .from('activity_completions')
        .select('*')
        .eq('learner_id', learnerId)
        .eq('lesson_id', lessonId)
        .order('completed_at', { ascending: false })
        .limit(3);

      // Call AI to potentially modify difficulty
      const response = await fetch(this.aiServiceUrl + '/adapt-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerId,
          activity: nextActivity,
          recentPerformance: recentPerformance || [],
        }),
      });

      if (response.ok) {
        return response.json();
      }
    }

    return nextActivity || null;
  }

  async getLessonProgress(
    learnerId: string,
    lessonId: string
  ): Promise<{ completed: number; total: number; percentage: number }> {
    const { data: lesson } = await supabase
      .from('lesson_plans')
      .select('plan')
      .eq('id', lessonId)
      .single();

    if (!lesson) {
      return { completed: 0, total: 0, percentage: 0 };
    }

    const { data: completions } = await supabase
      .from('activity_completions')
      .select('activity_id')
      .eq('learner_id', learnerId)
      .eq('lesson_id', lessonId);

    const total = (lesson.plan as LessonPlan).activities?.length || 0;
    const completed = completions?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  async getRecommendedLessons(
    learnerId: string,
    subject: string,
    gradeLevel: string,
    limit = 5
  ): Promise<LessonPlan[]> {
    // Get learner's recent activity
    const { data: recentActivity } = await supabase
      .from('activity_completions')
      .select('*')
      .eq('learner_id', learnerId)
      .order('completed_at', { ascending: false })
      .limit(10);

    // Call AI for recommendations
    const response = await fetch(this.aiServiceUrl + '/recommend-lessons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerId,
        subject,
        gradeLevel,
        recentActivity: recentActivity || [],
        limit,
      }),
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }

  private async markLessonComplete(learnerId: string, lessonId: string): Promise<void> {
    await supabase
      .from('lesson_progress')
      .upsert({
        learner_id: learnerId,
        lesson_id: lessonId,
        progress_percentage: 100,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    // Update overall subject progress
    const { data: lesson } = await supabase
      .from('lesson_plans')
      .select('subject')
      .eq('id', lessonId)
      .single();

    if (lesson) {
      await this.updateSubjectProgress(learnerId, lesson.subject);
    }
  }

  private async updateSubjectProgress(learnerId: string, subject: string): Promise<void> {
    // Calculate overall subject progress based on completed lessons
    const { data: allLessons } = await supabase
      .from('lesson_plans')
      .select('id')
      .eq('learner_id', learnerId)
      .eq('subject', subject);

    const { data: completedLessons } = await supabase
      .from('lesson_progress')
      .select('lesson_id')
      .eq('learner_id', learnerId)
      .eq('progress_percentage', 100);

    const total = allLessons?.length || 0;
    const completed = completedLessons?.length || 0;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    await supabase
      .from('learner_progress')
      .upsert({
        learner_id: learnerId,
        subject_id: subject,
        progress_percentage: percentage,
        last_activity_at: new Date().toISOString(),
      });
  }
}

export default LessonEngine;
