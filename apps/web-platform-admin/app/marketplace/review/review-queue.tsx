'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

// ============================================================================
// Types
// ============================================================================

interface Vendor {
  id: string;
  name: string;
  type: 'AIVO' | 'THIRD_PARTY';
}

interface PendingItem {
  itemId: string;
  versionId: string;
  title: string;
  shortDescription: string;
  itemType: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  subjects: string[];
  gradeBands: string[];
  version: string;
  submittedAt: string;
  reviewNotes: string | null;
  vendor: Vendor;
}

interface ReviewResponse {
  success: boolean;
  message: string;
}

type VersionStatus = 'PENDING_REVIEW' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

// ============================================================================
// API Client
// ============================================================================

const API_BASE = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:4070/api/v1';

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

async function listPendingReviews(status: VersionStatus = 'PENDING_REVIEW'): Promise<{ data: PendingItem[] }> {
  return fetchApi(`/review/pending?status=${status}`);
}

async function approveVersion(
  vendorId: string,
  itemId: string,
  versionId: string,
  notes?: string
): Promise<ReviewResponse> {
  return fetchApi(`/review/vendors/${vendorId}/items/${itemId}/versions/${versionId}/approve`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

async function rejectVersion(
  vendorId: string,
  itemId: string,
  versionId: string,
  reason: string
): Promise<ReviewResponse> {
  return fetchApi(`/review/vendors/${vendorId}/items/${itemId}/versions/${versionId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

async function startReview(
  vendorId: string,
  itemId: string,
  versionId: string
): Promise<ReviewResponse> {
  return fetchApi(`/review/vendors/${vendorId}/items/${itemId}/versions/${versionId}/start-review`, {
    method: 'POST',
  });
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_FILTERS: { value: VersionStatus; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'IN_REVIEW', label: 'In Review' },
];

const TYPE_LABELS: Record<string, string> = {
  CONTENT_PACK: 'Content Pack',
  EMBEDDED_TOOL: 'Embedded Tool',
};

const VENDOR_TYPE_BADGES: Record<string, { label: string; className: string }> = {
  AIVO: { label: 'Aivo', className: 'bg-indigo-100 text-indigo-700' },
  THIRD_PARTY: { label: 'Partner', className: 'bg-amber-100 text-amber-700' },
};

// ============================================================================
// Components
// ============================================================================

export function ReviewQueue() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VersionStatus>('PENDING_REVIEW');
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listPendingReviews(statusFilter);
      setItems(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleStartReview = async (item: PendingItem) => {
    try {
      setSubmitting(true);
      await startReview(item.vendor.id, item.itemId, item.versionId);
      await loadItems();
      setStatusFilter('IN_REVIEW');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      setSubmitting(true);
      await approveVersion(
        selectedItem.vendor.id,
        selectedItem.itemId,
        selectedItem.versionId,
        reviewNotes || undefined
      );
      setSelectedItem(null);
      setReviewAction(null);
      setReviewNotes('');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !reviewNotes.trim()) return;
    try {
      setSubmitting(true);
      await rejectVersion(
        selectedItem.vendor.id,
        selectedItem.itemId,
        selectedItem.versionId,
        reviewNotes
      );
      setSelectedItem(null);
      setReviewAction(null);
      setReviewNotes('');
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              statusFilter === filter.value
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
          <button
            onClick={() => void loadItems()}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-slate-100 p-3">
            <svg
              className="h-full w-full text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-slate-600">
            {statusFilter === 'PENDING_REVIEW'
              ? 'No items pending review'
              : 'No items currently in review'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.itemId}-${item.versionId}`}
              className="rounded-lg border border-slate-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      v{item.version}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {TYPE_LABELS[item.itemType]}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                    {item.shortDescription}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className={`rounded-full px-2 py-0.5 ${VENDOR_TYPE_BADGES[item.vendor.type]?.className}`}>
                      {VENDOR_TYPE_BADGES[item.vendor.type]?.label}
                    </span>
                    <span>{item.vendor.name}</span>
                    <span>•</span>
                    <span>
                      Submitted {new Date(item.submittedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {item.reviewNotes && (
                    <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                      <span className="font-medium">Creator notes: </span>
                      {item.reviewNotes}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/marketplace/review/${item.vendor.id}/${item.itemId}/${item.versionId}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium hover:bg-slate-50"
                  >
                    View Details
                  </Link>
                  {statusFilter === 'PENDING_REVIEW' && (
                    <button
                      onClick={() => void handleStartReview(item)}
                      disabled={submitting}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      Start Review
                    </button>
                  )}
                  {statusFilter === 'IN_REVIEW' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setReviewAction('approve');
                          setReviewNotes('');
                        }}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedItem(item);
                          setReviewAction('reject');
                          setReviewNotes('');
                        }}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedItem && reviewAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">
              {reviewAction === 'approve' ? 'Approve Submission' : 'Reject Submission'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {reviewAction === 'approve'
                ? `Approve "${selectedItem.title}" v${selectedItem.version}?`
                : `Reject "${selectedItem.title}" v${selectedItem.version}?`}
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium">
                {reviewAction === 'approve' ? 'Notes (optional)' : 'Rejection reason *'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder={
                  reviewAction === 'approve'
                    ? 'Add any notes for the creator...'
                    : 'Explain why this submission is being rejected...'
                }
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setSelectedItem(null);
                  setReviewAction(null);
                  setReviewNotes('');
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              {reviewAction === 'approve' ? (
                <button
                  onClick={() => void handleApprove()}
                  disabled={submitting}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {submitting ? 'Approving...' : 'Approve'}
                </button>
              ) : (
                <button
                  onClick={() => void handleReject()}
                  disabled={submitting || !reviewNotes.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? 'Rejecting...' : 'Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
