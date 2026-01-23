/**
 * License Management Component
 *
 * Platform-wide license usage and management.
 * Now connected to real API endpoints via React Query hooks.
 */

'use client';

import * as React from 'react';
import { useLicenseSummary, useLicenses, useRevenueMetrics } from '@/hooks/use-admin-data';
import type { TenantLicense as APILicense, LicenseFilters, LicenseStatus, LicensePlan } from '@/lib/api/licenses.api';

interface DisplayLicense {
  id: string;
  tenantName: string;
  plan: LicensePlan;
  seatsUsed: number;
  seatsTotal: number;
  expiresAt: string;
  status: LicenseStatus;
  features: string[];
}

// Transform API license to display license
function toDisplayLicense(license: APILicense): DisplayLicense {
  return {
    id: license.id,
    tenantName: license.tenantName,
    plan: license.plan,
    seatsUsed: license.seatsUsed,
    seatsTotal: license.seatsTotal,
    expiresAt: license.expiresAt,
    status: license.status,
    features: license.features,
  };
}

const planColors: Record<LicensePlan, string> = {
  starter: 'bg-gray-100 text-gray-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
  pilot: 'bg-sky-100 text-sky-700',
};

const statusColors: Record<LicenseStatus, string> = {
  active: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  expired: 'bg-red-100 text-red-700',
  trial: 'bg-sky-100 text-sky-700',
  suspended: 'bg-red-100 text-red-700',
};

export function LicenseManagement() {
  const [filter, setFilter] = React.useState<LicenseStatus | 'all'>('all');

  // Fetch real data from API
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useLicenseSummary();
  const { data: revenueData, isLoading: revenueLoading } = useRevenueMetrics('month');
  const { 
    data: licensesData, 
    isLoading: licensesLoading, 
    error: licensesError,
    refetch: refetchLicenses 
  } = useLicenses(filter !== 'all' ? { status: filter } : undefined);

  const licenses: DisplayLicense[] = React.useMemo(() => {
    if (!licensesData?.data) return [];
    return licensesData.data.map(toDisplayLicense);
  }, [licensesData]);

  const summary = summaryData ?? {
    totalSeats: 0,
    usedSeats: 0,
    totalTenants: 0,
    activeTenants: 0,
    expiringThisMonth: 0,
    allocatedSeats: 0,
    utilizationPercent: 0,
    expiringThisQuarter: 0,
    trialTenants: 0,
    suspendedTenants: 0,
  };

  const isLoading = summaryLoading || licensesLoading;
  const error = summaryError || licensesError;

  const usagePercent = summary.totalSeats > 0 
    ? Math.round((summary.usedSeats / summary.totalSeats) * 100) 
    : 0;
  
  // Get MRR from revenue data, fallback to 0
  const monthlyRevenue = revenueData?.mrr ?? 0;

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-semibold text-red-800">Failed to load licenses</h3>
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : 'Unable to connect to billing service'}
            </p>
          </div>
          <button
            onClick={() => refetchLicenses()}
            className="ml-auto rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
        {summaryLoading || revenueLoading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
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
              value={`$${(monthlyRevenue / 1000).toFixed(0)}K`}
              sublabel="recurring"
              icon="💰"
            />
          </>
        )}
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
            {licensesLoading ? (
              <>
                <LicenseRowSkeleton />
                <LicenseRowSkeleton />
                <LicenseRowSkeleton />
              </>
            ) : (
              licenses.map((license) => (
                <LicenseRow key={license.id} license={license} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {!licensesLoading && licenses.length === 0 && (
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

function SummaryCardSkeleton() {
  return (
    <div className="flex items-center gap-3 animate-pulse">
      <div className="h-10 w-10 rounded-lg bg-gray-200" />
      <div>
        <div className="h-5 w-16 rounded bg-gray-200 mb-1" />
        <div className="h-3 w-20 rounded bg-gray-200 mb-1" />
        <div className="h-3 w-12 rounded bg-gray-200" />
      </div>
    </div>
  );
}

function LicenseRow({ license }: { license: DisplayLicense }) {
  const planColor = planColors[license.plan] || 'bg-gray-100 text-gray-700';
  const statusColor = statusColors[license.status] || 'bg-gray-100 text-gray-700';
  const seatUtilization = license.seatsTotal > 0 ? license.seatsUsed / license.seatsTotal : 0;

  return (
    <tr className="hover:bg-gray-50 transition-colors">
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
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${planColor}`}>
          {license.plan}
        </span>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                seatUtilization >= 0.9
                  ? 'bg-red-500'
                  : seatUtilization >= 0.75
                    ? 'bg-amber-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${seatUtilization * 100}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">
            {license.seatsUsed}/{license.seatsTotal}
          </span>
        </div>
      </td>
      <td className="p-3">
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColor}`}>
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
  );
}

function LicenseRowSkeleton() {
  return (
    <tr className="animate-pulse">
      <td className="p-3">
        <div className="h-4 w-32 rounded bg-gray-200 mb-1" />
        <div className="h-3 w-24 rounded bg-gray-200" />
      </td>
      <td className="p-3">
        <div className="h-6 w-20 rounded-full bg-gray-200" />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 rounded-full bg-gray-200" />
          <div className="h-4 w-12 rounded bg-gray-200" />
        </div>
      </td>
      <td className="p-3">
        <div className="h-6 w-16 rounded-full bg-gray-200" />
      </td>
      <td className="p-3">
        <div className="h-4 w-20 rounded bg-gray-200" />
      </td>
      <td className="p-3 text-right">
        <div className="flex justify-end gap-2">
          <div className="h-4 w-8 rounded bg-gray-200" />
          <div className="h-4 w-8 rounded bg-gray-200" />
        </div>
      </td>
    </tr>
  );
}

export default LicenseManagement;
