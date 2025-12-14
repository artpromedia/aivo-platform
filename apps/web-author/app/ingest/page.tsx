import { Suspense } from 'react';

import { IngestionJobs } from '../../components/ingestion-jobs';

export default function IngestPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <IngestionJobs />
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
            className="h-20 animate-pulse rounded-xl border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
