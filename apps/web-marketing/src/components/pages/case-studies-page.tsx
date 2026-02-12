'use client';

import { motion } from 'framer-motion';
import { Users, Award, ArrowRight, School, MapPin, BarChart3 } from 'lucide-react';
import Link from 'next/link';

import { Navigation, Footer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface CaseStudy {
  slug: string;
  title: string;
  organization: string;
  location: string;
  type: 'school' | 'district' | 'family';
  excerpt: string;
  metrics: { label: string; value: string }[];
  tags: string[];
}

const studies: CaseStudy[] = [
  {
    slug: 'lincoln-elementary',
    title: 'How Lincoln Elementary Improved IEP Goal Achievement by 40%',
    organization: 'Lincoln Elementary School',
    location: 'Austin, TX',
    type: 'school',
    excerpt:
      'Lincoln Elementary integrated AIVO into their special education programme and saw measurable gains in IEP goal tracking, teacher satisfaction, and parent engagement within one semester.',
    metrics: [
      { label: 'IEP Goal Progress', value: '+40%' },
      { label: 'Teacher Time Saved', value: '6 hrs/wk' },
      { label: 'Parent Engagement', value: '+65%' },
    ],
    tags: ['Special Education', 'IEP', 'K-5'],
  },
  {
    slug: 'riverside-district',
    title: 'Riverside District Scales Inclusive Learning to 12 Schools',
    organization: 'Riverside Unified School District',
    location: 'Sacramento, CA',
    type: 'district',
    excerpt:
      'A district-wide rollout across 12 schools brought AI-powered adaptive learning to over 3,000 students, with measurable improvements in reading and math proficiency.',
    metrics: [
      { label: 'Students Served', value: '3,200+' },
      { label: 'Reading Growth', value: '+28%' },
      { label: 'Math Proficiency', value: '+22%' },
    ],
    tags: ['District', 'At Scale', 'K-8'],
  },
  {
    slug: 'martinez-family',
    title: `A Family's Journey: From Frustration to Confidence`,
    organization: 'The Martinez Family',
    location: 'Denver, CO',
    type: 'family',
    excerpt: `When traditional tutoring wasn't working for their son with ADHD and dyslexia, the Martinez family turned to AIVO. Within three months, his reading level improved by two grade levels.`,
    metrics: [
      { label: 'Reading Level', value: '+2 grades' },
      { label: 'Screen Time Quality', value: '95%' },
      { label: 'Confidence Score', value: '4.8/5' },
    ],
    tags: ['ADHD', 'Dyslexia', 'Family'],
  },
  {
    slug: 'oakwood-academy',
    title: 'Oakwood Academy Reduces Behaviour Incidents by 35%',
    organization: 'Oakwood Academy',
    location: 'Chicago, IL',
    type: 'school',
    excerpt: `By combining AIVO's multi-sensory approach with SEL-integrated content, Oakwood Academy saw a dramatic decrease in classroom behaviour incidents and improved student focus.`,
    metrics: [
      { label: 'Behaviour Incidents', value: '-35%' },
      { label: 'Student Focus', value: '+50%' },
      { label: 'Satisfaction', value: '4.9/5' },
    ],
    tags: ['SEL', 'Behaviour', 'Middle School'],
  },
  {
    slug: 'homeschool-cooperative',
    title: 'Homeschool Co-Op Builds Personalised Curricula with AI',
    organization: 'Bright Minds Co-Op',
    location: 'Portland, OR',
    type: 'family',
    excerpt: `A homeschool cooperative of 45 families leveraged AIVO's custom learning paths to create individualised curricula for neurodivergent learners without increasing workload.`,
    metrics: [
      { label: 'Families', value: '45' },
      { label: 'Curriculum Prep Time', value: '-60%' },
      { label: 'Learner Engagement', value: '+72%' },
    ],
    tags: ['Homeschool', 'Neurodiversity', 'Custom Paths'],
  },
];

const stats = [
  { value: '150+', label: 'Students in Pilot' },
  { value: '4.9/5', label: 'Satisfaction Rating' },
  { value: '87%', label: 'Engagement Improvement' },
  { value: '40%', label: 'Avg IEP Goal Progress' },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function CaseStudiesPage() {
  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-theme-primary-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="primary" className="mb-4">
                Case Studies
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                Real Results, <span className="text-gradient-primary">Real Impact</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                See how schools, districts, and families are using AIVO to unlock every
                learner&apos;s potential.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────────── */}
        <section className="pb-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-soft"
                >
                  <div className="text-3xl md:text-4xl font-bold text-theme-primary-600 mb-1">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Case Study Cards ────────────────────────────────── */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {studies.map((study, i) => (
                <motion.article
                  key={study.slug}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-soft hover:shadow-soft-lg transition-shadow overflow-hidden group"
                >
                  {/* Header */}
                  <div className="p-6 pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      {study.type === 'school' && (
                        <School className="w-4 h-4 text-theme-primary-500" />
                      )}
                      {study.type === 'district' && (
                        <BarChart3 className="w-4 h-4 text-theme-primary-500" />
                      )}
                      {study.type === 'family' && (
                        <Users className="w-4 h-4 text-theme-primary-500" />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {study.organization}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-3">
                      <MapPin className="w-3 h-3" />
                      {study.location}
                    </div>
                    <h3 className="font-display text-lg font-semibold text-gray-900 mb-2 group-hover:text-theme-primary-600 transition-colors">
                      {study.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3">{study.excerpt}</p>
                  </div>

                  {/* Metrics */}
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-3 gap-4">
                      {study.metrics.map((m) => (
                        <div key={m.label} className="text-center">
                          <div className="text-lg font-bold text-theme-primary-600">{m.value}</div>
                          <div className="text-[11px] text-gray-500 leading-tight">{m.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tags + CTA */}
                  <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {study.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <Link
                      href={`/case-studies/${study.slug}`}
                      className="text-theme-primary-600 text-sm font-medium hover:text-theme-primary-700 inline-flex items-center gap-1"
                    >
                      Read <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </motion.article>
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
              <Award className="w-12 h-12 text-white/80 mx-auto mb-4" />
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Write Your Success Story?
              </h2>
              <p className="text-theme-primary-100 text-lg max-w-xl mx-auto mb-8">
                Join the growing community of schools, districts, and families achieving real
                results with AIVO.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/demo"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-theme-primary-600 font-semibold rounded-2xl hover:shadow-lg transition-shadow"
                >
                  Request a Demo
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  View Pricing
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
