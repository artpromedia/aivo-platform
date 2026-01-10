/**
 * Platform Admin Dashboard
 *
 * Main dashboard with platform-wide metrics, AI model management,
 * license tracking, and audit logging.
 */

import { Suspense } from 'react';

import { AIModelManagement } from './components/ai-model-management';
import { AuditLogViewer } from './components/audit-log-viewer';
import { IntegrationStatus } from './components/integration-status';
import { LicenseManagement } from './components/license-management';
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
            Monitor platform health, AI models, licenses, and integrations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">
            Refresh Data
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <MetricCards />
      </Suspense>

      {/* System Health & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Suspense fallback={<CardSkeleton title="System Health" />}>
            <SystemHealth />
          </Suspense>
        </div>
        <div>
          <QuickActions />
        </div>
      </div>

      {/* AI Model Management - Full Width */}
      <Suspense fallback={<CardSkeleton title="AI Model Management" />}>
        <AIModelManagement />
      </Suspense>

      {/* License Management - Full Width */}
      <Suspense fallback={<CardSkeleton title="License Management" />}>
        <LicenseManagement />
      </Suspense>

      {/* Integration Status & Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<CardSkeleton title="Integration Status" />}>
          <IntegrationStatus />
        </Suspense>
        <Suspense fallback={<CardSkeleton title="Recent Activity" />}>
          <RecentActivity />
        </Suspense>
      </div>

      {/* Audit Logs - Full Width */}
      <Suspense fallback={<CardSkeleton title="Audit Logs" />}>
        <AuditLogViewer />
      </Suspense>

      {/* Platform Alerts Banner */}
      <PlatformAlerts />
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

function PlatformAlerts() {
  // In production, this would fetch from API
  const alerts = [
    {
      id: '1',
      type: 'warning' as const,
      message: '3 tenant licenses expiring within 30 days',
      action: 'View Licenses',
    },
    {
      id: '2',
      type: 'info' as const,
      message: 'New AI model v4.0 available for deployment',
      action: 'View Details',
    },
  ];

  if (alerts.length === 0) return null;

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
                : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">
              {alert.type === 'warning' ? '⚠️' : alert.type === 'info' ? 'ℹ️' : '🚨'}
            </span>
            <span
              className={`text-sm font-medium ${
                alert.type === 'warning'
                  ? 'text-amber-800'
                  : alert.type === 'info'
                    ? 'text-blue-800'
                    : 'text-red-800'
              }`}
            >
              {alert.message}
            </span>
          </div>
          <button
            className={`text-sm font-medium hover:underline ${
              alert.type === 'warning'
                ? 'text-amber-700'
                : alert.type === 'info'
                  ? 'text-blue-700'
                  : 'text-red-700'
            }`}
          >
            {alert.action} →
          </button>
        </div>
      ))}
    </div>
  );
}
