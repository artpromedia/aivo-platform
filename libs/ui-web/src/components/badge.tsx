'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '../utils/cn';

export type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';
export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: BadgeVariant;
}

// Map variant to tone for backward compatibility
function variantToTone(variant: BadgeVariant): BadgeTone {
  switch (variant) {
    case 'primary':
    case 'default':
      return 'info';
    case 'secondary':
      return 'neutral';
    case 'destructive':
      return 'error';
    case 'outline':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export function Badge({ tone, variant, className, children, ...props }: BadgeProps) {
  // variant takes precedence if provided, otherwise use tone
  const effectiveTone = variant ? variantToTone(variant) : (tone ?? 'neutral');

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
        toneClass[effectiveTone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
