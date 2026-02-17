'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useDashboard } from '@/lib/hooks/use-learner-api';

const SUBJECTS = [
  { code: 'MATH', label: 'Math', emoji: '🔢' },
  { code: 'ELA', label: 'ELA', emoji: '📖' },
  { code: 'SCIENCE', label: 'Science', emoji: '🔬' },
  { code: 'SEL', label: 'Social-Emotional', emoji: '💚' },
] as const;

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard();
  const router = useRouter();
  const [startingSubject, setStartingSubject] = useState<string | null>(null);
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return <ErrorState message="Couldn't load your dashboard." onRetry={() => void refetch()} />;
  }

  const {
    continueLearning,
    dailyGoals,
    achievements,
    upcoming,
    firstName,
    streakDays,
    totalXp,
    level,
    xpToNextLevel,
  } = data;
  const hour = new Date().getHours();
  function getGreeting() {
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
  const greeting = getGreeting();

  async function startLearningSession(subject: string) {
    setStartingSubject(subject);
    setSessionError(null);
    setShowSubjectPicker(false);

    try {
      const res = await fetch('/api/session/start-learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, minutesAvailable: 30 }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          // Active session exists — redirect to courses
          router.push('/courses');
          return;
        }
        throw new Error(data.error || data.message || 'Failed to start session');
      }

      // Session started — navigate to courses (content will be available there)
      router.push('/courses');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setStartingSubject(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold md:text-3xl">
              {greeting}, {firstName}! 👋
            </h1>
            <p className="mt-2 text-blue-100">Ready to learn something amazing today?</p>
          </div>
          <div className="relative">
            <button
              onClick={() => {
                setShowSubjectPicker(!showSubjectPicker);
              }}
              disabled={startingSubject !== null}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/20 px-6 py-3 font-medium text-white backdrop-blur-sm transition hover:bg-white/30 disabled:opacity-60"
            >
              {startingSubject ? 'Starting...' : 'Start Learning ▶️'}
            </button>
            {showSubjectPicker && (
              <div className="absolute right-0 top-full z-10 mt-2 w-48 overflow-hidden rounded-xl bg-white shadow-xl">
                {SUBJECTS.map((s) => (
                  <button
                    key={s.code}
                    onClick={() => {
                      void startLearningSession(s.code);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-blue-50"
                  >
                    <span className="text-lg">{s.emoji}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Daily Goals Progress */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          {dailyGoals.map((goal) => (
            <div key={goal.id} className="rounded-xl bg-white/10 p-3 backdrop-blur-sm">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <span>{goal.emoji}</span>
                <span className="truncate">{goal.title}</span>
              </div>
              <div className="h-2 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all"
                  style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-blue-100">
                {goal.current}/{goal.target}
              </div>
            </div>
          ))}
        </div>
      </section>

      {sessionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {sessionError}
          <button
            onClick={() => {
              setSessionError(null);
            }}
            className="ml-2 font-medium underline hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Continue Learning */}
        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Continue Learning</h2>
              <Link href="/courses" className="text-sm text-blue-600 hover:underline">
                View all →
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {continueLearning.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/courses/${lesson.courseId}/lessons/${lesson.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-purple-100 text-2xl">
                      {lesson.thumbnail}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                      {lesson.estimatedTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                    {lesson.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">{lesson.courseName}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-slate-500">Progress</span>
                      <span className="font-medium text-blue-600">{lesson.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                        style={{ width: `${lesson.progress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* AI Tutor Quick Access */}
          <section className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50 p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl text-white shadow-lg">
                🤖
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-900">Need Help?</h3>
                <p className="text-sm text-purple-700">
                  Ask your AI tutor anything about your lessons
                </p>
              </div>
              <Link
                href="/tutor"
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700"
              >
                Chat Now
              </Link>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Due */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">📅 Upcoming</h2>
            <div className="space-y-3">
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="text-xl">{item.emoji}</span>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-500">
                      Due {new Date(item.dueDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Achievements */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-bold text-slate-900">🏆 Achievements</h2>
              <Link href="/achievements" className="text-xs text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {achievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`flex flex-col items-center gap-1 rounded-xl p-2 ${
                    achievement.earned ? 'bg-yellow-50' : 'bg-slate-100 opacity-50'
                  }`}
                  title={achievement.title}
                >
                  <span className="text-2xl">{achievement.emoji}</span>
                  <span className="text-[10px] text-slate-600">
                    {achievement.earned ? '✓' : '?'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* XP & Level */}
          <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-lg font-bold text-white">
                {level ?? 1}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900">Level {level ?? 1}</div>
                <div className="text-xs text-blue-600">{totalXp?.toLocaleString() ?? 0} XP</div>
              </div>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-blue-600">
                <span>Next level</span>
                <span>{xpToNextLevel ?? 100} XP to go</span>
              </div>
              <div className="h-2 rounded-full bg-blue-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
                  style={{
                    width: xpToNextLevel
                      ? `${Math.max(5, 100 - (xpToNextLevel / (xpToNextLevel + 50)) * 100)}%`
                      : '5%',
                  }}
                />
              </div>
            </div>
          </section>

          {/* Learning Streak */}
          <section className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-2xl text-white">
                🔥
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-700">
                  {streakDays ?? 0} Day{(streakDays ?? 0) !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-orange-600">Learning Streak!</div>
              </div>
            </div>
            <div className="mt-4 flex justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const streakCount = streakDays ?? 0;
                function getDayClass() {
                  if (i < streakCount % 7) return 'bg-orange-500 text-white';
                  if (i === streakCount % 7)
                    return 'border-2 border-dashed border-orange-300 text-orange-400';
                  return 'bg-slate-100 text-slate-400';
                }
                return (
                  <div key={day + i} className="flex flex-col items-center gap-1">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs ${getDayClass()}`}
                    >
                      {i < streakCount % 7 ? '✓' : day}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
