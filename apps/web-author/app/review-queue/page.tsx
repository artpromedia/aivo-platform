import { Suspense } from 'react';

import { ReviewQueue } from '../../components/review-queue';

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReviewQueue />
    </Suspense>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="h-12 w-64 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-16 animate-pulse rounded-xl bg-surface-muted" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
