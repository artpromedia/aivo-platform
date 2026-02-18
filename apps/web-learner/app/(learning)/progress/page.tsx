'use client';

import { Clock, Sparkles, Flame, BookOpen, BarChart3, Zap, Activity } from 'lucide-react';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useProgress } from '@/lib/hooks/use-learner-api';

export default function ProgressPage() {
  const { data, isLoading, error, refetch } = useProgress();

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return <ErrorState message="Couldn't load your progress." onRetry={() => void refetch()} />;
  }

  const { weeklyStats, subjectProgress, skills, recentActivity, streakDays, lessonsCompleted } = data;
  const maxMinutes = Math.max(...weeklyStats.map((s) => s.minutes), 1);
  const totalXpThisWeek = weeklyStats.reduce((sum, s) => sum + s.xp, 0);
  const totalMinutesThisWeek = weeklyStats.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Progress</h1>
        <p className="mt-1 text-gray-500">Track your learning journey and achievements</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
            <Clock className="h-5 w-5 text-indigo-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">{totalMinutesThisWeek}</div>
          <div className="text-sm text-gray-500">Minutes this week</div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">{totalXpThisWeek}</div>
          <div className="text-sm text-gray-500">XP earned</div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">{streakDays}</div>
          <div className="text-sm text-gray-500">Day streak</div>
        </div>
        <div className="rounded-2xl bg-white p-4 border border-gray-100 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <BookOpen className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-gray-900">{lessonsCompleted}</div>
          <div className="text-sm text-gray-500">Lessons completed</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Weekly Learning Time</h2>
          </div>
          <div className="flex h-48 items-end justify-between gap-2">
            {weeklyStats.map((stat, i) => (
              <div key={stat.day} className="flex flex-1 flex-col items-center">
                <div className="w-full rounded-t-lg bg-gray-50" style={{ height: '100%' }}>
                  <div
                    className={`mt-auto w-full rounded-t-lg transition-all ${
                      i < 6 ? 'bg-gradient-to-t from-indigo-500 to-indigo-400' : 'bg-gray-200'
                    }`}
                    style={{ height: `${maxMinutes > 0 ? (stat.minutes / maxMinutes) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-gray-500">{stat.day}</div>
                <div className="text-xs text-gray-400">{stat.minutes}m</div>
              </div>
            ))}
          </div>
        </section>

        {/* Subject Progress */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Subject Progress</h2>
          </div>
          <div className="space-y-4">
            {subjectProgress.map((subject) => (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-gray-700">{subject.subject}</span>
                  <span className="text-sm text-gray-500">
                    {subject.lessons}/{subject.total} lessons
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${subject.color} transition-all`}
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-gray-600">
                    {subject.progress}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Mastery Level: {subject.mastery}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Skills</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {skills.map((skill) => (
              <div
                key={skill.skill}
                className="rounded-xl border border-gray-100 bg-gray-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{skill.emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{skill.skill}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: skill.maxLevel }).map((_, i) => (
                    <div
                      key={`lvl-${skill.skill}-${i}`}
                      className={`h-2 flex-1 rounded-full ${
                        i < skill.level ? 'bg-indigo-500' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Level {skill.level}/{skill.maxLevel}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
              >
                <span className="text-xl">{activity.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-700">{activity.title}</div>
                  <div className="text-xs text-gray-400">{activity.time}</div>
                </div>
                <div className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                  +{activity.xp} XP
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
