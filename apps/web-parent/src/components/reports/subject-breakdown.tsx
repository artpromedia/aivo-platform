/**
 * Subject Breakdown Component
 * Sprint 1.7: Connect Web Parent Reports to Real APIs
 *
 * Visual breakdown of student performance by subject.
 * Shows mastery levels, trends, and detailed standard progress.
 */

'use client';

import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';

import type { SubjectSummary, SubjectReport, StandardMastery } from '@/lib/api/reports.api';

interface SubjectBreakdownProps {
  subjects: SubjectSummary[];
  onSubjectSelect?: (subject: string) => void;
  selectedSubject?: string;
}

interface SubjectCardProps {
  subject: SubjectSummary;
  isSelected?: boolean;
  onSelect?: () => void;
}

/**
 * Get color class based on mastery score
 */
function getMasteryColor(score: number): {
  bg: string;
  text: string;
  bar: string;
  border: string;
} {
  if (score >= 80) {
    return {
      bg: 'bg-green-50',
      text: 'text-green-700',
      bar: 'bg-gradient-to-r from-green-400 to-green-500',
      border: 'border-green-200',
    };
  }
  if (score >= 60) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      bar: 'bg-gradient-to-r from-blue-400 to-blue-500',
      border: 'border-blue-200',
    };
  }
  if (score >= 40) {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      bar: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
      border: 'border-yellow-200',
    };
  }
  return {
    bg: 'bg-red-50',
    text: 'text-red-700',
    bar: 'bg-gradient-to-r from-red-400 to-red-500',
    border: 'border-red-200',
  };
}

/**
 * Get color based on mastery level string
 */
function getMasteryLevelColor(level: string): {
  bg: string;
  text: string;
  bar: string;
  border: string;
} {
  switch (level) {
    case 'mastered':
      return getMasteryColor(90);
    case 'proficient':
      return getMasteryColor(75);
    case 'developing':
      return getMasteryColor(50);
    default:
      return getMasteryColor(25);
  }
}

/**
 * Subject icon based on subject name
 */
function SubjectIcon({ subjectName }: { subjectName: string }) {
  // Simple color mapping based on first character
  const colors = [
    'bg-indigo-100 text-indigo-600',
    'bg-purple-100 text-purple-600',
    'bg-pink-100 text-pink-600',
    'bg-blue-100 text-blue-600',
    'bg-green-100 text-green-600',
    'bg-orange-100 text-orange-600',
  ];
  const colorIndex = subjectName.charCodeAt(0) % colors.length;

  return (
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[colorIndex]}`}>
      <BookOpen className="w-5 h-5" />
    </div>
  );
}

/**
 * Trend indicator
 */
function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 text-xs font-medium">
        <TrendingUp className="w-3 h-3" />
        Improving
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="inline-flex items-center gap-1 text-red-600 text-xs font-medium">
        <TrendingDown className="w-3 h-3" />
        Declining
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-medium">
      <Minus className="w-3 h-3" />
      Stable
    </span>
  );
}

/**
 * Individual subject card
 */
function SubjectCard({ subject, isSelected, onSelect }: SubjectCardProps) {
  const colors = getMasteryColor(subject.score);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? `${colors.border} ${colors.bg} ring-2 ring-offset-2 ring-indigo-200`
          : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-3">
        <SubjectIcon subjectName={subject.subject} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-900 truncate">{subject.subject}</h4>
            <span className={`text-lg font-bold ${colors.text}`}>{subject.score}%</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full ${colors.bar} transition-all duration-500`}
              style={{ width: `${subject.score}%` }}
            />
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {subject.lessonsCompleted} lessons
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {Math.round(subject.timeSpent / 60)}h
              </span>
            </div>
            <TrendIndicator trend={subject.trend} />
          </div>
        </div>

        <ChevronRight
          className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''}`}
        />
      </div>
    </button>
  );
}

/**
 * Subject Breakdown Grid
 */
export function SubjectBreakdown({
  subjects,
  onSubjectSelect,
  selectedSubject,
}: SubjectBreakdownProps) {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No subject data available</p>
      </div>
    );
  }

  // Sort by score descending
  const sortedSubjects = [...subjects].sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-3">
      {sortedSubjects.map((subject) => (
        <SubjectCard
          key={subject.subject}
          subject={subject}
          isSelected={selectedSubject === subject.subject}
          onSelect={() => onSubjectSelect?.(subject.subject)}
        />
      ))}
    </div>
  );
}

/**
 * Subject Detail Panel
 * Shows detailed standards and skills for a selected subject
 */
interface SubjectDetailPanelProps {
  report: SubjectReport;
  loading?: boolean;
}

export function SubjectDetailPanel({ report, loading }: SubjectDetailPanelProps) {
  const [expandedStandards, setExpandedStandards] = useState<Set<string>>(new Set());

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const toggleStandard = (standardCode: string) => {
    setExpandedStandards((prev) => {
      const next = new Set(prev);
      if (next.has(standardCode)) {
        next.delete(standardCode);
      } else {
        next.add(standardCode);
      }
      return next;
    });
  };

  const colors = getMasteryColor(report.overallMastery);

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <SubjectIcon subjectName={report.subject} />
            <div>
              <h3 className="text-lg font-bold text-gray-900">{report.subject}</h3>
              <p className="text-sm text-gray-600">
                {report.lessonsCompleted} lessons • {Math.round(report.timeSpent / 60)}h total
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-3xl font-bold ${colors.text}`}>{report.overallMastery}%</p>
            <p className="text-sm text-gray-500">Overall Mastery</p>
          </div>
        </div>
      </div>

      {/* Standards List */}
      <div className="p-6">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
          Standards Progress
        </h4>

        <div className="space-y-3">
          {report.standards.map((standard) => (
            <StandardItem
              key={standard.code}
              standard={standard}
              isExpanded={expandedStandards.has(standard.code)}
              onToggle={() => { toggleStandard(standard.code); }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual standard item with expandable skills
 */
function StandardItem({
  standard,
  isExpanded,
  onToggle,
}: {
  standard: StandardMastery;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colors = getMasteryLevelColor(standard.mastery);

  return (
    <div className={`rounded-lg border ${isExpanded ? colors.border : 'border-gray-100'}`}>
      <button
        onClick={onToggle}
        className={`w-full p-4 flex items-center gap-3 text-left transition-colors ${
          isExpanded ? colors.bg : 'hover:bg-gray-50'
        }`}
      >
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{standard.code}</span>
            {standard.progress < 50 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                Needs attention
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-900 line-clamp-1">{standard.name}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${colors.bar}`}
              style={{ width: `${standard.progress}%` }}
            />
          </div>
          <span className={`text-sm font-bold ${colors.text} w-12 text-right`}>
            {standard.progress}%
          </span>
        </div>
      </button>

      {/* Expanded content - show description if available */}
      {isExpanded && standard.description && (
        <div className="px-4 pb-4 pl-12">
          <p className="text-sm text-gray-600">{standard.description}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact subject summary for dashboard cards
 */
export function SubjectSummaryCard({ subject }: { subject: SubjectSummary }) {
  const colors = getMasteryColor(subject.score);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3 mb-3">
        <SubjectIcon subjectName={subject.subject} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{subject.subject}</h4>
          <TrendIndicator trend={subject.trend} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Mastery</span>
          <span className={`font-bold ${colors.text}`}>{subject.score}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors.bar} transition-all duration-500`}
            style={{ width: `${subject.score}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Grid of subject summary cards
 */
export function SubjectSummaryGrid({ subjects }: { subjects: SubjectSummary[] }) {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        No subjects to display
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {subjects.map((subject) => (
        <SubjectSummaryCard key={subject.subject} subject={subject} />
      ))}
    </div>
  );
}

export default SubjectBreakdown;
