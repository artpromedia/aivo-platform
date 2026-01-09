'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  listCreatorItems,
  type MarketplaceItem,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_COLORS,
  type VersionStatus,
} from '../../lib/api';

// Demo vendor ID - in real app would come from auth context
const VENDOR_ID = 'vendor-123';

export function ItemsList() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'CONTENT_PACK' | 'EMBEDDED_TOOL'>('all');

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const response = await listCreatorItems(VENDOR_ID);
        setItems(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load items');
      } finally {
        setLoading(false);
      }
    };
    void loadItems();
  }, []);

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    return item.itemType === filter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 text-sm text-red-600 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
        >
          All ({items.length})
        </button>
        <button
          onClick={() => setFilter('CONTENT_PACK')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === 'CONTENT_PACK'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Content Packs ({items.filter((i) => i.itemType === 'CONTENT_PACK').length})
        </button>
        <button
          onClick={() => setFilter('EMBEDDED_TOOL')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            filter === 'EMBEDDED_TOOL'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Embedded Tools ({items.filter((i) => i.itemType === 'EMBEDDED_TOOL').length})
        </button>
      </div>

      {/* Items grid */}
      {filteredItems.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-12 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-muted p-4">
            <svg
              className="h-full w-full text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium">No items yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first marketplace item to get started.
          </p>
          <Link
            href="/items/new"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Item
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({ item }: { item: MarketplaceItem }) {
  const latestVersion = item.latestVersion;
  const status = latestVersion?.status as VersionStatus | undefined;

  return (
    <Link
      href={`/items/${item.id}`}
      className="block rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt={`${item.title} icon`} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-xl">
            {item.itemType === 'CONTENT_PACK' ? '📦' : '🔧'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="truncate font-medium">{item.title}</h3>
          <p className="text-xs text-muted-foreground">
            {item.itemType === 'CONTENT_PACK' ? 'Content Pack' : 'Embedded Tool'}
          </p>
        </div>
      </div>

      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{item.shortDescription}</p>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {item.subjects.slice(0, 2).map((subject) => (
            <span
              key={subject}
              className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
            >
              {subject}
            </span>
          ))}
          {item.subjects.length > 2 && (
            <span className="text-xs text-muted-foreground">+{item.subjects.length - 2}</span>
          )}
        </div>

        {status && (
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[status]}`}>
            {VERSION_STATUS_LABELS[status]}
          </span>
        )}
      </div>

      {latestVersion && (
        <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
          <span>v{latestVersion.version}</span>
          {latestVersion.submittedAt && (
            <span>Submitted {new Date(latestVersion.submittedAt).toLocaleDateString()}</span>
          )}
        </div>
      )}
    </Link>
  );
}
