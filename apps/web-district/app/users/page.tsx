/**
 * User Management Page
 *
 * CRUD interface for managing district users — wired to /api/users proxy routes
 */

'use client';

import * as React from 'react';

import { useConfirm } from '@aivo/ui-web';

import { CsvImportModal } from './components/csv-import-modal';
import { UserFilters } from './components/user-filters';
import { UserFormModal } from './components/user-form-modal';
import { UserTable } from './components/user-table';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'TEACHER' | 'ADMIN' | 'LEARNER' | 'PARENT';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED';
  schoolId?: string | undefined;
  schoolName?: string;
  gradeLevel?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const TENANT_ID = typeof window !== 'undefined'
  ? (document.cookie.match(/aivo_tenant_id=([^;]+)/)?.[1] ?? 'default')
  : 'default';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function fetchUsers(filters?: { role?: string; status?: string; search?: string }): Promise<User[]> {
  const params = new URLSearchParams({ tenantId: TENANT_ID });
  if (filters?.role && filters.role !== 'all') params.set('role', filters.role);
  if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);
  const data = await apiFetch<{ users?: User[] } | User[]>(`/api/users?${params}`);
  return Array.isArray(data) ? data : (data.users ?? []);
}

async function createUser(data: Partial<User>): Promise<User> {
  return apiFetch<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify({ ...data, tenantId: TENANT_ID }),
  });
}

async function updateUser(userId: string, data: Partial<User>): Promise<User> {
  return apiFetch<User>(`/api/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async function deleteUser(userId: string): Promise<void> {
  await apiFetch<unknown>(`/api/users/${userId}`, { method: 'DELETE' });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function UserManagementPage() {
  const confirm = useConfirm();
  const [users, setUsers] = React.useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showCsvModal, setShowCsvModal] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);
  const [activeFilters, setActiveFilters] = React.useState<{ search: string; role: string; status: string; school: string }>({
    search: '', role: 'all', status: 'all', school: 'all',
  });

  // Initial load
  const loadUsers = React.useCallback(async (filters?: typeof activeFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers(filters);
      setUsers(data);
      applyClientFilter(data, filters ?? activeFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => { loadUsers(); }, [loadUsers]);

  // Client-side filter for school (not supported server-side)
  function applyClientFilter(data: User[], filters: typeof activeFilters) {
    let filtered = data;
    if (filters.school && filters.school !== 'all') {
      filtered = filtered.filter((u) => u.schoolId === filters.school);
    }
    setFilteredUsers(filtered);
  }

  // Stats
  const stats = React.useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'ACTIVE').length,
    pending: users.filter((u) => u.status === 'PENDING').length,
    teachers: users.filter((u) => u.role === 'TEACHER').length,
    admins: users.filter((u) => u.role === 'ADMIN').length,
  }), [users]);

  const handleFilter = (filters: { search: string; role: string; status: string; school: string }) => {
    setActiveFilters(filters);
    loadUsers(filters);
  };

  const handleCreateUser = async (data: Partial<User>) => {
    setLoading(true);
    setError(null);
    try {
      await createUser(data);
      await loadUsers(activeFilters);
      setShowCreateModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (data: Partial<User>) => {
    if (!editingUser) return;
    setLoading(true);
    setError(null);
    try {
      await updateUser(editingUser.id, data);
      await loadUsers(activeFilters);
      setEditingUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const ok = await confirm({
      title: 'Delete User',
      description: 'Are you sure you want to delete this user? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'destructive',
    });
    if (!ok) return;
    setLoading(true);
    setError(null);
    try {
      await deleteUser(userId);
      await loadUsers(activeFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: User['status']) => {
    setLoading(true);
    try {
      await updateUser(userId, { status: newStatus });
      await loadUsers(activeFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = async (importedUsers: Partial<User>[]) => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all(importedUsers.map((u) => createUser(u)));
      await loadUsers(activeFilters);
      setShowCsvModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import users');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-gray-600">Manage teachers, admins, and parent accounts</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setShowCsvModal(true);
              }}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Import CSV
            </button>
            <button
              onClick={() => {
                setShowCreateModal(true);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 md:grid-cols-5">
          <StatCard label="Total Users" value={stats.total} />
          <StatCard label="Active" value={stats.active} color="green" />
          <StatCard label="Pending" value={stats.pending} color="yellow" />
          <StatCard label="Teachers" value={stats.teachers} color="blue" />
          <StatCard label="Admins" value={stats.admins} color="purple" />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
            <button
              onClick={() => {
                setError(null);
              }}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filters */}
        <UserFilters onFilter={handleFilter} />

        {/* User Table */}
        <UserTable
          users={filteredUsers}
          loading={loading}
          onEdit={(user) => {
            setEditingUser(user);
          }}
          onDelete={handleDeleteUser}
          onStatusChange={handleStatusChange}
        />

        {/* Create Modal */}
        {showCreateModal && (
          <UserFormModal
            title="Add New User"
            onClose={() => {
              setShowCreateModal(false);
            }}
            onSubmit={handleCreateUser}
            loading={loading}
          />
        )}

        {/* Edit Modal */}
        {editingUser && (
          <UserFormModal
            title="Edit User"
            user={editingUser}
            onClose={() => {
              setEditingUser(null);
            }}
            onSubmit={handleUpdateUser}
            loading={loading}
          />
        )}

        {/* CSV Import Modal */}
        {showCsvModal && (
          <CsvImportModal
            onClose={() => {
              setShowCsvModal(false);
            }}
            onImport={handleCsvImport}
          />
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: 'green' | 'yellow' | 'blue' | 'purple';
}) {
  const colorClasses = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
  };

  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color ? colorClasses[color] : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
