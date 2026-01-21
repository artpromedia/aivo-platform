'use client';

import React from 'react';
import {
  ProgressDashboardData,
  SkillCategory,
  SKILL_CATEGORY_INFO,
} from './types';

interface ProgressDashboardProps {
  readonly data: ProgressDashboardData;
  readonly onCategorySelect?: (category: SkillCategory) => void;
}

export function ProgressDashboard({ data, onCategorySelect }: ProgressDashboardProps) {
  const { summary, byCategory, recentActivity } = data;

  return (
    <div className="space-y-8">
      {/* Summary card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
          </svg>
          <h2 className="text-xl font-bold text-gray-900">Your Progress</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <StatCard
            icon="⭐"
            value={summary.skillsAchieved}
            label="Mastered"
            color="amber"
          />
          <StatCard
            icon="📈"
            value={summary.skillsInProgress}
            label="In Progress"
            color="blue"
          />
          <StatCard
            icon="🔥"
            value={summary.currentStreak}
            label="Day Streak"
            color="orange"
          />
          <StatCard
            icon="⏱️"
            value={`${Math.floor(summary.totalMinutes / 60)}h`}
            label="Practice Time"
            color="purple"
          />
        </div>

        {/* Overall mastery */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Mastery</span>
            <span className="text-sm font-bold text-gray-900">
              {Math.round(summary.averageMastery * 100)}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getMasteryBgColor(summary.averageMastery)}`}
              style={{ width: `${summary.averageMastery * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Progress by category */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {byCategory.map((cat) => {
            const info = SKILL_CATEGORY_INFO[cat.category];
            return (
              <CategoryProgress
                key={cat.category}
                category={cat.category}
                info={info}
                skillCount={cat.skills.length}
                averageMastery={cat.averageMastery}
                onClick={() => onCategorySelect?.(cat.category)}
              />
            );
          })}
        </div>
      </div>

      {/* Recent activity */}
      {recentActivity.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {recentActivity.slice(0, 5).map((activity) => (
                <div key={`${activity.skillName}-${activity.practicedAt}`} className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{activity.skillName}</p>
                    <p className="text-sm text-gray-500">
                      Practiced for {activity.minutesPracticed} min
                    </p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatRelativeTime(activity.practicedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  readonly icon: string;
  readonly value: number | string;
  readonly label: string;
  readonly color: 'amber' | 'blue' | 'orange' | 'purple';
}

function StatCard({ icon, value, label, color }: StatCardProps) {
  const bgColors = {
    amber: 'bg-amber-50',
    blue: 'bg-blue-50',
    orange: 'bg-orange-50',
    purple: 'bg-purple-50',
  };

  return (
    <div className="text-center">
      <div className={`w-12 h-12 ${bgColors[color]} rounded-full flex items-center justify-center mx-auto mb-2`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}

interface CategoryProgressProps {
  readonly category: SkillCategory;
  readonly info: { label: string; icon: string; color: string };
  readonly skillCount: number;
  readonly averageMastery: number;
  readonly onClick?: () => void;
}

export function CategoryProgress({
  info,
  skillCount,
  averageMastery,
  onClick,
}: CategoryProgressProps) {
  const masteryPercent = Math.round(averageMastery * 100);

  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer w-full text-left"
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
          {info.icon}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{info.label}</h4>
          <p className="text-sm text-gray-500">{skillCount} skills</p>
        </div>

        {/* Mastery indicator */}
        <div className="w-12 h-12 relative">
          <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-gray-200"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={getMasteryStrokeColor(averageMastery)}
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              strokeDasharray={`${masteryPercent}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-900">{masteryPercent}%</span>
          </div>
        </div>

        {/* Arrow */}
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

function getMasteryBgColor(mastery: number): string {
  if (mastery >= 0.8) return 'bg-green-500';
  if (mastery >= 0.5) return 'bg-orange-500';
  return 'bg-blue-500';
}

function getMasteryStrokeColor(mastery: number): string {
  if (mastery >= 0.8) return 'text-green-500';
  if (mastery >= 0.5) return 'text-orange-500';
  return 'text-blue-500';
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
