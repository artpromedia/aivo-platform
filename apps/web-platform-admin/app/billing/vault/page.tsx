'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useAuth } from '../../providers';

import {
  useVaultLicenses,
  useVaultCodes,
  useVaultAuditLogs,
  useActivateLicense,
  useSuspendLicense,
  useRevokeLicense,
  useRevokeCode,
} from '@/hooks/use-billing';
import type { VaultLicense, VaultCode, VaultAuditLog } from '@/lib/api/billing.api';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getLicenseStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ISSUED: 'bg-gray-100 text-gray-800',
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-yellow-100 text-yellow-800',
    REVOKED: 'bg-red-100 text-red-800',
    EXPIRED: 'bg-slate-100 text-slate-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

function getCodeStatusColor(status: string): string {
  const colors: Record<string, string> = {
    VALID: 'bg-green-100 text-green-800',
    REDEEMED: 'bg-blue-100 text-blue-800',
    EXPIRED: 'bg-slate-100 text-slate-800',
    REVOKED: 'bg-red-100 text-red-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

function getActionColor(action: string): string {
  if (action.includes('ISSUED') || action.includes('ACTIVATED')) return 'text-green-600';
  if (action.includes('REDEEMED')) return 'text-blue-600';
  if (action.includes('SUSPENDED') || action.includes('REVOKED')) return 'text-red-600';
  if (action.includes('REINSTATED')) return 'text-emerald-600';
  return 'text-slate-600';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncateId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function LicenseVaultPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'licenses' | 'codes' | 'audit'>('licenses');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch real data via hooks
  const {
    data: licensesData,
    isLoading: licensesLoading,
    error: licensesError,
  } = useVaultLicenses({});
  const { data: codesData, isLoading: codesLoading, error: codesError } = useVaultCodes({});
  const { data: auditData, isLoading: auditLoading, error: auditError } = useVaultAuditLogs({});

  // Mutations
  const activateLicenseMutation = useActivateLicense();
  const suspendLicenseMutation = useSuspendLicense();
  const revokeLicenseMutation = useRevokeLicense();
  const revokeCodeMutation = useRevokeCode();

  const licenses = licensesData?.items ?? [];
  const codes = codesData?.items ?? [];
  const auditLogs = auditData?.items ?? [];

  // Filter licenses
  const filteredLicenses = licenses.filter((license: VaultLicense) => {
    if (statusFilter !== 'all' && license.status !== statusFilter) return false;
    if (typeFilter !== 'all' && license.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        license.id.toLowerCase().includes(query) ||
        license.tenantId.toLowerCase().includes(query) ||
        license.notes?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate stats
  const stats = {
    totalLicenses: licenses.length,
    activeLicenses: licenses.filter((l: VaultLicense) => l.status === 'ACTIVE').length,
    totalSeats: licenses.reduce((sum: number, l: VaultLicense) => sum + l.seats, 0),
    usedSeats: licenses.reduce((sum: number, l: VaultLicense) => sum + l.seatsUsed, 0),
    totalCodes: codes.length,
    validCodes: codes.filter((c: VaultCode) => c.status === 'VALID').length,
  };

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg bg-white p-8 shadow">
        <p className="text-center text-slate-600">Please log in to access the license vault.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">License Vault</h1>
          <p className="text-slate-600">Secure license storage, issuance, and verification</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/billing/vault/codes/new"
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-200"
          >
            + Generate Codes
          </Link>
          <Link
            href="/billing/vault/licenses/new"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            + Issue License
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-slate-500">Total Licenses</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">{stats.totalLicenses}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-slate-500">Active</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{stats.activeLicenses}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-slate-500">Total Seats</div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {stats.totalSeats.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-slate-500">Used Seats</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {stats.usedSeats.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-slate-500">Valid Codes</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{stats.validCodes}</div>
        </div>
        <div className="rounded-lg bg-white p-4 shadow">
          <div className="text-sm font-medium text-slate-500">Utilization</div>
          <div className="mt-1 text-2xl font-bold text-purple-600">
            {stats.totalSeats > 0 ? Math.round((stats.usedSeats / stats.totalSeats) * 100) : 0}%
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {[
            { id: 'licenses', label: 'Licenses' },
            { id: 'codes', label: 'Codes' },
            { id: 'audit', label: 'Audit Log' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
              }}
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

      {/* Licenses Tab */}
      {activeTab === 'licenses' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search licenses..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="ISSUED">Issued</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REVOKED">Revoked</option>
              <option value="EXPIRED">Expired</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="SEAT">Seat</option>
              <option value="ENTERPRISE">Enterprise</option>
              <option value="TRIAL">Trial</option>
              <option value="PROMOTIONAL">Promotional</option>
              <option value="NFR">NFR</option>
            </select>
          </div>

          {/* Licenses Table */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    License ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Tenant
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Seats
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {truncateId(license.id)}
                      </code>
                      {license.notes && (
                        <div className="mt-1 max-w-xs truncate text-xs text-slate-500">
                          {license.notes}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-900">
                      {license.tenantId}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {license.type}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getLicenseStatusColor(license.status)}`}
                      >
                        {license.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right">
                      <div className="text-sm font-medium text-slate-900">
                        {license.seatsUsed.toLocaleString()} / {license.seats.toLocaleString()}
                      </div>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={`h-full rounded-full ${license.seatsUsed >= license.seats ? 'bg-red-500' : 'bg-green-500'}`}
                          style={{
                            width: `${Math.min(100, (license.seatsUsed / license.seats) * 100)}%`,
                          }}
                        />
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatShortDate(license.expiresAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/billing/vault/licenses/${license.id}`}
                          className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
                        >
                          View
                        </Link>
                        {license.status === 'ACTIVE' && (
                          <button
                            type="button"
                            className="rounded bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-200"
                          >
                            Suspend
                          </button>
                        )}
                        {license.status === 'SUSPENDED' && (
                          <button
                            type="button"
                            className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-200"
                          >
                            Reinstate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLicenses.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No licenses found matching your criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Codes Tab */}
      {activeTab === 'codes' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Code ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    License
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-slate-500">
                    Redemptions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Expires
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {codes.map((code) => (
                  <tr key={code.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                        {code.id}
                      </code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-900">
                      <code className="text-xs">{truncateId(code.licenseId)}</code>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className="rounded bg-purple-100 px-2 py-1 text-xs font-medium text-purple-700">
                        {code.codeType}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${getCodeStatusColor(code.status)}`}
                      >
                        {code.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-slate-600">
                      {code.redemptionCount} / {code.maxRedemptions ?? '∞'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatShortDate(code.expiresAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex gap-2">
                        {code.status === 'VALID' && (
                          <button
                            type="button"
                            className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {codes.length === 0 && (
              <div className="p-8 text-center text-slate-500">No codes found.</div>
            )}
          </div>
        </div>
      )}

      {/* Audit Log Tab */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Timestamp
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    License/Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Performed By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    IP Address
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm">
                      {log.licenseId && (
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
                          L: {truncateId(log.licenseId)}
                        </code>
                      )}
                      {log.codeId && (
                        <code className="ml-1 rounded bg-purple-100 px-2 py-1 text-xs text-purple-700">
                          C: {log.codeId}
                        </code>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                      {log.performedBy}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-500">
                      {log.ipAddress ?? '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-500">
                      {log.details ? JSON.stringify(log.details) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {auditLogs.length === 0 && (
              <div className="p-8 text-center text-slate-500">No audit logs found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
