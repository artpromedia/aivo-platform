'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

import type { TenantType } from '../../../lib/types';

const TENANT_TYPES: { value: TenantType; label: string }[] = [
  { value: 'DISTRICT', label: 'District' },
  { value: 'CHARTER', label: 'Charter School' },
  { value: 'PRIVATE_SCHOOL', label: 'Private School' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'INDIVIDUAL', label: 'Individual' },
];

export default function CreateTenantPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const body = {
      name: form.get('name') as string,
      type: form.get('type') as TenantType,
      primaryDomain: form.get('primaryDomain') as string,
      settings: {
        maxLearners: Number(form.get('maxLearners')) || 1000,
        maxEducators: Number(form.get('maxEducators')) || 100,
        aiEnabled: form.get('aiEnabled') === 'on',
      },
    };

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? `Failed to create tenant: ${res.status}`);
      }
      const tenant = (await res.json()) as { id: string };
      router.push(`/tenants/${tenant.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tenant');
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
        <span className="text-slate-900">New</span>
      </nav>

      <h1 className="text-2xl font-semibold">Create New Tenant</h1>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-2xl space-y-6">
        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700">
              Tenant Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="North Valley District"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700">
              Type *
            </label>
            <select
              id="type"
              name="type"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {TENANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="primaryDomain" className="block text-sm font-medium text-slate-700">
              Primary Domain *
            </label>
            <input
              id="primaryDomain"
              name="primaryDomain"
              type="text"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="northvalley.aivolearning.com"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Settings</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="maxLearners" className="block text-sm font-medium text-slate-700">
                Max Learners
              </label>
              <input
                id="maxLearners"
                name="maxLearners"
                type="number"
                min={1}
                defaultValue={1000}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="maxEducators" className="block text-sm font-medium text-slate-700">
                Max Educators
              </label>
              <input
                id="maxEducators"
                name="maxEducators"
                type="number"
                min={1}
                defaultValue={100}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="aiEnabled"
              name="aiEnabled"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="aiEnabled" className="text-sm font-medium text-slate-700">
              Enable AI features
            </label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Tenant'}
          </button>
          <Link
            href="/tenants"
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
