/**
 * Platform Alerts Component
 *
 * Displays active platform alerts with acknowledgment actions.
 * Connected to real API endpoints via React Query hooks.
 */

'use client';

import * as React from 'react';
import { useActiveAlerts, useAcknowledgeAlert, useResolveAlert } from '@/hooks/use-admin-data';
import type { PlatformAlert } from '@/lib/api/alerts.api';

interface DisplayAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  action: string;
  createdAt: string;
}

// Transform API alert to display alert
function toDisplayAlert(alert: PlatformAlert): DisplayAlert {
  const actionMap: Record<string, string> = {
    license: 'View Licenses',
    model: 'View Details',
    health: 'Check Status',
    security: 'Review',
  };
  
  return {
    id: alert.id,
    type: alert.severity,
    message: alert.message,
    source: alert.source,
    action: actionMap[alert.source] || 'View Details',
    createdAt: alert.createdAt,
  };
}

export function PlatformAlertsClient() {
  const { data: alertsData, isLoading, error, refetch } = useActiveAlerts();
  const acknowledgeMutation = useAcknowledgeAlert();
  const resolveMutation = useResolveAlert();

  const alerts: DisplayAlert[] = React.useMemo(() => {
    if (!alertsData) return [];
    return alertsData.map(toDisplayAlert);
  }, [alertsData]);

  // Handle acknowledgment
  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate({ alertId });
  };

  // Handle resolve
  const handleResolve = (alertId: string) => {
    resolveMutation.mutate({ alertId, resolution: 'Resolved from dashboard' });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-14 rounded-lg bg-gray-200" />
        <div className="h-14 rounded-lg bg-gray-200" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚠️</span>
            <span className="text-sm text-red-800">Failed to load alerts</span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-sm text-red-700 hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No alerts
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-center justify-between rounded-lg p-4 ${
            alert.type === 'warning'
              ? 'bg-amber-50 border border-amber-200'
              : alert.type === 'info'
                ? 'bg-blue-50 border border-blue-200'
                : alert.type === 'critical'
                  ? 'bg-red-50 border border-red-200'
                  : 'bg-orange-50 border border-orange-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {alert.type === 'warning' ? '⚠️' : 
               alert.type === 'info' ? 'ℹ️' : 
               alert.type === 'critical' ? '🚨' : '⚡'}
            </span>
            <div>
              <span
                className={`text-sm font-medium ${
                  alert.type === 'warning'
                    ? 'text-amber-800'
                    : alert.type === 'info'
                      ? 'text-blue-800'
                      : alert.type === 'critical'
                        ? 'text-red-800'
                        : 'text-orange-800'
                }`}
              >
                {alert.message}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(alert.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAcknowledge(alert.id)}
              disabled={acknowledgeMutation.isPending}
              className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
            >
              Acknowledge
            </button>
            <button
              onClick={() => handleResolve(alert.id)}
              disabled={resolveMutation.isPending}
              className={`text-sm font-medium hover:underline ${
                alert.type === 'warning'
                  ? 'text-amber-700'
                  : alert.type === 'info'
                    ? 'text-blue-700'
                    : alert.type === 'critical'
                      ? 'text-red-700'
                      : 'text-orange-700'
              }`}
            >
              {alert.action} →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default PlatformAlertsClient;
