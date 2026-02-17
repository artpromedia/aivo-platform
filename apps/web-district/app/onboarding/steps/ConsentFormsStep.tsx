'use client';

import { useState, useEffect, useCallback } from 'react';

import type { WizardStepProps } from '../OnboardingWizard';

const COMPLIANCE_API = process.env.NEXT_PUBLIC_COMPLIANCE_API || '/api/compliance';

interface ConsentRecord {
  studentId: string;
  studentName: string;
  guardianName: string;
  guardianEmail: string;
  status: 'RECEIVED' | 'PENDING' | 'EXPIRED';
  receivedAt?: string;
}

interface ConsentSummary {
  total: number;
  received: number;
  pending: number;
  expired: number;
  consentPercentage: number;
}

type ViewMode = 'overview' | 'upload' | 'tracking';

export function ConsentFormsStep({ tenantId, onComplete, onBack, status }: WizardStepProps) {
  const isCompleted = status?.steps[4]?.completed ?? false;
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Upload state
  const [uploadEntries, setUploadEntries] = useState<
    Array<{ studentId: string; studentName: string; guardianName: string; guardianEmail: string }>
  >([{ studentId: '', studentName: '', guardianName: '', guardianEmail: '' }]);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${COMPLIANCE_API}/consent-forms/status?tenantId=${tenantId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          summary: ConsentSummary;
          records: ConsentRecord[];
        };
        setSummary(data.summary);
        setRecords(data.records ?? []);
      }
    } catch {
      // No consent data yet
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleUpload = async () => {
    const valid = uploadEntries.filter((e) => e.studentId.trim() && e.guardianEmail.trim());
    if (valid.length === 0) {
      setError('Please add at least one consent form entry.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${COMPLIANCE_API}/consent-forms/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          forms: valid.map((e) => ({
            studentId: e.studentId,
            studentName: e.studentName,
            guardianName: e.guardianName,
            guardianEmail: e.guardianEmail,
            status: 'RECEIVED',
          })),
        }),
      });

      if (!res.ok) {
        const errData = (await res.json()) as { error?: string };
        throw new Error(errData.error ?? 'Upload failed');
      }

      setSuccessMessage(`${valid.length} consent form(s) uploaded successfully.`);
      setUploadEntries([{ studentId: '', studentName: '', guardianName: '', guardianEmail: '' }]);
      setViewMode('tracking');
      void fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminders = async () => {
    setError(null);
    try {
      const res = await fetch(`${COMPLIANCE_API}/consent-forms/reminders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      if (res.ok) {
        const data = (await res.json()) as { sent: number };
        setSuccessMessage(`Reminders sent to ${data.sent} guardian(s) with pending consent.`);
      }
    } catch {
      setError('Failed to send reminders.');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await fetch(`${COMPLIANCE_API}/consent-forms/template?tenantId=${tenantId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `consent_form_template_${tenantId}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      setError('Failed to download template.');
    }
  };

  const addUploadRow = () => {
    setUploadEntries((prev) => [
      ...prev,
      { studentId: '', studentName: '', guardianName: '', guardianEmail: '' },
    ]);
  };

  const removeUploadRow = (idx: number) => {
    setUploadEntries((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateUploadRow = (idx: number, field: string, value: string) => {
    setUploadEntries((prev) =>
      prev.map((entry, i) => (i === idx ? { ...entry, [field]: value } : entry)),
    );
  };

  if (isCompleted) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Consent Forms</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> Consent form tracking is configured.
          </p>
          {summary && (
            <p className="mt-1 text-sm text-green-700">
              {summary.consentPercentage}% consent rate ({summary.received}/{summary.total} received)
            </p>
          )}
        </div>
        <div className="mt-6 flex justify-between">
          {onBack && (
            <button onClick={onBack} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
              ← Back
            </button>
          )}
          <button
            onClick={onComplete}
            className="ml-auto rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Consent Forms</h2>
      <p className="mb-6 text-sm text-gray-600">
        Track parent/guardian consent for student data processing under FERPA and COPPA.
        Upload signed consent forms or send digital consent requests.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
          <button onClick={() => setSuccessMessage(null)} className="ml-2 text-green-900 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Tab navigation */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {[
          { key: 'overview' as const, label: 'Overview' },
          { key: 'upload' as const, label: 'Upload Forms' },
          { key: 'tracking' as const, label: 'Tracking' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              viewMode === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {viewMode === 'overview' && (
        <div className="space-y-4">
          {summary ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border bg-white p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                <p className="text-xs text-gray-500">Total Students</p>
              </div>
              <div className="rounded-lg border bg-white p-4 text-center">
                <p className="text-2xl font-bold text-green-600">{summary.received}</p>
                <p className="text-xs text-gray-500">Received</p>
              </div>
              <div className="rounded-lg border bg-white p-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
              <div className="rounded-lg border bg-white p-4 text-center">
                <p className="text-2xl font-bold text-red-600">{summary.expired}</p>
                <p className="text-xs text-gray-500">Expired</p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 py-8 text-center">
              <p className="text-gray-600">No consent data yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Upload consent forms or generate templates to get started.
              </p>
            </div>
          )}

          {/* Progress bar */}
          {summary && summary.total > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-gray-600">Consent Progress</span>
                <span className="font-medium text-gray-900">{summary.consentPercentage}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.consentPercentage >= 80
                      ? 'bg-green-500'
                      : summary.consentPercentage >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  }`}
                  style={{ width: `${summary.consentPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => setViewMode('upload')}
              className="rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="font-medium text-gray-900">📤 Upload Forms</p>
              <p className="text-xs text-gray-500">Record signed consent forms</p>
            </button>
            <button
              onClick={() => void handleSendReminders()}
              className="rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="font-medium text-gray-900">📧 Send Reminders</p>
              <p className="text-xs text-gray-500">Email parents with pending consent</p>
            </button>
            <button
              onClick={() => void handleDownloadTemplate()}
              className="rounded-lg border border-gray-200 p-3 text-left transition-all hover:border-blue-300 hover:bg-blue-50"
            >
              <p className="font-medium text-gray-900">📄 Download Template</p>
              <p className="text-xs text-gray-500">Printable consent form</p>
            </button>
          </div>
        </div>
      )}

      {/* Upload */}
      {viewMode === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter consent form details for each student. You can also import via CSV.
          </p>

          <div className="space-y-3">
            {uploadEntries.map((entry, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border bg-gray-50 p-3 sm:grid-cols-4">
                <input
                  value={entry.studentId}
                  onChange={(e) => updateUploadRow(idx, 'studentId', e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Student ID *"
                />
                <input
                  value={entry.studentName}
                  onChange={(e) => updateUploadRow(idx, 'studentName', e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Student Name"
                />
                <input
                  value={entry.guardianName}
                  onChange={(e) => updateUploadRow(idx, 'guardianName', e.target.value)}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Guardian Name"
                />
                <div className="flex gap-1">
                  <input
                    value={entry.guardianEmail}
                    onChange={(e) => updateUploadRow(idx, 'guardianEmail', e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Guardian Email *"
                  />
                  {uploadEntries.length > 1 && (
                    <button
                      onClick={() => removeUploadRow(idx)}
                      className="shrink-0 px-2 text-sm text-red-500 hover:text-red-700"
                      title="Remove"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addUploadRow}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add another entry
          </button>

          <div className="flex gap-3 border-t border-gray-200 pt-4">
            <button
              onClick={() => setViewMode('overview')}
              className="rounded-lg border px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => void handleUpload()}
              disabled={loading}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Consent Forms'}
            </button>
          </div>
        </div>
      )}

      {/* Tracking */}
      {viewMode === 'tracking' && (
        <div>
          {records.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Student
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Guardian
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {records.map((rec, idx) => (
                    <tr key={idx}>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-900">
                        {rec.studentName || rec.studentId}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-600">
                        {rec.guardianName || rec.guardianEmail}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            rec.status === 'RECEIVED'
                              ? 'bg-green-100 text-green-700'
                              : rec.status === 'PENDING'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-500">
                        {rec.receivedAt ? new Date(rec.receivedAt).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-lg border py-8 text-center text-sm text-gray-500">
              No consent records yet. Upload forms to begin tracking.
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="mt-6 flex justify-between border-t border-gray-200 pt-4">
        {onBack && (
          <button onClick={onBack} className="rounded-lg border px-4 py-2 text-gray-700 hover:bg-gray-50">
            ← Back
          </button>
        )}
        <button
          onClick={onComplete}
          className="ml-auto rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
