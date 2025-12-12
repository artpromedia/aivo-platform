import { Badge, Button } from '@aivo/ui-web';
import type { Metadata } from 'next';
import Link from 'next/link';

import { fetchQuotes, getQuoteStatusTone, type Quote } from '../../../lib/billing-api';

export const metadata: Metadata = {
  title: 'Quotes | Aivo',
  description: 'View quotes from Aivo',
};

function formatCurrency(cents: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpiringSoon(validUntil: string): boolean {
  const validDate = new Date(validUntil);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((validDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 7 && daysUntilExpiry > 0;
}

function isExpired(validUntil: string): boolean {
  return new Date(validUntil) < new Date();
}

export default async function QuotesPage() {
  // TODO: Replace with actual tenant ID from auth context
  const tenantId = 'mock-tenant';
  const quotes = await fetchQuotes(tenantId);

  const activeQuotes = quotes.filter((q) => q.status === 'SENT' || q.status === 'DRAFT');
  const pastQuotes = quotes.filter((q) => q.status !== 'SENT' && q.status !== 'DRAFT');

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
            <div>
              <h1 className="text-2xl font-bold text-text">Quotes</h1>
              <p className="mt-1 text-muted">View quotes from your Aivo account manager</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-8">
          {/* Active Quotes */}
          {activeQuotes.length > 0 ? (
            <div className="rounded-xl border border-border bg-surface shadow-soft">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text">Pending Quotes</h2>
                <p className="mt-1 text-sm text-muted">Quotes awaiting your review</p>
              </div>

              <div className="divide-y divide-border">
                {activeQuotes.map((quote) => (
                  <QuoteRow key={quote.id} quote={quote} />
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-soft">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface-subtle">
                <svg
                  className="h-6 w-6 text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 font-semibold text-text">No pending quotes</h3>
              <p className="mt-2 text-sm text-muted">
                You don&apos;t have any quotes awaiting review.
              </p>
            </div>
          )}

          {/* Past Quotes */}
          {pastQuotes.length > 0 && (
            <div className="rounded-xl border border-border bg-surface shadow-soft">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text">Quote History</h2>
                <p className="mt-1 text-sm text-muted">Previously reviewed quotes</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-surface-subtle">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                        Quote #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pastQuotes.map((quote) => (
                      <tr key={quote.id} className="hover:bg-surface-subtle">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-text">
                          {quote.quoteNumber}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-muted">
                          {formatDate(quote.createdAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-text">
                          {formatCurrency(quote.totalAmountCents, quote.currency)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Badge tone={getQuoteStatusTone(quote.status)}>{quote.status}</Badge>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <Link href={`/billing/quotes/${quote.id}`}>
                            <Button variant="ghost">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  const expiringSoon = isExpiringSoon(quote.validUntil);
  const expired = isExpired(quote.validUntil);

  return (
    <div className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-text">{quote.quoteNumber}</span>
            <Badge tone={getQuoteStatusTone(quote.status)}>{quote.status}</Badge>
            {expiringSoon && !expired && <Badge tone="warning">Expires Soon</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {quote.lineItems.length} line item{quote.lineItems.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-text">
            {formatCurrency(quote.totalAmountCents, quote.currency)}
          </div>
          <div className="text-sm text-muted">Valid until {formatDate(quote.validUntil)}</div>
        </div>
      </div>

      {/* Line Items Preview */}
      <div className="mt-4 rounded-lg bg-surface-subtle p-4">
        <div className="space-y-2">
          {quote.lineItems.slice(0, 3).map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-muted">{item.description}</span>
              <span className="font-medium text-text">
                {item.quantity} × {formatCurrency(item.unitPriceCents, quote.currency)}
              </span>
            </div>
          ))}
          {quote.lineItems.length > 3 && (
            <div className="text-sm text-muted">+{quote.lineItems.length - 3} more items</div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex items-center gap-3">
        <Link href={`/billing/quotes/${quote.id}`}>
          <Button variant="primary">Review Quote</Button>
        </Link>
        <Button
          variant="secondary"
          onClick={() => {
            window.open(
              `mailto:renewals@aivo.com?subject=Question%20about%20Quote%20${quote.quoteNumber}`,
              '_blank'
            );
          }}
        >
          Contact Sales
        </Button>
      </div>
    </div>
  );
}
