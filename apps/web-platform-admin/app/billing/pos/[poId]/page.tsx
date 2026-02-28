'use client';

import { useToast } from '@aivo/ui-web';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import {
  usePurchaseOrder,
  useApprovePO,
  useRejectPO,
  useActivateContract,
} from '../../../../hooks/use-billing';
import { useAuth } from '../../../providers';

const statusColors: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
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

export default function PurchaseOrderDetailPage() {
  const params = useParams<{ poId: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const { data: po, isLoading, error } = usePurchaseOrder(params.poId);
  const approvePO = useApprovePO();
  const rejectPO = useRejectPO();
  const activateContract = useActivateContract();

  async function handleApprove() {
    try {
      await approvePO.mutateAsync({ id: params.poId });
      toast({ title: 'Purchase order approved', variant: 'default' });
    } catch {
      toast({ title: 'Failed to approve PO', variant: 'destructive' });
    }
  }

  async function handleReject() {
    const notes = window.prompt('Rejection reason (optional):');
    try {
      await rejectPO.mutateAsync({ id: params.poId, data: { reviewNotes: notes ?? '' } });
      toast({ title: 'Purchase order rejected', variant: 'default' });
    } catch {
      toast({ title: 'Failed to reject PO', variant: 'destructive' });
    }
  }

  async function handleActivate() {
    try {
      await activateContract.mutateAsync({ id: params.poId });
      toast({ title: 'Contract activated', variant: 'default' });
    } catch {
      toast({ title: 'Failed to activate contract', variant: 'destructive' });
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-slate-600">Please log in to view purchase orders.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/billing" className="hover:text-slate-900">Billing</Link>
          <span>/</span>
          <span className="text-slate-900">Purchase Order</span>
        </nav>
        <div className="rounded-lg border bg-white p-12 text-center text-slate-500">
          Loading purchase order...
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/billing" className="hover:text-slate-900">Billing</Link>
          <span>/</span>
          <span className="text-slate-900">Purchase Order</span>
        </nav>
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-medium text-red-700">Failed to load purchase order</p>
          <p className="mt-1 text-sm text-red-600">
            {error instanceof Error ? error.message : 'Purchase order not found'}
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

  const isPending = po.status === 'PENDING';
  const isApproved = po.status === 'APPROVED';

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/billing" className="hover:text-slate-900">Billing</Link>
        <span>/</span>
        <span className="text-slate-900">PO {po.poNumber}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{po.poNumber}</h1>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[po.status] ?? 'bg-slate-100 text-slate-600'}`}
            >
              {po.status}
            </span>
          </div>
          {po.tenantName && (
            <p className="mt-1 text-sm text-slate-500">{po.tenantName}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isPending && (
            <>
              <button
                onClick={handleApprove}
                disabled={approvePO.isPending}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {approvePO.isPending ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={handleReject}
                disabled={rejectPO.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {rejectPO.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </>
          )}
          {isApproved && !po.contractId && (
            <button
              onClick={handleActivate}
              disabled={activateContract.isPending}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {activateContract.isPending ? 'Activating...' : 'Activate Contract'}
            </button>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold text-gray-900">Purchase Order Details</h2>
        </div>
        <dl className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-slate-500">PO Number</dt>
            <dd className="mt-1 text-sm text-gray-900">{po.poNumber}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Amount</dt>
            <dd className="mt-1 text-lg font-semibold text-gray-900">
              {formatCurrency(po.amountCents, po.currency)}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Valid From</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(po.validFrom)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Valid To</dt>
            <dd className="mt-1 text-sm text-gray-900">{formatDate(po.validTo)}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Tenant ID</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{po.tenantId}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-500">Billing Account</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{po.billingAccountId}</dd>
          </div>
          {po.quoteId && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Quote</dt>
              <dd className="mt-1 text-sm">
                <Link
                  href={`/billing/quotes/${po.quoteId}`}
                  className="text-blue-600 hover:underline"
                >
                  View Quote
                </Link>
              </dd>
            </div>
          )}
          {po.contractId && (
            <div>
              <dt className="text-sm font-medium text-slate-500">Contract ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{po.contractId}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Review info */}
      {(po.reviewedBy || po.reviewNotes) && (
        <div className="rounded-lg border bg-white">
          <div className="border-b px-6 py-4">
            <h2 className="font-semibold text-gray-900">Review Information</h2>
          </div>
          <dl className="grid gap-x-8 gap-y-4 p-6 sm:grid-cols-2">
            {po.reviewedBy && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Reviewed By</dt>
                <dd className="mt-1 text-sm text-gray-900">{po.reviewedBy}</dd>
              </div>
            )}
            {po.reviewedAt && (
              <div>
                <dt className="text-sm font-medium text-slate-500">Reviewed At</dt>
                <dd className="mt-1 text-sm text-gray-900">{formatDate(po.reviewedAt)}</dd>
              </div>
            )}
            {po.reviewNotes && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-slate-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900">{po.reviewNotes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Timestamps */}
      <div className="flex gap-6 text-xs text-slate-400">
        <span>Created: {formatDate(po.createdAt)}</span>
        <span>Updated: {formatDate(po.updatedAt)}</span>
      </div>
    </div>
  );
}
