// ══════════════════════════════════════════════════════════════════════════════
// STUDENT DASHBOARD PAGE
// Comprehensive student analytics dashboard with progress tracking
// ══════════════════════════════════════════════════════════════════════════════

'use client';

import * as React from 'react';
import {
  MetricCard,
  ProgressBar,
  MasteryLevel,
  AtRiskBadge,
} from './analytics-dashboard';
import type { StudentMetricsSummary } from './analytics-dashboard';
import {
  EngagementTrendChart,
  SkillMasteryRadar,
  ActivityBreakdownPie,
  ProgressTimelineChart,
  ChartContainer,
  CHART_COLORS,
} from './charts';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StudentDashboardData {
  student: StudentProfile;
  metrics: StudentMetricsDetail;
  engagementHistory: EngagementDataPoint[];
  skillMastery: SkillMasteryData[];
  activityBreakdown: ActivityData[];
  progressHistory: ProgressDataPoint[];
  achievements: Achievement[];
  recommendations: Recommendation[];
  classComparison?: SkillMasteryData[];
}

export interface StudentProfile {
  id: string;
  name: string;
  avatar?: string;
  grade: string;
  class: string;
  teacherName: string;
  enrollmentDate: Date;
}

export interface StudentMetricsDetail {
  overallScore: number;
  overallScoreChange: number;
  lessonsCompleted: number;
  lessonsCompletedChange: number;
  timeOnTask: number;
  timeOnTaskChange: number;
  masteryLevel: number;
  masteryLevelChange: number;
  streak: number;
  longestStreak: number;
  totalPoints: number;
  rank?: number;
  totalStudents?: number;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface EngagementDataPoint {
  date: string;
  activities: number;
  timeMinutes: number;
  score: number;
  [key: string]: string | number;
}

export interface SkillMasteryData {
  subject: string;
  value: number;
  fullMark: number;
}

export interface ActivityData {
  name: string;
  value: number;
  color?: string;
}

export interface ProgressDataPoint {
  date: string;
  score: number;
  target: number;
  milestone?: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: 'mastery' | 'engagement' | 'streak' | 'special';
}

export interface Recommendation {
  id: string;
  type: 'skill-gap' | 'reinforcement' | 'challenge' | 'engagement';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  contentId?: string;
  contentTitle?: string;
}

export interface StudentDashboardProps {
  data: StudentDashboardData;
  onViewLesson?: (lessonId: string) => void;
  onViewSkill?: (skillId: string) => void;
  onExportReport?: () => void;
  className?: string;
}

// ─── Subcomponents ─────────────────────────────────────────────────────────────

function StudentHeader({ student, metrics }: { student: StudentProfile; metrics: StudentMetricsDetail }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {student.avatar ? (
              <img src={student.avatar} alt={student.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              student.name.split(' ').map(n => n[0]).join('')
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-500">
              {student.grade} • {student.class}
            </p>
            <p className="text-sm text-gray-400">
              Teacher: {student.teacherName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {metrics.riskLevel && (
            <AtRiskBadge level={metrics.riskLevel} />
          )}
          <div className="text-right">
            <p className="text-sm text-gray-500">Current Streak</p>
            <p className="text-2xl font-bold text-orange-500">
              🔥 {metrics.streak} days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StreakAndPoints({ metrics }: { metrics: StudentMetricsDetail }) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-xl p-6 text-white">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-orange-100 text-sm">Learning Streak</p>
          <p className="text-4xl font-bold">{metrics.streak} days</p>
          <p className="text-orange-100 text-sm mt-1">
            Best: {metrics.longestStreak} days
          </p>
        </div>
        <div className="text-6xl">🔥</div>
      </div>
      <div className="mt-4 pt-4 border-t border-orange-400/30">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-orange-100 text-sm">Total Points</p>
            <p className="text-2xl font-bold">{metrics.totalPoints.toLocaleString()}</p>
          </div>
          {metrics.rank && metrics.totalStudents && (
            <div className="text-right">
              <p className="text-orange-100 text-sm">Class Rank</p>
              <p className="text-2xl font-bold">#{metrics.rank} / {metrics.totalStudents}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AchievementsSection({ achievements }: { achievements: Achievement[] }) {
  const recentAchievements = achievements.slice(0, 5);

  return (
    <ChartContainer title="Recent Achievements" subtitle={`${achievements.length} total earned`}>
      <div className="space-y-3">
        {recentAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="text-2xl">{achievement.icon}</div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{achievement.name}</p>
              <p className="text-sm text-gray-500">{achievement.description}</p>
            </div>
            <p className="text-xs text-gray-400">
              {new Date(achievement.earnedAt).toLocaleDateString()}
            </p>
          </div>
        ))}
        {achievements.length === 0 && (
          <p className="text-gray-500 text-center py-4">No achievements yet. Keep learning!</p>
        )}
      </div>
    </ChartContainer>
  );
}

function RecommendationsSection({ recommendations, onViewLesson }: { recommendations: Recommendation[]; onViewLesson?: (id: string) => void }) {
  const priorityColors = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-yellow-200 bg-yellow-50',
    low: 'border-green-200 bg-green-50',
  };

  const typeIcons = {
    'skill-gap': '📚',
    'reinforcement': '🔄',
    'challenge': '🎯',
    'engagement': '💡',
  };

  return (
    <ChartContainer title="Recommended Next Steps" subtitle="Personalized learning path">
      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className={`flex items-start gap-3 p-4 border rounded-lg ${priorityColors[rec.priority]} cursor-pointer hover:shadow-sm transition-shadow`}
            onClick={() => rec.contentId && onViewLesson?.(rec.contentId)}
            role="button"
            tabIndex={0}
          >
            <div className="text-2xl">{typeIcons[rec.type]}</div>
            <div className="flex-1">
              <p className="font-medium text-gray-900">{rec.title}</p>
              <p className="text-sm text-gray-600">{rec.description}</p>
              {rec.contentTitle && (
                <p className="text-sm text-blue-600 mt-1">
                  → {rec.contentTitle}
                </p>
              )}
            </div>
          </div>
        ))}
        {recommendations.length === 0 && (
          <p className="text-gray-500 text-center py-4">Great job! You're on track.</p>
        )}
      </div>
    </ChartContainer>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────────────────

/**
 * Comprehensive student analytics dashboard
 */
export function StudentDashboard({
  data,
  onViewLesson,
  onViewSkill,
  onExportReport,
  className,
}: StudentDashboardProps) {
  const { student, metrics, engagementHistory, skillMastery, activityBreakdown, progressHistory, achievements, recommendations, classComparison } = data;

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* Header */}
      <StudentHeader student={student} metrics={metrics} />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Overall Score"
          value={metrics.overallScore}
          format="percentage"
          change={metrics.overallScoreChange}
          trend={metrics.overallScoreChange > 0 ? 'up' : metrics.overallScoreChange < 0 ? 'down' : 'neutral'}
          changeLabel="vs last week"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <MetricCard
          title="Lessons Completed"
          value={metrics.lessonsCompleted}
          change={metrics.lessonsCompletedChange}
          trend={metrics.lessonsCompletedChange > 0 ? 'up' : 'neutral'}
          changeLabel="this week"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>}
        />
        <MetricCard
          title="Time on Task"
          value={metrics.timeOnTask}
          format="duration"
          change={metrics.timeOnTaskChange}
          trend={metrics.timeOnTaskChange > 0 ? 'up' : 'down'}
          changeLabel="vs avg"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <MetricCard
          title="Mastery Level"
          value={metrics.masteryLevel}
          format="percentage"
          change={metrics.masteryLevelChange}
          trend={metrics.masteryLevelChange > 0 ? 'up' : 'neutral'}
          changeLabel="growth"
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
        />
      </div>

      {/* Streak and Points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StreakAndPoints metrics={metrics} />
        <div className="lg:col-span-2">
          <ChartContainer title="Learning Progress" subtitle="Score progression over time">
            <ProgressTimelineChart data={progressHistory} height={200} />
          </ChartContainer>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Engagement Trend" subtitle="Daily activity and time spent">
          <EngagementTrendChart
            data={engagementHistory}
            series={[
              { key: 'activities', name: 'Activities', color: CHART_COLORS.primary },
              { key: 'score', name: 'Score', color: CHART_COLORS.success },
            ]}
            height={280}
          />
        </ChartContainer>

        <ChartContainer title="Skill Mastery" subtitle="Performance by subject area">
          <SkillMasteryRadar
            data={skillMastery}
            comparisonData={classComparison}
            showComparison={!!classComparison}
            height={280}
          />
        </ChartContainer>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartContainer title="Activity Breakdown" subtitle="Time allocation by type">
          <ActivityBreakdownPie
            data={activityBreakdown}
            height={250}
          />
        </ChartContainer>

        <AchievementsSection achievements={achievements} />

        <RecommendationsSection recommendations={recommendations} onViewLesson={onViewLesson} />
      </div>

      {/* Export Button */}
      {onExportReport && (
        <div className="flex justify-end">
          <button
            onClick={onExportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Progress Report
          </button>
        </div>
      )}
    </div>
  );
}

export default StudentDashboard;
