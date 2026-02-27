'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  BookOpen,
  Calculator,
  Globe,
  PenTool,
  Code,
  Check,
  Star,
  Clock,
  MessageSquare,
  Volume2,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react';

import { TutorAddonCard } from './components/tutor-addon-card';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface TutorAddon {
  id: string;
  sku: string;
  name: string;
  persona: string;
  subject: string;
  description: string;
  priceCents: number;
  features: string[];
  isActive: boolean;
  trialEndsAt?: string;
}

interface ActiveSubscription {
  id: string;
  planSku: string;
  planName: string;
  status: string;
  trialEndsAt?: string;
  currentPeriodEnd: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Data
// ═══════════════════════════════════════════════════════════════════════════════

const TUTOR_ADDONS: TutorAddon[] = [
  {
    id: 'ADDON_TUTOR_MATH_MONTHLY',
    sku: 'ADDON_TUTOR_MATH_MONTHLY',
    name: 'Nova — Math Tutor',
    persona: 'nova-math',
    subject: 'MATH',
    description: 'A curious space explorer who makes math feel like an adventure through the cosmos.',
    priceCents: 999,
    features: ['Unlimited sessions', 'Animated avatar', 'Voice tutoring', 'Progress tracking'],
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_ELA_MONTHLY',
    sku: 'ADDON_TUTOR_ELA_MONTHLY',
    name: 'Sage — Reading & Writing Tutor',
    persona: 'sage-ela',
    subject: 'ELA',
    description: 'A wise storyteller who brings reading and writing to life through imagination.',
    priceCents: 999,
    features: ['Unlimited sessions', 'Animated avatar', 'Voice tutoring', 'Progress tracking'],
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_SCIENCE_MONTHLY',
    sku: 'ADDON_TUTOR_SCIENCE_MONTHLY',
    name: 'Spark — Science Tutor',
    persona: 'spark-science',
    subject: 'SCIENCE',
    description: 'An energetic inventor who turns science into exciting experiments and discoveries.',
    priceCents: 999,
    features: ['Unlimited sessions', 'Animated avatar', 'Voice tutoring', 'Progress tracking'],
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_HISTORY_MONTHLY',
    sku: 'ADDON_TUTOR_HISTORY_MONTHLY',
    name: 'Chrono — History Tutor',
    persona: 'chrono-history',
    subject: 'HISTORY',
    description: 'A time-traveling explorer who makes history come alive with vivid stories.',
    priceCents: 999,
    features: ['Unlimited sessions', 'Animated avatar', 'Voice tutoring', 'Progress tracking'],
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_CODING_MONTHLY',
    sku: 'ADDON_TUTOR_CODING_MONTHLY',
    name: 'Pixel — Coding Tutor',
    persona: 'pixel-coding',
    subject: 'CODING',
    description: 'A friendly robot who teaches coding through games, puzzles, and creative projects.',
    priceCents: 1499,
    features: ['Unlimited sessions', 'Animated avatar', 'Voice tutoring', 'Progress tracking'],
    isActive: false,
  },
];

const BUNDLE = {
  id: 'ADDON_TUTOR_BUNDLE_MONTHLY',
  sku: 'ADDON_TUTOR_BUNDLE_MONTHLY',
  name: 'AI Tutor Bundle — All Subjects',
  description: 'Get all 5 AI tutors at a fraction of the cost. Math, ELA, Science, History, and Coding included.',
  priceCents: 2999,
  individualTotalCents: 4996, // 4 * 999 + 1499
  trialDays: 14,
};

const BILLING_API = '/api/billing';

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function TutorMarketplacePage() {
  const [addons, setAddons] = useState<TutorAddon[]>(TUTOR_ADDONS);
  const [activeSubscriptions, setActiveSubscriptions] = useState<ActiveSubscription[]>([]);
  const [hasBundleActive, setHasBundleActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await fetch(`${BILLING_API}/subscriptions`);
      if (res.ok) {
        const data = (await res.json()) as { subscriptions: ActiveSubscription[] };
        const tutorSubs = data.subscriptions.filter((s) =>
          s.planSku.startsWith('ADDON_TUTOR'),
        );
        setActiveSubscriptions(tutorSubs);

        // Mark active addons
        const activeSkus = new Set(tutorSubs.map((s) => s.planSku));
        const bundleActive = activeSkus.has('ADDON_TUTOR_BUNDLE_MONTHLY');
        setHasBundleActive(bundleActive);

        setAddons((prev) =>
          prev.map((addon) => ({
            ...addon,
            isActive: activeSkus.has(addon.sku) || bundleActive,
            trialEndsAt: tutorSubs.find((s) => s.planSku === addon.sku)?.trialEndsAt,
          })),
        );
      }
    } catch {
      // Silently fail — static data is shown
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handlePurchase = (sku: string) => {
    window.location.href = `/billing/checkout?addon=${sku}`;
  };

  const handleBundlePurchase = () => {
    window.location.href = `/billing/checkout?addon=${BUNDLE.sku}`;
  };

  const savingsPercent = Math.round(
    ((BUNDLE.individualTotalCents - BUNDLE.priceCents) / BUNDLE.individualTotalCents) * 100,
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Hero Section */}
      <div className="mb-10 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-violet-700 p-8 text-white">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/20 p-3">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">AI Tutors</h1>
            <p className="text-lg text-indigo-100 max-w-2xl">
              Expert tutoring for every subject at a fraction of the cost. Each AI tutor uses
              age-appropriate teaching methods, adapts to your child's level, and makes learning fun.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
                <Shield className="h-4 w-4" /> COPPA compliant
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
                <Volume2 className="h-4 w-4" /> Voice-enabled
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
                <TrendingUp className="h-4 w-4" /> Progress tracking
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5">
                <Zap className="h-4 w-4" /> Adaptive learning
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Subscriptions */}
      {activeSubscriptions.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Your Active Tutors</h2>
          <div className="space-y-2">
            {activeSubscriptions.map((sub) => (
              <div
                key={sub.id}
                className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-100 p-2">
                    <Check className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{sub.planName}</p>
                    <p className="text-xs text-gray-500">
                      {sub.status === 'IN_TRIAL' && sub.trialEndsAt
                        ? `Trial ends ${new Date(sub.trialEndsAt).toLocaleDateString()}`
                        : `Renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <a
                  href="/billing"
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Manage
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bundle Offer */}
      <div className="mb-8 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{BUNDLE.name}</h2>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Save {savingsPercent}%
              </span>
            </div>
            <p className="text-gray-600 mb-2">{BUNDLE.description}</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-500" /> {BUNDLE.trialDays}-day free trial
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Cancel anytime
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-baseline gap-2 justify-end">
              <span className="text-sm text-gray-400 line-through">
                ${(BUNDLE.individualTotalCents / 100).toFixed(2)}
              </span>
              <p className="text-2xl font-bold text-gray-900">
                ${(BUNDLE.priceCents / 100).toFixed(2)}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
            </div>
            <button
              onClick={handleBundlePurchase}
              disabled={hasBundleActive}
              className="mt-2 rounded-xl bg-indigo-600 px-6 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {hasBundleActive ? (
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4" /> Active
                </span>
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Individual Tutors */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Individual Tutors</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {addons.map((addon) => (
          <TutorAddonCard
            key={addon.id}
            addon={addon}
            onPurchase={() => handlePurchase(addon.sku)}
          />
        ))}
      </div>

      {/* Session History Link */}
      <div className="mt-10 rounded-xl border border-gray-100 bg-white p-6 text-center">
        <MessageSquare className="mx-auto h-8 w-8 text-indigo-400 mb-2" />
        <h3 className="font-semibold text-gray-900 mb-1">Session Reports</h3>
        <p className="text-sm text-gray-500 mb-3">
          View your child's tutoring session history, progress, and insights.
        </p>
        <a
          href="/tutors/sessions"
          className="inline-block rounded-lg bg-indigo-50 px-5 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
        >
          View Session History
        </a>
      </div>
    </div>
  );
}
