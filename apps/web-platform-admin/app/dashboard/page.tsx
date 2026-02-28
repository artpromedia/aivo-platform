/**
 * Platform Admin Dashboard
 *
 * Main dashboard with platform-wide metrics, AI model management,
 * license tracking, and audit logging.
 *
 * Enhanced with:
 * - Multi-provider AI orchestration panel (Anthropic, OpenAI, Google, Meta)
 * - Enhanced system health monitoring with resource metrics
 * - Live operations feed
 */

import { Suspense } from 'react';

import { AIModelManagement } from './components/ai-model-management';
import { RefreshButton } from './components/refresh-button';
import { AIOrchestrationPanel } from './components/ai-orchestration-panel';
import { AuditLogViewer } from './components/audit-log-viewer';
import { IntegrationStatus } from './components/integration-status';
import { LicenseManagement } from './components/license-management';
import { MetricCards } from './components/metric-cards';
import { PlatformAlertsClient } from './components/platform-alerts';
import { QuickActions } from './components/quick-actions';
import { RecentActivity } from './components/recent-activity';
import { SystemHealth } from './components/system-health';
import { SystemHealthEnhanced } from './components/system-health-enhanced';

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
          <RefreshButton />
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

      {/* AI Orchestration Panel - Multi-provider management */}
      <Suspense fallback={<CardSkeleton title="AI Orchestration" />}>
        <AIOrchestrationPanel />
      </Suspense>

      {/* Enhanced System Health - Detailed resource monitoring */}
      <Suspense fallback={<CardSkeleton title="System Health (Enhanced)" />}>
        <SystemHealthEnhanced />
      </Suspense>

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
      <Suspense fallback={<AlertsSkeleton />}>
        <PlatformAlertsClient />
      </Suspense>
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

function AlertsSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-14 animate-pulse rounded-lg bg-gray-200" />
      <div className="h-14 animate-pulse rounded-lg bg-gray-200" />
    </div>
  );
}
