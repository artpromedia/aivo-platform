'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '../../../providers';

interface DevicePool {
  id: string;
  name: string;
  tenantId: string;
  schoolId: string | null;
  gradeBand: string | null;
  createdAt: string;
  memberships: Array<{
    device: {
      id: string;
      deviceIdentifier: string;
      deviceType: string;
      appVersion: string | null;
      osVersion: string | null;
      lastCheckInAt: string | null;
    };
  }>;
  policy: {
    id: string;
    policyJson: Record<string, unknown>;
  } | null;
}

interface AvailableDevice {
  id: string;
  deviceIdentifier: string;
  deviceType: string;
  lastCheckInAt: string | null;
}

const deviceTypeLabels: Record<string, string> = {
  IOS_TABLET: 'iPad',
  ANDROID_TABLET: 'Android Tablet',
  CHROMEBOOK: 'Chromebook',
  WINDOWS_PC: 'Windows PC',
  MACOS: 'Mac',
  WEB_BROWSER: 'Web Browser',
};

export default function PoolDetailPage() {
  const params = useParams();
  const poolId = params.poolId as string;
  const { tenantId } = useAuth();
  
  const [pool, setPool] = useState<DevicePool | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddDevices, setShowAddDevices] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<AvailableDevice[]>([]);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);

  useEffect(() => {
    if (!poolId) return;
    void fetchPool();
  }, [poolId]);

  async function fetchPool() {
    try {
      setLoading(true);
      const response = await fetch(`/api/devices/pools/${poolId}`);
      if (!response.ok) throw new Error('Failed to fetch pool');

      const data: DevicePool = await response.json();
      setPool(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAvailableDevices() {
    if (!tenantId) return;
    
    try {
      const params = new URLSearchParams({ tenantId });
      const response = await fetch(`/api/devices?${params}`);
      if (!response.ok) throw new Error('Failed to fetch devices');

      const data = await response.json();
      // Filter out devices already in this pool
      const poolDeviceIds = new Set(pool?.memberships.map((m) => m.device.id) ?? []);
      setAvailableDevices(
        data.devices.filter((d: AvailableDevice) => !poolDeviceIds.has(d.id))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function addDevicesToPool() {
    try {
      const response = await fetch(`/api/devices/pools/${poolId}/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds: selectedDevices }),
      });

      if (!response.ok) throw new Error('Failed to add devices');

      setShowAddDevices(false);
      setSelectedDevices([]);
      void fetchPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  async function removeDeviceFromPool(deviceId: string) {
    try {
      const response = await fetch(`/api/devices/pools/${poolId}/devices`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceIds: [deviceId] }),
      });

      if (!response.ok) throw new Error('Failed to remove device');
      void fetchPool();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted">Loading pool...</div>
      </div>
    );
  }

  if (error || !pool) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-error">{error ?? 'Pool not found'}</div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Device Pool" className="text-headline font-semibold">
          {pool.name}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/devices/pools">
            <Button variant="ghost">← Back to Pools</Button>
          </Link>
          <Button
            variant="primary"
            onClick={() => {
              setShowAddDevices(true);
              void fetchAvailableDevices();
            }}
          >
            Add Devices
          </Button>
        </div>
      </div>

      {/* Pool Info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Devices">
          <div className="text-3xl font-bold text-text">{pool.memberships.length}</div>
          <div className="text-sm text-muted">in this pool</div>
        </Card>
        <Card title="Grade Band">
          {pool.gradeBand ? (
            <Badge tone="neutral" className="text-lg">
              {pool.gradeBand.replace('_', '-')}
            </Badge>
          ) : (
            <div className="text-muted">No restriction</div>
          )}
        </Card>
        <Card title="Policy">
          {pool.policy ? (
            <Link href={`/devices/pools/${pool.id}/policy`}>
              <Badge tone="success" className="cursor-pointer text-lg">
                Active
              </Badge>
            </Link>
          ) : (
            <Link href={`/devices/pools/${pool.id}/policy`}>
              <Badge tone="warning" className="cursor-pointer text-lg">
                Not Set
              </Badge>
            </Link>
          )}
        </Card>
      </div>

      {/* Devices Table */}
      <Card title="Pool Devices" subtitle={`${pool.memberships.length} device(s)`}>
        {pool.memberships.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-lg font-medium text-text">No devices in this pool</div>
            <p className="mt-2 text-muted">Add devices to apply policies and manage them together.</p>
            <Button
              variant="primary"
              className="mt-4"
              onClick={() => {
                setShowAddDevices(true);
                void fetchAvailableDevices();
              }}
            >
              Add Devices
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Device</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Seen</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {pool.memberships.map(({ device }) => (
                  <tr key={device.id} className="transition hover:bg-surface-muted/80">
                    <td className="px-4 py-3">
                      <div className="font-medium text-text">
                        {device.deviceIdentifier.slice(0, 20)}
                        {device.deviceIdentifier.length > 20 && '...'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{deviceTypeLabels[device.deviceType] ?? device.deviceType}</td>
                    <td className="px-4 py-3 text-text">{device.appVersion ?? '-'}</td>
                    <td className="px-4 py-3 text-muted">
                      {device.lastCheckInAt ? new Date(device.lastCheckInAt).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        className="px-3 py-1 text-xs font-semibold text-error"
                        onClick={() => removeDeviceFromPool(device.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Devices Modal */}
      {showAddDevices && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card title="Add Devices to Pool" className="max-h-[80vh] w-full max-w-2xl overflow-auto">
            <div className="space-y-4">
              {availableDevices.length === 0 ? (
                <div className="py-8 text-center text-muted">No available devices to add</div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  {availableDevices.map((device) => (
                    <label
                      key={device.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg p-3 transition hover:bg-surface-muted"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDevices.includes(device.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDevices((s) => [...s, device.id]);
                          } else {
                            setSelectedDevices((s) => s.filter((id) => id !== device.id));
                          }
                        }}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-text">{device.deviceIdentifier.slice(0, 30)}</div>
                        <div className="text-sm text-muted">{deviceTypeLabels[device.deviceType] ?? device.deviceType}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="flex justify-between border-t border-border pt-4">
                <div className="text-sm text-muted">{selectedDevices.length} device(s) selected</div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setShowAddDevices(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={addDevicesToPool} disabled={selectedDevices.length === 0}>
                    Add to Pool
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </section>
  );
}
