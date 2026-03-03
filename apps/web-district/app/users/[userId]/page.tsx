/**
 * User Detail Page
 *
 * Tabbed layout showing Profile, Schools, and Activity for a single user.
 * Action buttons: Reset Password, Deactivate/Reactivate, Resend Invite, Change Role.
 */

'use client';

import { Badge, Button, Card, Heading, useConfirm, useToast } from '@aivo/ui-web';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../../providers';

// ============================================================================
// Types
// ============================================================================

interface UserDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'DISTRICT_ADMIN' | 'SCHOOL_ADMIN' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'LEARNER';
  status: 'ACTIVE' | 'INACTIVE' | 'INVITED' | 'PENDING' | 'SUSPENDED';
  createdAt: string;
  lastLoginAt?: string | undefined;
  avatarUrl?: string | undefined;
  ssoProvider?: string | undefined;
  ssoId?: string | undefined;
  schoolId?: string | undefined;
  schoolName?: string | undefined;
  gradeLevel?: string | undefined;
}

interface SchoolAssignment {
  id: string;
  schoolId: string;
  schoolName: string;
  role: string;
  assignedAt: string;
}

interface School {
  id: string;
  name: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId?: string | undefined;
  ipAddress?: string | undefined;
  details?: string | undefined;
}

type TabId = 'profile' | 'schools' | 'activity';

const ROLES = ['DISTRICT_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT'] as const;

const ROLE_LABELS: Record<string, string> = {
  DISTRICT_ADMIN: 'District Admin',
  SCHOOL_ADMIN: 'School Admin',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  ADMIN: 'Admin',
  LEARNER: 'Learner',
};

const ROLE_COLORS: Record<string, string> = {
  DISTRICT_ADMIN: 'bg-purple-100 text-purple-800',
  SCHOOL_ADMIN: 'bg-blue-100 text-blue-800',
  TEACHER: 'bg-green-100 text-green-800',
  PARENT: 'bg-amber-100 text-amber-800',
  ADMIN: 'bg-purple-100 text-purple-800',
  LEARNER: 'bg-cyan-100 text-cyan-800',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  INVITED: 'bg-blue-100 text-blue-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

// ============================================================================
// API helper
// ============================================================================

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> | undefined) },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string };
    throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// ============================================================================
// Main component
// ============================================================================

export default function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { toast } = useToast();
  const { tenantId: authTenantId } = useAuth();
  const tenantId = authTenantId ?? '';

  // --- Core state ---
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  // --- Schools tab state ---
  const [schools, setSchools] = useState<SchoolAssignment[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');

  // --- Activity tab state ---
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // --- Action state ---
  const [actionLoading, setActionLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);

  // Resolve params
  useEffect(() => {
    void params.then((p) => {
      setUserId(p.userId);
    });
  }, [params]);

  // ── Fetch user ──────────────────────────────────────────────────────────
  const loadUser = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<UserDetail>(`/api/users/${userId}`);
      setUser(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  // ── Fetch schools for this user ─────────────────────────────────────────
  const loadSchools = useCallback(async () => {
    if (!userId) return;
    setSchoolsLoading(true);
    try {
      const data = await apiFetch<{ assignments?: SchoolAssignment[]; schools?: SchoolAssignment[] }>(
        `/api/users/${userId}?include=schools`
      );
      setSchools(data.assignments ?? data.schools ?? []);
    } catch {
      // Non-fatal — the main GET may not support ?include=schools,
      // fall back to the user's single school assignment
      if (user?.schoolId) {
        setSchools([
          {
            id: `${user.schoolId}-assignment`,
            schoolId: user.schoolId,
            schoolName: user.schoolName ?? user.schoolId,
            role: ROLE_LABELS[user.role] ?? user.role,
            assignedAt: user.createdAt,
          },
        ]);
      }
    } finally {
      setSchoolsLoading(false);
    }
  }, [userId, user?.schoolId, user?.schoolName, user?.role, user?.createdAt]);

  // ── Load all schools (for the picker) ───────────────────────────────────
  const loadAllSchools = useCallback(async () => {
    try {
      const data = await apiFetch<{ items?: School[] } | School[]>(
        `/api/schools?tenantId=${tenantId}`
      );
      setAllSchools(Array.isArray(data) ? data : (data.items ?? []));
    } catch {
      // Non-fatal
    }
  }, [tenantId]);

  // ── Fetch audit entries ─────────────────────────────────────────────────
  const loadActivity = useCallback(async () => {
    if (!userId) return;
    setActivityLoading(true);
    try {
      const p = new URLSearchParams({ search: userId, pageSize: '50' });
      const data = await apiFetch<{ items?: AuditEntry[]; entries?: AuditEntry[] }>(
        `/api/audit?${p}`
      );
      setAuditEntries(data.items ?? data.entries ?? []);
    } catch {
      setAuditEntries([]);
    } finally {
      setActivityLoading(false);
    }
  }, [userId]);

  // Load tab data when switching
  useEffect(() => {
    if (activeTab === 'schools' && schools.length === 0) {
      void loadSchools();
      void loadAllSchools();
    }
    if (activeTab === 'activity' && auditEntries.length === 0) {
      void loadActivity();
    }
  }, [activeTab, schools.length, auditEntries.length, loadSchools, loadAllSchools, loadActivity]);

  // ── Actions ─────────────────────────────────────────────────────────────

  async function handleResetPassword() {
    if (!userId) return;
    const ok = await confirm({
      title: 'Reset Password',
      description: `Send a password reset email to ${user?.email ?? 'this user'}?`,
      confirmLabel: 'Reset Password',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await apiFetch<{ message: string }>(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      });
      toast({ title: 'Password reset email sent', variant: 'success' });
    } catch (err: unknown) {
      toast({
        title: 'Failed to reset password',
        ...(err instanceof Error ? { description: err.message } : {}),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToggleStatus() {
    if (!userId || !user) return;
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const label = newStatus === 'INACTIVE' ? 'Deactivate' : 'Reactivate';
    const ok = await confirm({
      title: `${label} User`,
      description: `Are you sure you want to ${label.toLowerCase()} ${user.firstName} ${user.lastName}?`,
      confirmLabel: label,
      variant: newStatus === 'INACTIVE' ? 'destructive' : 'default',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await apiFetch<UserDetail>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      toast({ title: `User ${label.toLowerCase()}d`, variant: 'success' });
      await loadUser();
    } catch (err: unknown) {
      toast({
        title: `Failed to ${label.toLowerCase()} user`,
        ...(err instanceof Error ? { description: err.message } : {}),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResendInvite() {
    if (!userId) return;
    setActionLoading(true);
    try {
      await apiFetch<{ message: string }>(`/api/users/${userId}/resend-invite`, {
        method: 'POST',
      });
      toast({ title: 'Invitation resent', variant: 'success' });
    } catch (err: unknown) {
      toast({
        title: 'Failed to resend invite',
        ...(err instanceof Error ? { description: err.message } : {}),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleChangeRole(newRole: string) {
    if (!userId || !user) return;
    setShowRoleDropdown(false);
    setActionLoading(true);
    try {
      await apiFetch<UserDetail>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      });
      toast({ title: `Role changed to ${ROLE_LABELS[newRole] ?? newRole}`, variant: 'success' });
      await loadUser();
    } catch (err: unknown) {
      toast({
        title: 'Failed to change role',
        ...(err instanceof Error ? { description: err.message } : {}),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddSchool() {
    if (!userId || !selectedSchoolId) return;
    setActionLoading(true);
    try {
      await apiFetch<unknown>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ schoolId: selectedSchoolId }),
      });
      toast({ title: 'School assigned', variant: 'success' });
      setShowSchoolPicker(false);
      setSelectedSchoolId('');
      await loadSchools();
    } catch (err: unknown) {
      toast({
        title: 'Failed to assign school',
        ...(err instanceof Error ? { description: err.message } : {}),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemoveSchool(schoolId: string) {
    if (!userId) return;
    const ok = await confirm({
      title: 'Remove School Assignment',
      description: 'Remove this user from the selected school?',
      confirmLabel: 'Remove',
      variant: 'destructive',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await apiFetch<unknown>(`/api/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ schoolId: schoolId === user?.schoolId ? null : undefined }),
      });
      toast({ title: 'Removed from school', variant: 'success' });
      await loadSchools();
    } catch (err: unknown) {
      toast({
        title: 'Failed to remove school assignment',
        ...(err instanceof Error ? { description: err.message } : {}),
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════

  if (loading && !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <section className="space-y-5 p-6">
        <nav className="text-sm text-muted">
          <Link href="/users" className="hover:text-primary hover:underline">Users</Link>
          <span className="mx-2">/</span>
          <span className="text-text">Not found</span>
        </nav>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
          <Link href="/users" className="ml-4 text-sm underline">Back to Users</Link>
        </div>
      </section>
    );
  }

  if (!user) return null;

  const fullName = `${user.firstName} ${user.lastName}`;
  const initials = `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase();
  const isInvited = user.status === 'INVITED' || user.status === 'PENDING';

  return (
    <section className="space-y-5 p-6">
      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <nav className="text-sm text-muted">
        <Link href="/users" className="hover:text-primary hover:underline">Users</Link>
        <span className="mx-2">/</span>
        <span className="text-text">{fullName}</span>
      </nav>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={fullName}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-semibold text-primary">
              {initials}
            </div>
          )}
          <div>
            <Heading className="text-headline font-semibold">{fullName}</Heading>
            <p className="text-sm text-muted">{user.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge className={ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-800'}>
                {ROLE_LABELS[user.role] ?? user.role}
              </Badge>
              <Badge className={STATUS_COLORS[user.status] ?? 'bg-gray-100 text-gray-800'}>
                {user.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* ── Action buttons ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Change Role dropdown */}
          <div className="relative">
            <Button
              variant="secondary"
              disabled={actionLoading}
              onClick={() => { setShowRoleDropdown(!showRoleDropdown); }}
            >
              Change Role
            </Button>
            {showRoleDropdown && (
              <div className="absolute right-0 z-10 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg">
                {ROLES.map((role) => (
                  <button
                    key={role}
                    onClick={() => { void handleChangeRole(role); }}
                    disabled={role === user.role}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      role === user.role ? 'font-semibold text-primary' : 'text-gray-700'
                    }`}
                  >
                    {ROLE_LABELS[role]}{role === user.role ? ' (current)' : ''}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button variant="secondary" disabled={actionLoading} onClick={() => { void handleResetPassword(); }}>
            Reset Password
          </Button>

          {isInvited && (
            <Button variant="secondary" disabled={actionLoading} onClick={() => { void handleResendInvite(); }}>
              Resend Invite
            </Button>
          )}

          <Button
            variant={user.status === 'ACTIVE' ? 'ghost' : 'primary'}
            disabled={actionLoading}
            className={user.status === 'ACTIVE' ? 'text-red-600 hover:text-red-700' : ''}
            onClick={() => { void handleToggleStatus(); }}
          >
            {user.status === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
          </Button>

          <Button variant="ghost" onClick={() => { router.back(); }}>
            ← Back
          </Button>
        </div>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────── */}
      <div className="flex gap-2 border-b border-border">
        {(['profile', 'schools', 'activity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); }}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Profile tab ───────────────────────────────────────────────── */}
      {activeTab === 'profile' && (
        <Card className="p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FieldRow label="Full Name" value={fullName} />
            <FieldRow label="Email" value={user.email} />
            <FieldRow label="Role" value={ROLE_LABELS[user.role] ?? user.role} />
            <FieldRow label="Status" value={user.status} />
            <FieldRow label="Created" value={formatDate(user.createdAt)} />
            <FieldRow
              label="Last Login"
              value={user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
            />
            <FieldRow
              label="SSO Provider"
              value={user.ssoProvider ? `${user.ssoProvider}${user.ssoId ? ` (${user.ssoId})` : ''}` : 'None'}
            />
            {user.schoolName && <FieldRow label="School" value={user.schoolName} />}
            {user.gradeLevel && <FieldRow label="Grade Level" value={user.gradeLevel} />}
          </div>
        </Card>
      )}

      {/* ── Schools tab ───────────────────────────────────────────────── */}
      {activeTab === 'schools' && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Assigned Schools</h3>
            <Button
              variant="primary"
              onClick={() => {
                setShowSchoolPicker(true);
                if (allSchools.length === 0) void loadAllSchools();
              }}
            >
              Add to School
            </Button>
          </div>

          {/* School picker dropdown */}
          {showSchoolPicker && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-3">
              <select
                value={selectedSchoolId}
                onChange={(e) => { setSelectedSchoolId(e.target.value); }}
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Select a school...</option>
                {allSchools
                  .filter((s) => !schools.some((sa) => sa.schoolId === s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
              <Button
                variant="primary"
                disabled={!selectedSchoolId || actionLoading}
                onClick={() => { void handleAddSchool(); }}
              >
                Assign
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setShowSchoolPicker(false); setSelectedSchoolId(''); }}
              >
                Cancel
              </Button>
            </div>
          )}

          {schoolsLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : schools.length === 0 ? (
            <p className="py-8 text-center text-muted">No schools assigned.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3 font-medium">School Name</th>
                    <th className="px-4 py-3 font-medium">Role at School</th>
                    <th className="px-4 py-3 font-medium">Assigned Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {schools.map((sa) => (
                    <tr key={sa.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-text">
                        <Link href={`/schools/${sa.schoolId}`} className="hover:text-primary hover:underline">
                          {sa.schoolName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{sa.role}</td>
                      <td className="px-4 py-3 text-muted">{formatDate(sa.assignedAt)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => { void handleRemoveSchool(sa.schoolId); }}
                          disabled={actionLoading}
                          className="text-sm text-red-600 hover:text-red-700 hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Activity tab ──────────────────────────────────────────────── */}
      {activeTab === 'activity' && (
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-text">Recent Activity</h3>
            <Button variant="ghost" disabled={activityLoading} onClick={() => { void loadActivity(); }}>
              Refresh
            </Button>
          </div>

          {activityLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : auditEntries.length === 0 ? (
            <p className="py-8 text-center text-muted">No recent activity found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Entity</th>
                    <th className="px-4 py-3 font-medium">IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditEntries.map((entry) => (
                    <tr key={entry.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted">{formatDate(entry.timestamp)}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-gray-100 text-gray-800">{entry.action}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text">
                        {entry.entity}
                        {entry.entityId && (
                          <span className="ml-1 text-muted">({entry.entityId})</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">
                        {entry.ipAddress ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-text">{value}</dd>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
