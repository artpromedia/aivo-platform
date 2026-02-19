'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  Users,
  ShieldCheck,
  Zap,
  Heart,
  BookOpen,
  BarChart3,
  CheckCircle2,
} from 'lucide-react';

import { Section } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const features = [
  {
    title: 'AI-Powered Virtual Brain',
    description:
      "Each learner gets a personalized AI agent that understands their unique learning style and adapts in real-time.",
    icon: Brain,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    borderColor: 'from-blue-500 to-blue-400',
  },
  {
    title: 'IEP Goal Alignment',
    description:
      'Automatically syncs with IEP goals, tracks progress, and generates comprehensive reports for care teams.',
    icon: Target,
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    borderColor: 'from-teal-500 to-blue-400',
  },
  {
    title: 'Neurodiversity Support',
    description:
      'Purpose-built accommodations for ADHD, Dyslexia, Autism, and all learning differences.',
    icon: Users,
    iconBg: 'bg-coral-100',
    iconColor: 'text-coral-500',
    borderColor: 'from-coral-400 to-rose-400',
  },
  {
    title: 'FERPA & COPPA Compliant',
    description:
      "Bank-level encryption, no ads, no data selling. Your child's privacy is our top priority.",
    icon: ShieldCheck,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    borderColor: 'from-emerald-500 to-teal-400',
  },
  {
    title: 'Real-Time Adaptation',
    description:
      'Content difficulty and presentation adjust instantly based on performance and engagement.',
    icon: Zap,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-500',
    borderColor: 'from-orange-400 to-amber-400',
  },
  {
    title: 'Emotional Intelligence',
    description:
      'Recognizes frustration, anxiety, and fatigue. Provides encouragement and calming interventions.',
    icon: Heart,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-500',
    borderColor: 'from-pink-400 to-rose-400',
  },
  {
    title: 'Full K-12 Curriculum',
    description:
      'Comprehensive coverage of Math, Reading, Science, and more aligned to state standards.',
    icon: BookOpen,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    borderColor: 'from-purple-500 to-violet-400',
  },
  {
    title: 'Progress Tracking',
    description:
      'Beautiful dashboards for parents and teachers to monitor growth and celebrate achievements.',
    icon: BarChart3,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    borderColor: 'from-indigo-500 to-blue-400',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: 'easeOut' },
  }),
};

export function CoursesSection() {
  return (
    <Section id="features" background="white" padding="lg">
      {/* Header */}
      <div className="text-center mb-14 max-w-2xl mx-auto">
        <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-sm font-medium text-emerald-700 mb-6">
          Platform Features
        </span>
        <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
          Everything Your Learner Needs to{' '}
          <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
            Succeed
          </span>
        </h2>
        <p className="text-gray-600 text-lg leading-relaxed">
          AIVO combines cutting-edge AI with proven educational strategies to create the most
          personalized learning experience for neurodiverse students.
        </p>
      </div>

      {/* Feature Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              custom={index}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
            >
              {/* Gradient Top Border */}
              <div
                className={cn(
                  'h-1 w-full bg-gradient-to-r',
                  feature.borderColor
                )}
              />

              <div className="p-6">
                {/* Icon */}
                <div
                  className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
                    feature.iconBg
                  )}
                >
                  <Icon className={cn('w-6 h-6', feature.iconColor)} />
                </div>

                {/* Title */}
                <h3 className="font-display text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Badge */}
      <div className="mt-12 text-center">
        <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            All features tested and validated with 150+ students in our pilot program
          </span>
        </span>
      </div>
    </Section>
  );
}
