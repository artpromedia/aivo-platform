// ══════════════════════════════════════════════════════════════════════════════
// CLASS DASHBOARD PAGE
// Teacher-facing analytics dashboard for class-level insights
// ══════════════════════════════════════════════════════════════════════════════

'use client';

import * as React from 'react';
import {
  MetricCard,
  ProgressBar,
  AtRiskBadge,
  StudentProgressCard,
  StudentMetricsSummary,
  DataTable,
  Column,
} from './analytics-dashboard';
import {
  EngagementTrendChart,
  ScoreDistributionChart,
  SkillMasteryRadar,
  WeeklyActivityHeatmap,
  PerformanceComparisonChart,
  ChartContainer,
  CHART_COLORS,
  HeatmapDataPoint,
} from './charts';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ClassDashboardData {
  class: ClassProfile;
  metrics: ClassMetricsDetail;
  engagementHistory: EngagementDataPoint[];
  scoreDistribution: ScoreDistributionData[];
  skillOverview: SkillOverviewData[];
  activityHeatmap: HeatmapDataPoint[];
  students: StudentMetricsSummary[];
  atRiskStudents: AtRiskStudentDetail[];
  topPerformers: StudentMetricsSummary[];
  needsAttention: StudentMetricsSummary[];
  gradeComparison?: PerformanceComparisonData[];
}

export interface ClassProfile {
  id: string;
  name: string;
  grade: string;
  subject: string;
  period?: string;
  teacherName: string;
  studentCount: number;
}

export interface ClassMetricsDetail {
  averageScore: number;
  averageScoreChange: number;
  completionRate: number;
  completionRateChange: number;
  engagementScore: number;
  engagementScoreChange: number;
  masteryRate: number;
  masteryRateChange: number;
  activeStudents: number;
  atRiskCount: number;
  totalLessonsAssigned: number;
  totalLessonsCompleted: number;
}

export interface EngagementDataPoint {
  date: string;
  activeStudents: number;
  avgTimeMinutes: number;
  lessonsCompleted: number;
}

export interface ScoreDistributionData {
  range: string;
  count: number;
}

export interface SkillOverviewData {
  subject: string;
  value: number;
  fullMark: number;
}

export interface AtRiskStudentDetail {
  student: StudentMetricsSummary;
  riskFactors: RiskFactor[];
  suggestedActions: string[];
  daysInactive: number;
  trendDirection: 'improving' | 'declining' | 'stable';
}

export interface RiskFactor {
  type: 'inactivity' | 'performance' | 'completion' | 'engagement' | 'mastery';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PerformanceComparisonData {
  category: string;
  classAvg: number;
  gradeAvg: number;
  districtAvg?: number;
}

export interface ClassDashboardProps {
  data: ClassDashboardData;
  onViewStudent?: (studentId: string) => void;
  onContactParent?: (studentId: string) => void;
  onAssignContent?: () => void;
  onExportReport?: () => void;
  className?: string;
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function ClassHeader({ classData, metrics }: { classData: ClassProfile; metrics: ClassMetricsDetail }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
          <p className="text-gray-500">
            {classData.grade} • {classData.subject}
            {classData.period && ` • Period ${classData.period}`}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {metrics.activeStudents} of {classData.studentCount} students active
          </p>
        </div>
        <div className="flex items-center gap-4">
          {metrics.atRiskCount > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              <span className="text-red-600 font-medium">
                {metrics.atRiskCount} students at risk
              </span>
            </div>
          )}
          <div className="text-right">
            <p className="text-sm text-gray-500">Class Average</p>
            <p className="text-3xl font-bold text-blue-600">
              {metrics.averageScore.toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Progress to completion */}
      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Overall Completion</span>
          <span className="text-sm font-medium">
            {metrics.totalLessonsCompleted} / {metrics.totalLessonsAssigned} lessons
          </span>
        </div>
        <ProgressBar
          value={metrics.completionRate * 100}
          color={metrics.completionRate >= 0.7 ? 'success' : metrics.completionRate >= 0.4 ? 'warning' : 'danger'}
          size="lg"
          showValue={false}
        />
      </div>
    </div>
  );
}

function AtRiskPanel({ atRiskStudents, onViewStudent, onContactParent }: {
  atRiskStudents: AtRiskStudentDetail[];
  onViewStudent?: (id: string) => void;
  onContactParent?: (id: string) => void;
}) {
  if (atRiskStudents.length === 0) {
    return (
      <ChartContainer title="At-Risk Students" subtitle="Students needing attention">
        <div className="text-center py-8">
          <div className="text-5xl mb-4">🎉</div>
          <p className="text-gray-600">No at-risk students! All students are on track.</p>
        </div>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer
      title="At-Risk Students"
      subtitle={`${atRiskStudents.length} students need attention`}
    >
      <div className="space-y-4">
        {atRiskStudents.map(({ student, riskFactors, suggestedActions, daysInactive, trendDirection }) => (
          <div
            key={student.studentId}
            className="border border-red-100 rounded-lg p-4 bg-red-50/50"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-medium">
                  {student.studentName.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{student.studentName}</p>
                  <p className="text-sm text-gray-500">
                    Inactive for {daysInactive} days
                    {trendDirection === 'improving' && ' • 📈 Improving'}
                    {trendDirection === 'declining' && ' • 📉 Declining'}
                  </p>
                </div>
              </div>
              <AtRiskBadge level={student.riskLevel || 'high'} />
            </div>

            {/* Risk Factors */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Risk Factors</p>
              <div className="flex flex-wrap gap-2">
                {riskFactors.map((factor, idx) => (
                  <span
                    key={idx}
                    className={`text-xs px-2 py-1 rounded-full ${
                      factor.severity === 'high'
                        ? 'bg-red-100 text-red-700'
                        : factor.severity === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {factor.description}
                  </span>
                ))}
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Suggested Actions</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {suggestedActions.slice(0, 2).map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => onViewStudent?.(student.studentId)}
                className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => onContactParent?.(student.studentId)}
                className="text-sm px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
              >
                Contact Parent
              </button>
            </div>
          </div>
        ))}
      </div>
    </ChartContainer>
  );
}

function StudentRoster({ students, onViewStudent }: { students: StudentMetricsSummary[]; onViewStudent?: (id: string) => void }) {
  const columns: Column<StudentMetricsSummary>[] = [
    {
      key: 'studentName',
      header: 'Student',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium">
            {row.studentName.split(' ').map(n => n[0]).join('')}
          </div>
          <span className="font-medium">{row.studentName}</span>
        </div>
      ),
    },
    {
      key: 'averageScore',
      header: 'Avg Score',
      align: 'center',
      render: (value) => (
        <span className={`font-medium ${
          (value as number) >= 80 ? 'text-green-600' :
          (value as number) >= 60 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {(value as number).toFixed(0)}%
        </span>
      ),
    },
    {
      key: 'lessonsCompleted',
      header: 'Lessons',
      align: 'center',
    },
    {
      key: 'masteryLevel',
      header: 'Mastery',
      align: 'center',
      render: (value) => `${((value as number) * 100).toFixed(0)}%`,
    },
    {
      key: 'timeOnTask',
      header: 'Time',
      align: 'center',
      render: (value) => {
        const mins = value as number;
        const hours = Math.floor(mins / 60);
        const m = Math.round(mins % 60);
        return hours > 0 ? `${hours}h ${m}m` : `${m}m`;
      },
    },
    {
      key: 'riskLevel',
      header: 'Status',
      align: 'center',
      render: (value) => value ? <AtRiskBadge level={value as 'low' | 'medium' | 'high' | 'critical'} showLabel={false} /> : <AtRiskBadge level="low" showLabel={false} />,
    },
  ];

  return (
    <ChartContainer title="Student Roster" subtitle="All students in class">
      <DataTable
        columns={columns}
        data={students}
        onRowClick={(row) => onViewStudent?.(row.studentId)}
        emptyMessage="No students in class"
      />
    </ChartContainer>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────────

/**
 * Teacher-facing class analytics dashboard
 */
export function ClassDashboard({
  data,
  onViewStudent,
  onContactParent,
  onAssignContent,
  onExportReport,
  className,
}: ClassDashboardProps) {
  const { class: classData, metrics, engagementHistory, scoreDistribution, skillOverview, activityHeatmap, students, atRiskStudents, topPerformers, needsAttention, gradeComparison } = data;

  const [activeTab, setActiveTab] = React.useState<'overview' | 'students' | 'at-risk'>('overview');

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <ClassHeader classData={classData} metrics={metrics} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Average Score"
          value={metrics.averageScore / 100}
          format="percentage"
          change={metrics.averageScoreChange}
          trend={metrics.averageScoreChange > 0 ? 'up' : metrics.averageScoreChange < 0 ? 'down' : 'neutral'}
          changeLabel="vs last week"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <MetricCard
          title="Completion Rate"
          value={metrics.completionRate}
          format="percentage"
          change={metrics.completionRateChange}
          trend={metrics.completionRateChange > 0 ? 'up' : 'neutral'}
          changeLabel="this week"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Engagement Score"
          value={metrics.engagementScore / 100}
          format="percentage"
          change={metrics.engagementScoreChange}
          trend={metrics.engagementScoreChange > 0 ? 'up' : 'down'}
          changeLabel="vs avg"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <MetricCard
          title="Mastery Rate"
          value={metrics.masteryRate}
          format="percentage"
          change={metrics.masteryRateChange}
          trend={metrics.masteryRateChange > 0 ? 'up' : 'neutral'}
          changeLabel="growth"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'students', label: `Students (${students.length})` },
          { id: 'at-risk', label: `At Risk (${atRiskStudents.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'students' | 'at-risk')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <>
          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Engagement Trend" subtitle="Daily class activity">
              <EngagementTrendChart
                data={engagementHistory}
                series={[
                  { key: 'activeStudents', name: 'Active Students', color: CHART_COLORS.primary },
                  { key: 'lessonsCompleted', name: 'Lessons Completed', color: CHART_COLORS.success },
                ]}
                height={280}
              />
            </ChartContainer>

            <ChartContainer title="Score Distribution" subtitle="Student performance breakdown">
              <ScoreDistributionChart
                data={scoreDistribution}
                targetScore={70}
                height={280}
              />
            </ChartContainer>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Skill Overview" subtitle="Class performance by skill area">
              <SkillMasteryRadar data={skillOverview} height={300} />
            </ChartContainer>

            <ChartContainer title="Weekly Activity Pattern" subtitle="When students are most active">
              <WeeklyActivityHeatmap data={activityHeatmap} height={200} />
            </ChartContainer>
          </div>

          {/* Student Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartContainer title="Top Performers" subtitle="Highest achieving students">
              <div className="grid grid-cols-2 gap-3">
                {topPerformers.slice(0, 4).map((student) => (
                  <StudentProgressCard
                    key={student.studentId}
                    student={student}
                    onClick={() => onViewStudent?.(student.studentId)}
                  />
                ))}
              </div>
            </ChartContainer>

            <ChartContainer title="Needs Attention" subtitle="Students below expectations">
              <div className="grid grid-cols-2 gap-3">
                {needsAttention.slice(0, 4).map((student) => (
                  <StudentProgressCard
                    key={student.studentId}
                    student={student}
                    onClick={() => onViewStudent?.(student.studentId)}
                  />
                ))}
              </div>
            </ChartContainer>
          </div>

          {/* Grade Comparison */}
          {gradeComparison && (
            <ChartContainer title="Performance vs Grade Average" subtitle="How this class compares">
              <PerformanceComparisonChart data={gradeComparison} height={300} />
            </ChartContainer>
          )}
        </>
      )}

      {activeTab === 'students' && (
        <StudentRoster students={students} onViewStudent={onViewStudent} />
      )}

      {activeTab === 'at-risk' && (
        <AtRiskPanel
          atRiskStudents={atRiskStudents}
          onViewStudent={onViewStudent}
          onContactParent={onContactParent}
        />
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        {onAssignContent && (
          <button
            onClick={onAssignContent}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Assign Content
          </button>
        )}
        {onExportReport && (
          <button
            onClick={onExportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Class Report
          </button>
        )}
      </div>
    </div>
  );
}

export default ClassDashboard;
