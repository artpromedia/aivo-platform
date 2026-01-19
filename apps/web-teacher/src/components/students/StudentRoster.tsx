/**
 * StudentRoster Component
 *
 * Comprehensive student roster with IEP/504 support, filtering, and sorting
 */

'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { Student, StudentSortBy, StudentFilterBy, ClassEnrollment } from '@/lib/types';
import { StudentCard } from './StudentCard';
import { StudentDetailModal } from './StudentDetailModal';

interface StudentRosterProps {
  students: ClassEnrollment[];
  classId: string;
  className?: string;
  onStudentAction?: (studentId: string, action: string) => void;
}

export function StudentRoster({
  students,
  classId,
  className,
  onStudentAction,
}: StudentRosterProps) {
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [sortBy, setSortBy] = useState<StudentSortBy>('name');
  const [filterBy, setFilterBy] = useState<StudentFilterBy>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Extract learners from enrollments
  const learners = students.map((s) => s.learner);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...learners];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.firstName.toLowerCase().includes(query) ||
          s.lastName.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'iep':
        result = result.filter((s) => s.hasIep);
        break;
      case '504':
        result = result.filter((s) => s.has504);
        break;
      case 'struggling':
        result = result.filter((s) => (s.averageScore ?? 100) < 70);
        break;
      case 'excelling':
        result = result.filter((s) => (s.averageScore ?? 0) >= 90);
        break;
      case 'at_risk':
        result = result.filter(
          (s) => s.riskLevel && ['medium', 'high', 'critical'].includes(s.riskLevel)
        );
        break;
      case 'needs_attention':
        result = result.filter(
          (s) =>
            s.hasIep ||
            s.has504 ||
            (s.riskLevel && s.riskLevel !== 'none') ||
            (s.averageScore ?? 100) < 70
        );
        break;
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'performance':
          return (b.averageScore ?? 0) - (a.averageScore ?? 0);
        case 'progress':
          return (b.progressPercentage ?? 0) - (a.progressPercentage ?? 0);
        case 'risk':
          const riskOrder = { critical: 0, high: 1, medium: 2, low: 3, none: 4 };
          return (
            (riskOrder[a.riskLevel ?? 'none'] ?? 4) -
            (riskOrder[b.riskLevel ?? 'none'] ?? 4)
          );
        case 'lastActivity':
          return new Date(b.lastActivity ?? 0).getTime() - new Date(a.lastActivity ?? 0).getTime();
        default:
          return 0;
      }
    });

    return result;
  }, [learners, searchQuery, filterBy, sortBy]);

  // Calculate filter counts
  const filterCounts = useMemo(() => ({
    all: learners.length,
    iep: learners.filter((s) => s.hasIep).length,
    '504': learners.filter((s) => s.has504).length,
    struggling: learners.filter((s) => (s.averageScore ?? 100) < 70).length,
    excelling: learners.filter((s) => (s.averageScore ?? 0) >= 90).length,
    at_risk: learners.filter(
      (s) => s.riskLevel && ['medium', 'high', 'critical'].includes(s.riskLevel)
    ).length,
    needs_attention: learners.filter(
      (s) =>
        s.hasIep ||
        s.has504 ||
        (s.riskLevel && s.riskLevel !== 'none') ||
        (s.averageScore ?? 100) < 70
    ).length,
  }), [learners]);

  return (
    <div className={cn('rounded-xl border border-border bg-surface', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-text">
            Student Roster
            <span className="ml-2 text-base font-normal text-muted">
              ({filteredAndSortedStudents.length} of {learners.length})
            </span>
          </h2>
          <div className="flex items-center gap-3 mt-1">
            {filterCounts.iep > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <IEPBadge className="h-3 w-3" />
                {filterCounts.iep} IEP
              </span>
            )}
            {filterCounts['504'] > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-muted">
                <Plan504Badge className="h-3 w-3" />
                {filterCounts['504']} 504
              </span>
            )}
            {filterCounts.at_risk > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-warning">
                <AlertIcon className="h-3 w-3" />
                {filterCounts.at_risk} at-risk
              </span>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'rounded-lg p-2',
              viewMode === 'grid'
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-surface-muted'
            )}
            aria-label="Grid view"
          >
            <GridIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'rounded-lg p-2',
              viewMode === 'list'
                ? 'bg-primary/10 text-primary'
                : 'text-muted hover:bg-surface-muted'
            )}
            aria-label="List view"
          >
            <ListIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface py-2 pl-10 pr-4 text-sm text-text placeholder:text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Filter */}
        <select
          value={filterBy}
          onChange={(e) => setFilterBy(e.target.value as StudentFilterBy)}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="all">All Students ({filterCounts.all})</option>
          <option value="iep">IEP Students ({filterCounts.iep})</option>
          <option value="504">504 Plan ({filterCounts['504']})</option>
          <option value="needs_attention">Needs Attention ({filterCounts.needs_attention})</option>
          <option value="at_risk">At Risk ({filterCounts.at_risk})</option>
          <option value="struggling">Struggling (&lt;70%) ({filterCounts.struggling})</option>
          <option value="excelling">Excelling (90%+) ({filterCounts.excelling})</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as StudentSortBy)}
          className="rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="name">Sort by Name</option>
          <option value="performance">Sort by Performance</option>
          <option value="progress">Sort by Progress</option>
          <option value="risk">Sort by Risk Level</option>
          <option value="lastActivity">Sort by Last Activity</option>
        </select>
      </div>

      {/* Quick Filter Pills */}
      <div className="flex flex-wrap gap-2 border-b border-border p-3 bg-surface-muted/30">
        <FilterPill
          label="IEP"
          count={filterCounts.iep}
          isActive={filterBy === 'iep'}
          onClick={() => setFilterBy(filterBy === 'iep' ? 'all' : 'iep')}
          icon={<IEPBadge className="h-3.5 w-3.5" />}
        />
        <FilterPill
          label="504"
          count={filterCounts['504']}
          isActive={filterBy === '504'}
          onClick={() => setFilterBy(filterBy === '504' ? 'all' : '504')}
          icon={<Plan504Badge className="h-3.5 w-3.5" />}
        />
        <FilterPill
          label="At Risk"
          count={filterCounts.at_risk}
          isActive={filterBy === 'at_risk'}
          onClick={() => setFilterBy(filterBy === 'at_risk' ? 'all' : 'at_risk')}
          icon={<AlertIcon className="h-3.5 w-3.5" />}
          color="warning"
        />
        <FilterPill
          label="Struggling"
          count={filterCounts.struggling}
          isActive={filterBy === 'struggling'}
          onClick={() => setFilterBy(filterBy === 'struggling' ? 'all' : 'struggling')}
          icon={<TrendingDownIcon className="h-3.5 w-3.5" />}
          color="error"
        />
        <FilterPill
          label="Excelling"
          count={filterCounts.excelling}
          isActive={filterBy === 'excelling'}
          onClick={() => setFilterBy(filterBy === 'excelling' ? 'all' : 'excelling')}
          icon={<StarIcon className="h-3.5 w-3.5" />}
          color="success"
        />
      </div>

      {/* Student Grid/List */}
      <div className="p-4">
        {filteredAndSortedStudents.length > 0 ? (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAndSortedStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onClick={() => setSelectedStudent(student)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAndSortedStudents.map((student) => (
                <StudentListItem
                  key={student.id}
                  student={student}
                  onClick={() => setSelectedStudent(student)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="py-12 text-center">
            <UsersIcon className="mx-auto h-12 w-12 text-muted/50" />
            <p className="mt-2 text-sm text-muted">
              {searchQuery
                ? 'No students match your search'
                : 'No students in this category'}
            </p>
            {(searchQuery || filterBy !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterBy('all');
                }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          classId={classId}
          onClose={() => setSelectedStudent(null)}
          onAction={(action) => {
            onStudentAction?.(selectedStudent.id, action);
          }}
        />
      )}
    </div>
  );
}

interface FilterPillProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

function FilterPill({ label, count, isActive, onClick, icon, color = 'primary' }: FilterPillProps) {
  if (count === 0) return null;

  const colorClasses = {
    primary: isActive ? 'bg-primary text-white' : 'bg-primary/10 text-primary hover:bg-primary/20',
    success: isActive ? 'bg-success text-white' : 'bg-success/10 text-success hover:bg-success/20',
    warning: isActive ? 'bg-warning text-white' : 'bg-warning/10 text-warning hover:bg-warning/20',
    error: isActive ? 'bg-error text-white' : 'bg-error/10 text-error hover:bg-error/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
        colorClasses[color]
      )}
    >
      {icon}
      <span>{label}</span>
      <span className={cn('rounded-full px-1.5', isActive ? 'bg-white/20' : 'bg-black/10')}>
        {count}
      </span>
    </button>
  );
}

interface StudentListItemProps {
  student: Student;
  onClick: () => void;
}

function StudentListItem({ student, onClick }: StudentListItemProps) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-lg border border-border bg-surface p-4 text-left transition-all hover:shadow-md hover:border-primary/30"
    >
      {/* Avatar */}
      {student.avatar ? (
        <img
          src={student.avatar}
          alt={student.name}
          className="h-12 w-12 rounded-full object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
          {student.name
            .split(' ')
            .map((n) => n[0])
            .join('')}
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-text">{student.name}</p>
          {student.hasIep && <IEPBadge className="h-4 w-4 text-blue-600" />}
          {student.has504 && <Plan504Badge className="h-4 w-4 text-purple-600" />}
          {student.riskLevel && student.riskLevel !== 'none' && (
            <RiskBadge level={student.riskLevel} />
          )}
        </div>
        <p className="text-sm text-muted">
          Grade {student.gradeLevel}
          {student.lastActivity && ` • Last active ${formatTimeAgo(student.lastActivity)}`}
        </p>
      </div>

      {/* Score */}
      <div className="text-right">
        <p
          className={cn(
            'text-lg font-bold',
            getScoreColor(student.averageScore)
          )}
        >
          {student.averageScore !== undefined ? `${student.averageScore}%` : '-'}
        </p>
        <p className="text-xs text-muted">Avg Score</p>
      </div>

      {/* Progress */}
      {student.progressPercentage !== undefined && (
        <div className="w-24">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted">Progress</span>
            <span className="text-xs font-medium text-text">{student.progressPercentage}%</span>
          </div>
          <div className="h-2 bg-surface-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${student.progressPercentage}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    low: 'bg-info/10 text-info',
    medium: 'bg-warning/10 text-warning',
    high: 'bg-error/10 text-error',
    critical: 'bg-error text-white',
  };

  return (
    <span className={cn('rounded px-1.5 py-0.5 text-xs font-medium', colors[level] || colors.low)}>
      {level}
    </span>
  );
}

function getScoreColor(score?: number): string {
  if (score === undefined) return 'text-muted';
  if (score >= 90) return 'text-success';
  if (score >= 70) return 'text-warning';
  return 'text-error';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

// Icons
function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 10h16M4 14h16M4 18h16"
      />
    </svg>
  );
}

function IEPBadge({ className }: { className?: string }) {
  return (
    <svg className={cn('text-blue-600', className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z" />
      <path d="M8 13h8v1H8zm0 2h8v1H8zm0 2h5v1H8z" />
    </svg>
  );
}

function Plan504Badge({ className }: { className?: string }) {
  return (
    <svg className={cn('text-purple-600', className)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
      <path d="M11 7h2v6h-2zm0 8h2v2h-2z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function TrendingDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
      />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}
