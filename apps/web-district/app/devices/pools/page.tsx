'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../../providers';

interface DevicePool {
  id: string;
  name: string;
  tenantId: string;
  schoolId: string | null;
  gradeBand: string | null;
  createdAt: string;
  _count: {
    memberships: number;
  };
  policy: {
    id: string;
    policyJson: Record<string, unknown>;
  } | null;
}

interface PoolsResponse {
  pools: DevicePool[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

const gradeBandLabels: Record<string, string> = {
  K_2: 'K-2',
  G3_5: '3-5',
  G6_8: '6-8',
  G9_12: '9-12',
};

export default function DevicePoolsPage() {
  const { tenantId } = useAuth();
  const [pools, setPools] = useState<DevicePool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPool, setNewPool] = useState({ name: '', gradeBand: '' });

  useEffect(() => {
    if (!tenantId) return;
    void fetchPools();
  }, [tenantId]);

  async function fetchPools() {
    try {
      setLoading(true);
      const params = new URLSearchParams({ tenantId: tenantId! });
      const response = await fetch(`/api/devices/pools?${params}`);
      if (!response.ok) throw new Error('Failed to fetch pools');

      const data: PoolsResponse = await response.json();
      setPools(data.pools);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function createPool() {
    try {
      const response = await fetch('/api/devices/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          name: newPool.name,
          gradeBand: newPool.gradeBand || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to create pool');

      setShowCreateModal(false);
      setNewPool({ name: '', gradeBand: '' });
      void fetchPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function deletePool(poolId: string) {
    if (!confirm('Are you sure you want to delete this pool? This will remove all device assignments.')) {
      return;
    }

    try {
      const response = await fetch(`/api/devices/pools/${poolId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete pool');
      void fetchPools();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Fleet Management" className="text-headline font-semibold">
          Device Pools
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/devices">
            <Button variant="ghost">← Back to Devices</Button>
          </Link>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create Pool
          </Button>
        </div>
      </div>

      <p className="text-muted">
        Device pools allow you to group devices and apply policies to them. A device can belong to multiple pools, and
        the most restrictive policy settings will be applied.
      </p>

      {/* Pools Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted">Loading pools...</div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-error">{error}</div>
        </div>
      ) : pools.length === 0 ? (
        <Card>
          <div className="py-12 text-center">
            <div className="text-lg font-medium text-text">No device pools yet</div>
            <p className="mt-2 text-muted">Create a pool to start organizing your devices and applying policies.</p>
            <Button variant="primary" className="mt-4" onClick={() => setShowCreateModal(true)}>
              Create Your First Pool
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pools.map((pool) => (
            <Card key={pool.id} title={pool.name}>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {pool.gradeBand && <Badge tone="neutral">{gradeBandLabels[pool.gradeBand] ?? pool.gradeBand}</Badge>}
                  {pool.policy && <Badge tone="success">Policy Active</Badge>}
                  {!pool.policy && <Badge tone="warning">No Policy</Badge>}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted">Devices</div>
                    <div className="text-xl font-semibold text-text">{pool._count.memberships}</div>
                  </div>
                  <div>
                    <div className="text-muted">Created</div>
                    <div className="text-text">{new Date(pool.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                {pool.policy && (
                  <div className="rounded-lg bg-surface-muted p-3 text-sm">
                    <div className="font-medium text-text">Policy Settings</div>
                    <div className="mt-1 space-y-1 text-muted">
                      {(pool.policy.policyJson as { kioskMode?: boolean }).kioskMode && <div>✓ Kiosk Mode</div>}
                      <div>Max Offline: {(pool.policy.policyJson as { maxOfflineDays?: number }).maxOfflineDays ?? 7} days</div>
                      {(pool.policy.policyJson as { dailyScreenTimeLimit?: number }).dailyScreenTimeLimit && (
                        <div>Screen Time: {(pool.policy.policyJson as { dailyScreenTimeLimit: number }).dailyScreenTimeLimit} min/day</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 border-t border-border pt-4">
                  <Link href={`/devices/pools/${pool.id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Manage
                    </Button>
                  </Link>
                  <Link href={`/devices/pools/${pool.id}/policy`}>
                    <Button variant="ghost">{pool.policy ? 'Edit Policy' : 'Add Policy'}</Button>
                  </Link>
                  <Button variant="ghost" onClick={() => deletePool(pool.id)} className="text-error">
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Pool Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card title="Create Device Pool" className="w-full max-w-md">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text">Pool Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2 text-text focus:border-primary focus:outline-none"
                  placeholder="e.g., Elementary School iPads"
                  value={newPool.name}
                  onChange={(e) => setNewPool((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text">Grade Band (Optional)</label>
                <select
                  className="mt-1 w-full rounded-lg border border-border bg-surface px-4 py-2 text-text focus:border-primary focus:outline-none"
                  value={newPool.gradeBand}
                  onChange={(e) => setNewPool((p) => ({ ...p, gradeBand: e.target.value }))}
                >
                  <option value="">No restriction</option>
                  {Object.entries(gradeBandLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={createPool} disabled={!newPool.name.trim()}>
                  Create Pool
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
