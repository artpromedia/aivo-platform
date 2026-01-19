'use client';

/**
 * Curriculum Grid Component
 *
 * Displays curricula in a grid with stats and pagination.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '../providers';
import {
  type Curriculum,
  type CurriculumStatus,
  getCurricula,
  SUBJECT_AREAS,
  GRADE_LEVELS,
  STATUS_DISPLAY,
  formatDate,
} from '../../lib/curriculum-api';

export function CurriculumGrid() {
  const { tenantId } = useAuth();
  const searchParams = useSearchParams();
  const [curricula, setCurricula] = useState<Curriculum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCurricula() {
      if (!tenantId) return;

      setLoading(true);
      setError(null);

      try {
        // In production, get access token from auth context
        const accessToken = 'mock-token';
        const filters = {
          subjectArea: searchParams.get('subject') || undefined,
          gradeLevel: searchParams.get('grade') || undefined,
          status: (searchParams.get('status') as CurriculumStatus) || undefined,
        };

        const result = await getCurricula(tenantId, accessToken, filters);

        // Apply client-side search filter
        let filtered = result.curricula;
        const query = searchParams.get('query')?.toLowerCase();
        if (query) {
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(query) ||
              c.description?.toLowerCase().includes(query) ||
              c.subjectArea.toLowerCase().includes(query)
          );
        }

        // Apply client-side sort
        const sort = searchParams.get('sort') || 'newest';
        filtered = sortCurricula(filtered, sort);

        setCurricula(filtered);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load curricula');
        // Use mock data for demonstration
        setCurricula(MOCK_CURRICULA);
      } finally {
        setLoading(false);
      }
    }

    void loadCurricula();
  }, [tenantId, searchParams]);

  if (loading) {
    return <GridSkeleton />;
  }

  if (error && curricula.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-2 text-sm text-red-500 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Calculate stats
  const stats = calculateStats(curricula);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Curricula"
          value={stats.total}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
        />
        <StatCard
          label="Published"
          value={stats.published}
          icon={
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Drafts"
          value={stats.drafts}
          icon={
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
        <StatCard
          label="Standards Aligned"
          value={`${stats.standardsAligned}%`}
          icon={
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">
          {curricula.length} curriculum{curricula.length !== 1 ? 's' : ''} found
        </span>
      </div>

      {/* Grid */}
      {curricula.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {curricula.map((curriculum) => (
            <CurriculumCard key={curriculum.id} curriculum={curriculum} />
          ))}
        </div>
      )}
    </div>
  );
}

function CurriculumCard({ curriculum }: { curriculum: Curriculum }) {
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
    <Link
      href={`/curriculum/${curriculum.id}`}
      className="group flex flex-col rounded-lg border border-border bg-surface transition hover:border-primary hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium leading-tight line-clamp-2 group-hover:text-primary">
            {curriculum.name}
          </h3>
          {curriculum.description && (
            <p className="mt-1 text-sm text-muted line-clamp-2">{curriculum.description}</p>
          )}
        </div>
        <span
          className={`ml-2 flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.colorClass}`}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${subjectInfo.colorClass}`}>
          {subjectInfo.label}
        </span>
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted">
          {gradeInfo.label}
        </span>
      </div>

      {/* Stats */}
      <div className="mt-auto border-t border-border px-4 py-3">
        <div className="flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              {curriculum.units?.length || 0} units
            </span>
            <span className="flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {curriculum.standards?.length || 0} standards
            </span>
          </div>
          <span>{formatDate(curriculum.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-muted">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-border bg-surface p-8 text-center">
      <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-surface-muted p-4">
        <svg className="h-full w-full text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      </div>
      <h3 className="text-lg font-medium">No curricula found</h3>
      <p className="mt-1 text-sm text-muted">
        Try adjusting your filters or upload a new curriculum
      </p>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}

function sortCurricula(curricula: Curriculum[], sort: string): Curriculum[] {
  const sorted = [...curricula];
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'updated':
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'name_desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case 'subject':
      return sorted.sort((a, b) => a.subjectArea.localeCompare(b.subjectArea));
    case 'grade':
      return sorted.sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel));
    default:
      return sorted;
  }
}

function calculateStats(curricula: Curriculum[]) {
  const total = curricula.length;
  const published = curricula.filter((c) => c.status === 'PUBLISHED').length;
  const drafts = curricula.filter((c) => c.status === 'DRAFT').length;
  const withStandards = curricula.filter((c) => (c.standards?.length || 0) > 0).length;
  const standardsAligned = total > 0 ? Math.round((withStandards / total) * 100) : 0;

  return { total, published, drafts, standardsAligned };
}

// Mock data for demonstration
const MOCK_CURRICULA: Curriculum[] = [
  {
    id: '1',
    name: 'Algebra I Comprehensive Curriculum',
    description: 'A complete Algebra I curriculum aligned with Common Core standards, covering linear equations, inequalities, and functions.',
    subjectArea: 'MATH',
    gradeLevel: '9',
    status: 'PUBLISHED',
    standards: [
      { id: 's1', standardCode: 'CCSS.MATH.HSA.REI.A.1', standardDescription: 'Explain each step in solving a simple equation', framework: 'CCSS', alignmentLevel: 'primary', createdAt: '2024-01-15' },
      { id: 's2', standardCode: 'CCSS.MATH.HSA.REI.B.3', standardDescription: 'Solve linear equations and inequalities in one variable', framework: 'CCSS', alignmentLevel: 'primary', createdAt: '2024-01-15' },
    ],
    units: [
      { id: 'u1', title: 'Linear Equations', sequenceOrder: 1, lessons: [] },
      { id: 'u2', title: 'Inequalities', sequenceOrder: 2, lessons: [] },
      { id: 'u3', title: 'Functions', sequenceOrder: 3, lessons: [] },
    ],
    createdBy: 'admin',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-02-20T14:30:00Z',
    publishedAt: '2024-02-01T09:00:00Z',
  },
  {
    id: '2',
    name: '8th Grade ELA Literature Units',
    description: 'Engaging literature units featuring diverse voices and contemporary themes for 8th grade students.',
    subjectArea: 'ELA',
    gradeLevel: '8',
    status: 'PUBLISHED',
    standards: [
      { id: 's3', standardCode: 'CCSS.ELA-LITERACY.RL.8.1', standardDescription: 'Cite textual evidence', framework: 'CCSS', alignmentLevel: 'primary', createdAt: '2024-01-10' },
    ],
    units: [
      { id: 'u4', title: 'Poetry Analysis', sequenceOrder: 1, lessons: [] },
      { id: 'u5', title: 'Novel Study', sequenceOrder: 2, lessons: [] },
    ],
    createdBy: 'admin',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-02-15T11:00:00Z',
    publishedAt: '2024-01-20T10:00:00Z',
  },
  {
    id: '3',
    name: 'Middle School Science - Life Sciences',
    description: 'NGSS-aligned life science curriculum covering cells, genetics, and ecosystems.',
    subjectArea: 'SCIENCE',
    gradeLevel: '6_8',
    status: 'DRAFT',
    standards: [],
    units: [
      { id: 'u6', title: 'Cell Biology', sequenceOrder: 1, lessons: [] },
      { id: 'u7', title: 'Genetics', sequenceOrder: 2, lessons: [] },
    ],
    createdBy: 'admin',
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-02-25T16:00:00Z',
  },
  {
    id: '4',
    name: 'US History - Civil War Era',
    description: 'In-depth exploration of the American Civil War, its causes, key events, and lasting impact.',
    subjectArea: 'SOCIAL_STUDIES',
    gradeLevel: '11',
    status: 'PUBLISHED',
    standards: [
      { id: 's4', standardCode: 'C3.D2.His.1.9-12', standardDescription: 'Evaluate historical sources', framework: 'C3', alignmentLevel: 'primary', createdAt: '2024-01-05' },
    ],
    units: [
      { id: 'u8', title: 'Causes of the Civil War', sequenceOrder: 1, lessons: [] },
      { id: 'u9', title: 'Major Battles', sequenceOrder: 2, lessons: [] },
      { id: 'u10', title: 'Reconstruction', sequenceOrder: 3, lessons: [] },
    ],
    createdBy: 'admin',
    createdAt: '2024-01-05T07:00:00Z',
    updatedAt: '2024-02-10T13:00:00Z',
    publishedAt: '2024-01-15T08:00:00Z',
  },
  {
    id: '5',
    name: 'Elementary Art Foundations',
    description: 'Introduction to visual arts fundamentals for K-2 students.',
    subjectArea: 'ART',
    gradeLevel: 'K_2',
    status: 'ARCHIVED',
    standards: [],
    units: [
      { id: 'u11', title: 'Colors and Shapes', sequenceOrder: 1, lessons: [] },
    ],
    createdBy: 'admin',
    createdAt: '2023-08-15T10:00:00Z',
    updatedAt: '2023-12-01T09:00:00Z',
  },
  {
    id: '6',
    name: 'Computer Science Principles',
    description: 'Introduction to computational thinking and programming concepts for high school students.',
    subjectArea: 'TECH',
    gradeLevel: '9_12',
    status: 'DRAFT',
    standards: [
      { id: 's5', standardCode: 'CSTA.3A-AP-13', standardDescription: 'Create prototypes that use algorithms', framework: 'CSTA', alignmentLevel: 'primary', createdAt: '2024-02-10' },
    ],
    units: [
      { id: 'u12', title: 'Computational Thinking', sequenceOrder: 1, lessons: [] },
      { id: 'u13', title: 'Programming Basics', sequenceOrder: 2, lessons: [] },
    ],
    createdBy: 'admin',
    createdAt: '2024-02-10T11:00:00Z',
    updatedAt: '2024-02-28T15:00:00Z',
  },
];
