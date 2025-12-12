'use client';

/**
 * Installations Filters Component
 *
 * Sidebar filters for the installations management page.
 */

import { useRouter, useSearchParams } from 'next/navigation';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'DISABLED', label: 'Disabled' },
  { value: 'REVOKED', label: 'Revoked' },
];

const SCOPE_OPTIONS = [
  { value: '', label: 'All Scopes' },
  { value: 'district', label: 'District-wide' },
  { value: 'school', label: 'School' },
  { value: 'classroom', label: 'Classroom' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'CONTENT_PACK', label: 'Content Packs' },
  { value: 'EMBEDDED_TOOL', label: 'Embedded Tools' },
];

export function InstallationsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || '';
  const currentScope = searchParams.get('scope') || '';
  const currentType = searchParams.get('type') || '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  }

  function clearFilters() {
    router.push('/marketplace/installations');
  }

  const hasFilters = currentStatus || currentScope || currentType;

  return (
    <div className="space-y-6">
      {/* Status Filter */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Status</h3>
        <div className="space-y-2">
          {STATUS_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={currentStatus === option.value}
                onChange={(e) => {
                  updateFilter('status', e.target.value);
                }}
                className="h-4 w-4 border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Scope Filter */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Scope</h3>
        <div className="space-y-2">
          {SCOPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="scope"
                value={option.value}
                checked={currentScope === option.value}
                onChange={(e) => {
                  updateFilter('scope', e.target.value);
                }}
                className="h-4 w-4 border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Type Filter */}
      <div>
        <h3 className="mb-3 text-sm font-medium">Type</h3>
        <div className="space-y-2">
          {TYPE_OPTIONS.map((option) => (
            <label key={option.value} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="type"
                value={option.value}
                checked={currentType === option.value}
                onChange={(e) => {
                  updateFilter('type', e.target.value);
                }}
                className="h-4 w-4 border-border text-primary focus:ring-primary"
              />
              <span className="text-sm">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <button
          onClick={clearFilters}
          className="w-full rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-surface-muted"
        >
          Clear Filters
        </button>
      )}

      {/* Quick Stats */}
      <div className="border-t border-border pt-4">
        <h3 className="mb-3 text-sm font-medium">Quick Stats</h3>
        <div className="space-y-2 text-sm text-muted">
          <div className="flex items-center justify-between">
            <span>Active installations</span>
            <span className="font-medium text-green-600">—</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Pending approval</span>
            <span className="font-medium text-yellow-600">—</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Disabled</span>
            <span className="font-medium text-gray-500">—</span>
          </div>
        </div>
      </div>
    </div>
  );
}
