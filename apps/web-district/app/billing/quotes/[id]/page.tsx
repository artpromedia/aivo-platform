import { Badge, Button } from '@aivo/ui-web';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchQuote, getQuoteStatusTone } from '../../../../lib/billing-api';

import { PrintQuoteButton } from './print-quote-button';

export const metadata: Metadata = {
  title: 'Quote Details | Aivo',
  description: 'View quote details',
};

interface QuoteDetailPageProps {
  params: { id: string };
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

function getDaysUntilExpiry(validUntil: string): number {
  const validDate = new Date(validUntil);
  const now = new Date();
  return Math.ceil((validDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpired(validUntil: string): boolean {
  return new Date(validUntil) < new Date();
}

export default async function QuoteDetailPage({ params }: QuoteDetailPageProps) {
  const quote = await fetchQuote(params.id);

  if (!quote) {
    notFound();
  }

  const daysUntilExpiry = getDaysUntilExpiry(quote.validUntil);
  const expired = isExpired(quote.validUntil);
  const expiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  const canAccept = quote.status === 'SENT' && !expired;

  // Calculate totals
  const subtotal = quote.lineItems.reduce((sum, item) => sum + item.totalCents, 0);
  const totalDiscount = quote.lineItems.reduce((sum, item) => {
    const beforeDiscount = item.quantity * item.unitPriceCents;
    return sum + (beforeDiscount - item.totalCents);
  }, 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link href="/billing/quotes" className="text-muted hover:text-text">
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
                <h1 className="text-2xl font-bold text-text">{quote.quoteNumber}</h1>
                <Badge tone={getQuoteStatusTone(quote.status)}>{quote.status}</Badge>
                {expiringSoon && !expired && (
                  <Badge tone="warning">Expires in {daysUntilExpiry} days</Badge>
                )}
                {expired && quote.status === 'SENT' && <Badge tone="error">Expired</Badge>}
              </div>
              <p className="mt-1 text-muted">Created {formatDate(quote.createdAt)}</p>
            </div>
            <PrintQuoteButton />
          </div>
        </div>
      </div>

      {/* Expired Banner */}
      {expired && quote.status === 'SENT' && (
        <div className="border-b border-error/30 bg-error/5 px-4 py-4">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 text-error"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-error">
                This quote has expired. Please contact your account manager for an updated quote.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-8 lg:col-span-2">
            {/* Quote Details */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-text">Quote Details</h2>

              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="text-sm font-medium text-muted">Quote Number</div>
                  <div className="mt-1 text-text">{quote.quoteNumber}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">Status</div>
                  <div className="mt-1">
                    <Badge tone={getQuoteStatusTone(quote.status)}>{quote.status}</Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">Created</div>
                  <div className="mt-1 text-text">{formatDate(quote.createdAt)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted">Valid Until</div>
                  <div
                    className={`mt-1 ${expired ? 'text-critical' : expiringSoon ? 'text-warning' : 'text-text'}`}
                  >
                    {formatDate(quote.validUntil)}
                    {expired && ' (Expired)'}
                    {expiringSoon && !expired && ` (${daysUntilExpiry} days remaining)`}
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="rounded-xl border border-border bg-surface shadow-soft">
              <div className="border-b border-border px-6 py-4">
                <h2 className="text-lg font-semibold text-text">Line Items</h2>
                <p className="mt-1 text-sm text-muted">
                  Products and services included in this quote
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
                        Discount
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-muted">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {quote.lineItems.map((item) => (
                      <tr key={item.id}>
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-mono text-muted">
                          {item.sku}
                        </td>
                        <td className="px-6 py-4 text-sm text-text">{item.description}</td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-text">
                          {item.quantity}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted">
                          {formatCurrency(item.unitPriceCents, quote.currency)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-muted">
                          {item.discountPercent > 0 ? `${item.discountPercent}%` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-text">
                          {formatCurrency(item.totalCents, quote.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {totalDiscount > 0 && (
                      <>
                        <tr className="border-t border-border">
                          <td colSpan={5} className="px-6 py-2 text-right text-sm text-muted">
                            Subtotal
                          </td>
                          <td className="whitespace-nowrap px-6 py-2 text-right text-sm text-muted">
                            {formatCurrency(subtotal + totalDiscount, quote.currency)}
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-6 py-2 text-right text-sm text-positive">
                            Total Discount
                          </td>
                          <td className="whitespace-nowrap px-6 py-2 text-right text-sm text-positive">
                            -{formatCurrency(totalDiscount, quote.currency)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="border-t border-border bg-surface-subtle">
                      <td
                        colSpan={5}
                        className="px-6 py-4 text-right text-sm font-medium text-text"
                      >
                        Total Amount
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-lg font-bold text-text">
                        {formatCurrency(quote.totalAmountCents, quote.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h2 className="text-lg font-semibold text-text">Terms & Conditions</h2>
              <div className="mt-4 space-y-4 text-sm text-muted">
                <p>
                  This quote is valid until {formatDate(quote.validUntil)}. Prices and availability
                  are subject to change after this date.
                </p>
                <p>
                  Upon acceptance, a formal contract and purchase order process will be initiated.
                  Payment terms are Net 30 from invoice date.
                </p>
                <p>
                  Services will begin upon contract execution and receipt of purchase order.
                  Implementation timeline will be discussed during onboarding.
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Summary Card */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-semibold text-text">Quote Summary</h3>

              <div className="mt-6 space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted">Items</span>
                  <span className="font-medium text-text">{quote.lineItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Total Seats</span>
                  <span className="font-medium text-text">
                    {quote.lineItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-positive">
                    <span>Discount</span>
                    <span className="font-medium">
                      -{formatCurrency(totalDiscount, quote.currency)}
                    </span>
                  </div>
                )}
                <div className="border-t border-border pt-4">
                  <div className="flex justify-between">
                    <span className="font-medium text-text">Total</span>
                    <span className="text-xl font-bold text-text">
                      {formatCurrency(quote.totalAmountCents, quote.currency)}
                    </span>
                  </div>
                </div>
              </div>

              {canAccept && (
                <div className="mt-6 space-y-3">
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => {
                      // In a real app, this would open a modal or redirect to acceptance flow
                      window.open(
                        `mailto:renewals@aivolearning.com?subject=Accept%20Quote%20${quote.quoteNumber}&body=I%20would%20like%20to%20accept%20quote%20${quote.quoteNumber}%20for%20${formatCurrency(quote.totalAmountCents, quote.currency)}.%0A%0APlease%20send%20me%20the%20contract%20and%20PO%20details.`,
                        '_blank'
                      );
                    }}
                  >
                    Accept Quote
                  </Button>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      window.open(
                        `mailto:renewals@aivolearning.com?subject=Question%20about%20Quote%20${quote.quoteNumber}`,
                        '_blank'
                      );
                    }}
                  >
                    Request Changes
                  </Button>
                </div>
              )}

              {!canAccept && quote.status === 'ACCEPTED' && (
                <div className="mt-6">
                  <div className="rounded-lg bg-positive/10 p-4 text-center">
                    <svg
                      className="mx-auto h-8 w-8 text-positive"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="mt-2 font-medium text-positive">Quote Accepted</p>
                    <p className="mt-1 text-sm text-muted">
                      Check your email for contract details.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Expiry Warning */}
            {expiringSoon && !expired && (
              <div className="rounded-xl border border-warning/30 bg-warning/5 p-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 shrink-0 text-warning"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h4 className="font-medium text-text">Quote Expiring Soon</h4>
                    <p className="mt-1 text-sm text-muted">
                      This quote expires in {daysUntilExpiry} days. Accept now to lock in these
                      prices.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Card */}
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-semibold text-text">Questions?</h3>
              <p className="mt-2 text-sm text-muted">
                Contact your Aivo account manager for assistance with this quote.
              </p>
              <div className="mt-4 space-y-3">
                <a
                  href="mailto:renewals@aivolearning.com"
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
                  renewals@aivolearning.com
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
                  1-800-555-1234
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
