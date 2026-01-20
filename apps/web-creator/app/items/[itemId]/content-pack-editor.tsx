'use client';

import { useState, useCallback } from 'react';
import { setContentPackItems, type ContentPackItem, type ContentPackItemInput } from '../../../lib/api';

// ══════════════════════════════════════════════════════════════════════════════
// LO SEARCH TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LearningObjectSearchResult {
  id: string;
  loVersionId: string;
  title: string;
  subject: string;
  gradeBand: string;
  contentType: string;
  durationMinutes: number | null;
  thumbnailUrl: string | null;
}

interface SearchResponse {
  items: LearningObjectSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

const CONTENT_SVC_URL = process.env.NEXT_PUBLIC_CONTENT_SVC_URL || 'http://localhost:4020';

interface ContentPackEditorProps {
  vendorId: string;
  itemId: string;
  versionId: string;
  items: ContentPackItem[];
  readOnly: boolean;
}

export function ContentPackEditor({
  vendorId,
  itemId,
  versionId,
  items: initialItems,
  readOnly,
}: ContentPackEditorProps) {
  const [items, setItems] = useState<ContentPackItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const input: ContentPackItemInput[] = items.map((item, idx) => ({
        loVersionId: item.loVersionId,
        ...(item.loId != null && { loId: item.loId }),
        position: idx,
        isHighlight: item.isHighlight,
        ...(item.metadataJson != null && { metadataJson: item.metadataJson }),
      }));
      const response = await setContentPackItems(vendorId, itemId, versionId, input);
      setItems(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setItems((prev) => {
      const newItems = [...prev];
      const temp = newItems[index - 1]!;
      newItems[index - 1] = newItems[index]!;
      newItems[index] = temp;
      return newItems;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const newItems = [...prev];
      const temp = newItems[index]!;
      newItems[index] = newItems[index + 1]!;
      newItems[index + 1] = temp;
      return newItems;
    });
  };

  const handleAddItem = (loVersionId: string, loId?: string) => {
    const newItem: ContentPackItem = {
      id: `temp-${Date.now()}`,
      loVersionId,
      loId: loId ?? null,
      position: items.length,
      isHighlight: false,
      metadataJson: null,
    };
    setItems((prev) => [...prev, newItem]);
    setShowAddModal(false);
  };

  const handleToggleHighlight = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, isHighlight: !item.isHighlight } : item
      )
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Content Pack Items</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} Learning Object{items.length !== 1 ? 's' : ''} in this pack
          </p>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Add LO
            </button>
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted p-3">
            <svg className="h-full w-full text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <p className="text-muted-foreground">No Learning Objects added yet</p>
          {!readOnly && (
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Add First LO
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border p-4 ${
                item.isHighlight ? 'border-yellow-300 bg-yellow-50' : 'border-border bg-surface'
              }`}
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleMoveUp(index)}
                  disabled={readOnly || index === 0}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => handleMoveDown(index)}
                  disabled={readOnly || index === items.length - 1}
                  className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>

              <span className="w-8 text-center text-sm text-muted-foreground">#{index + 1}</span>

              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-sm">{item.loVersionId}</p>
                {item.loId && (
                  <p className="truncate text-xs text-muted-foreground">LO: {item.loId}</p>
                )}
              </div>

              {!readOnly && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleHighlight(index)}
                    className={`rounded-lg px-2 py-1 text-xs ${
                      item.isHighlight
                        ? 'bg-yellow-200 text-yellow-800'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {item.isHighlight ? '⭐ Featured' : 'Feature'}
                  </button>
                  <button
                    onClick={() => handleRemove(index)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add LO Modal */}
      {showAddModal && (
        <AddLoModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddItem}
        />
      )}
    </div>
  );
}

function AddLoModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (loVersionId: string, loId?: string) => void;
}) {
  const [loVersionId, setLoVersionId] = useState('');
  const [loId, setLoId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LearningObjectSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        textQuery: searchQuery.trim(),
        limit: '20',
      });

      const res = await fetch(`${CONTENT_SVC_URL}/api/content/search?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error('Failed to search Learning Objects');
      }

      const data = (await res.json()) as SearchResponse;
      setSearchResults(data.items);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleSearch();
    }
  };

  const handleSelectResult = (result: LearningObjectSearchResult) => {
    onAdd(result.loVersionId, result.id);
  };

  const getSubjectLabel = (subject: string): string => {
    const labels: Record<string, string> = {
      ELA: 'English Language Arts',
      MATH: 'Mathematics',
      SCIENCE: 'Science',
      SEL: 'Social-Emotional Learning',
      SPEECH: 'Speech & Language',
      OTHER: 'Other',
    };
    return labels[subject] || subject;
  };

  const getGradeLabel = (gradeBand: string): string => {
    const labels: Record<string, string> = {
      K_2: 'K-2',
      G3_5: '3-5',
      G6_8: '6-8',
      G9_12: '9-12',
    };
    return labels[gradeBand] || gradeBand;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-surface shadow-xl flex flex-col">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Add Learning Object</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search for Learning Objects or enter IDs manually
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium">Search LOs</label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search by title, subject, grade..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => void handleSearch()}
                  disabled={searching || !searchQuery.trim()}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {searchError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {searchError}
              </div>
            )}

            {hasSearched && !searching && searchResults.length === 0 && !searchError && (
              <div className="text-center py-6 text-muted-foreground">
                No Learning Objects found matching your search.
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.loVersionId}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left p-3 hover:bg-muted transition flex items-start gap-3"
                  >
                    {result.thumbnailUrl ? (
                      <img
                        src={result.thumbnailUrl}
                        alt=""
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{result.title}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
                        <span className="bg-muted px-1.5 py-0.5 rounded">{getSubjectLabel(result.subject)}</span>
                        <span className="bg-muted px-1.5 py-0.5 rounded">Grade {getGradeLabel(result.gradeBand)}</span>
                        {result.contentType && (
                          <span className="bg-muted px-1.5 py-0.5 rounded">{result.contentType}</span>
                        )}
                        {result.durationMinutes && (
                          <span className="bg-muted px-1.5 py-0.5 rounded">{result.durationMinutes} min</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface px-2 text-xs text-muted-foreground">OR ENTER MANUALLY</span>
              </div>
            </div>

            {/* Manual Entry */}
            <div>
              <label className="block text-sm font-medium">LO Version ID</label>
              <input
                type="text"
                value={loVersionId}
                onChange={(e) => setLoVersionId(e.target.value)}
                placeholder="Enter LO Version UUID"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">LO Family ID (optional)</label>
              <input
                type="text"
                value={loId}
                onChange={(e) => setLoId(e.target.value)}
                placeholder="Enter LO Family UUID"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={() => onAdd(loVersionId, loId || undefined)}
            disabled={!loVersionId}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Add LO
          </button>
        </div>
      </div>
    </div>
  );
}
