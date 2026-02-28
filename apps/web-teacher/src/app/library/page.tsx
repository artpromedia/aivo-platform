export const dynamic = 'force-dynamic';

import { Heading } from '@aivo/ui-web';
import { Suspense } from 'react';

import { LibraryFilters } from './library-filters';
import { LibraryGrid } from './library-grid';
import { LibrarySearch } from './library-search';
import { LibraryTabsWrapper } from './library-tabs-wrapper';

/**
 * Teacher Library Page
 *
 * Two-tab layout:
 *  1. Marketplace — district-approved content packs & tools
 *  2. My Resources — teacher-uploaded lesson plans, templates, media etc.
 *
 * The "My Resources" tab uses React Query hooks (useLibraryResources)
 * against /api/library/resources → content-svc.
 */
export default function LibraryPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Heading kicker="Resource Hub" className="text-headline font-semibold">
            My Library
          </Heading>
          <p className="mt-1 text-muted">
            District content, tools, and your personal teaching resources.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <LibrarySearch />
      </div>

      {/* Tab Switcher: Marketplace / My Resources */}
      <LibraryTabsWrapper
        marketplaceContent={
          <div className="flex flex-col gap-6 lg:flex-row">
            <aside className="w-full shrink-0 lg:w-64">
              <div className="rounded-lg border border-border bg-surface p-4">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">
                  Filters
                </h2>
                <Suspense fallback={<FiltersSkeleton />}>
                  <LibraryFilters />
                </Suspense>
              </div>
            </aside>

            <main className="flex-1">
              <Suspense fallback={<GridSkeleton />}>
                <LibraryGrid />
              </Suspense>
            </main>
          </div>
        }
      />
    </section>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-surface" />
      ))}
    </div>
  );
}
