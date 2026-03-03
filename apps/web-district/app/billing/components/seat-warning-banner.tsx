'use client';

import { Button } from '@aivo/ui-web';
import { useState } from 'react';

import type { SeatUsage } from '../../../lib/billing-api';
import { getSeatUsageLevel, getSeatUsagePercentage } from '../../../lib/billing-api';
import { SeatRequestModal } from './seat-request-modal';

interface SeatWarningBannerProps {
  seatUsage: SeatUsage;
}

export function SeatWarningBanner({ seatUsage }: SeatWarningBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const percentage = getSeatUsagePercentage(seatUsage);
  const level = getSeatUsageLevel(seatUsage);

  // Only show banner for warning or critical levels
  if (level === 'normal') {
    return null;
  }

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
              onClick={() => setModalOpen(true)}
              className={isCritical ? 'bg-error text-white hover:bg-error/90' : ''}
            >
              Request more seats
            </Button>
          </div>
        </div>
      </div>

      <SeatRequestModal
        seatUsage={seatUsage}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
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
