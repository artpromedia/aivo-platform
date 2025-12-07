'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '../utils/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  const toneClass: Record<BadgeTone, string> = {
    neutral: 'bg-surface-muted text-text border-border',
    info: 'bg-info/10 text-info border-info/30',
    success: 'bg-success/10 text-success border-success/30',
    warning: 'bg-warning/15 text-warning border-warning/40',
    error: 'bg-error/10 text-error border-error/30',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold tracking-tight',
        toneClass[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
