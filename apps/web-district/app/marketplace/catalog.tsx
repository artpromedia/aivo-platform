'use client';

/**
 * Marketplace Catalog Component
 *
 * Displays the catalog items in a grid with pagination.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import {
  type MarketplaceCatalogItem,
  type PaginatedResponse,
  searchCatalog,
  getSubjectLabel,
  getGradeBandLabel,
  getItemTypeLabel,
  getSafetyCertLabel,
} from '../../lib/marketplace-api';

export function MarketplaceCatalog() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<PaginatedResponse<MarketplaceCatalogItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCatalog() {
      setLoading(true);
      setError(null);
      try {
        const params = {
          query: searchParams.get('query') || undefined,
          itemType: (searchParams.get('type') as 'CONTENT_PACK' | 'EMBEDDED_TOOL') || undefined,
          subjects: searchParams.getAll('subject').filter(Boolean),
          gradeBands: searchParams.getAll('grade').filter(Boolean),
          sortBy:
            (searchParams.get('sort') as 'relevance' | 'rating' | 'installs' | 'newest') ||
            'relevance',
          page: parseInt(searchParams.get('page') || '1', 10),
          pageSize: 12,
        };
        const result = await searchCatalog(params);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load catalog');
      } finally {
        setLoading(false);
      }
    }
    void loadCatalog();
  }, [searchParams]);

  if (loading) {
    return <CatalogSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="mt-2 text-sm text-red-500 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data || data.data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-surface-muted p-4">
          <svg
            className="h-full w-full text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No items found</h3>
        <p className="mt-1 text-sm text-muted">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Results count & sort */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          {data.pagination.total} item{data.pagination.total !== 1 ? 's' : ''} found
        </span>
        <SortDropdown />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.data.map((item) => (
          <CatalogItemCard key={item.id} item={item} />
        ))}
      </div>

      {/* Pagination */}
      {data.pagination.totalPages > 1 && <Pagination pagination={data.pagination} />}
    </div>
  );
}

function CatalogItemCard({ item }: { item: MarketplaceCatalogItem }) {
  return (
    <Link
      href={`/marketplace/items/${item.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-surface transition hover:border-primary hover:shadow-md"
    >
      {/* Header with icon */}
      <div className="flex items-start gap-3 p-4">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt={`${item.title} icon`} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted">
            <ItemTypeIcon type={item.itemType} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium leading-tight line-clamp-2 group-hover:text-primary">
            {item.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted">{item.vendor.name}</p>
        </div>
      </div>

      {/* Description */}
      <div className="flex-1 px-4">
        <p className="text-sm text-muted line-clamp-2">{item.shortDescription}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 p-4 pt-3">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
          {getItemTypeLabel(item.itemType)}
        </span>
        {item.subjects.slice(0, 2).map((subject) => (
          <span
            key={subject}
            className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted"
          >
            {getSubjectLabel(subject)}
          </span>
        ))}
        {item.gradeBands.slice(0, 1).map((grade) => (
          <span
            key={grade}
            className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted"
          >
            {getGradeBandLabel(grade)}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs">
        <div className="flex items-center gap-2">
          {item.avgRating && (
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              {item.avgRating.toFixed(1)}
            </span>
          )}
          <SafetyBadge cert={item.safetyCert} />
        </div>
        <span className="text-muted">{item.totalInstalls.toLocaleString()} installs</span>
      </div>
    </Link>
  );
}

function ItemTypeIcon({ type }: { type: string }) {
  if (type === 'CONTENT_PACK') {
    return (
      <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"
      />
    </svg>
  );
}

function SafetyBadge({ cert }: { cert: string }) {
  if (cert === 'AIVO_CERTIFIED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Certified
      </span>
    );
  }
  if (cert === 'VENDOR_ATTESTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Attested
      </span>
    );
  }
  return null;
}

function SortDropdown() {
  const searchParams = useSearchParams();
  const currentSort = searchParams.get('sort') || 'relevance';

  const handleSort = (sort: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', sort);
    params.delete('page');
    window.history.pushState(null, '', `?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <select
      value={currentSort}
      onChange={(e) => {
        handleSort(e.target.value);
      }}
      className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm"
    >
      <option value="relevance">Most Relevant</option>
      <option value="rating">Highest Rated</option>
      <option value="installs">Most Installed</option>
      <option value="newest">Newest</option>
    </select>
  );
}

function Pagination({ pagination }: { pagination: { page: number; totalPages: number } }) {
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    window.history.pushState(null, '', `?${params.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => {
          goToPage(pagination.page - 1);
        }}
        disabled={pagination.page <= 1}
        className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Previous
      </button>
      <span className="text-sm text-muted">
        Page {pagination.page} of {pagination.totalPages}
      </span>
      <button
        onClick={() => {
          goToPage(pagination.page + 1);
        }}
        disabled={pagination.page >= pagination.totalPages}
        className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
      >
        Next
      </button>
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
