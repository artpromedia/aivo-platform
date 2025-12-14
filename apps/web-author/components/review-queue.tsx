'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { getReviewQueue, submitReview } from '../lib/authoring-api';
import { useToast } from '../lib/toast';
import {
  SUBJECT_LABELS,
  GRADE_BAND_LABELS,
  type Subject,
  type GradeBand,
} from '../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface ReviewQueueItem {
  id: string; // version ID
  versionNumber: number;
  submittedAt: string;
  createdByUserId: string;
  learningObject: {
    id: string;
    slug: string;
    title: string;
    subject: Subject;
    gradeBand: GradeBand;
  };
  _count?: {
    reviews: number;
  };
}

interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

type ReviewDecision = 'APPROVED' | 'CHANGES_REQUESTED' | 'REJECTED';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const SUBJECTS: Subject[] = ['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER'];
const GRADE_BANDS: GradeBand[] = ['K_2', 'G3_5', 'G6_8', 'G9_12'];

const DECISION_LABELS: Record<ReviewDecision, string> = {
  APPROVED: 'Approve',
  CHANGES_REQUESTED: 'Request Changes',
  REJECTED: 'Reject',
};

const DECISION_TONES: Record<ReviewDecision, 'success' | 'warning' | 'error'> = {
  APPROVED: 'success',
  CHANGES_REQUESTED: 'warning',
  REJECTED: 'error',
};

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function ReviewQueue() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { addToast } = useToast();

  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Review dialog state
  const [reviewingItem, setReviewingItem] = useState<ReviewQueueItem | null>(null);
  const [decision, setDecision] = useState<ReviewDecision>('APPROVED');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filters from URL params
  const subjectFilter = searchParams.get('subject') as Subject | null;
  const gradeBandFilter = searchParams.get('gradeBand') as GradeBand | null;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = 20;

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getReviewQueue({
        subject: subjectFilter ?? undefined,
        gradeBand: gradeBandFilter ?? undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setItems(result.items);
      setTotal(result.pagination.total);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load review queue');
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, gradeBandFilter, page, addToast]);

  useEffect(() => {
    void fetchQueue();
  }, [fetchQueue]);

  const handleOpenReview = (item: ReviewQueueItem) => {
    setReviewingItem(item);
    setDecision('APPROVED');
    setComments('');
  };

  const handleCloseReview = () => {
    setReviewingItem(null);
    setDecision('APPROVED');
    setComments('');
  };

  const handleSubmitReview = async () => {
    if (!reviewingItem) return;

    // Comments required for non-approval
    if (decision !== 'APPROVED' && !comments.trim()) {
      addToast('error', 'Comments are required when requesting changes or rejecting');
      return;
    }

    setSubmitting(true);
    try {
      await submitReview(reviewingItem.id, {
        decision,
        comments: comments.trim() || undefined,
      });
      addToast('success', `Review submitted: ${DECISION_LABELS[decision]}`);
      handleCloseReview();
      void fetchQueue(); // Refresh the list
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Review Queue</h1>
          <p className="mt-1 text-sm text-muted">
            Content awaiting review and approval ({total} items)
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <FilterSelect
            label="Subject"
            value={subjectFilter || ''}
            options={[
              { value: '', label: 'All Subjects' },
              ...SUBJECTS.map((s) => ({ value: s, label: SUBJECT_LABELS[s] })),
            ]}
            paramName="subject"
          />
          <FilterSelect
            label="Grade Band"
            value={gradeBandFilter || ''}
            options={[
              { value: '', label: 'All Grades' },
              ...GRADE_BANDS.map((g) => ({ value: g, label: GRADE_BAND_LABELS[g] })),
            ]}
            paramName="gradeBand"
          />
        </div>
      </Card>

      {/* Queue List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-surface"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <p className="text-lg text-muted">No items awaiting review</p>
            <p className="mt-2 text-sm text-muted">
              All content has been reviewed. Check back later.
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ReviewQueueCard
              key={item.id}
              item={item}
              onReview={() => handleOpenReview(item)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page - 1));
              router.push(`?${params.toString()}`);
            }}
          >
            Previous
          </Button>
          <span className="px-4 text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.set('page', String(page + 1));
              router.push(`?${params.toString()}`);
            }}
          >
            Next
          </Button>
        </div>
      )}

      {/* Review Dialog */}
      {reviewingItem && (
        <ReviewDialog
          item={reviewingItem}
          decision={decision}
          comments={comments}
          submitting={submitting}
          onDecisionChange={setDecision}
          onCommentsChange={setComments}
          onSubmit={handleSubmitReview}
          onClose={handleCloseReview}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface ReviewQueueCardProps {
  item: ReviewQueueItem;
  onReview: () => void;
}

function ReviewQueueCard({ item, onReview }: ReviewQueueCardProps) {
  const submittedDate = new Date(item.submittedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const reviewCount = item._count?.reviews ?? 0;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/learning-objects/${item.learningObject.id}/versions/${item.id}`}
              className="text-lg font-medium text-text hover:text-primary"
            >
              {item.learningObject.title}
            </Link>
            <Badge tone="info">v{item.versionNumber}</Badge>
          </div>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted">
            <span>{SUBJECT_LABELS[item.learningObject.subject]}</span>
            <span>•</span>
            <span>{GRADE_BAND_LABELS[item.learningObject.gradeBand]}</span>
            <span>•</span>
            <span>Submitted {submittedDate}</span>
            {reviewCount > 0 && (
              <>
                <span>•</span>
                <span>{reviewCount} review{reviewCount > 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/learning-objects/${item.learningObject.id}/versions/${item.id}`}>
            <Button variant="secondary" size="sm">
              View
            </Button>
          </Link>
          <Button size="sm" onClick={onReview}>
            Review
          </Button>
        </div>
      </div>
    </Card>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  paramName: string;
}

function FilterSelect({ label, value, options, paramName }: FilterSelectProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set(paramName, newValue);
    } else {
      params.delete(paramName);
    }
    params.delete('page'); // Reset to page 1 on filter change
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-text">{label}:</label>
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ReviewDialogProps {
  item: ReviewQueueItem;
  decision: ReviewDecision;
  comments: string;
  submitting: boolean;
  onDecisionChange: (decision: ReviewDecision) => void;
  onCommentsChange: (comments: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}

function ReviewDialog({
  item,
  decision,
  comments,
  submitting,
  onDecisionChange,
  onCommentsChange,
  onSubmit,
  onClose,
}: ReviewDialogProps) {
  const decisions: ReviewDecision[] = ['APPROVED', 'CHANGES_REQUESTED', 'REJECTED'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-text">Submit Review</h2>
        <p className="mt-1 text-sm text-muted">
          {item.learningObject.title} - Version {item.versionNumber}
        </p>

        {/* Decision Selection */}
        <div className="mt-6">
          <label className="text-sm font-medium text-text">Decision</label>
          <div className="mt-2 flex gap-2">
            {decisions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDecisionChange(d)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  decision === d
                    ? d === 'APPROVED'
                      ? 'bg-success/20 text-success ring-2 ring-success'
                      : d === 'CHANGES_REQUESTED'
                        ? 'bg-warning/20 text-warning ring-2 ring-warning'
                        : 'bg-error/20 text-error ring-2 ring-error'
                    : 'bg-surface-muted text-muted hover:bg-surface-muted/80'
                }`}
              >
                {DECISION_LABELS[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <div className="mt-4">
          <label className="text-sm font-medium text-text">
            Comments {decision !== 'APPROVED' && <span className="text-error">*</span>}
          </label>
          <textarea
            value={comments}
            onChange={(e) => onCommentsChange(e.target.value)}
            placeholder={
              decision === 'APPROVED'
                ? 'Optional feedback for the author...'
                : 'Explain what needs to be changed...'
            }
            rows={4}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={submitting}
            className={
              decision === 'APPROVED'
                ? 'bg-success hover:bg-success/90'
                : decision === 'CHANGES_REQUESTED'
                  ? 'bg-warning hover:bg-warning/90'
                  : 'bg-error hover:bg-error/90'
            }
          >
            {submitting ? 'Submitting...' : `Submit: ${DECISION_LABELS[decision]}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
