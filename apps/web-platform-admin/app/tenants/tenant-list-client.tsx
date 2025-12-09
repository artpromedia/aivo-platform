'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CreateTenantModal } from '../../components/create-tenant-modal';
import type { TenantListItem, TenantStatus, TenantType } from '../../lib/types';

interface TenantListClientProps {
  tenants: TenantListItem[];
}

const STATUS_BADGES: Record<TenantStatus, { bg: string; text: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800' },
  ONBOARDING: { bg: 'bg-blue-100', text: 'text-blue-800' },
  SUSPENDED: { bg: 'bg-red-100', text: 'text-red-800' },
  CHURNED: { bg: 'bg-slate-100', text: 'text-slate-600' },
};

const TYPE_LABELS: Record<TenantType, string> = {
  DISTRICT: 'District',
  CHARTER: 'Charter',
  PRIVATE_SCHOOL: 'Private School',
  ENTERPRISE: 'Enterprise',
  INDIVIDUAL: 'Individual',
};

export function TenantListClient({ tenants }: TenantListClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Tenants</h1>
          <button
            onClick={() => {
              setIsModalOpen(true);
            }}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Create Tenant
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tenant</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Learners
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Educators
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="cursor-pointer transition-colors hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/tenants/${tenant.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {tenant.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{TYPE_LABELS[tenant.type]}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {tenant.learnerCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {tenant.educatorCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGES[tenant.status].bg} ${STATUS_BADGES[tenant.status].text}`}
                    >
                      {tenant.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    No tenants found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <CreateTenantModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
        }}
        onCreated={() => {
          // Refresh will happen automatically via router.refresh() in modal
        }}
      />
    </>
  );
}
