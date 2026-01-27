import type { DailyGoal, LearningLesson, Achievement } from '../../types';

export interface ProgressDashboardProps {
  /** Learner's first name */
  firstName: string;
  /** Daily goals */
  dailyGoals: DailyGoal[];
  /** Lessons to continue */
  continueLearning: LearningLesson[];
  /** Recent achievements */
  achievements: Achievement[];
  /** Current learning streak (days) */
  streak: number;
  /** Callback when lesson is clicked */
  onLessonClick?: (lessonId: string, courseId: string) => void;
  /** Callback when 'View all courses' is clicked */
  onViewAllCourses?: () => void;
  /** Callback when 'View achievements' is clicked */
  onViewAchievements?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export interface GoalProgressProps {
  /** Goal data */
  goal: DailyGoal;
  /** Additional CSS classes */
  className?: string;
}

export interface LearningCardProps {
  /** Lesson data */
  lesson: LearningLesson;
  /** Callback when clicked */
  onClick?: ((lessonId: string, courseId: string) => void) | undefined;
  /** Additional CSS classes */
  className?: string;
}

export interface AchievementBadgeProps {
  /** Achievement data */
  achievement: Achievement;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

export interface StreakDisplayProps {
  /** Current streak count */
  streak: number;
  /** Days of the week to display */
  days?: string[];
  /** Additional CSS classes */
  className?: string;
}
