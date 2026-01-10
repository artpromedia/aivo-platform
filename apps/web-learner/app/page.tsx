import Link from 'next/link';
import Image from 'next/image';

export default function LearnerPortal() {
  return (
    <main className="min-h-screen bg-[var(--aivo-purple-50)]">
      {/* Floating shapes background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[var(--aivo-purple-200)] rounded-full opacity-40 blur-2xl" />
        <div className="absolute top-40 right-20 w-48 h-48 bg-[var(--aivo-teal-200)] rounded-full opacity-30 blur-2xl" />
        <div className="absolute bottom-32 left-1/4 w-40 h-40 bg-[var(--aivo-purple-300)] rounded-full opacity-30 blur-2xl" />
        <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-[var(--aivo-teal-300)] rounded-full opacity-40 blur-2xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <Image
            src="/images/aivo-logo-horizontal-purple.svg"
            alt="AIVO"
            width={120}
            height={40}
          />
          <Link
            href="/join"
            className="px-5 py-2.5 bg-white/80 backdrop-blur border border-[var(--aivo-purple-200)] rounded-full text-[var(--aivo-brand-primary)] font-semibold hover:bg-white hover:shadow-md transition-all"
          >
            I Have a Code
          </Link>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-6 py-12 min-h-[calc(100vh-180px)]">
        <div className="text-center max-w-2xl mx-auto">
          {/* Mascot */}
          <div className="mb-8 relative">
            <div className="w-32 h-32 mx-auto bg-gradient-to-br from-[var(--aivo-purple-400)] to-[var(--aivo-brand-primary)] rounded-[2rem] shadow-2xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <span className="text-6xl">🚀</span>
            </div>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--aivo-color-progress)] text-[var(--aivo-brand-navy)] text-sm font-bold rounded-full shadow-lg">
              Let&apos;s Go!
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-[var(--aivo-brand-navy)] mb-4 leading-tight">
            Ready for Your
            <span className="block text-[var(--aivo-brand-primary)]">Learning Adventure?</span>
          </h1>

          <p className="text-lg text-[var(--aivo-neutral-600)] mb-10 max-w-md mx-auto">
            Join your class with a code from your teacher or parent to start exploring!
          </p>

          {/* Main CTA */}
          <Link
            href="/join"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[var(--aivo-brand-primary)] to-[var(--aivo-purple-500)] text-white text-xl font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
          >
            <span className="text-2xl">🎫</span>
            Enter Class Code
          </Link>

          {/* Secondary options */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <span className="text-[var(--aivo-neutral-500)]">Don&apos;t have a code?</span>
            <div className="flex gap-3">
              <a
                href="http://localhost:3004/register"
                className="px-4 py-2 bg-white border border-[var(--aivo-purple-200)] rounded-xl text-[var(--aivo-neutral-700)] font-medium hover:border-[var(--aivo-brand-primary)] hover:text-[var(--aivo-brand-primary)] transition-colors flex items-center gap-2"
              >
                <span>👨‍👩‍👧</span> Parent Sign Up
              </a>
              <a
                href="http://localhost:3002/register"
                className="px-4 py-2 bg-white border border-[var(--aivo-purple-200)] rounded-xl text-[var(--aivo-neutral-700)] font-medium hover:border-[var(--aivo-brand-primary)] hover:text-[var(--aivo-brand-primary)] transition-colors flex items-center gap-2"
              >
                <span>👩‍🏫</span> Teacher Sign Up
              </a>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full">
          <div className="bg-white/70 backdrop-blur rounded-2xl p-6 border border-[var(--aivo-purple-100)] hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-[var(--aivo-purple-100)] rounded-xl flex items-center justify-center mb-4">
              <span className="text-3xl">🎮</span>
            </div>
            <h3 className="font-bold text-[var(--aivo-brand-navy)] mb-2">Fun Games</h3>
            <p className="text-sm text-[var(--aivo-neutral-600)]">Learn through exciting games and challenges</p>
          </div>

          <div className="bg-white/70 backdrop-blur rounded-2xl p-6 border border-[var(--aivo-teal-100)] hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-[var(--aivo-teal-100)] rounded-xl flex items-center justify-center mb-4">
              <span className="text-3xl">🤖</span>
            </div>
            <h3 className="font-bold text-[var(--aivo-brand-navy)] mb-2">AI Buddy</h3>
            <p className="text-sm text-[var(--aivo-neutral-600)]">Your friendly tutor helps whenever you&apos;re stuck</p>
          </div>

          <div className="bg-white/70 backdrop-blur rounded-2xl p-6 border border-[var(--aivo-purple-100)] hover:shadow-lg transition-shadow">
            <div className="w-14 h-14 bg-[var(--aivo-color-progress)]/20 rounded-xl flex items-center justify-center mb-4">
              <span className="text-3xl">🏆</span>
            </div>
            <h3 className="font-bold text-[var(--aivo-brand-navy)] mb-2">Earn Badges</h3>
            <p className="text-sm text-[var(--aivo-neutral-600)]">Collect rewards as you level up your skills</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-sm text-[var(--aivo-neutral-500)]">
        <p>© 2026 AIVO Learning · Unlocking Every Learner&apos;s Potential</p>
      </footer>
    </main>
  );
}
