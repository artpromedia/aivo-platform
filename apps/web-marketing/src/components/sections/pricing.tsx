'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Star, Shield, Clock, Users, ClipboardList, ChevronDown } from 'lucide-react';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { PricingCTA } from '@/components/cta';
import { Badge } from '@/components/ui/badge';
import { Section, SectionHeader } from '@/components/ui/section';
import type { PlanType } from '@/lib/types';
import { cn } from '@/lib/utils';

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

const pricingMeta = [
  { monthlyPrice: 0, annualPrice: 0, ctaVariant: 'outline' as const, planId: 'free' },
  { monthlyPrice: 29.99, annualPrice: 24.99, originalPrice: 39.99, popular: true, ctaVariant: 'coral' as const, planId: 'pro' },
  { monthlyPrice: 49.99, annualPrice: 41.99, ctaVariant: 'default' as const, planId: 'premium' },
];

const trustBadgeIcons = [Shield, Clock, Users, ClipboardList];

export function Pricing() {
  const { t } = useTranslation('marketing');
  const [isAnnual, setIsAnnual] = React.useState(true);
  const [openFaq, setOpenFaq] = React.useState<number | null>(null);

  const tierKeys = ['free', 'pro', 'premium'] as const;
  const pricingTiers = tierKeys.map((key, i) => ({
    ...pricingMeta[i],
    name: t(`pricing.${key}.name`),
    description: t(`pricing.${key}.description`),
    discount: key === 'pro' ? t('pricing.pro.discount') : undefined,
    features: t(`pricing.${key}.features`, { returnObjects: true }) as string[],
    notIncluded: key === 'free' ? (t('pricing.free.notIncluded', { returnObjects: true }) as string[]) : undefined,
    cta: t(`pricing.${key}.cta`),
  }));

  const trustBadges = (t('pricing.trustBadges', { returnObjects: true }) as string[]).map((label, i) => ({
    icon: trustBadgeIcons[i],
    label,
  }));

  const faqs = t('pricing.faqs', { returnObjects: true }) as { question: string; answer: string }[];

  return (
    <Section id="pricing" background="white" padding="lg">
      <SectionHeader
        badge={t('pricing.badge')}
        title={
          <>
            {t('pricing.titlePrefix')}<span className="text-gradient-primary">{t('pricing.titleHighlight')}</span>
          </>
        }
        description={t('pricing.description')}
      />

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4 mb-12">
        <span
          className={cn(
            'text-sm font-medium transition-colors',
            isAnnual ? 'text-gray-500' : 'text-gray-900'
          )}
        >
          {t('pricing.monthly')}
        </span>
        <button
          onClick={() => {
            setIsAnnual(!isAnnual);
          }}
          className={cn(
            'relative w-14 h-8 rounded-full transition-colors',
            isAnnual ? 'bg-theme-primary-500' : 'bg-gray-300'
          )}
          aria-label={isAnnual ? t('pricing.switchToMonthly') : t('pricing.switchToAnnual')}
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
          {t('pricing.annual')}
        </span>
        <Badge variant="success" className="ml-2">
          {t('pricing.saveBadge')}
        </Badge>
      </div>

      {/* Pricing Cards */}
      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
        {pricingTiers.map((tier, index) => {
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
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge variant="gradient" className="px-4 py-1">
                    <Star className="w-3 h-3 mr-1" />
                    {t('pricing.pro.popularBadge')}
                  </Badge>
                </div>
              )}

              {/* Discount Badge */}
              {tier.discount && (
                <div className="absolute top-4 right-4">
                  <Badge variant="success">{tier.discount}</Badge>
                </div>
              )}

              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="font-display text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-500 text-sm">{tier.description}</p>
              </div>

              {/* Price */}
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
                  <span className="text-gray-500 mb-2">{t('pricing.perMonth')}</span>
                </div>
                {isAnnual && price > 0 && (
                  <p className="text-sm text-gray-500 mt-1">
                    {t('pricing.billedAnnually', { amount: (price * 12).toFixed(2) })}
                  </p>
                )}
              </div>

              {/* CTA */}
              <PricingCTA
                plan={tier.planId as PlanType}
                interval={isAnnual ? 'annual' : 'monthly'}
                className="mb-8"
              />

              {/* Features */}
              <div className="space-y-3">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-mint-500 shrink-0 mt-0.5" />
                    <span className="text-gray-600 text-sm">{feature}</span>
                  </div>
                ))}
                {tier.notIncluded?.map((feature) => (
                  <div key={feature} className="flex items-start gap-3 opacity-50">
                    <X className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-400 text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap items-center justify-center gap-6 mb-16">
        {trustBadges.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl">
            <Icon className="w-5 h-5 text-theme-primary-500" />
            <span className="text-sm font-medium text-gray-700">{label}</span>
          </div>
        ))}
      </div>

      {/* Testimonial */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-2xl mx-auto mb-16"
      >
        <div className="bg-white rounded-3xl p-8 text-center border border-gray-200 shadow-soft">
          {/* Stars */}
          <div className="flex items-center justify-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star key={`star-${n}`} className="w-5 h-5 text-sunshine-500 fill-current" />
            ))}
          </div>

          {/* Quote */}
          <blockquote className="text-lg text-gray-700 mb-4 italic">
            &quot;{t('pricing.testimonial.quote')}&quot;
          </blockquote>

          {/* Author */}
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-theme-primary-200 rounded-full flex items-center justify-center font-bold text-theme-primary-700">
              {t('pricing.testimonial.initials')}
            </div>
            <div className="text-left">
              <div className="font-semibold text-gray-900">{t('pricing.testimonial.author')}</div>
              <div className="text-sm text-gray-500">{t('pricing.testimonial.detail')}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* FAQ Section */}
      <div className="max-w-2xl mx-auto">
        <h3 className="font-display text-2xl font-bold text-center text-gray-900 mb-8">
          {t('pricing.faqHeading')}
        </h3>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <motion.div
              key={faq.question}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
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

      {/* Money Back Guarantee */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-12 text-center"
      >
        <div className="inline-flex items-center gap-3 px-6 py-4 bg-mint-50 border border-mint-200 rounded-2xl">
          <div className="w-12 h-12 bg-mint-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-mint-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-900">{t('pricing.moneyBack.heading')}</div>
            <div className="text-sm text-gray-600">
              {t('pricing.moneyBack.description')}
            </div>
          </div>
        </div>
      </motion.div>
    </Section>
  );
}
