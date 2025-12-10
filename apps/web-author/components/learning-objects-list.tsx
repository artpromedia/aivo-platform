'use client';

import { Badge, Button, Card } from '@aivo/ui-web';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { listLearningObjects } from '../lib/authoring-api';
import { useToast } from '../lib/toast';
import {
  SUBJECT_LABELS,
  GRADE_BAND_LABELS,
  VERSION_STATE_LABELS,
  VERSION_STATE_TONES,
  type LearningObject,
  type Subject,
  type GradeBand,
  type VersionState,
} from '../lib/types';

const SUBJECTS: Subject[] = ['ELA', 'MATH', 'SCIENCE', 'SEL', 'SPEECH', 'OTHER'];
const GRADE_BANDS: GradeBand[] = ['K_2', 'G3_5', 'G6_8', 'G9_12'];
const VERSION_STATES: VersionState[] = ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'RETIRED'];

export function LearningObjectsList() {
  const searchParams = useSearchParams();
  const { addToast } = useToast();

  const [objects, setObjects] = useState<LearningObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });

  // Filters from URL params
  const subjectFilter = searchParams.get('subject') as Subject | null;
  const gradeBandFilter = searchParams.get('gradeBand') as GradeBand | null;
  const stateFilter = searchParams.get('state') as VersionState | null;
  const createdByMe = searchParams.get('createdByMe') === 'true';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const fetchObjects = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listLearningObjects({
        subject: subjectFilter ?? undefined,
        gradeBand: gradeBandFilter ?? undefined,
        state: stateFilter ?? undefined,
        createdByMe: createdByMe || undefined,
        page,
        pageSize: 20,
      });
      setObjects(result.data);
      setPagination(result.pagination);
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Failed to load learning objects');
    } finally {
      setLoading(false);
    }
  }, [subjectFilter, gradeBandFilter, stateFilter, createdByMe, page, addToast]);

  useEffect(() => {
    void fetchObjects();
  }, [fetchObjects]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Learning Objects</h1>
          <p className="mt-1 text-sm text-muted">
            {createdByMe ? 'My drafts' : 'Browse and manage all learning objects'}
          </p>
        </div>
        <Link href="/learning-objects/new">
          <Button>Create New</Button>
        </Link>
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
          <FilterSelect
            label="State"
            value={stateFilter || ''}
            options={[
              { value: '', label: 'All States' },
              ...VERSION_STATES.map((s) => ({ value: s, label: VERSION_STATE_LABELS[s] })),
            ]}
            paramName="state"
          />
        </div>
      </Card>

      {/* Results */}
      {loading ? (
        <LoadingSkeleton />
      ) : objects.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {objects.map((lo) => (
              <LearningObjectCard key={lo.id} object={lo} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
            />
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  paramName: string;
}

function FilterSelect({ label, value, options, paramName }: FilterSelectProps) {
  const searchParams = useSearchParams();

  const handleChange = (newValue: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newValue) {
      params.set(paramName, newValue);
    } else {
      params.delete(paramName);
    }
    params.delete('page'); // Reset to page 1 when filtering
    window.history.pushState(null, '', `?${params.toString()}`);
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={paramName} className="text-sm font-medium text-muted">
        {label}
      </label>
      <select
        id={paramName}
        value={value}
        onChange={(e) => {
          handleChange(e.target.value);
        }}
        className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/50"
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

interface LearningObjectCardProps {
  object: LearningObject;
}

function LearningObjectCard({ object }: LearningObjectCardProps) {
  const latestState = object.latestVersion?.state ?? 'DRAFT';

  return (
    <Link href={`/learning-objects/${object.id}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-text line-clamp-2">{object.title}</h3>
            <Badge tone={VERSION_STATE_TONES[latestState]} className="shrink-0">
              {VERSION_STATE_LABELS[latestState]}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted">
            <span className="rounded bg-surface-muted px-2 py-0.5">
              {SUBJECT_LABELS[object.subject]}
            </span>
            <span className="rounded bg-surface-muted px-2 py-0.5">
              Grades {GRADE_BAND_LABELS[object.gradeBand]}
            </span>
            {object.latestVersion && (
              <span className="rounded bg-surface-muted px-2 py-0.5">
                v{object.latestVersion.versionNumber}
              </span>
            )}
          </div>

          {object.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {object.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {tag.tag}
                </span>
              ))}
              {object.tags.length > 3 && (
                <span className="text-xs text-muted">+{object.tags.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="py-12 text-center">
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-surface-muted p-3 text-muted">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
          />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-text">No learning objects found</h3>
      <p className="mt-1 text-sm text-muted">Get started by creating your first learning object.</p>
      <Link href="/learning-objects/new" className="mt-4 inline-block">
        <Button>Create Learning Object</Button>
      </Link>
    </Card>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
}

function Pagination({ currentPage, totalPages, total }: PaginationProps) {
  const searchParams = useSearchParams();

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    window.history.pushState(null, '', `?${params.toString()}`);
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted">
        Showing page {currentPage} of {totalPages} ({total} total)
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          disabled={currentPage <= 1}
          onClick={() => {
            goToPage(currentPage - 1);
          }}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          disabled={currentPage >= totalPages}
          onClick={() => {
            goToPage(currentPage + 1);
          }}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
