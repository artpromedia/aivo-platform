'use client';

/**
 * Content Picker Modal
 *
 * Allows teachers to select content from their library
 * to add to lesson plan activities.
 *
 * Features:
 * - Aivo Content tab: Native LOs
 * - Partner Content tab: Licensed third-party content packs
 *
 * Enterprise UI Audit: RE-AUDIT-AUTH-001
 * - Uses auth context for teacher/tenant IDs instead of mock values
 */

import { Button } from '@aivo/ui-web';
import Image from 'next/image';
import { useState, useEffect } from 'react';

import { useAuth } from '../../components/providers';
import {
  type MarketplaceLibraryItem,
  type PartnerContentItem,
  getTeacherLibrary,
  getEntitledPartnerContent,
  getItemTypeLabel,
} from '../../lib/marketplace-api';

interface Props {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onSelect: (contentId: string, contentTitle: string, contentType: string) => void;
  readonly gradeBand?: string;
  readonly subject?: string;
}

type ContentTab = 'aivo' | 'partner';

function getItemIcon(isPartner: boolean, itemType: string): string {
  if (isPartner) return '🤝';
  if (itemType === 'CONTENT_PACK') return '📚';
  return '🔧';
}

export function ContentPicker({ open, onClose, onSelect, gradeBand, subject }: Props) {
  const { userId, tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<ContentTab>('aivo');
  const [aivoItems, setAivoItems] = useState<MarketplaceLibraryItem[]>([]);
  const [partnerItems, setPartnerItems] = useState<PartnerContentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [partnerContentAvailable, setPartnerContentAvailable] = useState(false);

  useEffect(() => {
    if (open && userId && tenantId) {
      void loadContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, gradeBand, subject, userId, tenantId]);

  async function loadContent() {
    if (!userId || !tenantId) {
      setError('Authentication required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Load both Aivo content and partner content in parallel
      const [aivoResult, partnerResult] = await Promise.all([
        getTeacherLibrary(userId, {
          gradeBand: gradeBand || undefined,
          subject: subject || undefined,
        }),
        getEntitledPartnerContent(tenantId, {
          gradeBand: gradeBand || undefined,
          subject: subject || undefined,
          itemType: 'CONTENT_PACK',
          limit: 50,
        }),
      ]);
      setAivoItems(aivoResult.data);
      setPartnerItems(partnerResult.data);
      setPartnerContentAvailable(partnerResult.data.length > 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content');
    } finally {
      setLoading(false);
    }
  }

  const items = activeTab === 'aivo' ? aivoItems : partnerItems;

  const filteredItems = items.filter(
    (item) =>
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      ('vendor' in item && item.vendor.name.toLowerCase().includes(search.toLowerCase()))
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onClose}
        aria-label="Close modal"
      />

      {/* Modal */}
      <div className="relative flex max-h-[80vh] w-full max-w-2xl flex-col rounded-lg border border-border bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold">Choose Content</h2>
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

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => {
              setActiveTab('aivo');
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'aivo'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            📚 Aivo Content
          </button>
          <button
            onClick={() => {
              setActiveTab('partner');
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'partner'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-text'
            } ${partnerContentAvailable ? '' : 'opacity-50'}`}
            disabled={!partnerContentAvailable}
          >
            🤝 Partner Content
            {partnerContentAvailable && (
              <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                {partnerItems.length}
              </span>
            )}
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
          <ContentList
            loading={loading}
            error={error}
            filteredItems={filteredItems}
            search={search}
            activeTab={activeTab}
            onSelect={onSelect}
            loadContent={loadContent}
          />
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

/**
 * ContentList Component - Renders the content list based on loading/error state
 */
function ContentList({
  loading,
  error,
  filteredItems,
  search,
  activeTab,
  onSelect,
  loadContent,
}: {
  readonly loading: boolean;
  readonly error: string | null;
  readonly filteredItems: (MarketplaceLibraryItem | PartnerContentItem)[];
  readonly search: string;
  readonly activeTab: 'aivo' | 'partner';
  readonly onSelect: (contentId: string, contentTitle: string, contentType: string) => void;
  readonly loadContent: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-surface-muted" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button onClick={loadContent} className="mt-2 text-sm text-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return <EmptyState hasSearch={search.length > 0} isPartnerTab={activeTab === 'partner'} />;
  }

  return (
    <div className="space-y-2">
      {filteredItems.map((item) => (
        <ContentItemCard
          key={item.id}
          item={item}
          isPartner={activeTab === 'partner'}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

function EmptyState({
  hasSearch,
  isPartnerTab,
}: {
  readonly hasSearch: boolean;
  readonly isPartnerTab: boolean;
}) {
  if (hasSearch) {
    return (
      <div className="rounded-lg border border-border bg-surface-muted p-6 text-center">
        <p className="text-muted">No content matches your search.</p>
      </div>
    );
  }

  if (isPartnerTab) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-surface-muted p-3">
          <span className="text-2xl">🤝</span>
        </div>
        <h3 className="font-medium">No partner content available</h3>
        <p className="mt-1 text-sm text-muted">
          Your district hasn&apos;t licensed any partner content packs yet.
          <br />
          Contact your admin to explore the marketplace.
        </p>
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

/**
 * Content Item Card Component
 *
 * Handles rendering for both Aivo and Partner content items
 */
function ContentItemCard({
  item,
  isPartner,
  onSelect,
}: {
  readonly item: MarketplaceLibraryItem | PartnerContentItem;
  readonly isPartner: boolean;
  readonly onSelect: (contentId: string, contentTitle: string, contentType: string) => void;
}) {
  const isPartnerItem = 'license' in item;
  const vendorName = item.vendor?.name ?? 'Aivo';
  const itemType = item.itemType ?? 'CONTENT_PACK';

  // Check if partner content has seat limits
  const hasSeatsWarning =
    isPartnerItem &&
    item.license.seatLimit !== null &&
    item.license.seatsUsed >= item.license.seatLimit;

  return (
    <button
      onClick={() => {
        onSelect(item.id, item.title, itemType);
      }}
      disabled={hasSeatsWarning}
      className={`flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors ${
        hasSeatsWarning
          ? 'cursor-not-allowed opacity-50'
          : 'hover:bg-surface-muted hover:border-primary'
      }`}
    >
      {item.iconUrl ? (
        <Image
          src={item.iconUrl}
          alt={`${item.title} icon`}
          width={40}
          height={40}
          className="h-10 w-10 rounded-lg object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted text-xl">
          {getItemIcon(isPartner, itemType)}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{item.title}</p>
          {isPartner && (
            <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
              Partner
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{vendorName}</span>
          <span>•</span>
          <span>{getItemTypeLabel(itemType)}</span>
          {isPartnerItem && item.loCount > 0 && (
            <>
              <span>•</span>
              <span>{item.loCount} activities</span>
            </>
          )}
        </div>
        {/* Accessibility tags for partner content */}
        {isPartnerItem && item.accessibilityTags && item.accessibilityTags.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {item.accessibilityTags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">
                {formatAccessibilityTag(tag)}
              </span>
            ))}
          </div>
        )}
        {/* Seat limit warning */}
        {hasSeatsWarning && (
          <p className="mt-1 text-xs text-amber-600">
            ⚠️ All seats in use ({item.license.seatsUsed}/{item.license.seatLimit})
          </p>
        )}
      </div>
      <svg className="h-5 w-5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
        />
      </svg>
    </button>
  );
}

/**
 * Format accessibility tag for display
 */
function formatAccessibilityTag(tag: string): string {
  const labels: Record<string, string> = {
    TTS: 'Text-to-Speech',
    DYSLEXIA_FRIENDLY: 'Dyslexia Friendly',
    CAPTIONS: 'Captions',
    HIGH_CONTRAST: 'High Contrast',
  };
  return labels[tag] || tag;
}
