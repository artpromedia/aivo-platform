/**
 * Integration Status Component
 *
 * Shows status of external integrations (Ed-Fi, SCIM, LMS, SIS).
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

type IntegrationStatusType = 'active' | 'syncing' | 'error' | 'inactive';

interface Integration {
  id: string;
  name: string;
  type: 'edfi' | 'scim' | 'lms' | 'sis';
  status: IntegrationStatusType;
  lastSync?: string;
  tenantsUsing: number;
  errorCount?: number;
}

// Mock data
const mockIntegrations: Integration[] = [
  {
    id: 'edfi-1',
    name: 'Ed-Fi State Reporting',
    type: 'edfi',
    status: 'active',
    lastSync: '15 min ago',
    tenantsUsing: 127,
  },
  {
    id: 'scim-1',
    name: 'SCIM User Provisioning',
    type: 'scim',
    status: 'active',
    lastSync: '2 min ago',
    tenantsUsing: 89,
  },
  {
    id: 'sis-clever',
    name: 'Clever SIS Sync',
    type: 'sis',
    status: 'syncing',
    lastSync: 'In progress',
    tenantsUsing: 312,
  },
  {
    id: 'sis-classlink',
    name: 'ClassLink Roster',
    type: 'sis',
    status: 'active',
    lastSync: '1 hour ago',
    tenantsUsing: 156,
  },
  {
    id: 'lms-canvas',
    name: 'Canvas LTI',
    type: 'lms',
    status: 'active',
    lastSync: '5 min ago',
    tenantsUsing: 423,
  },
  {
    id: 'lms-google',
    name: 'Google Classroom',
    type: 'lms',
    status: 'error',
    lastSync: '2 hours ago',
    tenantsUsing: 178,
    errorCount: 3,
  },
];

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
  const [integrations] = React.useState(mockIntegrations);

  const statusCounts = {
    active: integrations.filter((i) => i.status === 'active').length,
    syncing: integrations.filter((i) => i.status === 'syncing').length,
    error: integrations.filter((i) => i.status === 'error').length,
  };

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
