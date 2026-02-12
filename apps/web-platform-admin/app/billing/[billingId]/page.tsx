'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import { useQuote } from '../../../hooks/use-billing';

export default function BillingDetailPage() {
  const { billingId } = useParams<{ billingId: string }>();
  const { data: quote, isLoading, error } = useQuote(billingId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/billing" className="hover:text-slate-700">
          Billing
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{billingId}</span>
      </nav>

      <h1 className="text-2xl font-semibold">Billing Detail</h1>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="h-20 animate-pulse rounded-lg bg-slate-200" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load billing details. The backend service may be unavailable.
        </div>
      )}

      {quote && (
        <div className="space-y-6">
          {/* Quote Header */}
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Quote ID" value={quote.id} />
              <Field label="Status" value={quote.status} />
              <Field label="Tenant" value={quote.tenantName ?? quote.tenantId ?? '—'} />
              <Field label="Created" value={formatDate(quote.createdAt)} />
              <Field label="Expires" value={formatDate(quote.validUntil)} />
              <Field
                label="Total"
                value={quote.totalCents != null ? `$${(quote.totalCents / 100).toFixed(2)}` : '—'}
              />
            </div>
          </div>

          {/* Line Items */}
          {quote.lineItems && quote.lineItems.length > 0 && (
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Line Items</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-slate-500">
                    <th className="pb-2 font-medium">Description</th>
                    <th className="pb-2 font-medium">Qty</th>
                    <th className="pb-2 text-right font-medium">Unit Price</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lineItems.map(
                    (item: {
                      id: string;
                      description: string;
                      quantity: number;
                      unitPriceCents: number;
                      totalCents: number;
                    }) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="py-2">{item.description}</td>
                        <td className="py-2">{item.quantity}</td>
                        <td className="py-2 text-right">
                          ${(item.unitPriceCents / 100).toFixed(2)}
                        </td>
                        <td className="py-2 text-right font-medium">
                          ${(item.totalCents / 100).toFixed(2)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!isLoading && !error && !quote && (
        <div className="rounded-lg border bg-white p-8 text-center text-slate-500">
          Billing record not found.
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
