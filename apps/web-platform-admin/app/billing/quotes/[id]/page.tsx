'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '../../../providers';

// Types
interface QuoteLineItem {
  id: string;
  sku: string;
  description: string;
  quantity: number;
  listPriceCents: number;
  unitPriceCents: number;
  discountPercent: number | null;
  totalAmountCents: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  name: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntil: string;
  currency: string;
  totalAmountCents: number;
  proposedStartDate: string | null;
  proposedEndDate: string | null;
  paymentTermsDays: number;
  sentAt: string | null;
  acceptedAt: string | null;
  tenantName: string;
  billingAccountId: string;
  createdAt: string;
  lineItems: QuoteLineItem[];
  metadata?: {
    internalNotes?: string;
    districtContact?: {
      name: string;
      email: string;
      phone?: string;
    };
  };
}

// Mock quote data
const mockQuote: Quote = {
  id: '1',
  quoteNumber: 'Q-2025-00001',
  name: 'North Valley USD - 2025-26',
  status: 'SENT',
  validUntil: '2025-01-15',
  currency: 'USD',
  totalAmountCents: 4500000,
  proposedStartDate: '2025-07-01',
  proposedEndDate: '2026-06-30',
  paymentTermsDays: 30,
  sentAt: '2024-12-05',
  acceptedAt: null,
  tenantName: 'North Valley USD',
  billingAccountId: 'ba-123',
  createdAt: '2024-12-01',
  lineItems: [
    {
      id: '1',
      sku: 'SEAT_K5',
      description: 'K-5 Learner Seats',
      quantity: 2500,
      listPriceCents: 1200,
      unitPriceCents: 1080,
      discountPercent: 10,
      totalAmountCents: 2700000,
    },
    {
      id: '2',
      sku: 'SEAT_6_8',
      description: '6-8 Learner Seats',
      quantity: 1500,
      listPriceCents: 1200,
      unitPriceCents: 1080,
      discountPercent: 10,
      totalAmountCents: 1620000,
    },
    {
      id: '3',
      sku: 'ADDON_SEL',
      description: 'SEL Module Add-on',
      quantity: 4000,
      listPriceCents: 300,
      unitPriceCents: 300,
      discountPercent: null,
      totalAmountCents: 1200000,
    },
    {
      id: '4',
      sku: 'SETUP_ONBOARDING',
      description: 'Onboarding & Training',
      quantity: 1,
      listPriceCents: 500000,
      unitPriceCents: 0,
      discountPercent: 100,
      totalAmountCents: 0,
    },
  ],
  metadata: {
    internalNotes: 'Priority customer - fast track approval',
    districtContact: {
      name: 'Dr. Sarah Johnson',
      email: 'sjohnson@northvalleyusd.edu',
      phone: '(555) 123-4567',
    },
  },
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SENT: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-amber-100 text-amber-700',
  CONVERTED: 'bg-purple-100 text-purple-700',
};

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // In real app, fetch quote by id
  const quote = mockQuote;

  const handleMarkSent = async () => {
    setIsLoading(true);
    // API call here
    await new Promise((r) => setTimeout(r, 500));
    setIsLoading(false);
    alert('Quote marked as sent!');
  };

  const handleMarkAccepted = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsLoading(false);
    alert('Quote marked as accepted!');
  };

  const handleCreateContract = async () => {
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    setIsLoading(false);
    router.push('/billing/contracts/new?quoteId=' + id);
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-slate-600">Please log in to view this quote.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Link href="/billing" className="hover:underline">
          Billing
        </Link>
        <span>/</span>
        <Link href="/billing?tab=quotes" className="hover:underline">
          Quotes
        </Link>
        <span>/</span>
        <span className="text-slate-900">{quote.quoteNumber}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{quote.quoteNumber}</h1>
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[quote.status]}`}
            >
              {quote.status}
            </span>
          </div>
          <p className="mt-1 text-lg text-slate-600">{quote.name}</p>
          <p className="text-slate-500">{quote.tenantName}</p>
        </div>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && (
            <>
              <Link
                href={`/billing/quotes/${id}/edit`}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Edit Quote
              </Link>
              <button
                onClick={handleMarkSent}
                disabled={isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Mark as Sent
              </button>
            </>
          )}
          {quote.status === 'SENT' && (
            <>
              <button
                onClick={handleMarkAccepted}
                disabled={isLoading}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Mark Accepted
              </button>
              <button
                disabled={isLoading}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Mark Rejected
              </button>
            </>
          )}
          {quote.status === 'ACCEPTED' && (
            <button
              onClick={handleCreateContract}
              disabled={isLoading}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              Create Contract
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="col-span-2 space-y-6">
          {/* Quote Details */}
          <div className="rounded-lg border bg-white p-6">
            <h2 className="mb-4 text-lg font-semibold">Quote Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-slate-500">Valid Until</div>
                <div className="font-medium">{formatDate(quote.validUntil)}</div>
              </div>
              <div>
                <div className="text-slate-500">Payment Terms</div>
                <div className="font-medium">Net {quote.paymentTermsDays}</div>
              </div>
              {quote.proposedStartDate && (
                <div>
                  <div className="text-slate-500">Contract Start</div>
                  <div className="font-medium">{formatDate(quote.proposedStartDate)}</div>
                </div>
              )}
              {quote.proposedEndDate && (
                <div>
                  <div className="text-slate-500">Contract End</div>
                  <div className="font-medium">{formatDate(quote.proposedEndDate)}</div>
                </div>
              )}
              {quote.sentAt && (
                <div>
                  <div className="text-slate-500">Sent On</div>
                  <div className="font-medium">{formatDate(quote.sentAt)}</div>
                </div>
              )}
              {quote.acceptedAt && (
                <div>
                  <div className="text-slate-500">Accepted On</div>
                  <div className="font-medium">{formatDate(quote.acceptedAt)}</div>
                </div>
              )}
            </div>
          </div>

          {/* Line Items */}
          <div className="rounded-lg border bg-white">
            <div className="border-b p-4">
              <h2 className="text-lg font-semibold">Line Items</h2>
            </div>
            <table className="w-full">
              <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Qty</th>
                  <th className="px-4 py-3 text-right font-medium">List Price</th>
                  <th className="px-4 py-3 text-right font-medium">Discount</th>
                  <th className="px-4 py-3 text-right font-medium">Unit Price</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {quote.lineItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-sm">{item.sku}</td>
                    <td className="px-4 py-3">{item.description}</td>
                    <td className="px-4 py-3 text-right">{item.quantity.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatCurrency(item.listPriceCents)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.discountPercent ? (
                        <span className="text-green-600">-{item.discountPercent}%</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(item.unitPriceCents)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(item.totalAmountCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-slate-50">
                <tr>
                  <td colSpan={6} className="px-4 py-3 text-right font-semibold">
                    Total
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold">
                    {formatCurrency(quote.totalAmountCents)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Total */}
          <div className="rounded-lg border bg-white p-6">
            <div className="text-sm text-slate-500">Quote Total</div>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(quote.totalAmountCents)}
            </div>
            <div className="mt-2 text-sm text-slate-500">{quote.currency}</div>
          </div>

          {/* District Contact */}
          {quote.metadata?.districtContact && (
            <div className="rounded-lg border bg-white p-6">
              <h3 className="mb-3 font-semibold">District Contact</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-slate-500">Name</div>
                  <div className="font-medium">{quote.metadata.districtContact.name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Email</div>
                  <a
                    href={`mailto:${quote.metadata.districtContact.email}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {quote.metadata.districtContact.email}
                  </a>
                </div>
                {quote.metadata.districtContact.phone && (
                  <div>
                    <div className="text-slate-500">Phone</div>
                    <div className="font-medium">{quote.metadata.districtContact.phone}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {quote.metadata?.internalNotes && (
            <div className="rounded-lg border bg-amber-50 p-6">
              <h3 className="mb-2 font-semibold text-amber-800">Internal Notes</h3>
              <p className="text-sm text-amber-700">{quote.metadata.internalNotes}</p>
            </div>
          )}

          {/* Timeline */}
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-3 font-semibold">Activity</h3>
            <div className="space-y-3 text-sm">
              {quote.sentAt && (
                <div className="flex gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-blue-500"></div>
                  <div>
                    <div className="font-medium">Quote sent</div>
                    <div className="text-slate-500">{formatDate(quote.sentAt)}</div>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-slate-300"></div>
                <div>
                  <div className="font-medium">Quote created</div>
                  <div className="text-slate-500">{formatDate(quote.createdAt)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
