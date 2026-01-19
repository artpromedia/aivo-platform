/**
 * District Curriculum Library Page
 *
 * Main page for browsing, managing, and organizing district curriculum.
 */

import { Suspense } from 'react';

import { CurriculumBrowser } from './curriculum-browser';
import { CurriculumGrid } from './curriculum-grid';
import { CurriculumSearch } from './curriculum-search';

export const metadata = {
  title: 'Curriculum Library | Aivo District Admin',
  description: 'Manage and organize district curriculum resources',
};

export default function CurriculumLibraryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Curriculum Library</h1>
          <p className="mt-1 text-sm text-muted">
            Manage, organize, and align curriculum resources across your district
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0">
          <Suspense fallback={<BrowserSkeleton />}>
            <CurriculumBrowser />
          </Suspense>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-4">
          <CurriculumSearch />
          <Suspense fallback={<GridSkeleton />}>
            <CurriculumGrid />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function BrowserSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
      {/* Upload button skeleton */}
      <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />

      {/* Filter sections */}
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
          <div className="space-y-1">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-6 animate-pulse rounded bg-surface-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
