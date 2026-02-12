import { Suspense } from 'react';

import { LibraryItemContent } from './content';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Library Item Detail Page
 *
 * Shows details about a marketplace item and allows teachers
 * to add it to one or more of their classrooms.
 */
export default async function LibraryItemPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <Suspense fallback={<DetailSkeleton />}>
      <LibraryItemContent slug={slug} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="h-5 w-24 animate-pulse rounded bg-surface-muted" />

      {/* Header */}
      <div className="flex gap-6">
        <div className="h-24 w-24 animate-pulse rounded-xl bg-surface-muted" />
        <div className="flex-1 space-y-3">
          <div className="h-8 w-64 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-48 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
        </div>
        <div className="h-80 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  );
}
