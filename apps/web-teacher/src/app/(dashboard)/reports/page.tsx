/**
 * Reports Page
 */

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';

const reportTypes = [
  {
    id: 'progress',
    title: 'Progress Reports',
    icon: '📈',
    description: 'Individual student progress over time',
  },
  {
    id: 'class',
    title: 'Class Summary',
    icon: '📊',
    description: 'Overall class performance and trends',
  },
  {
    id: 'missing',
    title: 'Missing Assignments',
    icon: '⚠️',
    description: 'Students with missing or late work',
  },
  { id: 'iep', title: 'IEP Progress', icon: '📋', description: 'IEP goal progress tracking' },
  {
    id: 'standards',
    title: 'Standards Mastery',
    icon: '🎯',
    description: 'Standards-based grade reports',
  },
  {
    id: 'parent',
    title: 'Parent Report Card',
    icon: '📄',
    description: 'Printable report cards for parents',
  },
];

const recentReports = [
  {
    id: '1',
    title: 'Q2 Progress Report - Emma Wilson',
    type: 'progress',
    date: '2024-12-15',
    status: 'complete',
  },
  {
    id: '2',
    title: 'Class Summary - Algebra I Period 1',
    type: 'class',
    date: '2024-12-14',
    status: 'complete',
  },
  {
    id: '3',
    title: 'Missing Assignments Report',
    type: 'missing',
    date: '2024-12-13',
    status: 'complete',
  },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate and view reports"
        actions={
          <button className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700">
            + New Report
          </button>
        }
      />

      {/* Report Types Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Link
            key={report.id}
            href={`/reports/${report.id}`}
            className="rounded-xl border bg-white p-6 transition hover:border-primary-300 hover:shadow-md"
          >
            <span className="text-3xl">{report.icon}</span>
            <h3 className="mt-3 font-semibold text-gray-900">{report.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{report.description}</p>
          </Link>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Recent Reports</h2>
        <div className="mt-4 space-y-2">
          {recentReports.map((report) => (
            <div
              key={report.id}
              className="flex items-center justify-between rounded-lg border bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-gray-100 p-2">📄</span>
                <div>
                  <p className="font-medium text-gray-900">{report.title}</p>
                  <p className="text-sm text-gray-500">Generated {report.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                  📥 Download
                </button>
                <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50">
                  🔄 Regenerate
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
