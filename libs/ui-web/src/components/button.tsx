'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  loading?: boolean;
  asChild?: boolean;
  /** Enable grade-appropriate hover animations */
  animated?: boolean;
}

/**
 * Theme-aware Button component
 *
 * Adapts styling based on the current grade theme:
 * - K5 (Explorer): Pill-shaped with bouncy animations and larger touch targets
 * - MS (Navigator): Rounded with subtle animations
 * - HS (Scholar): Sharp corners with professional minimal animations
 *
 * Uses CSS custom properties from the grade theme system for dynamic styling.
 */
export function Button({
  className,
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  asChild: _asChild,
  animated = true,
  type = 'button',
  disabled,
  ...props
}: Readonly<ButtonProps>) {
  const variantClass: Record<ButtonVariant, string> = {
    primary: cn(
      'bg-primary text-on-primary shadow-soft',
      'hover:bg-primary-hover hover:shadow-[var(--shadow-card-hover)]',
      animated && 'hover:scale-[var(--hover-scale,1.02)] active:scale-[var(--press-scale,0.98)]'
    ),
    secondary: cn(
      'bg-surface text-text border border-border shadow-soft',
      'hover:bg-surface-muted hover:border-border-muted',
      animated && 'hover:scale-[var(--hover-scale,1.02)] active:scale-[var(--press-scale,0.98)]'
    ),
    ghost: cn(
      'bg-transparent text-text border border-transparent',
      'hover:bg-surface-muted',
      animated && 'hover:scale-[var(--hover-scale,1.02)] active:scale-[var(--press-scale,0.98)]'
    ),
    outline: cn(
      'bg-transparent text-text border border-border',
      'hover:bg-surface-muted hover:border-primary',
      animated && 'hover:scale-[var(--hover-scale,1.02)] active:scale-[var(--press-scale,0.98)]'
    ),
    destructive: cn(
      'bg-error text-white shadow-soft',
      'hover:bg-error/90',
      animated && 'hover:scale-[var(--hover-scale,1.02)] active:scale-[var(--press-scale,0.98)]'
    ),
    success: cn(
      'bg-success text-white shadow-soft',
      'hover:bg-success/90',
      animated && 'hover:scale-[var(--hover-scale,1.02)] active:scale-[var(--press-scale,0.98)]'
    ),
  };

  const sizeClass: Record<ButtonSize, string> = {
    sm: 'min-h-[var(--touch-target-min,36px)] px-[12px] py-[6px] text-label gap-1.5',
    md: 'min-h-[var(--touch-target-min,44px)] px-[var(--space-4,16px)] py-[var(--space-2,8px)] text-body gap-2',
    lg: 'min-h-[var(--touch-target-min,52px)] px-[var(--space-6,24px)] py-[var(--space-3,12px)] text-title gap-2.5',
    icon: 'min-h-[var(--touch-target-min,44px)] min-w-[var(--touch-target-min,44px)] p-2 aspect-square',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        // Base styles
        'inline-flex items-center justify-center font-semibold',
        // Theme-aware border radius
        'rounded-[var(--radius-button,8px)]',
        // Theme-aware transitions
        'transition-all duration-[var(--animation-duration,150ms)] ease-[var(--animation-easing)]',
        // Focus styles
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
        'focus-visible:outline-[rgb(var(--color-focus))]',
        // Disabled styles
        'disabled:cursor-not-allowed disabled:opacity-60 disabled:transform-none',
        // Variant and size classes
        variantClass[variant],
        sizeClass[size],
        className
      )}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin"
          style={{ width: 'var(--icon-size, 16px)', height: 'var(--icon-size, 16px)' }}
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
