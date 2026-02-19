'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  BarChart3,
  Shield,
  Zap,
  Users,
  CheckCircle,
} from 'lucide-react';
import * as React from 'react';

import { featureIllustrations } from '@/components/sections/feature-illustrations';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const features = [
  {
    title: 'AI-Powered Tutoring',
    description:
      'Each learner gets a personalized AI Virtual Brain that adapts in real-time to their unique learning style, pace, and preferences.',
    icon: Brain,
    color: 'bg-theme-primary-100 text-theme-primary-600',
    points: ['Real-time adaptation', 'Emotional awareness', 'Multi-sensory support'],
    image: '/images/features/ai-tutoring.svg',
  },
  {
    title: 'IEP Goal Management',
    description:
      'Automatically syncs with IEP goals, tracks progress, and generates comprehensive reports for care teams and educators.',
    icon: Target,
    color: 'bg-accent-100 text-accent-600',
    points: ['Automatic goal tracking', 'Progress reports', 'Team collaboration'],
    image: '/images/features/iep-management.svg',
  },
  {
    title: 'Progress Tracking',
    description:
      'Beautiful dashboards for parents and teachers to monitor growth, celebrate achievements, and identify areas for improvement.',
    icon: BarChart3,
    color: 'bg-mint-100 text-mint-600',
    points: ['Real-time analytics', 'Subject breakdowns', 'Trend analysis'],
    image: '/images/features/progress-tracking.svg',
  },
  {
    title: 'Parent Dashboard',
    description:
      'Stay connected with your child\'s learning journey. View progress, communicate with teachers, and manage IEP goals all in one place.',
    icon: Users,
    color: 'bg-sky-100 text-sky-600',
    points: ['Activity feed', 'Teacher messaging', 'Goal monitoring'],
    image: '/images/features/parent-dashboard.svg',
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export function Features() {
  return (
    <Section id="features" background="gradient" padding="lg">
      <SectionHeader
        badge="Platform Features"
        title={
          <>
            Everything Your Learner Needs to <span className="text-gradient-primary">Succeed</span>
          </>
        }
        description="AIVO combines cutting-edge AI with proven educational strategies to create the most personalized learning experience for neurodiverse students."
      />

      <div className="space-y-24">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isReversed = index % 2 === 1;
          const Illustration = featureIllustrations[feature.title];

          return (
            <motion.div
              key={feature.title}
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-100px' }}
              className={cn(
                'grid lg:grid-cols-2 gap-12 lg:gap-16 items-center',
                isReversed && 'lg:flex-row-reverse'
              )}
            >
              {/* Content Side */}
              <div className={cn(isReversed && 'lg:order-2')}>
                <div className={cn('inline-flex p-3 rounded-2xl mb-6', feature.color)}>
                  <Icon className="w-7 h-7" />
                </div>

                <h3 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {feature.description}
                </p>

                <ul className="space-y-3">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-mint-500 shrink-0" />
                      <span className="text-gray-700 font-medium">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual Side */}
              <div className={cn(isReversed && 'lg:order-1')}>
                {Illustration ? <Illustration /> : (
                  <div className="relative bg-white rounded-3xl p-8 border border-gray-100 shadow-soft aspect-[4/3] flex items-center justify-center">
                    <div className={cn('w-24 h-24 rounded-3xl flex items-center justify-center', feature.color)}>
                      <Icon className="w-12 h-12" />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Validation Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-16 text-center"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-mint-50 border border-mint-200 rounded-full">
          <Shield className="w-5 h-5 text-mint-600" />
          <span className="text-mint-700 font-medium">
            FERPA &amp; COPPA compliant — All features tested with 150+ students in our pilot program
          </span>
        </div>
      </motion.div>
    </Section>
  );
}
