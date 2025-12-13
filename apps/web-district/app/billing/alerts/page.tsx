/* eslint-disable @typescript-eslint/no-unsafe-call */
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

import type { SeatUsageAlert } from '../../../lib/billing-api';
import { fetchSeatUsageAlerts, acknowledgeAlert, resolveAlert } from '../../../lib/billing-api';

import { AlertsList } from './components/alerts-list';

export default function BillingAlertsPage() {
  const [alerts, setAlerts] = useState<SeatUsageAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const data = await fetchSeatUsageAlerts();
      setAlerts(data);
    } catch (err) {
      setError('Failed to load alerts');
      console.error('Error loading alerts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await acknowledgeAlert(alertId);
      // Update local state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? {
                ...alert,
                status: 'ACKNOWLEDGED' as const,
                acknowledgedAt: new Date().toISOString(),
              }
            : alert
        )
      );
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(alertId);
      // Update local state
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.id === alertId
            ? { ...alert, status: 'RESOLVED' as const, resolvedAt: new Date().toISOString() }
            : alert
        )
      );
    } catch (err) {
      console.error('Error resolving alert:', err);
    }
  };

  const openAlertsCount = alerts.filter((a) => a.status === 'OPEN').length;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-slate-500">
            <Link href="/billing" className="hover:text-slate-700">
              Billing
            </Link>
            <span>/</span>
            <span className="text-slate-900">Alerts</span>
          </nav>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Seat Usage Alerts</h1>
            {openAlertsCount > 0 && (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-sm font-medium text-amber-800">
                {openAlertsCount} open
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Monitor and manage seat utilization alerts. Alerts are generated when seat usage exceeds
            80%, 100%, or 110% of committed capacity.
          </p>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Warning (80%+)"
            count={alerts.filter((a) => a.threshold === 0.8 && a.status !== 'RESOLVED').length}
            color="amber"
          />
          <SummaryCard
            title="At Limit (100%)"
            count={alerts.filter((a) => a.threshold === 1 && a.status !== 'RESOLVED').length}
            color="orange"
          />
          <SummaryCard
            title="Overage (110%+)"
            count={alerts.filter((a) => a.threshold === 1.1 && a.status !== 'RESOLVED').length}
            color="red"
          />
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button onClick={loadAlerts} className="ml-2 font-medium underline">
              Try again
            </button>
          </div>
        )}

        {/* Alerts list */}
        <AlertsList
          alerts={alerts}
          onAcknowledge={handleAcknowledge}
          onResolve={handleResolve}
          isLoading={isLoading}
        />

        {/* Help text */}
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-medium text-slate-900">About Seat Usage Alerts</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            <li>
              • <strong>Warning (80%)</strong>: You&apos;re approaching your committed seat limit.
              Consider purchasing additional seats.
            </li>
            <li>
              • <strong>At Limit (100%)</strong>: All committed seats are in use. New assignments
              may be blocked unless overage is enabled.
            </li>
            <li>
              • <strong>Overage (110%+)</strong>: You&apos;ve exceeded committed capacity. Overage
              charges may apply based on your contract terms.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  count,
  color,
}: Readonly<{
  title: string;
  count: number;
  color: 'amber' | 'orange' | 'red';
}>) {
  const colors = {
    amber: 'bg-amber-50 border-amber-200',
    orange: 'bg-orange-50 border-orange-200',
    red: 'bg-red-50 border-red-200',
  };

  const textColors = {
    amber: 'text-amber-900',
    orange: 'text-orange-900',
    red: 'text-red-900',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color]}`}>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className={`mt-1 text-2xl font-bold ${textColors[color]}`}>{count}</p>
    </div>
  );
}
