'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import {
  useRenewal,
  useProcessRenewal,
} from '../../../../hooks/use-billing';
import { useAuth } from '../../../providers';

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-slate-100 text-slate-600',
  DUE: 'bg-orange-100 text-orange-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  NOT_RENEWING: 'bg-amber-100 text-amber-700',
  CHURNED: 'bg-red-100 text-red-700',
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function RenewalDetailPage() {
  const params = useParams<{ renewalId: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const { data: renewal, isLoading, error } = useRenewal(params.renewalId);
  const processRenewal = useProcessRenewal();

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-slate-600">Please log in to view renewals.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/billing" className="hover:text-slate-900">Billing</Link>
          <span>/</span>
          <span className="text-slate-900">Renewal</span>
        </nav>
        <div className="rounded-lg border bg-white p-12 text-center text-slate-500">
          Loading renewal...
        </div>
      </div>
    );
  }

  if (error || !renewal) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/billing" className="hover:text-slate-900">Billing</Link>
          <span>/</span>
          <span className="text-slate-900">Renewal</span>
        </nav>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-medium text-red-700">Failed to load renewal</p>
          <p className="mt-1 text-sm text-red-600">
            {error instanceof Error ? error.message : 'Renewal not found'}
          </p>
          <button
            onClick={() => { router.push('/billing'); }}
            className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-700 border hover:bg-slate-50"
          >
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  const canStartRenewal = renewal.status === 'DUE' || renewal.status === 'SCHEDULED';
  const canComplete = renewal.status === 'IN_PROGRESS';
  const canChurn = renewal.status !== 'COMPLETED' && renewal.status !== 'CHURNED';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/billing" className="hover:text-slate-900">Billing</Link>
        <span>/</span>
        <span className="text-slate-900">Renewal — {renewal.contractNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{renewal.contractNumber}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[renewal.status] ?? 'bg-slate-100 text-slate-600'}`}
            >
              {renewal.status.replace('_', ' ')}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{renewal.tenantName}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canStartRenewal && (
            <button
              onClick={() => { processRenewal.mutate({ id: renewal.id, action: 'start' }); }}
              disabled={processRenewal.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {processRenewal.isPending ? 'Starting...' : 'Create Quote'}
            </button>
          )}
          {canComplete && (
            <button
              onClick={() => { processRenewal.mutate({ id: renewal.id, action: 'complete' }); }}
              disabled={processRenewal.isPending}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {processRenewal.isPending ? 'Completing...' : 'Complete Renewal'}
            </button>
          )}
          {canChurn && (
            <button
              onClick={() => {
                const notes = window.prompt('Notes (optional):');
                processRenewal.mutate({
                  id: renewal.id,
                  action: 'not_renewing',
                  ...(notes ? { notes } : {}),
                });
              }}
              disabled={processRenewal.isPending}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              Not Renewing
            </button>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Renewal Details</h2>
        </div>
        <dl className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">Contract Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{renewal.contractNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Total Value</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(renewal.totalValueCents)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Contract End Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(renewal.contractEndDate)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Due Date</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(renewal.dueDate)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Tenant</dt>
            <dd className="mt-1 text-sm text-gray-900">{renewal.tenantName}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Tenant ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{renewal.tenantId}</dd>
          </div>
          {renewal.assignedTo && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Assigned To</dt>
              <dd className="mt-1 text-sm text-gray-900">{renewal.assignedTo}</dd>
            </div>
          )}
          {renewal.lastContactDate && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Last Contact</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(renewal.lastContactDate)}</dd>
            </div>
          )}
          {renewal.quoteId && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Linked Quote</dt>
              <dd className="mt-1 text-sm">
                <Link
                  href={`/billing/quotes/${renewal.quoteId}`}
                  className="text-blue-600 hover:underline"
                >
                  View Quote
                </Link>
              </dd>
            </div>
          )}
          {renewal.contractId && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Contract ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{renewal.contractId}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Notes */}
      {renewal.notes && (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Notes</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{renewal.notes}</p>
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-6 text-xs text-slate-400">
        <span>Created: {formatDate(renewal.createdAt)}</span>
        <span>Updated: {formatDate(renewal.updatedAt)}</span>
      </div>
    </div>
  );
}
