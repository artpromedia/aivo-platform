'use client';

import * as React from 'react';
import {
  listDsrRequests,
  createExportRequest,
  createDeleteRequest,
  cancelDeleteRequest,
  downloadExportData,
  formatGracePeriod,
  getStatusColor,
  type DsrRequestSummary,
} from '@/lib/dsr-api';

export default function DataRightsPage() {
  const [requests, setRequests] = React.useState<DsrRequestSummary[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedLearnerId, setSelectedLearnerId] = React.useState<string>('');
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [processing, setProcessing] = React.useState(false);

  // Mock learners for demo - in production, fetch from profile service
  const learners = [
    { id: 'learner-1', name: 'Alex' },
    { id: 'learner-2', name: 'Jordan' },
  ];

  const fetchRequests = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listDsrRequests();
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleExportData = async () => {
    if (!selectedLearnerId) return;
    setProcessing(true);
    try {
      const result = await createExportRequest(selectedLearnerId);
      setShowExportModal(false);
      setSelectedLearnerId('');
      await fetchRequests();
      if (result.export) {
        // Trigger download
        const blob = new Blob([JSON.stringify(result.export, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `data-export-${selectedLearnerId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create export request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!selectedLearnerId) return;
    setProcessing(true);
    try {
      await createDeleteRequest(selectedLearnerId, true, 'User requested data deletion');
      setShowDeleteModal(false);
      setSelectedLearnerId('');
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delete request');
    } finally {
      setProcessing(false);
    }
  };

  const handleCancelDelete = async (requestId: string) => {
    setProcessing(true);
    try {
      await cancelDeleteRequest(requestId, 'User cancelled deletion');
      await fetchRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = async (requestId: string, learnerId: string) => {
    try {
      const data = await downloadExportData(requestId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `data-export-${learnerId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download data');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">Data Rights</h1>
        <p className="mb-8 text-gray-600">
          Manage your children&apos;s data under GDPR. You can export or request deletion of their data.
        </p>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-700">
            <p>{error}</p>
            <button onClick={() => setError(null)} className="mt-2 text-sm underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mb-8 flex gap-4">
          <button
            onClick={() => setShowExportModal(true)}
            className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700"
          >
            Export Data
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="rounded-lg bg-red-600 px-6 py-3 font-medium text-white hover:bg-red-700"
          >
            Request Deletion
          </button>
        </div>

        {/* Existing Requests */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Your Requests</h2>
          {loading ? (
            <p className="text-gray-500">Loading...</p>
          ) : requests.length === 0 ? (
            <p className="text-gray-500">No data requests yet.</p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div key={request.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span
                        className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                          getStatusColor(request.status) === 'green'
                            ? 'bg-green-100 text-green-800'
                            : getStatusColor(request.status) === 'yellow'
                              ? 'bg-yellow-100 text-yellow-800'
                              : getStatusColor(request.status) === 'blue'
                                ? 'bg-blue-100 text-blue-800'
                                : getStatusColor(request.status) === 'red'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {request.status}
                      </span>
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        {request.request_type === 'EXPORT' ? 'Data Export' : 'Data Deletion'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(request.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600">
                    For: {request.learner_name || request.learner_id}
                  </p>
                  {request.status === 'GRACE_PERIOD' && (
                    <p className="mt-1 text-sm text-yellow-600">
                      {formatGracePeriod(request.grace_period_days_remaining)}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    {request.request_type === 'EXPORT' && request.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleDownload(request.id, request.learner_id)}
                        className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200"
                      >
                        Download
                      </button>
                    )}
                    {request.can_cancel && (
                      <button
                        onClick={() => handleCancelDelete(request.id)}
                        disabled={processing}
                        className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                      >
                        Cancel Deletion
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export Modal */}
        {showExportModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h3 className="mb-4 text-xl font-semibold">Export Data</h3>
              <p className="mb-4 text-gray-600">
                Select a child to export their learning data. You will receive a JSON file with all stored data.
              </p>
              <select
                value={selectedLearnerId}
                onChange={(e) => setSelectedLearnerId(e.target.value)}
                className="mb-4 w-full rounded border p-2"
              >
                <option value="">Select a child...</option>
                {learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowExportModal(false);
                    setSelectedLearnerId('');
                  }}
                  className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportData}
                  disabled={!selectedLearnerId || processing}
                  className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {processing ? 'Exporting...' : 'Export'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="w-full max-w-md rounded-lg bg-white p-6">
              <h3 className="mb-4 text-xl font-semibold text-red-600">Request Data Deletion</h3>
              <div className="mb-4 rounded bg-yellow-50 p-3 text-sm text-yellow-800">
                <strong>Important:</strong> You will have 30 days to cancel this request. After that, all data
                will be permanently deleted and cannot be recovered.
              </div>
              <p className="mb-4 text-gray-600">
                Select a child whose data you want to delete.
              </p>
              <select
                value={selectedLearnerId}
                onChange={(e) => setSelectedLearnerId(e.target.value)}
                className="mb-4 w-full rounded border p-2"
              >
                <option value="">Select a child...</option>
                {learners.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedLearnerId('');
                  }}
                  className="rounded px-4 py-2 text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteRequest}
                  disabled={!selectedLearnerId || processing}
                  className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Request Deletion'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
