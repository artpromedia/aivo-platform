'use client';

/**
 * Curriculum Detail View Component
 *
 * Displays curriculum information, units, and lessons.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import {
  type Curriculum,
  type CurriculumStatus,
  getCurriculumById,
  publishCurriculum,
  archiveCurriculum,
  deleteCurriculum,
  SUBJECT_AREAS,
  GRADE_LEVELS,
  STATUS_DISPLAY,
  formatDate,
  formatDateTime,
} from '../../../lib/curriculum-api';

interface CurriculumDetailViewProps {
  curriculumId: string;
}

export function CurriculumDetailView({ curriculumId }: CurriculumDetailViewProps) {
  const router = useRouter();
  const { tenantId } = useAuth();
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    async function loadCurriculum() {
      if (!tenantId) return;

      setLoading(true);
      setError(null);

      try {
        const accessToken = 'mock-token';
        const result = await getCurriculumById(curriculumId, tenantId, accessToken);
        setCurriculum(result.curriculum);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load curriculum');
        // Use mock data for demonstration
        setCurriculum(MOCK_CURRICULUM);
      } finally {
        setLoading(false);
      }
    }

    void loadCurriculum();
  }, [curriculumId, tenantId]);

  const handlePublish = useCallback(async () => {
    if (!tenantId || !curriculum) return;

    setActionLoading('publish');
    try {
      const accessToken = 'mock-token';
      const result = await publishCurriculum(curriculum.id, tenantId, accessToken);
      setCurriculum(result.curriculum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish curriculum');
    } finally {
      setActionLoading(null);
    }
  }, [tenantId, curriculum]);

  const handleArchive = useCallback(async () => {
    if (!tenantId || !curriculum) return;

    setActionLoading('archive');
    try {
      const accessToken = 'mock-token';
      const result = await archiveCurriculum(curriculum.id, tenantId, accessToken);
      setCurriculum(result.curriculum);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive curriculum');
    } finally {
      setActionLoading(null);
    }
  }, [tenantId, curriculum]);

  const handleDelete = useCallback(async () => {
    if (!tenantId || !curriculum) return;

    setActionLoading('delete');
    try {
      const accessToken = 'mock-token';
      await deleteCurriculum(curriculum.id, tenantId, accessToken);
      router.push('/curriculum');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete curriculum');
      setActionLoading(null);
    }
  }, [tenantId, curriculum, router]);

  if (loading) {
    return <DetailSkeleton />;
  }

  if (error && !curriculum) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/curriculum" className="mt-2 inline-block text-sm text-primary hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <h3 className="text-lg font-medium">Curriculum not found</h3>
        <Link href="/curriculum" className="mt-2 inline-block text-sm text-primary hover:underline">
          Back to Library
        </Link>
      </div>
    );
  }

  const subjectInfo = SUBJECT_AREAS[curriculum.subjectArea] || {
    label: curriculum.subjectArea,
    colorClass: 'bg-gray-100 text-gray-700',
  };
  const gradeInfo = GRADE_LEVELS[curriculum.gradeLevel] || {
    label: curriculum.gradeLevel,
    shortLabel: curriculum.gradeLevel,
  };
  const statusInfo = STATUS_DISPLAY[curriculum.status];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted">
        <Link href="/curriculum" className="hover:text-primary">
          Curriculum Library
        </Link>
        <span>/</span>
        <span className="text-text">{curriculum.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{curriculum.name}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${statusInfo.colorClass}`}>
              {statusInfo.label}
            </span>
          </div>
          {curriculum.description && (
            <p className="mt-2 max-w-2xl text-muted">{curriculum.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium ${subjectInfo.colorClass}`}>
              {subjectInfo.label}
            </span>
            <span className="inline-flex items-center rounded-full bg-surface-muted px-2.5 py-0.5 text-sm text-muted">
              {gradeInfo.label}
            </span>
            <span className="text-sm text-muted">
              Updated {formatDate(curriculum.updatedAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {curriculum.status === 'DRAFT' && (
            <button
              onClick={handlePublish}
              disabled={actionLoading === 'publish'}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:opacity-50"
            >
              {actionLoading === 'publish' ? (
                <LoadingSpinner />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              Publish
            </button>
          )}
          {curriculum.status === 'PUBLISHED' && (
            <button
              onClick={handleArchive}
              disabled={actionLoading === 'archive'}
              className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted disabled:opacity-50"
            >
              {actionLoading === 'archive' ? (
                <LoadingSpinner />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              )}
              Archive
            </button>
          )}
          <button
            onClick={() => router.push(`/curriculum/${curriculumId}/edit`)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:bg-surface-muted"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      </div>

      {/* Units and Lessons */}
      <div className="rounded-lg border border-border bg-surface">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold">Curriculum Structure</h2>
          <p className="mt-1 text-sm text-muted">
            {curriculum.units?.length || 0} units with organized lessons
          </p>
        </div>

        {curriculum.units && curriculum.units.length > 0 ? (
          <div className="divide-y divide-border">
            {curriculum.units.map((unit, index) => (
              <UnitAccordion key={unit.id} unit={unit} index={index} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-muted">
            <p>No units added yet. Edit this curriculum to add units and lessons.</p>
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetadataCard
          label="Created"
          value={formatDateTime(curriculum.createdAt)}
          subvalue={`by ${curriculum.createdBy}`}
        />
        <MetadataCard
          label="Last Updated"
          value={formatDateTime(curriculum.updatedAt)}
        />
        {curriculum.publishedAt && (
          <MetadataCard
            label="Published"
            value={formatDateTime(curriculum.publishedAt)}
          />
        )}
        <MetadataCard
          label="Standards Aligned"
          value={`${curriculum.standards?.length || 0} standards`}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative w-full max-w-md rounded-xl bg-surface p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-red-600">Delete Curriculum</h3>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to delete "{curriculum.name}"? This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === 'delete' ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitAccordion({
  unit,
  index,
}: {
  unit: Curriculum['units'][number];
  index: number;
}) {
  const [isOpen, setIsOpen] = useState(index === 0);

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-surface-muted"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {unit.sequenceOrder}
          </span>
          <div>
            <h3 className="font-medium">{unit.title}</h3>
            {unit.description && (
              <p className="text-sm text-muted">{unit.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{unit.lessons?.length || 0} lessons</span>
          <svg
            className={`h-5 w-5 text-muted transition ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isOpen && unit.lessons && unit.lessons.length > 0 && (
        <div className="border-t border-border bg-surface-muted/50 px-4 py-2">
          {unit.lessons.map((lesson) => (
            <div
              key={lesson.id}
              className="flex items-center justify-between rounded-lg px-4 py-2 hover:bg-surface"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted">{lesson.sequenceOrder}.</span>
                <span className="text-sm">{lesson.title}</span>
              </div>
              {lesson.duration && (
                <span className="text-xs text-muted">{lesson.duration} min</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MetadataCard({
  label,
  value,
  subvalue,
}: {
  label: string;
  value: string;
  subvalue?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
      {subvalue && <p className="text-xs text-muted">{subvalue}</p>}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-4 w-48 animate-pulse rounded bg-surface-muted" />
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded bg-surface-muted" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Mock data for demonstration
const MOCK_CURRICULUM: Curriculum = {
  id: '1',
  name: 'Algebra I Comprehensive Curriculum',
  description: 'A complete Algebra I curriculum aligned with Common Core standards, covering linear equations, inequalities, and functions.',
  subjectArea: 'MATH',
  gradeLevel: '9',
  status: 'PUBLISHED',
  standards: [
    { id: 's1', standardCode: 'CCSS.MATH.HSA.REI.A.1', standardDescription: 'Explain each step in solving a simple equation', framework: 'CCSS', alignmentLevel: 'primary', createdAt: '2024-01-15' },
    { id: 's2', standardCode: 'CCSS.MATH.HSA.REI.B.3', standardDescription: 'Solve linear equations and inequalities in one variable', framework: 'CCSS', alignmentLevel: 'primary', createdAt: '2024-01-15' },
    { id: 's3', standardCode: 'CCSS.MATH.HSA.CED.A.1', standardDescription: 'Create equations and inequalities in one variable', framework: 'CCSS', alignmentLevel: 'secondary', createdAt: '2024-01-15' },
  ],
  units: [
    {
      id: 'u1',
      title: 'Introduction to Algebra',
      description: 'Foundational concepts and algebraic thinking',
      sequenceOrder: 1,
      lessons: [
        { id: 'l1', title: 'Variables and Expressions', sequenceOrder: 1, duration: 45 },
        { id: 'l2', title: 'Order of Operations', sequenceOrder: 2, duration: 45 },
        { id: 'l3', title: 'Properties of Real Numbers', sequenceOrder: 3, duration: 50 },
      ],
    },
    {
      id: 'u2',
      title: 'Linear Equations',
      description: 'Solving and graphing linear equations',
      sequenceOrder: 2,
      lessons: [
        { id: 'l4', title: 'One-Step Equations', sequenceOrder: 1, duration: 45 },
        { id: 'l5', title: 'Two-Step Equations', sequenceOrder: 2, duration: 45 },
        { id: 'l6', title: 'Multi-Step Equations', sequenceOrder: 3, duration: 50 },
        { id: 'l7', title: 'Equations with Variables on Both Sides', sequenceOrder: 4, duration: 50 },
      ],
    },
    {
      id: 'u3',
      title: 'Inequalities',
      description: 'Understanding and solving inequalities',
      sequenceOrder: 3,
      lessons: [
        { id: 'l8', title: 'Graphing Inequalities', sequenceOrder: 1, duration: 45 },
        { id: 'l9', title: 'Solving Inequalities', sequenceOrder: 2, duration: 45 },
        { id: 'l10', title: 'Compound Inequalities', sequenceOrder: 3, duration: 50 },
      ],
    },
  ],
  createdBy: 'admin',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-02-20T14:30:00Z',
  publishedAt: '2024-02-01T09:00:00Z',
};
