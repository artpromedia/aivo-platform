import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getAuthSession } from '../../lib/auth';

export default async function LearningLayout({ children }: { readonly children: ReactNode }) {
  const session = await getAuthSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--color-background))]">
      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface))]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] text-xl text-white">
              🎓
            </div>
            <span className="text-xl font-bold text-[rgb(var(--color-text))]">AIVO</span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="/dashboard"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              🏠 Home
            </Link>
            <Link
              href="/courses"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              📚 My Courses
            </Link>
            <Link
              href="/goals"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              🎯 Goals
            </Link>
            <Link
              href="/focus"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              ⏱️ Focus
            </Link>
            <Link
              href="/executive-function"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              🧠 EF Tools
            </Link>
            <Link
              href="/sel"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              😊 SEL
            </Link>
            <Link
              href="/reading-tools"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              📖 Reading
            </Link>
            <Link
              href="/math-support"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              🧮 Math
            </Link>
            <Link
              href="/writing-tools"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              ✍️ Writing
            </Link>
            <Link
              href="/visual-learning"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              🎨 Visual
            </Link>
            <Link
              href="/study-skills"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              📚 Study Skills
            </Link>
            <Link
              href="/assessments"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              📝 Assessments
            </Link>
            <Link
              href="/games"
              className="rounded-lg px-3 py-2 text-sm font-medium text-[rgb(var(--color-text-muted))] transition hover:bg-[rgb(var(--color-primary))]/10 hover:text-[rgb(var(--color-primary))]"
            >
              🎮 Games
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Streak Counter */}
            <div className="hidden items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1.5 text-sm font-medium text-orange-400 md:flex">
              🔥 5 day streak
            </div>

            {/* XP Counter */}
            <div className="hidden items-center gap-1 rounded-full bg-[rgb(var(--color-primary))]/15 px-3 py-1.5 text-sm font-medium text-[rgb(var(--color-primary))] md:flex">
              ⭐ 1,250 XP
            </div>

            {/* Profile */}
            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[rgb(var(--color-primary))] to-[rgb(var(--color-accent))] text-lg text-white"
            >
              {session.name?.[0]?.toUpperCase() ?? '👤'}
            </Link>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="flex justify-around border-t border-[rgb(var(--color-border))] py-2 md:hidden">
          <Link href="/dashboard" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">🏠</span>
            {' '}
            Home
          </Link>
          <Link href="/courses" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">📚</span>
            {' '}
            Courses
          </Link>
          <Link href="/reading-tools" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">📖</span>
            {' '}
            Reading
          </Link>
          <Link href="/math-support" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">🧮</span>
            {' '}
            Math
          </Link>
          <Link href="/writing-tools" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">✍️</span>
            {' '}
            Writing
          </Link>
          <Link href="/visual-learning" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">🎨</span>
            {' '}
            Visual
          </Link>
          <Link href="/study-skills" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">📚</span>
            {' '}
            Study
          </Link>
          <Link href="/goals" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">🎯</span>
            {' '}
            Goals
          </Link>
          <Link href="/games" className="flex flex-col items-center gap-1 text-xs text-[rgb(var(--color-text-muted))]">
            <span className="text-xl">🎮</span>
            {' '}
            Games
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
