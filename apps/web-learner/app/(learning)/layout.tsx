import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAuthSession } from '../../lib/auth';

export default async function LearningLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-blue-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-xl text-white">
              🎓
            </div>
            <span className="text-xl font-bold text-blue-900">AIVO</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              🏠 Home
            </Link>
            <Link
              href="/courses"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              📚 My Courses
            </Link>
            <Link
              href="/goals"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              🎯 Goals
            </Link>
            <Link
              href="/focus"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              ⏱️ Focus
            </Link>
            <Link
              href="/executive-function"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              🧠 EF Tools
            </Link>
            <Link
              href="/sel"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              😊 SEL
            </Link>
            <Link
              href="/reading-tools"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              📖 Reading
            </Link>
            <Link
              href="/math-support"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              🧮 Math
            </Link>
            <Link
              href="/writing-tools"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              ✍️ Writing
            </Link>
            <Link
              href="/visual-learning"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              🎨 Visual
            </Link>
            <Link
              href="/study-skills"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              📚 Study Skills
            </Link>
            <Link
              href="/assessments"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              📝 Assessments
            </Link>
            <Link
              href="/games"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
            >
              🎮 Games
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="hidden items-center gap-1 rounded-full bg-orange-100 px-3 py-1.5 text-sm font-medium text-orange-700 md:flex">
              🔥 5 day streak
            </div>

            {/* XP Counter */}
            <div className="hidden items-center gap-1 rounded-full bg-purple-100 px-3 py-1.5 text-sm font-medium text-purple-700 md:flex">
              ⭐ 1,250 XP
            </div>

            {/* Profile */}
            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 text-lg text-white"
            >
              {session.name?.[0]?.toUpperCase() ?? '👤'}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex justify-around border-t border-blue-100 py-2 md:hidden">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">🏠</span>
            Home
          </Link>
          <Link href="/courses" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">📚</span>
            Courses
          </Link>
          <Link href="/reading-tools" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">📖</span>
            Reading
          </Link>
          <Link href="/math-support" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">🧮</span>
            Math
          </Link>
          <Link href="/writing-tools" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">✍️</span>
            Writing
          </Link>
          <Link href="/visual-learning" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">🎨</span>
            Visual
          </Link>
          <Link href="/study-skills" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">📚</span>
            Study
          </Link>
          <Link href="/goals" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">🎯</span>
            Goals
          </Link>
          <Link href="/games" className="flex flex-col items-center gap-1 text-xs text-slate-600">
            <span className="text-xl">🎮</span>
            Games
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
