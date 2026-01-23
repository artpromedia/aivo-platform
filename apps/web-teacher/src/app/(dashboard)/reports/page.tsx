/**
 * Reports Page
 */

'use client';

import Link from 'next/link';
import * as React from 'react';

import { PageHeader } from '@/components/layout/breadcrumb';
import { reportsApi } from '@/lib/api';
import type { ReportResult } from '@/lib/types';

// Static report type configuration
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

export default function ReportsPage() {
  const [recentReports, setRecentReports] = React.useState<ReportResult[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const fetchRecentReports = async () => {
      setLoading(true);
      try {
        const reports = await reportsApi.listRecent({ limit: 5 });
        setRecentReports(reports);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch reports'));
      } finally {
        setLoading(false);
      }
    };
    void fetchRecentReports();
  }, []);

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
        {loading ? (
          <div className="mt-4 flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
            <span className="ml-2 text-sm text-gray-500">Loading recent reports...</span>
          </div>
        ) : error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        ) : recentReports.length === 0 ? (
          <div className="mt-4 rounded-lg border bg-white p-6 text-center">
            <p className="text-gray-500">No reports generated yet.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between rounded-lg border bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-gray-100 p-2">📄</span>
                  <div>
                    <p className="font-medium text-gray-900">{report.title ?? 'Report'}</p>
                    <p className="text-sm text-gray-500">
                      Generated{' '}
                      {new Date(
                        String(report.generatedAt ?? report.createdAt)
                      ).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => void reportsApi.download(report.id)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    📥 Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
