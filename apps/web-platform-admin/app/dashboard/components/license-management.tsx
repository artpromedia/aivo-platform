/**
 * License Management Component
 *
 * Platform-wide license usage and management.
 * Based on LicenseManagement from aivo-pro.
 */

'use client';

import * as React from 'react';

interface TenantLicense {
  id: string;
  tenantName: string;
  plan: 'starter' | 'professional' | 'enterprise';
  seatsUsed: number;
  seatsTotal: number;
  expiresAt: string;
  status: 'active' | 'warning' | 'expired' | 'trial';
  features: string[];
}

interface LicenseSummary {
  totalSeats: number;
  usedSeats: number;
  totalTenants: number;
  activeTenants: number;
  expiringThisMonth: number;
  revenue: number;
}

// Mock data
const mockSummary: LicenseSummary = {
  totalSeats: 25000,
  usedSeats: 18750,
  totalTenants: 45,
  activeTenants: 42,
  expiringThisMonth: 3,
  revenue: 156000,
};

const mockLicenses: TenantLicense[] = [
  {
    id: '1',
    tenantName: 'Springfield School District',
    plan: 'enterprise',
    seatsUsed: 4500,
    seatsTotal: 5000,
    expiresAt: '2026-12-31',
    status: 'active',
    features: ['AI Tutoring', 'IEP Management', 'Analytics Pro'],
  },
  {
    id: '2',
    tenantName: 'Riverside Academy',
    plan: 'professional',
    seatsUsed: 890,
    seatsTotal: 1000,
    expiresAt: '2026-02-15',
    status: 'warning',
    features: ['AI Tutoring', 'Basic Analytics'],
  },
  {
    id: '3',
    tenantName: 'Oak Valley Elementary',
    plan: 'starter',
    seatsUsed: 150,
    seatsTotal: 200,
    expiresAt: '2026-01-25',
    status: 'warning',
    features: ['AI Tutoring'],
  },
  {
    id: '4',
    tenantName: 'Mountain View Charter',
    plan: 'enterprise',
    seatsUsed: 2200,
    seatsTotal: 3000,
    expiresAt: '2027-06-30',
    status: 'active',
    features: ['AI Tutoring', 'IEP Management', 'Analytics Pro', 'Custom Branding'],
  },
  {
    id: '5',
    tenantName: 'Demo School',
    plan: 'professional',
    seatsUsed: 25,
    seatsTotal: 100,
    expiresAt: '2026-01-20',
    status: 'trial',
    features: ['AI Tutoring', 'Basic Analytics'],
  },
];

const planColors = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const statusColors = {
  active: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  trial: 'bg-sky-100 text-sky-700',
};

export function LicenseManagement() {
  const [summary] = React.useState<LicenseSummary>(mockSummary);
  const [licenses] = React.useState<TenantLicense[]>(mockLicenses);
  const [filter, setFilter] = React.useState<'all' | 'warning' | 'expired' | 'trial'>('all');

  const filteredLicenses = React.useMemo(() => {
    if (filter === 'all') return licenses;
    return licenses.filter((l) => l.status === filter);
  }, [licenses, filter]);

  const usagePercent = Math.round((summary.usedSeats / summary.totalSeats) * 100);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-xl">
              🔑
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">License Management</h2>
              <p className="text-sm text-gray-500">Platform-wide seat allocation</p>
            </div>
          </div>
          <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors">
            + Add License
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-200 bg-gray-50">
        <SummaryCard
          label="Total Seats"
          value={summary.totalSeats.toLocaleString()}
          sublabel={`${usagePercent}% utilized`}
          icon="💺"
        />
        <SummaryCard
          label="Active Tenants"
          value={`${summary.activeTenants}/${summary.totalTenants}`}
          sublabel="organizations"
          icon="🏢"
        />
        <SummaryCard
          label="Expiring Soon"
          value={summary.expiringThisMonth.toString()}
          sublabel="this month"
          icon="⚠️"
          warning={summary.expiringThisMonth > 0}
        />
        <SummaryCard
          label="Monthly Revenue"
          value={`$${(summary.revenue / 1000).toFixed(0)}K`}
          sublabel="recurring"
          icon="💰"
        />
      </div>

      {/* Usage Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Platform Seat Usage</span>
          <span className="text-sm text-gray-500">
            {summary.usedSeats.toLocaleString()} / {summary.totalSeats.toLocaleString()} seats
          </span>
        </div>
        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 75 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 p-4 border-b border-gray-200">
        {(['all', 'warning', 'trial', 'expired'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              filter === f
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {f === 'all' ? 'All' : f}
            {f !== 'all' && (
              <span className="ml-1 text-xs">
                ({licenses.filter((l) => l.status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* License Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Tenant</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Plan</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Seats</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left p-3 text-sm font-medium text-gray-500">Expires</th>
              <th className="text-right p-3 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLicenses.map((license) => (
              <tr key={license.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-3">
                  <div>
                    <p className="font-medium text-gray-900">{license.tenantName}</p>
                    <p className="text-xs text-gray-500">
                      {license.features.slice(0, 2).join(', ')}
                      {license.features.length > 2 && ` +${license.features.length - 2} more`}
                    </p>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${planColors[license.plan]}`}>
                    {license.plan}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          license.seatsUsed / license.seatsTotal >= 0.9
                            ? 'bg-red-500'
                            : license.seatsUsed / license.seatsTotal >= 0.75
                              ? 'bg-amber-500'
                              : 'bg-green-500'
                        }`}
                        style={{ width: `${(license.seatsUsed / license.seatsTotal) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">
                      {license.seatsUsed}/{license.seatsTotal}
                    </span>
                  </div>
                </td>
                <td className="p-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[license.status]}`}>
                    {license.status}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`text-sm ${
                    isExpiringSoon(license.expiresAt) ? 'text-amber-600 font-medium' : 'text-gray-600'
                  }`}>
                    {formatDate(license.expiresAt)}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-2">
                    <button className="text-sm text-purple-600 hover:text-purple-800">
                      Edit
                    </button>
                    <button className="text-sm text-gray-600 hover:text-gray-800">
                      View
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredLicenses.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          No licenses match the current filter.
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sublabel,
  icon,
  warning,
}: {
  label: string;
  value: string;
  sublabel: string;
  icon: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg ${
        warning ? 'bg-amber-100' : 'bg-gray-100'
      }`}>
        {icon}
      </div>
      <div>
        <p className={`text-lg font-bold ${warning ? 'text-amber-600' : 'text-gray-900'}`}>
          {value}
        </p>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-xs text-gray-400">{sublabel}</p>
      </div>
    </div>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function isExpiringSoon(dateString: string): boolean {
  const expiry = new Date(dateString);
  const now = new Date();
  const daysUntilExpiry = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return daysUntilExpiry <= 30;
}

export default LicenseManagement;
