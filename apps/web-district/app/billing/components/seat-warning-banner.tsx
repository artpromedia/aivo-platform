'use client';

import { Button } from '@aivo/ui-web';

import type { SeatUsage } from '../../../lib/billing-api';
import { getSeatUsageLevel, getSeatUsagePercentage } from '../../../lib/billing-api';

interface SeatWarningBannerProps {
  seatUsage: SeatUsage;
}

export function SeatWarningBanner({ seatUsage }: SeatWarningBannerProps) {
  const percentage = getSeatUsagePercentage(seatUsage);
  const level = getSeatUsageLevel(seatUsage);

  // Only show banner for warning or critical levels
  if (level === 'normal') {
    return null;
  }

  const handleRequestSeats = () => {
    window.open(
      `mailto:sales@aivo.com?subject=Seat%20Capacity%20Request&body=Hi%2C%0A%0AWe%20are%20currently%20using%20${seatUsage.usedSeats}%20of%20${seatUsage.totalSeats}%20seats%20(${percentage}%25%20capacity).%0A%0AWe%20would%20like%20to%20request%20additional%20seats%20for%20our%20district.%0A%0APlease%20contact%20me%20to%20discuss%20options.`,
      '_blank'
    );
  };

  const isCritical = level === 'critical';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`rounded-xl border p-4 ${
        isCritical
          ? 'border-error/40 bg-error/10'
          : 'border-warning/40 bg-warning/10'
      }`}
    >
      <div className="flex items-start gap-3">
        <WarningIcon isCritical={isCritical} />
        <div className="flex-1">
          <h3
            className={`font-semibold ${
              isCritical ? 'text-error' : 'text-warning-foreground'
            }`}
          >
            {isCritical ? 'Seat Capacity Critical' : 'Approaching Seat Limit'}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {isCritical ? (
              <>
                You&apos;re using <strong>{seatUsage.usedSeats}</strong> of{' '}
                <strong>{seatUsage.totalSeats}</strong> seats ({percentage}% capacity).
                New learners cannot be added until you increase your seat count.
              </>
            ) : (
              <>
                You&apos;re using <strong>{seatUsage.usedSeats}</strong> of{' '}
                <strong>{seatUsage.totalSeats}</strong> seats ({percentage}% capacity).
                Consider requesting more seats to avoid disruption.
              </>
            )}
          </p>
          <div className="mt-3">
            <Button
              variant={isCritical ? 'primary' : 'secondary'}
              onClick={handleRequestSeats}
              className={isCritical ? 'bg-error text-white hover:bg-error/90' : ''}
            >
              Request more seats
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WarningIcon({ isCritical }: { isCritical: boolean }) {
  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        isCritical ? 'bg-error/20' : 'bg-warning/20'
      }`}
    >
      <svg
        className={`h-5 w-5 ${isCritical ? 'text-error' : 'text-warning'}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
  );
}
