'use client';

import { cn } from '../../utils';
import type { ProgressIndicatorProps } from './types';

/**
 * ProgressIndicator Component
 *
 * A progress bar with optional label and percentage display.
 */
export function ProgressIndicator({
  progress,
  label,
  size = 'md',
  showPercentage = true,
  className,
}: ProgressIndicatorProps) {
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="mb-1 flex justify-between text-sm text-[var(--aivo-neutral-500)]">
          {label && <span>{label}</span>}
          {showPercentage && <span>{Math.round(progress)}% complete</span>}
        </div>
      )}
      <div
        className={cn(
          'rounded-full bg-[var(--aivo-purple-100)] overflow-hidden',
          sizeClasses[size]
        )}
      >
        <div
          className="h-full bg-gradient-to-r from-[var(--aivo-teal-400)] to-[var(--aivo-brand-primary)] transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
