'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Target, Trophy, BarChart3, Sparkles, Flame, GraduationCap, BookOpen, Palette, Plus } from 'lucide-react';

import { ErrorState, PageSkeleton } from '@/components/ui/loading-states';
import { useProfile, useUpdateAvatar } from '@/lib/hooks/use-learner-api';

const AVATAR_OPTIONS = ['🦸', '🧙', '🦊', '🐼', '🦄', '🚀', '🌟', '🎨', '🎮', '🏆'];

export default function ProfilePage() {
  const { data, isLoading, error, refetch } = useProfile();
  const updateAvatarMutation = useUpdateAvatar();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  if (isLoading) return <PageSkeleton />;
  if (error || !data) {
    return <ErrorState message="Couldn't load your profile." onRetry={() => void refetch()} />;
  }

  const { learner, stats, journey } = data;
  const selectedAvatar = learner.avatar || '🦸';

  function handleAvatarSelect(avatar: string) {
    updateAvatarMutation.mutate(avatar);
    setShowAvatarPicker(false);
  }

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <section className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-sm">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          {/* Avatar */}
          <div className="relative">
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="flex h-28 w-28 items-center justify-center rounded-full bg-white/20 text-6xl transition hover:bg-white/30"
            >
              {selectedAvatar}
            </button>
            <button
              onClick={() => setShowAvatarPicker(!showAvatarPicker)}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-lg"
            >
              <Palette className="h-4 w-4" />
            </button>

            {/* Avatar Picker */}
            {showAvatarPicker && (
              <div className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-xl bg-white p-4 shadow-xl">
                <p className="mb-2 text-center text-sm font-medium text-gray-600">
                  Choose your avatar
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => {
                        handleAvatarSelect(avatar);
                      }}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition hover:bg-indigo-100 ${
                        selectedAvatar === avatar ? 'bg-indigo-200' : 'bg-gray-100'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold">
              {learner.firstName} {learner.lastName}
            </h1>
            <p className="mt-1 text-indigo-200">
              {learner.grade} • {learner.school}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Level {learner.level}
              </span>
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5" /> {learner.streakDays} day streak
              </span>
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm inline-flex items-center gap-1">
                <Palette className="h-3.5 w-3.5" /> {learner.learningStyle} Learner
              </span>
            </div>
          </div>

          {/* XP Display */}
          <div className="text-center">
            <div className="text-4xl font-bold">{learner.xp.toLocaleString()}</div>
            <div className="text-indigo-200">Total XP</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">My Stats</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-indigo-50 p-4 text-center">
                <div className="text-3xl font-bold text-indigo-600">
                  {stats.lessonsCompleted}
                </div>
                <div className="mt-1 text-sm text-gray-500">Lessons Done</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <div className="text-3xl font-bold text-emerald-600">
                  {stats.quizzesPassed}
                </div>
                <div className="mt-1 text-sm text-gray-500">Quizzes Passed</div>
              </div>
              <div className="rounded-xl bg-purple-50 p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {stats.hoursLearned}h
                </div>
                <div className="mt-1 text-sm text-gray-500">Hours Learned</div>
              </div>
              <div className="rounded-xl bg-orange-50 p-4 text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {stats.achievementsEarned}
                </div>
                <div className="mt-1 text-sm text-gray-500">Achievements</div>
              </div>
            </div>
          </section>

          {/* Interests */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">My Interests</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {learner.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700"
                >
                  {interest}
                </span>
              ))}
              <button className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-gray-200 px-4 py-2 text-sm text-gray-400 hover:border-indigo-300 hover:text-indigo-600">
                <Plus className="h-3.5 w-3.5" /> Add more
              </button>
            </div>
          </section>

          {/* Learning Journey */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">Learning Journey</h2>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />
              <div className="space-y-4">
                {(journey.length > 0 ? journey : [
                  { date: 'Getting started', event: 'Welcome to AIVO!', emoji: '🎉' },
                ]).map((item) => (
                  <div key={item.event} className="relative ml-8 rounded-xl bg-gray-50 p-4">
                    <div className="absolute -left-6 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500" />
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <div className="font-medium text-gray-900">{item.event}</div>
                        <div className="text-sm text-gray-500">{item.date}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold text-gray-900">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/goals"
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-indigo-50"
              >
                <Target className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-700">Set New Goals</span>
              </Link>
              <Link
                href="/achievements"
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-indigo-50"
              >
                <Trophy className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-700">View Achievements</span>
              </Link>
              <Link
                href="/progress"
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-indigo-50"
              >
                <BarChart3 className="h-5 w-5 text-indigo-600" />
                <span className="font-medium text-gray-700">See Progress</span>
              </Link>
            </div>
          </section>

          {/* Learning Style */}
          <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Palette className="h-5 w-5 text-indigo-600" />
              <h3 className="font-semibold text-indigo-900">My Learning Style</h3>
            </div>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="font-bold text-indigo-800">Visual Learner</div>
                <div className="text-sm text-indigo-600">
                  You learn best with pictures & diagrams
                </div>
              </div>
            </div>
            <Link
              href="/visual-learning"
              className="block rounded-xl bg-indigo-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Explore Visual Tools
            </Link>
          </section>

          {/* Member Since */}
          <section className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm">
            <GraduationCap className="mx-auto h-8 w-8 text-indigo-600" />
            <div className="mt-2 text-sm text-gray-500">Learning with AIVO since</div>
            <div className="font-bold text-gray-900">
              {new Date(learner.joinDate).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
