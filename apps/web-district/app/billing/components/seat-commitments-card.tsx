'use client';

import { Badge } from '@aivo/ui-web';

interface SeatCommitment {
  productId: string;
  productName: string;
  committedSeats: number;
  assignedSeats: number;
  activeSeats: number;
}

interface SeatCommitmentsCardProps {
  commitments: SeatCommitment[];
}

export function SeatCommitmentsCard({ commitments }: SeatCommitmentsCardProps) {
  if (commitments.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        <h3 className="text-lg font-semibold text-text">Seat Commitments</h3>
        <p className="mt-4 text-sm text-muted">No seat commitments found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-lg font-semibold text-text">Seat Commitments vs Usage</h3>
        <p className="mt-1 text-sm text-muted">
          Your contract includes the following seat allocations
        </p>
      </div>

      <div className="divide-y divide-border">
        {commitments.map((commitment) => {
          const usagePercent =
            commitment.committedSeats > 0
              ? (commitment.assignedSeats / commitment.committedSeats) * 100
              : 0;
          const isOverCommitment = commitment.assignedSeats > commitment.committedSeats;
          const isNearLimit = usagePercent >= 80 && !isOverCommitment;

          return (
            <div key={commitment.productId} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium text-text">{commitment.productName}</div>
                  <div className="mt-1 text-sm text-muted">
                    {commitment.assignedSeats} of {commitment.committedSeats} seats assigned
                    {commitment.activeSeats !== commitment.assignedSeats && (
                      <span className="ml-2">({commitment.activeSeats} active)</span>
                    )}
                  </div>
                </div>
                {isOverCommitment ? (
                  <Badge tone="error">Over Limit</Badge>
                ) : isNearLimit ? (
                  <Badge tone="warning">Near Limit</Badge>
                ) : (
                  <Badge tone="success">OK</Badge>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isOverCommitment ? 'bg-error' : isNearLimit ? 'bg-warning' : 'bg-success'
                    }`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-muted">
                  <span>0</span>
                  <span>{commitment.committedSeats} seats</span>
                </div>
              </div>

              {isOverCommitment && (
                <div className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error">
                  <strong>Over commitment:</strong> You have{' '}
                  {commitment.assignedSeats - commitment.committedSeats} more seats assigned than
                  your contract allows. Please contact your Aivo account manager to add more seats.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
