/**
 * Recent Activity Component
 *
 * Shows recent platform-wide activity and events.
 */

'use client';

import * as React from 'react';

import type { ActivityEvent } from '../../../lib/api/dashboard';

type ActivityType = 'tenant' | 'user' | 'integration' | 'billing' | 'security' | 'system';

interface Activity extends Omit<ActivityEvent, 'severity' | 'metadata'> {
  actor?: string;
}

const typeConfig: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
  tenant: {
    icon: <BuildingIcon />,
    color: 'bg-blue-100 text-blue-600',
  },
  user: {
    icon: <UserIcon />,
    color: 'bg-green-100 text-green-600',
  },
  integration: {
    icon: <LinkIcon />,
    color: 'bg-purple-100 text-purple-600',
  },
  billing: {
    icon: <CreditCardIcon />,
    color: 'bg-amber-100 text-amber-600',
  },
  security: {
    icon: <ShieldIcon />,
    color: 'bg-red-100 text-red-600',
  },
  system: {
    icon: <ServerIcon />,
    color: 'bg-gray-100 text-gray-600',
  },
};

export function RecentActivity() {
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadActivities() {
      try {
        const response = await fetch('/api/dashboard/activity');
        if (!response.ok) {
          throw new Error('Failed to fetch activity');
        }
        const data = (await response.json()) as Activity[];
        setActivities(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load activity');
      } finally {
        setIsLoading(false);
      }
    }

    void loadActivities();
    // Refresh every 30 seconds
    const interval = setInterval(() => void loadActivities(), 30000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        <div className="mt-4 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">Recent Activity</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
      </div>

      <div className="divide-y divide-gray-100">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 px-4 py-3 hover:bg-gray-50">
            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                typeConfig[activity.type].color
              }`}
            >
              {typeConfig[activity.type].icon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{activity.title}</span>
                <span className="text-xs text-gray-500">{activity.timestamp}</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">{activity.description}</p>
              {activity.actor && (
                <p className="mt-0.5 text-xs text-gray-400">by {activity.actor}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Icons
function BuildingIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
      />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}
