'use client';

import { cn, calculateProgress } from '../../utils';
import type { AssessmentCardProps } from './types';

/**
 * AssessmentCard Component
 *
 * Displays a domain assessment card with emoji, name, and progress.
 */
export function AssessmentCard({
  domain,
  variant = 'intro',
  answeredCount = 0,
  totalQuestions = 5,
  onClick,
  className,
}: AssessmentCardProps) {
  const handleClick = () => {
    onClick?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  const progress = calculateProgress(answeredCount, totalQuestions);

  const variantStyles = {
    intro: 'border-[var(--aivo-neutral-200)] bg-white',
    progress: 'border-[var(--aivo-brand-primary)] bg-[var(--aivo-purple-50)]',
    complete: 'border-[var(--aivo-teal-400)] bg-[var(--aivo-teal-50)]',
  };

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      className={cn(
        'rounded-xl border-2 p-4 transition-all',
        onClick && 'cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl text-2xl',
            `bg-gradient-to-br ${domain.color}`
          )}
        >
          {domain.emoji}
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-[var(--aivo-brand-navy)]">
            {domain.name}
          </h3>
          {variant === 'progress' && (
            <div className="mt-1">
              <div className="flex items-center justify-between text-xs text-[var(--aivo-neutral-500)]">
                <span>{answeredCount}/{totalQuestions} questions</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-[var(--aivo-neutral-200)]">
                <div
                  className="h-full rounded-full bg-[var(--aivo-brand-primary)] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          {variant === 'complete' && (
            <span className="text-sm text-[var(--aivo-teal-700)]">
              ✓ Complete
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
