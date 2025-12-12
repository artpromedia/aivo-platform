/**
 * Marketplace Catalog Page - District Admin
 *
 * Browse and search the marketplace catalog with filters.
 */

import { Suspense } from 'react';

import { MarketplaceCatalog } from './catalog';
import { CatalogFilters } from './filters';
import { CatalogSearch } from './search';

export const metadata = {
  title: 'Marketplace | Aivo District Admin',
  description: 'Browse and install educational content packs and tools',
};

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marketplace</h1>
          <p className="mt-1 text-sm text-muted">
            Discover and install content packs and tools for your district
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-64 lg:flex-shrink-0">
          <Suspense fallback={<FiltersSkeleton />}>
            <CatalogFilters />
          </Suspense>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-4">
          <CatalogSearch />
          <Suspense fallback={<CatalogSkeleton />}>
            <MarketplaceCatalog />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function FiltersSkeleton() {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
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

function CatalogSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-64 animate-pulse rounded-lg border border-border bg-surface" />
      ))}
    </div>
  );
}
