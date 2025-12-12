/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-redundant-type-constituents, import/no-unresolved */
'use client';

import { useState } from 'react';

import type {
  SeatUsageAlert,
  SeatUsageAlertStatus,
  AlertSeverity,
} from '../../../lib/billing-api';
import { getGradeBandLabel } from '../../../lib/billing-api';

interface AlertsListProps {
  alerts: SeatUsageAlert[];
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
  isLoading?: boolean;
}

function AlertStatusBadge({ status }: { status: SeatUsageAlertStatus }) {
  const tones: Record<SeatUsageAlertStatus, 'warning' | 'info' | 'success'> = {
    OPEN: 'warning',
    ACKNOWLEDGED: 'info',
    RESOLVED: 'success',
  };

  const labels: Record<SeatUsageAlertStatus, string> = {
    OPEN: 'Open',
    ACKNOWLEDGED: 'Acknowledged',
    RESOLVED: 'Resolved',
  };

  const tone = tones[status];
  const colorClasses = {
    warning: 'bg-amber-100 text-amber-800',
    info: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[tone]}`}>
      {labels[status]}
    </span>
  );
}

function SeverityIcon({ severity }: { severity: AlertSeverity }) {
  const colors: Record<AlertSeverity, string> = {
    CRITICAL: 'text-red-500',
    WARNING: 'text-amber-500',
    INFO: 'text-blue-500',
  };

  return (
    <div className={`flex-shrink-0 ${colors[severity]}`}>
      {severity === 'CRITICAL' ? (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ) : severity === 'WARNING' ? (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}

function UtilizationBar({ percent }: { percent: number }) {
  const getBarColor = () => {
    if (percent > 100) return 'bg-red-500';
    if (percent >= 100) return 'bg-red-500';
    if (percent >= 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const displayWidth = Math.min(percent, 100);
  const overageWidth = percent > 100 ? Math.min(percent - 100, 20) : 0;

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>Utilization</span>
        <span className="font-medium">{percent.toFixed(0)}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full transition-all ${getBarColor()}`}
          style={{ width: `${displayWidth}%` }}
        />
        {overageWidth > 0 && (
          <div
            className="h-full bg-red-700 transition-all"
            style={{ width: `${overageWidth}%`, marginTop: '-8px' }}
          />
        )}
      </div>
    </div>
  );
}

function AlertCard({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: SeatUsageAlert;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}) {
  const severity: AlertSeverity = alert.contextJson
    ? alert.contextJson.utilization > 100
      ? 'CRITICAL'
      : alert.contextJson.utilization >= 80
        ? 'WARNING'
        : 'INFO'
    : 'WARNING';

  const utilization = alert.contextJson?.utilization ?? 0;
  const committed = alert.contextJson?.committed ?? 0;
  const allocated = alert.contextJson?.allocated ?? 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <SeverityIcon severity={severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-slate-900">
              {getGradeBandLabel(alert.gradeBand)}
            </h3>
            <AlertStatusBadge status={alert.status} />
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {utilization > 100
              ? `Over capacity at ${utilization.toFixed(0)}% utilization (${allocated - committed} seats over limit).`
              : `Seats at ${utilization.toFixed(0)}% utilization, exceeding ${Math.round(alert.threshold * 100)}% threshold.`}
          </p>

          <UtilizationBar percent={utilization} />

          <div className="mt-3 grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500">Committed:</span>{' '}
              <span className="font-medium">{committed} seats</span>
            </div>
            <div>
              <span className="text-slate-500">Allocated:</span>{' '}
              <span className="font-medium">{allocated} seats</span>
            </div>
            {alert.contextJson?.overageAllowed && (
              <>
                <div>
                  <span className="text-slate-500">Overage Limit:</span>{' '}
                  <span className="font-medium">
                    {alert.contextJson.overageLimit ?? 'Unlimited'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Overage Used:</span>{' '}
                  <span className="font-medium">{alert.contextJson.overage}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span>
              Created {new Date(alert.createdAt).toLocaleDateString()}
            </span>
            {alert.acknowledgedAt && (
              <span>• Acknowledged {new Date(alert.acknowledgedAt).toLocaleDateString()}</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      {alert.status !== 'RESOLVED' && (
        <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
          {alert.status === 'OPEN' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              Acknowledge
            </button>
          )}
          <button
            onClick={() => onResolve(alert.id)}
            className="rounded-md bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-200"
          >
            Mark as Resolved
          </button>
        </div>
      )}
    </div>
  );
}

export function AlertsList({ alerts, onAcknowledge, onResolve, isLoading }: AlertsListProps) {
  const [filter, setFilter] = useState<SeatUsageAlertStatus | 'ALL'>('ALL');

  const filteredAlerts = alerts.filter(
    (alert) => filter === 'ALL' || alert.status === filter
  );

  const openCount = alerts.filter((a) => a.status === 'OPEN').length;
  const acknowledgedCount = alerts.filter((a) => a.status === 'ACKNOWLEDGED').length;
  const resolvedCount = alerts.filter((a) => a.status === 'RESOLVED').length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse rounded-lg border border-slate-200 bg-white p-4">
            <div className="h-4 w-1/3 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-2/3 rounded bg-slate-200" />
            <div className="mt-3 h-2 w-full rounded bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setFilter('ALL')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All ({alerts.length})
        </button>
        <button
          onClick={() => setFilter('OPEN')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'OPEN'
              ? 'bg-amber-500 text-white'
              : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilter('ACKNOWLEDGED')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'ACKNOWLEDGED'
              ? 'bg-blue-500 text-white'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          }`}
        >
          Acknowledged ({acknowledgedCount})
        </button>
        <button
          onClick={() => setFilter('RESOLVED')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            filter === 'RESOLVED'
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          }`}
        >
          Resolved ({resolvedCount})
        </button>
      </div>

      {/* Alerts list */}
      {filteredAlerts.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto h-12 w-12 text-slate-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-slate-900">No alerts</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'ALL'
              ? 'All seat utilization is within normal thresholds.'
              : `No ${filter.toLowerCase()} alerts at this time.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onAcknowledge={onAcknowledge}
              onResolve={onResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
}
