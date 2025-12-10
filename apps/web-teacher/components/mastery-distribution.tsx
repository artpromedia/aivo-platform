'use client';

import type { MasteryBucket } from '../lib/classroom-analytics';

interface MasteryDistributionProps {
  buckets: MasteryBucket[];
}

export function MasteryDistribution({ buckets }: MasteryDistributionProps) {
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <div className="space-y-2" role="img" aria-label="Mastery distribution histogram">
      {buckets.map((bucket) => (
        <div key={bucket.range} className="flex items-center gap-3">
          <div className="w-20 text-xs text-muted text-right">{bucket.range}</div>
          <div className="flex-1 h-6 bg-surface-muted rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(bucket.count / maxCount) * 100}%` }}
              role="presentation"
            />
          </div>
          <div className="w-16 text-xs text-muted">
            {bucket.count} ({bucket.percentage}%)
          </div>
        </div>
      ))}
      <p className="sr-only">
        Distribution of learner mastery scores across 5 ranges from 0-20% to 80-100%.
      </p>
    </div>
  );
}
