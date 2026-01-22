'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useState } from 'react';

import type { LegalHoldListItem, LegalHoldStatus, LegalHoldType } from '../../lib/types';
import { LEGAL_HOLD_STATUSES, LEGAL_HOLD_TYPES } from '../../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface LegalHoldsClientProps {
  holds: LegalHoldListItem[];
  total: number;
  page: number;
  pageSize: number;
  accessToken: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

const STATUS_BADGES: Record<LegalHoldStatus, { bg: string; text: string; icon: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-700', icon: '🔒' },
  RELEASED: { bg: 'bg-slate-100', text: 'text-slate-600', icon: '🔓' },
  EXPIRED: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '⏰' },
};

const TYPE_LABELS: Record<LegalHoldType, { label: string; icon: string }> = {
  LITIGATION: { label: 'Litigation', icon: '⚖️' },
  REGULATORY: { label: 'Regulatory', icon: '📋' },
  INTERNAL_INVESTIGATION: { label: 'Internal Investigation', icon: '🔍' },
  PRESERVATION: { label: 'Preservation', icon: '📁' },
};

// ══════════════════════════════════════════════════════════════════════════════
// STATS CARDS
// ══════════════════════════════════════════════════════════════════════════════

interface StatsCardsProps {
  holds: LegalHoldListItem[];
  total: number;
}

function StatsCards({ holds, total }: StatsCardsProps) {
  const activeCount = holds.filter((h) => h.status === 'ACTIVE').length;
  const totalCustodians = holds.reduce((sum, h) => sum + h.custodianCount, 0);
  const litigationCount = holds.filter((h) => h.holdType === 'LITIGATION').length;

  return (
    <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Total Holds</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{total}</div>
      </div>
      <div className="rounded-lg border bg-green-50 p-4 shadow-sm">
        <div className="text-sm font-medium text-green-600">Active Holds</div>
        <div className="mt-1 text-2xl font-bold text-green-700">{activeCount}</div>
      </div>
      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="text-sm font-medium text-slate-500">Total Custodians</div>
        <div className="mt-1 text-2xl font-bold text-slate-900">{totalCustodians}</div>
      </div>
      <div className="rounded-lg border bg-orange-50 p-4 shadow-sm">
        <div className="text-sm font-medium text-orange-600">Litigation Holds</div>
        <div className="mt-1 text-2xl font-bold text-orange-700">{litigationCount}</div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CREATE HOLD MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface CreateHoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateHoldFormData) => Promise<void>;
  isSubmitting: boolean;
}

interface CreateHoldFormData {
  tenantId: string;
  name: string;
  description: string;
  holdType: LegalHoldType;
  matterNumber: string;
  startDate: string;
  endDate: string;
}

function CreateHoldModal({ isOpen, onClose, onSubmit, isSubmitting }: CreateHoldModalProps) {
  const [formData, setFormData] = useState<CreateHoldFormData>({
    tenantId: '',
    name: '',
    description: '',
    holdType: 'LITIGATION',
    matterNumber: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Create Legal Hold</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Hold Name *
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
              }}
              placeholder="e.g., Smith v. District - Student Records"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="tenantId" className="mb-1 block text-sm font-medium text-slate-700">
              Tenant ID *
            </label>
            <input
              type="text"
              id="tenantId"
              required
              value={formData.tenantId}
              onChange={(e) => {
                setFormData({ ...formData, tenantId: e.target.value });
              }}
              placeholder="tenant-uuid"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="holdType" className="mb-1 block text-sm font-medium text-slate-700">
                Hold Type *
              </label>
              <select
                id="holdType"
                value={formData.holdType}
                onChange={(e) => {
                  setFormData({ ...formData, holdType: e.target.value as LegalHoldType });
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {LEGAL_HOLD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {TYPE_LABELS[type].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="matterNumber"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Matter Number
              </label>
              <input
                type="text"
                id="matterNumber"
                value={formData.matterNumber}
                onChange={(e) => {
                  setFormData({ ...formData, matterNumber: e.target.value });
                }}
                placeholder="LIT-2024-0001"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-slate-700">
                Start Date *
              </label>
              <input
                type="date"
                id="startDate"
                required
                value={formData.startDate}
                onChange={(e) => {
                  setFormData({ ...formData, startDate: e.target.value });
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-slate-700">
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => {
                  setFormData({ ...formData, endDate: e.target.value });
                }}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => {
                setFormData({ ...formData, description: e.target.value });
              }}
              placeholder="Describe the purpose and scope of this legal hold..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Hold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function LegalHoldsClient({
  holds,
  total,
  page,
  pageSize,
  accessToken,
}: LegalHoldsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  const [filters, setFilters] = useState({
    status: searchParams.get('status') ?? '',
    holdType: searchParams.get('holdType') ?? '',
    search: searchParams.get('search') ?? '',
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.holdType) params.set('holdType', filters.holdType);
    if (filters.search) params.set('search', filters.search);
    params.set('page', '1');
    router.push(`/legal-holds?${params.toString()}`);
  }, [filters, router]);

  const clearFilters = useCallback(() => {
    setFilters({ status: '', holdType: '', search: '' });
    router.push('/legal-holds');
  }, [router]);

  const goToPage = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', String(newPage));
      router.push(`/legal-holds?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleCreateHold = async (data: {
    tenantId: string;
    name: string;
    description: string;
    holdType: LegalHoldType;
    matterNumber: string;
    startDate: string;
    endDate: string;
  }) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/legal-holds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...data,
          dataScope: {
            includeEmails: true,
            includeDocuments: true,
            includeAiLogs: true,
            includeSessionData: true,
            includeAssessments: true,
            includeMessages: true,
            dateRangeStart: null,
            dateRangeEnd: null,
            keywords: [],
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create legal hold');
      }

      setIsCreateModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error creating legal hold:', error);
      alert('Failed to create legal hold. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Legal Holds</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage litigation holds, regulatory preservation, and e-discovery
          </p>
        </div>
        <button
          onClick={() => {
            setIsCreateModalOpen(true);
          }}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Create Legal Hold
        </button>
      </div>

      {/* Stats */}
      <StatsCards holds={holds} total={total} />

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="min-w-[200px] flex-1">
          <label htmlFor="search" className="mb-1 block text-xs font-medium text-slate-600">
            Search
          </label>
          <input
            type="text"
            id="search"
            value={filters.search}
            onChange={(e) => {
              setFilters((f) => ({ ...f, search: e.target.value }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyFilters();
            }}
            placeholder="Hold name, tenant, or matter number..."
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
            Status
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={(e) => {
              setFilters((f) => ({ ...f, status: e.target.value }));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {LEGAL_HOLD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="holdType" className="mb-1 block text-xs font-medium text-slate-600">
            Type
          </label>
          <select
            id="holdType"
            value={filters.holdType}
            onChange={(e) => {
              setFilters((f) => ({ ...f, holdType: e.target.value }));
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All</option>
            {LEGAL_HOLD_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t].label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={applyFilters}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Apply
          </button>
          <button
            onClick={clearFilters}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Hold</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Tenant</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Type</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Matter #</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Custodians
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">End Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {holds.map((hold) => (
              <tr key={hold.id} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/legal-holds/${hold.id}`}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {hold.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/tenants/${hold.tenantId}`}
                    className="text-slate-600 hover:text-blue-600"
                  >
                    {hold.tenantName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className="flex items-center gap-1">
                    <span>{TYPE_LABELS[hold.holdType].icon}</span>
                    <span>{TYPE_LABELS[hold.holdType].label}</span>
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[hold.status].bg} ${STATUS_BADGES[hold.status].text}`}
                  >
                    <span>{STATUS_BADGES[hold.status].icon}</span>
                    {hold.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">{hold.matterNumber ?? '-'}</td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {hold.custodianCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {new Date(hold.startDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {hold.endDate ? new Date(hold.endDate).toLocaleDateString() : 'Indefinite'}
                </td>
              </tr>
            ))}
            {holds.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  No legal holds found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                goToPage(page - 1);
              }}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => {
                goToPage(page + 1);
              }}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateHoldModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
        }}
        onSubmit={handleCreateHold}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
