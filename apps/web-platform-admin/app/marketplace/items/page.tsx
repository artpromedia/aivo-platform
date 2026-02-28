'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface MarketplaceItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  itemType: string;
  pricingModel: string;
  priceCents: number | null;
  avgRating: number;
  totalInstalls: number;
  isFeatured: boolean;
  subjects: string[];
  gradeBands: string[];
  vendor: {
    id: string;
    slug: string;
    name: string;
    type: string;
  };
}

interface PaginatedResponse {
  data: MarketplaceItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Constants
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:4070/api/v1';

const TYPE_LABELS: Record<string, string> = {
  CONTENT_PACK: 'Content Pack',
  EMBEDDED_TOOL: 'Embedded Tool',
};

const SORT_OPTIONS = [
  { value: 'installs', label: 'Most Installed' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'title', label: 'Alphabetical' },
];

// ============================================================================
// Component
// ============================================================================

export default function MarketplaceItemsPage() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('installs');
  const [typeFilter, setTypeFilter] = useState('');

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: String(page),
        pageSize: '25',
        sortBy,
        sortOrder: sortBy === 'title' ? 'asc' : 'desc',
      });
      if (search.trim()) {
        params.set('query', search.trim());
      }
      if (typeFilter) {
        params.set('itemType', typeFilter);
      }

      const res = await fetch(`${API_BASE}/catalog?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch items: ${res.status}`);
      const json = (await res.json()) as PaginatedResponse;

      setItems(json.data);
      setTotalPages(json.pagination.totalPages);
      setTotal(json.pagination.total);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load marketplace items');
    } finally {
      setLoading(false);
    }
  }, [page, search, sortBy, typeFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  function handleSearch(e: React.SyntheticEvent) {
    e.preventDefault();
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/marketplace" className="hover:text-slate-900">
          Marketplace
        </Link>
        <span>/</span>
        <span className="text-slate-900">All Items</span>
      </nav>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketplace Items</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse and manage all items published in the marketplace
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
            }}
            placeholder="Search items..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3">
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Types</option>
            <option value="CONTENT_PACK">Content Packs</option>
            <option value="EMBEDDED_TOOL">Embedded Tools</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={() => {
              setError(null);
            }}
            className="ml-4 text-red-900 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Items table */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-3 text-xs text-slate-500">
          {total} item{total !== 1 ? 's' : ''} total
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading items...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500">No items found.</p>
            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-6 py-3 font-medium">Item</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Vendor</th>
                <th className="px-6 py-3 font-medium">Rating</th>
                <th className="px-6 py-3 font-medium">Installs</th>
                <th className="px-6 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/marketplace/${item.id}`}
                      className="font-medium text-blue-700 hover:underline"
                    >
                      {item.title}
                    </Link>
                    {item.isFeatured && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        Featured
                      </span>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                      {item.shortDescription}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">
                      {TYPE_LABELS[item.itemType] ?? item.itemType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{item.vendor.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-700">
                      {'★'} {item.avgRating.toFixed(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {item.totalInstalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatPrice(item.pricingModel, item.priceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page <= 1}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => {
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={page >= totalPages}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(model: string, cents: number | null): string {
  if (model === 'FREE' || cents == null) return 'Free';
  return `$${(cents / 100).toFixed(2)}`;
}
