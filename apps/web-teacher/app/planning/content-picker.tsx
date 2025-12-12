'use client';

/**
 * Content Picker Modal
 *
 * Allows teachers to select content from their library
 * to add to lesson plan activities.
 */

import { Button } from '@aivo/ui-web';
import { useState, useEffect } from 'react';

import {
  type MarketplaceLibraryItem,
  getTeacherLibrary,
  getItemTypeLabel,
} from '../../lib/marketplace-api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (contentId: string, contentTitle: string, contentType: string) => void;
  gradeBand?: string;
  subject?: string;
}

// TODO: Get from auth context
const MOCK_TEACHER_ID = 'teacher-123';

export function ContentPicker({ open, onClose, onSelect, gradeBand, subject }: Props) {
  const [items, setItems] = useState<MarketplaceLibraryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      loadItems();
    }
  }, [open, gradeBand, subject]);

  async function loadItems() {
    setLoading(true);
    setError(null);
    try {
      const result = await getTeacherLibrary(MOCK_TEACHER_ID, {
        gradeBand: gradeBand || undefined,
        subject: subject || undefined,
      });
      setItems(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.vendor.name.toLowerCase().includes(search.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Choose Content from Library</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted hover:bg-surface-muted hover:text-text"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border p-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Search library..."
              className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
              <p className="text-sm text-red-600">{error}</p>
              <button onClick={loadItems} className="mt-2 text-sm text-primary hover:underline">
                Try again
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <EmptyState hasSearch={search.length > 0} />
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelect(item.id, item.title, item.itemType);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-surface-muted hover:border-primary"
                >
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-xl">
                      {item.itemType === 'CONTENT_PACK' ? '📚' : '🔧'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <span>{item.vendor.name}</span>
                      <span>•</span>
                      <span>{getItemTypeLabel(item.itemType)}</span>
                    </div>
                  </div>
                  <svg
                    className="h-5 w-5 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4">
          <a href="/library" className="text-sm text-primary hover:underline">
            Browse full library →
          </a>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  if (hasSearch) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-6 text-center">
        <p className="text-muted">No content matches your search.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-surface-muted p-3">
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
      <h3 className="font-medium">No content available</h3>
      <p className="mt-1 text-sm text-muted">
        Your library is empty. Ask your district admin to install marketplace content.
      </p>
    </div>
  );
}
