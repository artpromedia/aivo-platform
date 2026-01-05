/**
 * Quick Actions Component
 *
 * Provides quick access to common admin actions.
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

interface QuickAction {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
}

const actions: QuickAction[] = [
  {
    label: 'Add Tenant',
    description: 'Onboard a new district',
    href: '/tenants/new',
    icon: <PlusIcon />,
    color: 'bg-blue-50 text-blue-600 hover:bg-blue-100',
  },
  {
    label: 'Run Ed-Fi Export',
    description: 'Trigger state reporting',
    href: '/integrations/edfi',
    icon: <UploadIcon />,
    color: 'bg-green-50 text-green-600 hover:bg-green-100',
  },
  {
    label: 'View Incidents',
    description: 'AI safety incidents',
    href: '/ai/incidents',
    icon: <AlertIcon />,
    color: 'bg-amber-50 text-amber-600 hover:bg-amber-100',
  },
  {
    label: 'Compliance Report',
    description: 'Generate SOC 2 report',
    href: '/compliance/reports',
    icon: <DocumentIcon />,
    color: 'bg-purple-50 text-purple-600 hover:bg-purple-100',
  },
  {
    label: 'System Logs',
    description: 'View audit trail',
    href: '/audit',
    icon: <TerminalIcon />,
    color: 'bg-gray-50 text-gray-600 hover:bg-gray-100',
  },
];

export function QuickActions() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="border-b border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900">Quick Actions</h3>
      </div>

      <div className="divide-y divide-gray-100">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 px-4 py-3 transition hover:bg-gray-50"
          >
            <div className={`rounded-lg p-2 ${action.color}`}>{action.icon}</div>
            <div>
              <div className="text-sm font-medium text-gray-900">{action.label}</div>
              <div className="text-xs text-gray-500">{action.description}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Icons
function PlusIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function TerminalIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}
