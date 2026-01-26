'use client';

import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'filled';

export interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  /** Card visual variant */
  variant?: CardVariant;
  /** Enable hover effects (scale, shadow) */
  interactive?: boolean;
  /** Custom icon or emoji for the card header */
  icon?: ReactNode;
}

/**
 * Theme-aware Card component
 *
 * Adapts styling based on the current grade theme:
 * - K5 (Explorer): Large rounded corners, colorful shadows, playful
 * - MS (Navigator): Medium rounded corners, subtle shadows
 * - HS (Scholar): Small rounded corners, minimal shadows, professional
 *
 * Uses CSS custom properties from the grade theme system.
 */
export function Card({
  title,
  subtitle,
  action,
  icon,
  variant = 'default',
  interactive = false,
  className,
  children,
  ...props
}: Readonly<CardProps>) {
  const variantClasses: Record<CardVariant, string> = {
    default: cn(
      'bg-surface border border-border',
      'shadow-[var(--shadow-card)]'
    ),
    elevated: cn(
      'bg-surface-elevated border border-border-muted',
      'shadow-[var(--shadow-card)]',
      interactive && 'hover:shadow-[var(--shadow-card-hover)]'
    ),
    outlined: cn(
      'bg-transparent border-2 border-border',
      'shadow-none'
    ),
    filled: cn(
      'bg-surface-muted border border-transparent',
      'shadow-none'
    ),
  };

  return (
    <div
      className={cn(
        // Theme-aware border radius
        'rounded-[var(--radius-card,12px)]',
        // Theme-aware transitions
        'transition-all duration-[var(--animation-duration,150ms)] ease-[var(--animation-easing)]',
        // Interactive hover effects
        interactive && [
          'cursor-pointer',
          'hover:scale-[var(--hover-scale,1.02)]',
          'active:scale-[var(--press-scale,0.98)]',
        ],
        // Variant styles
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {(title || subtitle || action || icon) && (
        <div
          className={cn(
            'flex items-start justify-between gap-3 border-b border-border',
            'px-[var(--padding-card,16px)] py-[var(--space-3,12px)]'
          )}
        >
          <div className="flex items-start gap-3">
            {icon && (
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: 'var(--icon-size, 24px)',
                  height: 'var(--icon-size, 24px)',
                  fontSize: 'var(--icon-size, 24px)',
                }}
              >
                {icon}
              </div>
            )}
            <div className="space-y-1">
              {title && (
                <div className="text-title font-semibold text-text leading-[var(--line-height-title)]">
                  {title}
                </div>
              )}
              {subtitle && (
                <div className="text-label text-muted leading-[var(--line-height-label)]">
                  {subtitle}
                </div>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      <div
        className={cn(
          'p-[var(--padding-card,16px)]',
          (title || subtitle || icon) && 'pt-[var(--space-3,12px)]'
        )}
      >
        {children}
      </div>
    </div>
  );
}
