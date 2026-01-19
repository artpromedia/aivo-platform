/**
 * District Analytics Dashboard Page
 *
 * Comprehensive analytics view for district administrators with:
 * - Cross-school performance comparison
 * - Detailed metrics and trends
 * - Resource allocation overview
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Calendar, RefreshCw } from 'lucide-react';
import { CrossSchoolAnalytics } from '../components/cross-school-analytics';
import { ResourceAllocation } from '../components/resource-allocation';
import { ComplianceReports } from '../components/compliance-reports';

export default function AnalyticsPage() {
  const [activeSection, setActiveSection] = useState<'performance' | 'resources' | 'compliance'>('performance');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsExporting(false);
  };

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">District Analytics</h1>
            <p className="text-sm text-gray-500">
              Comprehensive analytics and performance metrics across all schools
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none"
            >
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Export All
          </button>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        {[
          { id: 'performance', label: 'Performance Analytics' },
          { id: 'resources', label: 'Resource Allocation' },
          { id: 'compliance', label: 'Compliance Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as typeof activeSection)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeSection === tab.id
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeSection === 'performance' && (
        <CrossSchoolAnalytics
          data={null}
          onRefresh={() => console.log('Refreshing analytics...')}
          onExport={() => console.log('Exporting analytics...')}
        />
      )}

      {activeSection === 'resources' && (
        <ResourceAllocation
          onAllocate={(schoolId, type, amount) => console.log('Allocating:', { schoolId, type, amount })}
          onApproveRequest={(id) => console.log('Approving request:', id)}
          onDenyRequest={(id) => console.log('Denying request:', id)}
        />
      )}

      {activeSection === 'compliance' && (
        <ComplianceReports
          onGenerateReport={(type) => console.log('Generating report:', type)}
          onViewReport={(id) => console.log('Viewing report:', id)}
          onDownloadReport={(id) => console.log('Downloading report:', id)}
        />
      )}
    </section>
  );
}
