'use client';

import { cn } from '../../utils';
import type { GameBreakProps } from './types';

/**
 * GameBreak Component
 *
 * Displays a fun break activity between assessment domains.
 */
export function GameBreak({
  activity,
  countdown,
  message,
  onSkip,
  className,
}: GameBreakProps) {
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - countdown / activity.duration);

  return (
    <div
      className={cn(
        'rounded-3xl border-2 border-[var(--aivo-teal-100)] bg-white p-8 text-center shadow-xl',
        className
      )}
    >
      <div className="mx-auto mb-6 flex h-32 w-32 animate-bounce items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg">
        <span className="text-7xl">{activity.emoji}</span>
      </div>
      <h2 className="mb-4 text-3xl font-bold text-[var(--aivo-brand-navy)]">
        {activity.title}
      </h2>
      <p className="mb-6 text-xl text-[var(--aivo-neutral-600)]">
        {activity.instruction}
      </p>

      {/* Countdown circle */}
      <div className="relative mx-auto mb-6 h-24 w-24">
        <svg className="h-24 w-24 -rotate-90 transform">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="var(--aivo-neutral-200)"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="var(--aivo-brand-primary)"
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[var(--aivo-brand-primary)]">
          {countdown}
        </span>
      </div>

      <button
        onClick={onSkip}
        className="text-sm text-[var(--aivo-neutral-500)] hover:text-[var(--aivo-brand-primary)]"
      >
        Skip break →
      </button>

      {message && (
        <div className="mt-6 rounded-2xl bg-[var(--aivo-teal-50)] p-4">
          <p className="font-medium text-[var(--aivo-teal-700)]">{message}</p>
        </div>
      )}
    </div>
  );
}
