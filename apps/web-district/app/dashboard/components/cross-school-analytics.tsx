/**
 * Cross-School Analytics Component
 *
 * Displays comparative analytics across all schools in the district:
 * - Performance by school (bar chart)
 * - Progress over time (line chart)
 * - Subject mastery comparison (radar chart)
 * - Student engagement metrics
 * - Detailed comparison table
 */

'use client';

import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from 'recharts';

export interface SchoolAnalyticsData {
  id: string;
  name: string;
  avg_score: number;
  student_count: number;
  completion_rate: number;
  active_users_pct: number;
  trend: number;
  mastery: {
    math: number;
    reading: number;
    science: number;
    writing: number;
    social_studies: number;
  };
  engagement: {
    daily_active_pct: number;
    avg_time_minutes: number;
    sessions_per_week: number;
  };
}

export interface TimelineData {
  month: string;
  schools: Record<string, number>;
}

export interface CrossSchoolAnalyticsProps {
  data: {
    schools: SchoolAnalyticsData[];
    timeline: TimelineData[];
  } | null;
  onRefresh?: () => void;
  onExport?: () => void;
}

// Color palette for schools
const SCHOOL_COLORS = [
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#ec4899', // pink
  '#84cc16', // lime
];

export function CrossSchoolAnalytics({
  data = null,
  onRefresh,
  onExport,
}: CrossSchoolAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'month' | 'quarter' | 'year'>('month');
  const [selectedSchools, setSelectedSchools] = useState<Set<string>>(
    new Set(data?.schools.map((s) => s.id) || [])
  );
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    onRefresh?.();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const toggleSchool = (schoolId: string) => {
    const newSelected = new Set(selectedSchools);
    if (newSelected.has(schoolId)) {
      newSelected.delete(schoolId);
    } else {
      newSelected.add(schoolId);
    }
    setSelectedSchools(newSelected);
  };

  // Prepare data for charts
  const filteredSchools = useMemo(() => {
    return data?.schools.filter((s) => selectedSchools.has(s.id)) || [];
  }, [data, selectedSchools]);

  // Average scores bar chart data
  const barChartData = useMemo(() => {
    return filteredSchools.map((school) => ({
      name: school.name,
      score: school.avg_score,
      completion: school.completion_rate,
      engagement: school.engagement.daily_active_pct,
    }));
  }, [filteredSchools]);

  // Timeline chart data
  const lineChartData = useMemo(() => {
    return (
      data?.timeline.map((t) => ({
        month: t.month,
        ...Object.fromEntries(filteredSchools.map((s) => [s.name, t.schools[s.id]])),
      })) || []
    );
  }, [data, filteredSchools]);

  // Radar chart data for subject mastery
  const radarChartData = useMemo(() => {
    return [
      {
        subject: 'Math',
        ...Object.fromEntries(filteredSchools.map((s) => [s.name, s.mastery.math])),
      },
      {
        subject: 'Reading',
        ...Object.fromEntries(filteredSchools.map((s) => [s.name, s.mastery.reading])),
      },
      {
        subject: 'Science',
        ...Object.fromEntries(filteredSchools.map((s) => [s.name, s.mastery.science])),
      },
      {
        subject: 'Writing',
        ...Object.fromEntries(filteredSchools.map((s) => [s.name, s.mastery.writing])),
      },
      {
        subject: 'Social Studies',
        ...Object.fromEntries(filteredSchools.map((s) => [s.name, s.mastery.social_studies])),
      },
    ];
  }, [filteredSchools]);

  // Engagement comparison data
  const engagementData = useMemo(() => {
    return filteredSchools.map((school) => ({
      name: school.name,
      'Daily Active %': school.engagement.daily_active_pct,
      'Avg Time (min)': school.engagement.avg_time_minutes,
    }));
  }, [filteredSchools]);

  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Loading analytics data...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Cross-School Performance</h2>
              <p className="text-sm text-gray-500">
                Compare performance metrics across all schools
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            {onExport && (
              <button
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* School Selection */}
        <div className="flex flex-wrap gap-2">
          {data.schools.map((school, index) => (
            <button
              key={school.id}
              onClick={() => {
                toggleSchool(school.id);
              }}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                selectedSchools.has(school.id)
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
              style={
                selectedSchools.has(school.id)
                  ? { backgroundColor: SCHOOL_COLORS[index % SCHOOL_COLORS.length] }
                  : {}
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${selectedSchools.has(school.id) ? 'bg-white' : 'bg-gray-300'}`}
              />
              {school.name}
            </button>
          ))}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Average Scores by School */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Average Scores by School</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setChartType('bar');
                  }}
                  className={`px-3 py-1 text-sm rounded ${chartType === 'bar' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Bar
                </button>
                <button
                  onClick={() => {
                    setChartType('area');
                  }}
                  className={`px-3 py-1 text-sm rounded ${chartType === 'area' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  Area
                </button>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="score" name="Avg Score" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  <Bar
                    dataKey="completion"
                    name="Completion"
                    fill="#06b6d4"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Progress Over Time */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">District Progress Trend</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[60, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  {filteredSchools.map((school, index) => (
                    <Line
                      key={school.id}
                      type="monotone"
                      dataKey={school.name}
                      stroke={
                        SCHOOL_COLORS[
                          data.schools.findIndex((s) => s.id === school.id) % SCHOOL_COLORS.length
                        ]
                      }
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Subject Mastery Comparison */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Mastery by School</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarChartData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  {filteredSchools.map((school, index) => (
                    <Radar
                      key={school.id}
                      name={school.name}
                      dataKey={school.name}
                      stroke={
                        SCHOOL_COLORS[
                          data.schools.findIndex((s) => s.id === school.id) % SCHOOL_COLORS.length
                        ]
                      }
                      fill={
                        SCHOOL_COLORS[
                          data.schools.findIndex((s) => s.id === school.id) % SCHOOL_COLORS.length
                        ]
                      }
                      fillOpacity={0.2}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Student Engagement</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis yAxisId="left" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={[0, 60]}
                    tickFormatter={(v) => `${v}m`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="Daily Active %"
                    name="Daily Active %"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="Avg Time (min)"
                    name="Avg Time (min)"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Students
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Score
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Completion Rate
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg Time/Day
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Trend
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.schools.map((school, index) => (
                  <tr
                    key={school.id}
                    className={`hover:bg-gray-50 transition-colors ${selectedSchools.has(school.id) ? '' : 'opacity-50'}`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: SCHOOL_COLORS[index % SCHOOL_COLORS.length] }}
                        />
                        <span className="font-semibold text-gray-900">{school.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-700">
                      {school.student_count.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                          school.avg_score >= 80
                            ? 'bg-green-100 text-green-700'
                            : school.avg_score >= 70
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {school.avg_score}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${
                          school.completion_rate >= 85
                            ? 'bg-green-100 text-green-700'
                            : school.completion_rate >= 75
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {school.completion_rate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-700">
                      {school.active_users_pct}%
                    </td>
                    <td className="px-4 py-4 text-center text-gray-700">
                      {school.engagement.avg_time_minutes} min
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div
                        className={`inline-flex items-center gap-1 ${
                          school.trend > 0
                            ? 'text-green-600'
                            : school.trend < 0
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {school.trend > 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : school.trend < 0 ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : null}
                        <span className="font-medium">
                          {school.trend > 0 ? '+' : ''}
                          {school.trend}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CrossSchoolAnalytics;
