'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface SummaryStats {
  totalAccounts: number;
  healthyAccounts: number;
  atRiskAccounts: number;
  overdueAccounts: number;
  trialAccounts: number;
  inactiveAccounts: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  totalInvoicedCents: number;
  totalCollectedCents: number;
  outstandingBalanceCents: number;
  totalMrrCents: number;
  formatted: {
    totalInvoiced: string;
    totalCollected: string;
    outstandingBalance: string;
    totalMrr: string;
  };
}

interface BillingAccount {
  id: string;
  tenantId: string;
  accountType: string;
  displayName: string;
  billingEmail: string | null;
  paymentProvider: string;
  stripeCustomerId: string | null;
  createdAt: string;
  subscriptions: {
    total: number;
    active: number;
    trial: number;
    pastDue: number;
    canceled: number;
  };
  invoices: {
    total: number;
    open: number;
    paid: number;
    uncollectible: number;
  };
  financials: {
    totalInvoicedCents: number;
    totalCollectedCents: number;
    outstandingBalanceCents: number;
    mrrCents: number;
  };
  healthStatus: string;
  lastPaymentAt: string | null;
}

interface PaymentEvent {
  id: string;
  provider: string;
  eventType: string;
  providerEventId: string;
  billingAccountId: string | null;
  processedAt: string | null;
  error: string | null;
  createdAt: string;
}

type HealthFilter = 'ALL' | 'HEALTHY' | 'AT_RISK' | 'OVERDUE' | 'TRIAL' | 'INACTIVE';

// ============================================================================
// Components
// ============================================================================

function StatCard({
  label,
  value,
  subValue,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'bg-white border-slate-200',
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    danger: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]}`}>
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
      {subValue && <div className="mt-1 text-xs text-slate-500">{subValue}</div>}
    </div>
  );
}

function HealthBadge({ status }: { status: string }) {
  const statusStyles: Record<string, string> = {
    HEALTHY: 'bg-green-100 text-green-800',
    AT_RISK: 'bg-red-100 text-red-800',
    OVERDUE: 'bg-orange-100 text-orange-800',
    TRIAL: 'bg-blue-100 text-blue-800',
    INACTIVE: 'bg-slate-100 text-slate-600',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[status] || statusStyles.INACTIVE}`}
    >
      {status}
    </span>
  );
}

function AccountsTable({
  accounts,
  isLoading,
}: {
  accounts: BillingAccount[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-slate-500">
        Loading accounts...
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-slate-500">
        No billing accounts found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Account
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Health
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Subscriptions
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Invoices
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              Outstanding
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
              MRR
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {accounts.map((account) => (
            <tr key={account.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-4">
                <div className="font-medium text-slate-900">{account.displayName}</div>
                <div className="text-sm text-slate-500">{account.billingEmail}</div>
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                {account.accountType.replace('_', ' ')}
              </td>
              <td className="whitespace-nowrap px-4 py-4">
                <HealthBadge status={account.healthStatus} />
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <div className="text-slate-900">{account.subscriptions.active} active</div>
                {account.subscriptions.pastDue > 0 && (
                  <div className="text-red-600">{account.subscriptions.pastDue} past due</div>
                )}
                {account.subscriptions.trial > 0 && (
                  <div className="text-blue-600">{account.subscriptions.trial} trial</div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-sm">
                <div className="text-slate-900">{account.invoices.paid} paid</div>
                {account.invoices.open > 0 && (
                  <div className="text-orange-600">{account.invoices.open} open</div>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right text-sm">
                {account.financials.outstandingBalanceCents > 0 ? (
                  <span className="font-medium text-red-600">
                    ${(account.financials.outstandingBalanceCents / 100).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-green-600">$0</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right text-sm font-medium text-slate-900">
                ${(account.financials.mrrCents / 100).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentEventsTable({ events, isLoading }: { events: PaymentEvent[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center text-slate-500">Loading events...</div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-slate-500">
        No payment events found
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Event Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Provider
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
              Time
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {events.map((event) => (
            <tr key={event.id} className="hover:bg-slate-50">
              <td className="whitespace-nowrap px-4 py-3">
                <code className="rounded bg-slate-100 px-2 py-1 text-sm">{event.eventType}</code>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">
                {event.provider}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm">
                {event.error ? (
                  <span className="text-red-600">Failed</span>
                ) : event.processedAt ? (
                  <span className="text-green-600">Processed</span>
                ) : (
                  <span className="text-yellow-600">Pending</span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-500">
                {new Date(event.createdAt).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function FinOpsPage() {
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [accounts, setAccounts] = useState<BillingAccount[]>([]);
  const [events, setEvents] = useState<PaymentEvent[]>([]);
  const [_isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('ALL');
  const [activeTab, setActiveTab] = useState<'accounts' | 'events'>('accounts');

  const BILLING_API_BASE = process.env.NEXT_PUBLIC_BILLING_API_URL || 'http://localhost:4060';

  const fetchSummary = useCallback(async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`${BILLING_API_BASE}/api/v1/finops/summary`);
      if (res.ok) {
        const data = (await res.json()) as SummaryStats;
        setSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    } finally {
      setIsLoadingSummary(false);
    }
  }, [BILLING_API_BASE]);

  const fetchAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const params = new URLSearchParams({ pageSize: '10' });
      if (healthFilter !== 'ALL') {
        params.append('healthStatus', healthFilter);
      }
      const res = await fetch(`${BILLING_API_BASE}/api/v1/finops/accounts?${params}`);
      if (res.ok) {
        const data = (await res.json()) as { data: BillingAccount[] };
        setAccounts(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [BILLING_API_BASE, healthFilter]);

  const fetchEvents = useCallback(async () => {
    setIsLoadingEvents(true);
    try {
      const res = await fetch(`${BILLING_API_BASE}/api/v1/finops/payment-events?pageSize=10`);
      if (res.ok) {
        const data = (await res.json()) as { data: PaymentEvent[] };
        setEvents(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setIsLoadingEvents(false);
    }
  }, [BILLING_API_BASE]);

  useEffect(() => {
    void fetchSummary();
    void fetchAccounts();
    void fetchEvents();
  }, [fetchSummary, fetchAccounts, fetchEvents]);

  useEffect(() => {
    void fetchAccounts();
  }, [healthFilter, fetchAccounts]);

  // Mock data fallback for development
  const mockSummary: SummaryStats = {
    totalAccounts: 156,
    healthyAccounts: 128,
    atRiskAccounts: 12,
    overdueAccounts: 5,
    trialAccounts: 8,
    inactiveAccounts: 3,
    totalSubscriptions: 234,
    activeSubscriptions: 198,
    pastDueSubscriptions: 12,
    totalInvoicedCents: 125000000,
    totalCollectedCents: 118500000,
    outstandingBalanceCents: 6500000,
    totalMrrCents: 8750000,
    formatted: {
      totalInvoiced: '$1,250,000.00',
      totalCollected: '$1,185,000.00',
      outstandingBalance: '$65,000.00',
      totalMrr: '$87,500.00',
    },
  };

  const displaySummary = summary || mockSummary;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <h2 className="mb-4 text-xl font-semibold">Authentication Required</h2>
        <p className="mb-4 text-slate-600">Please log in to access the FinOps dashboard.</p>
        <Link
          href="/login"
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">FinOps Dashboard</h1>
          <p className="text-sm text-slate-500">
            Billing status, reconciliation, and payment health monitoring
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              void fetchSummary();
              void fetchAccounts();
              void fetchEvents();
            }}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
          <Link
            href="/billing"
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to Billing
          </Link>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
        <StatCard
          label="Total MRR"
          value={displaySummary.formatted.totalMrr}
          subValue={`${displaySummary.activeSubscriptions} active subs`}
          variant="success"
        />
        <StatCard
          label="Outstanding"
          value={displaySummary.formatted.outstandingBalance}
          subValue={`${displaySummary.overdueAccounts} overdue`}
          variant={displaySummary.outstandingBalanceCents > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label="Healthy"
          value={displaySummary.healthyAccounts}
          subValue="accounts"
          variant="success"
        />
        <StatCard
          label="At Risk"
          value={displaySummary.atRiskAccounts}
          subValue="past due subs"
          variant={displaySummary.atRiskAccounts > 0 ? 'danger' : 'default'}
        />
        <StatCard label="In Trial" value={displaySummary.trialAccounts} subValue="accounts" />
        <StatCard
          label="Total Collected"
          value={displaySummary.formatted.totalCollected}
          subValue="all time"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('accounts');
            }}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'accounts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Billing Accounts
          </button>
          <button
            onClick={() => {
              setActiveTab('events');
            }}
            className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'events'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            Payment Events
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-slate-700">Health Status:</label>
            <select
              value={healthFilter}
              onChange={(e) => {
                setHealthFilter(e.target.value as HealthFilter);
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All</option>
              <option value="HEALTHY">Healthy</option>
              <option value="AT_RISK">At Risk</option>
              <option value="OVERDUE">Overdue</option>
              <option value="TRIAL">Trial</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Accounts Table */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <AccountsTable accounts={accounts} isLoading={isLoadingAccounts && !summary} />
          </div>
        </div>
      )}

      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Recent webhook events from payment providers</p>
          </div>

          {/* Events Table */}
          <div className="rounded-lg border border-slate-200 bg-white">
            <PaymentEventsTable events={events} isLoading={isLoadingEvents && !summary} />
          </div>
        </div>
      )}
    </div>
  );
}
