'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProgressRingProps extends HTMLAttributes<HTMLDivElement> {
  /** Progress value between 0 and 100 */
  value: number;
  /** Ring size in px */
  size?: number;
  /** Stroke width in px */
  strokeWidth?: number;
  /** Ring color */
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
  /** Show percentage text in the center */
  showValue?: boolean;
  /** Custom center label (overrides percentage) */
  label?: string;
}

/* ------------------------------------------------------------------ */
/*  Color map                                                          */
/* ------------------------------------------------------------------ */

const strokeColors: Record<NonNullable<ProgressRingProps['color']>, string> = {
  indigo: 'stroke-indigo-600',
  emerald: 'stroke-emerald-500',
  amber: 'stroke-amber-500',
  rose: 'stroke-rose-500',
  sky: 'stroke-sky-500',
};

const textColors: Record<NonNullable<ProgressRingProps['color']>, string> = {
  indigo: 'text-indigo-700',
  emerald: 'text-emerald-700',
  amber: 'text-amber-700',
  rose: 'text-rose-700',
  sky: 'text-sky-700',
};

/* ------------------------------------------------------------------ */
/*  ProgressRing                                                       */
/* ------------------------------------------------------------------ */

/**
 * Circular SVG progress indicator with optional center label.
 *
 * Works as a controlled component — pass `value` (0–100).
 */
export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  color = 'indigo',
  showValue = true,
  label,
  className,
  ...props
}: Readonly<ProgressRingProps>) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const center = size / 2;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        {/* Background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-100"
        />
        {/* Progress arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-[stroke-dashoffset] duration-500 ease-out', strokeColors[color])}
        />
      </svg>

      {/* Center label */}
      {(showValue || label) && (
        <span
          className={cn(
            'absolute text-center font-semibold leading-none',
            textColors[color],
            size <= 56 ? 'text-xs' : size <= 80 ? 'text-sm' : 'text-base'
          )}
        >
          {label ?? `${Math.round(clamped)}%`}
        </span>
      )}
    </div>
  );
}
