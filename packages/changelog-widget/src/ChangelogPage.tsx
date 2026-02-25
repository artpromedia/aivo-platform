'use client';

import React, { useCallback, useEffect, useState } from 'react';
import type { ChangelogCategory, ChangelogEntry, PaginatedChangelog } from './types.js';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types.js';

// ─── Styles ───────────────────────────────────────────────────────────────────

const pageStyles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px 20px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  header: {
    marginBottom: '32px',
  } as React.CSSProperties,

  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px 0',
  } as React.CSSProperties,

  subtitle: {
    fontSize: '15px',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,

  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
    marginBottom: '24px',
  } as React.CSSProperties,

  filterButton: (active: boolean) =>
    ({
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '13px',
      fontWeight: 500,
      border: '1px solid',
      borderColor: active ? '#3b82f6' : '#e5e7eb',
      backgroundColor: active ? '#eff6ff' : '#ffffff',
      color: active ? '#2563eb' : '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
    }) as React.CSSProperties,

  entryCard: {
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    marginBottom: '16px',
    backgroundColor: '#ffffff',
    transition: 'box-shadow 0.15s ease',
  } as React.CSSProperties,

  entryTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
    lineHeight: '1.4',
  } as React.CSSProperties,

  entrySummary: {
    fontSize: '14px',
    color: '#4b5563',
    margin: '0 0 12px 0',
    lineHeight: '1.6',
  } as React.CSSProperties,

  entryBody: {
    fontSize: '14px',
    color: '#374151',
    lineHeight: '1.7',
    margin: '12px 0 0 0',
    paddingTop: '12px',
    borderTop: '1px solid #f3f4f6',
  } as React.CSSProperties,

  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  } as React.CSSProperties,

  categoryBadge: (category: string) => {
    const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ?? {
      bg: '#f3f4f6',
      text: '#6b7280',
    };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: colors.bg,
      color: colors.text,
    } as React.CSSProperties;
  },

  dateBadge: {
    fontSize: '13px',
    color: '#9ca3af',
  } as React.CSSProperties,

  versionBadge: {
    fontSize: '12px',
    color: '#6b7280',
    fontWeight: 500,
    backgroundColor: '#f3f4f6',
    padding: '2px 8px',
    borderRadius: '6px',
  } as React.CSSProperties,

  loadMoreButton: {
    display: 'block',
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
    textAlign: 'center' as const,
    marginTop: '8px',
  } as React.CSSProperties,

  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 20px',
    color: '#9ca3af',
  } as React.CSSProperties,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface ChangelogPageProps {
  apiBase?: string;
  title?: string;
  subtitle?: string;
}

const ALL_CATEGORIES: ChangelogCategory[] = [
  'feature',
  'improvement',
  'fix',
  'security',
  'deprecation',
];

export function ChangelogPage({
  apiBase = '/api/changelog',
  title = "What's New",
  subtitle = 'Stay up to date with the latest features, improvements, and fixes.',
}: ChangelogPageProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeCategory, setActiveCategory] = useState<ChangelogCategory | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchEntries = useCallback(
    async (pageNum: number, category: ChangelogCategory | null, append: boolean) => {
      try {
        setLoading(true);
        const params = new URLSearchParams({ page: String(pageNum), limit: '15' });
        if (category) params.set('category', category);

        const res = await fetch(`${apiBase}?${params}`, { credentials: 'include' });
        if (res.ok) {
          const data: PaginatedChangelog = await res.json();
          setEntries((prev) => (append ? [...prev, ...data.data] : data.data));
          setTotalPages(data.totalPages);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    },
    [apiBase],
  );

  useEffect(() => {
    setPage(1);
    fetchEntries(1, activeCategory, false);
  }, [activeCategory, fetchEntries]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchEntries(next, activeCategory, true);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div style={pageStyles.container}>
      <div style={pageStyles.header}>
        <h1 style={pageStyles.title}>{title}</h1>
        <p style={pageStyles.subtitle}>{subtitle}</p>
      </div>

      {/* Category filters */}
      <div style={pageStyles.filters}>
        <button
          type="button"
          style={pageStyles.filterButton(activeCategory === null)}
          onClick={() => setActiveCategory(null)}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            style={pageStyles.filterButton(activeCategory === cat)}
            onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Entries */}
      {!loading && entries.length === 0 ? (
        <div style={pageStyles.emptyState}>
          <p style={{ fontSize: '15px', fontWeight: 500 }}>No updates found</p>
          <p style={{ fontSize: '13px', marginTop: '4px' }}>
            {activeCategory ? 'Try clearing your filter.' : 'Check back soon for updates.'}
          </p>
        </div>
      ) : (
        entries.map((entry) => (
          <div
            key={entry.id}
            style={pageStyles.entryCard}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <div style={pageStyles.entryMeta}>
              <span style={pageStyles.categoryBadge(entry.category)}>
                {CATEGORY_LABELS[entry.category] ?? entry.category}
              </span>
              {entry.version && <span style={pageStyles.versionBadge}>v{entry.version}</span>}
              <span style={pageStyles.dateBadge}>
                {formatDate(entry.publishedAt ?? entry.createdAt)}
              </span>
              {entry.isHighlight && (
                <span style={{ fontSize: '12px', color: '#d97706' }}>★ Highlight</span>
              )}
            </div>

            <h2
              style={{ ...pageStyles.entryTitle, cursor: entry.bodyMarkdown ? 'pointer' : 'default' }}
              onClick={() => entry.bodyMarkdown && toggleExpand(entry.id)}
            >
              {entry.title}
            </h2>

            <p style={pageStyles.entrySummary}>{entry.summary}</p>

            {entry.imageUrl && (
              <img
                src={entry.imageUrl}
                alt={entry.title}
                style={{ width: '100%', borderRadius: '8px', marginBottom: '12px' }}
              />
            )}

            {entry.bodyMarkdown && expandedIds.has(entry.id) && (
              <div style={pageStyles.entryBody}>{entry.bodyMarkdown}</div>
            )}

            {entry.bodyMarkdown && (
              <button
                type="button"
                onClick={() => toggleExpand(entry.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3b82f6',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  padding: 0,
                  marginTop: '4px',
                }}
              >
                {expandedIds.has(entry.id) ? 'Show less' : 'Read more'}
              </button>
            )}

            {entry.tags.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px',
                      color: '#9ca3af',
                      border: '1px solid #e5e7eb',
                      borderRadius: '4px',
                      padding: '1px 6px',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
          Loading…
        </div>
      )}

      {page < totalPages && !loading && (
        <button
          type="button"
          style={pageStyles.loadMoreButton}
          onClick={loadMore}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#ffffff';
          }}
        >
          Load more updates
        </button>
      )}
    </div>
  );
}
