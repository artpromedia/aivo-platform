/**
 * Platform Admin Dashboard
 *
 * Main dashboard with platform-wide metrics and quick actions.
 */

import { Suspense } from 'react';

import { IntegrationStatus } from './components/integration-status';
import { MetricCards } from './components/metric-cards';
import { QuickActions } from './components/quick-actions';
import { RecentActivity } from './components/recent-activity';
import { SystemHealth } from './components/system-health';

export const metadata = {
  title: 'Dashboard | Aivo Platform Admin',
};

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-sm text-gray-500">
            Monitor platform health, usage metrics, and integrations
          </p>
        </div>
        <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
      </div>

      {/* Key Metrics */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <MetricCards />
      </Suspense>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* System Health - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2">
          <Suspense fallback={<CardSkeleton title="System Health" />}>
            <SystemHealth />
          </Suspense>
        </div>

        {/* Quick Actions */}
        <div>
          <QuickActions />
        </div>
      </div>

      {/* Secondary Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Integration Status */}
        <Suspense fallback={<CardSkeleton title="Integration Status" />}>
          <IntegrationStatus />
        </Suspense>

        {/* Recent Activity */}
        <Suspense fallback={<CardSkeleton title="Recent Activity" />}>
          <RecentActivity />
        </Suspense>
      </div>
    </div>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
      ))}
    </div>
  );
}

function CardSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <div className="mt-4 h-48 animate-pulse rounded bg-gray-200" />
    </div>
  );
}
