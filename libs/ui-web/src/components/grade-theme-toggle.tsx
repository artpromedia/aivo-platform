'use client';

import type { HTMLAttributes } from 'react';

import { useGradeTheme } from '../theme/grade-theme';
import { cn } from '../utils/cn';

export function GradeThemeToggle({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const { grade, setGrade, availableGrades, labels } = useGradeTheme();

  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted px-1 py-1', className)}
      {...props}
    >
      {availableGrades.map((value) => {
        const active = value === grade;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setGrade(value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-semibold transition',
              active
                ? 'bg-primary text-on-accent shadow-soft'
                : 'text-muted hover:bg-surface hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgb(var(--color-focus))]'
            )}
            aria-pressed={active}
          >
            {labels[value] ?? value}
          </button>
        );
      })}
    </div>
  );
}
