'use client';

import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PaginationProps extends HTMLAttributes<HTMLElement> {
  /** Current page (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Called when page changes */
  onPageChange: (page: number) => void;
  /** Number of page buttons to show around the current page */
  siblings?: number;
  /** Show first/last page buttons */
  showEdges?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function range(start: number, end: number): number[] {
  const arr: number[] = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function getPageNumbers(page: number, total: number, siblings: number): (number | 'dots')[] {
  const totalNumbers = siblings * 2 + 5; // siblings each side + first + last + current + 2 dots
  if (total <= totalNumbers) return range(1, total);

  const leftSibIdx = Math.max(page - siblings, 1);
  const rightSibIdx = Math.min(page + siblings, total);
  const showLeftDots = leftSibIdx > 2;
  const showRightDots = rightSibIdx < total - 1;

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + 2 * siblings;
    return [...range(1, leftCount), 'dots', total];
  }
  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + 2 * siblings;
    return [1, 'dots', ...range(total - rightCount + 1, total)];
  }
  return [1, 'dots', ...range(leftSibIdx, rightSibIdx), 'dots', total];
}

/* ------------------------------------------------------------------ */
/*  Chevron Icons                                                      */
/* ------------------------------------------------------------------ */

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Pagination                                                         */
/* ------------------------------------------------------------------ */

/**
 * Numbered pagination with prev/next controls and smart ellipsis.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  siblings = 1,
  showEdges = true,
  className,
  ...props
}: Readonly<PaginationProps>) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages, siblings);

  const buttonBase =
    'inline-flex h-9 min-w-[36px] items-center justify-center rounded-lg text-sm font-medium transition-colors';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)} {...props}>
      {/* Previous */}
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(buttonBase, 'px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed')}
        aria-label="Previous page"
      >
        <ChevronLeft />
      </button>

      {/* Page numbers */}
      {pages.map((p, idx) =>
        p === 'dots' ? (
          <span key={`dots-${idx}`} className="px-1 text-slate-400" aria-hidden>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            aria-current={p === page ? 'page' : undefined}
            className={cn(
              buttonBase,
              p === page
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className={cn(buttonBase, 'px-2 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed')}
        aria-label="Next page"
      >
        <ChevronRight />
      </button>
    </nav>
  );
}
