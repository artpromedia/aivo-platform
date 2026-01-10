'use client';

import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';

type TenantType = 'DISTRICT' | 'CHARTER' | 'PRIVATE_SCHOOL' | 'ENTERPRISE' | 'INDIVIDUAL';

interface CreateTenantInput {
  name: string;
  type: TenantType;
  primaryDomain: string;
  adminEmail: string;
}

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const TENANT_TYPES: { value: TenantType; label: string }[] = [
  { value: 'DISTRICT', label: 'School District' },
  { value: 'CHARTER', label: 'Charter School' },
  { value: 'PRIVATE_SCHOOL', label: 'Private School' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
  { value: 'INDIVIDUAL', label: 'Individual' },
];

export function CreateTenantModal({ isOpen, onClose, onCreated }: CreateTenantModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const input: CreateTenantInput = {
      name: formData.get('name') as string,
      type: formData.get('type') as TenantType,
      primaryDomain: formData.get('primaryDomain') as string,
      adminEmail: formData.get('adminEmail') as string,
    };

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message ?? 'Failed to create tenant');
      }

      onCreated();
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold">Create Tenant</h2>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Tenant Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="North Valley District"
            />
          </div>

          <div>
            <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">
              Tenant Type
            </label>
            <select
              id="type"
              name="type"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {TENANT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="primaryDomain"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Primary Domain
            </label>
            <input
              type="text"
              id="primaryDomain"
              name="primaryDomain"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="northvalley.aivolearning.com"
            />
          </div>

          <div>
            <label htmlFor="adminEmail" className="mb-1 block text-sm font-medium text-slate-700">
              Admin Email
            </label>
            <input
              type="email"
              id="adminEmail"
              name="adminEmail"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="admin@northvalley.edu"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
