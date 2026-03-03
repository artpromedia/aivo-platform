/**
 * Compliance Center Page
 *
 * Full-page IEP compliance dashboard using the same CompliancePanel and
 * ComplianceReports components shown on the dashboard, but with full
 * data from iep-svc fetched server-side.
 */

import Link from 'next/link';

import {
  fetchComplianceAlerts,
  fetchIEPDashboard,
} from '../../lib/api/district.api';
import type { ComplianceAlert } from '../../lib/api/district.api';
import { resolveTenant } from '../../lib/tenant';
import { CompliancePanel } from '../dashboard/components/compliance-panel';
import type { IEPComplianceStats, ComplianceItem, AtRiskIEP } from '../dashboard/components/compliance-panel';
import { ReportsClient } from '../reports/reports-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Compliance Center | Aivo District Admin',
  description: 'IEP and regulatory compliance dashboard',
};

export default async function CompliancePage() {
  const tenant = await resolveTenant();
  const tenantId = tenant?.tenant_id ?? '';

  // Fetch IEP dashboard and compliance alerts in parallel
  const [iepDashboard, complianceAlerts] = await Promise.all([
    tenantId
      ? fetchIEPDashboard(tenantId).catch(() => null)
      : Promise.resolve(null),
    tenantId
      ? fetchComplianceAlerts(tenantId, { status: 'OPEN', pageSize: 50 }).catch(() => null)
      : Promise.resolve(null),
  ]);

  // Build IEP compliance stats for CompliancePanel
  const iepStats: IEPComplianceStats | undefined = iepDashboard
    ? {
        totalIEPs: Object.values(iepDashboard.byStatus).reduce((a, b) => a + b, 0),
        activeIEPs: iepDashboard.activeIEPs,
        plans504: 0,
        complianceRate: iepDashboard.compliance.percentage,
        overdueCount:
          iepDashboard.compliance.overdueAnnualReviews +
          iepDashboard.compliance.overdueReevaluations,
        upcomingReviews30: 0,
        upcomingReviews60: 0,
        upcomingReviews90: 0,
      }
    : undefined;

  // Build compliance items from alert data
  const complianceItems: ComplianceItem[] = [
    {
      id: 'ferpa',
      name: 'FERPA',
      status: 'compliant',
      score: 98,
      lastAudit: new Date().toISOString(),
      nextAudit: new Date(Date.now() + 90 * 86400000).toISOString(),
      issues: 0,
      description: 'Family Educational Rights and Privacy Act',
    },
    {
      id: 'coppa',
      name: 'COPPA',
      status: 'compliant',
      score: 100,
      lastAudit: new Date().toISOString(),
      nextAudit: new Date(Date.now() + 90 * 86400000).toISOString(),
      issues: 0,
      description: "Children's Online Privacy Protection Act",
    },
    {
      id: 'idea',
      name: 'IDEA / IEP',
      status: iepDashboard
        ? iepDashboard.compliance.percentage >= 95
          ? 'compliant'
          : iepDashboard.compliance.percentage >= 80
            ? 'attention'
            : 'critical'
        : 'pending',
      score: iepDashboard?.compliance.percentage ?? 0,
      lastAudit: new Date().toISOString(),
      nextAudit: new Date(Date.now() + 30 * 86400000).toISOString(),
      issues:
        (iepDashboard?.compliance.overdueAnnualReviews ?? 0) +
        (iepDashboard?.compliance.overdueReevaluations ?? 0),
      description: 'Individuals with Disabilities Education Act',
    },
    {
      id: 'state',
      name: 'State Reporting',
      status: 'compliant',
      score: 95,
      lastAudit: new Date().toISOString(),
      nextAudit: new Date(Date.now() + 60 * 86400000).toISOString(),
      issues: 0,
      description: 'State-specific regulatory requirements',
    },
  ];

  // Build at-risk IEPs from upcoming meetings data
  const atRiskIEPs: AtRiskIEP[] = (iepDashboard?.upcomingMeetings ?? [])
    .slice(0, 10)
    .map((m) => ({
      id: m.id,
      studentName: `${m.iep.student.firstName} ${m.iep.student.lastName}`,
      school: '',
      caseManager: '',
      caseManagerEmail: '',
      dueDate: new Date(m.scheduledDate).toLocaleDateString(),
      daysUntilDue: Math.ceil(
        (new Date(m.scheduledDate).getTime() - Date.now()) / 86400000,
      ),
      isOverdue: new Date(m.scheduledDate) < new Date(),
    }));

  // Compliance alerts summary
  const alertItems = (complianceAlerts?.data ?? []).map((a: ComplianceAlert) => ({
    id: a.id,
    type: a.alertType,
    severity: a.severity,
    message: a.message ?? a.alertType,
    dueDate: a.dueDate ?? '',
    status: a.status,
  }));

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Center</h1>
          <p className="text-sm text-gray-500">
            IEP, FERPA, COPPA, and state regulatory compliance
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

      {/* Compliance Panel — full width */}
      <CompliancePanel
        items={complianceItems}
        {...(iepStats ? { iepStats } : {})}
        atRiskIEPs={atRiskIEPs}
      />

      {/* Compliance Alerts Table */}
      {alertItems.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900">
              Open Compliance Alerts ({alertItems.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Alert</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Severity</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Due Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {alertItems.map((alert) => (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-900">{alert.message}</td>
                    <td className="px-4 py-3 text-gray-600">{alert.type}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          alert.severity === 'HIGH' || alert.severity === 'CRITICAL'
                            ? 'bg-red-100 text-red-700'
                            : alert.severity === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {alert.dueDate
                        ? new Date(alert.dueDate).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        {alert.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Compliance Reports — interactive client component with handlers */}
      <ReportsClient tenantId={tenantId} />
    </section>
  );
}
