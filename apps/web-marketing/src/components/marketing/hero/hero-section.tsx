'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  Star,
  Users,
  Clock,
  Brain,
  Sparkles,
  CheckCircle,
  X,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';

import { HeroCTASection } from '@/components/cta';
import { cn } from '@/lib/utils';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-5, 5, -5],
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// Stats data
const stats = [
  { value: '150+', label: 'Students', icon: Users },
  { value: '3', label: 'Months', icon: Clock },
  { value: '4.9/5', label: 'Rating', icon: Star },
  { value: 'AI', label: 'Powered', icon: Brain },
];

// Trust indicators (used in HeroCTA component)
const _trustIndicators = ['FERPA Compliant', 'COPPA Certified', 'No Ads', 'No Data Selling'];

export function HeroSection() {
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        {/* Gradient Base */}
        <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50/50 via-white to-pink-50/50" />

        {/* Animated Blobs */}
        <motion.div
          className="absolute top-20 left-10 w-72 h-72 bg-theme-primary-200/30 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-20 right-10 w-96 h-96 bg-coral-200/30 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            x: [0, -40, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-mint-100/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        />

        {/* Grid Pattern */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #8B5CF6 1px, transparent 1px),
              linear-gradient(to bottom, #8B5CF6 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column - Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Announcement Badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <Link
                href="#early-access"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-theme-primary-100 to-coral-100 border border-theme-primary-200/50 hover:shadow-md transition-shadow group"
              >
                <Sparkles className="w-4 h-4 text-theme-primary-600" />
                <span className="text-sm font-medium text-gray-700">
                  Introducing <span className="text-theme-primary-600">Virtual Brain AI</span>
                </span>
                <ArrowRight className="w-4 h-4 text-theme-primary-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-gray-900 mb-6"
            >
              Welcome to{' '}
              <span className="relative">
                <span className="bg-gradient-to-r from-theme-primary-600 via-coral-500 to-theme-primary-500 bg-clip-text text-transparent">
                  AIVO Learning
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-3 bg-coral-200/50 -z-10 rounded"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                />
              </span>
              <br />
              <span className="text-gray-700">Where Every Mind Thrives</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              Revolutionary AI-powered learning platform with personalized{' '}
              <span className="font-semibold text-gray-900">Virtual Brains</span> designed for
              neurodiverse K-12 learners. Supporting ADHD, Autism, Dyslexia, and all learning
              differences.
            </motion.p>

            {/* Pilot Success Callout */}
            <motion.div
              variants={itemVariants}
              className="mb-8 p-4 bg-gradient-to-r from-mint-50 to-mint-100/50 border border-mint-200 rounded-2xl max-w-xl mx-auto lg:mx-0"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-mint-500 rounded-xl shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">Pilot Program Success</p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-mint-600">150 students</span> improved learning
                    outcomes in just <span className="font-bold text-mint-600">3 months</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div variants={itemVariants}>
              <HeroCTASection
                showVideo
                onVideoClick={() => {
                  setIsVideoModalOpen(true);
                }}
              />
            </motion.div>
          </motion.div>

          {/* Right Column - Visual */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative"
          >
            {/* Dashboard Mockup */}
            <div className="relative">
              {/* Main Dashboard Card */}
              <motion.div
                className="relative bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
                variants={floatVariants}
                initial="initial"
                animate="animate"
              >
                {/* Dashboard Header */}
                <div className="bg-gradient-to-r from-theme-primary-500 to-theme-primary-600 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="w-3 h-3 bg-red-400 rounded-full" />
                      <span className="w-3 h-3 bg-yellow-400 rounded-full" />
                      <span className="w-3 h-3 bg-green-400 rounded-full" />
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-sm font-medium text-white/80">
                        AIVO Learning Dashboard
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-6 space-y-4">
                  {/* Progress Section */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-coral-400 to-coral-500 rounded-xl flex items-center justify-center">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-gray-900">Today&apos;s Progress</span>
                        <span className="text-sm font-bold text-theme-primary-600">78%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-theme-primary-500 to-coral-500 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: '78%' }}
                          transition={{ duration: 1.5, delay: 1 }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        label: 'Lessons Completed',
                        value: '12',
                        color: 'bg-mint-100 text-mint-700',
                      },
                      {
                        label: 'XP Earned',
                        value: '450',
                        color: 'bg-sunshine-100 text-sunshine-700',
                      },
                      {
                        label: 'Current Streak',
                        value: '7 days',
                        color: 'bg-coral-100 text-coral-700',
                      },
                      {
                        label: 'Focus Score',
                        value: '94%',
                        color: 'bg-theme-primary-100 text-theme-primary-700',
                      },
                    ].map((stat) => (
                      <div key={stat.label} className={cn('p-3 rounded-xl', stat.color)}>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-xs opacity-80">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Achievement */}
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-theme-primary-50 to-coral-50 rounded-xl border border-theme-primary-100">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="font-semibold text-gray-900">Achievement Unlocked!</div>
                      <div className="text-sm text-gray-600">Math Master - Level 5</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Floating Feature Cards */}
              <motion.div
                className="absolute -left-8 top-1/4 bg-white rounded-2xl shadow-lg p-4 border border-gray-100"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-mint-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-mint-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">IEP Aligned</div>
                    <div className="text-xs text-gray-500">Personalized goals</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className="absolute -right-4 bottom-1/4 bg-white rounded-2xl shadow-lg p-4 border border-gray-100"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-coral-100 rounded-xl flex items-center justify-center">
                    <Brain className="w-5 h-5 text-coral-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">Virtual Brain</div>
                    <div className="text-xs text-gray-500">AI-powered tutor</div>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.6 }}
          className="mt-16 lg:mt-24"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {stats.map(({ value, label, icon: Icon }, index) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 + index * 0.1 }}
                className="text-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-gray-100"
              >
                <Icon className="w-6 h-6 text-theme-primary-500 mx-auto mb-2" />
                <div className="text-2xl md:text-3xl font-bold text-gray-900">{value}</div>
                <div className="text-sm text-gray-500">{label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Video Modal */}
      {isVideoModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          onClick={() => {
            setIsVideoModalOpen(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <button
              onClick={() => {
                setIsVideoModalOpen(false);
              }}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>
            {/* Replace with actual video embed */}
            <div className="flex items-center justify-center h-full text-white">
              <p>Video Player Placeholder</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
