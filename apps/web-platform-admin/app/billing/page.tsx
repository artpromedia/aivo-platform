'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '../providers';

import {
  useQuotes,
  usePurchaseOrders,
  useRenewals,
  useBillingSummary,
  useSendQuote,
  useApprovePO,
  useRejectPO,
  useProcessRenewal,
} from '@/hooks/use-billing';
import type { Quote, PurchaseOrder, Renewal } from '@/lib/api/billing.api';

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

  // Fetch real data
  const { data: quotesData, isLoading: quotesLoading, error: quotesError } = useQuotes({});
  const { data: posData, isLoading: posLoading, error: posError } = usePurchaseOrders({});
  const { data: renewalsData, isLoading: renewalsLoading, error: renewalsError } = useRenewals({});
  const { data: summaryData } = useBillingSummary();

  // Mutations
  const sendQuoteMutation = useSendQuote();
  const approvePOMutation = useApprovePO();
  const rejectPOMutation = useRejectPO();
  const processRenewalMutation = useProcessRenewal();

  const quotes = quotesData?.data ?? [];
  const pos = posData?.data ?? [];
  const renewals = renewalsData?.data ?? [];

  // Calculate stats from real data
  const activeQuotes = quotes.filter((q: Quote) => ['DRAFT', 'SENT'].includes(q.status)).length;
  const awaitingResponse = quotes.filter((q: Quote) => q.status === 'SENT').length;
  const pendingPOs = pos.filter((p: PurchaseOrder) => p.status === 'PENDING').length;
  const renewalsDue = renewals.filter((r: Renewal) => r.status === 'DUE').length;
  const totalPipeline = quotes
    .filter((q: Quote) => q.status === 'ACCEPTED')
    .reduce((sum: number, q: Quote) => sum + q.totalAmountCents, 0);

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
        <div className="flex gap-2">
          <Link
            href="/billing/vault"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🔐 License Vault
          </Link>
          <Link
            href="/billing/pilots"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🚀 Pilots
          </Link>
          <Link
            href="/billing/enterprise"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            🏢 Enterprise Sales
          </Link>
          <Link
            href="/billing/finops"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            FinOps Dashboard
          </Link>
          <Link
            href="/billing/quotes/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Create Quote
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Active Quotes</div>
          <div className="text-2xl font-bold">{summaryData?.activeQuotes ?? activeQuotes}</div>
          <div className="text-xs text-slate-500">{awaitingResponse} awaiting response</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Pending POs</div>
          <div className="text-2xl font-bold text-yellow-600">
            {summaryData?.pendingPOs ?? pendingPOs}
          </div>
          <div className="text-xs text-slate-500">Needs review</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Renewals Due</div>
          <div className="text-2xl font-bold text-orange-600">
            {summaryData?.renewalsDue ?? renewalsDue}
          </div>
          <div className="text-xs text-slate-500">Next 30 days</div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <div className="text-sm text-slate-600">Total Pipeline</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summaryData?.totalPipelineValueCents ?? totalPipeline)}
          </div>
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
          {quotesLoading ? (
            <div className="p-8 text-center text-slate-500">Loading quotes...</div>
          ) : quotesError ? (
            <div className="p-8 text-center text-red-500">Failed to load quotes</div>
          ) : quotes.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No quotes found</div>
          ) : (
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
                {quotes.map((quote: Quote) => (
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
                          <button
                            onClick={() => {
                              sendQuoteMutation.mutate(quote.id);
                            }}
                            disabled={sendQuoteMutation.isPending}
                            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {sendQuoteMutation.isPending ? 'Sending...' : 'Send'}
                          </button>
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
          )}
        </div>
      )}

      {/* Purchase Orders Tab */}
      {activeTab === 'pos' && (
        <div className="rounded-lg border bg-white">
          {posLoading ? (
            <div className="p-8 text-center text-slate-500">Loading purchase orders...</div>
          ) : posError ? (
            <div className="p-8 text-center text-red-500">Failed to load purchase orders</div>
          ) : pos.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No purchase orders found</div>
          ) : (
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
                {pos.map((po: PurchaseOrder) => (
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
                            <button
                              onClick={() => {
                                approvePOMutation.mutate({ id: po.id });
                              }}
                              disabled={approvePOMutation.isPending}
                              className="text-sm text-green-600 hover:underline disabled:opacity-50"
                            >
                              {approvePOMutation.isPending ? 'Approving...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => {
                                rejectPOMutation.mutate({ id: po.id, data: { reviewNotes: 'Rejected by admin' } });
                              }}
                              disabled={rejectPOMutation.isPending}
                              className="text-sm text-red-600 hover:underline disabled:opacity-50"
                            >
                              {rejectPOMutation.isPending ? 'Rejecting...' : 'Reject'}
                            </button>
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
          )}
        </div>
      )}

      {/* Renewals Tab */}
      {activeTab === 'renewals' && (
        <div className="rounded-lg border bg-white">
          {renewalsLoading ? (
            <div className="p-8 text-center text-slate-500">Loading renewals...</div>
          ) : renewalsError ? (
            <div className="p-8 text-center text-red-500">Failed to load renewals</div>
          ) : renewals.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No renewals found</div>
          ) : (
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
                {renewals.map((renewal: Renewal) => (
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
                      <div className="text-xs text-slate-500">
                        Due: {formatDate(renewal.dueDate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {(renewal.status === 'DUE' || renewal.status === 'SCHEDULED') && (
                          <button
                            onClick={() => {
                              processRenewalMutation.mutate({ id: renewal.id, action: 'start' });
                            }}
                            disabled={processRenewalMutation.isPending}
                            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                          >
                            {processRenewalMutation.isPending ? 'Starting...' : 'Create Quote'}
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
          )}
        </div>
      )}
    </div>
  );
}
