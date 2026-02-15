'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useConfirm } from '@aivo/ui-web';

import {
  usePilotPrograms,
  usePilotStats,
  useCreatePilot,
  useExtendPilot,
  useConvertPilot,
  useCancelPilot,
} from '@/hooks/use-billing';
import type { PilotProgram, PilotStats, CreatePilotInput } from '@/lib/api/billing.api';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES - Using types from billing.api.ts
// ═══════════════════════════════════════════════════════════════════════════════

type PilotStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'EXTENDED'
  | 'CONVERTING'
  | 'CONVERTED'
  | 'EXPIRED'
  | 'CANCELLED';

type PilotType =
  | 'DISTRICT_PILOT'
  | 'NONPROFIT_PILOT'
  | 'CHARTER_PILOT'
  | 'ENTERPRISE_TRIAL'
  | 'PROMOTIONAL';

interface CreatePilotForm {
  tenantId: string;
  type: PilotType;
  name: string;
  seats: number;
  durationDays: number;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  description: string;
  autoConvertEnabled: boolean;
  conversionDiscountPct: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusColor(status: PilotStatus): string {
  const colors: Record<PilotStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    EXTENDED: 'bg-blue-100 text-blue-800',
    CONVERTING: 'bg-purple-100 text-purple-800',
    CONVERTED: 'bg-emerald-100 text-emerald-800',
    EXPIRED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] ?? 'bg-gray-100 text-gray-800';
}

function getTypeLabel(type: PilotType): string {
  const labels: Record<PilotType, string> = {
    DISTRICT_PILOT: 'District',
    NONPROFIT_PILOT: 'Nonprofit',
    CHARTER_PILOT: 'Charter',
    ENTERPRISE_TRIAL: 'Enterprise',
    PROMOTIONAL: 'Promotional',
  };
  return labels[type] ?? type;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function PilotsPage() {
  // Fetch real data via hooks
  const { data: pilotsData, isLoading: pilotsLoading, error: pilotsError } = usePilotPrograms({});
  const { data: statsData, isLoading: statsLoading } = usePilotStats();

  // Mutations
  const createPilotMutation = useCreatePilot();
  const extendPilotMutation = useExtendPilot();
  const convertPilotMutation = useConvertPilot();
  const cancelPilotMutation = useCancelPilot();

  const pilots = pilotsData?.data ?? [];
  const stats: PilotStats | null = statsData ?? null;
  const isLoading = pilotsLoading || statsLoading;

  const confirm = useConfirm();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<PilotStatus | 'ALL'>('ALL');
  const [filterType, setFilterType] = useState<PilotType | 'ALL'>('ALL');

  // Create form state
  const [createForm, setCreateForm] = useState<CreatePilotForm>({
    tenantId: '',
    type: 'DISTRICT_PILOT',
    name: '',
    seats: 100,
    durationDays: 90,
    primaryContactName: '',
    primaryContactEmail: '',
    primaryContactPhone: '',
    description: '',
    autoConvertEnabled: false,
    conversionDiscountPct: null,
  });

  const filteredPilots = pilots.filter((p: PilotProgram) => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (filterType !== 'ALL' && p.type !== filterType) return false;
    return true;
  });

  const handleCreatePilot = async () => {
    createPilotMutation.mutate(createForm as CreatePilotInput, {
      onSuccess: () => {
        setShowCreateModal(false);
        // Reset form
        setCreateForm({
          tenantId: '',
          type: 'DISTRICT_PILOT',
          name: '',
          seats: 100,
          durationDays: 90,
          primaryContactName: '',
          primaryContactEmail: '',
          primaryContactPhone: '',
          description: '',
          autoConvertEnabled: false,
          conversionDiscountPct: null,
        });
      },
    });
  };

  const handleExtendPilot = async (pilotId: string) => {
    const days = prompt('Enter number of days to extend:');
    if (days && !Number.isNaN(Number(days))) {
      extendPilotMutation.mutate({ id: pilotId, data: { additionalDays: Number(days) } });
    }
  };

  const handleConvertPilot = async (pilotId: string) => {
    const ok = await confirm({
      title: 'Convert Pilot',
      description: 'Convert this pilot to a paid contract? This action cannot be undone.',
      confirmLabel: 'Convert to Paid',
      variant: 'destructive',
    });
    if (ok) {
      convertPilotMutation.mutate({ id: pilotId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pilot Programs</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage pilot programs for districts, nonprofits, and charter schools
          </p>
        </div>
        <button
          onClick={() => {
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <svg
            className="-ml-1 mr-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Create Pilot
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Pilots</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.byStatus.find((s) => s.status === 'ACTIVE')?.count ?? 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-yellow-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Ending This Week</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.endingThisWeek}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-indigo-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Conversion Rate</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.conversionRate.toFixed(1)}%
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Seats Active</dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stats.seatsInUse.toLocaleString()}
                      </div>
                      <span className="ml-2 text-sm text-gray-500">
                        / {stats.totalSeats.toLocaleString()}
                      </span>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as PilotStatus | 'ALL');
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="EXTENDED">Extended</option>
              <option value="CONVERTING">Converting</option>
              <option value="CONVERTED">Converted</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label htmlFor="type-filter" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              id="type-filter"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as PilotType | 'ALL');
              }}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="ALL">All Types</option>
              <option value="DISTRICT_PILOT">District</option>
              <option value="NONPROFIT_PILOT">Nonprofit</option>
              <option value="CHARTER_PILOT">Charter</option>
              <option value="ENTERPRISE_TRIAL">Enterprise Trial</option>
              <option value="PROMOTIONAL">Promotional</option>
            </select>
          </div>
        </div>
      </div>

      {/* Pilots Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pilot
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Seats
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Left
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPilots.map((pilot) => (
              <tr key={pilot.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{pilot.name}</div>
                      <div className="text-sm text-gray-500">{pilot.primaryContactEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{getTypeLabel(pilot.type)}</span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(pilot.status)}`}
                  >
                    {pilot.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {pilot.seatsUsed.toLocaleString()} / {pilot.seats.toLocaleString()}
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${(pilot.seatsUsed / pilot.seats) * 100}%` }}
                    ></div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    let textColorClass = 'text-gray-900';
                    if (pilot.daysRemaining <= 7) {
                      textColorClass = 'text-red-600';
                    } else if (pilot.daysRemaining <= 14) {
                      textColorClass = 'text-yellow-600';
                    }
                    return (
                      <span className={`text-sm font-medium ${textColorClass}`}>
                        {pilot.daysRemaining > 0 ? `${pilot.daysRemaining} days` : 'Ended'}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(pilot.endDate)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end gap-2">
                    {['ACTIVE', 'EXTENDED'].includes(pilot.status) && (
                      <>
                        <button
                          onClick={() => handleExtendPilot(pilot.id)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Extend pilot"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => handleConvertPilot(pilot.id)}
                          className="text-green-600 hover:text-green-900"
                          title="Convert to contract"
                        >
                          Convert
                        </button>
                      </>
                    )}
                    <Link
                      href={`/billing/pilots/${pilot.id}`}
                      className="text-gray-600 hover:text-gray-900"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredPilots.length === 0 && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No pilots found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No pilot programs match your current filters.
            </p>
          </div>
        )}
      </div>

      {/* Create Pilot Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <button
              type="button"
              className="fixed inset-0 w-full h-full transition-opacity bg-gray-500 bg-opacity-75 border-0 cursor-default"
              aria-label="Close modal"
              onClick={() => {
                setShowCreateModal(false);
              }}
            />

            <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">
                  Create Pilot Program
                </h3>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="pilot-name" className="block text-sm font-medium text-gray-700">
                      Program Name *
                    </label>
                    <input
                      type="text"
                      id="pilot-name"
                      value={createForm.name}
                      onChange={(e) => {
                        setCreateForm({ ...createForm, name: e.target.value });
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., North Valley USD Pilot"
                    />
                  </div>

                  <div>
                    <label htmlFor="pilot-type" className="block text-sm font-medium text-gray-700">
                      Type *
                    </label>
                    <select
                      id="pilot-type"
                      value={createForm.type}
                      onChange={(e) => {
                        setCreateForm({ ...createForm, type: e.target.value as PilotType });
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="DISTRICT_PILOT">District Pilot</option>
                      <option value="NONPROFIT_PILOT">Nonprofit Pilot</option>
                      <option value="CHARTER_PILOT">Charter Pilot</option>
                      <option value="ENTERPRISE_TRIAL">Enterprise Trial</option>
                      <option value="PROMOTIONAL">Promotional</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="pilot-seats"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Seats *
                      </label>
                      <input
                        type="number"
                        id="pilot-seats"
                        value={createForm.seats}
                        onChange={(e) => {
                          setCreateForm({ ...createForm, seats: Number(e.target.value) });
                        }}
                        min={1}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="pilot-duration"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Duration (days) *
                      </label>
                      <input
                        type="number"
                        id="pilot-duration"
                        value={createForm.durationDays}
                        onChange={(e) => {
                          setCreateForm({ ...createForm, durationDays: Number(e.target.value) });
                        }}
                        min={7}
                        max={365}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="contact-name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Primary Contact Name
                    </label>
                    <input
                      type="text"
                      id="contact-name"
                      value={createForm.primaryContactName}
                      onChange={(e) => {
                        setCreateForm({ ...createForm, primaryContactName: e.target.value });
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contact-email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Primary Contact Email
                    </label>
                    <input
                      type="email"
                      id="contact-email"
                      value={createForm.primaryContactEmail}
                      onChange={(e) => {
                        setCreateForm({ ...createForm, primaryContactEmail: e.target.value });
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="auto-convert"
                      checked={createForm.autoConvertEnabled}
                      onChange={(e) => {
                        setCreateForm({ ...createForm, autoConvertEnabled: e.target.checked });
                      }}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="auto-convert" className="ml-2 block text-sm text-gray-900">
                      Enable auto-conversion when pilot ends
                    </label>
                  </div>

                  {createForm.autoConvertEnabled && (
                    <div>
                      <label htmlFor="discount" className="block text-sm font-medium text-gray-700">
                        Conversion Discount (%)
                      </label>
                      <input
                        type="number"
                        id="discount"
                        value={createForm.conversionDiscountPct ?? ''}
                        onChange={(e) => {
                          setCreateForm({
                            ...createForm,
                            conversionDiscountPct: e.target.value ? Number(e.target.value) : null,
                          });
                        }}
                        min={0}
                        max={100}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="e.g., 10"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleCreatePilot}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                >
                  Create Pilot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                  }}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
