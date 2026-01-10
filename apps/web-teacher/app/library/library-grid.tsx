'use client';

/**
 * Library Grid Component
 *
 * Displays available marketplace items in a grid layout.
 * Teachers can view details and add items to their classrooms.
 *
 * Enterprise UI Audit: RE-AUDIT-AUTH-001
 * - Uses auth context for teacher ID instead of mock value
 * - Removed hardcoded admin email
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '../../components/providers';
import {
  type MarketplaceLibraryItem,
  type MarketplaceItemType,
  getTeacherLibrary,
  getItemTypeLabel,
  getSubjectLabel,
} from '../../lib/marketplace-api';

export function LibraryGrid() {
  const { userId } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<MarketplaceLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLibrary() {
      if (!userId) {
        setError('Authentication required');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const type = searchParams.get('type') as MarketplaceItemType | null;
        const subject = searchParams.get('subject');
        const gradeBand = searchParams.get('gradeBand');
        const search = searchParams.get('q');

        const result = await getTeacherLibrary(userId, {
          type: type || undefined,
          subject: subject || undefined,
          gradeBand: gradeBand || undefined,
          search: search || undefined,
        });
        setItems(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setLoading(false);
      }
    }
    void loadLibrary();
  }, [searchParams, userId]);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted">
        {items.length} item{items.length === 1 ? '' : 's'} available
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <LibraryItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function LibraryItemCard({ item }: Readonly<{ item: MarketplaceLibraryItem }>) {
  return (
    <Link
      href={`/library/${item.slug}`}
      className="group flex flex-col rounded-lg border border-border bg-surface p-4 transition-shadow hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt={`${item.title} icon`} className="h-12 w-12 rounded-lg object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-2xl">
            {item.itemType === 'CONTENT_PACK' ? '📚' : '🔧'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium group-hover:text-primary truncate">{item.title}</h3>
          <p className="text-sm text-muted truncate">{item.vendor.name}</p>
        </div>
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-sm text-muted flex-1">{item.description}</p>

      {/* Footer */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span className="rounded-full bg-surface-muted px-2 py-0.5">
          {getItemTypeLabel(item.itemType)}
        </span>
        {item.subjects.slice(0, 1).map((subject) => (
          <span key={subject} className="rounded-full bg-surface-muted px-2 py-0.5">
            {getSubjectLabel(subject)}
          </span>
        ))}
        {item.safetyCertified && (
          <span className="ml-auto text-green-600" title="Safety Certified">
            ✓ Verified
          </span>
        )}
      </div>
    </Link>
  );
}

function EmptyState() {
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
            d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium">No content available yet</h3>
      <p className="mt-2 text-sm text-muted max-w-md mx-auto">
        Your district hasn&apos;t installed any marketplace content yet. Contact your administrator
        to request new content packs and tools.
      </p>
      <div className="mt-6">
        <Link
          href="/help/content-request"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          Request Content
        </Link>
      </div>
    </div>
  );
}
