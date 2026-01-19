'use client';

import { cn, getGreeting } from '../../utils';
import { GoalProgress } from './GoalProgress';
import { LearningCard } from './LearningCard';
import { AchievementBadge } from './AchievementBadge';
import { StreakDisplay } from './StreakDisplay';
import type { ProgressDashboardProps } from './types';

/**
 * ProgressDashboard Component
 *
 * A comprehensive learner dashboard showing daily goals, lessons to continue,
 * achievements, and learning streak.
 */
export function ProgressDashboard({
  firstName,
  dailyGoals,
  continueLearning,
  achievements,
  streak,
  onLessonClick,
  onViewAllCourses,
  onViewAchievements,
  className,
}: ProgressDashboardProps) {
  const greeting = getGreeting();

  return (
    <div className={cn('space-y-8', className)}>
      {/* Welcome Section */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="mt-2 text-blue-100">
              Ready to learn something amazing today?
            </p>
          </div>
          <button
            onClick={onViewAllCourses}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-6 py-3 font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
          >
            Start Learning ▶️
          </button>
        </div>

        {/* Daily Goals Progress */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {dailyGoals.map((goal) => (
            <GoalProgress key={goal.id} goal={goal} />
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Continue Learning */}
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Continue Learning
              </h2>
              <button
                onClick={onViewAllCourses}
                className="text-sm text-blue-600 hover:underline"
              >
                View all →
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {continueLearning.map((lesson) => (
                <LearningCard
                  key={lesson.id}
                  lesson={lesson}
                  onClick={onLessonClick}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Achievements */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">🏆 Achievements</h2>
              <button
                onClick={onViewAchievements}
                className="text-xs text-blue-600 hover:underline"
              >
                View all
              </button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {achievements.slice(0, 4).map((achievement) => (
                <AchievementBadge key={achievement.id} achievement={achievement} />
              ))}
            </div>
          </section>

          {/* Learning Streak */}
          <StreakDisplay streak={streak} />
        </div>
      </div>
    </div>
  );
}
