/**
 * Search Results Page
 *
 * Universal search across students, classes, assignments, and lessons.
 * Reads `q` from URL search params, fetches from /api/search,
 * groups results by type with icons and direct-navigation links.
 */

'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

/* ─── Types ───────────────────────────────────────────────────────────── */

type ResultType = 'student' | 'class' | 'assignment' | 'lesson' | 'report';

interface SearchResult {
  type: ResultType;
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

interface SearchResponse {
  results: SearchResult[];
  total: number;
}

/* ─── Constants ───────────────────────────────────────────────────────── */

const TYPE_META: Record<
  ResultType,
  { icon: string; label: string; plural: string }
> = {
  student: { icon: '👤', label: 'Student', plural: 'Students' },
  class: { icon: '🏫', label: 'Class', plural: 'Classes' },
  assignment: { icon: '📝', label: 'Assignment', plural: 'Assignments' },
  lesson: { icon: '📚', label: 'Lesson', plural: 'Lessons' },
  report: { icon: '📊', label: 'Report', plural: 'Reports' },
};

const ALL_TYPES: ResultType[] = [
  'student',
  'class',
  'assignment',
  'lesson',
  'report',
];

/* ─── Skeleton ────────────────────────────────────────────────────────── */

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

/* ═══════════════════════════════════════════════════════════════════════ */
/*  PAGE                                                                  */
/* ═══════════════════════════════════════════════════════════════════════ */

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const query = searchParams.get('q') ?? '';
  const typeFilter = searchParams.get('type') ?? '';

  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [total, setTotal] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Local search input mirrors URL param
  const [localQuery, setLocalQuery] = React.useState(query);

  // Active type filters
  const [activeTypes, setActiveTypes] = React.useState<Set<ResultType>>(
    () =>
      new Set(
        typeFilter
          ? (typeFilter.split(',').filter((t) => t in TYPE_META) as ResultType[])
          : [],
      ),
  );

  // ── Fetch results whenever query or type filter changes ─────────────
  React.useEffect(() => {
    if (!query) {
      setResults([]);
      setTotal(0);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ q: query, limit: '50' });
    if (activeTypes.size > 0) {
      params.set('type', Array.from(activeTypes).join(','));
    }

    fetch(`/api/search?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('Search failed');
        return res.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        setResults(data.results);
        setTotal(data.total);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && (err as DOMException).name === 'AbortError') return;
        setError((err as Error).message || 'Something went wrong');
      })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [query, activeTypes]);

  // Keep localQuery in sync when URL changes
  React.useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // ── Submit search form ──────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = localQuery.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({ q: trimmed });
    if (activeTypes.size > 0) {
      params.set('type', Array.from(activeTypes).join(','));
    }
    router.push(`/search?${params.toString()}`);
  };

  // ── Toggle type filter ─────────────────────────────────────────────
  const toggleType = (type: ResultType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  // ── Group results by type ──────────────────────────────────────────
  const grouped = React.useMemo(() => {
    const map = new Map<ResultType, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.type) ?? [];
      list.push(r);
      map.set(r.type, list);
    }
    return map;
  }, [results]);

  return (
    <div>
      <PageHeader
        title="Search"
        description={
          query
            ? `${total} result${total !== 1 ? 's' : ''} for "${query}"`
            : 'Search students, classes, assignments, and lessons'
        }
      />

      {/* ── Search bar ────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="relative max-w-2xl">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search students, classes, assignments..."
            className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            autoFocus
          />
        </div>
      </form>

      {/* ── Facet filters ─────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const meta = TYPE_META[type];
          const active = activeTypes.has(type);
          return (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors ${
                active
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.plural}</span>
            </button>
          );
        })}
        {activeTypes.size > 0 && (
          <button
            onClick={() => setActiveTypes(new Set())}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Results area ──────────────────────────────────────────── */}
      <div className="mt-6">
        {/* Loading */}
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg border p-4"
              >
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={() => router.refresh()}
              className="mt-2 text-sm font-medium text-red-600 underline hover:text-red-800"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty — no query */}
        {!isLoading && !error && !query && (
          <div className="rounded-lg border bg-white p-12 text-center">
            <p className="text-4xl">🔍</p>
            <p className="mt-2 font-medium text-gray-900">
              Start typing to search
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Search across students, classes, assignments, and lessons
            </p>
          </div>
        )}

        {/* Empty — no results */}
        {!isLoading && !error && query && results.length === 0 && (
          <div className="rounded-lg border bg-white p-12 text-center">
            <p className="text-4xl">😕</p>
            <p className="mt-2 font-medium text-gray-900">
              No results for &ldquo;{query}&rdquo;
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try a different search term or remove filters
            </p>
          </div>
        )}

        {/* Grouped results */}
        {!isLoading &&
          !error &&
          results.length > 0 &&
          Array.from(grouped.entries()).map(([type, items]) => {
            const meta = TYPE_META[type];
            return (
              <section key={type} className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  <span>{meta.icon}</span>
                  {meta.plural}
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {items.length}
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((result) => (
                    <Link
                      key={`${result.type}-${result.id}`}
                      href={result.url}
                      className="flex items-center gap-4 rounded-lg border bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/30"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg">
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900">
                          {result.title}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {result.subtitle}
                        </p>
                      </div>
                      <svg
                        className="h-5 w-5 shrink-0 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </div>
  );
}
