/**
 * School Hierarchy Component
 *
 * Displays the hierarchical structure of schools within a district.
 * Supports grouping by school type, region, or custom categories.
 */

'use client';

import {
  Building2,
  ChevronDown,
  ChevronRight,
  Users,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Filter,
  Search,
  Grid,
  List,
  MoreVertical,
} from 'lucide-react';
import { useState, useMemo, type ReactNode } from 'react';

export interface School {
  id: string;
  name: string;
  type: 'elementary' | 'middle' | 'high' | 'k-12' | 'special';
  region?: string;
  principal?: string;
  address?: string;
  studentCount: number;
  teacherCount: number;
  avgMastery: number;
  engagementRate: number;
  iepComplianceRate: number;
  seatUsage: number;
  totalSeats: number;
  status: 'excelling' | 'on-track' | 'needs-attention';
  trend: 'up' | 'down' | 'stable';
  neurodiversePercent?: number;
}

interface SchoolHierarchyProps {
  schools: School[];
  onSchoolSelect?: (school: School) => void;
  groupBy?: 'type' | 'region' | 'status' | 'none';
}

// Mock schools data
const mockSchools: School[] = [
  {
    id: 'school-1',
    name: 'Lincoln Elementary',
    type: 'elementary',
    region: 'North',
    principal: 'Dr. Sarah Johnson',
    studentCount: 487,
    teacherCount: 28,
    avgMastery: 87,
    engagementRate: 92,
    iepComplianceRate: 98,
    seatUsage: 92,
    totalSeats: 500,
    status: 'excelling',
    trend: 'up',
    neurodiversePercent: 23,
  },
  {
    id: 'school-2',
    name: 'Washington Middle School',
    type: 'middle',
    region: 'North',
    principal: 'Mr. James Wilson',
    studentCount: 623,
    teacherCount: 35,
    avgMastery: 78,
    engagementRate: 85,
    iepComplianceRate: 94,
    seatUsage: 85,
    totalSeats: 700,
    status: 'on-track',
    trend: 'up',
    neurodiversePercent: 19,
  },
  {
    id: 'school-3',
    name: 'Jefferson High School',
    type: 'high',
    region: 'South',
    principal: 'Ms. Emily Chen',
    studentCount: 892,
    teacherCount: 52,
    avgMastery: 75,
    engagementRate: 78,
    iepComplianceRate: 91,
    seatUsage: 78,
    totalSeats: 1000,
    status: 'on-track',
    trend: 'stable',
    neurodiversePercent: 21,
  },
  {
    id: 'school-4',
    name: 'Roosevelt Elementary',
    type: 'elementary',
    region: 'South',
    principal: 'Dr. Michael Brown',
    studentCount: 312,
    teacherCount: 18,
    avgMastery: 68,
    engagementRate: 72,
    iepComplianceRate: 85,
    seatUsage: 62,
    totalSeats: 400,
    status: 'needs-attention',
    trend: 'down',
    neurodiversePercent: 28,
  },
  {
    id: 'school-5',
    name: 'Adams Academy',
    type: 'k-12',
    region: 'Central',
    principal: 'Dr. Lisa Martinez',
    studentCount: 445,
    teacherCount: 26,
    avgMastery: 85,
    engagementRate: 89,
    iepComplianceRate: 97,
    seatUsage: 89,
    totalSeats: 500,
    status: 'excelling',
    trend: 'up',
    neurodiversePercent: 25,
  },
  {
    id: 'school-6',
    name: 'Madison Middle School',
    type: 'middle',
    region: 'Central',
    principal: 'Mr. Robert Taylor',
    studentCount: 534,
    teacherCount: 31,
    avgMastery: 76,
    engagementRate: 81,
    iepComplianceRate: 92,
    seatUsage: 76,
    totalSeats: 600,
    status: 'on-track',
    trend: 'stable',
    neurodiversePercent: 20,
  },
  {
    id: 'school-7',
    name: 'Kennedy High School',
    type: 'high',
    region: 'North',
    principal: 'Ms. Patricia Lee',
    studentCount: 756,
    teacherCount: 44,
    avgMastery: 79,
    engagementRate: 83,
    iepComplianceRate: 93,
    seatUsage: 84,
    totalSeats: 850,
    status: 'on-track',
    trend: 'up',
    neurodiversePercent: 18,
  },
  {
    id: 'school-8',
    name: 'Franklin Elementary',
    type: 'elementary',
    region: 'Central',
    principal: 'Dr. David Kim',
    studentCount: 398,
    teacherCount: 24,
    avgMastery: 82,
    engagementRate: 88,
    iepComplianceRate: 96,
    seatUsage: 88,
    totalSeats: 450,
    status: 'excelling',
    trend: 'up',
    neurodiversePercent: 22,
  },
];

export function SchoolHierarchy({
  schools = mockSchools,
  onSchoolSelect,
  groupBy: initialGroupBy = 'type',
}: SchoolHierarchyProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState(initialGroupBy);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['elementary', 'middle', 'high', 'k-12', 'North', 'South', 'Central'])
  );
  const [statusFilter, setStatusFilter] = useState<'all' | School['status']>('all');

  // Filter schools
  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      if (statusFilter !== 'all' && school.status !== statusFilter) return false;
      if (searchQuery && !school.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [schools, statusFilter, searchQuery]);

  // Group schools
  const groupedSchools = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Schools': filteredSchools };
    }

    return filteredSchools.reduce<Record<string, School[]>>((groups, school) => {
      const key =
        groupBy === 'type'
          ? school.type
          : groupBy === 'region'
            ? school.region || 'Unknown'
            : school.status;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(school);
      return groups;
    }, {});
  }, [filteredSchools, groupBy]);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const getStatusIcon = (status: School['status']) => {
    switch (status) {
      case 'excelling':
        return <Award className="w-4 h-4 text-green-500" />;
      case 'on-track':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'needs-attention':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusBadge = (status: School['status']) => {
    const classes = {
      excelling: 'bg-green-100 text-green-700 border-green-200',
      'on-track': 'bg-blue-100 text-blue-700 border-blue-200',
      'needs-attention': 'bg-amber-100 text-amber-700 border-amber-200',
    };
    return classes[status];
  };

  const getTrendIcon = (trend: School['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTypeLabel = (type: School['type']) => {
    const labels = {
      elementary: 'Elementary Schools',
      middle: 'Middle Schools',
      high: 'High Schools',
      'k-12': 'K-12 Schools',
      special: 'Special Education',
    };
    return labels[type] || type;
  };

  const getGroupLabel = (group: string) => {
    if (groupBy === 'type') return getTypeLabel(group as School['type']);
    if (groupBy === 'status') {
      return group
        .replace('-', ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    }
    return group;
  };

  const getGroupIcon = (group: string) => {
    if (groupBy === 'type') {
      return <GraduationCap className="w-5 h-5 text-indigo-500" />;
    }
    if (groupBy === 'region') {
      return <MapPin className="w-5 h-5 text-indigo-500" />;
    }
    return getStatusIcon(group as School['status']);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">School Hierarchy</h2>
              <p className="text-sm text-gray-500">{schools.length} schools in district</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setViewMode('grid');
              }}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                setViewMode('list');
              }}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400 hover:bg-gray-100'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search schools..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value as typeof groupBy);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="type">Group by Type</option>
              <option value="region">Group by Region</option>
              <option value="status">Group by Status</option>
              <option value="none">No Grouping</option>
            </select>
          </div>

          <div className="flex gap-2">
            {(['all', 'excelling', 'on-track', 'needs-attention'] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                }}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all'
                  ? 'All'
                  : status
                      .split('-')
                      .map((w) => (w[0]?.toUpperCase() ?? '') + w.slice(1))
                      .join(' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedSchools).map(([group, groupSchools]) => (
          <div key={group}>
            {/* Group Header */}
            <button
              onClick={() => {
                toggleGroup(group);
              }}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {expandedGroups.has(group) ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                {getGroupIcon(group)}
                <span className="font-semibold text-gray-900">{getGroupLabel(group)}</span>
                <span className="text-sm text-gray-500">({groupSchools.length} schools)</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span>
                  {groupSchools.reduce((sum, s) => sum + s.studentCount, 0).toLocaleString()}{' '}
                  students
                </span>
                <span>
                  {Math.round(
                    groupSchools.reduce((sum, s) => sum + s.avgMastery, 0) / groupSchools.length
                  )}
                  % avg mastery
                </span>
              </div>
            </button>

            {/* Schools in Group */}
            {expandedGroups.has(group) && (
              <div
                className={`px-6 pb-6 ${viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-3'}`}
              >
                {groupSchools.map((school) =>
                  viewMode === 'grid' ? (
                    <SchoolCard
                      key={school.id}
                      school={school}
                      onSelect={() => onSchoolSelect?.(school)}
                      getStatusIcon={getStatusIcon}
                      getStatusBadge={getStatusBadge}
                      getTrendIcon={getTrendIcon}
                    />
                  ) : (
                    <SchoolListItem
                      key={school.id}
                      school={school}
                      onSelect={() => onSchoolSelect?.(school)}
                      getStatusIcon={getStatusIcon}
                      getStatusBadge={getStatusBadge}
                      getTrendIcon={getTrendIcon}
                    />
                  )
                )}
              </div>
            )}
          </div>
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

// School Card Component
function SchoolCard({
  school,
  onSelect,
  _getStatusIcon,
  getStatusBadge,
  getTrendIcon,
}: {
  school: School;
  onSelect: () => void;
  _getStatusIcon: (status: School['status']) => ReactNode;
  getStatusBadge: (status: School['status']) => string;
  getTrendIcon: (trend: School['trend']) => ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className="p-4 border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{school.name}</h3>
          {school.principal && <p className="text-xs text-gray-500 mt-0.5">{school.principal}</p>}
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon(school.trend)}
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(school.status)}`}
          >
            {school.status.replace('-', ' ')}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">Students</p>
          <p className="font-semibold text-gray-900">{school.studentCount}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Mastery</p>
          <p
            className={`font-semibold ${
              school.avgMastery >= 80
                ? 'text-green-600'
                : school.avgMastery >= 70
                  ? 'text-blue-600'
                  : 'text-amber-600'
            }`}
          >
            {school.avgMastery}%
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">IEP Rate</p>
          <p
            className={`font-semibold ${
              school.iepComplianceRate >= 95
                ? 'text-green-600'
                : school.iepComplianceRate >= 90
                  ? 'text-blue-600'
                  : 'text-amber-600'
            }`}
          >
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
            className={`h-full rounded-full ${
              school.seatUsage >= 80
                ? 'bg-green-500'
                : school.seatUsage >= 60
                  ? 'bg-blue-500'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${school.seatUsage}%` }}
          />
        </div>
      </div>
    </button>
  );
}

// School List Item Component
function SchoolListItem({
  school,
  onSelect,
  _getStatusIcon,
  getStatusBadge,
  getTrendIcon,
}: {
  school: School;
  onSelect: () => void;
  _getStatusIcon: (status: School['status']) => ReactNode;
  getStatusBadge: (status: School['status']) => string;
  getTrendIcon: (trend: School['trend']) => ReactNode;
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center gap-4"
    >
      <div className="p-2 bg-gray-100 rounded-lg">
        <Building2 className="w-5 h-5 text-gray-500" />
      </div>

      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate">{school.name}</h3>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadge(school.status)}`}
          >
            {school.status.replace('-', ' ')}
          </span>
        </div>
        {school.principal && <p className="text-sm text-gray-500">{school.principal}</p>}
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="text-center">
          <p className="font-semibold text-gray-900">{school.studentCount}</p>
          <p className="text-xs text-gray-500">Students</p>
        </div>
        <div className="text-center">
          <p
            className={`font-semibold ${
              school.avgMastery >= 80
                ? 'text-green-600'
                : school.avgMastery >= 70
                  ? 'text-blue-600'
                  : 'text-amber-600'
            }`}
          >
            {school.avgMastery}%
          </p>
          <p className="text-xs text-gray-500">Mastery</p>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">{school.engagementRate}%</p>
          <p className="text-xs text-gray-500">Engagement</p>
        </div>
        <div className="flex items-center gap-1">{getTrendIcon(school.trend)}</div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
    </button>
  );
}

export default SchoolHierarchy;
