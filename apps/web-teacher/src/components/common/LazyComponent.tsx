'use client';

/**
 * Lazy Component Utilities
 *
 * Provides utilities for code-splitting and lazy loading components
 * to reduce initial bundle size and improve time-to-interactive.
 */

import React, { Suspense, ComponentType, ReactNode } from 'react';
import dynamic from 'next/dynamic';

/**
 * Loading skeleton for lazy-loaded components
 */
interface LoadingSkeletonProps {
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ height = 'h-32', className = '' }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${height} ${className}`}>
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-4 border-gray-300 dark:border-gray-600 border-t-blue-500 rounded-full animate-spin" />
      </div>
    </div>
  );
}

/**
 * Loading card skeleton for list items
 */
export function LoadingCardSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
        </div>
      </div>
    </div>
  );
}

/**
 * Loading table skeleton
 */
export function LoadingTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      <div className="bg-gray-100 dark:bg-gray-700 h-12" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border-t border-gray-100 dark:border-gray-700">
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/3" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/6" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error fallback component for lazy-loaded components
 */
interface ErrorFallbackProps {
  error?: Error;
  onRetry?: () => void;
}

export function ErrorFallback({ error, onRetry }: ErrorFallbackProps) {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="text-red-500">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
            Failed to load component
          </h3>
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {error.message}
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Options for creating a lazy component
 */
interface LazyComponentOptions {
  /** Loading component to show while loading */
  loading?: ReactNode;
  /** Whether to use server-side rendering (default: false) */
  ssr?: boolean;
}

/**
 * Creates a lazy-loaded component with automatic code splitting
 *
 * @example
 * ```tsx
 * // Basic usage
 * const LazyQuestionEditor = createLazyComponent(
 *   () => import('../assessments/QuestionEditor')
 * );
 *
 * // With custom loading state
 * const LazyGradingQueue = createLazyComponent(
 *   () => import('../assessments/GradingQueue'),
 *   { loading: <LoadingTableSkeleton rows={10} /> }
 * );
 *
 * // In your component
 * function MyPage() {
 *   return (
 *     <div>
 *       <LazyQuestionEditor questionId={id} />
 *     </div>
 *   );
 * }
 * ```
 */
export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
): ComponentType<P> {
  const { loading = <LoadingSkeleton />, ssr = false } = options;

  return dynamic(importFn, {
    loading: () => <>{loading}</>,
    ssr,
  }) as ComponentType<P>;
}

/**
 * Wrapper component for lazy loading with Suspense
 *
 * @example
 * ```tsx
 * import { lazy } from 'react';
 *
 * const QuestionEditor = lazy(() => import('./QuestionEditor'));
 *
 * function MyPage() {
 *   return (
 *     <LazyWrapper fallback={<LoadingSkeleton height="h-64" />}>
 *       <QuestionEditor questionId={id} />
 *     </LazyWrapper>
 *   );
 * }
 * ```
 */
interface LazyWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function LazyWrapper({ children, fallback = <LoadingSkeleton /> }: LazyWrapperProps) {
  return <Suspense fallback={fallback}>{children}</Suspense>;
}

/**
 * Pre-built lazy components for common heavy components
 * Import these directly for code-splitting
 */
export const LazyComponents = {
  // Assessment components (typically large)
  QuestionRenderers: createLazyComponent(
    () => import('../assessments/QuestionRenderers'),
    { loading: <LoadingSkeleton height="h-48" /> }
  ),

  GradingQueue: createLazyComponent(
    () => import('../assessments/GradingQueue'),
    { loading: <LoadingTableSkeleton rows={5} /> }
  ),

  AssessmentBuilder: createLazyComponent(
    () => import('../assessments/AssessmentBuilder'),
    { loading: <LoadingSkeleton height="h-96" /> }
  ),

  // Gamification components
  Leaderboard: createLazyComponent(
    () => import('../gamification/Leaderboard'),
    { loading: <LoadingSkeleton height="h-64" /> }
  ),

  RewardsShop: createLazyComponent(
    () => import('../gamification/RewardsShop'),
    { loading: <LoadingSkeleton height="h-64" /> }
  ),
};

export default LazyWrapper;
