'use client';

import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface CourseGridProps extends HTMLAttributes<HTMLDivElement> {
  /** Number of columns on desktop (default: 3) */
  columns?: 2 | 3 | 4;
  /** Optional empty state when no children */
  emptyState?: ReactNode;
}

const columnClasses = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
} as const;

/**
 * Responsive grid layout for CourseCard components.
 *
 * Automatically adapts from 1 column on mobile to the
 * specified number of columns on larger screens.
 */
export function CourseGrid({
  columns = 3,
  emptyState,
  className,
  children,
  ...props
}: Readonly<CourseGridProps>) {
  const hasChildren = Array.isArray(children)
    ? children.filter(Boolean).length > 0
    : Boolean(children);

  if (!hasChildren && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div
      className={cn('grid gap-6', columnClasses[columns], className)}
      {...props}
    >
      {children}
    </div>
  );
}
