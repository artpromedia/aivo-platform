/**
 * Loading States Components
 *
 * Various loading indicators and skeleton loaders
 */

'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Spinning loader
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-10 w-10',
  };

  return (
    <svg
      className={cn('animate-spin text-primary-600', sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full page loading overlay
 */
interface LoadingOverlayProps {
  message?: string;
}

export function LoadingOverlay({ message = 'Loading...' }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="rounded-xl bg-white p-6 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline loading state
 */
interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Spinner size="lg" />
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
}

/**
 * Skeleton loader for text
 */
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
}

export function Skeleton({ width, height, className, rounded = false }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-gray-200', rounded ? 'rounded-full' : 'rounded', className)}
      style={{ width, height }}
    />
  );
}

/**
 * Skeleton for card
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-white p-6', className)}>
      <div className="flex items-center gap-4">
        <Skeleton width={48} height={48} rounded />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} width="60%" />
          <Skeleton height={12} width="40%" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton height={12} />
        <Skeleton height={12} width="80%" />
      </div>
    </div>
  );
}

/**
 * Skeleton for table row
 */
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton height={16} width={`${60 + Math.random() * 40}%`} />
        </td>
      ))}
    </tr>
  );
}

/**
 * Skeleton for list item
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 py-4', className)}>
      <Skeleton width={40} height={40} rounded />
      <div className="flex-1 space-y-2">
        <Skeleton height={14} width="50%" />
        <Skeleton height={12} width="30%" />
      </div>
    </div>
  );
}

/**
 * Skeleton for gradebook cell
 */
export function GradeCellSkeleton() {
  return (
    <div className="flex items-center justify-center p-2">
      <Skeleton width={40} height={20} className="rounded-md" />
    </div>
  );
}

/**
 * Skeleton for chart
 */
export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-xl border bg-white p-6', className)}>
      <Skeleton height={16} width={120} className="mb-4" />
      <div className="flex h-48 items-end justify-around gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton
            key={i}
            width={32}
            height={`${30 + Math.random() * 70}%`}
            className="rounded-t"
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state with illustration
 */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon ? (
        <div className="mb-4 text-4xl text-gray-400">{icon}</div>
      ) : (
        <div className="mb-4 text-6xl">📭</div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Error state
 */
interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading this content.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <div className="mb-4 text-6xl">⚠️</div>
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
