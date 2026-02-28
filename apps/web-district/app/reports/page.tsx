/**
 * Reports Page
 *
 * Hub for generating and viewing compliance reports and analytics exports.
 * Uses the ComplianceReports component and links to the analytics dashboard.
 */

import Link from 'next/link';

import {
  fetchComplianceAlerts,
  fetchIEPDashboard,
} from '../../lib/api/district.api';
import { resolveTenant } from '../../lib/tenant';
import { ComplianceReports } from '../dashboard/components/compliance-reports';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Reports | Aivo District Admin',
  description: 'Generate compliance and analytics reports',
};

export default async function ReportsPage() {
  const tenant = await resolveTenant();
  const tenantId = tenant?.tenant_id ?? '';

  // Fetch compliance data for report context
  const [iepDashboard, complianceAlerts] = await Promise.all([
    tenantId
      ? fetchIEPDashboard(tenantId).catch(() => null)
      : Promise.resolve(null),
    tenantId
      ? fetchComplianceAlerts(tenantId, { status: 'OPEN', pageSize: 10 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  const openAlerts = complianceAlerts?.pagination.totalItems ?? 0;
  const complianceRate = iepDashboard?.compliance.percentage ?? 0;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">
            Generate compliance reports and export analytics data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tenant && (
            <div className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-medium text-indigo-700">
              {tenant.name}
            </div>
          )}
          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">IEP Compliance Rate</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {complianceRate > 0 ? `${complianceRate}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Open Compliance Alerts</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{openAlerts}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active IEPs</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {iepDashboard?.activeIEPs ?? '—'}
          </p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/analytics"
          className="rounded-xl border border-gray-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="mb-2 text-2xl">📊</div>
          <h3 className="font-semibold text-gray-900">Analytics Dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">
            View cross-school performance data, trends, and engagement metrics.
          </p>
        </Link>
        <Link
          href="/dashboard/analytics"
          className="rounded-xl border border-gray-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="mb-2 text-2xl">📈</div>
          <h3 className="font-semibold text-gray-900">Dashboard Analytics</h3>
          <p className="mt-1 text-sm text-gray-500">
            Detailed dashboards with school performance charts and KPIs.
          </p>
        </Link>
        <Link
          href="/compliance"
          className="rounded-xl border border-gray-200 bg-white p-6 hover:border-indigo-300 hover:shadow-md transition-all"
        >
          <div className="mb-2 text-2xl">✓</div>
          <h3 className="font-semibold text-gray-900">Compliance Center</h3>
          <p className="mt-1 text-sm text-gray-500">
            Full IEP, FERPA, COPPA, and state compliance dashboard.
          </p>
        </Link>
      </div>

      {/* Compliance Reports Component — full generate/view/filter UI */}
      <ComplianceReports />
    </section>
  );
}
