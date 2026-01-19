'use client';

import { cn } from '../../utils';
import type { SubjectCardProps } from './types';

/**
 * SubjectCard Component
 *
 * A card component for displaying subject/topic selection options.
 */
export function SubjectCard({
  subject,
  selected = false,
  onClick,
  size = 'md',
  className,
}: SubjectCardProps) {
  const handleClick = () => {
    onClick?.(subject.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(subject.id);
    }
  };

  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const iconSizes = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-14 h-14 text-2xl',
    lg: 'w-20 h-20 text-4xl',
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-xl border-2 transition-all cursor-pointer text-center',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        sizeClasses[size],
        selected
          ? 'border-[var(--aivo-brand-primary)] bg-[var(--aivo-purple-50)] shadow-md'
          : 'border-[var(--aivo-neutral-200)] bg-white hover:border-[var(--aivo-purple-300)] hover:bg-[var(--aivo-purple-50)]',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-center rounded-xl bg-[var(--aivo-purple-50)]',
          iconSizes[size]
        )}
      >
        <span>{subject.emoji}</span>
      </div>
      <span
        className={cn(
          'mt-2 block font-medium text-[var(--aivo-neutral-500)]',
          textSizes[size]
        )}
      >
        {subject.name}
      </span>
      {selected && (
        <span className="mt-1 block text-[var(--aivo-brand-primary)]">✓</span>
      )}
    </div>
  );
}
