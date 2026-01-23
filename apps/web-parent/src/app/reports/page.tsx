'use client';

import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { FileText, ChevronLeft, Calendar, Loader2, AlertTriangle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

// Report Components
import {
  DetailedProgressReport,
  AssessmentHistory,
  StrengthWeaknessAnalysis,
  TimeOnTaskReport,
  SubjectMasteryReport,
  PDFExport,
} from '@/components/reports';

// Hooks
import { isDevMode } from '@/lib/api';
import {
  useParentProfile,
  useProgressReport,
  useGenerateReportPDF,
  useChildrenEnhanced,
} from '@/lib/hooks';

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

// Date range presets
type DateRangePreset = 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'custom';

const dateRangePresets: { key: DateRangePreset; label: string }[] = [
  { key: 'last7', label: 'Last 7 Days' },
  { key: 'last30', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom Range' },
];

function getDateRangeFromPreset(preset: DateRangePreset): { start: string; end: string } {
  const today = new Date();
  switch (preset) {
    case 'last7':
      return {
        start: format(subDays(today, 7), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    case 'last30':
      return {
        start: format(subDays(today, 30), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    case 'thisMonth':
      return {
        start: format(startOfMonth(today), 'yyyy-MM-dd'),
        end: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    case 'lastMonth': {
      const lastMonth = subMonths(today, 1);
      return {
        start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
        end: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
      };
    }
    default:
      return {
        start: format(subDays(today, 30), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
  }
}

export default function ReportsPage() {
  const router = useRouter();
  const [selectedChild, setSelectedChild] = useState<{ id: string; name: string } | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('last30');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>(
    getDateRangeFromPreset('last30')
  );
  const [showCustomDates, setShowCustomDates] = useState(false);

  // Data hooks
  const { data: profile, isLoading: profileLoading, error: profileError } = useParentProfile();
  const { data: enhancedChildren } = useChildrenEnhanced();
  const {
    data: reportData,
    isLoading: reportLoading,
    refetch: refetchReport,
  } = useProgressReport(selectedChild?.id || null, dateRange);

  // PDF export mutation
  const generatePDF = useGenerateReportPDF();

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
      setShowCustomDates(false);
    } else {
      setShowCustomDates(true);
    }
  }, [dateRangePreset]);

  const handleGenerateReport = () => {
    refetchReport();
  };

  const handleExportPDF = async () => {
    if (!selectedChild || !dateRange) return;
    await generatePDF.mutateAsync({
      studentId: selectedChild.id,
      studentName: selectedChild.name,
      dateRange,
    });
  };

  // Merge children data
  const children =
    enhancedChildren?.map((child) => ({
      id: child.id,
      name: child.name,
      firstName: child.firstName,
      lastName: child.lastName,
      grade: child.gradeLevel,
      gradeLevel: child.gradeLevel,
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
    [];

  const selectedChildData = children.find((c) => c.id === selectedChild?.id) || null;

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

            {reportData && (
              <PDFExport
                childId={selectedChild?.id || ''}
                childName={selectedChild?.name || ''}
                dateRange={dateRange}
                onExport={handleExportPDF}
                isExporting={generatePDF.isPending}
              />
            )}
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-wrap items-end gap-4">
            {/* Preset Buttons */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Period</label>
              <div className="flex flex-wrap gap-2">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      setDateRangePreset(preset.key);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      dateRangePreset === preset.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Date Inputs */}
            {showCustomDates && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => {
                        setDateRange({ ...dateRange, start: e.target.value });
                      }}
                      className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => {
                      setDateRange({ ...dateRange, end: e.target.value });
                    }}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              onClick={handleGenerateReport}
              disabled={!selectedChild || !dateRange.start || !dateRange.end || reportLoading}
              className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {reportLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5" />
                  Generate Report
                </>
              )}
            </button>
          </div>

          {/* Selected Range Display */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing data from{' '}
              <span className="font-medium text-gray-900">
                {format(new Date(dateRange.start), 'MMMM d, yyyy')}
              </span>{' '}
              to{' '}
              <span className="font-medium text-gray-900">
                {format(new Date(dateRange.end), 'MMMM d, yyyy')}
              </span>
              {selectedChild && (
                <>
                  {' '}
                  for <span className="font-medium text-indigo-600">{selectedChild.name}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Report Loading State */}
        {reportLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto" />
              <p className="mt-4 text-gray-500">Generating comprehensive report...</p>
            </div>
          </div>
        )}

        {/* Report Sections */}
        {reportData && !reportLoading && (
          <div className="space-y-8">
            {/* Detailed Progress */}
            <DetailedProgressReport data={reportData.progress} childName={selectedChild?.name} />

            {/* Assessment History */}
            <AssessmentHistory data={reportData.assessments} />

            {/* Strength & Weakness Analysis */}
            <StrengthWeaknessAnalysis data={reportData.analysis} />

            {/* Time on Task */}
            <TimeOnTaskReport data={reportData.timeOnTask} />

            {/* Subject Mastery */}
            <SubjectMasteryReport data={reportData.mastery} />
          </div>
        )}

        {/* Empty State */}
        {!reportData && !reportLoading && selectedChild && (
          <div className="text-center py-20">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Report Generated</h2>
            <p className="text-gray-500 mb-6">
              Select a date range and click &quot;Generate Report&quot; to see {selectedChild.name}
              &apos;s progress.
            </p>
            <button
              onClick={handleGenerateReport}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
            >
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
