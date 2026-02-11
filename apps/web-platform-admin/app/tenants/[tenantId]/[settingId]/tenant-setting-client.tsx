'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { FeatureFlag } from '../../../../lib/types';

interface TenantSettingClientProps {
  tenantId: string;
  flag: FeatureFlag;
}

export function TenantSettingClient({ tenantId, flag }: Readonly<TenantSettingClientProps>) {
  const [enabled, setEnabled] = useState(flag.enabled);
  const [rollout, setRollout] = useState(flag.rolloutPercentage);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/tenants/${tenantId}/feature-flags/${flag.flagKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, rolloutPercentage: rollout }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage('Saved successfully');
    } catch {
      setMessage('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/tenants" className="hover:text-slate-700">
          Tenants
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/tenants/${tenantId}`} className="hover:text-slate-700">
          {tenantId}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{flag.flagKey}</span>
      </nav>

      <h1 className="text-2xl font-semibold">Feature Flag: {flag.flagKey}</h1>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="flag-enabled" className="text-sm font-medium text-slate-700">
              Enabled
            </label>
            <button
              id="flag-enabled"
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => {
                setEnabled(!enabled);
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
          </div>

          <div>
            <label htmlFor="rollout" className="block text-sm font-medium text-slate-700">
              Rollout Percentage
            </label>
            <input
              id="rollout"
              type="number"
              min={0}
              max={100}
              value={rollout}
              onChange={(e) => {
                setRollout(Number(e.target.value));
              }}
              className="mt-1 block w-24 rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="text-xs text-slate-400">
            Last updated: {new Date(flag.updatedAt).toLocaleString()}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {message && (
            <span
              className={`text-sm ${message.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}
            >
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
