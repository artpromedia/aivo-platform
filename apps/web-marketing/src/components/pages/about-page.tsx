'use client';

import { motion } from 'framer-motion';
import {
  Heart,
  Target,
  Users,
  Shield,
  Brain,
  ArrowRight,
  Star,
  TrendingUp,
  Award,
  Lightbulb,
  GraduationCap,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

// Core values data
const values = [
  {
    icon: Heart,
    name: 'Empathy First',
    description:
      'Every feature is designed with neurodiverse learners at the center. We listen, understand, and adapt.',
    color: 'from-coral-500 to-pink-500',
  },
  {
    icon: Target,
    name: 'Evidence-Based',
    description:
      'Grounded in special education best practices, learning science, and continuous improvement through data.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Users,
    name: 'Community Driven',
    description:
      'Built with continuous feedback from families, educators, therapists, and the learners themselves.',
    color: 'from-theme-primary-500 to-purple-600',
  },
  {
    icon: Shield,
    name: 'Privacy & Safety',
    description:
      'Committed to protecting learner data with bank-level security. FERPA and COPPA compliant.',
    color: 'from-mint-500 to-teal-500',
  },
];

// Advisory board data
const advisors = [
  {
    name: 'Dr. Ike Osuji',
    role: 'Chairman & Medical Advisor',
    expertise: 'Family Medicine & Child Development',
    bio: 'Practicing family physician with 20+ years of experience supporting neurodiverse children and their families.',
    avatar: 'IO',
    gradient: 'from-theme-primary-400 to-theme-primary-600',
  },
  {
    name: 'Dr. Patrick Ukata',
    role: 'Academic Advisor',
    expertise: 'Educational Psychology',
    bio: 'Professor at Johns Hopkins University specializing in learning differences and educational technology.',
    avatar: 'PU',
    gradient: 'from-blue-400 to-blue-600',
  },
  {
    name: 'Nnamdi Uzokwe',
    role: 'Strategic Advisor',
    expertise: 'Business Development & Operations',
    bio: 'Retired Navy Veteran and Medical Device Sales Director with expertise in scaling education technology.',
    avatar: 'NU',
    gradient: 'from-mint-400 to-mint-600',
  },
  {
    name: 'Edward Hamilton',
    role: 'Special Education Advisor',
    expertise: 'Special Education Advocacy',
    bio: '9/11 NYPD First Responder and passionate advocate for special education rights and accessibility.',
    avatar: 'EH',
    gradient: 'from-coral-400 to-coral-600',
  },
];

// Pilot results data
const pilotResults = [
  { value: '150+', label: 'Students Served', icon: Users },
  { value: '4.9/5', label: 'Parent Satisfaction', icon: Star },
  { value: '87%', label: 'Improved Engagement', icon: TrendingUp },
  { value: '3 mo', label: 'Time to Results', icon: Award },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export function AboutPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3004';

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-coral-50/30 -z-10" />
          <motion.div
            className="absolute top-20 right-10 w-72 h-72 bg-theme-primary-200/30 rounded-full blur-3xl -z-10"
            animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="max-w-4xl mx-auto text-center"
            >
              <motion.div variants={fadeInUp}>
                <Badge variant="primary" className="mb-6">
                  <Lightbulb className="w-3 h-3 mr-1" />
                  Our Story
                </Badge>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
              >
                Our Mission:{' '}
                <span className="bg-gradient-to-r from-theme-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Every Mind Matters
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                className="text-xl text-gray-600 leading-relaxed max-w-3xl mx-auto"
              >
                AIVO was founded by parents and educators who believe that neurodiversity is a
                strength, not a limitation. We&apos;re building the future of personalized
                education—one learner at a time.
              </motion.p>
            </motion.div>
          </div>
        </section>

        {/* Founder Story Section */}
        <Section background="white" padding="lg">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="coral" className="mb-4">
                <Heart className="w-3 h-3 mr-1" />
                Why We Started
              </Badge>

              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Born from Personal Experience
              </h2>

              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>
                  AIVO began with a simple observation: traditional education systems often fail
                  neurodiverse learners. Not because these students can&apos;t learn, but because
                  the system wasn&apos;t designed for how they think.
                </p>
                <p>
                  As parents of neurodiverse children and special education professionals, our
                  founding team experienced these challenges firsthand. We watched brilliant
                  children struggle with one-size-fits-all curricula, lose confidence, and fall
                  behind their peers.
                </p>
                <p>
                  We knew there had to be a better way. Combining expertise in AI, education, and
                  child development, we set out to create something revolutionary: a learning
                  platform that adapts to each child&apos;s unique mind, not the other way around.
                </p>
                <p className="font-semibold text-gray-900">
                  Today, AIVO serves over 150 families, and we&apos;re just getting started.
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              {/* Illustration Placeholder */}
              <div className="relative bg-gradient-to-br from-theme-primary-100 to-coral-100 rounded-3xl p-8 aspect-square flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-theme-primary-500 to-coral-500 rounded-full flex items-center justify-center mb-6">
                    <Brain className="w-16 h-16 text-white" />
                  </div>
                  <p className="text-lg font-semibold text-gray-700">
                    &quot;Every child deserves to learn in a way that makes sense to them.&quot;
                  </p>
                  <p className="text-sm text-gray-500 mt-2">— AIVO Founding Team</p>
                </div>

                {/* Floating elements */}
                <motion.div
                  className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-lg p-4"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <GraduationCap className="w-8 h-8 text-theme-primary-500" />
                </motion.div>
                <motion.div
                  className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-lg p-4"
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity }}
                >
                  <Heart className="w-8 h-8 text-coral-500" />
                </motion.div>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* Core Values Section */}
        <Section background="gray" padding="lg">
          <SectionHeader
            badge="Our Values"
            title="What We Stand For"
            description="These principles guide every decision we make, from product design to customer support."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {values.map((value) => {
              const Icon = value.icon;
              return (
                <motion.div
                  key={value.name}
                  variants={fadeInUp}
                  className="bg-white rounded-3xl p-6 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br',
                      value.color
                    )}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    {value.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* Advisory Board Section */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge="Leadership"
            title="Advisory Board"
            description="Guided by experts in medicine, education, business, and special education advocacy."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {advisors.map((advisor) => (
              <motion.div
                key={advisor.name}
                variants={fadeInUp}
                className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300"
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4 bg-gradient-to-br',
                    advisor.gradient
                  )}
                >
                  {advisor.avatar}
                </div>

                {/* Info */}
                <h3 className="font-display text-lg font-semibold text-gray-900">{advisor.name}</h3>
                <p className="text-theme-primary-600 text-sm font-medium mb-1">{advisor.role}</p>
                <p className="text-gray-500 text-xs mb-3">{advisor.expertise}</p>
                <p className="text-gray-600 text-sm leading-relaxed">{advisor.bio}</p>
              </motion.div>
            ))}
          </motion.div>
        </Section>

        {/* Pilot Results Section */}
        <Section background="gradient" padding="lg">
          <SectionHeader
            badge="Pilot Program"
            title="Proven Results"
            description="Our 3-month pilot program demonstrated measurable improvements in learning outcomes."
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-8 shadow-soft-lg max-w-4xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
              {pilotResults.map(({ value, label, icon: Icon }) => (
                <div key={label} className="text-center">
                  <Icon className="w-8 h-8 text-theme-primary-500 mx-auto mb-3" />
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-500">{label}</div>
                </div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="border-t border-gray-100 pt-8">
              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-400 to-coral-400 rounded-full flex items-center justify-center text-white font-bold">
                    JM
                  </div>
                </div>
                <div>
                  <p className="text-gray-700 italic mb-2">
                    &quot;The transformation we&apos;ve seen in our students is remarkable. AIVO
                    understands that every learner is unique, and the results speak for
                    themselves.&quot;
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold text-gray-900">Pilot Educator</span>
                    <span className="text-gray-500">
                      {' '}
                      — Special Education Director, Pilot School
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </Section>

        {/* CTA Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-600 to-purple-700" />
          <motion.div
            className="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                Join Our Mission
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Help us build a world where every learner has access to education designed for them.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  className="bg-white text-theme-primary-600 hover:bg-white/90"
                  asChild
                >
                  <Link href={`${appUrl}/register`}>
                    Join Early Access
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
}
