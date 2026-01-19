'use client';

import Link from 'next/link';
import { useState } from 'react';

// Mock learner data
const MOCK_LEARNER = {
  firstName: 'Alex',
  lastName: 'Johnson',
  grade: '5th Grade',
  school: 'Lincoln Elementary',
  avatar: '🦸',
  xp: 1250,
  level: 12,
  streakDays: 5,
  joinDate: '2024-09-01',
  learningStyle: 'Visual',
  interests: ['Math', 'Science', 'Reading'],
};

const MOCK_STATS = {
  lessonsCompleted: 47,
  quizzesPassed: 23,
  hoursLearned: 32,
  achievementsEarned: 15,
};

const AVATAR_OPTIONS = ['🦸', '🧙', '🦊', '🐼', '🦄', '🚀', '🌟', '🎨', '🎮', '🏆'];

export default function ProfilePage() {
  const [selectedAvatar, setSelectedAvatar] = useState(MOCK_LEARNER.avatar);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <section className="rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white shadow-lg">
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
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm shadow-lg"
            >
              ✏️
            </button>

            {/* Avatar Picker */}
            {showAvatarPicker && (
              <div className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 rounded-xl bg-white p-4 shadow-xl">
                <p className="mb-2 text-center text-sm font-medium text-slate-600">
                  Choose your avatar
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => {
                        setSelectedAvatar(avatar);
                        setShowAvatarPicker(false);
                      }}
                      className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition hover:bg-purple-100 ${
                        selectedAvatar === avatar ? 'bg-purple-200' : 'bg-slate-100'
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
              {MOCK_LEARNER.firstName} {MOCK_LEARNER.lastName}
            </h1>
            <p className="mt-1 text-purple-200">
              {MOCK_LEARNER.grade} • {MOCK_LEARNER.school}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3 md:justify-start">
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm">
                ⭐ Level {MOCK_LEARNER.level}
              </span>
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm">
                🔥 {MOCK_LEARNER.streakDays} day streak
              </span>
              <span className="rounded-full bg-white/20 px-4 py-1.5 text-sm">
                🎨 {MOCK_LEARNER.learningStyle} Learner
              </span>
            </div>
          </div>

          {/* XP Display */}
          <div className="text-center">
            <div className="text-4xl font-bold">{MOCK_LEARNER.xp.toLocaleString()}</div>
            <div className="text-purple-200">Total XP</div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Stats */}
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">📊 My Stats</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-blue-50 p-4 text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {MOCK_STATS.lessonsCompleted}
                </div>
                <div className="mt-1 text-sm text-slate-600">Lessons Done</div>
              </div>
              <div className="rounded-xl bg-green-50 p-4 text-center">
                <div className="text-3xl font-bold text-green-600">
                  {MOCK_STATS.quizzesPassed}
                </div>
                <div className="mt-1 text-sm text-slate-600">Quizzes Passed</div>
              </div>
              <div className="rounded-xl bg-purple-50 p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {MOCK_STATS.hoursLearned}h
                </div>
                <div className="mt-1 text-sm text-slate-600">Hours Learned</div>
              </div>
              <div className="rounded-xl bg-yellow-50 p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {MOCK_STATS.achievementsEarned}
                </div>
                <div className="mt-1 text-sm text-slate-600">Achievements</div>
              </div>
            </div>
          </section>

          {/* Interests */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">💡 My Interests</h2>
            <div className="flex flex-wrap gap-2">
              {MOCK_LEARNER.interests.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 text-sm font-medium text-blue-700"
                >
                  {interest}
                </span>
              ))}
              <button className="rounded-full border-2 border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600">
                + Add more
              </button>
            </div>
          </section>

          {/* Learning Journey */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-bold text-slate-900">🗺️ Learning Journey</h2>
            <div className="relative">
              <div className="absolute left-4 top-0 h-full w-0.5 bg-slate-200" />
              <div className="space-y-4">
                {[
                  { date: 'Today', event: 'Completed "Multiplying Fractions"', emoji: '🧮' },
                  { date: 'Yesterday', event: 'Earned "Math Whiz" badge', emoji: '🏆' },
                  { date: '3 days ago', event: 'Finished Science Chapter 4', emoji: '🔬' },
                  { date: '1 week ago', event: 'Started 5th Grade Math', emoji: '📚' },
                ].map((item, i) => (
                  <div key={i} className="relative ml-8 rounded-xl bg-slate-50 p-4">
                    <div className="absolute -left-6 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500" />
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{item.emoji}</span>
                      <div>
                        <div className="font-medium text-slate-900">{item.event}</div>
                        <div className="text-sm text-slate-500">{item.date}</div>
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
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-bold text-slate-900">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/goals"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-blue-50"
              >
                <span className="text-xl">🎯</span>
                <span className="font-medium text-slate-700">Set New Goals</span>
              </Link>
              <Link
                href="/achievements"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-blue-50"
              >
                <span className="text-xl">🏆</span>
                <span className="font-medium text-slate-700">View Achievements</span>
              </Link>
              <Link
                href="/progress"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-blue-50"
              >
                <span className="text-xl">📈</span>
                <span className="font-medium text-slate-700">See Progress</span>
              </Link>
            </div>
          </section>

          {/* Learning Style */}
          <section className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-4 shadow-sm">
            <h3 className="mb-3 font-bold text-purple-900">🎨 My Learning Style</h3>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500 text-2xl text-white">
                👁️
              </div>
              <div>
                <div className="font-bold text-purple-800">Visual Learner</div>
                <div className="text-sm text-purple-600">
                  You learn best with pictures & diagrams
                </div>
              </div>
            </div>
            <Link
              href="/visual-learning"
              className="block rounded-lg bg-purple-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-purple-700"
            >
              Explore Visual Tools
            </Link>
          </section>

          {/* Member Since */}
          <section className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
            <div className="text-3xl">🎓</div>
            <div className="mt-2 text-sm text-slate-500">Learning with AIVO since</div>
            <div className="font-bold text-slate-900">
              {new Date(MOCK_LEARNER.joinDate).toLocaleDateString('en-US', {
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
