/**
 * Enrollment Stats Component
 *
 * Displays key metrics for district license enrollment and parent invitations.
 */

'use client';

import * as React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  color?: 'blue' | 'green' | 'amber' | 'purple';
}

function StatCard({ label, value, subtext, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    amber: 'bg-amber-50 border-amber-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-500',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm ${trendColors[trend.direction]}`}>
            {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}
            {trend.value}%
          </span>
        )}
      </div>
      {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
    </div>
  );
}

// Mock data - would come from API
const mockStats = {
  totalSeats: 500,
  usedSeats: 342,
  availableSeats: 158,
  enrolledLearners: 342,
  parentInvitesSent: 298,
  parentInvitesAccepted: 245,
  teacherAssignments: 28,
  pendingBatches: 2,
};

export function EnrollmentStats() {
  const [stats, _setStats] = React.useState(mockStats);
  const [isLoading, setIsLoading] = React.useState(false);

  // Refresh stats from API
  const refreshStats = React.useCallback(async () => {
    setIsLoading(true);
    // API call would go here - would use _setStats to update
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    void refreshStats();
  }, [refreshStats]);

  const seatUtilization = Math.round((stats.usedSeats / stats.totalSeats) * 100);
  const inviteAcceptanceRate = Math.round(
    (stats.parentInvitesAccepted / stats.parentInvitesSent) * 100
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Enrollment Overview</h2>
        <button
          onClick={() => {
            void refreshStats();
          }}
          disabled={isLoading}
          className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Seat Utilization"
          value={`${seatUtilization}%`}
          subtext={`${stats.usedSeats} of ${stats.totalSeats} seats used`}
          color="blue"
        />
        <StatCard
          label="Available Seats"
          value={stats.availableSeats}
          subtext="Ready for enrollment"
          color="green"
        />
        <StatCard
          label="Parent Invite Rate"
          value={`${inviteAcceptanceRate}%`}
          subtext={`${stats.parentInvitesAccepted} of ${stats.parentInvitesSent} accepted`}
          trend={{ value: 5, direction: 'up' }}
          color="purple"
        />
        <StatCard
          label="Pending Batches"
          value={stats.pendingBatches}
          subtext="Awaiting processing"
          color="amber"
        />
      </div>

      {/* License Pool Summary */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-medium text-gray-900">License Pool Summary</h3>
        <div className="mt-3">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-gray-600">Seat allocation</span>
            <span className="font-medium">
              {stats.usedSeats} / {stats.totalSeats}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${seatUtilization}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="font-semibold text-gray-900">{stats.enrolledLearners}</p>
              <p className="text-gray-500">Learners</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{stats.parentInvitesAccepted}</p>
              <p className="text-gray-500">Parents</p>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{stats.teacherAssignments}</p>
              <p className="text-gray-500">Teachers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
