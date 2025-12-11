'use client';

import { Badge, Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useAuth } from '../providers';

interface Device {
  id: string;
  deviceIdentifier: string;
  deviceType: string;
  appVersion: string | null;
  osVersion: string | null;
  lastCheckInAt: string | null;
  schoolId: string | null;
  memberships: Array<{
    devicePool: {
      id: string;
      name: string;
    };
  }>;
}

interface DevicesResponse {
  devices: Device[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

const deviceTypeLabels: Record<string, string> = {
  IOS_TABLET: 'iPad',
  ANDROID_TABLET: 'Android Tablet',
  CHROMEBOOK: 'Chromebook',
  WINDOWS_PC: 'Windows PC',
  MACOS: 'Mac',
  WEB_BROWSER: 'Web Browser',
};

const deviceTypeIcons: Record<string, string> = {
  IOS_TABLET: '📱',
  ANDROID_TABLET: '📱',
  CHROMEBOOK: '💻',
  WINDOWS_PC: '🖥️',
  MACOS: '🖥️',
  WEB_BROWSER: '🌐',
};

function formatLastSeen(dateStr: string | null): { text: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  if (!dateStr) return { text: 'Never', tone: 'neutral' };
  
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) {
    return { text: 'Just now', tone: 'success' };
  } else if (diffHours < 24) {
    return { text: `${diffHours}h ago`, tone: 'success' };
  } else if (diffDays < 3) {
    return { text: `${diffDays}d ago`, tone: 'success' };
  } else if (diffDays < 7) {
    return { text: `${diffDays}d ago`, tone: 'warning' };
  } else {
    return { text: `${diffDays}d ago`, tone: 'error' };
  }
}

export default function DevicesPage() {
  const { tenantId } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ total: 0, limit: 50, offset: 0 });
  const [filter, setFilter] = useState<{
    deviceType?: string;
    search?: string;
  }>({});

  useEffect(() => {
    if (!tenantId) return;
    
    async function fetchDevices() {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          tenantId,
          limit: pagination.limit.toString(),
          offset: pagination.offset.toString(),
        });
        
        if (filter.deviceType) {
          params.set('deviceType', filter.deviceType);
        }
        
        const response = await fetch(`/api/devices?${params}`);
        if (!response.ok) throw new Error('Failed to fetch devices');
        
        const data: DevicesResponse = await response.json();
        setDevices(data.devices);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    void fetchDevices();
  }, [tenantId, pagination.limit, pagination.offset, filter.deviceType]);

  const filteredDevices = filter.search
    ? devices.filter(
        (d) =>
          d.deviceIdentifier.toLowerCase().includes(filter.search!.toLowerCase()) ||
          d.appVersion?.toLowerCase().includes(filter.search!.toLowerCase())
      )
    : devices;

  const stats = {
    total: pagination.total,
    online: devices.filter((d) => {
      if (!d.lastCheckInAt) return false;
      const hours = (Date.now() - new Date(d.lastCheckInAt).getTime()) / (1000 * 60 * 60);
      return hours < 24;
    }).length,
    offline: devices.filter((d) => {
      if (!d.lastCheckInAt) return true;
      const days = (Date.now() - new Date(d.lastCheckInAt).getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    }).length,
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="Fleet Management" className="text-headline font-semibold">
          Devices
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/devices/pools">
            <Button variant="secondary">Manage Pools</Button>
          </Link>
          <Link href="/devices/policies">
            <Button variant="secondary">Policies</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card title="Total Devices">
          <div className="text-3xl font-bold text-text">{stats.total}</div>
          <div className="text-sm text-muted">Registered in district</div>
        </Card>
        <Card title="Online (24h)">
          <div className="text-3xl font-bold text-success">{stats.online}</div>
          <div className="text-sm text-muted">Active in last 24 hours</div>
        </Card>
        <Card title="Needs Attention">
          <div className="text-3xl font-bold text-error">{stats.offline}</div>
          <div className="text-sm text-muted">Offline 7+ days</div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="search"
            placeholder="Search devices..."
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm focus:border-primary focus:outline-none"
            value={filter.search ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
          />
          <select
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm focus:border-primary focus:outline-none"
            value={filter.deviceType ?? ''}
            onChange={(e) => setFilter((f) => ({ ...f, deviceType: e.target.value || undefined }))}
          >
            <option value="">All Device Types</option>
            {Object.entries(deviceTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {/* Devices Table */}
      <Card
        title="Device Inventory"
        subtitle={`${filteredDevices.length} of ${pagination.total} devices`}
        action={<Button variant="ghost">Export</Button>}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted">Loading devices...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-error">{error}</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-surface-muted text-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Device</th>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Version</th>
                  <th className="px-4 py-3 text-left font-semibold">Pools</th>
                  <th className="px-4 py-3 text-left font-semibold">Last Seen</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-surface">
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-muted">
                      No devices found
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((device) => {
                    const lastSeen = formatLastSeen(device.lastCheckInAt);
                    return (
                      <tr key={device.id} className="transition hover:bg-surface-muted/80">
                        <td className="px-4 py-3">
                          <div className="font-medium text-text">
                            {deviceTypeIcons[device.deviceType] ?? '📱'} {device.deviceIdentifier.slice(0, 20)}
                            {device.deviceIdentifier.length > 20 && '...'}
                          </div>
                          <div className="text-xs text-muted">{device.id.slice(0, 8)}</div>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {deviceTypeLabels[device.deviceType] ?? device.deviceType}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-text">{device.appVersion ?? '-'}</div>
                          <div className="text-xs text-muted">{device.osVersion ?? '-'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {device.memberships.length === 0 ? (
                              <span className="text-muted">None</span>
                            ) : (
                              device.memberships.slice(0, 2).map((m) => (
                                <Badge key={m.devicePool.id} tone="neutral">
                                  {m.devicePool.name}
                                </Badge>
                              ))
                            )}
                            {device.memberships.length > 2 && (
                              <Badge tone="neutral">+{device.memberships.length - 2}</Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={lastSeen.tone}>{lastSeen.text}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/devices/${device.id}`}>
                            <Button variant="ghost" className="px-3 py-1 text-xs font-semibold">
                              Details
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <div className="text-sm text-muted">
              Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
              {pagination.total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                disabled={pagination.offset === 0}
                onClick={() => setPagination((p) => ({ ...p, offset: Math.max(0, p.offset - p.limit) }))}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                disabled={pagination.offset + pagination.limit >= pagination.total}
                onClick={() => setPagination((p) => ({ ...p, offset: p.offset + p.limit }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </section>
  );
}
