'use client';

import { format } from 'date-fns';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';

import type { AssessmentHistoryData, Assessment } from './types';

interface AssessmentHistoryProps {
  data: AssessmentHistoryData;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function getTypeColor(type: Assessment['type']) {
  const colors = {
    quiz: 'bg-blue-100 text-blue-700',
    test: 'bg-purple-100 text-purple-700',
    practice: 'bg-green-100 text-green-700',
    benchmark: 'bg-amber-100 text-amber-700',
  };
  return colors[type] || 'bg-gray-100 text-gray-700';
}

function getScoreColor(percentage: number) {
  if (percentage >= 90) return 'text-green-600';
  if (percentage >= 80) return 'text-blue-600';
  if (percentage >= 70) return 'text-amber-600';
  return 'text-red-600';
}

function AssessmentRow({ assessment, isExpanded, onToggle }: {
  assessment: Assessment;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const percentage = Math.round((assessment.score / assessment.maxScore) * 100);
  const completedDate = new Date(assessment.completedAt);

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(assessment.type)}`}>
            {assessment.type.charAt(0).toUpperCase() + assessment.type.slice(1)}
          </span>
          <div className="text-left">
            <p className="font-medium text-gray-900">{assessment.title}</p>
            <p className="text-sm text-gray-500">{assessment.subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={`font-semibold ${getScoreColor(percentage)}`}>
              {assessment.score}/{assessment.maxScore} ({percentage}%)
            </p>
            <p className="text-xs text-gray-500">{format(completedDate, 'MMM d, yyyy')}</p>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
            <div>
              <p className="text-xs text-gray-500">Time Spent</p>
              <p className="font-medium text-gray-900">{assessment.timeSpent} min</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Questions</p>
              <p className="font-medium text-gray-900">
                {assessment.correctAnswers}/{assessment.questionCount} correct
              </p>
            </div>
            {assessment.percentile && (
              <div>
                <p className="text-xs text-gray-500">Percentile</p>
                <p className="font-medium text-gray-900">{assessment.percentile}th</p>
              </div>
            )}
            {assessment.grade && (
              <div>
                <p className="text-xs text-gray-500">Grade</p>
                <p className="font-medium text-gray-900">{assessment.grade}</p>
              </div>
            )}
          </div>

          {assessment.topics.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">Topics Covered</p>
              <div className="flex flex-wrap gap-2">
                {assessment.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white text-gray-600 text-xs rounded border border-gray-200"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AssessmentHistory({ data }: AssessmentHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<Assessment['type'] | 'all'>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  const subjects = [...new Set(data.assessments.map(a => a.subject))];

  const filteredAssessments = data.assessments.filter(assessment => {
    if (filterType !== 'all' && assessment.type !== filterType) return false;
    if (filterSubject !== 'all' && assessment.subject !== filterSubject) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Assessment History</h2>
            <p className="text-sm text-gray-500">
              {data.summary.totalAssessments} assessments completed
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-600 font-medium">Average Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-blue-900">{data.summary.averageScore}%</span>
            <TrendIcon trend={data.summary.improvementTrend} />
          </div>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-xs text-green-600 font-medium">Pass Rate</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-green-900">{data.summary.passRate}%</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-xs text-purple-600 font-medium">Total Assessments</p>
          <span className="text-2xl font-bold text-purple-900">{data.summary.totalAssessments}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-600">Filter:</span>
        </div>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value as Assessment['type'] | 'all'); }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Types</option>
          <option value="quiz">Quiz</option>
          <option value="test">Test</option>
          <option value="practice">Practice</option>
          <option value="benchmark">Benchmark</option>
        </select>
        <select
          value={filterSubject}
          onChange={(e) => { setFilterSubject(e.target.value); }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">All Subjects</option>
          {subjects.map(subject => (
            <option key={subject} value={subject}>{subject}</option>
          ))}
        </select>
      </div>

      {/* Assessment List */}
      <div className="space-y-3">
        {filteredAssessments.length > 0 ? (
          filteredAssessments.map(assessment => (
            <AssessmentRow
              key={assessment.id}
              assessment={assessment}
              isExpanded={expandedId === assessment.id}
              onToggle={() => { setExpandedId(expandedId === assessment.id ? null : assessment.id); }}
            />
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No assessments found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
