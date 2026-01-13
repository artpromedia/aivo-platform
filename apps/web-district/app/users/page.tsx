/**
 * User Management Page
 *
 * CRUD interface for managing district users
 */

'use client';

import * as React from 'react';

import { UserTable } from './components/user-table';
import { UserFormModal } from './components/user-form-modal';
import { CsvImportModal } from './components/csv-import-modal';
import { UserFilters } from './components/user-filters';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'TEACHER' | 'ADMIN' | 'LEARNER' | 'PARENT';
  status: 'ACTIVE' | 'PENDING' | 'INACTIVE' | 'SUSPENDED';
  schoolId?: string;
  schoolName?: string;
  gradeLevel?: string;
  createdAt: string;
  lastLoginAt?: string;
}

// Mock data for demonstration
const mockUsers: User[] = [
  {
    id: '1',
    email: 'sarah.johnson@school.edu',
    firstName: 'Sarah',
    lastName: 'Johnson',
    role: 'TEACHER',
    status: 'ACTIVE',
    schoolId: 'school-1',
    schoolName: 'Lincoln Elementary',
    createdAt: '2024-01-15T10:00:00Z',
    lastLoginAt: '2025-01-12T14:30:00Z',
  },
  {
    id: '2',
    email: 'michael.chen@school.edu',
    firstName: 'Michael',
    lastName: 'Chen',
    role: 'ADMIN',
    status: 'ACTIVE',
    schoolId: 'school-1',
    schoolName: 'Lincoln Elementary',
    createdAt: '2023-08-20T08:00:00Z',
    lastLoginAt: '2025-01-13T09:15:00Z',
  },
  {
    id: '3',
    email: 'emma.wilson@school.edu',
    firstName: 'Emma',
    lastName: 'Wilson',
    role: 'TEACHER',
    status: 'PENDING',
    schoolId: 'school-2',
    schoolName: 'Washington Middle',
    createdAt: '2025-01-10T12:00:00Z',
  },
  {
    id: '4',
    email: 'alex.smith@email.com',
    firstName: 'Alex',
    lastName: 'Smith',
    role: 'PARENT',
    status: 'ACTIVE',
    createdAt: '2024-09-01T16:00:00Z',
    lastLoginAt: '2025-01-11T20:00:00Z',
  },
  {
    id: '5',
    email: 'olivia.brown@school.edu',
    firstName: 'Olivia',
    lastName: 'Brown',
    role: 'TEACHER',
    status: 'INACTIVE',
    schoolId: 'school-1',
    schoolName: 'Lincoln Elementary',
    createdAt: '2023-05-15T10:00:00Z',
  },
];

export default function UserManagementPage() {
  const [users, setUsers] = React.useState<User[]>(mockUsers);
  const [filteredUsers, setFilteredUsers] = React.useState<User[]>(mockUsers);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [showCsvModal, setShowCsvModal] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<User | null>(null);

  // Stats
  const stats = React.useMemo(() => {
    return {
      total: users.length,
      active: users.filter((u) => u.status === 'ACTIVE').length,
      pending: users.filter((u) => u.status === 'PENDING').length,
      teachers: users.filter((u) => u.role === 'TEACHER').length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
    };
  }, [users]);

  const handleFilter = (filters: {
    search: string;
    role: string;
    status: string;
    school: string;
  }) => {
    let filtered = users;

    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.email.toLowerCase().includes(query) ||
          u.firstName.toLowerCase().includes(query) ||
          u.lastName.toLowerCase().includes(query)
      );
    }

    if (filters.role && filters.role !== 'all') {
      filtered = filtered.filter((u) => u.role === filters.role);
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((u) => u.status === filters.status);
    }

    if (filters.school && filters.school !== 'all') {
      filtered = filtered.filter((u) => u.schoolId === filters.school);
    }

    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (data: Partial<User>) => {
    setLoading(true);
    setError(null);

    try {
      // In production, this would call the API
      const newUser: User = {
        id: `user-${Date.now()}`,
        email: data.email!,
        firstName: data.firstName!,
        lastName: data.lastName!,
        role: data.role!,
        status: 'PENDING',
        schoolId: data.schoolId,
        schoolName: data.schoolId === 'school-1' ? 'Lincoln Elementary' : 'Washington Middle',
        createdAt: new Date().toISOString(),
      };

      setUsers((prev) => [...prev, newUser]);
      setFilteredUsers((prev) => [...prev, newUser]);
      setShowCreateModal(false);
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (data: Partial<User>) => {
    if (!editingUser) return;

    setLoading(true);
    setError(null);

    try {
      // In production, this would call the API
      const updatedUser = { ...editingUser, ...data };

      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
      setFilteredUsers((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));
      setEditingUser(null);
    } catch (err) {
      setError('Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // In production, this would call the API
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setFilteredUsers((prev) => prev.filter((u) => u.id !== userId));
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: User['status']) => {
    setLoading(true);

    try {
      // In production, this would call the API
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      setFilteredUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      setError('Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  const handleCsvImport = (importedUsers: Partial<User>[]) => {
    const newUsers: User[] = importedUsers.map((u, i) => ({
      id: `imported-${Date.now()}-${i}`,
      email: u.email!,
      firstName: u.firstName!,
      lastName: u.lastName!,
      role: u.role || 'TEACHER',
      status: 'PENDING',
      schoolId: u.schoolId,
      createdAt: new Date().toISOString(),
    }));

    setUsers((prev) => [...prev, ...newUsers]);
    setFilteredUsers((prev) => [...prev, ...newUsers]);
    setShowCsvModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-gray-600">
              Manage teachers, admins, and parent accounts
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCsvModal(true)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
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
              onClick={() => setError(null)}
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
          onEdit={(user) => setEditingUser(user)}
          onDelete={handleDeleteUser}
          onStatusChange={handleStatusChange}
        />

        {/* Create Modal */}
        {showCreateModal && (
          <UserFormModal
            title="Add New User"
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateUser}
            loading={loading}
          />
        )}

        {/* Edit Modal */}
        {editingUser && (
          <UserFormModal
            title="Edit User"
            user={editingUser}
            onClose={() => setEditingUser(null)}
            onSubmit={handleUpdateUser}
            loading={loading}
          />
        )}

        {/* CSV Import Modal */}
        {showCsvModal && (
          <CsvImportModal
            onClose={() => setShowCsvModal(false)}
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
