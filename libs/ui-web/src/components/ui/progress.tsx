import * as React from 'react';

import { cn } from '../../utils/cn';

export type ProgressVariant = 'default' | 'gradient' | 'striped' | 'animated';
export type ProgressSize = 'sm' | 'md' | 'lg';
export type ProgressColor = 'primary' | 'success' | 'warning' | 'error' | 'info';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current progress value */
  value?: number;
  /** Maximum value */
  max?: number;
  /** Visual variant of the progress bar */
  variant?: ProgressVariant;
  /** Size of the progress bar */
  size?: ProgressSize;
  /** Color theme */
  color?: ProgressColor;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label */
  label?: string;
  /** Enable celebration animation when complete (100%) */
  celebrateOnComplete?: boolean;
}

/**
 * Theme-aware Progress component
 *
 * Adapts styling based on the current grade theme:
 * - K5 (Explorer): Animated/striped style, bouncy animations, celebration effects
 * - MS (Navigator): Gradient style, subtle animations
 * - HS (Scholar): Simple style, minimal animations
 *
 * Uses CSS custom properties from the grade theme system.
 */
export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      variant = 'default',
      size = 'md',
      color = 'primary',
      showLabel = false,
      label,
      celebrateOnComplete = false,
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const isComplete = percentage >= 100;

    const sizeClasses: Record<ProgressSize, string> = {
      sm: 'h-2',
      md: 'h-3',
      lg: 'h-4',
    };

    const colorClasses: Record<ProgressColor, string> = {
      primary: 'bg-primary',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
      info: 'bg-info',
    };

    const trackColorClasses: Record<ProgressColor, string> = {
      primary: 'bg-primary/20',
      success: 'bg-success/20',
      warning: 'bg-warning/20',
      error: 'bg-error/20',
      info: 'bg-info/20',
    };

    const getVariantClasses = () => {
      switch (variant) {
        case 'gradient':
          return cn(
            colorClasses[color],
            color === 'primary' && 'bg-gradient-to-r from-primary via-accent to-secondary',
            color === 'success' && 'bg-gradient-to-r from-success via-success/80 to-success/60'
          );
        case 'striped':
          return cn(
            colorClasses[color],
            'bg-[length:1rem_1rem]',
            'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]'
          );
        case 'animated':
          return cn(
            colorClasses[color],
            'bg-[length:1rem_1rem]',
            'bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent)]',
            'animate-[progress-stripes_1s_linear_infinite]'
          );
        default:
          return colorClasses[color];
      }
    };

    return (
      <div className={cn('w-full', className)}>
        {(showLabel || label) && (
          <div className="flex justify-between mb-1">
            <span className="text-label text-text">{label}</span>
            {showLabel && (
              <span className="text-label text-text-muted">{Math.round(percentage)}%</span>
            )}
          </div>
        )}
        <div
          ref={ref}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-label={label ?? `Progress: ${Math.round(percentage)}%`}
          className={cn(
            'relative w-full overflow-hidden',
            'rounded-[var(--radius-button,8px)]',
            trackColorClasses[color],
            sizeClasses[size],
            // Celebration animation
            isComplete && celebrateOnComplete && 'animate-[progress-complete_0.5s_ease-out]'
          )}
          {...props}
        >
          <div
            className={cn(
              'h-full rounded-[var(--radius-button,8px)]',
              'transition-all duration-[var(--animation-duration,300ms)] ease-[var(--animation-easing)]',
              getVariantClasses(),
              // Bounce effect on progress increase
              'origin-left'
            )}
            style={{ width: `${percentage}%` }}
          />
          {/* Shine effect for animated variant */}
          {variant === 'animated' && percentage < 100 && (
            <div
              className="absolute inset-0 overflow-hidden rounded-[var(--radius-button,8px)]"
              style={{ width: `${percentage}%` }}
            >
              <div className="absolute inset-0 animate-[progress-shine_2s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          )}
        </div>
      </div>
    );
  }
);
Progress.displayName = 'Progress';

/**
 * Add these keyframes to your global CSS or Tailwind config:
 *
 * @keyframes progress-stripes {
 *   0% { background-position: 1rem 0; }
 *   100% { background-position: 0 0; }
 * }
 *
 * @keyframes progress-shine {
 *   0% { transform: translateX(-100%); }
 *   100% { transform: translateX(100%); }
 * }
 *
 * @keyframes progress-complete {
 *   0%, 100% { transform: scale(1); }
 *   50% { transform: scale(1.02); }
 * }
 */
