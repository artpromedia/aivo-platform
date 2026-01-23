/**
 * Report Filters Component
 * Sprint 1.7: Connect Web Parent Reports to Real APIs
 *
 * Comprehensive filtering interface for reports.
 * Includes date range, subject, and report type filters.
 */

'use client';

import { format, subDays, startOfMonth, endOfMonth, subMonths, subWeeks } from 'date-fns';
import {
  Calendar,
  Filter,
  ChevronDown,
  BookOpen,
  FileText,
  BarChart3,
  Clock,
  Target,
  X,
} from 'lucide-react';
import React, { useState } from 'react';

export type DateRangePreset = 'last7' | 'last14' | 'last30' | 'thisMonth' | 'lastMonth' | 'last3Months' | 'custom';
export type ReportType = 'progress' | 'assessment' | 'time' | 'strengths' | 'subjects' | 'all';

interface DateRange {
  start: string;
  end: string;
}

interface ReportFiltersProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  dateRangePreset: DateRangePreset;
  onDateRangePresetChange: (preset: DateRangePreset) => void;
  subjects?: string[];
  selectedSubjects?: string[];
  onSubjectsChange?: (subjects: string[]) => void;
  reportTypes?: ReportType[];
  selectedReportTypes?: ReportType[];
  onReportTypesChange?: (types: ReportType[]) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;
  compact?: boolean;
}

const DATE_PRESETS: { key: DateRangePreset; label: string; shortLabel: string }[] = [
  { key: 'last7', label: 'Last 7 Days', shortLabel: '7D' },
  { key: 'last14', label: 'Last 14 Days', shortLabel: '14D' },
  { key: 'last30', label: 'Last 30 Days', shortLabel: '30D' },
  { key: 'thisMonth', label: 'This Month', shortLabel: 'MTD' },
  { key: 'lastMonth', label: 'Last Month', shortLabel: 'LM' },
  { key: 'last3Months', label: 'Last 3 Months', shortLabel: '3M' },
  { key: 'custom', label: 'Custom Range', shortLabel: 'Custom' },
];

const REPORT_TYPES: { key: ReportType; label: string; icon: React.ElementType }[] = [
  { key: 'progress', label: 'Progress', icon: BarChart3 },
  { key: 'assessment', label: 'Assessments', icon: FileText },
  { key: 'time', label: 'Time on Task', icon: Clock },
  { key: 'strengths', label: 'Strengths', icon: Target },
  { key: 'subjects', label: 'Subjects', icon: BookOpen },
];

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(preset: DateRangePreset): DateRange {
  const today = new Date();
  
  switch (preset) {
    case 'last7':
      return {
        start: format(subDays(today, 7), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    case 'last14':
      return {
        start: format(subWeeks(today, 2), 'yyyy-MM-dd'),
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
    case 'last3Months':
      return {
        start: format(subMonths(today, 3), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
    default:
      return {
        start: format(subDays(today, 30), 'yyyy-MM-dd'),
        end: format(today, 'yyyy-MM-dd'),
      };
  }
}

/**
 * Main Report Filters Component
 */
export function ReportFilters({
  dateRange,
  onDateRangeChange,
  dateRangePreset,
  onDateRangePresetChange,
  subjects = [],
  selectedSubjects = [],
  onSubjectsChange,
  reportTypes = ['progress', 'assessment', 'time', 'strengths', 'subjects'],
  selectedReportTypes = [],
  onReportTypesChange,
  onApplyFilters,
  onResetFilters,
  compact = false,
}: ReportFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomDates, setShowCustomDates] = useState(dateRangePreset === 'custom');

  const handlePresetChange = (preset: DateRangePreset) => {
    onDateRangePresetChange(preset);
    if (preset === 'custom') {
      setShowCustomDates(true);
    } else {
      setShowCustomDates(false);
      onDateRangeChange(getDateRangeFromPreset(preset));
    }
  };

  const handleSubjectToggle = (subject: string) => {
    if (!onSubjectsChange) return;
    
    if (selectedSubjects.includes(subject)) {
      onSubjectsChange(selectedSubjects.filter((s) => s !== subject));
    } else {
      onSubjectsChange([...selectedSubjects, subject]);
    }
  };

  const handleReportTypeToggle = (type: ReportType) => {
    if (!onReportTypesChange) return;
    
    if (selectedReportTypes.includes(type)) {
      onReportTypesChange(selectedReportTypes.filter((t) => t !== type));
    } else {
      onReportTypesChange([...selectedReportTypes, type]);
    }
  };

  const handleReset = () => {
    handlePresetChange('last30');
    onSubjectsChange?.([]);
    onReportTypesChange?.([]);
    onResetFilters?.();
  };

  const hasActiveFilters = 
    selectedSubjects.length > 0 || 
    selectedReportTypes.length > 0 || 
    dateRangePreset !== 'last30';

  if (compact) {
    return (
      <CompactFilters
        dateRange={dateRange}
        dateRangePreset={dateRangePreset}
        onPresetChange={handlePresetChange}
        onDateRangeChange={onDateRangeChange}
        onApplyFilters={onApplyFilters}
      />
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Main Filter Row */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Date Range Presets */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex flex-wrap gap-1">
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => { handlePresetChange(preset.key); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    dateRangePreset === preset.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {preset.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => { setShowAdvanced(!showAdvanced); }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showAdvanced || hasActiveFilters
                ? 'bg-indigo-100 text-indigo-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Advanced
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {/* Apply Button */}
          {onApplyFilters && (
            <button
              onClick={onApplyFilters}
              className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Apply Filters
            </button>
          )}
        </div>
      </div>

      {/* Custom Date Range */}
      {showCustomDates && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => { onDateRangeChange({ ...dateRange, start: e.target.value }); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <span className="text-gray-400 mt-5">to</span>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => { onDateRangeChange({ ...dateRange, end: e.target.value }); }}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="p-4 bg-gray-50 space-y-4">
          {/* Report Types */}
          {onReportTypesChange && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Report Sections
              </label>
              <div className="flex flex-wrap gap-2">
                {REPORT_TYPES.filter(t => reportTypes.includes(t.key)).map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedReportTypes.length === 0 || selectedReportTypes.includes(type.key);
                  return (
                    <button
                      key={type.key}
                      onClick={() => { handleReportTypeToggle(type.key); }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-white border-2 border-indigo-500 text-indigo-700 shadow-sm'
                          : 'bg-gray-100 border-2 border-transparent text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subject Filter */}
          {subjects.length > 0 && onSubjectsChange && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Filter by Subject
              </label>
              <div className="flex flex-wrap gap-2">
                {subjects.map((subject) => {
                  const isSelected = selectedSubjects.length === 0 || selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      onClick={() => { handleSubjectToggle(subject); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-white border-2 border-green-500 text-green-700 shadow-sm'
                          : 'bg-gray-100 border-2 border-transparent text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {subject}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2">
                {selectedSubjects.map((subject) => (
                  <span
                    key={subject}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                  >
                    {subject}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSubjectToggle(subject);
                      }}
                      className="hover:text-green-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <button
                onClick={handleReset}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
            </div>
          )}
        </div>
      )}

      {/* Date Range Display */}
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Showing data from{' '}
          <span className="font-medium text-gray-700">
            {format(new Date(dateRange.start), 'MMM d, yyyy')}
          </span>{' '}
          to{' '}
          <span className="font-medium text-gray-700">
            {format(new Date(dateRange.end), 'MMM d, yyyy')}
          </span>
        </p>
      </div>
    </div>
  );
}

/**
 * Compact version of filters for embedded use
 */
function CompactFilters({
  dateRange,
  dateRangePreset,
  onPresetChange,
  onDateRangeChange,
  onApplyFilters,
}: {
  dateRange: DateRange;
  dateRangePreset: DateRangePreset;
  onPresetChange: (preset: DateRangePreset) => void;
  onDateRangeChange: (range: DateRange) => void;
  onApplyFilters?: () => void;
}) {
  const [showCustom, setShowCustom] = useState(dateRangePreset === 'custom');

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
        {DATE_PRESETS.slice(0, 4).map((preset) => (
          <button
            key={preset.key}
            onClick={() => {
              onPresetChange(preset.key);
              setShowCustom(preset.key === 'custom');
            }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              dateRangePreset === preset.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {preset.shortLabel}
          </button>
        ))}
        <button
          onClick={() => {
            onPresetChange('custom');
            setShowCustom(true);
          }}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            dateRangePreset === 'custom'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-3 h-3" />
        </button>
      </div>

      {showCustom && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => { onDateRangeChange({ ...dateRange, start: e.target.value }); }}
            className="px-2 py-1 border border-gray-200 rounded text-xs"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => { onDateRangeChange({ ...dateRange, end: e.target.value }); }}
            className="px-2 py-1 border border-gray-200 rounded text-xs"
          />
        </div>
      )}

      {onApplyFilters && (
        <button
          onClick={onApplyFilters}
          className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700"
        >
          Apply
        </button>
      )}
    </div>
  );
}

/**
 * Quick date range selector for dashboard widgets
 */
export function QuickDateSelector({
  value,
  onChange,
}: {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
      {(['last7', 'last30', 'thisMonth'] as DateRangePreset[]).map((preset) => {
        const presetInfo = DATE_PRESETS.find((p) => p.key === preset)!;
        return (
          <button
            key={preset}
            onClick={() => { onChange(preset); }}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              value === preset
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {presetInfo.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

export default ReportFilters;
