'use client';

import { useState } from 'react';
import { setContentPackItems, type ContentPackItem, type ContentPackItemInput } from '../../../lib/api';

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
      [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
      return newItems;
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    setItems((prev) => {
      const newItems = [...prev];
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
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

  // In a real implementation, this would search content-svc for LOs
  const handleSearch = () => {
    // TODO: Implement LO search via content-svc API
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Add Learning Object</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Search for Learning Objects or enter IDs manually
        </p>

        <div className="mt-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium">Search LOs</label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, subject, grade..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleSearch}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Search
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-2 text-xs text-muted-foreground">OR</span>
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

        <div className="mt-6 flex justify-end gap-2">
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
