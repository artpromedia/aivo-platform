'use client';

import {
  Flame,
  Sparkles,
  GraduationCap,
  Target,
  BookOpen,
  Clock,
  ChevronRight,
  Brain,
  Calendar,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useDashboard } from '@/lib/hooks/use-learner-api';

const SUBJECTS = [
  { code: 'MATH', label: 'Math', icon: '🔢' },
  { code: 'ELA', label: 'ELA', icon: '📖' },
  { code: 'SCIENCE', label: 'Science', icon: '🔬' },
  { code: 'SEL', label: 'Social-Emotional', icon: '💚' },
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
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

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

      const json = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          router.push('/courses');
          return;
        }
        throw new Error(json.error || json.message || 'Failed to start session');
      }

      router.push('/courses');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setStartingSubject(null);
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {firstName}!
          </h1>
          <p className="text-gray-500 mt-1">Ready to continue your learning journey?</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSubjectPicker(!showSubjectPicker)}
            disabled={startingSubject !== null}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-60"
          >
            {startingSubject ? 'Starting...' : 'Start Learning'}
            <ArrowRight className="w-4 h-4" />
          </button>
          {showSubjectPicker && (
            <div className="absolute right-0 top-full z-10 mt-2 w-52 overflow-hidden rounded-xl bg-white border border-gray-200 shadow-lg">
              {SUBJECTS.map((s) => (
                <button
                  key={s.code}
                  onClick={() => void startLearningSession(s.code)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-indigo-50"
                >
                  <span className="text-lg">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {sessionError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {sessionError}
          <button onClick={() => setSessionError(null)} className="ml-2 font-medium underline hover:text-red-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-sm text-gray-500">Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {streakDays ?? 0} <span className="text-sm font-normal text-gray-400">days</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <span className="text-sm text-gray-500">Total XP</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalXp?.toLocaleString() ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-sm text-gray-500">Level</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{level ?? 1}</p>
          <div className="mt-2 h-1.5 rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{
                width: xpToNextLevel
                  ? `${Math.max(5, 100 - (xpToNextLevel / (xpToNextLevel + 50)) * 100)}%`
                  : '5%',
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <Target className="w-5 h-5 text-purple-500" />
            </div>
            <span className="text-sm text-gray-500">Daily Goals</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {dailyGoals.filter((g) => g.current >= g.target).length}/{dailyGoals.length}
          </p>
        </div>
      </div>

      {/* Daily Goals Progress */}
      {dailyGoals.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Today&apos;s Goals</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {dailyGoals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));
              return (
                <div key={goal.id} className="flex items-center gap-3">
                  <div className="relative w-11 h-11 shrink-0">
                    <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none" stroke="#6366f1" strokeWidth="3"
                        strokeDasharray={`${pct * 0.942} 100`} strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                      {pct}%
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{goal.title}</p>
                    <p className="text-xs text-gray-400">{goal.current}/{goal.target}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue Learning */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Continue Learning</h2>
          <Link href="/courses" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
          {continueLearning.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/courses/${lesson.courseId}/lessons/${lesson.id}`}
              className="group min-w-[280px] sm:min-w-[300px] bg-white rounded-2xl border border-gray-100 p-4 shadow-sm transition hover:shadow-md hover:border-indigo-200 snap-start shrink-0"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-xl">
                  {lesson.thumbnail}
                </div>
                <span className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  {lesson.estimatedTime}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                {lesson.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{lesson.courseName}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Progress</span>
                  <span className="font-semibold text-indigo-600">{lesson.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all"
                    style={{ width: `${lesson.progress}%` }}
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Tutor */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 text-white">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg">AI Tutor</h3>
                <p className="text-indigo-100 text-sm mt-0.5">Get instant help with any topic</p>
              </div>
              <Link
                href="/tutor"
                className="bg-white text-indigo-700 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-50 transition shrink-0"
              >
                Chat Now
              </Link>
            </div>
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h2 className="font-bold text-gray-900">Upcoming</h2>
            </div>
            <div className="space-y-3">
              {upcoming.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition">
                  <span className="text-xl shrink-0">{item.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-400">
                      Due {new Date(item.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Streak calendar */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="font-bold text-gray-900">Streak</h2>
            </div>
            <div className="flex justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => {
                const streakCount = streakDays ?? 0;
                const isCompleted = i < streakCount % 7;
                const isCurrent = i === streakCount % 7;
                return (
                  <div key={day + i} className="flex flex-col items-center gap-1.5">
                    <span className="text-xs text-gray-400">{day}</span>
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition ${
                        isCompleted
                          ? 'bg-orange-500 text-white'
                          : isCurrent
                            ? 'border-2 border-dashed border-orange-300 text-orange-400'
                            : 'bg-gray-100 text-gray-300'
                      }`}
                    >
                      {isCompleted ? '✓' : i + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-gray-900">Achievements</h2>
              </div>
              <Link href="/achievements" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                View all
              </Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {achievements.map((a) => (
                <div
                  key={a.id}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl transition ${
                    a.earned ? 'bg-amber-50' : 'bg-gray-50 opacity-40'
                  }`}
                  title={a.title}
                >
                  <span className="text-2xl">{a.emoji}</span>
                  <span className="text-[10px] text-gray-500">{a.earned ? '✓' : '?'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
