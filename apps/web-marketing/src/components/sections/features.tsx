'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  Target,
  Users,
  Shield,
  Zap,
  Heart,
  BookOpen,
  Award,
  CheckCircle,
} from 'lucide-react';
import * as React from 'react';

import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const features = [
  {
    title: 'AI-Powered Virtual Brain',
    description:
      'Each learner gets a personalized AI agent that understands their unique learning style and adapts in real-time.',
    icon: Brain,
    gradient: 'from-purple-500 to-pink-500',
    shadowColor: 'shadow-purple',
  },
  {
    title: 'IEP Goal Alignment',
    description:
      'Automatically syncs with IEP goals, tracks progress, and generates comprehensive reports for care teams.',
    icon: Target,
    gradient: 'from-blue-500 to-cyan-500',
    shadowColor: 'shadow-sky',
  },
  {
    title: 'Neurodiversity Support',
    description:
      'Purpose-built accommodations for ADHD, Dyslexia, Autism, and all learning differences.',
    icon: Users,
    gradient: 'from-coral-500 to-salmon-500',
    shadowColor: 'shadow-coral',
  },
  {
    title: 'FERPA & COPPA Compliant',
    description:
      "Bank-level encryption, no ads, no data selling. Your child's privacy is our top priority.",
    icon: Shield,
    gradient: 'from-green-500 to-teal-500',
    shadowColor: 'shadow-mint',
  },
  {
    title: 'Real-Time Adaptation',
    description:
      'Content difficulty and presentation adjust instantly based on performance and engagement.',
    icon: Zap,
    gradient: 'from-yellow-500 to-orange-500',
    shadowColor: 'shadow-sunshine',
  },
  {
    title: 'Emotional Intelligence',
    description:
      'Recognizes frustration, anxiety, and fatigue. Provides encouragement and calming interventions.',
    icon: Heart,
    gradient: 'from-pink-500 to-rose-500',
    shadowColor: 'shadow-coral',
  },
  {
    title: 'Full K-12 Curriculum',
    description:
      'Comprehensive coverage of Math, Reading, Science, and more aligned to state standards.',
    icon: BookOpen,
    gradient: 'from-indigo-500 to-purple-500',
    shadowColor: 'shadow-purple',
  },
  {
    title: 'Progress Tracking',
    description:
      'Beautiful dashboards for parents and teachers to monitor growth and celebrate achievements.',
    icon: Award,
    gradient: 'from-blue-500 to-indigo-500',
    shadowColor: 'shadow-sky',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
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

      <motion.div
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-100px' }}
        className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div key={feature.title} variants={itemVariants} className="group relative">
              <div className="relative bg-white rounded-3xl p-6 h-full border border-gray-100 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-soft-lg overflow-hidden">
                {/* Gradient Accent */}
                <div
                  className={cn(
                    'absolute top-0 left-0 right-0 h-1 bg-gradient-to-r',
                    feature.gradient
                  )}
                />

                {/* Icon */}
                <div
                  className={cn(
                    'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br',
                    feature.gradient,
                    'group-hover:scale-110 transition-transform duration-300'
                  )}
                >
                  <Icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>

                {/* Hover Gradient Background */}
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300 -z-10',
                    feature.gradient
                  )}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Validation Badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="mt-12 text-center"
      >
        <div className="inline-flex items-center gap-2 px-6 py-3 bg-mint-50 border border-mint-200 rounded-full">
          <CheckCircle className="w-5 h-5 text-mint-600" />
          <span className="text-mint-700 font-medium">
            All features tested and validated with 150+ students in our pilot program
          </span>
        </div>
      </motion.div>
    </Section>
  );
}
