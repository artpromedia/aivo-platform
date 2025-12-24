/**
 * Skill Mastery Matrix Component
 *
 * Visual skill gap analysis across all students in a class.
 * Allows teachers to quickly identify skills that need class-wide attention
 * and individual students who need targeted support.
 *
 * WCAG 2.1 AA compliant with keyboard navigation and screen reader support.
 */

'use client';

import { Search, TrendingUp, TrendingDown, Minus, AlertCircle, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { analyticsApi } from '@/lib/api/analytics';
import type { SkillMasteryMatrix as SkillMatrixType, SkillMasteryCell } from '@/lib/types';
import { cn } from '@/lib/utils';

interface SkillMasteryMatrixProps {
  classId: string;
  onStudentClick?: (studentId: string) => void;
  onSkillClick?: (skillId: string) => void;
}

interface MatrixState {
  matrix: SkillMatrixType | null;
  isLoading: boolean;
  error: Error | null;
}

export function SkillMasteryMatrix({
  classId,
  onStudentClick,
  onSkillClick,
}: SkillMasteryMatrixProps) {
  const [domainFilter, setDomainFilter] = React.useState<string>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'name' | 'mastery'>('name');
  const [hoveredCell, setHoveredCell] = React.useState<{
    studentId: string;
    skillId: string;
  } | null>(null);

  const [state, setState] = React.useState<MatrixState>({
    matrix: null,
    isLoading: true,
    error: null,
  });

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const matrix = await analyticsApi.getSkillMasteryMatrix(
          classId,
          domainFilter === 'all' ? undefined : domainFilter
        );
        setState({ matrix, isLoading: false, error: null });
      } catch (err) {
        setState({
          matrix: null,
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to load skill matrix'),
        });
      }
    };
    void fetchData();
  }, [classId, domainFilter]);

  // Get unique domains
  const domains = React.useMemo(() => {
    if (!state.matrix) return [];
    return [...new Set(state.matrix.skills.map((s) => s.domain))];
  }, [state.matrix]);

  // Filter and sort students
  const filteredStudents = React.useMemo(() => {
    if (!state.matrix) return [];

    let students = [...state.matrix.students];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      students = students.filter((s) => s.studentName.toLowerCase().includes(query));
    }

    // Sort
    if (sortBy === 'name') {
      students.sort((a, b) => a.studentName.localeCompare(b.studentName));
    } else {
      students.sort((a, b) => {
        const avgA = calculateAverageMastery(a.masteryBySkill);
        const avgB = calculateAverageMastery(b.masteryBySkill);
        return avgB - avgA;
      });
    }

    return students;
  }, [state.matrix, searchQuery, sortBy]);

  if (state.isLoading) {
    return <MatrixSkeleton />;
  }

  if (state.error || !state.matrix) {
    return (
      <div className="text-center py-12" role="alert">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load skill matrix</h3>
        <p className="text-gray-500">
          {state.error?.message || 'An error occurred loading the skill matrix.'}
        </p>
      </div>
    );
  }

  const { matrix } = state;

  return (
    <div className="rounded-xl border bg-white">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">Skill Mastery Matrix</h2>
            <p className="text-sm text-gray-500">Click on any cell to see detailed progress</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                }}
                className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 w-48"
                aria-label="Search students"
              />
            </div>

            {/* Domain filter */}
            <select
              value={domainFilter}
              onChange={(e) => {
                setDomainFilter(e.target.value);
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Filter by domain"
            >
              <option value="all">All Domains</option>
              {domains.map((domain) => (
                <option key={domain} value={domain}>
                  {domain}
                </option>
              ))}
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as 'name' | 'mastery');
              }}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              aria-label="Sort students by"
            >
              <option value="name">Sort by Name</option>
              <option value="mastery">Sort by Average Mastery</option>
            </select>
          </div>
        </div>
      </div>

      {/* Skills needing attention alert */}
      {matrix.skillsNeedingAttention.length > 0 && (
        <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-yellow-800">Skills needing class-wide review</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {matrix.skills
                .filter((s) => matrix.skillsNeedingAttention.includes(s.skillId))
                .map((skill) => (
                  <span
                    key={skill.skillId}
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800"
                  >
                    {skill.skillName}:{' '}
                    {(matrix.classAverageBySkill[skill.skillId] * 100).toFixed(0)}%
                  </span>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Matrix Table */}
      <div className="p-4 overflow-x-auto">
        <table className="w-full border-collapse" role="grid">
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 bg-white z-10 px-3 py-2 text-left text-sm font-medium text-gray-700 border-b"
              >
                Student
              </th>
              {matrix.skills.map((skill) => (
                <th
                  key={skill.skillId}
                  scope="col"
                  className="px-2 py-2 text-center text-xs font-medium text-gray-700 border-b min-w-[80px]"
                >
                  <button
                    onClick={() => onSkillClick?.(skill.skillId)}
                    className="group flex flex-col items-center w-full hover:text-primary-600"
                    title={`${skill.skillName} - ${skill.domain}${skill.standardId ? ` (${skill.standardId})` : ''}`}
                  >
                    <span className="truncate max-w-[80px]">{skill.skillName}</span>
                    <span className="text-[10px] text-gray-400 group-hover:text-primary-400">
                      {(matrix.classAverageBySkill[skill.skillId] * 100).toFixed(0)}% avg
                    </span>
                  </button>
                </th>
              ))}
              <th
                scope="col"
                className="px-3 py-2 text-center text-sm font-medium text-gray-700 border-b"
              >
                Avg
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((student) => {
              const avgMastery = calculateAverageMastery(student.masteryBySkill);

              return (
                <tr key={student.studentId} className="hover:bg-gray-50">
                  <td className="sticky left-0 bg-white z-10 px-3 py-2 text-sm border-b">
                    <button
                      onClick={() => onStudentClick?.(student.studentId)}
                      className="font-medium text-gray-900 hover:text-primary-600 flex items-center gap-1"
                    >
                      {student.studentName}
                      <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                    </button>
                  </td>
                  {matrix.skills.map((skill) => {
                    const mastery = student.masteryBySkill[skill.skillId];
                    const isHovered =
                      hoveredCell?.studentId === student.studentId &&
                      hoveredCell?.skillId === skill.skillId;

                    return (
                      <td
                        key={skill.skillId}
                        className="px-1 py-1 text-center border-b"
                        onMouseEnter={() => {
                          setHoveredCell({
                            studentId: student.studentId,
                            skillId: skill.skillId,
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredCell(null);
                        }}
                      >
                        <MasteryCell
                          mastery={mastery}
                          classAverage={matrix.classAverageBySkill[skill.skillId]}
                          isHovered={isHovered}
                          studentName={student.studentName}
                          skillName={skill.skillName}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-center border-b">
                    <div
                      className={cn(
                        'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium',
                        getMasteryColor(avgMastery),
                        getMasteryTextColor(avgMastery)
                      )}
                    >
                      {(avgMastery * 100).toFixed(0)}%
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Class Average Row */}
            <tr className="bg-gray-50 font-medium">
              <td className="sticky left-0 bg-gray-50 z-10 px-3 py-2 text-sm border-t-2">
                Class Average
              </td>
              {matrix.skills.map((skill) => (
                <td key={skill.skillId} className="px-2 py-2 text-center border-t-2">
                  <div
                    className={cn(
                      'inline-flex items-center justify-center w-full h-8 rounded text-xs font-medium',
                      getMasteryColor(matrix.classAverageBySkill[skill.skillId]),
                      getMasteryTextColor(matrix.classAverageBySkill[skill.skillId])
                    )}
                  >
                    {(matrix.classAverageBySkill[skill.skillId] * 100).toFixed(0)}%
                  </div>
                </td>
              ))}
              <td className="px-2 py-2 text-center border-t-2">
                {(() => {
                  const overallAvg =
                    Object.values(matrix.classAverageBySkill).reduce((sum, v) => sum + v, 0) /
                    Object.keys(matrix.classAverageBySkill).length;
                  return (
                    <div
                      className={cn(
                        'inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium',
                        getMasteryColor(overallAvg),
                        getMasteryTextColor(overallAvg)
                      )}
                    >
                      {(overallAvg * 100).toFixed(0)}%
                    </div>
                  );
                })()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 pb-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-500">Mastery Level:</span>
          {[
            { label: '90%+', color: 'bg-green-500' },
            { label: '70-89%', color: 'bg-green-300' },
            { label: '50-69%', color: 'bg-yellow-300' },
            { label: '30-49%', color: 'bg-orange-300' },
            { label: '<30%', color: 'bg-red-300' },
            { label: 'No data', color: 'bg-gray-100' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className={`w-4 h-4 rounded ${item.color}`} />
              <span className="text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Mastery Cell Component
interface MasteryCellProps {
  mastery?: SkillMasteryCell;
  classAverage: number;
  isHovered: boolean;
  studentName: string;
  skillName: string;
}

function MasteryCell({
  mastery,
  classAverage,
  isHovered,
  studentName,
  skillName,
}: MasteryCellProps) {
  const value = mastery?.mastery ?? 0;
  const hasData = mastery !== undefined && mastery.mastery > 0;

  const trendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-400" />;
    }
  };

  return (
    <div className="relative">
      <button
        className={cn(
          'w-full h-8 rounded text-xs font-medium flex items-center justify-center gap-1 transition-all',
          getMasteryColor(value),
          getMasteryTextColor(value),
          isHovered && 'ring-2 ring-primary-500 ring-offset-1'
        )}
        aria-label={`${studentName}: ${skillName} - ${hasData ? `${(value * 100).toFixed(0)}%` : 'No data'}`}
      >
        {hasData ? `${(value * 100).toFixed(0)}%` : '-'}
        {mastery?.trend && mastery.trend !== 'stable' && trendIcon(mastery.trend)}
      </button>

      {/* Tooltip on hover */}
      {isHovered && (
        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-lg border bg-white p-3 shadow-lg">
          <p className="font-medium text-sm text-gray-900">{studentName}</p>
          <p className="text-xs text-gray-500">{skillName}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="text-gray-400">Mastery</p>
              <p className="font-medium">{hasData ? `${(value * 100).toFixed(0)}%` : 'No data'}</p>
            </div>
            <div>
              <p className="text-gray-400">Attempts</p>
              <p className="font-medium">{mastery?.attempts ?? 0}</p>
            </div>
            <div>
              <p className="text-gray-400">Trend</p>
              <p className="font-medium flex items-center gap-1">
                {trendIcon(mastery?.trend ?? 'stable')}
                {mastery?.trend ?? 'No data'}
              </p>
            </div>
            <div>
              <p className="text-gray-400">vs. Class</p>
              <p className="font-medium">
                {hasData
                  ? `${value > classAverage ? '+' : ''}${((value - classAverage) * 100).toFixed(0)}%`
                  : '-'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function calculateAverageMastery(masteryBySkill: Record<string, SkillMasteryCell>): number {
  const values = Object.values(masteryBySkill);
  if (values.length === 0) return 0;
  return values.reduce((sum, m) => sum + (m?.mastery ?? 0), 0) / values.length;
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 0.9) return 'bg-green-500';
  if (mastery >= 0.7) return 'bg-green-300';
  if (mastery >= 0.5) return 'bg-yellow-300';
  if (mastery >= 0.3) return 'bg-orange-300';
  if (mastery > 0) return 'bg-red-300';
  return 'bg-gray-100';
}

function getMasteryTextColor(mastery: number): string {
  if (mastery >= 0.7) return 'text-white';
  return 'text-gray-900';
}

// Skeleton loader
function MatrixSkeleton() {
  return (
    <div className="rounded-xl border bg-white animate-pulse">
      <div className="p-4 border-b">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
      </div>
      <div className="p-4 space-y-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
}
