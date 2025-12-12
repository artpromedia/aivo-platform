/* eslint-disable import/order */
import { Badge, Button } from '@aivo/ui-web';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  calculateDaysUntilEnd,
  fetchActiveContract,
  fetchContractInvoices,
  fetchContractLineItems,
  fetchSeatCommitments,
} from '../../../../lib/billing-api';
import { ContractInvoicesSection, SeatCommitmentsCard } from '../../components';
import { PrintButton } from './print-button';

export const metadata: Metadata = {
  title: 'Contract Details | Aivo',
  description: 'View your contract details and entitlements',
};

interface ContractDetailPageProps {
  params: Promise<{ id: string }>;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatCurrencyValue(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function getStatusTone(status: string): 'success' | 'warning' | 'error' | 'neutral' {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'PENDING_SIGNATURE':
      return 'warning';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'neutral';
  }
}

export default async function ContractDetailPage({ params }: ContractDetailPageProps) {
  // Await params in Next.js 15 style
  const { id: _contractId } = await params;

  // For now, fetch the active contract (in a real app, would fetch by ID)
  // TODO: Replace with actual tenant ID from auth context
  const tenantId = 'mock-tenant';

  const contract = await fetchActiveContract(tenantId);

  if (!contract) {
    notFound();
  }

  const [lineItems, seatCommitments, invoices] = await Promise.all([
    fetchContractLineItems(contract.id),
    fetchSeatCommitments(contract.id),
    fetchContractInvoices(contract.id),
  ]);

  const daysUntilEnd = calculateDaysUntilEnd(contract.endDate);
  const isExpiringSoon = daysUntilEnd <= 90;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/billing" className="text-muted hover:text-text">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-text">{contract.contractNumber}</h1>
                <Badge tone={getStatusTone(contract.status)}>{contract.status}</Badge>
              </div>
              {contract.name && <p className="mt-1 text-muted">{contract.name}</p>}
            </div>
            <PrintButton />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Contract Overview */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-text">Contract Details</h2>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted">Contract Number</div>
                  <div className="mt-1 text-text">{contract.contractNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">PO Number</div>
                  <div className="mt-1 text-text">{contract.poNumber || '—'}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">Start Date</div>
                  <div className="mt-1 text-text">{formatDate(contract.startDate)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">End Date</div>
                  <div className="mt-1 text-text">{formatDate(contract.endDate)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">Contract Value</div>
                  <div className="mt-1 text-lg font-semibold text-text">
                    {formatCurrencyValue(contract.totalValueCents, contract.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">Days Remaining</div>
                  <div
                    className={`mt-1 text-lg font-semibold ${isExpiringSoon ? 'text-warning' : 'text-text'}`}
                  >
                    {daysUntilEnd}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-border bg-surface shadow-soft">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text">Contract Line Items</h2>
                <p className="mt-1 text-sm text-muted">
                  Products and services included in your contract
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                        Description
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                        Qty
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                        Unit Price
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-muted">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">{item.description}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-text">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted">
                          {formatCurrencyValue(item.unitPriceCents)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-text">
                          {formatCurrencyValue(item.totalPriceCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border bg-surface-subtle">
                      <td
                        colSpan={4}
                        className="px-6 py-4 text-right text-sm font-medium text-text"
                      >
                        Total Contract Value
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-lg font-bold text-text">
                        {formatCurrencyValue(contract.totalValueCents, contract.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Seat Commitments */}
            <SeatCommitmentsCard commitments={seatCommitments} />

            {/* Contract Invoices */}
            <ContractInvoicesSection invoices={invoices} contractId={contract.id} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Renewal Warning */}
            {isExpiringSoon && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warning/20">
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
                    <h3 className="font-medium text-text">Contract Expiring Soon</h3>
                    <p className="mt-1 text-sm text-muted">
                      Your contract ends in {daysUntilEnd} days. Contact your account manager to
                      discuss renewal options.
                    </p>
                    <Link href="/billing/quotes" className="mt-4 inline-block">
                      <Button variant="primary">View Renewal Quote</Button>
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Links */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-semibold text-text">Need Help?</h3>
              <div className="mt-4 space-y-3">
                <a
                  href="mailto:support@aivo.com"
                  className="flex items-center gap-3 text-sm text-muted hover:text-text"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Contact Support
                </a>
                <a
                  href="mailto:billing@aivo.com"
                  className="flex items-center gap-3 text-sm text-muted hover:text-text"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Billing Inquiries
                </a>
                <a
                  href="tel:+18005551234"
                  className="flex items-center gap-3 text-sm text-muted hover:text-text"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Call: 1-800-555-1234
                </a>
              </div>
            </div>

            {/* Account Manager */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-semibold text-text">Your Account Manager</h3>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  JD
                </div>
                <div>
                  <div className="font-medium text-text">Jane Doe</div>
                  <a
                    href="mailto:jane.doe@aivo.com"
                    className="text-sm text-primary hover:underline"
                  >
                    jane.doe@aivo.com
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
