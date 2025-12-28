// Class Overview Chart Component
import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export interface ClassMetricsData {
  studentCount: number;
  activeStudents: number;
  averageScore: number;
  completionRate: number;
  masteryRate: number;
  atRiskCount: number;
  scoreDistribution: Array<{ range: string; count: number }>;
  skillPerformance: Array<{ skill: string; mastery: number }>;
}

interface ClassOverviewChartProps {
  data: ClassMetricsData;
  className?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e'];

export const ClassOverviewChart: React.FC<ClassOverviewChartProps> = ({ data, className }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{data.activeStudents}/{data.studentCount}</div>
          <div className="text-sm text-gray-500">Active Students</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{Math.round(data.averageScore)}%</div>
          <div className="text-sm text-gray-500">Avg Score</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{Math.round(data.completionRate * 100)}%</div>
          <div className="text-sm text-gray-500">Completion</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{data.atRiskCount}</div>
          <div className="text-sm text-gray-500">At-Risk</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Score Distribution</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.scoreDistribution}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={({ range, count }) => `${range}: ${count}`}
                >
                  {data.scoreDistribution.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Performance */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Skill Mastery</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.skillPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} />
                <YAxis type="category" dataKey="skill" width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="mastery" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassOverviewChart;
