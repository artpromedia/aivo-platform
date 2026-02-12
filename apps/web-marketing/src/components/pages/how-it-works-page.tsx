'use client';

import { motion } from 'framer-motion';
import {
  Brain,
  BarChart3,
  BookOpen,
  Users,
  Sparkles,
  Shield,
  ArrowRight,
  CheckCircle,
  Zap,
  Target,
  LineChart,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Navigation, Footer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface Step {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  details: string[];
  color: string;
}

const steps: Step[] = [
  {
    number: 1,
    title: 'Create a Learner Profile',
    description:
      'Set up a profile with learning goals, IEP information, and preferences. AIVO instantly builds a personalised learning map.',
    icon: Users,
    details: [
      'Input learning differences (ADHD, Autism, Dyslexia, etc.)',
      'Upload or enter IEP goals',
      'Set preferred learning modalities',
      'Choose subjects and grade level',
    ],
    color: 'from-theme-primary-500 to-purple-600',
  },
  {
    number: 2,
    title: 'AI Adapts in Real-Time',
    description:
      'Our AI tutor analyses interactions in real-time, adjusting difficulty, pacing, and presentation style to match each learner.',
    icon: Brain,
    details: [
      'Continuous assessment of understanding',
      'Dynamic difficulty adjustment',
      'Multi-sensory content delivery',
      'Engagement-based pacing',
    ],
    color: 'from-coral-500 to-salmon-500',
  },
  {
    number: 3,
    title: 'Learn with Engaging Activities',
    description:
      'Interactive lessons, games, and exercises keep learners motivated while building real skills aligned to curriculum standards.',
    icon: Sparkles,
    details: [
      'Gamified learning experiences',
      'Standards-aligned content library',
      'Multi-sensory activities',
      'Reward system and achievements',
    ],
    color: 'from-mint-500 to-emerald-500',
  },
  {
    number: 4,
    title: 'Track Progress & Celebrate Wins',
    description:
      'Detailed analytics show growth over time. Parents and teachers see actionable insights, and learners celebrate every milestone.',
    icon: BarChart3,
    details: [
      'IEP goal progress dashboards',
      'Exportable progress reports',
      'Parent & teacher notifications',
      'Achievement celebrations',
    ],
    color: 'from-sunshine-500 to-amber-500',
  },
];

const perspectives = [
  {
    role: 'For Learners',
    icon: GraduationCap,
    description: 'A fun, judgement-free space that adapts to how you learn best.',
    highlights: [
      'Activities that match your pace',
      'Rewards for every milestone',
      'No wrong answers — just learning',
    ],
  },
  {
    role: 'For Parents',
    icon: Users,
    description: `See real progress, celebrate wins, and stay connected to your child's learning.`,
    highlights: ['Real-time progress dashboard', 'Weekly summary reports', 'IEP goal tracking'],
  },
  {
    role: 'For Teachers',
    icon: BookOpen,
    description: 'Save hours on planning and get data-driven insight into every student.',
    highlights: ['Automated IEP reporting', 'Class-wide analytics', 'Standards-aligned content'],
  },
  {
    role: 'For Schools & Districts',
    icon: Target,
    description: 'Scale inclusive education with confidence, compliance, and measurable ROI.',
    highlights: ['FERPA & COPPA compliant', 'District-wide dashboards', 'Bulk deployment tools'],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HowItWorksPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-theme-primary-50 to-white relative overflow-hidden">
          {/* Decorative blobs */}
          <div className="absolute top-20 -left-32 w-64 h-64 bg-theme-primary-200/30 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-32 w-80 h-80 bg-coral-200/20 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="primary" className="mb-4">
                How It Works
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Learning, <span className="text-gradient-primary">Reimagined</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                AIVO combines AI, neuroscience, and great design to create a learning experience
                that adapts to every mind. Here&apos;s how it works.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Step-by-Step ────────────────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto">
              {steps.map((step, i) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="relative flex flex-col md:flex-row gap-8 mb-16 last:mb-0"
                >
                  {/* Number + line */}
                  <div className="flex flex-col items-center md:w-20 shrink-0">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg`}
                    >
                      <step.icon className="w-7 h-7 text-white" />
                    </div>
                    {i < steps.length - 1 && (
                      <div className="hidden md:block w-0.5 flex-1 bg-gradient-to-b from-gray-200 to-transparent mt-3" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-soft p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant="outline" className="text-xs">
                        Step {step.number}
                      </Badge>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-gray-900 mb-3">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 mb-5">{step.description}</p>
                    <div className="space-y-2">
                      {step.details.map((detail) => (
                        <div key={detail} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-mint-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 text-sm">{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Perspectives ────────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge variant="primary" className="mb-4">
                For Everyone
              </Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Built for Every Stakeholder
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                AIVO works for learners, parents, teachers, and administrators — each with their own
                tailored experience.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {perspectives.map((p, i) => (
                <motion.div
                  key={p.role}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <p.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-gray-900">{p.role}</h3>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{p.description}</p>
                  <div className="space-y-2">
                    {p.highlights.map((h) => (
                      <div key={h} className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-sunshine-500" />
                        <span className="text-sm text-gray-700">{h}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Trust ───────────────────────────────────────────── */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-8">
              {[
                { icon: Shield, label: 'FERPA Compliant' },
                { icon: Shield, label: 'COPPA Compliant' },
                { icon: LineChart, label: 'Evidence-Based' },
                { icon: Shield, label: 'SOC 2 Type II' },
              ].map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-5 py-3 bg-gray-50 rounded-xl"
                >
                  <Icon className="w-5 h-5 text-theme-primary-500" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ─────────────────────────────────────────────── */}
        <section className="py-20 bg-gradient-to-br from-theme-primary-600 to-purple-700">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-theme-primary-100 text-lg max-w-xl mx-auto mb-8">
                Join hundreds of families and educators already using AIVO to unlock every
                learner&apos;s potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-theme-primary-600 font-semibold rounded-2xl hover:shadow-lg transition-shadow"
                >
                  View Pricing <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  Request a Demo
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
