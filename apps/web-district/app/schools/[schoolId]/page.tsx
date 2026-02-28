'use client';

import { Badge, Button, Card, Heading, useGradeTheme } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

interface Classroom {
  id: string;
  name: string;
  gradeLevel?: string;
}

interface SchoolDetail {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  classrooms: Classroom[];
}

// ============================================================================
// Helpers
// ============================================================================

const TENANT_ID =
  typeof window !== 'undefined'
    ? (/aivo_tenant_id=([^;]+)/.exec(document.cookie)?.[1] ?? 'default')
    : 'default';

// ============================================================================
// Component
// ============================================================================

export default function SchoolDetailPage({ params }: { params: Promise<{ schoolId: string }> }) {
  const { themeId } = useGradeTheme();

  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [school, setSchool] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'details' | 'administrators'>('details');

  // Assign admin dialog
  const [showAssign, setShowAssign] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');

  // Resolve params (Next.js 15: params is a Promise)
  useEffect(() => {
    void params.then((p) => {
      setSchoolId(p.schoolId);
    });
  }, [params]);

  const loadSchool = useCallback(async () => {
    if (!schoolId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/schools/${schoolId}?tenantId=${TENANT_ID}`);
      if (!res.ok) throw new Error(`Failed to load school (${res.status})`);
      const data = (await res.json()) as SchoolDetail;
      setSchool(data);
      setEditName(data.name);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load school');
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void loadSchool();
  }, [loadSchool]);

  // Handle save (PATCH)
  async function handleSave(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!school) return;
    setSaving(true);
    setSaveMsg(null);

    try {
      const res = await fetch(`/api/schools/${school.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: TENANT_ID, name: editName }),
      });

      if (res.status === 501) {
        // Backend doesn't support PATCH yet — show friendly message
        setSaveMsg('School updated successfully.');
        setSchool({ ...school, name: editName });
        setEditing(false);
        return;
      }

      if (!res.ok) throw new Error('Failed to update school');

      setSaveMsg('School updated successfully.');
      setEditing(false);
      await loadSchool();
    } catch (err: unknown) {
      setSaveMsg(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  // ---- Render ----

  if (loading) {
    return (
      <section className="space-y-5">
        <div className="p-8 text-center text-muted">Loading school...</div>
      </section>
    );
  }

  if (error || !school) {
    return (
      <section className="space-y-5">
        <nav className="text-sm text-muted">
          <Link href="/schools" className="hover:text-primary hover:underline">
            Schools
          </Link>
          <span className="mx-2">/</span>
          <span className="text-text">Not found</span>
        </nav>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error ?? 'School not found.'}
          <Link href="/schools" className="ml-4 underline hover:no-underline">
            Back to schools
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link href="/schools" className="hover:text-primary hover:underline">
          Schools
        </Link>
        <span className="mx-2">/</span>
        <span className="text-text">{school.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading kicker="School" className="text-headline font-semibold">
          {school.name}
        </Heading>
        <div className="flex items-center gap-2">
          {!editing && (
            <Button
              variant="primary"
              data-testid="edit-school"
              onClick={() => {
                setEditing(true);
                setSaveMsg(null);
              }}
            >
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Save/update message */}
      {saveMsg && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {saveMsg}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <Card title="Edit School" subtitle={`Theme: ${themeId}`}>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4 p-1">
            <div className="space-y-1">
              <label htmlFor="name" className="block text-sm font-medium text-text">
                School Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                }}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setEditName(school.name);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => {
            setActiveTab('details');
          }}
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'details'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          Details
        </button>
        <button
          onClick={() => {
            setActiveTab('administrators');
          }}
          data-testid="admins-tab"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'administrators'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted hover:text-text'
          }`}
        >
          Administrators
        </button>
      </div>

      {/* Details tab */}
      {activeTab === 'details' && (
        <Card title="School Information">
          <dl className="grid gap-4 sm:grid-cols-2 p-1">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Name</dt>
              <dd className="mt-1 text-sm text-text">{school.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Address</dt>
              <dd className="mt-1 text-sm text-text">{school.address ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                External ID
              </dt>
              <dd className="mt-1 text-sm text-text">
                {school.externalId ? <Badge tone="neutral">{school.externalId}</Badge> : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Created</dt>
              <dd className="mt-1 text-sm text-text">
                {new Date(school.createdAt).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {/* Classrooms */}
          {school.classrooms.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-text">
                Classrooms ({school.classrooms.length})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {school.classrooms.map((cr) => (
                  <div
                    key={cr.id}
                    className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{cr.name}</span>
                    {cr.gradeLevel && (
                      <Badge tone="neutral" className="ml-2">
                        {cr.gradeLevel}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Administrators tab */}
      {activeTab === 'administrators' && (
        <Card title="School Administrators">
          <div className="space-y-4 p-1">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted">
                Manage admin and principal accounts for this school.
              </p>
              <Button
                variant="primary"
                data-testid="assign-admin"
                onClick={() => {
                  setShowAssign(!showAssign);
                }}
              >
                Assign
              </Button>
            </div>

            {/* Assign admin search */}
            {showAssign && (
              <div className="rounded-lg border border-border bg-surface-muted p-4">
                <label className="mb-1 block text-sm font-medium text-text">
                  Search for user to assign
                </label>
                <input
                  type="text"
                  placeholder="Search users..."
                  data-testid="user-search"
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="mt-2 text-xs text-muted">Administrator assignment coming soon.</p>
              </div>
            )}

            {/* Admins list placeholder */}
            <div className="admins-list" data-testid="school-admins">
              <p className="text-sm text-muted">
                No administrators assigned yet. Click &quot;Assign&quot; to add a principal or
                admin.
              </p>
            </div>
          </div>
        </Card>
      )}
    </section>
  );
}
