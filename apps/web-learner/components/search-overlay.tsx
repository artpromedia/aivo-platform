'use client';

import { useQuery } from '@tanstack/react-query';
import { BookOpen, Gamepad2, GraduationCap, Loader2, SearchX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

// ── Types ──────────────────────────────────────────────────

interface SearchHit {
  id: string;
  type: 'course' | 'lesson' | 'game';
  title: string;
  subtitle: string;
  href: string;
  emoji: string;
}

// ── Fetch helper ───────────────────────────────────────────

async function fetchSearch(query: string): Promise<SearchHit[]> {
  const res = await fetch(`/api/learner/search?q=${encodeURIComponent(query)}`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { results: SearchHit[] };
  return data.results ?? [];
}

// ── Icons per type ─────────────────────────────────────────

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  course: BookOpen,
  lesson: GraduationCap,
  game: Gamepad2,
};

const TYPE_LABEL: Record<string, string> = {
  course: 'Courses',
  lesson: 'Lessons',
  game: 'Games',
};

// ── Component ──────────────────────────────────────────────

interface SearchOverlayProps {
  query: string;
  onClose: () => void;
  onNavigate: () => void;
}

export function SearchOverlay({ query, onClose, onNavigate }: SearchOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['learner', 'search', query],
    queryFn: () => fetchSearch(query),
    enabled: query.length > 0,
    staleTime: 30_000,
  });

  // Click-outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // Escape to close
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Group results by type
  const grouped: Record<string, SearchHit[]> = {};
  for (const hit of results) {
    (grouped[hit.type] ??= []).push(hit);
  }

  return (
    <div
      ref={panelRef}
      className="absolute left-0 top-full mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg z-50"
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
          <SearchX className="h-7 w-7" />
          <p className="text-sm">No results found</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto py-2">
          {(['course', 'lesson', 'game'] as const).map((type) => {
            const items = grouped[type];
            if (!items?.length) return null;
            const Icon = TYPE_ICON[type] ?? BookOpen;

            return (
              <div key={type}>
                <div className="flex items-center gap-2 px-4 py-1.5">
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {TYPE_LABEL[type] ?? type}
                  </span>
                </div>
                {items.map((hit) => (
                  <Link
                    key={hit.id}
                    href={hit.href}
                    onClick={onNavigate}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50 transition-colors"
                  >
                    <span className="text-base shrink-0">{hit.emoji || '📄'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">{hit.title}</p>
                      {hit.subtitle && (
                        <p className="text-xs text-gray-500 truncate">{hit.subtitle}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
