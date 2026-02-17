/**
 * District Overview Component
 *
 * Displays district-wide metrics and KPIs with visual indicators.
 * Shows total schools, students, teachers, compliance rates, and trends.
 */

'use client';

import {
  Building2,
  Users,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Shield,
  DollarSign,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

export interface DistrictData {
  id: string;
  name: string;
  totalSchools: number;
  activeSchools: number;
  pendingOnboarding: number;
  totalStudents: number;
  totalTeachers: number;
  totalParents: number;
  activeIEPs: number;
  plans504: number;
  avgMastery: number;
  avgEngagement: number;
  complianceRate: number;
  licensesUsed: number;
  licensesTotal: number;
  budgetUsed: number;
  budgetTotal: number;
  trends: {
    students: number;
    mastery: number;
    engagement: number;
    compliance: number;
  };
}

export interface SchoolSummary {
  id: string;
  name: string;
  type: 'elementary' | 'middle' | 'high' | 'k-12';
  studentCount: number;
  teacherCount: number;
  avgMastery: number;
  status: 'excelling' | 'on-track' | 'needs-attention';
}

interface DistrictOverviewProps {
  district: DistrictData | null;
  schools: SchoolSummary[];
  onViewAllSchools?: () => void;
  onViewAnalytics?: () => void;
}

export function DistrictOverview({
  district = null,
  schools = [],
  onViewAllSchools,
  onViewAnalytics,
}: DistrictOverviewProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  if (!district) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Loading district data...</p>
      </div>
    );
  }

  const licensePercent = (district.licensesUsed / district.licensesTotal) * 100;
  const budgetPercent = (district.budgetUsed / district.budgetTotal) * 100;

  const metrics = [
    {
      id: 'schools',
      label: 'Total Schools',
      value: district.totalSchools,
      subtitle: `${district.activeSchools} active, ${district.pendingOnboarding} pending`,
      icon: Building2,
      color: 'blue',
      trend: null,
    },
    {
      id: 'students',
      label: 'Total Students',
      value: district.totalStudents.toLocaleString(),
      subtitle: `${district.totalTeachers} teachers`,
      icon: GraduationCap,
      color: 'green',
      trend: district.trends.students,
    },
    {
      id: 'mastery',
      label: 'Avg. Mastery',
      value: `${district.avgMastery}%`,
      subtitle: 'Across all subjects',
      icon: BookOpen,
      color: 'purple',
      trend: district.trends.mastery,
    },
    {
      id: 'engagement',
      label: 'Engagement',
      value: `${district.avgEngagement}%`,
      subtitle: 'Daily active rate',
      icon: Activity,
      color: 'amber',
      trend: district.trends.engagement,
    },
    {
      id: 'compliance',
      label: 'Compliance',
      value: `${district.complianceRate}%`,
      subtitle: `${district.activeIEPs} active IEPs`,
      icon: Shield,
      color: 'emerald',
      trend: district.trends.compliance,
    },
    {
      id: 'parents',
      label: 'Connected Parents',
      value: district.totalParents.toLocaleString(),
      subtitle: 'Family engagement',
      icon: Users,
      color: 'indigo',
      trend: null,
    },
  ];

  const getColorClasses = (color: string): { bg: string; text: string; border: string } => {
    const colorMap: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
      amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
      emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
      indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200' },
    };
    const defaultColor = { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
    return colorMap[color] ?? defaultColor;
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{district.name}</h2>
            <p className="text-indigo-100 mt-1">
              {district.totalSchools} schools • {district.totalStudents.toLocaleString()} students •{' '}
              {district.totalTeachers} educators
            </p>
          </div>
          <div className="flex gap-3">
            {onViewAllSchools && (
              <button
                onClick={onViewAllSchools}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
              >
                View All Schools
              </button>
            )}
            {onViewAnalytics && (
              <button
                onClick={onViewAnalytics}
                className="px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg text-sm font-medium transition-colors"
              >
                View Analytics
              </button>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-2xl font-bold">{district.activeIEPs}</p>
            <p className="text-sm text-indigo-100">Active IEPs</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-2xl font-bold">{district.plans504}</p>
            <p className="text-sm text-indigo-100">504 Plans</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-2xl font-bold">{Math.round(licensePercent)}%</p>
            <p className="text-sm text-indigo-100">License Usage</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-2xl font-bold">{Math.round(budgetPercent)}%</p>
            <p className="text-sm text-indigo-100">Budget Used</p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => {
          const colors = getColorClasses(metric.color);
          const Icon = metric.icon;

          return (
            <button
              key={metric.id}
              onClick={() => {
                setSelectedMetric(metric.id === selectedMetric ? null : metric.id);
              }}
              className={`p-5 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                selectedMetric === metric.id
                  ? `${colors.bg} ${colors.border}`
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${colors.bg}`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                {metric.trend !== null && (
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      metric.trend >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {metric.trend >= 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : (
                      <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(metric.trend)}%</span>
                  </div>
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900 mt-4">{metric.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{metric.label}</p>
              <p className="text-xs text-gray-500 mt-1">{metric.subtitle}</p>
            </button>
          );
        })}
      </div>

      {/* Resource Bars */}
      <div className="grid grid-cols-2 gap-6">
        {/* License Usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">License Usage</h3>
            </div>
            <span className="text-sm text-gray-500">
              {district.licensesUsed.toLocaleString()} / {district.licensesTotal.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                licensePercent > 90
                  ? 'bg-red-500'
                  : licensePercent > 75
                    ? 'bg-amber-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${licensePercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{Math.round(licensePercent)}% utilized</span>
            <span>
              {(district.licensesTotal - district.licensesUsed).toLocaleString()} available
            </span>
          </div>
        </div>

        {/* Budget Usage */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-500" />
              <h3 className="font-semibold text-gray-900">Budget Utilization</h3>
            </div>
            <span className="text-sm text-gray-500">
              ${district.budgetUsed.toLocaleString()} / ${district.budgetTotal.toLocaleString()}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                budgetPercent > 90
                  ? 'bg-red-500'
                  : budgetPercent > 75
                    ? 'bg-amber-500'
                    : 'bg-blue-500'
              }`}
              style={{ width: `${budgetPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>{Math.round(budgetPercent)}% spent</span>
            <span>${(district.budgetTotal - district.budgetUsed).toLocaleString()} remaining</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DistrictOverview;
