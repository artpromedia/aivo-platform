'use client';

/**
 * Catalog Filters Component
 *
 * Sidebar filters for marketplace catalog.
 */

import { useSearchParams, useRouter } from 'next/navigation';
import React, { useCallback } from 'react';

const SUBJECTS = [
  { value: 'MATH', label: 'Mathematics' },
  { value: 'ELA', label: 'English Language Arts' },
  { value: 'SCIENCE', label: 'Science' },
  { value: 'SEL', label: 'Social-Emotional Learning' },
  { value: 'SOCIAL_STUDIES', label: 'Social Studies' },
  { value: 'STEM', label: 'STEM' },
  { value: 'ARTS', label: 'Arts' },
  { value: 'FOREIGN_LANGUAGE', label: 'Foreign Language' },
];

const GRADE_BANDS = [
  { value: 'PRE_K', label: 'Pre-K' },
  { value: 'K_2', label: 'K-2' },
  { value: 'G3_5', label: 'Grades 3-5' },
  { value: 'G6_8', label: 'Grades 6-8' },
  { value: 'G9_12', label: 'Grades 9-12' },
];

const ITEM_TYPES = [
  { value: 'CONTENT_PACK', label: 'Content Packs' },
  { value: 'EMBEDDED_TOOL', label: 'Embedded Tools' },
];

const SAFETY_CERTS = [
  { value: 'AIVO_CERTIFIED', label: 'Aivo Certified' },
  { value: 'VENDOR_ATTESTED', label: 'Vendor Attested' },
];

export function CatalogFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedSubjects = searchParams.getAll('subject');
  const selectedGrades = searchParams.getAll('grade');
  const selectedType = searchParams.get('type');
  const selectedSafety = searchParams.getAll('safety');

  const updateFilters = useCallback(
    (key: string, value: string, isMulti = false) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('page'); // Reset pagination on filter change

      if (isMulti) {
        const current = params.getAll(key);
        if (current.includes(value)) {
          params.delete(key);
          current
            .filter((v) => v !== value)
            .forEach((v) => {
              params.append(key, v);
            });
        } else {
          params.append(key, value);
        }
      } else if (params.get(key) === value) {
        params.delete(key);
      } else {
        params.set(key, value);
      }

      router.push(`?${params.toString()}`);
    },
    [searchParams, router]
  );

  const clearFilters = useCallback(() => {
    const params = new URLSearchParams();
    const query = searchParams.get('query');
    if (query) params.set('query', query);
    router.push(`?${params.toString()}`);
  }, [searchParams, router]);

  const hasFilters =
    selectedSubjects.length > 0 ||
    selectedGrades.length > 0 ||
    selectedType ||
    selectedSafety.length > 0;

  return (
    <div className="sticky top-6 space-y-6 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Filters</h2>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-primary hover:underline">
            Clear all
          </button>
        )}
      </div>

      {/* Item Type */}
      <FilterSection title="Type">
        {ITEM_TYPES.map((type) => (
          <FilterRadio
            key={type.value}
            name="type"
            value={type.value}
            label={type.label}
            checked={selectedType === type.value}
            onChange={() => {
              updateFilters('type', type.value);
            }}
          />
        ))}
      </FilterSection>

      {/* Subjects */}
      <FilterSection title="Subject">
        {SUBJECTS.map((subject) => (
          <FilterCheckbox
            key={subject.value}
            value={subject.value}
            label={subject.label}
            checked={selectedSubjects.includes(subject.value)}
            onChange={() => {
              updateFilters('subject', subject.value, true);
            }}
          />
        ))}
      </FilterSection>

      {/* Grade Bands */}
      <FilterSection title="Grade Band">
        {GRADE_BANDS.map((grade) => (
          <FilterCheckbox
            key={grade.value}
            value={grade.value}
            label={grade.label}
            checked={selectedGrades.includes(grade.value)}
            onChange={() => {
              updateFilters('grade', grade.value, true);
            }}
          />
        ))}
      </FilterSection>

      {/* Safety Certification */}
      <FilterSection title="Safety">
        {SAFETY_CERTS.map((cert) => (
          <FilterCheckbox
            key={cert.value}
            value={cert.value}
            label={cert.label}
            checked={selectedSafety.includes(cert.value)}
            onChange={() => {
              updateFilters('safety', cert.value, true);
            }}
          />
        ))}
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  children,
}: Readonly<{ title: string; children: React.ReactNode }>) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  value,
  label,
  checked,
  onChange,
}: Readonly<{
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}>) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted">
      <input
        type="checkbox"
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className={checked ? 'font-medium' : ''}>{label}</span>
    </label>
  );
}

function FilterRadio({
  name,
  value,
  label,
  checked,
  onChange,
}: Readonly<{
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}>) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 border-border text-primary focus:ring-primary"
      />
      <span className={checked ? 'font-medium' : ''}>{label}</span>
    </label>
  );
}
