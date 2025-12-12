'use client';

import { Badge, Button } from '@aivo/ui-web';
import Link from 'next/link';

interface ContractOverviewProps {
  contract: {
    id: string;
    contractNumber: string;
    name: string | null;
    status: string;
    startDate: string;
    endDate: string;
    totalValueCents: number;
    poNumber: string | null;
    currency: string;
  } | null;
  daysUntilEnd: number;
  renewalStatus: string | null;
}

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function ContractOverview({ contract, daysUntilEnd, renewalStatus }: ContractOverviewProps) {
  if (!contract) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-soft">
        <div className="text-muted">No active contract found.</div>
        <p className="mt-2 text-sm text-muted">Contact your Aivo account manager for assistance.</p>
      </div>
    );
  }

  const isExpiringSoon = daysUntilEnd <= 90;
  const statusTone = contract.status === 'ACTIVE' ? 'success' : 'neutral';

  return (
    <div className="rounded-xl border border-border bg-surface shadow-soft">
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-text">{contract.contractNumber}</h3>
              <Badge tone={statusTone}>{contract.status}</Badge>
            </div>
            {contract.name && <p className="mt-1 text-sm text-muted">{contract.name}</p>}
          </div>
          <Link href={`/billing/contracts/${contract.id}`}>
            <Button variant="secondary">View Details</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-sm font-medium text-muted">Contract Term</div>
          <div className="mt-1 text-text">
            {formatDate(contract.startDate)} — {formatDate(contract.endDate)}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted">Contract Value</div>
          <div className="mt-1 text-lg font-semibold text-text">
            {formatCurrency(contract.totalValueCents, contract.currency)}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted">PO Number</div>
          <div className="mt-1 text-text">
            {contract.poNumber || <span className="text-muted">—</span>}
          </div>
        </div>

        <div>
          <div className="text-sm font-medium text-muted">Days Remaining</div>
          <div
            className={`mt-1 text-lg font-semibold ${isExpiringSoon ? 'text-warning' : 'text-text'}`}
          >
            {daysUntilEnd}
            {isExpiringSoon && (
              <span className="ml-2 text-sm font-normal text-warning">Renewing soon</span>
            )}
          </div>
        </div>
      </div>

      {/* Renewal Banner */}
      {isExpiringSoon && (
        <div className="border-t border-border bg-warning/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/20">
                <svg
                  className="h-5 w-5 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <div className="font-medium text-text">Contract Renewal</div>
                <div className="text-sm text-muted">
                  {renewalStatus === 'IN_PROGRESS'
                    ? 'A renewal quote has been prepared for you.'
                    : 'Your contract is approaching its end date.'}
                </div>
              </div>
            </div>
            {renewalStatus === 'IN_PROGRESS' ? (
              <Link href="/billing/quotes">
                <Button variant="primary">View Renewal Quote</Button>
              </Link>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  window.open(
                    'mailto:renewals@aivo.com?subject=Contract%20Renewal%20Request',
                    '_blank'
                  );
                }}
              >
                Contact for Renewal
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
