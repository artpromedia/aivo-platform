'use client';

import { Check, Calculator, BookOpen, Globe, PenTool, Code, Star } from 'lucide-react';

const SUBJECT_ICONS: Record<string, typeof Calculator> = {
  MATH: Calculator,
  ELA: BookOpen,
  SCIENCE: Globe,
  HISTORY: PenTool,
  CODING: Code,
};

const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  MATH: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
  ELA: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  SCIENCE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  HISTORY: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
  CODING: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-700' },
};

interface TutorAddonCardProps {
  addon: {
    id: string;
    name: string;
    persona: string;
    subject: string;
    description: string;
    priceCents: number;
    features?: string[];
    isActive: boolean;
    trialEndsAt?: string;
  };
  onPurchase: () => void;
}

export function TutorAddonCard({ addon, onPurchase }: TutorAddonCardProps) {
  const Icon = SUBJECT_ICONS[addon.subject] ?? Calculator;
  const colors = SUBJECT_COLORS[addon.subject] ?? SUBJECT_COLORS.MATH;

  return (
    <div className={`rounded-2xl border ${colors.border} bg-white p-5 flex flex-col`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`rounded-xl ${colors.bg} p-2.5`}>
          <Icon className={`h-5 w-5 ${colors.text}`} />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{addon.name}</h3>
          <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${colors.badge}`}>
            {addon.subject}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{addon.description}</p>

      {/* Features list */}
      {addon.features && addon.features.length > 0 && (
        <ul className="mb-4 space-y-1 flex-1">
          {addon.features.map((feature) => (
            <li key={feature} className="flex items-center gap-1.5 text-xs text-gray-500">
              <Check className="h-3 w-3 text-green-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
        <div>
          <p className="font-bold text-gray-900">
            ${(addon.priceCents / 100).toFixed(2)}
            <span className="text-xs font-normal text-gray-500">/mo</span>
          </p>
          {!addon.isActive && (
            <p className="text-xs text-gray-400 flex items-center gap-0.5">
              <Star className="h-3 w-3 text-amber-400" /> 7-day free trial
            </p>
          )}
        </div>

        <button
          onClick={onPurchase}
          disabled={addon.isActive}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
            addon.isActive
              ? 'bg-green-50 text-green-700 cursor-default'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {addon.isActive ? (
            <span className="flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Active
            </span>
          ) : (
            'Start Free Trial'
          )}
        </button>
      </div>

      {/* Trial info */}
      {addon.isActive && addon.trialEndsAt && (
        <p className="mt-2 text-xs text-amber-600 text-center">
          Trial ends {new Date(addon.trialEndsAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
