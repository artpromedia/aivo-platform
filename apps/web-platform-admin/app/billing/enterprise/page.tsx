'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

import { useAuth } from '../../../providers';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface EnterpriseCustomer {
  id: string;
  name: string;
  type: string;
  primaryContactName: string;
  primaryContactEmail: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    deals: number;
    contacts: number;
  };
}

interface EnterpriseDeal {
  id: string;
  name: string;
  type: string;
  status: string;
  seats: number;
  totalValueCents: number;
  arrCents: number;
  expectedCloseDate: string | null;
  probability: number | null;
  customer: {
    id: string;
    name: string;
    type: string;
  };
  _count: {
    licenses: number;
    provisioningBatches: number;
  };
}

interface PipelineAnalytics {
  dealsByStatus: Array<{
    status: string;
    _count: number;
    _sum: { totalValueCents: number | null; arrCents: number | null };
  }>;
  totals: {
    pipelineValueCents: number;
    wonValueCents: number;
    activeArrCents: number;
  };
  recentWins: Array<{
    id: string;
    name: string;
    totalValueCents: number;
    customer: { name: string; type: string };
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOCK DATA (Replace with API calls)
// ═══════════════════════════════════════════════════════════════════════════════

const mockCustomers: EnterpriseCustomer[] = [
  {
    id: '1',
    name: 'North Valley Unified School District',
    type: 'DISTRICT',
    primaryContactName: 'Dr. Sarah Johnson',
    primaryContactEmail: 'sjohnson@nvusd.edu',
    isActive: true,
    createdAt: '2024-10-15',
    _count: { deals: 3, contacts: 5 },
  },
  {
    id: '2',
    name: 'Metro Independent School District',
    type: 'DISTRICT',
    primaryContactName: 'James Martinez',
    primaryContactEmail: 'jmartinez@metroisd.org',
    isActive: true,
    createdAt: '2024-09-22',
    _count: { deals: 2, contacts: 3 },
  },
  {
    id: '3',
    name: 'Charter School Alliance',
    type: 'CHARTER_NETWORK',
    primaryContactName: 'Amanda Chen',
    primaryContactEmail: 'achen@csalliance.org',
    isActive: true,
    createdAt: '2024-11-01',
    _count: { deals: 1, contacts: 2 },
  },
  {
    id: '4',
    name: 'Education First Foundation',
    type: 'NONPROFIT',
    primaryContactName: 'Robert Williams',
    primaryContactEmail: 'rwilliams@edfirst.org',
    isActive: true,
    createdAt: '2024-08-10',
    _count: { deals: 4, contacts: 6 },
  },
];

const mockDeals: EnterpriseDeal[] = [
  {
    id: '1',
    name: 'NVUSD 2025-26 Expansion',
    type: 'EXPANSION',
    status: 'PROPOSAL',
    seats: 5000,
    totalValueCents: 12500000,
    arrCents: 12500000,
    expectedCloseDate: '2025-03-15',
    probability: 60,
    customer: { id: '1', name: 'North Valley USD', type: 'DISTRICT' },
    _count: { licenses: 0, provisioningBatches: 0 },
  },
  {
    id: '2',
    name: 'Metro ISD Pilot',
    type: 'NEW_BUSINESS',
    status: 'QUALIFIED',
    seats: 1000,
    totalValueCents: 2500000,
    arrCents: 2500000,
    expectedCloseDate: '2025-02-01',
    probability: 40,
    customer: { id: '2', name: 'Metro ISD', type: 'DISTRICT' },
    _count: { licenses: 0, provisioningBatches: 0 },
  },
  {
    id: '3',
    name: 'CSA Network License',
    type: 'NEW_BUSINESS',
    status: 'WON_ACTIVE',
    seats: 3500,
    totalValueCents: 7875000,
    arrCents: 7875000,
    expectedCloseDate: null,
    probability: 100,
    customer: { id: '3', name: 'Charter School Alliance', type: 'CHARTER_NETWORK' },
    _count: { licenses: 3500, provisioningBatches: 1 },
  },
  {
    id: '4',
    name: 'Ed First 2025 Renewal',
    type: 'RENEWAL',
    status: 'NEGOTIATION',
    seats: 8000,
    totalValueCents: 18000000,
    arrCents: 18000000,
    expectedCloseDate: '2025-06-30',
    probability: 75,
    customer: { id: '4', name: 'Education First Foundation', type: 'NONPROFIT' },
    _count: { licenses: 8000, provisioningBatches: 2 },
  },
];

const mockAnalytics: PipelineAnalytics = {
  dealsByStatus: [
    { status: 'LEAD', _count: 8, _sum: { totalValueCents: 4500000, arrCents: 4500000 } },
    { status: 'QUALIFIED', _count: 5, _sum: { totalValueCents: 8500000, arrCents: 8500000 } },
    { status: 'PROPOSAL', _count: 4, _sum: { totalValueCents: 15000000, arrCents: 15000000 } },
    { status: 'NEGOTIATION', _count: 3, _sum: { totalValueCents: 28000000, arrCents: 28000000 } },
    { status: 'WON_ACTIVE', _count: 12, _sum: { totalValueCents: 95000000, arrCents: 95000000 } },
    { status: 'LOST', _count: 6, _sum: { totalValueCents: 12000000, arrCents: null } },
  ],
  totals: {
    pipelineValueCents: 56000000,
    wonValueCents: 95000000,
    activeArrCents: 95000000,
  },
  recentWins: [
    {
      id: '3',
      name: 'CSA Network License',
      totalValueCents: 7875000,
      customer: { name: 'Charter School Alliance', type: 'CHARTER_NETWORK' },
    },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    LEAD: 'bg-gray-100 text-gray-800',
    QUALIFIED: 'bg-blue-100 text-blue-800',
    PROPOSAL: 'bg-purple-100 text-purple-800',
    NEGOTIATION: 'bg-yellow-100 text-yellow-800',
    CONTRACT_SENT: 'bg-orange-100 text-orange-800',
    WON_PENDING: 'bg-green-100 text-green-800',
    WON_ACTIVE: 'bg-emerald-100 text-emerald-800',
    LOST: 'bg-red-100 text-red-800',
    CHURNED: 'bg-red-200 text-red-900',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

function getCustomerTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    DISTRICT: 'School District',
    CHARTER_NETWORK: 'Charter Network',
    PRIVATE_SCHOOL: 'Private School',
    NONPROFIT: 'Non-Profit',
    GOVERNMENT: 'Government',
    RESELLER: 'Reseller',
    OTHER: 'Other',
  };
  return labels[type] ?? type;
}

function getDealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    NEW_BUSINESS: 'New Business',
    EXPANSION: 'Expansion',
    RENEWAL: 'Renewal',
    UPSELL: 'Upsell',
  };
  return labels[type] ?? type;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function EnterpriseSalesPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'pipeline' | 'deals' | 'customers'>('pipeline');
  const [customers] = useState<EnterpriseCustomer[]>(mockCustomers);
  const [deals] = useState<EnterpriseDeal[]>(mockDeals);
  const [analytics] = useState<PipelineAnalytics>(mockAnalytics);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter deals
  const filteredDeals = deals.filter((deal) => {
    if (statusFilter !== 'all' && deal.status !== statusFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        deal.name.toLowerCase().includes(query) ||
        deal.customer.name.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        customer.name.toLowerCase().includes(query) ||
        customer.primaryContactEmail.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-white p-8 shadow">
        <p className="text-center text-slate-600">Please log in to access enterprise sales.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enterprise Sales</h1>
          <p className="text-slate-600">Manage enterprise customers, deals, and bulk provisioning</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/billing/enterprise/customers/new"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
          >
            + New Customer
          </Link>
          <Link
            href="/billing/enterprise/deals/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + New Deal
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'pipeline', label: 'Pipeline Overview' },
            { id: 'deals', label: 'Deals' },
            { id: 'customers', label: 'Customers' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`border-b-2 px-1 py-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Pipeline Overview Tab */}
      {activeTab === 'pipeline' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-white p-5 shadow">
              <div className="text-sm font-medium text-slate-500">Pipeline Value</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {formatCurrency(analytics.totals.pipelineValueCents)}
              </div>
              <div className="mt-1 text-xs text-slate-400">Active opportunities</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow">
              <div className="text-sm font-medium text-slate-500">Won Revenue</div>
              <div className="mt-1 text-2xl font-bold text-green-600">
                {formatCurrency(analytics.totals.wonValueCents)}
              </div>
              <div className="mt-1 text-xs text-slate-400">All time</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow">
              <div className="text-sm font-medium text-slate-500">Active ARR</div>
              <div className="mt-1 text-2xl font-bold text-blue-600">
                {formatCurrency(analytics.totals.activeArrCents)}
              </div>
              <div className="mt-1 text-xs text-slate-400">Recurring revenue</div>
            </div>
            <div className="rounded-lg bg-white p-5 shadow">
              <div className="text-sm font-medium text-slate-500">Active Customers</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                {customers.filter((c) => c.isActive).length}
              </div>
              <div className="mt-1 text-xs text-slate-400">Enterprise accounts</div>
            </div>
          </div>

          {/* Pipeline Stages */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Pipeline by Stage</h2>
            <div className="space-y-3">
              {analytics.dealsByStatus
                .filter((s) => !['LOST', 'CHURNED', 'WON_ACTIVE'].includes(s.status))
                .map((stage) => (
                  <div key={stage.status} className="flex items-center gap-4">
                    <div className="w-28">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(stage.status)}`}>
                        {stage.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{
                            width: `${Math.min(100, ((stage._sum.totalValueCents ?? 0) / analytics.totals.pipelineValueCents) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm font-medium text-slate-700">
                      {formatCurrency(stage._sum.totalValueCents ?? 0)}
                    </div>
                    <div className="w-16 text-right text-sm text-slate-500">
                      {stage._count} deals
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Recent Wins */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Recent Wins</h2>
            {analytics.recentWins.length === 0 ? (
              <p className="text-sm text-slate-500">No recent wins to display.</p>
            ) : (
              <div className="space-y-3">
                {analytics.recentWins.map((win) => (
                  <div key={win.id} className="flex items-center justify-between rounded-lg bg-green-50 p-4">
                    <div>
                      <div className="font-medium text-slate-900">{win.name}</div>
                      <div className="text-sm text-slate-600">{win.customer.name}</div>
                    </div>
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(win.totalValueCents)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deals Tab */}
      {activeTab === 'deals' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="LEAD">Lead</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="PROPOSAL">Proposal</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON_PENDING">Won (Pending)</option>
              <option value="WON_ACTIVE">Won (Active)</option>
              <option value="LOST">Lost</option>
            </select>
          </div>

          {/* Deals Table */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Deal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Value
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Seats
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">
                      <Link href={`/billing/enterprise/deals/${deal.id}`} className="font-medium text-blue-600 hover:underline">
                        {deal.name}
                      </Link>
                      {deal.expectedCloseDate && (
                        <div className="text-xs text-slate-500">
                          Expected: {new Date(deal.expectedCloseDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <Link href={`/billing/enterprise/customers/${deal.customer.id}`} className="text-slate-900 hover:underline">
                        {deal.customer.name}
                      </Link>
                      <div className="text-xs text-slate-500">
                        {getCustomerTypeLabel(deal.customer.type)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {getDealTypeLabel(deal.type)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(deal.status)}`}>
                        {deal.status.replace('_', ' ')}
                      </span>
                      {deal.probability !== null && (
                        <div className="mt-1 text-xs text-slate-500">{deal.probability}% likely</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(deal.totalValueCents)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-600">
                      {deal.seats.toLocaleString()}
                      {deal._count.licenses > 0 && (
                        <div className="text-xs text-green-600">
                          {deal._count.licenses.toLocaleString()} provisioned
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/billing/enterprise/deals/${deal.id}`}
                          className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          View
                        </Link>
                        {['WON_PENDING', 'WON_ACTIVE'].includes(deal.status) && (
                          <Link
                            href={`/billing/enterprise/deals/${deal.id}/provision`}
                            className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                          >
                            Provision
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDeals.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No deals found matching your criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Customers Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Link
                key={customer.id}
                href={`/billing/enterprise/customers/${customer.id}`}
                className="block rounded-lg bg-white p-5 shadow transition hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{customer.name}</h3>
                    <div className="mt-1 text-sm text-slate-600">
                      {getCustomerTypeLabel(customer.type)}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${customer.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'}`}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4 space-y-1 text-sm">
                  <div className="text-slate-600">
                    <span className="font-medium">Contact:</span> {customer.primaryContactName}
                  </div>
                  <div className="text-slate-500">{customer.primaryContactEmail}</div>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-slate-500">
                  <span>{customer._count.deals} deals</span>
                  <span>{customer._count.contacts} contacts</span>
                </div>
              </Link>
            ))}
          </div>
          {filteredCustomers.length === 0 && (
            <div className="rounded-lg bg-white p-8 text-center text-slate-500 shadow">
              No customers found matching your search.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
