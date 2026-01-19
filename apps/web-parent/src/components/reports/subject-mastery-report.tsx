'use client';

import { useState } from 'react';
import {
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  Target,
  BookOpen,
} from 'lucide-react';
import type { SubjectMasteryData, SubjectMastery, StandardMastery } from './types';

interface SubjectMasteryReportProps {
  data: SubjectMasteryData;
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function getMasteryColor(mastery: StandardMastery['mastery']) {
  const colors = {
    mastered: 'bg-green-500',
    proficient: 'bg-blue-500',
    developing: 'bg-amber-500',
    beginning: 'bg-gray-400',
  };
  return colors[mastery];
}

function getMasteryLabel(mastery: StandardMastery['mastery']) {
  const labels = {
    mastered: 'Mastered',
    proficient: 'Proficient',
    developing: 'Developing',
    beginning: 'Beginning',
  };
  return labels[mastery];
}

function SubjectCard({ subject, isExpanded, onToggle }: {
  subject: SubjectMastery;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const masteryColor = subject.masteryLevel >= 80
    ? 'from-green-500 to-emerald-500'
    : subject.masteryLevel >= 60
    ? 'from-blue-500 to-indigo-500'
    : subject.masteryLevel >= 40
    ? 'from-amber-500 to-orange-500'
    : 'from-gray-400 to-gray-500';

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${masteryColor} flex items-center justify-center`}>
            <span className="text-white font-bold">{subject.masteryLevel}%</span>
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{subject.subject}</h3>
              <TrendIcon trend={subject.trend} />
            </div>
            <p className="text-sm text-gray-500">Grade: {subject.grade}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {subject.nextMilestone && (
            <div className="text-right hidden md:block">
              <p className="text-xs text-gray-500">Next Milestone</p>
              <p className="text-sm font-medium text-gray-700">{subject.nextMilestone.name}</p>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t border-gray-100">
          {/* Mastery Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Overall Mastery</span>
              <span className="text-sm text-gray-500">{subject.masteryLevel}%</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${masteryColor} rounded-full transition-all duration-500`}
                style={{ width: `${subject.masteryLevel}%` }}
              />
            </div>
          </div>

          {/* Next Milestone */}
          {subject.nextMilestone && (
            <div className="mb-4 p-3 bg-white rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium text-gray-700">
                  {subject.nextMilestone.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${(subject.nextMilestone.progress / subject.nextMilestone.target) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {subject.nextMilestone.progress}/{subject.nextMilestone.target}
                </span>
              </div>
            </div>
          )}

          {/* Standards */}
          {subject.standards.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Learning Standards</h4>
              <div className="space-y-2">
                {subject.standards.map((standard) => (
                  <div
                    key={standard.code}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${getMasteryColor(standard.mastery)}`} />
                      <div>
                        <p className="text-sm font-medium text-gray-700">{standard.name}</p>
                        <p className="text-xs text-gray-500">{standard.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {getMasteryLabel(standard.mastery)}
                      </span>
                      <span className="text-sm text-gray-500">{standard.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Lessons */}
          {subject.recentLessons.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Lessons</h4>
              <div className="space-y-2">
                {subject.recentLessons.map((lesson, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-700">{lesson.title}</span>
                    </div>
                    <span className={`text-sm font-medium ${
                      lesson.score >= 80 ? 'text-green-600' :
                      lesson.score >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {lesson.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SubjectMasteryReport({ data }: SubjectMasteryReportProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <GraduationCap className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Subject Mastery Report</h2>
            <p className="text-sm text-gray-500">Standards-based progress tracking</p>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="p-4 bg-green-50 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-green-700">Mastered</span>
          </div>
          <span className="text-2xl font-bold text-green-900">{data.masteredSkills}</span>
          <span className="text-sm text-green-600 block">skills</span>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Circle className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-700">In Progress</span>
          </div>
          <span className="text-2xl font-bold text-blue-900">{data.inProgressSkills}</span>
          <span className="text-sm text-blue-600 block">skills</span>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-4 h-4 text-gray-600" />
            <span className="text-xs font-medium text-gray-700">Total</span>
          </div>
          <span className="text-2xl font-bold text-gray-900">{data.totalSkills}</span>
          <span className="text-sm text-gray-600 block">skills</span>
        </div>
      </div>

      {/* Overall Mastery Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Mastery Level</span>
          <span className="text-sm font-medium text-indigo-600">{data.overallMasteryLevel}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${data.overallMasteryLevel}%` }}
          />
        </div>
      </div>

      {/* Mastery Legend */}
      <div className="flex flex-wrap justify-center gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Mastered (80%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Proficient (60-79%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span className="text-xs text-gray-600">Developing (40-59%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-400" />
          <span className="text-xs text-gray-600">Beginning (&lt;40%)</span>
        </div>
      </div>

      {/* Subject Cards */}
      <div className="space-y-4">
        {data.subjects.map((subject) => (
          <SubjectCard
            key={subject.subject}
            subject={subject}
            isExpanded={expandedSubject === subject.subject}
            onToggle={() => setExpandedSubject(
              expandedSubject === subject.subject ? null : subject.subject
            )}
          />
        ))}
      </div>
    </div>
  );
}
