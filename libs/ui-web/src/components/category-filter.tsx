'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CategoryItem {
  /** Unique key */
  id: string;
  /** Display label */
  label: string;
  /** Optional item count */
  count?: number;
  /** Optional icon */
  icon?: React.ReactNode;
}

export interface CategoryFilterProps {
  /** List of categories */
  categories: CategoryItem[];
  /** Currently selected category ID(s) */
  selected?: string | string[];
  /** Selection callback */
  onSelect?: (id: string) => void;
  /** Allow multiple selection */
  multiple?: boolean;
  /** Show "All" pill at the start */
  showAll?: boolean;
  /** Label for the "All" pill */
  allLabel?: string;
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  CategoryFilter                                                     */
/* ------------------------------------------------------------------ */

/**
 * Horizontal scrollable pill-tab filter bar.
 *
 * Used to filter courses, categories, or any enumerated list.
 */
export function CategoryFilter({
  categories,
  selected,
  onSelect,
  multiple = false,
  showAll = true,
  allLabel = 'All',
  className,
}: Readonly<CategoryFilterProps>) {
  const selectedSet = React.useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(Array.isArray(selected) ? selected : [selected]);
  }, [selected]);

  const isAllSelected = selectedSet.size === 0;

  const handleClick = (id: string) => {
    onSelect?.(id);
  };

  return (
    <div
      className={cn('flex gap-2 overflow-x-auto scrollbar-none py-1', className)}
      role="tablist"
      aria-label="Category filter"
    >
      {showAll && (
        <button
          type="button"
          role="tab"
          aria-selected={isAllSelected}
          onClick={() => handleClick('')}
          className={cn(
            'flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors',
            isAllSelected
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
        >
          {allLabel}
        </button>
      )}
      {categories.map((cat) => {
        const isActive = selectedSet.has(cat.id);
        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => handleClick(cat.id)}
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {cat.icon}
            <span>{cat.label}</span>
            {cat.count != null && (
              <span
                className={cn(
                  'ml-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                )}
              >
                {cat.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
