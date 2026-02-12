'use client';

/**
 * Library Filters Component
 *
 * Sidebar filters for the teacher's marketplace library.
 */

import { useRouter, useSearchParams } from 'next/navigation';

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'CONTENT_PACK', label: 'Content Packs' },
  { value: 'EMBEDDED_TOOL', label: 'Embedded Tools' },
];

const SUBJECT_OPTIONS = [
  { value: '', label: 'All Subjects' },
  { value: 'MATHEMATICS', label: 'Mathematics' },
  { value: 'ENGLISH_LANGUAGE_ARTS', label: 'English Language Arts' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'SOCIAL_STUDIES', label: 'Social Studies' },
  { value: 'COMPUTER_SCIENCE', label: 'Computer Science' },
  { value: 'FOREIGN_LANGUAGE', label: 'Foreign Language' },
  { value: 'ART', label: 'Art' },
  { value: 'MUSIC', label: 'Music' },
];

const GRADE_OPTIONS = [
  { value: '', label: 'All Grades' },
  { value: 'PRE_K', label: 'Pre-K' },
  { value: 'K_2', label: 'K–2' },
  { value: 'GRADES_3_5', label: '3–5' },
  { value: 'GRADES_6_8', label: '6–8' },
  { value: 'GRADES_9_12', label: '9–12' },
];

export function LibraryFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentType = searchParams.get('type') || '';
  const currentSubject = searchParams.get('subject') || '';
  const currentGrade = searchParams.get('gradeBand') || '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  function clearFilters() {
    router.push('/library');
  }

  const hasFilters = currentType || currentSubject || currentGrade;

  return (
    <div className="space-y-5">
      {/* Type Filter */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Type</h3>
        <select
          value={currentType}
          onChange={(e) => {
            updateFilter('type', e.target.value);
          }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Subject Filter */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Subject</h3>
        <select
          value={currentSubject}
          onChange={(e) => {
            updateFilter('subject', e.target.value);
          }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Grade Band Filter */}
      <div>
        <h3 className="mb-2 text-sm font-medium">Grade Level</h3>
        <select
          value={currentGrade}
          onChange={(e) => {
            updateFilter('gradeBand', e.target.value);
          }}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {GRADE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}
