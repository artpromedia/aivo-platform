'use client';

import { Badge, Button } from '@aivo/ui-web';
import { useState } from 'react';

import type { Invoice, InvoiceStatus } from '../../../lib/billing-api';
import {
  downloadCsv,
  exportInvoicesToCsv,
  formatCurrency,
  getInvoiceStatusLabel,
  getInvoiceStatusTone,
} from '../../../lib/billing-api';

interface InvoicesSectionProps {
  invoices: Invoice[];
}

export function InvoicesSection({ invoices }: InvoicesSectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csv = exportInvoicesToCsv(invoices);
      downloadCsv(csv, `aivo-invoices-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h3 className="text-base font-semibold text-text">Invoices & Payments</h3>
        <Button
          variant="secondary"
          onClick={handleExportCsv}
          disabled={isExporting || invoices.length === 0}
          aria-label="Download all invoices as CSV"
        >
          {isExporting ? (
            <>
              <SpinnerIcon />
              Exporting...
            </>
          ) : (
            <>
              <DownloadIcon />
              Download CSV
            </>
          )}
        </Button>
      </div>

      {invoices.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" role="grid" aria-label="Invoices and payments">
            <thead className="border-b border-border bg-surface-muted/50">
              <tr>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Invoice Date
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Period
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Amount
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusTone = getInvoiceStatusTone(invoice.status);
  const needsAttention = invoice.status === 'OPEN' || invoice.status === 'PAST_DUE';

  return (
    <tr
      className="transition-colors hover:bg-surface-muted/30 focus-within:bg-surface-muted/30"
      tabIndex={0}
      role="row"
    >
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          {needsAttention && <AttentionIcon status={invoice.status} />}
          <span className="text-sm text-text">{formatDate(invoice.createdAt)}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-muted">
        {formatPeriod(invoice.periodStart, invoice.periodEnd)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right text-sm font-medium text-text">
        {formatCurrency(invoice.amountCents, invoice.currency)}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <Badge tone={statusTone}>{getInvoiceStatusLabel(invoice.status)}</Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-right">
        <InvoiceActions invoice={invoice} />
      </td>
    </tr>
  );
}

function InvoiceActions({ invoice }: { invoice: Invoice }) {
  if (invoice.status === 'PAID' && invoice.hostedInvoiceUrl) {
    return (
      <a
        href={invoice.hostedInvoiceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 rounded-lg bg-transparent px-3 py-1.5 text-sm font-semibold text-text transition-colors hover:bg-surface-muted"
      >
        View receipt
      </a>
    );
  }

  if (invoice.status === 'OPEN' || invoice.status === 'PAST_DUE') {
    return (
      <a
        href={invoice.hostedInvoiceUrl || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 rounded-lg bg-transparent px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-surface-muted ${
          invoice.status === 'PAST_DUE' ? 'text-error hover:text-error' : 'text-text'
        }`}
      >
        {invoice.status === 'PAST_DUE' ? 'Pay now' : 'View invoice'}
      </a>
    );
  }

  return null;
}

function AttentionIcon({ status }: { status: InvoiceStatus }) {
  const isPastDue = status === 'PAST_DUE';

  return (
    <span
      title={isPastDue ? 'Payment overdue' : 'Payment pending'}
      aria-label={isPastDue ? 'Payment overdue' : 'Payment pending'}
    >
      <svg
        className={`h-4 w-4 ${isPastDue ? 'text-error' : 'text-warning'}`}
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    </span>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <svg
          className="h-6 w-6 text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="mt-4 text-sm text-muted">No invoices yet</p>
      <p className="mt-1 text-xs text-muted">
        Invoices will appear here after your first billing cycle
      </p>
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="mr-2 h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      className="mr-2 h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);

  const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (startMonth === endMonth.split(' ')[0]) {
    return `${startDate.getDate()} - ${endDate.getDate()} ${endMonth}`;
  }

  return `${startMonth} ${startDate.getDate()} - ${endMonth.replace(' ', ` ${endDate.getDate()}, `)}`;
}
