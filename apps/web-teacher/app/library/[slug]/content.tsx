'use client';

/**
 * Library Item Content Component
 *
 * Shows detailed information about a marketplace item and
 * provides the add-to-classroom flow for teachers.
 */

import { Button } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import {
  type MarketplaceLibraryItem,
  getLibraryItemBySlug,
  getItemTypeLabel,
  getSubjectLabel,
  getGradeBandLabel,
} from '../../../lib/marketplace-api';

import { AddToClassroomModal } from './add-to-classroom-modal';

interface Props {
  slug: string;
}

export function LibraryItemContent({ slug }: Props) {
  const [item, setItem] = useState<MarketplaceLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    async function loadItem() {
      setLoading(true);
      setError(null);
      try {
        const data = await getLibraryItemBySlug(slug);
        setItem(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load item');
      } finally {
        setLoading(false);
      }
    }
    void loadItem();
  }, [slug]);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/library" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Back to Library
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h2 className="text-lg font-medium">Item not found</h2>
        <p className="mt-1 text-sm text-muted">
          This item may not be available or doesn&apos;t exist.
        </p>
        <Link href="/library" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Back to Library
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/library"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Library
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {item.iconUrl ? (
          <img src={item.iconUrl} alt="" className="h-24 w-24 rounded-xl object-cover" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-surface-muted text-4xl">
            {item.itemType === 'CONTENT_PACK' ? '📚' : '🔧'}
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium">
              {getItemTypeLabel(item.itemType)}
            </span>
            {item.safetyCertified && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                ✓ Safety Certified
              </span>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-bold">{item.title}</h1>
          <p className="mt-1 text-muted">by {item.vendor.name}</p>

          {/* Rating */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-4 w-4 ${star <= Math.round(item.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-muted">
              {item.rating.toFixed(1)} ({item.reviewCount} reviews)
            </span>
          </div>
        </div>

        {/* Add to Classroom Button */}
        <div className="sm:ml-auto">
          <Button
            variant="primary"
            onClick={() => {
              setShowAddModal(true);
            }}
          >
            Add to Classroom
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-3 text-muted leading-relaxed">{item.description}</p>
          </section>

          {/* What's Included (for content packs) */}
          {item.itemType === 'CONTENT_PACK' && (
            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">What&apos;s Included</h2>
              <p className="mt-3 text-sm text-muted">
                Content details will be available after adding to a classroom.
              </p>
            </section>
          )}

          {/* How to Use (for tools) */}
          {item.itemType === 'EMBEDDED_TOOL' && (
            <section className="rounded-lg border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold">How to Use</h2>
              <p className="mt-3 text-sm text-muted">
                This tool will be available in lessons after you add it to a classroom.
              </p>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Details */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-medium">Details</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Version</dt>
                <dd>{item.version.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Publisher</dt>
                <dd>{item.vendor.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Type</dt>
                <dd>{getItemTypeLabel(item.itemType)}</dd>
              </div>
            </dl>
          </div>

          {/* Subjects */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-medium">Subjects</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.subjects.map((subject) => (
                <span key={subject} className="rounded-full bg-surface-muted px-2 py-1 text-xs">
                  {getSubjectLabel(subject)}
                </span>
              ))}
              {item.subjects.length === 0 && (
                <span className="text-sm text-muted">All subjects</span>
              )}
            </div>
          </div>

          {/* Grade Bands */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-medium">Grade Levels</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {item.gradeBands.map((grade) => (
                <span key={grade} className="rounded-full bg-surface-muted px-2 py-1 text-xs">
                  {getGradeBandLabel(grade)}
                </span>
              ))}
              {item.gradeBands.length === 0 && (
                <span className="text-sm text-muted">All grades</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add to Classroom Modal */}
      <AddToClassroomModal
        open={showAddModal}
        onClose={() => {
          setShowAddModal(false);
        }}
        item={item}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-24 animate-pulse rounded bg-surface-muted" />
      <div className="flex gap-6">
        <div className="h-24 w-24 animate-pulse rounded-xl bg-surface-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
