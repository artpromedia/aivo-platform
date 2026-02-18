'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface RatingStarsProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current rating value (0–5, supports halves) */
  value: number;
  /** Max stars */
  max?: number;
  /** Star size in px */
  size?: number;
  /** Allow user input */
  interactive?: boolean;
  /** Called when user selects a rating (interactive mode) */
  onChange?: (value: number) => void;
  /** Color */
  color?: 'amber' | 'indigo' | 'rose';
  /** Show numeric value beside stars */
  showValue?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Color map                                                          */
/* ------------------------------------------------------------------ */

const fillColors = {
  amber: 'text-amber-400',
  indigo: 'text-indigo-500',
  rose: 'text-rose-400',
} as const;

/* ------------------------------------------------------------------ */
/*  Star SVGs                                                          */
/* ------------------------------------------------------------------ */

function FullStar({ size, colorClass }: { size: number; colorClass: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={colorClass} aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function HalfStar({ size, colorClass }: { size: number; colorClass: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={colorClass} aria-hidden>
      <defs>
        <linearGradient id="half-grad">
          <stop offset="50%" stopColor="currentColor" />
          <stop offset="50%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill="url(#half-grad)"
        stroke="currentColor"
        strokeWidth="1"
      />
    </svg>
  );
}

function EmptyStar({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300" aria-hidden>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  RatingStars                                                        */
/* ------------------------------------------------------------------ */

/**
 * 1–5 star rating display and input.
 *
 * Supports half-star rendering and interactive mode for user input.
 */
export function RatingStars({
  value,
  max = 5,
  size = 20,
  interactive = false,
  onChange,
  color = 'amber',
  showValue = false,
  className,
  ...props
}: Readonly<RatingStarsProps>) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const displayValue = hoverValue ?? value;
  const colorClass = fillColors[color];

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', interactive && 'cursor-pointer', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`Rating: ${value} out of ${max} stars`}
      onMouseLeave={() => interactive && setHoverValue(null)}
      {...props}
    >
      {Array.from({ length: max }, (_, i) => {
        const starNumber = i + 1;
        const filled = displayValue >= starNumber;
        const half = !filled && displayValue >= starNumber - 0.5;

        const star = filled ? (
          <FullStar size={size} colorClass={colorClass} />
        ) : half ? (
          <HalfStar size={size} colorClass={colorClass} />
        ) : (
          <EmptyStar size={size} />
        );

        if (interactive) {
          return (
            <button
              key={starNumber}
              type="button"
              role="radio"
              aria-checked={value === starNumber}
              aria-label={`${starNumber} star${starNumber !== 1 ? 's' : ''}`}
              onClick={() => onChange?.(starNumber)}
              onMouseEnter={() => setHoverValue(starNumber)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              {star}
            </button>
          );
        }

        return <span key={starNumber}>{star}</span>;
      })}

      {showValue && (
        <span className="ml-1 text-sm font-medium text-slate-600">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
