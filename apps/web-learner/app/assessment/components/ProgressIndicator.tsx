'use client';

import { motion } from 'framer-motion';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  subject?: string;
}

const SUBJECT_COLORS: Record<string, string> = {
  math: 'from-blue-400 to-blue-600',
  reading: 'from-purple-400 to-purple-600',
  science: 'from-green-400 to-green-600',
  writing: 'from-orange-400 to-orange-600',
  default: 'from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)]',
};

const SUBJECT_EMOJIS: Record<string, string> = {
  math: '🔢',
  reading: '📚',
  science: '🔬',
  writing: '✍️',
  default: '📖',
};

export function ProgressIndicator({ current, total, subject }: ProgressIndicatorProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;
  const colorClass = subject ? SUBJECT_COLORS[subject] || SUBJECT_COLORS.default : SUBJECT_COLORS.default;
  const emoji = subject ? SUBJECT_EMOJIS[subject] || SUBJECT_EMOJIS.default : SUBJECT_EMOJIS.default;

  return (
    <div className="w-full">
      {/* Subject badge and progress text */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {subject && (
            <span
              className={`px-3 py-1 bg-gradient-to-r ${colorClass} text-white rounded-full text-sm font-medium flex items-center gap-1`}
            >
              <span>{emoji}</span>
              <span className="capitalize">{subject}</span>
            </span>
          )}
        </div>
        <div className="text-sm text-[var(--aivo-neutral-500)]">
          <span className="font-bold text-[var(--aivo-brand-navy)]">{current}</span>
          <span> of </span>
          <span className="font-bold text-[var(--aivo-brand-navy)]">{total}</span>
          <span> questions</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-[var(--aivo-neutral-100)] rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${colorClass} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* Milestone markers */}
      <div className="relative h-2 mt-1">
        {[25, 50, 75].map((milestone) => (
          <div
            key={milestone}
            className={`absolute w-1 h-2 rounded-full transition-colors ${
              progress >= milestone ? 'bg-[var(--aivo-teal-400)]' : 'bg-[var(--aivo-neutral-300)]'
            }`}
            style={{ left: `${milestone}%`, transform: 'translateX(-50%)' }}
          />
        ))}
      </div>
    </div>
  );
}
