'use client';

import { useState, useRef } from 'react';

import type { SetupStepProps } from '../PostSignUpSetup';

const API_BASE = process.env.NEXT_PUBLIC_TENANT_API || '/api/tenant';

type ImportMethod = 'csv' | 'clever' | 'classlink' | 'manual';

export function RosterImportStep({ tenantId, accessToken, onComplete, onSkip, onBack, isCompleted }: SetupStepProps) {
  const [method, setMethod] = useState<ImportMethod | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleCsvUpload = async () => {
    if (!csvFile) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', csvFile);
      formData.append('type', 'roster');

      const headers: Record<string, string> = {};
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

      const res = await fetch(`${API_BASE}/tenants/${tenantId}/import/roster`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? 'Import failed');
      }

      const result = (await res.json()) as { imported: number; errors: number };
      setImportResult(result);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUploading(false);
    }
  };

  if (isCompleted || importResult) {
    return (
      <div>
        <h2 className="mb-4 text-xl font-semibold text-gray-900">Import Roster</h2>
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-2 font-medium text-green-800">
            <span>✅</span> Roster import complete.
          </p>
          {importResult && (
            <p className="mt-1 text-sm text-green-700">
              {importResult.imported} records imported
              {importResult.errors > 0 && `, ${importResult.errors} errors`}.
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onComplete} className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700">
            Continue →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Import Roster</h2>
      <p className="mb-6 text-sm text-gray-600">
        Import your student and staff roster. You can also add people manually later.
      </p>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Method Selection */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {([
          { id: 'csv' as const, label: 'Upload CSV', icon: '📄', desc: 'Upload a CSV file with student/staff data' },
          { id: 'clever' as const, label: 'Clever Sync', icon: '🟣', desc: 'Auto-sync roster via Clever integration' },
          { id: 'classlink' as const, label: 'ClassLink Sync', icon: '🟢', desc: 'Auto-sync roster via ClassLink' },
          { id: 'manual' as const, label: 'Add Manually', icon: '✏️', desc: 'Add students and staff one by one' },
        ]).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => setMethod(opt.id)}
            className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
              method === opt.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-xl">{opt.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{opt.label}</h3>
              <p className="text-xs text-gray-500">{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {/* CSV Upload */}
      {method === 'csv' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-gray-700">Upload your roster CSV file</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white"
              >
                {csvFile ? csvFile.name : 'Choose CSV File'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Expected columns: first_name, last_name, email, role, grade_level, school_name
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleCsvUpload()}
            disabled={!csvFile || uploading}
            className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Importing...' : 'Import Roster'}
          </button>
        </div>
      )}

      {/* Clever / ClassLink */}
      {(method === 'clever' || method === 'classlink') && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            To sync via {method === 'clever' ? 'Clever' : 'ClassLink'}, please configure the
            integration first in the SSO step or Settings → Integrations. Once connected, roster
            data will sync automatically.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-3 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            I&apos;ll Set This Up Later →
          </button>
        </div>
      )}

      {/* Manual */}
      {method === 'manual' && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            You can add students and staff from the Users section after setup is complete.
          </p>
          <button
            type="button"
            onClick={onComplete}
            className="mt-3 rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Continue – I&apos;ll Add Manually Later →
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-between">
        <div className="flex gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="rounded-lg border border-gray-300 px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              ← Back
            </button>
          )}
          {onSkip && (
            <button type="button" onClick={onSkip} className="text-sm font-medium text-gray-500 hover:text-gray-700">
              Skip for now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
