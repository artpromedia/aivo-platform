/**
 * User Filters Component
 *
 * Search and filter controls for user list
 */

'use client';

import * as React from 'react';

interface UserFiltersProps {
  onFilter: (filters: {
    search: string;
    role: string;
    status: string;
    school: string;
  }) => void;
}

export function UserFilters({ onFilter }: UserFiltersProps) {
  const [search, setSearch] = React.useState('');
  const [role, setRole] = React.useState('all');
  const [status, setStatus] = React.useState('all');
  const [school, setSchool] = React.useState('all');

  React.useEffect(() => {
    onFilter({ search, role, status, school });
  }, [search, role, status, school, onFilter]);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-4 rounded-xl border bg-white p-4">
      {/* Search */}
      <div className="relative flex-1 min-w-64">
        <SearchIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Role Filter */}
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Roles</option>
        <option value="ADMIN">Admin</option>
        <option value="TEACHER">Teacher</option>
        <option value="PARENT">Parent</option>
        <option value="LEARNER">Learner</option>
      </select>

      {/* Status Filter */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Statuses</option>
        <option value="ACTIVE">Active</option>
        <option value="PENDING">Pending</option>
        <option value="INACTIVE">Inactive</option>
        <option value="SUSPENDED">Suspended</option>
      </select>

      {/* School Filter */}
      <select
        value={school}
        onChange={(e) => setSchool(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="all">All Schools</option>
        <option value="school-1">Lincoln Elementary</option>
        <option value="school-2">Washington Middle</option>
        <option value="school-3">Jefferson High</option>
      </select>

      {/* Clear Filters */}
      {(search || role !== 'all' || status !== 'all' || school !== 'all') && (
        <button
          onClick={() => {
            setSearch('');
            setRole('all');
            setStatus('all');
            setSchool('all');
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}
