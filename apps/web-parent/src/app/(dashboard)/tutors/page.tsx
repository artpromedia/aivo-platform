'use client';

import { useState, useEffect } from 'react';
import { Sparkles, BookOpen, Calculator, Globe, PenTool, Code, Check } from 'lucide-react';

import { TutorAddonCard } from './components/tutor-addon-card';

interface TutorAddon {
  id: string;
  name: string;
  persona: string;
  subject: string;
  description: string;
  priceCents: number;
  isActive: boolean;
}

const TUTOR_ADDONS: TutorAddon[] = [
  {
    id: 'ADDON_TUTOR_MATH',
    name: 'Nova - Math Tutor',
    persona: 'nova-math',
    subject: 'MATH',
    description: 'A curious space explorer who makes math feel like an adventure through the cosmos.',
    priceCents: 499,
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_ELA',
    name: 'Sage - ELA Tutor',
    persona: 'sage-ela',
    subject: 'ELA',
    description: 'A wise storyteller who brings reading and writing to life through imagination.',
    priceCents: 499,
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_SCIENCE',
    name: 'Spark - Science Tutor',
    persona: 'spark-science',
    subject: 'SCIENCE',
    description: 'An energetic inventor who turns science into exciting experiments and discoveries.',
    priceCents: 499,
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_HISTORY',
    name: 'Chrono - History Tutor',
    persona: 'chrono-history',
    subject: 'HISTORY',
    description: 'A time-traveling explorer who makes history come alive with vivid stories.',
    priceCents: 499,
    isActive: false,
  },
  {
    id: 'ADDON_TUTOR_CODING',
    name: 'Pixel - Coding Tutor',
    persona: 'pixel-coding',
    subject: 'CODING',
    description: 'A friendly robot who teaches coding through games, puzzles, and creative projects.',
    priceCents: 499,
    isActive: false,
  },
];

const BUNDLE = {
  id: 'ADDON_TUTOR_BUNDLE',
  name: 'All Tutors Bundle',
  description: 'Get all 5 AI tutors at a discounted price! Math, ELA, Science, History, and Coding.',
  priceCents: 1499,
  savingsCents: 996,
};

export default function TutorMarketplacePage() {
  const [addons, setAddons] = useState<TutorAddon[]>(TUTOR_ADDONS);
  const [hasBundleActive, setHasBundleActive] = useState(false);

  const handlePurchase = (addonId: string) => {
    // In production, this would redirect to the billing/checkout flow
    window.location.href = `/billing/checkout?addon=${addonId}`;
  };

  const handleBundlePurchase = () => {
    window.location.href = `/billing/checkout?addon=${BUNDLE.id}`;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="rounded-full bg-indigo-100 p-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">AI Tutors</h1>
        </div>
        <p className="text-gray-600">
          Add AI-powered tutors to your child's learning experience. Each tutor specializes in a
          subject and uses age-appropriate teaching methods.
        </p>
      </div>

      {/* Bundle offer */}
      <div className="mb-8 rounded-2xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{BUNDLE.name}</h2>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Save ${(BUNDLE.savingsCents / 100).toFixed(2)}/mo
              </span>
            </div>
            <p className="text-gray-600">{BUNDLE.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">
              ${(BUNDLE.priceCents / 100).toFixed(2)}
              <span className="text-sm font-normal text-gray-500">/month</span>
            </p>
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
                'Get All Tutors'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Individual tutors */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Individual Tutors</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {addons.map((addon) => (
          <TutorAddonCard
            key={addon.id}
            addon={addon}
            onPurchase={() => handlePurchase(addon.id)}
          />
        ))}
      </div>

      {/* Link to sessions */}
      <div className="mt-8 text-center">
        <a
          href="/tutors/sessions"
          className="text-sm text-indigo-600 hover:text-indigo-700 underline"
        >
          View your child's tutor session history
        </a>
      </div>
    </div>
  );
}
