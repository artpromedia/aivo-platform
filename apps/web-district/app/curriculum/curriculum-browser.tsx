'use client';

/**
 * Curriculum Browser Component
 *
 * Sidebar with filters and upload functionality for browsing curricula.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';
import { useToast } from '@aivo/ui-web';

import {
  SUBJECT_AREAS,
  GRADE_LEVELS,
  STATUS_DISPLAY,
  type CurriculumStatus,
} from '../../lib/curriculum-api';

import { UploadCurriculumModal } from './upload-modal';

export function CurriculumBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const currentSubject = searchParams.get('subject') || '';
  const currentGrade = searchParams.get('grade') || '';
  const currentStatus = searchParams.get('status') || '';

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete('page');
      router.push(`/curriculum?${params.toString()}`);
    },
    [router, searchParams]
  );

  const clearFilters = useCallback(() => {
    router.push('/curriculum');
  }, [router]);

  const hasFilters = currentSubject || currentGrade || currentStatus;

  return (
    <div className="space-y-6">
      {/* Upload Button */}
      <button
        onClick={() => setShowUploadModal(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition hover:bg-primary/90"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload Curriculum
      </button>

      {/* Filters Card */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-medium">Filters</h3>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-primary hover:underline"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Subject Area Filter */}
        <FilterSection title="Subject Area">
          <FilterOption
            label="All Subjects"
            value=""
            isSelected={!currentSubject}
            onClick={() => updateFilter('subject', '')}
          />
          {Object.entries(SUBJECT_AREAS).map(([key, { label }]) => (
            <FilterOption
              key={key}
              label={label}
              value={key}
              isSelected={currentSubject === key}
              onClick={() => updateFilter('subject', key)}
            />
          ))}
        </FilterSection>

        {/* Grade Level Filter */}
        <FilterSection title="Grade Level">
          <FilterOption
            label="All Grades"
            value=""
            isSelected={!currentGrade}
            onClick={() => updateFilter('grade', '')}
          />
          {Object.entries(GRADE_LEVELS)
            .filter(([key]) => !key.includes('_')) // Only show individual grades
            .slice(0, 13) // K through 12
            .map(([key, { label }]) => (
              <FilterOption
                key={key}
                label={label}
                value={key}
                isSelected={currentGrade === key}
                onClick={() => updateFilter('grade', key)}
              />
            ))}
          <div className="mt-2 border-t border-border pt-2">
            <p className="mb-1 text-xs text-muted">Grade Bands</p>
            {Object.entries(GRADE_LEVELS)
              .filter(([key]) => key.includes('_')) // Only show grade bands
              .map(([key, { label }]) => (
                <FilterOption
                  key={key}
                  label={label}
                  value={key}
                  isSelected={currentGrade === key}
                  onClick={() => updateFilter('grade', key)}
                />
              ))}
          </div>
        </FilterSection>

        {/* Status Filter */}
        <FilterSection title="Status">
          <FilterOption
            label="All Status"
            value=""
            isSelected={!currentStatus}
            onClick={() => updateFilter('status', '')}
          />
          {Object.entries(STATUS_DISPLAY).map(([key, { label }]) => (
            <FilterOption
              key={key}
              label={label}
              value={key}
              isSelected={currentStatus === key}
              onClick={() => updateFilter('status', key)}
              badge={
                <StatusIndicator status={key as CurriculumStatus} />
              }
            />
          ))}
        </FilterSection>
      </div>

      {/* Quick Stats */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 font-medium">Quick Actions</h3>
        <div className="space-y-2">
          <QuickAction
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            }
            label="Import from CSV"
            onClick={() => setShowImportModal(true)}
          />
          <QuickAction
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            label={isSyncing ? 'Syncing...' : 'Sync from LMS'}
            onClick={async () => {
              setIsSyncing(true);
              // Simulate LMS sync
              await new Promise(resolve => setTimeout(resolve, 2000));
              setIsSyncing(false);
              toast({ title: 'Sync Complete', description: 'LMS sync completed successfully!', variant: 'success' });
            }}
          />
          <QuickAction
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            label="Coverage Report"
            onClick={() => router.push('/curriculum/coverage-report')}
          />
        </div>
      </div>

      {/* Upload Modal */}
      <UploadCurriculumModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportCSVModal onClose={() => setShowImportModal(false)} />
      )}
    </div>
  );
}

function ImportCSVModal({ onClose }: { onClose: () => void }) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    if (!file) return;
    setIsImporting(true);
    // Simulate import
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsImporting(false);
    toast({ title: 'Import Complete', description: 'CSV imported successfully!', variant: 'success' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-xl bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="text-lg font-semibold">Import from CSV</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-surface-muted">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4 rounded-lg border-2 border-dashed border-border p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
              id="csv-upload"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <svg className="mx-auto h-12 w-12 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <p className="mt-2 text-sm text-muted">
                {file ? file.name : 'Click to select CSV file'}
              </p>
            </label>
          </div>
          <p className="mb-4 text-xs text-muted">
            Supported format: CSV with columns for title, subject, grade level, and description.
          </p>
        </div>
        <div className="flex items-center justify-end gap-3 border-t border-border p-4">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted hover:bg-surface-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || isImporting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isImporting ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <h4 className="mb-2 text-sm font-medium text-muted">{title}</h4>
      <div className="max-h-48 space-y-1 overflow-y-auto">{children}</div>
    </div>
  );
}

function FilterOption({
  label,
  value,
  isSelected,
  onClick,
  badge,
}: {
  label: string;
  value: string;
  isSelected: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition ${
        isSelected
          ? 'bg-primary/10 text-primary'
          : 'hover:bg-surface-muted'
      }`}
    >
      <span className="flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${
            isSelected ? 'bg-primary' : 'bg-transparent'
          }`}
        />
        {label}
      </span>
      {badge}
    </button>
  );
}

function StatusIndicator({ status }: { status: CurriculumStatus }) {
  const colors: Record<CurriculumStatus, string> = {
    DRAFT: 'bg-gray-400',
    PUBLISHED: 'bg-green-500',
    ARCHIVED: 'bg-yellow-500',
  };

  return <span className={`h-2 w-2 rounded-full ${colors[status]}`} />;
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted transition hover:bg-surface-muted hover:text-text"
    >
      {icon}
      {label}
    </button>
  );
}
