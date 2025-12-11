'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../../providers';

interface DevicePolicy {
  id: string;
  devicePoolId: string;
  policyJson: {
    kioskMode?: boolean;
    maxOfflineDays?: number;
    gradeBand?: string;
    dailyScreenTimeLimit?: number;
    allowedStartHour?: number;
    allowedEndHour?: number;
    restrictExternalLinks?: boolean;
    requireWifiForSync?: boolean;
    autoUpdateEnabled?: boolean;
    minimumAppVersion?: string;
  };
  createdAt: string;
  updatedAt: string;
  devicePool: {
    id: string;
    name: string;
    gradeBand: string | null;
    schoolId: string | null;
    _count: {
      memberships: number;
    };
  };
}

interface PoliciesResponse {
  policies: DevicePolicy[];
}

const gradeBandLabels: Record<string, string> = {
  K_2: 'K-2',
  G3_5: '3-5',
  G6_8: '6-8',
  G9_12: '9-12',
};

function formatHour(hour: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${period}`;
}

export default function DevicePoliciesPage() {
  const { tenantId } = useAuth();
  const [policies, setPolicies] = useState<DevicePolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;

    async function fetchPolicies() {
      try {
        setLoading(true);
        const params = new URLSearchParams({ tenantId: tenantId as string });
        const response = await fetch(`/api/devices/policies?${params}`);
        if (!response.ok) throw new Error('Failed to fetch policies');

        const data = (await response.json()) as PoliciesResponse;
        setPolicies(data.policies);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void fetchPolicies();
  }, [tenantId]);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Fleet Management" className="text-headline font-semibold">
          Device Policies
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/devices">
            <Button variant="ghost">← Back to Devices</Button>
          </Link>
          <Link href="/devices/pools">
            <Button variant="secondary">Manage Pools</Button>
          </Link>
        </div>
      </div>

      <p className="text-muted">
        Device policies control how Aivo runs on managed devices. Policies are applied to device pools, and devices can
        be in multiple pools (most restrictive settings apply).
      </p>

      {/* Policy Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Policies">
          <div className="text-3xl font-bold text-text">{policies.length}</div>
          <div className="text-sm text-muted">Active policies</div>
        </Card>
        <Card title="Kiosk Mode Active">
          <div className="text-3xl font-bold text-warning">
            {policies.filter((p) => p.policyJson.kioskMode).length}
          </div>
          <div className="text-sm text-muted">Pools with kiosk mode</div>
        </Card>
        <Card title="Devices Covered">
          <div className="text-3xl font-bold text-success">
            {policies.reduce((sum, p) => sum + p.devicePool._count.memberships, 0)}
          </div>
          <div className="text-sm text-muted">Total devices with policies</div>
        </Card>
      </div>

      {/* Policies Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted">Loading policies...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-error">{error}</div>
        </div>
      ) : policies.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="text-lg font-medium text-text">No policies configured</div>
            <p className="mt-2 text-muted">Create device pools and add policies to manage device behavior.</p>
            <Link href="/devices/pools">
              <Button variant="primary" className="mt-4">
                Go to Device Pools
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card title="All Policies" subtitle={`${policies.length} policy(ies) configured`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Pool</th>
                  <th className="px-4 py-3 text-left font-semibold">Devices</th>
                  <th className="px-4 py-3 text-left font-semibold">Settings</th>
                  <th className="px-4 py-3 text-left font-semibold">Restrictions</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {policies.map((policy) => (
                  <tr key={policy.id} className="transition hover:bg-surface-muted/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text">{policy.devicePool.name}</div>
                      {policy.devicePool.gradeBand && (
                        <Badge tone="neutral" className="mt-1">
                          {gradeBandLabels[policy.devicePool.gradeBand] ?? policy.devicePool.gradeBand}
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xl font-semibold text-text">{policy.devicePool._count.memberships}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          {policy.policyJson.kioskMode ? (
                            <Badge tone="warning">Kiosk Mode</Badge>
                          ) : (
                            <span className="text-muted">Standard Mode</span>
                          )}
                        </div>
                        <div className="text-muted">
                          Max offline: {policy.policyJson.maxOfflineDays ?? 7} days
                        </div>
                        {policy.policyJson.dailyScreenTimeLimit && (
                          <div className="text-muted">
                            Screen time: {policy.policyJson.dailyScreenTimeLimit} min/day
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {policy.policyJson.restrictExternalLinks && (
                          <Badge tone="error">No External Links</Badge>
                        )}
                        {policy.policyJson.requireWifiForSync && (
                          <Badge tone="neutral">WiFi Required</Badge>
                        )}
                        {policy.policyJson.allowedStartHour !== undefined &&
                          policy.policyJson.allowedEndHour !== undefined && (
                            <Badge tone="neutral">
                              {formatHour(policy.policyJson.allowedStartHour)}-
                              {formatHour(policy.policyJson.allowedEndHour)}
                            </Badge>
                          )}
                        {policy.policyJson.minimumAppVersion && (
                          <Badge tone="neutral">Min v{policy.policyJson.minimumAppVersion}</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/devices/pools/${policy.devicePoolId}/policy`}>
                        <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                          Edit
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Policy Reference */}
      <Card title="Policy Reference" subtitle="Available policy settings">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="font-semibold text-text">Device Control</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong>Kiosk Mode:</strong> Locks device to Aivo app only, prevents app switching
              </li>
              <li>
                <strong>Max Offline Days:</strong> Requires internet sync after specified days (default: 7)
              </li>
              <li>
                <strong>Auto Update:</strong> Automatically update app when new version available
              </li>
              <li>
                <strong>Minimum Version:</strong> Require specific app version to use device
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-text">Usage Restrictions</h4>
            <ul className="mt-2 space-y-2 text-sm text-muted">
              <li>
                <strong>Screen Time Limit:</strong> Maximum minutes of use per day
              </li>
              <li>
                <strong>Allowed Hours:</strong> Restrict usage to specific time window
              </li>
              <li>
                <strong>External Links:</strong> Block navigation to external websites
              </li>
              <li>
                <strong>WiFi Required:</strong> Only sync data when connected to WiFi
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </section>
  );
}
