'use client';

import {
  FileText,
  ChevronLeft,
  Loader2,
  AlertTriangle,
  Users,
  Download,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';

// Report Components
import {
  DetailedProgressReport,
  AssessmentHistory,
  StrengthWeaknessAnalysis,
  TimeOnTaskReport,
  SubjectMasteryReport,
  PDFExport,
  ProgressChart,
  SubjectSummaryGrid,
  TimelineView,
  ReportFilters,
  getDateRangeFromPreset,
} from '@/components/reports';
import type { DateRangePreset } from '@/components/reports';
// Hooks - Sprint 1.7: Using new report hooks (Sprint 4.1: Removed legacy mock hooks)
import {
  useProgressSummary,
  useReportActivityTimeline,
  usePDFExport,
  useCSVExport,
  useParentProfile,
  useProgressReport,
  useChildrenEnhanced,
} from '@/hooks';
import { isDevMode } from '@/lib/api/client';
import { adaptProgressReport, isApiProgressReport } from '@/lib/adapters/progress-report.adapter';

// Child selector component for reports
interface ChildSelectorProps {
  childrenList: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    grade?: string;
    gradeLevel?: string;
    avatar?: string;
  }[];
  selected: {
    id: string;
    name: string;
    firstName?: string;
    lastName?: string;
    grade?: string;
    gradeLevel?: string;
  } | null;
  onChange: (child: { id: string; name: string }) => void;
}

function ChildSelector({ childrenList, selected, onChange }: ChildSelectorProps) {
  if (childrenList.length === 0) {
    return null;
  }

  if (childrenList.length === 1) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
          {childrenList[0].firstName?.[0] || childrenList[0].name[0]}
        </div>
        <div>
          <p className="font-medium text-gray-900">{childrenList[0].name}</p>
          <p className="text-xs text-gray-500">
            Grade {childrenList[0].grade || childrenList[0].gradeLevel}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={selected?.id || ''}
        onChange={(e) => {
          const child = childrenList.find((c) => c.id === e.target.value);
          if (child) {
            onChange({ id: child.id, name: child.name });
          }
        }}
        className="appearance-none px-4 py-2 pr-10 border-2 border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-medium text-gray-900 cursor-pointer"
      >
        <option value="" disabled>
          Select a child
        </option>
        {childrenList.map((child) => (
          <option key={child.id} value={child.id}>
            {child.name} (Grade {child.grade || child.gradeLevel})
          </option>
        ))}
      </select>
      <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState<{ id: string; name: string } | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last30');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    getDateRangeFromPreset('last30')
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'timeline'>('overview');

  // Data hooks - existing
  const { data: profile, isLoading: profileLoading, error: profileError } = useParentProfile();
  const { data: enhancedChildren } = useChildrenEnhanced();
  const {
    data: reportData,
    isLoading: reportLoading,
    refetch: refetchReport,
  } = useProgressReport(selectedChild?.id || null, dateRange);

  // Sprint 1.7: New report hooks - pass options object with dateRange
  const reportOptions = { dateRange };
  const {
    data: progressSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useProgressSummary(selectedChild?.id || '', reportOptions);

  const {
    data: timeline,
    isLoading: timelineLoading,
  } = useReportActivityTimeline(selectedChild?.id || '', { dateRange });

  // PDF/CSV export mutations (Sprint 4.1: Using new hooks only, removed legacy mock fallback)
  const pdfExport = usePDFExport();
  const csvExport = useCSVExport();

  // Auto-select first child when profile loads
  useEffect(() => {
    if (profile?.students?.length && !selectedChild) {
      const firstChild = profile.students[0];
      setSelectedChild({
        id: firstChild.id,
        name: firstChild.name || `${firstChild.firstName} ${firstChild.lastName}`,
      });
    }
  }, [profile, selectedChild]);

  // Update date range when preset changes
  useEffect(() => {
    if (dateRangePreset !== 'custom') {
      setDateRange(getDateRangeFromPreset(dateRangePreset));
    }
  }, [dateRangePreset]);

  const handleGenerateReport = () => {
    void refetchReport();
    void refetchSummary();
  };

  const handleExportPDF = async () => {
    if (!selectedChild || !dateRange) return;
    
    await pdfExport.exportPDF({
      learnerId: selectedChild.id,
      learnerName: selectedChild.name,
      dateRange,
      includeCharts: true,
    });
  };

  const handleExportCSV = async () => {
    if (!selectedChild || !dateRange) return;
    await csvExport.exportCSV({
      learnerId: selectedChild.id,
      learnerName: selectedChild.name,
      dateRange,
    });
  };

  // Merge children data
  const children = useMemo(() =>
    enhancedChildren?.map((child) => ({
      id: child.id,
      name: child.name,
      firstName: child.firstName,
      lastName: child.lastName,
      grade: child.grade,
      gradeLevel: child.grade,
      avatar: child.avatar,
    })) ||
    profile?.students?.map((s) => ({
      id: s.id,
      name: s.name || `${s.firstName} ${s.lastName}`,
      firstName: s.firstName,
      lastName: s.lastName,
      grade: s.grade,
      gradeLevel: s.grade,
      avatar: s.avatar,
    })) ||
    [],
  [enhancedChildren, profile?.students]);

  const selectedChildData = children.find((c) => c.id === selectedChild?.id) || null;

  // Compute loading state
  const isAnyLoading = reportLoading || summaryLoading || timelineLoading;

  // Loading state
  if (profileLoading) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-500">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state (in production only)
  if (profileError && !isDevMode()) {
    return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to load reports</h2>
              <p className="text-gray-500 mb-4">Please try refreshing the page or sign in again.</p>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                router.push('/dashboard');
              }}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              aria-label="Back to Dashboard"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Progress Reports</h1>
                <p className="text-sm text-gray-500">Comprehensive learning analytics</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ChildSelector
              childrenList={children}
              selected={selectedChildData}
              onChange={setSelectedChild}
            />

            {/* Export Buttons */}
            {(reportData || progressSummary) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCSV}
                  disabled={csvExport.isPending}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
                >
                  {csvExport.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  CSV
                </button>
                <PDFExport
                  childId={selectedChild?.id || ''}
                  childName={selectedChild?.name || ''}
                  dateRange={dateRange}
                  onExport={handleExportPDF}
                  isExporting={pdfExport.isPending}
                />
              </div>
            )}
          </div>
        </div>

        {/* Sprint 1.7: New Report Filters Component */}
        <ReportFilters
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          dateRangePreset={dateRangePreset}
          onDateRangePresetChange={setDateRangePreset}
          onApplyFilters={handleGenerateReport}
        />

        {/* Tab Navigation */}
        <div className="mt-6 mb-8">
          <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-100 w-fit">
            {[
              { key: 'overview', label: 'Overview' },
              { key: 'detailed', label: 'Detailed Report' },
              { key: 'timeline', label: 'Activity Timeline' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key as typeof activeTab); }}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Loading State */}
        {isAnyLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-500">Generating comprehensive report...</p>
            </div>
          </div>
        )}

        {/* Overview Tab - Sprint 1.7: New visualizations */}
        {activeTab === 'overview' && !isAnyLoading && progressSummary && (
          <div className="space-y-8">
            {/* Progress Chart */}
            {progressSummary.periods && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Progress Over Time
                </h3>
                <ProgressChart
                  periods={progressSummary.periods}
                  showTimeSpent={true}
                />
              </div>
            )}

            {/* Subject Summary Grid */}
            {progressSummary.subjectSummaries && progressSummary.subjectSummaries.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Performance by Subject
                </h3>
                <SubjectSummaryGrid subjects={progressSummary.subjectSummaries} />
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-3xl font-bold text-indigo-600">
                  {progressSummary.overallScore || 0}%
                </p>
                <p className="text-sm text-gray-500 mt-1">Overall Score</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {progressSummary.lessonsCompleted || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Lessons Completed</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-3xl font-bold text-purple-600">
                  {Math.round((progressSummary.totalLearningTime || 0) / 60)}h
                </p>
                <p className="text-sm text-gray-500 mt-1">Time Spent</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
                <p className="text-3xl font-bold text-amber-600">
                  {progressSummary.streak?.current || 0}
                </p>
                <p className="text-sm text-gray-500 mt-1">Day Streak</p>
              </div>
            </div>
          </div>
        )}

        {/* Detailed Tab - Using adapter to transform API data to component format */}
        {activeTab === 'detailed' && !isAnyLoading && reportData && (
          <div className="space-y-8">
            {isApiProgressReport(reportData) ? (
              // Transform API ProgressReport to component ProgressReportData
              (() => {
                const adaptedData = adaptProgressReport(reportData);
                return (
                  <>
                    <DetailedProgressReport data={adaptedData.progress} />
                    <AssessmentHistory data={adaptedData.assessments} />
                    <StrengthWeaknessAnalysis data={adaptedData.analysis} />
                    <TimeOnTaskReport data={adaptedData.timeOnTask} />
                    <SubjectMasteryReport data={adaptedData.mastery} />
                  </>
                );
              })()
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Report Data Unavailable</h2>
                <p className="text-gray-500">
                  Unable to load detailed report data. Please try refreshing.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab - Sprint 1.7: New timeline view */}
        {activeTab === 'timeline' && !isAnyLoading && timeline && (
          <TimelineView timeline={timeline} />
        )}

        {/* Empty State - No data yet */}
        {!isAnyLoading && !reportData && !progressSummary && selectedChild && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Report Generated</h2>
            <p className="text-gray-500 mb-6">
              Select a date range and click &quot;Apply Filters&quot; to see {selectedChild.name}
              &apos;s progress.
            </p>
            <button
              onClick={handleGenerateReport}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-5 h-5" />
              Generate First Report
            </button>
          </div>
        )}

        {/* No Child Selected State */}
        {!selectedChild && children.length > 0 && (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Select a Child</h2>
            <p className="text-gray-500">
              Choose a child from the dropdown above to view their progress reports.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
