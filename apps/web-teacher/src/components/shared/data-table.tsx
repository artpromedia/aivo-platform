/**
 * Data Table Component
 *
 * Reusable table component with sorting, filtering, and pagination
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T | string;
  header: React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
  sorting?: {
    column: string;
    direction: 'asc' | 'desc';
    onSort: (column: string) => void;
  };
  className?: string;
  stickyHeader?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  selectedRows = [],
  onSelectionChange,
  pagination,
  sorting,
  className,
  stickyHeader = false,
}: Readonly<DataTableProps<T>>) {
  const hasSelection = !!onSelectionChange;

  const handleSelectAll = (checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange(data.map(keyExtractor));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (!onSelectionChange) return;
    if (checked) {
      onSelectionChange([...selectedRows, id]);
    } else {
      onSelectionChange(selectedRows.filter((r) => r !== id));
    }
  };

  const allSelected =
    data.length > 0 && data.every((row) => selectedRows.includes(keyExtractor(row)));
  const someSelected = data.some((row) => selectedRows.includes(keyExtractor(row)));

  const handleSort = (columnKey: string) => {
    if (sorting?.onSort) {
      sorting.onSort(columnKey);
    }
  };

  const getCellValue = (row: T, column: Column<T>, index: number): React.ReactNode => {
    if (column.cell) {
      return column.cell(row, index);
    }
    const value = (row as Record<string, unknown>)[column.key as string];
    if (value === null || value === undefined) return '-';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value as string | number | boolean);
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <tr>
          <td
            colSpan={columns.length + (hasSelection ? 1 : 0)}
            className="px-4 py-12 text-center text-gray-500"
          >
            <LoadingSpinner />
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td
            colSpan={columns.length + (hasSelection ? 1 : 0)}
            className="px-4 py-12 text-center text-gray-500"
          >
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return data.map((row, index) => {
      const rowId = keyExtractor(row);
      const isSelected = selectedRows.includes(rowId);

      return (
        <tr
          key={rowId}
          onClick={() => onRowClick?.(row)}
          className={cn(
            'transition-colors',
            onRowClick && 'cursor-pointer hover:bg-gray-50',
            isSelected && 'bg-primary-50'
          )}
        >
          {hasSelection && (
            <td
              className="w-12 px-4 py-3"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  handleSelectRow(rowId, e.target.checked);
                }}
                className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
            </td>
          )}
          {columns.map((column) => (
            <td
              key={String(column.key)}
              className={cn(
                'px-4 py-3 text-sm text-gray-900',
                column.align === 'center' && 'text-center',
                column.align === 'right' && 'text-right',
                column.className
              )}
            >
              {getCellValue(row, column, index)}
            </td>
          ))}
        </tr>
      );
    });
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border bg-white', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={cn('bg-gray-50', stickyHeader && 'sticky top-0 z-10')}>
            <tr>
              {hasSelection && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={(e) => {
                      handleSelectAll(e.target.checked);
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    column.className
                  )}
                  style={{ width: column.width }}
                  onClick={() => {
                    if (column.sortable) handleSort(String(column.key));
                  }}
                >
                  <span className="inline-flex items-center gap-1">
                    {column.header}
                    {column.sortable && sorting?.column === column.key && (
                      <SortIcon direction={sorting.direction} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">{renderTableBody()}</tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between border-t bg-gray-50 px-4 py-3">
          <div className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                pagination.onPageChange(pagination.page - 1);
              }}
              disabled={pagination.page === 1}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-700">
              Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
            </span>
            <button
              onClick={() => {
                pagination.onPageChange(pagination.page + 1);
              }}
              disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
              className="rounded-lg border px-3 py-1 text-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortIcon({ direction }: Readonly<{ direction: 'asc' | 'desc' }>) {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
      {direction === 'asc' ? <path d="M8 4l4 5H4l4-5z" /> : <path d="M8 12l-4-5h8l-4 5z" />}
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <div className="inline-flex items-center gap-2">
      <svg className="h-5 w-5 animate-spin text-primary-600" viewBox="0 0 24 24">
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
      <span>Loading...</span>
    </div>
  );
}
