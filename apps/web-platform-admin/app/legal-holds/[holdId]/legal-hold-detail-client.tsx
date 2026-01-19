'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { LegalHold, LegalHoldCustodian, LegalHoldStatus, LegalHoldType } from '../../../lib/types';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

interface LegalHoldDetailClientProps {
  hold: LegalHold;
  accessToken: string;
}

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

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  EDUCATOR: 'bg-blue-100 text-blue-700',
  LEARNER: 'bg-green-100 text-green-700',
  STAFF: 'bg-orange-100 text-orange-700',
};

// ══════════════════════════════════════════════════════════════════════════════
// RELEASE MODAL
// ══════════════════════════════════════════════════════════════════════════════

interface ReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRelease: (reason: string) => Promise<void>;
  isSubmitting: boolean;
}

function ReleaseModal({ isOpen, onClose, onRelease, isSubmitting }: ReleaseModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRelease(reason);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">Release Legal Hold</h2>
        <p className="mb-4 text-sm text-slate-600">
          Releasing this hold will allow preserved data to follow normal retention policies.
          This action should only be taken when the legal matter is resolved.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="mb-1 block text-sm font-medium text-slate-700">
              Release Reason *
            </label>
            <textarea
              id="reason"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter the reason for releasing this hold..."
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Releasing...' : 'Release Hold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CUSTODIANS TABLE
// ══════════════════════════════════════════════════════════════════════════════

interface CustodiansTableProps {
  custodians: LegalHoldCustodian[];
  onResendNotification: (custodianId: string) => void;
}

function CustodiansTable({ custodians, onResendNotification }: CustodiansTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
      <div className="border-b bg-slate-50 px-4 py-3">
        <h3 className="font-semibold text-slate-900">Custodians ({custodians.length})</h3>
      </div>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Name</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Email</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Role</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Notified</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
              Acknowledged
            </th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {custodians.map((custodian) => (
            <tr key={custodian.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{custodian.name}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{custodian.email}</td>
              <td className="px-4 py-3 text-sm">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[custodian.role] ?? 'bg-slate-100 text-slate-700'}`}
                >
                  {custodian.role}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">
                {custodian.notifiedAt
                  ? new Date(custodian.notifiedAt).toLocaleString()
                  : '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                {custodian.acknowledgedAt ? (
                  <span className="flex items-center gap-1 text-green-600">
                    <span>✓</span>
                    {new Date(custodian.acknowledgedAt).toLocaleString()}
                  </span>
                ) : (
                  <span className="text-yellow-600">Pending</span>
                )}
              </td>
              <td className="px-4 py-3 text-sm">
                {!custodian.acknowledgedAt && (
                  <button
                    onClick={() => onResendNotification(custodian.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Resend
                  </button>
                )}
              </td>
            </tr>
          ))}
          {custodians.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                No custodians assigned
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DATA SCOPE PANEL
// ══════════════════════════════════════════════════════════════════════════════

interface DataScopePanelProps {
  dataScope: LegalHold['dataScope'];
}

function DataScopePanel({ dataScope }: DataScopePanelProps) {
  const scopeItems = [
    { key: 'includeEmails', label: 'Emails', icon: '📧' },
    { key: 'includeDocuments', label: 'Documents', icon: '📄' },
    { key: 'includeAiLogs', label: 'AI Logs', icon: '🤖' },
    { key: 'includeSessionData', label: 'Session Data', icon: '💻' },
    { key: 'includeAssessments', label: 'Assessments', icon: '📝' },
    { key: 'includeMessages', label: 'Messages', icon: '💬' },
  ] as const;

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <h3 className="mb-4 font-semibold text-slate-900">Data Scope</h3>

      <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3">
        {scopeItems.map(({ key, label, icon }) => (
          <div
            key={key}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
              dataScope[key]
                ? 'bg-green-50 text-green-700'
                : 'bg-slate-50 text-slate-400 line-through'
            }`}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {dataScope[key] && <span className="ml-auto">✓</span>}
          </div>
        ))}
      </div>

      {(dataScope.dateRangeStart || dataScope.dateRangeEnd) && (
        <div className="mb-4">
          <div className="text-sm font-medium text-slate-600">Date Range</div>
          <div className="text-sm text-slate-900">
            {dataScope.dateRangeStart
              ? new Date(dataScope.dateRangeStart).toLocaleDateString()
              : 'Beginning'}
            {' – '}
            {dataScope.dateRangeEnd
              ? new Date(dataScope.dateRangeEnd).toLocaleDateString()
              : 'Present'}
          </div>
        </div>
      )}

      {dataScope.keywords.length > 0 && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-600">Keywords</div>
          <div className="flex flex-wrap gap-2">
            {dataScope.keywords.map((keyword) => (
              <span
                key={keyword}
                className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════

export function LegalHoldDetailClient({ hold, accessToken }: LegalHoldDetailClientProps) {
  const router = useRouter();
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRelease = async (reason: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/legal-holds/${hold.id}/release`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ releaseReason: reason }),
      });

      if (!res.ok) {
        throw new Error('Failed to release legal hold');
      }

      setIsReleaseModalOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error releasing legal hold:', error);
      alert('Failed to release legal hold. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendNotification = async (custodianId: string) => {
    try {
      const res = await fetch(`/api/legal-holds/${hold.id}/custodians/${custodianId}/notify`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to resend notification');
      }

      alert('Notification resent successfully');
    } catch (error) {
      console.error('Error resending notification:', error);
      alert('Failed to resend notification. Please try again.');
    }
  };

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/legal-holds/${hold.id}/export`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        throw new Error('Failed to export');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `legal-hold-${hold.matterNumber ?? hold.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Failed to export legal hold. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-slate-500">
        <Link href="/legal-holds" className="hover:text-blue-600">
          Legal Holds
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-900">{hold.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{hold.name}</h1>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${STATUS_BADGES[hold.status].bg} ${STATUS_BADGES[hold.status].text}`}
            >
              <span>{STATUS_BADGES[hold.status].icon}</span>
              {hold.status}
            </span>
          </div>
          {hold.matterNumber && (
            <div className="mt-1 text-sm text-slate-500">Matter: {hold.matterNumber}</div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Export
          </button>
          {hold.status === 'ACTIVE' && (
            <button
              onClick={() => setIsReleaseModalOpen(true)}
              className="rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
            >
              Release Hold
            </button>
          )}
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-lg border bg-white p-4 shadow-sm">
            <h3 className="mb-4 font-semibold text-slate-900">Details</h3>

            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Tenant</dt>
                <dd className="text-sm font-medium text-slate-900">
                  <Link href={`/tenants/${hold.tenantId}`} className="text-blue-600 hover:underline">
                    {hold.tenantName}
                  </Link>
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Type</dt>
                <dd className="flex items-center gap-1 text-sm font-medium text-slate-900">
                  <span>{TYPE_LABELS[hold.holdType].icon}</span>
                  {TYPE_LABELS[hold.holdType].label}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Start Date</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {new Date(hold.startDate).toLocaleDateString()}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">End Date</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {hold.endDate ? new Date(hold.endDate).toLocaleDateString() : 'Indefinite'}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Created By</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {hold.createdByUserName ?? hold.createdByUserId}
                </dd>
              </div>

              <div className="flex justify-between">
                <dt className="text-sm text-slate-500">Created</dt>
                <dd className="text-sm font-medium text-slate-900">
                  {new Date(hold.createdAt).toLocaleString()}
                </dd>
              </div>

              {hold.releaseDate && (
                <>
                  <div className="flex justify-between">
                    <dt className="text-sm text-slate-500">Released</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {new Date(hold.releaseDate).toLocaleString()}
                    </dd>
                  </div>
                  {hold.releaseReason && (
                    <div>
                      <dt className="text-sm text-slate-500">Release Reason</dt>
                      <dd className="mt-1 text-sm text-slate-900">{hold.releaseReason}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </div>

          {/* Description */}
          {hold.description && (
            <div className="rounded-lg border bg-white p-4 shadow-sm">
              <h3 className="mb-2 font-semibold text-slate-900">Description</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{hold.description}</p>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <DataScopePanel dataScope={hold.dataScope} />
        </div>
      </div>

      {/* Custodians */}
      <CustodiansTable
        custodians={hold.custodians}
        onResendNotification={handleResendNotification}
      />

      {/* Release Modal */}
      <ReleaseModal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
        onRelease={handleRelease}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
