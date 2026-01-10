/**
 * School Performance Grid Component
 *
 * Shows school-level performance metrics with rankings and comparisons.
 * Inspired by aivo/apps/portal/src/app/(enterprise)/enterprise/(dash)/page.tsx
 */

'use client';

import { useState } from 'react';
import {
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  status: 'excelling' | 'on-track' | 'needs-attention';
  studentCount: number;
  teacherCount: number;
  neurodiversePercent: number;
  avgMastery: number;
  iepComplianceRate: number;
  seatUsage: number;
  totalSeats: number;
  trend: 'up' | 'down' | 'stable';
  rankChange: number;
}

interface SchoolPerformanceGridProps {
  schools?: School[];
  onSchoolClick?: (schoolId: string) => void;
  sortBy?: 'name' | 'mastery' | 'students' | 'compliance';
}

const mockSchools: School[] = [
  {
    id: 'school-1',
    name: 'Lincoln Elementary',
    status: 'excelling',
    studentCount: 487,
    teacherCount: 28,
    neurodiversePercent: 23,
    avgMastery: 87,
    iepComplianceRate: 98,
    seatUsage: 92,
    totalSeats: 500,
    trend: 'up',
    rankChange: 2,
  },
  {
    id: 'school-2',
    name: 'Washington Middle',
    status: 'on-track',
    studentCount: 623,
    teacherCount: 35,
    neurodiversePercent: 19,
    avgMastery: 78,
    iepComplianceRate: 94,
    seatUsage: 85,
    totalSeats: 700,
    trend: 'up',
    rankChange: 1,
  },
  {
    id: 'school-3',
    name: 'Jefferson High',
    status: 'on-track',
    studentCount: 892,
    teacherCount: 52,
    neurodiversePercent: 21,
    avgMastery: 75,
    iepComplianceRate: 91,
    seatUsage: 78,
    totalSeats: 1000,
    trend: 'stable',
    rankChange: 0,
  },
  {
    id: 'school-4',
    name: 'Roosevelt Elementary',
    status: 'needs-attention',
    studentCount: 312,
    teacherCount: 18,
    neurodiversePercent: 28,
    avgMastery: 68,
    iepComplianceRate: 85,
    seatUsage: 62,
    totalSeats: 400,
    trend: 'down',
    rankChange: -2,
  },
  {
    id: 'school-5',
    name: 'Adams Academy',
    status: 'excelling',
    studentCount: 445,
    teacherCount: 26,
    neurodiversePercent: 25,
    avgMastery: 85,
    iepComplianceRate: 97,
    seatUsage: 89,
    totalSeats: 500,
    trend: 'up',
    rankChange: 3,
  },
  {
    id: 'school-6',
    name: 'Madison Middle',
    status: 'on-track',
    studentCount: 534,
    teacherCount: 31,
    neurodiversePercent: 20,
    avgMastery: 76,
    iepComplianceRate: 92,
    seatUsage: 76,
    totalSeats: 600,
    trend: 'stable',
    rankChange: 0,
  },
];

export function SchoolPerformanceGrid({
  schools = mockSchools,
  onSchoolClick,
  sortBy: initialSort = 'mastery',
}: SchoolPerformanceGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState(initialSort);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'all' | School['status']>('all');

  const getStatusColor = (status: School['status']) => {
    switch (status) {
      case 'excelling': return 'bg-green-100 text-green-700 border-green-200';
      case 'on-track': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'needs-attention': return 'bg-amber-100 text-amber-700 border-amber-200';
    }
  };

  const getStatusIcon = (status: School['status']) => {
    switch (status) {
      case 'excelling': return <Award className="w-4 h-4" />;
      case 'on-track': return <CheckCircle className="w-4 h-4" />;
      case 'needs-attention': return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getTrendIcon = (trend: School['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const filteredSchools = schools
    .filter(school => {
      if (filterStatus !== 'all' && school.status !== filterStatus) return false;
      if (searchQuery && !school.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'mastery':
          comparison = a.avgMastery - b.avgMastery;
          break;
        case 'students':
          comparison = a.studentCount - b.studentCount;
          break;
        case 'compliance':
          comparison = a.iepComplianceRate - b.iepComplianceRate;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const excellingCount = schools.filter(s => s.status === 'excelling').length;
  const needsAttentionCount = schools.filter(s => s.status === 'needs-attention').length;
  const avgMastery = Math.round(schools.reduce((sum, s) => sum + s.avgMastery, 0) / schools.length);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">School Performance</h2>
              <p className="text-sm text-gray-500">{schools.length} schools in district</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="p-3 bg-green-50 rounded-lg text-center">
            <p className="text-xl font-bold text-green-700">{excellingCount}</p>
            <p className="text-xs text-green-600">Excelling</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg text-center">
            <p className="text-xl font-bold text-blue-700">{schools.length - excellingCount - needsAttentionCount}</p>
            <p className="text-xs text-blue-600">On Track</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-center">
            <p className="text-xl font-bold text-amber-700">{needsAttentionCount}</p>
            <p className="text-xs text-amber-600">Need Attention</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg text-center">
            <p className="text-xl font-bold text-purple-700">{avgMastery}%</p>
            <p className="text-xs text-purple-600">Avg Mastery</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {(['all', 'excelling', 'on-track', 'needs-attention'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === status
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* School Cards */}
      <div className="p-6 grid grid-cols-2 gap-4">
        {filteredSchools.map((school, index) => (
          <button
            key={school.id}
            onClick={() => onSchoolClick?.(school.id)}
            className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-semibold text-gray-900">{school.name}</span>
                  {school.rankChange !== 0 && (
                    <span className={`text-xs font-medium ${
                      school.rankChange > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {school.rankChange > 0 ? '+' : ''}{school.rankChange}
                    </span>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(school.status)}`}>
                  {getStatusIcon(school.status)}
                  {school.status.replace('-', ' ')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {getTrendIcon(school.trend)}
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500">Students</p>
                <p className="font-semibold text-gray-900">{school.studentCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mastery</p>
                <p className={`font-semibold ${
                  school.avgMastery >= 80 ? 'text-green-600' :
                  school.avgMastery >= 70 ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {school.avgMastery}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IEP Rate</p>
                <p className={`font-semibold ${
                  school.iepComplianceRate >= 95 ? 'text-green-600' :
                  school.iepComplianceRate >= 90 ? 'text-blue-600' : 'text-amber-600'
                }`}>
                  {school.iepComplianceRate}%
                </p>
              </div>
            </div>

            {/* Seat Usage Bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Seat Usage</span>
                <span>{school.seatUsage}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    school.seatUsage >= 80 ? 'bg-green-500' :
                    school.seatUsage >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${school.seatUsage}%` }}
                />
              </div>
            </div>

            {/* Neurodiverse indicator */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {school.neurodiversePercent}% neurodiverse learners
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredSchools.length === 0 && (
        <div className="p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No schools match your filters</p>
        </div>
      )}
    </div>
  );
}

export default SchoolPerformanceGrid;
