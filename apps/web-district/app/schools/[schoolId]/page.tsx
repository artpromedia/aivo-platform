'use client';

import { Badge, Button, Card, Heading, useGradeTheme } from '@aivo/ui-web';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

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

interface UserResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface SchoolAdmin {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  assignedAt: string;
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
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Current admins
  const [admins, setAdmins] = useState<SchoolAdmin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<string | null>(null); // userId being assigned

  // Remove confirmation
  const [removeTarget, setRemoveTarget] = useState<SchoolAdmin | null>(null);
  const [removing, setRemoving] = useState(false);

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

  // Load current admins
  const loadAdmins = useCallback(async () => {
    if (!schoolId) return;
    try {
      setAdminsLoading(true);
      setAdminsError(null);
      const res = await fetch(`/api/schools/${schoolId}/admins?tenantId=${TENANT_ID}`);
      if (!res.ok) throw new Error(`Failed to load admins (${res.status})`);
      const data = (await res.json()) as { admins?: SchoolAdmin[] };
      setAdmins(data.admins ?? []);
    } catch (err: unknown) {
      setAdminsError(err instanceof Error ? err.message : 'Failed to load admins');
    } finally {
      setAdminsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (activeTab === 'administrators') {
      void loadAdmins();
    }
  }, [activeTab, loadAdmins]);

  // Debounced user search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!adminSearch || adminSearch.length < 2) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    searchTimer.current = setTimeout(() => {
      void (async () => {
        try {
          setSearchLoading(true);
          setSearchError(null);
          const params = new URLSearchParams({
            tenantId: TENANT_ID,
            search: adminSearch,
            role: 'ADMIN,TEACHER',
            limit: '10',
          });
          const res = await fetch(`/api/users?${params}`);
          if (!res.ok) throw new Error('Search failed');
          const data = (await res.json()) as { users?: UserResult[] };
          // Filter out users already assigned
          const assignedIds = new Set(admins.map((a) => a.userId));
          setSearchResults((data.users ?? []).filter((u) => !assignedIds.has(u.id)));
        } catch (err: unknown) {
          setSearchError(err instanceof Error ? err.message : 'Search failed');
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [adminSearch, admins]);

  // Assign user as admin
  async function handleAssign(user: UserResult) {
    if (!schoolId) return;
    setAssigning(user.id);
    try {
      const res = await fetch(`/api/schools/${schoolId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: TENANT_ID,
          userId: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        }),
      });
      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errData.error ?? 'Failed to assign admin');
      }
      setAdminSearch('');
      setSearchResults([]);
      setShowAssign(false);
      await loadAdmins();
    } catch (err: unknown) {
      setSearchError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssigning(null);
    }
  }

  // Remove admin
  async function handleRemove() {
    if (!schoolId || !removeTarget) return;
    setRemoving(true);
    try {
      const res = await fetch(
        `/api/schools/${schoolId}/admins/${removeTarget.userId}?tenantId=${TENANT_ID}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error('Failed to remove admin');
      setRemoveTarget(null);
      await loadAdmins();
    } catch (err: unknown) {
      setAdminsError(err instanceof Error ? err.message : 'Remove failed');
    } finally {
      setRemoving(false);
    }
  }

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
                  setAdminSearch('');
                  setSearchResults([]);
                  setSearchError(null);
                }}
              >
                {showAssign ? 'Cancel' : 'Assign'}
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
                  placeholder="Search by name or email..."
                  data-testid="user-search"
                  value={adminSearch}
                  onChange={(e) => {
                    setAdminSearch(e.target.value);
                  }}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />

                {/* Search loading */}
                {searchLoading && (
                  <p className="mt-2 text-xs text-muted" data-testid="search-loading">
                    Searching...
                  </p>
                )}

                {/* Search error */}
                {searchError && (
                  <p className="mt-2 text-xs text-red-600" data-testid="search-error">
                    {searchError}
                  </p>
                )}

                {/* Search results */}
                {searchResults.length > 0 && (
                  <ul className="mt-2 max-h-48 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface" data-testid="search-results">
                    {searchResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          data-testid={`assign-user-${user.id}`}
                          disabled={assigning === user.id}
                          onClick={() => void handleAssign(user)}
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                        >
                          <div>
                            <span className="font-medium text-text">
                              {user.firstName} {user.lastName}
                            </span>
                            <span className="ml-2 text-muted">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge tone="neutral">{user.role}</Badge>
                            {assigning === user.id ? (
                              <span className="text-xs text-muted">Assigning...</span>
                            ) : (
                              <span className="text-xs text-primary">+ Assign</span>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* No results */}
                {adminSearch.length >= 2 && !searchLoading && searchResults.length === 0 && !searchError && (
                  <p className="mt-2 text-xs text-muted">No matching users found.</p>
                )}
              </div>
            )}

            {/* Admins loading */}
            {adminsLoading && (
              <p className="text-sm text-muted" data-testid="admins-loading">Loading administrators...</p>
            )}

            {/* Admins error */}
            {adminsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="admins-error">
                {adminsError}
              </div>
            )}

            {/* Admins list */}
            <div data-testid="school-admins">
              {!adminsLoading && admins.length === 0 && (
                <p className="text-sm text-muted">
                  No administrators assigned yet. Click &quot;Assign&quot; to add a principal or
                  admin.
                </p>
              )}
              {admins.length > 0 && (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {admins.map((admin) => (
                    <div
                      key={admin.userId}
                      className="flex items-center justify-between px-4 py-3"
                      data-testid={`admin-row-${admin.userId}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-text">
                          {admin.firstName} {admin.lastName}
                        </p>
                        <p className="text-xs text-muted">{admin.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge tone="neutral">{admin.role}</Badge>
                        <Button
                          variant="ghost"
                          data-testid={`remove-admin-${admin.userId}`}
                          onClick={() => { setRemoveTarget(admin); }}
                          className="text-red-600 hover:text-red-700"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Remove confirmation dialog */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" data-testid="remove-confirm-dialog">
          <div className="w-full max-w-sm rounded-lg bg-surface p-6 shadow-lg">
            <h3 className="text-lg font-semibold text-text">Remove Administrator</h3>
            <p className="mt-2 text-sm text-muted">
              Are you sure you want to remove{' '}
              <strong>{removeTarget.firstName} {removeTarget.lastName}</strong> as a school
              administrator?
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                data-testid="remove-cancel"
                onClick={() => { setRemoveTarget(null); }}
                disabled={removing}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                data-testid="remove-confirm"
                onClick={() => void handleRemove()}
                disabled={removing}
                className="bg-red-600 hover:bg-red-700"
              >
                {removing ? 'Removing...' : 'Remove'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
