/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, import/no-unresolved */
'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '../../providers';

// Mock data types
interface QuoteSummary {
  id: string;
  quoteNumber: string;
  name: string | null;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntil: string;
  totalAmountCents: number;
  tenantName: string;
  createdAt: string;
}

interface PurchaseOrderSummary {
  id: string;
  poNumber: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CLOSED' | 'CANCELLED';
  amountCents: number;
  tenantName: string;
  createdAt: string;
}

interface RenewalTask {
  id: string;
  contractNumber: string;
  tenantName: string;
  status: 'SCHEDULED' | 'DUE' | 'IN_PROGRESS' | 'COMPLETED' | 'NOT_RENEWING' | 'CHURNED';
  dueDate: string;
  contractEndDate: string;
  totalValueCents: number;
}

// Mock data
const mockQuotes: QuoteSummary[] = [
  {
    id: '1',
    quoteNumber: 'Q-2025-00001',
    name: 'North Valley USD - 2025-26',
    status: 'SENT',
    validUntil: '2025-01-15',
    totalAmountCents: 4500000,
    tenantName: 'North Valley USD',
    createdAt: '2024-12-01',
  },
  {
    id: '2',
    quoteNumber: 'Q-2025-00002',
    name: 'Riverside School District',
    status: 'DRAFT',
    validUntil: '2025-01-30',
    totalAmountCents: 2750000,
    tenantName: 'Riverside School District',
    createdAt: '2024-12-10',
  },
  {
    id: '3',
    quoteNumber: 'Q-2024-00045',
    name: 'Metro ISD Renewal',
    status: 'ACCEPTED',
    validUntil: '2024-12-31',
    totalAmountCents: 8200000,
    tenantName: 'Metro ISD',
    createdAt: '2024-11-15',
  },
];

const mockPOs: PurchaseOrderSummary[] = [
  {
    id: '1',
    poNumber: 'PO-2025-4521',
    status: 'PENDING',
    amountCents: 8200000,
    tenantName: 'Metro ISD',
    createdAt: '2024-12-10',
  },
  {
    id: '2',
    poNumber: 'PO-2024-8872',
    status: 'APPROVED',
    amountCents: 3500000,
    tenantName: 'Lakeside Schools',
    createdAt: '2024-11-20',
  },
];

const mockRenewals: RenewalTask[] = [
  {
    id: '1',
    contractNumber: 'DST-2024-00012',
    tenantName: 'Valley View Schools',
    status: 'DUE',
    dueDate: '2024-12-15',
    contractEndDate: '2025-03-15',
    totalValueCents: 5600000,
  },
  {
    id: '2',
    contractNumber: 'DST-2024-00018',
    tenantName: 'Greenfield District',
    status: 'IN_PROGRESS',
    dueDate: '2024-12-01',
    contractEndDate: '2025-03-01',
    totalValueCents: 3200000,
  },
  {
    id: '3',
    contractNumber: 'DST-2024-00025',
    tenantName: 'Mountain View USD',
    status: 'SCHEDULED',
    dueDate: '2025-01-15',
    contractEndDate: '2025-04-15',
    totalValueCents: 4100000,
  },
];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
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
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
  SCHEDULED: 'bg-slate-100 text-slate-700',
  DUE: 'bg-orange-100 text-orange-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  NOT_RENEWING: 'bg-amber-100 text-amber-700',
  CHURNED: 'bg-red-100 text-red-700',
};

export default function BillingDashboardPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'quotes' | 'pos' | 'renewals'>('quotes');

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-slate-600">Please log in to access billing management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">District Billing</h1>
          <p className="text-slate-600">Manage quotes, purchase orders, and renewals</p>
        </div>
        <Link
          href="/billing/quotes/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Create Quote
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Active Quotes</div>
          <div className="text-2xl font-bold">12</div>
          <div className="text-xs text-slate-500">3 awaiting response</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Pending POs</div>
          <div className="text-2xl font-bold text-yellow-600">5</div>
          <div className="text-xs text-slate-500">Needs review</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Renewals Due</div>
          <div className="text-2xl font-bold text-orange-600">8</div>
          <div className="text-xs text-slate-500">Next 30 days</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Total Pipeline</div>
          <div className="text-2xl font-bold text-green-600">$2.4M</div>
          <div className="text-xs text-slate-500">Accepted quotes</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {(['quotes', 'pos', 'renewals'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
              }}
              className={`border-b-2 pb-3 text-sm font-medium transition ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab === 'quotes' && 'Quotes'}
              {tab === 'pos' && 'Purchase Orders'}
              {tab === 'renewals' && 'Renewals'}
            </button>
          ))}
        </nav>
      </div>

      {/* Quotes Tab */}
      {activeTab === 'quotes' && (
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Quote #</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Valid Until</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/billing/quotes/${quote.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {quote.quoteNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{quote.tenantName}</div>
                    <div className="text-sm text-slate-500">{quote.name}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[quote.status]}`}
                    >
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(quote.totalAmountCents)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(quote.validUntil)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {quote.status === 'DRAFT' && (
                        <button className="text-sm text-blue-600 hover:underline">Send</button>
                      )}
                      {quote.status === 'ACCEPTED' && (
                        <button className="text-sm text-green-600 hover:underline">
                          Create Contract
                        </button>
                      )}
                      <Link
                        href={`/billing/quotes/${quote.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'pos' && (
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">PO #</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockPOs.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/billing/pos/${po.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {po.poNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{po.tenantName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[po.status]}`}
                    >
                      {po.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(po.amountCents)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(po.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {po.status === 'PENDING' && (
                        <>
                          <button className="text-sm text-green-600 hover:underline">
                            Approve
                          </button>
                          <button className="text-sm text-red-600 hover:underline">Reject</button>
                        </>
                      )}
                      {po.status === 'APPROVED' && (
                        <button className="text-sm text-blue-600 hover:underline">
                          Activate Contract
                        </button>
                      )}
                      <Link
                        href={`/billing/pos/${po.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Renewals Tab */}
      {activeTab === 'renewals' && (
        <div className="rounded-lg border bg-white">
          <table className="w-full">
            <thead className="border-b bg-slate-50 text-left text-sm text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Contract</th>
                <th className="px-4 py-3 font-medium">District</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Value</th>
                <th className="px-4 py-3 font-medium">Expires</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {mockRenewals.map((renewal) => (
                <tr key={renewal.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/billing/renewals/${renewal.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {renewal.contractNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium">{renewal.tenantName}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[renewal.status]}`}
                    >
                      {renewal.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatCurrency(renewal.totalValueCents)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-slate-900">{formatDate(renewal.contractEndDate)}</div>
                    <div className="text-xs text-slate-500">Due: {formatDate(renewal.dueDate)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {(renewal.status === 'DUE' || renewal.status === 'SCHEDULED') && (
                        <button className="text-sm text-blue-600 hover:underline">
                          Create Quote
                        </button>
                      )}
                      {renewal.status === 'IN_PROGRESS' && (
                        <button className="text-sm text-green-600 hover:underline">
                          View Quote
                        </button>
                      )}
                      <Link
                        href={`/billing/renewals/${renewal.id}`}
                        className="text-sm text-slate-600 hover:underline"
                      >
                        Details
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
