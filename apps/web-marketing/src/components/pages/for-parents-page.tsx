'use client';

import { motion } from 'framer-motion';
import {
  Heart,
  Clock,
  LineChart,
  Shield,
  Brain,
  Target,
  ArrowRight,
  Star,
  CheckCircle,
  MessageCircle,
  Bell,
  BookOpen,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

// Benefits for parents
const benefits = [
  {
    icon: Heart,
    title: 'Peace of Mind',
    description:
      'Know your child is learning in a safe, supportive environment designed for their unique needs. No frustration, no tears.',
    color: 'from-coral-500 to-pink-500',
  },
  {
    icon: Clock,
    title: 'Save Time',
    description:
      'No more searching for the right resources. AIVO creates personalized lessons automatically, giving you time back.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: LineChart,
    title: 'Track Progress',
    description:
      'Beautiful dashboards show exactly how your child is growing. Celebrate wins and identify areas for support.',
    color: 'from-mint-500 to-teal-500',
  },
  {
    icon: Shield,
    title: 'Expert Support',
    description:
      "Access to resources, tips, and a community of parents who understand your journey. You're never alone.",
    color: 'from-theme-primary-500 to-purple-600',
  },
];

// Features detail
const features = [
  {
    icon: Brain,
    title: 'Personalized AI Tutor',
    description: 'Your child gets their own Virtual Brain that learns how they think.',
  },
  {
    icon: Target,
    title: 'IEP Goal Tracking',
    description: 'Import IEP goals and track progress automatically with detailed reports.',
  },
  {
    icon: Bell,
    title: 'Real-Time Notifications',
    description: 'Get alerts when your child achieves milestones or needs support.',
  },
  {
    icon: MessageCircle,
    title: 'Teacher Communication',
    description: 'Share progress with educators seamlessly for coordinated support.',
  },
  {
    icon: BookOpen,
    title: 'Full Curriculum',
    description: "Math, reading, science and more—all adapted to your child's level.",
  },
  {
    icon: Award,
    title: 'Motivation System',
    description: 'Rewards, badges, and celebrations keep your child engaged and excited.',
  },
];

// Parent testimonials
const testimonials = [
  {
    quote:
      'For the first time, my son with ADHD actually asks to do his learning time. AIVO understands him in a way his school never could.',
    author: 'Maria S.',
    child: 'Son, age 8, ADHD',
    rating: 5,
  },
  {
    quote:
      'The IEP tracking has been a game-changer for our family. I can show the school exactly how much progress Emma is making at home.',
    author: 'David & Lisa T.',
    child: 'Daughter, age 10, Dyslexia',
    rating: 5,
  },
  {
    quote:
      "My daughter is on the autism spectrum and needs predictability. AIVO's consistent routines and visual schedules have reduced her anxiety around learning.",
    author: 'Jennifer K.',
    child: 'Daughter, age 7, ASD',
    rating: 5,
  },
];

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export function ForParentsPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-coral-50 via-white to-theme-primary-50/30 -z-10" />
          <motion.div
            className="absolute top-20 left-10 w-72 h-72 bg-coral-200/30 rounded-full blur-3xl -z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.div variants={fadeInUp}>
                  <Badge variant="coral" className="mb-6">
                    <Heart className="w-3 h-3 mr-1" />
                    For Parents
                  </Badge>
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
                >
                  Support Your Child&apos;s{' '}
                  <span className="bg-gradient-to-r from-coral-500 to-theme-primary-500 bg-clip-text text-transparent">
                    Unique Journey
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="text-xl text-gray-600 mb-8 leading-relaxed"
                >
                  AIVO was built by parents who understand the challenges of supporting a
                  neurodiverse learner. Our AI-powered platform adapts to your child&apos;s unique
                  mind—so they can learn, grow, and thrive.
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row items-start gap-4"
                >
                  <Button variant="coral" size="lg" asChild>
                    <Link href={`${appUrl}/register`}>
                      Start Free Trial
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#features">See How It Works</Link>
                  </Button>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="mt-8 flex items-center gap-4 text-sm text-gray-500"
                >
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-mint-500" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-mint-500" />
                    14-day free trial
                  </span>
                </motion.div>
              </motion.div>

              {/* Visual */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="relative"
              >
                <div className="bg-white rounded-3xl shadow-2xl p-6 border border-gray-100">
                  {/* Parent Dashboard Preview */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Emma&apos;s Progress</h3>
                      <Badge variant="success">On Track</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'This Week', value: '4.5 hrs', icon: '📚' },
                        { label: 'Streak', value: '12 days', icon: '🔥' },
                        { label: 'XP Earned', value: '2,450', icon: '⭐' },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-gray-50 rounded-xl p-3 text-center">
                          <div className="text-2xl mb-1">{stat.icon}</div>
                          <div className="font-bold text-gray-900">{stat.value}</div>
                          <div className="text-xs text-gray-500">{stat.label}</div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-mint-50 border border-mint-200 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Award className="w-5 h-5 text-mint-600" />
                        <span className="font-medium text-mint-800">New Achievement!</span>
                      </div>
                      <p className="text-sm text-mint-700">
                        Emma completed &quot;Fractions Master&quot; and earned 100 bonus XP!
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Reading Goal</span>
                        <span className="font-medium text-gray-900">85%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full w-[85%] bg-gradient-to-r from-theme-primary-500 to-coral-500 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating notification */}
                <motion.div
                  className="absolute -left-4 bottom-20 bg-white rounded-2xl shadow-lg p-4 border border-gray-100"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-coral-100 rounded-full flex items-center justify-center">
                      <Bell className="w-5 h-5 text-coral-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Session Complete!</p>
                      <p className="text-xs text-gray-500">Emma learned for 25 minutes</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge="Why Parents Love AIVO"
            title="Finally, Learning That Works"
            description="Stop the homework battles. End the frustration. AIVO makes learning something your child actually enjoys."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <motion.div
                  key={benefit.title}
                  variants={fadeInUp}
                  className="bg-white rounded-3xl p-6 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-gradient-to-br',
                      benefit.color
                    )}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display text-xl font-semibold text-gray-900 mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{benefit.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* Features Grid */}
        <Section id="features" background="gray" padding="lg">
          <SectionHeader
            badge="Platform Features"
            title="Everything You Need"
            description="Powerful tools designed specifically for parents of neurodiverse learners."
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-gray-100"
                >
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                    <p className="text-sm text-gray-600">{feature.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* Testimonials */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge="Parent Stories"
            title="From Families Like Yours"
            description="Hear from parents who've transformed their child's learning experience with AIVO."
          />

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-soft"
              >
                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-sunshine-500 fill-current" />
                  ))}
                </div>

                {/* Quote */}
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </blockquote>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-coral-400 to-theme-primary-500 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.child}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* CTA Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-coral-500 via-coral-600 to-theme-primary-600" />
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
                Ready to See Your Child Thrive?
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                Join thousands of parents who&apos;ve discovered a better way to support their
                neurodiverse learner.
              </p>
              <Button size="lg" className="bg-white text-coral-600 hover:bg-white/90" asChild>
                <Link href={`${appUrl}/register`}>
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <p className="mt-4 text-sm text-white/70">No credit card required • Cancel anytime</p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
