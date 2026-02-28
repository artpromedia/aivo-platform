'use client';

import { motion } from 'framer-motion';
import { Calculator, BookOpen, FlaskConical, Clock, MessageCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

const tutorCards = [
  {
    nameKey: 0,
    icon: Calculator,
    gradient: 'from-purple-500 to-indigo-600',
    label: 'Nova',
    subject: 'Math',
  },
  {
    nameKey: 1,
    icon: BookOpen,
    gradient: 'from-emerald-500 to-teal-600',
    label: 'Sage',
    subject: 'ELA',
  },
  {
    nameKey: 2,
    icon: FlaskConical,
    gradient: 'from-orange-500 to-amber-600',
    label: 'Spark',
    subject: 'Science',
  },
  {
    nameKey: 3,
    icon: Clock,
    gradient: 'from-blue-500 to-blue-600',
    label: 'Chrono',
    subject: 'History',
  },
  {
    nameKey: 4,
    icon: MessageCircle,
    gradient: 'from-cyan-500 to-teal-600',
    label: 'Pixel',
    subject: 'Coding',
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function TutorsPreview() {
  const { t } = useTranslation('marketing');

  const tutors = t('tutorsPage.tutors', { returnObjects: true }) as {
    name: string;
    subject: string;
    tagline: string;
  }[];

  return (
    <Section id="ai-tutors" background="gradient" padding="lg">
      <SectionHeader
        badge={t('tutorsPreview.badge')}
        title={
          <>
            {t('tutorsPreview.titlePrefix')}
            <span className="text-gradient-primary">{t('tutorsPreview.titleHighlight')}</span>
          </>
        }
        description={t('tutorsPreview.description')}
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-5xl mx-auto mb-10"
      >
        {tutorCards.map((card, i) => {
          const Icon = card.icon;
          const tutor = tutors[i];
          return (
            <motion.div
              key={card.label}
              variants={fadeInUp}
              className="group bg-white rounded-2xl p-5 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1 text-center"
            >
              <motion.div
                className={cn(
                  'w-14 h-14 mx-auto rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-md mb-4',
                  card.gradient
                )}
                whileHover={{ scale: 1.1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                <Icon className="w-7 h-7 text-white" />
              </motion.div>
              <h3 className="font-display text-lg font-bold text-gray-900 mb-0.5">{tutor.name}</h3>
              <p className="text-sm text-gray-500 mb-2">{tutor.subject}</p>
              <p className="text-xs text-gray-400 italic leading-snug">{tutor.tagline}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* CTA row */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
        <Link
          href="/tutors"
          className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-coral-400 via-rose-500 to-theme-primary-600 rounded-full shadow-sm hover:shadow-md transition-all"
        >
          {t('tutorsPreview.exploreCta')}
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Badge variant="outline" size="lg">
          {t('tutorsPreview.availableBadge')}
        </Badge>
      </div>
    </Section>
  );
}
