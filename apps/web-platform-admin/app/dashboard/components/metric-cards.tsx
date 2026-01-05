/**
 * Metric Cards Component
 *
 * Displays key platform metrics at a glance.
 */

'use client';

import * as React from 'react';

import type { PlatformMetrics } from '../../../lib/api/dashboard';

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

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

function metricsToCards(metrics: PlatformMetrics): MetricCard[] {
  return [
    {
      label: 'Total Tenants',
      value: formatNumber(metrics.activeTenants.value),
      change: {
        value: Math.abs(metrics.activeTenants.change),
        trend:
          metrics.activeTenants.change > 0
            ? 'up'
            : metrics.activeTenants.change < 0
              ? 'down'
              : 'neutral',
      },
      icon: <BuildingIcon />,
      color: 'blue',
    },
    {
      label: 'Active Learners',
      value: formatNumber(metrics.totalLearners.value),
      change: {
        value: Math.abs(metrics.totalLearners.change),
        trend:
          metrics.totalLearners.change > 0
            ? 'up'
            : metrics.totalLearners.change < 0
              ? 'down'
              : 'neutral',
      },
      icon: <UsersIcon />,
      color: 'green',
    },
    {
      label: 'Sessions Today',
      value: formatNumber(metrics.activeSessions.value),
      change: {
        value: Math.abs(metrics.activeSessions.change),
        trend:
          metrics.activeSessions.change > 0
            ? 'up'
            : metrics.activeSessions.change < 0
              ? 'down'
              : 'neutral',
      },
      icon: <ActivityIcon />,
      color: 'purple',
    },
    {
      label: 'API Requests (24h)',
      value: formatNumber(metrics.apiRequests.value),
      change: {
        value: Math.abs(metrics.apiRequests.change),
        trend:
          metrics.apiRequests.change > 0
            ? 'up'
            : metrics.apiRequests.change < 0
              ? 'down'
              : 'neutral',
      },
      icon: <ServerIcon />,
      color: 'amber',
    },
  ];
}

export function MetricCards() {
  const [metrics, setMetrics] = React.useState<MetricCard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchMetrics = React.useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard/metrics');
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      const data = (await response.json()) as PlatformMetrics;
      setMetrics(metricsToCards(data));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Keep existing metrics on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchMetrics();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchMetrics();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchMetrics]);

  if (isLoading && metrics.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
    );
  }

  if (error && metrics.length === 0) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
        Failed to load metrics: {error}
      </div>
    );
  }

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
