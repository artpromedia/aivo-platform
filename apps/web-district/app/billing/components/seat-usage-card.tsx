'use client';

import type { SeatUsage } from '../../../lib/billing-api';
import { getSeatUsagePercentage, getSeatUsageLevel } from '../../../lib/billing-api';

interface SeatUsageCardProps {
  seatUsage: SeatUsage;
}

export function SeatUsageCard({ seatUsage }: SeatUsageCardProps) {
  const percentage = getSeatUsagePercentage(seatUsage);
  const level = getSeatUsageLevel(seatUsage);

  const barColorClass = {
    normal: 'bg-primary',
    warning: 'bg-warning',
    critical: 'bg-error',
  }[level];

  const textColorClass = {
    normal: 'text-text',
    warning: 'text-warning',
    critical: 'text-error',
  }[level];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium text-muted">Seat Licenses</div>
          <div className={`mt-1 text-2xl font-bold ${textColorClass}`}>
            {seatUsage.usedSeats.toLocaleString()} / {seatUsage.totalSeats.toLocaleString()}
          </div>
        </div>
        <div
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            level === 'normal'
              ? 'bg-surface-muted text-muted'
              : level === 'warning'
                ? 'bg-warning/10 text-warning'
                : 'bg-error/10 text-error'
          }`}
        >
          {percentage}% used
        </div>
      </div>

      {/* Usage Bar */}
      <div className="mt-4">
        <div
          className="h-3 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Seat usage: ${seatUsage.usedSeats} of ${seatUsage.totalSeats} seats used`}
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColorClass}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted">
          <span>{seatUsage.availableSeats.toLocaleString()} seats available</span>
          <span>
            Updated: {new Date(seatUsage.lastUpdatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  );
}
