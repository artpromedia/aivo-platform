/**
 * System Health Component
 *
 * Displays health status of platform services.
 */

'use client';

import * as React from 'react';

import type { ServiceHealth } from '../../../lib/api/dashboard';

type HealthStatus = 'healthy' | 'degraded' | 'down';

const statusConfig: Record<HealthStatus, { label: string; className: string; dotClass: string }> = {
  healthy: { label: 'Healthy', className: 'text-green-700', dotClass: 'bg-green-500' },
  degraded: { label: 'Degraded', className: 'text-amber-700', dotClass: 'bg-amber-500' },
  down: { label: 'Down', className: 'text-red-700', dotClass: 'bg-red-500' },
};

export function SystemHealth() {
  const [services, setServices] = React.useState<ServiceHealth[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | HealthStatus>('all');

  React.useEffect(() => {
    async function loadHealth() {
      try {
        const response = await fetch('/api/dashboard/health');
        if (!response.ok) {
          throw new Error('Failed to fetch service health');
        }
        const data = (await response.json()) as ServiceHealth[];
        setServices(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load health data');
      } finally {
        setIsLoading(false);
      }
    }

    void loadHealth();
    // Refresh every 10 seconds for real-time monitoring
    const interval = setInterval(() => void loadHealth(), 10000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const filteredServices = services.filter((s) => filter === 'all' || s.status === filter);

  const healthCounts = {
    healthy: services.filter((s) => s.status === 'healthy').length,
    degraded: services.filter((s) => s.status === 'degraded').length,
    down: services.filter((s) => s.status === 'down').length,
  };

  const overallStatus: HealthStatus =
    healthCounts.down > 0 ? 'down' : healthCounts.degraded > 0 ? 'degraded' : 'healthy';

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">System Health</h3>
        <div className="mt-4 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">System Health</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900">System Health</h3>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              overallStatus === 'healthy'
                ? 'bg-green-100 text-green-700'
                : overallStatus === 'degraded'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig[overallStatus].dotClass}`} />
            {statusConfig[overallStatus].label}
          </span>
        </div>
        <select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as 'all' | HealthStatus);
          }}
          className="rounded-md border-gray-300 text-sm"
        >
          <option value="all">All Services ({services.length})</option>
          <option value="healthy">Healthy ({healthCounts.healthy})</option>
          <option value="degraded">Degraded ({healthCounts.degraded})</option>
          <option value="down">Down ({healthCounts.down})</option>
        </select>
      </div>

      <div className="max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Uptime</th>
              <th className="px-4 py-3">Last Check</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredServices.map((service) => (
              <tr key={service.name} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{service.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm ${
                      statusConfig[service.status].className
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${statusConfig[service.status].dotClass}`}
                    />
                    {statusConfig[service.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {service.latency !== undefined ? (
                    <span
                      className={
                        service.latency > 100
                          ? 'text-amber-600'
                          : service.latency > 200
                            ? 'text-red-600'
                            : ''
                      }
                    >
                      {service.latency}ms
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{service.uptime}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{service.lastCheck}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
