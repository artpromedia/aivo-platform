'use client';

import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useState } from 'react';

// ─── Types ────────────────────────────────────────────────────────────

interface ChangelogEntry {
  id: string;
  version: string;
  title: string;
  summary: string;
  bodyMarkdown?: string;
  category: string;
  audience: string[];
  tags: string[];
  imageUrl?: string;
  isHighlight: boolean;
  publishedAt: string;
  createdAt: string;
}

interface EntryAnalytics {
  entryId: string;
  totalReads: number;
  uniqueReads: number;
}

type Category = 'feature' | 'improvement' | 'fix' | 'security' | 'deprecation';

const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'fix', label: 'Fix' },
  { value: 'security', label: 'Security' },
  { value: 'deprecation', label: 'Deprecation' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone' },
  { value: 'platform_admin', label: 'Platform Admins' },
  { value: 'district_admin', label: 'District Admins' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'parent', label: 'Parents' },
  { value: 'developer', label: 'Developers' },
];

const CATEGORY_COLORS: Record<string, string> = {
  feature: '#3b82f6',
  improvement: '#8b5cf6',
  fix: '#f59e0b',
  security: '#ef4444',
  deprecation: '#6b7280',
};

// ─── Main Page ────────────────────────────────────────────────────────

export default function ChangelogAdminPage() {
  const { data: session } = useSession();
  const accessToken = (session as { accessToken?: string } | null)?.accessToken ?? '';
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [analytics, setAnalytics] = useState<Record<string, EntryAnalytics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const headers = useCallback(() => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (accessToken) { h.Authorization = `Bearer ${accessToken}`; }
    return h;
  }, [accessToken]);

  // ─── Fetch entries ───────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/changelog?limit=100', {
        headers: headers(),
        cache: 'no-store',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { entries?: ChangelogEntry[]; data?: ChangelogEntry[] };
      setEntries(data.entries ?? data.data ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch entries');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch('/api/changelog/admin/analytics', {
        headers: headers(),
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = (await res.json()) as EntryAnalytics[] | Record<string, unknown>;
      const map: Record<string, EntryAnalytics> = {};
      if (Array.isArray(data)) {
        for (const item of data) {
          map[item.entryId] = item;
        }
      }
      setAnalytics(map);
    } catch {
      // Non-critical
    }
  }, [headers]);

  useEffect(() => {
    void fetchEntries();
    void fetchAnalytics();
  }, [fetchEntries, fetchAnalytics]);

  // ─── Delete handler ──────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/changelog/admin/${id}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setEntries((prev) => prev.filter((e) => e.id !== id));
        setDeletingId(null);
      } catch (err: unknown) {
        alert(`Delete failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    },
    [headers],
  );

  // ─── Render ──────────────────────────────────────────────────────

  if (showForm || editingEntry) {
    return (
      <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        <ChangelogEntryForm
          entry={editingEntry}
          headers={headers()}
          onSaved={() => {
            setShowForm(false);
            setEditingEntry(null);
            void fetchEntries();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingEntry(null);
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>
            Changelog Management
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Create and manage changelog entries visible to users across all apps.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          + New Entry
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total Entries" value={entries.length} color="#3b82f6" />
        <StatCard
          label="Features"
          value={entries.filter((e) => e.category === 'feature').length}
          color="#3b82f6"
        />
        <StatCard
          label="Fixes"
          value={entries.filter((e) => e.category === 'fix').length}
          color="#f59e0b"
        />
        <StatCard
          label="Highlights"
          value={entries.filter((e) => e.isHighlight).length}
          color="#10b981"
        />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          Loading entries...
        </div>
      )}

      {/* Entries table */}
      {!loading && entries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px', color: '#9ca3af' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
          <p>No changelog entries yet. Create one to get started.</p>
        </div>
      )}

      {!loading && entries.length > 0 && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={thStyle}>Version</th>
                <th style={{ ...thStyle, textAlign: 'left' as const }}>Title</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Audience</th>
                <th style={thStyle}>Reads</th>
                <th style={thStyle}>Published</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6b7280' }}>
                      {entry.version}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 500, color: '#111827' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {entry.title}
                      {entry.isHighlight && (
                        <span style={{ fontSize: '11px', backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '8px' }}>
                          ★
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                      {entry.summary.substring(0, 80)}{entry.summary.length > 80 ? '...' : ''}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: `${CATEGORY_COLORS[entry.category] ?? '#6b7280'}20`,
                        color: CATEGORY_COLORS[entry.category] ?? '#6b7280',
                      }}
                    >
                      {entry.category}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const, fontSize: '12px', color: '#6b7280' }}>
                    {entry.audience.join(', ')}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const, fontSize: '13px', color: '#6b7280' }}>
                    {analytics[entry.id]?.uniqueReads ?? '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const, fontSize: '12px', color: '#9ca3af' }}>
                    {new Date(entry.publishedAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' as const }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        onClick={() => { setEditingEntry(entry); }}
                        style={actionButtonStyle}
                      >
                        Edit
                      </button>
                      {deletingId === entry.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void handleDelete(entry.id)}
                            style={{ ...actionButtonStyle, color: '#ef4444', borderColor: '#fecaca' }}
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => { setDeletingId(null); }}
                            style={actionButtonStyle}
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setDeletingId(entry.id); }}
                          style={{ ...actionButtonStyle, color: '#ef4444' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '10px',
        border: '1px solid #e5e7eb',
        padding: '16px 20px',
      }}
    >
      <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

// ─── Entry Form ───────────────────────────────────────────────────────

interface ChangelogEntryFormProps {
  entry: ChangelogEntry | null;
  headers: Record<string, string>;
  onSaved: () => void;
  onCancel: () => void;
}

function ChangelogEntryForm({ entry, headers, onSaved, onCancel }: ChangelogEntryFormProps) {
  const isEditing = !!entry;

  const [version, setVersion] = useState(entry?.version ?? '');
  const [title, setTitle] = useState(entry?.title ?? '');
  const [summary, setSummary] = useState(entry?.summary ?? '');
  const [bodyMarkdown, setBodyMarkdown] = useState(entry?.bodyMarkdown ?? '');
  const [category, setCategory] = useState<Category>(entry ? (entry.category as Category) : 'feature');
  const [audience, setAudience] = useState<string[]>(entry?.audience ?? ['all']);
  const [tags, setTags] = useState<string>(entry ? entry.tags.join(', ') : '');
  const [imageUrl, setImageUrl] = useState(entry?.imageUrl ?? '');
  const [isHighlight, setIsHighlight] = useState(entry?.isHighlight ?? false);
  const [publishedAt, setPublishedAt] = useState(
    entry?.publishedAt ? new Date(entry.publishedAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
  );
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleAudience = (val: string) => {
    setAudience((prev) =>
      prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val],
    );
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    const body = {
      version: version.trim(),
      title: title.trim(),
      summary: summary.trim(),
      bodyMarkdown: bodyMarkdown.trim() || undefined,
      category,
      audience,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      imageUrl: imageUrl.trim() || undefined,
      isHighlight,
      publishedAt: new Date(publishedAt).toISOString(),
    };

    try {
      const url = entry ? `/api/changelog/admin/${entry.id}` : '/api/changelog/admin';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      onSaved();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>
          {isEditing ? 'Edit Entry' : 'New Changelog Entry'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          style={{ fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          ← Back to list
        </button>
      </div>

      {formError && (
        <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>
          {formError}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Version */}
        <div>
          <label style={labelStyle}>Version *</label>
          <input
            type="text"
            value={version}
            onChange={(e) => { setVersion(e.target.value); }}
            placeholder="e.g. 2.1.0"
            required
            style={inputStyle}
          />
        </div>
        {/* Publish Date */}
        <div>
          <label style={labelStyle}>Publish Date *</label>
          <input
            type="datetime-local"
            value={publishedAt}
            onChange={(e) => { setPublishedAt(e.target.value); }}
            required
            style={inputStyle}
          />
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => { setTitle(e.target.value); }}
          placeholder="What's new in this release?"
          required
          style={inputStyle}
        />
      </div>

      {/* Summary */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Summary *</label>
        <textarea
          value={summary}
          onChange={(e) => { setSummary(e.target.value); }}
          placeholder="Brief description (shown in the changelog list)"
          required
          rows={2}
          style={{ ...inputStyle, resize: 'vertical' as const }}
        />
      </div>

      {/* Body Markdown */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Body (Markdown)</label>
        <textarea
          value={bodyMarkdown}
          onChange={(e) => { setBodyMarkdown(e.target.value); }}
          placeholder="Detailed description in Markdown format..."
          rows={8}
          style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' as const }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        {/* Category */}
        <div>
          <label style={labelStyle}>Category *</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as Category); }}
            style={inputStyle}
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {/* Image URL */}
        <div>
          <label style={labelStyle}>Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => { setImageUrl(e.target.value); }}
            placeholder="https://..."
            style={inputStyle}
          />
        </div>
      </div>

      {/* Audience */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Audience</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { toggleAudience(opt.value); }}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid',
                cursor: 'pointer',
                backgroundColor: audience.includes(opt.value) ? '#3b82f6' : '#ffffff',
                color: audience.includes(opt.value) ? '#ffffff' : '#374151',
                borderColor: audience.includes(opt.value) ? '#3b82f6' : '#d1d5db',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: '16px' }}>
        <label style={labelStyle}>Tags (comma-separated)</label>
        <input
          type="text"
          value={tags}
          onChange={(e) => { setTags(e.target.value); }}
          placeholder="e.g. analytics, dashboard, reporting"
          style={inputStyle}
        />
      </div>

      {/* Highlight */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isHighlight}
            onChange={(e) => { setIsHighlight(e.target.checked); }}
            style={{ width: '16px', height: '16px' }}
          />
          <span style={{ fontSize: '14px', color: '#374151' }}>
            Mark as highlight (featured entry)
          </span>
        </label>
      </div>

      {/* Submit */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            backgroundColor: saving ? '#9ca3af' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : isEditing ? 'Update Entry' : 'Create Entry'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            backgroundColor: '#ffffff',
            color: '#374151',
            border: '1px solid #d1d5db',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  textAlign: 'center',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
};

const actionButtonStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 500,
  color: '#3b82f6',
  background: 'none',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '4px 10px',
  cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  color: '#111827',
  backgroundColor: '#ffffff',
  boxSizing: 'border-box',
};
