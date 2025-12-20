'use client';

import { motion } from 'framer-motion';
import { UserPlus, Brain, Sparkles, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const steps = [
  {
    number: '01',
    title: 'Create Your Profile',
    description:
      "Sign up in minutes. Tell us about your learner's needs, preferences, and any IEP goals. We support ADHD, Autism, Dyslexia, and more.",
    icon: UserPlus,
    color: 'from-blue-500 to-cyan-500',
    highlights: ['2-minute setup', 'IEP import option', 'Learning style quiz'],
  },
  {
    number: '02',
    title: 'Meet Your Virtual Brain',
    description:
      'Your learner gets a personalized AI tutor that adapts to their unique way of thinking. It learns what works best for them.',
    icon: Brain,
    color: 'from-theme-primary-500 to-purple-600',
    highlights: ['Personalized AI agent', 'Adapts in real-time', 'Emotional awareness'],
  },
  {
    number: '03',
    title: 'Start Learning',
    description:
      'Engage with interactive lessons, games, and activities designed for neurodiverse minds. Content adjusts automatically.',
    icon: Sparkles,
    color: 'from-coral-500 to-pink-500',
    highlights: ['Gamified learning', 'Sensory-friendly', 'Break reminders'],
  },
  {
    number: '04',
    title: 'Track Progress',
    description:
      'Parents and teachers get beautiful dashboards showing growth, achievements, and insights. Celebrate every win together.',
    icon: TrendingUp,
    color: 'from-mint-500 to-green-600',
    highlights: ['Real-time updates', 'IEP progress reports', 'Achievement celebrations'],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

export function HowItWorks() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="relative max-w-5xl mx-auto"
      >
        {/* Connection Line (Desktop) */}
        <div className="hidden lg:block absolute left-[60px] top-[100px] bottom-[100px] w-0.5 bg-gradient-to-b from-blue-500 via-theme-primary-500 via-coral-500 to-mint-500 opacity-20" />

        {/* Steps */}
        <div className="space-y-8 lg:space-y-12">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isEven = index % 2 === 0;

            return (
              <motion.div
                key={step.number}
                variants={itemVariants}
                className={cn(
                  'relative lg:grid lg:grid-cols-2 lg:gap-12 items-center',
                  !isEven && 'lg:flex-row-reverse'
                )}
              >
                {/* Content Side */}
                <div className={cn('relative z-10', !isEven && 'lg:order-2 lg:text-right')}>
                  {/* Step Number & Icon */}
                  <div
                    className={cn('flex items-center gap-4 mb-4', !isEven && 'lg:flex-row-reverse')}
                  >
                    <div
                      className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg',
                        step.color
                      )}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div
                      className={cn(
                        'text-6xl font-bold text-gray-100 font-display',
                        'lg:hidden xl:block'
                      )}
                    >
                      {step.number}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 mb-4 leading-relaxed">{step.description}</p>

                  {/* Highlights */}
                  <div className={cn('flex flex-wrap gap-2', !isEven && 'lg:justify-end')}>
                    {step.highlights.map((highlight) => (
                      <span
                        key={highlight}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-sm text-gray-600 border border-gray-200"
                      >
                        <CheckCircle className="w-3.5 h-3.5 text-mint-500" />
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Visual Side */}
                <div className={cn('hidden lg:block relative', !isEven && 'lg:order-1')}>
                  <div
                    className={cn(
                      'relative bg-white rounded-3xl shadow-soft-lg p-6 border border-gray-100',
                      'transform transition-transform duration-300 hover:-translate-y-1'
                    )}
                  >
                    {/* Mock UI based on step */}
                    {index === 0 && (
                      <div className="space-y-4">
                        <div className="h-4 bg-gray-100 rounded-full w-3/4" />
                        <div className="h-12 bg-theme-primary-50 rounded-xl border-2 border-dashed border-theme-primary-200 flex items-center justify-center text-theme-primary-500 text-sm">
                          Upload IEP (Optional)
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {['ADHD', 'Dyslexia', 'Autism'].map((tag) => (
                            <div
                              key={tag}
                              className="py-2 bg-gray-50 rounded-lg text-center text-sm text-gray-600 border border-gray-200"
                            >
                              {tag}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {index === 1 && (
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-theme-primary-400 to-theme-primary-600 rounded-full flex items-center justify-center mb-4">
                          <Brain className="w-10 h-10 text-white" />
                        </div>
                        <div className="text-lg font-semibold text-gray-900 mb-1">
                          Meet Alex&apos;s Brain
                        </div>
                        <div className="text-sm text-gray-500">Personalized AI Tutor</div>
                        <div className="mt-4 p-3 bg-theme-primary-50 rounded-xl text-sm text-theme-primary-700">
                          &quot;Hi Alex! Ready to learn together? Let&apos;s start with something
                          fun!&quot;
                        </div>
                      </div>
                    )}
                    {index === 2 && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-sunshine-50 rounded-xl">
                          <div className="text-2xl">🎮</div>
                          <div>
                            <div className="font-medium text-gray-900">Math Quest</div>
                            <div className="text-xs text-gray-500">Level 5 - Fractions</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-mint-50 rounded-xl">
                          <div className="text-2xl">📚</div>
                          <div>
                            <div className="font-medium text-gray-900">Reading Adventure</div>
                            <div className="text-xs text-gray-500">Chapter 3</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-coral-50 rounded-xl">
                          <div className="text-2xl">🧪</div>
                          <div>
                            <div className="font-medium text-gray-900">Science Lab</div>
                            <div className="text-xs text-gray-500">Plants & Growth</div>
                          </div>
                        </div>
                      </div>
                    )}
                    {index === 3 && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-600">Weekly Progress</span>
                          <span className="text-sm font-bold text-mint-600">+23%</span>
                        </div>
                        <div className="h-24 flex items-end gap-1">
                          {[40, 55, 45, 70, 65, 80, 85].map((height, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-gradient-to-t from-mint-500 to-mint-400 rounded-t"
                              style={{ height: `${height}%` }}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Mon</span>
                          <span>Tue</span>
                          <span>Wed</span>
                          <span>Thu</span>
                          <span>Fri</span>
                          <span>Sat</span>
                          <span>Sun</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Arrow Connector (Mobile) */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-6 lg:hidden">
                    <ArrowRight className="w-6 h-6 text-gray-300 rotate-90" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-16 text-center"
      >
        <Button variant="coral" size="lg" asChild>
          <Link href={`${appUrl}/register`}>
            Start Your Journey Today
            <ArrowRight className="w-5 h-5" />
          </Link>
        </Button>
        <p className="mt-4 text-sm text-gray-500">
          No credit card required • 14-day free trial • Cancel anytime
        </p>
      </motion.div>
    </Section>
  );
}
