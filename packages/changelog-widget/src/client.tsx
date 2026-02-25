'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { ChangelogEntry, PaginatedChangelog } from './types.js';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './types.js';

// ─── Icons (inline SVGs to avoid external deps) ──────────────────────────────

function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SparklesIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.813 3.375a.5.5 0 0 1 .874 0l1.06 1.928a.5.5 0 0 0 .25.25l1.928 1.06a.5.5 0 0 1 0 .874l-1.928 1.06a.5.5 0 0 0-.25.25l-1.06 1.928a.5.5 0 0 1-.874 0l-1.06-1.928a.5.5 0 0 0-.25-.25L6.575 7.487a.5.5 0 0 1 0-.874l1.928-1.06a.5.5 0 0 0 .25-.25l1.06-1.928zM17.313 10.375a.5.5 0 0 1 .874 0l.69 1.255a.5.5 0 0 0 .25.25l1.255.69a.5.5 0 0 1 0 .874l-1.255.69a.5.5 0 0 0-.25.25l-.69 1.255a.5.5 0 0 1-.874 0l-.69-1.255a.5.5 0 0 0-.25-.25l-1.255-.69a.5.5 0 0 1 0-.874l1.255-.69a.5.5 0 0 0 .25-.25l.69-1.255z" />
    </svg>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  buttonReset: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    margin: 0,
    font: 'inherit',
    color: 'inherit',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as React.CSSProperties,

  changelogButton: {
    position: 'relative' as const,
    padding: '8px',
    borderRadius: '8px',
    transition: 'background-color 0.15s ease',
    color: '#6b7280',
  } as React.CSSProperties,

  badge: {
    position: 'absolute' as const,
    top: '2px',
    right: '2px',
    minWidth: '18px',
    height: '18px',
    borderRadius: '9px',
    backgroundColor: '#ef4444',
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 5px',
    lineHeight: 1,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 9998,
    transition: 'opacity 0.2s ease',
  } as React.CSSProperties,

  drawer: {
    position: 'fixed' as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: '420px',
    maxWidth: '100vw',
    backgroundColor: '#ffffff',
    zIndex: 9999,
    boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
    display: 'flex',
    flexDirection: 'column' as const,
    transition: 'transform 0.25s ease',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  } as React.CSSProperties,

  drawerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #e5e7eb',
    flexShrink: 0,
  } as React.CSSProperties,

  drawerTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#111827',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,

  drawerBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '0',
  } as React.CSSProperties,

  entryCard: {
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
    cursor: 'pointer',
    transition: 'background-color 0.1s ease',
  } as React.CSSProperties,

  entryTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
    lineHeight: '1.4',
  } as React.CSSProperties,

  entrySummary: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  } as React.CSSProperties,

  entryMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#9ca3af',
  } as React.CSSProperties,

  categoryBadge: (category: string) => {
    const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] ?? { bg: '#f3f4f6', text: '#6b7280' };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: 600,
      backgroundColor: colors.bg,
      color: colors.text,
      lineHeight: '1.5',
    } as React.CSSProperties;
  },

  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    flexShrink: 0,
  } as React.CSSProperties,

  highlightBar: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    bottom: 0,
    width: '3px',
    backgroundColor: '#3b82f6',
    borderRadius: '0 2px 2px 0',
  } as React.CSSProperties,

  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 20px',
    color: '#9ca3af',
    textAlign: 'center' as const,
  } as React.CSSProperties,

  markAllRead: {
    fontSize: '13px',
    color: '#3b82f6',
    fontWeight: 500,
    padding: '4px 8px',
    borderRadius: '6px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    transition: 'background-color 0.15s ease',
  } as React.CSSProperties,

  viewAll: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '14px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    textDecoration: 'none',
    borderTop: '1px solid #e5e7eb',
    flexShrink: 0,
  } as React.CSSProperties,

  loadingSpinner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    color: '#9ca3af',
    fontSize: '14px',
  } as React.CSSProperties,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function groupByDate(entries: ChangelogEntry[]): Map<string, ChangelogEntry[]> {
  const groups = new Map<string, ChangelogEntry[]>();
  for (const entry of entries) {
    const dateKey = entry.publishedAt
      ? formatDate(entry.publishedAt)
      : formatDate(entry.createdAt);
    const group = groups.get(dateKey) ?? [];
    group.push(entry);
    groups.set(dateKey, group);
  }
  return groups;
}

// ─── ChangelogButton ──────────────────────────────────────────────────────────

export interface ChangelogButtonProps {
  /** Base URL for changelog API (e.g., '/api/changelog'). Defaults to '/api/changelog'. */
  apiBase?: string;
  /** Optional aria label */
  ariaLabel?: string;
  /** Link to full changelog page */
  changelogPageUrl?: string;
  /** Polling interval in ms. Default: 60000 (1 min). 0 = no polling. */
  pollInterval?: number;
}

export function ChangelogButton({
  apiBase = '/api/changelog',
  ariaLabel = 'View changelog',
  changelogPageUrl,
  pollInterval = 60_000,
}: ChangelogButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hovered, setHovered] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/unread-count`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count ?? 0);
      }
    } catch {
      // Silently ignore — unread count is non-critical
    }
  }, [apiBase]);

  useEffect(() => {
    fetchUnreadCount();
    if (pollInterval > 0) {
      const timer = setInterval(fetchUnreadCount, pollInterval);
      return () => clearInterval(timer);
    }
  }, [fetchUnreadCount, pollInterval]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Refresh count after drawer closes
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  return (
    <>
      <button
        type="button"
        style={{
          ...styles.buttonReset,
          ...styles.changelogButton,
          backgroundColor: hovered ? '#f3f4f6' : 'transparent',
        }}
        onClick={() => setIsOpen(true)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label={ariaLabel}
        title={ariaLabel}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span style={styles.badge} aria-label={`${unreadCount} unread updates`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <ChangelogDrawer
          apiBase={apiBase}
          onClose={handleClose}
          changelogPageUrl={changelogPageUrl}
        />
      )}
    </>
  );
}

// ─── ChangelogDrawer ──────────────────────────────────────────────────────────

export interface ChangelogDrawerProps {
  apiBase?: string;
  onClose: () => void;
  changelogPageUrl?: string;
}

export function ChangelogDrawer({
  apiBase = '/api/changelog',
  onClose,
  changelogPageUrl,
}: ChangelogDrawerProps) {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Fetch entries
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${apiBase}?limit=20`, { credentials: 'include' });
        if (res.ok) {
          const data: PaginatedChangelog = await res.json();
          setEntries(data.data);
          setTotal(data.total);
        }
      } catch {
        // Silently handle errors
      } finally {
        setLoading(false);
      }
    })();
  }, [apiBase]);

  // Mark entries as read when they scroll into view
  const observerRef = useRef<IntersectionObserver | null>(null);
  const markedRef = useRef(new Set<string>());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (intersections) => {
        for (const item of intersections) {
          if (item.isIntersecting) {
            const entryId = item.target.getAttribute('data-entry-id');
            if (entryId && !markedRef.current.has(entryId)) {
              markedRef.current.add(entryId);
              fetch(`${apiBase}/${entryId}/mark-read`, {
                method: 'POST',
                credentials: 'include',
              }).catch(() => {});
            }
          }
        }
      },
      { root: bodyRef.current, threshold: 0.5 },
    );

    return () => {
      observerRef.current?.disconnect();
    };
  }, [apiBase]);

  const entryRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node && observerRef.current) {
        const entryId = node.getAttribute('data-entry-id');
        const entry = entries.find((e) => e.id === entryId);
        if (entry && !entry.isRead) {
          observerRef.current.observe(node);
        }
      }
    },
    [entries],
  );

  const handleMarkAllRead = async () => {
    try {
      await fetch(`${apiBase}/mark-all-read`, { method: 'POST', credentials: 'include' });
      setEntries((prev) => prev.map((e) => ({ ...e, isRead: true })));
    } catch {
      // Silently handle
    }
  };

  const hasUnread = entries.some((e) => !e.isRead);
  const groupedEntries = groupByDate(entries);

  return (
    <>
      {/* Overlay */}
      <div
        style={styles.overlay}
        onClick={onClose}
        role="presentation"
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Changelog"
        aria-modal="true"
        style={styles.drawer}
      >
        {/* Header */}
        <div style={styles.drawerHeader}>
          <h2 style={styles.drawerTitle}>
            <SparklesIcon />
            What&apos;s New
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {hasUnread && (
              <button
                type="button"
                style={styles.markAllRead}
                onClick={handleMarkAllRead}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#eff6ff';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                }}
              >
                Mark all read
              </button>
            )}
            <button
              type="button"
              style={{ ...styles.buttonReset, padding: '4px', borderRadius: '6px' }}
              onClick={onClose}
              aria-label="Close changelog"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={styles.drawerBody} ref={bodyRef}>
          {loading ? (
            <div style={styles.loadingSpinner}>Loading updates…</div>
          ) : entries.length === 0 ? (
            <div style={styles.emptyState}>
              <BellIcon size={32} />
              <p style={{ marginTop: '12px', fontSize: '15px', fontWeight: 500 }}>
                No updates yet
              </p>
              <p style={{ marginTop: '4px', fontSize: '13px' }}>
                New features and improvements will appear here.
              </p>
            </div>
          ) : (
            Array.from(groupedEntries.entries()).map(([dateLabel, groupEntries]) => (
              <div key={dateLabel}>
                <div
                  style={{
                    padding: '10px 20px 6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    position: 'sticky',
                    top: 0,
                    backgroundColor: '#ffffff',
                    zIndex: 1,
                  }}
                >
                  {dateLabel}
                </div>
                {groupEntries.map((entry) => (
                  <div
                    key={entry.id}
                    ref={entryRef}
                    data-entry-id={entry.id}
                    style={{
                      ...styles.entryCard,
                      position: 'relative',
                      backgroundColor: entry.isRead ? '#ffffff' : '#fafbff',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = entry.isRead
                        ? '#ffffff'
                        : '#fafbff';
                    }}
                  >
                    {!entry.isRead && <div style={styles.highlightBar} />}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={styles.categoryBadge(entry.category)}>
                            {CATEGORY_LABELS[entry.category] ?? entry.category}
                          </span>
                          {entry.isHighlight && (
                            <span style={{ ...styles.categoryBadge('feature'), backgroundColor: '#fef3c7', color: '#d97706' }}>
                              ★ Highlight
                            </span>
                          )}
                        </div>
                        <h3 style={styles.entryTitle}>{entry.title}</h3>
                        <p style={styles.entrySummary}>{entry.summary}</p>
                        <div style={styles.entryMeta}>
                          {entry.version && <span>v{entry.version}</span>}
                          {entry.tags.length > 0 && (
                            <span>• {entry.tags.join(', ')}</span>
                          )}
                        </div>
                      </div>
                      {!entry.isRead && <div style={styles.unreadDot} />}
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {total > entries.length && changelogPageUrl && (
          <a href={changelogPageUrl} style={styles.viewAll}>
            View all {total} updates →
          </a>
        )}
      </aside>
    </>
  );
}
