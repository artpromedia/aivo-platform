'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

import {
  type ClassroomSummaryReport,
  fetchClassroomSummary,
  getIndependenceLabelText,
  getIndependenceLabelColor,
  getBaselineStatusColor,
} from '../../../../lib/classroom-reports';

export default function ClassroomSummaryPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [report, setReport] = useState<ClassroomSummaryReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadReport() {
      if (!classroomId) return;

      setLoading(true);
      setError(null);

      try {
        const accessToken = 'demo-token'; // In production, get from auth
        const data = await fetchClassroomSummary(classroomId, accessToken);
        setReport(data);
      } catch (err) {
        console.error('Failed to load classroom summary:', err);
        setError('Failed to load summary. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    void loadReport();
  }, [classroomId]);

  const handlePrint = () => {
    window.print();
  };

  if (!classroomId) {
    return (
      <div className="p-6">
        <div className="text-red-600">No classroom ID provided</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">{error}</div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <>
      {/* Print styles - using inline styles for print media */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-section,
          .print-section * {
            visibility: visible;
          }
          .print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="p-6 max-w-7xl mx-auto print-section" ref={printRef}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.classroomName}</h1>
            <p className="text-gray-500">
              Summary Report • Last {report.reportPeriodDays} days •{' '}
              {new Date(report.generatedAt).toLocaleDateString()}
            </p>
          </div>
          <button
            onClick={handlePrint}
            className="no-print flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Report
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <SummaryCard
            title="Baseline Completion"
            value={`${report.baseline.completionRate}%`}
            subtitle={`${report.baseline.baselineCompleted} of ${report.baseline.totalLearners} complete`}
            icon="📊"
            color="blue"
          />
          <SummaryCard
            title="Active Goals"
            value={report.goals.statusDistribution.active.toString()}
            subtitle={`${report.goals.avgGoalsPerLearner.toFixed(1)} avg per learner`}
            icon="🎯"
            color="green"
          />
          <SummaryCard
            title="Homework Engagement"
            value={`${report.homework.learnersWithHomework}`}
            subtitle={`${report.homework.avgSessionsPerWeekPerLearner.toFixed(1)} sessions/week avg`}
            icon="📚"
            color="orange"
          />
          <SummaryCard
            title="Focus Sessions"
            value={report.focus.totalSessions.toString()}
            subtitle={`${report.focus.avgBreaksPerSession.toFixed(1)} breaks/session avg`}
            icon="🧘"
            color="purple"
          />
        </div>

        {/* Detailed Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Goals Distribution */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Goals Status Distribution</h2>
            <div className="space-y-3">
              <ProgressBar
                label="Active"
                value={report.goals.statusDistribution.active}
                total={report.goals.totalGoals}
                color="bg-blue-500"
              />
              <ProgressBar
                label="Completed"
                value={report.goals.statusDistribution.completed}
                total={report.goals.totalGoals}
                color="bg-green-500"
              />
              <ProgressBar
                label="On Hold"
                value={report.goals.statusDistribution.onHold}
                total={report.goals.totalGoals}
                color="bg-yellow-500"
              />
              <ProgressBar
                label="Draft"
                value={report.goals.statusDistribution.draft}
                total={report.goals.totalGoals}
                color="bg-gray-400"
              />
            </div>
          </div>

          {/* Independence Distribution */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Independence Distribution</h2>
            <div className="space-y-3">
              <ProgressBar
                label="Mostly Independent"
                value={report.homework.independenceDistribution.mostlyIndependent}
                total={report.baseline.totalLearners}
                color="bg-green-500"
              />
              <ProgressBar
                label="Building Independence"
                value={report.homework.independenceDistribution.buildingIndependence}
                total={report.baseline.totalLearners}
                color="bg-blue-500"
              />
              <ProgressBar
                label="Needs Support"
                value={report.homework.independenceDistribution.needsSupport}
                total={report.baseline.totalLearners}
                color="bg-orange-500"
              />
            </div>
          </div>
        </div>

        {/* Learner Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Learner Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Learner</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Baseline
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Active Goals
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">
                    Homework/Week
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    Independence
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {report.learners.map((learner) => (
                  <tr key={learner.learnerId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {learner.learnerName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getBaselineStatusColor(learner.baselineStatus)}`}
                      >
                        {learner.baselineStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {learner.activeGoalsCount}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-700">
                      {learner.homeworkSessionsThisWeek.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getIndependenceLabelColor(learner.independenceLabel)}`}
                      >
                        {getIndependenceLabelText(learner.independenceLabel)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Print footer */}
        <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-gray-500">
          <p>Generated by Aivo Platform • {new Date().toLocaleDateString()}</p>
          <p className="mt-1">
            For PDF export: Consider using a browser-based PDF rendering service (e.g., Puppeteer)
            to convert this HTML to PDF programmatically.
          </p>
        </div>
      </div>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  color: 'blue' | 'green' | 'orange' | 'purple';
}

function SummaryCard({ title, value, subtitle, icon, color }: SummaryCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200',
    green: 'bg-green-50 border-green-200',
    orange: 'bg-orange-50 border-orange-200',
    purple: 'bg-purple-50 border-purple-200',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-medium text-gray-600">{title}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

interface ProgressBarProps {
  label: string;
  value: number;
  total: number;
  color: string;
}

function ProgressBar({ label, value, total, color }: ProgressBarProps) {
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
