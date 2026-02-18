'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SkeletonVariant = 'text' | 'circular' | 'rectangular' | 'card';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width (CSS value or Tailwind class) */
  width?: string | number;
  /** Height (CSS value or Tailwind class) */
  height?: string | number;
  /** Number of text lines to render (only for variant="text") */
  lines?: number;
  /** Whether to animate */
  animate?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

/**
 * Skeleton loading placeholder with card, text, circular, and rectangular variants.
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 3,
  animate = true,
  className,
  style,
  ...props
}: Readonly<SkeletonProps>) {
  const base = cn('bg-slate-200', animate && 'animate-pulse');

  const inlineStyle = {
    ...style,
    ...(typeof width === 'number' ? { width: `${width}px` } : {}),
    ...(typeof height === 'number' ? { height: `${height}px` } : {}),
  };
  const widthClass = typeof width === 'string' ? width : '';
  const heightClass = typeof height === 'string' ? height : '';

  if (variant === 'circular') {
    return (
      <div
        className={cn(base, 'rounded-full', widthClass || 'h-10 w-10', className)}
        style={inlineStyle}
        aria-hidden
        {...props}
      />
    );
  }

  if (variant === 'rectangular') {
    return (
      <div
        className={cn(base, 'rounded-lg', widthClass || 'w-full', heightClass || 'h-24', className)}
        style={inlineStyle}
        aria-hidden
        {...props}
      />
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn('space-y-3 rounded-2xl border border-slate-100 p-4', widthClass || 'w-full', className)} style={inlineStyle} aria-hidden {...props}>
        <div className={cn(base, 'h-40 w-full rounded-xl')} />
        <div className={cn(base, 'h-4 w-3/4 rounded')} />
        <div className={cn(base, 'h-3 w-1/2 rounded')} />
        <div className="flex items-center gap-2 pt-1">
          <div className={cn(base, 'h-6 w-6 rounded-full')} />
          <div className={cn(base, 'h-3 w-24 rounded')} />
        </div>
      </div>
    );
  }

  // variant === 'text'
  return (
    <div className={cn('space-y-2', widthClass || 'w-full', className)} style={inlineStyle} aria-hidden {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={cn(base, 'h-3.5 rounded', i === lines - 1 ? 'w-3/5' : 'w-full')}
        />
      ))}
    </div>
  );
}
