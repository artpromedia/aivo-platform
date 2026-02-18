/**
 * Curriculum Detail Page
 *
 * Displays detailed view of a single curriculum with standards mapping and version control.
 */

import { Suspense } from 'react';

import { CurriculumDetailView } from './curriculum-detail';
import { StandardsMapper } from './standards-mapper';
import { VersionControl } from './version-control';

interface CurriculumDetailPageProps {
  params: Promise<{ curriculumId: string }>;
}

export const metadata = {
  title: 'Curriculum Details | Aivo District Admin',
  description: 'View and manage curriculum details',
};

export default async function CurriculumDetailPage({ params }: CurriculumDetailPageProps) {
  const { curriculumId } = await params;
  return (
    <div className="space-y-6">
      <Suspense fallback={<DetailSkeleton />}>
        <CurriculumDetailView curriculumId={curriculumId} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<SectionSkeleton title="Standards Mapping" />}>
          <StandardsMapper curriculumId={curriculumId} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Version History" />}>
          <VersionControl curriculumId={curriculumId} />
        </Suspense>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
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

      {/* Content skeleton */}
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

function SectionSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-6 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-muted" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-surface-muted" />
        ))}
      </div>
    </div>
  );
}
