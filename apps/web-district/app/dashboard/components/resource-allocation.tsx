/**
 * Resource Allocation Component
 *
 * Manages and displays resource allocation across the district:
 * - License distribution by school
 * - Budget allocation and spending
 * - Device and seat management
 * - Resource request handling
 */

'use client';

import {
  DollarSign,
  Users,
  Laptop,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Plus,
  Settings,
  RefreshCw,
  ArrowRight,
  Building2,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export interface SchoolResource {
  id: string;
  name: string;
  licensesAllocated: number;
  licensesUsed: number;
  budgetAllocated: number;
  budgetSpent: number;
  devicesAllocated: number;
  devicesActive: number;
}

export interface ResourceRequest {
  id: string;
  schoolId: string;
  schoolName: string;
  type: 'licenses' | 'budget' | 'devices';
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  requestedAt: string;
  requestedBy: string;
}

interface ResourceAllocationProps {
  districtId?: string;
  schools?: SchoolResource[];
  requests?: ResourceRequest[];
  totalLicenses?: number;
  totalBudget?: number;
  totalDevices?: number;
  onAllocate?: (schoolId: string, type: string, amount: number) => void;
  onApproveRequest?: (requestId: string) => void;
  onDenyRequest?: (requestId: string) => void;
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#6366f1'];

export function ResourceAllocation({
  districtId,
  schools = [],
  requests = [],
  totalLicenses = 0,
  totalBudget = 0,
  totalDevices = 0,
  onAllocate,
  onApproveRequest,
  onDenyRequest,
}: ResourceAllocationProps) {
  const [activeView, setActiveView] = useState<
    'overview' | 'licenses' | 'budget' | 'devices' | 'requests'
  >('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate totals
  const totals = useMemo(() => {
    return schools.reduce(
      (acc, school) => ({
        licensesAllocated: acc.licensesAllocated + school.licensesAllocated,
        licensesUsed: acc.licensesUsed + school.licensesUsed,
        budgetAllocated: acc.budgetAllocated + school.budgetAllocated,
        budgetSpent: acc.budgetSpent + school.budgetSpent,
        devicesAllocated: acc.devicesAllocated + school.devicesAllocated,
        devicesActive: acc.devicesActive + school.devicesActive,
      }),
      {
        licensesAllocated: 0,
        licensesUsed: 0,
        budgetAllocated: 0,
        budgetSpent: 0,
        devicesAllocated: 0,
        devicesActive: 0,
      }
    );
  }, [schools]);

  // Pie chart data for license distribution
  const licensesPieData = useMemo(() => {
    return schools.map((school) => ({
      name: school.name,
      value: school.licensesAllocated,
    }));
  }, [schools]);

  // Bar chart data for budget
  const budgetBarData = useMemo(() => {
    return schools.map((school) => ({
      name: school.name.split(' ')[0],
      allocated: school.budgetAllocated / 1000,
      spent: school.budgetSpent / 1000,
    }));
  }, [schools]);

  const pendingRequests = requests.filter((r) => r.status === 'pending');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getUsageColor = (used: number, allocated: number) => {
    const pct = (used / allocated) * 100;
    if (pct >= 95) return 'text-red-600';
    if (pct >= 80) return 'text-amber-600';
    return 'text-green-600';
  };

  const getUsageBarColor = (used: number, allocated: number) => {
    const pct = (used / allocated) * 100;
    if (pct >= 95) return 'bg-red-500';
    if (pct >= 80) return 'bg-amber-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Resource Allocation</h2>
              <p className="text-sm text-gray-500">
                Manage licenses, budgets, and devices across schools
              </p>
            </div>
          </div>
          {pendingRequests.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* View Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'licenses', label: 'Licenses' },
            { id: 'budget', label: 'Budget' },
            { id: 'devices', label: 'Devices' },
            {
              id: 'requests',
              label: `Requests${pendingRequests.length > 0 ? ` (${pendingRequests.length})` : ''}`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveView(tab.id as typeof activeView);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeView === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeView === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="w-5 h-5 text-purple-600" />
                  <span className="font-semibold text-gray-900">Licenses</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {totals.licensesUsed.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    / {totalLicenses.toLocaleString()}
                  </span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(totals.licensesUsed / totalLicenses) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(totalLicenses - totals.licensesUsed).toLocaleString()} available
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                <div className="flex items-center gap-3 mb-3">
                  <DollarSign className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-gray-900">Budget</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(totals.budgetSpent)}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    / {formatCurrency(totalBudget)}
                  </span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(totals.budgetSpent / totalBudget) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {formatCurrency(totalBudget - totals.budgetSpent)} remaining
                </p>
              </div>

              <div className="p-4 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl border border-cyan-200">
                <div className="flex items-center gap-3 mb-3">
                  <Laptop className="w-5 h-5 text-cyan-600" />
                  <span className="font-semibold text-gray-900">Devices</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {totals.devicesActive.toLocaleString()}{' '}
                  <span className="text-sm font-normal text-gray-500">
                    / {totalDevices.toLocaleString()}
                  </span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${(totals.devicesActive / totalDevices) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {(totalDevices - totals.devicesActive).toLocaleString()} available
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">License Distribution</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={licensesPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {licensesPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget by School (K)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${v}K`} />
                      <Tooltip formatter={(value: number) => [`$${value}K`, '']} />
                      <Legend />
                      <Bar
                        dataKey="allocated"
                        name="Allocated"
                        fill="#94a3b8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar dataKey="spent" name="Spent" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'licenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Total: {totals.licensesUsed.toLocaleString()} used of{' '}
                {totalLicenses.toLocaleString()} (
                {(totalLicenses - totals.licensesAllocated).toLocaleString()} unallocated)
              </p>
              <button
                onClick={() => onAllocate?.('', 'licenses', 0)}
                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Allocate Licenses
              </button>
            </div>

            {schools.map((school) => (
              <div
                key={school.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-900">{school.name}</span>
                  </div>
                  <span
                    className={`font-semibold ${getUsageColor(school.licensesUsed, school.licensesAllocated)}`}
                  >
                    {school.licensesUsed} / {school.licensesAllocated}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getUsageBarColor(school.licensesUsed, school.licensesAllocated)}`}
                    style={{ width: `${(school.licensesUsed / school.licensesAllocated) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((school.licensesUsed / school.licensesAllocated) * 100)}% utilized •{' '}
                  {school.licensesAllocated - school.licensesUsed} available
                </p>
              </div>
            ))}
          </div>
        )}

        {activeView === 'budget' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Total: {formatCurrency(totals.budgetSpent)} spent of {formatCurrency(totalBudget)} (
                {formatCurrency(totalBudget - totals.budgetAllocated)} unallocated)
              </p>
              <button
                onClick={() => onAllocate?.('', 'budget', 0)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Allocate Budget
              </button>
            </div>

            {schools.map((school) => (
              <div
                key={school.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-900">{school.name}</span>
                  </div>
                  <span
                    className={`font-semibold ${getUsageColor(school.budgetSpent, school.budgetAllocated)}`}
                  >
                    {formatCurrency(school.budgetSpent)} / {formatCurrency(school.budgetAllocated)}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getUsageBarColor(school.budgetSpent, school.budgetAllocated)}`}
                    style={{ width: `${(school.budgetSpent / school.budgetAllocated) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((school.budgetSpent / school.budgetAllocated) * 100)}% spent •{' '}
                  {formatCurrency(school.budgetAllocated - school.budgetSpent)} remaining
                </p>
              </div>
            ))}
          </div>
        )}

        {activeView === 'devices' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Total: {totals.devicesActive.toLocaleString()} active of{' '}
                {totalDevices.toLocaleString()} (
                {(totalDevices - totals.devicesAllocated).toLocaleString()} unallocated)
              </p>
              <button
                onClick={() => onAllocate?.('', 'devices', 0)}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Allocate Devices
              </button>
            </div>

            {schools.map((school) => (
              <div
                key={school.id}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold text-gray-900">{school.name}</span>
                  </div>
                  <span
                    className={`font-semibold ${getUsageColor(school.devicesActive, school.devicesAllocated)}`}
                  >
                    {school.devicesActive} / {school.devicesAllocated}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getUsageBarColor(school.devicesActive, school.devicesAllocated)}`}
                    style={{ width: `${(school.devicesActive / school.devicesAllocated) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round((school.devicesActive / school.devicesAllocated) * 100)}% active •{' '}
                  {school.devicesAllocated - school.devicesActive} available
                </p>
              </div>
            ))}
          </div>
        )}

        {activeView === 'requests' && (
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No resource requests</p>
              </div>
            ) : (
              requests.map((request) => (
                <div key={request.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{request.schoolName}</span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                            request.type === 'licenses'
                              ? 'bg-purple-100 text-purple-700'
                              : request.type === 'budget'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-cyan-100 text-cyan-700'
                          }`}
                        >
                          {request.type}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${
                            request.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : request.status === 'approved'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Requesting{' '}
                        {request.type === 'budget'
                          ? formatCurrency(request.amount)
                          : request.amount}{' '}
                        {request.type !== 'budget' ? request.type : ''}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">{request.reason}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatDate(request.requestedAt)} by {request.requestedBy}
                      </p>
                    </div>
                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onApproveRequest?.(request.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onDenyRequest?.(request.id)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ResourceAllocation;
