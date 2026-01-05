/**
 * Integration Status Component
 *
 * Shows status of external integrations (Ed-Fi, SCIM, LMS, SIS).
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import type { IntegrationStatus as IntegrationType } from '../../../lib/api/dashboard';

type IntegrationStatusType = 'active' | 'syncing' | 'error' | 'inactive';

const statusConfig: Record<IntegrationStatusType, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700' },
  syncing: { label: 'Syncing', className: 'bg-blue-100 text-blue-700' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700' },
  inactive: { label: 'Inactive', className: 'bg-gray-100 text-gray-700' },
};

const typeLabels: Record<string, string> = {
  edfi: 'State Reporting',
  scim: 'User Provisioning',
  lms: 'LMS Integration',
  sis: 'SIS Sync',
};

export function IntegrationStatus() {
  const [integrations, setIntegrations] = React.useState<IntegrationType[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadIntegrations() {
      try {
        const response = await fetch('/api/dashboard/integrations');
        if (!response.ok) {
          throw new Error('Failed to fetch integration status');
        }
        const data = (await response.json()) as IntegrationType[];
        setIntegrations(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load integrations');
      } finally {
        setIsLoading(false);
      }
    }

    void loadIntegrations();
    // Refresh every 30 seconds
    const interval = setInterval(() => void loadIntegrations(), 30000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const statusCounts = {
    active: integrations.filter((i) => i.status === 'active').length,
    syncing: integrations.filter((i) => i.status === 'syncing').length,
    error: integrations.filter((i) => i.status === 'error').length,
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="font-semibold text-gray-900">Integration Status</h3>
        <div className="mt-4 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <h3 className="font-semibold text-red-900">Integration Status</h3>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 p-4">
        <div>
          <h3 className="font-semibold text-gray-900">Integration Status</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            {statusCounts.active} active, {statusCounts.syncing} syncing
            {statusCounts.error > 0 && (
              <span className="text-red-600"> , {statusCounts.error} with errors</span>
            )}
          </p>
        </div>
        <Link
          href="/integrations"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Manage
        </Link>
      </div>

      <div className="divide-y divide-gray-100">
        {integrations.map((integration) => (
          <div
            key={integration.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{integration.name}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    statusConfig[integration.status].className
                  }`}
                >
                  {statusConfig[integration.status].label}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                <span>{typeLabels[integration.type]}</span>
                <span>{integration.tenantsUsing} tenants</span>
                {integration.lastSync && <span>Last: {integration.lastSync}</span>}
              </div>
            </div>

            {integration.errorCount && integration.errorCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                {integration.errorCount} errors
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total integrations: {integrations.length}</span>
          <Link href="/integrations/new" className="font-medium text-blue-600 hover:text-blue-700">
            + Add Integration
          </Link>
        </div>
      </div>
    </div>
  );
}
