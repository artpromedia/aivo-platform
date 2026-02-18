'use client';

import * as React from 'react';
import { cn } from '../lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type SortDirection = 'asc' | 'desc' | null;

export interface DataTableColumn<T> {
  /** Unique column key — should match a property path on T */
  key: string;
  /** Header label */
  header: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Custom cell renderer */
  render?: (row: T, index: number) => React.ReactNode;
  /** Header alignment */
  align?: 'left' | 'center' | 'right';
  /** Column width class (e.g., 'w-48') */
  width?: string;
}

export interface DataTableProps<T> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  data: T[];
  /** Unique key extractor per row */
  rowKey: (row: T, index: number) => string | number;
  /** Current sort column key */
  sortKey?: string;
  /** Current sort direction */
  sortDir?: SortDirection;
  /** Called when a sortable column header is clicked */
  onSort?: (key: string, direction: SortDirection) => void;
  /** Zebra striped rows */
  striped?: boolean;
  /** Highlight rows on hover */
  hoverable?: boolean;
  /** Called when a row is clicked */
  onRowClick?: (row: T, index: number) => void;
  /** Show a loading skeleton */
  loading?: boolean;
  /** Number of skeleton rows when loading */
  loadingRows?: number;
  /** Empty state node */
  emptyState?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Sort Icons                                                         */
/* ------------------------------------------------------------------ */

function SortIcon({ direction }: { direction: SortDirection }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={cn(
        'ml-1 inline-block transition-transform',
        direction === 'desc' && 'rotate-180',
        !direction && 'opacity-0 group-hover:opacity-40'
      )}
      aria-hidden
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  DataTable                                                          */
/* ------------------------------------------------------------------ */

/**
 * Sortable data table with zebra stripes, hover rows, and loading skeleton.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  sortKey,
  sortDir,
  onSort,
  striped = true,
  hoverable = true,
  onRowClick,
  loading = false,
  loadingRows = 5,
  emptyState,
  className,
  ...props
}: Readonly<DataTableProps<T>>) {
  const handleSort = (col: DataTableColumn<T>) => {
    if (!col.sortable || !onSort) return;
    const nextDir: SortDirection =
      sortKey === col.key ? (sortDir === 'asc' ? 'desc' : sortDir === 'desc' ? null : 'asc') : 'asc';
    onSort(col.key, nextDir);
  };

  const alignClass = (align?: string) =>
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div className={cn('w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white', className)} {...props}>
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500',
                  alignClass(col.align),
                  col.width,
                  col.sortable && 'cursor-pointer select-none group'
                )}
                onClick={() => handleSort(col)}
              >
                <span className="inline-flex items-center">
                  {col.header}
                  {col.sortable && <SortIcon direction={sortKey === col.key ? sortDir ?? null : null} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: loadingRows }, (_, i) => (
                <tr key={`skel-${i}`} className="border-b border-slate-100">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-slate-100" />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
              ? (
                  <tr>
                    <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">
                      {emptyState ?? 'No data available'}
                    </td>
                  </tr>
                )
              : data.map((row, idx) => (
                  <tr
                    key={rowKey(row, idx)}
                    onClick={() => onRowClick?.(row, idx)}
                    className={cn(
                      'border-b border-slate-100 transition-colors',
                      striped && idx % 2 === 1 && 'bg-slate-50/50',
                      hoverable && 'hover:bg-indigo-50/50',
                      onRowClick && 'cursor-pointer'
                    )}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3 text-slate-700', alignClass(col.align))}>
                        {col.render
                          ? col.render(row, idx)
                          : String((row as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
        </tbody>
      </table>
    </div>
  );
}
