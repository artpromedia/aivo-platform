'use client';

/**
 * Curriculum Browser Component
 *
 * Sidebar with filters and upload functionality for browsing curricula.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback } from 'react';

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
  const [showUploadModal, setShowUploadModal] = useState(false);

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
            onClick={() => {}}
          />
          <QuickAction
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
            label="Sync from LMS"
            onClick={() => {}}
          />
          <QuickAction
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            label="Coverage Report"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Upload Modal */}
      <UploadCurriculumModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
      />
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
