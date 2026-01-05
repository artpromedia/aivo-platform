/**
 * Enrollment Batch List Component
 *
 * Displays history of bulk enrollment batches with status and actions.
 */

'use client';

import * as React from 'react';

type BatchStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIALLY_COMPLETED';

interface EnrollmentBatch {
  id: string;
  createdAt: string;
  createdBy: string;
  status: BatchStatus;
  totalItems: number;
  successCount: number;
  failedCount: number;
  schoolName?: string;
  notes?: string;
}

// Mock data for demonstration
const mockBatches: EnrollmentBatch[] = [
  {
    id: 'batch-001',
    createdAt: '2024-01-15T10:30:00Z',
    createdBy: 'admin@district.edu',
    status: 'COMPLETED',
    totalItems: 45,
    successCount: 45,
    failedCount: 0,
    schoolName: 'Lincoln Elementary',
    notes: '3rd grade enrollment',
  },
  {
    id: 'batch-002',
    createdAt: '2024-01-14T14:15:00Z',
    createdBy: 'admin@district.edu',
    status: 'PARTIALLY_COMPLETED',
    totalItems: 32,
    successCount: 28,
    failedCount: 4,
    schoolName: 'Washington Middle',
    notes: 'New student intake',
  },
  {
    id: 'batch-003',
    createdAt: '2024-01-14T09:00:00Z',
    createdBy: 'principal@lincoln.edu',
    status: 'PROCESSING',
    totalItems: 120,
    successCount: 85,
    failedCount: 0,
    schoolName: 'Lincoln Elementary',
  },
  {
    id: 'batch-004',
    createdAt: '2024-01-13T16:45:00Z',
    createdBy: 'admin@district.edu',
    status: 'FAILED',
    totalItems: 15,
    successCount: 0,
    failedCount: 15,
    notes: 'CSV format error',
  },
];

const statusConfig: Record<BatchStatus, { label: string; className: string }> = {
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
  PROCESSING: { label: 'Processing', className: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  PARTIALLY_COMPLETED: { label: 'Partial', className: 'bg-amber-100 text-amber-700' },
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function EnrollmentBatchList() {
  const [batches, setBatches] = React.useState<EnrollmentBatch[]>(mockBatches);
  const [expandedBatch, setExpandedBatch] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState<BatchStatus | 'all'>('all');

  const filteredBatches = batches.filter(
    (b) => filterStatus === 'all' || b.status === filterStatus
  );

  const retryBatch = async (batchId: string) => {
    // API call would go here
    setBatches(
      batches.map((b) => (b.id === batchId ? { ...b, status: 'PROCESSING' as BatchStatus } : b))
    );
  };

  const downloadReport = (batchId: string) => {
    // Download CSV report
    console.log('Downloading report for batch:', batchId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Enrollment History</h2>
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value as BatchStatus | 'all');
          }}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="all">All Batches</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="PARTIALLY_COMPLETED">Partially Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      {filteredBatches.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-gray-500">No enrollment batches found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBatches.map((batch) => (
            <div key={batch.id} className="rounded-lg border border-gray-200 bg-white">
              {/* Batch Header */}
              <div
                className="flex cursor-pointer items-center justify-between p-4"
                onClick={() => {
                  setExpandedBatch(expandedBatch === batch.id ? null : batch.id);
                }}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {batch.schoolName || 'District-wide'}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig[batch.status].className}`}
                      >
                        {statusConfig[batch.status].label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {formatDate(batch.createdAt)} by {batch.createdBy}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {batch.successCount} / {batch.totalItems}
                    </p>
                    <p className="text-xs text-gray-500">enrolled</p>
                  </div>
                  <span className="text-gray-400">{expandedBatch === batch.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedBatch === batch.id && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Total Items</p>
                      <p className="font-medium">{batch.totalItems}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Successful</p>
                      <p className="font-medium text-green-600">{batch.successCount}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Failed</p>
                      <p className="font-medium text-red-600">{batch.failedCount}</p>
                    </div>
                  </div>

                  {batch.notes && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-500">Notes</p>
                      <p className="text-sm">{batch.notes}</p>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => {
                        downloadReport(batch.id);
                      }}
                      className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Download Report
                    </button>
                    {(batch.status === 'FAILED' || batch.status === 'PARTIALLY_COMPLETED') && (
                      <button
                        onClick={() => {
                          void retryBatch(batch.id);
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        Retry Failed
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination would go here */}
      <div className="flex justify-center">
        <p className="text-sm text-gray-500">
          Showing {filteredBatches.length} of {batches.length} batches
        </p>
      </div>
    </div>
  );
}
