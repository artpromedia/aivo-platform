'use client';

import { motion } from 'framer-motion';
import {
  ArrowRight,
  TrendingUp,
  Star,
  Users,
  BookOpen,
  Brain,
  Sparkles,
  CheckCircle,
  X,
  Play,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

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

// Stats and trust indicators moved inside component for i18n

export function HeroSection() {
  const { t } = useTranslation('marketing');
  const [isVideoModalOpen, setIsVideoModalOpen] = React.useState(false);

  const stats = [
    { value: t('hero.statStudents'), label: t('hero.statStudentsLabel'), icon: Users },
    { value: t('hero.statCurriculum'), label: t('hero.statCurriculumLabel'), icon: BookOpen },
    { value: t('hero.statIep'), label: t('hero.statIepLabel'), icon: Star },
    { value: t('hero.statAi'), label: t('hero.statAiLabel'), icon: Brain },
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Light Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50/80 via-white to-white" />
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
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 hover:shadow-md transition-shadow group shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-theme-primary-600" />
                <span className="text-sm font-medium text-gray-700">
                  {t('hero.announcementPrefix')}<span className="text-theme-primary-600">{t('hero.announcementHighlight')}</span>
                </span>
                <ArrowRight className="w-4 h-4 text-theme-primary-600 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-gray-900 mb-6"
            >
              {t('hero.welcomeTo')}{' '}
              <span className="bg-gradient-to-r from-theme-primary-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                {t('hero.aivo')}
              </span>
              <br />
              <span className="bg-gradient-to-r from-coral-400 via-rose-500 to-pink-500 bg-clip-text text-transparent">
                {t('hero.learning')}
              </span>
              <br />
              <span className="text-gray-900">{t('hero.whereEveryMind')}</span>
              <br />
              <span className="text-gray-900">{t('hero.thrives')}</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0 leading-relaxed"
            >
              {t('hero.subheadlinePrefix')}{' '}
              <span className="font-semibold text-gray-900">{t('hero.virtualBrains')}</span>{t('hero.subheadlineSuffix')}
            </motion.p>

            {/* Pilot Success Callout */}
            <motion.div
              variants={itemVariants}
              className="mb-8 p-4 bg-white border border-gray-200 rounded-2xl max-w-xl mx-auto lg:mx-0 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-mint-500 rounded-xl shrink-0">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{t('hero.pilotCalloutHeading')}</p>
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-mint-600">{t('hero.pilotStudents')}</span>{t('hero.pilotConnector')}<span className="font-bold text-mint-600">{t('hero.pilotDuration')}</span>
                  </p>
                </div>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
              <Link
                href={`${process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com'}/register`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-theme-primary-600 hover:bg-theme-primary-700 text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all text-lg"
              >
                {t('hero.ctaPrimary')}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => {
                  setIsVideoModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-full border border-gray-200 shadow-sm hover:shadow-md transition-all text-lg"
              >
                <Play className="w-5 h-5 text-theme-primary-500" />
                {t('hero.ctaSecondary')}
              </button>
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
                        {t('hero.dashboardTitle')}
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
                        <span className="font-semibold text-gray-900">{t('hero.todaysProgress')}</span>
                        <span className="text-sm font-bold text-theme-primary-600">{t('hero.progressPercent')}</span>
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
                        label: t('hero.lessonsCompleted'),
                        value: t('hero.lessonsCount'),
                        color: 'bg-mint-100 text-mint-700',
                      },
                      {
                        label: t('hero.xpEarned'),
                        value: t('hero.xpCount'),
                        color: 'bg-sunshine-100 text-sunshine-700',
                      },
                      {
                        label: t('hero.currentStreak'),
                        value: t('hero.streakDays'),
                        color: 'bg-coral-100 text-coral-700',
                      },
                      {
                        label: t('hero.focusScore'),
                        value: t('hero.focusPercent'),
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
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="text-2xl">🏆</div>
                    <div>
                      <div className="font-semibold text-gray-900">{t('hero.achievementUnlocked')}</div>
                      <div className="text-sm text-gray-600">{t('hero.achievementDetail')}</div>
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
                    <div className="font-semibold text-gray-900 text-sm">{t('hero.iepAligned')}</div>
                    <div className="text-xs text-gray-500">{t('hero.personalizedGoals')}</div>
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
                    <div className="font-semibold text-gray-900 text-sm">{t('hero.virtualBrain')}</div>
                    <div className="text-xs text-gray-500">{t('hero.aiPoweredTutor')}</div>
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
                className="text-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm"
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
              aria-label={t('hero.closeVideo')}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center justify-center h-full text-white gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
              <p className="text-white/60 text-sm">{t('hero.demoComingSoon')}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </section>
  );
}
