'use client';

import { motion } from 'framer-motion';
import {
  Calculator,
  BookOpen,
  FlaskConical,
  Clock,
  MessageCircle,
  ArrowRight,
  Sparkles,
  Star,
  CheckCircle,
  Brain,
  Zap,
  Shield,
  Heart,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { Footer } from '@/components/shared/footer';
import { Navigation } from '@/components/shared/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Section, SectionHeader } from '@/components/ui/section';
import { cn } from '@/lib/utils';

// ─── Tutor data ───
const tutorMeta = [
  {
    icon: Calculator,
    gradient: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-100',
    text: 'text-purple-600',
    ring: 'ring-purple-200',
  },
  {
    icon: BookOpen,
    gradient: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    ring: 'ring-emerald-200',
  },
  {
    icon: FlaskConical,
    gradient: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-100',
    text: 'text-orange-600',
    ring: 'ring-orange-200',
  },
  {
    icon: Clock,
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-100',
    text: 'text-blue-600',
    ring: 'ring-blue-200',
  },
  {
    icon: MessageCircle,
    gradient: 'from-cyan-500 to-teal-600',
    bg: 'bg-cyan-100',
    text: 'text-cyan-600',
    ring: 'ring-cyan-200',
  },
];

const whyIcons = [Heart, Zap, Sparkles, Brain, BarChart3, Shield];

// ─── Animation variants ───
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

export function TutorsPage() {
  const { t } = useTranslation('marketing');
  const parentAppUrl = process.env.NEXT_PUBLIC_PARENT_APP_URL || 'https://parent.aivolearning.com';

  const tutors = (
    t('tutorsPage.tutors', { returnObjects: true }) as {
      name: string;
      subject: string;
      tagline: string;
      description: string;
      traits: string[];
    }[]
  ).map((tutor, i) => ({ ...tutor, ...tutorMeta[i] }));

  const whyPoints = (
    t('tutorsPage.whyPoints', { returnObjects: true }) as {
      title: string;
      description: string;
    }[]
  ).map((point, i) => ({ ...point, icon: whyIcons[i] }));

  const howSteps = t('tutorsPage.howSteps', { returnObjects: true }) as {
    number: string;
    title: string;
    description: string;
  }[];

  const pricingFeatures = t('tutorsPage.pricingFeatures', { returnObjects: true }) as {
    free: string[];
    pro: string[];
    premium: string[];
  };

  const testimonials = t('tutorsPage.testimonials', { returnObjects: true }) as {
    quote: string;
    author: string;
    detail: string;
  }[];

  const heroCheckPoints = t('tutorsPage.heroCheckPoints', { returnObjects: true }) as string[];

  return (
    <>
      <Navigation />

      <main className="overflow-x-hidden">
        {/* ─── Hero Section ─── */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-50 via-white to-indigo-50/30 -z-10" />
          <motion.div
            className="absolute top-20 right-10 w-72 h-72 bg-theme-primary-200/30 rounded-full blur-3xl -z-10"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 8, repeat: Infinity }}
          />

          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto text-center">
              <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
                <motion.div variants={fadeInUp}>
                  <Badge variant="primary" className="mb-6">
                    <Brain className="w-3 h-3 mr-1" />
                    {t('tutorsPage.heroBadge')}
                  </Badge>
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 mb-6"
                >
                  {t('tutorsPage.heroHeadingPrefix')}
                  <span className="text-gradient-primary">
                    {t('tutorsPage.heroHeadingHighlight')}
                  </span>
                </motion.h1>

                <motion.p
                  variants={fadeInUp}
                  className="text-xl text-gray-600 mb-8 leading-relaxed max-w-2xl mx-auto"
                >
                  {t('tutorsPage.heroDescription')}
                </motion.p>

                <motion.div
                  variants={fadeInUp}
                  className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                  <Button variant="coral" size="lg" asChild>
                    <Link href={`${parentAppUrl}/register`}>
                      {t('tutorsPage.heroCtaPrimary')}
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </Button>
                  <Button variant="outline" size="lg" asChild>
                    <Link href="#pricing">{t('tutorsPage.heroCtaSecondary')}</Link>
                  </Button>
                </motion.div>

                <motion.div
                  variants={fadeInUp}
                  className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500"
                >
                  {heroCheckPoints.map((cp) => (
                    <span key={cp} className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-mint-500" />
                      {cp}
                    </span>
                  ))}
                </motion.div>
              </motion.div>

              {/* Floating tutor icons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-16 flex items-center justify-center gap-4"
              >
                {tutors.map((tutor, i) => {
                  const Icon = tutor.icon;
                  return (
                    <motion.div
                      key={tutor.name}
                      className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg',
                        tutor.gradient
                      )}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ─── Meet the Tutors ─── */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge={t('tutorsPage.meetBadge')}
            title={t('tutorsPage.meetHeading')}
            description={t('tutorsPage.meetDescription')}
          />

          <div className="space-y-16 max-w-5xl mx-auto">
            {tutors.map((tutor, index) => {
              const Icon = tutor.icon;
              const isReversed = index % 2 === 1;

              return (
                <motion.div
                  key={tutor.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6 }}
                  className={cn(
                    'grid lg:grid-cols-2 gap-12 items-center',
                    isReversed && 'lg:flex-row-reverse'
                  )}
                >
                  {/* Content */}
                  <div className={cn(isReversed && 'lg:order-2')}>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className={cn(
                          'w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-md',
                          tutor.gradient
                        )}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-display text-2xl font-bold text-gray-900">
                          {tutor.name}
                        </h3>
                        <p className="text-sm text-gray-500">{tutor.subject}</p>
                      </div>
                    </div>

                    <p className="text-lg font-medium text-gray-700 mb-2 italic">
                      &ldquo;{tutor.tagline}&rdquo;
                    </p>
                    <p className="text-gray-600 leading-relaxed mb-6">{tutor.description}</p>

                    <div className="flex flex-wrap gap-2">
                      {tutor.traits.map((trait) => (
                        <span
                          key={trait}
                          className={cn(
                            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border',
                            tutor.bg,
                            tutor.text,
                            tutor.ring
                          )}
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Visual card */}
                  <div className={cn(isReversed && 'lg:order-1')}>
                    <div
                      className={cn(
                        'relative bg-white rounded-3xl p-8 border border-gray-100 shadow-soft flex flex-col items-center text-center'
                      )}
                    >
                      <motion.div
                        className={cn(
                          'w-24 h-24 rounded-3xl flex items-center justify-center bg-gradient-to-br shadow-lg mb-6',
                          tutor.gradient
                        )}
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Icon className="w-12 h-12 text-white" />
                      </motion.div>
                      <h4 className="font-display text-xl font-bold text-gray-900 mb-1">
                        {tutor.name}
                      </h4>
                      <p className={cn('text-sm font-medium mb-4', tutor.text)}>{tutor.subject}</p>
                      <div className="w-full px-5 py-3 bg-gray-50 rounded-2xl text-sm text-gray-600 leading-relaxed">
                        &ldquo;{tutor.tagline}&rdquo;
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* ─── Why AI Tutoring ─── */}
        <Section background="gray" padding="lg">
          <SectionHeader
            badge={t('tutorsPage.whyBadge')}
            title={t('tutorsPage.whyHeading')}
            description={t('tutorsPage.whyDescription')}
          />

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto"
          >
            {whyPoints.map((point) => {
              const Icon = point.icon;
              return (
                <motion.div
                  key={point.title}
                  variants={fadeInUp}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="w-12 h-12 bg-theme-primary-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-theme-primary-600" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                    {point.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{point.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </Section>

        {/* ─── How It Works ─── */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge={t('tutorsPage.howBadge')}
            title={t('tutorsPage.howHeading')}
            description={t('tutorsPage.howDescription')}
          />

          <div className="max-w-3xl mx-auto">
            <div className="space-y-8">
              {howSteps.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="flex items-start gap-6"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-theme-primary-500 to-theme-primary-600 rounded-2xl flex items-center justify-center text-white font-display text-xl font-bold shadow-md shrink-0">
                    {step.number}
                  </div>
                  <div>
                    <h3 className="font-display text-xl font-bold text-gray-900 mb-2">
                      {step.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">{step.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </Section>

        {/* ─── Pricing Comparison ─── */}
        <Section id="pricing" background="gray" padding="lg">
          <SectionHeader
            badge={t('tutorsPage.pricingBadge')}
            title={t('tutorsPage.pricingHeading')}
            description={t('tutorsPage.pricingDescription')}
          />

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-8">
            {(['free', 'pro', 'premium'] as const).map((tier) => {
              const isPro = tier === 'pro';
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className={cn(
                    'bg-white rounded-2xl p-6 border transition-all',
                    isPro
                      ? 'border-theme-primary-500 ring-2 ring-theme-primary-500 shadow-purple-lg'
                      : 'border-gray-200 shadow-soft'
                  )}
                >
                  <h3 className="font-display text-lg font-bold text-gray-900 mb-1 capitalize">
                    {t(`pricing.${tier}.name`)}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">{t(`pricing.${tier}.description`)}</p>
                  <div className="space-y-2.5">
                    {pricingFeatures[tier].map((feature) => (
                      <div key={feature} className="flex items-start gap-2.5">
                        <CheckCircle className="w-4 h-4 text-mint-500 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/#pricing">
                {t('tutorsPage.pricingCta')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </Section>

        {/* ─── Testimonials ─── */}
        <Section background="white" padding="lg">
          <SectionHeader
            badge={t('tutorsPage.testimonialsBadge')}
            title={t('tutorsPage.testimonialsHeading')}
            description={t('tutorsPage.testimonialsDescription')}
          />

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-3xl p-8 border border-gray-100 shadow-soft"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <Star key={i} className="w-5 h-5 text-sunshine-500 fill-current" />
                  ))}
                </div>
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-400 to-theme-primary-600 rounded-full flex items-center justify-center text-white font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.detail}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ─── Final CTA ─── */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-theme-primary-500 via-theme-primary-600 to-indigo-700" />
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
                {t('tutorsPage.ctaHeading')}
              </h2>
              <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                {t('tutorsPage.ctaDescription')}
              </p>
              <Button
                size="lg"
                className="bg-white text-theme-primary-600 hover:bg-white/90"
                asChild
              >
                <Link href={`${parentAppUrl}/register`}>
                  {t('tutorsPage.ctaButton')}
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              <p className="mt-4 text-sm text-white/70">{t('tutorsPage.ctaFooter')}</p>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
