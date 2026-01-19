'use client';

/**
 * Version Control Component
 *
 * Displays version history and allows rollback/comparison of curriculum versions.
 */

import { useEffect, useState, useCallback } from 'react';

import { useAuth } from '../../providers';
import { type CurriculumVersion, formatDateTime } from '../../../lib/curriculum-api';

interface VersionControlProps {
  curriculumId: string;
}

export function VersionControl({ curriculumId }: VersionControlProps) {
  const { tenantId } = useAuth();
  const [versions, setVersions] = useState<CurriculumVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<CurriculumVersion | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    async function loadVersions() {
      if (!tenantId) return;

      setLoading(true);
      setError(null);

      try {
        // In production, fetch from API
        // const accessToken = 'mock-token';
        // const result = await getCurriculumVersions(curriculumId, tenantId, accessToken);
        // setVersions(result.versions);

        // Use mock data for demonstration
        setVersions(MOCK_VERSIONS);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load versions');
        setVersions(MOCK_VERSIONS);
      } finally {
        setLoading(false);
      }
    }

    void loadVersions();
  }, [curriculumId, tenantId]);

  const handleCreateVersion = useCallback(
    async (changeLog: string) => {
      if (!tenantId) return;

      try {
        // In production, create version via API
        const newVersion: CurriculumVersion = {
          id: `v${versions.length + 1}`,
          versionNumber: `${versions.length + 1}.0.0`,
          changeLog,
          createdBy: 'Current User',
          createdAt: new Date().toISOString(),
          isPublished: false,
        };
        setVersions((prev) => [newVersion, ...prev]);
        setShowCreateModal(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create version');
      }
    },
    [tenantId, versions.length]
  );

  const handleRestore = useCallback(
    async (version: CurriculumVersion) => {
      if (!tenantId) return;

      try {
        // In production, restore version via API
        alert(`Restoring to version ${version.versionNumber}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore version');
      }
    },
    [tenantId]
  );

  if (loading) {
    return <VersionSkeleton />;
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">Version History</h2>
          <p className="text-sm text-muted">
            {versions.length} version{versions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Version
        </button>
      </div>

      {/* Version Timeline */}
      <div className="max-h-80 overflow-y-auto">
        {versions.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <p>No versions created yet.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Create your first version
            </button>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

            {versions.map((version, index) => (
              <VersionItem
                key={version.id}
                version={version}
                isLatest={index === 0}
                isSelected={selectedVersion?.id === version.id}
                onSelect={() => setSelectedVersion(version)}
                onRestore={() => handleRestore(version)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Version Details */}
      {selectedVersion && (
        <div className="border-t border-border p-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium">Version {selectedVersion.versionNumber}</h4>
              <p className="mt-1 text-sm text-muted">{selectedVersion.changeLog}</p>
              <p className="mt-2 text-xs text-muted">
                Created by {selectedVersion.createdBy} on {formatDateTime(selectedVersion.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {}}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
              >
                Compare
              </button>
              {!selectedVersion.isPublished && (
                <button
                  onClick={() => handleRestore(selectedVersion)}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-surface-muted"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateModal && (
        <CreateVersionModal
          onSubmit={handleCreateVersion}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

function VersionItem({
  version,
  isLatest,
  isSelected,
  onSelect,
  onRestore,
}: {
  version: CurriculumVersion;
  isLatest: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRestore: () => void;
}) {
  return (
    <div
      className={`relative flex items-start gap-4 p-4 transition hover:bg-surface-muted/50 ${
        isSelected ? 'bg-primary/5' : ''
      }`}
    >
      {/* Timeline node */}
      <div
        className={`relative z-10 flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-full ${
          isLatest
            ? 'bg-primary ring-4 ring-primary/20'
            : version.isPublished
              ? 'bg-green-500'
              : 'bg-gray-300'
        }`}
        style={{ marginTop: '0.375rem' }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onSelect}
            className="font-medium hover:text-primary"
          >
            v{version.versionNumber}
          </button>
          {isLatest && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              Latest
            </span>
          )}
          {version.isPublished && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Published
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted line-clamp-1">{version.changeLog}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted">
          <span>{version.createdBy}</span>
          <span className="text-border">|</span>
          <span>{formatDateTime(version.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={onSelect}
          className="rounded p-1 text-muted hover:bg-surface-muted hover:text-text"
          title="View details"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        {!isLatest && (
          <button
            onClick={onRestore}
            className="rounded p-1 text-muted hover:bg-surface-muted hover:text-text"
            title="Restore this version"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function CreateVersionModal({
  onSubmit,
  onClose,
}: {
  onSubmit: (changeLog: string) => void;
  onClose: () => void;
}) {
  const [changeLog, setChangeLog] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeLog.trim()) return;

    setIsSubmitting(true);
    await onSubmit(changeLog);
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-surface shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">Create New Version</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-muted">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-4">
            <label htmlFor="changeLog" className="mb-1 block text-sm font-medium">
              Change Log <span className="text-red-500">*</span>
            </label>
            <textarea
              id="changeLog"
              value={changeLog}
              onChange={(e) => setChangeLog(e.target.value)}
              placeholder="Describe the changes in this version..."
              rows={4}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
            <p className="mt-2 text-xs text-muted">
              This will create a snapshot of the current curriculum state.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border p-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!changeLog.trim() || isSubmitting}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : 'Create Version'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VersionSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="space-y-1">
          <div className="h-5 w-32 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-surface-muted" />
        </div>
        <div className="h-8 w-32 animate-pulse rounded-lg bg-surface-muted" />
      </div>
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-4 p-4">
            <div className="h-3 w-3 animate-pulse rounded-full bg-surface-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
              <div className="h-3 w-48 animate-pulse rounded bg-surface-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mock data
const MOCK_VERSIONS: CurriculumVersion[] = [
  {
    id: 'v4',
    versionNumber: '2.1.0',
    changeLog: 'Added new lessons on quadratic equations and updated assessments',
    createdBy: 'Jane Smith',
    createdAt: '2024-02-20T14:30:00Z',
    isPublished: false,
  },
  {
    id: 'v3',
    versionNumber: '2.0.0',
    changeLog: 'Major revision: restructured units for better learning progression',
    createdBy: 'John Doe',
    createdAt: '2024-02-01T09:00:00Z',
    isPublished: true,
  },
  {
    id: 'v2',
    versionNumber: '1.1.0',
    changeLog: 'Added standards alignment for CCSS Math HSA-REI',
    createdBy: 'Jane Smith',
    createdAt: '2024-01-20T16:00:00Z',
    isPublished: true,
  },
  {
    id: 'v1',
    versionNumber: '1.0.0',
    changeLog: 'Initial curriculum version',
    createdBy: 'John Doe',
    createdAt: '2024-01-15T10:00:00Z',
    isPublished: true,
  },
];
