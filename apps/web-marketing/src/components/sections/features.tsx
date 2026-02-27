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
import { useTranslation } from 'react-i18next';

import { featureIllustrations } from '@/components/sections/feature-illustrations';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const featureKeys = ['aiTutoring', 'iepGoals', 'progressTracking', 'parentDashboard'] as const;
const featureIcons = [Brain, Target, BarChart3, Users];
const featureColors = [
  'bg-theme-primary-100 text-theme-primary-600',
  'bg-accent-100 text-accent-600',
  'bg-mint-100 text-mint-600',
  'bg-sky-100 text-sky-600',
];
const featureImages = [
  '/images/features/ai-tutoring.svg',
  '/images/features/iep-management.svg',
  '/images/features/progress-tracking.svg',
  '/images/features/parent-dashboard.svg',
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
  const { t } = useTranslation('marketing');

  const features = featureKeys.map((key, i) => ({
    key,
    title: t(`features.${key}.title`),
    description: t(`features.${key}.description`),
    icon: featureIcons[i],
    color: featureColors[i],
    points: (t(`features.${key}.points`, { returnObjects: true }) as string[]),
    image: featureImages[i],
  }));

  return (
    <Section id="features" background="gradient" padding="lg">
      <SectionHeader
        badge={t('features.badge')}
        title={
          <>
            {t('features.titlePrefix')}<span className="text-gradient-primary">{t('features.titleHighlight')}</span>
          </>
        }
        description={t('features.description')}
      />

      <div className="space-y-24">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isReversed = index % 2 === 1;
          const Illustration = featureIllustrations[feature.key === 'aiTutoring' ? 'AI-Powered Tutoring' : feature.key === 'iepGoals' ? 'IEP Goal Management' : feature.key === 'progressTracking' ? 'Progress Tracking' : 'Parent Dashboard'];

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
            {t('features.validationBadge')}
          </span>
        </div>
      </motion.div>
    </Section>
  );
}
