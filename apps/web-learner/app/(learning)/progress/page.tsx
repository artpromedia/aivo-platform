'use client';

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
        <h1 className="text-2xl font-bold text-slate-900">My Progress</h1>
        <p className="mt-1 text-slate-600">Track your learning journey and achievements</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-4">
          <div className="text-3xl">⏱️</div>
          <div className="mt-2 text-2xl font-bold text-blue-700">{totalMinutesThisWeek}</div>
          <div className="text-sm text-blue-600">Minutes this week</div>
        </div>
        <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4">
          <div className="text-3xl">⭐</div>
          <div className="mt-2 text-2xl font-bold text-purple-700">{totalXpThisWeek}</div>
          <div className="text-sm text-purple-600">XP earned</div>
        </div>
        <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-4">
          <div className="text-3xl">🔥</div>
          <div className="mt-2 text-2xl font-bold text-orange-700">{streakDays}</div>
          <div className="text-sm text-orange-600">Day streak</div>
        </div>
        <div className="rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4">
          <div className="text-3xl">📚</div>
          <div className="mt-2 text-2xl font-bold text-green-700">{lessonsCompleted}</div>
          <div className="text-sm text-green-600">Lessons completed</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly Activity Chart */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">📊 Weekly Learning Time</h2>
          <div className="flex h-48 items-end justify-between gap-2">
            {weeklyStats.map((stat, i) => (
              <div key={stat.day} className="flex flex-1 flex-col items-center">
                <div className="w-full rounded-t-lg bg-slate-100" style={{ height: '100%' }}>
                  <div
                    className={`mt-auto w-full rounded-t-lg transition-all ${
                      i < 6 ? 'bg-gradient-to-t from-blue-500 to-cyan-400' : 'bg-slate-200'
                    }`}
                    style={{ height: `${maxMinutes > 0 ? (stat.minutes / maxMinutes) * 100 : 0}%` }}
                  />
                </div>
                <div className="mt-2 text-xs font-medium text-slate-500">{stat.day}</div>
                <div className="text-xs text-slate-400">{stat.minutes}m</div>
              </div>
            ))}
          </div>
        </section>

        {/* Subject Progress */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">📚 Subject Progress</h2>
          <div className="space-y-4">
            {subjectProgress.map((subject) => (
              <div key={subject.subject}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-medium text-slate-700">{subject.subject}</span>
                  <span className="text-sm text-slate-500">
                    {subject.lessons}/{subject.total} lessons
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-3 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${subject.color} transition-all`}
                      style={{ width: `${subject.progress}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium text-slate-600">
                    {subject.progress}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Mastery Level: {subject.mastery}%
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Skills */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">💪 Skills</h2>
          <div className="grid grid-cols-2 gap-3">
            {skills.map((skill) => (
              <div
                key={skill.skill}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-lg">{skill.emoji}</span>
                  <span className="text-sm font-medium text-slate-700">{skill.skill}</span>
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: skill.maxLevel }).map((_, i) => (
                    <div
                      key={`lvl-${skill.skill}-${i}`}
                      className={`h-2 flex-1 rounded-full ${
                        i < skill.level ? 'bg-yellow-400' : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Level {skill.level}/{skill.maxLevel}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Recent Activity */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-900">🕐 Recent Activity</h2>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"
              >
                <span className="text-xl">{activity.emoji}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700">{activity.title}</div>
                  <div className="text-xs text-slate-400">{activity.time}</div>
                </div>
                <div className="rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
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
