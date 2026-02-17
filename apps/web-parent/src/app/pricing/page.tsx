'use client';

import {
  Check,
  Sparkles,
  BookOpen,
  Brain,
  Mic,
  FlaskConical,
  ArrowRight,
  Loader2,
  Shield,
  Star,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState, useCallback } from 'react';

import { useSubscription, useCreateCheckout } from '@/hooks';

// ============================================================================
// SKU Catalog (mirrors @aivo/billing-common SkuConfig at build time)
// ============================================================================

interface PlanConfig {
  sku: string;
  name: string;
  description: string;
  monthlyPrice: number; // dollars
  yearlyPrice: number; // dollars
  isBase: boolean;
  trialDays: number;
  features: string[];
  icon: React.ReactNode;
  highlight?: boolean;
}

const BASE_PLAN: PlanConfig = {
  sku: 'BASE',
  name: 'Aivo Base',
  description: 'Core ELA & Math foundation with progress tracking and parent reports',
  monthlyPrice: 19.99,
  yearlyPrice: 199.99,
  isBase: true,
  trialDays: 0,
  features: [
    'Full ELA curriculum',
    'Full Math curriculum',
    'Parent dashboard & reports',
    'Progress tracking',
    'Teacher communication',
    'IEP goal monitoring',
  ],
  icon: <BookOpen className="w-6 h-6" />,
  highlight: true,
};

const ADDON_PLANS: PlanConfig[] = [
  {
    sku: 'ADDON_SEL',
    name: 'Social-Emotional Learning',
    description: 'Build emotional intelligence, self-awareness, and social skills',
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    isBase: false,
    trialDays: 30,
    features: [
      'SEL curriculum modules',
      'Mood tracking & check-ins',
      'Mindfulness exercises',
      'Social skills activities',
    ],
    icon: <Brain className="w-6 h-6" />,
  },
  {
    sku: 'ADDON_SPEECH',
    name: 'Speech & Language',
    description: 'AI-powered speech therapy and language development',
    monthlyPrice: 9.99,
    yearlyPrice: 99.99,
    isBase: false,
    trialDays: 30,
    features: [
      'Speech therapy exercises',
      'AI pronunciation feedback',
      'Language development games',
      'Progress reports for SLPs',
    ],
    icon: <Mic className="w-6 h-6" />,
  },
  {
    sku: 'ADDON_SCIENCE',
    name: 'Science Curriculum',
    description: 'Interactive experiments and STEM learning modules',
    monthlyPrice: 8.99,
    yearlyPrice: 89.99,
    isBase: false,
    trialDays: 30,
    features: [
      'Science curriculum',
      'Virtual lab experiments',
      'STEM project builder',
      'Science progress tracking',
    ],
    icon: <FlaskConical className="w-6 h-6" />,
  },
];

// ============================================================================
// Sub-Components
// ============================================================================

function BillingToggle({
  period,
  onChange,
}: {
  period: 'monthly' | 'yearly';
  onChange: (p: 'monthly' | 'yearly') => void;
}) {
  return (
    <div className="flex items-center justify-center gap-3">
      <span
        className={`text-sm font-medium ${period === 'monthly' ? 'text-gray-900' : 'text-gray-500'}`}
      >
        Monthly
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={period === 'yearly'}
        aria-label="Toggle yearly billing"
        onClick={() => {
          onChange(period === 'monthly' ? 'yearly' : 'monthly');
        }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
          period === 'yearly' ? 'bg-indigo-600' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            period === 'yearly' ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
      <span
        className={`text-sm font-medium ${period === 'yearly' ? 'text-gray-900' : 'text-gray-500'}`}
      >
        Yearly
      </span>
      {period === 'yearly' && (
        <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
          Save ~17%
        </span>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  period,
  selected,
  onSelect,
  isBase,
  hasBase,
}: {
  plan: PlanConfig;
  period: 'monthly' | 'yearly';
  selected: boolean;
  onSelect: () => void;
  isBase: boolean;
  hasBase: boolean;
}) {
  const price = period === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const monthlyEquivalent = period === 'yearly' ? (plan.yearlyPrice / 12).toFixed(2) : null;
  const disabled = !isBase && !hasBase;

  return (
    <div
      className={`relative rounded-2xl border-2 p-6 transition-all ${
        selected
          ? 'border-indigo-600 bg-indigo-50/50 shadow-lg ring-1 ring-indigo-600'
          : disabled
            ? 'border-gray-200 bg-gray-50 opacity-60'
            : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">
            <Star className="w-3 h-3" /> Most Popular
          </span>
        </div>
      )}

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`rounded-lg p-2 ${selected ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}
          >
            {plan.icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
            {plan.trialDays > 0 && (
              <span className="text-xs font-medium text-green-600">
                {plan.trialDays}-day free trial
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          aria-label={selected ? `Deselect ${plan.name}` : `Select ${plan.name}`}
          className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected
              ? 'border-indigo-600 bg-indigo-600 text-white'
              : disabled
                ? 'border-gray-300 cursor-not-allowed'
                : 'border-gray-300 hover:border-indigo-400'
          }`}
        >
          {selected && <Check className="w-4 h-4" />}
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

      {/* Pricing */}
      <div className="mb-4">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">${price.toFixed(2)}</span>
          <span className="text-sm text-gray-500">/{period === 'monthly' ? 'mo' : 'yr'}</span>
        </div>
        {monthlyEquivalent && (
          <p className="text-xs text-gray-500 mt-1">${monthlyEquivalent}/mo billed annually</p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 mt-0.5 text-green-500 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>

      {disabled && <p className="mt-4 text-xs text-amber-600 font-medium">Requires Base plan</p>}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function PricingPage() {
  const router = useRouter();
  const { data: subscription } = useSubscription();
  const createCheckout = useCreateCheckout();

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(new Set(['BASE']));
  const [isRedirecting, setIsRedirecting] = useState(false);

  const hasBase = selectedSkus.has('BASE');
  const hasActiveSubscription =
    subscription?.status === 'active' || subscription?.status === 'trialing';

  const toggleSku = useCallback((sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (sku === 'BASE') {
        if (next.has('BASE')) {
          // Remove base + all add-ons
          next.clear();
        } else {
          next.add('BASE');
        }
      } else {
        if (!next.has('BASE')) return prev; // Can't select add-on without base
        if (next.has(sku)) {
          next.delete(sku);
        } else {
          next.add(sku);
        }
      }
      return next;
    });
  }, []);

  // Calculate total
  const allPlans = [BASE_PLAN, ...ADDON_PLANS];
  const selectedPlans = allPlans.filter((p) => selectedSkus.has(p.sku));
  const totalMonthly = selectedPlans.reduce((sum, p) => sum + p.monthlyPrice, 0);
  const totalYearly = selectedPlans.reduce((sum, p) => sum + p.yearlyPrice, 0);
  const displayTotal = billingPeriod === 'monthly' ? totalMonthly : totalYearly;

  const handleSubscribe = async () => {
    if (selectedSkus.size === 0) return;
    setIsRedirecting(true);

    try {
      const result = await createCheckout.mutateAsync({
        planId: Array.from(selectedSkus).join(','),
        billingPeriod: billingPeriod === 'monthly' ? 'MONTHLY' : 'YEARLY',
      });

      if (result.url) {
        window.location.href = result.url;
      } else if (result.sessionId) {
        // Stripe.js redirect (fallback)
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY || '');
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId: result.sessionId });
        }
      }
    } catch {
      setIsRedirecting(false);
    }
  };

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="pt-16 pb-10 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-1.5 mb-6">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-700">
              Personalized learning for every child
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Choose the right plan
            <br />
            for your family
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto mb-8">
            Start with ELA &amp; Math, then add specialized modules as your child grows. All add-ons
            include a 30-day free trial.
          </p>

          <BillingToggle period={billingPeriod} onChange={setBillingPeriod} />
        </div>
      </section>

      {/* Plans Grid */}
      <section className="max-w-6xl mx-auto px-4 pb-8">
        {/* Base Plan */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Foundation Plan
          </h2>
          <div className="max-w-lg">
            <PlanCard
              plan={BASE_PLAN}
              period={billingPeriod}
              selected={selectedSkus.has('BASE')}
              onSelect={() => {
                toggleSku('BASE');
              }}
              isBase={true}
              hasBase={hasBase}
            />
          </div>
        </div>

        {/* Add-on Plans */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-4">
            Add-on Modules
            <span className="ml-2 text-green-600 font-normal normal-case">
              — each with 30-day free trial
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ADDON_PLANS.map((plan) => (
              <PlanCard
                key={plan.sku}
                plan={plan}
                period={billingPeriod}
                selected={selectedSkus.has(plan.sku)}
                onSelect={() => {
                  toggleSku(plan.sku);
                }}
                isBase={false}
                hasBase={hasBase}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Sticky Bottom Bar */}
      <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 py-4 px-4 z-10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600">
              {selectedPlans.length === 0
                ? 'Select a plan to get started'
                : `${selectedPlans.length} plan${selectedPlans.length > 1 ? 's' : ''} selected`}
            </p>
            {selectedPlans.length > 0 && (
              <p className="text-2xl font-bold text-gray-900">
                ${displayTotal.toFixed(2)}
                <span className="text-sm font-normal text-gray-500">
                  /{billingPeriod === 'monthly' ? 'mo' : 'yr'}
                </span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            {hasActiveSubscription && (
              <button
                type="button"
                onClick={() => {
                  router.push('/billing');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Manage Existing Plan
              </button>
            )}

            <button
              type="button"
              onClick={handleSubscribe}
              disabled={selectedSkus.size === 0 || isRedirecting || createCheckout.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRedirecting || createCheckout.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to checkout…
                </>
              ) : (
                <>
                  Subscribe Now
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <section className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-green-600" />
          <span className="text-sm font-medium text-green-700">
            FERPA compliant • AES-256 encryption • SOC 2 Type II
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Cancel anytime. No hidden fees. Your data is protected by industry-leading security
          standards.
        </p>
      </section>
    </main>
  );
}
