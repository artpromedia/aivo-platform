'use client';

/**
 * Curriculum Search Component
 *
 * Search bar and sort controls for curriculum library.
 */

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';

export function CurriculumSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('query') || '');

  const currentSort = searchParams.get('sort') || 'newest';

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery) {
        params.set('query', searchQuery);
      } else {
        params.delete('query');
      }
      params.delete('page');
      router.push(`/curriculum?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, router, searchParams]);

  const handleSort = useCallback(
    (sort: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('sort', sort);
      params.delete('page');
      router.push(`/curriculum?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Search Input */}
      <div className="relative flex-1 sm:max-w-md">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search curricula..."
          className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Sort Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted">Sort by:</span>
        <select
          value={currentSort}
          onChange={(e) => handleSort(e.target.value)}
          className="rounded-md border border-border bg-surface px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="newest">Newest</option>
          <option value="updated">Recently Updated</option>
          <option value="name">Name (A-Z)</option>
          <option value="name_desc">Name (Z-A)</option>
          <option value="subject">Subject</option>
          <option value="grade">Grade Level</option>
        </select>
      </div>
    </div>
  );
}
