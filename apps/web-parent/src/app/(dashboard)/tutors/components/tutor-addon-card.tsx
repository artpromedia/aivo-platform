'use client';

import { Check, Calculator, BookOpen, Globe, PenTool, Code } from 'lucide-react';

const SUBJECT_ICONS: Record<string, typeof Calculator> = {
  MATH: Calculator,
  ELA: BookOpen,
  SCIENCE: Globe,
  HISTORY: PenTool,
  CODING: Code,
};

const SUBJECT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  MATH: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  ELA: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  SCIENCE: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  HISTORY: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  CODING: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
};

interface TutorAddonCardProps {
  addon: {
    id: string;
    name: string;
    persona: string;
    subject: string;
    description: string;
    priceCents: number;
    isActive: boolean;
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
          <p className="text-xs text-gray-500">{addon.subject}</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 flex-1 mb-4">{addon.description}</p>

      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-900">
          ${(addon.priceCents / 100).toFixed(2)}
          <span className="text-xs font-normal text-gray-500">/mo</span>
        </p>

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
            'Add'
          )}
        </button>
      </div>
    </div>
  );
}
