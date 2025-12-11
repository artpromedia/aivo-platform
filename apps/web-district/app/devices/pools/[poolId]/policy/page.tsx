'use client';

import { Button, Card, Heading } from '@aivo/ui-web';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface DevicePool {
  id: string;
  name: string;
  gradeBand: string | null;
}

interface PolicyConfig {
  kioskMode: boolean;
  maxOfflineDays: number;
  gradeBand: string | null;
  dailyScreenTimeLimit: number | null;
  allowedStartHour: number | null;
  allowedEndHour: number | null;
  restrictExternalLinks: boolean;
  requireWifiForSync: boolean;
  autoUpdateEnabled: boolean;
  minimumAppVersion: string | null;
}

interface PolicyResponse {
  id?: string;
  policyJson?: PolicyConfig;
  devicePool?: DevicePool;
  defaults?: PolicyConfig;
  policy?: null;
}

const gradeBandOptions = [
  { value: '', label: 'No restriction' },
  { value: 'K_2', label: 'K-2 (Kindergarten - 2nd)' },
  { value: 'G3_5', label: '3-5 (3rd - 5th Grade)' },
  { value: 'G6_8', label: '6-8 (6th - 8th Grade)' },
  { value: 'G9_12', label: '9-12 (9th - 12th Grade)' },
];

const defaultPolicy: PolicyConfig = {
  kioskMode: false,
  maxOfflineDays: 7,
  gradeBand: null,
  dailyScreenTimeLimit: null,
  allowedStartHour: null,
  allowedEndHour: null,
  restrictExternalLinks: true,
  requireWifiForSync: false,
  autoUpdateEnabled: true,
  minimumAppVersion: null,
};

export default function PoolPolicyPage() {
  const params = useParams();
  const router = useRouter();
  const poolId = params.poolId as string;

  const [pool, setPool] = useState<DevicePool | null>(null);
  const [policyId, setPolicyId] = useState<string | null>(null);
  const [config, setConfig] = useState<PolicyConfig>(defaultPolicy);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!poolId) return;

    async function fetchPolicy() {
      try {
        setLoading(true);

        // Fetch pool details
        const poolResponse = await fetch(`/api/devices/pools/${poolId}`);
        if (!poolResponse.ok) throw new Error('Failed to fetch pool');
        const poolData = (await poolResponse.json()) as DevicePool;
        setPool(poolData);

        // Fetch policy
        const policyResponse = await fetch(`/api/devices/pools/${poolId}/policy`);
        if (!policyResponse.ok) throw new Error('Failed to fetch policy');
        const policyData = (await policyResponse.json()) as PolicyResponse;

        if (policyData.policyJson) {
          setPolicyId(policyData.id ?? null);
          setConfig({ ...defaultPolicy, ...policyData.policyJson });
        } else if (policyData.defaults) {
          setConfig({ ...defaultPolicy, ...policyData.defaults });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    void fetchPolicy();
  }, [poolId]);

  async function savePolicy() {
    try {
      setSaving(true);

      const response = await fetch(`/api/devices/pools/${poolId}/policy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) throw new Error('Failed to save policy');

      router.push(`/devices/pools/${poolId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy() {
    if (!policyId) return;
    if (!confirm('Are you sure you want to delete this policy? Devices will use default settings.')) {
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/devices/pools/${poolId}/policy`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete policy');

      router.push(`/devices/pools/${poolId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted">Loading policy...</div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-error">Pool not found</div>
      </div>
    );
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker={`Pool: ${pool.name}`} className="text-headline font-semibold">
          {policyId ? 'Edit Policy' : 'Create Policy'}
        </Heading>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/devices/pools/${poolId}`}>
            <Button variant="ghost">← Back to Pool</Button>
          </Link>
          {policyId && (
            <Button variant="ghost" className="text-error" onClick={deletePolicy} disabled={saving}>
              Delete Policy
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-error/10 p-4 text-error">{error}</div>
      )}

      {/* Device Control Section */}
      <Card title="Device Control" subtitle="Control device behavior and restrictions">
        <div className="space-y-6">
          {/* Kiosk Mode */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-text">Kiosk Mode</div>
              <div className="text-sm text-muted">
                Lock device to Aivo app only. Prevents app switching and access to device settings.
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.kioskMode}
                onChange={(e) => { setConfig((c) => ({ ...c, kioskMode: e.target.checked })); }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary/20"></div>
            </label>
          </div>

          {/* Max Offline Days */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-text">Maximum Offline Days</div>
              <div className="text-sm text-muted">
                Require devices to sync with the internet within this many days. Exceeding this blocks usage until connected.
              </div>
            </div>
            <input
              type="number"
              min={1}
              max={30}
              value={config.maxOfflineDays}
              onChange={(e) => { setConfig((c) => ({ ...c, maxOfflineDays: parseInt(e.target.value) || 7 })); }}
              className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-center text-text focus:border-primary focus:outline-none"
            />
          </div>

          {/* Auto Update */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-text">Auto Update</div>
              <div className="text-sm text-muted">
                Automatically download and install app updates when available.
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.autoUpdateEnabled}
                onChange={(e) => { setConfig((c) => ({ ...c, autoUpdateEnabled: e.target.checked })); }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary/20"></div>
            </label>
          </div>

          {/* Minimum App Version */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-text">Minimum App Version</div>
              <div className="text-sm text-muted">
                Require a minimum app version to use the device. Leave empty for no restriction.
              </div>
            </div>
            <input
              type="text"
              placeholder="e.g., 2.1.0"
              value={config.minimumAppVersion ?? ''}
              onChange={(e) => { setConfig((c) => ({ ...c, minimumAppVersion: e.target.value || null })); }}
              className="w-28 rounded-lg border border-border bg-surface px-3 py-2 text-text placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </Card>

      {/* Content & Access Section */}
      <Card title="Content & Access" subtitle="Control content filtering and access restrictions">
        <div className="space-y-6">
          {/* Grade Band */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-text">Grade Band Restriction</div>
              <div className="text-sm text-muted">
                Limit content to age-appropriate material for the selected grade band.
              </div>
            </div>
            <select
              value={config.gradeBand ?? ''}
              onChange={(e) => { setConfig((c) => ({ ...c, gradeBand: e.target.value || null })); }}
              className="w-48 rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none"
            >
              {gradeBandOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Restrict External Links */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-text">Block External Links</div>
              <div className="text-sm text-muted">
                Prevent navigation to external websites from within the app.
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.restrictExternalLinks}
                onChange={(e) => { setConfig((c) => ({ ...c, restrictExternalLinks: e.target.checked })); }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary/20"></div>
            </label>
          </div>

          {/* Require WiFi */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-text">Require WiFi for Sync</div>
              <div className="text-sm text-muted">
                Only sync data when connected to WiFi (not cellular data).
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={config.requireWifiForSync}
                onChange={(e) => { setConfig((c) => ({ ...c, requireWifiForSync: e.target.checked })); }}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-border after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-primary peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-primary/20"></div>
            </label>
          </div>
        </div>
      </Card>

      {/* Usage Limits Section */}
      <Card title="Usage Limits" subtitle="Set time-based restrictions for device usage">
        <div className="space-y-6">
          {/* Screen Time Limit */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-medium text-text">Daily Screen Time Limit</div>
              <div className="text-sm text-muted">
                Maximum minutes of app usage per day. Leave empty for unlimited.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={1440}
                placeholder="∞"
                value={config.dailyScreenTimeLimit ?? ''}
                onChange={(e) => {
                  setConfig((c) => ({
                    ...c,
                    dailyScreenTimeLimit: e.target.value ? parseInt(e.target.value) : null,
                  }));
                }}
                className="w-20 rounded-lg border border-border bg-surface px-3 py-2 text-center text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <span className="text-muted">min</span>
            </div>
          </div>

          {/* Allowed Hours */}
          <div>
            <div className="font-medium text-text">Allowed Usage Hours</div>
            <div className="mb-3 text-sm text-muted">
              Restrict device usage to specific hours. Leave empty for 24/7 access.
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">From:</span>
                <select
                  value={config.allowedStartHour ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({
                      ...c,
                      allowedStartHour: e.target.value ? parseInt(e.target.value) : null,
                    }));
                  }}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none"
                >
                  <option value="">Any</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">To:</span>
                <select
                  value={config.allowedEndHour ?? ''}
                  onChange={(e) => {
                    setConfig((c) => ({
                      ...c,
                      allowedEndHour: e.target.value ? parseInt(e.target.value) : null,
                    }));
                  }}
                  className="rounded-lg border border-border bg-surface px-3 py-2 text-text focus:border-primary focus:outline-none"
                >
                  <option value="">Any</option>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Link href={`/devices/pools/${poolId}`}>
          <Button variant="ghost">Cancel</Button>
        </Link>
        <Button variant="primary" onClick={savePolicy} disabled={saving}>
          {saving ? 'Saving...' : policyId ? 'Update Policy' : 'Create Policy'}
        </Button>
      </div>
    </section>
  );
}
