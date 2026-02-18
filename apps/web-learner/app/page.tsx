import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Gamepad2, Brain, Trophy, BookOpen, Users, Star } from 'lucide-react';

const FEATURES = [
  {
    icon: Gamepad2,
    title: 'Interactive Games',
    description: 'Learn through engaging games and hands-on challenges designed for your grade level.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: Brain,
    title: 'AI Tutor',
    description: 'Get personalized help from your AI learning buddy whenever you need it.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Trophy,
    title: 'Earn Rewards',
    description: 'Collect badges and level up as you master new skills and complete courses.',
    color: 'bg-orange-50 text-orange-600',
  },
];

const STATS = [
  { value: '50K+', label: 'Active Learners', icon: Users },
  { value: '1,200+', label: 'Lessons & Games', icon: BookOpen },
  { value: '4.9', label: 'Student Rating', icon: Star },
];

export default function LearnerPortal() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="px-6 py-5">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">AIVO</span>
          </div>
          <Link
            href="/join"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Enter Code
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            Trusted by 50,000+ students worldwide
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight">
            Learn, Play &{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Master
            </span>
          </h1>

          <p className="mt-5 text-lg md:text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
            Your personalized learning adventure awaits. Join your class with a code
            from your teacher or parent to get started.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/join"
              className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl transition-all"
            >
              Enter Class Code
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 text-gray-600 font-medium hover:text-gray-900 transition-colors"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-center gap-8 md:gap-16">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <stat.icon className="w-4 h-4 text-indigo-500" />
                  <span className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</span>
                </div>
                <p className="text-xs md:text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Secondary links */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-gray-500 mb-4">Don&apos;t have a class code?</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`${process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com'}/register`}
              className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm"
            >
              <Users className="w-4 h-4" />
              Parent Sign Up
            </a>
            <a
              href={`${process.env.NEXT_PUBLIC_TEACHER_APP_URL || 'https://teacher.aivolearning.com'}/register`}
              className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:border-indigo-300 hover:text-indigo-600 transition-colors flex items-center gap-2 text-sm"
            >
              <BookOpen className="w-4 h-4" />
              Teacher Sign Up
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-sm text-gray-400 border-t border-gray-100">
        <p>&copy; 2026 AIVO Learning &middot; Unlocking Every Learner&apos;s Potential</p>
      </footer>
    </main>
  );
}
