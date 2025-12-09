'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PolicyTab } from '../../../components/PolicyTab';
import type {
  EffectivePolicy,
  Entitlement,
  FeatureFlag,
  PolicyDocument,
  Tenant,
  TenantAiActivitySummary,
  TenantStatus,
  TenantType,
} from '../../../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface TenantDetailClientProps {
  tenant: Tenant;
  featureFlags: FeatureFlag[];
  entitlements: Entitlement[];
  aiActivity: TenantAiActivitySummary | null;
  effectivePolicy: EffectivePolicy | null;
  tenantPolicyOverride: PolicyDocument | null;
}

type TabId = 'overview' | 'flags' | 'ai-activity' | 'policy';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_BADGES: Record<TenantStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
  ONBOARDING: { bg: 'bg-blue-100', text: 'text-blue-800' },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800' },
  CHURNED: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

const TYPE_LABELS: Record<TenantType, string> = {
  DISTRICT: 'School District',
  CHARTER: 'Charter School',
  PRIVATE_SCHOOL: 'Private School',
  ENTERPRISE: 'Enterprise',
  INDIVIDUAL: 'Individual',
};

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'flags', label: 'Feature Flags & Entitlements' },
  { id: 'ai-activity', label: 'AI Activity' },
  { id: 'policy', label: 'Policy' },
];

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function TenantDetailClient({
  tenant,
  featureFlags,
  entitlements,
  aiActivity,
  effectivePolicy,
  tenantPolicyOverride,
}: TenantDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusToggle = async () => {
    const newStatus = tenant.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const confirmMsg =
      newStatus === 'SUSPENDED'
        ? 'Are you sure you want to suspend this tenant? Users will lose access.'
        : 'Are you sure you want to activate this tenant?';

    if (!confirm(confirmMsg)) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFlagToggle = async (flagKey: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`/api/tenants/${tenant.id}/feature-flags/${flagKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error('Failed to update flag');
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update flag');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Link href="/tenants" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to Tenants
            </Link>
          </div>
          <h1 className="text-2xl font-semibold">{tenant.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-slate-600">
            <span>{TYPE_LABELS[tenant.type]}</span>
            <span>•</span>
            <span>{tenant.primaryDomain}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGES[tenant.status].bg} ${STATUS_BADGES[tenant.status].text}`}
          >
            {tenant.status}
          </span>
          {(tenant.status === 'ACTIVE' || tenant.status === 'SUSPENDED') && (
            <button
              onClick={handleStatusToggle}
              disabled={isUpdating}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                tenant.status === 'ACTIVE'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              } disabled:opacity-50`}
            >
              {isUpdating ? 'Updating...' : tenant.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
              }}
              className={`border-b-2 pb-3 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab tenant={tenant} aiActivity={aiActivity} />}
      {activeTab === 'flags' && (
        <FlagsTab
          featureFlags={featureFlags}
          entitlements={entitlements}
          onFlagToggle={handleFlagToggle}
        />
      )}
      {activeTab === 'ai-activity' && (
        <AiActivityTab tenantId={tenant.id} aiActivity={aiActivity} />
      )}
      {activeTab === 'policy' && (
        <PolicyTab
          tenantId={tenant.id}
          effectivePolicy={effectivePolicy}
          tenantOverride={tenantPolicyOverride}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function OverviewTab({
  tenant,
  aiActivity,
}: {
  tenant: Tenant;
  aiActivity: TenantAiActivitySummary | null;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Details Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Tenant Details</h2>
        <dl className="space-y-3">
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">ID</dt>
            <dd className="text-sm font-mono">{tenant.id}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">Primary Domain</dt>
            <dd className="text-sm">{tenant.primaryDomain}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">Max Learners</dt>
            <dd className="text-sm">
              {tenant.settings.maxLearners?.toLocaleString() ?? 'Unlimited'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">Max Educators</dt>
            <dd className="text-sm">
              {tenant.settings.maxEducators?.toLocaleString() ?? 'Unlimited'}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">AI Enabled</dt>
            <dd className="text-sm">{tenant.settings.aiEnabled !== false ? 'Yes' : 'No'}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">Created</dt>
            <dd className="text-sm">{new Date(tenant.createdAt).toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-sm text-slate-500">Updated</dt>
            <dd className="text-sm">{new Date(tenant.updatedAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>

      {/* AI Summary Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">AI Usage (Last 30 Days)</h2>
        {aiActivity ? (
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Total AI Calls</dt>
              <dd className="text-sm font-semibold">{aiActivity.totalCalls.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Open Incidents</dt>
              <dd
                className={`text-sm font-semibold ${aiActivity.openIncidents > 0 ? 'text-red-600' : ''}`}
              >
                {aiActivity.openIncidents}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Total Incidents</dt>
              <dd className="text-sm">{aiActivity.totalIncidents}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Avg Latency</dt>
              <dd className="text-sm">{aiActivity.avgLatencyMs.toFixed(0)} ms</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-slate-500">Est. Cost</dt>
              <dd className="text-sm">${(aiActivity.totalCostCents / 100).toFixed(2)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-slate-500">No AI activity data available</p>
        )}
      </div>
    </div>
  );
}

function FlagsTab({
  featureFlags,
  entitlements,
  onFlagToggle,
}: {
  featureFlags: FeatureFlag[];
  entitlements: Entitlement[];
  onFlagToggle: (flagKey: string, currentEnabled: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Feature Flags</h2>
        </div>
        <div className="divide-y">
          {featureFlags.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No feature flags configured
            </p>
          ) : (
            featureFlags.map((flag) => (
              <div key={flag.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{flag.flagKey}</div>
                  {flag.rolloutPercentage < 100 && (
                    <div className="text-xs text-slate-500">{flag.rolloutPercentage}% rollout</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    onFlagToggle(flag.flagKey, flag.enabled);
                  }}
                  className={`relative h-6 w-11 rounded-full transition ${
                    flag.enabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition ${
                      flag.enabled ? 'translate-x-5' : ''
                    }`}
                  />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Entitlements */}
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">Entitlements</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Feature
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Usage</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {entitlements.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">
                    No entitlements configured
                  </td>
                </tr>
              ) : (
                entitlements.map((ent) => (
                  <tr key={ent.id}>
                    <td className="px-4 py-3 text-sm font-medium">{ent.feature}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {ent.used.toLocaleString()} / {ent.limit?.toLocaleString() ?? '∞'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {ent.expiresAt ? new Date(ent.expiresAt).toLocaleDateString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AiActivityTab({
  tenantId,
  aiActivity,
}: {
  tenantId: string;
  aiActivity: TenantAiActivitySummary | null;
}) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      {aiActivity && (
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold">{aiActivity.totalCalls.toLocaleString()}</div>
            <div className="text-sm text-slate-500">Total Calls</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div
              className={`text-2xl font-bold ${aiActivity.openIncidents > 0 ? 'text-red-600' : ''}`}
            >
              {aiActivity.openIncidents}
            </div>
            <div className="text-sm text-slate-500">Open Incidents</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold">{aiActivity.avgLatencyMs.toFixed(0)} ms</div>
            <div className="text-sm text-slate-500">Avg Latency</div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="text-2xl font-bold">
              ${(aiActivity.totalCostCents / 100).toFixed(2)}
            </div>
            <div className="text-sm text-slate-500">Est. Cost (30d)</div>
          </div>
        </div>
      )}

      {/* Link to Incidents */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">AI Incidents</h2>
        <p className="mb-4 text-sm text-slate-600">View and manage AI incidents for this tenant.</p>
        <Link
          href={`/ai/incidents?tenantId=${tenantId}`}
          className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View Incidents →
        </Link>
      </div>

      {/* Calls Chart Placeholder */}
      {aiActivity && aiActivity.callsByDay.length > 0 && (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Daily AI Calls (Last 30 Days)</h2>
          <div className="flex h-32 items-end gap-1">
            {aiActivity.callsByDay.map((day) => {
              const max = Math.max(...aiActivity.callsByDay.map((d) => d.count));
              const height = max > 0 ? (day.count / max) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 rounded-t bg-blue-500"
                  style={{ height: `${height}%` }}
                  title={`${day.date}: ${day.count} calls`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
