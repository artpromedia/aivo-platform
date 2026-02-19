'use client';

import { motion } from 'framer-motion';
import {
  UserCog,
  Brain,
  Sparkles,
  TrendingUp,
  CheckCircle,
  ArrowRight,
  Mountain,
  BookOpen,
  Sprout,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

/* ─── Step Data ─── */
const steps = [
  {
    number: '01',
    title: 'Create Your Profile',
    description:
      'Sign up in minutes. Tell us about your learner\'s needs, preferences, and any IEP goals. We support ADHD, Autism, Dyslexia, and more.',
    icon: UserCog,
    color: 'bg-theme-primary-600',
    tags: ['2-minute setup', 'IEP import option', 'Learning style quiz'],
  },
  {
    number: '02',
    title: 'Meet Your Virtual Brain',
    description:
      'Your learner gets a personalized AI tutor that adapts to their unique way of thinking. It learns what works best for them.',
    icon: Brain,
    color: 'bg-theme-primary-600',
    tags: ['Personalized AI agent', 'Adapts in real-time', 'Emotional awareness'],
  },
  {
    number: '03',
    title: 'Start Learning',
    description:
      'Engage with interactive lessons, games, and activities designed for neurodiverse minds. Content adjusts automatically.',
    icon: Sparkles,
    color: 'bg-accent-500',
    tags: ['Gamified learning', 'Sensory-friendly', 'Break reminders'],
  },
  {
    number: '04',
    title: 'Track Progress',
    description:
      'Parents and teachers get beautiful dashboards showing growth, achievements, and insights. Celebrate every win together.',
    icon: TrendingUp,
    color: 'bg-mint-600',
    tags: ['Real-time updates', 'IEP progress reports', 'Achievement celebrations'],
  },
];

/* ─── Illustrations ─── */

function ProfileIllustration() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 space-y-4">
      {/* Name field placeholder */}
      <div className="space-y-2">
        <div className="h-2.5 w-20 bg-gray-200 rounded-full" />
        <div className="h-10 bg-gray-100 rounded-lg w-full" />
      </div>
      {/* Upload IEP button */}
      <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-theme-primary-100 border-2 border-dashed border-theme-primary-300">
        <Upload className="w-4 h-4 text-theme-primary-500" />
        <span className="text-sm font-medium text-theme-primary-600">Upload IEP (Optional)</span>
      </div>
      {/* Tag chips */}
      <div className="flex gap-3 justify-center">
        {['ADHD', 'Dyslexia', 'Autism'].map((tag) => (
          <span
            key={tag}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function VirtualBrainIllustration() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6 flex flex-col items-center text-center space-y-4">
      {/* Brain avatar */}
      <motion.div
        className="w-16 h-16 bg-gradient-to-br from-theme-primary-500 to-theme-primary-600 rounded-full flex items-center justify-center shadow-lg"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <Brain className="w-8 h-8 text-white" />
      </motion.div>
      <div>
        <div className="font-display font-bold text-gray-900">Meet Alex&apos;s Brain</div>
        <div className="text-sm text-gray-500">Personalized AI Tutor</div>
      </div>
      {/* Chat bubble */}
      <motion.div
        className="w-full px-5 py-3 bg-theme-primary-500 rounded-2xl text-white text-sm leading-relaxed"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      >
        &ldquo;Hi Alex! Ready to learn together? Let&apos;s start with something fun!&rdquo;
      </motion.div>
    </div>
  );
}

function CoursesIllustration() {
  const courses = [
    { name: 'Math Quest', detail: 'Level 5 - Fractions', icon: Mountain, color: 'bg-amber-100 text-amber-600' },
    { name: 'Reading Adventure', detail: 'Chapter 3', icon: BookOpen, color: 'bg-rose-100 text-rose-600' },
    { name: 'Science Lab', detail: 'Plants & Growth', icon: Sprout, color: 'bg-green-100 text-green-600' },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft divide-y divide-gray-100">
      {courses.map((course, i) => {
        const Icon = course.icon;
        return (
          <motion.div
            key={course.name}
            className="flex items-center gap-4 px-6 py-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.15 }}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', course.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{course.name}</div>
              <div className="text-xs text-gray-500">{course.detail}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function WeeklyProgressIllustration() {
  const days = [
    { label: 'Mon', h: 40 },
    { label: 'Tue', h: 35 },
    { label: 'Wed', h: 55 },
    { label: 'Thu', h: 50 },
    { label: 'Fri', h: 70 },
    { label: 'Sat', h: 72 },
    { label: 'Sun', h: 80 },
  ];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-soft p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="font-display font-bold text-gray-900">Weekly Progress</span>
        <span className="text-sm font-semibold text-mint-600">+23%</span>
      </div>
      {/* Bar Chart */}
      <div className="flex items-end gap-3 h-32">
        {days.map((day, i) => (
          <div key={day.label} className="flex-1 flex flex-col items-center gap-2">
            <motion.div
              className="w-full bg-mint-400 rounded-md"
              initial={{ height: 0 }}
              animate={{ height: `${day.h}%` }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
            />
            <span className="text-[11px] text-gray-400">{day.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const illustrations = [
  ProfileIllustration,
  VirtualBrainIllustration,
  CoursesIllustration,
  WeeklyProgressIllustration,
];

/* ─── Main Component ─── */

export function HowItWorks() {
  const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com';

  return (
    <Section id="how-it-works" background="gray" padding="lg">
      <SectionHeader
        badge="How It Works"
        title={
          <>
            Getting Started is <span className="text-gradient-primary">Simple</span>
          </>
        }
        description="From signup to success in four easy steps. No complex setup, no technical knowledge required."
      />

      {/* Steps with vertical timeline */}
      <div className="relative max-w-5xl mx-auto">
        {/* Vertical timeline line (desktop) */}
        <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gray-200 -translate-x-1/2" />

        <div className="space-y-20 lg:space-y-24">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const Illustration = illustrations[index];
            const isReversed = index % 2 === 1;

            return (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="relative"
              >
                {/* Timeline dot (desktop) */}
                <div className="hidden lg:flex absolute left-1/2 top-8 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-[3px] border-theme-primary-300 z-10" />

                <div
                  className={cn(
                    'grid lg:grid-cols-2 gap-10 lg:gap-16 items-center',
                    isReversed && 'direction-rtl'
                  )}
                >
                  {/* Text side */}
                  <div className={cn('space-y-4', isReversed ? 'lg:order-2 lg:text-right' : '')}>
                    {/* Icon + Number */}
                    <div className={cn('flex items-center gap-3', isReversed && 'lg:justify-end')}>
                      <div
                        className={cn(
                          'w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md',
                          step.color
                        )}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-display text-5xl font-bold text-gray-200 select-none">
                        {step.number}
                      </span>
                    </div>

                    <h3 className="font-display text-2xl lg:text-3xl font-bold text-gray-900">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 text-lg leading-relaxed max-w-md">
                      {step.description}
                    </p>

                    {/* Tags */}
                    <div className={cn('flex flex-wrap gap-2', isReversed && 'lg:justify-end')}>
                      {step.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-mint-500 shrink-0" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Illustration side */}
                  <div className={cn(isReversed ? 'lg:order-1' : '')}>
                    <Illustration />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-20 text-center"
      >
        <Link
          href={`${parentAppUrl}/register`}
          className="inline-flex items-center gap-2 px-10 py-4 text-lg font-semibold text-white bg-gradient-to-r from-coral-400 via-rose-500 to-theme-primary-600 rounded-full shadow-lg hover:shadow-xl transition-shadow"
        >
          Start Your Journey Today
          <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="mt-4 text-sm text-gray-500">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </motion.div>
    </Section>
  );
}
