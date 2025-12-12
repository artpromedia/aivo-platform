/* eslint-disable @typescript-eslint/no-floating-promises */
'use client';

import { useState, useEffect } from 'react';

import type {
  SeatUsageAlert,
  SeatUsageAlertStatus,
  TenantSeatUsageSummary,
  PlatformUsageMetrics,
} from '../../../lib/billing-api';
import {
  fetchAllAlerts,
  fetchAllTenantUsageSummaries,
  fetchPlatformMetrics,
  acknowledgeAlert,
  resolveAlert,
  getGradeBandLabel,
  getThresholdLabel,
} from '../../../lib/billing-api';

export default function PlatformAlertsPage() {
  const [alerts, setAlerts] = useState<SeatUsageAlert[]>([]);
  const [tenantSummaries, setTenantSummaries] = useState<TenantSeatUsageSummary[]>([]);
  const [metrics, setMetrics] = useState<PlatformUsageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SeatUsageAlertStatus | 'ALL'>('OPEN');
  const [selectedAlert, setSelectedAlert] = useState<SeatUsageAlert | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [alertsData, summariesData, metricsData] = await Promise.all([
        fetchAllAlerts(),
        fetchAllTenantUsageSummaries(),
        fetchPlatformMetrics(),
      ]);
      setAlerts(alertsData);
      setTenantSummaries(summariesData);
      setMetrics(metricsData);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'ACKNOWLEDGED' as const, acknowledgedAt: new Date().toISOString() }
            : a
        )
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleResolve = async (alertId: string, resolution: string) => {
    try {
      await resolveAlert(alertId, resolution);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId
            ? { ...a, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() }
            : a
        )
      );
      setSelectedAlert(null);
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const filteredAlerts = alerts.filter(
    (a) => statusFilter === 'ALL' || a.status === statusFilter
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-1/3 rounded bg-slate-200" />
          <div className="mt-4 grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-lg bg-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Seat Usage Alerts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Monitor seat utilization across all tenants and respond to alerts.
        </p>
      </div>

      {/* Platform Metrics */}
      {metrics && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Tenants"
            value={metrics.totalTenants}
            subtext={`${metrics.tenantsWithAlerts} with alerts`}
          />
          <MetricCard
            label="Platform Utilization"
            value={`${metrics.overallUtilization}%`}
            subtext={`${metrics.totalSeatsAllocated.toLocaleString()} / ${metrics.totalSeatsCommitted.toLocaleString()} seats`}
            color={
              metrics.overallUtilization > 100
                ? 'red'
                : metrics.overallUtilization >= 80
                  ? 'amber'
                  : 'emerald'
            }
          />
          <MetricCard
            label="Open Alerts"
            value={metrics.alertsByStatus.open}
            subtext={`${metrics.alertsByStatus.acknowledged} acknowledged`}
            color={metrics.alertsByStatus.open > 0 ? 'amber' : 'emerald'}
          />
          <MetricCard
            label="Critical (110%+)"
            value={metrics.alertsByThreshold.overage110}
            subtext={`${metrics.alertsByThreshold.atLimit100} at limit`}
            color={metrics.alertsByThreshold.overage110 > 0 ? 'red' : 'emerald'}
          />
        </div>
      )}

      {/* Tenants at Risk */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">Tenants at Risk</h2>
        <p className="text-sm text-slate-500">Tenants with utilization over 80% or active alerts</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2 text-left font-medium text-slate-600">Tenant</th>
                <th className="py-2 text-left font-medium text-slate-600">Utilization</th>
                <th className="py-2 text-left font-medium text-slate-600">Committed</th>
                <th className="py-2 text-left font-medium text-slate-600">Allocated</th>
                <th className="py-2 text-left font-medium text-slate-600">Open Alerts</th>
              </tr>
            </thead>
            <tbody>
              {tenantSummaries
                .filter((t) => t.overallUtilization >= 80 || t.openAlertCount > 0)
                .sort((a, b) => b.overallUtilization - a.overallUtilization)
                .map((tenant) => (
                  <tr key={tenant.tenantId} className="border-b border-slate-100">
                    <td className="py-3 font-medium text-slate-900">{tenant.tenantName}</td>
                    <td className="py-3">
                      <span
                        className={`font-medium ${
                          tenant.overallUtilization > 100
                            ? 'text-red-600'
                            : tenant.overallUtilization >= 80
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {tenant.overallUtilization}%
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{tenant.totalCommitted.toLocaleString()}</td>
                    <td className="py-3 text-slate-600">{tenant.totalAllocated.toLocaleString()}</td>
                    <td className="py-3">
                      {tenant.openAlertCount > 0 ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          {tenant.openAlertCount}
                          {tenant.criticalAlertCount > 0 && (
                            <span className="ml-1 text-red-600">
                              ({tenant.criticalAlertCount} critical)
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts List */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">All Alerts</h2>

          {/* Status filter */}
          <div className="mt-3 flex gap-2">
            {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {status === 'ALL'
                  ? `All (${alerts.length})`
                  : `${status.charAt(0) + status.slice(1).toLowerCase()} (${alerts.filter((a) => a.status === status).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredAlerts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No {statusFilter.toLowerCase()} alerts
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onAcknowledge={handleAcknowledge}
                onResolve={() => setSelectedAlert(alert)}
              />
            ))
          )}
        </div>
      </div>

      {/* Resolve Modal */}
      {selectedAlert && (
        <ResolveModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
  color = 'slate',
}: {
  label: string;
  value: string | number;
  subtext: string;
  color?: 'slate' | 'emerald' | 'amber' | 'red';
}) {
  const colors = {
    slate: 'text-slate-900',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtext}</p>
    </div>
  );
}

function AlertRow({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: SeatUsageAlert;
  onAcknowledge: (id: string) => void;
  onResolve: () => void;
}) {
  const utilization = alert.contextJson?.utilization ?? 0;

  const severityColor =
    utilization > 100 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800';

  const statusColor = {
    OPEN: 'bg-amber-100 text-amber-800',
    ACKNOWLEDGED: 'bg-blue-100 text-blue-800',
    RESOLVED: 'bg-emerald-100 text-emerald-800',
  }[alert.status];

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-900">{alert.tenantName}</span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${severityColor}`}>
            {utilization}% ({getThresholdLabel(alert.threshold)})
          </span>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColor}`}>
            {alert.status}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {getGradeBandLabel(alert.gradeBand)} • {alert.contextJson?.allocated ?? 0} /{' '}
          {alert.contextJson?.committed ?? 0} seats
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Created {new Date(alert.createdAt).toLocaleDateString()}
        </p>
      </div>

      {alert.status !== 'RESOLVED' && (
        <div className="flex gap-2">
          {alert.status === 'OPEN' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={onResolve}
            className="rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-200"
          >
            Resolve
          </button>
        </div>
      )}
    </div>
  );
}

function ResolveModal({
  alert,
  onClose,
  onResolve,
}: {
  alert: SeatUsageAlert;
  onClose: () => void;
  onResolve: (alertId: string, resolution: string) => void;
}) {
  const [resolution, setResolution] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-slate-900">Resolve Alert</h3>
        <p className="mt-1 text-sm text-slate-600">
          {alert.tenantName} • {getGradeBandLabel(alert.gradeBand)}
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Resolution Notes</label>
          <textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={3}
            placeholder="Describe how this alert was resolved..."
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(alert.id, resolution)}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Mark as Resolved
          </button>
        </div>
      </div>
    </div>
  );
}
