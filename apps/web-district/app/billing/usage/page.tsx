import { Suspense } from 'react';

import { requireAuth } from '../../../lib/auth';
import {
  fetchMeteringSummary,
  fetchUsageHistory,
  fetchUsageLimits,
  type MeterMetric,
} from '../../../lib/billing-api';

import { UsageDashboardHeader } from './components/usage-dashboard-header';
import { UsageLimitAlerts } from './components/usage-limit-alerts';
import { UsageMeterCards } from './components/usage-meter-cards';
import { UsageHistoryChart } from './components/usage-history-chart';
import { UsageExportButton } from './components/usage-export-button';

export const metadata = {
  title: 'Usage Metering | Aivo District Admin',
  description: 'Monitor usage metrics, limits, and trends across your district',
};

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-surface p-6">
      <div className="h-4 w-1/3 rounded bg-surface-muted" />
      <div className="mt-4 h-8 w-1/2 rounded bg-surface-muted" />
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
      <LoadingCard />
    </div>
  );
}

async function UsageDashboardContent() {
  const auth = await requireAuth();
  const tenantId = auth.tenantId;

  // Fetch metering data in parallel
  const [summary, limits, aiHistory, apiHistory] = await Promise.all([
    fetchMeteringSummary(tenantId, auth.accessToken),
    fetchUsageLimits(tenantId, auth.accessToken),
    fetchUsageHistory(tenantId, 'ai_interactions' as MeterMetric, 'daily', undefined, undefined, auth.accessToken),
    fetchUsageHistory(tenantId, 'api_calls' as MeterMetric, 'daily', undefined, undefined, auth.accessToken),
  ]);

  const historyData: Record<string, typeof aiHistory> = {
    ai_interactions: aiHistory,
    api_calls: apiHistory,
  };

  return (
    <>
      {/* Limit Alerts Banner */}
      {(limits.anyHardLimitExceeded || limits.anySoftLimitExceeded) && (
        <UsageLimitAlerts limits={limits} />
      )}

      {/* Meter Cards Grid */}
      <section aria-labelledby="usage-meters-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="usage-meters-heading" className="text-lg font-semibold text-text">
            Current Usage
          </h2>
          <UsageExportButton tenantId={tenantId} />
        </div>
        <UsageMeterCards meters={summary.meters} />
      </section>

      {/* Usage History Charts */}
      <section aria-labelledby="usage-history-heading" className="space-y-4">
        <h2 id="usage-history-heading" className="text-lg font-semibold text-text">
          Usage Trends (30 Days)
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <UsageHistoryChart
            title="AI Interactions"
            metric="ai_interactions"
            history={historyData.ai_interactions!}
          />
          <UsageHistoryChart
            title="API Calls"
            metric="api_calls"
            history={historyData.api_calls!}
          />
        </div>
      </section>

      {/* Period Info */}
      <div className="text-center text-sm text-muted">
        Billing period: {new Date(summary.periodStart).toLocaleDateString()} —{' '}
        {new Date(summary.periodEnd).toLocaleDateString()}
      </div>
    </>
  );
}

export default function UsageDashboardPage() {
  return (
    <div className="space-y-8">
      <UsageDashboardHeader />

      <Suspense
        fallback={
          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Current Usage</h2>
              <LoadingGrid />
            </section>
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-text">Usage Trends</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <LoadingCard />
                <LoadingCard />
              </div>
            </section>
          </div>
        }
      >
        <UsageDashboardContent />
      </Suspense>
    </div>
  );
}
