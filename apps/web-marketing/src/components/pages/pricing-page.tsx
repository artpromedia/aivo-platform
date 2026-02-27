'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Star,
  Shield,
  Clock,
  Users,
  ClipboardList,
  ChevronDown,
  Zap,
  Brain,
  BarChart3,
  Headphones,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { PricingCTA } from '@/components/cta';
import { Navigation, Footer } from '@/components/shared';
import { Badge } from '@/components/ui/badge';
import type { PlanType } from '@/lib/types';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  originalPrice?: number;
  popular?: boolean;
  discount?: string;
  features: string[];
  notIncluded?: string[];
  cta: string;
  ctaVariant: 'default' | 'coral' | 'outline';
  planId: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PricingPage() {
  const { t } = useTranslation('marketing');
  const [isAnnual, setIsAnnual] = React.useState(true);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  /* ── Locale-driven data ─────────────────────────────────── */
  const tierKeys = ['free', 'pro', 'premium'] as const;
  const tierMeta: Record<
    string,
    {
      monthlyPrice: number;
      annualPrice: number;
      originalPrice?: number;
      popular?: boolean;
      ctaVariant: 'default' | 'coral' | 'outline';
      planId: string;
    }
  > = {
    free: { monthlyPrice: 0, annualPrice: 0, ctaVariant: 'outline', planId: 'free' },
    pro: {
      monthlyPrice: 29.99,
      annualPrice: 24.99,
      originalPrice: 39.99,
      popular: true,
      ctaVariant: 'coral',
      planId: 'pro',
    },
    premium: { monthlyPrice: 49.99, annualPrice: 41.99, ctaVariant: 'default', planId: 'premium' },
  };
  const tiers: PricingTier[] = tierKeys.map((key) => ({
    name: t(`pricing.${key}.name`),
    description: t(`pricing.${key}.description`),
    ...tierMeta[key],
    discount: key === 'pro' ? t('pricing.pro.discount') : undefined,
    features: t(`pricing.${key}.features`, { returnObjects: true }) as string[],
    notIncluded:
      key === 'free'
        ? (t('pricing.free.notIncluded', { returnObjects: true }) as string[])
        : undefined,
    cta: t(`pricing.${key}.cta`),
  }));

  const fcStr = (key: string) => {
    const d = t(`pricingPage.featureComparison.${key}`, { returnObjects: true }) as {
      label: string;
      free: string;
      pro: string;
      premium: string;
    };
    return { name: d.label, free: d.free, pro: d.pro, premium: d.premium };
  };
  const fcBool = (key: string, free: boolean, pro: boolean, premium: boolean) => ({
    name: (
      t(`pricingPage.featureComparison.${key}`, { returnObjects: true }) as { label: string }
    ).label,
    free,
    pro,
    premium,
  });
  const featureComparison = [
    fcStr('aiTutorSessions'),
    fcStr('subjectAreas'),
    fcStr('progressReports'),
    fcBool('iepIntegration', false, true, true),
    fcBool('parentDashboard', false, true, true),
    fcStr('learnerProfiles'),
    fcBool('learningStyleAssessment', false, true, true),
    fcBool('customLearningPaths', false, true, true),
    fcBool('teacherTools', false, false, true),
    fcBool('dedicatedSuccessManager', false, false, true),
    fcStr('support'),
    fcBool('earlyFeatureAccess', false, false, true),
  ];

  const trustBadgeIcons = [Shield, Clock, Users, ClipboardList];
  const trustBadgeLabels = t('pricingPage.trustBadges', { returnObjects: true }) as string[];
  const trustBadges = trustBadgeIcons.map((icon, i) => ({ icon, label: trustBadgeLabels[i] }));

  const faqs = t('pricingPage.faqs', { returnObjects: true }) as Array<{
    question: string;
    answer: string;
  }>;

  const educatorIcons = [Brain, BarChart3, BookOpen, GraduationCap, Headphones, Zap];
  const educatorFeatureData = t('pricingPage.educatorFeatures', {
    returnObjects: true,
  }) as Array<{ title: string; description: string }>;
  const educatorFeatures = educatorFeatureData.map((f, i) => ({
    ...f,
    icon: educatorIcons[i],
  }));

  return (
    <>
      <Navigation />
      <main className="min-h-screen bg-white">
        {/* ── Hero ──────────────────────────────────────────────── */}
        <section className="pt-32 pb-16 bg-gradient-to-b from-theme-primary-50 to-white">
          <div className="container mx-auto px-4 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="primary" className="mb-4">
                {t('pricingPage.heroBadge')}
              </Badge>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
                {t('pricingPage.heroHeadingPrefix')}{' '}
                <span className="text-gradient-primary">{t('pricingPage.heroHeadingHighlight')}</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                {t('pricingPage.heroDescription')}
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── Billing Toggle ────────────────────────────────────── */}
        <section className="pb-4">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-4 mb-12">
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  isAnnual ? 'text-gray-500' : 'text-gray-900'
                )}
              >
                {t('pricingPage.monthly')}
              </span>
              <button
                onClick={() => {
                  setIsAnnual(!isAnnual);
                }}
                className={cn(
                  'relative w-14 h-8 rounded-full transition-colors',
                  isAnnual ? 'bg-theme-primary-500' : 'bg-gray-300'
                )}
                aria-label={isAnnual ? t('pricingPage.switchToMonthly') : t('pricingPage.switchToAnnual')}
              >
                <motion.div
                  className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
                  animate={{ left: isAnnual ? 'calc(100% - 28px)' : '4px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
              <span
                className={cn(
                  'text-sm font-medium transition-colors',
                  isAnnual ? 'text-gray-900' : 'text-gray-500'
                )}
              >
                {t('pricingPage.annual')}
              </span>
              <Badge variant="success" className="ml-2">
                {t('pricingPage.saveBadge')}
              </Badge>
            </div>
          </div>
        </section>

        {/* ── Pricing Cards ─────────────────────────────────────── */}
        <section className="pb-20">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
              {tiers.map((tier, index) => {
                const price = isAnnual ? tier.annualPrice : tier.monthlyPrice;
                return (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'relative bg-white rounded-3xl p-8 border transition-all duration-300 hover:shadow-soft-lg',
                      tier.popular
                        ? 'border-theme-primary-500 ring-2 ring-theme-primary-500 shadow-purple-lg'
                        : 'border-gray-200 shadow-soft'
                    )}
                  >
                    {tier.popular && (
                      <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <Badge variant="gradient" className="px-4 py-1">
                          <Star className="w-3 h-3 mr-1" />
                          {t('pricingPage.popularBadge')}
                        </Badge>
                      </div>
                    )}
                    {tier.discount && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="success">{tier.discount}</Badge>
                      </div>
                    )}
                    <div className="text-center mb-6">
                      <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">
                        {tier.name}
                      </h3>
                      <p className="text-gray-500 text-sm">{tier.description}</p>
                    </div>
                    <div className="text-center mb-8">
                      <div className="flex items-end justify-center gap-1">
                        {tier.originalPrice && (
                          <span className="text-lg text-gray-400 line-through mb-1">
                            ${tier.originalPrice}
                          </span>
                        )}
                        <span className="text-5xl font-bold text-gray-900">
                          ${price.toFixed(price === 0 ? 0 : 2)}
                        </span>
                        <span className="text-gray-500 mb-2">{t('pricingPage.perMonth')}</span>
                      </div>
                      {isAnnual && price > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                          {t('pricingPage.billedAnnually', { amount: (price * 12).toFixed(2) })}
                        </p>
                      )}
                    </div>
                    <PricingCTA
                      plan={tier.planId as PlanType}
                      interval={isAnnual ? 'annual' : 'monthly'}
                      className="mb-8"
                    />
                    <div className="space-y-3">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-3">
                          <Check className="w-5 h-5 text-mint-500 shrink-0 mt-0.5" />
                          <span className="text-gray-600 text-sm">{f}</span>
                        </div>
                      ))}
                      {tier.notIncluded?.map((f) => (
                        <div key={f} className="flex items-start gap-3 opacity-50">
                          <X className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                          <span className="text-gray-400 text-sm">{f}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Trust */}
            <div className="flex flex-wrap items-center justify-center gap-6 mb-16">
              {trustBadges.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl"
                >
                  <Icon className="w-5 h-5 text-theme-primary-500" />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Feature Comparison ────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('pricingPage.comparePlansHeading')}
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                {t('pricingPage.comparePlansDescription')}
              </p>
            </motion.div>

            <div className="max-w-4xl mx-auto overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-4 pr-4 text-sm font-semibold text-gray-900">{t('pricingPage.featureTableHeaders.feature')}</th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center">
                      {t('pricingPage.featureTableHeaders.free')}
                    </th>
                    <th className="py-4 px-4 text-sm font-semibold text-theme-primary-600 text-center">
                      {t('pricingPage.featureTableHeaders.pro')}
                    </th>
                    <th className="py-4 px-4 text-sm font-semibold text-gray-900 text-center">
                      {t('pricingPage.featureTableHeaders.premium')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {featureComparison.map((row, i) => (
                    <motion.tr
                      key={row.name}
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-gray-100"
                    >
                      <td className="py-3 pr-4 text-sm text-gray-700">{row.name}</td>
                      {(['free', 'pro', 'premium'] as const).map((key) => {
                        const v = row[key];
                        return (
                          <td key={key} className="py-3 px-4 text-center">
                            {typeof v === 'boolean' ? (
                              v ? (
                                <Check className="w-5 h-5 text-mint-500 mx-auto" />
                              ) : (
                                <X className="w-5 h-5 text-gray-300 mx-auto" />
                              )
                            ) : (
                              <span className="text-sm text-gray-600">{v}</span>
                            )}
                          </td>
                        );
                      })}
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Why Educators Love AIVO ───────────────────────────── */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <Badge variant="primary" className="mb-4">
                {t('pricingPage.whyAivoBadge')}
              </Badge>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('pricingPage.whyAivoHeading')}
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                {t('pricingPage.whyAivoDescription')}
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {educatorFeatures.map((feat, i) => (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-soft hover:shadow-soft-lg transition-shadow"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-theme-primary-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <feat.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                    {feat.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{feat.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {t('pricingPage.faqHeading')}
              </h2>
            </motion.div>
            <div className="max-w-2xl mx-auto space-y-3">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.question}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      setOpenFaq(openFaq === index ? null : index);
                    }}
                    className="w-full flex items-center justify-between p-5 text-left"
                    aria-expanded={openFaq === index}
                  >
                    <span className="font-semibold text-gray-900">{faq.question}</span>
                    <ChevronDown
                      className={cn(
                        'w-5 h-5 text-gray-500 transition-transform duration-200',
                        openFaq === index && 'rotate-180'
                      )}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-5 pb-5 text-gray-600">{faq.answer}</div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Money-Back Guarantee ──────────────────────────────── */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="inline-flex items-center gap-3 px-6 py-4 bg-mint-50 border border-mint-200 rounded-2xl">
                <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-mint-600" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-gray-900">{t('pricingPage.moneyBack.heading')}</div>
                  <div className="text-sm text-gray-600">
                    {t('pricingPage.moneyBack.description')}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── Enterprise CTA ───────────────────────────────────── */}
        <section className="py-20 bg-gradient-to-br from-theme-primary-600 to-purple-700">
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
                {t('pricingPage.enterpriseHeading')}
              </h2>
              <p className="text-theme-primary-100 text-lg max-w-xl mx-auto mb-8">
                {t('pricingPage.enterpriseDescription')}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/contact"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-theme-primary-600 font-semibold rounded-2xl hover:shadow-lg transition-shadow"
                >
                  {t('pricingPage.enterpriseCtaPrimary')}
                </a>
                <a
                  href="/demo"
                  className="inline-flex items-center justify-center px-8 py-4 border-2 border-white text-white font-semibold rounded-2xl hover:bg-white/10 transition-colors"
                >
                  {t('pricingPage.enterpriseCtaSecondary')}
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
