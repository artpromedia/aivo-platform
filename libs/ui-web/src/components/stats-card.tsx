'use client';

import type { ReactNode, HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type TrendDirection = 'up' | 'down' | 'neutral';

export interface StatsCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Main statistic value */
  value: string | number;
  /** Descriptive label */
  label: string;
  /** Icon element (24×24 recommended) */
  icon?: ReactNode;
  /** Trend percentage (e.g., 12.5) */
  trend?: number;
  /** Trend direction override — defaults to auto based on trend sign */
  trendDirection?: TrendDirection;
  /** Trend comparison label (e.g., "vs last month") */
  trendLabel?: string;
  /** Visual color accent */
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

/* ------------------------------------------------------------------ */
/*  Colors                                                             */
/* ------------------------------------------------------------------ */

const iconBg: Record<NonNullable<StatsCardProps['color']>, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  sky: 'bg-sky-50 text-sky-600',
  slate: 'bg-slate-100 text-slate-600',
};

const trendColors: Record<TrendDirection, string> = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  neutral: 'text-slate-500',
};

/* ------------------------------------------------------------------ */
/*  Trend Arrow                                                        */
/* ------------------------------------------------------------------ */

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'neutral') return null;
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(direction === 'down' && 'rotate-180')}
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  StatsCard                                                          */
/* ------------------------------------------------------------------ */

/**
 * Dashboard statistics card.
 *
 * Displays a key metric with optional icon, trend indicator, and accent color.
 */
export function StatsCard({
  value,
  label,
  icon,
  trend,
  trendDirection,
  trendLabel,
  color = 'indigo',
  className,
  ...props
}: Readonly<StatsCardProps>) {
  const resolvedDirection: TrendDirection =
    trendDirection ?? (trend == null ? 'neutral' : trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral');

  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md',
        className
      )}
      {...props}
    >
      {/* Icon */}
      {icon && (
        <div className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl', iconBg[color])}>
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>

        {trend != null && (
          <div className={cn('mt-2 flex items-center gap-1 text-xs font-medium', trendColors[resolvedDirection])}>
            <TrendArrow direction={resolvedDirection} />
            <span>{Math.abs(trend)}%</span>
            {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
