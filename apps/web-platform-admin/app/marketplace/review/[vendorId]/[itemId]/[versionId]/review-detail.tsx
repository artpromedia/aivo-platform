'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ============================================================================
// Types
// ============================================================================

interface Vendor {
  id: string;
  slug: string;
  name: string;
  type: 'AIVO' | 'THIRD_PARTY';
}

interface ContentPackItem {
  id: string;
  loVersionId: string;
  loId: string | null;
  position: number;
  isHighlight: boolean;
}

interface EmbeddedToolConfig {
  id: string;
  launchUrl: string;
  launchType: string;
  requiredScopes: string[];
  optionalScopes: string[];
  sandboxAttributes: string[];
}

interface ItemVersion {
  id: string;
  version: string;
  status: string;
  changelog: string | null;
  reviewNotes: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  contentPackItems?: ContentPackItem[];
  embeddedToolConfig?: EmbeddedToolConfig | null;
}

interface MarketplaceItem {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  itemType: 'CONTENT_PACK' | 'EMBEDDED_TOOL';
  subjects: string[];
  gradeBands: string[];
  modalities: string[];
  iconUrl: string | null;
  vendor: Vendor;
  versions: ItemVersion[];
}

interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

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

async function getReviewItem(
  vendorId: string,
  itemId: string,
  versionId: string
): Promise<{ data: MarketplaceItem; validationIssues?: ValidationIssue[] }> {
  return fetchApi(`/review/vendors/${vendorId}/items/${itemId}/versions/${versionId}`);
}

async function approveVersion(
  vendorId: string,
  itemId: string,
  versionId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
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
): Promise<{ success: boolean; message: string }> {
  return fetchApi(`/review/vendors/${vendorId}/items/${itemId}/versions/${versionId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

// ============================================================================
// Constants
// ============================================================================

const SUBJECT_LABELS: Record<string, string> = {
  MATH: 'Mathematics',
  ELA: 'English Language Arts',
  SCIENCE: 'Science',
  SEL: 'Social-Emotional Learning',
  SOCIAL_STUDIES: 'Social Studies',
  STEM: 'STEM',
  ARTS: 'Arts',
  FOREIGN_LANGUAGE: 'Foreign Language',
  SPEECH: 'Speech',
  OTHER: 'Other',
};

const GRADE_LABELS: Record<string, string> = {
  PRE_K: 'Pre-K',
  K_2: 'K-2',
  G3_5: 'Grades 3-5',
  G6_8: 'Grades 6-8',
  G9_12: 'Grades 9-12',
  ALL_GRADES: 'All Grades',
};

const SCOPE_LABELS: Record<string, { label: string; description: string }> = {
  LEARNER_PROFILE_MIN: { label: 'Basic Learner Profile', description: 'User ID and display name' },
  LEARNER_PROGRESS_READ: { label: 'Read Progress', description: 'View learner progress data' },
  LEARNER_PROGRESS_WRITE: { label: 'Write Progress', description: 'Update learner progress' },
  SESSION_EVENTS_READ: { label: 'Read Events', description: 'View session events' },
  SESSION_EVENTS_WRITE: { label: 'Write Events', description: 'Log session events' },
  ASSIGNMENT_READ: { label: 'Read Assignments', description: 'View assignment context' },
  CLASSROOM_READ: { label: 'Read Classroom', description: 'View classroom info' },
  TENANT_CONFIG_READ: { label: 'Read Config', description: 'View tenant configuration' },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700' },
  PENDING_REVIEW: { label: 'Pending Review', className: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW: { label: 'In Review', className: 'bg-blue-100 text-blue-700' },
  APPROVED: { label: 'Approved', className: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  PUBLISHED: { label: 'Published', className: 'bg-emerald-100 text-emerald-700' },
  DEPRECATED: { label: 'Deprecated', className: 'bg-slate-100 text-slate-500' },
};

// ============================================================================
// Components
// ============================================================================

interface ReviewDetailProps {
  vendorId: string;
  itemId: string;
  versionId: string;
}

export function ReviewDetail({ vendorId, itemId, versionId }: ReviewDetailProps) {
  const router = useRouter();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadItem = async () => {
      try {
        setLoading(true);
        const response = await getReviewItem(vendorId, itemId, versionId);
        setItem(response.data);
        setValidationIssues(response.validationIssues ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    void loadItem();
  }, [vendorId, itemId, versionId]);

  const version = item?.versions.find((v) => v.id === versionId);
  const canReview = version?.status === 'IN_REVIEW';

  const handleApprove = async () => {
    try {
      setSubmitting(true);
      await approveVersion(vendorId, itemId, versionId, reviewNotes || undefined);
      router.push('/marketplace/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewNotes.trim()) return;
    try {
      setSubmitting(true);
      await rejectVersion(vendorId, itemId, versionId, reviewNotes);
      router.push('/marketplace/review');
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

  if (error || !item || !version) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-800">{error || 'Item not found'}</p>
        <Link
          href="/marketplace/review"
          className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Back to Review Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/marketplace/review"
            className="mb-2 inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            ← Back to Review Queue
          </Link>
          <h1 className="text-2xl font-bold">{item.title}</h1>
          <div className="mt-2 flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                STATUS_BADGES[version.status]?.className ?? 'bg-slate-100'
              }`}
            >
              {STATUS_BADGES[version.status]?.label ?? version.status}
            </span>
            <span className="text-slate-500">v{version.version}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-500">
              {item.itemType === 'CONTENT_PACK' ? 'Content Pack' : 'Embedded Tool'}
            </span>
          </div>
        </div>

        {canReview && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectModal(true)}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Reject
            </button>
            <button
              onClick={() => setShowApproveModal(true)}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h3 className="font-semibold text-red-800">Validation Issues</h3>
          <ul className="mt-2 space-y-1">
            {validationIssues.map((issue, idx) => (
              <li key={idx} className="text-sm text-red-700">
                • <span className="font-medium">{issue.field}:</span> {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Description</h2>
            <p className="text-slate-600">{item.shortDescription}</p>
            <hr className="my-4 border-slate-200" />
            <p className="whitespace-pre-wrap text-sm text-slate-600">{item.longDescription}</p>
          </section>

          {/* Creator Notes */}
          {version.reviewNotes && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 font-semibold">Creator Notes</h2>
              <p className="text-sm text-slate-600">{version.reviewNotes}</p>
            </section>
          )}

          {/* Changelog */}
          {version.changelog && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 font-semibold">Changelog</h2>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{version.changelog}</p>
            </section>
          )}

          {/* Content Pack Items */}
          {item.itemType === 'CONTENT_PACK' && version.contentPackItems && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 font-semibold">
                Learning Objects ({version.contentPackItems.length})
              </h2>
              {version.contentPackItems.length === 0 ? (
                <p className="text-sm text-slate-500">No learning objects added</p>
              ) : (
                <div className="space-y-2">
                  {version.contentPackItems.map((cp, idx) => (
                    <div
                      key={cp.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        cp.isHighlight ? 'border-yellow-300 bg-yellow-50' : 'border-slate-200'
                      }`}
                    >
                      <span className="w-8 text-center text-sm text-slate-400">#{idx + 1}</span>
                      <div className="flex-1">
                        <p className="font-mono text-sm">{cp.loVersionId}</p>
                        {cp.loId && (
                          <p className="text-xs text-slate-500">LO: {cp.loId}</p>
                        )}
                      </div>
                      {cp.isHighlight && (
                        <span className="rounded bg-yellow-200 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          Featured
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Embedded Tool Config */}
          {item.itemType === 'EMBEDDED_TOOL' && version.embeddedToolConfig && (
            <section className="rounded-lg border border-slate-200 bg-white p-6">
              <h2 className="mb-4 font-semibold">Tool Configuration</h2>
              <div className="space-y-4">
                <div>
                  <span className="text-sm text-slate-500">Launch URL</span>
                  <p className="mt-1 break-all font-mono text-sm">
                    {version.embeddedToolConfig.launchUrl}
                  </p>
                </div>

                <div>
                  <span className="text-sm text-slate-500">Required Scopes</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {version.embeddedToolConfig.requiredScopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
                        title={SCOPE_LABELS[scope]?.description}
                      >
                        {SCOPE_LABELS[scope]?.label ?? scope}
                      </span>
                    ))}
                  </div>
                </div>

                {version.embeddedToolConfig.optionalScopes.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Optional Scopes</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {version.embeddedToolConfig.optionalScopes.map((scope) => (
                        <span
                          key={scope}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          title={SCOPE_LABELS[scope]?.description}
                        >
                          {SCOPE_LABELS[scope]?.label ?? scope}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {version.embeddedToolConfig.sandboxAttributes.length > 0 && (
                  <div>
                    <span className="text-sm text-slate-500">Sandbox Flags</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {version.embeddedToolConfig.sandboxAttributes.map((flag) => (
                        <span
                          key={flag}
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Vendor</h2>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-slate-500">Name: </span>
                {item.vendor.name}
              </p>
              <p>
                <span className="text-slate-500">Type: </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.vendor.type === 'AIVO'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {item.vendor.type === 'AIVO' ? 'Aivo' : 'Partner'}
                </span>
              </p>
              <p>
                <span className="text-slate-500">Slug: </span>
                <code className="rounded bg-slate-100 px-1">{item.vendor.slug}</code>
              </p>
            </div>
          </section>

          {/* Subjects & Grades */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Subjects & Grades</h2>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-slate-500">Subjects</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.subjects.map((subject) => (
                    <span
                      key={subject}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {SUBJECT_LABELS[subject] ?? subject}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-sm text-slate-500">Grade Bands</span>
                <div className="mt-1 flex flex-wrap gap-1">
                  {item.gradeBands.map((grade) => (
                    <span
                      key={grade}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                    >
                      {GRADE_LABELS[grade] ?? grade}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Timeline */}
          <section className="rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="mb-4 font-semibold">Timeline</h2>
            <div className="space-y-2 text-sm">
              {version.submittedAt && (
                <p>
                  <span className="text-slate-500">Submitted: </span>
                  {new Date(version.submittedAt).toLocaleString()}
                </p>
              )}
              {version.reviewedAt && (
                <p>
                  <span className="text-slate-500">Reviewed: </span>
                  {new Date(version.reviewedAt).toLocaleString()}
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Approve Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Approve Submission</h2>
            <p className="mt-1 text-sm text-slate-600">
              Approve &quot;{item.title}&quot; v{version.version}?
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium">Notes (optional)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={3}
                placeholder="Add any notes for the creator..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setReviewNotes('');
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleApprove()}
                disabled={submitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Reject Submission</h2>
            <p className="mt-1 text-sm text-slate-600">
              Reject &quot;{item.title}&quot; v{version.version}?
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="Explain why this submission is being rejected..."
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setReviewNotes('');
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleReject()}
                disabled={submitting || !reviewNotes.trim()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
