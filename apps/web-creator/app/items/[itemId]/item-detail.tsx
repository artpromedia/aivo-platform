'use client';

import { useState, useEffect } from 'react';
import {
  getCreatorItem,
  submitForReview,
  createVersion,
  type MarketplaceItem,
  type ItemVersion,
  VERSION_STATUS_LABELS,
  VERSION_STATUS_COLORS,
  type VersionStatus,
  SUBJECTS,
  GRADE_BANDS,
} from '../../../lib/api';
import { ContentPackEditor } from './content-pack-editor';
import { EmbeddedToolEditor } from './embedded-tool-editor';

// Demo vendor ID
const VENDOR_ID = 'vendor-123';

interface ItemDetailProps {
  itemId: string;
}

export function ItemDetail({ itemId }: ItemDetailProps) {
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'versions'>('overview');
  const [submitting, setSubmitting] = useState(false);
  const [showNewVersion, setShowNewVersion] = useState(false);

  useEffect(() => {
    const loadItem = async () => {
      try {
        setLoading(true);
        const response = await getCreatorItem(VENDOR_ID, itemId);
        setItem(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setLoading(false);
      }
    };
    void loadItem();
  }, [itemId]);

  const handleSubmitForReview = async (versionId: string) => {
    if (!item) return;
    try {
      setSubmitting(true);
      await submitForReview(VENDOR_ID, itemId, versionId);
      // Reload item
      const response = await getCreatorItem(VENDOR_ID, itemId);
      setItem(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateVersion = async (version: string, changelog: string) => {
    if (!item) return;
    try {
      await createVersion(VENDOR_ID, itemId, version, changelog);
      setShowNewVersion(false);
      // Reload item
      const response = await getCreatorItem(VENDOR_ID, itemId);
      setItem(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create version');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">{error ?? 'Item not found'}</p>
        <a href="/items" className="mt-4 inline-block text-sm text-red-600 underline">
          Back to Items
        </a>
      </div>
    );
  }

  const latestVersion = item.versions?.[0];
  const isDraft = latestVersion?.status === 'DRAFT';
  const canSubmit = isDraft;
  const canCreateNewVersion = !isDraft && latestVersion?.status !== 'PENDING_REVIEW';

  return (
    <div>
      {/* Back link */}
      <a
        href="/items"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Items
      </a>

      {/* Header */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {item.iconUrl ? (
            <img src={item.iconUrl} alt={`${item.title} icon`} className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted text-3xl">
              {item.itemType === 'CONTENT_PACK' ? '📦' : '🔧'}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <p className="text-sm text-muted-foreground">
              {item.itemType === 'CONTENT_PACK' ? 'Content Pack' : 'Embedded Tool'} · /{item.slug}
            </p>
            {latestVersion && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm">v{latestVersion.version}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[latestVersion.status as VersionStatus]}`}
                >
                  {VERSION_STATUS_LABELS[latestVersion.status as VersionStatus]}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {canCreateNewVersion && (
            <button
              onClick={() => setShowNewVersion(true)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              New Version
            </button>
          )}
          {canSubmit && latestVersion && (
            <button
              onClick={() => void handleSubmitForReview(latestVersion.id)}
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit for Review'}
            </button>
          )}
        </div>
      </div>

      {/* New Version Modal */}
      {showNewVersion && (
        <NewVersionModal
          currentVersion={latestVersion?.version ?? '1.0.0'}
          onClose={() => setShowNewVersion(false)}
          onSubmit={handleCreateVersion}
        />
      )}

      {/* Tabs */}
      <div className="mt-8 border-b border-border">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`border-b-2 pb-3 text-sm font-medium ${
              activeTab === 'overview'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`border-b-2 pb-3 text-sm font-medium ${
              activeTab === 'content'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item.itemType === 'CONTENT_PACK' ? 'Content Items' : 'Tool Config'}
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`border-b-2 pb-3 text-sm font-medium ${
              activeTab === 'versions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Versions ({item.versions?.length ?? 0})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && <OverviewTab item={item} />}
        {activeTab === 'content' && latestVersion && (
          item.itemType === 'CONTENT_PACK' ? (
            <ContentPackEditor
              vendorId={VENDOR_ID}
              itemId={itemId}
              versionId={latestVersion.id}
              items={latestVersion.contentPackItems ?? []}
              readOnly={!isDraft}
            />
          ) : (
            <EmbeddedToolEditor
              vendorId={VENDOR_ID}
              itemId={itemId}
              versionId={latestVersion.id}
              config={latestVersion.embeddedToolConfig ?? null}
              readOnly={!isDraft}
            />
          )
        )}
        {activeTab === 'versions' && <VersionsTab versions={item.versions ?? []} />}
      </div>
    </div>
  );
}

function OverviewTab({ item }: { item: MarketplaceItem }) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold">Description</h3>
          <p className="mt-2 text-sm text-muted-foreground">{item.shortDescription}</p>
          <div className="mt-4 prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap">{item.longDescription}</p>
          </div>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold">Subjects</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.subjects.map((s) => (
              <span key={s} className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                {SUBJECTS.find((x) => x.value === s)?.label ?? s}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold">Grade Bands</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {item.gradeBands.map((g) => (
              <span key={g} className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                {GRADE_BANDS.find((x) => x.value === g)?.label ?? g}
              </span>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6">
          <h3 className="font-semibold">Status</h3>
          <dl className="mt-2 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Active</dt>
              <dd>{item.isActive ? 'Yes' : 'No'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Pricing</dt>
              <dd>{item.pricingModel}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(item.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}

function VersionsTab({ versions }: { versions: ItemVersion[] }) {
  return (
    <div className="space-y-4">
      {versions.map((version) => (
        <div
          key={version.id}
          className="rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono font-medium">v{version.version}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${VERSION_STATUS_COLORS[version.status as VersionStatus]}`}
              >
                {VERSION_STATUS_LABELS[version.status as VersionStatus]}
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {new Date(version.createdAt).toLocaleDateString()}
            </span>
          </div>

          {version.changelog && (
            <p className="mt-2 text-sm text-muted-foreground">{version.changelog}</p>
          )}

          {version.reviewNotes && (
            <div className="mt-3 rounded bg-yellow-50 p-3 text-sm">
              <span className="font-medium text-yellow-800">Review Notes:</span>
              <p className="mt-1 text-yellow-700">{version.reviewNotes}</p>
            </div>
          )}

          {version.statusTransitions && version.statusTransitions.length > 0 && (
            <div className="mt-3 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground mb-2">History</p>
              <div className="space-y-1">
                {version.statusTransitions.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{VERSION_STATUS_LABELS[t.fromStatus]}</span>
                    <span>→</span>
                    <span>{VERSION_STATUS_LABELS[t.toStatus]}</span>
                    <span className="ml-auto">
                      {new Date(t.transitionedAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function NewVersionModal({
  currentVersion,
  onClose,
  onSubmit,
}: {
  currentVersion: string;
  onClose: () => void;
  onSubmit: (version: string, changelog: string) => void;
}) {
  const [version, setVersion] = useState(() => {
    const parts = currentVersion.split('.').map(Number);
    parts[2] = (parts[2] ?? 0) + 1;
    return parts.join('.');
  });
  const [changelog, setChangelog] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-surface p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Create New Version</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current version: {currentVersion}
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium">Version Number</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.1"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Changelog</label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="What changed in this version?"
              rows={4}
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
            onClick={() => onSubmit(version, changelog)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create Version
          </button>
        </div>
      </div>
    </div>
  );
}
