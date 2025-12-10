import { Suspense } from 'react';

import { LearningObjectsList } from '../../components/learning-objects-list';

export default function LearningObjectsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LearningObjectsList />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
