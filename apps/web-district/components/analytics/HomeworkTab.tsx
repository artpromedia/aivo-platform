'use client';

import { useState } from 'react';
import {
  type ClassroomHomeworkUsage,
  type LearnerHomeworkUsage,
  getIndependenceLabelText,
  getIndependenceLabelColor,
} from '@/lib/classroom-analytics';

interface HomeworkTabProps {
  data: ClassroomHomeworkUsage;
}

type SortField = 'name' | 'sessions' | 'independence';
type SortDir = 'asc' | 'desc';

export function HomeworkTab({ data }: HomeworkTabProps) {
  const [sortField, setSortField] = useState<SortField>('independence');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterLabel, setFilterLabel] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedLearners = [...data.learnerMetrics]
    .filter((l) => !filterLabel || l.independenceLabel === filterLabel)
    .sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name':
          cmp = (a.learnerName ?? '').localeCompare(b.learnerName ?? '');
          break;
        case 'sessions':
          cmp = a.homeworkSessionsPerWeek - b.homeworkSessionsPerWeek;
          break;
        case 'independence':
          cmp = a.independenceScore - b.independenceScore;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Learners"
          value={data.totalLearners}
          subtitle={`${data.learnersWithHomework} used homework helper`}
        />
        <SummaryCard
          title="Avg Sessions/Week"
          value={data.avgSessionsPerWeekPerLearner.toFixed(1)}
          subtitle="per learner"
        />
        <SummaryCard
          title="Mostly Independent"
          value={data.independenceDistribution.mostlyIndependent}
          subtitle={`of ${data.totalLearners} learners`}
          color="green"
        />
        <SummaryCard
          title="Needs Support"
          value={data.independenceDistribution.needsSupport}
          subtitle={`of ${data.totalLearners} learners`}
          color="orange"
        />
      </div>

      {/* Independence Distribution */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Independence Distribution</h3>
        <div className="flex gap-2 mb-4">
          <FilterChip
            label="All"
            active={filterLabel === null}
            onClick={() => setFilterLabel(null)}
          />
          <FilterChip
            label="Needs Support"
            count={data.independenceDistribution.needsSupport}
            color="orange"
            active={filterLabel === 'needs_support'}
            onClick={() => setFilterLabel(filterLabel === 'needs_support' ? null : 'needs_support')}
          />
          <FilterChip
            label="Building"
            count={data.independenceDistribution.buildingIndependence}
            color="blue"
            active={filterLabel === 'building_independence'}
            onClick={() => setFilterLabel(filterLabel === 'building_independence' ? null : 'building_independence')}
          />
          <FilterChip
            label="Independent"
            count={data.independenceDistribution.mostlyIndependent}
            color="green"
            active={filterLabel === 'mostly_independent'}
            onClick={() => setFilterLabel(filterLabel === 'mostly_independent' ? null : 'mostly_independent')}
          />
        </div>
        <DistributionBar distribution={data.independenceDistribution} total={data.totalLearners} />
      </div>

      {/* Learner Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader
                label="Learner"
                field="name"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <SortableHeader
                label="Sessions/Week"
                field="sessions"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Avg Steps
              </th>
              <SortableHeader
                label="Independence"
                field="independence"
                currentField={sortField}
                direction={sortDir}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedLearners.map((learner) => (
              <tr key={learner.learnerId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {learner.learnerName ?? learner.learnerId}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {learner.homeworkSessionsPerWeek.toFixed(1)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                  {learner.avgStepsPerHomework.toFixed(1)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <IndependenceBadge label={learner.independenceLabel} score={learner.independenceScore} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  color?: 'green' | 'orange' | 'blue';
}) {
  const colorClasses = {
    green: 'text-green-600',
    orange: 'text-orange-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-bold mt-1 ${color ? colorClasses[color] : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count?: number;
  color?: 'green' | 'orange' | 'blue';
  active: boolean;
  onClick: () => void;
}) {
  const baseClasses = 'px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-colors';
  const activeClasses = active
    ? 'bg-gray-900 text-white'
    : 'bg-gray-100 text-gray-600 hover:bg-gray-200';

  return (
    <button className={`${baseClasses} ${activeClasses}`} onClick={onClick}>
      {label}
      {count !== undefined && <span className="ml-1 opacity-70">({count})</span>}
    </button>
  );
}

function DistributionBar({
  distribution,
  total,
}: {
  distribution: { needsSupport: number; buildingIndependence: number; mostlyIndependent: number };
  total: number;
}) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="h-4 rounded-full overflow-hidden flex bg-gray-100">
      <div
        className="bg-orange-400 transition-all"
        style={{ width: `${pct(distribution.needsSupport)}%` }}
        title={`Needs support: ${distribution.needsSupport}`}
      />
      <div
        className="bg-blue-400 transition-all"
        style={{ width: `${pct(distribution.buildingIndependence)}%` }}
        title={`Building independence: ${distribution.buildingIndependence}`}
      />
      <div
        className="bg-green-400 transition-all"
        style={{ width: `${pct(distribution.mostlyIndependent)}%` }}
        title={`Mostly independent: ${distribution.mostlyIndependent}`}
      />
    </div>
  );
}

function SortableHeader({
  label,
  field,
  currentField,
  direction,
  onSort,
}: {
  label: string;
  field: SortField;
  currentField: SortField;
  direction: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = field === currentField;

  return (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <span className="text-gray-400">{direction === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );
}

function IndependenceBadge({ label, score }: { label: string; score: number }) {
  const colors: Record<string, string> = {
    needs_support: 'bg-orange-100 text-orange-800',
    building_independence: 'bg-blue-100 text-blue-800',
    mostly_independent: 'bg-green-100 text-green-800',
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[label] ?? 'bg-gray-100'}`}>
        {getIndependenceLabelText(label as any)}
      </span>
      <span className="text-xs text-gray-400">{Math.round(score * 100)}%</span>
    </div>
  );
}
