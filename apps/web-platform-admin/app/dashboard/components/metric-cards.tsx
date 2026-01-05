/**
 * Metric Cards Component
 *
 * Displays key platform metrics at a glance.
 */

'use client';

import * as React from 'react';

interface MetricCard {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'purple' | 'amber';
}

// Mock data - would come from API
const mockMetrics: MetricCard[] = [
  {
    label: 'Total Tenants',
    value: 847,
    change: { value: 12, trend: 'up' },
    icon: <BuildingIcon />,
    color: 'blue',
  },
  {
    label: 'Active Learners',
    value: '1.2M',
    change: { value: 8.5, trend: 'up' },
    icon: <UsersIcon />,
    color: 'green',
  },
  {
    label: 'Sessions Today',
    value: '45.2K',
    change: { value: 3.2, trend: 'up' },
    icon: <ActivityIcon />,
    color: 'purple',
  },
  {
    label: 'API Requests (24h)',
    value: '8.4M',
    change: { value: 2.1, trend: 'down' },
    icon: <ServerIcon />,
    color: 'amber',
  },
];

const colorClasses = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  green: 'bg-green-50 text-green-600 border-green-200',
  purple: 'bg-purple-50 text-purple-600 border-purple-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
};

const iconBgClasses = {
  blue: 'bg-blue-100',
  green: 'bg-green-100',
  purple: 'bg-purple-100',
  amber: 'bg-amber-100',
};

export function MetricCards() {
  const [metrics, setMetrics] = React.useState(mockMetrics);
  const [_isLoading, setIsLoading] = React.useState(false);

  // Simulate data refresh
  React.useEffect(() => {
    const interval = setInterval(() => {
      setIsLoading(true);
      setTimeout(() => {
        setMetrics((prev) =>
          prev.map((m) => ({
            ...m,
            // Simulate small value changes
            change: m.change
              ? {
                  ...m.change,
                  value: Math.max(0, m.change.value + (Math.random() - 0.5) * 2),
                }
              : undefined,
          }))
        );
        setIsLoading(false);
      }, 500);
    }, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label} className={`rounded-lg border p-4 ${colorClasses[metric.color]}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium opacity-80">{metric.label}</span>
            <div className={`rounded-full p-2 ${iconBgClasses[metric.color]}`}>{metric.icon}</div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{metric.value}</span>
            {metric.change && (
              <span
                className={`text-sm font-medium ${
                  metric.change.trend === 'up'
                    ? 'text-green-600'
                    : metric.change.trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-500'
                }`}
              >
                {metric.change.trend === 'up' ? '+' : metric.change.trend === 'down' ? '-' : ''}
                {metric.change.value.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple icons
function BuildingIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
      />
    </svg>
  );
}
